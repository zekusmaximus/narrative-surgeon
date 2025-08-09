import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput
} from 'react-native';
import { CompAnalysis, Scene, Manuscript } from '../types';
import { ChunkedLLMProvider } from '../services/llmProvider';
import { databaseService } from '../services/database';
import { v4 as uuidv4 } from 'uuid';

interface CompAnalysisComparisonProps {
  manuscript: Manuscript;
  scenes: Scene[];
  compAnalyses?: CompAnalysis[];
  onAnalysisUpdate?: (analyses: CompAnalysis[]) => void;
}

interface ComparisonData {
  yourOpening: string;
  compOpening: string;
  metrics: {
    hookStrength: { yours: number; theirs: number };
    voiceStrength: { yours: number; theirs: number };
    paceBeats: { yours: number; theirs: number };
  };
  similarities: string[];
  differences: string[];
  suggestions: string[];
}

const CompAnalysisComparison: React.FC<CompAnalysisComparisonProps> = ({
  manuscript,
  scenes,
  compAnalyses = [],
  onAnalysisUpdate
}) => {
  const [selectedComp, setSelectedComp] = useState<CompAnalysis | null>(
    compAnalyses.length > 0 ? compAnalyses[0] : null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newCompTitle, setNewCompTitle] = useState('');
  const [showAddComp, setShowAddComp] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [llmProvider] = useState(() => new ChunkedLLMProvider());

  const openingScenes = scenes.filter(s => s.isOpening).slice(0, 3);
  const yourOpening = openingScenes.map(s => s.rawText).join('\n\n').substring(0, 1500);

  useEffect(() => {
    if (selectedComp) {
      generateComparison();
    }
  }, [selectedComp]);

  const generateComparison = async () => {
    if (!selectedComp || !yourOpening) return;

    setIsAnalyzing(true);
    try {
      // Generate comparison data
      const data = await generateComparisonData(selectedComp, yourOpening);
      setComparisonData(data);
    } catch (error) {
      console.error('Error generating comparison:', error);
      Alert.alert('Error', 'Failed to generate comparison analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateComparisonData = async (comp: CompAnalysis, yourText: string): Promise<ComparisonData> => {
    // This would normally fetch the actual comp title opening from a database or API
    // For now, we'll use a mock opening
    const compOpening = generateMockCompOpening(comp.compTitle);

    const prompt = `Compare these two openings from ${manuscript.genre} novels:

OPENING A (Your manuscript "${manuscript.title}"):
${yourText}

OPENING B (Comp title "${comp.compTitle}"):
${compOpening}

Analyze and provide:
1. Hook strength (0-100) for each
2. Voice strength (0-100) for each  
3. Pacing (beats per minute) for each
4. Key similarities between them
5. Key differences
6. Specific suggestions to align Opening A with the style of Opening B

Respond in JSON format:
{
  "metrics": {
    "hookStrength": {"yours": number, "theirs": number},
    "voiceStrength": {"yours": number, "theirs": number}, 
    "paceBeats": {"yours": number, "theirs": number}
  },
  "similarities": ["similarity1", "similarity2"],
  "differences": ["difference1", "difference2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

    try {
      const response = await llmProvider.callLLM('comp-analysis', prompt);
      
      return {
        yourOpening: yourText,
        compOpening,
        metrics: response.metrics || {
          hookStrength: { yours: 65, theirs: 85 },
          voiceStrength: { yours: 70, theirs: 80 },
          paceBeats: { yours: 8, theirs: 12 }
        },
        similarities: response.similarities || ['Both use third person POV', 'Similar genre conventions'],
        differences: response.differences || ['Different pacing', 'Voice tone varies'],
        suggestions: response.suggestions || ['Consider faster pacing', 'Strengthen opening hook']
      };
    } catch (error) {
      console.error('LLM analysis failed:', error);
      
      // Fallback to rule-based analysis
      return generateFallbackComparison(yourText, compOpening);
    }
  };

  const generateFallbackComparison = (yourText: string, compText: string): ComparisonData => {
    // Simple rule-based analysis as fallback
    const yourSentences = yourText.split(/[.!?]+/).filter(s => s.trim());
    const compSentences = compText.split(/[.!?]+/).filter(s => s.trim());
    
    const yourAvgSentenceLength = yourSentences.reduce((sum, s) => sum + s.split(' ').length, 0) / yourSentences.length;
    const compAvgSentenceLength = compSentences.reduce((sum, s) => sum + s.split(' ').length, 0) / compSentences.length;
    
    const yourDialogueRatio = (yourText.match(/"/g) || []).length / yourText.length * 100;
    const compDialogueRatio = (compText.match(/"/g) || []).length / compText.length * 100;

    return {
      yourOpening: yourText,
      compOpening: compText,
      metrics: {
        hookStrength: { 
          yours: Math.round(65 + (yourDialogueRatio > 5 ? 10 : 0)), 
          theirs: 85 
        },
        voiceStrength: { 
          yours: Math.round(70 + (yourAvgSentenceLength < 20 ? 10 : 0)), 
          theirs: 80 
        },
        paceBeats: { 
          yours: Math.round(yourAvgSentenceLength / 2), 
          theirs: Math.round(compAvgSentenceLength / 2) 
        }
      },
      similarities: [
        yourDialogueRatio > 0 && compDialogueRatio > 0 ? 'Both use dialogue' : 'Both use narrative description',
        'Similar genre elements present'
      ],
      differences: [
        `Your average sentence length: ${yourAvgSentenceLength.toFixed(1)} vs ${compAvgSentenceLength.toFixed(1)}`,
        `Dialogue ratio: ${yourDialogueRatio.toFixed(1)}% vs ${compDialogueRatio.toFixed(1)}%`
      ],
      suggestions: [
        yourAvgSentenceLength > compAvgSentenceLength ? 'Consider shorter sentences for pace' : 'Sentence length works well',
        yourDialogueRatio < compDialogueRatio ? 'Consider adding more dialogue' : 'Dialogue ratio is appropriate'
      ]
    };
  };

  const generateMockCompOpening = (compTitle: string): string => {
    // Mock openings for common comp titles - in production this would come from a database
    const mockOpenings = {
      'Gone Girl': 'When I think of my wife, I always think of her head. The shape of it, to begin with. The very first time I saw her, it was the back of the head I saw, and there was something lovely about it.',
      'The Girl with the Dragon Tattoo': 'It happened every year, was almost a ritual. And this was his eighty-second birthday. When, as usual, the flower was delivered, he took off the wrapping paper and then picked up the telephone to call Detective Superintendent Morell.',
      'Big Little Lies': 'The beautiful Celeste White Apparently had it all: the devoted husband, the successful career, the stunning house overlooking the ocean. But Celeste knew, as women often do, that beneath the perfect surface, everything was about to fall apart.',
      'The Seven Husbands of Evelyn Hugo': 'Evelyn Hugo was reclusive for the last fifteen years of her life. So it came as a shock when she called me at my cramped desk at Vivant magazine and asked me to come see her.',
      'Where the Crawdads Sing': 'The morning burned so August-hot, the marsh's moist breath hung the oaks and pines with fog. The palmetto patches stood unusually quiet except for the low, slow flap of the heron's wings lifting from the lagoon.'
    };
    
    return mockOpenings[compTitle] || 'The story began on a day like any other, but everything was about to change forever.';
  };

  const addNewComp = async () => {
    if (!newCompTitle.trim()) {
      Alert.alert('Error', 'Please enter a comp title');
      return;
    }

    setIsAnalyzing(true);
    try {
      const newComp: CompAnalysis = {
        id: uuidv4(),
        manuscriptId: manuscript.id,
        compTitle: newCompTitle.trim(),
        openingSimilarity: 0,
        pacingSimilarity: 0,
        voiceSimilarity: 0,
        structureSimilarity: 0,
        analyzedAt: Date.now()
      };

      // Save to database
      await saveCompAnalysis(newComp);
      
      // Update local state
      const updatedAnalyses = [...compAnalyses, newComp];
      if (onAnalysisUpdate) {
        onAnalysisUpdate(updatedAnalyses);
      }
      
      setSelectedComp(newComp);
      setNewCompTitle('');
      setShowAddComp(false);
      
      Alert.alert('Success', `Added ${newCompTitle} as comp title`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add comp title');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveCompAnalysis = async (comp: CompAnalysis): Promise<void> => {
    const query = `
      INSERT INTO comp_analysis 
      (id, manuscript_id, comp_title, comp_author, opening_similarity, pacing_similarity, 
       voice_similarity, structure_similarity, market_position, key_differences, key_similarities, analyzed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await databaseService.executeQuery(query, [
      comp.id,
      comp.manuscriptId,
      comp.compTitle,
      comp.compAuthor,
      comp.openingSimilarity,
      comp.pacingSimilarity,
      comp.voiceSimilarity,
      comp.structureSimilarity,
      comp.marketPosition,
      comp.keyDifferences,
      comp.keySimilarities,
      comp.analyzedAt
    ]);
  };

  const renderMetricComparison = (label: string, yours: number, theirs: number, unit = '') => (
    <View style={styles.metricComparison}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricBars}>
        <View style={styles.metricRow}>
          <Text style={styles.metricSource}>Yours</Text>
          <View style={styles.metricBarContainer}>
            <View style={[styles.metricBar, { width: `${yours}%`, backgroundColor: '#2563eb' }]} />
          </View>
          <Text style={styles.metricValue}>{yours}{unit}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricSource}>{selectedComp?.compTitle}</Text>
          <View style={styles.metricBarContainer}>
            <View style={[styles.metricBar, { width: `${theirs}%`, backgroundColor: '#059669' }]} />
          </View>
          <Text style={styles.metricValue}>{theirs}{unit}</Text>
        </View>
      </View>
    </View>
  );

  const renderCompSelector = () => (
    <View style={styles.compSelector}>
      <Text style={styles.sectionTitle}>Compare With</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {compAnalyses.map(comp => (
          <TouchableOpacity
            key={comp.id}
            style={[
              styles.compButton,
              selectedComp?.id === comp.id && styles.selectedCompButton
            ]}
            onPress={() => setSelectedComp(comp)}
          >
            <Text style={[
              styles.compButtonText,
              selectedComp?.id === comp.id && styles.selectedCompButtonText
            ]}>
              {comp.compTitle}
            </Text>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity
          style={styles.addCompButton}
          onPress={() => setShowAddComp(true)}
        >
          <Text style={styles.addCompButtonText}>+ Add Comp</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderTextComparison = () => (
    <View style={styles.textComparison}>
      <View style={styles.textColumn}>
        <Text style={styles.columnTitle}>Your Opening</Text>
        <ScrollView style={styles.textContainer}>
          <Text style={styles.openingText}>{comparisonData?.yourOpening}</Text>
        </ScrollView>
      </View>
      
      <View style={styles.textColumn}>
        <Text style={styles.columnTitle}>{selectedComp?.compTitle}</Text>
        <ScrollView style={styles.textContainer}>
          <Text style={styles.openingText}>{comparisonData?.compOpening}</Text>
        </ScrollView>
      </View>
    </View>
  );

  if (!selectedComp) {
    return (
      <View style={styles.container}>
        {renderCompSelector()}
        {showAddComp && (
          <View style={styles.addCompForm}>
            <TextInput
              style={styles.compTitleInput}
              placeholder="Enter comp title (e.g., Gone Girl)"
              value={newCompTitle}
              onChangeText={setNewCompTitle}
              placeholderTextColor="#9ca3af"
            />
            <View style={styles.addCompActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddComp(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={addNewComp}
                disabled={isAnalyzing}
              >
                <Text style={styles.addButtonText}>
                  {isAnalyzing ? 'Adding...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Comp Titles Selected</Text>
          <Text style={styles.emptyText}>
            Add comp titles to compare your opening with successful books in your genre
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {renderCompSelector()}
      
      {showAddComp && (
        <View style={styles.addCompForm}>
          <TextInput
            style={styles.compTitleInput}
            placeholder="Enter comp title (e.g., Gone Girl)"
            value={newCompTitle}
            onChangeText={setNewCompTitle}
            placeholderTextColor="#9ca3af"
          />
          <View style={styles.addCompActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddComp(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={addNewComp}
              disabled={isAnalyzing}
            >
              <Text style={styles.addButtonText}>
                {isAnalyzing ? 'Adding...' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isAnalyzing ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Analyzing comparison...</Text>
        </View>
      ) : comparisonData ? (
        <>
          {/* Metrics Comparison */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metrics Comparison</Text>
            {renderMetricComparison(
              'Hook Strength', 
              comparisonData.metrics.hookStrength.yours, 
              comparisonData.metrics.hookStrength.theirs,
              '/100'
            )}
            {renderMetricComparison(
              'Voice Strength', 
              comparisonData.metrics.voiceStrength.yours, 
              comparisonData.metrics.voiceStrength.theirs,
              '/100'
            )}
            {renderMetricComparison(
              'Pace (Beats/min)', 
              comparisonData.metrics.paceBeats.yours, 
              comparisonData.metrics.paceBeats.theirs,
              ' bpm'
            )}
          </View>

          {/* Side by Side Text Comparison */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Opening Comparison</Text>
            {renderTextComparison()}
          </View>

          {/* Similarities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Similarities</Text>
            {comparisonData.similarities.map((similarity, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listItemIcon}>✓</Text>
                <Text style={styles.listItemText}>{similarity}</Text>
              </View>
            ))}
          </View>

          {/* Differences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Differences</Text>
            {comparisonData.differences.map((difference, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listItemIcon}>△</Text>
                <Text style={styles.listItemText}>{difference}</Text>
              </View>
            ))}
          </View>

          {/* Suggestions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alignment Suggestions</Text>
            {comparisonData.suggestions.map((suggestion, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listItemIcon}>💡</Text>
                <Text style={styles.listItemText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  compSelector: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  compButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCompButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  compButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedCompButtonText: {
    color: '#2563eb',
  },
  addCompButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
  },
  addCompButtonText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  addCompForm: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  compTitleInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 12,
  },
  addCompActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
  },
  metricComparison: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  metricBars: {
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metricSource: {
    fontSize: 12,
    color: '#6b7280',
    width: 80,
  },
  metricBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  metricBar: {
    height: '100%',
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '500',
    width: 50,
    textAlign: 'right',
  },
  textComparison: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  textColumn: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  textContainer: {
    maxHeight: 200,
  },
  openingText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  listItemIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
});

export default CompAnalysisComparison;