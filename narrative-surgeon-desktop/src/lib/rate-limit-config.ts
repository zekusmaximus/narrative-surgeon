/**
 * Rate Limiting Configuration and Monitoring
 * Centralized configuration for different LLM providers and monitoring
 */

import { RateLimiter } from './cost'

export interface ProviderConfig {
  name: string
  maxRequestsPerMinute: number
  maxConcurrent: number
  costPerToken: {
    prompt: number
    completion: number
  }
  maxTokensPerRequest: number
  retryPolicy: {
    maxRetries: number
    backoffMultiplier: number
    baseDelayMs: number
  }
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  'openai-gpt4': {
    name: 'OpenAI GPT-4',
    maxRequestsPerMinute: 60,
    maxConcurrent: 3,
    costPerToken: {
      prompt: 0.00003,
      completion: 0.00006
    },
    maxTokensPerRequest: 8192,
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      baseDelayMs: 1000
    }
  },
  'openai-gpt4-turbo': {
    name: 'OpenAI GPT-4 Turbo',
    maxRequestsPerMinute: 100,
    maxConcurrent: 5,
    costPerToken: {
      prompt: 0.00001,
      completion: 0.00003
    },
    maxTokensPerRequest: 128000,
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      baseDelayMs: 500
    }
  },
  'openai-gpt3.5': {
    name: 'OpenAI GPT-3.5 Turbo',
    maxRequestsPerMinute: 200,
    maxConcurrent: 10,
    costPerToken: {
      prompt: 0.000001,
      completion: 0.000002
    },
    maxTokensPerRequest: 16385,
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 1.5,
      baseDelayMs: 250
    }
  },
  'anthropic-claude3-sonnet': {
    name: 'Anthropic Claude 3 Sonnet',
    maxRequestsPerMinute: 50,
    maxConcurrent: 3,
    costPerToken: {
      prompt: 0.000003,
      completion: 0.000015
    },
    maxTokensPerRequest: 200000,
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      baseDelayMs: 1000
    }
  },
  'anthropic-claude3-haiku': {
    name: 'Anthropic Claude 3 Haiku',
    maxRequestsPerMinute: 100,
    maxConcurrent: 5,
    costPerToken: {
      prompt: 0.00000025,
      completion: 0.00000125
    },
    maxTokensPerRequest: 200000,
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 1.5,
      baseDelayMs: 500
    }
  },
  'local-model': {
    name: 'Local Model',
    maxRequestsPerMinute: 600, // Much higher for local
    maxConcurrent: 1, // Usually single GPU
    costPerToken: {
      prompt: 0, // No cost for local
      completion: 0
    },
    maxTokensPerRequest: 4096,
    retryPolicy: {
      maxRetries: 2,
      backoffMultiplier: 1,
      baseDelayMs: 100
    }
  }
}

export class RateLimitManager {
  private limiters: Map<string, RateLimiter> = new Map()
  private configs: Map<string, ProviderConfig> = new Map()
  
  constructor() {
    // Initialize rate limiters for all providers
    Object.entries(PROVIDER_CONFIGS).forEach(([key, config]) => {
      this.configs.set(key, config)
      this.limiters.set(key, new RateLimiter(
        config.maxRequestsPerMinute,
        60000 // 1 minute window
      ))
    })
  }

  /**
   * Check if a request is allowed for a specific provider
   */
  isAllowed(provider: string): boolean {
    const limiter = this.limiters.get(provider)
    if (!limiter) {
      console.warn(`No rate limiter found for provider: ${provider}`)
      return true // Allow unknown providers
    }
    return limiter.isAllowed()
  }

  /**
   * Get retry delay for a provider
   */
  getRetryAfter(provider: string): number {
    const limiter = this.limiters.get(provider)
    return limiter?.getRetryAfter() || 0
  }

  /**
   * Get current stats for a provider
   */
  getProviderStats(provider: string) {
    const limiter = this.limiters.get(provider)
    const config = this.configs.get(provider)
    
    if (!limiter || !config) {
      return null
    }

    const stats = limiter.getStats()
    
    return {
      provider: config.name,
      current: stats.current,
      max: stats.max,
      resetTime: stats.resetTime,
      utilizationPercent: (stats.current / stats.max) * 100,
      config
    }
  }

  /**
   * Get stats for all providers
   */
  getAllProviderStats() {
    const allStats: any[] = []
    
    this.configs.forEach((config, provider) => {
      const stats = this.getProviderStats(provider)
      if (stats) {
        allStats.push({ ...stats, providerId: provider })
      }
    })
    
    return allStats
  }

  /**
   * Reset rate limiter for a specific provider
   */
  resetProvider(provider: string): void {
    const limiter = this.limiters.get(provider)
    limiter?.reset()
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    this.limiters.forEach(limiter => limiter.reset())
  }

  /**
   * Add or update a provider configuration
   */
  addProvider(id: string, config: ProviderConfig): void {
    this.configs.set(id, config)
    this.limiters.set(id, new RateLimiter(
      config.maxRequestsPerMinute,
      60000
    ))
  }

  /**
   * Remove a provider
   */
  removeProvider(id: string): void {
    this.configs.delete(id)
    this.limiters.delete(id)
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(provider: string): ProviderConfig | null {
    return this.configs.get(provider) || null
  }

  /**
   * Calculate optimal batch size for a provider based on rate limits
   */
  getOptimalBatchSize(provider: string, timeWindowMs: number = 60000): number {
    const config = this.configs.get(provider)
    if (!config) return 1

    const windowMinutes = timeWindowMs / 60000
    const maxRequests = config.maxRequestsPerMinute * windowMinutes
    
    // Leave some buffer (80% of max)
    return Math.floor(Math.min(maxRequests * 0.8, config.maxConcurrent))
  }

  /**
   * Get recommended delay between requests for a provider
   */
  getRecommendedDelay(provider: string): number {
    const config = this.configs.get(provider)
    if (!config) return 1000

    // Spread requests evenly across the minute
    return (60000 / config.maxRequestsPerMinute) * 1.1 // 10% buffer
  }

  /**
   * Check if provider supports batch processing efficiently
   */
  supportsBatching(provider: string): boolean {
    const config = this.configs.get(provider)
    if (!config) return false

    return config.maxConcurrent > 1 && config.maxRequestsPerMinute > 30
  }

  /**
   * Get cost estimation for a provider
   */
  estimateProviderCost(provider: string, promptTokens: number, completionTokens: number): number {
    const config = this.configs.get(provider)
    if (!config) return 0

    return (promptTokens * config.costPerToken.prompt) + 
           (completionTokens * config.costPerToken.completion)
  }

  /**
   * Find the most cost-effective provider for a given task
   */
  findCostEffectiveProvider(promptTokens: number, completionTokens: number): {
    provider: string
    cost: number
    config: ProviderConfig
  } | null {
    let bestOption: { provider: string; cost: number; config: ProviderConfig } | null = null

    this.configs.forEach((config, provider) => {
      // Skip local models for cost comparison (they're always cheapest)
      if (provider === 'local-model') return

      const cost = this.estimateProviderCost(provider, promptTokens, completionTokens)
      
      if (!bestOption || cost < bestOption.cost) {
        bestOption = { provider, cost, config }
      }
    })

    return bestOption
  }

  /**
   * Get health status of all providers
   */
  getSystemHealth(): {
    healthy: string[]
    rateLimited: string[]
    issues: string[]
    overall: 'healthy' | 'degraded' | 'critical'
  } {
    const healthy: string[] = []
    const rateLimited: string[] = []
    const issues: string[] = []

    this.configs.forEach((config, provider) => {
      const stats = this.getProviderStats(provider)
      if (!stats) {
        issues.push(provider)
        return
      }

      if (stats.utilizationPercent > 90) {
        rateLimited.push(provider)
      } else if (stats.utilizationPercent > 70) {
        // Still healthy but getting busy
        healthy.push(provider)
      } else {
        healthy.push(provider)
      }
    })

    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy'
    if (issues.length > 0 || rateLimited.length > healthy.length) {
      overall = 'critical'
    } else if (rateLimited.length > 0) {
      overall = 'degraded'
    }

    return { healthy, rateLimited, issues, overall }
  }
}

// Global rate limit manager instance
export const globalRateLimitManager = new RateLimitManager()

export default RateLimitManager