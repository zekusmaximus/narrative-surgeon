import React, { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

export type PerformanceAnalyticsProps = {
  manuscriptId: string
}

type Analytics = {
  query_performance: {
    average_score: number
    score_trend: string
    top_performing_elements: string[]
    weak_areas: string[]
  }
  optimization_opportunities: Array<{
    id: string
    title: string
    potential_impact: 'low' | 'normal' | 'high'
    estimated_improvement: number
  }>
}

export const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({ manuscriptId }) => {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [timeRange, setTimeRange] = useState('30d')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const result = await invoke<Analytics>('get_performance_analytics', { manuscriptId, timeRange })
        if (mounted) {
          setData(result)
          setError('')
        }
      } catch {
        if (mounted) setError('Failed to load performance analytics')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [manuscriptId, timeRange])

  if (loading) return <div>Analyzing performance data...</div>
  if (error) return <div role="alert">Failed to load performance analytics</div>
  if (!data) return null

  return (
    <div>
      <h2>Performance Analytics & Optimization</h2>
      <button onClick={() => setOpen(o => !o)}>{timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}</button>
      {open && (
        <ul>
          <li>
            <button onClick={() => { setTimeRange('30d'); setOpen(false) }}>Last 30 days</button>
          </li>
          <li>
            <button onClick={() => { setTimeRange('90d'); setOpen(false) }}>Last 90 days</button>
          </li>
        </ul>
      )}
      <div>{data.query_performance.average_score}/100</div>
      <div>{data.query_performance.score_trend}</div>
      <ul>
        {data.optimization_opportunities.map(op => (
          <li key={op.id}>
            <span>{op.title}</span>
            <span>{`+${op.estimated_improvement}%`}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default PerformanceAnalytics
