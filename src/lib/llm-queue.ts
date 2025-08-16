/**
 * LLM Processing Queue
 * Manages queued LLM requests with rate limiting, cost tracking, and error handling
 */

import { Budget, RateLimiter, ModelName, calculateCost, estimateTokens, BudgetAlert, type TokenUsage, type CostBreakdown } from './cost'

export interface LLMRequest {
  id: string
  prompt: string
  scene_id?: string
  module?: string
  max_tokens?: number
  temperature?: number
  priority?: 'low' | 'normal' | 'high'
  model?: ModelName
  estimated_cost?: number
  estimated_tokens?: TokenUsage
  created_at: number
  retries: number
}

export interface LLMResponse {
  id: string
  result: any
  success: boolean
  error?: string
  actual_tokens?: TokenUsage
  cost_breakdown?: CostBreakdown
  processing_time: number
  completed_at: number
  budget_alert?: BudgetAlert
}

export interface QueueStatus {
  pending: number
  processing: number
  completed: number
  failed: number
  total_tokens_used: number
  total_cost: number
  average_processing_time: number
  rate_limit_status: {
    current: number
    max: number
    resetTime: number
  }
  budget_status: {
    used: number
    remaining: number
    percentage: number
  }
}

export class LLMQueue {
  private queue: LLMRequest[] = []
  private processing: Map<string, LLMRequest> = new Map()
  private completed: Map<string, LLMResponse> = new Map()
  private failed: Map<string, LLMResponse> = new Map()
  
  private isProcessing = false
  private maxConcurrent = 3
  private maxRetries = 3
  
  private totalTokensUsed = 0
  private totalCost = 0
  private processingTimes: number[] = []
  
  private budget: Budget
  private rateLimiter: RateLimiter
  private defaultModel: ModelName

  constructor(options?: {
    maxConcurrent?: number
    maxRetries?: number
    budget?: Budget
    rateLimiter?: RateLimiter
    defaultModel?: ModelName
  }) {
    this.maxConcurrent = options?.maxConcurrent ?? this.maxConcurrent
    this.maxRetries = options?.maxRetries ?? this.maxRetries
    this.budget = options?.budget ?? new Budget(10.0, 'llm-queue') // $10 default
    this.rateLimiter = options?.rateLimiter ?? new RateLimiter(60, 60000) // 60 per minute default
    this.defaultModel = options?.defaultModel ?? 'gpt-3.5-turbo'
  }

  /**
   * Add a new request to the queue
   */
  async enqueue(request: Omit<LLMRequest, 'id' | 'created_at' | 'retries'>): Promise<string> {
    const id = this.generateId()
    const model = request.model ?? this.defaultModel
    
    // Estimate cost and tokens
    const estimatedTokens = estimateTokens(request.prompt)
    const costBreakdown = calculateCost(estimatedTokens, model)
    
    // Check budget before queuing
    if (!this.budget.canAfford(costBreakdown.totalCost)) {
      throw new Error(`BUDGET_EXCEEDED: Request would cost $${costBreakdown.totalCost.toFixed(4)}, but only $${this.budget.getRemaining().toFixed(4)} remaining`)
    }
    
    const llmRequest: LLMRequest = {
      ...request,
      id,
      model,
      estimated_cost: costBreakdown.totalCost,
      estimated_tokens: estimatedTokens,
      created_at: Date.now(),
      retries: 0,
      priority: request.priority ?? 'normal'
    }

    // Insert based on priority
    this.insertByPriority(llmRequest)

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing()
    }

    return id
  }

  /**
   * Process a single request immediately (bypass queue)
   */
  async process(request: Omit<LLMRequest, 'id' | 'created_at' | 'retries'>): Promise<any> {
    const id = await this.enqueue({ ...request, priority: 'high' })
    
    // Wait for completion
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        if (this.completed.has(id)) {
          const response = this.completed.get(id)!
          if (response.success) {
            resolve(response.result)
          } else {
            reject(new Error(response.error || 'LLM processing failed'))
          }
        } else if (this.failed.has(id)) {
          const response = this.failed.get(id)!
          reject(new Error(response.error || 'LLM processing failed'))
        } else {
          setTimeout(checkCompletion, 100)
        }
      }
      checkCompletion()
    })
  }

  /**
   * Get the current queue status
   */
  getStatus(): QueueStatus {
    const rateLimitStats = this.rateLimiter.getStats()
    
    return {
      pending: this.queue.length,
      processing: this.processing.size,
      completed: this.completed.size,
      failed: this.failed.size,
      total_tokens_used: this.totalTokensUsed,
      total_cost: this.totalCost,
      average_processing_time: this.processingTimes.length > 0 
        ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
        : 0,
      rate_limit_status: rateLimitStats,
      budget_status: {
        used: this.budget.getUsed(),
        remaining: this.budget.getRemaining(),
        percentage: this.budget.getUsagePercentage()
      }
    }
  }

  /**
   * Get result for a specific request
   */
  getResult(id: string): LLMResponse | null {
    return this.completed.get(id) || this.failed.get(id) || null
  }

  /**
   * Cancel a pending request
   */
  cancel(id: string): boolean {
    const index = this.queue.findIndex(req => req.id === id)
    if (index !== -1) {
      this.queue.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Clear completed and failed requests
   */
  clearHistory(): void {
    this.completed.clear()
    this.failed.clear()
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    this.isProcessing = false
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    if (!this.isProcessing && this.queue.length > 0) {
      this.startProcessing()
    }
  }

  /**
   * Start processing the queue
   */
  private async startProcessing(): Promise<void> {
    this.isProcessing = true

    while (this.queue.length > 0 && this.isProcessing) {
      // Check rate limiting
      if (!this.rateLimiter.isAllowed()) {
        const retryAfter = this.rateLimiter.getRetryAfter()
        if (retryAfter > 0) {
          await this.delay(retryAfter)
          continue
        }
      }

      // Process up to maxConcurrent requests simultaneously
      const batchSize = Math.min(this.maxConcurrent, this.queue.length)
      const batch = this.queue.splice(0, batchSize)

      // Move to processing
      batch.forEach(request => {
        this.processing.set(request.id, request)
      })

      // Process batch
      const promises = batch.map(request => this.processRequest(request))
      await Promise.all(promises)

      // Small delay between batches to prevent overwhelming the API
      if (this.queue.length > 0) {
        await this.delay(100)
      }
    }

    this.isProcessing = false
  }

  /**
   * Process a single LLM request
   */
  private async processRequest(request: LLMRequest): Promise<void> {
    const startTime = Date.now()

    try {
      // Call LLM API
      const result = await this.callLLM(request)
      
      const processingTime = Date.now() - startTime
      this.processingTimes.push(processingTime)

      // Calculate actual token usage and cost
      const actualTokens = this.calculateActualTokens(request.prompt, result)
      const costBreakdown = calculateCost(actualTokens, request.model!)
      
      // Charge the budget and check for alerts
      const budgetAlert = this.budget.charge(costBreakdown)

      const response: LLMResponse = {
        id: request.id,
        result,
        success: true,
        actual_tokens: actualTokens,
        cost_breakdown: costBreakdown,
        processing_time: processingTime,
        completed_at: Date.now(),
        budget_alert: budgetAlert || undefined
      }

      this.totalTokensUsed += actualTokens.totalTokens
      this.totalCost += costBreakdown.totalCost
      this.completed.set(request.id, response)
      this.processing.delete(request.id)

      // If we got a budget alert, log it
      if (budgetAlert) {
        console.warn('Budget Alert:', budgetAlert)
      }

    } catch (error) {
      console.error(`LLM request ${request.id} failed:`, error)
      
      // Check if it's a budget error - don't retry these
      if (error instanceof Error && error.message.includes('BUDGET_EXCEEDED')) {
        const response: LLMResponse = {
          id: request.id,
          result: null,
          success: false,
          error: error.message,
          processing_time: Date.now() - startTime,
          completed_at: Date.now()
        }

        this.failed.set(request.id, response)
        this.processing.delete(request.id)
        return
      }
      
      // Retry logic for other errors
      if (request.retries < this.maxRetries) {
        request.retries++
        this.insertByPriority(request) // Re-queue for retry
        this.processing.delete(request.id)
      } else {
        // Max retries exceeded
        const response: LLMResponse = {
          id: request.id,
          result: null,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          processing_time: Date.now() - startTime,
          completed_at: Date.now()
        }

        this.failed.set(request.id, response)
        this.processing.delete(request.id)
      }
    }
  }

  /**
   * Call the actual LLM API (mock implementation)
   */
  private async callLLM(request: LLMRequest): Promise<any> {
    // This is a mock implementation - replace with actual LLM provider
    // e.g., OpenAI, Anthropic, local model, etc.
    
    await this.delay(Math.random() * 2000 + 1000) // Simulate API delay
    
    // Mock different responses based on module type
    if (request.module) {
      switch (request.module) {
        case 'events':
          return {
            events: [
              { type: 'discovery', description: 'Character discovers important information', impact: 'high' },
              { type: 'conflict', description: 'Character faces opposition', impact: 'medium' }
            ]
          }
        case 'plants':
          return {
            plants: [
              { element: 'mysterious device', setup_line: 'The device hummed quietly', payoff_potential: 'high' }
            ]
          }
        case 'state':
          return {
            emotional_states: [
              { character: 'protagonist', emotion: 'determination', intensity: 8 },
              { character: 'antagonist', emotion: 'frustration', intensity: 6 }
            ]
          }
        case 'beats':
          return {
            story_beats: [
              { type: 'action', duration: 'short', tension_level: 7 },
              { type: 'dialogue', duration: 'medium', tension_level: 4 }
            ]
          }
        default:
          return { analysis: 'General analysis result' }
      }
    }

    // General response
    return {
      analysis: 'This is a mock LLM response for: ' + request.prompt.substring(0, 50) + '...',
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      suggestions: ['Consider expanding character development', 'Add more sensory details']
    }
  }

  /**
   * Insert request into queue based on priority
   */
  private insertByPriority(request: LLMRequest): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 }
    const requestPriority = priorityOrder[request.priority!]

    let insertIndex = this.queue.length
    for (let i = 0; i < this.queue.length; i++) {
      const queuePriority = priorityOrder[this.queue[i].priority!]
      if (requestPriority < queuePriority) {
        insertIndex = i
        break
      }
    }

    this.queue.splice(insertIndex, 0, request)
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Calculate actual token usage from request and response
   */
  private calculateActualTokens(prompt: string, response: any): TokenUsage {
    const promptTokens = estimateTokens(prompt)
    const responseText = JSON.stringify(response)
    const completionTokens = estimateTokens(responseText)
    
    return {
      promptTokens: promptTokens.promptTokens,
      completionTokens: completionTokens.totalTokens, // Response is completion
      totalTokens: promptTokens.promptTokens + completionTokens.totalTokens
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get queue statistics for monitoring
   */
  getStatistics(): {
    totalRequests: number
    successRate: number
    averageRetries: number
    tokensPerMinute: number
    queueThroughput: number
  } {
    const totalRequests = this.completed.size + this.failed.size
    const successRate = totalRequests > 0 ? this.completed.size / totalRequests : 0
    
    const allRequests = [...this.completed.values(), ...this.failed.values()]
    const averageRetries = allRequests.length > 0 
      ? allRequests.reduce((sum, r) => sum + (r as any).retries || 0, 0) / allRequests.length
      : 0

    // Calculate tokens per minute (rough estimate)
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    const recentCompletions = [...this.completed.values()].filter(r => r.completed_at > oneMinuteAgo)
    const tokensPerMinute = recentCompletions.reduce((sum, r) => sum + (r.tokens_used || 0), 0)

    return {
      totalRequests,
      successRate,
      averageRetries,
      tokensPerMinute,
      queueThroughput: recentCompletions.length
    }
  }

  /**
   * Reset the entire queue system
   */
  reset(): void {
    this.queue = []
    this.processing.clear()
    this.completed.clear()
    this.failed.clear()
    this.totalTokensUsed = 0
    this.totalCost = 0
    this.processingTimes = []
    this.isProcessing = false
    this.rateLimiter.reset()
  }

  /**
   * Get budget information
   */
  getBudget(): Budget {
    return this.budget
  }

  /**
   * Set a new budget
   */
  setBudget(budget: Budget): void {
    this.budget = budget
  }

  /**
   * Get rate limiter stats
   */
  getRateLimiterStats() {
    return this.rateLimiter.getStats()
  }

  /**
   * Check if the queue can process more requests (budget and rate limit check)
   */
  canProcessMore(): { canProcess: boolean; reason?: string } {
    // Check rate limiting
    if (!this.rateLimiter.isAllowed()) {
      const retryAfter = this.rateLimiter.getRetryAfter()
      return {
        canProcess: false,
        reason: `Rate limited. Retry in ${Math.ceil(retryAfter / 1000)}s`
      }
    }

    // Check budget
    if (this.budget.getRemaining() <= 0) {
      return {
        canProcess: false,
        reason: 'Budget exceeded'
      }
    }

    return { canProcess: true }
  }

  /**
   * Estimate cost for a batch of requests
   */
  estimateBatchCost(prompts: string[], model?: ModelName): {
    totalCost: number
    perRequestCost: number[]
    canAfford: boolean
  } {
    const usedModel = model || this.defaultModel
    const costs = prompts.map(prompt => {
      const tokens = estimateTokens(prompt)
      const cost = calculateCost(tokens, usedModel)
      return cost.totalCost
    })

    const totalCost = costs.reduce((sum, cost) => sum + cost, 0)
    
    return {
      totalCost,
      perRequestCost: costs,
      canAfford: this.budget.canAfford(totalCost)
    }
  }
}

export default LLMQueue