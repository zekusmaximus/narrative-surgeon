import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useManuscriptStore } from '../store/manuscriptStore';
import { analysisService } from '../services/analysisService';
import { llmProvider } from '../services/llmProvider';
import {
  OpeningAnalysis,
  SceneAnalysis,
  CharacterVoice,
  PlotHole,
  ConsistencyReport
} from '../types';

const { width: screenWidth } = Dimensions.get('window');

const AnalysisScreen: React.FC = () => {
  const { activeManuscript, scenes, characters } = useManuscriptStore();
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [openingAnalysis, setOpeningAnalysis] = useState<OpeningAnalysis | null>(null);
  const [sceneAnalyses, setSceneAnalyses] = useState<Map<string, SceneAnalysis>>(new Map());
  const [plotHoles, setPlotHoles] = useState<PlotHole[]>([]);
  const [selectedTab, setSelectedTab] = useState<'opening' | 'scenes' | 'voices' | 'plots'>('opening');
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const currentScenes = activeManuscript ? scenes.get(activeManuscript.id) || [] : [];
  const currentCharacters = activeManuscript ? characters.get(activeManuscript.id) || [] : [];

  useEffect(() => {
    checkApiKeyAndLoadAnalysis();
  }, [activeManuscript]);

  const checkApiKeyAndLoadAnalysis = async () => {
    if (!activeManuscript) return;

    // Check if API key is configured
    try {
      await analysisService.getOpeningAnalysis(activeManuscript.id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('API key')) {
        setApiKeyModalVisible(true);
        return;
      }
    }

    loadExistingAnalysis();
  };

  const handleSetApiKey = () => {
    if (!apiKeyInput.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    llmProvider.setApiKey(apiKeyInput.trim());
    setApiKeyInput('');
    setApiKeyModalVisible(false);
    loadExistingAnalysis();
  };

  const loadExistingAnalysis = async () => {
    if (!activeManuscript) return;

    try {
      // Load opening analysis
      const openingResult = await analysisService.getOpeningAnalysis(activeManuscript.id);
      setOpeningAnalysis(openingResult);

      // Load scene analyses
      const sceneMap = new Map<string, SceneAnalysis>();
      for (const scene of currentScenes) {
        const analysis = await analysisService.getSceneAnalysis(scene.id);
        if (analysis) {
          sceneMap.set(scene.id, analysis);
        }
      }
      setSceneAnalyses(sceneMap);

    } catch (error) {
      console.error('Failed to load existing analysis:', error);
    }
  };

  const runOpeningAnalysis = async () => {
    if (!activeManuscript) return;

    setIsLoading(true);
    try {
      const result = await analysisService.analyzeOpening(activeManuscript.id, true);
      setOpeningAnalysis(result);
      Alert.alert('Analysis Complete', 'Opening pages analysis has been updated!');
    } catch (error) {
      Alert.alert('Analysis Failed', error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const runSceneAnalysis = async (sceneId: string) => {
    setIsLoading(true);
    try {
      const result = await analysisService.analyzeScene(sceneId, true);
      setSceneAnalyses(prev => new Map(prev).set(sceneId, result));
      Alert.alert('Analysis Complete', 'Scene analysis has been updated!');
    } catch (error) {
      Alert.alert('Analysis Failed', error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const runPlotHoleDetection = async () => {
    if (!activeManuscript) return;

    setIsLoading(true);
    try {
      const holes = await analysisService.detectPlotHoles(activeManuscript.id);
      setPlotHoles(holes);
      Alert.alert(
        'Plot Analysis Complete',
        `Found ${holes.length} potential issue${holes.length !== 1 ? 's' : ''}`
      );
    } catch (error) {
      Alert.alert('Analysis Failed', error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getTensionData = () => {
    const tensionPoints = currentScenes.map((scene, index) => {
      const analysis = sceneAnalyses.get(scene.id);
      return analysis?.tensionLevel || 50;
    });

    if (tensionPoints.length === 0) return null;

    return {
      labels: currentScenes.map((_, i) => `${i + 1}`),
      datasets: [{
        data: tensionPoints,
        strokeWidth: 2,
        color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
      }]
    };
  };

  const getScoreColor = (score?: number): string => {
    if (!score) return '#9ca3af';
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  if (!activeManuscript) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No Active Manuscript</Text>
        <Text style={styles.emptyText}>
          Select a manuscript to begin AI-powered analysis.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'opening', label: 'Opening' },
          { key: 'scenes', label: 'Scenes' },
          { key: 'voices', label: 'Voices' },
          { key: 'plots', label: 'Plot Holes' }
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
        {/* Opening Analysis */}
        {selectedTab === 'opening' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Opening Pages Analysis</Text>
              <TouchableOpacity
                style={[styles.analyzeButton, isLoading && styles.disabledButton]}
                onPress={runOpeningAnalysis}
                disabled={isLoading}
              >
                <Text style={styles.analyzeButtonText}>
                  {isLoading ? 'Analyzing...' : 'Analyze'}
                </Text>
              </TouchableOpacity>
            </View>

            {openingAnalysis ? (
              <View>
                {/* Agent Readiness Score */}
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreLabel}>Agent Readiness Score</Text>
                  <View style={styles.scoreContainer}>
                    <Text style={[
                      styles.scoreValue,
                      { color: getScoreColor(openingAnalysis.agentReadinessScore) }
                    ]}>
                      {openingAnalysis.agentReadinessScore || 'N/A'}
                    </Text>
                    <Text style={styles.scoreMax}>/100</Text>
                  </View>
                </View>

                {/* Hook Analysis */}
                <View style={styles.analysisCard}>
                  <Text style={styles.cardTitle}>Hook Analysis</Text>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Type:</Text>
                    <Text style={styles.cardValue}>{openingAnalysis.hookType || 'Not identified'}</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Strength:</Text>
                    <Text style={[styles.cardValue, { color: getScoreColor(openingAnalysis.hookStrength) }]}>
                      {openingAnalysis.hookStrength || 'N/A'}/100
                    </Text>
                  </View>
                </View>

                {/* Establishment Checklist */}
                <View style={styles.analysisCard}>
                  <Text style={styles.cardTitle}>Element Establishment</Text>
                  {[
                    { key: 'voiceEstablished', label: 'Voice Established' },
                    { key: 'characterEstablished', label: 'Character Established' },
                    { key: 'conflictEstablished', label: 'Conflict Established' },
                    { key: 'genreAppropriate', label: 'Genre Appropriate' },
                  ].map(item => (
                    <View key={item.key} style={styles.checklistItem}>
                      <Text style={styles.checklistLabel}>{item.label}</Text>
                      <Text style={[
                        styles.checklistValue,
                        { color: openingAnalysis[item.key as keyof OpeningAnalysis] ? '#10b981' : '#ef4444' }
                      ]}>
                        {openingAnalysis[item.key as keyof OpeningAnalysis] ? '✓' : '✗'}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Analysis Notes */}
                {openingAnalysis.analysisNotes && (
                  <View style={styles.analysisCard}>
                    <Text style={styles.cardTitle}>Analysis Notes</Text>
                    <Text style={styles.notesText}>{openingAnalysis.analysisNotes}</Text>
                  </View>
                )}

                {/* Comp Title Similarities */}
                {openingAnalysis.similarToComps && openingAnalysis.similarToComps.length > 0 && (
                  <View style={styles.analysisCard}>
                    <Text style={styles.cardTitle}>Similar to Comp Titles</Text>
                    {openingAnalysis.similarToComps.map((comp, index) => (
                      <Text key={index} style={styles.compTitle}>• {comp}</Text>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.noAnalysisText}>
                No opening analysis available. Tap "Analyze" to generate insights.
              </Text>
            )}
          </View>
        )}

        {/* Scene Analysis */}
        {selectedTab === 'scenes' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Scene Analysis</Text>
            </View>

            {/* Tension Arc Chart */}
            {getTensionData() && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Tension Arc</Text>
                <LineChart
                  data={getTensionData()!}
                  width={screenWidth - 32}
                  height={200}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: { r: '6', strokeWidth: '2', stroke: '#2563eb' }
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            )}

            {/* Individual Scene Cards */}
            {currentScenes.map((scene, index) => {
              const analysis = sceneAnalyses.get(scene.id);
              return (
                <View key={scene.id} style={styles.sceneCard}>
                  <View style={styles.sceneHeader}>
                    <Text style={styles.sceneTitle}>
                      {scene.title || `Scene ${index + 1}`}
                    </Text>
                    <TouchableOpacity
                      style={styles.miniAnalyzeButton}
                      onPress={() => runSceneAnalysis(scene.id)}
                      disabled={isLoading}
                    >
                      <Text style={styles.miniAnalyzeButtonText}>Analyze</Text>
                    </TouchableOpacity>
                  </View>

                  {analysis ? (
                    <View>
                      {analysis.summary && (
                        <Text style={styles.sceneSummary}>{analysis.summary}</Text>
                      )}
                      
                      <View style={styles.sceneMetrics}>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Tension</Text>
                          <Text style={[styles.metricValue, { color: getScoreColor(analysis.tensionLevel) }]}>
                            {analysis.tensionLevel || 'N/A'}
                          </Text>
                        </View>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Pacing</Text>
                          <Text style={[styles.metricValue, { color: getScoreColor(analysis.pacingScore) }]}>
                            {analysis.pacingScore || 'N/A'}
                          </Text>
                        </View>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Emotion</Text>
                          <Text style={styles.metricValue}>
                            {analysis.primaryEmotion || 'N/A'}
                          </Text>
                        </View>
                      </View>

                      {analysis.functionTags && analysis.functionTags.length > 0 && (
                        <View style={styles.tagContainer}>
                          {analysis.functionTags.map((tag, tagIndex) => (
                            <View key={tagIndex} style={styles.functionTag}>
                              <Text style={styles.functionTagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.noAnalysisText}>
                      No analysis available for this scene.
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Character Voices */}
        {selectedTab === 'voices' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Character Voice Analysis</Text>
            </View>
            
            {currentCharacters.length === 0 ? (
              <Text style={styles.noAnalysisText}>
                No characters found. Characters are auto-detected from scenes.
              </Text>
            ) : (
              currentCharacters.map(character => (
                <View key={character.id} style={styles.characterCard}>
                  <Text style={styles.characterName}>{character.name}</Text>
                  <Text style={styles.characterRole}>{character.role || 'Unknown role'}</Text>
                  
                  {character.voiceSample ? (
                    <View style={styles.voiceProfile}>
                      <Text style={styles.voiceProfileLabel}>Voice Profile Established</Text>
                      <Text style={styles.voiceProfileText}>
                        {character.voiceSample.slice(0, 100)}...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noAnalysisText}>
                      No voice profile established. Voice will be analyzed from dialogue.
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Plot Holes */}
        {selectedTab === 'plots' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Plot Hole Detection</Text>
              <TouchableOpacity
                style={[styles.analyzeButton, isLoading && styles.disabledButton]}
                onPress={runPlotHoleDetection}
                disabled={isLoading}
              >
                <Text style={styles.analyzeButtonText}>
                  {isLoading ? 'Analyzing...' : 'Detect Issues'}
                </Text>
              </TouchableOpacity>
            </View>

            {plotHoles.length === 0 ? (
              <Text style={styles.noAnalysisText}>
                No plot holes detected. Run analysis to check for continuity issues.
              </Text>
            ) : (
              plotHoles.map((hole, index) => (
                <View key={index} style={[
                  styles.plotHoleCard,
                  hole.severity === 'major' && styles.majorIssue,
                  hole.severity === 'moderate' && styles.moderateIssue
                ]}>
                  <View style={styles.plotHoleHeader}>
                    <Text style={styles.plotHoleType}>{hole.type}</Text>
                    <Text style={[
                      styles.plotHoleSeverity,
                      hole.severity === 'major' && styles.majorSeverityText,
                      hole.severity === 'moderate' && styles.moderateSeverityText
                    ]}>
                      {hole.severity}
                    </Text>
                  </View>
                  <Text style={styles.plotHoleDescription}>{hole.description}</Text>
                  {hole.suggestion && (
                    <Text style={styles.plotHoleSuggestion}>{hole.suggestion}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Analyzing manuscript...</Text>
        </View>
      )}

      {/* API Key Modal */}
      <Modal visible={apiKeyModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>OpenAI API Key Required</Text>
            <Text style={styles.modalText}>
              To use AI analysis features, please enter your OpenAI API key. This will be stored securely on your device.
            </Text>
            
            <TextInput
              style={styles.apiKeyInput}
              placeholder="sk-..."
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              secureTextEntry
              autoCapitalize="none"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setApiKeyModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmModalButton}
                onPress={handleSetApiKey}
              >
                <Text style={styles.confirmModalButtonText}>Set API Key</Text>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
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
  },
  analyzeButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  scoreCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: 18,
    color: '#9ca3af',
    marginLeft: 4,
  },
  analysisCard: {
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  checklistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  checklistLabel: {
    fontSize: 14,
    color: '#374151',
  },
  checklistValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  compTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  noAnalysisText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 32,
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  sceneCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sceneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sceneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  miniAnalyzeButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  miniAnalyzeButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  sceneSummary: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  sceneMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: '600',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  functionTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    margin: 2,
  },
  functionTagText: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '500',
  },
  characterCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  characterName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  characterRole: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  voiceProfile: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  voiceProfileLabel: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 4,
  },
  voiceProfileText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  plotHoleCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  majorIssue: {
    borderLeftColor: '#ef4444',
  },
  moderateIssue: {
    borderLeftColor: '#f59e0b',
  },
  plotHoleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  plotHoleType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  plotHoleSeverity: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  majorSeverityText: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  moderateSeverityText: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  plotHoleDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  plotHoleSuggestion: {
    fontSize: 14,
    color: '#059669',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  apiKeyInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelModalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  cancelModalButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  confirmModalButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AnalysisScreen;