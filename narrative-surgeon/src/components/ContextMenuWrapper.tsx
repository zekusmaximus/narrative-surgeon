import React, { useRef, useCallback } from 'react';
import { View, TouchableOpacity, Platform, GestureResponderEvent } from 'react-native';
import { ContextMenuItem, useContextMenu } from './ContextMenu';

interface ContextMenuWrapperProps {
  children: React.ReactNode;
  items: ContextMenuItem[] | ((target: any) => ContextMenuItem[]);
  disabled?: boolean;
  trigger?: 'rightClick' | 'longPress' | 'both';
  onMenuShow?: () => void;
  onMenuHide?: () => void;
  style?: any;
}

export const ContextMenuWrapper: React.FC<ContextMenuWrapperProps> = ({
  children,
  items,
  disabled = false,
  trigger = 'both',
  onMenuShow,
  onMenuHide,
  style,
}) => {
  const { showMenu, hideMenu } = useContextMenu();
  const targetRef = useRef(null);

  const getMenuItems = useCallback(() => {
    if (typeof items === 'function') {
      return items(targetRef.current);
    }
    return items;
  }, [items]);

  const handleContextMenu = useCallback((event: GestureResponderEvent) => {
    if (disabled) return;

    event.preventDefault?.();
    event.stopPropagation?.();

    const menuItems = getMenuItems();
    if (menuItems.length === 0) return;

    let x = 0;
    let y = 0;

    if (Platform.OS === 'web') {
      const nativeEvent = event.nativeEvent as any;
      x = nativeEvent.pageX || nativeEvent.clientX || 0;
      y = nativeEvent.pageY || nativeEvent.clientY || 0;
    } else {
      // For mobile platforms
      const { pageX, pageY, locationX, locationY } = event.nativeEvent;
      x = pageX || locationX || 0;
      y = pageY || locationY || 0;
    }

    onMenuShow?.();
    showMenu(x, y, menuItems);
  }, [disabled, getMenuItems, onMenuShow, showMenu]);

  const handleLongPress = useCallback((event: GestureResponderEvent) => {
    if (disabled || trigger === 'rightClick') return;
    handleContextMenu(event);
  }, [disabled, trigger, handleContextMenu]);

  const handleRightClick = useCallback((event: GestureResponderEvent) => {
    if (disabled || trigger === 'longPress') return;
    if (Platform.OS !== 'web') return;
    handleContextMenu(event);
  }, [disabled, trigger, handleContextMenu]);

  // Props to pass to the wrapper
  const wrapperProps: any = {
    ref: targetRef,
    style,
  };

  // Add event handlers based on trigger type and platform
  if (Platform.OS === 'web') {
    if (trigger === 'rightClick' || trigger === 'both') {
      wrapperProps.onContextMenu = handleRightClick;
    }
    if (trigger === 'longPress' || trigger === 'both') {
      wrapperProps.onTouchStart = (e: any) => {
        // Implement long press for web if needed
      };
    }
  } else {
    if (trigger === 'longPress' || trigger === 'both') {
      wrapperProps.onLongPress = handleLongPress;
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      {...wrapperProps}
    >
      {children}
    </TouchableOpacity>
  );
};

// HOC version for easier integration
export function withContextMenu<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  items: ContextMenuItem[] | ((props: P, ref: any) => ContextMenuItem[]),
  options: Omit<ContextMenuWrapperProps, 'children' | 'items'> = {}
) {
  const ContextMenuEnhancedComponent = React.forwardRef<any, P>((props, ref) => {
    const menuItems = typeof items === 'function' ? items(props, ref) : items;

    return (
      <ContextMenuWrapper items={menuItems} {...options}>
        <WrappedComponent ref={ref} {...props} />
      </ContextMenuWrapper>
    );
  });

  ContextMenuEnhancedComponent.displayName = `withContextMenu(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return ContextMenuEnhancedComponent;
}

// Specialized wrappers for common use cases
interface ListItemContextMenuProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDuplicate?: boolean;
  canDelete?: boolean;
  style?: any;
}

export const ListItemContextMenu: React.FC<ListItemContextMenuProps> = ({
  children,
  onEdit,
  onDuplicate,
  onDelete,
  canEdit = true,
  canDuplicate = true,
  canDelete = true,
  style,
}) => {
  const items: ContextMenuItem[] = [
    ...(canEdit && onEdit ? [{
      id: 'edit',
      label: 'Edit',
      icon: '✏️',
      onPress: onEdit,
    }] : []),
    ...(canDuplicate && onDuplicate ? [{
      id: 'duplicate',
      label: 'Duplicate',
      icon: '📄',
      onPress: onDuplicate,
    }] : []),
    ...(canEdit && canDuplicate && (onEdit || onDuplicate) && canDelete && onDelete ? [{
      id: 'separator',
      separator: true,
    }] : []),
    ...(canDelete && onDelete ? [{
      id: 'delete',
      label: 'Delete',
      icon: '🗑️',
      destructive: true,
      onPress: onDelete,
    }] : []),
  ];

  return (
    <ContextMenuWrapper items={items} style={style}>
      {children}
    </ContextMenuWrapper>
  );
};

interface TextContextMenuProps {
  children: React.ReactNode;
  selectedText?: string;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  style?: any;
}

export const TextContextMenu: React.FC<TextContextMenuProps> = ({
  children,
  selectedText,
  onCut,
  onCopy,
  onPaste,
  onSelectAll,
  style,
}) => {
  const hasSelection = Boolean(selectedText && selectedText.length > 0);

  const items: ContextMenuItem[] = [
    ...(onCut ? [{
      id: 'cut',
      label: 'Cut',
      icon: '✂️',
      shortcut: 'Ctrl+X',
      disabled: !hasSelection,
      onPress: onCut,
    }] : []),
    ...(onCopy ? [{
      id: 'copy',
      label: 'Copy',
      icon: '📋',
      shortcut: 'Ctrl+C',
      disabled: !hasSelection,
      onPress: onCopy,
    }] : []),
    ...(onPaste ? [{
      id: 'paste',
      label: 'Paste',
      icon: '📄',
      shortcut: 'Ctrl+V',
      onPress: onPaste,
    }] : []),
    ...(onSelectAll ? [{
      id: 'select-all',
      label: 'Select All',
      icon: '📑',
      shortcut: 'Ctrl+A',
      onPress: onSelectAll,
    }] : []),
  ];

  return (
    <ContextMenuWrapper items={items} style={style}>
      {children}
    </ContextMenuWrapper>
  );
};

interface ImageContextMenuProps {
  children: React.ReactNode;
  onSave?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onReplace?: () => void;
  onViewFullSize?: () => void;
  style?: any;
}

export const ImageContextMenu: React.FC<ImageContextMenuProps> = ({
  children,
  onSave,
  onCopy,
  onDelete,
  onReplace,
  onViewFullSize,
  style,
}) => {
  const items: ContextMenuItem[] = [
    ...(onViewFullSize ? [{
      id: 'view-full-size',
      label: 'View Full Size',
      icon: '🔍',
      onPress: onViewFullSize,
    }] : []),
    ...(onCopy ? [{
      id: 'copy-image',
      label: 'Copy Image',
      icon: '📋',
      onPress: onCopy,
    }] : []),
    ...(onSave ? [{
      id: 'save-image',
      label: 'Save Image',
      icon: '💾',
      onPress: onSave,
    }] : []),
    ...(onReplace ? [{
      id: 'replace-image',
      label: 'Replace Image',
      icon: '🔄',
      onPress: onReplace,
    }] : []),
    ...((onViewFullSize || onCopy || onSave || onReplace) && onDelete ? [{
      id: 'separator',
      separator: true,
    }] : []),
    ...(onDelete ? [{
      id: 'delete-image',
      label: 'Delete Image',
      icon: '🗑️',
      destructive: true,
      onPress: onDelete,
    }] : []),
  ];

  return (
    <ContextMenuWrapper items={items} style={style}>
      {children}
    </ContextMenuWrapper>
  );
};

export default ContextMenuWrapper;