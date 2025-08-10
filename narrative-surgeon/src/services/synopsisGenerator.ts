import { Synopsis, Manuscript, Scene, Character } from '../types';
import { ChunkedLLMProvider } from './llmProvider';
import { databaseService } from './database';
import { v4 as uuidv4 } from 'uuid';

export class SynopsisGenerator {
  private llmProvider: ChunkedLLMProvider;

  constructor() {
    this.llmProvider = new ChunkedLLMProvider();
  }

  async generateSynopsis(
    manuscript: Manuscript,
    lengthType: 'one_page' | 'two_page' | 'chapter_by_chapter'
  ): Promise<Synopsis> {
    const scenes = await this.getManuscriptScenes(manuscript.id);
    const characters = await this.getManuscriptCharacters(manuscript.id);
    
    const prompt = this.buildSynopsisPrompt(manuscript, scenes, characters, lengthType);
    
    try {
      const response = await this.llmProvider.callLLM('synopsis-generation', prompt);
      
      const synopsis: Synopsis = {
        id: uuidv4(),
        manuscriptId: manuscript.id,
        lengthType,
        wordCount: this.countWords(response.content || ''),
        content: response.content || this.generateFallbackSynopsis(manuscript, lengthType),
        structuralBeats: response.structuralBeats || this.extractStructuralBeats(scenes),
        characterArcs: response.characterArcs || this.mapCharacterArcs(characters),
        genreElements: response.genreElements || this.identifyGenreElements(manuscript, scenes),
        optimizationScore: await this.scoreSynopsis(response.content || '', lengthType),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await this.saveSynopsis(synopsis);
      return synopsis;
    } catch (error) {
      console.error('Synopsis generation failed:', error);
      return this.generateFallbackSynopsisObject(manuscript, lengthType);
    }
  }

  async optimizeSynopsis(
    synopsis: Synopsis,
    feedback: string[]
  ): Promise<Synopsis> {
    const optimizationPrompt = `Optimize this synopsis based on the following feedback:
${feedback.join('\n- ')}

Current Synopsis (${synopsis.lengthType}):
${synopsis.content}

Structural Beats: ${synopsis.structuralBeats.join(', ')}
Character Arcs: ${Object.entries(synopsis.characterArcs).map(([char, arc]) => `${char}: ${arc}`).join('; ')}

Requirements for ${synopsis.lengthType}:
${this.getSynopsisRequirements(synopsis.lengthType)}

Optimization goals:
- Clearer plot progression and causality
- Stronger character motivations and growth
- Better pacing and tension maintenance
- More compelling stakes and resolution
- Industry-standard formatting and style
- Appropriate length for ${synopsis.lengthType}

Return optimized synopsis as JSON:
{
  "content": "Full optimized synopsis text",
  "structuralBeats": ["beat1", "beat2", ...],
  "characterArcs": {"character": "arc description", ...},
  "genreElements": ["element1", "element2", ...]
}`;

    try {
      const response = await this.llmProvider.callLLM('synopsis-optimization', optimizationPrompt);
      
      const optimized: Synopsis = {
        ...synopsis,
        id: uuidv4(),
        content: response.content || synopsis.content,
        structuralBeats: response.structuralBeats || synopsis.structuralBeats,
        characterArcs: response.characterArcs || synopsis.characterArcs,
        genreElements: response.genreElements || synopsis.genreElements,
        wordCount: this.countWords(response.content || synopsis.content),
        optimizationScore: await this.scoreSynopsis(response.content || synopsis.content, synopsis.lengthType),
        updatedAt: Date.now()
      };

      await this.saveSynopsis(optimized);
      return optimized;
    } catch (error) {
      console.error('Synopsis optimization failed:', error);
      return synopsis;
    }
  }

  async analyzeSynopsisEffectiveness(synopsis: Synopsis): Promise<{
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    score: number;
    marketability: number;
  }> {
    const analysisPrompt = `Analyze this ${synopsis.lengthType} synopsis for effectiveness:

${synopsis.content}

Evaluate on:
1. Plot clarity and logical progression
2. Character development and motivation
3. Stakes and tension escalation
4. Genre conventions and market appeal
5. Pacing and structure
6. Professional presentation
7. Hook strength and compelling elements
8. Resolution satisfaction

Return analysis as JSON:
{
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "suggestions": ["improvement1", "improvement2", ...],
  "score": 0-100,
  "marketability": 0-100
}`;

    try {
      const analysis = await this.llmProvider.callLLM('synopsis-analysis', analysisPrompt);
      return {
        strengths: analysis.strengths || ['Clear narrative structure'],
        weaknesses: analysis.weaknesses || [],
        suggestions: analysis.suggestions || [],
        score: analysis.score || 75,
        marketability: analysis.marketability || 70
      };
    } catch (error) {
      console.error('Synopsis analysis failed:', error);
      return this.generateFallbackAnalysis(synopsis);
    }
  }

  async getSynopsesByType(manuscriptId: string): Promise<{
    onePage: Synopsis[];
    twoPage: Synopsis[];
    chapterByChapter: Synopsis[];
  }> {
    const query = `
      SELECT * FROM synopses 
      WHERE manuscript_id = ? 
      ORDER BY created_at DESC
    `;
    
    const rows = await databaseService.getAll(query, [manuscriptId]);
    
    const synopses = rows.map(row => this.mapDatabaseRow(row));
    
    return {
      onePage: synopses.filter(s => s.lengthType === 'one_page'),
      twoPage: synopses.filter(s => s.lengthType === 'two_page'),
      chapterByChapter: synopses.filter(s => s.lengthType === 'chapter_by_chapter')
    };
  }

  async generateAgentSpecificSynopsis(
    synopsis: Synopsis,
    agentPreferences: {
      preferredLength?: string;
      focusAreas?: string[];
      styleNotes?: string;
    }
  ): Promise<string> {
    const customizationPrompt = `Customize this synopsis for an agent with these preferences:
- Preferred length: ${agentPreferences.preferredLength || 'standard'}
- Focus areas: ${agentPreferences.focusAreas?.join(', ') || 'character development, plot'}
- Style notes: ${agentPreferences.styleNotes || 'professional, concise'}

Current Synopsis:
${synopsis.content}

Adjust the synopsis to match these preferences while maintaining all essential plot points and character development. Keep the same basic structure but emphasize the preferred elements.

Return only the customized synopsis text.`;

    try {
      const customized = await this.llmProvider.callLLM('synopsis-customization', customizationPrompt);
      return typeof customized === 'string' ? customized : customized.content || synopsis.content;
    } catch (error) {
      console.error('Synopsis customization failed:', error);
      return synopsis.content;
    }
  }

  // Private helper methods
  private buildSynopsisPrompt(
    manuscript: Manuscript,
    scenes: Scene[],
    characters: Character[],
    lengthType: 'one_page' | 'two_page' | 'chapter_by_chapter'
  ): string {
    const requirements = this.getSynopsisRequirements(lengthType);
    const sceneContext = scenes.slice(0, 10).map(s => `Scene ${s.indexInManuscript + 1}: ${s.rawText.substring(0, 200)}...`).join('\n\n');
    const characterContext = characters.map(c => `${c.name} (${c.role}): ${c.voiceSample || 'Main character'}`).join('\n');
    
    return `Generate a professional ${lengthType} synopsis for this ${manuscript.genre} novel:

Title: ${manuscript.title}
Genre: ${manuscript.genre}
Word Count: ${manuscript.totalWordCount.toLocaleString()}
Target Audience: ${manuscript.targetAudience}

Key Characters:
${characterContext}

Scene Context (first 10 scenes):
${sceneContext}

Requirements: ${requirements}

The synopsis should:
1. Present the complete story from beginning to end (including the ending)
2. Focus on main plot line and primary characters
3. Maintain present tense, third person narrative
4. Include clear stakes, conflict progression, and resolution
5. Be compelling and professionally written
6. Follow industry standards for ${lengthType} synopses
7. Highlight genre-appropriate elements

Return as JSON:
{
  "content": "Full synopsis text",
  "structuralBeats": ["inciting incident", "plot point 1", "midpoint", "plot point 2", "climax", "resolution"],
  "characterArcs": {"main character": "character arc description", ...},
  "genreElements": ["genre element 1", "genre element 2", ...]
}`;
  }

  private getSynopsisRequirements(lengthType: string): string {
    switch (lengthType) {
      case 'one_page':
        return 'Single page (250-500 words), concise plot summary, main characters only, clear beginning-middle-end structure';
      case 'two_page':
        return 'Two pages (500-1000 words), detailed plot and character development, all major plot points, subplots included';
      case 'chapter_by_chapter':
        return 'Detailed breakdown by chapter, 1-2 paragraphs per chapter, comprehensive coverage of all plot threads';
      default:
        return 'Standard synopsis format';
    }
  }

  private async getManuscriptScenes(manuscriptId: string): Promise<Scene[]> {
    const query = `
      SELECT * FROM scenes 
      WHERE manuscript_id = ? 
      ORDER BY index_in_manuscript ASC
    `;
    
    const rows = await databaseService.getAll(query, [manuscriptId]);
    return rows.map(row => ({
      id: row.id,
      manuscriptId: row.manuscript_id,
      chapterNumber: row.chapter_number,
      sceneNumberInChapter: row.scene_number_in_chapter,
      indexInManuscript: row.index_in_manuscript,
      title: row.title,
      rawText: row.raw_text,
      wordCount: row.word_count,
      isOpening: Boolean(row.is_opening),
      isChapterEnd: Boolean(row.is_chapter_end),
      opensWithHook: Boolean(row.opens_with_hook),
      endsWithHook: Boolean(row.ends_with_hook),
      povCharacter: row.pov_character,
      location: row.location,
      timeMarker: row.time_marker,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  private async getManuscriptCharacters(manuscriptId: string): Promise<Character[]> {
    const query = `
      SELECT * FROM characters 
      WHERE manuscript_id = ? 
      ORDER BY created_at ASC
    `;
    
    const rows = await databaseService.getAll(query, [manuscriptId]);
    return rows.map(row => ({
      id: row.id,
      manuscriptId: row.manuscript_id,
      name: row.name,
      role: row.role,
      firstAppearanceSceneId: row.first_appearance_scene_id,
      voiceSample: row.voice_sample,
      createdAt: row.created_at
    }));
  }

  private extractStructuralBeats(scenes: Scene[]): string[] {
    const beats = ['Opening'];
    
    const quarterPoints = [
      Math.floor(scenes.length * 0.25),
      Math.floor(scenes.length * 0.5),
      Math.floor(scenes.length * 0.75)
    ];
    
    quarterPoints.forEach((point, index) => {
      const beatNames = ['Plot Point 1', 'Midpoint', 'Plot Point 2'];
      beats.push(beatNames[index]);
    });
    
    beats.push('Climax', 'Resolution');
    return beats;
  }

  private mapCharacterArcs(characters: Character[]): Record<string, string> {
    const arcs: Record<string, string> = {};
    
    characters.forEach(char => {
      const arcType = char.role === 'protagonist' ? 'Hero\'s journey with growth' :
                     char.role === 'antagonist' ? 'Opposition and eventual defeat/resolution' :
                     'Supporting character development';
      arcs[char.name] = arcType;
    });
    
    return arcs;
  }

  private identifyGenreElements(manuscript: Manuscript, scenes: Scene[]): string[] {
    const elements: string[] = [];
    
    switch (manuscript.genre) {
      case 'thriller':
        elements.push('Suspense', 'Fast pacing', 'High stakes');
        break;
      case 'romance':
        elements.push('Romantic tension', 'Character development', 'Emotional journey');
        break;
      case 'mystery':
        elements.push('Investigation', 'Clues', 'Resolution of mystery');
        break;
      case 'fantasy':
        elements.push('World building', 'Magic system', 'Quest narrative');
        break;
      default:
        elements.push('Character development', 'Conflict resolution');
    }
    
    return elements;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private async scoreSynopsis(content: string, lengthType: string): Promise<number> {
    const wordCount = this.countWords(content);
    let score = 70;
    
    // Length appropriateness
    const targetRanges = {
      'one_page': { min: 250, max: 500 },
      'two_page': { min: 500, max: 1000 },
      'chapter_by_chapter': { min: 1000, max: 3000 }
    };
    
    const range = targetRanges[lengthType];
    if (wordCount >= range.min && wordCount <= range.max) score += 15;
    else if (wordCount >= range.min * 0.8 && wordCount <= range.max * 1.2) score += 10;
    else score -= 10;
    
    // Content quality checks
    if (content.toLowerCase().includes('stakes')) score += 5;
    if (content.toLowerCase().includes('conflict')) score += 5;
    if (content.includes('ending') || content.includes('resolution')) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private generateFallbackSynopsis(manuscript: Manuscript, lengthType: string): string {
    return `[${manuscript.title}] follows [protagonist] as they face [central conflict]. When [inciting incident] occurs, [protagonist] must [quest/goal] while dealing with [obstacles]. The story explores themes of [themes] and culminates when [protagonist] [resolution].`;
  }

  private generateFallbackSynopsisObject(manuscript: Manuscript, lengthType: string): Synopsis {
    const content = this.generateFallbackSynopsis(manuscript, lengthType);
    
    return {
      id: uuidv4(),
      manuscriptId: manuscript.id,
      lengthType,
      wordCount: this.countWords(content),
      content,
      structuralBeats: ['Opening', 'Inciting Incident', 'Climax', 'Resolution'],
      characterArcs: { 'Protagonist': 'Character growth and change' },
      genreElements: [manuscript.genre || 'Literary Fiction'],
      optimizationScore: 60,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  private generateFallbackAnalysis(synopsis: Synopsis) {
    return {
      strengths: ['Complete story coverage', 'Professional format'],
      weaknesses: ['Could be more specific with stakes'],
      suggestions: ['Add more character motivation details', 'Strengthen opening hook'],
      score: 75,
      marketability: 70
    };
  }

  private mapDatabaseRow(row: any): Synopsis {
    return {
      id: row.id,
      manuscriptId: row.manuscript_id,
      lengthType: row.length_type,
      wordCount: row.word_count,
      content: row.content,
      structuralBeats: JSON.parse(row.structural_beats || '[]'),
      characterArcs: JSON.parse(row.character_arcs || '{}'),
      genreElements: JSON.parse(row.genre_elements || '[]'),
      optimizationScore: row.optimization_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private async saveSynopsis(synopsis: Synopsis): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO synopses 
      (id, manuscript_id, length_type, word_count, content, structural_beats, 
       character_arcs, genre_elements, optimization_score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await databaseService.executeQuery(query, [
      synopsis.id,
      synopsis.manuscriptId,
      synopsis.lengthType,
      synopsis.wordCount,
      synopsis.content,
      JSON.stringify(synopsis.structuralBeats),
      JSON.stringify(synopsis.characterArcs),
      JSON.stringify(synopsis.genreElements),
      synopsis.optimizationScore,
      synopsis.createdAt,
      synopsis.updatedAt
    ]);
  }
}

export const synopsisGenerator = new SynopsisGenerator();