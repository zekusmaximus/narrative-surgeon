import React from 'react';
import { View, StyleSheet, ViewStyle, ScrollView, Modal, Text, TouchableOpacity } from 'react-native';
import { useResponsive, useResponsiveDimensions, useResponsiveGrid } from '../hooks/useResponsive';
import { useTheme } from '../theme/ThemeProvider';

// Container component with responsive padding and max-width
interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number | string;
  fluid?: boolean;
  centerContent?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  maxWidth,
  fluid = false,
  centerContent = false,
}) => {
  const { getResponsivePadding } = useResponsiveDimensions();
  const { theme } = useTheme();

  const containerStyle: ViewStyle = {
    flex: 1,
    paddingHorizontal: getResponsivePadding({
      xs: 16,
      sm: 20,
      md: 24,
      lg: 32,
      xl: 40,
    }),
    ...(maxWidth && !fluid ? { maxWidth, alignSelf: 'center' } : {}),
    ...(centerContent ? { justifyContent: 'center', alignItems: 'center' } : {}),
  };

  return (
    <View style={[containerStyle, style]}>
      {children}
    </View>
  );
};

// Grid system
interface ResponsiveGridProps {
  children: React.ReactElement[];
  itemMinWidth?: number;
  gap?: number;
  style?: ViewStyle;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  itemMinWidth = 200,
  gap = 16,
  style,
}) => {
  const { columns, itemWidth } = useResponsiveGrid(itemMinWidth, gap);

  return (
    <View style={[styles.grid, { gap }, style]}>
      {children.map((child, index) => (
        <View
          key={index}
          style={{
            width: itemWidth,
            marginBottom: gap,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

// Flex grid with columns
interface ResponsiveColumnsProps {
  children: React.ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
  };
  gap?: number;
  style?: ViewStyle;
}

export const ResponsiveColumns: React.FC<ResponsiveColumnsProps> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 16,
  style,
}) => {
  const { isBreakpointUp } = useResponsive();

  const getColumns = () => {
    if (columns.xxl && isBreakpointUp('xxl')) return columns.xxl;
    if (columns.xl && isBreakpointUp('xl')) return columns.xl;
    if (columns.lg && isBreakpointUp('lg')) return columns.lg;
    if (columns.md && isBreakpointUp('md')) return columns.md;
    if (columns.sm && isBreakpointUp('sm')) return columns.sm;
    return columns.xs || 1;
  };

  const numColumns = getColumns();
  const childrenArray = React.Children.toArray(children);

  return (
    <View style={[styles.flexGrid, { gap }, style]}>
      {Array.from({ length: Math.ceil(childrenArray.length / numColumns) }, (_, rowIndex) => (
        <View key={rowIndex} style={[styles.gridRow, { gap }]}>
          {Array.from({ length: numColumns }, (_, colIndex) => {
            const childIndex = rowIndex * numColumns + colIndex;
            const child = childrenArray[childIndex];
            return (
              <View key={colIndex} style={styles.gridCell}>
                {child}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// Two-panel layout that collapses on mobile
interface ResponsiveTwoPanelProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  sidebarWidth?: number;
  collapsedOnMobile?: boolean;
  sidebarPosition?: 'left' | 'right';
  style?: ViewStyle;
}

export const ResponsiveTwoPanel: React.FC<ResponsiveTwoPanelProps> = ({
  sidebar,
  main,
  sidebarWidth = 280,
  collapsedOnMobile = true,
  sidebarPosition = 'left',
  style,
}) => {
  const { isSmallScreen } = useResponsive();
  const { theme } = useTheme();

  if (isSmallScreen && collapsedOnMobile) {
    // On small screens, show only main content (sidebar can be toggled separately)
    return (
      <View style={[styles.container, style]}>
        {main}
      </View>
    );
  }

  return (
    <View style={[styles.twoPanel, style]}>
      {sidebarPosition === 'left' && (
        <View style={[styles.sidebar, { width: sidebarWidth, borderRightColor: theme.colors.border }]}>
          {sidebar}
        </View>
      )}
      <View style={styles.mainContent}>
        {main}
      </View>
      {sidebarPosition === 'right' && (
        <View style={[styles.sidebar, { width: sidebarWidth, borderLeftColor: theme.colors.border }]}>
          {sidebar}
        </View>
      )}
    </View>
  );
};

// Three-panel layout that adapts to screen size
interface ResponsiveThreePanelProps {
  leftSidebar?: React.ReactNode;
  main: React.ReactNode;
  rightSidebar?: React.ReactNode;
  leftSidebarWidth?: number;
  rightSidebarWidth?: number;
  style?: ViewStyle;
}

export const ResponsiveThreePanel: React.FC<ResponsiveThreePanelProps> = ({
  leftSidebar,
  main,
  rightSidebar,
  leftSidebarWidth = 240,
  rightSidebarWidth = 280,
  style,
}) => {
  const { isSmallScreen, isMediumScreen, isLargeScreen } = useResponsive();
  const { theme } = useTheme();

  if (isSmallScreen) {
    // Mobile: Show only main content
    return (
      <View style={[styles.container, style]}>
        {main}
      </View>
    );
  }

  if (isMediumScreen) {
    // Tablet: Show main + one sidebar (prefer right sidebar)
    return (
      <View style={[styles.twoPanel, style]}>
        <View style={styles.mainContent}>
          {main}
        </View>
        {(rightSidebar || leftSidebar) && (
          <View style={[
            styles.sidebar,
            {
              width: rightSidebarWidth,
              borderLeftWidth: 1,
              borderLeftColor: theme.colors.border,
            },
          ]}>
            {rightSidebar || leftSidebar}
          </View>
        )}
      </View>
    );
  }

  // Desktop: Show all three panels
  return (
    <View style={[styles.threePanel, style]}>
      {leftSidebar && (
        <View style={[
          styles.sidebar,
          {
            width: leftSidebarWidth,
            borderRightWidth: 1,
            borderRightColor: theme.colors.border,
          },
        ]}>
          {leftSidebar}
        </View>
      )}
      <View style={styles.mainContent}>
        {main}
      </View>
      {rightSidebar && (
        <View style={[
          styles.sidebar,
          {
            width: rightSidebarWidth,
            borderLeftWidth: 1,
            borderLeftColor: theme.colors.border,
          },
        ]}>
          {rightSidebar}
        </View>
      )}
    </View>
  );
};

// Responsive card grid
interface ResponsiveCardGridProps {
  children: React.ReactElement[];
  minCardWidth?: number;
  cardAspectRatio?: number;
  gap?: number;
  style?: ViewStyle;
}

export const ResponsiveCardGrid: React.FC<ResponsiveCardGridProps> = ({
  children,
  minCardWidth = 280,
  cardAspectRatio = 1.4,
  gap = 16,
  style,
}) => {
  const { width } = useResponsive();

  const calculateLayout = () => {
    const availableWidth = width - (gap * 2);
    const columns = Math.max(1, Math.floor(availableWidth / (minCardWidth + gap)));
    const cardWidth = (availableWidth - (gap * (columns - 1))) / columns;
    const cardHeight = cardWidth / cardAspectRatio;

    return { columns, cardWidth, cardHeight };
  };

  const { columns, cardWidth, cardHeight } = calculateLayout();

  return (
    <ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={false}>
      <View style={[styles.cardGrid, { gap }]}>
        {children.map((child, index) => (
          <View
            key={index}
            style={{
              width: cardWidth,
              height: cardHeight,
              marginBottom: gap,
            }}
          >
            {child}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// Responsive navigation tabs
interface ResponsiveTabsProps {
  tabs: { key: string; title: string; content: React.ReactNode }[];
  activeTab: string;
  onTabChange: (key: string) => void;
  scrollable?: boolean;
  style?: ViewStyle;
}

export const ResponsiveTabs: React.FC<ResponsiveTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  scrollable = true,
  style,
}) => {
  const { isSmallScreen, width } = useResponsive();
  const { theme } = useTheme();

  const TabContainer = scrollable && isSmallScreen ? ScrollView : View;

  return (
    <View style={[styles.container, style]}>
      <TabContainer
        horizontal={scrollable && isSmallScreen}
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
      >
        <View style={[styles.tabRow, isSmallScreen && scrollable && { minWidth: width }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  borderBottomColor: activeTab === tab.key ? theme.colors.primary : 'transparent',
                  backgroundColor: activeTab === tab.key ? theme.colors.selected : 'transparent',
                },
                isSmallScreen && { flex: 1 },
              ]}
              onPress={() => onTabChange(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === tab.key ? theme.colors.primary : theme.colors.text,
                    fontSize: isSmallScreen ? 14 : 16,
                  },
                ]}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TabContainer>
      <View style={styles.tabContent}>
        {tabs.find(tab => tab.key === activeTab)?.content}
      </View>
    </View>
  );
};

// Adaptive modal that becomes full-screen on mobile
interface ResponsiveModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidth?: number;
  style?: ViewStyle;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  visible,
  onClose,
  children,
  title,
  maxWidth = 600,
  style,
}) => {
  const { isSmallScreen } = useResponsive();
  const { theme } = useTheme();

  if (!visible) return null;

  if (isSmallScreen) {
    // Full-screen modal on mobile
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.fullScreenModal, { backgroundColor: theme.colors.background }]}>
          {title && (
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {title}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: theme.colors.primary }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.modalContent}>
            {children}
          </View>
        </View>
      </Modal>
    );
  }

  // Centered modal on larger screens
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.centeredModal,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              maxWidth,
              ...theme.shadows.lg,
            },
            style,
          ]}
        >
          {title && (
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {title}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: theme.colors.primary }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.modalContent}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Grid styles
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  flexGrid: {
    flex: 1,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  // Layout styles
  twoPanel: {
    flex: 1,
    flexDirection: 'row',
  },
  threePanel: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
  },
  mainContent: {
    flex: 1,
  },
  // Tab styles
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabRow: {
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  tabText: {
    fontWeight: '500',
    textAlign: 'center',
  },
  tabContent: {
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredModal: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: '80%',
    width: '100%',
  },
  fullScreenModal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
});

export default ResponsiveContainer;