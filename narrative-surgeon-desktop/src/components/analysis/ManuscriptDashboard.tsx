'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react'
import { fullManuscriptAnalyzer } from '@/lib/analysis/FullManuscriptAnalyzer'
import { backgroundProcessor } from '@/lib/backgroundProcessor'
import type { ManuscriptAnalysisReport } from '@/lib/analysis/FullManuscriptAnalyzer'

interface ManuscriptDashboardProps {
  manuscriptId: string
  content: string
  onAnalysisComplete?: (report: ManuscriptAnalysisReport) => void
}

export function ManuscriptDashboard({ 
  manuscriptId, 
  content, 
  onAnalysisComplete 
}: ManuscriptDashboardProps) {
  const [analysisReport, setAnalysisReport] = useState<ManuscriptAnalysisReport | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    // Auto-start analysis if no report exists
    if (!analysisReport && content.length > 1000) {
      startAnalysis()
    }
  }, [content, manuscriptId])

  const startAnalysis = async () => {
    setIsAnalyzing(true)
    setAnalysisProgress(0)

    try {
      const report = await fullManuscriptAnalyzer.analyzeFullManuscript(
        manuscriptId,
        content,
        setAnalysisProgress
      )

      setAnalysisReport(report)
      onAnalysisComplete?.(report)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'warning'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isAnalyzing) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="animate-spin">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Analyzing Manuscript</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Analysis Progress</span>
              <span>{Math.round(analysisProgress)}%</span>
            </div>
            <Progress value={analysisProgress} className="w-full" />
            
            <div className="text-sm text-muted-foreground">
              {analysisProgress < 25 && "Analyzing story structure..."}
              {analysisProgress >= 25 && analysisProgress < 50 && "Examining characters..."}
              {analysisProgress >= 50 && analysisProgress < 75 && "Evaluating writing quality..."}
              {analysisProgress >= 75 && analysisProgress < 95 && "Assessing market fit..."}
              {analysisProgress >= 95 && "Compiling report..."}
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!analysisReport) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Ready to Analyze</h3>
          <p className="text-muted-foreground">
            Get comprehensive insights into your manuscript's structure, characters, and market potential.
          </p>
          <Button onClick={startAnalysis}>
            Start Analysis
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                <span className={getScoreColor(analysisReport.overallScore)}>
                  {analysisReport.overallScore}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{analysisReport.totalWords.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Words</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{analysisReport.characters.mainCharacters.length}</div>
              <div className="text-sm text-muted-foreground">Main Characters</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {Math.round(analysisReport.processingTime / 1000)}s
              </div>
              <div className="text-sm text-muted-foreground">Analysis Time</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Strengths */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold">Key Strengths</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysisReport.keyStrengths.map((strength, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm">{strength}</span>
                </div>
              ))}
              {analysisReport.keyStrengths.length === 0 && (
                <div className="text-muted-foreground">No key strengths identified yet.</div>
              )}
            </div>
          </Card>

          {/* Critical Issues */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold">Critical Issues</h3>
            </div>
            <div className="space-y-3">
              {analysisReport.criticalIssues.map((issue, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                  <span className="text-sm">{issue}</span>
                </div>
              ))}
              {analysisReport.criticalIssues.length === 0 && (
                <div className="text-muted-foreground">No critical issues found!</div>
              )}
            </div>
          </Card>

          {/* Actionable Recommendations */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Actionable Recommendations</h3>
            <div className="space-y-4">
              {analysisReport.actionableRecommendations.map((rec, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{rec.category}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(rec.priority)}>
                        {rec.priority}
                      </Badge>
                      <Badge variant="outline">
                        {rec.effort} effort
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{rec.issue}</p>
                  <p className="text-sm font-medium">{rec.solution}</p>
                </div>
              ))}
              {analysisReport.actionableRecommendations.length === 0 && (
                <div className="text-muted-foreground">No specific recommendations at this time.</div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="structure" className="space-y-6">
          {/* Story Structure Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Story Structure</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Pacing Score</span>
                  <span className={`font-bold ${getScoreColor(analysisReport.storyStructure.pacingScore)}`}>
                    {Math.round(analysisReport.storyStructure.pacingScore)}/100
                  </span>
                </div>
                <Progress value={analysisReport.storyStructure.pacingScore} />
                
                <div className="pt-4">
                  <h4 className="font-medium mb-2">Act Breakdown</h4>
                  {analysisReport.storyStructure.actBreakdown.map((act, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-1">
                      <span>Act {act.actNumber}</span>
                      <span>{act.percentageOfTotal.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Plot Points</h3>
              <div className="space-y-3">
                {analysisReport.storyStructure.plotPoints.map((point, index) => (
                  <div key={index} className="border-l-4 border-primary pl-3">
                    <div className="font-medium capitalize">
                      {point.type.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {point.description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Effectiveness: {Math.round(point.effectiveness * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Structural Issues */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Structural Issues</h3>
            <div className="space-y-3">
              {analysisReport.storyStructure.structuralIssues.map((issue, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant={getSeverityColor(issue.severity)}>
                    {issue.severity}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium">{issue.description}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {issue.suggestion}
                    </div>
                  </div>
                </div>
              ))}
              {analysisReport.storyStructure.structuralIssues.length === 0 && (
                <div className="text-muted-foreground">No structural issues found.</div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="characters" className="space-y-6">
          {/* Character Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Character Development</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Voice Consistency</span>
                  <span className={`font-bold ${getScoreColor(analysisReport.characters.voiceConsistency)}`}>
                    {Math.round(analysisReport.characters.voiceConsistency)}/100
                  </span>
                </div>
                <Progress value={analysisReport.characters.voiceConsistency} />
                
                <div className="flex items-center justify-between">
                  <span>Development Score</span>
                  <span className={`font-bold ${getScoreColor(analysisReport.characters.developmentScore)}`}>
                    {Math.round(analysisReport.characters.developmentScore)}/100
                  </span>
                </div>
                <Progress value={analysisReport.characters.developmentScore} />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Main Characters</h3>
              <div className="space-y-3">
                {analysisReport.characters.mainCharacters.map((character, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{character.name}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {character.role}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Voice: {Math.round(character.voiceDistinctiveness)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {character.screenTime} mentions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Character Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Character Analysis</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analysisReport.characters.mainCharacters.slice(0, 4).map((character, index) => (
                <div key={index} className="space-y-3">
                  <div className="font-medium text-lg">{character.name}</div>
                  
                  <div>
                    <h5 className="text-sm font-medium mb-1">Traits</h5>
                    <div className="flex flex-wrap gap-1">
                      {character.characterTraits.map((trait, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium mb-1">Goals</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {character.goals.map((goal, i) => (
                        <li key={i}>• {goal}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          {/* Writing Quality Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analysisReport.writingQuality).map(([key, value]) => (
              <Card key={key} className="p-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(value)}`}>
                    {Math.round(value)}/100
                  </div>
                  <Progress value={value} className="h-2" />
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          {/* Market Fit Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Market Positioning</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Genre Alignment</span>
                  <span className={`font-bold ${getScoreColor(analysisReport.marketFit.genreAlignment)}`}>
                    {Math.round(analysisReport.marketFit.genreAlignment)}/100
                  </span>
                </div>
                <Progress value={analysisReport.marketFit.genreAlignment} />
                
                <div>
                  <div className="text-sm font-medium mb-1">Target Audience</div>
                  <div className="text-sm text-muted-foreground">
                    {analysisReport.marketFit.targetAudience}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Positioning Advice</h3>
              <div className="text-sm text-muted-foreground">
                {analysisReport.marketFit.competitiveAnalysis.positioningAdvice}
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Differentiators</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {analysisReport.marketFit.competitiveAnalysis.differentiators.map((diff, index) => (
                    <li key={index}>• {diff}</li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          {/* Market Recommendations */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Market Recommendations</h3>
            <div className="space-y-3">
              {analysisReport.marketFit.marketRecommendations.map((rec, index) => (
                <div key={index} className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
              {analysisReport.marketFit.marketRecommendations.length === 0 && (
                <div className="text-muted-foreground">No specific market recommendations available.</div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={startAnalysis} variant="outline">
          Re-analyze Manuscript
        </Button>
        <Button onClick={() => window.print()}>
          Export Report
        </Button>
      </div>
    </div>
  )
}

export default ManuscriptDashboard