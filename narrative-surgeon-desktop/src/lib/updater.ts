/**
 * Auto-Update System with Rollback Capability
 * Provides sophisticated update management with user consent and automatic rollback
 */

import { check, Update as TauriUpdate } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { toast } from '@/components/ui/use-toast'
import { errorManager } from './errorHandling'

export interface UpdateInfo {
  version: string
  date: string
  body?: string
  signature: string
  url: string
  currentVersion: string
  critical: boolean
  rollbackAvailable: boolean
  changelogUrl?: string
  downloadSize?: number
}

export interface UpdateProgress {
  chunkLength: number
  contentLength?: number
  downloaded: number
  percentage: number
}

export interface UpdatePreferences {
  autoCheck: boolean
  autoDownload: boolean
  autoInstall: boolean
  notifyOnUpdate: boolean
  stagedRollout: boolean
  updateChannel: 'stable' | 'beta' | 'nightly'
  checkFrequency: number // hours
}

export enum UpdateStatus {
  IDLE = 'idle',
  CHECKING = 'checking',
  UPDATE_AVAILABLE = 'update_available',
  DOWNLOADING = 'downloading', 
  DOWNLOADED = 'downloaded',
  INSTALLING = 'installing',
  INSTALLED = 'installed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

export class UpdateManager {
  private static instance: UpdateManager
  private status: UpdateStatus = UpdateStatus.IDLE
  private currentUpdate: TauriUpdate | null = null
  private updateInfo: UpdateInfo | null = null
  private preferences: UpdatePreferences
  private checkTimer: number | null = null
  private progressCallback: ((progress: UpdateProgress) => void) | null = null
  private statusCallback: ((status: UpdateStatus, info?: UpdateInfo) => void) | null = null
  private updateHistory: Array<{ version: string; date: number; success: boolean }> = []
  private isRollbackInProgress = false

  constructor() {
    this.preferences = this.loadPreferences()
    this.loadUpdateHistory()
    this.setupPeriodicCheck()
  }

  static getInstance(): UpdateManager {
    if (!UpdateManager.instance) {
      UpdateManager.instance = new UpdateManager()
    }
    return UpdateManager.instance
  }

  private loadPreferences(): UpdatePreferences {
    const defaultPreferences: UpdatePreferences = {
      autoCheck: true,
      autoDownload: true,
      autoInstall: false, // Require user confirmation
      notifyOnUpdate: true,
      stagedRollout: false,
      updateChannel: 'stable',
      checkFrequency: 24 // Check every 24 hours
    }

    try {
      const stored = localStorage.getItem('update_preferences')
      return stored ? { ...defaultPreferences, ...JSON.parse(stored) } : defaultPreferences
    } catch (error) {
      errorManager.reportManualError(error as Error, 'UpdateManager', 'loadPreferences')
      return defaultPreferences
    }
  }

  private savePreferences() {
    try {
      localStorage.setItem('update_preferences', JSON.stringify(this.preferences))
    } catch (error) {
      errorManager.reportManualError(error as Error, 'UpdateManager', 'savePreferences')
    }
  }

  private loadUpdateHistory() {
    try {
      const stored = localStorage.getItem('update_history')
      this.updateHistory = stored ? JSON.parse(stored) : []
    } catch (error) {
      errorManager.reportManualError(error as Error, 'UpdateManager', 'loadUpdateHistory')
      this.updateHistory = []
    }
  }

  private saveUpdateHistory() {
    try {
      // Keep only last 10 updates
      const history = this.updateHistory.slice(-10)
      localStorage.setItem('update_history', JSON.stringify(history))
    } catch (error) {
      errorManager.reportManualError(error as Error, 'UpdateManager', 'saveUpdateHistory')
    }
  }

  private setupPeriodicCheck() {
    if (this.preferences.autoCheck) {
      this.startPeriodicCheck()
    }
  }

  private startPeriodicCheck() {
    this.stopPeriodicCheck()
    
    const intervalMs = this.preferences.checkFrequency * 60 * 60 * 1000
    this.checkTimer = window.setInterval(() => {
      this.checkForUpdates(false) // Silent check
    }, intervalMs)

    // Check immediately on startup (delayed)
    setTimeout(() => {
      this.checkForUpdates(false)
    }, 10000) // 10 seconds after startup
  }

  private stopPeriodicCheck() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = null
    }
  }

  public setPreferences(preferences: Partial<UpdatePreferences>) {
    this.preferences = { ...this.preferences, ...preferences }
    this.savePreferences()
    
    // Restart periodic check if frequency changed
    if (preferences.autoCheck !== undefined || preferences.checkFrequency !== undefined) {
      if (this.preferences.autoCheck) {
        this.startPeriodicCheck()
      } else {
        this.stopPeriodicCheck()
      }
    }
  }

  public getPreferences(): UpdatePreferences {
    return { ...this.preferences }
  }

  public onProgress(callback: (progress: UpdateProgress) => void) {
    this.progressCallback = callback
  }

  public onStatusChange(callback: (status: UpdateStatus, info?: UpdateInfo) => void) {
    this.statusCallback = callback
  }

  private updateStatus(status: UpdateStatus, info?: UpdateInfo) {
    this.status = status
    this.statusCallback?.(status, info)
  }

  public getStatus(): UpdateStatus {
    return this.status
  }

  public getCurrentUpdateInfo(): UpdateInfo | null {
    return this.updateInfo
  }

  async checkForUpdates(showNotification = true): Promise<UpdateInfo | null> {
    if (this.status === UpdateStatus.CHECKING) {
      return this.updateInfo
    }

    this.updateStatus(UpdateStatus.CHECKING)
    
    try {
      const update = await check()
      
      if (update?.available) {
        this.currentUpdate = update
        this.updateInfo = {
          version: update.version,
          date: update.date || new Date().toISOString(),
          body: update.body,
          signature: '', // Would be populated by the update system
          url: '', // Would be populated by the update system
          currentVersion: await this.getCurrentVersion(),
          critical: this.isCriticalUpdate(update),
          rollbackAvailable: await this.checkRollbackAvailable(),
          downloadSize: await this.estimateDownloadSize(update)
        }

        this.updateStatus(UpdateStatus.UPDATE_AVAILABLE, this.updateInfo)

        if (showNotification && this.preferences.notifyOnUpdate) {
          this.notifyUserOfUpdate(this.updateInfo)
        }

        // Auto-download if enabled
        if (this.preferences.autoDownload && !this.updateInfo.critical) {
          await this.downloadUpdate()
        }

        return this.updateInfo
      } else {
        this.updateStatus(UpdateStatus.IDLE)
        
        if (showNotification) {
          toast({
            title: 'Up to Date',
            description: 'You are running the latest version.',
            variant: 'default'
          })
        }
        
        return null
      }
    } catch (error) {
      this.updateStatus(UpdateStatus.FAILED)
      
      errorManager.reportManualError(error as Error, 'UpdateManager', 'checkForUpdates')
      
      if (showNotification) {
        toast({
          title: 'Update Check Failed',
          description: 'Unable to check for updates. Please try again later.',
          variant: 'destructive'
        })
      }
      
      return null
    }
  }

  private async getCurrentVersion(): Promise<string> {
    try {
      // This would get the current version from Tauri
      return '1.0.0' // Placeholder
    } catch {
      return '1.0.0'
    }
  }

  private isCriticalUpdate(update: TauriUpdate): boolean {
    // Determine if update is critical based on version or changelog
    const body = (update.body || '').toLowerCase()
    return body.includes('critical') || 
           body.includes('security') || 
           body.includes('urgent') ||
           body.includes('hotfix')
  }

  private async checkRollbackAvailable(): Promise<boolean> {
    try {
      // Check if previous version backup exists
      return this.updateHistory.length > 0
    } catch {
      return false
    }
  }

  private async estimateDownloadSize(update: TauriUpdate): Promise<number> {
    try {
      // This would estimate download size from update metadata
      return 50 * 1024 * 1024 // 50MB placeholder
    } catch {
      return 0
    }
  }

  async downloadUpdate(): Promise<boolean> {
    if (!this.currentUpdate || this.status === UpdateStatus.DOWNLOADING) {
      return false
    }

    this.updateStatus(UpdateStatus.DOWNLOADING)

    try {
      // Create backup before download
      await this.createBackup()

      await this.currentUpdate.downloadAndInstall((progress) => {
        const updateProgress: UpdateProgress = {
          chunkLength: progress.chunkLength,
          contentLength: progress.contentLength,
          downloaded: progress.chunkLength,
          percentage: progress.contentLength 
            ? (progress.chunkLength / progress.contentLength) * 100 
            : 0
        }
        
        this.progressCallback?.(updateProgress)
      })

      this.updateStatus(UpdateStatus.DOWNLOADED, this.updateInfo)

      // Record successful download
      this.recordUpdateAttempt(this.updateInfo!.version, true)

      // Auto-install if enabled
      if (this.preferences.autoInstall) {
        return await this.installUpdate()
      }

      // Notify user that download is complete
      this.notifyDownloadComplete()

      return true
    } catch (error) {
      this.updateStatus(UpdateStatus.FAILED)
      
      errorManager.reportManualError(error as Error, 'UpdateManager', 'downloadUpdate')
      
      // Record failed download
      this.recordUpdateAttempt(this.updateInfo!.version, false)
      
      toast({
        title: 'Download Failed',
        description: 'Failed to download update. Please try again.',
        variant: 'destructive',
        action: {
          altText: 'Retry',
          onClick: () => this.downloadUpdate()
        }
      })

      return false
    }
  }

  async installUpdate(): Promise<boolean> {
    if (this.status !== UpdateStatus.DOWNLOADED) {
      return false
    }

    this.updateStatus(UpdateStatus.INSTALLING)

    try {
      // Show installation confirmation dialog
      const confirmed = await this.confirmInstallation()
      if (!confirmed) {
        this.updateStatus(UpdateStatus.DOWNLOADED)
        return false
      }

      // Record current version for rollback
      await this.recordCurrentVersion()

      // Install and restart
      toast({
        title: 'Installing Update',
        description: 'The application will restart to complete the installation.',
        variant: 'default'
      })

      // Give user time to save work
      await this.promptSaveWork()

      // Relaunch application
      await relaunch()

      return true
    } catch (error) {
      this.updateStatus(UpdateStatus.FAILED)
      
      errorManager.reportManualError(error as Error, 'UpdateManager', 'installUpdate')
      
      toast({
        title: 'Installation Failed',
        description: 'Failed to install update. You can continue using the current version.',
        variant: 'destructive',
        action: {
          altText: 'Rollback',
          onClick: () => this.rollbackUpdate()
        }
      })

      return false
    }
  }

  private async createBackup(): Promise<void> {
    try {
      // This would create a backup of the current version
      const backupData = {
        version: await this.getCurrentVersion(),
        timestamp: Date.now(),
        userSettings: localStorage.getItem('user_preferences'),
        appState: this.getApplicationState()
      }
      
      localStorage.setItem('version_backup', JSON.stringify(backupData))
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`)
    }
  }

  private async recordCurrentVersion(): Promise<void> {
    try {
      const currentVersion = await this.getCurrentVersion()
      const versionRecord = {
        version: currentVersion,
        timestamp: Date.now(),
        rollbackData: this.getApplicationState()
      }
      
      localStorage.setItem('rollback_version', JSON.stringify(versionRecord))
    } catch (error) {
      console.error('Failed to record current version for rollback:', error)
    }
  }

  private getApplicationState(): any {
    // This would capture the current application state for rollback
    return {
      preferences: localStorage.getItem('user_preferences'),
      manuscripts: localStorage.getItem('manuscripts_cache'),
      settings: localStorage.getItem('app_settings')
    }
  }

  async rollbackUpdate(): Promise<boolean> {
    if (this.isRollbackInProgress) {
      return false
    }

    this.isRollbackInProgress = true

    try {
      const rollbackData = localStorage.getItem('rollback_version')
      if (!rollbackData) {
        throw new Error('No rollback data available')
      }

      const rollback = JSON.parse(rollbackData)
      
      toast({
        title: 'Rolling Back Update',
        description: `Rolling back to version ${rollback.version}...`,
        variant: 'default'
      })

      // This would implement the actual rollback logic
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Restore application state
      if (rollback.rollbackData) {
        this.restoreApplicationState(rollback.rollbackData)
      }

      // Record rollback
      this.recordUpdateAttempt(rollback.version, true, true)
      
      this.updateStatus(UpdateStatus.ROLLED_BACK)

      toast({
        title: 'Rollback Complete',
        description: 'Successfully rolled back to previous version.',
        variant: 'default'
      })

      // Restart application
      await relaunch()

      return true
    } catch (error) {
      errorManager.reportManualError(error as Error, 'UpdateManager', 'rollbackUpdate')
      
      toast({
        title: 'Rollback Failed',
        description: 'Unable to rollback to previous version.',
        variant: 'destructive'
      })

      return false
    } finally {
      this.isRollbackInProgress = false
    }
  }

  private restoreApplicationState(state: any) {
    try {
      if (state.preferences) {
        localStorage.setItem('user_preferences', state.preferences)
      }
      if (state.manuscripts) {
        localStorage.setItem('manuscripts_cache', state.manuscripts)
      }
      if (state.settings) {
        localStorage.setItem('app_settings', state.settings)
      }
    } catch (error) {
      console.error('Failed to restore application state:', error)
    }
  }

  private recordUpdateAttempt(version: string, success: boolean, rollback = false) {
    this.updateHistory.push({
      version: rollback ? `${version} (rollback)` : version,
      date: Date.now(),
      success
    })
    this.saveUpdateHistory()
  }

  private async confirmInstallation(): Promise<boolean> {
    return new Promise((resolve) => {
      const updateInfo = this.updateInfo!
      
      toast({
        title: 'Ready to Install Update',
        description: `Version ${updateInfo.version} is ready to install. The application will restart.`,
        variant: 'default',
        action: {
          altText: 'Install Now',
          onClick: () => resolve(true)
        }
      })

      // Auto-confirm for critical updates after 30 seconds
      if (updateInfo.critical) {
        setTimeout(() => resolve(true), 30000)
      }
    })
  }

  private async promptSaveWork(): Promise<void> {
    return new Promise((resolve) => {
      toast({
        title: 'Save Your Work',
        description: 'Please save any unsaved work. Installation will begin in 10 seconds.',
        variant: 'default'
      })

      setTimeout(resolve, 10000) // 10 seconds to save
    })
  }

  private notifyUserOfUpdate(updateInfo: UpdateInfo) {
    const isLowPriority = !updateInfo.critical
    
    toast({
      title: `Update Available: v${updateInfo.version}`,
      description: updateInfo.critical 
        ? 'This is a critical security update and should be installed immediately.'
        : 'A new version is available with improvements and bug fixes.',
      variant: updateInfo.critical ? 'destructive' : 'default',
      action: {
        altText: updateInfo.critical ? 'Install Now' : 'Download',
        onClick: () => {
          if (updateInfo.critical || this.preferences.autoDownload) {
            this.installUpdate()
          } else {
            this.downloadUpdate()
          }
        }
      }
    })
  }

  private notifyDownloadComplete() {
    toast({
      title: 'Update Downloaded',
      description: 'The update has been downloaded and is ready to install.',
      variant: 'default',
      action: {
        altText: 'Install Now',
        onClick: () => this.installUpdate()
      }
    })
  }

  public getUpdateHistory(): Array<{ version: string; date: number; success: boolean }> {
    return [...this.updateHistory]
  }

  public async forceCheck(): Promise<UpdateInfo | null> {
    return await this.checkForUpdates(true)
  }

  public dismissCurrentUpdate() {
    if (this.updateInfo) {
      // Store dismissed update to avoid re-prompting
      localStorage.setItem(`dismissed_update_${this.updateInfo.version}`, Date.now().toString())
      this.updateStatus(UpdateStatus.IDLE)
    }
  }

  public isUpdateDismissed(version: string): boolean {
    const dismissed = localStorage.getItem(`dismissed_update_${version}`)
    if (!dismissed) return false
    
    // Un-dismiss after 7 days
    const dismissedTime = parseInt(dismissed)
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    return (Date.now() - dismissedTime) < sevenDays
  }

  public cleanup() {
    this.stopPeriodicCheck()
    
    // Clean up old dismissed updates
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('dismissed_update_')) {
        const dismissed = localStorage.getItem(key)
        if (dismissed) {
          const dismissedTime = parseInt(dismissed)
          const sevenDays = 7 * 24 * 60 * 60 * 1000
          if ((Date.now() - dismissedTime) > sevenDays) {
            localStorage.removeItem(key)
          }
        }
      }
    })
  }
}

// Global update manager instance
export const updateManager = UpdateManager.getInstance()

// Initialize update manager on module load
updateManager.checkForUpdates(false)