import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { DiffResult, DiffChange, VersionSnapshot, versionControlService } from '../services/versionControl';

interface VersionDiffViewerProps {
  versionId1: string;
  versionId2: string;
  onVersionSelect?: (versionId: string) => void;
  onMergeRequest?: (versionId1: string, versionId2: string) => void;
}

export const VersionDiffViewer: React.FC<VersionDiffViewerProps> = ({
  versionId1,
  versionId2,
  onVersionSelect,
  onMergeRequest,
}) => {
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Generate diff data
  const diffResults = useMemo(() => {
    return versionControlService.generateDiff(versionId1, versionId2);
  }, [versionId1, versionId2]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalAdded = diffResults.reduce((sum, result) => sum + result.addedWords, 0);
    const totalRemoved = diffResults.reduce((sum, result) => sum + result.removedWords, 0);
    const totalChanges = diffResults.reduce((sum, result) => sum + result.changeCount, 0);
    const scenesChanged = diffResults.length;

    return { totalAdded, totalRemoved, totalChanges, scenesChanged };
  }, [diffResults]);

  const renderDiffSummary = () => (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Changes Summary</Text>
      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{summaryStats.scenesChanged}</Text>
          <Text style={styles.statLabel}>Scenes Changed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.addedText]}>+{summaryStats.totalAdded}</Text>
          <Text style={styles.statLabel}>Words Added</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.removedText]}>-{summaryStats.totalRemoved}</Text>
          <Text style={styles.statLabel}>Words Removed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{summaryStats.totalChanges}</Text>
          <Text style={styles.statLabel}>Total Changes</Text>
        </View>
      </View>
    </View>
  );

  const renderSceneList = () => (
    <View style={styles.sceneListContainer}>
      <Text style={styles.sectionTitle}>Changed Scenes</Text>
      {diffResults.map((result, index) => (
        <TouchableOpacity
          key={result.sceneId}
          style={[
            styles.sceneListItem,
            selectedSceneId === result.sceneId && styles.sceneListItemSelected
          ]}
          onPress={() => setSelectedSceneId(result.sceneId)}
        >
          <Text style={styles.sceneName}>{result.sceneName}</Text>
          <View style={styles.sceneStats}>
            {result.addedWords > 0 && (
              <Text style={[styles.sceneStatText, styles.addedText]}>
                +{result.addedWords}
              </Text>
            )}
            {result.removedWords > 0 && (
              <Text style={[styles.sceneStatText, styles.removedText]}>
                -{result.removedWords}
              </Text>
            )}
            <Text style={styles.sceneStatText}>
              {result.changeCount} changes
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDiffContent = () => {
    if (!selectedSceneId) {
      return (
        <View style={styles.noSelectionContainer}>
          <Text style={styles.noSelectionText}>
            Select a scene from the list to view changes
          </Text>
        </View>
      );
    }

    const selectedResult = diffResults.find(r => r.sceneId === selectedSceneId);
    if (!selectedResult) {
      return (
        <View style={styles.noSelectionContainer}>
          <Text style={styles.noSelectionText}>Scene not found</Text>
        </View>
      );
    }

    return (
      <View style={styles.diffContentContainer}>
        <Text style={styles.diffTitle}>{selectedResult.sceneName}</Text>
        <ScrollView style={styles.diffScrollView} showsVerticalScrollIndicator={true}>
          {selectedResult.changes.map((change, index) => (
            <Text
              key={index}
              style={[
                styles.diffText,
                change.type === 'insert' && styles.insertedText,
                change.type === 'delete' && styles.deletedText,
                change.type === 'equal' && styles.unchangedText,
              ]}
            >
              {change.text}
            </Text>
          ))}
        </ScrollView>
      </View>
    );
  };

  const handleMergeRequest = () => {
    if (onMergeRequest) {
      Alert.alert(
        'Merge Versions',
        'This will merge the changes from both versions. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Merge', 
            style: 'destructive',
            onPress: () => onMergeRequest(versionId1, versionId2)
          }
        ]
      );
    }
  };

  const renderActionBar = () => (
    <View style={styles.actionBar}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => onVersionSelect?.(versionId1)}
      >
        <Text style={styles.actionButtonText}>Restore Version 1</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => onVersionSelect?.(versionId2)}
      >
        <Text style={styles.actionButtonText}>Restore Version 2</Text>
      </TouchableOpacity>

      {onMergeRequest && (
        <TouchableOpacity
          style={[styles.actionButton, styles.mergeButton]}
          onPress={handleMergeRequest}
        >
          <Text style={[styles.actionButtonText, styles.mergeButtonText]}>
            Merge Versions
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (diffResults.length === 0) {
    return (
      <View style={styles.noDiffContainer}>
        <Text style={styles.noDiffText}>No differences found between versions</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderDiffSummary()}
      
      <View style={styles.mainContent}>
        <View style={styles.leftPanel}>
          {renderSceneList()}
        </View>
        
        <View style={styles.rightPanel}>
          {renderDiffContent()}
        </View>
      </View>
      
      {renderActionBar()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  summaryContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#495057',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  addedText: {
    color: '#28a745',
  },
  removedText: {
    color: '#dc3545',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  rightPanel: {
    flex: 1,
  },
  sceneListContainer: {
    flex: 1,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  sceneListItem: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6c757d',
  },
  sceneListItemSelected: {
    backgroundColor: '#e3f2fd',
    borderLeftColor: '#2196f3',
  },
  sceneName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 4,
  },
  sceneStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sceneStatText: {
    fontSize: 12,
    color: '#6c757d',
    marginRight: 12,
  },
  diffContentContainer: {
    flex: 1,
    padding: 16,
  },
  diffTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  diffScrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  diffText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  insertedText: {
    backgroundColor: '#d4edda',
    color: '#155724',
    textDecorationLine: 'none',
  },
  deletedText: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    textDecorationLine: 'line-through',
  },
  unchangedText: {
    color: '#495057',
  },
  noSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noSelectionText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  noDiffContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noDiffText: {
    fontSize: 18,
    color: '#6c757d',
    textAlign: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    justifyContent: 'space-around',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6c757d',
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  mergeButton: {
    backgroundColor: '#007bff',
  },
  mergeButtonText: {
    color: '#ffffff',
  },
});