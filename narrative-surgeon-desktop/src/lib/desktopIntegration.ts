/**
 * Desktop Integration System
 * Provides native desktop features and professional application lifecycle management
 */

import { invoke } from '@tauri-apps/api/tauri'
import { appWindow } from '@tauri-apps/api/window'
import { register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { sendNotification, requestPermission } from '@tauri-apps/plugin-notification'
import { errorManager } from './errorHandling'

export interface ApplicationState {
  isReady: boolean
  isVisible: boolean
  isMaximized: boolean
  isMinimized: boolean
  isFullscreen: boolean
  windowBounds: WindowBounds
  theme: 'light' | 'dark' | 'auto'
}

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface GlobalShortcut {
  id: string
  shortcut: string
  description: string
  action: () => void | Promise<void>
}

export interface SystemTrayMenu {
  id: string
  label: string
  icon?: string
  action?: () => void | Promise<void>
  submenu?: SystemTrayMenu[]
  separator?: boolean
  disabled?: boolean
}

export class DesktopIntegration {
  private static instance: DesktopIntegration
  private applicationState: ApplicationState
  private globalShortcuts: Map<string, GlobalShortcut> = new Map()
  private trayMenu: SystemTrayMenu[] = []
  private isInitialized = false
  private splashTimeout: number | null = null
  private startupTime = Date.now()

  constructor() {
    this.applicationState = {
      isReady: false,
      isVisible: true,
      isMaximized: false,
      isMinimized: false,
      isFullscreen: false,
      windowBounds: { x: 0, y: 0, width: 1400, height: 900 },
      theme: 'auto'
    }
  }

  static getInstance(): DesktopIntegration {
    if (!DesktopIntegration.instance) {
      DesktopIntegration.instance = new DesktopIntegration()
    }
    return DesktopIntegration.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Show splash screen
      await this.showSplashScreen()

      // Initialize desktop features
      await this.setupWindowManagement()
      await this.registerFileAssociations()
      await this.setupSystemTray()
      await this.registerGlobalShortcuts()
      await this.setupNotifications()
      await this.restoreWindowState()

      // Mark application as ready
      this.applicationState.isReady = true
      this.isInitialized = true

      // Hide splash screen after minimum display time
      await this.hideSplashScreen()

      console.log(`Application initialized in ${Date.now() - this.startupTime}ms`)
    } catch (error) {
      errorManager.reportManualError(error as Error, 'DesktopIntegration', 'initialize')
      // Continue with degraded functionality
      this.applicationState.isReady = true
      this.isInitialized = true
      await this.hideSplashScreen()
    }
  }

  private async showSplashScreen(): Promise<void> {
    try {
      // Create splash window
      await invoke('show_splash_screen', {
        title: 'Narrative Surgeon',
        message: 'Loading professional writing tools...',
        icon: 'icons/128x128.png'
      })
    } catch (error) {
      console.warn('Failed to show splash screen:', error)
    }
  }

  private async hideSplashScreen(): Promise<void> {
    const minDisplayTime = 2000 // Minimum 2 seconds
    const elapsedTime = Date.now() - this.startupTime

    if (elapsedTime < minDisplayTime) {
      this.splashTimeout = window.setTimeout(async () => {
        try {
          await invoke('hide_splash_screen')
        } catch (error) {
          console.warn('Failed to hide splash screen:', error)
        }
      }, minDisplayTime - elapsedTime)
    } else {
      try {
        await invoke('hide_splash_screen')
      } catch (error) {
        console.warn('Failed to hide splash screen:', error)
      }
    }
  }

  private async setupWindowManagement(): Promise<void> {
    try {
      // Listen for window events
      await appWindow.listen('tauri://window-resized', (event) => {
        const { width, height } = event.payload as { width: number; height: number }
        this.applicationState.windowBounds.width = width
        this.applicationState.windowBounds.height = height
        this.saveWindowState()
      })

      await appWindow.listen('tauri://window-moved', (event) => {
        const { x, y } = event.payload as { x: number; y: number }
        this.applicationState.windowBounds.x = x
        this.applicationState.windowBounds.y = y
        this.saveWindowState()
      })

      await appWindow.listen('tauri://close-requested', async () => {
        await this.handleCloseRequest()
      })

      await appWindow.listen('tauri://blur', () => {
        this.applicationState.isVisible = false
      })

      await appWindow.listen('tauri://focus', () => {
        this.applicationState.isVisible = true
      })
    } catch (error) {
      console.warn('Failed to setup window management:', error)
    }
  }

  async registerFileAssociations(): Promise<void> {
    try {
      await invoke('register_file_associations', {
        associations: [
          {
            extension: '.manuscript',
            description: 'Narrative Surgeon Manuscript',
            icon: 'icons/manuscript.ico',
            mimeType: 'application/x-narrative-surgeon-manuscript'
          },
          {
            extension: '.nsproject',
            description: 'Narrative Surgeon Project',
            icon: 'icons/project.ico',
            mimeType: 'application/x-narrative-surgeon-project'
          }
        ]
      })
    } catch (error) {
      console.warn('Failed to register file associations:', error)
    }
  }

  async setupSystemTray(): Promise<void> {
    try {
      this.trayMenu = [
        {
          id: 'show',
          label: 'Show Narrative Surgeon',
          action: () => this.showWindow()
        },
        {
          id: 'new-manuscript',
          label: 'New Manuscript',
          action: () => this.createNewManuscript()
        },
        {
          id: 'separator1',
          label: '',
          separator: true
        },
        {
          id: 'quick-analysis',
          label: 'Quick Analysis',
          action: () => this.showQuickAnalysis()
        },
        {
          id: 'writing-stats',
          label: 'Writing Statistics',
          action: () => this.showWritingStats()
        },
        {
          id: 'separator2',
          label: '',
          separator: true
        },
        {
          id: 'preferences',
          label: 'Preferences',
          action: () => this.openPreferences()
        },
        {
          id: 'about',
          label: 'About',
          action: () => this.showAbout()
        },
        {
          id: 'separator3',
          label: '',
          separator: true
        },
        {
          id: 'quit',
          label: 'Quit',
          action: () => this.quitApplication()
        }
      ]

      await invoke('setup_system_tray', {
        icon: 'icons/tray.png',
        menu: this.trayMenu
      })
    } catch (error) {
      console.warn('Failed to setup system tray:', error)
    }
  }

  async registerGlobalShortcuts(): Promise<void> {
    const shortcuts: GlobalShortcut[] = [
      {
        id: 'quick-capture',
        shortcut: 'CommandOrControl+Shift+N',
        description: 'Quick note capture',
        action: () => this.showQuickCapture()
      },
      {
        id: 'focus-mode',
        shortcut: 'CommandOrControl+Shift+F',
        description: 'Toggle focus mode',
        action: () => this.toggleFocusMode()
      },
      {
        id: 'word-sprint',
        shortcut: 'CommandOrControl+Shift+S',
        description: 'Start writing sprint',
        action: () => this.startWritingSprint()
      }
    ]

    for (const shortcut of shortcuts) {
      try {
        await register(shortcut.shortcut, shortcut.action)
        this.globalShortcuts.set(shortcut.id, shortcut)
      } catch (error) {
        console.warn(`Failed to register shortcut ${shortcut.shortcut}:`, error)
      }
    }
  }

  async setupNotifications(): Promise<void> {
    try {
      const permission = await requestPermission()
      if (permission === 'granted') {
        console.log('Notification permission granted')
      }
    } catch (error) {
      console.warn('Failed to setup notifications:', error)
    }
  }

  private async restoreWindowState(): Promise<void> {
    try {
      const savedState = localStorage.getItem('window_state')
      if (savedState) {
        const state = JSON.parse(savedState)
        
        // Restore window bounds
        await appWindow.setSize({
          width: state.windowBounds.width,
          height: state.windowBounds.height
        })
        
        await appWindow.setPosition({
          x: state.windowBounds.x,
          y: state.windowBounds.y
        })

        // Restore window state
        if (state.isMaximized) {
          await appWindow.maximize()
        }

        this.applicationState = { ...this.applicationState, ...state }
      }
    } catch (error) {
      console.warn('Failed to restore window state:', error)
    }
  }

  private saveWindowState(): void {
    try {
      localStorage.setItem('window_state', JSON.stringify(this.applicationState))
    } catch (error) {
      console.warn('Failed to save window state:', error)
    }
  }

  private async handleCloseRequest(): Promise<void> {
    try {
      // Check for unsaved work
      const hasUnsavedWork = await this.checkForUnsavedWork()
      
      if (hasUnsavedWork) {
        const shouldClose = await this.confirmClose()
        if (!shouldClose) {
          return
        }
      }

      // Save application state
      this.saveWindowState()
      
      // Cleanup
      await this.cleanup()
      
      // Allow close
      await appWindow.close()
    } catch (error) {
      errorManager.reportManualError(error as Error, 'DesktopIntegration', 'handleCloseRequest')
      await appWindow.close()
    }
  }

  private async checkForUnsavedWork(): Promise<boolean> {
    try {
      return await invoke('check_unsaved_work')
    } catch {
      return false
    }
  }

  private async confirmClose(): Promise<boolean> {
    return new Promise((resolve) => {
      const dialog = document.createElement('div')
      dialog.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md">
            <h3 class="text-lg font-semibold mb-2">Unsaved Changes</h3>
            <p class="text-gray-600 dark:text-gray-400 mb-4">
              You have unsaved changes. Are you sure you want to quit?
            </p>
            <div class="flex gap-2 justify-end">
              <button id="cancel-close" class="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button id="save-close" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Save & Quit
              </button>
              <button id="discard-close" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                Discard & Quit
              </button>
            </div>
          </div>
        </div>
      `
      
      document.body.appendChild(dialog)
      
      dialog.querySelector('#cancel-close')?.addEventListener('click', () => {
        document.body.removeChild(dialog)
        resolve(false)
      })
      
      dialog.querySelector('#save-close')?.addEventListener('click', async () => {
        await invoke('save_all_work')
        document.body.removeChild(dialog)
        resolve(true)
      })
      
      dialog.querySelector('#discard-close')?.addEventListener('click', () => {
        document.body.removeChild(dialog)
        resolve(true)
      })
    })
  }

  // System tray actions
  private async showWindow(): Promise<void> {
    await appWindow.show()
    await appWindow.setFocus()
  }

  private async createNewManuscript(): Promise<void> {
    await this.showWindow()
    // Trigger new manuscript creation
    window.dispatchEvent(new CustomEvent('create-new-manuscript'))
  }

  private async showQuickAnalysis(): Promise<void> {
    await this.showWindow()
    window.dispatchEvent(new CustomEvent('show-quick-analysis'))
  }

  private async showWritingStats(): Promise<void> {
    await this.showWindow()
    window.dispatchEvent(new CustomEvent('show-writing-stats'))
  }

  private async openPreferences(): Promise<void> {
    await this.showWindow()
    window.dispatchEvent(new CustomEvent('open-preferences'))
  }

  private async showAbout(): Promise<void> {
    await this.showWindow()
    window.dispatchEvent(new CustomEvent('show-about'))
  }

  private async quitApplication(): Promise<void> {
    await appWindow.close()
  }

  // Global shortcut actions
  private async showQuickCapture(): Promise<void> {
    try {
      await invoke('show_quick_capture_window')
    } catch (error) {
      console.warn('Failed to show quick capture:', error)
    }
  }

  private async toggleFocusMode(): Promise<void> {
    try {
      const isFullscreen = await appWindow.isFullscreen()
      if (isFullscreen) {
        await appWindow.setFullscreen(false)
      } else {
        await appWindow.setFullscreen(true)
      }
      
      window.dispatchEvent(new CustomEvent('toggle-focus-mode', {
        detail: { enabled: !isFullscreen }
      }))
    } catch (error) {
      console.warn('Failed to toggle focus mode:', error)
    }
  }

  private async startWritingSprint(): Promise<void> {
    await this.showWindow()
    window.dispatchEvent(new CustomEvent('start-writing-sprint'))
  }

  // Notification helpers
  async showNotification(title: string, body: string, icon?: string): Promise<void> {
    try {
      await sendNotification({
        title,
        body,
        icon: icon || 'icons/128x128.png'
      })
    } catch (error) {
      console.warn('Failed to show notification:', error)
    }
  }

  async showWritingReminder(): Promise<void> {
    await this.showNotification(
      'Writing Reminder',
      'Time to continue working on your manuscript!',
      'icons/writing-reminder.png'
    )
  }

  async showGoalAchieved(goal: string): Promise<void> {
    await this.showNotification(
      'Goal Achieved!',
      `Congratulations! You've reached your ${goal}.`,
      'icons/achievement.png'
    )
  }

  // High-DPI display support
  async optimizeForDisplay(): Promise<void> {
    try {
      const scaleFactor = await invoke('get_scale_factor')
      if (scaleFactor > 1) {
        document.documentElement.style.setProperty('--scale-factor', scaleFactor.toString())
        document.documentElement.classList.add('high-dpi')
      }
    } catch (error) {
      console.warn('Failed to optimize for display:', error)
    }
  }

  // Theme management
  async setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    this.applicationState.theme = theme
    this.saveWindowState()

    try {
      await invoke('set_theme', { theme })
      
      // Update CSS classes
      document.documentElement.classList.remove('light', 'dark')
      
      if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.classList.add(prefersDark ? 'dark' : 'light')
      } else {
        document.documentElement.classList.add(theme)
      }
    } catch (error) {
      console.warn('Failed to set theme:', error)
    }
  }

  // Window management helpers
  async centerWindow(): Promise<void> {
    try {
      await appWindow.center()
    } catch (error) {
      console.warn('Failed to center window:', error)
    }
  }

  async toggleMaximize(): Promise<void> {
    try {
      const isMaximized = await appWindow.isMaximized()
      if (isMaximized) {
        await appWindow.unmaximize()
        this.applicationState.isMaximized = false
      } else {
        await appWindow.maximize()
        this.applicationState.isMaximized = true
      }
      this.saveWindowState()
    } catch (error) {
      console.warn('Failed to toggle maximize:', error)
    }
  }

  async minimizeToTray(): Promise<void> {
    try {
      await appWindow.hide()
      this.applicationState.isVisible = false
      await this.showNotification(
        'Narrative Surgeon',
        'Application minimized to system tray'
      )
    } catch (error) {
      console.warn('Failed to minimize to tray:', error)
    }
  }

  // Accessibility features
  async setupAccessibility(): Promise<void> {
    try {
      // High contrast mode detection
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
      if (prefersHighContrast) {
        document.documentElement.classList.add('high-contrast')
      }

      // Reduced motion detection
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) {
        document.documentElement.classList.add('reduced-motion')
      }

      // Font size scaling
      const fontScale = localStorage.getItem('font_scale') || '1'
      document.documentElement.style.setProperty('--font-scale', fontScale)
    } catch (error) {
      console.warn('Failed to setup accessibility:', error)
    }
  }

  // Application state
  getApplicationState(): ApplicationState {
    return { ...this.applicationState }
  }

  isReady(): boolean {
    return this.applicationState.isReady
  }

  // Cleanup
  private async cleanup(): Promise<void> {
    try {
      if (this.splashTimeout) {
        clearTimeout(this.splashTimeout)
      }

      // Unregister global shortcuts
      for (const [id, shortcut] of this.globalShortcuts) {
        try {
          await unregister(shortcut.shortcut)
        } catch (error) {
          console.warn(`Failed to unregister shortcut ${shortcut.shortcut}:`, error)
        }
      }

      this.globalShortcuts.clear()
    } catch (error) {
      console.warn('Error during cleanup:', error)
    }
  }
}

// Global desktop integration instance
export const desktopIntegration = DesktopIntegration.getInstance()

// Auto-initialize when module loads
document.addEventListener('DOMContentLoaded', () => {
  desktopIntegration.initialize()
})