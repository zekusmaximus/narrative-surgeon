import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './database';
import { llmProvider, LLMProvider } from './llmProvider';
import {
  SceneAnalysis,
  OpeningAnalysis,
  CharacterVoice,
  PacingAnalysis,
  PlotHole,
  Scene,
  Character,
  SceneContext,
  ManuscriptContext,
  VoiceFingerprint,
  ConsistencyReport,
  Hook,
  Edit
} from '../types';

export class AnalysisService {
  private provider: LLMProvider;

  constructor(provider: LLMProvider = llmProvider) {
    this.provider = provider;
  }

  // Scene Analysis
  async analyzeScene(sceneId: string, force: boolean = false): Promise<SceneAnalysis> {
    // Check if analysis already exists and is recent
    if (!force) {
      const existing = await this.getSceneAnalysis(sceneId);
      if (existing && this.isAnalysisRecent(existing.analyzedAt, 24 * 60 * 60 * 1000)) { // 24 hours
        return existing;
      }
    }

    // Get scene data
    const scene = await databaseService.getFirst(
      'SELECT * FROM scenes WHERE id = ?',
      [sceneId]
    );

    if (!scene) {
      throw new Error('Scene not found');
    }

    // Build context
    const context = await this.buildSceneContext(scene);
    
    // Analyze with LLM
    const analysis = await this.provider.analyzeScene(scene.raw_text, context);
    analysis.id = uuidv4();
    analysis.sceneId = sceneId;

    // Save to database
    await this.saveSceneAnalysis(analysis);
    
    return analysis;
  }

  async getSceneAnalysis(sceneId: string): Promise<SceneAnalysis | null> {
    const row = await databaseService.getFirst(
      'SELECT * FROM scene_analysis WHERE scene_id = ?',
      [sceneId]
    );

    if (!row) return null;

    return {
      id: row.id,
      sceneId: row.scene_id,
      summary: row.summary,
      primaryEmotion: row.primary_emotion,
      secondaryEmotion: row.secondary_emotion,
      tensionLevel: row.tension_level,
      pacingScore: row.pacing_score,
      functionTags: row.function_tags ? JSON.parse(row.function_tags) : undefined,
      voiceFingerprint: row.voice_fingerprint ? JSON.parse(row.voice_fingerprint) : undefined,
      conflictPresent: Boolean(row.conflict_present),
      characterIntroduced: Boolean(row.character_introduced),
      analyzedAt: row.analyzed_at
    };
  }

  private async saveSceneAnalysis(analysis: SceneAnalysis): Promise<void> {
    await databaseService.executeQuery(
      `INSERT OR REPLACE INTO scene_analysis (
        id, scene_id, summary, primary_emotion, secondary_emotion, tension_level,
        pacing_score, function_tags, voice_fingerprint, conflict_present,
        character_introduced, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        analysis.id,
        analysis.sceneId,
        analysis.summary,
        analysis.primaryEmotion,
        analysis.secondaryEmotion,
        analysis.tensionLevel,
        analysis.pacingScore,
        analysis.functionTags ? JSON.stringify(analysis.functionTags) : null,
        analysis.voiceFingerprint ? JSON.stringify(analysis.voiceFingerprint) : null,
        analysis.conflictPresent ? 1 : 0,
        analysis.characterIntroduced ? 1 : 0,
        analysis.analyzedAt
      ]
    );
  }

  // Opening Analysis
  async analyzeOpening(manuscriptId: string, force: boolean = false): Promise<OpeningAnalysis> {
    // Check if analysis already exists
    if (!force) {
      const existing = await this.getOpeningAnalysis(manuscriptId);
      if (existing && this.isAnalysisRecent(existing.analyzedAt, 7 * 24 * 60 * 60 * 1000)) { // 7 days
        return existing;
      }
    }

    // Get manuscript data
    const manuscript = await databaseService.getFirst(
      'SELECT * FROM manuscripts WHERE id = ?',
      [manuscriptId]
    );

    if (!manuscript) {
      throw new Error('Manuscript not found');
    }

    // Get opening scenes (first 1250 words)
    const openingScenes = await databaseService.getAll(
      'SELECT * FROM scenes WHERE manuscript_id = ? AND is_opening = 1 ORDER BY index_in_manuscript',
      [manuscriptId]
    );

    if (openingScenes.length === 0) {
      throw new Error('No opening scenes found');
    }

    // Combine opening text
    let openingText = '';
    let wordCount = 0;
    const targetWords = 1250;

    for (const scene of openingScenes) {
      const sceneWords = scene.raw_text.split(/\s+/).length;
      if (wordCount + sceneWords <= targetWords) {
        openingText += scene.raw_text + '\n\n';
        wordCount += sceneWords;
      } else {
        // Include partial scene
        const remainingWords = targetWords - wordCount;
        const words = scene.raw_text.split(/\s+/);
        openingText += words.slice(0, remainingWords).join(' ');
        break;
      }
    }

    // Get comp titles
    const compTitles = manuscript.comp_titles ? JSON.parse(manuscript.comp_titles) : [];

    // Analyze with LLM
    const analysis = await this.provider.analyzeOpening(openingText, manuscript.genre || 'other', compTitles);
    analysis.id = uuidv4();
    analysis.manuscriptId = manuscriptId;

    // Save to database
    await this.saveOpeningAnalysis(analysis);
    
    return analysis;
  }

  async getOpeningAnalysis(manuscriptId: string): Promise<OpeningAnalysis | null> {
    const row = await databaseService.getFirst(
      'SELECT * FROM opening_analysis WHERE manuscript_id = ?',
      [manuscriptId]
    );

    if (!row) return null;

    return {
      id: row.id,
      manuscriptId: row.manuscript_id,
      hookType: row.hook_type,
      hookStrength: row.hook_strength,
      voiceEstablished: Boolean(row.voice_established),
      characterEstablished: Boolean(row.character_established),
      conflictEstablished: Boolean(row.conflict_established),
      genreAppropriate: Boolean(row.genre_appropriate),
      similarToComps: row.similar_to_comps ? JSON.parse(row.similar_to_comps) : undefined,
      agentReadinessScore: row.agent_readiness_score,
      analysisNotes: row.analysis_notes,
      analyzedAt: row.analyzed_at
    };
  }

  private async saveOpeningAnalysis(analysis: OpeningAnalysis): Promise<void> {
    await databaseService.executeQuery(
      `INSERT OR REPLACE INTO opening_analysis (
        id, manuscript_id, hook_type, hook_strength, voice_established,
        character_established, conflict_established, genre_appropriate,
        similar_to_comps, agent_readiness_score, analysis_notes, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        analysis.id,
        analysis.manuscriptId,
        analysis.hookType,
        analysis.hookStrength,
        analysis.voiceEstablished ? 1 : 0,
        analysis.characterEstablished ? 1 : 0,
        analysis.conflictEstablished ? 1 : 0,
        analysis.genreAppropriate ? 1 : 0,
        analysis.similarToComps ? JSON.stringify(analysis.similarToComps) : null,
        analysis.agentReadinessScore,
        analysis.analysisNotes,
        analysis.analyzedAt
      ]
    );
  }

  // Character Voice Analysis
  async analyzeCharacterVoice(characterId: string, sceneId: string): Promise<CharacterVoice> {
    // Get character data
    const character = await databaseService.getFirst(
      'SELECT * FROM characters WHERE id = ?',
      [characterId]
    );

    if (!character) {
      throw new Error('Character not found');
    }

    // Get scene data
    const scene = await databaseService.getFirst(
      'SELECT * FROM scenes WHERE id = ?',
      [sceneId]
    );

    if (!scene) {
      throw new Error('Scene not found');
    }

    // Extract dialogue from scene
    const dialogue = this.extractDialogue(scene.raw_text, character.name);

    if (dialogue.length === 0) {
      throw new Error('No dialogue found for this character in this scene');
    }

    // Get existing voice profile if available
    const existingProfile = character.voice_sample ? this.parseVoiceFingerprint(character.voice_sample) : undefined;

    // Analyze with LLM
    const analysis = await this.provider.analyzeCharacterVoice(dialogue, character.name, existingProfile);
    analysis.id = uuidv4();
    analysis.characterId = characterId;
    analysis.sceneId = sceneId;

    // Save to database
    await this.saveCharacterVoice(analysis);
    
    return analysis;
  }

  async getCharacterVoices(characterId: string): Promise<CharacterVoice[]> {
    const rows = await databaseService.getAll(
      'SELECT * FROM character_voices WHERE character_id = ? ORDER BY scene_id',
      [characterId]
    );

    return rows.map(row => ({
      id: row.id,
      characterId: row.character_id,
      sceneId: row.scene_id,
      dialogueSample: row.dialogue_sample,
      vocabularyLevel: row.vocabulary_level,
      sentencePatterns: row.sentence_patterns ? JSON.parse(row.sentence_patterns) : undefined,
      uniquePhrases: row.unique_phrases ? JSON.parse(row.unique_phrases) : undefined,
      emotionalRegister: row.emotional_register,
      consistencyScore: row.consistency_score
    }));
  }

  private async saveCharacterVoice(voice: CharacterVoice): Promise<void> {
    await databaseService.executeQuery(
      `INSERT OR REPLACE INTO character_voices (
        id, character_id, scene_id, dialogue_sample, vocabulary_level,
        sentence_patterns, unique_phrases, emotional_register, consistency_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        voice.id,
        voice.characterId,
        voice.sceneId,
        voice.dialogueSample,
        voice.vocabularyLevel,
        voice.sentencePatterns ? JSON.stringify(voice.sentencePatterns) : null,
        voice.uniquePhrases ? JSON.stringify(voice.uniquePhrases) : null,
        voice.emotionalRegister,
        voice.consistencyScore
      ]
    );
  }

  // Plot Hole Detection
  async detectPlotHoles(manuscriptId: string): Promise<PlotHole[]> {
    // Get all scenes for the manuscript
    const scenes = await databaseService.getAll(
      'SELECT * FROM scenes WHERE manuscript_id = ? ORDER BY index_in_manuscript',
      [manuscriptId]
    );

    if (scenes.length < 3) {
      return []; // Not enough scenes to analyze for plot holes
    }

    // Get characters
    const characters = await databaseService.getAll(
      'SELECT * FROM characters WHERE manuscript_id = ?',
      [manuscriptId]
    );

    // Get manuscript data
    const manuscript = await databaseService.getFirst(
      'SELECT * FROM manuscripts WHERE id = ?',
      [manuscriptId]
    );

    // Build context
    const context: ManuscriptContext = {
      genre: manuscript.genre,
      targetAudience: manuscript.target_audience,
      characters: characters.map(c => ({
        id: c.id,
        manuscriptId: c.manuscript_id,
        name: c.name,
        role: c.role,
        firstAppearanceSceneId: c.first_appearance_scene_id,
        voiceSample: c.voice_sample,
        createdAt: c.created_at
      })),
      totalScenes: scenes.length,
      totalWordCount: manuscript.total_word_count
    };

    // Convert scene data
    const sceneData: Scene[] = scenes.map(s => ({
      id: s.id,
      manuscriptId: s.manuscript_id,
      chapterNumber: s.chapter_number,
      sceneNumberInChapter: s.scene_number_in_chapter,
      indexInManuscript: s.index_in_manuscript,
      title: s.title,
      rawText: s.raw_text,
      wordCount: s.word_count,
      isOpening: Boolean(s.is_opening),
      isChapterEnd: Boolean(s.is_chapter_end),
      opensWithHook: Boolean(s.opens_with_hook),
      endsWithHook: Boolean(s.ends_with_hook),
      povCharacter: s.pov_character,
      location: s.location,
      timeMarker: s.time_marker,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    // Detect plot holes with LLM
    return await this.provider.detectPlotHoles(sceneData, context);
  }

  // Revision Assistance
  async suggestRevisions(sceneId: string): Promise<{
    weakestElement: {element: string, issue: string, fix: string};
    hookSuggestions: {opening: Hook, ending: Hook};
  }> {
    const scene = await databaseService.getFirst(
      'SELECT * FROM scenes WHERE id = ?',
      [sceneId]
    );

    if (!scene) {
      throw new Error('Scene not found');
    }

    const [weakestElement, openingHook, endingHook] = await Promise.all([
      this.provider.findWeakestElement(scene.raw_text),
      this.provider.suggestHook(scene.raw_text, 'opening'),
      this.provider.suggestHook(scene.raw_text, 'ending')
    ]);

    return {
      weakestElement,
      hookSuggestions: {
        opening: openingHook,
        ending: endingHook
      }
    };
  }

  async checkVoiceConsistency(characterId: string, sceneId: string): Promise<ConsistencyReport> {
    // Get character's established voice profile
    const character = await databaseService.getFirst(
      'SELECT * FROM characters WHERE id = ?',
      [characterId]
    );

    if (!character || !character.voice_sample) {
      throw new Error('Character voice profile not established');
    }

    const scene = await databaseService.getFirst(
      'SELECT * FROM scenes WHERE id = ?',
      [sceneId]
    );

    if (!scene) {
      throw new Error('Scene not found');
    }

    // Extract dialogue
    const dialogue = this.extractDialogue(scene.raw_text, character.name).join('\n');
    const voiceProfile = this.parseVoiceFingerprint(character.voice_sample);

    return await this.provider.checkVoiceConsistency(dialogue, voiceProfile);
  }

  // Helper methods
  private async buildSceneContext(scene: any): Promise<SceneContext> {
    // Get previous scene summary
    const previousScene = await databaseService.getFirst(
      'SELECT sa.summary FROM scenes s LEFT JOIN scene_analysis sa ON s.id = sa.scene_id WHERE s.manuscript_id = ? AND s.index_in_manuscript = ?',
      [scene.manuscript_id, scene.index_in_manuscript - 1]
    );

    // Get next scene opening
    const nextScene = await databaseService.getFirst(
      'SELECT raw_text FROM scenes WHERE manuscript_id = ? AND index_in_manuscript = ?',
      [scene.manuscript_id, scene.index_in_manuscript + 1]
    );

    // Count scenes in chapter
    const chapterScenes = await databaseService.getAll(
      'SELECT COUNT(*) as count FROM scenes WHERE manuscript_id = ? AND chapter_number = ?',
      [scene.manuscript_id, scene.chapter_number || 1]
    );

    // Get manuscript data
    const manuscript = await databaseService.getFirst(
      'SELECT genre FROM manuscripts WHERE id = ?',
      [scene.manuscript_id]
    );

    // Get characters present in scene (simplified detection)
    const characters = await databaseService.getAll(
      'SELECT name FROM characters WHERE manuscript_id = ?',
      [scene.manuscript_id]
    );

    const charactersPresent = characters
      .filter(c => scene.raw_text.includes(c.name))
      .map(c => c.name);

    return {
      previousSummary: previousScene?.summary,
      nextOpening: nextScene?.raw_text,
      positionInChapter: scene.scene_number_in_chapter || 1,
      totalScenesInChapter: chapterScenes[0]?.count || 1,
      chapterNumber: scene.chapter_number,
      manuscriptGenre: manuscript?.genre,
      charactersPresent
    };
  }

  private isAnalysisRecent(analyzedAt: number, maxAge: number): boolean {
    return Date.now() - analyzedAt < maxAge;
  }

  private extractDialogue(text: string, characterName: string): string[] {
    // Simple dialogue extraction - look for quoted text near character name
    const lines = text.split('\n');
    const dialogue: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for quoted dialogue
      const quotes = line.match(/"([^"]*)"/g);
      if (quotes) {
        // Check if character name appears nearby (current line or adjacent lines)
        const context = [
          lines[i - 1] || '',
          line,
          lines[i + 1] || ''
        ].join(' ').toLowerCase();
        
        if (context.includes(characterName.toLowerCase())) {
          dialogue.push(...quotes.map(q => q.replace(/"/g, '')));
        }
      }
    }
    
    return dialogue;
  }

  private parseVoiceFingerprint(voiceSample: string): VoiceFingerprint {
    // Try to parse as JSON, otherwise create basic fingerprint
    try {
      return JSON.parse(voiceSample);
    } catch {
      // Fallback: create basic fingerprint from dialogue sample
      const sentences = voiceSample.split(/[.!?]+/).filter(s => s.trim());
      const words = voiceSample.split(/\s+/).filter(w => w);
      
      return {
        averageSentenceLength: words.length / Math.max(sentences.length, 1),
        complexSentenceRatio: 0.3, // Default
        dialogueToNarrationRatio: 1.0, // Assume pure dialogue
        commonWords: ['said', 'well', 'just', 'like'],
        uniqueStyleMarkers: [],
        emotionalTone: 'neutral'
      };
    }
  }
}

// Export singleton instance
export const analysisService = new AnalysisService();