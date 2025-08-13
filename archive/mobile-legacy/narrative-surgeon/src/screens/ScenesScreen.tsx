import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useManuscriptStore } from '../store/manuscriptStore';
import { Scene } from '../types';

const ScenesScreen: React.FC = () => {
  const {
    activeManuscript,
    scenes,
    isLoading,
    updateScene,
    splitScene,
    mergeScenes,
  } = useManuscriptStore();

  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());
  const [isReordering, setIsReordering] = useState(false);

  const currentScenes = activeManuscript ? scenes.get(activeManuscript.id) || [] : [];

  const formatWordCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const handleScenePress = (sceneId: string) => {
    const newSelection = new Set(selectedScenes);
    if (newSelection.has(sceneId)) {
      newSelection.delete(sceneId);
    } else {
      newSelection.add(sceneId);
    }
    setSelectedScenes(newSelection);
  };

  const handleMergeScenes = async () => {
    if (selectedScenes.size < 2) {
      Alert.alert('Merge Error', 'Please select at least 2 scenes to merge.');
      return;
    }

    Alert.alert(
      'Merge Scenes',
      `Are you sure you want to merge ${selectedScenes.size} scenes? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge',
          onPress: async () => {
            try {
              await mergeScenes(Array.from(selectedScenes));
              setSelectedScenes(new Set());
              Alert.alert('Success', 'Scenes merged successfully!');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to merge scenes');
            }
          },
        },
      ]
    );
  };

  const handleSplitScene = (sceneId: string) => {
    const scene = currentScenes.find(s => s.id === sceneId);
    if (!scene) return;

    const midpoint = Math.floor(scene.rawText.length / 2);
    
    Alert.alert(
      'Split Scene',
      `Split "${scene.title || 'Untitled Scene'}" at the midpoint?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Split',
          onPress: async () => {
            try {
              await splitScene(sceneId, midpoint);
              Alert.alert('Success', 'Scene split successfully!');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to split scene');
            }
          },
        },
      ]
    );
  };

  const groupScenesByChapter = (scenes: Scene[]): Map<number, Scene[]> => {
    const chapters = new Map<number, Scene[]>();
    
    scenes.forEach(scene => {
      const chapterNum = scene.chapterNumber || 1;
      if (!chapters.has(chapterNum)) {
        chapters.set(chapterNum, []);
      }
      chapters.get(chapterNum)!.push(scene);
    });

    return chapters;
  };

  if (!activeManuscript) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No Active Manuscript</Text>
        <Text style={styles.emptyText}>
          Select a manuscript from the Manuscripts tab to view its scenes.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading scenes...</Text>
      </View>
    );
  }

  const chapterGroups = groupScenesByChapter(currentScenes);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.manuscriptTitle}>{activeManuscript.title}</Text>
        <Text style={styles.manuscriptStats}>
          {currentScenes.length} scenes • {formatWordCount(activeManuscript.totalWordCount)} words
        </Text>
        
        {selectedScenes.size > 0 && (
          <View style={styles.actionBar}>
            <Text style={styles.selectionCount}>
              {selectedScenes.size} scene{selectedScenes.size > 1 ? 's' : ''} selected
            </Text>
            <View style={styles.actionButtons}>
              {selectedScenes.size >= 2 && (
                <TouchableOpacity style={styles.actionButton} onPress={handleMergeScenes}>
                  <Text style={styles.actionButtonText}>Merge</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSelectedScenes(new Set())}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollContainer}>
        {Array.from(chapterGroups.entries()).map(([chapterNumber, chapterScenes]) => (
          <View key={chapterNumber} style={styles.chapterGroup}>
            <Text style={styles.chapterTitle}>
              Chapter {chapterNumber}
            </Text>
            
            {chapterScenes.map((scene) => (
              <TouchableOpacity
                key={scene.id}
                style={[
                  styles.sceneCard,
                  scene.isOpening && styles.openingScene,
                  scene.isChapterEnd && styles.chapterEndScene,
                  selectedScenes.has(scene.id) && styles.selectedScene,
                ]}
                onPress={() => handleScenePress(scene.id)}
                onLongPress={() => handleSplitScene(scene.id)}
              >
                <View style={styles.sceneHeader}>
                  <View style={styles.sceneInfo}>
                    <Text style={styles.sceneTitle}>
                      {scene.title || `Scene ${scene.sceneNumberInChapter || scene.indexInManuscript + 1}`}
                    </Text>
                    <Text style={styles.sceneWordCount}>
                      {formatWordCount(scene.wordCount)} words
                    </Text>
                  </View>
                  
                  <View style={styles.sceneTags}>
                    {scene.isOpening && (
                      <View style={styles.openingTag}>
                        <Text style={styles.tagText}>Opening</Text>
                      </View>
                    )}
                    {scene.isChapterEnd && (
                      <View style={styles.chapterEndTag}>
                        <Text style={styles.tagText}>Chapter End</Text>
                      </View>
                    )}
                    {scene.opensWithHook && (
                      <View style={styles.hookTag}>
                        <Text style={styles.tagText}>Hook Start</Text>
                      </View>
                    )}
                    {scene.endsWithHook && (
                      <View style={styles.hookTag}>
                        <Text style={styles.tagText}>Hook End</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.sceneMetadata}>
                  {scene.povCharacter && (
                    <Text style={styles.metadataItem}>POV: {scene.povCharacter}</Text>
                  )}
                  {scene.location && (
                    <Text style={styles.metadataItem}>Location: {scene.location}</Text>
                  )}
                  {scene.timeMarker && (
                    <Text style={styles.metadataItem}>Time: {scene.timeMarker}</Text>
                  )}
                </View>

                <Text style={styles.scenePreview} numberOfLines={2}>
                  {scene.rawText.trim().substring(0, 120)}...
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {selectedScenes.size === 0 && (
        <View style={styles.helpText}>
          <Text style={styles.helpTextContent}>
            Tap to select scenes • Long press to split • Select multiple to merge
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  manuscriptTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  manuscriptStats: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  selectionCount: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
  },
  chapterGroup: {
    margin: 16,
    marginBottom: 8,
  },
  chapterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    paddingLeft: 4,
  },
  sceneCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  openingScene: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  chapterEndScene: {
    borderRightWidth: 4,
    borderRightColor: '#f59e0b',
  },
  selectedScene: {
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  sceneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sceneInfo: {
    flex: 1,
  },
  sceneTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  sceneWordCount: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  sceneTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 12,
  },
  openingTag: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
    marginBottom: 2,
  },
  chapterEndTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
    marginBottom: 2,
  },
  hookTag: {
    backgroundColor: '#ddd6fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
    marginBottom: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#374151',
  },
  sceneMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  metadataItem: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 16,
  },
  scenePreview: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  helpText: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 12,
  },
  helpTextContent: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default ScenesScreen;