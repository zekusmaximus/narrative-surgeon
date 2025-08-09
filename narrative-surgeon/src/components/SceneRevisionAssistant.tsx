import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { analysisService } from '../services/analysisService';
import { Hook, ConsistencyReport, SceneAnalysis } from '../types';

interface SceneRevisionAssistantProps {
  sceneId: string;
  sceneText: string;
  visible: boolean;
  onClose: () => void;
  onRevisionSuggestion: (suggestion: string) => void;
}

const SceneRevisionAssistant: React.FC<SceneRevisionAssistantProps> = ({
  sceneId,
  sceneText,
  visible,
  onClose,
  onRevisionSuggestion
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SceneAnalysis | null>(null);
  const [weakestElement, setWeakestElement] = useState<{element: string, issue: string, fix: string} | null>(null);
  const [hooks, setHooks] = useState<{opening: Hook, ending: Hook} | null>(null);
  const [selectedTab, setSelectedTab] = useState<'analysis' | 'weakest' | 'hooks'>('analysis');

  useEffect(() => {
    if (visible) {
      loadAnalysis();
    }
  }, [visible, sceneId]);

  const loadAnalysis = async () => {
    setIsLoading(true);
    try {
      // Load existing analysis
      const existingAnalysis = await analysisService.getSceneAnalysis(sceneId);
      setAnalysis(existingAnalysis);

      // Get revision suggestions
      const suggestions = await analysisService.suggestRevisions(sceneId);
      setWeakestElement(suggestions.weakestElement);
      setHooks(suggestions.hookSuggestions);
    } catch (error) {
      console.error('Failed to load analysis:', error);
      Alert.alert('Error', 'Failed to load scene analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const runFullAnalysis = async () => {
    setIsLoading(true);
    try {
      const result = await analysisService.analyzeScene(sceneId, true);
      setAnalysis(result);
      Alert.alert('Analysis Complete', 'Scene has been re-analyzed!');
    } catch (error) {
      Alert.alert('Analysis Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const applyRevision = (suggestion: string) => {
    onRevisionSuggestion(suggestion);
    Alert.alert('Suggestion Applied', 'The revision suggestion has been applied to your editor.');
  };

  const getScoreColor = (score?: number): string => {
    if (!score) return '#9ca3af';
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Revision Assistant</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: 'analysis', label: 'Analysis' },
            { key: 'weakest', label: 'Weakest Element' },
            { key: 'hooks', label: 'Hook Suggestions' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, selectedTab === tab.key && styles.activeTab]}
              onPress={() => setSelectedTab(tab.key as any)}
            >
              <Text style={[styles.tabText, selectedTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Analyzing scene...</Text>
            </View>
          ) : (
            <>
              {/* Analysis Tab */}
              {selectedTab === 'analysis' && (
                <View>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Scene Analysis</Text>
                    <TouchableOpacity style={styles.analyzeButton} onPress={runFullAnalysis}>
                      <Text style={styles.analyzeButtonText}>Re-analyze</Text>
                    </TouchableOpacity>
                  </View>

                  {analysis ? (
                    <>
                      {/* Summary */}
                      {analysis.summary && (
                        <View style={styles.card}>
                          <Text style={styles.cardTitle}>Summary</Text>
                          <Text style={styles.summaryText}>{analysis.summary}</Text>
                        </View>
                      )}

                      {/* Metrics */}
                      <View style={styles.card}>
                        <Text style={styles.cardTitle}>Scene Metrics</Text>
                        <View style={styles.metricsRow}>
                          <View style={styles.metric}>
                            <Text style={styles.metricLabel}>Tension Level</Text>
                            <Text style={[styles.metricValue, { color: getScoreColor(analysis.tensionLevel) }]}>
                              {analysis.tensionLevel || 'N/A'}/100
                            </Text>
                          </View>
                          <View style={styles.metric}>
                            <Text style={styles.metricLabel}>Pacing Score</Text>
                            <Text style={[styles.metricValue, { color: getScoreColor(analysis.pacingScore) }]}>
                              {analysis.pacingScore || 'N/A'}/100
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Emotions */}
                      {(analysis.primaryEmotion || analysis.secondaryEmotion) && (
                        <View style={styles.card}>
                          <Text style={styles.cardTitle}>Emotional Content</Text>
                          <View style={styles.emotionRow}>
                            {analysis.primaryEmotion && (
                              <View style={styles.emotionTag}>
                                <Text style={styles.emotionText}>{analysis.primaryEmotion}</Text>
                                <Text style={styles.emotionLabel}>Primary</Text>
                              </View>
                            )}
                            {analysis.secondaryEmotion && (
                              <View style={[styles.emotionTag, styles.secondaryEmotion]}>
                                <Text style={styles.emotionText}>{analysis.secondaryEmotion}</Text>
                                <Text style={styles.emotionLabel}>Secondary</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}

                      {/* Function Tags */}
                      {analysis.functionTags && analysis.functionTags.length > 0 && (
                        <View style={styles.card}>
                          <Text style={styles.cardTitle}>Scene Functions</Text>
                          <View style={styles.tagContainer}>
                            {analysis.functionTags.map((tag, index) => (
                              <View key={index} style={styles.functionTag}>
                                <Text style={styles.functionTagText}>{tag.replace('_', ' ')}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Checkboxes */}
                      <View style={styles.card}>
                        <Text style={styles.cardTitle}>Scene Elements</Text>
                        <View style={styles.checkboxRow}>
                          <View style={styles.checkbox}>
                            <Text style={[
                              styles.checkboxIcon,
                              { color: analysis.conflictPresent ? '#10b981' : '#ef4444' }
                            ]}>
                              {analysis.conflictPresent ? '✓' : '✗'}
                            </Text>
                            <Text style={styles.checkboxLabel}>Conflict Present</Text>
                          </View>
                          <View style={styles.checkbox}>
                            <Text style={[
                              styles.checkboxIcon,
                              { color: analysis.characterIntroduced ? '#10b981' : '#ef4444' }
                            ]}>
                              {analysis.characterIntroduced ? '✓' : '✗'}
                            </Text>
                            <Text style={styles.checkboxLabel}>Character Introduced</Text>
                          </View>
                        </View>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.noDataText}>
                      No analysis available. Tap "Re-analyze" to generate insights.
                    </Text>
                  )}
                </View>
              )}

              {/* Weakest Element Tab */}
              {selectedTab === 'weakest' && (
                <View>
                  <Text style={styles.sectionTitle}>Weakest Element</Text>
                  {weakestElement ? (
                    <View style={styles.card}>
                      <View style={styles.weakestElementHeader}>
                        <Text style={styles.weakestElementType}>{weakestElement.element}</Text>
                        <TouchableOpacity
                          style={styles.applyButton}
                          onPress={() => applyRevision(weakestElement.fix)}
                        >
                          <Text style={styles.applyButtonText}>Apply Fix</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.issueText}>
                        <Text style={styles.issueLabel}>Issue: </Text>
                        {weakestElement.issue}
                      </Text>
                      <Text style={styles.fixText}>
                        <Text style={styles.fixLabel}>Suggested Fix: </Text>
                        {weakestElement.fix}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noDataText}>
                      No weakest element identified. Analysis may still be processing.
                    </Text>
                  )}
                </View>
              )}

              {/* Hook Suggestions Tab */}
              {selectedTab === 'hooks' && (
                <View>
                  <Text style={styles.sectionTitle}>Hook Suggestions</Text>
                  {hooks ? (
                    <>
                      {/* Opening Hook */}
                      <View style={styles.card}>
                        <View style={styles.hookHeader}>
                          <Text style={styles.hookTitle}>Opening Hook</Text>
                          <Text style={[styles.hookStrength, { color: getScoreColor(hooks.opening.strength) }]}>
                            {hooks.opening.strength}/100
                          </Text>
                        </View>
                        <Text style={styles.hookType}>Type: {hooks.opening.type}</Text>
                        {hooks.opening.suggestion && (
                          <>
                            <Text style={styles.hookSuggestionText}>{hooks.opening.suggestion}</Text>
                            <TouchableOpacity
                              style={styles.applyButton}
                              onPress={() => applyRevision(hooks.opening.suggestion!)}
                            >
                              <Text style={styles.applyButtonText}>Apply Suggestion</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>

                      {/* Ending Hook */}
                      <View style={styles.card}>
                        <View style={styles.hookHeader}>
                          <Text style={styles.hookTitle}>Ending Hook</Text>
                          <Text style={[styles.hookStrength, { color: getScoreColor(hooks.ending.strength) }]}>
                            {hooks.ending.strength}/100
                          </Text>
                        </View>
                        <Text style={styles.hookType}>Type: {hooks.ending.type}</Text>
                        {hooks.ending.suggestion && (
                          <>
                            <Text style={styles.hookSuggestionText}>{hooks.ending.suggestion}</Text>
                            <TouchableOpacity
                              style={styles.applyButton}
                              onPress={() => applyRevision(hooks.ending.suggestion!)}
                            >
                              <Text style={styles.applyButtonText}>Apply Suggestion</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </>
                  ) : (
                    <Text style={styles.noDataText}>
                      No hook suggestions available. Analysis may still be processing.
                    </Text>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 44, // Account for status bar
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  analyzeButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  emotionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  emotionTag: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  secondaryEmotion: {
    backgroundColor: '#f0fdf4',
  },
  emotionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'capitalize',
  },
  emotionLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  functionTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  functionTagText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  checkbox: {
    alignItems: 'center',
  },
  checkboxIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 32,
  },
  weakestElementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weakestElementType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    textTransform: 'capitalize',
  },
  applyButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  issueText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  issueLabel: {
    fontWeight: '600',
    color: '#dc2626',
  },
  fixText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  fixLabel: {
    fontWeight: '600',
    color: '#059669',
  },
  hookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  hookStrength: {
    fontSize: 14,
    fontWeight: '600',
  },
  hookType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  hookSuggestionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
});

export default SceneRevisionAssistant;