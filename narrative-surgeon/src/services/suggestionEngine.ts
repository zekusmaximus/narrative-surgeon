import { Suggestion, Scene, RevisionMode, SceneAnalysis, Pattern, EditPattern, CompAnalysis, BetaReaderPersona } from '../types';
import { ChunkedLLMProvider } from './llmProvider';
import { patternDetector } from './patternDetector';
import { databaseService } from './database';
import { analysisService } from './analysisService';
import { v4 as uuidv4 } from 'uuid';

interface SceneContext {
  previousScenes: Scene[];
  nextScenes: Scene[];
  sceneAnalysis?: SceneAnalysis;
  characterArcs: any[];
  plotThreads: any[];
  compAnalysis?: CompAnalysis[];
  betaReaderReactions?: BetaReaderPersona[];
}

export class SuggestionEngine {
  private readonly contextWindow = 3; // scenes before/after
  private llmProvider: ChunkedLLMProvider;

  constructor(llmProvider?: ChunkedLLMProvider) {
    this.llmProvider = llmProvider || new ChunkedLLMProvider();
  }

  async generateSuggestions(scene: Scene, mode: RevisionMode): Promise<Suggestion[]> {
    console.log(`Generating suggestions for scene ${scene.id} in ${mode.name} mode`);

    const context = await this.gatherContext(scene);
    const patterns = await patternDetector.detectAllPatterns(scene.rawText);

    const suggestions = await Promise.all([
      this.getLLMSuggestions(scene, context, mode),
      this.getRuleSuggestions(scene, patterns, mode),
      this.getComparisonSuggestions(scene, context.compAnalysis, mode),
      this.getBetaReaderSuggestions(scene, context.betaReaderReactions, mode)
    ]);

    const allSuggestions = suggestions.flat();
    return this.rankAndFilter(allSuggestions, mode);
  }

  private async gatherContext(scene: Scene): Promise<SceneContext> {
    try {
      const [previousScenes, nextScenes, sceneAnalysis, compAnalysis, betaReaderReactions] = await Promise.all([
        this.getPreviousScenes(scene, this.contextWindow),
        this.getNextScenes(scene, this.contextWindow),
        analysisService.getSceneAnalysis(scene.id),
        this.getCompAnalysis(scene.manuscriptId),
        this.getBetaReaderPersonas(scene.manuscriptId)
      ]);

      return {
        previousScenes,
        nextScenes,
        sceneAnalysis,
        characterArcs: [], // TODO: Implement character arc analysis
        plotThreads: [], // TODO: Implement plot thread analysis
        compAnalysis,
        betaReaderReactions
      };
    } catch (error) {
      console.error('Error gathering context:', error);
      return {
        previousScenes: [],
        nextScenes: [],
        characterArcs: [],
        plotThreads: []
      };
    }
  }

  private async getPreviousScenes(scene: Scene, count: number): Promise<Scene[]> {
    const query = `
      SELECT * FROM scenes 
      WHERE manuscript_id = ? AND index_in_manuscript < ? 
      ORDER BY index_in_manuscript DESC 
      LIMIT ?
    `;

    const rows = await databaseService.getAll(query, [scene.manuscriptId, scene.indexInManuscript, count]);
    return this.mapRowsToScenes(rows).reverse();
  }

  private async getNextScenes(scene: Scene, count: number): Promise<Scene[]> {
    const query = `
      SELECT * FROM scenes 
      WHERE manuscript_id = ? AND index_in_manuscript > ? 
      ORDER BY index_in_manuscript ASC 
      LIMIT ?
    `;

    const rows = await databaseService.getAll(query, [scene.manuscriptId, scene.indexInManuscript, count]);
    return this.mapRowsToScenes(rows);
  }

  private async getCompAnalysis(manuscriptId: string): Promise<CompAnalysis[]> {
    const query = `
      SELECT * FROM comp_analysis 
      WHERE manuscript_id = ? 
      ORDER BY analyzed_at DESC
    `;

    const rows = await databaseService.getAll(query, [manuscriptId]);
    return rows.map(row => this.mapRowToCompAnalysis(row));
  }

  private async getBetaReaderPersonas(manuscriptId: string): Promise<BetaReaderPersona[]> {
    const query = `
      SELECT * FROM beta_reader_personas 
      WHERE manuscript_id = ?
    `;

    const rows = await databaseService.getAll(query, [manuscriptId]);
    return rows.map(row => this.mapRowToBetaReaderPersona(row));
  }

  private async getLLMSuggestions(scene: Scene, context: SceneContext, mode: RevisionMode): Promise<Suggestion[]> {
    const prompt = this.buildLLMPrompt(scene, context, mode);

    try {
      const response = await this.llmProvider.callLLM('revision-suggestions', prompt);
      
      if (response.suggestions && Array.isArray(response.suggestions)) {
        return response.suggestions.map((suggestion: any) => ({
          id: uuidv4(),
          type: suggestion.type || 'style',
          severity: suggestion.severity || 'info',
          startPosition: suggestion.startPosition || 0,
          endPosition: suggestion.endPosition || scene.rawText.length,
          originalText: suggestion.originalText || '',
          suggestedText: suggestion.suggestedText || '',
          rationale: suggestion.rationale || 'LLM suggestion',
          impactScore: suggestion.impactScore || 50
        }));
      }
    } catch (error) {
      console.error('Error getting LLM suggestions:', error);
    }

    return [];
  }

  private buildLLMPrompt(scene: Scene, context: SceneContext, mode: RevisionMode): string {
    let prompt = `${mode.aiPromptBias}

You are analyzing this scene for revision suggestions:

Scene content:
${scene.rawText}

Context:`;

    if (context.previousScenes.length > 0) {
      prompt += `\nPrevious scene: ${context.previousScenes[context.previousScenes.length - 1].rawText.substring(0, 200)}...`;
    }

    if (context.nextScenes.length > 0) {
      prompt += `\nNext scene: ${context.nextScenes[0].rawText.substring(0, 200)}...`;
    }

    if (context.sceneAnalysis) {
      prompt += `\nCurrent analysis: Tension ${context.sceneAnalysis.tensionLevel}/100, Pacing ${context.sceneAnalysis.pacingScore}/100`;
      prompt += `\nEmotions: ${context.sceneAnalysis.primaryEmotion}${context.sceneAnalysis.secondaryEmotion ? ', ' + context.sceneAnalysis.secondaryEmotion : ''}`;
    }

    if (context.betaReaderReactions && context.betaReaderReactions.length > 0) {
      const criticism = context.betaReaderReactions[0].primaryCriticism;
      if (criticism) {
        prompt += `\nBeta reader concern: ${criticism}`;
      }
    }

    prompt += `\n\nFocus areas for this revision mode: ${mode.checksEnabled.join(', ')}

Provide specific suggestions in JSON format:
{
  "suggestions": [
    {
      "type": "structure|style|voice|pacing|grammar",
      "severity": "info|warning|error|success", 
      "startPosition": number,
      "endPosition": number,
      "originalText": "text to replace",
      "suggestedText": "replacement text",
      "rationale": "why this change helps",
      "impactScore": 0-100
    }
  ]
}

Limit to 5 most impactful suggestions.`;

    return prompt;
  }

  private getRuleSuggestions(scene: Scene, patterns: Pattern[], mode: RevisionMode): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    patterns.forEach(pattern => {
      // Only include patterns relevant to the current revision mode
      if (this.isPatternRelevantToMode(pattern, mode)) {
        suggestions.push({
          id: uuidv4(),
          type: this.mapPatternTypeToSuggestionType(pattern.type),
          severity: this.mapSeverityToLevel(pattern.severity),
          startPosition: pattern.position,
          endPosition: pattern.position + pattern.text.length,
          originalText: pattern.text,
          suggestedText: pattern.autoFix?.replacement || '',
          rationale: pattern.autoFix?.suggestion || `Consider revising "${pattern.text}"`,
          impactScore: Math.min(pattern.severity, 80) // Cap rule-based scores
        });
      }
    });

    return Promise.resolve(suggestions);
  }

  private async getComparisonSuggestions(scene: Scene, compAnalyses: CompAnalysis[] = [], mode: RevisionMode): Promise<Suggestion[]> {
    if (compAnalyses.length === 0 || mode.name !== 'Comp Title Alignment') {
      return [];
    }

    const suggestions: Suggestion[] = [];
    
    // Generate suggestions based on comp title analysis
    for (const comp of compAnalyses.slice(0, 2)) { // Top 2 comp titles
      if (comp.voiceSimilarity && comp.voiceSimilarity < 60) {
        suggestions.push({
          id: uuidv4(),
          type: 'voice',
          severity: 'warning',
          startPosition: 0,
          endPosition: Math.min(500, scene.rawText.length),
          originalText: scene.rawText.substring(0, 500),
          suggestedText: '',
          rationale: `Voice doesn't match ${comp.compTitle}. Consider: ${comp.keyDifferences}`,
          impactScore: 75
        });
      }

      if (comp.pacingSimilarity && comp.pacingSimilarity < 50) {
        suggestions.push({
          id: uuidv4(),
          type: 'pacing',
          severity: 'warning',
          startPosition: 0,
          endPosition: scene.rawText.length,
          originalText: scene.rawText,
          suggestedText: '',
          rationale: `Pacing differs from ${comp.compTitle}. Consider matching their rhythm.`,
          impactScore: 70
        });
      }
    }

    return suggestions;
  }

  private getBetaReaderSuggestions(scene: Scene, betaReaders: BetaReaderPersona[] = [], mode: RevisionMode): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    betaReaders.forEach(reader => {
      const reaction = reader.likelyReactions?.[scene.id];
      if (!reaction) return;

      // Extract emotion and notes from reaction string
      const [emotion, notes] = reaction.split(': ');
      
      if (['bored', 'frustrated', 'confused'].includes(emotion)) {
        suggestions.push({
          id: uuidv4(),
          type: 'structure',
          severity: 'warning',
          startPosition: 0,
          endPosition: scene.rawText.length,
          originalText: scene.rawText,
          suggestedText: '',
          rationale: `${reader.personaType} reader: ${notes}`,
          impactScore: this.getReaderImpactScore(reader.personaType!)
        });
      }
    });

    return Promise.resolve(suggestions);
  }

  private getReaderImpactScore(personaType: string): number {
    const scores = {
      'agent': 90,
      'editor': 85,
      'genre_fan': 70,
      'casual_reader': 60,
      'literary_critic': 75
    };
    return scores[personaType] || 50;
  }

  private rankAndFilter(suggestions: Suggestion[], mode: RevisionMode): Suggestion[] {
    // Score each suggestion based on multiple factors
    const scoredSuggestions = suggestions.map(suggestion => ({
      ...suggestion,
      totalScore: this.calculateTotalScore(suggestion, mode)
    }));

    // Sort by total score (highest first)
    const ranked = scoredSuggestions.sort((a, b) => b.totalScore - a.totalScore);

    // Filter and deduplicate
    const filtered = this.deduplicateSuggestions(ranked);
    
    // Return top 10 suggestions
    return filtered.slice(0, 10);
  }

  private calculateTotalScore(suggestion: Suggestion, mode: RevisionMode): number {
    let score = suggestion.impactScore;

    // Boost score if suggestion type matches mode focus
    if (mode.checksEnabled.includes(suggestion.type)) {
      score *= 1.3;
    }

    // Severity multipliers
    const severityMultipliers = {
      'error': 1.4,
      'warning': 1.2,
      'info': 1.0,
      'success': 0.8
    };
    score *= severityMultipliers[suggestion.severity];

    // Prefer suggestions with specific replacement text
    if (suggestion.suggestedText && suggestion.suggestedText.trim()) {
      score *= 1.2;
    }

    // Prefer suggestions affecting smaller text ranges (more precise)
    const textLength = suggestion.endPosition - suggestion.startPosition;
    if (textLength < 100) {
      score *= 1.1;
    } else if (textLength > 1000) {
      score *= 0.9;
    }

    return Math.round(score);
  }

  private deduplicateSuggestions(suggestions: Suggestion[]): Suggestion[] {
    const seen = new Set<string>();
    const deduplicated: Suggestion[] = [];

    for (const suggestion of suggestions) {
      // Create a key based on position and type
      const key = `${suggestion.type}:${suggestion.startPosition}:${suggestion.endPosition}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(suggestion);
      }
    }

    return deduplicated;
  }

  private isPatternRelevantToMode(pattern: Pattern, mode: RevisionMode): boolean {
    const relevanceMap = {
      'filter_words': ['style', 'voice_clarity', 'line_editing'],
      'passive_voice': ['style', 'voice', 'line_editing'], 
      'telling_phrases': ['voice', 'style', 'show_vs_tell'],
      'weak_verbs': ['style', 'voice', 'line_editing'],
      'repetition': ['style', 'voice', 'word_choice'],
      'sentence_variety': ['pacing', 'rhythm', 'style'],
      'dialogue_issues': ['voice_consistency', 'character', 'dialogue']
    };

    const relevantChecks = relevanceMap[pattern.type] || [];
    return relevantChecks.some(check => mode.checksEnabled.includes(check));
  }

  private mapPatternTypeToSuggestionType(patternType: string): Suggestion['type'] {
    const mapping = {
      'filter_words': 'style',
      'passive_voice': 'style',
      'telling_phrases': 'voice',
      'weak_verbs': 'style',
      'repetition': 'style',
      'sentence_variety': 'structure',
      'dialogue_issues': 'voice',
      'grammar': 'grammar',
      'spelling': 'grammar'
    };

    return (mapping[patternType] as Suggestion['type']) || 'style';
  }

  private mapSeverityToLevel(severity: number): Suggestion['severity'] {
    if (severity >= 80) return 'error';
    if (severity >= 60) return 'warning';
    if (severity >= 40) return 'info';
    return 'success';
  }

  // Helper methods for database mapping
  private mapRowsToScenes(rows: any[]): Scene[] {
    return rows.map(row => ({
      id: row.id,
      manuscriptId: row.manuscript_id,
      chapterNumber: row.chapter_number,
      sceneNumberInChapter: row.scene_number_in_chapter,
      indexInManuscript: row.index_in_manuscript,
      title: row.title,
      rawText: row.raw_text,
      wordCount: row.word_count,
      isOpening: row.is_opening,
      isChapterEnd: row.is_chapter_end,
      opensWithHook: row.opens_with_hook,
      endsWithHook: row.ends_with_hook,
      povCharacter: row.pov_character,
      location: row.location,
      timeMarker: row.time_marker,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  private mapRowToCompAnalysis(row: any): CompAnalysis {
    return {
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
    };
  }

  private mapRowToBetaReaderPersona(row: any): BetaReaderPersona {
    return {
      id: row.id,
      manuscriptId: row.manuscript_id,
      personaType: row.persona_type,
      expectations: JSON.parse(row.expectations || '{}'),
      likelyReactions: JSON.parse(row.likely_reactions || '{}'),
      engagementCurve: JSON.parse(row.engagement_curve || '[]'),
      wouldContinueReading: row.would_continue_reading,
      wouldRecommend: row.would_recommend,
      primaryCriticism: row.primary_criticism,
      primaryPraise: row.primary_praise
    };
  }
}

export const suggestionEngine = new SuggestionEngine();