'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Send, 
  Target, 
  Users, 
  BarChart3, 
  FileText, 
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Download,
  Mail,
  BookOpen,
  Award,
  Activity,
  PieChart,
  LineChart,
  Zap,
  Plus,
  Filter,
  Search
} from 'lucide-react'

// Import the individual submission components
// REMOVED: import QueryLetterGenerator from './QueryLetterGenerator' // Multi-manuscript feature removed
// REMOVED: import AgentResearch from './AgentResearch' // Multi-manuscript feature removed
import SubmissionTracker from './SubmissionTracker'
// REMOVED: import MarketResearch from './MarketResearch' // Multi-manuscript feature removed
// REMOVED: import PublisherExports from './PublisherExports' // Multi-manuscript feature removed

interface DashboardStats {
  total_submissions: number
  pending_submissions: number
  partial_requests: number
  full_requests: number
  offers: number
  response_rate: number
  average_response_time: number
  query_score_average: number
  market_readiness_score: number
}

interface RecentActivity {
  id: string
  type: 'submission' | 'response' | 'research' | 'export' | 'query_update'
  title: string
  description: string
  timestamp: number
  status?: 'success' | 'warning' | 'error'
  metadata?: any
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  action: () => void
  category: 'submission' | 'research' | 'analysis' | 'export'
  priority: 'high' | 'medium' | 'low'
}

export function SubmissionDashboard({ manuscriptId, className }: { manuscriptId: string; className?: string }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total_submissions: 0,
    pending_submissions: 0,
    partial_requests: 0,
    full_requests: 0,
    offers: 0,
    response_rate: 0,
    average_response_time: 0,
    query_score_average: 0,
    market_readiness_score: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Mock data - in real implementation, these would come from APIs
  useEffect(() => {
    loadDashboardData()
  }, [manuscriptId])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setDashboardStats({
        total_submissions: 12,
        pending_submissions: 8,
        partial_requests: 2,
        full_requests: 1,
        offers: 1,
        response_rate: 67,
        average_response_time: 21,
        query_score_average: 84,
        market_readiness_score: 78
      })

      setRecentActivity([
        {
          id: '1',
          type: 'response',
          title: 'Response from Sarah Johnson',
          description: 'Requested full manuscript',
          timestamp: Date.now() - 2 * 60 * 60 * 1000,
          status: 'success'
        },
        {
          id: '2',
          type: 'submission',
          title: 'Query sent to Michael Chen',
          description: 'Literary Dreams Agency',
          timestamp: Date.now() - 5 * 60 * 60 * 1000
        },
        {
          id: '3',
          type: 'export',
          title: 'Shunn Manuscript exported',
          description: 'Generated industry-standard format',
          timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
          status: 'success'
        }
      ])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions: QuickAction[] = [
    {
      id: 'new_submission',
      title: 'Track New Submission',
      description: 'Add a query submission to your tracking system',
      icon: Send,
      action: () => setActiveTab('tracking'),
      category: 'submission',
      priority: 'high'
    },
    {
      id: 'research_agents',
      title: 'Research Agents',
      description: 'Find agents that match your manuscript',
      icon: Users,
      action: () => setActiveTab('research'),
      category: 'research',
      priority: 'high'
    },
    {
      id: 'generate_query',
      title: 'Create Query Letter',
      description: 'Generate or refine your query letter',
      icon: FileText,
      action: () => setActiveTab('query'),
      category: 'submission',
      priority: 'medium'
    },
    {
      id: 'export_materials',
      title: 'Export Submission Package',
      description: 'Generate publisher-ready formats',
      icon: Download,
      action: () => setActiveTab('exports'),
      category: 'export',
      priority: 'medium'
    },
    {
      id: 'market_analysis',
      title: 'Analyze Market',
      description: 'Research trends and competition',
      icon: TrendingUp,
      action: () => setActiveTab('market'),
      category: 'analysis',
      priority: 'medium'
    }
  ]

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'submission': return Mail
      case 'response': return CheckCircle
      case 'research': return Users
      case 'export': return Download
      case 'query_update': return FileText
      default: return Activity
    }
  }

  const getActivityColor = (status?: RecentActivity['status']) => {
    switch (status) {
      case 'success': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-blue-500'
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Send className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{dashboardStats.total_submissions}</div>
              <div className="text-sm text-muted-foreground">Total Submissions</div>
            </div>
          </div>
          <Progress value={(dashboardStats.total_submissions / 20) * 100} className="mt-3" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-500" />
            <div>
              <div className="text-2xl font-bold">{dashboardStats.pending_submissions}</div>
              <div className="text-sm text-muted-foreground">Awaiting Response</div>
            </div>
          </div>
          <Progress value={(dashboardStats.pending_submissions / dashboardStats.total_submissions) * 100} className="mt-3" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{dashboardStats.response_rate}%</div>
              <div className="text-sm text-muted-foreground">Response Rate</div>
            </div>
          </div>
          <Progress value={dashboardStats.response_rate} className="mt-3" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-purple-500" />
            <div>
              <div className="text-2xl font-bold">{dashboardStats.full_requests + dashboardStats.offers}</div>
              <div className="text-sm text-muted-foreground">Requests + Offers</div>
            </div>
          </div>
          <Progress value={((dashboardStats.full_requests + dashboardStats.offers) / dashboardStats.total_submissions) * 100} className="mt-3" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Overview */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Overview
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Query Letter Score</span>
                <span className="font-bold">{dashboardStats.query_score_average}/100</span>
              </div>
              <Progress value={dashboardStats.query_score_average} />
              <div className="text-xs text-muted-foreground mt-1">
                Average across all generated queries
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Market Readiness</span>
                <span className="font-bold">{dashboardStats.market_readiness_score}/100</span>
              </div>
              <Progress value={dashboardStats.market_readiness_score} />
              <div className="text-xs text-muted-foreground mt-1">
                Based on genre trends and competition analysis
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Response Speed</span>
                <span className="font-bold">{dashboardStats.average_response_time} days</span>
              </div>
              <Progress value={Math.max(0, 100 - dashboardStats.average_response_time)} />
              <div className="text-xs text-muted-foreground mt-1">
                Average time to receive responses
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </h3>
          
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {recentActivity.map(activity => {
                const IconComponent = getActivityIcon(activity.type)
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                    <IconComponent className={`w-4 h-4 mt-0.5 ${getActivityColor(activity.status)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{activity.title}</div>
                      <div className="text-xs text-muted-foreground">{activity.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Quick Actions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map(action => {
            const IconComponent = action.icon
            return (
              <Card 
                key={action.id} 
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={action.action}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    action.priority === 'high' 
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : action.priority === 'medium'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    <IconComponent className={`w-4 h-4 ${
                      action.priority === 'high' 
                        ? 'text-red-600'
                        : action.priority === 'medium'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{action.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{action.description}</div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </Card>

      {/* Conversion Funnel */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          Submission Funnel
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Queries Sent</span>
            <div className="flex items-center gap-2">
              <Progress value={100} className="w-32" />
              <span className="font-bold">{dashboardStats.total_submissions}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Partial Requests</span>
            <div className="flex items-center gap-2">
              <Progress 
                value={(dashboardStats.partial_requests / dashboardStats.total_submissions) * 100} 
                className="w-32" 
              />
              <span className="font-bold">{dashboardStats.partial_requests}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Full Requests</span>
            <div className="flex items-center gap-2">
              <Progress 
                value={(dashboardStats.full_requests / dashboardStats.total_submissions) * 100} 
                className="w-32" 
              />
              <span className="font-bold">{dashboardStats.full_requests}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Offers</span>
            <div className="flex items-center gap-2">
              <Progress 
                value={(dashboardStats.offers / dashboardStats.total_submissions) * 100} 
                className="w-32" 
              />
              <span className="font-bold">{dashboardStats.offers}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading submission dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Publishing Dashboard</h1>
            <p className="text-muted-foreground">
              Complete workflow for manuscript submission and market analysis
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="query">
            <FileText className="w-4 h-4 mr-2" />
            Query Letters
          </TabsTrigger>
          <TabsTrigger value="research">
            <Users className="w-4 h-4 mr-2" />
            Agent Research
          </TabsTrigger>
          <TabsTrigger value="tracking">
            <Send className="w-4 h-4 mr-2" />
            Submissions
          </TabsTrigger>
          <TabsTrigger value="market">
            <TrendingUp className="w-4 h-4 mr-2" />
            Market Research
          </TabsTrigger>
          <TabsTrigger value="exports">
            <Download className="w-4 h-4 mr-2" />
            Exports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="query">
          <QueryLetterGenerator manuscriptId={manuscriptId} />
        </TabsContent>

        <TabsContent value="research">
          <AgentResearch manuscriptId={manuscriptId} />
        </TabsContent>

        <TabsContent value="tracking">
          <SubmissionTracker manuscriptId={manuscriptId} />
        </TabsContent>

        <TabsContent value="market">
          <MarketResearch manuscriptId={manuscriptId} />
        </TabsContent>

        <TabsContent value="exports">
          <PublisherExports manuscriptId={manuscriptId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SubmissionDashboard