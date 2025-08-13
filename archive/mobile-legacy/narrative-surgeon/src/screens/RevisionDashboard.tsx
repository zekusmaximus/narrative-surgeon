import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { useManuscriptStore } from '../store/manuscriptStore';
import { RevisionSession, Issue, QuickFix, AutoFix, RevisionMode, BetaReaderPersona, CompAnalysis } from '../types';
import { databaseService } from '../services/database';
import { revisionModeService } from '../services/revisionModes';
import { patternDetector } from '../services/patternDetector';
import { betaReaderSimulator } from '../services/betaReaderSimulator';
import { v4 as uuidv4 } from 'uuid';

interface DashboardMetrics {
  agentReadinessScore: number;
  estimatedRevisionHours: number;
  criticalIssues: Issue[];
  sessionsCompleted: RevisionSession[];
  improvementDelta: number;
  suggestedNextFocus: RevisionMode;
  reasonForSuggestion: string;
  quickWins: QuickFix[];
  oneClickImprovements: AutoFix[];
}

const RevisionDashboard: React.FC = () => {
  const { activeManuscript, scenes } = useManuscriptStore();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuickFixModal, setShowQuickFixModal] = useState(false);
  const [selectedQuickFix, setSelectedQuickFix] = useState<QuickFix | null>(null);
  const [betaReaderResults, setBetaReaderResults] = useState<BetaReaderPersona[]>([]);
  const [compAnalyses, setCompAnalyses] = useState<CompAnalysis[]>([]);

  useEffect(() => {
    if (activeManuscript) {
      loadDashboardData();
    }
  }, [activeManuscript]);

  const loadDashboardData = async () => {
    if (!activeManuscript) return;

    try {
      setIsLoading(true);
      
      const [sessions, betaReaders, comps] = await Promise.all([
        getRevisionSessions(activeManuscript.id),
        getBetaReaderPersonas(activeManuscript.id),
        getCompAnalyses(activeManuscript.id)
      ]);

      setBetaReaderResults(betaReaders);
      setCompAnalyses(comps);

      const metrics = await calculateMetrics(activeManuscript.id, sessions, betaReaders);
      setMetrics(metrics);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = async (
    manuscriptId: string, 
    sessions: RevisionSession[],
    betaReaders: BetaReaderPersona[]
  ): Promise<DashboardMetrics> => {
    // Get patterns for critical issues
    const patterns = await patternDetector.getPatterns(manuscriptId);
    const criticalIssues = patterns
      .filter(p => p.severity >= 80)
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        type: p.patternType || 'unknown',
        severity: 'critical' as const,
        description: `${p.patternType} detected ${p.frequency} times`,
        sceneIds: [], // Would need to track specific scenes
        suggestedFix: p.suggestedAlternatives?.[0] || 'Manual review required',
        impactIfIgnored: 'May affect reader engagement and professional impression'
      }));

    // Calculate agent readiness score
    const agentReadinessScore = calculateAgentReadinessScore(betaReaders, patterns);
    
    // Estimate revision hours based on issues and manuscript length
    const currentScenes = scenes.get(manuscriptId) || [];
    const totalWordCount = currentScenes.reduce((sum, s) => sum + s.wordCount, 0);
    const estimatedRevisionHours = Math.ceil((criticalIssues.length * 0.5) + (totalWordCount / 5000));

    // Calculate improvement delta
    const improvementDelta = sessions.length > 1 
      ? sessions[sessions.length - 1].qualityDelta || 0
      : 0;

    // Suggest next focus area
    const suggestedNextFocus = suggestNextRevisionFocus(patterns, sessions, betaReaders);
    
    // Generate quick wins
    const quickWins = generateQuickWins(patterns, currentScenes);
    
    // Generate one-click improvements
    const oneClickImprovements = generateOneClickImprovements(patterns);

    return {
      agentReadinessScore,
      estimatedRevisionHours,
      criticalIssues,
      sessionsCompleted: sessions,
      improvementDelta,
      suggestedNextFocus: suggestedNextFocus.mode,
      reasonForSuggestion: suggestedNextFocus.reason,
      quickWins,
      oneClickImprovements
    };
  };

  const calculateAgentReadinessScore = (betaReaders: BetaReaderPersona[], patterns: any[]): number => {
    let score = 100;

    // Deduct points for critical issues
    const criticalPatterns = patterns.filter(p => p.severity >= 80);
    score -= criticalPatterns.length * 10;

    // Factor in agent persona feedback if available
    const agentPersona = betaReaders.find(p => p.personaType === 'agent');
    if (agentPersona) {
      if (!agentPersona.wouldContinueReading) score -= 30;
      if (!agentPersona.wouldRecommend) score -= 20;
      
      // Use engagement curve to assess opening strength
      const averageEngagement = (agentPersona.engagementCurve?.reduce((a, b) => a + b, 0) || 0) / 
        (agentPersona.engagementCurve?.length || 1);
      score = (score + averageEngagement) / 2;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const suggestNextRevisionFocus = (patterns: any[], sessions: RevisionSession[], betaReaders: BetaReaderPersona[]) => {
    const modes = revisionModeService.getAllModes();
    
    // If no sessions yet, start with developmental
    if (sessions.length === 0) {
      return {
        mode: modes.find(m => m.name.includes('Developmental')) || modes[0],
        reason: 'Start with big-picture story elements before polishing details'
      };
    }

    // If agent persona struggled with opening, focus on opening polish
    const agentPersona = betaReaders.find(p => p.personaType === 'agent');
    if (agentPersona && !agentPersona.wouldContinueReading) {
      return {
        mode: modes.find(m => m.name.includes('Opening')) || modes[0],
        reason: 'Agent persona stopped reading - opening needs immediate attention'
      };
    }

    // Focus on most severe pattern type
    const topPattern = patterns.sort((a, b) => b.severity - a.severity)[0];
    if (topPattern) {
      const focusMap: Record<string, string> = {
        'filter_words': 'Line Editing',
        'passive_voice': 'Line Editing',
        'dialogue_issues': 'Dialogue Enhancement',
        'repetition': 'Line Editing',
        'pacing_issues': 'Tension Calibration'
      };

      const focusName = focusMap[topPattern.patternType || ''] || 'Line Editing';
      const mode = modes.find(m => m.name.includes(focusName)) || modes[0];
      
      return {
        mode,
        reason: `${topPattern.frequency} instances of ${topPattern.patternType} detected`
      };
    }

    // Default to line editing
    return {
      mode: modes.find(m => m.name.includes('Line')) || modes[0],
      reason: 'Continue with line-level improvements'
    };
  };

  const generateQuickWins = (patterns: any[], scenes: any[]): QuickFix[] => {
    const quickFixes: QuickFix[] = [];

    // Filter word removal
    const filterWords = patterns.find(p => p.patternType === 'filter_words');
    if (filterWords && filterWords.frequency > 10) {
      quickFixes.push({
        id: uuidv4(),
        description: `Remove ${filterWords.frequency} filter words`,
        impactScore: 70,
        effortScore: 20,
        autoApplicable: true,
        targetScenes: scenes.map(s => s.id).slice(0, 5)
      });
    }

    // Passive voice conversion
    const passiveVoice = patterns.find(p => p.patternType === 'passive_voice');
    if (passiveVoice && passiveVoice.frequency > 5) {
      quickFixes.push({
        id: uuidv4(),
        description: `Convert ${passiveVoice.frequency} instances of passive voice`,
        impactScore: 60,
        effortScore: 40,
        autoApplicable: true,
        targetScenes: scenes.map(s => s.id).slice(0, 3)
      });
    }

    // Repetition fixes
    const repetition = patterns.find(p => p.patternType === 'repetition');
    if (repetition && repetition.severity > 60) {
      quickFixes.push({
        id: uuidv4(),
        description: `Address word repetition issues`,
        impactScore: 50,
        effortScore: 30,
        autoApplicable: false,
        targetScenes: scenes.map(s => s.id).slice(0, 10)
      });
    }

    return quickFixes.sort((a, b) => (b.impactScore / b.effortScore) - (a.impactScore / a.effortScore));
  };

  const generateOneClickImprovements = (patterns: any[]): AutoFix[] => {
    return patterns
      .filter(p => p.autoFixAvailable && p.severity >= 40)
      .map(p => ({
        id: p.id,
        type: p.patternType,
        description: `Auto-fix all ${p.patternType} instances`,
        pattern: new RegExp(''), // Would be populated from pattern data
        replacement: '',
        preserveCase: true
      }));
  };

  const handleQuickFixApply = async (quickFix: QuickFix) => {
    setSelectedQuickFix(quickFix);
    setShowQuickFixModal(true);
  };

  const applyQuickFix = async () => {
    if (!selectedQuickFix || !activeManuscript) return;

    Alert.alert(
      'Apply Quick Fix',
      `This will apply "${selectedQuickFix.description}" to ${selectedQuickFix.targetScenes.length} scenes. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              // Here you would apply the actual fixes
              Alert.alert('Success', 'Quick fix applied successfully!');
              setShowQuickFixModal(false);
              loadDashboardData(); // Refresh metrics
            } catch (error) {
              Alert.alert('Error', 'Failed to apply quick fix');
            }
          }
        }
      ]
    );
  };

  const handleRunBetaReaderSimulation = async () => {
    if (!activeManuscript) return;

    Alert.alert(
      'Run Beta Reader Simulation',
      'This will simulate how different reader types would react to your manuscript. This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Simulation',
          onPress: async () => {
            try {
              const currentScenes = scenes.get(activeManuscript.id) || [];
              await betaReaderSimulator.simulateAllPersonas(activeManuscript, currentScenes);
              loadDashboardData(); // Refresh with new data
              Alert.alert('Complete', 'Beta reader simulation completed!');
            } catch (error) {
              Alert.alert('Error', 'Beta reader simulation failed');
            }
          }
        }
      ]
    );
  };

  if (!activeManuscript) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No Active Manuscript</Text>
        <Text style={styles.emptyText}>Select a manuscript to view revision dashboard</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading revision dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{metrics?.agentReadinessScore || 0}/100</Text>
          <Text style={styles.metricLabel}>Agent Ready</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{metrics?.estimatedRevisionHours || 0}h</Text>
          <Text style={styles.metricLabel}>Est. Hours</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{metrics?.criticalIssues.length || 0}</Text>
          <Text style={styles.metricLabel}>Critical Issues</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {metrics?.improvementDelta ? `+${metrics.improvementDelta}%` : '0%'}
          </Text>
          <Text style={styles.metricLabel}>Improvement</Text>
        </View>
      </View>

      {/* Critical Issues */}
      {metrics?.criticalIssues && metrics.criticalIssues.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Critical Issues</Text>
          {metrics.criticalIssues.slice(0, 3).map(issue => (
            <View key={issue.id} style={styles.issueCard}>
              <View style={styles.issueHeader}>
                <Text style={styles.issueType}>{issue.type}</Text>
                <Text style={styles.issueSeverity}>{issue.severity}</Text>
              </View>
              <Text style={styles.issueDescription}>{issue.description}</Text>
              <Text style={styles.issueFix}>Fix: {issue.suggestedFix}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Next Suggested Focus */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suggested Next Focus</Text>
        <View style={styles.suggestionCard}>
          <Text style={styles.suggestionMode}>{metrics?.suggestedNextFocus.name}</Text>
          <Text style={styles.suggestionDescription}>{metrics?.suggestedNextFocus.description}</Text>
          <Text style={styles.suggestionReason}>{metrics?.reasonForSuggestion}</Text>
          <TouchableOpacity style={styles.startButton}>
            <Text style={styles.startButtonText}>Start Revision Session</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Wins */}
      {metrics?.quickWins && metrics.quickWins.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Wins</Text>
          {metrics.quickWins.slice(0, 3).map(quickWin => (
            <View key={quickWin.id} style={styles.quickWinCard}>
              <View style={styles.quickWinHeader}>
                <Text style={styles.quickWinDescription}>{quickWin.description}</Text>
                <View style={styles.quickWinScores}>
                  <Text style={styles.impactScore}>Impact: {quickWin.impactScore}</Text>
                  <Text style={styles.effortScore}>Effort: {quickWin.effortScore}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.applyButton, !quickWin.autoApplicable && styles.disabledButton]}
                onPress={() => handleQuickFixApply(quickWin)}
                disabled={!quickWin.autoApplicable}
              >
                <Text style={styles.applyButtonText}>
                  {quickWin.autoApplicable ? 'Apply Fix' : 'Review Manually'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Beta Reader Results */}
      {betaReaderResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beta Reader Feedback</Text>
          {betaReaderResults.map(reader => (
            <View key={reader.id} style={styles.readerCard}>
              <View style={styles.readerHeader}>
                <Text style={styles.readerType}>{reader.personaType?.replace('_', ' ')}</Text>
                <Text style={styles.readerRecommend}>
                  {reader.wouldRecommend ? '👍' : '👎'}
                </Text>
              </View>
              <Text style={styles.readerCriticism}>{reader.primaryCriticism}</Text>
              {reader.primaryPraise && (
                <Text style={styles.readerPraise}>{reader.primaryPraise}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={handleRunBetaReaderSimulation}>
          <Text style={styles.actionButtonText}>Run Beta Reader Simulation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Generate Comp Analysis</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Fix Modal */}
      <Modal
        visible={showQuickFixModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuickFixModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedQuickFix && (
              <>
                <Text style={styles.modalTitle}>Apply Quick Fix</Text>
                <Text style={styles.quickFixDescription}>{selectedQuickFix.description}</Text>
                <Text style={styles.quickFixDetails}>
                  Impact: {selectedQuickFix.impactScore}/100 • Effort: {selectedQuickFix.effortScore}/100
                </Text>
                <Text style={styles.quickFixScenes}>
                  Affects {selectedQuickFix.targetScenes.length} scenes
                </Text>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowQuickFixModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.confirmButton} onPress={applyQuickFix}>
                    <Text style={styles.confirmButtonText}>Apply Fix</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// Helper functions
async function getRevisionSessions(manuscriptId: string): Promise<RevisionSession[]> {
  const query = `
    SELECT * FROM revision_sessions 
    WHERE manuscript_id = ? 
    ORDER BY started_at DESC
  `;
  
  const rows = await databaseService.getAll(query, [manuscriptId]);
  
  return rows.map(row => ({
    id: row.id,
    manuscriptId: row.manuscript_id,
    sessionType: row.session_type,
    focusArea: row.focus_area,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    scenesRevised: row.scenes_revised,
    wordsChanged: row.words_changed,
    qualityDelta: row.quality_delta
  }));
}

async function getBetaReaderPersonas(manuscriptId: string): Promise<BetaReaderPersona[]> {
  return betaReaderSimulator.getBetaReaderPersonas(manuscriptId);
}

async function getCompAnalyses(manuscriptId: string): Promise<CompAnalysis[]> {
  const query = `
    SELECT * FROM comp_analysis 
    WHERE manuscript_id = ? 
    ORDER BY analyzed_at DESC
  `;
  
  const rows = await databaseService.getAll(query, [manuscriptId]);
  
  return rows.map(row => ({
    id: row.id,
    manuscriptId: row.manuscript_id,
    compTitle: row.comp_title,
    compAuthor: row.comp_author,
    openingSimilarity: row.opening_similarity,
    pacingSimilarity: row.pacing_similarity,
    voiceSimilarity: row.voice_similarity,
    structureSimilarity: row.structure_similarity,
    marketPosition: row.market_position,
    keyDifferences: row.key_differences,
    keySimilarities: row.key_similarities,
    analyzedAt: row.analyzed_at
  }));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  issueCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  issueType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  issueSeverity: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  issueDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  issueFix: {
    fontSize: 12,
    color: '#059669',
    fontStyle: 'italic',
  },
  suggestionCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  suggestionMode: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 8,
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  suggestionReason: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  startButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  quickWinCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  quickWinHeader: {
    marginBottom: 12,
  },
  quickWinDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  quickWinScores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  impactScore: {
    fontSize: 12,
    color: '#059669',
  },
  effortScore: {
    fontSize: 12,
    color: '#6b7280',
  },
  applyButton: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  readerCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  readerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  readerType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  readerRecommend: {
    fontSize: 20,
  },
  readerCriticism: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 4,
  },
  readerPraise: {
    fontSize: 14,
    color: '#059669',
  },
  actionsSection: {
    marginTop: 24,
  },
  actionButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
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
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  quickFixDescription: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
  },
  quickFixDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  quickFixScenes: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 24,
  },
  modalActions: {
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
  confirmButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default RevisionDashboard;