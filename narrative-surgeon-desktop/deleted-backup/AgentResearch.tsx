'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { 
  Search, 
  Filter, 
  Star, 
  TrendingUp, 
  Clock, 
  Users, 
  BookOpen, 
  Award,
  ExternalLink,
  Heart,
  MessageSquare,
  Calendar,
  Target,
  Zap
} from 'lucide-react'
import { agentMatcher, type AgentProfile, type MatchScore, type Connection, type Manuscript } from '@/lib/agentDatabase'

interface AgentResearchProps {
  manuscript?: Manuscript
  onAgentSelect?: (agent: AgentProfile) => void
  className?: string
}

interface SearchFilters {
  genres: string[]
  age_categories: string[]
  experience_levels: string[]
  currently_accepting: boolean
  response_time_max: number
  success_rate_min: number
  search_term: string
}

export function AgentResearch({ manuscript, onAgentSelect, className }: AgentResearchProps) {
  const [agents, setAgents] = useState<AgentProfile[]>([])
  const [filteredAgents, setFilteredAgents] = useState<AgentProfile[]>([])
  const [topMatches, setTopMatches] = useState<Array<{ agent: AgentProfile; match: MatchScore; connections: Connection[] }>>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null)
  const [filters, setFilters] = useState<SearchFilters>({
    genres: [],
    age_categories: [],
    experience_levels: [],
    currently_accepting: true,
    response_time_max: 90,
    success_rate_min: 0.1,
    search_term: ''
  })
  const [favoriteAgents, setFavoriteAgents] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'matches'>('matches')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadAgents()
  }, [])


  const loadAgents = async () => {
    setIsLoading(true)
    try {
      // In a real app, this would fetch from an API
      const allAgents = agentMatcher.getAllAgents()
      setAgents(allAgents)
    } catch (error) {
      console.error('Failed to load agents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateMatches = () => {
    if (!manuscript) return
    
    setIsLoading(true)
    try {
      const matches = agentMatcher.findTopMatches(manuscript, 50)
      setTopMatches(matches)
    } catch (error) {
      console.error('Failed to generate matches:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = agents

    if (filters.search_term) {
      const term = filters.search_term.toLowerCase()
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(term) ||
        agent.agency.toLowerCase().includes(term) ||
        agent.bio.toLowerCase().includes(term) ||
        agent.genres.some(g => g.toLowerCase().includes(term))
      )
    }

    if (filters.genres.length > 0) {
      filtered = filtered.filter(agent =>
        filters.genres.some(genre => agent.genres.includes(genre))
      )
    }

    if (filters.age_categories.length > 0) {
      filtered = filtered.filter(agent =>
        filters.age_categories.some(cat => agent.age_categories.includes(cat as any))
      )
    }

    if (filters.experience_levels.length > 0) {
      filtered = filtered.filter(agent =>
        filters.experience_levels.includes(agent.careerLevel)
      )
    }

    if (filters.currently_accepting) {
      filtered = filtered.filter(agent => agent.currentlyAcceptingQueries)
    }

    filtered = filtered.filter(agent =>
      agent.responseTime <= filters.response_time_max &&
      agent.clientSuccessRate >= filters.success_rate_min
    )

    setFilteredAgents(filtered)
  }

  useEffect(() => {
    if (manuscript && viewMode === 'matches') {
      generateMatches()
    } else {
      applyFilters()
    }
  }, [agents, filters, manuscript, viewMode])


  const toggleFavorite = (agentId: string) => {
    const newFavorites = new Set(favoriteAgents)
    if (newFavorites.has(agentId)) {
      newFavorites.delete(agentId)
    } else {
      newFavorites.add(agentId)
    }
    setFavoriteAgents(newFavorites)
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 dark:bg-green-900/20'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
    if (score >= 40) return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
    return 'text-red-600 bg-red-50 dark:bg-red-900/20'
  }

  const getExperienceBadgeColor = (level: string) => {
    switch (level) {
      case 'veteran': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'established': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'new': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const renderAgentCard = (agent: AgentProfile, match?: MatchScore, connections?: Connection[]) => (
    <Card 
      key={agent.id} 
      className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
        selectedAgent?.id === agent.id ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => setSelectedAgent(agent)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{agent.name}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(agent.id)
              }}
              className="p-1 h-auto"
            >
              <Heart 
                className={`w-4 h-4 ${
                  favoriteAgents.has(agent.id) 
                    ? 'fill-red-500 text-red-500' 
                    : 'text-gray-400'
                }`} 
              />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground font-medium">{agent.agency}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={getExperienceBadgeColor(agent.careerLevel)}>
              {agent.careerLevel}
            </Badge>
            {agent.currentlyAcceptingQueries ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Open to Queries
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600">
                Closed
              </Badge>
            )}
            {match && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getMatchScoreColor(match.overall)}`}>
                {match.overall}% match
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Genres */}
        <div>
          <div className="text-sm font-medium mb-1">Represents:</div>
          <div className="flex flex-wrap gap-1">
            {agent.genres.slice(0, 3).map(genre => (
              <Badge key={genre} variant="secondary" className="text-xs">
                {genre}
              </Badge>
            ))}
            {agent.genres.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{agent.genres.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="text-center">
            <div className="font-semibold">{agent.responseTime}d</div>
            <div className="text-muted-foreground text-xs">Response Time</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{Math.round(agent.responseRate * 100)}%</div>
            <div className="text-muted-foreground text-xs">Response Rate</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{agent.totalBooksSold}</div>
            <div className="text-muted-foreground text-xs">Books Sold</div>
          </div>
        </div>

        {/* Connections (if available) */}
        {connections && connections.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-1">Key Connections:</div>
            <div className="space-y-1">
              {connections.slice(0, 2).map((connection, index) => (
                <div key={index} className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                  {connection.description}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {agent.recentSales.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-1">Recent Sale:</div>
            <div className="text-xs text-muted-foreground">
              "{agent.recentSales[0].title}" by {agent.recentSales[0].author}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          Updated {new Date(agent.lastUpdated).toLocaleDateString()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onAgentSelect?.(agent)
          }}
        >
          Select Agent
        </Button>
      </div>
    </Card>
  )

  const renderAgentDetails = (agent: AgentProfile) => (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{agent.name}</h2>
          <p className="text-lg text-muted-foreground">{agent.agency}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={getExperienceBadgeColor(agent.careerLevel)}>
              {agent.careerLevel} • {agent.experience_years} years
            </Badge>
            {agent.currentlyAcceptingQueries ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Zap className="w-3 h-3 mr-1" />
                Open to Queries
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600">
                Closed to Queries
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleFavorite(agent.id)}
          >
            <Heart 
              className={`w-4 h-4 ${
                favoriteAgents.has(agent.id) 
                  ? 'fill-red-500 text-red-500' 
                  : ''
              }`} 
            />
          </Button>
          {agent.website && (
            <Button variant="outline" size="sm" asChild>
              <a href={agent.website} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Website
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Response Time</span>
          </div>
          <div className="text-2xl font-bold">{agent.responseTime}</div>
          <div className="text-xs text-muted-foreground">days average</div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Success Rate</span>
          </div>
          <div className="text-2xl font-bold">{Math.round(agent.clientSuccessRate * 100)}%</div>
          <div className="text-xs text-muted-foreground">client success</div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium">Books Sold</span>
          </div>
          <div className="text-2xl font-bold">{agent.totalBooksSold}</div>
          <div className="text-xs text-muted-foreground">total sales</div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium">Response Rate</span>
          </div>
          <div className="text-2xl font-bold">{Math.round(agent.responseRate * 100)}%</div>
          <div className="text-xs text-muted-foreground">queries answered</div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clients">Clients & Sales</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="submission">Submission Info</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Biography</h3>
            <p className="text-sm leading-relaxed">{agent.bio}</p>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Genres Represented</h3>
              <div className="flex flex-wrap gap-2">
                {agent.genres.map(genre => (
                  <Badge key={genre} variant="outline">
                    {genre}
                  </Badge>
                ))}
              </div>
              {agent.subgenres.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-2">Subgenres:</h4>
                  <div className="flex flex-wrap gap-1">
                    {agent.subgenres.map(subgenre => (
                      <Badge key={subgenre} variant="secondary" className="text-xs">
                        {subgenre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Current Wishlist</h3>
              <ul className="space-y-2">
                {agent.manuscriptWishlist.map((item, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Notable Clients</h3>
              <div className="space-y-2">
                {agent.notableClients.map(client => (
                  <div key={client} className="text-sm font-medium">
                    {client}
                  </div>
                ))}
                {agent.clientList.slice(0, 5).map(client => (
                  <div key={client} className="text-sm text-muted-foreground">
                    {client}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Recent Sales</h3>
              <div className="space-y-3">
                {agent.recentSales.slice(0, 5).map((sale, index) => (
                  <div key={index} className="border-l-2 border-primary pl-3">
                    <div className="font-medium text-sm">"{sale.title}"</div>
                    <div className="text-xs text-muted-foreground">
                      by {sale.author} • {sale.publisher}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(sale.date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Agent Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Wishlist Keywords:</h4>
                <div className="flex flex-wrap gap-1">
                  {agent.wishlistKeywords.map(keyword => (
                    <Badge key={keyword} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Communication Style:</h4>
                <Badge variant="secondary">{agent.communicationStyle}</Badge>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="submission" className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Submission Guidelines</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium mb-1">Format:</div>
                <div className="mb-3">{agent.submissionPreferences.format}</div>
                
                <div className="font-medium mb-1">Query Requirements:</div>
                <div className="mb-3">
                  {agent.submissionPreferences.query_only ? 'Query only' : 'Query + materials'}
                </div>
              </div>
              <div>
                <div className="font-medium mb-1">Sample Pages:</div>
                <div className="mb-3">{agent.submissionPreferences.sample_pages} pages</div>
                
                <div className="font-medium mb-1">Synopsis Required:</div>
                <div className="mb-3">{agent.submissionPreferences.synopsis_required ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Agent Research</h2>
            <p className="text-sm text-muted-foreground">
              {manuscript ? 'Find the perfect agents for your manuscript' : 'Explore literary agents and their preferences'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {manuscript && (
            <Button
              variant={viewMode === 'matches' ? 'default' : 'outline'}
              onClick={() => setViewMode('matches')}
            >
              <Target className="w-4 h-4 mr-2" />
              Smart Matches
            </Button>
          )}
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            <Filter className="w-4 h-4 mr-2" />
            Browse All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4" />
          <Input
            placeholder="Search agents, agencies, or specialties..."
            value={filters.search_term}
            onChange={(e) => setFilters(prev => ({ ...prev, search_term: e.target.value }))}
            className="flex-1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Genres</label>
            <Select onValueChange={(value) => setFilters(prev => ({ ...prev, genres: value ? [value] : [] }))}>
              <SelectTrigger>
                <SelectValue placeholder="Any genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any genre</SelectItem>
                <SelectItem value="Literary Fiction">Literary Fiction</SelectItem>
                <SelectItem value="Commercial Fiction">Commercial Fiction</SelectItem>
                <SelectItem value="Fantasy">Fantasy</SelectItem>
                <SelectItem value="Science Fiction">Science Fiction</SelectItem>
                <SelectItem value="Romance">Romance</SelectItem>
                <SelectItem value="Mystery">Mystery</SelectItem>
                <SelectItem value="Thriller">Thriller</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Experience</label>
            <Select onValueChange={(value) => setFilters(prev => ({ ...prev, experience_levels: value ? [value] : [] }))}>
              <SelectTrigger>
                <SelectValue placeholder="Any level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any level</SelectItem>
                <SelectItem value="new">New Agent</SelectItem>
                <SelectItem value="established">Established</SelectItem>
                <SelectItem value="veteran">Veteran</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Max Response Time</label>
            <Select onValueChange={(value) => setFilters(prev => ({ ...prev, response_time_max: parseInt(value) || 90 }))}>
              <SelectTrigger>
                <SelectValue placeholder="90 days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">Any timeline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="accepting-queries"
              checked={filters.currently_accepting}
              onCheckedChange={(checked: boolean) => setFilters(prev => ({ ...prev, currently_accepting: checked }))}
            />
            <label htmlFor="accepting-queries" className="text-sm">
              Only accepting queries
            </label>
          </div>
        </div>
      </Card>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {viewMode === 'matches' ? 'Best Matches' : 'All Agents'}
                <span className="ml-2 text-sm text-muted-foreground">
                  ({viewMode === 'matches' ? topMatches.length : filteredAgents.length} results)
                </span>
              </h3>
            </div>

            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8">Loading agents...</div>
                ) : viewMode === 'matches' && topMatches.length > 0 ? (
                  topMatches.map(({ agent, match, connections }) =>
                    renderAgentCard(agent, match, connections)
                  )
                ) : viewMode === 'list' && filteredAgents.length > 0 ? (
                  filteredAgents.map(agent => renderAgentCard(agent))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {viewMode === 'matches' 
                      ? 'No manuscript provided for matching'
                      : 'No agents found matching your criteria'
                    }
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Agent Details */}
        <div>
          {selectedAgent ? (
            <Card className="p-4">
              <ScrollArea className="h-[600px]">
                {renderAgentDetails(selectedAgent)}
              </ScrollArea>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="text-center space-y-3">
                <Users className="w-8 h-8 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-medium">Select an Agent</h3>
                  <p className="text-sm text-muted-foreground">
                    Click on any agent to view detailed information
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default AgentResearch