import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { useManuscriptStore } from '../store/manuscriptStore';
import { genreProfiles, audienceProfiles, GenreAnalyzer } from '../services/genreProfiles';

const SettingsScreen: React.FC = () => {
  const { 
    activeManuscript, 
    scenes,
    manuscripts,
    updateManuscript 
  } = useManuscriptStore();

  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);

  const currentScenes = activeManuscript ? scenes.get(activeManuscript.id) || [] : [];
  const genreAnalyzer = new GenreAnalyzer();

  const handleGenreChange = async (genre: string) => {
    if (!activeManuscript) return;

    try {
      await updateManuscript(activeManuscript.id, { genre: genre as any });
      Alert.alert('Success', `Genre updated to ${genreProfiles[genre]?.name || genre}`);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update genre');
    }
  };

  const handleAudienceChange = async (audience: string) => {
    if (!activeManuscript) return;

    try {
      await updateManuscript(activeManuscript.id, { targetAudience: audience as any });
      Alert.alert('Success', `Target audience updated to ${audienceProfiles[audience as keyof typeof audienceProfiles]?.name || audience}`);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update audience');
    }
  };

  const getManuscriptAnalysis = () => {
    if (!activeManuscript || currentScenes.length === 0) return null;

    const profile = genreAnalyzer.getProfile(activeManuscript.genre || 'other');
    const openingAlignment = genreAnalyzer.analyzeOpeningAlignment(currentScenes, activeManuscript.genre || 'other');
    const pacingAnalysis = genreAnalyzer.analyzePacing(currentScenes, activeManuscript.genre || 'other');
    const recommendations = genreAnalyzer.getRecommendations({
      manuscript: activeManuscript,
      scenes: currentScenes,
    });

    return {
      profile,
      openingAlignment,
      pacingAnalysis,
      recommendations,
    };
  };

  const analysis = getManuscriptAnalysis();

  const formatWordCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k words`;
    }
    return `${count} words`;
  };

  if (!activeManuscript) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No Active Manuscript</Text>
        <Text style={styles.emptyText}>
          Select a manuscript to view settings and analysis.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manuscript Settings</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Title</Text>
          <Text style={styles.settingValue}>{activeManuscript.title}</Text>
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Word Count</Text>
          <Text style={styles.settingValue}>
            {formatWordCount(activeManuscript.totalWordCount)}
          </Text>
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Scenes</Text>
          <Text style={styles.settingValue}>{currentScenes.length}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Genre</Text>
        <Text style={styles.sectionDescription}>
          Choose your manuscript's genre for targeted analysis and recommendations.
        </Text>
        
        <View style={styles.optionsGrid}>
          {Object.entries(genreProfiles).map(([key, profile]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.optionButton,
                activeManuscript.genre === key && styles.selectedOption,
              ]}
              onPress={() => handleGenreChange(key)}
            >
              <Text style={[
                styles.optionText,
                activeManuscript.genre === key && styles.selectedOptionText,
              ]}>
                {profile.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Target Audience</Text>
        <Text style={styles.sectionDescription}>
          Select the intended audience for your manuscript.
        </Text>
        
        <View style={styles.optionsGrid}>
          {Object.entries(audienceProfiles).map(([key, profile]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.optionButton,
                activeManuscript.targetAudience === key && styles.selectedOption,
              ]}
              onPress={() => handleAudienceChange(key)}
            >
              <Text style={[
                styles.optionText,
                activeManuscript.targetAudience === key && styles.selectedOptionText,
              ]}>
                {profile.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {analysis && (
        <View style={styles.section}>
          <View style={styles.analysisHeader}>
            <Text style={styles.sectionTitle}>Manuscript Analysis</Text>
            <Switch
              value={showAdvancedAnalysis}
              onValueChange={setShowAdvancedAnalysis}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={showAdvancedAnalysis ? '#2563eb' : '#f3f4f6'}
            />
          </View>
          
          <View style={styles.analysisCard}>
            <View style={styles.analysisItem}>
              <Text style={styles.analysisLabel}>Opening Strength</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${analysis.openingAlignment}%` },
                    analysis.openingAlignment >= 70 ? styles.goodProgress :
                    analysis.openingAlignment >= 40 ? styles.warningProgress : styles.poorProgress
                  ]}
                />
              </View>
              <Text style={styles.analysisValue}>{analysis.openingAlignment}%</Text>
            </View>
            
            <View style={styles.analysisItem}>
              <Text style={styles.analysisLabel}>Pacing Quality</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${analysis.pacingAnalysis.score}%` },
                    analysis.pacingAnalysis.score >= 70 ? styles.goodProgress :
                    analysis.pacingAnalysis.score >= 40 ? styles.warningProgress : styles.poorProgress
                  ]}
                />
              </View>
              <Text style={styles.analysisValue}>{analysis.pacingAnalysis.score}%</Text>
            </View>
          </View>

          {showAdvancedAnalysis && (
            <View style={styles.detailedAnalysis}>
              <Text style={styles.analysisSubtitle}>Genre Profile</Text>
              <Text style={styles.profileText}>
                {analysis.profile.name} typically features: {analysis.profile.typicalOpeningElements.join(', ')}
              </Text>
              <Text style={styles.profileText}>
                Expected pace: {analysis.profile.expectedPaceBeats} beats per 1000 words
              </Text>
              <Text style={styles.profileText}>
                Average scene length: {analysis.profile.averageSceneLength} words
              </Text>

              {analysis.pacingAnalysis.issues.length > 0 && (
                <>
                  <Text style={styles.analysisSubtitle}>Pacing Issues</Text>
                  {analysis.pacingAnalysis.issues.map((issue, index) => (
                    <Text key={index} style={styles.issueText}>• {issue}</Text>
                  ))}
                </>
              )}
            </View>
          )}
        </View>
      )}

      {analysis && analysis.recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {analysis.recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationCard}>
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Manuscripts</Text>
        <Text style={styles.sectionDescription}>
          {manuscripts.length} manuscript{manuscripts.length !== 1 ? 's' : ''} in your library
        </Text>
        
        {manuscripts.map((manuscript) => (
          <View key={manuscript.id} style={styles.manuscriptSummary}>
            <Text style={styles.manuscriptTitle}>{manuscript.title}</Text>
            <Text style={styles.manuscriptMeta}>
              {manuscript.genre && genreProfiles[manuscript.genre] && genreProfiles[manuscript.genre].name} • {formatWordCount(manuscript.totalWordCount)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          Narrative Surgeon v1.0.0 - Phase 1
        </Text>
        <Text style={styles.aboutText}>
          Privacy-first manuscript revision tool focused on scene management and structural analysis.
        </Text>
        <Text style={styles.aboutText}>
          All data is stored locally on your device.
        </Text>
      </View>
    </ScrollView>
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
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
  },
  settingValue: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  optionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectedOptionText: {
    color: 'white',
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  analysisCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  analysisItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  analysisLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  progressBar: {
    flex: 2,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goodProgress: {
    backgroundColor: '#10b981',
  },
  warningProgress: {
    backgroundColor: '#f59e0b',
  },
  poorProgress: {
    backgroundColor: '#ef4444',
  },
  analysisValue: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
  },
  detailedAnalysis: {
    marginTop: 16,
  },
  analysisSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  profileText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    lineHeight: 20,
  },
  issueText: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 4,
    lineHeight: 20,
  },
  recommendationCard: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  manuscriptSummary: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  manuscriptTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  manuscriptMeta: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  aboutText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default SettingsScreen;