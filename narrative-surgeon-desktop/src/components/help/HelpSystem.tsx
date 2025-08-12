/**
 * In-App Help System
 * Provides contextual help, tutorials, and user support
 */

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  HelpCircle,
  Search,
  BookOpen,
  Video,
  MessageSquare,
  Lightbulb,
  Keyboard,
  Settings,
  FileText,
  Users,
  Target,
  BarChart3,
  Download,
  PlayCircle,
  ExternalLink,
  Star,
  Clock,
  CheckCircle,
  ArrowRight,
  X
} from 'lucide-react'

interface HelpArticle {
  id: string
  title: string
  category: string
  content: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedReadTime: number
  lastUpdated: string
  rating: number
  views: number
}

interface Tutorial {
  id: string
  title: string
  description: string
  duration: number
  steps: TutorialStep[]
  category: string
  prerequisites?: string[]
  videoUrl?: string
  completed: boolean
}

interface TutorialStep {
  id: string
  title: string
  description: string
  action?: string
  element?: string
  screenshot?: string
}

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  popularity: number
  helpful: number
  notHelpful: number
}

interface KeyboardShortcut {
  id: string
  category: string
  action: string
  shortcut: string
  description: string
  context?: string
}

export function HelpSystem({ className }: { className?: string }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null)
  const [currentTutorial, setCurrentTutorial] = useState<Tutorial | null>(null)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const helpArticles: HelpArticle[] = [
    {
      id: 'getting-started',
      title: 'Getting Started with Narrative Surgeon',
      category: 'basics',
      content: `# Getting Started

Welcome to Narrative Surgeon, your professional manuscript writing and publishing companion.

## Creating Your First Manuscript

1. Click the "New Manuscript" button
2. Enter your title, author name, and genre
3. Add a brief description (optional)
4. Click "Create" to begin writing

## Understanding the Interface

The main interface consists of:
- **Editor Panel**: Your main writing space
- **Scene Navigator**: Organize your chapters and scenes
- **Analysis Panel**: Real-time writing insights
- **Publishing Tools**: Query letters, agent research, and submissions

## Key Features

### AI-Powered Analysis
Get instant feedback on pacing, readability, and style as you write.

### Professional Export Formats
Export to industry-standard formats including Shunn manuscript, query packages, and more.

### Agent Research & Submission Tracking
Find the perfect agents for your work and track your submission progress.`,
      tags: ['introduction', 'setup', 'basics'],
      difficulty: 'beginner',
      estimatedReadTime: 5,
      lastUpdated: '2024-01-15',
      rating: 4.8,
      views: 2547
    },
    {
      id: 'query-letters',
      title: 'Writing Effective Query Letters',
      category: 'publishing',
      content: `# Writing Effective Query Letters

A query letter is your first impression with agents and editors. Here's how to make it count.

## Structure

1. **Hook** (1-2 sentences): Grab attention immediately
2. **Plot Summary** (1-2 paragraphs): Main conflict and stakes
3. **Bio** (1 paragraph): Your writing credentials
4. **Housekeeping** (1 sentence): Word count, genre, title

## Tips for Success

- Personalize each query to the specific agent
- Keep it to one page
- Show, don't tell your story's appeal
- Research the agent's client list and recent deals
- Follow submission guidelines exactly

## Using the Query Generator

1. Navigate to Publishing Tools > Query Letters
2. Fill in your manuscript details
3. Use the AI assistant to refine your hook
4. Generate personalized versions for different agents
5. Track response rates and optimize accordingly`,
      tags: ['query', 'publishing', 'agents', 'writing'],
      difficulty: 'intermediate',
      estimatedReadTime: 8,
      lastUpdated: '2024-01-12',
      rating: 4.6,
      views: 1823
    },
    {
      id: 'agent-research',
      title: 'Finding the Right Literary Agent',
      category: 'publishing',
      content: `# Finding the Right Literary Agent

The right agent can make or break your publishing career. Here's how to find them.

## Research Strategy

1. **Start with your genre**: Agents specialize in specific categories
2. **Look at acknowledgments**: Check books similar to yours
3. **Use industry resources**: Publishers Marketplace, QueryTracker, etc.
4. **Conference attendance**: Meet agents in person when possible

## Using Agent Research Tools

Our built-in agent database provides:
- Current submission status (open/closed)
- Recent deals and client successes  
- Response time averages
- Submission preferences
- Contact information and guidelines

## Red Flags to Avoid

- Agents who charge reading fees
- No recent sales in your genre
- Poor communication or unprofessional behavior
- Unrealistic promises about publication

## Making Your List

Create three tiers:
- **Tier 1**: Dream agents (5-10 agents)
- **Tier 2**: Good matches (10-15 agents) 
- **Tier 3**: Acceptable options (10-20 agents)

Query in small batches to test and refine your approach.`,
      tags: ['agents', 'research', 'publishing', 'submissions'],
      difficulty: 'intermediate',
      estimatedReadTime: 12,
      lastUpdated: '2024-01-10',
      rating: 4.9,
      views: 1456
    }
  ]

  const tutorials: Tutorial[] = [
    {
      id: 'first-manuscript',
      title: 'Create Your First Manuscript',
      description: 'Learn how to set up and start writing your first manuscript in Narrative Surgeon.',
      duration: 5,
      category: 'basics',
      steps: [
        {
          id: 'step1',
          title: 'Welcome to Narrative Surgeon',
          description: 'Let\'s create your first manuscript. Click the "New Manuscript" button in the main toolbar.',
          action: 'click',
          element: '[data-testid="new-manuscript-button"]'
        },
        {
          id: 'step2', 
          title: 'Enter Manuscript Details',
          description: 'Fill in your manuscript title, author name, and select the genre that best fits your work.',
          action: 'input',
          element: '[data-testid="manuscript-form"]'
        },
        {
          id: 'step3',
          title: 'Start Writing',
          description: 'Click "Create" to open your manuscript. You can now start writing in the editor panel.',
          action: 'navigate',
          element: '[data-testid="editor-panel"]'
        }
      ],
      completed: false
    },
    {
      id: 'ai-analysis',
      title: 'Using AI Analysis Features',
      description: 'Discover how to leverage AI-powered insights to improve your writing.',
      duration: 8,
      category: 'features',
      prerequisites: ['first-manuscript'],
      steps: [
        {
          id: 'step1',
          title: 'Access Analysis Panel',
          description: 'Open the Analysis panel from the sidebar to see real-time insights about your writing.',
          action: 'click',
          element: '[data-testid="analysis-panel"]'
        },
        {
          id: 'step2',
          title: 'Review Writing Metrics',
          description: 'Examine readability score, pacing analysis, and style suggestions.',
          action: 'observe',
          element: '[data-testid="writing-metrics"]'
        }
      ],
      completed: false
    },
    {
      id: 'query-generator',
      title: 'Generate Professional Query Letters',
      description: 'Learn to create compelling query letters using our AI-powered generator.',
      duration: 10,
      category: 'publishing',
      prerequisites: ['first-manuscript'],
      videoUrl: 'https://narrativesurgeon.com/videos/query-tutorial',
      steps: [
        {
          id: 'step1',
          title: 'Navigate to Query Generator',
          description: 'Go to Publishing Tools and select Query Letter Generator.',
          action: 'navigate',
          element: '[data-testid="query-generator"]'
        },
        {
          id: 'step2',
          title: 'Enter Story Details',
          description: 'Provide your logline, synopsis, and target word count.',
          action: 'input',
          element: '[data-testid="story-details-form"]'
        },
        {
          id: 'step3',
          title: 'Generate and Refine',
          description: 'Use AI assistance to create and polish your query letter.',
          action: 'interact',
          element: '[data-testid="generate-query"]'
        }
      ],
      completed: false
    }
  ]

  const faqItems: FAQItem[] = [
    {
      id: 'export-formats',
      question: 'What export formats does Narrative Surgeon support?',
      answer: 'Narrative Surgeon supports industry-standard formats including Shunn manuscript format, query packages, synopsis formats (short and long), pitch sheets, book proposals, and standard formats like DOCX, PDF, and more.',
      category: 'export',
      popularity: 95,
      helpful: 234,
      notHelpful: 12
    },
    {
      id: 'ai-accuracy',
      question: 'How accurate is the AI analysis?',
      answer: 'Our AI analysis uses advanced language models to provide insights on readability, pacing, and style. While highly accurate for general guidance, it should supplement, not replace, human judgment and professional editing.',
      category: 'ai',
      popularity: 88,
      helpful: 189,
      notHelpful: 23
    },
    {
      id: 'agent-database',
      question: 'How often is the agent database updated?',
      answer: 'Our agent database is updated weekly with new agents, status changes, and recent deals. We source information from Publishers Marketplace, agency websites, and industry contacts.',
      category: 'agents',
      popularity: 76,
      helpful: 145,
      notHelpful: 8
    }
  ]

  const keyboardShortcuts: KeyboardShortcut[] = [
    {
      id: 'save',
      category: 'File',
      action: 'Save',
      shortcut: 'Ctrl+S',
      description: 'Save current manuscript'
    },
    {
      id: 'new-scene',
      category: 'Writing',
      action: 'New Scene',
      shortcut: 'Ctrl+Shift+N',
      description: 'Create a new scene'
    },
    {
      id: 'analyze',
      category: 'Analysis',
      action: 'Run Analysis',
      shortcut: 'Ctrl+Shift+A',
      description: 'Analyze current manuscript'
    },
    {
      id: 'export',
      category: 'Export',
      action: 'Quick Export',
      shortcut: 'Ctrl+E',
      description: 'Export with last used settings'
    },
    {
      id: 'search',
      category: 'Navigation',
      action: 'Search',
      shortcut: 'Ctrl+F',
      description: 'Search within manuscript'
    },
    {
      id: 'focus-mode',
      category: 'Writing',
      action: 'Focus Mode',
      shortcut: 'Ctrl+Shift+F',
      description: 'Toggle distraction-free writing'
    }
  ]

  const filteredArticles = helpArticles.filter(article => {
    const matchesSearch = searchQuery === '' || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const startOnboarding = () => {
    setShowOnboarding(true)
    setCurrentTutorial(tutorials[0])
    setTutorialStep(0)
  }

  const nextTutorialStep = () => {
    if (currentTutorial && tutorialStep < currentTutorial.steps.length - 1) {
      setTutorialStep(tutorialStep + 1)
    } else {
      completeTutorial()
    }
  }

  const completeTutorial = () => {
    if (currentTutorial) {
      currentTutorial.completed = true
      setCurrentTutorial(null)
      setTutorialStep(0)
      setShowOnboarding(false)
    }
  }

  const renderTutorialOverlay = () => {
    if (!showOnboarding || !currentTutorial) return null

    const currentStep = currentTutorial.steps[tutorialStep]
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <Card className="max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{currentTutorial.title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOnboarding(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">
              Step {tutorialStep + 1} of {currentTutorial.steps.length}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((tutorialStep + 1) / currentTutorial.steps.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium mb-2">{currentStep.title}</h4>
            <p className="text-sm text-gray-600">{currentStep.description}</p>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setTutorialStep(Math.max(0, tutorialStep - 1))}
              disabled={tutorialStep === 0}
            >
              Previous
            </Button>
            <Button onClick={nextTutorialStep}>
              {tutorialStep === currentTutorial.steps.length - 1 ? 'Complete' : 'Next'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <HelpCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Help & Support</h2>
            <p className="text-sm text-muted-foreground">
              Get help, learn features, and master your writing workflow
            </p>
          </div>
        </div>

        <Button onClick={startOnboarding}>
          <PlayCircle className="w-4 h-4 mr-2" />
          Start Tutorial
        </Button>
      </div>

      <Tabs defaultValue="articles" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="articles">
            <BookOpen className="w-4 h-4 mr-2" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="tutorials">
            <Video className="w-4 h-4 mr-2" />
            Tutorials
          </TabsTrigger>
          <TabsTrigger value="faq">
            <MessageSquare className="w-4 h-4 mr-2" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="shortcuts">
            <Keyboard className="w-4 h-4 mr-2" />
            Shortcuts
          </TabsTrigger>
          <TabsTrigger value="support">
            <Settings className="w-4 h-4 mr-2" />
            Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles">
          <div className="space-y-4">
            {/* Search and filters */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">All Categories</option>
                <option value="basics">Basics</option>
                <option value="writing">Writing</option>
                <option value="publishing">Publishing</option>
                <option value="features">Features</option>
                <option value="export">Export</option>
              </select>
            </div>

            {/* Articles list */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredArticles.map(article => (
                <Card 
                  key={article.id}
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setSelectedArticle(article)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium">{article.title}</h3>
                    <Badge 
                      variant={
                        article.difficulty === 'beginner' ? 'default' :
                        article.difficulty === 'intermediate' ? 'secondary' : 'destructive'
                      }
                      className="text-xs"
                    >
                      {article.difficulty}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {article.content.substring(0, 150)}...
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.estimatedReadTime} min read
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {article.rating}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {article.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tutorials">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tutorials.map(tutorial => (
              <Card key={tutorial.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-500" />
                    <h3 className="font-medium">{tutorial.title}</h3>
                  </div>
                  {tutorial.completed && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {tutorial.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>{tutorial.duration} minutes</span>
                  <span>{tutorial.steps.length} steps</span>
                </div>

                {tutorial.prerequisites && tutorial.prerequisites.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium mb-1">Prerequisites:</div>
                    <div className="flex flex-wrap gap-1">
                      {tutorial.prerequisites.map(prereq => (
                        <Badge key={prereq} variant="outline" className="text-xs">
                          {prereq}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setCurrentTutorial(tutorial)
                      setTutorialStep(0)
                      setShowOnboarding(true)
                    }}
                    variant={tutorial.completed ? "outline" : "default"}
                  >
                    <PlayCircle className="w-3 h-3 mr-1" />
                    {tutorial.completed ? 'Review' : 'Start'}
                  </Button>
                  
                  {tutorial.videoUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={tutorial.videoUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Video
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="faq">
          <div className="space-y-4">
            {faqItems.map(faq => (
              <Card key={faq.id} className="p-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  {faq.question}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">{faq.answer}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Badge variant="secondary">{faq.category}</Badge>
                  <div className="flex items-center gap-2">
                    <span>👍 {faq.helpful}</span>
                    <span>👎 {faq.notHelpful}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="shortcuts">
          <div className="space-y-4">
            {Object.entries(
              keyboardShortcuts.reduce((acc, shortcut) => {
                if (!acc[shortcut.category]) acc[shortcut.category] = []
                acc[shortcut.category].push(shortcut)
                return acc
              }, {} as Record<string, KeyboardShortcut[]>)
            ).map(([category, shortcuts]) => (
              <Card key={category} className="p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-purple-500" />
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map(shortcut => (
                    <div key={shortcut.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{shortcut.action}</div>
                        <div className="text-xs text-muted-foreground">{shortcut.description}</div>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {shortcut.shortcut}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="support">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Contact Support
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Need personal assistance? Our support team is here to help.
              </p>
              <div className="space-y-3">
                <Button className="w-full" asChild>
                  <a href="mailto:support@narrativesurgeon.com">
                    Email Support
                  </a>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <a href="https://narrativesurgeon.com/support" target="_blank">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Support Portal
                  </a>
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                Community
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect with other writers and share tips and experiences.
              </p>
              <div className="space-y-3">
                <Button variant="outline" className="w-full" asChild>
                  <a href="https://community.narrativesurgeon.com" target="_blank">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Community Forum
                  </a>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <a href="https://discord.gg/narrativesurgeon" target="_blank">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Discord Server
                  </a>
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Article Reader Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {selectedArticle?.title}
              <div className="flex items-center gap-2">
                <Badge variant={
                  selectedArticle?.difficulty === 'beginner' ? 'default' :
                  selectedArticle?.difficulty === 'intermediate' ? 'secondary' : 'destructive'
                }>
                  {selectedArticle?.difficulty}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="prose dark:prose-invert max-w-none">
              {selectedArticle?.content.split('\n').map((paragraph, index) => {
                if (paragraph.startsWith('#')) {
                  const level = paragraph.match(/^#+/)?.[0].length || 1
                  const text = paragraph.replace(/^#+\s*/, '')
                  const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements
                  return React.createElement(HeadingTag, { key: index }, text)
                }
                return paragraph ? <p key={index}>{paragraph}</p> : <br key={index} />
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {renderTutorialOverlay()}
    </div>
  )
}

export default HelpSystem