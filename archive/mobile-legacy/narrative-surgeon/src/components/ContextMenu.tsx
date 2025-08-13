import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
  PanResponder,
  Animated,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
  submenu?: ContextMenuItem[];
  onPress?: () => void;
  separator?: boolean;
}

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  onItemPress?: (item: ContextMenuItem) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  x,
  y,
  items,
  onClose,
  onItemPress,
}) => {
  const { theme } = useTheme();
  const [submenuVisible, setSubmenuVisible] = useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<View>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const calculateMenuPosition = useCallback(() => {
    const menuWidth = 200;
    const menuHeight = items.length * 44; // Approximate height
    
    let adjustedX = x;
    let adjustedY = y;

    // Adjust for screen boundaries
    if (x + menuWidth > screenWidth) {
      adjustedX = screenWidth - menuWidth - 10;
    }
    if (y + menuHeight > screenHeight) {
      adjustedY = screenHeight - menuHeight - 10;
    }

    return { x: Math.max(10, adjustedX), y: Math.max(10, adjustedY) };
  }, [x, y, items.length, screenWidth, screenHeight]);

  const handleItemPress = (item: ContextMenuItem) => {
    if (item.disabled) return;

    if (item.submenu && item.submenu.length > 0) {
      // Show submenu
      setSubmenuVisible(item.id);
      setSubmenuPosition({ x: x + 180, y: y });
    } else {
      // Execute item action
      item.onPress?.();
      onItemPress?.(item);
      onClose();
    }
  };

  const handleSubmenuClose = () => {
    setSubmenuVisible(null);
  };

  const renderMenuItem = (item: ContextMenuItem, index: number) => {
    if (item.separator) {
      return (
        <View key={`separator-${index}`} style={[styles.separator, { backgroundColor: theme.colors.border }]} />
      );
    }

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.menuItem,
          item.disabled && styles.menuItemDisabled,
          item.destructive && { backgroundColor: theme.colors.error + '10' },
        ]}
        onPress={() => handleItemPress(item)}
        disabled={item.disabled}
      >
        <View style={styles.menuItemContent}>
          {item.icon && (
            <Text style={[styles.menuItemIcon, { color: item.destructive ? theme.colors.error : theme.colors.text }]}>
              {item.icon}
            </Text>
          )}
          <Text
            style={[
              styles.menuItemText,
              {
                color: item.disabled
                  ? theme.colors.disabled
                  : item.destructive
                  ? theme.colors.error
                  : theme.colors.text,
              },
            ]}
          >
            {item.label}
          </Text>
          {item.submenu && item.submenu.length > 0 && (
            <Text style={[styles.submenuIndicator, { color: theme.colors.textSecondary }]}>
              ▶
            </Text>
          )}
        </View>
        {item.shortcut && (
          <Text style={[styles.shortcut, { color: theme.colors.textTertiary }]}>
            {item.shortcut}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const position = calculateMenuPosition();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          ref={menuRef}
          style={[
            styles.menu,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              left: position.x,
              top: position.y,
              ...theme.shadows.md,
            },
          ]}
        >
          {items.map(renderMenuItem)}
        </View>

        {/* Submenu */}
        {submenuVisible && (
          <ContextMenu
            visible={true}
            x={submenuPosition.x}
            y={submenuPosition.y}
            items={items.find(item => item.id === submenuVisible)?.submenu || []}
            onClose={handleSubmenuClose}
            onItemPress={onItemPress}
          />
        )}
      </TouchableOpacity>
    </Modal>
  );
};

// Context menu provider for easier usage
interface ContextMenuContextType {
  showMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  hideMenu: () => void;
}

const ContextMenuContext = React.createContext<ContextMenuContextType | undefined>(undefined);

interface ContextMenuProviderProps {
  children: React.ReactNode;
}

export const ContextMenuProvider: React.FC<ContextMenuProviderProps> = ({ children }) => {
  const [menuState, setMenuState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
  }>({
    visible: false,
    x: 0,
    y: 0,
    items: [],
  });

  const showMenu = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
    setMenuState({ visible: true, x, y, items });
  }, []);

  const hideMenu = useCallback(() => {
    setMenuState(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <ContextMenuContext.Provider value={{ showMenu, hideMenu }}>
      {children}
      <ContextMenu
        visible={menuState.visible}
        x={menuState.x}
        y={menuState.y}
        items={menuState.items}
        onClose={hideMenu}
      />
    </ContextMenuContext.Provider>
  );
};

export const useContextMenu = () => {
  const context = React.useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider');
  }
  return context;
};

// Hook for adding context menu to components
export const useContextMenuHandler = (items: ContextMenuItem[]) => {
  const { showMenu } = useContextMenu();

  const handleContextMenu = useCallback((event: any) => {
    if (Platform.OS === 'web') {
      event.preventDefault();
      showMenu(event.nativeEvent.pageX, event.nativeEvent.pageY, items);
    } else {
      // For mobile, use long press
      const { locationX, locationY, pageX, pageY } = event.nativeEvent;
      showMenu(pageX || locationX, pageY || locationY, items);
    }
  }, [showMenu, items]);

  const contextMenuProps = Platform.OS === 'web' 
    ? { onContextMenu: handleContextMenu }
    : { onLongPress: handleContextMenu };

  return contextMenuProps;
};

// Pre-built context menus for common use cases
export const createManuscriptContextMenu = (
  manuscriptId: string,
  actions: {
    onEdit: () => void;
    onDuplicate: () => void;
    onExport: () => void;
    onDelete: () => void;
    onAnalyze: () => void;
    onVersionHistory: () => void;
  }
): ContextMenuItem[] => [
  {
    id: 'edit',
    label: 'Edit Manuscript',
    icon: '✏️',
    shortcut: 'Ctrl+E',
    onPress: actions.onEdit,
  },
  {
    id: 'analyze',
    label: 'Analyze',
    icon: '🔍',
    shortcut: 'Ctrl+A',
    onPress: actions.onAnalyze,
  },
  {
    id: 'version-history',
    label: 'Version History',
    icon: '📝',
    onPress: actions.onVersionHistory,
  },
  { id: 'sep1', separator: true },
  {
    id: 'duplicate',
    label: 'Duplicate',
    icon: '📄',
    onPress: actions.onDuplicate,
  },
  {
    id: 'export',
    label: 'Export',
    icon: '📤',
    shortcut: 'Ctrl+Shift+E',
    submenu: [
      {
        id: 'export-pdf',
        label: 'Export as PDF',
        icon: '📄',
        onPress: () => actions.onExport(),
      },
      {
        id: 'export-docx',
        label: 'Export as DOCX',
        icon: '📝',
        onPress: () => actions.onExport(),
      },
      {
        id: 'export-epub',
        label: 'Export as EPUB',
        icon: '📖',
        onPress: () => actions.onExport(),
      },
    ],
  },
  { id: 'sep2', separator: true },
  {
    id: 'delete',
    label: 'Delete',
    icon: '🗑️',
    shortcut: 'Delete',
    destructive: true,
    onPress: actions.onDelete,
  },
];

export const createSceneContextMenu = (
  sceneId: string,
  actions: {
    onEdit: () => void;
    onInsertBefore: () => void;
    onInsertAfter: () => void;
    onDuplicate: () => void;
    onMove: () => void;
    onDelete: () => void;
    onAnalyze: () => void;
  }
): ContextMenuItem[] => [
  {
    id: 'edit',
    label: 'Edit Scene',
    icon: '✏️',
    onPress: actions.onEdit,
  },
  {
    id: 'analyze',
    label: 'Analyze Scene',
    icon: '🔍',
    onPress: actions.onAnalyze,
  },
  { id: 'sep1', separator: true },
  {
    id: 'insert-before',
    label: 'Insert Scene Before',
    icon: '➕',
    onPress: actions.onInsertBefore,
  },
  {
    id: 'insert-after',
    label: 'Insert Scene After',
    icon: '➕',
    onPress: actions.onInsertAfter,
  },
  {
    id: 'duplicate',
    label: 'Duplicate Scene',
    icon: '📄',
    onPress: actions.onDuplicate,
  },
  {
    id: 'move',
    label: 'Move Scene',
    icon: '📁',
    submenu: [
      {
        id: 'move-up',
        label: 'Move Up',
        icon: '⬆️',
        onPress: actions.onMove,
      },
      {
        id: 'move-down',
        label: 'Move Down',
        icon: '⬇️',
        onPress: actions.onMove,
      },
      {
        id: 'move-to-chapter',
        label: 'Move to Chapter...',
        icon: '📖',
        onPress: actions.onMove,
      },
    ],
  },
  { id: 'sep2', separator: true },
  {
    id: 'delete',
    label: 'Delete Scene',
    icon: '🗑️',
    destructive: true,
    onPress: actions.onDelete,
  },
];

export const createEditorContextMenu = (
  selection: { start: number; end: number; text: string },
  actions: {
    onCut: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onSelectAll: () => void;
    onAnalyzeText: () => void;
    onAddNote: () => void;
    onLookupWord: () => void;
  }
): ContextMenuItem[] => {
  const hasSelection = selection.end > selection.start;
  
  return [
    {
      id: 'cut',
      label: 'Cut',
      icon: '✂️',
      shortcut: 'Ctrl+X',
      disabled: !hasSelection,
      onPress: actions.onCut,
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: '📋',
      shortcut: 'Ctrl+C',
      disabled: !hasSelection,
      onPress: actions.onCopy,
    },
    {
      id: 'paste',
      label: 'Paste',
      icon: '📄',
      shortcut: 'Ctrl+V',
      onPress: actions.onPaste,
    },
    {
      id: 'select-all',
      label: 'Select All',
      icon: '📑',
      shortcut: 'Ctrl+A',
      onPress: actions.onSelectAll,
    },
    { id: 'sep1', separator: true },
    {
      id: 'analyze-text',
      label: hasSelection ? 'Analyze Selection' : 'Analyze Paragraph',
      icon: '🔍',
      onPress: actions.onAnalyzeText,
    },
    {
      id: 'add-note',
      label: 'Add Note',
      icon: '📝',
      onPress: actions.onAddNote,
    },
    ...(hasSelection && selection.text.split(' ').length === 1 ? [{
      id: 'lookup-word',
      label: 'Look up Word',
      icon: '📖',
      onPress: actions.onLookupWord,
    }] : []),
  ];
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    minWidth: 200,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 14,
    flex: 1,
  },
  submenuIndicator: {
    fontSize: 12,
    marginLeft: 8,
  },
  shortcut: {
    fontSize: 12,
    fontFamily: 'Courier New',
    marginLeft: 12,
  },
  separator: {
    height: 1,
    marginVertical: 4,
    marginHorizontal: 8,
  },
});