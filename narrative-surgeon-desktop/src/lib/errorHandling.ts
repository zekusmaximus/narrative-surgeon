/**
 * Centralized Error Handling and Recovery System
 * Provides user-friendly error management, crash recovery, and automatic reporting
 */

import { invoke } from '@tauri-apps/api/tauri'
import { toast } from '@/components/ui/use-toast'

export enum ErrorCategory {
  NETWORK = 'network',
  FILE_SYSTEM = 'file_system', 
  DATABASE = 'database',
  AI_SERVICE = 'ai_service',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  PERFORMANCE = 'performance',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  userId?: string
  sessionId: string
  manuscriptId?: string
  action: string
  component: string
  timestamp: number
  userAgent: string
  appVersion: string
  stackTrace?: string
  additionalData?: Record<string, any>
}

export interface UserMessage {
  title: string
  message: string
  actionLabel?: string
  action?: () => void
  dismissible: boolean
  type: 'error' | 'warning' | 'info'
}

export interface RecoveryAction {
  id: string
  label: string
  description: string
  action: () => Promise<boolean>
  priority: number
  requiresUserConfirmation: boolean
}

export class ErrorManager {
  private static instance: ErrorManager
  private sessionId: string
  private errorHistory: Array<{ error: Error; context: ErrorContext; timestamp: number }> = []
  private recoveryStrategies = new Map<string, RecoveryAction[]>()
  private crashRecoveryData: Map<string, any> = new Map()

  constructor() {
    this.sessionId = this.generateSessionId()
    this.setupErrorHandlers()
    this.setupCrashRecovery()
    this.registerRecoveryStrategies()
  }

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager()
    }
    return ErrorManager.instance
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private setupErrorHandlers() {
    // Global error handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), {
        sessionId: this.sessionId,
        action: 'unhandled_promise_rejection',
        component: 'global',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        appVersion: process.env.npm_package_version || '1.0.0',
        additionalData: { reason: event.reason }
      })
    })

    // Global error handler for JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        sessionId: this.sessionId,
        action: 'javascript_error',
        component: 'global',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        appVersion: process.env.npm_package_version || '1.0.0',
        stackTrace: event.error?.stack,
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })
  }

  private setupCrashRecovery() {
    // Save application state periodically
    setInterval(() => {
      this.saveApplicationState()
    }, 30000) // Every 30 seconds

    // Save state before page unload
    window.addEventListener('beforeunload', () => {
      this.saveApplicationState()
    })

    // Check for crash recovery on startup
    this.checkForCrashRecovery()
  }

  private registerRecoveryStrategies() {
    // Network error recovery
    this.recoveryStrategies.set('network_error', [
      {
        id: 'retry_request',
        label: 'Retry Request',
        description: 'Attempt the network request again',
        action: async () => {
          // Retry logic would be implemented here
          return true
        },
        priority: 1,
        requiresUserConfirmation: false
      },
      {
        id: 'work_offline',
        label: 'Work Offline',
        description: 'Continue working without network features',
        action: async () => {
          localStorage.setItem('offline_mode', 'true')
          return true
        },
        priority: 2,
        requiresUserConfirmation: true
      }
    ])

    // File system error recovery
    this.recoveryStrategies.set('file_system_error', [
      {
        id: 'choose_different_location',
        label: 'Choose Different Location',
        description: 'Select a different file or folder',
        action: async () => {
          try {
            const result = await invoke('open_file_dialog')
            return !!result
          } catch {
            return false
          }
        },
        priority: 1,
        requiresUserConfirmation: false
      },
      {
        id: 'create_backup',
        label: 'Create Backup',
        description: 'Save your work to a temporary location',
        action: async () => {
          try {
            await this.createEmergencyBackup()
            return true
          } catch {
            return false
          }
        },
        priority: 2,
        requiresUserConfirmation: true
      }
    ])

    // Database error recovery
    this.recoveryStrategies.set('database_error', [
      {
        id: 'repair_database',
        label: 'Repair Database',
        description: 'Attempt to repair the corrupted database',
        action: async () => {
          try {
            await invoke('repair_database')
            return true
          } catch {
            return false
          }
        },
        priority: 1,
        requiresUserConfirmation: true
      },
      {
        id: 'restore_from_backup',
        label: 'Restore from Backup',
        description: 'Restore from the most recent backup',
        action: async () => {
          try {
            await invoke('restore_database_backup')
            return true
          } catch {
            return false
          }
        },
        priority: 2,
        requiresUserConfirmation: true
      }
    ])

    // AI service error recovery
    this.recoveryStrategies.set('ai_service_error', [
      {
        id: 'retry_with_fallback',
        label: 'Use Alternative Service',
        description: 'Try a different AI service provider',
        action: async () => {
          try {
            await invoke('switch_ai_provider')
            return true
          } catch {
            return false
          }
        },
        priority: 1,
        requiresUserConfirmation: false
      },
      {
        id: 'use_offline_analysis',
        label: 'Use Offline Analysis',
        description: 'Use basic offline text analysis instead',
        action: async () => {
          localStorage.setItem('use_offline_analysis', 'true')
          return true
        },
        priority: 2,
        requiresUserConfirmation: true
      }
    ])
  }

  handleError(error: Error, context: ErrorContext): void {
    const errorEntry = { error, context, timestamp: Date.now() }
    this.errorHistory.push(errorEntry)

    // Keep only last 100 errors to prevent memory issues
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100)
    }

    const category = this.categorizeError(error)
    const severity = this.assessSeverity(error, context)

    // Log error for debugging
    console.error('Application Error:', {
      category,
      severity,
      error: error.message,
      context,
      stack: error.stack
    })

    // Show user-friendly message
    const userMessage = this.formatErrorForUser(error, category, severity)
    this.displayUserMessage(userMessage)

    // Report error if severity is high or critical
    if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
      this.reportError(error, context)
    }

    // Suggest recovery actions
    const recoveryActions = this.suggestRecovery(error, category)
    if (recoveryActions.length > 0) {
      this.offerRecoveryActions(recoveryActions, userMessage)
    }

    // Handle critical errors with immediate recovery
    if (severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(error, context)
    }
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ''

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ErrorCategory.NETWORK
    }
    
    if (message.includes('permission') || message.includes('access denied') || message.includes('unauthorized')) {
      return ErrorCategory.PERMISSION
    }
    
    if (message.includes('file') || message.includes('directory') || message.includes('path')) {
      return ErrorCategory.FILE_SYSTEM
    }
    
    if (message.includes('database') || message.includes('sql') || message.includes('transaction')) {
      return ErrorCategory.DATABASE
    }
    
    if (message.includes('ai') || message.includes('openai') || message.includes('anthropic') || message.includes('generation')) {
      return ErrorCategory.AI_SERVICE
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorCategory.VALIDATION
    }
    
    if (message.includes('memory') || message.includes('timeout') || message.includes('performance')) {
      return ErrorCategory.PERFORMANCE
    }

    return ErrorCategory.UNKNOWN
  }

  private assessSeverity(error: Error, context: ErrorContext): ErrorSeverity {
    const message = error.message.toLowerCase()
    
    // Critical errors that can cause data loss or app crashes
    if (message.includes('corrupt') || message.includes('crash') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL
    }
    
    // High severity errors that significantly impact functionality
    if (message.includes('database') || message.includes('save') || message.includes('export')) {
      return ErrorSeverity.HIGH
    }
    
    // Medium severity errors that impact some features
    if (message.includes('network') || message.includes('ai') || message.includes('analysis')) {
      return ErrorSeverity.MEDIUM
    }
    
    // Low severity errors that have minimal impact
    return ErrorSeverity.LOW
  }

  formatErrorForUser(error: Error, category: ErrorCategory, severity: ErrorSeverity): UserMessage {
    const baseMessages = {
      [ErrorCategory.NETWORK]: {
        title: 'Connection Issue',
        message: 'Unable to connect to the service. Please check your internet connection.',
        actionLabel: 'Try Again'
      },
      [ErrorCategory.FILE_SYSTEM]: {
        title: 'File Access Problem',
        message: 'Unable to access the file or folder. Please check permissions and try again.',
        actionLabel: 'Choose Different Location'
      },
      [ErrorCategory.DATABASE]: {
        title: 'Data Storage Issue',
        message: 'There was a problem accessing your data. Your work is being backed up automatically.',
        actionLabel: 'Repair Database'
      },
      [ErrorCategory.AI_SERVICE]: {
        title: 'Analysis Service Unavailable',
        message: 'The AI analysis service is temporarily unavailable. You can continue writing while we restore the service.',
        actionLabel: 'Use Offline Mode'
      },
      [ErrorCategory.VALIDATION]: {
        title: 'Invalid Input',
        message: 'Please check your input and ensure all required fields are completed correctly.',
        actionLabel: 'Review Input'
      },
      [ErrorCategory.PERMISSION]: {
        title: 'Permission Required',
        message: 'The application needs permission to access this resource. Please grant the necessary permissions.',
        actionLabel: 'Grant Permission'
      },
      [ErrorCategory.PERFORMANCE]: {
        title: 'Performance Issue',
        message: 'The operation is taking longer than expected. This might be due to a large file or system load.',
        actionLabel: 'Continue Waiting'
      },
      [ErrorCategory.UNKNOWN]: {
        title: 'Unexpected Error',
        message: 'An unexpected error occurred. The application will try to recover automatically.',
        actionLabel: 'Report Issue'
      }
    }

    const baseMessage = baseMessages[category]
    
    return {
      title: baseMessage.title,
      message: severity === ErrorSeverity.CRITICAL 
        ? `${baseMessage.message} Your work has been automatically saved.`
        : baseMessage.message,
      actionLabel: baseMessage.actionLabel,
      dismissible: severity !== ErrorSeverity.CRITICAL,
      type: severity === ErrorSeverity.CRITICAL ? 'error' : 
            severity === ErrorSeverity.HIGH ? 'error' : 'warning'
    }
  }

  private displayUserMessage(message: UserMessage) {
    toast({
      title: message.title,
      description: message.message,
      variant: message.type === 'error' ? 'destructive' : 'default',
      action: message.actionLabel ? {
        altText: message.actionLabel,
        onClick: message.action
      } : undefined
    })
  }

  suggestRecovery(error: Error, category: ErrorCategory): RecoveryAction[] {
    const categoryKey = category + '_error'
    const strategies = this.recoveryStrategies.get(categoryKey) || []
    
    // Sort by priority
    return strategies.sort((a, b) => a.priority - b.priority)
  }

  private offerRecoveryActions(actions: RecoveryAction[], userMessage: UserMessage) {
    if (actions.length === 0) return

    const primaryAction = actions[0]
    
    // Modify the user message to include the recovery action
    userMessage.action = async () => {
      const success = await primaryAction.action()
      if (success) {
        toast({
          title: 'Recovery Successful',
          description: 'The issue has been resolved.',
          variant: 'default'
        })
      } else {
        // Try next recovery action if available
        const nextAction = actions[1]
        if (nextAction) {
          this.offerRecoveryActions([nextAction], userMessage)
        }
      }
    }
  }

  async reportError(error: Error, context: ErrorContext): Promise<void> {
    try {
      // In a real implementation, this would send to an error reporting service
      const errorReport = {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        errorHistory: this.errorHistory.slice(-5) // Last 5 errors for context
      }

      // Remove sensitive information
      const sanitizedReport = this.sanitizeErrorReport(errorReport)
      
      // Send to error reporting service (Sentry, LogRocket, etc.)
      await invoke('report_error', { report: sanitizedReport })
      
      console.log('Error reported successfully')
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
      // Store error locally for later retry
      localStorage.setItem(
        `error_report_${Date.now()}`, 
        JSON.stringify({ error, context })
      )
    }
  }

  private sanitizeErrorReport(report: any): any {
    // Remove sensitive data like API keys, user tokens, etc.
    const sanitized = JSON.parse(JSON.stringify(report))
    
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential']
    
    function removeSensitive(obj: any) {
      if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => {
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            obj[key] = '[REDACTED]'
          } else if (typeof obj[key] === 'object') {
            removeSensitive(obj[key])
          }
        })
      }
    }
    
    removeSensitive(sanitized)
    return sanitized
  }

  private handleCriticalError(error: Error, context: ErrorContext) {
    // Immediately save all work
    this.saveApplicationState()
    
    // Create emergency backup
    this.createEmergencyBackup()
    
    // Show critical error dialog
    toast({
      title: 'Critical Error Detected',
      description: 'Your work has been automatically saved. The application will attempt to recover.',
      variant: 'destructive',
      action: {
        altText: 'Restart Application',
        onClick: () => {
          window.location.reload()
        }
      }
    })
  }

  private async saveApplicationState() {
    try {
      const state = {
        timestamp: Date.now(),
        url: window.location.href,
        sessionId: this.sessionId,
        // Add specific application state here
        editorContent: this.getEditorContent(),
        openManuscripts: this.getOpenManuscripts(),
        userPreferences: this.getUserPreferences()
      }

      localStorage.setItem('app_crash_recovery', JSON.stringify(state))
      
      // Also save to file system for persistence
      await invoke('save_crash_recovery_data', { data: state })
    } catch (error) {
      console.error('Failed to save application state:', error)
    }
  }

  private async checkForCrashRecovery() {
    try {
      const recoveryData = localStorage.getItem('app_crash_recovery')
      if (recoveryData) {
        const data = JSON.parse(recoveryData)
        const timeSinceLastSave = Date.now() - data.timestamp
        
        // If less than 5 minutes, offer recovery
        if (timeSinceLastSave < 5 * 60 * 1000) {
          this.offerCrashRecovery(data)
        }
      }
    } catch (error) {
      console.error('Failed to check crash recovery:', error)
    }
  }

  private offerCrashRecovery(recoveryData: any) {
    toast({
      title: 'Recover Your Work',
      description: 'The application detected an unexpected shutdown. Would you like to recover your work?',
      variant: 'default',
      action: {
        altText: 'Recover Work',
        onClick: () => {
          this.recoverApplicationState(recoveryData)
        }
      }
    })
  }

  private recoverApplicationState(recoveryData: any) {
    try {
      // Restore editor content
      if (recoveryData.editorContent) {
        this.restoreEditorContent(recoveryData.editorContent)
      }
      
      // Restore open manuscripts
      if (recoveryData.openManuscripts) {
        this.restoreOpenManuscripts(recoveryData.openManuscripts)
      }
      
      // Clear recovery data
      localStorage.removeItem('app_crash_recovery')
      
      toast({
        title: 'Recovery Complete',
        description: 'Your work has been successfully recovered.',
        variant: 'default'
      })
    } catch (error) {
      console.error('Failed to recover application state:', error)
      toast({
        title: 'Recovery Failed',
        description: 'Unable to recover all data. Some work may be lost.',
        variant: 'destructive'
      })
    }
  }

  private async createEmergencyBackup() {
    try {
      const backupData = {
        timestamp: Date.now(),
        manuscripts: this.getOpenManuscripts(),
        editorContent: this.getEditorContent(),
        userSettings: this.getUserPreferences()
      }

      await invoke('create_emergency_backup', { data: backupData })
      
      toast({
        title: 'Emergency Backup Created',
        description: 'Your work has been safely backed up.',
        variant: 'default'
      })
    } catch (error) {
      console.error('Failed to create emergency backup:', error)
    }
  }

  // Helper methods to get application state
  private getEditorContent(): any {
    // This would get the current editor content
    // Implementation depends on your editor component
    return null
  }

  private getOpenManuscripts(): any {
    // This would get the list of currently open manuscripts
    return null
  }

  private getUserPreferences(): any {
    // This would get user settings and preferences
    return JSON.parse(localStorage.getItem('user_preferences') || '{}')
  }

  private restoreEditorContent(content: any) {
    // This would restore the editor content
    // Implementation depends on your editor component
  }

  private restoreOpenManuscripts(manuscripts: any) {
    // This would restore the open manuscripts
  }

  // Public methods for manual error handling
  public reportManualError(error: Error, component: string, action: string, additionalData?: any) {
    const context: ErrorContext = {
      sessionId: this.sessionId,
      action,
      component,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      appVersion: process.env.npm_package_version || '1.0.0',
      additionalData
    }

    this.handleError(error, context)
  }

  public getErrorHistory(): Array<{ error: Error; context: ErrorContext; timestamp: number }> {
    return [...this.errorHistory]
  }

  public clearErrorHistory() {
    this.errorHistory = []
  }
}

// Global error manager instance
export const errorManager = ErrorManager.getInstance()

// Utility function for components to easily report errors
export function handleComponentError(error: Error, component: string, action: string, additionalData?: any) {
  errorManager.reportManualError(error, component, action, additionalData)
}