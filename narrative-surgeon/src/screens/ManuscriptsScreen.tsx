import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useManuscriptStore } from '../store/manuscriptStore';
import { ManuscriptImporter, ImportOptions } from '../services/manuscriptImporter';
import { Manuscript } from '../types';

const ManuscriptsScreen: React.FC = () => {
  const {
    manuscripts,
    activeManuscript,
    isLoading,
    error,
    setActiveManuscript,
    createManuscript,
    deleteManuscript,
  } = useManuscriptStore();

  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [importGenre, setImportGenre] = useState<string>('');
  const [importAudience, setImportAudience] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  const importer = new ManuscriptImporter();

  const handleImportManuscript = async () => {
    setIsImporting(true);
    try {
      const options: ImportOptions = {
        title: importTitle || undefined,
        genre: importGenre || undefined,
        targetAudience: importAudience || undefined,
      };

      const importedData = await importer.importFromFile(options);
      importer.validateImport(importedData);

      const manuscript = await createManuscript(
        importedData.title,
        importedData.text,
        importedData.metadata
      );

      setIsImportModalVisible(false);
      setImportTitle('');
      setImportGenre('');
      setImportAudience('');
      
      Alert.alert('Success', `"${manuscript.title}" imported successfully!`);
      
    } catch (error) {
      Alert.alert(
        'Import Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteManuscript = (manuscript: Manuscript) => {
    Alert.alert(
      'Delete Manuscript',
      `Are you sure you want to delete "${manuscript.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteManuscript(manuscript.id),
        },
      ]
    );
  };

  const formatWordCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k words`;
    }
    return `${count} words`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading manuscripts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {manuscripts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Manuscripts Yet</Text>
            <Text style={styles.emptyText}>
              Import your first manuscript to get started with scene analysis and revision tracking.
            </Text>
          </View>
        ) : (
          manuscripts.map((manuscript) => (
            <TouchableOpacity
              key={manuscript.id}
              style={[
                styles.manuscriptCard,
                activeManuscript?.id === manuscript.id && styles.activeCard,
              ]}
              onPress={() => setActiveManuscript(manuscript)}
            >
              <View style={styles.manuscriptHeader}>
                <Text style={styles.manuscriptTitle}>{manuscript.title}</Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteManuscript(manuscript)}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.manuscriptMeta}>
                {manuscript.genre && (
                  <Text style={styles.genreTag}>{manuscript.genre}</Text>
                )}
                {manuscript.targetAudience && (
                  <Text style={styles.audienceTag}>{manuscript.targetAudience}</Text>
                )}
              </View>
              
              <Text style={styles.wordCount}>
                {formatWordCount(manuscript.totalWordCount)}
              </Text>
              
              <Text style={styles.lastModified}>
                Updated {formatDate(manuscript.updatedAt)}
              </Text>
              
              {activeManuscript?.id === manuscript.id && (
                <View style={styles.activeIndicator}>
                  <Text style={styles.activeText}>Currently Active</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.importButton}
        onPress={() => setIsImportModalVisible(true)}
      >
        <Text style={styles.importButtonText}>+ Import Manuscript</Text>
      </TouchableOpacity>

      <Modal
        visible={isImportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsImportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Import Manuscript</Text>
            
            <Text style={styles.inputLabel}>Title (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={importTitle}
              onChangeText={setImportTitle}
              placeholder="Will auto-detect if empty"
              placeholderTextColor="#9ca3af"
            />
            
            <Text style={styles.inputLabel}>Genre</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagContainer}>
              {['literary', 'thriller', 'romance', 'mystery', 'fantasy', 'scifi', 'historical', 'other'].map((genre) => (
                <TouchableOpacity
                  key={genre}
                  style={[styles.tag, importGenre === genre && styles.selectedTag]}
                  onPress={() => setImportGenre(importGenre === genre ? '' : genre)}
                >
                  <Text style={[styles.tagText, importGenre === genre && styles.selectedTagText]}>
                    {genre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={styles.inputLabel}>Target Audience</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagContainer}>
              {['adult', 'ya', 'mg'].map((audience) => (
                <TouchableOpacity
                  key={audience}
                  style={[styles.tag, importAudience === audience && styles.selectedTag]}
                  onPress={() => setImportAudience(importAudience === audience ? '' : audience)}
                >
                  <Text style={[styles.tagText, importAudience === audience && styles.selectedTagText]}>
                    {audience}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsImportModalVisible(false)}
                disabled={isImporting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.importModalButton, isImporting && styles.disabledButton]}
                onPress={handleImportManuscript}
                disabled={isImporting}
              >
                {isImporting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.importModalButtonText}>Import</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
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
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  manuscriptCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeCard: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  manuscriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  manuscriptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manuscriptMeta: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  genreTag: {
    backgroundColor: '#dbeafe',
    color: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  audienceTag: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '500',
  },
  wordCount: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  lastModified: {
    fontSize: 12,
    color: '#9ca3af',
  },
  activeIndicator: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  activeText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  importButton: {
    backgroundColor: '#2563eb',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  importButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 24,
    minWidth: 300,
    maxWidth: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  tagContainer: {
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
  },
  selectedTag: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tagText: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectedTagText: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  importModalButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  importModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default ManuscriptsScreen;