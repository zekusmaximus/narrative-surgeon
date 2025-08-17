/**
 * Unified Type System for Narrative Surgeon
 * 
 * This file provides a single source of truth for all manuscript types,
 * handling both legacy (Manuscript) and modern (TechnoThrillerManuscript) formats
 * with proper type guards and migration functions.
 */

// ============================================================================
// LEGACY TYPES (from src/types/index.ts)
// ============================================================================

export interface LegacyManuscript {
  id: string;
  title: string;
  author?: string;
  genre?: string;
  targetAudience?: string;
  compTitles?: string[];
  createdAt: number;
  updatedAt: number;
  totalWordCount: number;
  openingStrengthScore?: number;
  hookEffectiveness?: number;
}

export interface LegacyScene {
  id: string;
  manuscriptId: string;
  chapterNumber?: number;
  sceneNumberInChapter?: number;
  indexInManuscript: number;
  title?: string;
  rawText: string;
  wordCount: number;
  // Back-compat alias properties for legacy snake_case usage
  raw_text?: string;
  word_count?: number;
  isOpening: boolean;
  isChapterEnd: boolean;
  opensWithHook: boolean;
  endsWithHook: boolean;
  povCharacter?: string;
  location?: string;
  timeMarker?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LegacyCharacter {
  id: string;
  manuscriptId: string;
  name: string;
  role?: string;
  firstAppearanceSceneId?: string;
  voiceSample?: string;
  createdAt: number;
}

// ============================================================================
// MODERN TYPES (from src/types/single-manuscript.ts)
// ============================================================================

export interface ModernManuscript {
  id: string;
  metadata: ManuscriptMetadata;
  content: ManuscriptContent;
  versions: Map<string, ManuscriptVersion>;
  currentVersionId: string;
  settings: EditorSettings;
}

export interface ManuscriptMetadata {
  title: string;
  author: string;
  genre: 'techno-thriller';
  wordCount: number;
  characterCount: number;
  chapterCount: number;
  lastModified: Date;
  created: Date;
  version: string;
}

export interface ManuscriptContent {
  chapters: Chapter[];
  characters: Character[];
  locations: Location[];
  techConcepts: TechConcept[];
  timeline: TimelineEvent[];
  notes: EditorialNote[];
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  content: string;
  wordCount: number;
  
  // Position tracking for reordering
  originalPosition: number;
  currentPosition: number;
  
  // Additional properties for compatibility
  lastModified?: Date;
  
  // Consistency tracking
  dependencies: ChapterDependencies;
  metadata: ChapterMetadata;
}

export interface ChapterDependencies {
  requiredKnowledge: string[];        // What reader must know before this chapter
  introduces: string[];               // What this chapter introduces to the story
  references: ChapterReference[];     // Links to other chapters
  continuityRules: string[];          // Rules this chapter must follow
}

export interface ChapterReference {
  targetChapterId: string;
  referenceType: 'plot' | 'character' | 'tech' | 'location' | 'timeline';
  description: string;
  strength: 'weak' | 'medium' | 'strong'; // How critical the reference is
}

export interface ChapterMetadata {
  pov: string;                        // Point of view character
  location: string[];                 // Primary locations
  timeframe: string;                  // When this chapter occurs
  tensionLevel: number;               // 1-10 story tension rating
  majorEvents: string[];              // Key plot events
  techElements: string[];             // Technology featured
  characterArcs: string[];            // Character development
}

export interface ManuscriptVersion {
  id: string;
  name: string;
  description: string;
  chapterOrder: string[];             // Array of chapter IDs in this order
  created: Date;
  isBaseVersion: boolean;
  parentVersionId?: string;
  changes: VersionChange[];
}

export interface VersionChange {
  type: 'reorder' | 'modify' | 'add' | 'remove';
  chapterId: string;
  oldPosition?: number;
  newPosition?: number;
  description: string;
  timestamp: Date;
}

export interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  firstAppearance: string;            // Chapter ID
  description: string;
  techExpertise?: string[];
}

export interface Location {
  id: string;
  name: string;
  type: 'city' | 'building' | 'virtual' | 'vehicle' | 'other';
  description: string;
  firstMention: string;               // Chapter ID
  significance: 'major' | 'minor';
}

export interface TechConcept {
  id: string;
  name: string;
  category: 'ai' | 'cyber' | 'biotech' | 'hardware' | 'software' | 'other';
  description: string;
  firstIntroduction: string;          // Chapter ID
  complexity: 'simple' | 'moderate' | 'complex';
  realismLevel: 'realistic' | 'near-future' | 'speculative';
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  chapterId: string;
  relativeTime: string;               // "Day 1", "Three weeks later", etc.
  significance: 'minor' | 'major' | 'critical';
}

export interface EditorialNote {
  id: string;
  chapterId?: string;                 // If specific to a chapter
  content: string;
  type: 'consistency' | 'plot' | 'character' | 'tech' | 'general';
  priority: 'low' | 'medium' | 'high';
  created: Date;
  resolved: boolean;
}

export interface EditorSettings {
  autoSave: boolean;
  autoSaveInterval: number;           // seconds
  showWordCount: boolean;
  showCharacterCount: boolean;
  enableConsistencyChecking: boolean;
  highlightInconsistencies: boolean;
  defaultView: 'editor' | 'outline' | 'split';
}

// ============================================================================
// DISCRIMINATED UNION TYPES
// ============================================================================

export type ManuscriptDocument = 
  | { type: 'legacy'; data: LegacyManuscript }
  | { type: 'modern'; data: ModernManuscript };

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isLegacyManuscript(doc: unknown): doc is LegacyManuscript {
  return (
    typeof doc === 'object' &&
    doc !== null &&
    'id' in doc &&
    'title' in doc &&
    'createdAt' in doc &&
    'updatedAt' in doc &&
    'totalWordCount' in doc &&
    typeof (doc as any).id === 'string' &&
    typeof (doc as any).title === 'string' &&
    typeof (doc as any).createdAt === 'number' &&
    typeof (doc as any).updatedAt === 'number' &&
    typeof (doc as any).totalWordCount === 'number'
  );
}

export function isModernManuscript(doc: unknown): doc is ModernManuscript {
  return (
    typeof doc === 'object' &&
    doc !== null &&
    'id' in doc &&
    'metadata' in doc &&
    'content' in doc &&
    'versions' in doc &&
    'currentVersionId' in doc &&
    'settings' in doc &&
    typeof (doc as any).id === 'string' &&
    typeof (doc as any).metadata === 'object' &&
    typeof (doc as any).content === 'object' &&
    typeof (doc as any).currentVersionId === 'string' &&
    typeof (doc as any).settings === 'object' &&
    (doc as any).metadata !== null &&
    'title' in (doc as any).metadata &&
    'author' in (doc as any).metadata &&
    'version' in (doc as any).metadata
  );
}

export function isManuscriptDocument(doc: unknown): doc is ManuscriptDocument {
  return (
    typeof doc === 'object' &&
    doc !== null &&
    'type' in doc &&
    'data' in doc &&
    ((doc as any).type === 'legacy' || (doc as any).type === 'modern') &&
    typeof (doc as any).data === 'object'
  );
}

export function isLegacyScene(scene: unknown): scene is LegacyScene {
  return (
    typeof scene === 'object' &&
    scene !== null &&
    'id' in scene &&
    'manuscriptId' in scene &&
    'rawText' in scene &&
    'wordCount' in scene &&
    'indexInManuscript' in scene &&
    'isOpening' in scene &&
    'isChapterEnd' in scene &&
    'createdAt' in scene &&
    'updatedAt' in scene &&
    typeof (scene as any).id === 'string' &&
    typeof (scene as any).manuscriptId === 'string' &&
    typeof (scene as any).rawText === 'string' &&
    typeof (scene as any).wordCount === 'number' &&
    typeof (scene as any).indexInManuscript === 'number' &&
    typeof (scene as any).isOpening === 'boolean' &&
    typeof (scene as any).isChapterEnd === 'boolean' &&
    typeof (scene as any).createdAt === 'number' &&
    typeof (scene as any).updatedAt === 'number'
  );
}

export function isChapter(chapter: unknown): chapter is Chapter {
  return (
    typeof chapter === 'object' &&
    chapter !== null &&
    'id' in chapter &&
    'number' in chapter &&
    'title' in chapter &&
    'content' in chapter &&
    'wordCount' in chapter &&
    'originalPosition' in chapter &&
    'currentPosition' in chapter &&
    'dependencies' in chapter &&
    'metadata' in chapter &&
    typeof (chapter as any).id === 'string' &&
    typeof (chapter as any).number === 'number' &&
    typeof (chapter as any).title === 'string' &&
    typeof (chapter as any).content === 'string' &&
    typeof (chapter as any).wordCount === 'number' &&
    typeof (chapter as any).originalPosition === 'number' &&
    typeof (chapter as any).currentPosition === 'number' &&
    typeof (chapter as any).dependencies === 'object' &&
    typeof (chapter as any).metadata === 'object'
  );
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

export function migrateToModern(legacy: LegacyManuscript, scenes?: LegacyScene[], characters?: LegacyCharacter[]): ModernManuscript {
  // Convert scenes to chapters
  const chapters: Chapter[] = scenes ? scenes.map((scene, index) => ({
    id: scene.id,
    number: scene.chapterNumber || index + 1,
    title: scene.title || `Chapter ${scene.chapterNumber || index + 1}`,
    content: scene.rawText,
    wordCount: scene.wordCount,
    originalPosition: scene.indexInManuscript,
    currentPosition: scene.indexInManuscript,
    lastModified: new Date(scene.updatedAt),
    dependencies: {
      requiredKnowledge: [],
      introduces: [],
      references: [],
      continuityRules: []
    },
    metadata: {
      pov: scene.povCharacter || 'Unknown',
      location: scene.location ? [scene.location] : [],
      timeframe: scene.timeMarker || '',
      tensionLevel: 5, // Default middle value
      majorEvents: [],
      techElements: [],
      characterArcs: []
    }
  })) : [];

  // Convert characters
  const modernCharacters: Character[] = characters ? characters.map(char => ({
    id: char.id,
    name: char.name,
    role: (char.role as Character['role']) || 'minor',
    firstAppearance: char.firstAppearanceSceneId || '',
    description: char.voiceSample || '',
    techExpertise: []
  })) : [];

  const baseVersion: ManuscriptVersion = {
    id: 'base',
    name: 'Original',
    description: 'Migrated from legacy format',
    chapterOrder: chapters.map(c => c.id),
    created: new Date(legacy.createdAt),
    isBaseVersion: true,
    changes: []
  };

  return {
    id: legacy.id,
    metadata: {
      title: legacy.title,
      author: legacy.author || 'Unknown Author',
      genre: 'techno-thriller',
      wordCount: legacy.totalWordCount,
      characterCount: modernCharacters.length,
      chapterCount: chapters.length,
      lastModified: new Date(legacy.updatedAt),
      created: new Date(legacy.createdAt),
      version: '2.0'
    },
    content: {
      chapters,
      characters: modernCharacters,
      locations: [],
      techConcepts: [],
      timeline: [],
      notes: []
    },
    versions: new Map([['base', baseVersion]]),
    currentVersionId: 'base',
    settings: {
      autoSave: true,
      autoSaveInterval: 30,
      showWordCount: true,
      showCharacterCount: true,
      enableConsistencyChecking: true,
      highlightInconsistencies: true,
      defaultView: 'editor'
    }
  };
}

export function exportToLegacy(modern: ModernManuscript): { manuscript: LegacyManuscript; scenes: LegacyScene[]; characters: LegacyCharacter[] } {
  const manuscript: LegacyManuscript = {
    id: modern.id,
    title: modern.metadata.title,
    author: modern.metadata.author,
    genre: modern.metadata.genre,
    targetAudience: undefined,
    compTitles: [],
    createdAt: modern.metadata.created.getTime(),
    updatedAt: modern.metadata.lastModified.getTime(),
    totalWordCount: modern.metadata.wordCount,
    openingStrengthScore: undefined,
    hookEffectiveness: undefined
  };

  const scenes: LegacyScene[] = modern.content.chapters.map((chapter, index) => ({
    id: chapter.id,
    manuscriptId: modern.id,
    chapterNumber: chapter.number,
    sceneNumberInChapter: 1,
    indexInManuscript: index,
    title: chapter.title,
    rawText: chapter.content,
    wordCount: chapter.wordCount,
    raw_text: chapter.content, // Back-compat alias
    word_count: chapter.wordCount, // Back-compat alias
    isOpening: index === 0,
    isChapterEnd: true,
    opensWithHook: false,
    endsWithHook: false,
    povCharacter: chapter.metadata.pov,
    location: chapter.metadata.location[0] || undefined,
    timeMarker: chapter.metadata.timeframe,
    createdAt: modern.metadata.created.getTime(),
    updatedAt: chapter.lastModified?.getTime() || modern.metadata.lastModified.getTime()
  }));

  const characters: LegacyCharacter[] = modern.content.characters.map(char => ({
    id: char.id,
    manuscriptId: modern.id,
    name: char.name,
    role: char.role,
    firstAppearanceSceneId: char.firstAppearance,
    voiceSample: char.description,
    createdAt: modern.metadata.created.getTime()
  }));

  return { manuscript, scenes, characters };
}

// ============================================================================
// SHARED INTERFACES (for backward compatibility)
// ============================================================================

export interface RevisionNote {
  id: string;
  sceneId: string;
  type?: string;
  content: string;
  resolved: boolean;
  createdAt: number;
}

export interface SceneAnalysis {
  id: string;
  sceneId: string;
  summary?: string;
  primaryEmotion?: string;
  secondaryEmotion?: string;
  tensionLevel?: number;
  pacingScore?: number;
  functionTags?: string;
  voiceFingerprint?: string;
  conflictPresent?: boolean;
  characterIntroduced?: boolean;
  analyzedAt?: number;
}

export interface OpeningAnalysis {
  id: string;
  manuscriptId: string;
  hookType?: string;
  hookStrength?: number;
  voiceEstablished?: boolean;
  characterEstablished?: boolean;
  conflictEstablished?: boolean;
  genreAppropriate?: boolean;
  similarToComps?: string;
  agentReadinessScore?: number;
  analysisNotes?: string;
  analyzedAt?: number;
}

export interface ManuscriptSummary {
  id: string;
  title: string;
  wordCount: number;
  author?: string;
  genre?: string;
  updatedAt: number;
}

export interface AnalysisResult {
  manuscriptId: string;
  summary: string;
  scores?: Record<string, number>;
  recommendations?: string[];
}

export interface QueryLetter {
  manuscriptId: string;
  content: string;
  score?: number;
  suggestions?: string[];
}

export interface ImportResult {
  manuscripts: LegacyManuscript[];
  scenes: LegacyScene[];
  errors?: string[];
}

export type ExportFormat = 'markdown' | 'docx' | 'pdf' | 'txt' | string;

// ============================================================================
// CONSISTENCY CHECKING TYPES
// ============================================================================

export interface ConsistencyCheck {
  id: string;
  type: 'character' | 'plot' | 'tech' | 'timeline' | 'location';
  severity: 'info' | 'warning' | 'error';
  message: string;
  chapterIds: string[];
  suggestion?: string;
  autoFixable: boolean;
}

export interface ConsistencyReport {
  timestamp: Date;
  checks: ConsistencyCheck[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

// ============================================================================
// SERIALIZATION HELPERS
// ============================================================================

export interface SerializableManuscript {
  id: string;
  metadata: ManuscriptMetadata;
  content: ManuscriptContent;
  versions: [string, ManuscriptVersion][];
  currentVersionId: string;
  settings: EditorSettings;
}

export function manuscriptToSerializable(manuscript: ModernManuscript): SerializableManuscript {
  return {
    ...manuscript,
    versions: Array.from(manuscript.versions.entries())
  };
}

export function manuscriptFromSerializable(serializable: SerializableManuscript): ModernManuscript {
  return {
    ...serializable,
    versions: new Map(serializable.versions)
  };
}

// ============================================================================
// LEGACY ALIASES (for backward compatibility)
// ============================================================================

// Export legacy types with their original names for backward compatibility
export type Manuscript = LegacyManuscript;
export type Scene = LegacyScene;
export type TechnoThrillerManuscript = ModernManuscript;

// Legacy aliases (Note: Character type from this file shadows the modern Character)