import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { useSingleManuscriptStore } from '@/store/singleManuscriptStore'
import { ConsistencyEngine } from '@/lib/consistency-engine'
import { ExportEngine } from '@/lib/export-engine'
import { performanceMonitor } from '@/lib/performance-monitor'

describe('Complete Workflow Integration', () => {
  beforeEach(() => {
    // Reset store before each test
    useSingleManuscriptStore.getState().actions.initialize()
    performanceMonitor.reset()
  })
  
  afterEach(() => {
    // Clean up after each test
    performanceMonitor.reset()
  })
  
  it('should complete full chapter reordering workflow', async () => {
    const { result } = renderHook(() => useSingleManuscriptStore())
    
    // Initialize manuscript
    await act(async () => {
      await result.current.actions.initialize()
    })
    
    expect(result.current.manuscript).toBeDefined()
    expect(result.current.manuscript?.content.chapters.length).toBeGreaterThan(0)
    
    // Create new version
    let newVersionId: string
    await act(async () => {
      newVersionId = await result.current.actions.createVersion(
        'Tension-First Order',
        'Reorder chapters to maximize tension progression'
      )
    })
    
    expect(result.current.availableVersions.length).toBe(2)
    expect(newVersionId!).toBeDefined()
    
    // Reorder chapters
    const originalOrder = result.current.currentVersion?.chapterOrder || []
    const newOrder = [...originalOrder].reverse()
    
    act(() => {
      result.current.actions.reorderChapters(newOrder)
    })
    
    expect(result.current.currentVersion?.chapterOrder).toEqual(newOrder)
    expect(result.current.unsavedChanges).toBe(true)
    
    // Preview reordering (consistency check)
    let previewResult: any
    await act(async () => {
      previewResult = await result.current.actions.previewReordering(newOrder)
    })
    
    expect(previewResult).toBeDefined()
    expect(previewResult.checks).toBeDefined()
    expect(Array.isArray(previewResult.checks)).toBe(true)
    
    // Apply reordering
    await act(async () => {
      await result.current.actions.applyReordering()
    })
    
    // Run full consistency check
    await act(async () => {
      await result.current.actions.runConsistencyCheck()
    })
    
    expect(result.current.consistencyReport).toBeDefined()
    expect(result.current.consistencyReport?.checks).toBeDefined()
    expect(result.current.consistencyReport?.summary).toBeDefined()
    
    // Save manuscript
    await act(async () => {
      await result.current.actions.saveManuscript()
    })
    
    expect(result.current.unsavedChanges).toBe(false)
  }, 10000)
  
  it('should handle version switching correctly', async () => {
    const { result } = renderHook(() => useSingleManuscriptStore())
    
    await act(async () => {
      await result.current.actions.initialize()
    })
    
    const originalVersionId = result.current.currentVersion?.id
    expect(originalVersionId).toBeDefined()
    
    // Create new version
    let newVersionId: string
    await act(async () => {
      newVersionId = await result.current.actions.createVersion('Test Version', 'Test description')
    })
    
    expect(newVersionId!).toBeDefined()
    expect(result.current.availableVersions.length).toBe(2)
    
    // Switch to new version
    await act(async () => {
      await result.current.actions.switchVersion(newVersionId!)
    })
    
    expect(result.current.currentVersion?.id).toBe(newVersionId!)
    expect(result.current.currentVersion?.name).toBe('Test Version')
    
    // Switch back to original
    await act(async () => {
      await result.current.actions.switchVersion(originalVersionId!)
    })
    
    expect(result.current.currentVersion?.id).toBe(originalVersionId)
  }, 8000)
  
  it('should maintain performance benchmarks', async () => {
    const { result } = renderHook(() => useSingleManuscriptStore())
    
    const startTime = performance.now()
    
    await act(async () => {
      await result.current.actions.initialize()
    })
    
    const initTime = performance.now() - startTime
    expect(initTime).toBeLessThan(3000) // Should initialize in under 3 seconds
    
    // Test chapter content update performance
    const chapters = result.current.manuscript?.content.chapters || []
    if (chapters.length > 0) {
      const updateStartTime = performance.now()
      
      act(() => {
        result.current.actions.updateChapterContent(
          chapters[0].id, 
          'Updated chapter content for performance testing'
        )
      })
      
      const updateTime = performance.now() - updateStartTime
      expect(updateTime).toBeLessThan(100) // Should update in under 100ms
    }
    
    // Test chapter switching performance
    if (chapters.length > 1) {
      const switchStartTime = performance.now()
      
      act(() => {
        result.current.actions.setActiveChapter(chapters[1].id)
      })
      
      const switchTime = performance.now() - switchStartTime
      expect(switchTime).toBeLessThan(50) // Should switch in under 50ms
    }
  }, 5000)
  
  it('should handle consistency checking engine correctly', async () => {
    const { result } = renderHook(() => useSingleManuscriptStore())
    
    await act(async () => {
      await result.current.actions.initialize()
    })
    
    const manuscript = result.current.manuscript
    expect(manuscript).toBeDefined()
    
    if (manuscript) {
      const engine = new ConsistencyEngine(manuscript)
      
      // Test consistency analysis
      const checks = await engine.analyzeConsistency()
      expect(Array.isArray(checks)).toBe(true)
      
      // Test order quality analysis
      const quality = await engine.analyzeOrderQuality()
      expect(quality).toBeDefined()
      expect(typeof quality.score).toBe('number')
      expect(quality.score).toBeGreaterThanOrEqual(0)
      expect(quality.score).toBeLessThanOrEqual(100)
      expect(Array.isArray(quality.strengths)).toBe(true)
      expect(Array.isArray(quality.improvements)).toBe(true)
      
      // Test optimal order suggestion
      const optimal = await engine.suggestOptimalOrder()
      expect(optimal).toBeDefined()
      expect(Array.isArray(optimal.order)).toBe(true)
      expect(Array.isArray(optimal.reasoning)).toBe(true)
      expect(optimal.order.length).toBe(manuscript.content.chapters.length)
    }
  }, 5000)
  
  it('should handle export engine correctly', async () => {
    const { result } = renderHook(() => useSingleManuscriptStore())
    
    await act(async () => {
      await result.current.actions.initialize()
    })
    
    const manuscript = result.current.manuscript
    expect(manuscript).toBeDefined()
    
    if (manuscript && result.current.currentVersion) {
      const engine = new ExportEngine(manuscript)
      
      // Test export stats
      const stats = await engine.getExportStats({
        format: 'txt',
        versionId: result.current.currentVersion.id,
        includeMetadata: true,
        includeOutline: true,
        includeNotes: false,
        pageBreakBetweenChapters: true
      })
      
      expect(stats).toBeDefined()
      expect(typeof stats.wordCount).toBe('number')
      expect(typeof stats.characterCount).toBe('number')
      expect(typeof stats.pageCount).toBe('number')
      expect(typeof stats.estimatedFileSize).toBe('string')
      
      // Test text export
      const textBlob = await engine.exportVersion({
        format: 'txt',
        versionId: result.current.currentVersion.id,
        includeMetadata: true,
        includeOutline: true,
        includeNotes: false,
        pageBreakBetweenChapters: true
      })
      
      expect(textBlob).toBeInstanceOf(Blob)
      expect(textBlob.type).toBe('text/plain;charset=utf-8')
      
      // Test markdown export
      const markdownBlob = await engine.exportVersion({
        format: 'markdown',
        versionId: result.current.currentVersion.id,
        includeMetadata: true,
        includeOutline: true,
        includeNotes: true,
        pageBreakBetweenChapters: true
      })
      
      expect(markdownBlob).toBeInstanceOf(Blob)
      expect(markdownBlob.type).toBe('text/markdown;charset=utf-8')
      
      // Test comparison report
      if (result.current.availableVersions.length > 1) {
        const report = await engine.generateComparisonReport(
          result.current.availableVersions[0].id,
          result.current.availableVersions[1].id
        )
        
        expect(typeof report).toBe('string')
        expect(report).toContain('Version Comparison Report')
        expect(report).toContain('Chapter Order Changes')
      }
    }
  }, 8000)
  
  it('should track performance metrics correctly', async () => {
    const { result } = renderHook(() => useSingleManuscriptStore())
    
    // Reset performance monitor
    performanceMonitor.reset()
    
    await act(async () => {
      await result.current.actions.initialize()
    })
    
    // Simulate some operations to generate metrics
    act(() => {
      result.current.actions.setEditorMode('reorder')
    })
    
    if (result.current.manuscript?.content.chapters.length) {
      act(() => {
        result.current.actions.setActiveChapter(result.current.manuscript!.content.chapters[0].id)
      })
    }
    
    await act(async () => {
      await result.current.actions.saveManuscript()
    })
    
    // Get performance metrics
    const metrics = performanceMonitor.getMetrics()
    expect(metrics).toBeDefined()
    
    // Check that some metrics were recorded
    expect(typeof metrics.chapterSwitchTime).toBe('number')
    expect(typeof metrics.saveOperationTime).toBe('number')
    
    // Test performance report generation
    const report = performanceMonitor.generateReport()
    expect(typeof report).toBe('string')
    expect(report).toContain('Performance Report')
    expect(report).toContain('Timing Metrics')
    expect(report).toContain('Recommendations')
    
    // Test recommendations
    const recommendations = performanceMonitor.generateRecommendations()
    expect(Array.isArray(recommendations)).toBe(true)
    expect(recommendations.length).toBeGreaterThan(0)
  }, 6000)
  
  it('should handle error scenarios gracefully', async () => {
    const { result } = renderHook(() => useSingleManuscriptStore())
    
    // Test handling of invalid version switching
    await act(async () => {
      await result.current.actions.initialize()
    })
    
    // Try to switch to non-existent version
    await act(async () => {
      try {
        await result.current.actions.switchVersion('non-existent-id')
      } catch (error) {
        // Should handle error gracefully
        expect(error).toBeDefined()
      }
    })
    
    // Application should still be functional
    expect(result.current.manuscript).toBeDefined()
    expect(result.current.currentVersion).toBeDefined()
    
    // Test handling of export with invalid version
    await act(async () => {
      try {
        await result.current.actions.exportVersion('invalid-version', 'txt')
      } catch (error) {
        // Should handle error gracefully
        expect(error).toBeDefined()
      }
    })
    
    // Test consistency check with corrupted data
    if (result.current.manuscript) {
      const engine = new ConsistencyEngine(result.current.manuscript)
      
      // Should handle empty chapter order gracefully
      const checks = await engine.analyzeConsistency([])
      expect(Array.isArray(checks)).toBe(true)
    }
  }, 5000)
  
  it('should maintain data integrity throughout operations', async () => {
    const { result } = renderHook(() => useSingleManuscriptStore())
    
    await act(async () => {
      await result.current.actions.initialize()
    })
    
    const originalManuscript = result.current.manuscript
    expect(originalManuscript).toBeDefined()
    
    // Store original chapter order
    const originalChapterOrder = originalManuscript?.content.chapters.map(c => c.id) || []
    
    // Create version and reorder
    let versionId: string
    await act(async () => {
      versionId = await result.current.actions.createVersion('Test Integrity', 'Testing data integrity')
    })
    
    // Reorder chapters
    const newOrder = [...originalChapterOrder].reverse()
    act(() => {
      result.current.actions.reorderChapters(newOrder)
    })
    
    // Verify chapter content integrity
    const reorderedManuscript = result.current.manuscript
    expect(reorderedManuscript?.content.chapters.length).toBe(originalChapterOrder.length)
    
    // Each chapter should maintain its content
    originalChapterOrder.forEach(chapterId => {
      const originalChapter = originalManuscript?.content.chapters.find(c => c.id === chapterId)
      const reorderedChapter = reorderedManuscript?.content.chapters.find(c => c.id === chapterId)
      
      expect(reorderedChapter).toBeDefined()
      expect(reorderedChapter?.content).toBe(originalChapter?.content)
      expect(reorderedChapter?.title).toBe(originalChapter?.title)
    })
    
    // Switch back to original version
    const originalVersionId = result.current.availableVersions.find(v => v.name === 'Original')?.id
    if (originalVersionId) {
      await act(async () => {
        await result.current.actions.switchVersion(originalVersionId)
      })
      
      // Verify original order is restored
      expect(result.current.currentVersion?.chapterOrder).toEqual(originalChapterOrder)
    }
  }, 8000)
})

describe('Performance Benchmarks', () => {
  it('should meet timing benchmarks for core operations', async () => {
    const { result } = renderHook(() => useSingleManuscriptStore())
    
    // Editor initialization benchmark
    const initStart = performance.now()
    await act(async () => {
      await result.current.actions.initialize()
    })
    const initTime = performance.now() - initStart
    expect(initTime).toBeLessThan(3000) // <3s target
    
    if (result.current.manuscript?.content.chapters.length) {
      // Chapter switching benchmark
      const switchStart = performance.now()
      act(() => {
        result.current.actions.setActiveChapter(result.current.manuscript!.content.chapters[0].id)
      })
      const switchTime = performance.now() - switchStart
      expect(switchTime).toBeLessThan(50) // <50ms target
      
      // Save operation benchmark
      const saveStart = performance.now()
      await act(async () => {
        await result.current.actions.saveManuscript()
      })
      const saveTime = performance.now() - saveStart
      expect(saveTime).toBeLessThan(1000) // <1s target
      
      // Consistency check benchmark
      const checkStart = performance.now()
      await act(async () => {
        await result.current.actions.runConsistencyCheck()
      })
      const checkTime = performance.now() - checkStart
      expect(checkTime).toBeLessThan(3000) // <3s target
    }
  }, 10000)
  
  it('should maintain memory usage within limits', async () => {
    const { result } = renderHook(() => useSingleManuscriptStore())
    
    // Check initial memory if available
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const initialMemory = memory.usedJSHeapSize / 1024 / 1024 // MB
      
      await act(async () => {
        await result.current.actions.initialize()
      })
      
      // Perform several operations to test memory stability
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await result.current.actions.createVersion(`Test ${i}`, `Test version ${i}`)
        })
        
        if (result.current.manuscript?.content.chapters.length) {
          act(() => {
            const chapters = result.current.manuscript!.content.chapters
            const newOrder = [...chapters.map(c => c.id)].reverse()
            result.current.actions.reorderChapters(newOrder)
          })
        }
        
        await act(async () => {
          await result.current.actions.runConsistencyCheck()
        })
      }
      
      const finalMemory = memory.usedJSHeapSize / 1024 / 1024 // MB
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable (less than 50MB for test operations)
      expect(memoryIncrease).toBeLessThan(50)
      
      // Total memory should be under 200MB
      expect(finalMemory).toBeLessThan(200)
    }
  }, 15000)
})