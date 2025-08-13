import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  callback: () => void;
  description?: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

interface ShortcutMap {
  [key: string]: KeyboardShortcut;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[], enabled = true) => {
  const shortcutMapRef = useRef<ShortcutMap>({});

  // Build shortcut map
  useEffect(() => {
    const map: ShortcutMap = {};
    shortcuts.forEach(shortcut => {
      const key = buildShortcutKey(shortcut);
      map[key] = shortcut;
    });
    shortcutMapRef.current = map;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const key = buildShortcutKeyFromEvent(event);
    const shortcut = shortcutMapRef.current[key];

    if (shortcut) {
      if (shortcut.preventDefault !== false) {
        event.preventDefault();
      }
      if (shortcut.stopPropagation !== false) {
        event.stopPropagation();
      }
      shortcut.callback();
    }
  }, [enabled]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return shortcutMapRef.current;
};

function buildShortcutKey(shortcut: KeyboardShortcut): string {
  const parts = [];
  
  if (shortcut.ctrl) parts.push('ctrl');
  if (shortcut.shift) parts.push('shift');
  if (shortcut.alt) parts.push('alt');
  if (shortcut.meta) parts.push('meta');
  parts.push(shortcut.key.toLowerCase());
  
  return parts.join('+');
}

function buildShortcutKeyFromEvent(event: KeyboardEvent): string {
  const parts = [];
  
  if (event.ctrlKey) parts.push('ctrl');
  if (event.shiftKey) parts.push('shift');
  if (event.altKey) parts.push('alt');
  if (event.metaKey) parts.push('meta');
  parts.push(event.key.toLowerCase());
  
  return parts.join('+');
}

// Hook for global application shortcuts
export const useGlobalShortcuts = (actions: {
  newManuscript?: () => void;
  openManuscript?: () => void;
  saveManuscript?: () => void;
  exportManuscript?: () => void;
  showCommandPalette?: () => void;
  showSearch?: () => void;
  toggleSidebar?: () => void;
  toggleTheme?: () => void;
  showSettings?: () => void;
  undo?: () => void;
  redo?: () => void;
  cut?: () => void;
  copy?: () => void;
  paste?: () => void;
  selectAll?: () => void;
  find?: () => void;
  findNext?: () => void;
  replace?: () => void;
  zoomIn?: () => void;
  zoomOut?: () => void;
  resetZoom?: () => void;
  fullscreen?: () => void;
  closeWindow?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [
    // File operations
    ...(actions.newManuscript ? [{
      key: 'n',
      ctrl: true,
      callback: actions.newManuscript,
      description: 'New Manuscript',
    }] : []),
    ...(actions.openManuscript ? [{
      key: 'o',
      ctrl: true,
      callback: actions.openManuscript,
      description: 'Open Manuscript',
    }] : []),
    ...(actions.saveManuscript ? [{
      key: 's',
      ctrl: true,
      callback: actions.saveManuscript,
      description: 'Save Manuscript',
    }] : []),
    ...(actions.exportManuscript ? [{
      key: 'e',
      ctrl: true,
      shift: true,
      callback: actions.exportManuscript,
      description: 'Export Manuscript',
    }] : []),

    // Application shortcuts
    ...(actions.showCommandPalette ? [{
      key: 'k',
      ctrl: true,
      callback: actions.showCommandPalette,
      description: 'Command Palette',
    }] : []),
    ...(actions.showSearch ? [{
      key: 'f',
      ctrl: true,
      shift: true,
      callback: actions.showSearch,
      description: 'Global Search',
    }] : []),
    ...(actions.toggleSidebar ? [{
      key: 'b',
      ctrl: true,
      callback: actions.toggleSidebar,
      description: 'Toggle Sidebar',
    }] : []),
    ...(actions.toggleTheme ? [{
      key: 'd',
      ctrl: true,
      shift: true,
      callback: actions.toggleTheme,
      description: 'Toggle Theme',
    }] : []),
    ...(actions.showSettings ? [{
      key: ',',
      ctrl: true,
      callback: actions.showSettings,
      description: 'Settings',
    }] : []),

    // Edit operations
    ...(actions.undo ? [{
      key: 'z',
      ctrl: true,
      callback: actions.undo,
      description: 'Undo',
    }] : []),
    ...(actions.redo ? [
      {
        key: 'z',
        ctrl: true,
        shift: true,
        callback: actions.redo,
        description: 'Redo',
      },
      {
        key: 'y',
        ctrl: true,
        callback: actions.redo,
        description: 'Redo',
      }
    ] : []),
    ...(actions.cut ? [{
      key: 'x',
      ctrl: true,
      callback: actions.cut,
      description: 'Cut',
    }] : []),
    ...(actions.copy ? [{
      key: 'c',
      ctrl: true,
      callback: actions.copy,
      description: 'Copy',
    }] : []),
    ...(actions.paste ? [{
      key: 'v',
      ctrl: true,
      callback: actions.paste,
      description: 'Paste',
    }] : []),
    ...(actions.selectAll ? [{
      key: 'a',
      ctrl: true,
      callback: actions.selectAll,
      description: 'Select All',
    }] : []),

    // Search operations
    ...(actions.find ? [{
      key: 'f',
      ctrl: true,
      callback: actions.find,
      description: 'Find',
    }] : []),
    ...(actions.findNext ? [{
      key: 'g',
      ctrl: true,
      callback: actions.findNext,
      description: 'Find Next',
    }] : []),
    ...(actions.replace ? [{
      key: 'h',
      ctrl: true,
      callback: actions.replace,
      description: 'Find & Replace',
    }] : []),

    // View operations
    ...(actions.zoomIn ? [
      {
        key: '=',
        ctrl: true,
        callback: actions.zoomIn,
        description: 'Zoom In',
      },
      {
        key: '+',
        ctrl: true,
        callback: actions.zoomIn,
        description: 'Zoom In',
      }
    ] : []),
    ...(actions.zoomOut ? [{
      key: '-',
      ctrl: true,
      callback: actions.zoomOut,
      description: 'Zoom Out',
    }] : []),
    ...(actions.resetZoom ? [{
      key: '0',
      ctrl: true,
      callback: actions.resetZoom,
      description: 'Reset Zoom',
    }] : []),
    ...(actions.fullscreen ? [{
      key: 'F11',
      callback: actions.fullscreen,
      description: 'Toggle Fullscreen',
    }] : []),

    // Window operations
    ...(actions.closeWindow ? [{
      key: 'w',
      ctrl: true,
      callback: actions.closeWindow,
      description: 'Close Window',
    }] : []),
  ];

  return useKeyboardShortcuts(shortcuts);
};

// Hook for editor-specific shortcuts
export const useEditorShortcuts = (actions: {
  bold?: () => void;
  italic?: () => void;
  underline?: () => void;
  strikethrough?: () => void;
  insertLink?: () => void;
  insertImage?: () => void;
  increaseIndent?: () => void;
  decreaseIndent?: () => void;
  insertHeading?: (level: number) => void;
  insertQuote?: () => void;
  insertList?: () => void;
  insertNumberedList?: () => void;
  insertHorizontalRule?: () => void;
  toggleComment?: () => void;
  duplicateLine?: () => void;
  deleteLine?: () => void;
  moveLinesUp?: () => void;
  moveLinesDown?: () => void;
  goToLine?: () => void;
  formatDocument?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [
    // Text formatting
    ...(actions.bold ? [{
      key: 'b',
      ctrl: true,
      callback: actions.bold,
      description: 'Bold',
    }] : []),
    ...(actions.italic ? [{
      key: 'i',
      ctrl: true,
      callback: actions.italic,
      description: 'Italic',
    }] : []),
    ...(actions.underline ? [{
      key: 'u',
      ctrl: true,
      callback: actions.underline,
      description: 'Underline',
    }] : []),
    ...(actions.strikethrough ? [{
      key: 's',
      ctrl: true,
      shift: true,
      callback: actions.strikethrough,
      description: 'Strikethrough',
    }] : []),

    // Content insertion
    ...(actions.insertLink ? [{
      key: 'k',
      ctrl: true,
      callback: actions.insertLink,
      description: 'Insert Link',
    }] : []),
    ...(actions.insertImage ? [{
      key: 'i',
      ctrl: true,
      shift: true,
      callback: actions.insertImage,
      description: 'Insert Image',
    }] : []),

    // Indentation
    ...(actions.increaseIndent ? [{
      key: 'Tab',
      callback: actions.increaseIndent,
      description: 'Increase Indent',
    }] : []),
    ...(actions.decreaseIndent ? [{
      key: 'Tab',
      shift: true,
      callback: actions.decreaseIndent,
      description: 'Decrease Indent',
    }] : []),

    // Headings
    ...(actions.insertHeading ? [
      {
        key: '1',
        ctrl: true,
        callback: () => actions.insertHeading(1),
        description: 'Heading 1',
      },
      {
        key: '2',
        ctrl: true,
        callback: () => actions.insertHeading(2),
        description: 'Heading 2',
      },
      {
        key: '3',
        ctrl: true,
        callback: () => actions.insertHeading(3),
        description: 'Heading 3',
      },
    ] : []),

    // Lists and blocks
    ...(actions.insertQuote ? [{
      key: 'q',
      ctrl: true,
      shift: true,
      callback: actions.insertQuote,
      description: 'Quote',
    }] : []),
    ...(actions.insertList ? [{
      key: 'l',
      ctrl: true,
      shift: true,
      callback: actions.insertList,
      description: 'Bullet List',
    }] : []),
    ...(actions.insertNumberedList ? [{
      key: 'n',
      ctrl: true,
      shift: true,
      callback: actions.insertNumberedList,
      description: 'Numbered List',
    }] : []),

    // Line operations
    ...(actions.duplicateLine ? [{
      key: 'd',
      ctrl: true,
      callback: actions.duplicateLine,
      description: 'Duplicate Line',
    }] : []),
    ...(actions.deleteLine ? [{
      key: 'x',
      ctrl: true,
      shift: true,
      callback: actions.deleteLine,
      description: 'Delete Line',
    }] : []),
    ...(actions.moveLinesUp ? [{
      key: 'ArrowUp',
      alt: true,
      callback: actions.moveLinesUp,
      description: 'Move Lines Up',
    }] : []),
    ...(actions.moveLinesDown ? [{
      key: 'ArrowDown',
      alt: true,
      callback: actions.moveLinesDown,
      description: 'Move Lines Down',
    }] : []),

    // Navigation and utilities
    ...(actions.goToLine ? [{
      key: 'g',
      ctrl: true,
      callback: actions.goToLine,
      description: 'Go to Line',
    }] : []),
    ...(actions.formatDocument ? [{
      key: 'f',
      ctrl: true,
      shift: true,
      alt: true,
      callback: actions.formatDocument,
      description: 'Format Document',
    }] : []),
  ];

  return useKeyboardShortcuts(shortcuts);
};

// Utility to format shortcut for display
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts = [];
  
  if (Platform.OS === 'web') {
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('Cmd');
  } else {
    // For mobile, we might use different symbols
    if (shortcut.ctrl) parts.push('⌃');
    if (shortcut.shift) parts.push('⇧');
    if (shortcut.alt) parts.push('⌥');
    if (shortcut.meta) parts.push('⌘');
  }
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(Platform.OS === 'web' ? '+' : '');
};

export default useKeyboardShortcuts;