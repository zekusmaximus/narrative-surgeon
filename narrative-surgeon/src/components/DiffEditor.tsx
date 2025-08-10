import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { DiffEditorProps, Suggestion, EditIndicator, Edit, RevisionMode } from '../types';
import { suggestionEngine } from '../services/suggestionEngine';
import { revisionModeService } from '../services/revisionModes';

interface DiffEditorComponentProps extends DiffEditorProps {
  originalText: string;
  workingText: string;
  onTextChange: (text: string) => void;
  suggestions?: Suggestion[];
  mode?: RevisionMode;
  onSuggestionAccept?: (suggestion: Suggestion) => void;
  onSuggestionReject?: (suggestion: Suggestion) => void;
  onEditTracked?: (edit: Edit) => void;
}

const editIndicators: Record<string, EditIndicator> = {
  pace_slow: { color: "#FFA500", icon: "🐢", tooltip: "Pacing drags here", severity: "warning" },
  hook_weak: { color: "#FF0000", icon: "⚓", tooltip: "Hook needs strengthening", severity: "error" },
  voice_drift: { color: "#FFFF00", icon: "🔊", tooltip: "Character voice inconsistent", severity: "warning" },
  plot_hole: { color: "#FF00FF", icon: "🕳️", tooltip: "Continuity issue detected", severity: "error" },
  filter_word: { color: "#FF8C00", icon: "🔍", tooltip: "Filter word detected", severity: "info" },
  passive_voice: { color: "#FFA500", icon: "📝", tooltip: "Passive voice", severity: "warning" },
  weak_verb: { color: "#FFD700", icon: "💪", tooltip: "Weak verb", severity: "info" },
  repetition: { color: "#FF69B4", icon: "🔄", tooltip: "Word repetition", severity: "warning" }
};

interface DiffChunk {
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  originalText: string;
  newText: string;
  startPosition: number;
  suggestions: Suggestion[];
}

const DiffEditor: React.FC<DiffEditorComponentProps> = ({
  originalText,
  workingText,
  onTextChange,
  showThreePaneDiff,
  diffGranularity,
  suggestionMode,
  suggestions = [],
  mode,
  onSuggestionAccept,
  onSuggestionReject,
  onEditTracked
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [textSelection, setTextSelection] = useState({ start: 0, end: 0 });
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  const diffChunks = useMemo(() => {
    return generateDiffChunks(originalText, workingText, suggestions, diffGranularity);
  }, [originalText, workingText, suggestions, diffGranularity]);

  const filteredSuggestions = useMemo(() => {
    return filterSuggestionsByMode(suggestions, suggestionMode, mode);
  }, [suggestions, suggestionMode, mode]);

  const handleSuggestionPress = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setShowSuggestionModal(true);
  };

  const handleAcceptSuggestion = (suggestion: Suggestion) => {
    if (!suggestion.suggestedText) return;

    const newText = applyTextChange(
      workingText,
      suggestion.startPosition,
      suggestion.endPosition,
      suggestion.suggestedText
    );

    onTextChange(newText);
    setAppliedSuggestions(prev => new Set([...prev, suggestion.id]));
    
    if (onSuggestionAccept) {
      onSuggestionAccept(suggestion);
    }

    if (onEditTracked) {
      const edit: Edit = {
        id: `edit-${Date.now()}`,
        sceneId: '', // Will be set by parent
        editType: 'accepted_suggestion',
        beforeText: suggestion.originalText,
        afterText: suggestion.suggestedText,
        startPosition: suggestion.startPosition,
        endPosition: suggestion.endPosition,
        rationale: suggestion.rationale,
        impactScore: suggestion.impactScore,
        affectsPlot: suggestion.type === 'structure',
        affectsCharacter: suggestion.type === 'voice',
        affectsPacing: suggestion.type === 'pacing',
        createdAt: Date.now(),
        appliedAt: Date.now(),
        // Add properties for the simpler Edit interface for compatibility
        type: 'replace' as const,
        start: suggestion.startPosition,
        text: suggestion.suggestedText,
        reason: suggestion.rationale
      };
      onEditTracked(edit);
    }

    setShowSuggestionModal(false);
  };

  const handleRejectSuggestion = (suggestion: Suggestion) => {
    if (onSuggestionReject) {
      onSuggestionReject(suggestion);
    }
    setShowSuggestionModal(false);
  };

  const handleAcceptAllOfType = (type: Suggestion['type']) => {
    const suggestionsOfType = filteredSuggestions.filter(s => s.type === type);
    
    Alert.alert(
      'Accept All',
      `Apply all ${suggestionsOfType.length} ${type} suggestions?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply All',
          onPress: () => {
            let newText = workingText;
            const appliedIds = new Set(appliedSuggestions);
            
            // Apply suggestions in reverse order to maintain positions
            const sortedSuggestions = suggestionsOfType
              .sort((a, b) => b.startPosition - a.startPosition);

            sortedSuggestions.forEach(suggestion => {
              if (suggestion.suggestedText) {
                newText = applyTextChange(
                  newText,
                  suggestion.startPosition,
                  suggestion.endPosition,
                  suggestion.suggestedText
                );
                appliedIds.add(suggestion.id);
                
                if (onSuggestionAccept) {
                  onSuggestionAccept(suggestion);
                }
              }
            });

            onTextChange(newText);
            setAppliedSuggestions(appliedIds);
          }
        }
      ]
    );
  };

  const renderThreePaneView = () => (
    <View style={styles.threePaneContainer}>
      {/* Original Text */}
      <View style={styles.pane}>
        <Text style={styles.paneTitle}>Original</Text>
        <ScrollView style={styles.textContainer}>
          <Text style={styles.text}>{originalText}</Text>
        </ScrollView>
      </View>

      {/* Working Text with Suggestions */}
      <View style={styles.pane}>
        <Text style={styles.paneTitle}>Working</Text>
        <ScrollView style={styles.textContainer}>
          <TextInput
            style={styles.textInput}
            multiline
            value={workingText}
            onChangeText={onTextChange}
            textAlignVertical="top"
          />
          {renderInlineSuggestions()}
        </ScrollView>
      </View>

      {/* AI Suggested */}
      <View style={styles.pane}>
        <Text style={styles.paneTitle}>AI Suggested</Text>
        <ScrollView style={styles.textContainer}>
          <Text style={styles.text}>{generateSuggestedText()}</Text>
        </ScrollView>
      </View>
    </View>
  );

  const renderSinglePaneView = () => (
    <View style={styles.singlePaneContainer}>
      <ScrollView style={styles.textContainer}>
        <TextInput
          style={styles.textInput}
          multiline
          value={workingText}
          onChangeText={onTextChange}
          onSelectionChange={(event) => {
            setTextSelection({
              start: event.nativeEvent.selection.start,
              end: event.nativeEvent.selection.end
            });
          }}
          textAlignVertical="top"
        />
        {renderInlineSuggestions()}
      </ScrollView>
      {renderSuggestionsPanel()}
    </View>
  );

  const renderInlineSuggestions = () => {
    return (
      <View style={styles.suggestionsOverlay}>
        {filteredSuggestions
          .filter(s => !appliedSuggestions.has(s.id))
          .map((suggestion, index) => {
            const indicator = getIndicatorForSuggestion(suggestion);
            return (
              <TouchableOpacity
                key={suggestion.id}
                style={[
                  styles.suggestionIndicator,
                  {
                    top: calculateLinePosition(suggestion.startPosition),
                    backgroundColor: indicator.color,
                    borderColor: getSeverityBorderColor(suggestion.severity)
                  }
                ]}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={styles.indicatorIcon}>{indicator.icon}</Text>
              </TouchableOpacity>
            );
          })
        }
      </View>
    );
  };

  const renderSuggestionsPanel = () => (
    <View style={styles.suggestionsPanel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Suggestions ({filteredSuggestions.length})</Text>
        <View style={styles.batchActions}>
          <TouchableOpacity
            style={styles.batchButton}
            onPress={() => handleAcceptAllOfType('style')}
          >
            <Text style={styles.batchButtonText}>Style</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.batchButton}
            onPress={() => handleAcceptAllOfType('grammar')}
          >
            <Text style={styles.batchButtonText}>Grammar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredSuggestions.filter(s => !appliedSuggestions.has(s.id))}
        keyExtractor={item => item.id}
        renderItem={({ item: suggestion }) => (
          <TouchableOpacity
            style={[
              styles.suggestionItem,
              { borderLeftColor: getSeverityColor(suggestion.severity) }
            ]}
            onPress={() => handleSuggestionPress(suggestion)}
          >
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionType}>{suggestion.type}</Text>
              <Text style={styles.suggestionScore}>{suggestion.impactScore}/100</Text>
            </View>
            <Text style={styles.suggestionText} numberOfLines={2}>
              {suggestion.rationale}
            </Text>
            <View style={styles.suggestionPreview}>
              <Text style={styles.originalText} numberOfLines={1}>
                "{suggestion.originalText}"
              </Text>
              {suggestion.suggestedText && (
                <Text style={styles.suggestedText} numberOfLines={1}>
                  → "{suggestion.suggestedText}"
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderSuggestionModal = () => (
    <Modal
      visible={showSuggestionModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSuggestionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {selectedSuggestion && (
            <>
              <Text style={styles.modalTitle}>Suggestion Details</Text>
              
              <View style={styles.suggestionDetails}>
                <Text style={styles.detailType}>{selectedSuggestion.type.toUpperCase()}</Text>
                <Text style={styles.detailSeverity}>
                  {selectedSuggestion.severity} • Impact: {selectedSuggestion.impactScore}/100
                </Text>
              </View>

              <Text style={styles.detailRationale}>{selectedSuggestion.rationale}</Text>

              <View style={styles.textComparison}>
                <View style={styles.comparisonSection}>
                  <Text style={styles.comparisonLabel}>Original:</Text>
                  <Text style={styles.originalText}>{selectedSuggestion.originalText}</Text>
                </View>
                
                {selectedSuggestion.suggestedText && (
                  <View style={styles.comparisonSection}>
                    <Text style={styles.comparisonLabel}>Suggested:</Text>
                    <Text style={styles.suggestedText}>{selectedSuggestion.suggestedText}</Text>
                  </View>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleRejectSuggestion(selectedSuggestion)}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptSuggestion(selectedSuggestion)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {showThreePaneDiff ? renderThreePaneView() : renderSinglePaneView()}
      {renderSuggestionModal()}
    </View>
  );
};

// Helper functions
function generateDiffChunks(
  original: string, 
  working: string, 
  suggestions: Suggestion[], 
  granularity: 'character' | 'word' | 'sentence' | 'paragraph'
): DiffChunk[] {
  // Simple diff implementation - in production, use a proper diff library
  const chunks: DiffChunk[] = [];
  
  if (original === working) {
    chunks.push({
      type: 'unchanged',
      originalText: original,
      newText: working,
      startPosition: 0,
      suggestions: []
    });
  } else {
    chunks.push({
      type: 'modified',
      originalText: original,
      newText: working,
      startPosition: 0,
      suggestions
    });
  }
  
  return chunks;
}

function filterSuggestionsByMode(
  suggestions: Suggestion[], 
  mode: 'aggressive' | 'balanced' | 'conservative' | 'voice_preserve',
  revisionMode?: RevisionMode
): Suggestion[] {
  let filtered = suggestions;

  // Filter by suggestion mode
  switch (mode) {
    case 'aggressive':
      filtered = suggestions.filter(s => s.impactScore >= 30);
      break;
    case 'balanced':
      filtered = suggestions.filter(s => s.impactScore >= 50);
      break;
    case 'conservative':
      filtered = suggestions.filter(s => s.impactScore >= 70);
      break;
    case 'voice_preserve':
      filtered = suggestions.filter(s => s.type !== 'voice' || s.severity === 'error');
      break;
  }

  // Filter by revision mode if provided
  if (revisionMode) {
    const relevantTypes = revisionMode.checksEnabled;
    filtered = filtered.filter(s => relevantTypes.includes(s.type));
  }

  return filtered.sort((a, b) => b.impactScore - a.impactScore);
}

function applyTextChange(text: string, start: number, end: number, replacement: string): string {
  return text.substring(0, start) + replacement + text.substring(end);
}

function generateSuggestedText(): string {
  // This would generate text with all suggestions applied
  return "AI suggested text with all improvements...";
}

function getIndicatorForSuggestion(suggestion: Suggestion): EditIndicator {
  const typeMap: Record<string, string> = {
    'style': 'filter_word',
    'voice': 'voice_drift',
    'pacing': 'pace_slow',
    'structure': 'hook_weak',
    'grammar': 'weak_verb',
    'spelling': 'filter_word'
  };

  const indicatorType = typeMap[suggestion.type] || 'filter_word';
  return editIndicators[indicatorType];
}

function calculateLinePosition(position: number): number {
  // Simple approximation - would need proper text measurement in production
  const averageCharsPerLine = 80;
  const lineHeight = 20;
  return Math.floor(position / averageCharsPerLine) * lineHeight;
}

function getSeverityBorderColor(severity: Suggestion['severity']): string {
  const colors = {
    'error': '#FF0000',
    'warning': '#FFA500',
    'info': '#0066CC',
    'success': '#00CC66'
  };
  return colors[severity];
}

function getSeverityColor(severity: Suggestion['severity']): string {
  const colors = {
    'error': '#FF0000',
    'warning': '#FFA500',
    'info': '#0066CC',
    'success': '#00CC66'
  };
  return colors[severity];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  threePaneContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  pane: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
  },
  paneTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f2937',
  },
  singlePaneContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  textContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
    textAlignVertical: 'top',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
  },
  suggestionsOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
  suggestionIndicator: {
    position: 'absolute',
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorIcon: {
    fontSize: 12,
  },
  suggestionsPanel: {
    width: 320,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  batchActions: {
    flexDirection: 'row',
  },
  batchButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    marginLeft: 4,
  },
  batchButtonText: {
    fontSize: 12,
    color: '#6b7280',
  },
  suggestionItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  suggestionType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textTransform: 'capitalize',
  },
  suggestionScore: {
    fontSize: 12,
    color: '#6b7280',
  },
  suggestionText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  suggestionPreview: {
    marginTop: 4,
  },
  originalText: {
    fontSize: 12,
    color: '#ef4444',
    fontStyle: 'italic',
  },
  suggestedText: {
    fontSize: 12,
    color: '#10b981',
    fontStyle: 'italic',
    marginTop: 2,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  suggestionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  detailSeverity: {
    fontSize: 12,
    color: '#6b7280',
  },
  detailRationale: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 24,
  },
  textComparison: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  comparisonSection: {
    marginBottom: 12,
  },
  comparisonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rejectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  rejectButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  acceptButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default DiffEditor;