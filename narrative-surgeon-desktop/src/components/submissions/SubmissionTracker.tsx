'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@radix-ui/react-dialog'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Send, 
  Clock, 
  AlertTriangle,
  Plus,
  Bell,
  TrendingUp,
  FileText,
  Mail,
  Target,
  BarChart3
} from 'lucide-react'

export interface Submission {
  id: string
  manuscriptId: string
  agentId: string
  agentName: string
  agency: string
  
  // Submission details
  submittedDate: number
  queryLetter: string
  synopsis?: string
  samplePages?: string
  materials: string[]
  
  // Status tracking
  status: 'submitted' | 'partial_request' | 'full_request' | 'rejected' | 'offer' | 'withdrawn'
  lastUpdate: number
  expectedResponseDate?: number
  actualResponseDate?: number
  
  // Communication
  responseReceived: boolean
  responseMessage?: string
  responseType?: 'no_response' | 'form_rejection' | 'personal_rejection' | 'request' | 'offer'
  
  // Follow-up tracking
  followUps: FollowUp[]
  nextFollowUpDate?: number
  
  // Notes and tags
  notes: string
  tags: string[]
  priority: 'low' | 'normal' | 'high'
  
  // Analytics
  queryScore?: number
  responseTime?: number
  feedbackReceived: boolean
}

interface FollowUp {
  id: string
  type: 'reminder' | 'status_update' | 'additional_material' | 'withdrawal'
  scheduledDate: number
  completed: boolean
  completedDate?: number
  message?: string
  response?: string
}

interface SubmissionPipeline {
  research: Submission[]
  prepared: Submission[]
  submitted: Submission[]
  following_up: Submission[]
  responded: Submission[]
}

interface PerformanceMetrics {
  totalSubmissions: number
  responseRate: number
  averageResponseTime: number
  requestRate: number
  offerRate: number
  topPerformingQueries: string[]
  rejectionPatterns: string[]
  monthlySubmissions: number
  conversionFunnel: {
    submitted: number
    partialRequests: number
    fullRequests: number
    offers: number
  }
}

export function SubmissionTracker({ manuscriptId, className }: { manuscriptId: string; className?: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [isAddingSubmission, setIsAddingSubmission] = useState(false)
  const [viewMode, setViewMode] = useState<'pipeline' | 'timeline' | 'analytics'>('pipeline')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'response_expected'>('date')

  const [newSubmission, setNewSubmission] = useState<Partial<Submission>>({
    manuscriptId,
    agentName: '',
    agency: '',
    queryLetter: '',
    materials: ['query'],
    status: 'submitted',
    notes: '',
    tags: [],
    priority: 'normal',
    submittedDate: Date.now()
  })

  useEffect(() => {
    loadSubmissions()
    
    // Set up reminder notifications
    const checkReminders = setInterval(() => {
      checkFollowUpReminders()
    }, 60000) // Check every minute

    return () => clearInterval(checkReminders)
  }, [manuscriptId])

  const loadSubmissions = () => {
    // In a real app, this would load from API/database
    const mockSubmissions: Submission[] = [
      {
        id: 'sub_1',
        manuscriptId,
        agentId: 'agent_1',
        agentName: 'Sarah Johnson',
        agency: 'Literary Dreams Agency',
        submittedDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        queryLetter: 'Dear Sarah Johnson, I am seeking representation...',
        materials: ['query', 'synopsis', '5 pages'],
        status: 'submitted',
        lastUpdate: Date.now() - 30 * 24 * 60 * 60 * 1000,
        expectedResponseDate: Date.now() - 30 * 24 * 60 * 60 * 1000 + (60 * 24 * 60 * 60 * 1000), // 30 days from submission
        responseReceived: false,
        followUps: [],
        notes: 'Perfect match for literary fiction. Personalized query based on recent client.',
        tags: ['literary', 'personalized', 'top-choice'],
        priority: 'high',
        feedbackReceived: false
      }
    ]
    setSubmissions(mockSubmissions)
  }

  const addSubmission = () => {
    if (!newSubmission.agentName || !newSubmission.queryLetter) return

    const submission: Submission = {
      id: `sub_${Date.now()}`,
      manuscriptId,
      agentId: `agent_${Date.now()}`,
      submittedDate: Date.now(),
      lastUpdate: Date.now(),
      responseReceived: false,
      followUps: [],
      feedbackReceived: false,
      ...newSubmission as Required<Omit<Submission, 'id' | 'manuscriptId' | 'agentId' | 'submittedDate' | 'lastUpdate' | 'responseReceived' | 'followUps' | 'feedbackReceived'>>
    }

    setSubmissions(prev => [submission, ...prev])
    setNewSubmission({
      manuscriptId,
      agentName: '',
      agency: '',
      queryLetter: '',
      materials: ['query'],
      status: 'submitted',
      notes: '',
      tags: [],
      priority: 'normal',
      submittedDate: Date.now()
    })
    setIsAddingSubmission(false)
  }

  const _updateSubmissionStatus = (submissionId: string, status: Submission['status'], responseMessage?: string) => {
    setSubmissions(prev =>
      prev.map(sub =>
        sub.id === submissionId
          ? {
              ...sub,
              status,
              lastUpdate: Date.now(),
              responseReceived: status !== 'submitted',
              actualResponseDate: status !== 'submitted' ? Date.now() : undefined,
              responseMessage,
              responseTime: status !== 'submitted' ? Date.now() - sub.submittedDate : undefined
            }
          : sub
      )
    )
  }

  const scheduleFollowUp = (submissionId: string, date: number, type: FollowUp['type'], message?: string) => {
    const followUp: FollowUp = {
      id: `followup_${Date.now()}`,
      type,
      scheduledDate: date,
      completed: false,
      message
    }

    setSubmissions(prev =>
      prev.map(sub =>
        sub.id === submissionId
          ? {
              ...sub,
              followUps: [...sub.followUps, followUp],
              nextFollowUpDate: Math.min(date, sub.nextFollowUpDate || Infinity)
            }
          : sub
      )
    )
  }

  const checkFollowUpReminders = () => {
    const now = Date.now()
    const reminderThreshold = now + (24 * 60 * 60 * 1000) // 24 hours

    submissions.forEach(submission => {
      submission.followUps.forEach(followUp => {
        if (!followUp.completed && followUp.scheduledDate <= reminderThreshold) {
          // Show notification (in a real app, this would use browser notifications)
          console.log(`Reminder: Follow up with ${submission.agentName} for ${followUp.type}`)
        }
      })
    })
  }

  const getPerformanceMetrics = (): PerformanceMetrics => {
    const total = submissions.length
    const responded = submissions.filter(s => s.responseReceived).length
    const requests = submissions.filter(s => s.status === 'partial_request' || s.status === 'full_request').length
    const offers = submissions.filter(s => s.status === 'offer').length
    
    const responseTimes = submissions
      .filter(s => s.responseTime)
      .map(s => s.responseTime!)
    
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0

    return {
      totalSubmissions: total,
      responseRate: total > 0 ? (responded / total) * 100 : 0,
      averageResponseTime: avgResponseTime / (24 * 60 * 60 * 1000), // Convert to days
      requestRate: total > 0 ? (requests / total) * 100 : 0,
      offerRate: total > 0 ? (offers / total) * 100 : 0,
      topPerformingQueries: [],
      rejectionPatterns: [],
      monthlySubmissions: submissions.filter(s => 
        s.submittedDate > Date.now() - 30 * 24 * 60 * 60 * 1000
      ).length,
      conversionFunnel: {
        submitted: total,
        partialRequests: submissions.filter(s => s.status === 'partial_request').length,
        fullRequests: submissions.filter(s => s.status === 'full_request').length,
        offers
      }
    }
  }

  const organizePipeline = (): SubmissionPipeline => {
    return {
      research: [], // Would include researched but not yet submitted
      prepared: [], // Would include prepared but not yet submitted
      submitted: submissions.filter(s => s.status === 'submitted'),
      following_up: submissions.filter(s => 
        s.followUps.some(f => !f.completed && f.scheduledDate <= Date.now())
      ),
      responded: submissions.filter(s => s.responseReceived)
    }
  }

  const getStatusColor = (status: Submission['status']) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30'
      case 'partial_request': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30'
      case 'full_request': return 'bg-green-100 text-green-800 dark:bg-green-900/30'
      case 'offer': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30'
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30'
      case 'withdrawn': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30'
    }
  }

  const getPriorityIcon = (priority: Submission['priority']) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'normal': return <Clock className="w-4 h-4 text-gray-500" />
      case 'low': return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const renderSubmissionCard = (submission: Submission) => (
    <Card 
      key={submission.id} 
      className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
        selectedSubmission?.id === submission.id ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => setSelectedSubmission(submission)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{submission.agentName}</h3>
            {getPriorityIcon(submission.priority)}
          </div>
          <p className="text-sm text-muted-foreground">{submission.agency}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={getStatusColor(submission.status)}>
              {submission.status.replace('_', ' ')}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {Math.floor((Date.now() - submission.submittedDate) / (24 * 60 * 60 * 1000))} days ago
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Materials: </span>
          {submission.materials.join(', ')}
        </div>
        
        {submission.expectedResponseDate && !submission.responseReceived && (
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>
              Response expected: {new Date(submission.expectedResponseDate).toLocaleDateString()}
              {submission.expectedResponseDate < Date.now() && (
                <span className="text-red-500 ml-1">(Overdue)</span>
              )}
            </span>
          </div>
        )}

        {submission.nextFollowUpDate && (
          <div className="flex items-center gap-2">
            <Bell className="w-3 h-3" />
            <span>Next follow-up: {new Date(submission.nextFollowUpDate).toLocaleDateString()}</span>
          </div>
        )}

        {submission.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {submission.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              // Open status update dialog
            }}
          >
            Update Status
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              scheduleFollowUp(submission.id, Date.now() + 7 * 24 * 60 * 60 * 1000, 'reminder')
            }}
          >
            Schedule Follow-up
          </Button>
        </div>
      </div>
    </Card>
  )

  const renderPipelineView = () => {
    const pipeline = organizePipeline()
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Send className="w-4 h-4" />
            Submitted ({pipeline.submitted.length})
          </h3>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {pipeline.submitted.map(submission => (
                <div key={submission.id} className="p-2 border rounded-lg text-sm">
                  <div className="font-medium">{submission.agentName}</div>
                  <div className="text-muted-foreground text-xs">
                    {Math.floor((Date.now() - submission.submittedDate) / (24 * 60 * 60 * 1000))} days ago
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Following Up ({pipeline.following_up.length})
          </h3>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {pipeline.following_up.map(submission => (
                <div key={submission.id} className="p-2 border rounded-lg text-sm">
                  <div className="font-medium">{submission.agentName}</div>
                  <div className="text-muted-foreground text-xs">
                    Next: {new Date(submission.nextFollowUpDate!).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Responded ({pipeline.responded.length})
          </h3>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {pipeline.responded.map(submission => (
                <div key={submission.id} className="p-2 border rounded-lg text-sm">
                  <div className="font-medium">{submission.agentName}</div>
                  <Badge className={`${getStatusColor(submission.status)} text-xs`}>
                    {submission.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Quick Stats
          </h3>
          <div className="space-y-3">
            {(() => {
              const metrics = getPerformanceMetrics()
              return (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{metrics.totalSubmissions}</div>
                    <div className="text-xs text-muted-foreground">Total Submissions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{metrics.responseRate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Response Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{metrics.requestRate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Request Rate</div>
                  </div>
                </>
              )
            })()}
          </div>
        </Card>
      </div>
    )
  }

  const renderAnalyticsView = () => {
    const metrics = getPerformanceMetrics()
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Send className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{metrics.totalSubmissions}</div>
                <div className="text-sm text-muted-foreground">Total Submissions</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{metrics.responseRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Response Rate</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{metrics.averageResponseTime.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Avg Response (days)</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{metrics.requestRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Request Rate</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Conversion Funnel</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Submitted</span>
                <div className="flex items-center gap-2">
                  <Progress value={100} className="w-20" />
                  <span>{metrics.conversionFunnel.submitted}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Partial Requests</span>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={metrics.conversionFunnel.submitted > 0 ? 
                      (metrics.conversionFunnel.partialRequests / metrics.conversionFunnel.submitted) * 100 : 0
                    } 
                    className="w-20" 
                  />
                  <span>{metrics.conversionFunnel.partialRequests}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Full Requests</span>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={metrics.conversionFunnel.submitted > 0 ? 
                      (metrics.conversionFunnel.fullRequests / metrics.conversionFunnel.submitted) * 100 : 0
                    } 
                    className="w-20" 
                  />
                  <span>{metrics.conversionFunnel.fullRequests}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Offers</span>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={metrics.conversionFunnel.submitted > 0 ? 
                      (metrics.conversionFunnel.offers / metrics.conversionFunnel.submitted) * 100 : 0
                    } 
                    className="w-20" 
                  />
                  <span>{metrics.conversionFunnel.offers}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {submissions
                .sort((a, b) => b.lastUpdate - a.lastUpdate)
                .slice(0, 5)
                .map(submission => (
                  <div key={submission.id} className="flex items-center gap-3">
                    <Badge className={getStatusColor(submission.status)}>
                      {submission.status}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{submission.agentName}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(submission.lastUpdate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const filteredSubmissions = submissions
    .filter(s => filterStatus === 'all' || s.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'date': return b.submittedDate - a.submittedDate
        case 'priority': 
          const priorityOrder = { high: 3, normal: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'response_expected':
          if (!a.expectedResponseDate) return 1
          if (!b.expectedResponseDate) return -1
          return a.expectedResponseDate - b.expectedResponseDate
        default: return 0
      }
    })

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Send className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Submission Tracker</h2>
            <p className="text-sm text-muted-foreground">
              Track your query submissions and manage follow-ups
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setViewMode('pipeline')}>
            Pipeline
          </Button>
          <Button variant="outline" onClick={() => setViewMode('timeline')}>
            Timeline
          </Button>
          <Button variant="outline" onClick={() => setViewMode('analytics')}>
            Analytics
          </Button>
          <Dialog open={isAddingSubmission} onOpenChange={setIsAddingSubmission}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Submission
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Submission</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Agent Name *</label>
                    <Input
                      value={newSubmission.agentName || ''}
                      onChange={(e) => setNewSubmission(prev => ({ ...prev, agentName: e.target.value }))}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Agency</label>
                    <Input
                      value={newSubmission.agency || ''}
                      onChange={(e) => setNewSubmission(prev => ({ ...prev, agency: e.target.value }))}
                      placeholder="Literary Agency Inc."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Query Letter *</label>
                  <Textarea
                    value={newSubmission.queryLetter || ''}
                    onChange={(e) => setNewSubmission(prev => ({ ...prev, queryLetter: e.target.value }))}
                    placeholder="Dear [Agent Name]..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Priority</label>
                    <Select 
                      value={newSubmission.priority} 
                      onValueChange={(value: any) => setNewSubmission(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Expected Response (days)</label>
                    <Input
                      type="number"
                      placeholder="30"
                      onChange={(e) => {
                        const days = parseInt(e.target.value) || 30
                        setNewSubmission(prev => ({ 
                          ...prev, 
                          expectedResponseDate: Date.now() + days * 24 * 60 * 60 * 1000 
                        }))
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Notes</label>
                  <Textarea
                    value={newSubmission.notes || ''}
                    onChange={(e) => setNewSubmission(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Agent specializes in literary fiction..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddingSubmission(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addSubmission}>
                    Add Submission
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'pipeline' && renderPipelineView()}
      {viewMode === 'analytics' && renderAnalyticsView()}
      {viewMode === 'timeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters and List */}
          <div className="lg:col-span-2">
            <Card className="p-4">
              <div className="flex items-center gap-4 mb-4">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="partial_request">Partial Request</SelectItem>
                    <SelectItem value="full_request">Full Request</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="priority">Sort by Priority</SelectItem>
                    <SelectItem value="response_expected">Response Expected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filteredSubmissions.map(submission => renderSubmissionCard(submission))}
                  {filteredSubmissions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No submissions found matching your criteria
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Selected Submission Details */}
          <div>
            {selectedSubmission ? (
              <Card className="p-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedSubmission.agentName}</h3>
                      <p className="text-muted-foreground">{selectedSubmission.agency}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(selectedSubmission.status)}>
                          {selectedSubmission.status.replace('_', ' ')}
                        </Badge>
                        {getPriorityIcon(selectedSubmission.priority)}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Timeline</h4>
                      <div className="space-y-2 text-sm">
                        <div>Submitted: {new Date(selectedSubmission.submittedDate).toLocaleDateString()}</div>
                        {selectedSubmission.expectedResponseDate && (
                          <div>Expected Response: {new Date(selectedSubmission.expectedResponseDate).toLocaleDateString()}</div>
                        )}
                        {selectedSubmission.actualResponseDate && (
                          <div>Actual Response: {new Date(selectedSubmission.actualResponseDate).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>

                    {selectedSubmission.notes && (
                      <div>
                        <h4 className="font-medium mb-2">Notes</h4>
                        <p className="text-sm">{selectedSubmission.notes}</p>
                      </div>
                    )}

                    {selectedSubmission.followUps.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Follow-ups</h4>
                        <div className="space-y-2">
                          {selectedSubmission.followUps.map(followUp => (
                            <div key={followUp.id} className="text-sm p-2 border rounded">
                              <div className="font-medium">{followUp.type.replace('_', ' ')}</div>
                              <div className="text-muted-foreground">
                                {new Date(followUp.scheduledDate).toLocaleDateString()}
                                {followUp.completed && ' ✓'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Update Status
                      </Button>
                      <Button size="sm" variant="outline">
                        Add Follow-up
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </Card>
            ) : (
              <Card className="p-6">
                <div className="text-center space-y-3">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">Select a Submission</h3>
                    <p className="text-sm text-muted-foreground">
                      Click on any submission to view details
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SubmissionTracker