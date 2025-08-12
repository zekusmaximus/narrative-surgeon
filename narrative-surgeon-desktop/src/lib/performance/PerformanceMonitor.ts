'use client'

export interface PerformanceMetrics {
  // Memory metrics
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  
  // Processing metrics
  processingStats: {
    averageProcessingTime: number
    totalTasksProcessed: number
    tasksPerSecond: number
    queueLength: number
    activeWorkers: number
  }
  
  // Cache metrics
  cacheStats: {
    hitRate: number
    missRate: number
    totalSize: number
    entryCount: number
    memoryUsage: number
  }
  
  // Editor performance
  editorMetrics: {
    renderTime: number
    inputLatency: number
    scrollPerformance: number
    wordCount: number
    characterCount: number
  }
  
  // System metrics
  systemMetrics: {
    cpu: number
    frameRate: number
    networkRequests: number
    errorRate: number
  }
  
  timestamp: number
}

export interface PerformanceAlert {
  id: string
  type: 'memory' | 'processing' | 'latency' | 'error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  value: number
  threshold: number
  timestamp: number
  resolved?: boolean
}

export interface PerformanceConfig {
  monitoringInterval: number
  alertThresholds: {
    memoryUsage: number
    processingTime: number
    cacheSize: number
    errorRate: number
    inputLatency: number
  }
  enableProfiling: boolean
  enableLogging: boolean
  maxMetricsHistory: number
}

class PerformanceMonitor {
  private config: PerformanceConfig
  private metrics: PerformanceMetrics[] = []
  private alerts: PerformanceAlert[] = []
  private observers: Map<string, PerformanceObserver> = new Map()
  private intervals: NodeJS.Timeout[] = []
  private isMonitoring = false
  private startTime = Date.now()

  // Performance tracking state
  private taskStartTimes: Map<string, number> = new Map()
  private renderStartTimes: Map<string, number> = new Map()
  private networkRequestCount = 0
  private errorCount = 0
  private totalRequests = 0

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      monitoringInterval: 5000, // 5 seconds
      alertThresholds: {
        memoryUsage: 80, // 80%
        processingTime: 10000, // 10 seconds
        cacheSize: 100 * 1024 * 1024, // 100MB
        errorRate: 5, // 5%
        inputLatency: 100 // 100ms
      },
      enableProfiling: true,
      enableLogging: false,
      maxMetricsHistory: 100,
      ...config
    }

    this.initializeObservers()
  }

  private initializeObservers(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return

    try {
      // Navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleNavigationEntry(entry as PerformanceNavigationTiming)
        }
      })
      navigationObserver.observe({ entryTypes: ['navigation'] })
      this.observers.set('navigation', navigationObserver)

      // Measure timing
      const measureObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleMeasureEntry(entry)
        }
      })
      measureObserver.observe({ entryTypes: ['measure'] })
      this.observers.set('measure', measureObserver)

      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleResourceEntry(entry as PerformanceResourceTiming)
        }
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.set('resource', resourceObserver)

      // Paint timing
      if ('PerformancePaintTiming' in window) {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handlePaintEntry(entry as PerformancePaintTiming)
          }
        })
        paintObserver.observe({ entryTypes: ['paint'] })
        this.observers.set('paint', paintObserver)
      }
    } catch (error) {
      console.warn('Performance observers not fully supported:', error)
    }
  }

  startMonitoring(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    
    // Main metrics collection interval
    const metricsInterval = setInterval(() => {
      this.collectMetrics()
    }, this.config.monitoringInterval)
    this.intervals.push(metricsInterval)

    // Alert checking interval
    const alertInterval = setInterval(() => {
      this.checkAlerts()
    }, this.config.monitoringInterval / 2)
    this.intervals.push(alertInterval)

    // Cleanup old metrics
    const cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics()
    }, this.config.monitoringInterval * 5)
    this.intervals.push(cleanupInterval)

    if (this.config.enableLogging) {
      console.log('Performance monitoring started')
    }
  }

  stopMonitoring(): void {
    this.isMonitoring = false
    
    // Clear intervals
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals = []

    if (this.config.enableLogging) {
      console.log('Performance monitoring stopped')
    }
  }

  private collectMetrics(): void {
    const metrics: PerformanceMetrics = {
      memoryUsage: this.getMemoryMetrics(),
      processingStats: this.getProcessingMetrics(),
      cacheStats: this.getCacheMetrics(),
      editorMetrics: this.getEditorMetrics(),
      systemMetrics: this.getSystemMetrics(),
      timestamp: Date.now()
    }

    this.metrics.push(metrics)

    // Emit metrics event for listeners
    this.emitMetricsUpdate(metrics)
  }

  private getMemoryMetrics() {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return { used: 0, total: 0, percentage: 0 }
    }

    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    }
  }

  private getProcessingMetrics() {
    // Get stats from background processor if available
    const backgroundProcessor = (globalThis as any).backgroundProcessor
    if (backgroundProcessor?.getProcessingStats) {
      const stats = backgroundProcessor.getProcessingStats()
      return {
        averageProcessingTime: this.calculateAverageProcessingTime(),
        totalTasksProcessed: this.taskStartTimes.size,
        tasksPerSecond: this.calculateTasksPerSecond(),
        queueLength: stats.queueLength,
        activeWorkers: stats.workerCount
      }
    }

    return {
      averageProcessingTime: this.calculateAverageProcessingTime(),
      totalTasksProcessed: this.taskStartTimes.size,
      tasksPerSecond: this.calculateTasksPerSecond(),
      queueLength: 0,
      activeWorkers: 0
    }
  }

  private getCacheMetrics() {
    // Get stats from analysis cache if available
    const analysisCache = (globalThis as any).analysisCache
    if (analysisCache?.getStats) {
      return analysisCache.getStats()
    }

    return {
      hitRate: 0,
      missRate: 0,
      totalSize: 0,
      entryCount: 0,
      memoryUsage: 0
    }
  }

  private getEditorMetrics() {
    // Get editor performance metrics
    const editorElement = document.querySelector('[data-editor="true"]') as HTMLElement
    if (!editorElement) {
      return {
        renderTime: 0,
        inputLatency: 0,
        scrollPerformance: 0,
        wordCount: 0,
        characterCount: 0
      }
    }

    const content = editorElement.textContent || ''
    return {
      renderTime: this.getAverageRenderTime(),
      inputLatency: this.getAverageInputLatency(),
      scrollPerformance: this.getScrollPerformance(),
      wordCount: content.split(/\s+/).length,
      characterCount: content.length
    }
  }

  private getSystemMetrics() {
    return {
      cpu: this.estimateCPUUsage(),
      frameRate: this.getFrameRate(),
      networkRequests: this.networkRequestCount,
      errorRate: this.totalRequests > 0 ? (this.errorCount / this.totalRequests) * 100 : 0
    }
  }

  private checkAlerts(): void {
    const latestMetrics = this.metrics[this.metrics.length - 1]
    if (!latestMetrics) return

    // Check memory usage
    if (latestMetrics.memoryUsage.percentage > this.config.alertThresholds.memoryUsage) {
      this.createAlert({
        type: 'memory',
        severity: latestMetrics.memoryUsage.percentage > 90 ? 'critical' : 'high',
        message: `Memory usage is at ${latestMetrics.memoryUsage.percentage.toFixed(1)}%`,
        value: latestMetrics.memoryUsage.percentage,
        threshold: this.config.alertThresholds.memoryUsage
      })
    }

    // Check processing time
    if (latestMetrics.processingStats.averageProcessingTime > this.config.alertThresholds.processingTime) {
      this.createAlert({
        type: 'processing',
        severity: 'medium',
        message: `Average processing time is ${latestMetrics.processingStats.averageProcessingTime.toFixed(0)}ms`,
        value: latestMetrics.processingStats.averageProcessingTime,
        threshold: this.config.alertThresholds.processingTime
      })
    }

    // Check error rate
    if (latestMetrics.systemMetrics.errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert({
        type: 'error',
        severity: latestMetrics.systemMetrics.errorRate > 10 ? 'high' : 'medium',
        message: `Error rate is at ${latestMetrics.systemMetrics.errorRate.toFixed(1)}%`,
        value: latestMetrics.systemMetrics.errorRate,
        threshold: this.config.alertThresholds.errorRate
      })
    }

    // Check input latency
    if (latestMetrics.editorMetrics.inputLatency > this.config.alertThresholds.inputLatency) {
      this.createAlert({
        type: 'latency',
        severity: 'medium',
        message: `Input latency is ${latestMetrics.editorMetrics.inputLatency.toFixed(0)}ms`,
        value: latestMetrics.editorMetrics.inputLatency,
        threshold: this.config.alertThresholds.inputLatency
      })
    }
  }

  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp'>) {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...alertData
    }

    // Check if similar alert exists
    const existingAlert = this.alerts.find(a => 
      a.type === alert.type && !a.resolved && 
      Date.now() - a.timestamp < 60000 // Within 1 minute
    )

    if (!existingAlert) {
      this.alerts.push(alert)
      this.emitAlert(alert)
      
      if (this.config.enableLogging) {
        console.warn(`Performance Alert [${alert.severity}]:`, alert.message)
      }
    }
  }

  // Public tracking methods
  trackTaskStart(taskId: string): void {
    this.taskStartTimes.set(taskId, performance.now())
  }

  trackTaskEnd(taskId: string): number {
    const startTime = this.taskStartTimes.get(taskId)
    if (!startTime) return 0

    const duration = performance.now() - startTime
    this.taskStartTimes.delete(taskId)
    
    if (this.config.enableProfiling) {
      performance.mark(`task-${taskId}-end`)
      performance.measure(`task-${taskId}`, `task-${taskId}-start`, `task-${taskId}-end`)
    }

    return duration
  }

  trackRenderStart(componentName: string): void {
    if (this.config.enableProfiling) {
      performance.mark(`render-${componentName}-start`)
    }
    this.renderStartTimes.set(componentName, performance.now())
  }

  trackRenderEnd(componentName: string): number {
    const startTime = this.renderStartTimes.get(componentName)
    if (!startTime) return 0

    const duration = performance.now() - startTime
    this.renderStartTimes.delete(componentName)
    
    if (this.config.enableProfiling) {
      performance.mark(`render-${componentName}-end`)
      performance.measure(`render-${componentName}`, `render-${componentName}-start`, `render-${componentName}-end`)
    }

    return duration
  }

  trackNetworkRequest(success: boolean): void {
    this.networkRequestCount++
    this.totalRequests++
    if (!success) {
      this.errorCount++
    }
  }

  // Metrics calculation helpers
  private calculateAverageProcessingTime(): number {
    const measures = performance.getEntriesByType('measure').filter(m => 
      m.name.startsWith('task-')
    )
    if (measures.length === 0) return 0
    
    return measures.reduce((sum, m) => sum + m.duration, 0) / measures.length
  }

  private calculateTasksPerSecond(): number {
    const uptime = (Date.now() - this.startTime) / 1000
    return uptime > 0 ? this.taskStartTimes.size / uptime : 0
  }

  private getAverageRenderTime(): number {
    const measures = performance.getEntriesByType('measure').filter(m => 
      m.name.startsWith('render-')
    )
    if (measures.length === 0) return 0
    
    return measures.reduce((sum, m) => sum + m.duration, 0) / measures.length
  }

  private getAverageInputLatency(): number {
    // Estimate input latency based on event timing
    return 16 // Placeholder - would need actual event timing
  }

  private getScrollPerformance(): number {
    // Measure scroll performance
    return 60 // Placeholder - would need actual scroll metrics
  }

  private estimateCPUUsage(): number {
    // Rough CPU estimation based on processing times
    const recentMetrics = this.metrics.slice(-5)
    if (recentMetrics.length === 0) return 0
    
    const avgProcessingTime = recentMetrics.reduce((sum, m) => 
      sum + m.processingStats.averageProcessingTime, 0
    ) / recentMetrics.length
    
    return Math.min((avgProcessingTime / 1000) * 100, 100)
  }

  private getFrameRate(): number {
    // Estimate frame rate
    return 60 // Placeholder - would need actual frame timing
  }

  private cleanupOldMetrics(): void {
    if (this.metrics.length > this.config.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.config.maxMetricsHistory)
    }
    
    // Clean up old alerts
    this.alerts = this.alerts.filter(alert => 
      Date.now() - alert.timestamp < 24 * 60 * 60 * 1000 // Keep for 24 hours
    )
  }

  // Event handlers
  private handleNavigationEntry(entry: PerformanceNavigationTiming): void {
    if (this.config.enableLogging) {
      console.log('Navigation timing:', {
        loadTime: entry.loadEventEnd - entry.navigationStart,
        domReady: entry.domContentLoadedEventEnd - entry.navigationStart
      })
    }
  }

  private handleMeasureEntry(entry: PerformanceEntry): void {
    if (this.config.enableLogging && entry.duration > 100) {
      console.log('Slow operation detected:', entry.name, `${entry.duration.toFixed(2)}ms`)
    }
  }

  private handleResourceEntry(entry: PerformanceResourceTiming): void {
    this.trackNetworkRequest(entry.responseEnd > 0)
  }

  private handlePaintEntry(entry: PerformancePaintTiming): void {
    if (this.config.enableLogging) {
      console.log('Paint timing:', entry.name, `${entry.startTime.toFixed(2)}ms`)
    }
  }

  // Event emission for UI updates
  private emitMetricsUpdate(metrics: PerformanceMetrics): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performance-metrics', { detail: metrics }))
    }
  }

  private emitAlert(alert: PerformanceAlert): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performance-alert', { detail: alert }))
    }
  }

  // Public API
  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null
  }

  getMetricsHistory(count?: number): PerformanceMetrics[] {
    return count ? this.metrics.slice(-count) : this.metrics
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  getAllAlerts(): PerformanceAlert[] {
    return this.alerts
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
    }
  }

  exportMetrics(): { metrics: PerformanceMetrics[], alerts: PerformanceAlert[] } {
    return {
      metrics: this.metrics,
      alerts: this.alerts
    }
  }

  generateReport(): string {
    const latest = this.getLatestMetrics()
    if (!latest) return 'No metrics available'

    return `Performance Report (${new Date().toISOString()}):

Memory Usage: ${latest.memoryUsage.percentage.toFixed(1)}%
Average Processing Time: ${latest.processingStats.averageProcessingTime.toFixed(2)}ms
Cache Hit Rate: ${(latest.cacheStats.hitRate * 100).toFixed(1)}%
Active Alerts: ${this.getActiveAlerts().length}
Tasks Per Second: ${latest.processingStats.tasksPerSecond.toFixed(2)}
Error Rate: ${latest.systemMetrics.errorRate.toFixed(2)}%`
  }

  // Cleanup
  destroy(): void {
    this.stopMonitoring()
    
    // Disconnect observers
    for (const observer of this.observers.values()) {
      observer.disconnect()
    }
    this.observers.clear()
    
    // Clear data
    this.metrics = []
    this.alerts = []
    this.taskStartTimes.clear()
    this.renderStartTimes.clear()
  }
}

export const performanceMonitor = new PerformanceMonitor()
export default performanceMonitor