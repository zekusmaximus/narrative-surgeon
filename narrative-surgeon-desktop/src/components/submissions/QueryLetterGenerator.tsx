'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, 
  Wand2, 
  CheckCircle, 
  AlertTriangle,
  Copy,
  Download,
  RefreshCw,
  Eye,
  BookOpen,
  User,
  Target,
  Zap
} from 'lucide-react'

interface QuerySection {
  id: string
  name: string
  description: string
  placeholder: string
  maxWords: number
  required: boolean
  tips: string[]
}

interface QueryTemplate {
  name: string
  description: string
  genres: string[]
  structure: QuerySection[]
  wordCountRange: [number, number]
  industryStandard: boolean
  examples: string[]
  personalizable: string[]
}

interface AgentPersonalization {
  agentName: string
  agency: string
  recentClient?: string
  specificInterest?: string
  personalConnection?: string
  submissionGuidelines?: string
}

interface QueryAnalysis {
  wordCount: number
  score: number
  strengths: string[]
  improvements: string[]
  industryCompliance: boolean
  genreAlignment: number
}

const queryTemplates: { [key: string]: QueryTemplate } = {
  literary: {
    name: 'Literary Fiction',
    description: 'Character-driven narratives with literary merit',
    genres: ['Literary Fiction', 'Upmarket Fiction', 'Book Club Fiction'],
    wordCountRange: [200, 250],
    industryStandard: true,
    examples: [
      'Dear [Agent Name], I am seeking representation for my literary novel...',
      'When [Character] discovers [Inciting Incident]...'
    ],
    personalizable: ['agent_name', 'agency', 'recent_client', 'specific_interest'],
    structure: [
      {
        id: 'personalization',
        name: 'Personal Opening',
        description: 'Personalized greeting and connection to agent',
        placeholder: 'Dear [Agent Name], I am writing to you because...',
        maxWords: 50,
        required: true,
        tips: [
          'Research the agent thoroughly',
          'Mention a recent client or book they represented',
          'Reference their stated preferences or wishlist',
          'Be specific, not generic'
        ]
      },
      {
        id: 'hook',
        name: 'Opening Hook',
        description: 'Compelling opening that captures the story essence',
        placeholder: 'When [character] faces [situation], they must [choice/conflict]...',
        maxWords: 75,
        required: true,
        tips: [
          'Start with character and conflict',
          'Use active voice',
          'Create immediate interest',
          'Avoid backstory or worldbuilding'
        ]
      },
      {
        id: 'plot',
        name: 'Story Development',
        description: 'Core conflict, stakes, and character development',
        placeholder: 'As [character] struggles with [internal conflict], they discover [revelation]...',
        maxWords: 100,
        required: true,
        tips: [
          'Focus on emotional journey',
          'Show character growth',
          'Highlight literary themes',
          'Avoid plot summary'
        ]
      },
      {
        id: 'credentials',
        name: 'Author Platform',
        description: 'Writing credentials, publications, and relevant experience',
        placeholder: 'I have published work in [publications] and [relevant experience]...',
        maxWords: 75,
        required: false,
        tips: [
          'Include relevant publications only',
          'Mention writing education or awards',
          'Highlight platform if significant',
          'Keep brief if limited experience'
        ]
      },
      {
        id: 'closing',
        name: 'Professional Closing',
        description: 'Word count, submission details, and polite closing',
        placeholder: '[Title] is complete at [word count] words. Thank you for your consideration.',
        maxWords: 25,
        required: true,
        tips: [
          'Include exact word count',
          'Mention if part of a series',
          'Be professional and concise',
          'Thank them for their time'
        ]
      }
    ]
  },
  commercial: {
    name: 'Commercial Fiction',
    description: 'Market-driven narratives with broad appeal',
    genres: ['Commercial Fiction', 'Women\'s Fiction', 'Thriller', 'Romance'],
    wordCountRange: [250, 300],
    industryStandard: true,
    examples: [
      'Dear [Agent Name], I am seeking representation for my commercial thriller...',
      '[Character] thought [normal life] until [inciting incident] changed everything...'
    ],
    personalizable: ['agent_name', 'agency', 'recent_client', 'market_appeal', 'comp_titles'],
    structure: [
      {
        id: 'personalization',
        name: 'Personal Opening',
        description: 'Targeted greeting with market relevance',
        placeholder: 'Dear [Agent Name], I believe my commercial fiction will appeal to readers of [recent client work]...',
        maxWords: 50,
        required: true,
        tips: [
          'Connect to similar successful titles',
          'Show market awareness',
          'Reference agent\'s commercial success',
          'Demonstrate genre knowledge'
        ]
      },
      {
        id: 'hook',
        name: 'High-Concept Hook',
        description: 'Marketable premise with clear stakes',
        placeholder: '[Character] must [urgent goal] or [dire consequence] will [impact]...',
        maxWords: 50,
        required: true,
        tips: [
          'Lead with marketable concept',
          'Emphasize urgency and stakes',
          'Make it pitch-ready',
          'Show commercial appeal'
        ]
      },
      {
        id: 'stakes',
        name: 'Escalating Stakes',
        description: 'Rising tension and character choices',
        placeholder: 'When [complication] threatens [what character values], they must choose between [options]...',
        maxWords: 100,
        required: true,
        tips: [
          'Build tension progressively',
          'Show impossible choices',
          'Highlight page-turning elements',
          'Focus on external conflict'
        ]
      },
      {
        id: 'protagonist',
        name: 'Compelling Protagonist',
        description: 'Character appeal and relatability',
        placeholder: '[Character] is a [relatable description] who [unique strength/flaw]...',
        maxWords: 50,
        required: true,
        tips: [
          'Make character relatable',
          'Show unique voice or perspective',
          'Highlight character growth',
          'Appeal to target demographic'
        ]
      },
      {
        id: 'market',
        name: 'Market Positioning',
        description: 'Comparable titles and target audience',
        placeholder: '[Title] will appeal to readers of [comp title 1] and [comp title 2]...',
        maxWords: 50,
        required: true,
        tips: [
          'Choose recent, successful comps',
          'Show market understanding',
          'Target specific audience',
          'Highlight commercial potential'
        ]
      }
    ]
  },
  genre: {
    name: 'Genre Fiction',
    description: 'Fantasy, science fiction, mystery, and other genre works',
    genres: ['Fantasy', 'Science Fiction', 'Mystery', 'Horror', 'Paranormal'],
    wordCountRange: [250, 275],
    industryStandard: true,
    examples: [
      'Dear [Agent Name], I am seeking representation for my fantasy novel...',
      'In a world where [worldbuilding element], [character] discovers [unique power/mystery]...'
    ],
    personalizable: ['agent_name', 'agency', 'genre_expertise', 'recent_sales'],
    structure: [
      {
        id: 'personalization',
        name: 'Genre-Specific Opening',
        description: 'Connection based on agent\'s genre expertise',
        placeholder: 'Dear [Agent Name], I am seeking representation for my [genre] novel, knowing your expertise with [specific subgenre]...',
        maxWords: 40,
        required: true,
        tips: [
          'Reference agent\'s genre specialization',
          'Mention specific subgenre knowledge',
          'Show familiarity with their client list',
          'Demonstrate genre community awareness'
        ]
      },
      {
        id: 'world_hook',
        name: 'World and Hook',
        description: 'Unique setting combined with compelling premise',
        placeholder: 'In a world where [unique worldbuilding], [character] must [quest/mystery] when [inciting incident]...',
        maxWords: 75,
        required: true,
        tips: [
          'Balance worldbuilding with character',
          'Show unique genre elements',
          'Make world integral to plot',
          'Avoid info-dumping'
        ]
      },
      {
        id: 'protagonist_stakes',
        name: 'Character and Stakes',
        description: 'Character development within genre framework',
        placeholder: '[Character], a [role/description], discovers [power/truth/mystery] that forces them to [character arc]...',
        maxWords: 100,
        required: true,
        tips: [
          'Show character growth through genre elements',
          'Balance personal and world stakes',
          'Highlight unique character traits',
          'Connect stakes to genre expectations'
        ]
      },
      {
        id: 'unique_elements',
        name: 'Unique Selling Points',
        description: 'What makes this story stand out in the genre',
        placeholder: 'Unlike typical [genre] stories, [Title] features [unique element] and explores [fresh theme]...',
        maxWords: 60,
        required: true,
        tips: [
          'Highlight fresh takes on genre tropes',
          'Show innovative worldbuilding',
          'Demonstrate genre knowledge',
          'Position against successful comps'
        ]
      }
    ]
  }
}

export function QueryLetterGenerator({ manuscriptId, className }: { manuscriptId: string; className?: string }) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('literary')
  const [queryContent, setQueryContent] = useState<{ [key: string]: string }>({})
  const [personalization, setPersonalization] = useState<AgentPersonalization>({
    agentName: '',
    agency: '',
    recentClient: '',
    specificInterest: '',
    personalConnection: '',
    submissionGuidelines: ''
  })
  const [analysis, setAnalysis] = useState<QueryAnalysis | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuery, setGeneratedQuery] = useState('')
  const [activeSection, setActiveSection] = useState('personalization')

  const template = queryTemplates[selectedTemplate]

  useEffect(() => {
    // Initialize content for selected template
    const initialContent: { [key: string]: string } = {}
    template.structure.forEach(section => {
      initialContent[section.id] = queryContent[section.id] || ''
    })
    setQueryContent(initialContent)
  }, [selectedTemplate])

  useEffect(() => {
    // Analyze query in real-time
    const fullQuery = generateFullQuery()
    if (fullQuery.length > 50) {
      analyzeQuery(fullQuery)
    }
  }, [queryContent, personalization])

  const generateFullQuery = (): string => {
    let query = ''
    
    template.structure.forEach((section, index) => {
      const content = queryContent[section.id] || ''
      if (content.trim()) {
        if (index > 0) query += '\n\n'
        query += content.trim()
      }
    })

    return personalizeQuery(query)
  }

  const personalizeQuery = (query: string): string => {
    let personalized = query
    
    // Replace personalization tokens
    if (personalization.agentName) {
      personalized = personalized.replace(/\[Agent Name\]/g, personalization.agentName)
    }
    if (personalization.agency) {
      personalized = personalized.replace(/\[Agency\]/g, personalization.agency)
    }
    if (personalization.recentClient) {
      personalized = personalized.replace(/\[Recent Client\]/g, personalization.recentClient)
    }
    if (personalization.specificInterest) {
      personalized = personalized.replace(/\[Specific Interest\]/g, personalization.specificInterest)
    }

    return personalized
  }

  const analyzeQuery = (query: string) => {
    const words = query.split(/\s+/).filter(word => word.length > 0)
    const wordCount = words.length
    
    const strengths: string[] = []
    const improvements: string[] = []
    let score = 70 // Base score

    // Word count analysis
    const [minWords, maxWords] = template.wordCountRange
    if (wordCount >= minWords && wordCount <= maxWords) {
      strengths.push('Word count within industry standards')
      score += 10
    } else if (wordCount < minWords) {
      improvements.push(`Query is too short (${wordCount}/${minWords} words minimum)`)
      score -= 15
    } else {
      improvements.push(`Query is too long (${wordCount}/${maxWords} words maximum)`)
      score -= 10
    }

    // Personalization analysis
    if (personalization.agentName && personalization.agency) {
      strengths.push('Properly personalized with agent details')
      score += 15
    } else {
      improvements.push('Missing agent personalization')
      score -= 20
    }

    // Content analysis
    const hasHook = query.toLowerCase().includes('when ') || query.toLowerCase().includes('after ') || 
                   query.toLowerCase().includes('must ') || query.toLowerCase().includes('discovers ')
    if (hasHook) {
      strengths.push('Strong narrative hook present')
      score += 10
    } else {
      improvements.push('Consider strengthening the opening hook')
      score -= 10
    }

    // Stakes analysis
    const hasStakes = query.toLowerCase().includes('must ') || query.toLowerCase().includes('or ') || 
                     query.toLowerCase().includes('threatens') || query.toLowerCase().includes('risks')
    if (hasStakes) {
      strengths.push('Clear stakes established')
      score += 10
    } else {
      improvements.push('Stakes could be clearer or more compelling')
      score -= 10
    }

    // Genre alignment
    const genreScore = selectedTemplate === 'literary' ? 85 : 
                      selectedTemplate === 'commercial' ? 90 : 80

    setAnalysis({
      wordCount,
      score: Math.max(0, Math.min(100, score)),
      strengths,
      improvements,
      industryCompliance: wordCount >= minWords && wordCount <= maxWords && 
                         personalization.agentName.length > 0,
      genreAlignment: genreScore
    })
  }

  const generateAIQuery = async () => {
    setIsGenerating(true)
    try {
      // Simulate AI generation (in real implementation, this would call the LLM)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const aiGenerated = `Dear ${personalization.agentName || '[Agent Name]'},

I am seeking representation for my ${template.genres[0].toLowerCase()} novel, [TITLE], complete at [WORD COUNT] words.

${template.examples[1]}

This story explores themes of [THEMES] and will appeal to readers who enjoyed [COMP TITLES].

I have [CREDENTIALS] and am a member of [WRITING ORGANIZATIONS].

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
[Your Name]`

      setGeneratedQuery(aiGenerated)
    } catch (error) {
      console.error('AI generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const exportQuery = (format: 'txt' | 'docx' | 'pdf') => {
    const fullQuery = generateFullQuery()
    const blob = new Blob([fullQuery], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-letter-${selectedTemplate}.${format === 'docx' ? 'txt' : format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = () => {
    const fullQuery = generateFullQuery()
    navigator.clipboard.writeText(fullQuery)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Query Letter Generator</h2>
            <p className="text-sm text-muted-foreground">
              Create industry-standard query letters with professional templates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={generateAIQuery} disabled={isGenerating}>
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            AI Assist
          </Button>
          <Button variant="outline" onClick={copyToClipboard}>
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button onClick={() => exportQuery('txt')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Template Selection */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Template Selection
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(queryTemplates).map(([key, template]) => (
            <div
              key={key}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedTemplate === key 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTemplate(key)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{template.name}</h4>
                {template.industryStandard && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Industry Standard
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {template.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {template.genres.map(genre => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {template.wordCountRange[0]}-{template.wordCountRange[1]} words
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Analysis Dashboard */}
      {analysis && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Query Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className={`text-2xl font-bold mb-1 ${getScoreColor(analysis.score)}`}>
                {analysis.score}
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {analysis.wordCount}
              </div>
              <div className="text-sm text-muted-foreground">Word Count</div>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {analysis.genreAlignment}%
              </div>
              <div className="text-sm text-muted-foreground">Genre Fit</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className={`text-2xl font-bold mb-1 ${analysis.industryCompliance ? 'text-green-600' : 'text-red-600'}`}>
                {analysis.industryCompliance ? '✓' : '✗'}
              </div>
              <div className="text-sm text-muted-foreground">Industry Standard</div>
            </div>
          </div>

          {(analysis.strengths.length > 0 || analysis.improvements.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {analysis.strengths.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Strengths
                  </h4>
                  <ul className="space-y-1">
                    {analysis.strengths.map((strength, index) => (
                      <li key={index} className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                        <div className="w-1 h-1 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {analysis.improvements.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-600 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Improvements
                  </h4>
                  <ul className="space-y-1">
                    {analysis.improvements.map((improvement, index) => (
                      <li key={index} className="text-sm text-orange-700 dark:text-orange-300 flex items-start gap-2">
                        <div className="w-1 h-1 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Main Editor */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Query Builder */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Agent Personalization</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Agent Name *</label>
                  <Input
                    value={personalization.agentName}
                    onChange={(e) => setPersonalization(prev => ({ ...prev, agentName: e.target.value }))}
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Agency</label>
                  <Input
                    value={personalization.agency}
                    onChange={(e) => setPersonalization(prev => ({ ...prev, agency: e.target.value }))}
                    placeholder="Literary Agency Inc."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Recent Client</label>
                  <Input
                    value={personalization.recentClient}
                    onChange={(e) => setPersonalization(prev => ({ ...prev, recentClient: e.target.value }))}
                    placeholder="Author of 'Recent Bestseller'"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Specific Interest</label>
                  <Input
                    value={personalization.specificInterest}
                    onChange={(e) => setPersonalization(prev => ({ ...prev, specificInterest: e.target.value }))}
                    placeholder="character-driven literary fiction"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5 mb-4">
                {template.structure.map(section => (
                  <TabsTrigger key={section.id} value={section.id} className="text-xs">
                    {section.name.split(' ')[0]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {template.structure.map(section => (
                <TabsContent key={section.id} value={section.id} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{section.name}</h4>
                      <div className="flex items-center gap-2">
                        {section.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          Max {section.maxWords} words
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {section.description}
                    </p>
                    
                    <Textarea
                      value={queryContent[section.id] || ''}
                      onChange={(e) => setQueryContent(prev => ({ ...prev, [section.id]: e.target.value }))}
                      placeholder={section.placeholder}
                      className="min-h-[120px]"
                    />

                    <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {(queryContent[section.id] || '').split(' ').filter(w => w).length} / {section.maxWords} words
                      </span>
                      <Progress 
                        value={Math.min(100, ((queryContent[section.id] || '').split(' ').filter(w => w).length / section.maxWords) * 100)} 
                        className="w-20 h-2"
                      />
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Writing Tips
                    </h5>
                    <ul className="space-y-1">
                      {section.tips.map((tip, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>
              ))}
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Live Preview
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg font-mono text-sm leading-relaxed whitespace-pre-wrap min-h-[400px] border">
                {generateFullQuery() || 'Start writing your query letter...'}
              </div>
            </Card>

            {generatedQuery && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  AI Suggestion
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap border">
                  {generatedQuery}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => setQueryContent({ generatedQuery })}>
                    Use This Version
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setGeneratedQuery('')}>
                    Dismiss
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  )
}

export default QueryLetterGenerator