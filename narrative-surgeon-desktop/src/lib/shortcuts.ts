'use client'

import { useEffect, useCallback } from 'react'

export interface ShortcutDefinition {
  key: string
  description: string
  action: () => void
  preventDefault?: boolean
  category?: 'file' | 'edit' | 'view' | 'tools' | 'navigation' | 'formatting'
}

export const shortcuts = {
  // File Operations
  'Ctrl+S': 'Save manuscript',
  'Ctrl+Shift+S': 'Save as new version',
  'Ctrl+N': 'New manuscript',
  'Ctrl+O': 'Open manuscript',
  'Ctrl+Q': 'Exit application',
  'Ctrl+W': 'Close current manuscript',

  // Edit Operations
  'Ctrl+Z': 'Undo',
  'Ctrl+Y': 'Redo',
  'Ctrl+Shift+Z': 'Redo (alternative)',
  'Ctrl+X': 'Cut',
  'Ctrl+C': 'Copy',
  'Ctrl+V': 'Paste',
  'Ctrl+A': 'Select all',

  // Find and Replace
  'Ctrl+F': 'Find in manuscript',
  'Ctrl+H': 'Find and replace',
  'F3': 'Find next',
  'Shift+F3': 'Find previous',
  'Escape': 'Close find/replace',

  // Text Formatting
  'Ctrl+B': 'Bold text',
  'Ctrl+I': 'Italic text',
  'Ctrl+U': 'Underline text',
  'Ctrl+Shift+H': 'Highlight text',
  'Ctrl+Shift+X': 'Strikethrough text',
  'Ctrl+.': 'Superscript',
  'Ctrl+,': 'Subscript',

  // Paragraph Formatting
  'Ctrl+L': 'Align left',
  'Ctrl+E': 'Align center',
  'Ctrl+R': 'Align right',
  'Ctrl+J': 'Justify',
  'Ctrl+Shift+L': 'Bullet list',
  'Ctrl+Shift+O': 'Numbered list',
  'Ctrl+Shift+Q': 'Block quote',

  // Heading Shortcuts
  'Ctrl+1': 'Heading 1',
  'Ctrl+2': 'Heading 2',
  'Ctrl+3': 'Heading 3',
  'Ctrl+4': 'Heading 4',
  'Ctrl+5': 'Heading 5',
  'Ctrl+6': 'Heading 6',
  'Ctrl+0': 'Normal paragraph',

  // View Controls
  'F11': 'Fullscreen mode',
  'Ctrl+Shift+F': 'Focus mode',
  'Ctrl+Shift+T': 'Typewriter mode',
  'Ctrl+\\': 'Toggle sidebar',
  'Ctrl+;': 'Toggle properties panel',
  'Ctrl++': 'Zoom in',
  'Ctrl+-': 'Zoom out',

  // Navigation
  'Ctrl+G': 'Go to line',
  'Ctrl+Shift+G': 'Go to scene',
  'Ctrl+Up': 'Previous scene',
  'Ctrl+Down': 'Next scene',
  'Ctrl+Home': 'Beginning of manuscript',
  'Ctrl+End': 'End of manuscript',

  // Manuscript-Specific
  'Ctrl+Shift+Enter': 'Insert scene break',
  'Ctrl+Shift+C': 'Insert chapter division',
  'Ctrl+Shift+P': 'Insert page break',
  'Ctrl+Shift+D': 'Duplicate current line/selection',

  // AI and Analysis
  'Ctrl+Shift+A': 'AI analysis of selection',
  'Ctrl+Shift+W': 'Word count and statistics',

  // Comments and Collaboration
  'Ctrl+Alt+M': 'Add comment',
  'Ctrl+Alt+R': 'Reply to comment',
  'Ctrl+Alt+D': 'Delete comment',
  'Ctrl+Shift+R': 'Start revision mode',

  // Tools
  'F7': 'Spell check',
  'Shift+F7': 'Grammar check',
  'Ctrl+Shift+I': 'Import text',
  'Ctrl+Shift+E': 'Export manuscript',

  // Window Management
  'Ctrl+Tab': 'Switch between open manuscripts',
  'Ctrl+Shift+Tab': 'Switch between open manuscripts (reverse)',
  'Ctrl+7': 'Switch to manuscript 7',
  'Ctrl+8': 'Switch to manuscript 8',
  'Ctrl+9': 'Switch to manuscript 9',

  // Help
  'F1': 'Show keyboard shortcuts',
  'Ctrl+?': 'Help and support',
} as const

export type ShortcutKey = keyof typeof shortcuts

export function parseShortcut(shortcut: string): {
  ctrl: boolean
  shift: boolean
  alt: boolean
  key: string
} {
  const parts = shortcut.split('+')
  const key = parts[parts.length - 1]
  
  return {
    ctrl: parts.includes('Ctrl'),
    shift: parts.includes('Shift'),
    alt: parts.includes('Alt'),
    key: key.toLowerCase()
  }
}

export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: string
): boolean {
  const parsed = parseShortcut(shortcut)
  
  return (
    event.ctrlKey === parsed.ctrl &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt &&
    event.key.toLowerCase() === parsed.key
  )
}

export function useKeyboardShortcuts(
  shortcutActions: Record<string, () => void>,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    for (const [shortcut, action] of Object.entries(shortcutActions)) {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault()
        event.stopPropagation()
        action()
        return
      }
    }
  }, [shortcutActions, enabled])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}

export function useGlobalShortcuts() {
  const shortcutActions = {
    'Ctrl+S': () => {
      // Trigger global save
      document.dispatchEvent(new CustomEvent('global-save'))
    },
    
    'Ctrl+N': () => {
      // Trigger new manuscript
      document.dispatchEvent(new CustomEvent('global-new-manuscript'))
    },
    
    'Ctrl+O': () => {
      // Trigger open manuscript
      document.dispatchEvent(new CustomEvent('global-open-manuscript'))
    },
    
    'Ctrl+F': () => {
      // Trigger find dialog
      document.dispatchEvent(new CustomEvent('global-find'))
    },
    
    'Ctrl+H': () => {
      // Trigger find and replace dialog
      document.dispatchEvent(new CustomEvent('global-find-replace'))
    },
    
    'F11': () => {
      // Toggle fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        document.documentElement.requestFullscreen()
      }
    },
    
    'Ctrl+\\': () => {
      // Toggle sidebar
      document.dispatchEvent(new CustomEvent('global-toggle-sidebar'))
    },
    
    'Ctrl+;': () => {
      // Toggle properties panel
      document.dispatchEvent(new CustomEvent('global-toggle-properties'))
    },
    
    'Ctrl+Shift+F': () => {
      // Toggle focus mode
      document.dispatchEvent(new CustomEvent('global-toggle-focus-mode'))
    },
    
    'Ctrl+Shift+A': () => {
      // Trigger AI analysis
      document.dispatchEvent(new CustomEvent('global-ai-analysis'))
    },
    
    'F1': () => {
      // Show shortcuts help
      document.dispatchEvent(new CustomEvent('global-show-shortcuts'))
    }
  }

  useKeyboardShortcuts(shortcutActions)
}

// Shortcut categories for help display
export const shortcutCategories = {
  file: {
    name: 'File Operations',
    shortcuts: [
      'Ctrl+N', 'Ctrl+O', 'Ctrl+S', 'Ctrl+Shift+S', 'Ctrl+W', 'Ctrl+Q'
    ]
  },
  edit: {
    name: 'Edit Operations',
    shortcuts: [
      'Ctrl+Z', 'Ctrl+Y', 'Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+A'
    ]
  },
  formatting: {
    name: 'Text Formatting',
    shortcuts: [
      'Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+Shift+H', 'Ctrl+1', 'Ctrl+2', 'Ctrl+3'
    ]
  },
  find: {
    name: 'Find & Replace',
    shortcuts: [
      'Ctrl+F', 'Ctrl+H', 'F3', 'Shift+F3', 'Escape'
    ]
  },
  view: {
    name: 'View Controls',
    shortcuts: [
      'F11', 'Ctrl+Shift+F', 'Ctrl+\\', 'Ctrl+;', 'Ctrl++', 'Ctrl+-'
    ]
  },
  navigation: {
    name: 'Navigation',
    shortcuts: [
      'Ctrl+G', 'Ctrl+Up', 'Ctrl+Down', 'Ctrl+Home', 'Ctrl+End'
    ]
  },
  manuscript: {
    name: 'Manuscript Tools',
    shortcuts: [
      'Ctrl+Shift+Enter', 'Ctrl+Shift+C', 'Ctrl+Shift+A', 'Ctrl+Shift+W'
    ]
  },
  help: {
    name: 'Help & Support',
    shortcuts: [
      'F1', 'Ctrl+?'
    ]
  }
}

export default shortcuts