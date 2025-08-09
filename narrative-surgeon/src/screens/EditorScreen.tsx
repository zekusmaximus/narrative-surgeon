import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useManuscriptStore } from '../store/manuscriptStore';
import { Scene, RevisionNote } from '../types';

const EditorScreen: React.FC = () => {
  const {
    activeManuscript,
    scenes,
    revisionNotes,
    updateScene,
    addRevisionNote,
    updateRevisionNote,
  } = useManuscriptStore();

  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [sceneText, setSceneText] = useState('');
  const [sceneTitle, setSceneTitle] = useState('');
  const [povCharacter, setPovCharacter] = useState('');
  const [location, setLocation] = useState('');
  const [timeMarker, setTimeMarker] = useState('');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isNotesModalVisible, setIsNotesModalVisible] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<'plot_hole' | 'consistency' | 'pacing' | 'voice' | 'hook'>('plot_hole');

  const currentScenes = activeManuscript ? scenes.get(activeManuscript.id) || [] : [];
  const currentScene = currentScenes.find(scene => scene.id === currentSceneId);
  const currentNotes = activeManuscript ? revisionNotes.get(activeManuscript.id) || [] : [];
  const sceneNotes = currentNotes.filter(note => note.sceneId === currentSceneId);

  useEffect(() => {
    if (currentScenes.length > 0 && !currentSceneId) {
      setCurrentSceneId(currentScenes[0].id);
    }
  }, [currentScenes, currentSceneId]);

  useEffect(() => {
    if (currentScene) {
      setSceneText(currentScene.rawText);
      setSceneTitle(currentScene.title || '');
      setPovCharacter(currentScene.povCharacter || '');
      setLocation(currentScene.location || '');
      setTimeMarker(currentScene.timeMarker || '');
      setUnsavedChanges(false);
      setLastSaved(new Date(currentScene.updatedAt));
    }
  }, [currentScene]);

  const handleTextChange = (text: string) => {
    setSceneText(text);
    setUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!currentSceneId || !unsavedChanges) return;

    try {
      const wordCount = sceneText.trim().split(/\s+/).filter(word => word.length > 0).length;
      
      await updateScene(currentSceneId, {
        rawText: sceneText,
        title: sceneTitle || undefined,
        povCharacter: povCharacter || undefined,
        location: location || undefined,
        timeMarker: timeMarker || undefined,
        wordCount,
      });

      setUnsavedChanges(false);
      setLastSaved(new Date());
      Alert.alert('Saved', 'Scene saved successfully!');
      
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save scene');
    }
  };

  const handleAddNote = async () => {
    if (!currentSceneId || !newNoteContent.trim()) return;

    try {
      await addRevisionNote({
        sceneId: currentSceneId,
        type: newNoteType,
        content: newNoteContent.trim(),
        resolved: false,
      });

      setNewNoteContent('');
      setIsNotesModalVisible(false);
      
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add note');
    }
  };

  const toggleNoteResolved = async (noteId: string, resolved: boolean) => {
    try {
      await updateRevisionNote(noteId, { resolved: !resolved });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update note');
    }
  };

  const formatWordCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  if (!activeManuscript) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No Active Manuscript</Text>
        <Text style={styles.emptyText}>
          Select a manuscript from the Manuscripts tab to start editing.
        </Text>
      </View>
    );
  }

  if (currentScenes.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No Scenes Available</Text>
        <Text style={styles.emptyText}>
          Import a manuscript to start editing scenes.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sceneSelector}>
          {currentScenes.map((scene) => (
            <TouchableOpacity
              key={scene.id}
              style={[
                styles.sceneTab,
                currentSceneId === scene.id && styles.activeSceneTab,
              ]}
              onPress={() => setCurrentSceneId(scene.id)}
            >
              <Text style={[
                styles.sceneTabText,
                currentSceneId === scene.id && styles.activeSceneTabText,
              ]}>
                {scene.title || `Scene ${scene.sceneNumberInChapter || scene.indexInManuscript + 1}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <View style={styles.editorStats}>
          <Text style={styles.wordCount}>
            {formatWordCount(countWords(sceneText))} words
          </Text>
          {unsavedChanges && <Text style={styles.unsavedIndicator}>• Unsaved</Text>}
          {lastSaved && !unsavedChanges && (
            <Text style={styles.savedIndicator}>
              • Saved {lastSaved.toLocaleTimeString()}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.metadataBar}>
        <TextInput
          style={styles.metadataInput}
          placeholder="Scene title"
          value={sceneTitle}
          onChangeText={setSceneTitle}
          placeholderTextColor="#9ca3af"
        />
        <TextInput
          style={styles.metadataInput}
          placeholder="POV Character"
          value={povCharacter}
          onChangeText={setPovCharacter}
          placeholderTextColor="#9ca3af"
        />
        <TextInput
          style={styles.metadataInput}
          placeholder="Location"
          value={location}
          onChangeText={setLocation}
          placeholderTextColor="#9ca3af"
        />
        <TextInput
          style={styles.metadataInput}
          placeholder="Time"
          value={timeMarker}
          onChangeText={setTimeMarker}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <TextInput
        style={styles.textEditor}
        value={sceneText}
        onChangeText={handleTextChange}
        placeholder="Start writing your scene..."
        placeholderTextColor="#9ca3af"
        multiline
        textAlignVertical="top"
      />

      <View style={styles.bottomBar}>
        <View style={styles.notesSection}>
          <TouchableOpacity
            style={styles.notesButton}
            onPress={() => setIsNotesModalVisible(true)}
          >
            <Text style={styles.notesButtonText}>
              Notes ({sceneNotes.filter(note => !note.resolved).length})
            </Text>
          </TouchableOpacity>
          
          {sceneNotes.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.notesList}>
              {sceneNotes.slice(0, 3).map((note) => (
                <TouchableOpacity
                  key={note.id}
                  style={[styles.notePreview, note.resolved && styles.resolvedNote]}
                  onPress={() => toggleNoteResolved(note.id, note.resolved)}
                >
                  <Text style={styles.noteType}>{note.type}</Text>
                  <Text style={styles.noteContent} numberOfLines={1}>
                    {note.content}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, !unsavedChanges && styles.disabledButton]}
          onPress={handleSave}
          disabled={!unsavedChanges}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isNotesModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNotesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Scene Notes</Text>
            
            <ScrollView style={styles.existingNotes}>
              {sceneNotes.map((note) => (
                <TouchableOpacity
                  key={note.id}
                  style={[styles.noteItem, note.resolved && styles.resolvedNote]}
                  onPress={() => toggleNoteResolved(note.id, note.resolved)}
                >
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteType}>{note.type}</Text>
                    <Text style={[styles.noteStatus, note.resolved && styles.resolvedText]}>
                      {note.resolved ? '✓ Resolved' : 'Open'}
                    </Text>
                  </View>
                  <Text style={styles.noteContent}>{note.content}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.newNoteSection}>
              <Text style={styles.inputLabel}>Add New Note</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.noteTypeSelector}>
                {(['plot_hole', 'consistency', 'pacing', 'voice', 'hook'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.noteTypeTag, newNoteType === type && styles.selectedNoteType]}
                    onPress={() => setNewNoteType(type)}
                  >
                    <Text style={[
                      styles.noteTypeText,
                      newNoteType === type && styles.selectedNoteTypeText
                    ]}>
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TextInput
                style={styles.noteTextInput}
                value={newNoteContent}
                onChangeText={setNewNoteContent}
                placeholder="Enter your note..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsNotesModalVisible(false);
                    setNewNoteContent('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.addNoteButton, !newNoteContent.trim() && styles.disabledButton]}
                  onPress={handleAddNote}
                  disabled={!newNoteContent.trim()}
                >
                  <Text style={styles.addNoteButtonText}>Add Note</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sceneSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sceneTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  activeSceneTab: {
    backgroundColor: '#2563eb',
  },
  sceneTabText: {
    fontSize: 14,
    color: '#6b7280',
  },
  activeSceneTabText: {
    color: 'white',
  },
  editorStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  wordCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  unsavedIndicator: {
    fontSize: 14,
    color: '#f59e0b',
    marginLeft: 8,
  },
  savedIndicator: {
    fontSize: 14,
    color: '#10b981',
    marginLeft: 8,
  },
  metadataBar: {
    backgroundColor: 'white',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  metadataInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  textEditor: {
    flex: 1,
    backgroundColor: 'white',
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
    color: '#1f2937',
  },
  bottomBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesSection: {
    flex: 1,
  },
  notesButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  notesButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  notesList: {
    marginTop: 8,
  },
  notePreview: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    maxWidth: 120,
  },
  resolvedNote: {
    backgroundColor: '#f0fdf4',
    opacity: 0.7,
  },
  noteType: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  noteContent: {
    fontSize: 12,
    color: '#1f2937',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  existingNotes: {
    maxHeight: 200,
    marginBottom: 20,
  },
  noteItem: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteStatus: {
    fontSize: 12,
    color: '#ef4444',
  },
  resolvedText: {
    color: '#16a34a',
  },
  newNoteSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 12,
  },
  noteTypeSelector: {
    marginBottom: 12,
  },
  noteTypeTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
  },
  selectedNoteType: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  noteTypeText: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  selectedNoteTypeText: {
    color: 'white',
  },
  noteTextInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  addNoteButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addNoteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default EditorScreen;