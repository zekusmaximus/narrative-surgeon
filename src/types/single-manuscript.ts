// Re-export core types from index.ts for consistency
export type { Manuscript, Scene, Character, RevisionNote, SceneAnalysis, OpeningAnalysis } from './index'

export interface TechnoThrillerManuscript {
  id: string
  metadata: ManuscriptMetadata
  content: ManuscriptContent
  versions: Map<string, ManuscriptVersion>
  currentVersionId: string
  settings: EditorSettings
}

export interface ManuscriptMetadata {
  title: string
  author: string
  genre: 'techno-thriller'
  wordCount: number
  characterCount: number
  chapterCount: number
  lastModified: Date
  created: Date
  version: string
}

export interface ManuscriptContent {
  chapters: Chapter[]
  characters: Character[]
  locations: Location[]
  techConcepts: TechConcept[]
  timeline: TimelineEvent[]
  notes: EditorialNote[]
}

export interface Chapter {
  id: string
  number: number
  title: string
  content: string
  wordCount: number
  
  // Position tracking for reordering
  originalPosition: number
  currentPosition: number
  
  // Consistency tracking
  dependencies: ChapterDependencies
  metadata: ChapterMetadata
}

export interface ChapterDependencies {
  requiredKnowledge: string[]        // What reader must know before this chapter
  introduces: string[]               // What this chapter introduces to the story
  references: ChapterReference[]     // Links to other chapters
  continuityRules: string[]          // Rules this chapter must follow
}

export interface ChapterReference {
  targetChapterId: string
  referenceType: 'plot' | 'character' | 'tech' | 'location' | 'timeline'
  description: string
  strength: 'weak' | 'medium' | 'strong' // How critical the reference is
}

export interface ChapterMetadata {
  pov: string                        // Point of view character
  location: string[]                 // Primary locations
  timeframe: string                  // When this chapter occurs
  tensionLevel: number               // 1-10 story tension rating
  majorEvents: string[]              // Key plot events
  techElements: string[]             // Technology featured
  characterArcs: string[]            // Character development
}

export interface ManuscriptVersion {
  id: string
  name: string
  description: string
  chapterOrder: string[]             // Array of chapter IDs in this order
  created: Date
  isBaseVersion: boolean
  parentVersionId?: string
  changes: VersionChange[]
}

export interface VersionChange {
  type: 'reorder' | 'modify' | 'add' | 'remove'
  chapterId: string
  oldPosition?: number
  newPosition?: number
  description: string
  timestamp: Date
}

export interface Character {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
  firstAppearance: string            // Chapter ID
  description: string
  techExpertise?: string[]
}

export interface Location {
  id: string
  name: string
  type: 'city' | 'building' | 'virtual' | 'vehicle' | 'other'
  description: string
  firstMention: string               // Chapter ID
  significance: 'major' | 'minor'
}

export interface TechConcept {
  id: string
  name: string
  category: 'ai' | 'cyber' | 'biotech' | 'hardware' | 'software' | 'other'
  description: string
  firstIntroduction: string          // Chapter ID
  complexity: 'simple' | 'moderate' | 'complex'
  realismLevel: 'realistic' | 'near-future' | 'speculative'
}

export interface TimelineEvent {
  id: string
  title: string
  description: string
  chapterId: string
  relativeTime: string               // "Day 1", "Three weeks later", etc.
  significance: 'minor' | 'major' | 'critical'
}

export interface EditorialNote {
  id: string
  chapterId?: string                 // If specific to a chapter
  content: string
  type: 'consistency' | 'plot' | 'character' | 'tech' | 'general'
  priority: 'low' | 'medium' | 'high'
  created: Date
  resolved: boolean
}

export interface EditorSettings {
  autoSave: boolean
  autoSaveInterval: number           // seconds
  showWordCount: boolean
  showCharacterCount: boolean
  enableConsistencyChecking: boolean
  highlightInconsistencies: boolean
  defaultView: 'editor' | 'outline' | 'split'
}

// Consistency checking types
export interface ConsistencyCheck {
  id: string
  type: 'character' | 'plot' | 'tech' | 'timeline' | 'location'
  severity: 'info' | 'warning' | 'error'
  message: string
  chapterIds: string[]
  suggestion?: string
  autoFixable: boolean
}

export interface ConsistencyReport {
  timestamp: Date
  checks: ConsistencyCheck[]
  summary: {
    total: number
    errors: number
    warnings: number
    info: number
  }
}

// Version comparison types
export interface VersionComparison {
  baseVersion: ManuscriptVersion
  compareVersion: ManuscriptVersion
  differences: VersionDifference[]
  reorderingAnalysis: ReorderingAnalysis
}

export interface VersionDifference {
  chapterId: string
  type: 'position' | 'content' | 'metadata'
  oldValue: any
  newValue: any
  impact: 'low' | 'medium' | 'high'
}

export interface ReorderingAnalysis {
  consistencyIssues: ConsistencyCheck[]
  flowImpact: number                 // 0-100 score
  recommendedAdjustments: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

// Serialization helpers for Map objects
export interface SerializableManuscript {
  id: string
  metadata: ManuscriptMetadata
  content: ManuscriptContent
  versions: [string, ManuscriptVersion][]
  currentVersionId: string
  settings: EditorSettings
}

export function manuscriptToSerializable(manuscript: TechnoThrillerManuscript): SerializableManuscript {
  return {
    ...manuscript,
    versions: Array.from(manuscript.versions.entries())
  }
}

export function manuscriptFromSerializable(serializable: SerializableManuscript): TechnoThrillerManuscript {
  return {
    ...serializable,
    versions: new Map(serializable.versions)
  }
}