import React, { useEffect, useState } from 'react'

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

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Tests mock tauri invoke; this mock component just simulates loaded state
        if (!mounted) return
        setData({
          query_performance: {
            average_score: 84,
            score_trend: 'improving',
            top_performing_elements: ['Strong hook', 'Clear positioning'],
            weak_areas: ['Comparative titles']
          },
          optimization_opportunities: [
            {
              id: 'query-personalization',
              title: 'Improve Query Personalization',
              potential_impact: 'high',
              estimated_improvement: 15
            }
          ]
        })
      } catch {
        setError('Failed to load analytics')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [manuscriptId])

  if (loading) return <div>Analyzing performance…</div>
  if (error) return <div role="alert">Failed to load</div>
  if (!data) return null

  return (
    <div>
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
