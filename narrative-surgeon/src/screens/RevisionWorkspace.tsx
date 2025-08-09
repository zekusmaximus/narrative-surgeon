import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { useManuscriptStore } from '../store/manuscriptStore';
import DiffEditor from '../components/DiffEditor';
import RevisionDashboard from './RevisionDashboard';
import { RevisionSession, RevisionMode, Suggestion, Edit, Scene } from '../types';
import { revisionModeService } from '../services/revisionModes';
import { suggestionEngine } from '../services/suggestionEngine';
import { databaseService } from '../services/database';
import { v4 as uuidv4 } from 'uuid';

interface RevisionWorkspaceState {
  currentSession: RevisionSession | null;
  activeMode: RevisionMode;
  currentScene: Scene | null;
  workingText: string;
  originalText: string;
  suggestions: Suggestion[];
  appliedEdits: Edit[];
  showDashboard: boolean;
  showModeSelector: boolean;
}

const RevisionWorkspace: React.FC = () => {
  const { activeManuscript, scenes, updateScene } = useManuscriptStore();
  const [state, setState] = useState<RevisionWorkspaceState>({
    currentSession: null,
    activeMode: revisionModeService.getCurrentMode(),
    currentScene: null,
    workingText: '',
    originalText: '',
    suggestions: [],
    appliedEdits: [],
    showDashboard: false,
    showModeSelector: false
  });

  const currentScenes = activeManuscript ? scenes.get(activeManuscript.id) || [] : [];

  useEffect(() => {
    if (currentScenes.length > 0 && !state.currentScene) {
      selectScene(currentScenes[0]);
    }
  }, [currentScenes, state.currentScene]);

  useEffect(() => {
    if (state.currentScene && state.activeMode) {
      loadSuggestions();
    }
  }, [state.currentScene, state.activeMode]);

  const selectScene = (scene: Scene) => {
    setState(prev => ({
      ...prev,
      currentScene: scene,
      workingText: scene.rawText,
      originalText: scene.rawText,
      suggestions: [],
      appliedEdits: []
    }));
  };

  const loadSuggestions = async () => {
    if (!state.currentScene || !state.activeMode) return;

    try {
      console.log(`Loading suggestions for scene ${state.currentScene.id} in ${state.activeMode.name} mode`);
      const suggestions = await suggestionEngine.generateSuggestions(state.currentScene, state.activeMode);
      
      setState(prev => ({
        ...prev,
        suggestions
      }));
    } catch (error) {
      console.error('Error loading suggestions:', error);
      Alert.alert('Error', 'Failed to load revision suggestions');
    }
  };

  const startRevisionSession = async (sessionType: 'developmental' | 'line' | 'copy' | 'proof', focusArea?: string) => {
    if (!activeManuscript) return;

    const session: RevisionSession = {
      id: uuidv4(),
      manuscriptId: activeManuscript.id,
      sessionType,
      focusArea: focusArea as any,
      startedAt: Date.now(),
      scenesRevised: 0,
      wordsChanged: 0
    };

    await saveRevisionSession(session);
    
    const mode = revisionModeService.getModeByType(sessionType);
    
    setState(prev => ({
      ...prev,
      currentSession: session,
      activeMode: mode,
      showModeSelector: false
    }));

    Alert.alert('Session Started', `${mode.name} session is now active`);
  };

  const endRevisionSession = async () => {
    if (!state.currentSession) return;

    const updatedSession: RevisionSession = {
      ...state.currentSession,
      endedAt: Date.now(),
      scenesRevised: calculateScenesRevised(),
      wordsChanged: calculateWordsChanged(),
      qualityDelta: calculateQualityDelta()
    };

    await saveRevisionSession(updatedSession);
    
    setState(prev => ({
      ...prev,
      currentSession: null
    }));

    Alert.alert('Session Complete', `Revised ${updatedSession.scenesRevised} scenes with ${updatedSession.wordsChanged} word changes`);
  };

  const changeMode = (mode: RevisionMode) => {
    setState(prev => ({
      ...prev,
      activeMode: mode,
      showModeSelector: false
    }));
  };

  const handleTextChange = (text: string) => {
    setState(prev => ({
      ...prev,
      workingText: text
    }));
  };

  const handleSuggestionAccept = (suggestion: Suggestion) => {
    console.log('Suggestion accepted:', suggestion);
    // Remove accepted suggestion from list
    setState(prev => ({
      ...prev,
      suggestions: prev.suggestions.filter(s => s.id !== suggestion.id)
    }));
  };

  const handleSuggestionReject = (suggestion: Suggestion) => {
    console.log('Suggestion rejected:', suggestion);
    // Remove rejected suggestion from list
    setState(prev => ({
      ...prev,
      suggestions: prev.suggestions.filter(s => s.id !== suggestion.id)
    }));
  };

  const handleEditTracked = (edit: Edit) => {
    const editWithSceneId = {
      ...edit,
      sceneId: state.currentScene?.id || '',
      sessionId: state.currentSession?.id
    };

    setState(prev => ({
      ...prev,
      appliedEdits: [...prev.appliedEdits, editWithSceneId]
    }));

    saveEdit(editWithSceneId);
  };

  const saveCurrentScene = async () => {
    if (!state.currentScene || state.workingText === state.originalText) return;

    try {
      const wordCount = state.workingText.trim().split(/\s+/).filter(word => word.length > 0).length;
      
      await updateScene(state.currentScene.id, {
        rawText: state.workingText,
        wordCount
      });

      setState(prev => ({
        ...prev,
        originalText: prev.workingText
      }));

      Alert.alert('Saved', 'Scene changes saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save scene changes');
    }
  };

  const calculateScenesRevised = (): number => {
    return state.appliedEdits.length > 0 ? 1 : 0;
  };

  const calculateWordsChanged = (): number => {
    return state.workingText.split(/\s+/).length - state.originalText.split(/\s+/).length;
  };

  const calculateQualityDelta = (): number => {
    // Simple quality calculation based on suggestions applied
    const impactSum = state.appliedEdits.reduce((sum, edit) => sum + (edit.impactScore || 0), 0);
    return Math.round(impactSum / 10);
  };

  const renderSceneSelector = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sceneSelector}>
      {currentScenes.map(scene => (
        <TouchableOpacity
          key={scene.id}
          style={[
            styles.sceneTab,
            state.currentScene?.id === scene.id && styles.activeSceneTab
          ]}
          onPress={() => selectScene(scene)}
        >
          <Text style={[
            styles.sceneTabText,
            state.currentScene?.id === scene.id && styles.activeSceneTabText
          ]}>
            {scene.title || `Scene ${scene.indexInManuscript + 1}`}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderRevisionModeSelector = () => (
    <Modal
      visible={state.showModeSelector}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setState(prev => ({ ...prev, showModeSelector: false }))}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Revision Mode</Text>
          
          <ScrollView style={styles.modesContainer}>
            {revisionModeService.getAllModes().map(mode => (
              <TouchableOpacity
                key={mode.name}
                style={[
                  styles.modeOption,
                  state.activeMode.name === mode.name && styles.activeModeOption
                ]}
                onPress={() => changeMode(mode)}
              >
                <Text style={styles.modeName}>{mode.name}</Text>
                <Text style={styles.modeDescription}>{mode.description}</Text>
                <Text style={styles.modeChecks}>
                  Focus: {mode.checksEnabled.slice(0, 3).join(', ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.sessionActions}>
            <Text style={styles.sessionTitle}>Start New Session</Text>
            <View style={styles.sessionButtons}>
              <TouchableOpacity
                style={styles.sessionButton}
                onPress={() => startRevisionSession('developmental', 'overall')}
              >
                <Text style={styles.sessionButtonText}>Developmental</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sessionButton}
                onPress={() => startRevisionSession('line', 'style')}
              >
                <Text style={styles.sessionButtonText}>Line Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sessionButton}
                onPress={() => startRevisionSession('copy', 'grammar')}
              >
                <Text style={styles.sessionButtonText}>Copy Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.headerButton, state.showDashboard && styles.activeHeaderButton]}
        onPress={() => setState(prev => ({ ...prev, showDashboard: !prev.showDashboard }))}
      >
        <Text style={styles.headerButtonText}>
          {state.showDashboard ? 'Editor' : 'Dashboard'}
        </Text>
      </TouchableOpacity>

      <View style={styles.sessionInfo}>
        {state.currentSession ? (
          <View style={styles.activeSession}>
            <Text style={styles.sessionText}>
              {state.activeMode.name} • {Math.floor((Date.now() - state.currentSession.startedAt) / 60000)}m
            </Text>
            <TouchableOpacity style={styles.endSessionButton} onPress={endRevisionSession}>
              <Text style={styles.endSessionText}>End</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setState(prev => ({ ...prev, showModeSelector: true }))}
          >
            <Text style={styles.modeButtonText}>{state.activeMode.name}</Text>
            <Text style={styles.modeButtonArrow}>▼</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveCurrentScene}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );

  if (!activeManuscript) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No Active Manuscript</Text>
        <Text style={styles.emptyText}>Select a manuscript to start revision workspace</Text>
      </View>
    );
  }

  if (state.showDashboard) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <RevisionDashboard />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderSceneSelector()}
      
      <DiffEditor
        originalText={state.originalText}
        workingText={state.workingText}
        onTextChange={handleTextChange}
        showThreePaneDiff={false}
        diffGranularity="sentence"
        suggestionMode="balanced"
        suggestions={state.suggestions}
        mode={state.activeMode}
        onSuggestionAccept={handleSuggestionAccept}
        onSuggestionReject={handleSuggestionReject}
        onEditTracked={handleEditTracked}
      />

      {renderRevisionModeSelector()}
    </View>
  );
};

// Helper functions
async function saveRevisionSession(session: RevisionSession): Promise<void> {
  const query = `
    INSERT OR REPLACE INTO revision_sessions 
    (id, manuscript_id, session_type, focus_area, started_at, ended_at, scenes_revised, words_changed, quality_delta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await databaseService.executeQuery(query, [
    session.id,
    session.manuscriptId,
    session.sessionType,
    session.focusArea,
    session.startedAt,
    session.endedAt,
    session.scenesRevised,
    session.wordsChanged,
    session.qualityDelta
  ]);
}

async function saveEdit(edit: Edit): Promise<void> {
  const query = `
    INSERT INTO edits 
    (id, scene_id, session_id, edit_type, before_text, after_text, start_position, end_position, 
     rationale, impact_score, affects_plot, affects_character, affects_pacing, created_at, applied_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await databaseService.executeQuery(query, [
    edit.id,
    edit.sceneId,
    edit.sessionId,
    edit.editType,
    edit.beforeText,
    edit.afterText,
    edit.startPosition,
    edit.endPosition,
    edit.rationale,
    edit.impactScore,
    edit.affectsPlot,
    edit.affectsCharacter,
    edit.affectsPacing,
    edit.createdAt,
    edit.appliedAt
  ]);
}

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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  activeHeaderButton: {
    backgroundColor: '#2563eb',
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  sessionInfo: {
    flex: 1,
    alignItems: 'center',
  },
  activeSession: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sessionText: {
    fontSize: 12,
    color: '#166534',
    marginRight: 8,
  },
  endSessionButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  endSessionText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  modeButtonText: {
    fontSize: 14,
    color: '#374151',
    marginRight: 4,
  },
  modeButtonArrow: {
    fontSize: 10,
    color: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  sceneSelector: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
    fontSize: 12,
    color: '#6b7280',
  },
  activeSceneTabText: {
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
  },
  modesContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  modeOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeModeOption: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  modeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  modeChecks: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  sessionActions: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  sessionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sessionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  sessionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RevisionWorkspace;