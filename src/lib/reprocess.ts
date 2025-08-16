/**
 * Reprocessing Library
 * Handles selective reprocessing of analysis modules based on dirty flags
 * with cost tracking and rate limiting
 */

import { invoke } from '@tauri-apps/api/core'
import { Budget, estimateAnalysisCost, ModelName, type BudgetAlert } from './cost'
import { LLMQueue } from './llm-queue'
import { globalRateLimitManager } from './rate-limit-config'

export interface ModuleStatus {
  scene_id: string
  events_v: string | null
  events_dirty: number
  plants_v: string | null
  plants_dirty: number
  state_v: string | null
  state_dirty: number
  beats_v: string | null
  beats_dirty: number
  last_processed: string
}

export interface ProcessingRequest {
  scene_id: string
  scene_content: string
  modules: ('events' | 'plants' | 'state' | 'beats')[]
}

export interface ProcessingResult {
  scene_id: string
  module: string
  result: any
  version: string
  success: boolean
  error?: string
  cost?: number
  tokens_used?: number
  processing_time?: number
  budget_alert?: BudgetAlert
}

export class ReprocessingEngine {
  private llmQueue: LLMQueue
  private budget: Budget
  private model: ModelName

  constructor(llmQueue: LLMQueue, budget?: Budget, model: ModelName = 'gpt-3.5-turbo') {
    this.llmQueue = llmQueue
    this.budget = budget || new Budget(10.0, 'reprocessing')
    this.model = model
  }

  /**
   * Get all scenes that need reprocessing for any module
   */
  async getDirtyScenes(): Promise<string[]> {
    try {
      const dirtyScenes = await invoke('get_dirty_scenes')
      return dirtyScenes as string[]
    } catch (error) {
      console.error('Failed to get dirty scenes:', error)
      return []
    }
  }

  /**
   * Get module status for a specific scene
   */
  async getModuleStatus(sceneId: string): Promise<ModuleStatus | null> {
    try {
      const status = await invoke('get_module_status', { sceneId })
      return status as ModuleStatus
    } catch (error) {
      console.error('Failed to get module status:', error)
      return null
    }
  }

  /**
   * Estimate cost for processing a scene
   */
  async estimateSceneCost(sceneId: string, sceneContent: string): Promise<{
    totalCost: number
    moduleBreakdown: Record<string, { cost: number; tokens: number }>
    canAfford: boolean
  }> {
    const status = await this.getModuleStatus(sceneId)
    if (!status) {
      return { totalCost: 0, moduleBreakdown: {}, canAfford: true }
    }

    const dirtyModules = this.getDirtyModules(status)
    const moduleBreakdown: Record<string, { cost: number; tokens: number }> = {}
    let totalCost = 0

    for (const module of dirtyModules) {
      const estimate = estimateAnalysisCost(
        sceneContent.length,
        module as keyof typeof import('./cost').ANALYSIS_COSTS,
        this.model
      )
      moduleBreakdown[module] = {
        cost: estimate.estimatedCost,
        tokens: estimate.tokenUsage.totalTokens
      }
      totalCost += estimate.estimatedCost
    }

    return {
      totalCost,
      moduleBreakdown,
      canAfford: this.budget.canAfford(totalCost)
    }
  }

  /**
   * Mark specific modules as dirty for a scene
   */
  async markModulesDirty(sceneId: string, modules: string[]): Promise<void> {
    try {
      await invoke('mark_modules_dirty', { sceneId, modules })
    } catch (error) {
      console.error('Failed to mark modules dirty:', error)
    }
  }

  /**
   * Process all dirty modules for a scene
   */
  async processScene(sceneId: string, sceneContent: string): Promise<ProcessingResult[]> {
    const status = await this.getModuleStatus(sceneId)
    if (!status) {
      throw new Error(`No module status found for scene ${sceneId}`)
    }

    const dirtyModules = this.getDirtyModules(status)
    if (dirtyModules.length === 0) {
      return []
    }

    // Check cost before processing
    const costEstimate = await this.estimateSceneCost(sceneId, sceneContent)
    if (!costEstimate.canAfford) {
      throw new Error(`BUDGET_EXCEEDED: Processing would cost $${costEstimate.totalCost.toFixed(4)}, but only $${this.budget.getRemaining().toFixed(4)} remaining`)
    }

    // Check rate limiting
    const canProcess = this.llmQueue.canProcessMore()
    if (!canProcess.canProcess) {
      throw new Error(`RATE_LIMITED: ${canProcess.reason}`)
    }

    const results: ProcessingResult[] = []

    for (const module of dirtyModules) {
      try {
        const result = await this.processModule(sceneId, sceneContent, module)
        results.push(result)
        
        // Update module status with new version and mark as clean
        await this.updateModuleStatus(sceneId, module, result.version!)
      } catch (error) {
        results.push({
          scene_id: sceneId,
          module,
          result: null,
          version: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  /**
   * Process a specific module for a scene
   */
  private async processModule(
    sceneId: string, 
    sceneContent: string, 
    module: string
  ): Promise<ProcessingResult> {
    const modulePrompts = {
      events: 'Extract key events and plot points from this scene',
      plants: 'Identify setup, plants, and payoffs in this scene',
      state: 'Analyze character emotional states and relationships',
      beats: 'Break down story beats and pacing elements'
    }

    const prompt = modulePrompts[module as keyof typeof modulePrompts]
    if (!prompt) {
      throw new Error(`Unknown module: ${module}`)
    }

    const fullPrompt = `${prompt}\n\nScene content:\n${sceneContent}`
    const startTime = Date.now()

    try {
      // Queue LLM processing with cost tracking
      const requestId = await this.llmQueue.enqueue({
        prompt: fullPrompt,
        scene_id: sceneId,
        module,
        model: this.model,
        max_tokens: 1000,
        priority: 'normal'
      })

      // Get the result from the queue
      const llmResponse = await this.waitForResult(requestId)
      const processingTime = Date.now() - startTime

      if (!llmResponse.success) {
        throw new Error(llmResponse.error || 'LLM processing failed')
      }

      const version = this.generateVersion()
      
      return {
        scene_id: sceneId,
        module,
        result: llmResponse.result,
        version,
        success: true,
        cost: llmResponse.cost_breakdown?.totalCost,
        tokens_used: llmResponse.actual_tokens?.totalTokens,
        processing_time: processingTime,
        budget_alert: llmResponse.budget_alert
      }
    } catch (error) {
      throw new Error(`Failed to process ${module} for scene ${sceneId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Wait for LLM queue result
   */
  private async waitForResult(requestId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const checkResult = () => {
        const result = this.llmQueue.getResult(requestId)
        if (result) {
          resolve(result)
        } else {
          setTimeout(checkResult, 100)
        }
      }
      
      // Start checking immediately
      checkResult()
      
      // Timeout after 60 seconds
      setTimeout(() => {
        reject(new Error('Request timeout'))
      }, 60000)
    })
  }

  /**
   * Get list of dirty modules from status
   */
  private getDirtyModules(status: ModuleStatus): string[] {
    const dirtyModules: string[] = []
    
    if (status.events_dirty === 1) dirtyModules.push('events')
    if (status.plants_dirty === 1) dirtyModules.push('plants')
    if (status.state_dirty === 1) dirtyModules.push('state')
    if (status.beats_dirty === 1) dirtyModules.push('beats')
    
    return dirtyModules
  }

  /**
   * Update module status with new version and mark as clean
   */
  private async updateModuleStatus(
    sceneId: string, 
    module: string, 
    version: string
  ): Promise<void> {
    try {
      await invoke('update_module_status', {
        sceneId,
        module,
        version,
        dirty: false
      })
    } catch (error) {
      console.error('Failed to update module status:', error)
    }
  }

  /**
   * Generate a version string for processed results
   */
  private generateVersion(): string {
    return `v${Date.now()}`
  }

  /**
   * Process all dirty scenes in the manuscript
   */
  async processAllDirtyScenes(): Promise<Map<string, ProcessingResult[]>> {
    const dirtyScenes = await this.getDirtyScenes()
    const results = new Map<string, ProcessingResult[]>()

    for (const sceneId of dirtyScenes) {
      try {
        // Get scene content from database
        const sceneContent = await invoke('get_scene_content', { sceneId })
        const sceneResults = await this.processScene(sceneId, sceneContent as string)
        results.set(sceneId, sceneResults)
      } catch (error) {
        console.error(`Failed to process scene ${sceneId}:`, error)
        results.set(sceneId, [{
          scene_id: sceneId,
          module: 'all',
          result: null,
          version: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }])
      }
    }

    return results
  }

  /**
   * Get processing queue status
   */
  async getQueueStatus(): Promise<{
    pending: number
    processing: number
    completed: number
    failed: number
  }> {
    // This would integrate with the LLMQueue status
    return this.llmQueue.getStatus()
  }

  /**
   * Clear all dirty flags (use with caution)
   */
  async clearAllDirtyFlags(): Promise<void> {
    try {
      await invoke('clear_all_dirty_flags')
    } catch (error) {
      console.error('Failed to clear dirty flags:', error)
    }
  }

  /**
   * Get budget information
   */
  getBudget(): Budget {
    return this.budget
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return this.llmQueue.getStatus()
  }

  /**
   * Get current model being used
   */
  getModel(): ModelName {
    return this.model
  }

  /**
   * Set a new model
   */
  setModel(model: ModelName): void {
    this.model = model
  }

  /**
   * Set a new budget
   */
  setBudget(budget: Budget): void {
    this.budget = budget
    this.llmQueue.setBudget(budget)
  }
}

/**
 * Convenience function for UI components to rerun dirty modules
 */
export async function rerunDirty(options: { 
  modules?: ('events' | 'plants' | 'state' | 'beats')[]
  sceneId?: string
  budget?: Budget
  model?: ModelName
  onProgress?: (progress: { completed: number; total: number; currentScene?: string; cost?: number }) => void
  onBudgetAlert?: (alert: BudgetAlert) => void
}): Promise<Map<string, ProcessingResult[]>> {
  // Create budget if not provided
  const budget = options.budget || new Budget(10.0, 'rerun-dirty')
  
  // Create LLM queue with cost tracking
  const llmQueue = new LLMQueue({
    maxConcurrent: 3,
    budget,
    defaultModel: options.model || 'gpt-3.5-turbo'
  })

  let totalCost = 0
  
  if (options.sceneId) {
    // Process specific scene
    try {
      const sceneContent = await invoke('get_scene_content', { sceneId: options.sceneId })
      
      // Estimate cost first
      const costEstimate = await engine.estimateSceneCost(options.sceneId, sceneContent as string)
      if (!costEstimate.canAfford) {
        throw new Error(`BUDGET_EXCEEDED: Scene processing would cost $${costEstimate.totalCost.toFixed(4)}, but only $${budget.getRemaining().toFixed(4)} remaining`)
      }
      
      const results = await engine.processScene(options.sceneId, sceneContent as string)
      
      // Calculate actual cost from results
      const sceneCost = results.reduce((sum, result) => sum + (result.cost || 0), 0)
      totalCost += sceneCost
      
      // Check for budget alerts
      results.forEach(result => {
        if (result.budget_alert && options.onBudgetAlert) {
          options.onBudgetAlert(result.budget_alert)
        }
      })
      
      if (options.onProgress) {
        options.onProgress({ completed: 1, total: 1, currentScene: options.sceneId, cost: totalCost })
      }
      
      return new Map([[options.sceneId, results]])
    } catch (error) {
      console.error(`Failed to process scene ${options.sceneId}:`, error)
      return new Map()
    }
  } else {
    // Process all dirty scenes
    const dirtyScenes = await engine.getDirtyScenes()
    const results = new Map<string, ProcessingResult[]>()
    
    for (let i = 0; i < dirtyScenes.length; i++) {
      const sceneId = dirtyScenes[i]
      
      try {
        const sceneContent = await invoke('get_scene_content', { sceneId })
        
        // Check if we can afford this scene
        const costEstimate = await engine.estimateSceneCost(sceneId, sceneContent as string)
        if (!costEstimate.canAfford) {
          console.warn(`Skipping scene ${sceneId}: would exceed budget`)
          results.set(sceneId, [{
            scene_id: sceneId,
            module: 'all',
            result: null,
            version: '',
            success: false,
            error: 'BUDGET_EXCEEDED: Insufficient budget for this scene'
          }])
          continue
        }
        
        const sceneResults = await engine.processScene(sceneId, sceneContent as string)
        results.set(sceneId, sceneResults)
        
        // Calculate cost
        const sceneCost = sceneResults.reduce((sum, result) => sum + (result.cost || 0), 0)
        totalCost += sceneCost
        
        // Check for budget alerts
        sceneResults.forEach(result => {
          if (result.budget_alert && options.onBudgetAlert) {
            options.onBudgetAlert(result.budget_alert)
          }
        })
        
        if (options.onProgress) {
          options.onProgress({ 
            completed: i + 1, 
            total: dirtyScenes.length, 
            currentScene: sceneId,
            cost: totalCost
          })
        }
      } catch (error) {
        console.error(`Failed to process scene ${sceneId}:`, error)
        results.set(sceneId, [{
          scene_id: sceneId,
          module: 'all',
          result: null,
          version: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }])
      }
    }
    
    return results
  }
}

export default ReprocessingEngine