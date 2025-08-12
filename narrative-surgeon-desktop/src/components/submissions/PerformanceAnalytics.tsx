'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  LineChart,
  Target,
  Award,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  Clock,
  Users,
  Mail,
  Calendar,
  Activity,
  Zap,
  Brain,
  BookOpen,
  Search,
  Filter,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react'

interface PerformanceMetrics {
  query_performance: QueryPerformance
  agent_matching: AgentMatchingAnalysis
  timing_analysis: TimingAnalysis
  market_positioning: MarketPositioning
  optimization_opportunities: OptimizationOpportunity[]
  comparative_analysis: ComparativeAnalysis
  success_predictors: SuccessPredictor[]
}

interface QueryPerformance {
  average_score: number
  score_trend: 'improving' | 'declining' | 'stable'
  top_performing_elements: string[]
  weak_areas: string[]
  industry_comparison: number
  personalization_score: number
  hook_effectiveness: number
  genre_alignment: number
}

interface AgentMatchingAnalysis {
  match_accuracy: number
  successful_matches: number
  failed_matches: number
  match_quality_trend: 'improving' | 'declining' | 'stable'
  top_matching_criteria: string[]
  ignored_recommendations: number
  connection_utilization: number
}

interface TimingAnalysis {
  optimal_submission_days: string[]
  seasonal_performance: { [season: string]: number }
  response_time_correlation: number
  follow_up_effectiveness: number
  submission_frequency_impact: number
  market_timing_score: number
}

interface MarketPositioning {
  competitive_advantage_score: number
  genre_saturation_impact: number
  unique_selling_points: string[]
  market_gaps_identified: string[]
  positioning_effectiveness: number
  trend_alignment: number
}

interface OptimizationOpportunity {
  id: string
  category: 'query' | 'targeting' | 'timing' | 'positioning' | 'market'
  title: string
  description: string
  potential_impact: 'high' | 'medium' | 'low'
  effort_required: 'low' | 'medium' | 'high'
  estimated_improvement: number
  action_items: string[]
  priority_score: number
}

interface ComparativeAnalysis {
  peer_comparison: {
    response_rate_vs_peers: number
    request_rate_vs_peers: number
    offer_rate_vs_peers: number
  }
  industry_benchmarks: {
    category: string
    your_performance: number
    industry_average: number
    top_performers: number
  }[]
  genre_specific_metrics: {
    genre: string
    performance_percentile: number
    key_insights: string[]
  }
}

interface SuccessPredictor {
  factor: string
  weight: number
  current_score: number
  impact_on_success: number
  optimization_potential: number
  recommendations: string[]
}

export function PerformanceAnalytics({ manuscriptId, className }: { manuscriptId: string; className?: string }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d')
  const [focusArea, setFocusArea] = useState<string>('overview')

  useEffect(() => {
    loadPerformanceMetrics()
  }, [manuscriptId, selectedTimeRange])

  const loadPerformanceMetrics = async () => {
    setIsLoading(true)
    try {
      // Simulate API call - in real app, this would fetch actual analytics data
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const mockMetrics: PerformanceMetrics = {
        query_performance: {
          average_score: 84,
          score_trend: 'improving',
          top_performing_elements: ['Compelling hook', 'Clear genre positioning', 'Professional tone'],
          weak_areas: ['Word count precision', 'Comparative titles selection'],
          industry_comparison: 12, // 12% above industry average
          personalization_score: 78,
          hook_effectiveness: 87,
          genre_alignment: 91
        },
        agent_matching: {
          match_accuracy: 87,
          successful_matches: 8,
          failed_matches: 3,
          match_quality_trend: 'improving',
          top_matching_criteria: ['Genre expertise', 'Client success rate', 'Response time'],
          ignored_recommendations: 2,
          connection_utilization: 65
        },
        timing_analysis: {
          optimal_submission_days: ['Tuesday', 'Wednesday', 'Thursday'],
          seasonal_performance: {
            'Spring': 85,
            'Summer': 72,
            'Fall': 91,
            'Winter': 78
          },
          response_time_correlation: 0.73,
          follow_up_effectiveness: 82,
          submission_frequency_impact: 0.68,
          market_timing_score: 79
        },
        market_positioning: {
          competitive_advantage_score: 76,
          genre_saturation_impact: -15,
          unique_selling_points: [
            'Unique multicultural perspective',
            'Timely social themes',
            'Cross-genre appeal potential'
          ],
          market_gaps_identified: [
            'Underrepresented voices in literary fiction',
            'Growing interest in social justice themes'
          ],
          positioning_effectiveness: 81,
          trend_alignment: 89
        },
        optimization_opportunities: [
          {
            id: 'query_personalization',
            category: 'query',
            title: 'Increase Query Personalization',
            description: 'Your personalization score is below optimal. Adding specific agent connections could improve response rates by 15-20%.',
            potential_impact: 'high',
            effort_required: 'medium',
            estimated_improvement: 18,
            action_items: [
              'Research recent agent sales and mentions',
              'Find mutual connections or conferences attended',
              'Reference specific client successes in your genre',
              'Mention recent interviews or social media posts'
            ],
            priority_score: 92
          },
          {
            id: 'timing_optimization',
            category: 'timing',
            title: 'Optimize Submission Timing',
            description: 'Analysis shows 23% better response rates when submitting Tuesday-Thursday vs. Monday/Friday.',
            potential_impact: 'medium',
            effort_required: 'low',
            estimated_improvement: 23,
            action_items: [
              'Schedule submissions for Tuesday-Thursday',
              'Avoid submission during major holidays',
              'Consider industry conference schedules',
              'Track seasonal response patterns'
            ],
            priority_score: 78
          },
          {
            id: 'agent_diversification',
            category: 'targeting',
            title: 'Diversify Agent Targeting',
            description: 'You\'re focusing too heavily on established agents. New agents show 31% higher response rates.',
            potential_impact: 'high',
            effort_required: 'low',
            estimated_improvement: 31,
            action_items: [
              'Research recently promoted associate agents',
              'Target agents building their lists',
              'Consider agents at smaller boutique agencies',
              'Balance experience levels in submission strategy'
            ],
            priority_score: 85
          }
        ],
        comparative_analysis: {
          peer_comparison: {
            response_rate_vs_peers: 15, // 15% better than peers
            request_rate_vs_peers: 8,
            offer_rate_vs_peers: 22
          },
          industry_benchmarks: [
            {
              category: 'Response Rate',
              your_performance: 67,
              industry_average: 45,
              top_performers: 80
            },
            {
              category: 'Request Rate',
              your_performance: 25,
              industry_average: 18,
              top_performers: 35
            },
            {
              category: 'Average Response Time',
              your_performance: 21,
              industry_average: 28,
              top_performers: 14
            }
          ],
          genre_specific_metrics: {
            genre: 'Literary Fiction',
            performance_percentile: 78,
            key_insights: [
              'Above average for debut literary fiction',
              'Strong performance in urban/contemporary themes',
              'Opportunity to improve in international markets'
            ]
          }
        },
        success_predictors: [
          {
            factor: 'Query Letter Quality',
            weight: 0.35,
            current_score: 84,
            impact_on_success: 87,
            optimization_potential: 16,
            recommendations: [
              'Strengthen opening hook',
              'Add more specific comparative titles',
              'Refine word count positioning'
            ]
          },
          {
            factor: 'Agent-Manuscript Match',
            weight: 0.25,
            current_score: 87,
            impact_on_success: 89,
            optimization_potential: 13,
            recommendations: [
              'Research agent wish lists more thoroughly',
              'Utilize professional connections',
              'Consider debut-friendly agents'
            ]
          },
          {
            factor: 'Market Timing',
            weight: 0.20,
            current_score: 79,
            impact_on_success: 72,
            optimization_potential: 21,
            recommendations: [
              'Align with seasonal publishing cycles',
              'Monitor industry acquisition trends',
              'Consider current social/political climate'
            ]
          }
        ]
      }
      
      setMetrics(mockMetrics)
    } catch (error) {
      console.error('Failed to load performance metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />
      default: return <Activity className="w-4 h-4 text-blue-500" />
    }
  }

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30'
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30'
    }
  }

  const getEffortColor = (effort: 'high' | 'medium' | 'low') => {
    switch (effort) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30'
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Analyzing performance data...</p>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">Failed to load performance analytics</p>
        <Button onClick={loadPerformanceMetrics} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Performance Analytics & Optimization</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered insights to improve your submission success rate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={loadPerformanceMetrics} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="predictors">Success Factors</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Query Performance</span>
                  {getTrendIcon(metrics.query_performance.score_trend)}
                </div>
                <div className="text-2xl font-bold">{metrics.query_performance.average_score}/100</div>
                <Progress value={metrics.query_performance.average_score} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  +{metrics.query_performance.industry_comparison}% vs industry
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Agent Matching</span>
                  {getTrendIcon(metrics.agent_matching.match_quality_trend)}
                </div>
                <div className="text-2xl font-bold">{metrics.agent_matching.match_accuracy}%</div>
                <Progress value={metrics.agent_matching.match_accuracy} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics.agent_matching.successful_matches} successful matches
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Market Positioning</span>
                  <Target className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold">{metrics.market_positioning.competitive_advantage_score}/100</div>
                <Progress value={metrics.market_positioning.competitive_advantage_score} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics.market_positioning.unique_selling_points.length} USPs identified
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Timing Score</span>
                  <Clock className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold">{metrics.timing_analysis.market_timing_score}/100</div>
                <Progress value={metrics.timing_analysis.market_timing_score} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics.timing_analysis.follow_up_effectiveness}% follow-up effectiveness
                </div>
              </Card>
            </div>

            {/* Performance Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Query Performance Breakdown</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Hook Effectiveness</span>
                      <span>{metrics.query_performance.hook_effectiveness}/100</span>
                    </div>
                    <Progress value={metrics.query_performance.hook_effectiveness} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Genre Alignment</span>
                      <span>{metrics.query_performance.genre_alignment}/100</span>
                    </div>
                    <Progress value={metrics.query_performance.genre_alignment} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Personalization</span>
                      <span>{metrics.query_performance.personalization_score}/100</span>
                    </div>
                    <Progress value={metrics.query_performance.personalization_score} />
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">Top Performing Elements</h4>
                  <div className="space-y-1">
                    {metrics.query_performance.top_performing_elements.map((element, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        {element}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">Areas for Improvement</h4>
                  <div className="space-y-1">
                    {metrics.query_performance.weak_areas.map((area, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="w-3 h-3 text-yellow-500" />
                        {area}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">Seasonal Performance</h3>
                <div className="space-y-3">
                  {Object.entries(metrics.timing_analysis.seasonal_performance).map(([season, score]) => (
                    <div key={season}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{season}</span>
                        <span>{score}/100</span>
                      </div>
                      <Progress value={score} />
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">Optimal Submission Days</h4>
                  <div className="flex flex-wrap gap-2">
                    {metrics.timing_analysis.optimal_submission_days.map(day => (
                      <Badge key={day} variant="secondary">
                        {day}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="optimization">
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Optimization Opportunities</h3>
              <p className="text-sm text-muted-foreground mb-6">
                AI-identified opportunities to improve your submission success rate, ranked by potential impact.
              </p>

              <div className="space-y-4">
                {metrics.optimization_opportunities
                  .sort((a, b) => b.priority_score - a.priority_score)
                  .map(opportunity => (
                    <Card key={opportunity.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{opportunity.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {opportunity.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            +{opportunity.estimated_improvement}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            estimated improvement
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-4">
                        <Badge className={getImpactColor(opportunity.potential_impact)}>
                          {opportunity.potential_impact} impact
                        </Badge>
                        <Badge className={getEffortColor(opportunity.effort_required)}>
                          {opportunity.effort_required} effort
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          Priority Score: {opportunity.priority_score}/100
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-sm mb-2">Action Items:</h5>
                        <ol className="space-y-1">
                          {opportunity.action_items.map((item, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs font-medium mt-0.5">
                                {index + 1}
                              </span>
                              {item}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </Card>
                  ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="benchmarks">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Industry Benchmarks</h3>
                <div className="space-y-4">
                  {metrics.comparative_analysis.industry_benchmarks.map((benchmark, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">{benchmark.category}</span>
                        <div className="text-right">
                          <div className="font-bold">{benchmark.your_performance}</div>
                          <div className="text-xs text-muted-foreground">You</div>
                        </div>
                      </div>
                      <div className="relative">
                        <Progress value={(benchmark.your_performance / benchmark.top_performers) * 100} />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Industry: {benchmark.industry_average}</span>
                          <span>Top: {benchmark.top_performers}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">Peer Comparison</h3>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      +{metrics.comparative_analysis.peer_comparison.response_rate_vs_peers}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Better response rate than peers
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="font-bold text-blue-600">
                        +{metrics.comparative_analysis.peer_comparison.request_rate_vs_peers}%
                      </div>
                      <div className="text-xs text-muted-foreground">Request Rate</div>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="font-bold text-purple-600">
                        +{metrics.comparative_analysis.peer_comparison.offer_rate_vs_peers}%
                      </div>
                      <div className="text-xs text-muted-foreground">Offer Rate</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium text-sm mb-3">Genre-Specific Performance</h4>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">{metrics.comparative_analysis.genre_specific_metrics.genre}</div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {metrics.comparative_analysis.genre_specific_metrics.performance_percentile}th percentile
                    </div>
                    <ul className="text-sm space-y-1">
                      {metrics.comparative_analysis.genre_specific_metrics.key_insights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="predictors">
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Success Predictors</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Key factors that correlate with submission success, weighted by importance.
              </p>

              <div className="space-y-6">
                {metrics.success_predictors.map((predictor, index) => (
                  <div key={index} className="border-l-4 border-primary pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{predictor.factor}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{predictor.current_score}/100</span>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(predictor.weight * 100)}% weight
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Current Score</div>
                        <Progress value={predictor.current_score} />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Impact on Success</div>
                        <Progress value={predictor.impact_on_success} />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Optimization Potential</div>
                        <Progress value={predictor.optimization_potential} />
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-sm mb-2">Optimization Recommendations:</h5>
                      <ul className="space-y-1">
                        {predictor.recommendations.map((rec, recIndex) => (
                          <li key={recIndex} className="text-sm flex items-start gap-2">
                            <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights">
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-lg">AI-Powered Insights</h3>
              </div>
              
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Key Success Pattern Identified
                  </h4>
                  <p className="text-sm mb-3">
                    Your highest-performing queries follow a specific pattern: personal connection + genre positioning + unique hook. 
                    Queries using this structure show 34% higher response rates.
                  </p>
                  <Badge variant="secondary">Pattern Recognition</Badge>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-500" />
                    Optimal Agent Profile Detected
                  </h4>
                  <p className="text-sm mb-3">
                    Agents who represent 2-5 clients in your genre and have been at their current agency for 3-7 years 
                    show the highest match success rate (91%) for your manuscript profile.
                  </p>
                  <Badge variant="secondary">Predictive Modeling</Badge>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-yellow-500" />
                    Seasonal Opportunity Window
                  </h4>
                  <p className="text-sm mb-3">
                    Based on industry data, October-November represents your optimal submission window. 
                    This period shows 28% higher acquisition activity in your genre.
                  </p>
                  <Badge variant="secondary">Market Intelligence</Badge>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-500" />
                    Quick Win Identified
                  </h4>
                  <p className="text-sm mb-3">
                    Adding one specific comparable title to your query could increase your match score by 15 points. 
                    AI suggests "The Seven Husbands of Evelyn Hugo" based on thematic similarity.
                  </p>
                  <Badge variant="secondary">Content Optimization</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium mb-2">Predicted Success Rate</h5>
                    <div className="text-2xl font-bold text-green-600 mb-1">78%</div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Based on current optimization level
                    </div>
                    <div className="text-sm">
                      <span className="text-green-600 font-medium">+12%</span> with recommended optimizations
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium mb-2">Time to First Offer</h5>
                    <div className="text-2xl font-bold text-blue-600 mb-1">6-8 weeks</div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Estimated timeline
                    </div>
                    <div className="text-sm">
                      <span className="text-blue-600 font-medium">-2 weeks</span> with timing optimization
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PerformanceAnalytics