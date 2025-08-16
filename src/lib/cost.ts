/**
 * Cost Tracking and Budget Management System
 * Handles token estimation, cost calculation, and budget enforcement
 */

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface CostBreakdown {
  promptCost: number
  completionCost: number
  totalCost: number
  model: string
  timestamp: number
}

export interface BudgetAlert {
  type: 'warning' | 'critical' | 'exceeded'
  message: string
  currentUsage: number
  limit: number
  percentage: number
}

/**
 * Rough token estimation from character count
 * More accurate than simple division by 4 for different text types
 */
export function roughTokens(chars: number, textType: 'prose' | 'dialogue' | 'technical' = 'prose'): number {
  // Different text types have different token densities
  const ratios = {
    prose: 4.2,      // Standard narrative text
    dialogue: 3.8,   // Dialogue tends to be more token-dense
    technical: 4.8   // Technical text has longer words
  }
  
  return Math.ceil(chars / ratios[textType])
}

/**
 * Estimate tokens more accurately based on content analysis
 */
export function estimateTokens(text: string): TokenUsage {
  const chars = text.length
  
  // Analyze text type
  const dialogueRatio = (text.match(/"/g) || []).length / chars
  const technicalRatio = (text.match(/\b[A-Z]{2,}|[a-z]+(?:ing|tion|sion)\b/g) || []).length / text.split(/\s+/).length
  
  let textType: 'prose' | 'dialogue' | 'technical' = 'prose'
  if (dialogueRatio > 0.05) textType = 'dialogue'
  else if (technicalRatio > 0.3) textType = 'technical'
  
  const promptTokens = roughTokens(chars, textType)
  
  // Completion tokens are typically 20-50% of prompt tokens for analysis tasks
  const completionTokens = Math.ceil(promptTokens * 0.35)
  
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens
  }
}

/**
 * Model pricing configuration
 */
export const MODEL_PRICING = {
  'gpt-4': {
    promptPrice: 0.03,      // per 1K tokens
    completionPrice: 0.06   // per 1K tokens
  },
  'gpt-4-turbo': {
    promptPrice: 0.01,
    completionPrice: 0.03
  },
  'gpt-3.5-turbo': {
    promptPrice: 0.001,
    completionPrice: 0.002
  },
  'claude-3-sonnet': {
    promptPrice: 0.003,
    completionPrice: 0.015
  },
  'claude-3-haiku': {
    promptPrice: 0.00025,
    completionPrice: 0.00125
  }
} as const

export type ModelName = keyof typeof MODEL_PRICING

/**
 * Calculate cost for token usage
 */
export function calculateCost(usage: TokenUsage, model: ModelName): CostBreakdown {
  const pricing = MODEL_PRICING[model]
  const promptCost = (usage.promptTokens / 1000) * pricing.promptPrice
  const completionCost = (usage.completionTokens / 1000) * pricing.completionPrice
  
  return {
    promptCost,
    completionCost,
    totalCost: promptCost + completionCost,
    model,
    timestamp: Date.now()
  }
}

/**
 * Enhanced Budget class with alerts and persistence
 */
export class Budget {
  private usedUSD = 0
  private transactions: CostBreakdown[] = []
  private alertThresholds = [0.8, 0.95] // 80% and 95% warnings
  private lastAlertLevel = 0
  
  constructor(
    private usdCap: number,
    private name: string = 'default'
  ) {
    this.loadFromStorage()
  }
  
  /**
   * Charge the budget for a transaction
   */
  charge(cost: CostBreakdown): BudgetAlert | null {
    this.usedUSD += cost.totalCost
    this.transactions.push(cost)
    this.saveToStorage()
    
    return this.checkForAlerts()
  }
  
  /**
   * Check if a charge would exceed budget without actually charging
   */
  canAfford(estimatedCost: number): boolean {
    return (this.usedUSD + estimatedCost) <= this.usdCap
  }
  
  /**
   * Get remaining budget
   */
  getRemaining(): number {
    return Math.max(0, this.usdCap - this.usedUSD)
  }
  
  /**
   * Get used amount
   */
  getUsed(): number {
    return this.usedUSD
  }
  
  /**
   * Get usage percentage
   */
  getUsagePercentage(): number {
    return (this.usedUSD / this.usdCap) * 100
  }
  
  /**
   * Get transaction history
   */
  getTransactions(): CostBreakdown[] {
    return [...this.transactions]
  }
  
  /**
   * Get spending by model
   */
  getSpendingByModel(): Record<string, number> {
    return this.transactions.reduce((acc, transaction) => {
      acc[transaction.model] = (acc[transaction.model] || 0) + transaction.totalCost
      return acc
    }, {} as Record<string, number>)
  }
  
  /**
   * Get spending by time period
   */
  getSpendingByPeriod(hours: number = 24): number {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    return this.transactions
      .filter(t => t.timestamp > cutoff)
      .reduce((sum, t) => sum + t.totalCost, 0)
  }
  
  /**
   * Reset budget
   */
  reset(): void {
    this.usedUSD = 0
    this.transactions = []
    this.lastAlertLevel = 0
    this.saveToStorage()
  }
  
  /**
   * Set new budget cap
   */
  setCap(newCap: number): void {
    this.usdCap = newCap
    this.saveToStorage()
  }
  
  /**
   * Check for budget alerts
   */
  private checkForAlerts(): BudgetAlert | null {
    const percentage = this.getUsagePercentage()
    
    if (percentage >= 100) {
      return {
        type: 'exceeded',
        message: 'Budget exceeded! All processing has been stopped.',
        currentUsage: this.usedUSD,
        limit: this.usdCap,
        percentage
      }
    }
    
    for (let i = this.alertThresholds.length - 1; i >= 0; i--) {
      const threshold = this.alertThresholds[i]
      if (percentage >= threshold * 100 && i >= this.lastAlertLevel) {
        this.lastAlertLevel = i + 1
        return {
          type: i === this.alertThresholds.length - 1 ? 'critical' : 'warning',
          message: `Budget ${Math.round(threshold * 100)}% used. Remaining: $${this.getRemaining().toFixed(4)}`,
          currentUsage: this.usedUSD,
          limit: this.usdCap,
          percentage
        }
      }
    }
    
    return null
  }
  
  /**
   * Save budget state to localStorage
   */
  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      const data = {
        usedUSD: this.usedUSD,
        transactions: this.transactions.slice(-100), // Keep last 100 transactions
        lastAlertLevel: this.lastAlertLevel,
        usdCap: this.usdCap
      }
      localStorage.setItem(`budget-${this.name}`, JSON.stringify(data))
    }
  }
  
  /**
   * Load budget state from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(`budget-${this.name}`)
      if (data) {
        try {
          const parsed = JSON.parse(data)
          this.usedUSD = parsed.usedUSD || 0
          this.transactions = parsed.transactions || []
          this.lastAlertLevel = parsed.lastAlertLevel || 0
          // Don't override constructor cap unless it's missing
          if (parsed.usdCap && !this.usdCap) {
            this.usdCap = parsed.usdCap
          }
        } catch (error) {
          console.warn('Failed to load budget from storage:', error)
        }
      }
    }
  }
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private requests: number[] = []
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  /**
   * Check if request is allowed
   */
  isAllowed(): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs
    
    // Remove old requests
    this.requests = this.requests.filter(time => time > windowStart)
    
    // Check if we're under the limit
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now)
      return true
    }
    
    return false
  }
  
  /**
   * Get time until next request is allowed (in ms)
   */
  getRetryAfter(): number {
    if (this.requests.length === 0) return 0
    
    const oldestRequest = Math.min(...this.requests)
    const windowStart = Date.now() - this.windowMs
    
    if (oldestRequest <= windowStart) return 0
    
    return oldestRequest + this.windowMs - Date.now()
  }
  
  /**
   * Get current usage stats
   */
  getStats(): { current: number; max: number; resetTime: number } {
    const now = Date.now()
    const windowStart = now - this.windowMs
    this.requests = this.requests.filter(time => time > windowStart)
    
    return {
      current: this.requests.length,
      max: this.maxRequests,
      resetTime: this.requests.length > 0 ? Math.min(...this.requests) + this.windowMs : now
    }
  }
  
  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = []
  }
}

/**
 * Pre-configured rate limiters for different services
 */
export const RATE_LIMITERS = {
  openai: new RateLimiter(60, 60000),      // 60 requests per minute
  anthropic: new RateLimiter(50, 60000),   // 50 requests per minute
  local: new RateLimiter(10, 1000),        // 10 requests per second for local models
} as const

/**
 * Cost estimation for different analysis types
 */
export const ANALYSIS_COSTS = {
  events: { baseTokens: 150, multiplier: 1.2 },
  plants: { baseTokens: 200, multiplier: 1.4 },
  state: { baseTokens: 180, multiplier: 1.3 },
  beats: { baseTokens: 120, multiplier: 1.1 },
  full_analysis: { baseTokens: 500, multiplier: 2.0 }
} as const

/**
 * Estimate cost for an analysis task
 */
export function estimateAnalysisCost(
  sceneLength: number,
  analysisType: keyof typeof ANALYSIS_COSTS,
  model: ModelName
): { estimatedCost: number; tokenUsage: TokenUsage } {
  const config = ANALYSIS_COSTS[analysisType]
  const sceneTokens = estimateTokens('x'.repeat(sceneLength))
  
  const totalPromptTokens = sceneTokens.promptTokens + config.baseTokens
  const totalCompletionTokens = Math.ceil(sceneTokens.completionTokens * config.multiplier)
  
  const tokenUsage: TokenUsage = {
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
    totalTokens: totalPromptTokens + totalCompletionTokens
  }
  
  const costBreakdown = calculateCost(tokenUsage, model)
  
  return {
    estimatedCost: costBreakdown.totalCost,
    tokenUsage
  }
}

export default Budget