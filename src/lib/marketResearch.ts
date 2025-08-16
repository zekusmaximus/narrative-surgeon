/**
 * Market Research and Industry Intelligence System
 * Provides competitive analysis, sales data, genre trends, and market positioning
 */

export interface BookSale {
  title: string
  author: string
  publisher: string
  genre: string
  subgenres: string[]
  publication_date: string
  sale_date?: string
  advance_estimate?: string
  rights_sold: string[]
  comp_titles?: string[]
  agent?: string
  editor?: string
  deal_notes?: string
}

export interface GenreTrend {
  genre: string
  subgenres: string[]
  trend_direction: 'rising' | 'stable' | 'declining'
  popularity_score: number
  market_saturation: number
  average_advance: string
  top_publishers: string[]
  key_themes: string[]
  seasonal_patterns: SeasonalPattern[]
  demographics: MarketDemographics
  recent_breakouts: BookSale[]
}

export interface SeasonalPattern {
  season: 'spring' | 'summer' | 'fall' | 'winter'
  publishing_volume: number
  sales_performance: number
  marketing_themes: string[]
}

export interface MarketDemographics {
  primary_age_groups: string[]
  gender_distribution: { male: number; female: number; other: number }
  reading_platforms: { print: number; ebook: number; audiobook: number }
  purchase_drivers: string[]
}

export interface CompetitiveAnalysis {
  similar_books: BookSale[]
  market_position: 'oversaturated' | 'competitive' | 'underserved' | 'emerging'
  differentiation_opportunities: string[]
  pricing_recommendations: {
    advance_range: string
    retail_price_range: string
    marketing_budget_estimate: string
  }
  timing_recommendations: {
    ideal_submission_window: string
    publication_timing: string
    market_readiness_score: number
  }
}

export interface MarketIntelligence {
  publisher_preferences: PublisherProfile[]
  agent_deal_history: AgentDealHistory[]
  industry_events: IndustryEvent[]
  acquisition_trends: AcquisitionTrend[]
  international_markets: InternationalMarket[]
}

export interface PublisherProfile {
  name: string
  imprints: string[]
  preferred_genres: string[]
  typical_advances: { min: string; max: string; average: string }
  recent_acquisitions: BookSale[]
  submission_preferences: {
    agent_only: boolean
    seasonal_focus: string[]
    list_size_limits: number
  }
  market_position: 'big_five' | 'independent' | 'university' | 'specialty'
}

export interface AgentDealHistory {
  agent_name: string
  agency: string
  recent_deals: BookSale[]
  specialties: string[]
  average_deal_size: string
  publisher_relationships: string[]
  success_metrics: {
    deal_frequency: number
    advance_growth: number
    client_retention: number
  }
}

export interface IndustryEvent {
  name: string
  date: string
  location: string
  type: 'conference' | 'book_fair' | 'pitch_event' | 'networking'
  relevance_score: number
  attendee_types: string[]
  opportunities: string[]
}

export interface AcquisitionTrend {
  trend_name: string
  description: string
  affected_genres: string[]
  market_impact: 'positive' | 'negative' | 'neutral'
  timeline: string
  key_players: string[]
  opportunities: string[]
}

export interface InternationalMarket {
  country: string
  market_size: string
  preferred_genres: string[]
  translation_demand: number
  rights_opportunities: string[]
  cultural_preferences: string[]
}

export interface MarketResearchOptions {
  manuscript_genre: string
  manuscript_subgenres: string[]
  target_audience: string
  comparable_titles: string[]
  budget_range?: 'debut' | 'mid_list' | 'lead_title'
  publication_timeline?: string
  international_interest?: boolean
}

export class MarketResearcher {
  private salesDatabase: BookSale[] = []
  private genreTrends: Map<string, GenreTrend> = new Map()
  private publisherProfiles: Map<string, PublisherProfile> = new Map()
  private agentDealHistory: Map<string, AgentDealHistory> = new Map()

  constructor() {
    this.initializeMockData()
  }

  private initializeMockData() {
    // Mock recent sales data
    this.salesDatabase = [
      {
        title: "The Seven Husbands of Evelyn Hugo",
        author: "Taylor Jenkins Reid",
        publisher: "Atria Books",
        genre: "Contemporary Fiction",
        subgenres: ["Women's Fiction", "LGBTQ+", "Hollywood"],
        publication_date: "2017-06-13",
        sale_date: "2016-03-15",
        advance_estimate: "$50,000 - $100,000",
        rights_sold: ["Film", "International", "Audio"],
        agent: "Brad Mendelsohn",
        deal_notes: "Multi-book deal, film rights optioned pre-publication"
      },
      {
        title: "The Thursday Murder Club",
        author: "Richard Osman",
        publisher: "Viking",
        genre: "Mystery",
        subgenres: ["Cozy Mystery", "Senior Fiction", "British"],
        publication_date: "2020-09-03",
        sale_date: "2019-08-12",
        advance_estimate: "$250,000+",
        rights_sold: ["International", "Audio", "TV"],
        agent: "Juliet Mushens",
        deal_notes: "Record-breaking debut advance for cozy mystery"
      }
    ]

    // Mock genre trends
    this.genreTrends.set("Literary Fiction", {
      genre: "Literary Fiction",
      subgenres: ["Contemporary", "Historical", "Experimental", "Multicultural"],
      trend_direction: "stable",
      popularity_score: 75,
      market_saturation: 85,
      average_advance: "$25,000 - $75,000",
      top_publishers: ["Random House", "FSG", "Knopf", "Norton", "Graywolf"],
      key_themes: ["Identity", "Immigration", "Climate Change", "Social Justice", "Mental Health"],
      seasonal_patterns: [
        {
          season: "fall",
          publishing_volume: 40,
          sales_performance: 35,
          marketing_themes: ["Awards season", "Book clubs", "Literary prizes"]
        }
      ],
      demographics: {
        primary_age_groups: ["35-54", "55+"],
        gender_distribution: { male: 40, female: 58, other: 2 },
        reading_platforms: { print: 65, ebook: 25, audiobook: 10 },
        purchase_drivers: ["Reviews", "Awards", "Author reputation", "Book clubs"]
      },
      recent_breakouts: []
    })

    // Mock publisher profiles
    this.publisherProfiles.set("Random House", {
      name: "Random House",
      imprints: ["Bantam", "Crown", "Doubleday", "Knopf"],
      preferred_genres: ["Literary Fiction", "Commercial Fiction", "Biography", "History"],
      typical_advances: { min: "$10,000", max: "$1,000,000+", average: "$75,000" },
      recent_acquisitions: [],
      submission_preferences: {
        agent_only: true,
        seasonal_focus: ["Fall", "Spring"],
        list_size_limits: 50
      },
      market_position: "big_five"
    })
  }

  async conductMarketResearch(options: MarketResearchOptions): Promise<{
    competitive_analysis: CompetitiveAnalysis
    genre_trends: GenreTrend
    market_intelligence: MarketIntelligence
    recommendations: MarketRecommendations
  }> {
    const [
      competitive_analysis,
      genre_trends,
      market_intelligence,
      recommendations
    ] = await Promise.all([
      this.analyzeCompetition(options),
      this.analyzeGenreTrends(options.manuscript_genre),
      this.gatherMarketIntelligence(options),
      this.generateRecommendations(options)
    ])

    return {
      competitive_analysis,
      genre_trends,
      market_intelligence,
      recommendations
    }
  }

  private async analyzeCompetition(options: MarketResearchOptions): Promise<CompetitiveAnalysis> {
    const similar_books = this.findSimilarBooks(options)
    const market_position = this.assessMarketPosition(options.manuscript_genre, similar_books)
    
    return {
      similar_books,
      market_position,
      differentiation_opportunities: [
        "Unique perspective on established themes",
        "Underrepresented voice in genre",
        "Cross-genre appeal potential",
        "Timely cultural relevance"
      ],
      pricing_recommendations: {
        advance_range: this.estimateAdvanceRange(options),
        retail_price_range: "$16.99 - $27.99",
        marketing_budget_estimate: "$5,000 - $15,000"
      },
      timing_recommendations: {
        ideal_submission_window: "September - November",
        publication_timing: "Fall 2025",
        market_readiness_score: 78
      }
    }
  }

  private findSimilarBooks(options: MarketResearchOptions): BookSale[] {
    return this.salesDatabase
      .filter(book => 
        book.genre === options.manuscript_genre ||
        book.subgenres.some(sub => options.manuscript_subgenres.includes(sub))
      )
      .slice(0, 10)
  }

  private assessMarketPosition(_genre: string, similarBooks: BookSale[]): CompetitiveAnalysis['market_position'] {
    const bookCount = similarBooks.length
    if (bookCount > 20) return 'oversaturated'
    if (bookCount > 10) return 'competitive'
    if (bookCount > 5) return 'underserved'
    return 'emerging'
  }

  private estimateAdvanceRange(options: MarketResearchOptions): string {
    const basedOnBudget = {
      'debut': '$5,000 - $25,000',
      'mid_list': '$25,000 - $100,000',
      'lead_title': '$100,000+'
    }
    return basedOnBudget[options.budget_range || 'debut']
  }

  private async analyzeGenreTrends(genre: string): Promise<GenreTrend> {
    return this.genreTrends.get(genre) || {
      genre,
      subgenres: [],
      trend_direction: 'stable',
      popularity_score: 50,
      market_saturation: 50,
      average_advance: "Data not available",
      top_publishers: [],
      key_themes: [],
      seasonal_patterns: [],
      demographics: {
        primary_age_groups: [],
        gender_distribution: { male: 50, female: 50, other: 0 },
        reading_platforms: { print: 60, ebook: 30, audiobook: 10 },
        purchase_drivers: []
      },
      recent_breakouts: []
    }
  }

  private async gatherMarketIntelligence(options: MarketResearchOptions): Promise<MarketIntelligence> {
    return {
      publisher_preferences: Array.from(this.publisherProfiles.values())
        .filter(pub => pub.preferred_genres.includes(options.manuscript_genre))
        .slice(0, 10),
      agent_deal_history: Array.from(this.agentDealHistory.values())
        .slice(0, 10),
      industry_events: [
        {
          name: "BookExpo America",
          date: "2024-05-15",
          location: "New York, NY",
          type: "book_fair",
          relevance_score: 85,
          attendee_types: ["Publishers", "Agents", "Booksellers"],
          opportunities: ["Rights sales", "Networking", "Trend spotting"]
        }
      ],
      acquisition_trends: [
        {
          trend_name: "Climate Fiction Boom",
          description: "Increased interest in climate change narratives",
          affected_genres: ["Literary Fiction", "Science Fiction", "Young Adult"],
          market_impact: "positive",
          timeline: "2024-2026",
          key_players: ["Orbit", "Tor", "FSG"],
          opportunities: ["Environmental themes", "Solarpunk", "Climate solutions"]
        }
      ],
      international_markets: [
        {
          country: "United Kingdom",
          market_size: "Large",
          preferred_genres: ["Literary Fiction", "Mystery", "Historical Fiction"],
          translation_demand: 30,
          rights_opportunities: ["Commonwealth", "Audio", "Digital"],
          cultural_preferences: ["British humor", "Historical depth", "Social commentary"]
        }
      ]
    }
  }

  private async generateRecommendations(_options: MarketResearchOptions): Promise<MarketRecommendations> {
    return {
      positioning_strategy: "Position as literary fiction with commercial appeal",
      target_publishers: ["Knopf", "Scribner", "Little, Brown", "Riverhead"],
      timing_strategy: "Submit in fall for spring publication",
      marketing_angles: [
        "Timely cultural relevance",
        "Unique narrative voice",
        "Cross-demographic appeal",
        "Book club friendly"
      ],
      competitive_advantages: [
        "Fresh perspective on universal themes",
        "Strong character development",
        "Accessible prose style",
        "Social media potential"
      ],
      risk_factors: [
        "Market saturation in genre",
        "Seasonal competition",
        "First-time author challenges"
      ],
      success_probability: 72,
      next_steps: [
        "Refine query letter positioning",
        "Research specific agent preferences",
        "Develop marketing plan",
        "Build author platform"
      ]
    }
  }
}

export interface MarketRecommendations {
  positioning_strategy: string
  target_publishers: string[]
  timing_strategy: string
  marketing_angles: string[]
  competitive_advantages: string[]
  risk_factors: string[]
  success_probability: number
  next_steps: string[]
}

export const marketResearcher = new MarketResearcher()