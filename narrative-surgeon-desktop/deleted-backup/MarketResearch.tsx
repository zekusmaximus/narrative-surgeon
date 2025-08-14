'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  DollarSign, 
  Calendar, 
  Target, 
  AlertTriangle,
  BookOpen,
  Users,
  Globe,
  Award,
  Search,
  Lightbulb,
  LineChart,
  PieChart,
  Activity
} from 'lucide-react'
import { 
  marketResearcher, 
  type MarketResearchOptions, 
  type CompetitiveAnalysis,
  type GenreTrend,
  type MarketIntelligence,
  type MarketRecommendations 
} from '@/lib/marketResearch'

interface MarketResearchProps {
  manuscriptId?: string
  className?: string
}

export function MarketResearch({ manuscriptId, className }: MarketResearchProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [researchOptions, setResearchOptions] = useState<MarketResearchOptions>({
    manuscript_genre: '',
    manuscript_subgenres: [],
    target_audience: '',
    comparable_titles: [],
    budget_range: 'debut',
    publication_timeline: '2024',
    international_interest: false
  })

  const [researchResults, setResearchResults] = useState<{
    competitive_analysis: CompetitiveAnalysis
    genre_trends: GenreTrend
    market_intelligence: MarketIntelligence
    recommendations: MarketRecommendations
  } | null>(null)

  const [availableGenres] = useState([
    'Literary Fiction',
    'Commercial Fiction', 
    'Mystery',
    'Thriller',
    'Romance',
    'Fantasy',
    'Science Fiction',
    'Historical Fiction',
    'Young Adult',
    'Middle Grade',
    'Non-Fiction',
    'Biography',
    'Memoir'
  ])

  const [comparableTitleInput, setComparableTitleInput] = useState('')

  const conductResearch = async () => {
    if (!researchOptions.manuscript_genre) return
    
    setIsLoading(true)
    try {
      const results = await marketResearcher.conductMarketResearch(researchOptions)
      setResearchResults(results)
    } catch (error) {
      console.error('Market research failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addComparableTitle = () => {
    if (comparableTitleInput.trim()) {
      setResearchOptions(prev => ({
        ...prev,
        comparable_titles: [...prev.comparable_titles, comparableTitleInput.trim()]
      }))
      setComparableTitleInput('')
    }
  }

  const removeComparableTitle = (title: string) => {
    setResearchOptions(prev => ({
      ...prev,
      comparable_titles: prev.comparable_titles.filter(t => t !== title)
    }))
  }

  const getTrendIcon = (direction: 'rising' | 'stable' | 'declining') => {
    switch (direction) {
      case 'rising': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />
      default: return <Activity className="w-4 h-4 text-blue-500" />
    }
  }

  const getMarketPositionColor = (position: CompetitiveAnalysis['market_position']) => {
    switch (position) {
      case 'emerging': return 'bg-green-100 text-green-800 dark:bg-green-900/30'
      case 'underserved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30'
      case 'competitive': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30'
      case 'oversaturated': return 'bg-red-100 text-red-800 dark:bg-red-900/30'
    }
  }

  const renderResearchForm = () => (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-4">Research Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Primary Genre *</label>
              <Select 
                value={researchOptions.manuscript_genre} 
                onValueChange={(value) => setResearchOptions(prev => ({ ...prev, manuscript_genre: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {availableGenres.map(genre => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Target Audience</label>
              <Input
                value={researchOptions.target_audience}
                onChange={(e) => setResearchOptions(prev => ({ ...prev, target_audience: e.target.value }))}
                placeholder="e.g., Adult women 25-45, bookclub readers"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Budget Range</label>
              <Select 
                value={researchOptions.budget_range} 
                onValueChange={(value: any) => setResearchOptions(prev => ({ ...prev, budget_range: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debut">Debut Author ($5K-$25K)</SelectItem>
                  <SelectItem value="mid_list">Mid-list ($25K-$100K)</SelectItem>
                  <SelectItem value="lead_title">Lead Title ($100K+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Target Publication</label>
              <Select 
                value={researchOptions.publication_timeline} 
                onValueChange={(value) => setResearchOptions(prev => ({ ...prev, publication_timeline: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Comparable Titles</label>
          <div className="flex gap-2 mb-2">
            <Input
              value={comparableTitleInput}
              onChange={(e) => setComparableTitleInput(e.target.value)}
              placeholder="Enter book title + author"
              onKeyPress={(e) => e.key === 'Enter' && addComparableTitle()}
            />
            <Button onClick={addComparableTitle} variant="outline">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {researchOptions.comparable_titles.map(title => (
              <Badge 
                key={title} 
                variant="secondary" 
                className="cursor-pointer"
                onClick={() => removeComparableTitle(title)}
              >
                {title} ×
              </Badge>
            ))}
          </div>
        </div>

        <Button 
          onClick={conductResearch} 
          disabled={!researchOptions.manuscript_genre || isLoading}
          className="w-full"
        >
          {isLoading ? 'Analyzing Market...' : 'Conduct Market Research'}
        </Button>
      </div>
    </Card>
  )

  const renderCompetitiveAnalysis = (analysis: CompetitiveAnalysis) => (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">Market Position</h3>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <Badge className={getMarketPositionColor(analysis.market_position)}>
            {analysis.market_position.replace('_', ' ')}
          </Badge>
          <div className="text-sm text-muted-foreground">
            Based on {analysis.similar_books.length} comparable titles
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-medium mb-3">Pricing Recommendations</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Advance Range:</span>
              <span className="font-medium">{analysis.pricing_recommendations.advance_range}</span>
            </div>
            <div className="flex justify-between">
              <span>Retail Price:</span>
              <span className="font-medium">{analysis.pricing_recommendations.retail_price_range}</span>
            </div>
            <div className="flex justify-between">
              <span>Marketing Budget:</span>
              <span className="font-medium">{analysis.pricing_recommendations.marketing_budget_estimate}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-3">Timing Strategy</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Submit By:</span>
              <span className="font-medium">{analysis.timing_recommendations.ideal_submission_window}</span>
            </div>
            <div className="flex justify-between">
              <span>Target Publication:</span>
              <span className="font-medium">{analysis.timing_recommendations.publication_timing}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Market Readiness:</span>
              <div className="flex items-center gap-2">
                <Progress value={analysis.timing_recommendations.market_readiness_score} className="w-16 h-2" />
                <span className="font-medium">{analysis.timing_recommendations.market_readiness_score}%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-medium mb-3">Differentiation Opportunities</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {analysis.differentiation_opportunities.map((opportunity, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
              {opportunity}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )

  const renderGenreTrends = (trends: GenreTrend) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {getTrendIcon(trends.trend_direction)}
            <span className="font-medium">Market Trend</span>
          </div>
          <div className="text-2xl font-bold capitalize">{trends.trend_direction}</div>
          <div className="text-sm text-muted-foreground">Overall direction</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span className="font-medium">Popularity</span>
          </div>
          <div className="text-2xl font-bold">{trends.popularity_score}/100</div>
          <Progress value={trends.popularity_score} className="mt-2" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-4 h-4 text-orange-500" />
            <span className="font-medium">Market Saturation</span>
          </div>
          <div className="text-2xl font-bold">{trends.market_saturation}%</div>
          <Progress value={trends.market_saturation} className="mt-2" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-medium mb-3">Key Themes & Topics</h4>
          <div className="flex flex-wrap gap-2">
            {trends.key_themes.map(theme => (
              <Badge key={theme} variant="outline">
                {theme}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-3">Top Publishers</h4>
          <div className="space-y-2">
            {trends.top_publishers.slice(0, 5).map(publisher => (
              <div key={publisher} className="text-sm font-medium">
                {publisher}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-medium mb-3">Reader Demographics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2">Age Groups</div>
            <div className="space-y-1">
              {trends.demographics.primary_age_groups.map(group => (
                <Badge key={group} variant="secondary" className="mr-2">
                  {group}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Reading Preferences</div>
            <div className="space-y-1 text-sm">
              <div>Print: {trends.demographics.reading_platforms.print}%</div>
              <div>E-book: {trends.demographics.reading_platforms.ebook}%</div>
              <div>Audiobook: {trends.demographics.reading_platforms.audiobook}%</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )

  const renderRecommendations = (recommendations: MarketRecommendations) => (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Success Probability</h4>
          <div className="flex items-center gap-2">
            <Progress value={recommendations.success_probability} className="w-20" />
            <span className="font-bold text-lg">{recommendations.success_probability}%</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Based on market analysis and competitive positioning
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-medium mb-3">Positioning Strategy</h4>
          <p className="text-sm">{recommendations.positioning_strategy}</p>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-3">Timing Strategy</h4>
          <p className="text-sm">{recommendations.timing_strategy}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-medium mb-3">Target Publishers</h4>
        <div className="flex flex-wrap gap-2">
          {recommendations.target_publishers.map(publisher => (
            <Badge key={publisher} variant="outline">
              {publisher}
            </Badge>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-green-500" />
            Competitive Advantages
          </h4>
          <ul className="space-y-2">
            {recommendations.competitive_advantages.map((advantage, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <div className="w-1 h-1 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                {advantage}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Risk Factors
          </h4>
          <ul className="space-y-2">
            {recommendations.risk_factors.map((risk, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <div className="w-1 h-1 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                {risk}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-medium mb-3">Next Steps</h4>
        <ol className="space-y-2">
          {recommendations.next_steps.map((step, index) => (
            <li key={index} className="text-sm flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <LineChart className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Market Research</h2>
            <p className="text-sm text-muted-foreground">
              Analyze market trends, competition, and positioning opportunities
            </p>
          </div>
        </div>
      </div>

      {/* Research Form */}
      {!researchResults && renderResearchForm()}

      {/* Results */}
      {researchResults && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Research Results</h3>
            <Button 
              variant="outline" 
              onClick={() => setResearchResults(null)}
            >
              New Research
            </Button>
          </div>

          <Tabs defaultValue="competitive" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="competitive">Competition</TabsTrigger>
              <TabsTrigger value="trends">Genre Trends</TabsTrigger>
              <TabsTrigger value="intelligence">Market Intel</TabsTrigger>
              <TabsTrigger value="recommendations">Strategy</TabsTrigger>
            </TabsList>

            <TabsContent value="competitive">
              {renderCompetitiveAnalysis(researchResults.competitive_analysis)}
            </TabsContent>

            <TabsContent value="trends">
              {renderGenreTrends(researchResults.genre_trends)}
            </TabsContent>

            <TabsContent value="intelligence">
              <div className="space-y-6">
                <Card className="p-4">
                  <h4 className="font-medium mb-3">Publisher Preferences</h4>
                  <div className="space-y-3">
                    {researchResults.market_intelligence.publisher_preferences.slice(0, 3).map(publisher => (
                      <div key={publisher.name} className="border-l-2 border-primary pl-3">
                        <div className="font-medium">{publisher.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Typical advances: {publisher.typical_advances.min} - {publisher.typical_advances.max}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {publisher.preferred_genres.slice(0, 3).map(genre => (
                            <Badge key={genre} variant="secondary" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium mb-3">Industry Trends</h4>
                  <div className="space-y-3">
                    {researchResults.market_intelligence.acquisition_trends.map(trend => (
                      <div key={trend.trend_name} className="border-l-2 border-green-400 pl-3">
                        <div className="font-medium">{trend.trend_name}</div>
                        <div className="text-sm text-muted-foreground mb-1">
                          {trend.description}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {trend.opportunities.slice(0, 3).map(opportunity => (
                            <Badge key={opportunity} variant="outline" className="text-xs">
                              {opportunity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="recommendations">
              {renderRecommendations(researchResults.recommendations)}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

export default MarketResearch