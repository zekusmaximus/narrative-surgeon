import { describe, it, expect, beforeEach } from '@jest/globals'
import { ConsistencyEngine } from '@/lib/consistency-engine'
import { ExportEngine } from '@/lib/export-engine'
import { PerformanceMonitor } from '@/lib/performance-monitor'
import type { TechnoThrillerManuscript } from '@/types/single-manuscript'

// Mock manuscript data for testing
const createMockManuscript = (): TechnoThrillerManuscript => ({
  id: 'test-manuscript',
  metadata: {
    title: 'Test Thriller',
    author: 'Test Author',
    genre: 'techno-thriller',
    wordCount: 80000,
    characterCount: 350000,
    chapterCount: 25,
    lastModified: new Date(),
    created: new Date(),
    version: '1.0'
  },
  content: {
    chapters: [
      {
        id: 'ch1',
        title: 'The Discovery',
        content: 'Dr. Sarah Chen stared at the quantum computing array. The encryption key appeared on screen.',
        wordCount: 1500,
        currentPosition: 1,
        metadata: {
          pov: 'Sarah Chen',
          location: ['MIT Lab'],
          timeframe: 'Day 1, Morning',
          tensionLevel: 3,
          majorEvents: ['Discovers encrypted data'],
          techElements: ['Quantum computing'],
          characterArcs: ['Sarah introduction']
        },
        dependencies: {
          introduces: ['Sarah Chen', 'Quantum computing', 'Encryption mystery'],
          requiredKnowledge: [],
          references: [],
          continuityRules: ['Character consistency']
        }
      },
      {
        id: 'ch2',
        title: 'The Pursuit',
        content: 'Marcus Webb received the alert. Someone had accessed the quantum system. Sarah Chen was now a target.',
        wordCount: 1800,
        currentPosition: 2,
        metadata: {
          pov: 'Marcus Webb',
          location: ['NSA Headquarters'],
          timeframe: 'Day 1, Afternoon',
          tensionLevel: 7,
          majorEvents: ['Marcus learns of breach', 'Sarah becomes target'],
          techElements: ['NSA systems'],
          characterArcs: ['Marcus introduction']
        },
        dependencies: {
          introduces: ['Marcus Webb', 'NSA involvement'],
          requiredKnowledge: ['Sarah Chen', 'Quantum computing'],
          references: [{ targetChapterId: 'ch1', referenceType: 'plot', description: 'References the discovery', strength: 'strong' }],
          continuityRules: ['Character consistency']
        }
      },
      {
        id: 'ch3',
        title: 'The Network',
        content: 'Sarah discovered the neural network patterns hidden in the blockchain. The AI had been learning.',
        wordCount: 2100,
        currentPosition: 3,
        metadata: {
          pov: 'Sarah Chen',
          location: ['MIT Lab', 'Hidden Server Room'],
          timeframe: 'Day 1, Evening',
          tensionLevel: 8,
          majorEvents: ['AI discovery', 'Network infiltration'],
          techElements: ['AI', 'Blockchain'],
          characterArcs: ['Sarah development']
        },
        dependencies: {
          introduces: ['AI consciousness', 'Blockchain network'],
          requiredKnowledge: ['Sarah Chen', 'Quantum computing', 'Encryption mystery'],
          references: [{ targetChapterId: 'ch1', referenceType: 'tech', description: 'Builds on initial discovery', strength: 'medium' }],
          continuityRules: ['Tech consistency']
        }
      }
    ],
    characters: [
      {
        id: 'sarah',
        name: 'Sarah Chen',
        role: 'protagonist',
        description: 'Quantum computing researcher at MIT',
        firstAppearance: 'ch1',
        techExpertise: ['Quantum computing', 'Cryptography']
      },
      {
        id: 'marcus',
        name: 'Marcus Webb',
        role: 'antagonist',
        description: 'NSA cyber security specialist',
        firstAppearance: 'ch2',
        techExpertise: ['Cybersecurity', 'Network analysis']
      }
    ],
    locations: [
      {
        id: 'mit-lab',
        name: 'MIT Lab',
        type: 'building',
        description: 'Quantum computing research laboratory',
        firstMention: 'ch1',
        significance: 'major'
      },
      {
        id: 'nsa-hq',
        name: 'NSA Headquarters',
        type: 'building',
        description: 'National Security Agency headquarters',
        firstMention: 'ch2',
        significance: 'major'
      }
    ]
  },
  settings: {
    autoSave: true,
    autoSaveInterval: 30,
    showWordCount: true,
    showCharacterCount: true,
    enableConsistencyChecking: true,
    highlightInconsistencies: true,
    defaultView: 'editor'
  },
  versions: new Map([
    ['v1', {
      id: 'v1',
      name: 'Original',
      description: 'Original chapter order',
      chapterOrder: ['ch1', 'ch2', 'ch3'],
      created: new Date(),
      isBaseVersion: true,
      parentVersionId: undefined,
      changes: []
    }]
  ])
})

describe('ConsistencyEngine', () => {
  let manuscript: TechnoThrillerManuscript
  let engine: ConsistencyEngine

  beforeEach(() => {
    manuscript = createMockManuscript()
    engine = new ConsistencyEngine(manuscript)
  })

  it('should analyze consistency correctly', async () => {
    const checks = await engine.analyzeConsistency()
    
    expect(Array.isArray(checks)).toBe(true)
    expect(checks.length).toBeGreaterThanOrEqual(0)
    
    // Check structure of consistency checks
    checks.forEach(check => {
      expect(check).toHaveProperty('id')
      expect(check).toHaveProperty('type')
      expect(check).toHaveProperty('severity')
      expect(check).toHaveProperty('message')
      expect(check).toHaveProperty('chapterIds')
      expect(check).toHaveProperty('autoFixable')
      
      expect(['error', 'warning', 'info']).toContain(check.severity)
      expect(Array.isArray(check.chapterIds)).toBe(true)
      expect(typeof check.autoFixable).toBe('boolean')
    })
  })

  it('should detect knowledge dependency issues', async () => {
    // Create a problematic order where Chapter 2 comes before Chapter 1
    const problematicOrder = ['ch2', 'ch1', 'ch3']
    const checks = await engine.analyzeConsistency(problematicOrder)
    
    const dependencyChecks = checks.filter(check => check.type === 'plot')
    expect(dependencyChecks.length).toBeGreaterThan(0)
    
    // Chapter 2 should have warnings about missing knowledge
    const ch2Issues = dependencyChecks.filter(check => 
      check.chapterIds.includes('ch2') && check.severity === 'warning'
    )
    expect(ch2Issues.length).toBeGreaterThan(0)
  })

  it('should detect character introduction issues', async () => {
    // Marcus Webb appears in ch2 but is used as POV without proper introduction
    const checks = await engine.analyzeConsistency(['ch2', 'ch1', 'ch3'])
    
    const characterChecks = checks.filter(check => check.type === 'character')
    expect(characterChecks.length).toBeGreaterThan(0)
    
    // Should detect POV character issue
    const povIssues = characterChecks.filter(check => 
      check.message.includes('POV character') && check.severity === 'error'
    )
    expect(povIssues.length).toBeGreaterThan(0)
  })

  it('should suggest optimal chapter order', async () => {
    const result = await engine.suggestOptimalOrder()
    
    expect(result).toHaveProperty('order')
    expect(result).toHaveProperty('reasoning')
    expect(Array.isArray(result.order)).toBe(true)
    expect(Array.isArray(result.reasoning)).toBe(true)
    expect(result.order.length).toBe(manuscript.content.chapters.length)
    
    // All chapter IDs should be present
    manuscript.content.chapters.forEach(chapter => {
      expect(result.order).toContain(chapter.id)
    })
  })

  it('should analyze order quality', async () => {
    const quality = await engine.analyzeOrderQuality()
    
    expect(quality).toHaveProperty('score')
    expect(quality).toHaveProperty('issues')
    expect(quality).toHaveProperty('strengths')
    expect(quality).toHaveProperty('improvements')
    
    expect(typeof quality.score).toBe('number')
    expect(quality.score).toBeGreaterThanOrEqual(0)
    expect(quality.score).toBeLessThanOrEqual(100)
    expect(Array.isArray(quality.strengths)).toBe(true)
    expect(Array.isArray(quality.improvements)).toBe(true)
  })

  it('should handle empty chapter order gracefully', async () => {
    const checks = await engine.analyzeConsistency([])
    expect(Array.isArray(checks)).toBe(true)
    expect(checks.length).toBe(0)
  })
})

describe('ExportEngine', () => {
  let manuscript: TechnoThrillerManuscript
  let engine: ExportEngine

  beforeEach(() => {
    manuscript = createMockManuscript()
    engine = new ExportEngine(manuscript)
  })

  it('should export as text format', async () => {
    const blob = await engine.exportVersion({
      format: 'txt',
      versionId: 'v1',
      includeMetadata: true,
      includeOutline: true,
      includeNotes: false,
      pageBreakBetweenChapters: true
    })

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/plain;charset=utf-8')
    expect(blob.size).toBeGreaterThan(0)

    // Verify content
    const text = await blob.text()
    expect(text).toContain(manuscript.metadata.title)
    expect(text).toContain(manuscript.metadata.author)
    expect(text).toContain('Chapter 1: The Discovery')
    expect(text).toContain('Dr. Sarah Chen stared')
  })

  it('should export as markdown format', async () => {
    const blob = await engine.exportVersion({
      format: 'markdown',
      versionId: 'v1',
      includeMetadata: true,
      includeOutline: true,
      includeNotes: true,
      pageBreakBetweenChapters: true
    })

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/markdown;charset=utf-8')

    const text = await blob.text()
    expect(text).toContain('# Test Thriller')
    expect(text).toContain('**by Test Author**')
    expect(text).toContain('## Chapter 1: The Discovery')
    expect(text).toContain('> **Chapter Details:**')
  })

  it('should export as HTML format (for DOCX)', async () => {
    const blob = await engine.exportVersion({
      format: 'docx',
      versionId: 'v1',
      includeMetadata: true,
      includeOutline: false,
      includeNotes: false,
      pageBreakBetweenChapters: true
    })

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')

    const text = await blob.text()
    expect(text).toContain('<!DOCTYPE html>')
    expect(text).toContain('<title>Test Thriller</title>')
    expect(text).toContain('class="chapter-title"')
  })

  it('should generate export statistics', async () => {
    const stats = await engine.getExportStats({
      format: 'txt',
      versionId: 'v1',
      includeMetadata: true,
      includeOutline: true,
      includeNotes: false,
      pageBreakBetweenChapters: true
    })

    expect(stats).toHaveProperty('estimatedFileSize')
    expect(stats).toHaveProperty('pageCount')
    expect(stats).toHaveProperty('wordCount')
    expect(stats).toHaveProperty('characterCount')

    expect(typeof stats.wordCount).toBe('number')
    expect(typeof stats.characterCount).toBe('number')
    expect(typeof stats.pageCount).toBe('number')
    expect(typeof stats.estimatedFileSize).toBe('string')

    expect(stats.wordCount).toBeGreaterThan(0)
    expect(stats.characterCount).toBeGreaterThan(0)
    expect(stats.pageCount).toBeGreaterThan(0)
  })

  it('should generate comparison reports', async () => {
    // Add a second version for comparison
    manuscript.versions.set('v2', {
      id: 'v2',
      name: 'Reordered',
      description: 'Different chapter order',
      chapterOrder: ['ch2', 'ch1', 'ch3'],
      created: new Date(),
      isBaseVersion: false,
      parentVersionId: 'v1',
      changes: [{
        type: 'reorder',
        chapterId: 'ch2',
        oldPosition: 2,
        newPosition: 1,
        description: 'Moved chapter 2 to beginning',
        timestamp: new Date()
      }]
    })

    const report = await engine.generateComparisonReport('v1', 'v2')

    expect(typeof report).toBe('string')
    expect(report).toContain('Version Comparison Report')
    expect(report).toContain('Chapter Order Changes')
    expect(report).toContain('Original')
    expect(report).toContain('Reordered')
    expect(report).toContain('Change Log')
  })

  it('should handle non-existent version gracefully', async () => {
    await expect(engine.exportVersion({
      format: 'txt',
      versionId: 'non-existent',
      includeMetadata: true,
      includeOutline: true,
      includeNotes: false,
      pageBreakBetweenChapters: true
    })).rejects.toThrow('Version non-existent not found')
  })
})

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = new PerformanceMonitor()
  })

  it('should track timing operations', () => {
    monitor.startTimer('testOperation')
    
    // Simulate some work
    const start = performance.now()
    while (performance.now() - start < 10) {
      // Wait 10ms
    }
    
    const duration = monitor.endTimer('testOperation')
    expect(duration).toBeGreaterThan(5)
    expect(duration).toBeLessThan(50)
  })

  it('should record various metrics', () => {
    monitor.recordTypingLatency(25)
    monitor.recordKeystroke()
    monitor.recordMemoryUsage()
    
    const metrics = monitor.getMetrics()
    expect(metrics.averageTypingLatency).toBe(25)
  })

  it('should generate performance report', () => {
    monitor.recordTypingLatency(30)
    monitor.startTimer('saveOperation')
    monitor.recordSaveOperation()
    
    const report = monitor.generateReport()
    expect(typeof report).toBe('string')
    expect(report).toContain('Performance Report')
    expect(report).toContain('Timing Metrics')
    expect(report).toContain('Recommendations')
  })

  it('should provide benchmark levels', () => {
    const excellentLevel = monitor.getBenchmarkLevel('editorLoadTime', 800)
    const goodLevel = monitor.getBenchmarkLevel('editorLoadTime', 1500)
    const poorLevel = monitor.getBenchmarkLevel('editorLoadTime', 6000)
    
    expect(excellentLevel).toBe('excellent')
    expect(goodLevel).toBe('good')
    expect(poorLevel).toBe('poor')
  })

  it('should generate recommendations', () => {
    // Set some poor metrics
    monitor.recordTypingLatency(100) // High latency
    monitor.startTimer('chapterSwitch')
    setTimeout(() => {
      monitor.recordChapterSwitch()
    }, 1500) // Slow switching
    
    const recommendations = monitor.generateRecommendations()
    expect(Array.isArray(recommendations)).toBe(true)
    expect(recommendations.some(rec => rec.includes('latency'))).toBe(true)
  })

  it('should handle memory monitoring', () => {
    monitor.recordMemoryUsage()
    const metrics = monitor.getMetrics()
    
    if ('memory' in performance) {
      expect(typeof metrics.memoryUsage).toBe('number')
      expect(metrics.memoryUsage).toBeGreaterThan(0)
    }
  })

  it('should export and import metrics', () => {
    monitor.recordTypingLatency(42)
    monitor.recordError(new Error('Test error'))
    
    const exported = monitor.exportMetrics()
    expect(typeof exported).toBe('string')
    
    const newMonitor = new PerformanceMonitor()
    newMonitor.importMetrics(exported)
    
    const metrics = newMonitor.getMetrics()
    expect(metrics.averageTypingLatency).toBe(42)
    expect(metrics.errorCount).toBe(1)
  })

  it('should reset properly', () => {
    monitor.recordTypingLatency(50)
    monitor.recordError(new Error('Test'))
    
    monitor.reset()
    
    const metrics = monitor.getMetrics()
    expect(metrics.averageTypingLatency).toBeUndefined()
    expect(metrics.errorCount).toBeUndefined()
  })
})