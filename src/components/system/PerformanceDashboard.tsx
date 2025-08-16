'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Zap,
  AlertTriangle,
  Database,
  Network,
  Monitor,
  Download,
  Play,
  Pause
} from 'lucide-react'
import { performanceMonitor, type PerformanceMetrics, type PerformanceAlert } from '@/lib/performance/PerformanceMonitor'

interface PerformanceDashboardProps {
  className?: string
  compact?: boolean
}

export function PerformanceDashboard({ className, compact = false }: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [metricsHistory, setMetricsHistory] = useState<PerformanceMetrics[]>([])
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)

  useEffect(() => {
    // Initialize monitoring
    if (!isMonitoring) {
      performanceMonitor.startMonitoring()
      setIsMonitoring(true)
    }

    // Set up event listeners
    const handleMetricsUpdate = (event: CustomEvent<PerformanceMetrics>) => {
      setMetrics(event.detail)
      setMetricsHistory(prev => [...prev.slice(-99), event.detail]) // Keep last 100
    }

    const handleAlert = (event: CustomEvent<PerformanceAlert>) => {
      setAlerts(prev => [event.detail, ...prev])
    }

    window.addEventListener('performance-metrics', handleMetricsUpdate as EventListener)
    window.addEventListener('performance-alert', handleAlert as EventListener)

    // Load initial data
    setMetrics(performanceMonitor.getLatestMetrics())
    setMetricsHistory(performanceMonitor.getMetricsHistory(100))
    setAlerts(performanceMonitor.getAllAlerts())

    return () => {
      window.removeEventListener('performance-metrics', handleMetricsUpdate as EventListener)
      window.removeEventListener('performance-alert', handleAlert as EventListener)
    }
  }, [isMonitoring])

  const toggleMonitoring = () => {
    if (isMonitoring) {
      performanceMonitor.stopMonitoring()
      setIsMonitoring(false)
    } else {
      performanceMonitor.startMonitoring()
      setIsMonitoring(true)
    }
  }

  const exportReport = () => {
    const report = performanceMonitor.generateReport()
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-report-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const resolveAlert = (alertId: string) => {
    performanceMonitor.resolveAlert(alertId)
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ))
  }


  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      case 'high': return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'low': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      default: return 'border-gray-300'
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (compact && metrics) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isMonitoring ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium">System Performance</div>
              <div className="text-xs text-muted-foreground">
                Memory: {metrics.memoryUsage.percentage.toFixed(1)}% | 
                CPU: {metrics.systemMetrics.cpu.toFixed(1)}% | 
                Tasks: {metrics.processingStats.queueLength}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alerts.filter(a => !a.resolved).length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {alerts.filter(a => !a.resolved).length}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={toggleMonitoring}>
              {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isMonitoring ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Performance Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Real-time system monitoring and optimization insights
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={toggleMonitoring}>
            {isMonitoring ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause Monitoring
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Monitoring
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <HardDrive className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.memoryUsage.percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Memory Usage</div>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(metrics.memoryUsage.used)} / {formatBytes(metrics.memoryUsage.total)}
                </div>
              </div>
            </div>
            <Progress value={metrics.memoryUsage.percentage} className="mt-3" />
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Cpu className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {metrics.systemMetrics.cpu.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">CPU Usage</div>
                <div className="text-xs text-muted-foreground">
                  {metrics.systemMetrics.frameRate.toFixed(0)} FPS
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Database className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {(metrics.cacheStats.hitRate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(metrics.cacheStats.totalSize)}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Zap className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.processingStats.queueLength}
                </div>
                <div className="text-sm text-muted-foreground">Queue Length</div>
                <div className="text-xs text-muted-foreground">
                  {metrics.processingStats.tasksPerSecond.toFixed(1)} tasks/sec
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {alerts.filter(a => !a.resolved).length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold">Active Alerts</h3>
            <Badge variant="destructive">
              {alerts.filter(a => !a.resolved).length}
            </Badge>
          </div>
          
          <div className="space-y-3">
            {alerts
              .filter(alert => !alert.resolved)
              .slice(0, 5)
              .map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${getAlertSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {alert.type}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium mb-1">{alert.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Detailed Metrics */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  System Overview
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Memory Usage</span>
                    <div className="flex items-center gap-2">
                      <Progress value={metrics.memoryUsage.percentage} className="w-20 h-2" />
                      <span className="text-sm font-medium">
                        {metrics.memoryUsage.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cache Efficiency</span>
                    <div className="flex items-center gap-2">
                      <Progress value={metrics.cacheStats.hitRate * 100} className="w-20 h-2" />
                      <span className="text-sm font-medium">
                        {(metrics.cacheStats.hitRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Error Rate</span>
                    <div className="flex items-center gap-2">
                      <Progress value={metrics.systemMetrics.errorRate} className="w-20 h-2" />
                      <span className="text-sm font-medium">
                        {metrics.systemMetrics.errorRate.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Network className="w-4 h-4" />
                  Network & Tasks
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Active Workers</span>
                    <span className="text-sm font-medium">{metrics.processingStats.activeWorkers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Queue Length</span>
                    <span className="text-sm font-medium">{metrics.processingStats.queueLength}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Network Requests</span>
                    <span className="text-sm font-medium">{metrics.systemMetrics.networkRequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Tasks/Second</span>
                    <span className="text-sm font-medium">
                      {metrics.processingStats.tasksPerSecond.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          {metrics && (
            <Card className="p-4">
              <h4 className="font-semibold mb-4">Processing Statistics</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {metrics.processingStats.averageProcessingTime.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Processing Time</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {metrics.processingStats.totalTasksProcessed}
                  </div>
                  <div className="text-sm text-muted-foreground">Tasks Processed</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {metrics.processingStats.activeWorkers}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Workers</div>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="editor" className="space-y-4">
          {metrics && (
            <Card className="p-4">
              <h4 className="font-semibold mb-4">Editor Performance</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Content Statistics</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Word Count</span>
                      <span className="font-medium">{metrics.editorMetrics.wordCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Character Count</span>
                      <span className="font-medium">{metrics.editorMetrics.characterCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Performance Metrics</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Render Time</span>
                      <span className="font-medium">{metrics.editorMetrics.renderTime.toFixed(2)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Input Latency</span>
                      <span className="font-medium">{metrics.editorMetrics.inputLatency.toFixed(2)}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="p-4">
            <h4 className="font-semibold mb-4">Performance History</h4>
            {metricsHistory.length > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {metricsHistory.slice(-20).reverse().map((metric, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Mem: {metric.memoryUsage.percentage.toFixed(1)}%</span>
                        <span>CPU: {metric.systemMetrics.cpu.toFixed(1)}%</span>
                        <span>Queue: {metric.processingStats.queueLength}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No performance history available
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PerformanceDashboard