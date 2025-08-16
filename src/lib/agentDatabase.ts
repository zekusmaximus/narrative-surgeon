'use client'

export interface Sale {
  title: string
  author: string
  publisher: string
  date: number
  genre: string
  deal_value?: number
  deal_type: 'debut' | 'established' | 'bestseller'
}

export interface SubmissionPrefs {
  format: 'email' | 'query_manager' | 'postal'
  query_only: boolean
  sample_pages: number
  synopsis_required: boolean
  exclusive_period?: number
  response_time: number
  no_response_means_no: boolean
  preferred_genres: string[]
  not_seeking: string[]
  seasonal_closures: string[]
}

export interface AgentProfile {
  id: string
  name: string
  agency: string
  email?: string
  website?: string
  bio: string
  experience_years: number
  
  // Genre preferences
  genres: string[]
  subgenres: string[]
  age_categories: ('adult' | 'ya' | 'mg' | 'pb')[]
  
  // Client information
  clientList: string[]
  notableClients: string[]
  recentSales: Sale[]
  
  // Performance metrics
  responseTime: number // average days
  responseRate: number // percentage who get responses
  successRate: number // percentage of queries that get requests
  
  // Career information
  careerLevel: 'new' | 'established' | 'veteran'
  clientSuccessRate: number
  totalBooksSold: number
  
  // Preferences and personality
  wishlistKeywords: string[]
  personalityTags: string[]
  communicationStyle: 'formal' | 'casual' | 'direct' | 'nurturing'
  
  // Submission details
  submissionPreferences: SubmissionPrefs
  
  // Activity tracking
  lastActive: number
  currentlyAcceptingQueries: boolean
  manuscriptWishlist: string[]
  
  // Social presence
  twitter?: string
  instagram?: string
  linkedin?: string
  website_blog?: string
  
  // Internal tracking
  addedDate: number
  lastUpdated: number
  dataSource: 'manual' | 'publishers_marketplace' | 'querytracker' | 'agent_website' | 'conference'
}

export interface MatchScore {
  overall: number
  genreMatch: number
  experienceLevel: number
  clientFit: number
  timingFactor: number
  personalityMatch: number
  submissionPrefs: number
  recentActivity: number
  factors: {
    [key: string]: {
      score: number
      weight: number
      explanation: string
    }
  }
}

export interface Connection {
  type: 'comp_title' | 'client_work' | 'genre_specialty' | 'recent_interest' | 'career_stage'
  strength: number
  description: string
  evidence: string[]
}

export interface SubmissionTiming {
  recommended_date: number
  rationale: string
  alternative_dates: number[]
  seasonal_factors: string[]
  agent_specific_factors: string[]
}

export interface Manuscript {
  id: string
  title: string
  genre: string
  subgenre?: string
  word_count: number
  age_category: 'adult' | 'ya' | 'mg' | 'pb'
  logline: string
  themes: string[]
  comp_titles: string[]
  completed: boolean
  debut: boolean
  series: boolean
}

class AgentMatcher {
  private agents: AgentProfile[] = []
  
  constructor() {
    this.loadAgentDatabase()
  }

  // Core matching algorithm
  scoreAgentMatch(manuscript: Manuscript, agent: AgentProfile): MatchScore {
    const factors: { [key: string]: { score: number; weight: number; explanation: string } } = {}
    
    // 1. Genre Match (35% weight)
    const genreScore = this.calculateGenreMatch(manuscript, agent)
    factors.genre = {
      score: genreScore,
      weight: 0.35,
      explanation: `Agent ${genreScore > 80 ? 'actively seeks' : genreScore > 60 ? 'represents' : 'occasionally handles'} ${manuscript.genre}`
    }

    // 2. Experience Level Match (20% weight)
    const experienceScore = this.calculateExperienceMatch(manuscript, agent)
    factors.experience = {
      score: experienceScore,
      weight: 0.20,
      explanation: `Agent's ${agent.careerLevel} status ${experienceScore > 70 ? 'aligns well' : 'may not align'} with manuscript profile`
    }

    // 3. Client Portfolio Fit (20% weight)
    const clientScore = this.calculateClientFit(manuscript, agent)
    factors.clientFit = {
      score: clientScore,
      weight: 0.20,
      explanation: `${clientScore > 70 ? 'Strong' : 'Limited'} overlap with agent's existing client base`
    }

    // 4. Submission Preferences (10% weight)
    const prefsScore = this.calculateSubmissionPrefsMatch(manuscript, agent)
    factors.submissionPrefs = {
      score: prefsScore,
      weight: 0.10,
      explanation: `Manuscript ${prefsScore > 80 ? 'perfectly fits' : 'generally matches'} submission requirements`
    }

    // 5. Recent Activity/Availability (10% weight)
    const activityScore = this.calculateActivityScore(agent)
    factors.activity = {
      score: activityScore,
      weight: 0.10,
      explanation: `Agent is ${activityScore > 80 ? 'actively' : activityScore > 50 ? 'moderately' : 'minimally'} acquiring new clients`
    }

    // 6. Timing Factor (5% weight)
    const timingScore = this.calculateTimingScore(agent)
    factors.timing = {
      score: timingScore,
      weight: 0.05,
      explanation: `${timingScore > 70 ? 'Excellent' : 'Good'} timing for submissions`
    }

    // Calculate weighted overall score
    let overall = 0
    let genreMatch = factors.genre.score
    let experienceLevel = factors.experience.score
    let clientFit = factors.clientFit.score
    let timingFactor = factors.timing.score
    let personalityMatch = 75 // Placeholder - would analyze communication style
    let submissionPrefs = factors.submissionPrefs.score
    let recentActivity = factors.activity.score

    for (const factor of Object.values(factors)) {
      overall += factor.score * factor.weight
    }

    return {
      overall: Math.round(overall),
      genreMatch,
      experienceLevel,
      clientFit,
      timingFactor,
      personalityMatch,
      submissionPrefs,
      recentActivity,
      factors
    }
  }

  private calculateGenreMatch(manuscript: Manuscript, agent: AgentProfile): number {
    let score = 0
    
    // Primary genre match
    if (agent.genres.includes(manuscript.genre)) {
      score += 60
      
      // Subgenre bonus
      if (manuscript.subgenre && agent.subgenres.includes(manuscript.subgenre)) {
        score += 20
      }
    } else {
      // Check for adjacent genres
      const adjacentGenres = this.getAdjacentGenres(manuscript.genre)
      const hasAdjacentMatch = agent.genres.some(g => adjacentGenres.includes(g))
      if (hasAdjacentMatch) score += 30
    }
    
    // Age category match
    if (agent.age_categories.includes(manuscript.age_category)) {
      score += 15
    }
    
    // Wishlist keyword matching
    const wishlistMatches = agent.wishlistKeywords.filter(keyword =>
      manuscript.logline.toLowerCase().includes(keyword.toLowerCase()) ||
      manuscript.themes.some(theme => theme.toLowerCase().includes(keyword.toLowerCase()))
    )
    score += Math.min(20, wishlistMatches.length * 5)

    return Math.min(100, score)
  }

  private calculateExperienceMatch(manuscript: Manuscript, agent: AgentProfile): number {
    let score = 70 // Base score
    
    // Match career level to manuscript type
    if (manuscript.debut) {
      if (agent.careerLevel === 'new') score += 15
      else if (agent.careerLevel === 'established') score += 10
      else score -= 5 // Veterans might be too selective for debuts
    } else {
      if (agent.careerLevel === 'veteran') score += 15
      else if (agent.careerLevel === 'established') score += 10
      else score += 5
    }
    
    // Success rate consideration
    if (agent.clientSuccessRate > 0.8) score += 15
    else if (agent.clientSuccessRate > 0.6) score += 10
    else if (agent.clientSuccessRate < 0.3) score -= 20
    
    // Response rate consideration
    if (agent.responseRate > 0.8) score += 10
    else if (agent.responseRate < 0.3) score -= 15
    
    return Math.max(0, Math.min(100, score))
  }

  private calculateClientFit(manuscript: Manuscript, agent: AgentProfile): number {
    let score = 50 // Base score
    
    // Compare with comp titles
    const compMatches = manuscript.comp_titles.filter(comp =>
      agent.recentSales.some(sale => 
        sale.title.toLowerCase().includes(comp.toLowerCase()) ||
        comp.toLowerCase().includes(sale.title.toLowerCase())
      )
    )
    score += compMatches.length * 15
    
    // Similar themes or styles in client list
    const themeMatches = agent.recentSales.filter(sale =>
      manuscript.themes.some(theme => 
        sale.title.toLowerCase().includes(theme.toLowerCase())
      )
    )
    score += themeMatches.length * 10
    
    // Client list diversity vs specialization
    const genreCount = new Set(agent.recentSales.map(s => s.genre)).size
    if (genreCount < 3 && agent.recentSales.some(s => s.genre === manuscript.genre)) {
      score += 20 // Specialist bonus
    } else if (genreCount > 5) {
      score += 10 // Generalist flexibility
    }
    
    return Math.min(100, score)
  }

  private calculateSubmissionPrefsMatch(manuscript: Manuscript, agent: AgentProfile): number {
    let score = 80 // Most manuscripts fit standard requirements
    
    const prefs = agent.submissionPreferences
    
    // Check if currently accepting queries
    if (!agent.currentlyAcceptingQueries) score -= 50
    
    // Word count appropriateness
    const wordCount = manuscript.word_count
    const genreRanges = this.getGenreWordCountRanges()
    const expectedRange = genreRanges[manuscript.genre] || [70000, 100000]
    
    if (wordCount < expectedRange[0] * 0.8 || wordCount > expectedRange[1] * 1.2) {
      score -= 20
    }
    
    // Series preference
    if (manuscript.series && !prefs.preferred_genres.includes('series')) {
      score -= 10
    }
    
    return Math.max(0, score)
  }

  private calculateActivityScore(agent: AgentProfile): number {
    const now = Date.now()
    const monthsAgo = now - (30 * 24 * 60 * 60 * 1000)
    const sixMonthsAgo = now - (180 * 24 * 60 * 60 * 1000)
    
    let score = 50
    
    // Recent sales activity
    const recentSales = agent.recentSales.filter(sale => sale.date > sixMonthsAgo)
    score += Math.min(30, recentSales.length * 10)
    
    // Last active date
    if (agent.lastActive > monthsAgo) score += 20
    else if (agent.lastActive > sixMonthsAgo) score += 10
    else score -= 20
    
    // Query acceptance status
    if (agent.currentlyAcceptingQueries) score += 20
    else score -= 30
    
    return Math.max(0, Math.min(100, score))
  }

  private calculateTimingScore(agent: AgentProfile): number {
    const now = new Date()
    const month = now.getMonth()
    const prefs = agent.submissionPreferences
    
    let score = 80 // Base good timing
    
    // Check seasonal closures
    const currentSeason = this.getCurrentSeason(month)
    if (prefs.seasonal_closures.includes(currentSeason)) {
      score -= 40
    }
    
    // Industry timing (avoid major holidays, summer slowdowns, etc.)
    const industrySlowMonths = [6, 7, 11] // July, August, December
    if (industrySlowMonths.includes(month)) {
      score -= 15
    }
    
    return Math.max(0, score)
  }

  // Find connections between manuscript and agent
  findCompTitleConnections(manuscript: Manuscript, agent: AgentProfile): Connection[] {
    const connections: Connection[] = []
    
    // Direct comp title matches
    manuscript.comp_titles.forEach(comp => {
      const matchingSales = agent.recentSales.filter(sale => 
        sale.title.toLowerCase().includes(comp.toLowerCase()) ||
        comp.toLowerCase().includes(sale.title.toLowerCase())
      )
      
      if (matchingSales.length > 0) {
        connections.push({
          type: 'comp_title',
          strength: 90,
          description: `Agent represented ${matchingSales[0].title}`,
          evidence: [`Recent sale: ${matchingSales[0].title} by ${matchingSales[0].author}`]
        })
      }
    })
    
    // Client work similarity
    const similarClientWork = agent.clientList.filter(client => {
      // This would use more sophisticated matching in practice
      return manuscript.themes.some(theme => client.toLowerCase().includes(theme.toLowerCase()))
    })
    
    if (similarClientWork.length > 0) {
      connections.push({
        type: 'client_work',
        strength: 75,
        description: `Represents authors in similar themes`,
        evidence: similarClientWork.slice(0, 3)
      })
    }
    
    // Genre specialty
    if (agent.genres.includes(manuscript.genre)) {
      const genreExperience = agent.recentSales.filter(s => s.genre === manuscript.genre).length
      connections.push({
        type: 'genre_specialty',
        strength: Math.min(90, 50 + genreExperience * 10),
        description: `Specializes in ${manuscript.genre}`,
        evidence: [`${genreExperience} recent ${manuscript.genre} sales`]
      })
    }
    
    return connections.sort((a, b) => b.strength - a.strength)
  }

  // Recommend optimal submission timing
  recommendSubmissionTiming(agent: AgentProfile): SubmissionTiming {
    const now = Date.now()
    const nextWeek = now + (7 * 24 * 60 * 60 * 1000)
    const nextMonth = now + (30 * 24 * 60 * 60 * 1000)
    
    let recommendedDate = nextWeek
    let rationale = 'Standard submission timing'
    const alternatives: number[] = []
    const seasonalFactors: string[] = []
    const agentFactors: string[] = []
    
    // Check agent's response patterns
    const avgResponseTime = agent.responseTime
    if (avgResponseTime > 60) { // More than 2 months
      agentFactors.push('Agent has slower response times - expect longer wait')
    }
    
    // Seasonal considerations
    const currentMonth = new Date().getMonth()
    if ([5, 6, 7].includes(currentMonth)) { // June, July, August
      seasonalFactors.push('Summer slowdown period - responses may be delayed')
      recommendedDate = now + (14 * 24 * 60 * 60 * 1000) // Wait 2 weeks
      rationale = 'Account for summer publishing slowdown'
    }
    
    if ([10, 11].includes(currentMonth)) { // November, December
      seasonalFactors.push('Holiday season - many agents have limited availability')
      recommendedDate = now + (45 * 24 * 60 * 60 * 1000) // Wait until January
      rationale = 'Avoid holiday season submission slowdown'
    }
    
    // Agent-specific factors
    if (!agent.currentlyAcceptingQueries) {
      recommendedDate = now + (60 * 24 * 60 * 60 * 1000) // Wait 2 months
      rationale = 'Agent currently closed to queries'
      agentFactors.push('Check agent website for query reopening date')
    }
    
    alternatives.push(nextWeek, nextMonth, now + (90 * 24 * 60 * 60 * 1000))
    
    return {
      recommended_date: recommendedDate,
      rationale,
      alternative_dates: alternatives,
      seasonal_factors: seasonalFactors,
      agent_specific_factors: agentFactors
    }
  }

  // Search and filter agents
  searchAgents(criteria: {
    genres?: string[]
    age_categories?: string[]
    experience_levels?: string[]
    currently_accepting?: boolean
    response_time_max?: number
    success_rate_min?: number
  }): AgentProfile[] {
    return this.agents.filter(agent => {
      if (criteria.genres && !criteria.genres.some(g => agent.genres.includes(g))) {
        return false
      }
      
      if (criteria.age_categories && !criteria.age_categories.some(ac => agent.age_categories.includes(ac as any))) {
        return false
      }
      
      if (criteria.experience_levels && !criteria.experience_levels.includes(agent.careerLevel)) {
        return false
      }
      
      if (criteria.currently_accepting === true && !agent.currentlyAcceptingQueries) {
        return false
      }
      
      if (criteria.response_time_max && agent.responseTime > criteria.response_time_max) {
        return false
      }
      
      if (criteria.success_rate_min && agent.clientSuccessRate < criteria.success_rate_min) {
        return false
      }
      
      return true
    })
  }

  // Get top matches for a manuscript
  findTopMatches(manuscript: Manuscript, limit: number = 20): Array<{ agent: AgentProfile; match: MatchScore; connections: Connection[] }> {
    const matches = this.agents
      .filter(agent => agent.currentlyAcceptingQueries)
      .map(agent => ({
        agent,
        match: this.scoreAgentMatch(manuscript, agent),
        connections: this.findCompTitleConnections(manuscript, agent)
      }))
      .sort((a, b) => b.match.overall - a.match.overall)
      .slice(0, limit)
    
    return matches
  }

  // Helper methods
  private getAdjacentGenres(genre: string): string[] {
    const adjacentMap: { [key: string]: string[] } = {
      'Literary Fiction': ['Upmarket Fiction', 'Book Club Fiction', 'Contemporary Fiction'],
      'Commercial Fiction': ['Upmarket Fiction', 'Women\'s Fiction', 'Contemporary Fiction'],
      'Fantasy': ['Science Fiction', 'Paranormal', 'Urban Fantasy'],
      'Science Fiction': ['Fantasy', 'Dystopian', 'Speculative Fiction'],
      'Romance': ['Women\'s Fiction', 'Contemporary Fiction', 'Romantic Suspense'],
      'Mystery': ['Thriller', 'Suspense', 'Crime'],
      'Thriller': ['Mystery', 'Suspense', 'Action']
    }
    
    return adjacentMap[genre] || []
  }

  private getGenreWordCountRanges(): { [key: string]: [number, number] } {
    return {
      'Literary Fiction': [70000, 100000],
      'Commercial Fiction': [80000, 120000],
      'Fantasy': [90000, 150000],
      'Science Fiction': [90000, 140000],
      'Romance': [50000, 100000],
      'Mystery': [70000, 100000],
      'Thriller': [80000, 120000],
      'Women\'s Fiction': [80000, 110000],
      'Young Adult': [60000, 90000],
      'Middle Grade': [30000, 60000]
    }
  }

  private getCurrentSeason(month: number): string {
    if ([2, 3, 4].includes(month)) return 'spring'
    if ([5, 6, 7].includes(month)) return 'summer'
    if ([8, 9, 10].includes(month)) return 'fall'
    return 'winter'
  }

  // Database management
  private loadAgentDatabase(): void {
    // In a real implementation, this would load from API or local storage
    this.agents = this.getSampleAgents()
  }

  updateAgent(agent: AgentProfile): void {
    const index = this.agents.findIndex(a => a.id === agent.id)
    if (index >= 0) {
      this.agents[index] = { ...agent, lastUpdated: Date.now() }
    } else {
      this.agents.push(agent)
    }
  }

  private getSampleAgents(): AgentProfile[] {
    // Sample data - in production this would come from a real database
    return [
      {
        id: 'agent_1',
        name: 'Sarah Johnson',
        agency: 'Literary Dreams Agency',
        bio: 'Specializes in literary and upmarket fiction with strong character development.',
        experience_years: 8,
        genres: ['Literary Fiction', 'Upmarket Fiction', 'Book Club Fiction'],
        subgenres: ['Contemporary Literary', 'Historical Literary', 'Multigenerational Saga'],
        age_categories: ['adult'],
        clientList: ['Emma Patterson', 'Michael Chen', 'Sofia Rodriguez'],
        notableClients: ['Emma Patterson (Bestselling Author)'],
        recentSales: [
          {
            title: 'The Garden of Memory',
            author: 'Emma Patterson',
            publisher: 'Random House',
            date: Date.now() - 60 * 24 * 60 * 60 * 1000,
            genre: 'Literary Fiction',
            deal_type: 'established'
          }
        ],
        responseTime: 30,
        responseRate: 0.85,
        successRate: 0.15,
        careerLevel: 'established',
        clientSuccessRate: 0.75,
        totalBooksSold: 42,
        wishlistKeywords: ['family saga', 'immigrant experience', 'mother-daughter relationships'],
        personalityTags: ['nurturing', 'detail-oriented', 'literary-focused'],
        communicationStyle: 'nurturing',
        submissionPreferences: {
          format: 'email',
          query_only: true,
          sample_pages: 5,
          synopsis_required: false,
          response_time: 30,
          no_response_means_no: false,
          preferred_genres: ['Literary Fiction', 'Upmarket Fiction'],
          not_seeking: ['Fantasy', 'Science Fiction'],
          seasonal_closures: ['summer']
        },
        lastActive: Date.now() - 7 * 24 * 60 * 60 * 1000,
        currentlyAcceptingQueries: true,
        manuscriptWishlist: [
          'Stories exploring cultural identity',
          'Multi-generational family narratives',
          'Literary fiction with commercial appeal'
        ],
        twitter: '@SarahLitAgent',
        addedDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
        lastUpdated: Date.now() - 7 * 24 * 60 * 60 * 1000,
        dataSource: 'manual'
      }
    ]
  }

  getAgentById(id: string): AgentProfile | undefined {
    return this.agents.find(agent => agent.id === id)
  }

  getAllAgents(): AgentProfile[] {
    return [...this.agents]
  }

  getAgentStats(): {
    total: number
    accepting_queries: number
    by_career_level: { [key: string]: number }
    by_genre: { [key: string]: number }
  } {
    return {
      total: this.agents.length,
      accepting_queries: this.agents.filter(a => a.currentlyAcceptingQueries).length,
      by_career_level: this.agents.reduce((acc, agent) => {
        acc[agent.careerLevel] = (acc[agent.careerLevel] || 0) + 1
        return acc
      }, {} as { [key: string]: number }),
      by_genre: this.agents.reduce((acc, agent) => {
        agent.genres.forEach(genre => {
          acc[genre] = (acc[genre] || 0) + 1
        })
        return acc
      }, {} as { [key: string]: number })
    }
  }
}

// Singleton instance
export const agentMatcher = new AgentMatcher()
export default agentMatcher