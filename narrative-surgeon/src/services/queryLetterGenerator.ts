import { QueryLetter, QueryLetterMetrics, Manuscript, Agent } from '../types';
import { ChunkedLLMProvider } from './llmProvider';
import { databaseService } from './database';
import { v4 as uuidv4 } from 'uuid';

export class QueryLetterGenerator {
  private llmProvider: ChunkedLLMProvider;

  constructor() {
    this.llmProvider = new ChunkedLLMProvider();
  }

  async generateQueryLetter(
    manuscript: Manuscript,
    authorBio: string,
    personalizations: { [agentName: string]: string } = {}
  ): Promise<QueryLetter> {
    const opening = await this.extractOpening(manuscript.id);
    
    const basePrompt = `Generate a compelling query letter for this manuscript:

Title: ${manuscript.title}
Genre: ${manuscript.genre || 'Literary Fiction'}
Word Count: ${manuscript.totalWordCount.toLocaleString()}
Target Audience: ${manuscript.targetAudience || 'Adult'}

Opening excerpt:
${opening.substring(0, 500)}

Comp Titles: ${manuscript.compTitles?.join(', ') || 'None provided'}

Author Bio: ${authorBio}

Create a query letter with these components:
1. Hook: A compelling 1-2 sentence opener that captures the story's essence
2. Logline: A one-sentence summary of the plot and stakes  
3. Body: 2-3 paragraphs describing the story, protagonist, and conflict
4. Bio: Professional author bio paragraph
5. Closing: Professional closing with manuscript details

The query should be exactly 250-300 words, follow industry standards, and have a compelling voice that matches the manuscript's tone.

Return as JSON:
{
  "hook": "Opening hook sentences",
  "logline": "One sentence story summary", 
  "body": "Full query body paragraphs",
  "bio": "Author bio paragraph",
  "fullText": "Complete formatted query letter"
}`;

    try {
      const response = await this.llmProvider.callLLM('query-generation', basePrompt);
      
      const queryLetter: QueryLetter = {
        id: uuidv4(),
        manuscriptId: manuscript.id,
        versionNumber: await this.getNextVersionNumber(manuscript.id),
        hook: response.hook || this.generateFallbackHook(manuscript),
        bio: response.bio || authorBio,
        logline: response.logline || this.generateFallbackLogline(manuscript),
        wordCount: manuscript.totalWordCount,
        compTitles: manuscript.compTitles || [],
        generatedText: response.fullText || this.assembleFallbackQuery(manuscript, authorBio),
        optimizationScore: await this.scoreQueryLetter(response.fullText || ''),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Save to database
      await this.saveQueryLetter(queryLetter);
      
      return queryLetter;
    } catch (error) {
      console.error('Query letter generation failed:', error);
      return this.generateFallbackQueryLetter(manuscript, authorBio);
    }
  }

  async optimizeQueryLetter(
    queryLetter: QueryLetter,
    optimizationGoals: string[]
  ): Promise<QueryLetter> {
    const optimizationPrompt = `Optimize this query letter to improve:
${optimizationGoals.join(', ')}

Current Query Letter:
${queryLetter.generatedText}

Optimization goals:
- Stronger hook that grabs attention immediately
- Clearer stakes and conflict
- Better genre positioning
- More compelling voice
- Precise word count (250-300 words)
- Industry-standard formatting

Return the optimized version as JSON with the same structure as the original.`;

    try {
      const response = await this.llmProvider.callLLM('query-optimization', optimizationPrompt);
      
      const optimized: QueryLetter = {
        ...queryLetter,
        id: uuidv4(),
        versionNumber: queryLetter.versionNumber + 1,
        hook: response.hook || queryLetter.hook,
        logline: response.logline || queryLetter.logline,
        generatedText: response.fullText || queryLetter.generatedText,
        optimizationScore: await this.scoreQueryLetter(response.fullText || queryLetter.generatedText),
        updatedAt: Date.now()
      };

      await this.saveQueryLetter(optimized);
      return optimized;
    } catch (error) {
      console.error('Query optimization failed:', error);
      return queryLetter;
    }
  }

  async personalizeForAgent(
    queryLetter: QueryLetter,
    agent: Agent,
    personalizationNotes: string
  ): Promise<string> {
    const personalizationPrompt = `Personalize this query letter for agent ${agent.name} at ${agent.agency}:

Agent Background:
- Represents genres: ${agent.genres.join(', ')}
- Recent deals: ${agent.recentDeals.slice(0, 3).map(d => `${d.title} by ${d.author}`).join(', ')}
- Manuscript wishlist: ${agent.manuscriptWishlist.join(', ')}
- Query preferences: ${JSON.stringify(agent.queryPreferences)}

Personalization notes: ${personalizationNotes}

Current Query Letter:
${queryLetter.generatedText}

Add 1-2 sentences of genuine personalization that shows research and connects the manuscript to the agent's interests. Keep the total length under 300 words.

Return only the personalized query letter text.`;

    try {
      const personalizedText = await this.llmProvider.callLLM('query-personalization', personalizationPrompt);
      return typeof personalizedText === 'string' ? personalizedText : personalizedText.personalizedText || queryLetter.generatedText;
    } catch (error) {
      console.error('Query personalization failed:', error);
      return this.addBasicPersonalization(queryLetter.generatedText, agent);
    }
  }

  async analyzeQueryEffectiveness(queryLetter: QueryLetter): Promise<{
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    score: number;
  }> {
    const analysisPrompt = `Analyze this query letter for effectiveness:

${queryLetter.generatedText}

Evaluate on:
1. Hook strength and attention-grabbing opening
2. Clear plot summary and stakes
3. Genre positioning and market appeal
4. Professional presentation and formatting  
5. Appropriate length and word choice
6. Voice and tone consistency
7. Compelling conflict and character motivation

Return analysis as JSON:
{
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...], 
  "suggestions": ["improvement 1", "improvement 2", ...],
  "score": 0-100
}`;

    try {
      const analysis = await this.llmProvider.callLLM('query-analysis', analysisPrompt);
      return {
        strengths: analysis.strengths || ['Professional presentation'],
        weaknesses: analysis.weaknesses || [],
        suggestions: analysis.suggestions || [],
        score: analysis.score || 70
      };
    } catch (error) {
      console.error('Query analysis failed:', error);
      return this.generateFallbackAnalysis(queryLetter);
    }
  }

  async getQueryLetterVersions(manuscriptId: string): Promise<QueryLetter[]> {
    const query = `
      SELECT * FROM query_letters 
      WHERE manuscript_id = ? 
      ORDER BY version_number DESC
    `;
    
    const rows = await databaseService.getAll(query, [manuscriptId]);
    
    return rows.map(row => ({
      id: row.id,
      manuscriptId: row.manuscript_id,
      versionNumber: row.version_number,
      hook: row.hook,
      bio: row.bio,
      logline: row.logline,
      wordCount: row.word_count,
      compTitles: JSON.parse(row.comp_titles || '[]'),
      personalizationTemplate: row.personalization_template,
      generatedText: row.generated_text,
      optimizationScore: row.optimization_score,
      abTestGroup: row.ab_test_group,
      performanceMetrics: row.performance_metrics ? JSON.parse(row.performance_metrics) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async trackQueryPerformance(
    queryLetterId: string,
    metrics: Partial<QueryLetterMetrics>
  ): Promise<void> {
    const query = `
      UPDATE query_letters 
      SET performance_metrics = ?, updated_at = ?
      WHERE id = ?
    `;
    
    await databaseService.executeQuery(query, [
      JSON.stringify(metrics),
      Date.now(),
      queryLetterId
    ]);
  }

  // Private helper methods
  private async extractOpening(manuscriptId: string): Promise<string> {
    const query = `
      SELECT raw_text FROM scenes 
      WHERE manuscript_id = ? AND is_opening = 1 
      ORDER BY index_in_manuscript ASC 
      LIMIT 1
    `;
    
    const result = await databaseService.getFirst(query, [manuscriptId]);
    return result?.raw_text || '';
  }

  private async getNextVersionNumber(manuscriptId: string): Promise<number> {
    const query = `
      SELECT MAX(version_number) as max_version 
      FROM query_letters 
      WHERE manuscript_id = ?
    `;
    
    const result = await databaseService.getFirst(query, [manuscriptId]);
    return (result?.max_version || 0) + 1;
  }

  private async scoreQueryLetter(queryText: string): Promise<number> {
    const wordCount = queryText.trim().split(/\s+/).length;
    let score = 70;
    
    // Word count optimization
    if (wordCount >= 250 && wordCount <= 300) score += 10;
    else if (wordCount >= 200 && wordCount <= 350) score += 5;
    else score -= 10;
    
    // Basic content checks
    if (queryText.toLowerCase().includes('comp')) score += 5;
    if (queryText.toLowerCase().includes('stakes')) score += 5;
    if (queryText.toLowerCase().includes('conflict')) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  private generateFallbackHook(manuscript: Manuscript): string {
    return `When [protagonist] faces [central conflict], they must [core choice] or risk [stakes].`;
  }

  private generateFallbackLogline(manuscript: Manuscript): string {
    return `A ${manuscript.genre} novel about [protagonist] who must [overcome obstacle] to [achieve goal].`;
  }

  private assembleFallbackQuery(manuscript: Manuscript, authorBio: string): string {
    return `Dear Agent,

I am seeking representation for ${manuscript.title}, a ${manuscript.genre} novel complete at ${manuscript.totalWordCount.toLocaleString()} words.

[Query body would be generated here based on manuscript content]

${authorBio}

I have included the first [X] pages as requested. Thank you for your time and consideration.

Sincerely,
[Author Name]`;
  }

  private generateFallbackQueryLetter(manuscript: Manuscript, authorBio: string): QueryLetter {
    const fallbackText = this.assembleFallbackQuery(manuscript, authorBio);
    
    return {
      id: uuidv4(),
      manuscriptId: manuscript.id,
      versionNumber: 1,
      hook: this.generateFallbackHook(manuscript),
      bio: authorBio,
      logline: this.generateFallbackLogline(manuscript),
      wordCount: manuscript.totalWordCount,
      compTitles: manuscript.compTitles || [],
      generatedText: fallbackText,
      optimizationScore: 60,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  private addBasicPersonalization(queryText: string, agent: Agent): string {
    const personalization = `Dear ${agent.name},\n\nI'm reaching out because of your work with ${agent.genres[0]} fiction` +
      (agent.recentDeals.length > 0 ? ` and your recent representation of ${agent.recentDeals[0].title}` : '') + 
      '.\n\n';
    
    return personalization + queryText.replace(/^Dear Agent,?\s*\n?/i, '');
  }

  private generateFallbackAnalysis(queryLetter: QueryLetter) {
    const wordCount = queryLetter.generatedText.trim().split(/\s+/).length;
    
    return {
      strengths: ['Professional formatting', 'Appropriate length'],
      weaknesses: wordCount > 300 ? ['Slightly over recommended word count'] : [],
      suggestions: ['Consider strengthening the opening hook', 'Add more specific stakes'],
      score: 70
    };
  }

  private async saveQueryLetter(queryLetter: QueryLetter): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO query_letters 
      (id, manuscript_id, version_number, hook, bio, logline, word_count, comp_titles, 
       personalization_template, generated_text, optimization_score, ab_test_group, 
       performance_metrics, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await databaseService.executeQuery(query, [
      queryLetter.id,
      queryLetter.manuscriptId,
      queryLetter.versionNumber,
      queryLetter.hook,
      queryLetter.bio,
      queryLetter.logline,
      queryLetter.wordCount,
      JSON.stringify(queryLetter.compTitles),
      queryLetter.personalizationTemplate,
      queryLetter.generatedText,
      queryLetter.optimizationScore,
      queryLetter.abTestGroup,
      queryLetter.performanceMetrics ? JSON.stringify(queryLetter.performanceMetrics) : null,
      queryLetter.createdAt,
      queryLetter.updatedAt
    ]);
  }
}

export const queryLetterGenerator = new QueryLetterGenerator();