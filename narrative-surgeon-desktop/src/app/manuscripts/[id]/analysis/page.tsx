'use client'

import { useParams } from 'next/navigation'
import { Card } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { ArrowLeft, BarChart3, Target, Users, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default function AnalysisPage() {
  const params = useParams()
  const manuscriptId = params.id as string

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/manuscripts/${manuscriptId}`} className="text-muted-foreground hover:text-foreground mb-2 inline-block">
          ← Back to Manuscript
        </Link>
        <h1 className="text-3xl font-bold mb-2">AI Analysis Dashboard</h1>
        <p className="text-muted-foreground">
          Deep insights into your manuscript's structure, pacing, and style
        </p>
      </div>

      {/* Analysis Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-semibold">Story Structure</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Analyze plot points, character arcs, and narrative flow
          </p>
          <Button className="w-full">Run Analysis</Button>
        </Card>

        <Card className="p-6 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-semibold">Pacing Analysis</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Identify pacing issues and suggested improvements
          </p>
          <Button className="w-full">Analyze Pacing</Button>
        </Card>

        <Card className="p-6 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-semibold">Character Development</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Track character consistency and growth
          </p>
          <Button className="w-full">Character Report</Button>
        </Card>

        <Card className="p-6 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-semibold">Style Analysis</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Writing style, voice consistency, and readability
          </p>
          <Button className="w-full">Style Check</Button>
        </Card>

        <Card className="p-6 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-semibold">Genre Fit</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            How well does your work fit expected genre conventions
          </p>
          <Button className="w-full">Genre Analysis</Button>
        </Card>

        <Card className="p-6 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-semibold">Beta Reader Simulation</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            AI-powered feedback from different reader perspectives
          </p>
          <Button className="w-full">Simulate Feedback</Button>
        </Card>
      </div>

      {/* Recent Analysis Results */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Analysis Results</h2>
        <div className="text-muted-foreground text-center py-8">
          No analysis results yet. Run an analysis to get started.
        </div>
      </Card>
    </div>
  )
}