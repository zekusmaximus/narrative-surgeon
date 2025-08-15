export interface PerformanceMetrics {
  // Core timing metrics
  editorLoadTime?: number
  averageTypingLatency?: number
  chapterSwitchTime?: number
  saveOperationTime?: number
  reorderOperationTime?: number
  consistencyCheckTime?: number
  exportOperationTime?: number
  
  // Memory metrics
  memoryUsage?: number
  memoryPeak?: number
  memoryTrend?: 'stable' | 'increasing' | 'decreasing'
  
  // User interaction metrics
  keystrokesPerMinute?: number
  chaptersEditedPerSession?: number
  reorderOperationsPerSession?: number
  saveFrequency?: number
  
  // System health
  errorCount?: number
  warningCount?: number
  crashCount?: number
  
  // Productivity metrics
  wordsWrittenPerHour?: number
  editingEfficiency?: number
  timeInReorderMode?: number
  timeInEditMode?: number
}

export interface PerformanceBenchmarks {
  excellent: PerformanceMetrics
  good: PerformanceMetrics
  acceptable: PerformanceMetrics
  poor: PerformanceMetrics
}

export class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {}
  private timers: Map<string, number> = new Map()
  private sessionStart: number = Date.now()
  private keystrokeBuffer: number[] = []
  private memoryHistory: number[] = []
  private benchmarks: PerformanceBenchmarks
  
  constructor() {
    this.initializeBenchmarks()
    this.startPeriodicMonitoring()
  }
  
  private initializeBenchmarks(): void {
    this.benchmarks = {
      excellent: {
        editorLoadTime: 1000,
        averageTypingLatency: 16,
        chapterSwitchTime: 300,
        saveOperationTime: 200,
        reorderOperationTime: 500,
        consistencyCheckTime: 1000,
        exportOperationTime: 2000,
        memoryUsage: 50,
        keystrokesPerMinute: 300,
        wordsWrittenPerHour: 1000,
        editingEfficiency: 0.9
      },
      good: {
        editorLoadTime: 2000,
        averageTypingLatency: 33,
        chapterSwitchTime: 600,
        saveOperationTime: 500,
        reorderOperationTime: 1000,
        consistencyCheckTime: 2000,
        exportOperationTime: 5000,
        memoryUsage: 100,
        keystrokesPerMinute: 200,
        wordsWrittenPerHour: 750,
        editingEfficiency: 0.75
      },
      acceptable: {
        editorLoadTime: 3000,
        averageTypingLatency: 50,
        chapterSwitchTime: 1000,
        saveOperationTime: 1000,
        reorderOperationTime: 2000,
        consistencyCheckTime: 3000,
        exportOperationTime: 8000,
        memoryUsage: 150,
        keystrokesPerMinute: 150,
        wordsWrittenPerHour: 500,
        editingEfficiency: 0.6
      },
      poor: {
        editorLoadTime: 5000,
        averageTypingLatency: 100,
        chapterSwitchTime: 2000,
        saveOperationTime: 2000,
        reorderOperationTime: 4000,
        consistencyCheckTime: 5000,
        exportOperationTime: 15000,
        memoryUsage: 250,
        keystrokesPerMinute: 100,
        wordsWrittenPerHour: 250,
        editingEfficiency: 0.4
      }
    }
  }
  
  private startPeriodicMonitoring(): void {
    // Record memory usage every 30 seconds
    setInterval(() => {
      this.recordMemoryUsage()
    }, 30000)
    
    // Calculate derived metrics every 60 seconds
    setInterval(() => {
      this.calculateDerivedMetrics()
    }, 60000)
  }
  
  startTimer(operation: string): void {
    this.timers.set(operation, performance.now())
  }
  
  endTimer(operation: string): number {
    const startTime = this.timers.get(operation)
    if (!startTime) {
      console.warn(`Timer for operation '${operation}' was not started`)
      return 0
    }
    
    const duration = performance.now() - startTime
    this.timers.delete(operation)
    return duration
  }
  
  recordEditorLoad(): void {
    const loadTime = this.endTimer('editorLoad')
    this.metrics.editorLoadTime = loadTime
  }
  
  recordTypingLatency(latency: number): void {
    if (!this.metrics.averageTypingLatency) {
      this.metrics.averageTypingLatency = latency
    } else {
      // Rolling average
      this.metrics.averageTypingLatency = 
        (this.metrics.averageTypingLatency * 0.9) + (latency * 0.1)
    }
  }
  
  recordKeystroke(): void {
    const now = Date.now()
    this.keystrokeBuffer.push(now)
    
    // Keep only last minute of keystrokes
    const oneMinuteAgo = now - 60000
    this.keystrokeBuffer = this.keystrokeBuffer.filter(time => time > oneMinuteAgo)
  }
  
  recordMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const currentUsage = memory.usedJSHeapSize / 1024 / 1024 // MB
      
      this.metrics.memoryUsage = currentUsage
      this.memoryHistory.push(currentUsage)
      
      // Keep only last 20 measurements (10 minutes)
      if (this.memoryHistory.length > 20) {
        this.memoryHistory.shift()
      }
      
      // Update peak memory
      if (!this.metrics.memoryPeak || currentUsage > this.metrics.memoryPeak) {
        this.metrics.memoryPeak = currentUsage
      }
      
      // Calculate memory trend
      if (this.memoryHistory.length >= 3) {
        const recent = this.memoryHistory.slice(-3)
        const trend = this.calculateMemoryTrend(recent)
        this.metrics.memoryTrend = trend
      }
    }
  }
  
  private calculateMemoryTrend(values: number[]): 'stable' | 'increasing' | 'decreasing' {
    if (values.length < 2) return 'stable'
    
    const changes = []
    for (let i = 1; i < values.length; i++) {
      changes.push(values[i] - values[i - 1])
    }
    
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length
    
    if (Math.abs(avgChange) < 1) return 'stable' // Less than 1MB change
    return avgChange > 0 ? 'increasing' : 'decreasing'
  }
  
  recordChapterSwitch(): number {
    const switchTime = this.endTimer('chapterSwitch')
    this.metrics.chapterSwitchTime = switchTime
    return switchTime
  }
  
  recordSaveOperation(): number {
    const saveTime = this.endTimer('saveOperation')
    this.metrics.saveOperationTime = saveTime
    
    // Update save frequency
    const now = Date.now()
    const sessionTime = now - this.sessionStart
    this.metrics.saveFrequency = sessionTime / (this.metrics.saveFrequency || 1)
    
    return saveTime
  }
  
  recordReorderOperation(): number {
    const reorderTime = this.endTimer('reorderOperation')
    this.metrics.reorderOperationTime = reorderTime
    
    // Increment reorder operations counter
    this.metrics.reorderOperationsPerSession = (this.metrics.reorderOperationsPerSession || 0) + 1
    
    return reorderTime
  }
  
  recordConsistencyCheck(): number {
    const checkTime = this.endTimer('consistencyCheck')
    this.metrics.consistencyCheckTime = checkTime
    return checkTime
  }
  
  recordExportOperation(): number {
    const exportTime = this.endTimer('exportOperation')
    this.metrics.exportOperationTime = exportTime
    return exportTime
  }
  
  recordError(error: Error): void {
    this.metrics.errorCount = (this.metrics.errorCount || 0) + 1
    console.error('Performance Monitor - Error recorded:', error)
  }
  
  recordWarning(warning: string): void {
    this.metrics.warningCount = (this.metrics.warningCount || 0) + 1
    console.warn('Performance Monitor - Warning recorded:', warning)
  }
  
  recordCrash(): void {
    this.metrics.crashCount = (this.metrics.crashCount || 0) + 1
  }
  
  recordWordsWritten(wordCount: number): void {
    const sessionTime = (Date.now() - this.sessionStart) / (1000 * 60 * 60) // hours
    this.metrics.wordsWrittenPerHour = wordCount / sessionTime
  }
  
  recordModeSwitch(mode: 'edit' | 'reorder' | 'compare'): void {
    const now = Date.now()
    
    if (mode === 'edit') {
      this.startTimer('editMode')
    } else if (mode === 'reorder') {
      this.startTimer('reorderMode')
      
      // End edit mode if it was running
      if (this.timers.has('editMode')) {
        const editTime = this.endTimer('editMode')
        this.metrics.timeInEditMode = (this.metrics.timeInEditMode || 0) + editTime
      }
    } else {
      // End any running mode timers
      if (this.timers.has('editMode')) {
        const editTime = this.endTimer('editMode')
        this.metrics.timeInEditMode = (this.metrics.timeInEditMode || 0) + editTime
      }
      if (this.timers.has('reorderMode')) {
        const reorderTime = this.endTimer('reorderMode')
        this.metrics.timeInReorderMode = (this.metrics.timeInReorderMode || 0) + reorderTime
      }
    }
  }
  
  private calculateDerivedMetrics(): void {
    // Calculate keystrokes per minute
    this.metrics.keystrokesPerMinute = this.keystrokeBuffer.length
    
    // Calculate editing efficiency (words written / time in edit mode)
    if (this.metrics.timeInEditMode && this.metrics.wordsWrittenPerHour) {
      const editHours = this.metrics.timeInEditMode / (1000 * 60 * 60)
      this.metrics.editingEfficiency = this.metrics.wordsWrittenPerHour * editHours / 1000 // normalize
    }
  }
  
  getMetrics(): PerformanceMetrics {
    this.recordMemoryUsage()
    this.calculateDerivedMetrics()
    return this.metrics as PerformanceMetrics
  }
  
  getBenchmarkLevel(metric: keyof PerformanceMetrics, value: number): 'excellent' | 'good' | 'acceptable' | 'poor' {
    const excellent = this.benchmarks.excellent[metric] as number
    const good = this.benchmarks.good[metric] as number
    const acceptable = this.benchmarks.acceptable[metric] as number
    
    // For timing metrics, lower is better
    const isTimingMetric = metric.includes('Time') || metric.includes('Latency')
    
    if (isTimingMetric) {
      if (value <= excellent) return 'excellent'
      if (value <= good) return 'good'
      if (value <= acceptable) return 'acceptable'
      return 'poor'
    } else {
      // For other metrics, higher is usually better
      if (metric === 'memoryUsage') {
        // Exception: memory usage, lower is better
        if (value <= excellent) return 'excellent'
        if (value <= good) return 'good'
        if (value <= acceptable) return 'acceptable'
        return 'poor'
      } else {
        if (value >= excellent) return 'excellent'
        if (value >= good) return 'good'
        if (value >= acceptable) return 'acceptable'
        return 'poor'
      }
    }
  }
  
  generateRecommendations(): string[] {
    const metrics = this.getMetrics()
    const recommendations: string[] = []
    
    // Editor load time
    if (metrics.editorLoadTime && metrics.editorLoadTime > 3000) {
      recommendations.push('🐌 Editor load time is slow. Consider reducing initial bundle size or enabling code splitting.')
    }
    
    // Typing latency
    if (metrics.averageTypingLatency && metrics.averageTypingLatency > 50) {
      recommendations.push('⌨️ Typing latency is high. Consider debouncing operations or optimizing editor extensions.')
    }
    
    // Memory usage
    if (metrics.memoryUsage && metrics.memoryUsage > 150) {
      recommendations.push('🧠 Memory usage is high. Check for memory leaks in editor or store.')
    }
    
    // Memory trend
    if (metrics.memoryTrend === 'increasing') {
      recommendations.push('📈 Memory usage is increasing over time. Monitor for potential memory leaks.')
    }
    
    // Chapter switching
    if (metrics.chapterSwitchTime && metrics.chapterSwitchTime > 1000) {
      recommendations.push('📄 Chapter switching is slow. Consider preloading or optimizing chapter loading.')
    }
    
    // Save operations
    if (metrics.saveOperationTime && metrics.saveOperationTime > 1000) {
      recommendations.push('💾 Save operations are slow. Consider optimizing data serialization.')
    }
    
    // Reorder operations
    if (metrics.reorderOperationTime && metrics.reorderOperationTime > 2000) {
      recommendations.push('🔄 Chapter reordering is slow. Consider optimizing drag-and-drop implementation.')
    }
    
    // Consistency checking
    if (metrics.consistencyCheckTime && metrics.consistencyCheckTime > 3000) {
      recommendations.push('🔍 Consistency checking is slow. Consider optimizing analysis algorithms.')
    }
    
    // Export operations
    if (metrics.exportOperationTime && metrics.exportOperationTime > 10000) {
      recommendations.push('📤 Export operations are slow. Consider implementing background processing.')
    }
    
    // Error rate
    if (metrics.errorCount && metrics.errorCount > 5) {
      recommendations.push('❌ High error count detected. Review error logs and implement fixes.')
    }
    
    // Productivity
    if (metrics.editingEfficiency && metrics.editingEfficiency < 0.5) {
      recommendations.push('⚡ Editing efficiency is low. Consider simplifying the interface or adding productivity features.')
    }
    
    // Low activity
    if (metrics.keystrokesPerMinute && metrics.keystrokesPerMinute < 50) {
      recommendations.push('🎯 Low activity detected. Consider adding engagement features or reducing friction.')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ All performance metrics are within acceptable ranges. Great job!')
    }
    
    return recommendations
  }
  
  generateReport(): string {
    const metrics = this.getMetrics()
    
    const formatTime = (ms?: number) => ms ? `${ms.toFixed(2)}ms` : 'N/A'
    const formatMemory = (mb?: number) => mb ? `${mb.toFixed(2)}MB` : 'N/A'
    const formatNumber = (num?: number) => num ? num.toFixed(2) : 'N/A'
    
    const getBenchmarkIcon = (metric: keyof PerformanceMetrics, value?: number) => {
      if (!value) return '❓'
      const level = this.getBenchmarkLevel(metric, value)
      switch (level) {
        case 'excellent': return '🟢'
        case 'good': return '🟡'
        case 'acceptable': return '🟠'
        case 'poor': return '🔴'
      }
    }
    
    return `
# Performance Report

## ⏱️ Timing Metrics
- **Editor Load Time:** ${formatTime(metrics.editorLoadTime)} ${getBenchmarkIcon('editorLoadTime', metrics.editorLoadTime)}
- **Average Typing Latency:** ${formatTime(metrics.averageTypingLatency)} ${getBenchmarkIcon('averageTypingLatency', metrics.averageTypingLatency)}
- **Chapter Switch Time:** ${formatTime(metrics.chapterSwitchTime)} ${getBenchmarkIcon('chapterSwitchTime', metrics.chapterSwitchTime)}
- **Save Operation Time:** ${formatTime(metrics.saveOperationTime)} ${getBenchmarkIcon('saveOperationTime', metrics.saveOperationTime)}
- **Reorder Operation Time:** ${formatTime(metrics.reorderOperationTime)} ${getBenchmarkIcon('reorderOperationTime', metrics.reorderOperationTime)}
- **Consistency Check Time:** ${formatTime(metrics.consistencyCheckTime)} ${getBenchmarkIcon('consistencyCheckTime', metrics.consistencyCheckTime)}
- **Export Operation Time:** ${formatTime(metrics.exportOperationTime)} ${getBenchmarkIcon('exportOperationTime', metrics.exportOperationTime)}

## 🧠 Memory Metrics
- **Current Memory Usage:** ${formatMemory(metrics.memoryUsage)} ${getBenchmarkIcon('memoryUsage', metrics.memoryUsage)}
- **Peak Memory Usage:** ${formatMemory(metrics.memoryPeak)}
- **Memory Trend:** ${metrics.memoryTrend || 'Unknown'} ${metrics.memoryTrend === 'stable' ? '🟢' : metrics.memoryTrend === 'increasing' ? '🔴' : '🟡'}

## 📊 Productivity Metrics
- **Keystrokes Per Minute:** ${formatNumber(metrics.keystrokesPerMinute)} ${getBenchmarkIcon('keystrokesPerMinute', metrics.keystrokesPerMinute)}
- **Words Written Per Hour:** ${formatNumber(metrics.wordsWrittenPerHour)} ${getBenchmarkIcon('wordsWrittenPerHour', metrics.wordsWrittenPerHour)}
- **Editing Efficiency:** ${formatNumber(metrics.editingEfficiency)} ${getBenchmarkIcon('editingEfficiency', metrics.editingEfficiency)}
- **Time in Edit Mode:** ${formatTime(metrics.timeInEditMode)}
- **Time in Reorder Mode:** ${formatTime(metrics.timeInReorderMode)}

## 🔧 System Health
- **Error Count:** ${metrics.errorCount || 0}
- **Warning Count:** ${metrics.warningCount || 0}
- **Crash Count:** ${metrics.crashCount || 0}

## 💡 Recommendations

${this.generateRecommendations().map(rec => `- ${rec}`).join('\n')}

---
*Report generated at ${new Date().toISOString()}*
    `.trim()
  }
  
  reset(): void {
    this.metrics = {}
    this.timers.clear()
    this.sessionStart = Date.now()
    this.keystrokeBuffer = []
    this.memoryHistory = []
  }
  
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2)
  }
  
  importMetrics(data: string): void {
    try {
      this.metrics = JSON.parse(data)
    } catch (error) {
      console.error('Failed to import metrics:', error)
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Auto-start editor load timer
performanceMonitor.startTimer('editorLoad')

export default PerformanceMonitor