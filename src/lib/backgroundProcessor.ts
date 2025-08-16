'use client'

import { analysisCache } from './cache'
import { llmManager } from './llmProvider'
import type { AnalysisResult, AnalysisTask } from './llmProvider'

export interface ProcessingTask extends AnalysisTask {
  manuscriptId: string
  progress: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  result?: AnalysisResult
  error?: string
  onProgress?: (progress: number) => void
  onComplete?: (result: AnalysisResult) => void
  onError?: (error: Error) => void
}

export interface WorkerMessage {
  type: 'analyze' | 'progress' | 'complete' | 'error'
  taskId: string
  data?: any
  progress?: number
  result?: AnalysisResult
  error?: string
}

class BackgroundProcessor {
  private workers: Worker[] = []
  private taskQueue: ProcessingTask[] = []
  private activeTasks: Map<string, ProcessingTask> = new Map()
  private maxWorkers: number = 4
  private _isInitialized: boolean = false

  constructor() {
    this.initializeWorkers()
  }

  private initializeWorkers(): void {
    if (typeof window === 'undefined') return // SSR safety
    
    // Create worker pool based on CPU cores (max 4 for desktop app)
    const numWorkers = Math.min(navigator.hardwareConcurrency || 4, this.maxWorkers)
    
    for (let i = 0; i < numWorkers; i++) {
      try {
        const worker = new Worker('/workers/analysisWorker.js')
        worker.onmessage = this.handleWorkerMessage.bind(this)
        worker.onerror = this.handleWorkerError.bind(this)
        this.workers.push(worker)
      } catch (error) {
        console.warn('Could not create worker:', error)
        // Fall back to main thread processing
      }
    }

    this._isInitialized = true
    console.log(`Initialized ${this.workers.length} analysis workers`)
  }

  private handleWorkerMessage(event: MessageEvent<WorkerMessage>): void {
    const { type, taskId, progress, result, error } = event.data
    const task = this.activeTasks.get(taskId)

    if (!task) return

    switch (type) {
      case 'progress':
        if (progress !== undefined) {
          task.progress = progress
          task.onProgress?.(progress)
        }
        break

      case 'complete':
        if (result) {
          task.result = result
          task.status = 'completed'
          task.progress = 100
          
          // Cache the result
          if (task.text && task.type) {
            analysisCache.storeAnalysis(task.text, task.type, result)
          }
          
          task.onComplete?.(result)
        }
        this.finishTask(taskId)
        break

      case 'error':
        task.status = 'failed'
        task.error = error || 'Unknown error'
        task.onError?.(new Error(task.error))
        this.finishTask(taskId)
        break
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error)
    // Handle worker failures gracefully
  }

  private finishTask(taskId: string): void {
    this.activeTasks.delete(taskId)
    this.processQueue() // Process next task in queue
  }

  async queueAnalysis(task: ProcessingTask): Promise<string> {
    // Check cache first
    if (task.text && task.type) {
      const cached = analysisCache.getAnalysis(task.text, task.type, task.options)
      if (cached) {
        // Return cached result immediately
        setTimeout(() => {
          task.onComplete?.(cached)
        }, 0)
        return task.id
      }
    }

    task.status = 'pending'
    task.progress = 0
    this.taskQueue.push(task)
    
    this.processQueue()
    return task.id
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return

    // Find available worker
    const availableWorkers = this.workers.filter(_worker =>
      !Array.from(this.activeTasks.values()).some(task => 
        task.status === 'processing'
      )
    )

    if (availableWorkers.length === 0) return

    // Get highest priority task
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    const task = this.taskQueue.shift()
    if (!task) return

    // If no workers available, fall back to main thread
    if (this.workers.length === 0) {
      this.processInMainThread(task)
    } else {
      this.assignTaskToWorker(task, availableWorkers[0])
    }
  }

  private assignTaskToWorker(task: ProcessingTask, worker: Worker): void {
    task.status = 'processing'
    this.activeTasks.set(task.id, task)

    worker.postMessage({
      type: 'analyze',
      taskId: task.id,
      data: {
        text: task.text,
        analysisType: task.type,
        options: task.options
      }
    })
  }

  private async processInMainThread(task: ProcessingTask): Promise<void> {
    task.status = 'processing'
    this.activeTasks.set(task.id, task)

    try {
      // Use the main LLM manager for processing
      const result = await llmManager.processLargeManuscript(
        task.text,
        task.type,
        (progress) => {
          task.progress = progress * 100
          task.onProgress?.(task.progress)
        }
      )

      task.result = result
      task.status = 'completed'
      task.progress = 100
      
      // Cache the result
      analysisCache.storeAnalysis(task.text, task.type, result)
      
      task.onComplete?.(result)
    } catch (error) {
      task.status = 'failed'
      task.error = error instanceof Error ? error.message : 'Unknown error'
      task.onError?.(error as Error)
    }

    this.finishTask(task.id)
  }

  async progressiveAnalysis(
    manuscript: { id: string; content: string },
    onProgress: (progress: number) => void
  ): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = []
    const analysisTypes = [
      'story-structure',
      'character-development', 
      'pacing-analysis',
      'style-analysis'
    ]

    let completedAnalyses = 0
    const totalAnalyses = analysisTypes.length

    const analysisPromises = analysisTypes.map(async (type) => {
      const task: ProcessingTask = {
        id: `${manuscript.id}_${type}_${Date.now()}`,
        type,
        text: manuscript.content,
        manuscriptId: manuscript.id,
        options: {},
        priority: 'normal',
        maxRetries: 3,
        progress: 0,
        status: 'pending',
        onProgress: (taskProgress) => {
          // Calculate overall progress
          const overallProgress = (completedAnalyses + (taskProgress / 100)) / totalAnalyses * 100
          onProgress(overallProgress)
        },
        onComplete: (result) => {
          results.push(result)
          completedAnalyses++
          onProgress((completedAnalyses / totalAnalyses) * 100)
        }
      }

      return new Promise<AnalysisResult>((resolve, reject) => {
        task.onComplete = resolve
        task.onError = reject
        this.queueAnalysis(task)
      })
    })

    try {
      await Promise.all(analysisPromises)
      return results
    } catch (error) {
      console.error('Progressive analysis failed:', error)
      return results // Return partial results
    }
  }

  // Cache intermediate results for large manuscript processing
  private _cacheIntermediateResults(chunkId: string, result: Partial<AnalysisResult>): void {
    analysisCache.storePartialResult(chunkId, result)
  }

  // Get processing statistics
  getProcessingStats(): {
    queueLength: number
    activeTasksCount: number
    workerCount: number
    cacheHitRate: number
  } {
    return {
      queueLength: this.taskQueue.length,
      activeTasksCount: this.activeTasks.size,
      workerCount: this.workers.length,
      cacheHitRate: analysisCache.getStats().hitRate
    }
  }

  // Cancel a specific task
  cancelTask(taskId: string): boolean {
    // Remove from queue
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId)
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1)
      return true
    }

    // Cancel active task
    const activeTask = this.activeTasks.get(taskId)
    if (activeTask) {
      activeTask.status = 'cancelled'
      this.finishTask(taskId)
      return true
    }

    return false
  }

  // Cancel all tasks for a manuscript
  cancelManuscriptTasks(manuscriptId: string): void {
    // Cancel queued tasks
    this.taskQueue = this.taskQueue.filter(task => 
      task.manuscriptId !== manuscriptId
    )

    // Cancel active tasks
    for (const [taskId, task] of this.activeTasks.entries()) {
      if (task.manuscriptId === manuscriptId) {
        task.status = 'cancelled'
        this.finishTask(taskId)
      }
    }
  }

  // Clean up resources
  destroy(): void {
    // Terminate all workers
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []

    // Clear queues
    this.taskQueue = []
    this.activeTasks.clear()

    this._isInitialized = false
  }

  // Real-time text analysis with debouncing
  async analyzeTextRealTime(
    text: string,
    analysisType: string,
    manuscriptId: string,
    debounceMs: number = 500
  ): Promise<void> {
    // Implement debouncing to avoid excessive API calls
    const debounceKey = `${manuscriptId}_${analysisType}`
    
    // Clear existing timeout
    const existingTimeout = (this as any)[`timeout_${debounceKey}`]
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new timeout
    (this as any)[`timeout_${debounceKey}`] = setTimeout(async () => {
      try {
        const task: ProcessingTask = {
          id: `realtime_${manuscriptId}_${analysisType}_${Date.now()}`,
          type: analysisType,
          text,
          manuscriptId,
          options: { realtime: true },
          priority: 'high', // Real-time analysis gets high priority
          maxRetries: 1,
          progress: 0,
          status: 'pending'
        }

        await this.queueAnalysis(task)
      } catch (error) {
        console.error('Real-time analysis failed:', error)
      }
    }, debounceMs)
  }

  // Batch processing for multiple manuscripts
  async batchProcess(
    manuscripts: Array<{ id: string; content: string }>,
    analysisTypes: string[],
    onProgress: (manuscriptId: string, progress: number) => void
  ): Promise<Map<string, AnalysisResult[]>> {
    const results = new Map<string, AnalysisResult[]>()

    const batchPromises = manuscripts.map(async (manuscript) => {
      const manuscriptResults: AnalysisResult[] = []
      
      for (const analysisType of analysisTypes) {
        const task: ProcessingTask = {
          id: `batch_${manuscript.id}_${analysisType}_${Date.now()}`,
          type: analysisType,
          text: manuscript.content,
          manuscriptId: manuscript.id,
          options: { batch: true },
          priority: 'low', // Batch processing gets lower priority
          maxRetries: 2,
          progress: 0,
          status: 'pending',
          onProgress: (progress) => {
            onProgress(manuscript.id, progress)
          }
        }

        try {
          const result = await new Promise<AnalysisResult>((resolve, reject) => {
            task.onComplete = resolve
            task.onError = reject
            this.queueAnalysis(task)
          })
          
          manuscriptResults.push(result)
        } catch (error) {
          console.error(`Batch analysis failed for ${manuscript.id}:`, error)
        }
      }
      
      results.set(manuscript.id, manuscriptResults)
    })

    await Promise.all(batchPromises)
    return results
  }
}

// Export singleton instance
export const backgroundProcessor = new BackgroundProcessor()

// Worker script content (to be saved as a separate file)
export const ANALYSIS_WORKER_SCRIPT = `
// Analysis Worker Script
importScripts('/lib/llmProvider.js');

let llmManager;

self.onmessage = async function(e) {
  const { type, taskId, data } = e.data;
  
  if (type === 'analyze') {
    try {
      // Initialize LLM manager if not done
      if (!llmManager) {
        llmManager = new LLMManager();
      }
      
      const { text, analysisType, options } = data;
      
      // Send progress updates
      self.postMessage({
        type: 'progress',
        taskId,
        progress: 10
      });
      
      // Process the analysis
      const result = await llmManager.processLargeManuscript(
        text,
        analysisType,
        (progress) => {
          self.postMessage({
            type: 'progress',
            taskId,
            progress: 10 + (progress * 80) // 10-90% for processing
          });
        }
      );
      
      // Final progress
      self.postMessage({
        type: 'progress',
        taskId,
        progress: 100
      });
      
      // Send result
      self.postMessage({
        type: 'complete',
        taskId,
        result
      });
      
    } catch (error) {
      self.postMessage({
        type: 'error',
        taskId,
        error: error.message
      });
    }
  }
};
`

export default backgroundProcessor