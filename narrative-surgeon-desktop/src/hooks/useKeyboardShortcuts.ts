import { useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface KeyboardShortcut {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void | Promise<void>;
  description: string;
  category: string;
}

export interface KeyboardShortcutsHookOptions {
  onSave?: () => void | Promise<void>;
  onUndo?: () => void | Promise<void>;
  onRedo?: () => void | Promise<void>;
  onFind?: () => void | Promise<void>;
  onReplace?: () => void | Promise<void>;
  onGlobalSearch?: () => void | Promise<void>;
  onBold?: () => void | Promise<void>;
  onItalic?: () => void | Promise<void>;
  onQuickAI?: () => void | Promise<void>;
  onDistractionFree?: () => void | Promise<void>;
  onSceneNavigation?: (sceneIndex: number) => void | Promise<void>;
  onFocusMode?: () => void | Promise<void>;
  onNewManuscript?: () => void | Promise<void>;
  onOpenManuscript?: () => void | Promise<void>;
  onZoomIn?: () => void | Promise<void>;
  onZoomOut?: () => void | Promise<void>;
  onZoomReset?: () => void | Promise<void>;
  onToggleTypewriter?: () => void | Promise<void>;
  onFloatingNotes?: () => void | Promise<void>;
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export const useKeyboardShortcuts = (options: KeyboardShortcutsHookOptions = {}) => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const shortcuts: KeyboardShortcut[] = [
    // File operations
    {
      key: 'n',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onNewManuscript?.(),
      description: 'New manuscript',
      category: 'File'
    },
    {
      key: 'o',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onOpenManuscript?.(),
      description: 'Open manuscript',
      category: 'File'
    },
    {
      key: 's',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onSave?.(),
      description: 'Save manuscript',
      category: 'File'
    },

    // Edit operations
    {
      key: 'z',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onUndo?.(),
      description: 'Undo',
      category: 'Edit'
    },
    {
      key: 'y',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onRedo?.(),
      description: 'Redo',
      category: 'Edit'
    },
    {
      key: 'z',
      ctrlOrCmd: true,
      shift: true,
      action: () => optionsRef.current.onRedo?.(),
      description: 'Redo (alternative)',
      category: 'Edit'
    },

    // Find and Replace
    {
      key: 'f',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onFind?.(),
      description: 'Find',
      category: 'Search'
    },
    {
      key: 'h',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onReplace?.(),
      description: 'Find and replace',
      category: 'Search'
    },
    {
      key: 'f',
      ctrlOrCmd: true,
      shift: true,
      action: () => optionsRef.current.onGlobalSearch?.(),
      description: 'Global search',
      category: 'Search'
    },

    // Formatting
    {
      key: 'b',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onBold?.(),
      description: 'Bold',
      category: 'Formatting'
    },
    {
      key: 'i',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onItalic?.(),
      description: 'Italic',
      category: 'Formatting'
    },

    // AI Features
    {
      key: 'Enter',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onQuickAI?.(),
      description: 'Quick AI suggestion',
      category: 'AI'
    },

    // View modes
    {
      key: 'd',
      ctrlOrCmd: true,
      shift: true,
      action: async () => {
        await optionsRef.current.onDistractionFree?.();
        await invoke('open_distraction_free_mode');
      },
      description: 'Distraction-free mode',
      category: 'View'
    },
    {
      key: 'f',
      ctrlOrCmd: true,
      shift: true,
      action: () => optionsRef.current.onFocusMode?.(),
      description: 'Focus mode',
      category: 'View'
    },
    {
      key: 't',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onToggleTypewriter?.(),
      description: 'Toggle typewriter mode',
      category: 'View'
    },
    {
      key: 'n',
      ctrlOrCmd: true,
      shift: true,
      action: async () => {
        await optionsRef.current.onFloatingNotes?.();
        await invoke('open_floating_notes');
      },
      description: 'Open floating notes',
      category: 'View'
    },

    // Zoom
    {
      key: '=',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onZoomIn?.(),
      description: 'Zoom in',
      category: 'View'
    },
    {
      key: '+',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onZoomIn?.(),
      description: 'Zoom in (alternative)',
      category: 'View'
    },
    {
      key: '-',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onZoomOut?.(),
      description: 'Zoom out',
      category: 'View'
    },
    {
      key: '0',
      ctrlOrCmd: true,
      action: () => optionsRef.current.onZoomReset?.(),
      description: 'Reset zoom',
      category: 'View'
    },

    // Scene navigation (1-9)
    ...Array.from({ length: 9 }, (_, i) => ({
      key: (i + 1).toString(),
      ctrlOrCmd: true,
      action: () => optionsRef.current.onSceneNavigation?.(i),
      description: `Navigate to scene ${i + 1}`,
      category: 'Navigation'
    })),
  ];

  const handleKeyDown = useCallback(
    async (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
      const ctrlOrCmd = isMac ? metaKey : ctrlKey;

      // Find matching shortcut
      const shortcut = shortcuts.find(s => 
        s.key.toLowerCase() === key.toLowerCase() &&
        !!s.ctrlOrCmd === ctrlOrCmd &&
        !!s.shift === shiftKey &&
        !!s.alt === altKey
      );

      if (shortcut) {
        event.preventDefault();
        event.stopPropagation();
        
        try {
          await shortcut.action();
        } catch (error) {
          console.error('Keyboard shortcut error:', error);
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts,
    registerShortcut: (shortcut: KeyboardShortcut) => {
      shortcuts.push(shortcut);
    },
    unregisterShortcut: (key: string, modifiers?: { ctrlOrCmd?: boolean; shift?: boolean; alt?: boolean }) => {
      const index = shortcuts.findIndex(s => 
        s.key === key &&
        !!s.ctrlOrCmd === !!modifiers?.ctrlOrCmd &&
        !!s.shift === !!modifiers?.shift &&
        !!s.alt === !!modifiers?.alt
      );
      if (index >= 0) {
        shortcuts.splice(index, 1);
      }
    },
    getShortcutsByCategory: (category: string) => {
      return shortcuts.filter(s => s.category === category);
    },
    getAllShortcuts: () => shortcuts,
  };
};

// Hook for listening to menu events from Tauri
export const useMenuEvents = (callbacks: {
  onNewManuscript?: () => void;
  onOpenManuscript?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onPrint?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
  onGlobalSearch?: () => void;
  onFocusMode?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onAnalyzeScene?: () => void;
  onAnalyzeFull?: () => void;
  onQuickAI?: () => void;
  onSceneComparison?: () => void;
  onStatistics?: () => void;
  onPreferences?: () => void;
  onAISettings?: () => void;
  onExportSettings?: () => void;
}) => {
  useEffect(() => {
    const setupMenuListeners = async () => {
      // Import Tauri's event system
      const { listen } = await import('@tauri-apps/api/event');
      
      // Listen for menu events
      const unlisten = await listen('menu-action', (event) => {
        const action = event.payload as string;
        
        switch (action) {
          case 'new_manuscript':
            callbacks.onNewManuscript?.();
            break;
          case 'open_manuscript':
            callbacks.onOpenManuscript?.();
            break;
          case 'save':
            callbacks.onSave?.();
            break;
          case 'save_as':
            callbacks.onSaveAs?.();
            break;
          case 'print':
            callbacks.onPrint?.();
            break;
          case 'undo':
            callbacks.onUndo?.();
            break;
          case 'redo':
            callbacks.onRedo?.();
            break;
          case 'find':
            callbacks.onFind?.();
            break;
          case 'replace':
            callbacks.onReplace?.();
            break;
          case 'global_search':
            callbacks.onGlobalSearch?.();
            break;
          case 'focus_mode':
            callbacks.onFocusMode?.();
            break;
          case 'zoom_in':
            callbacks.onZoomIn?.();
            break;
          case 'zoom_out':
            callbacks.onZoomOut?.();
            break;
          case 'zoom_reset':
            callbacks.onZoomReset?.();
            break;
          case 'analyze_scene':
            callbacks.onAnalyzeScene?.();
            break;
          case 'analyze_full':
            callbacks.onAnalyzeFull?.();
            break;
          case 'quick_ai':
            callbacks.onQuickAI?.();
            break;
          case 'scene_comparison':
            callbacks.onSceneComparison?.();
            break;
          case 'statistics':
            callbacks.onStatistics?.();
            break;
          case 'preferences':
            callbacks.onPreferences?.();
            break;
          case 'ai_settings':
            callbacks.onAISettings?.();
            break;
          case 'export_settings':
            callbacks.onExportSettings?.();
            break;
          default:
            console.log('Unhandled menu action:', action);
        }
      });
      
      return unlisten;
    };

    let unlistenPromise: Promise<() => void>;
    
    setupMenuListeners().then(unlisten => {
      unlistenPromise = Promise.resolve(unlisten);
    });

    return () => {
      if (unlistenPromise) {
        unlistenPromise.then(unlisten => unlisten());
      }
    };
  }, [callbacks]);
};

// Utility function to format shortcut display
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  
  if (shortcut.ctrlOrCmd) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(isMac ? '' : '+');
};

// Predefined shortcut configurations for common use cases
export const createDefaultShortcuts = (
  manuscriptCallbacks: KeyboardShortcutsHookOptions
) => {
  return useKeyboardShortcuts(manuscriptCallbacks);
};