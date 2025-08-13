import React from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const SkeletonPlaceholder: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]).start(() => animate());
    };
    animate();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e1e5e9', '#f2f4f6'],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// Manuscript List Skeleton
export const ManuscriptListSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {[...Array(5)].map((_, index) => (
        <View key={index} style={styles.manuscriptItem}>
          <View style={styles.manuscriptHeader}>
            <SkeletonPlaceholder width="60%" height={18} />
            <SkeletonPlaceholder width={60} height={14} />
          </View>
          <SkeletonPlaceholder width="40%" height={14} style={styles.authorSkeleton} />
          <SkeletonPlaceholder width="80%" height={12} style={styles.metaSkeleton} />
          <View style={styles.tagContainer}>
            <SkeletonPlaceholder width={50} height={16} borderRadius={8} />
            <SkeletonPlaceholder width={40} height={16} borderRadius={8} style={styles.tagSpacing} />
          </View>
        </View>
      ))}
    </View>
  );
};

// Scene List Skeleton
export const SceneListSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {[...Array(8)].map((_, index) => (
        <View key={index} style={styles.sceneItem}>
          <View style={styles.sceneHeader}>
            <SkeletonPlaceholder width="50%" height={16} />
            <SkeletonPlaceholder width={30} height={12} />
          </View>
          <SkeletonPlaceholder width="90%" height={12} style={styles.scenePreview} />
          <SkeletonPlaceholder width="70%" height={12} />
          <View style={styles.sceneStats}>
            <SkeletonPlaceholder width={60} height={10} />
            <SkeletonPlaceholder width={40} height={10} />
            <SkeletonPlaceholder width={50} height={10} />
          </View>
        </View>
      ))}
    </View>
  );
};

// Analysis Panel Skeleton
export const AnalysisPanelSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Chart skeleton */}
      <View style={styles.chartContainer}>
        <SkeletonPlaceholder width="30%" height={16} style={styles.chartTitle} />
        <View style={styles.chartArea}>
          <SkeletonPlaceholder width="100%" height={200} borderRadius={8} />
        </View>
        <SkeletonPlaceholder width="80%" height={12} style={styles.chartDescription} />
      </View>

      {/* Stats skeleton */}
      <View style={styles.statsContainer}>
        {[...Array(4)].map((_, index) => (
          <View key={index} style={styles.statItem}>
            <SkeletonPlaceholder width={40} height={24} style={styles.statNumber} />
            <SkeletonPlaceholder width={60} height={12} />
          </View>
        ))}
      </View>

      {/* Issues list skeleton */}
      <View style={styles.issuesContainer}>
        <SkeletonPlaceholder width="40%" height={16} style={styles.sectionTitle} />
        {[...Array(3)].map((_, index) => (
          <View key={index} style={styles.issueItem}>
            <SkeletonPlaceholder width="20%" height={12} style={styles.issueType} />
            <SkeletonPlaceholder width="90%" height={14} style={styles.issueText} />
            <SkeletonPlaceholder width="70%" height={12} />
          </View>
        ))}
      </View>
    </View>
  );
};

// Editor Skeleton
export const EditorSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Toolbar skeleton */}
      <View style={styles.toolbar}>
        {[...Array(6)].map((_, index) => (
          <SkeletonPlaceholder 
            key={index} 
            width={32} 
            height={32} 
            borderRadius={16} 
            style={styles.toolbarButton}
          />
        ))}
      </View>

      {/* Editor content skeleton */}
      <View style={styles.editorContent}>
        {[...Array(12)].map((_, index) => (
          <SkeletonPlaceholder 
            key={index}
            width={index % 3 === 0 ? '95%' : index % 3 === 1 ? '88%' : '92%'}
            height={16}
            style={styles.editorLine}
          />
        ))}
      </View>

      {/* Status bar skeleton */}
      <View style={styles.statusBar}>
        <SkeletonPlaceholder width={80} height={14} />
        <SkeletonPlaceholder width={60} height={14} />
        <SkeletonPlaceholder width={100} height={14} />
      </View>
    </View>
  );
};

// Version Control Skeleton
export const VersionControlSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Tabs skeleton */}
      <View style={styles.tabContainer}>
        <SkeletonPlaceholder width={80} height={32} borderRadius={16} />
        <SkeletonPlaceholder width={80} height={32} borderRadius={16} style={styles.tabSpacing} />
      </View>

      {/* Action buttons skeleton */}
      <View style={styles.actionButtonsContainer}>
        <SkeletonPlaceholder width="30%" height={32} borderRadius={16} />
        <SkeletonPlaceholder width="25%" height={32} borderRadius={16} />
        <SkeletonPlaceholder width="35%" height={32} borderRadius={16} />
      </View>

      {/* Version items skeleton */}
      <View style={styles.versionList}>
        {[...Array(6)].map((_, index) => (
          <View key={index} style={styles.versionItem}>
            <View style={styles.versionHeader}>
              <SkeletonPlaceholder width="25%" height={14} />
              <SkeletonPlaceholder width="40%" height={12} />
            </View>
            <SkeletonPlaceholder width="80%" height={14} style={styles.versionDescription} />
            <View style={styles.versionStats}>
              <SkeletonPlaceholder width={50} height={10} />
              <SkeletonPlaceholder width={60} height={10} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// Export Dialog Skeleton
export const ExportDialogSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      <SkeletonPlaceholder width="60%" height={20} style={styles.dialogTitle} />
      
      {/* Format options skeleton */}
      <View style={styles.formatOptions}>
        {[...Array(4)].map((_, index) => (
          <View key={index} style={styles.formatOption}>
            <SkeletonPlaceholder width={20} height={20} borderRadius={10} />
            <SkeletonPlaceholder width="70%" height={16} style={styles.formatLabel} />
          </View>
        ))}
      </View>

      {/* Settings skeleton */}
      <View style={styles.settingsSection}>
        <SkeletonPlaceholder width="40%" height={16} style={styles.sectionTitle} />
        {[...Array(3)].map((_, index) => (
          <View key={index} style={styles.settingItem}>
            <SkeletonPlaceholder width="50%" height={14} />
            <SkeletonPlaceholder width={100} height={32} borderRadius={4} />
          </View>
        ))}
      </View>

      {/* Action buttons skeleton */}
      <View style={styles.dialogActions}>
        <SkeletonPlaceholder width={80} height={36} borderRadius={18} />
        <SkeletonPlaceholder width={80} height={36} borderRadius={18} />
      </View>
    </View>
  );
};

// Generic List Skeleton
export const ListSkeleton: React.FC<{ itemCount?: number; itemHeight?: number }> = ({
  itemCount = 5,
  itemHeight = 60,
}) => {
  return (
    <View style={styles.container}>
      {[...Array(itemCount)].map((_, index) => (
        <View key={index} style={[styles.genericListItem, { height: itemHeight }]}>
          <SkeletonPlaceholder width="70%" height={16} />
          <SkeletonPlaceholder width="50%" height={12} style={{ marginTop: 8 }} />
          <SkeletonPlaceholder width="30%" height={10} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
};

// Card Skeleton
export const CardSkeleton: React.FC<{ width?: number | string; height?: number }> = ({
  width = '100%',
  height = 200,
}) => {
  return (
    <View style={[styles.card, { width, height }]}>
      <SkeletonPlaceholder width="60%" height={18} style={styles.cardTitle} />
      <SkeletonPlaceholder width="100%" height={height - 80} style={styles.cardContent} />
      <View style={styles.cardFooter}>
        <SkeletonPlaceholder width={60} height={12} />
        <SkeletonPlaceholder width={40} height={12} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  
  // Manuscript List Styles
  manuscriptItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  manuscriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorSkeleton: {
    marginBottom: 8,
  },
  metaSkeleton: {
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
  },
  tagSpacing: {
    marginLeft: 8,
  },
  
  // Scene List Styles
  sceneItem: {
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  sceneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scenePreview: {
    marginBottom: 4,
  },
  sceneStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  
  // Analysis Panel Styles
  chartContainer: {
    marginBottom: 24,
  },
  chartTitle: {
    marginBottom: 12,
  },
  chartArea: {
    marginBottom: 12,
  },
  chartDescription: {
    alignSelf: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    marginBottom: 4,
  },
  issuesContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  issueItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
  },
  issueType: {
    marginBottom: 4,
  },
  issueText: {
    marginBottom: 4,
  },
  
  // Editor Styles
  toolbar: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    marginBottom: 16,
  },
  toolbarButton: {
    marginRight: 8,
  },
  editorContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  editorLine: {
    marginBottom: 8,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
    marginTop: 16,
  },
  
  // Version Control Styles
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tabSpacing: {
    marginLeft: 12,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  versionList: {
    flex: 1,
  },
  versionItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  versionDescription: {
    marginBottom: 8,
  },
  versionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  // Export Dialog Styles
  dialogTitle: {
    marginBottom: 20,
    alignSelf: 'center',
  },
  formatOptions: {
    marginBottom: 20,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  formatLabel: {
    marginLeft: 12,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  
  // Generic Styles
  genericListItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  cardTitle: {
    marginBottom: 12,
  },
  cardContent: {
    marginBottom: 12,
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});