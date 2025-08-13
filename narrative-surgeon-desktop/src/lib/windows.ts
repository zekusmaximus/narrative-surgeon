'use client'

import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

export interface WindowConfig {
  label: string
  title: string
  url: string
  width?: number
  height?: number
  resizable?: boolean
  fullscreen?: boolean
  center?: boolean
  minimizable?: boolean
  maximizable?: boolean
  decorations?: boolean
  alwaysOnTop?: boolean
}

class WindowManager {
  private windows: Map<string, WebviewWindow> = new Map()

  async createWindow(config: WindowConfig): Promise<WebviewWindow> {
    try {
      // Check if window already exists
      if (this.windows.has(config.label)) {
        const existingWindow = this.windows.get(config.label)!
        await existingWindow.show()
        await existingWindow.setFocus()
        return existingWindow
      }

      // Create new window
      const window = new WebviewWindow(config.label, {
        title: config.title,
        url: config.url,
        width: config.width || 800,
        height: config.height || 600,
        resizable: config.resizable ?? true,
        fullscreen: config.fullscreen ?? false,
        center: config.center ?? true,
        minimizable: config.minimizable ?? true,
        maximizable: config.maximizable ?? true,
        decorations: config.decorations ?? true,
        alwaysOnTop: config.alwaysOnTop ?? false,
      })

      // Track window
      this.windows.set(config.label, window)

      // Handle window close
      window.listen('tauri://close-requested', () => {
        this.windows.delete(config.label)
      })

      return window
    } catch (error) {
      console.error('Failed to create window:', error)
      throw error
    }
  }

  async closeWindow(label: string): Promise<void> {
    const window = this.windows.get(label)
    if (window) {
      await window.close()
      this.windows.delete(label)
    }
  }

  async focusWindow(label: string): Promise<void> {
    const window = this.windows.get(label)
    if (window) {
      await window.show()
      await window.setFocus()
    }
  }

  getWindow(label: string): WebviewWindow | undefined {
    return this.windows.get(label)
  }

  getAllWindows(): WebviewWindow[] {
    return Array.from(this.windows.values())
  }

  async closeAllWindows(): Promise<void> {
    const closePromises = Array.from(this.windows.values()).map(window => 
      window.close().catch(console.error)
    )
    await Promise.all(closePromises)
    this.windows.clear()
  }
}

// Global window manager instance
const windowManager = new WindowManager()

// Specialized window functions

export async function openComparisonWindow(sceneA: string, sceneB: string): Promise<WebviewWindow> {
  return windowManager.createWindow({
    label: `comparison-${sceneA}-${sceneB}`,
    title: 'Scene Comparison',
    url: `/compare?sceneA=${sceneA}&sceneB=${sceneB}`,
    width: 1200,
    height: 800,
  })
}

export async function openFloatingNotes(): Promise<WebviewWindow> {
  return windowManager.createWindow({
    label: 'floating-notes',
    title: 'Notes',
    url: '/notes',
    width: 400,
    height: 600,
    alwaysOnTop: true,
    decorations: true,
  })
}

export async function openDistractedFreeMode(manuscriptId: string): Promise<WebviewWindow> {
  return windowManager.createWindow({
    label: `distraction-free-${manuscriptId}`,
    title: 'Distraction-Free Writing',
    url: `/manuscripts/${manuscriptId}/editor?mode=distraction-free`,
    fullscreen: true,
    decorations: false,
    resizable: false,
  })
}

export async function openAnalysisDashboard(manuscriptId: string): Promise<WebviewWindow> {
  return windowManager.createWindow({
    label: `analysis-${manuscriptId}`,
    title: 'Analysis Dashboard',
    url: `/manuscripts/${manuscriptId}/analysis?window=true`,
    width: 1000,
    height: 700,
  })
}

export async function openCharacterProfiles(manuscriptId: string): Promise<WebviewWindow> {
  return windowManager.createWindow({
    label: `characters-${manuscriptId}`,
    title: 'Character Profiles',
    url: `/manuscripts/${manuscriptId}/characters`,
    width: 800,
    height: 600,
  })
}

export async function openTimelineView(manuscriptId: string): Promise<WebviewWindow> {
  return windowManager.createWindow({
    label: `timeline-${manuscriptId}`,
    title: 'Story Timeline',
    url: `/manuscripts/${manuscriptId}/timeline`,
    width: 1200,
    height: 400,
  })
}

export async function openFullscreenEditor(manuscriptId: string, sceneId?: string): Promise<WebviewWindow> {
  const url = sceneId 
    ? `/manuscripts/${manuscriptId}/editor/${sceneId}?fullscreen=true`
    : `/manuscripts/${manuscriptId}/editor?fullscreen=true`
    
  return windowManager.createWindow({
    label: `fullscreen-editor-${manuscriptId}`,
    title: 'Fullscreen Editor',
    url,
    fullscreen: true,
    decorations: false,
  })
}

export async function openRevisionHistory(manuscriptId: string): Promise<WebviewWindow> {
  return windowManager.createWindow({
    label: `revisions-${manuscriptId}`,
    title: 'Revision History',
    url: `/manuscripts/${manuscriptId}/revisions`,
    width: 900,
    height: 600,
  })
}

export async function openSubmissionTracker(): Promise<WebviewWindow> {
  return windowManager.createWindow({
    label: 'submission-tracker',
    title: 'Submission Tracker',
    url: '/submissions/tracker',
    width: 1000,
    height: 700,
  })
}

export async function openWritingGoals(): Promise<WebviewWindow> {
  return windowManager.createWindow({
    label: 'writing-goals',
    title: 'Writing Goals & Progress',
    url: '/goals',
    width: 600,
    height: 500,
  })
}

// Window management utilities

export async function closeWindow(label: string): Promise<void> {
  return windowManager.closeWindow(label)
}

export async function focusWindow(label: string): Promise<void> {
  return windowManager.focusWindow(label)
}

export function getWindow(label: string): WebviewWindow | undefined {
  return windowManager.getWindow(label)
}

export function getAllWindows(): WebviewWindow[] {
  return windowManager.getAllWindows()
}

export async function closeAllSecondaryWindows(): Promise<void> {
  return windowManager.closeAllWindows()
}

// Window state management

export interface WindowState {
  label: string
  title: string
  url: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  isVisible: boolean
  isMinimized: boolean
  isMaximized: boolean
  isFullscreen: boolean
}

export async function saveWindowState(label: string): Promise<WindowState | null> {
  const window = windowManager.getWindow(label)
  if (!window) return null

  try {
    const [position, size] = await Promise.all([
      window.outerPosition(),
      window.outerSize(),
    ])

    return {
      label,
      title: await window.title(),
      url: '', // URL would need to be tracked separately
      bounds: {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
      },
      isVisible: await window.isVisible(),
      isMinimized: await window.isMinimized(),
      isMaximized: await window.isMaximized(),
      isFullscreen: await window.isFullscreen(),
    }
  } catch (error) {
    console.error('Failed to save window state:', error)
    return null
  }
}

export async function restoreWindowState(state: WindowState): Promise<WebviewWindow | null> {
  try {
    const window = await windowManager.createWindow({
      label: state.label,
      title: state.title,
      url: state.url,
      width: state.bounds.width,
      height: state.bounds.height,
      center: false,
    })

    // Set position
    await window.setPosition({ x: state.bounds.x, y: state.bounds.y } as any)

    // Restore window state
    if (state.isMinimized) {
      await window.minimize()
    } else if (state.isMaximized) {
      await window.maximize()
    } else if (state.isFullscreen) {
      await window.setFullscreen(true)
    }

    if (!state.isVisible) {
      await window.hide()
    }

    return window
  } catch (error) {
    console.error('Failed to restore window state:', error)
    return null
  }
}

// Session management

export interface WindowSession {
  windows: WindowState[]
  activeWindow?: string
  timestamp: number
}

export async function saveSession(): Promise<WindowSession> {
  const windows = getAllWindows()
  const windowStates: WindowState[] = []

  for (const window of windows) {
    const state = await saveWindowState(window.label)
    if (state) {
      windowStates.push(state)
    }
  }

  return {
    windows: windowStates,
    timestamp: Date.now(),
  }
}

export async function restoreSession(session: WindowSession): Promise<void> {
  try {
    // Close all current windows first
    await closeAllSecondaryWindows()

    // Restore each window
    for (const windowState of session.windows) {
      await restoreWindowState(windowState)
    }

    // Focus the active window if specified
    if (session.activeWindow) {
      await focusWindow(session.activeWindow)
    }
  } catch (error) {
    console.error('Failed to restore session:', error)
  }
}

export default windowManager