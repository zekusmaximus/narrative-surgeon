import { 
  Agent, 
  AgentMatch, 
  AgentResearch, 
  Deal, 
  Manuscript,
  SubmissionGuidelines,
  QueryPreferences 
} from '../types';
import { databaseService } from './database';
import { ChunkedLLMProvider } from './llmProvider';
import { v4 as uuidv4 } from 'uuid';

export class AgentResearchService {
  private llmProvider: ChunkedLLMProvider;

  constructor() {
    this.llmProvider = new ChunkedLLMProvider();
  }

  async findMatchingAgents(
    manuscript: Manuscript,
    preferences?: {
      genreWeight?: number;
      experienceWeight?: number;
      responseTimeWeight?: number;
      clientSuccessWeight?: number;
      maxResults?: number;
    }
  ): Promise<AgentMatch[]> {
    const agents = await this.getAgentsByGenre(manuscript.genre || '');
    const matches: AgentMatch[] = [];

    for (const agent of agents) {
      const match = await this.calculateAgentMatch(manuscript, agent, preferences);
      if (match.compatibilityScore > 50) {
        matches.push(match);
      }
    }

    return matches
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, preferences?.maxResults || 50);
  }

  async calculateAgentMatch(
    manuscript: Manuscript,
    agent: Agent,
    weights?: {
      genreWeight?: number;
      experienceWeight?: number;
      responseTimeWeight?: number;
      clientSuccessWeight?: number;
    }
  ): Promise<AgentMatch> {
    const w = {
      genreWeight: weights?.genreWeight || 0.4,
      experienceWeight: weights?.experienceWeight || 0.3,
      responseTimeWeight: weights?.responseTimeWeight || 0.15,
      clientSuccessWeight: weights?.clientSuccessWeight || 0.15
    };

    const genreScore = this.calculateGenreMatch(manuscript, agent);
    const experienceScore = this.calculateExperienceScore(agent);
    const responseTimeScore = this.calculateResponseTimeScore(agent);
    const clientSuccessScore = this.calculateClientSuccessScore(agent);

    const compatibilityScore = Math.round(
      genreScore * w.genreWeight +
      experienceScore * w.experienceWeight +
      responseTimeScore * w.responseTimeWeight +
      clientSuccessScore * w.clientSuccessWeight
    );

    const reasoning = await this.generateMatchReasoning(manuscript, agent, {
      genreScore,
      experienceScore,
      responseTimeScore,
      clientSuccessScore
    });

    const match: AgentMatch = {
      id: uuidv4(),
      manuscriptId: manuscript.id,
      agentId: agent.id,
      compatibilityScore,
      genreMatchScore: genreScore,
      clientSuccessScore: clientSuccessScore,
      submissionPreferencesScore: this.calculateSubmissionPreferencesScore(agent),
      marketPositionScore: this.calculateMarketPositionScore(agent),
      matchReasoning: reasoning,
      priorityRank: 0, // Will be set when saving
      contacted: false,
      calculatedAt: Date.now()
    };

    await this.saveAgentMatch(match);
    return match;
  }

  async researchAgent(agentId: string): Promise<AgentResearch> {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    try {
      const research = await this.performAgentResearch(agent);
      await this.updateAgentResearch(agentId, research);
      return research;
    } catch (error) {
      console.error('Agent research failed:', error);
      return this.generateBasicResearch(agent);
    }
  }

  async updateAgentDatabase(
    agentData: Partial<Agent> & { name: string }
  ): Promise<Agent> {
    const existingAgent = await this.getAgentByName(agentData.name);
    
    if (existingAgent) {
      const updated = { ...existingAgent, ...agentData, updatedAt: Date.now() };
      await this.saveAgent(updated);
      return updated;
    } else {
      const newAgent: Agent = {
        id: uuidv4(),
        name: agentData.name,
        agency: agentData.agency,
        genres: agentData.genres || [],
        clientList: agentData.clientList || [],
        submissionGuidelines: agentData.submissionGuidelines || this.getDefaultSubmissionGuidelines(),
        responseTimeDays: agentData.responseTimeDays,
        acceptanceRate: agentData.acceptanceRate,
        clientSuccessStories: agentData.clientSuccessStories || [],
        socialMediaHandles: agentData.socialMediaHandles || {},
        interviewQuotes: agentData.interviewQuotes || [],
        manuscriptWishlist: agentData.manuscriptWishlist || [],
        recentDeals: agentData.recentDeals || [],
        queryPreferences: agentData.queryPreferences || this.getDefaultQueryPreferences(),
        redFlags: agentData.redFlags || [],
        updatedAt: Date.now()
      };
      
      await this.saveAgent(newAgent);
      return newAgent;
    }
  }

  async getAgentInsights(agentId: string): Promise<{
    competitiveness: 'low' | 'medium' | 'high';
    bestSubmissionTiming: string[];
    personalizedPitchSuggestions: string[];
    recentTrends: string[];
    clientSuccessPatterns: string[];
  }> {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const prompt = `Analyze this literary agent profile to provide submission insights:

Agent: ${agent.name} at ${agent.agency}
Genres: ${agent.genres.join(', ')}
Recent Deals: ${agent.recentDeals.slice(0, 5).map(d => `${d.title} by ${d.author} (${d.year})`).join('; ')}
Client Success Stories: ${agent.clientSuccessStories.slice(0, 3).join('; ')}
Manuscript Wishlist: ${agent.manuscriptWishlist.join('; ')}
Interview Quotes: ${agent.interviewQuotes.slice(0, 3).join('; ')}

Provide insights as JSON:
{
  "competitiveness": "low|medium|high",
  "bestSubmissionTiming": ["timing suggestion 1", "timing suggestion 2"],
  "personalizedPitchSuggestions": ["pitch idea 1", "pitch idea 2", "pitch idea 3"],
  "recentTrends": ["trend 1", "trend 2"],
  "clientSuccessPatterns": ["pattern 1", "pattern 2"]
}`;

    try {
      const insights = await this.llmProvider.callLLM('agent-insights', prompt);
      return {
        competitiveness: insights.competitiveness || 'medium',
        bestSubmissionTiming: insights.bestSubmissionTiming || ['Avoid January and August', 'Tuesday-Thursday preferred'],
        personalizedPitchSuggestions: insights.personalizedPitchSuggestions || ['Mention recent deals in your genre'],
        recentTrends: insights.recentTrends || ['Focus on diverse voices'],
        clientSuccessPatterns: insights.clientSuccessPatterns || ['Strong debut novels']
      };
    } catch (error) {
      console.error('Agent insights generation failed:', error);
      return this.generateFallbackInsights(agent);
    }
  }

  async searchAgentsByWishlist(keywords: string[]): Promise<Agent[]> {
    const query = `
      SELECT * FROM agent_database 
      WHERE ${keywords.map(() => 'manuscript_wishlist LIKE ?').join(' OR ')}
      ORDER BY updated_at DESC
    `;
    
    const params = keywords.map(keyword => `%${keyword}%`);
    const rows = await databaseService.getAll(query, params);
    
    return rows.map(row => this.mapAgentFromDatabase(row));
  }

  async getAgentsByGenre(genre: string): Promise<Agent[]> {
    const query = `
      SELECT * FROM agent_database 
      WHERE genres LIKE ? 
      ORDER BY updated_at DESC
    `;
    
    const rows = await databaseService.getAll(query, [`%${genre}%`]);
    return rows.map(row => this.mapAgentFromDatabase(row));
  }

  async trackAgentUpdates(agentId: string): Promise<string[]> {
    // This would integrate with external sources to track agent updates
    // For now, return mock updates
    const agent = await this.getAgent(agentId);
    if (!agent) return [];

    return [
      `New interview published discussing current manuscript needs`,
      `Recent deal announced: ${agent.recentDeals[0]?.title || 'New publication'}`,
      `Updated submission guidelines on agency website`
    ];
  }

  async bulkImportAgents(agentsData: Partial<Agent>[]): Promise<{
    imported: number;
    updated: number;
    errors: string[];
  }> {
    let imported = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const agentData of agentsData) {
      try {
        if (!agentData.name) {
          errors.push('Agent name is required');
          continue;
        }

        const existing = await this.getAgentByName(agentData.name);
        
        if (existing) {
          await this.updateAgentDatabase(agentData as any);
          updated++;
        } else {
          await this.updateAgentDatabase(agentData as any);
          imported++;
        }
      } catch (error) {
        errors.push(`Error processing ${agentData.name}: ${error.message}`);
      }
    }

    return { imported, updated, errors };
  }

  // Private helper methods
  private calculateGenreMatch(manuscript: Manuscript, agent: Agent): number {
    if (!manuscript.genre) return 50;
    
    const manuscriptGenre = manuscript.genre.toLowerCase();
    const agentGenres = agent.genres.map(g => g.toLowerCase());
    
    // Exact match
    if (agentGenres.includes(manuscriptGenre)) return 100;
    
    // Partial matches for related genres
    const genreMap = {
      'fantasy': ['scifi', 'paranormal', 'urban fantasy'],
      'scifi': ['fantasy', 'speculative'],
      'thriller': ['mystery', 'suspense', 'crime'],
      'mystery': ['thriller', 'crime'],
      'romance': ['contemporary', 'historical romance'],
      'literary': ['upmarket', 'book club fiction']
    };
    
    const relatedGenres = genreMap[manuscriptGenre] || [];
    if (relatedGenres.some(rg => agentGenres.some(ag => ag.includes(rg)))) return 75;
    
    // General fiction match
    if (agentGenres.includes('fiction')) return 60;
    
    return 25;
  }

  private calculateExperienceScore(agent: Agent): number {
    let score = 50;
    
    // Client list size
    const clientCount = agent.clientList.length;
    if (clientCount > 50) score += 20;
    else if (clientCount > 20) score += 15;
    else if (clientCount > 10) score += 10;
    
    // Recent deals
    const recentDeals = agent.recentDeals.filter(d => d.year >= new Date().getFullYear() - 2).length;
    if (recentDeals > 5) score += 20;
    else if (recentDeals > 2) score += 15;
    else if (recentDeals > 0) score += 10;
    
    // Success stories
    if (agent.clientSuccessStories.length > 3) score += 10;
    
    return Math.min(100, score);
  }

  private calculateResponseTimeScore(agent: Agent): number {
    if (!agent.responseTimeDays) return 50;
    
    if (agent.responseTimeDays <= 14) return 100;
    if (agent.responseTimeDays <= 30) return 80;
    if (agent.responseTimeDays <= 60) return 60;
    if (agent.responseTimeDays <= 90) return 40;
    return 20;
  }

  private calculateClientSuccessScore(agent: Agent): number {
    let score = 50;
    
    if (agent.acceptanceRate && agent.acceptanceRate > 0.1) score += 30;
    else if (agent.acceptanceRate && agent.acceptanceRate > 0.05) score += 20;
    
    const successStories = agent.clientSuccessStories.length;
    if (successStories > 5) score += 20;
    else if (successStories > 2) score += 10;
    
    return Math.min(100, score);
  }

  private calculateSubmissionPreferencesScore(agent: Agent): number {
    let score = 50;
    
    // Easier submission process scores higher
    if (agent.submissionGuidelines.queryFormat === 'email') score += 20;
    if (!agent.submissionGuidelines.exclusiveSubmissions) score += 15;
    if (agent.submissionGuidelines.attachmentsAllowed) score += 10;
    if (agent.submissionGuidelines.samplePagesCount <= 10) score += 5;
    
    return Math.min(100, score);
  }

  private calculateMarketPositionScore(agent: Agent): number {
    let score = 50;
    
    // Agency prestige (simplified)
    const prestigiousAgencies = ['ICM', 'CAA', 'WME', 'Endeavor', 'Curtis Brown'];
    if (prestigiousAgencies.some(pa => agent.agency?.includes(pa))) score += 20;
    
    // Recent market activity
    const recentDeals = agent.recentDeals.filter(d => d.year >= new Date().getFullYear() - 1).length;
    if (recentDeals > 3) score += 15;
    
    // Social media presence
    const socialMediaCount = Object.keys(agent.socialMediaHandles).length;
    if (socialMediaCount > 2) score += 10;
    
    return Math.min(100, score);
  }

  private async generateMatchReasoning(
    manuscript: Manuscript,
    agent: Agent,
    scores: {
      genreScore: number;
      experienceScore: number;
      responseTimeScore: number;
      clientSuccessScore: number;
    }
  ): Promise<string> {
    const reasons: string[] = [];
    
    if (scores.genreScore >= 90) {
      reasons.push(`Perfect genre match for ${manuscript.genre}`);
    } else if (scores.genreScore >= 70) {
      reasons.push(`Good genre alignment with ${manuscript.genre}`);
    }
    
    if (scores.experienceScore >= 80) {
      reasons.push(`Strong track record with ${agent.recentDeals.length} recent deals`);
    }
    
    if (scores.responseTimeScore >= 80) {
      reasons.push(`Fast response time (${agent.responseTimeDays} days)`);
    }
    
    if (scores.clientSuccessScore >= 80) {
      reasons.push(`High client success rate`);
    }
    
    if (agent.manuscriptWishlist.length > 0) {
      reasons.push(`Currently seeking: ${agent.manuscriptWishlist.slice(0, 2).join(', ')}`);
    }
    
    return reasons.join('. ') || 'General compatibility based on profile match.';
  }

  private async performAgentResearch(agent: Agent): Promise<AgentResearch> {
    // This would integrate with external APIs/sources in production
    // For now, simulate research results
    return {
      recentInterviews: [
        `Interview with ${agent.name} on current market trends`,
        `${agent.name} discusses their wish list for 2024`
      ],
      manuscriptWishes: agent.manuscriptWishlist,
      recentSales: agent.recentDeals.slice(0, 5),
      clientUpdates: [
        `New debut novel success from ${agent.name}'s client`,
        `Award nomination for ${agent.agency} client`
      ],
      socialMediaActivity: [
        `Recent Twitter thread about submission tips`,
        `Instagram post featuring client book launch`
      ],
      conferenceAppearances: [
        'Writers\' Conference 2024 panelist',
        'Publishing Summit keynote speaker'
      ],
      lastUpdated: Date.now()
    };
  }

  private generateBasicResearch(agent: Agent): AgentResearch {
    return {
      recentInterviews: [],
      manuscriptWishes: agent.manuscriptWishlist,
      recentSales: agent.recentDeals,
      clientUpdates: [],
      socialMediaActivity: [],
      conferenceAppearances: [],
      lastUpdated: Date.now()
    };
  }

  private generateFallbackInsights(agent: Agent) {
    return {
      competitiveness: 'medium' as const,
      bestSubmissionTiming: ['Tuesday through Thursday', 'Avoid summer months'],
      personalizedPitchSuggestions: [
        `Mention connection to ${agent.genres[0]} genre`,
        'Reference recent client successes',
        'Highlight unique market position'
      ],
      recentTrends: ['Seeking diverse voices', 'Interest in contemporary themes'],
      clientSuccessPatterns: ['Strong debut novels', 'Genre-bending stories']
    };
  }

  private getDefaultSubmissionGuidelines(): SubmissionGuidelines {
    return {
      queryFormat: 'email',
      synopsisRequired: true,
      samplePagesCount: 10,
      samplePagesFormat: 'first_pages',
      attachmentsAllowed: true,
      responsePolicy: 'No response means no interest',
      exclusiveSubmissions: false
    };
  }

  private getDefaultQueryPreferences(): QueryPreferences {
    return {
      personalizationRequired: true,
      genreInSubject: true,
      compTitlesRequired: true,
      wordCountRequired: true,
      bioRequired: true
    };
  }

  private async getAgent(agentId: string): Promise<Agent | null> {
    const query = `SELECT * FROM agent_database WHERE id = ?`;
    const result = await databaseService.getFirst(query, [agentId]);
    return result ? this.mapAgentFromDatabase(result) : null;
  }

  private async getAgentByName(name: string): Promise<Agent | null> {
    const query = `SELECT * FROM agent_database WHERE name = ?`;
    const result = await databaseService.getFirst(query, [name]);
    return result ? this.mapAgentFromDatabase(result) : null;
  }

  private mapAgentFromDatabase(row: any): Agent {
    return {
      id: row.id,
      name: row.name,
      agency: row.agency,
      genres: JSON.parse(row.genres || '[]'),
      clientList: JSON.parse(row.client_list || '[]'),
      submissionGuidelines: JSON.parse(row.submission_guidelines || '{}'),
      responseTimeDays: row.response_time_days,
      acceptanceRate: row.acceptance_rate,
      clientSuccessStories: JSON.parse(row.client_success_stories || '[]'),
      socialMediaHandles: JSON.parse(row.social_media_handles || '{}'),
      interviewQuotes: JSON.parse(row.interview_quotes || '[]'),
      manuscriptWishlist: JSON.parse(row.manuscript_wishlist || '[]'),
      recentDeals: JSON.parse(row.recent_deals || '[]'),
      queryPreferences: JSON.parse(row.query_preferences || '{}'),
      redFlags: JSON.parse(row.red_flags || '[]'),
      updatedAt: row.updated_at
    };
  }

  private async saveAgent(agent: Agent): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO agent_database 
      (id, name, agency, genres, client_list, submission_guidelines, response_time_days, 
       acceptance_rate, client_success_stories, social_media_handles, interview_quotes, 
       manuscript_wishlist, recent_deals, query_preferences, red_flags, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await databaseService.executeQuery(query, [
      agent.id,
      agent.name,
      agent.agency,
      JSON.stringify(agent.genres),
      JSON.stringify(agent.clientList),
      JSON.stringify(agent.submissionGuidelines),
      agent.responseTimeDays,
      agent.acceptanceRate,
      JSON.stringify(agent.clientSuccessStories),
      JSON.stringify(agent.socialMediaHandles),
      JSON.stringify(agent.interviewQuotes),
      JSON.stringify(agent.manuscriptWishlist),
      JSON.stringify(agent.recentDeals),
      JSON.stringify(agent.queryPreferences),
      JSON.stringify(agent.redFlags),
      agent.updatedAt
    ]);
  }

  private async saveAgentMatch(match: AgentMatch): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO agent_matching 
      (id, manuscript_id, agent_id, compatibility_score, genre_match_score, 
       client_success_score, submission_preferences_score, market_position_score, 
       match_reasoning, priority_rank, contacted, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await databaseService.executeQuery(query, [
      match.id,
      match.manuscriptId,
      match.agentId,
      match.compatibilityScore,
      match.genreMatchScore,
      match.clientSuccessScore,
      match.submissionPreferencesScore,
      match.marketPositionScore,
      match.matchReasoning,
      match.priorityRank,
      match.contacted ? 1 : 0,
      match.calculatedAt
    ]);
  }

  private async updateAgentResearch(agentId: string, research: AgentResearch): Promise<void> {
    // This would update a separate research tracking table in production
    console.log(`Updated research for agent ${agentId}`, research);
  }
}

export const agentResearchService = new AgentResearchService();