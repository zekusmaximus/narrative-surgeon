'use client'

import { useParams } from 'next/navigation'
import { Card } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Send, FileText, Target, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function SubmissionsPage() {
  const params = useParams()
  const manuscriptId = params.id as string

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/manuscripts/${manuscriptId}`} className="text-muted-foreground hover:text-foreground mb-2 inline-block">
          ← Back to Manuscript
        </Link>
        <h1 className="text-3xl font-bold mb-2">Query Letters & Agent Tracking</h1>
        <p className="text-muted-foreground">
          Manage submissions and track agent responses
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <div>
              <div className="font-medium">Generate Query Letter</div>
              <div className="text-sm text-muted-foreground">AI-powered template</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-primary" />
            <div>
              <div className="font-medium">Research Agents</div>
              <div className="text-sm text-muted-foreground">Find suitable agents</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <Send className="w-6 h-6 text-primary" />
            <div>
              <div className="font-medium">Track Submissions</div>
              <div className="text-sm text-muted-foreground">Manage responses</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-primary" />
            <div>
              <div className="font-medium">Submission Calendar</div>
              <div className="text-sm text-muted-foreground">Track deadlines</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Query Letters</h2>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                New Query Letter
              </Button>
            </div>
            <div className="text-muted-foreground text-center py-8">
              No query letters created yet. Generate your first query letter to get started.
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Active Submissions</h2>
              <Button variant="outline">
                <Send className="w-4 h-4 mr-2" />
                Add Submission
              </Button>
            </div>
            <div className="text-muted-foreground text-center py-8">
              No active submissions. Track your query letter responses here.
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Submission Statistics</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Sent:</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending:</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Responses:</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Success Rate:</span>
                <span className="font-medium">-</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="text-muted-foreground text-center py-4">
              No recent activity
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Tips</h2>
            <div className="text-sm space-y-2">
              <p>• Research agents who represent your genre</p>
              <p>• Personalize each query letter</p>
              <p>• Follow submission guidelines carefully</p>
              <p>• Track response times and patterns</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}