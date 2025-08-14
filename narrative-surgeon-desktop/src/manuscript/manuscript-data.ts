/**
 * Core data structures for Digital Shadows manuscript
 * Single-manuscript architecture focused on chapter reordering
 */

export interface TechnoThrillerManuscript {
  metadata: ManuscriptMetadata
  chapters: Chapter[]
  characters: Character[]
  locations: Location[]
  techConcepts: TechConcept[]
  timeline: TimelineEvent[]
}

export interface ManuscriptMetadata {
  title: string
  author: string
  wordCount: number
  genre: 'techno-thriller'
  version: string
  lastModified: Date
  created: Date
  description?: string
  tags: string[]
}

export interface Chapter {
  id: number
  title: string
  content: string
  wordCount: number
  originalPosition: number
  currentPosition: number
  
  // For reordering logic
  dependencies: ChapterDependencies
  
  // For consistency tracking
  metadata: ChapterMetadata
  
  // Editor state
  editorState?: {
    lastEditPosition?: number
    isComplete: boolean
    needsReview: boolean
    lastModified: Date
  }
}

export interface ChapterDependencies {
  // What reader must know before this chapter
  requiredKnowledge: string[]
  
  // What this chapter introduces to the story
  introduces: string[]
  
  // Direct references to other chapters
  references: ChapterReference[]
  
  // Plot threads this chapter advances
  plotThreads: string[]
  
  // Character arcs this chapter develops
  characterArcs: string[]
}

export interface ChapterReference {
  targetChapterId: number
  referenceType: 'setup' | 'payoff' | 'callback' | 'foreshadowing'
  description: string
  isRequired: boolean // If true, target chapter must come before this one
}

export interface ChapterMetadata {
  pov: string // Point of view character
  location: string // Primary setting
  timeframe: string // When this takes place
  tensionLevel: number // 1-10 scale
  majorEvents: string[] // Key plot points
  
  // Techno-thriller specific
  techFocus: string[] // Technical concepts featured
  threatLevel: number // 1-10 scale of danger/stakes
  actionLevel: number // 1-10 scale of action content
  
  // Story structure
  plotRole: 'setup' | 'rising-action' | 'climax' | 'falling-action' | 'resolution'
  actNumber: number // Traditional 3-act structure
  
  // Quality metrics
  readingTime: number // Estimated minutes
  complexity: number // 1-10 scale
  emotionalImpact: number // 1-10 scale
}

export interface Character {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
  description: string
  
  // Character arc tracking
  arc: {
    introduction: number // Chapter where first introduced
    keyMoments: CharacterMoment[]
    currentStatus: string
    goalMotivation: string
  }
  
  // Technical skills (relevant for techno-thriller)
  techSkills: string[]
  relationships: CharacterRelationship[]
  
  // Appearance tracking
  appearsInChapters: number[]
  povChapters: number[] // Chapters from their POV
}

export interface CharacterMoment {
  chapterId: number
  momentType: 'introduction' | 'development' | 'revelation' | 'climax' | 'resolution'
  description: string
  emotionalState: string
}

export interface CharacterRelationship {
  targetCharacterId: string
  relationshipType: string
  status: 'ally' | 'enemy' | 'neutral' | 'unknown'
  description: string
}

export interface Location {
  id: string
  name: string
  type: 'office' | 'home' | 'public' | 'vehicle' | 'virtual' | 'other'
  description: string
  
  // Techno-thriller specific
  securityLevel: 'low' | 'medium' | 'high' | 'classified'
  techInfrastructure: string[]
  
  // Usage tracking
  appearsInChapters: number[]
  significanceLevel: number // 1-10 how important to story
}

export interface TechConcept {
  id: string
  name: string
  category: 'cybersecurity' | 'ai' | 'hacking' | 'surveillance' | 'hardware' | 'software' | 'other'
  description: string
  realismLevel: 'realistic' | 'plausible' | 'fictional'
  
  // Introduction and usage
  introducedInChapter: number
  referencedInChapters: number[]
  
  // Complexity and explanation
  complexityLevel: number // 1-10 how technical
  needsExplanation: boolean
  explanationProvided: boolean
  
  // Story impact
  plotRelevance: number // 1-10 how crucial to plot
  threatPotential: number // 1-10 how dangerous
}

export interface TimelineEvent {
  id: string
  title: string
  description: string
  timestamp: string // Relative to story time
  chapterId: number
  
  // Event categorization
  eventType: 'attack' | 'discovery' | 'revelation' | 'confrontation' | 'resolution' | 'other'
  importance: number // 1-10 scale
  
  // Dependencies
  triggeredBy?: string[] // Other event IDs
  triggers?: string[] // Events this causes
  
  // Stakes and consequences
  consequences: string[]
  affectedCharacters: string[]
  affectedLocations: string[]
}

/**
 * Reordering analysis result
 */
export interface ReorderingAnalysis {
  isValid: boolean
  errors: ReorderingError[]
  warnings: ReorderingWarning[]
  suggestions: ReorderingSuggestion[]
  
  // Impact metrics
  impactScore: number // Overall impact of reordering
  readabilityScore: number // How readable the new order is
  tensionCurve: number[] // Tension levels across chapters
  
  // Dependency analysis
  brokenDependencies: ChapterReference[]
  newOpportunities: ChapterReference[]
}

export interface ReorderingError {
  type: 'broken-dependency' | 'plot-hole' | 'character-inconsistency' | 'timeline-error'
  severity: 'critical' | 'major' | 'minor'
  description: string
  affectedChapters: number[]
  suggestedFix?: string
}

export interface ReorderingWarning {
  type: 'tension-drop' | 'pacing-issue' | 'character-gap' | 'tech-complexity'
  description: string
  affectedChapters: number[]
  impact: number // 1-10 scale
}

export interface ReorderingSuggestion {
  type: 'move-chapter' | 'split-chapter' | 'merge-chapters' | 'add-transition'
  description: string
  targetChapters: number[]
  expectedImprovement: string
  effort: 'low' | 'medium' | 'high'
}

/**
 * Export format options
 */
export interface ExportOptions {
  format: 'docx' | 'pdf' | 'txt' | 'markdown' | 'epub'
  includeMetadata: boolean
  includeChapterNumbers: boolean
  pageBreakBetweenChapters: boolean
  
  // Version specific
  versionId?: string
  chapterRange?: {
    start: number
    end: number
  }
  
  // Formatting options
  fontFamily?: string
  fontSize?: number
  lineSpacing?: number
  margins?: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

/**
 * Reading progress tracking
 */
export interface ReadingProgress {
  currentChapter: number
  currentPosition: number // Character position within chapter
  readingTime: number // Total minutes spent reading
  chaptersCompleted: number[]
  bookmarks: Bookmark[]
  notes: Note[]
}

export interface Bookmark {
  id: string
  chapterId: number
  position: number
  title?: string
  description?: string
  created: Date
  color?: string
}

export interface Note {
  id: string
  chapterId: number
  position: number
  content: string
  type: 'general' | 'plot' | 'character' | 'tech' | 'edit'
  created: Date
  modified?: Date
  tags: string[]
}

/**
 * Utility types for manuscript operations
 */
export type ChapterSortKey = 
  | 'originalPosition' 
  | 'currentPosition' 
  | 'title' 
  | 'wordCount' 
  | 'tensionLevel' 
  | 'lastModified'

export type ChapterFilterCriteria = {
  povCharacter?: string
  location?: string
  plotRole?: ChapterMetadata['plotRole']
  minTensionLevel?: number
  maxTensionLevel?: number
  techFocus?: string[]
  needsReview?: boolean
  isComplete?: boolean
}

export type ManuscriptValidationResult = {
  isValid: boolean
  structuralIssues: string[]
  contentIssues: string[]
  dependencyIssues: string[]
  suggestions: string[]
  overallScore: number // 1-100 manuscript quality score
}