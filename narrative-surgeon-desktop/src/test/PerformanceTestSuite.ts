'use client'

import { performanceMonitor } from '@/lib/performance/PerformanceMonitor'
import { fullManuscriptAnalyzer } from '@/lib/analysis/FullManuscriptAnalyzer'
import { backgroundProcessor } from '@/lib/backgroundProcessor'
import { analysisCache, manuscriptCache, chunkCache } from '@/lib/cache'
import { llmManager } from '@/lib/llmProvider'

export interface PerformanceTestResult {
  testName: string
  success: boolean
  duration: number
  memoryUsage: {
    before: number
    after: number
    peak: number
  }
  errors: string[]
  metrics: {
    [key: string]: any
  }
}

export interface LargeManuscriptTest {
  wordCount: number
  characterCount: number
  processingTime: number
  memoryEfficient: boolean
  cacheHitRate: number
  workerUtilization: number
}

class PerformanceTestSuite {
  private testResults: PerformanceTestResult[] = []
  private isRunning = false

  // Generate test manuscripts of various sizes
  private generateTestManuscript(targetWords: number): string {
    const paragraphs: string[] = []
    const sampleParagraphs = [
      "The morning sun cast long shadows across the cobblestone streets of the old town. Sarah walked briskly, her heels clicking rhythmically against the stones. She had always found comfort in routine, in the predictable pattern of her daily walk to work. But today felt different somehow, charged with an energy she couldn't quite place.",
      
      "As she turned the corner onto Market Street, she noticed the peculiar man again. He stood by the fountain, same as yesterday, feeding breadcrumbs to the pigeons. His weathered hands moved with practiced gentleness, and there was something in his eyes that spoke of stories untold. Sarah had always wondered about his past, about the life that had brought him to this daily ritual.",
      
      "The café on the corner buzzed with its usual morning activity. Through the large windows, she could see the familiar faces of regular customers, each absorbed in their own small dramas. The businessman reading his paper, the young mother trying to manage her toddler while sipping coffee, the elderly couple sharing a quiet moment over pastries. Life in its infinite variety, playing out in miniature theater.",
      
      "Detective Miller examined the crime scene with practiced eyes. Twenty years on the force had taught him to notice details that others might miss. The way the victim's hand was positioned, the angle of the fallen chair, the peculiar absence of any signs of struggle. Something about this case felt off, like a puzzle with pieces that didn't quite fit together.",
      
      "In the depths of the ancient library, Professor Elena Vasquez carefully turned the pages of the medieval manuscript. The parchment crackled softly under her touch, each page a window into a world lost to time. The illuminated letters seemed to dance in the lamplight, telling stories of kings and queens, of battles fought and won, of love and loss spanning centuries.",
      
      "The spacecraft hummed quietly as it drifted through the vast emptiness of space. Captain Torres stood at the observation deck, gazing out at the star field that stretched infinitely in all directions. Earth was now just a pale blue dot, barely visible against the cosmic backdrop. The weight of their mission pressed heavily on his shoulders—humanity's first journey to another solar system.",
      
      "Martha's hands shook slightly as she opened the letter that would change everything. The law firm's letterhead was crisp and official, the words typed in precise legal language. After forty years of marriage, she had never imagined she would be sitting in her kitchen, reading about divorce proceedings. The paper seemed to blur as tears welled up in her eyes."
    ]

    let wordsGenerated = 0
    let paragraphIndex = 0

    while (wordsGenerated < targetWords) {
      const paragraph = sampleParagraphs[paragraphIndex % sampleParagraphs.length]
      paragraphs.push(paragraph)
      wordsGenerated += paragraph.split(' ').length
      paragraphIndex++
    }

    return paragraphs.join('\n\n')
  }

  private getMemoryUsage(): number {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return 0
    }
    return (performance as any).memory.usedJSHeapSize
  }

  async runPerformanceTest(
    testName: string, 
    testFn: () => Promise<any>
  ): Promise<PerformanceTestResult> {
    const startTime = performance.now()
    const memoryBefore = this.getMemoryUsage()
    let memoryPeak = memoryBefore
    const errors: string[] = []

    // Monitor memory during test
    const memoryMonitor = setInterval(() => {
      const current = this.getMemoryUsage()
      if (current > memoryPeak) {
        memoryPeak = current
      }
    }, 100)

    try {
      performanceMonitor.trackTaskStart(testName)
      
      const result = await testFn()
      
      const duration = performanceMonitor.trackTaskEnd(testName)
      const memoryAfter = this.getMemoryUsage()

      clearInterval(memoryMonitor)

      const testResult: PerformanceTestResult = {
        testName,
        success: true,
        duration,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          peak: memoryPeak
        },
        errors,
        metrics: {
          result,
          memoryDelta: memoryAfter - memoryBefore,
          peakMemoryIncrease: memoryPeak - memoryBefore
        }
      }

      this.testResults.push(testResult)
      return testResult

    } catch (error) {
      clearInterval(memoryMonitor)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(errorMessage)

      const testResult: PerformanceTestResult = {
        testName,
        success: false,
        duration: performance.now() - startTime,
        memoryUsage: {
          before: memoryBefore,
          after: this.getMemoryUsage(),
          peak: memoryPeak
        },
        errors,
        metrics: {}
      }

      this.testResults.push(testResult)
      return testResult
    }
  }

  async testLargeManuscriptProcessing(wordCount: number): Promise<LargeManuscriptTest> {
    const manuscript = this.generateTestManuscript(wordCount)
    const manuscriptId = `test_manuscript_${wordCount}_words`
    
    console.log(`Testing manuscript with ${wordCount} words (${manuscript.length} characters)`)

    const startTime = Date.now()
    const memoryBefore = this.getMemoryUsage()

    try {
      // Test full manuscript analysis
      const analysisResult = await fullManuscriptAnalyzer.analyzeFullManuscript(
        manuscriptId,
        manuscript,
        (progress) => {
          console.log(`Analysis progress: ${progress.toFixed(1)}%`)
        }
      )

      const processingTime = Date.now() - startTime
      const memoryAfter = this.getMemoryUsage()
      const memoryUsed = memoryAfter - memoryBefore
      const memoryEfficient = memoryUsed < (wordCount * 100) // Less than 100 bytes per word

      // Test cache performance
      const cacheStats = analysisCache.getStats()

      // Test background processing
      const processingStats = backgroundProcessor.getProcessingStats()

      return {
        wordCount,
        characterCount: manuscript.length,
        processingTime,
        memoryEfficient,
        cacheHitRate: cacheStats.hitRate,
        workerUtilization: processingStats.workerCount > 0 ? 
          (processingStats.activeTasksCount / processingStats.workerCount) : 0
      }
    } catch (error) {
      console.error(`Large manuscript test failed:`, error)
      throw error
    }
  }

  async runComprehensivePerformanceTests(): Promise<{
    results: PerformanceTestResult[]
    summary: {
      totalTests: number
      successfulTests: number
      failedTests: number
      totalDuration: number
      averageDuration: number
    }
    largeManuscriptTests: LargeManuscriptTest[]
  }> {
    if (this.isRunning) {
      throw new Error('Performance tests are already running')
    }

    this.isRunning = true
    this.testResults = []

    console.log('Starting comprehensive performance test suite...')

    try {
      // Start monitoring
      performanceMonitor.startMonitoring()

      // Test 1: Cache Performance
      await this.runPerformanceTest('Cache Operations', async () => {
        const testData = 'A'.repeat(10000) // 10KB test data
        
        // Test cache storage and retrieval
        for (let i = 0; i < 100; i++) {
          analysisCache.storeAnalysis(testData + i, 'test-analysis', { result: i })
        }

        let hits = 0
        for (let i = 0; i < 100; i++) {
          const result = analysisCache.getAnalysis(testData + i, 'test-analysis')
          if (result) hits++
        }

        return { cacheHits: hits, expectedHits: 100 }
      })

      // Test 2: Background Processing
      await this.runPerformanceTest('Background Processing', async () => {
        const tasks = []
        for (let i = 0; i < 10; i++) {
          const task = {
            id: `test_task_${i}`,
            type: 'test-analysis',
            text: this.generateTestManuscript(1000),
            manuscriptId: `test_${i}`,
            options: {},
            priority: 'normal' as const,
            maxRetries: 3,
            progress: 0,
            status: 'pending' as const
          }
          tasks.push(backgroundProcessor.queueAnalysis(task))
        }

        await Promise.all(tasks)
        return { tasksProcessed: tasks.length }
      })

      // Test 3: Real-time Analysis
      await this.runPerformanceTest('Real-time Analysis', async () => {
        const testText = this.generateTestManuscript(500)
        let suggestionCount = 0

        // Simulate real-time analysis
        for (let i = 0; i < testText.length; i += 50) {
          await new Promise(resolve => {
            // Simulate typing with analysis
            setTimeout(async () => {
              try {
                // This would trigger real-time analysis in practice
                suggestionCount++
                resolve(undefined)
              } catch (error) {
                resolve(undefined)
              }
            }, 10)
          })
        }

        return { analysisRuns: suggestionCount }
      })

      // Test 4: Memory Pressure Test
      await this.runPerformanceTest('Memory Pressure Test', async () => {
        const largeData = []
        for (let i = 0; i < 50; i++) {
          largeData.push(this.generateTestManuscript(5000))
        }

        // Force garbage collection if available
        if ((window as any).gc) {
          (window as any).gc()
        }

        return { dataGenerated: largeData.length * 5000 }
      })

      // Large Manuscript Tests
      console.log('Running large manuscript processing tests...')
      const largeManuscriptTests: LargeManuscriptTest[] = []

      const testSizes = [10000, 50000, 100000, 200000] // 10k, 50k, 100k, 200k words

      for (const wordCount of testSizes) {
        try {
          console.log(`Testing ${wordCount} word manuscript...`)
          const testResult = await this.testLargeManuscriptProcessing(wordCount)
          largeManuscriptTests.push(testResult)
          
          // Brief pause between tests
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          console.error(`Failed to test ${wordCount} word manuscript:`, error)
          largeManuscriptTests.push({
            wordCount,
            characterCount: 0,
            processingTime: -1,
            memoryEfficient: false,
            cacheHitRate: 0,
            workerUtilization: 0
          })
        }
      }

      // Generate summary
      const successfulTests = this.testResults.filter(r => r.success).length
      const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0)

      const summary = {
        totalTests: this.testResults.length,
        successfulTests,
        failedTests: this.testResults.length - successfulTests,
        totalDuration,
        averageDuration: totalDuration / this.testResults.length
      }

      console.log('Performance test suite completed:', summary)

      return {
        results: this.testResults,
        summary,
        largeManuscriptTests
      }

    } finally {
      this.isRunning = false
      performanceMonitor.stopMonitoring()
    }
  }

  // Specific performance validation tests
  async validatePerformanceRequirements(): Promise<{
    passed: boolean
    results: {
      largeManuscriptProcessing: boolean
      memoryEfficiency: boolean
      responseTime: boolean
      cachePerformance: boolean
      concurrentProcessing: boolean
    }
    details: string[]
  }> {
    const details: string[] = []
    const results = {
      largeManuscriptProcessing: false,
      memoryEfficiency: false,
      responseTime: false,
      cachePerformance: false,
      concurrentProcessing: false
    }

    try {
      // Test 1: Large manuscript processing (200k words)
      console.log('Validating 200k word manuscript processing...')
      const largeTest = await this.testLargeManuscriptProcessing(200000)
      
      if (largeTest.processingTime < 300000) { // Less than 5 minutes
        results.largeManuscriptProcessing = true
        details.push(`✓ Large manuscript processing: ${(largeTest.processingTime / 1000).toFixed(1)}s`)
      } else {
        details.push(`✗ Large manuscript processing too slow: ${(largeTest.processingTime / 1000).toFixed(1)}s`)
      }

      // Test 2: Memory efficiency
      if (largeTest.memoryEfficient) {
        results.memoryEfficiency = true
        details.push('✓ Memory usage efficient')
      } else {
        details.push('✗ Memory usage too high')
      }

      // Test 3: Response time for small operations
      const startTime = performance.now()
      const smallManuscript = this.generateTestManuscript(1000)
      analysisCache.storeAnalysis(smallManuscript, 'test', { result: 'test' })
      const cached = analysisCache.getAnalysis(smallManuscript, 'test')
      const responseTime = performance.now() - startTime

      if (responseTime < 100 && cached) { // Less than 100ms
        results.responseTime = true
        details.push(`✓ Fast response time: ${responseTime.toFixed(2)}ms`)
      } else {
        details.push(`✗ Slow response time: ${responseTime.toFixed(2)}ms`)
      }

      // Test 4: Cache performance
      if (largeTest.cacheHitRate > 0.8) { // 80% hit rate
        results.cachePerformance = true
        details.push(`✓ Good cache performance: ${(largeTest.cacheHitRate * 100).toFixed(1)}% hit rate`)
      } else {
        details.push(`✗ Poor cache performance: ${(largeTest.cacheHitRate * 100).toFixed(1)}% hit rate`)
      }

      // Test 5: Concurrent processing
      const concurrentTasks = []
      for (let i = 0; i < 5; i++) {
        concurrentTasks.push(this.testLargeManuscriptProcessing(10000))
      }
      
      const concurrentResults = await Promise.all(concurrentTasks)
      const avgTime = concurrentResults.reduce((sum, r) => sum + r.processingTime, 0) / concurrentResults.length
      
      if (avgTime < 60000) { // Average less than 1 minute
        results.concurrentProcessing = true
        details.push(`✓ Concurrent processing: ${(avgTime / 1000).toFixed(1)}s average`)
      } else {
        details.push(`✗ Concurrent processing too slow: ${(avgTime / 1000).toFixed(1)}s average`)
      }

    } catch (error) {
      details.push(`✗ Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    const passed = Object.values(results).every(r => r === true)
    return { passed, results, details }
  }

  getTestResults(): PerformanceTestResult[] {
    return this.testResults
  }

  generateReport(): string {
    const summary = this.testResults.reduce((acc, result) => {
      acc.total++
      if (result.success) acc.passed++
      else acc.failed++
      acc.totalDuration += result.duration
      return acc
    }, { total: 0, passed: 0, failed: 0, totalDuration: 0 })

    return `Performance Test Report
========================
Total Tests: ${summary.total}
Passed: ${summary.passed}
Failed: ${summary.failed}
Success Rate: ${summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0}%
Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s
Average Test Duration: ${summary.total > 0 ? (summary.totalDuration / summary.total).toFixed(2) : 0}ms

Test Details:
${this.testResults.map(result => `
${result.success ? '✓' : '✗'} ${result.testName}
  Duration: ${result.duration.toFixed(2)}ms
  Memory Delta: ${(result.memoryUsage.after - result.memoryUsage.before) / 1024 / 1024}MB
  ${result.errors.length > 0 ? `Errors: ${result.errors.join(', ')}` : ''}
`).join('\n')}`
  }
}

export const performanceTestSuite = new PerformanceTestSuite()
export default performanceTestSuite