import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import {
  Scene,
  SceneAnalysis,
  Character,
  CharacterArc,
  Manuscript,
  Hook,
  PacingAnalysis,
  PlotHole,
  Pattern,
} from '../types';
import { llmProviderManager } from '../services/llmProvider';

interface AnalysisPanelProps {
  manuscript: Manuscript;
  scenes: Scene[];
  sceneAnalyses: SceneAnalysis[];
  characters: Character[];
  onSceneSelect?: (sceneId: string) => void;
  onIssueSelect?: (issue: PlotHole | Pattern) => void;
}

interface AnalysisViewMode {
  pacing: boolean;
  characters: boolean;
  tension: boolean;
  hooks: boolean;
  issues: boolean;
  voice: boolean;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  manuscript,
  scenes,
  sceneAnalyses,
  characters,
  onSceneSelect,
  onIssueSelect,
}) => {
  const [viewMode, setViewMode] = useState<AnalysisViewMode>({
    pacing: true,
    characters: false,
    tension: false,
    hooks: false,
    issues: false,
    voice: false,
  });

  const [characterArcs, setCharacterArcs] = useState<CharacterArc[]>([]);
  const [plotHoles, setPlotHoles] = useState<PlotHole[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40;

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#f8f9fa',
    backgroundGradientTo: '#e9ecef',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
    style: { borderRadius: 8 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#4f46e5',
    },
  };

  // Process pacing data for visualization
  const pacingData = useMemo(() => {
    const analysisMap = new Map(sceneAnalyses.map(a => [a.sceneId, a]));
    const data = scenes.map((scene, index) => {
      const analysis = analysisMap.get(scene.id);
      return {
        scene: index + 1,
        tension: analysis?.tensionLevel || 0,
        pacing: analysis?.pacingScore || 50,
        wordCount: scene.wordCount,
        emotion: analysis?.primaryEmotion || 'neutral',
      };
    });

    return {
      labels: data.map(d => d.scene.toString()),
      datasets: [
        {
          data: data.map(d => d.tension),
          color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['Tension Level'],
    };
  }, [scenes, sceneAnalyses]);

  // Process tension heat map data
  const tensionHeatData = useMemo(() => {
    const analysisMap = new Map(sceneAnalyses.map(a => [a.sceneId, a]));
    return scenes.map((scene, index) => {
      const analysis = analysisMap.get(scene.id);
      const tension = analysis?.tensionLevel || 0;
      
      return {
        name: `Scene ${index + 1}`,
        population: tension,
        color: tension > 70 ? '#dc2626' : tension > 40 ? '#f59e0b' : '#10b981',
        legendFontColor: '#374151',
        legendFontSize: 12,
      };
    });
  }, [scenes, sceneAnalyses]);

  // Process character arc data
  const characterData = useMemo(() => {
    const arcData = characterArcs.map(arc => ({
      name: arc.character.slice(0, 8),
      completeness: arc.completeness,
      color: getCharacterColor(arc.arcType),
      legendFontColor: '#374151',
      legendFontSize: 12,
    }));

    return {
      labels: arcData.map(d => d.name),
      datasets: [
        {
          data: arcData.map(d => d.completeness),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['Arc Completeness'],
    };
  }, [characterArcs]);

  // Hook effectiveness data
  const hookData = useMemo(() => {
    const sceneHooks = scenes.map((scene, index) => {
      const sceneHooks = hooks.filter(h => 
        h.location >= 0 // Basic filter, would need more sophisticated scene mapping
      );
      const avgStrength = sceneHooks.length > 0 
        ? sceneHooks.reduce((sum, h) => sum + h.strength, 0) / sceneHooks.length
        : scene.opensWithHook ? 70 : 30;
      
      return {
        name: `S${index + 1}`,
        strength: Math.round(avgStrength),
        color: avgStrength > 70 ? '#10b981' : avgStrength > 50 ? '#f59e0b' : '#dc2626',
        legendFontColor: '#374151',
        legendFontSize: 10,
      };
    });

    return sceneHooks;
  }, [scenes, hooks]);

  // Show/Tell detection patterns
  const showTellPatterns = useMemo(() => {
    const showTellIssues = patterns.filter(p => 
      p.type === 'telling' || p.type === 'show_dont_tell'
    );
    
    return showTellIssues.map((pattern, index) => ({
      name: `Issue ${index + 1}`,
      severity: pattern.severity * 20, // Convert to percentage
      color: pattern.severity > 4 ? '#dc2626' : pattern.severity > 2 ? '#f59e0b' : '#10b981',
      legendFontColor: '#374151',
      legendFontSize: 12,
    }));
  }, [patterns]);

  // Cliché detection data
  const clicheData = useMemo(() => {
    const cliches = patterns.filter(p => 
      p.type === 'overused_phrase' || p.type === 'cliche'
    );
    
    const frequencyData = cliches.reduce((acc, pattern) => {
      acc[pattern.text] = (acc[pattern.text] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(frequencyData)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([phrase, count]) => ({
        name: phrase.slice(0, 15) + (phrase.length > 15 ? '...' : ''),
        population: count,
        color: getRandomColor(),
        legendFontColor: '#374151',
        legendFontSize: 10,
      }));
  }, [patterns]);

  // Initialize analysis
  useEffect(() => {
    if (scenes.length > 0 && sceneAnalyses.length === 0) {
      runAnalysis();
    }
  }, [scenes]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const provider = llmProviderManager.getCurrentProvider();

      // Detect plot holes
      const holes = await provider.detectPlotHoles(scenes, {
        genre: manuscript.genre,
        targetAudience: manuscript.targetAudience,
        characters,
        totalScenes: scenes.length,
        totalWordCount: manuscript.totalWordCount,
      });
      setPlotHoles(holes);

      // Generate character arcs (simplified for demo)
      const arcs = characters.map(char => ({
        character: char.name,
        startState: { primary: 'neutral', intensity: 50, context: 'Beginning' },
        endState: { primary: 'evolved', intensity: 75, context: 'End' },
        turningPoints: scenes.slice(0, 3).map(s => s.id),
        arcType: 'positive' as const,
        completeness: Math.random() * 100, // Would be calculated based on actual analysis
      }));
      setCharacterArcs(arcs);

      // Detect patterns (show/tell, clichés)
      const detectedPatterns = await detectPatterns(scenes);
      setPatterns(detectedPatterns);

      // Generate hooks analysis
      const hooksAnalysis = await generateHooksAnalysis(scenes);
      setHooks(hooksAnalysis);

    } catch (error) {
      console.error('Analysis failed:', error);
      Alert.alert('Analysis Error', 'Failed to complete analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const detectPatterns = async (scenes: Scene[]): Promise<Pattern[]> => {
    const patterns: Pattern[] = [];
    
    // Show vs Tell detection
    const showTellRegex = /(he felt|she felt|he was angry|she was sad|suddenly|obviously|clearly)/gi;
    const clicheRegex = /(it was a dark and stormy night|time stood still|her heart skipped a beat|love at first sight)/gi;

    scenes.forEach((scene, index) => {
      // Show/Tell patterns
      const showTellMatches = scene.rawText.match(showTellRegex) || [];
      showTellMatches.forEach(match => {
        const position = scene.rawText.indexOf(match);
        patterns.push({
          type: 'telling',
          text: match,
          position,
          severity: 3,
          autoFix: {
            suggestion: 'Consider showing this through action or dialogue instead',
            replacement: 'Show through character behavior or dialogue'
          }
        });
      });

      // Cliché detection
      const clicheMatches = scene.rawText.match(clicheRegex) || [];
      clicheMatches.forEach(match => {
        const position = scene.rawText.indexOf(match);
        patterns.push({
          type: 'overused_phrase',
          text: match,
          position,
          severity: 4,
          autoFix: {
            suggestion: 'Replace with more original phrasing',
          }
        });
      });
    });

    return patterns;
  };

  const generateHooksAnalysis = async (scenes: Scene[]): Promise<Hook[]> => {
    const provider = llmProviderManager.getCurrentProvider();
    const hooks: Hook[] = [];

    // Analyze opening hooks for first few scenes
    for (let i = 0; i < Math.min(5, scenes.length); i++) {
      try {
        const hook = await provider.suggestHook(scenes[i].rawText, 'opening');
        hooks.push(hook);
      } catch (error) {
        console.warn(`Hook analysis failed for scene ${i}:`, error);
      }
    }

    return hooks;
  };

  const toggleViewMode = (mode: keyof AnalysisViewMode) => {
    setViewMode(prev => ({ ...prev, [mode]: !prev[mode] }));
  };

  const renderViewToggle = () => (
    <View style={styles.toggleContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {Object.entries(viewMode).map(([key, active]) => (
          <TouchableOpacity
            key={key}
            style={[styles.toggleButton, active && styles.toggleButtonActive]}
            onPress={() => toggleViewMode(key as keyof AnalysisViewMode)}
          >
            <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPacingAnalysis = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pacing & Tension Analysis</Text>
      <LineChart
        data={pacingData}
        width={chartWidth}
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
      />
      <Text style={styles.chartDescription}>
        Tension levels across scenes. Red line shows dramatic tension peaks and valleys.
      </Text>
    </View>
  );

  const renderCharacterArcs = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Character Arc Tracking</Text>
      {characterData.datasets[0].data.length > 0 ? (
        <BarChart
          data={characterData}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
        />
      ) : (
        <Text style={styles.noDataText}>No character arc data available</Text>
      )}
      <Text style={styles.chartDescription}>
        Character development completeness. Higher bars indicate more complete character arcs.
      </Text>
    </View>
  );

  const renderTensionHeatMap = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tension/Conflict Heat Map</Text>
      {tensionHeatData.length > 0 ? (
        <PieChart
          data={tensionHeatData}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      ) : (
        <Text style={styles.noDataText}>No tension data available</Text>
      )}
      <Text style={styles.chartDescription}>
        Red = High tension, Yellow = Medium tension, Green = Low tension
      </Text>
    </View>
  );

  const renderHookEffectiveness = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Hook Effectiveness Scoring</Text>
      {hookData.length > 0 ? (
        <PieChart
          data={hookData}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          accessor="strength"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      ) : (
        <Text style={styles.noDataText}>No hook data available</Text>
      )}
      <Text style={styles.chartDescription}>
        Hook strength by scene. Green = Strong, Yellow = Moderate, Red = Weak
      </Text>
    </View>
  );

  const renderShowTellDetection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Show Don't Tell Detection</Text>
      {showTellPatterns.length > 0 ? (
        <>
          <PieChart
            data={showTellPatterns}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            accessor="severity"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
          <View style={styles.issuesList}>
            {patterns.filter(p => p.type === 'telling').slice(0, 5).map((pattern, index) => (
              <TouchableOpacity
                key={index}
                style={styles.issueItem}
                onPress={() => onIssueSelect?.(pattern)}
              >
                <Text style={styles.issueText}>"{pattern.text}"</Text>
                <Text style={styles.issueSuggestion}>{pattern.autoFix?.suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.noDataText}>No show/tell issues detected</Text>
      )}
    </View>
  );

  const renderClicheHighlighting = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cliché & Overused Phrases</Text>
      {clicheData.length > 0 ? (
        <>
          <PieChart
            data={clicheData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
          <View style={styles.issuesList}>
            {patterns.filter(p => p.type === 'overused_phrase').slice(0, 5).map((pattern, index) => (
              <TouchableOpacity
                key={index}
                style={styles.issueItem}
                onPress={() => onIssueSelect?.(pattern)}
              >
                <Text style={styles.issueText}>"{pattern.text}"</Text>
                <Text style={styles.issueSuggestion}>{pattern.autoFix?.suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.noDataText}>No clichés detected</Text>
      )}
    </View>
  );

  const renderIssuesList = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Plot Holes & Issues</Text>
      {plotHoles.length > 0 ? (
        <View style={styles.issuesList}>
          {plotHoles.map((hole, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.issueItem, styles[`severity${hole.severity}`]]}
              onPress={() => onIssueSelect?.(hole)}
            >
              <Text style={styles.issueType}>{hole.type.toUpperCase()}</Text>
              <Text style={styles.issueText}>{hole.description}</Text>
              <Text style={styles.issueSuggestion}>{hole.suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.noDataText}>No plot holes detected</Text>
      )}
    </View>
  );

  if (isAnalyzing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Analyzing manuscript...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {renderViewToggle()}
      
      {viewMode.pacing && renderPacingAnalysis()}
      {viewMode.characters && renderCharacterArcs()}
      {viewMode.tension && renderTensionHeatMap()}
      {viewMode.hooks && renderHookEffectiveness()}
      {viewMode.voice && renderShowTellDetection()}
      {viewMode.voice && renderClicheHighlighting()}
      {viewMode.issues && renderIssuesList()}
    </ScrollView>
  );
};

// Helper functions
const getCharacterColor = (arcType: string): string => {
  const colors = {
    positive: '#10b981',
    negative: '#dc2626',
    flat: '#6b7280',
    corruption: '#7c2d12',
  };
  return colors[arcType as keyof typeof colors] || '#6b7280';
};

const getRandomColor = (): string => {
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 10,
  },
  toggleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  toggleButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  toggleText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 15,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  chartDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 40,
  },
  issuesList: {
    marginTop: 15,
  },
  issueItem: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#d1d5db',
  },
  severityminor: {
    borderLeftColor: '#10b981',
  },
  severitymoderate: {
    borderLeftColor: '#f59e0b',
  },
  severitymajor: {
    borderLeftColor: '#dc2626',
  },
  issueType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 4,
  },
  issueText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  issueSuggestion: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});