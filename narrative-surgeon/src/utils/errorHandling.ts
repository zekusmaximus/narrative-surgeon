import { invoke } from '@tauri-apps/api/tauri';

export interface AppError {
  type: string;
  message: string;
  timestamp: string;
  code?: string;
  field?: string;
  value?: string;
  path?: string;
  operation?: string;
  url?: string;
  status_code?: number;
  required_permission?: string;
  setting?: string;
  resource?: string;
  id?: string;
  existing_id?: string;
  retry_after?: number;
  timeout_ms?: number;
  error_code?: string;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  route?: string;
  additionalData?: Record<string, any>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: Array<{ error: AppError | Error; context?: ErrorContext }> = [];
  private isOnline = navigator.onLine;
  private retryQueue: Array<() => Promise<any>> = [];

  private constructor() {
    this.setupGlobalErrorHandlers();
    this.setupNetworkListeners();
    this.startErrorProcessor();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), {
        component: 'Global',
        action: 'UnhandledPromiseRejection',
      });
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        component: 'Global',
        action: 'JavaScriptError',
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processRetryQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private startErrorProcessor() {
    // Process error queue every 5 seconds
    setInterval(() => {
      this.processErrorQueue();
    }, 5000);
  }

  // Main error handling method
  public handleError(error: Error | AppError, context?: ErrorContext): void {
    const enhancedError = this.enhanceError(error, context);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', enhancedError, context);
    }

    // Add to queue for processing
    this.errorQueue.push({ error: enhancedError, context });

    // Store locally immediately
    this.storeErrorLocally(enhancedError, context);

    // Show user notification for critical errors
    if (this.isCriticalError(enhancedError)) {
      this.showCriticalErrorNotification(enhancedError);
    }
  }

  // Handle Tauri command errors specifically
  public async handleTauriError(error: any, command: string, args?: any): Promise<never> {
    const tauriError = this.parseTauriError(error);
    const context: ErrorContext = {
      component: 'TauriCommand',
      action: command,
      additionalData: { args },
    };

    this.handleError(tauriError, context);

    // If error is retryable, add to retry queue
    if (this.isRetryableError(tauriError)) {
      this.addToRetryQueue(() => invoke(command, args));
    }

    throw tauriError;
  }

  // Wrapper for Tauri commands with automatic error handling
  public async invokeSafe<T>(command: string, args?: any): Promise<T> {
    try {
      return await invoke<T>(command, args);
    } catch (error) {
      throw await this.handleTauriError(error, command, args);
    }
  }

  // Retry mechanism for failed operations
  public async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    delay = 1000,
    context?: ErrorContext
  ): Promise<T> {
    let lastError: Error | AppError | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error | AppError;
        
        this.handleError(lastError, {
          ...context,
          additionalData: {
            attempt,
            maxAttempts,
            ...context?.additionalData,
          },
        });

        if (attempt < maxAttempts && this.isRetryableError(lastError)) {
          await this.sleep(delay * Math.pow(2, attempt - 1)); // Exponential backoff
        } else {
          break;
        }
      }
    }

    throw lastError;
  }

  // User-friendly error messages
  public getUserMessage(error: Error | AppError): string {
    if (this.isAppError(error)) {
      switch (error.type) {
        case 'Database':
          return 'There was a problem accessing your data. Please try again.';
        case 'FileSystem':
          return `Unable to ${error.operation || 'access'} the file. Please check permissions and try again.`;
        case 'Network':
          return 'Network connection problem. Please check your internet connection.';
        case 'Validation':
          return error.field 
            ? `Please check the ${error.field} field and try again.`
            : 'Please check your input and try again.';
        case 'Export':
          return `Unable to export. Please try a different format.`;
        case 'NotFound':
          return `${error.resource || 'Item'} not found.`;
        case 'Permission':
          return `Permission required: ${error.required_permission}. Please check your access rights.`;
        case 'Timeout':
          return `Operation timed out. Please try again.`;
        case 'RateLimit':
          return 'Too many requests. Please wait a moment and try again.';
        default:
          return 'An unexpected error occurred. Please try again.';
      }
    }

    // Handle JavaScript errors
    if (error.name === 'TypeError') {
      return 'Something went wrong. Please refresh the page and try again.';
    }
    if (error.name === 'NetworkError') {
      return 'Network connection problem. Please check your internet connection.';
    }

    return 'An unexpected error occurred. Please try again.';
  }

  // Get error severity level
  public getErrorSeverity(error: Error | AppError): 'low' | 'medium' | 'high' | 'critical' {
    if (this.isAppError(error)) {
      switch (error.type) {
        case 'Internal':
          return 'critical';
        case 'Database':
        case 'FileSystem':
        case 'Permission':
          return 'high';
        case 'Network':
        case 'Export':
        case 'Timeout':
          return 'medium';
        case 'Validation':
        case 'NotFound':
        case 'RateLimit':
          return 'low';
        default:
          return 'medium';
      }
    }

    return 'medium';
  }

  // Check if error is retryable
  private isRetryableError(error: Error | AppError): boolean {
    if (this.isAppError(error)) {
      return ['Network', 'Database', 'Timeout', 'RateLimit'].includes(error.type);
    }

    return error.name === 'NetworkError';
  }

  // Check if error is critical
  private isCriticalError(error: Error | AppError): boolean {
    return this.getErrorSeverity(error) === 'critical';
  }

  // Enhance error with additional context
  private enhanceError(error: Error | AppError, context?: ErrorContext): AppError {
    if (this.isAppError(error)) {
      return error;
    }

    return {
      type: 'Internal',
      message: error.message,
      timestamp: new Date().toISOString(),
      error_code: error.name,
    };
  }

  // Parse Tauri-specific errors
  private parseTauriError(error: any): AppError {
    if (typeof error === 'string') {
      try {
        return JSON.parse(error) as AppError;
      } catch {
        return {
          type: 'Internal',
          message: error,
          timestamp: new Date().toISOString(),
        };
      }
    }

    if (error && typeof error === 'object' && error.type) {
      return error as AppError;
    }

    return {
      type: 'Internal',
      message: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }

  // Type guard for AppError
  private isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'type' in error && 'message' in error;
  }

  // Store error locally
  private storeErrorLocally(error: AppError, context?: ErrorContext): void {
    try {
      const existingErrors = this.getStoredErrors();
      const errorEntry = {
        error,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      existingErrors.push(errorEntry);
      
      // Keep only last 100 errors
      const recentErrors = existingErrors.slice(-100);
      localStorage.setItem('narrative_surgeon_errors', JSON.stringify(recentErrors));
    } catch (storageError) {
      console.warn('Failed to store error locally:', storageError);
    }
  }

  // Get stored errors
  public getStoredErrors(): any[] {
    try {
      const stored = localStorage.getItem('narrative_surgeon_errors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Process error queue
  private async processErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0 || !this.isOnline) {
      return;
    }

    const errors = this.errorQueue.splice(0, 10); // Process up to 10 errors at a time
    
    try {
      // Send errors to backend if available
      if (window.tauri) {
        for (const { error, context } of errors) {
          try {
            await invoke('log_frontend_error', { 
              error: error,
              context: context || {},
            });
          } catch (backendError) {
            // If backend logging fails, put error back in queue
            this.errorQueue.push({ error, context });
          }
        }
      }
    } catch (processingError) {
      console.warn('Error processing error queue:', processingError);
    }
  }

  // Process retry queue
  private async processRetryQueue(): Promise<void> {
    const operations = this.retryQueue.splice(0, 5); // Retry up to 5 operations
    
    for (const operation of operations) {
      try {
        await operation();
      } catch (error) {
        // If retry fails, don't add back to queue to prevent infinite loops
        console.warn('Retry operation failed:', error);
      }
    }
  }

  // Add operation to retry queue
  private addToRetryQueue(operation: () => Promise<any>): void {
    if (this.retryQueue.length < 20) { // Limit retry queue size
      this.retryQueue.push(operation);
    }
  }

  // Show critical error notification
  private showCriticalErrorNotification(error: AppError): void {
    // In a real app, you might use a toast library or modal
    console.error('CRITICAL ERROR:', error);
    
    // Could trigger a global error modal or notification
    window.dispatchEvent(new CustomEvent('criticalError', { detail: error }));
  }

  // Utility method for delay
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clear stored errors
  public clearStoredErrors(): void {
    localStorage.removeItem('narrative_surgeon_errors');
    this.errorQueue = [];
  }

  // Get error statistics
  public getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: number;
  } {
    const errors = this.getStoredErrors();
    const recentThreshold = Date.now() - (24 * 60 * 60 * 1000); // Last 24 hours
    
    const stats = {
      totalErrors: errors.length,
      errorsByType: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
      recentErrors: 0,
    };

    errors.forEach(({ error, timestamp }) => {
      // Count by type
      const type = error.type || 'Unknown';
      stats.errorsByType[type] = (stats.errorsByType[type] || 0) + 1;

      // Count by severity
      const severity = this.getErrorSeverity(error);
      stats.errorsBySeverity[severity] = (stats.errorsBySeverity[severity] || 0) + 1;

      // Count recent errors
      if (new Date(timestamp).getTime() > recentThreshold) {
        stats.recentErrors++;
      }
    });

    return stats;
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions
export const handleError = (error: Error | AppError, context?: ErrorContext) => 
  errorHandler.handleError(error, context);

export const invokeSafe = <T>(command: string, args?: any): Promise<T> => 
  errorHandler.invokeSafe(command, args);

export const withRetry = <T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000,
  context?: ErrorContext
): Promise<T> => errorHandler.withRetry(operation, maxAttempts, delay, context);

export const getUserMessage = (error: Error | AppError): string => 
  errorHandler.getUserMessage(error);

export const getErrorSeverity = (error: Error | AppError) => 
  errorHandler.getErrorSeverity(error);

// React hook for error handling
import { useCallback } from 'react';

export const useErrorHandler = () => {
  const handleError = useCallback((error: Error | AppError, context?: ErrorContext) => {
    errorHandler.handleError(error, context);
  }, []);

  const invokeSafe = useCallback(<T>(command: string, args?: any): Promise<T> => {
    return errorHandler.invokeSafe(command, args);
  }, []);

  const withRetry = useCallback(<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    delay = 1000,
    context?: ErrorContext
  ): Promise<T> => {
    return errorHandler.withRetry(operation, maxAttempts, delay, context);
  }, []);

  const getUserMessage = useCallback((error: Error | AppError): string => {
    return errorHandler.getUserMessage(error);
  }, []);

  return {
    handleError,
    invokeSafe,
    withRetry,
    getUserMessage,
    getErrorSeverity,
    getStoredErrors: () => errorHandler.getStoredErrors(),
    clearStoredErrors: () => errorHandler.clearStoredErrors(),
    getErrorStats: () => errorHandler.getErrorStats(),
  };
};

export default ErrorHandler;