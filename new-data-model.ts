// NEW FOCUSED DATA MODEL FOR SINGLE MANUSCRIPT WITH VERSION CONTROL

// Core manuscript representation - single instance, hard-coded data
export interface TechnoThrillerManuscript {
  id: 'techno-thriller-2024'; // Hard-coded ID
  title: 'Digital Shadows'; // Hard-coded title - update as needed
  author: string;
  totalWordCount: 90000; // Hard-coded target
  createdAt: number;
  updatedAt: number;
  
  // Version control metadata
  currentVersionId: string;
  originalVersionId: string; // The initial chapter order
  
  // Manuscript-specific metadata
  genre: 'techno-thriller';
  targetAudience: 'adult';
  logline: string;
  elevator_pitch: string;
}

// Chapter-focused scene representation
export interface Chapter {
  id: string;
  originalChapterNumber: number; // Original position (1-based)
  currentChapterNumber: number;  // Current position in active version
  title: string;
  scenes: Scene[];
  
  // Chapter-specific metadata for reordering
  wordCount: number;
  isActionChapter: boolean;
  isExpositionChapter: boolean;
  isClimaxChapter: boolean;
  
  // Dependency tracking for consistency
  characterArcs: string[]; // Character names that have development in this chapter
  plotThreads: string[];  // Plot elements advanced/resolved
  settingIntroductions: string[]; // New locations introduced
  technologyElements: string[]; // Tech concepts introduced/used
  
  // Transition analysis
  opensWithHook: boolean;
  closesWithHook: boolean;
  requiresPreviousContext: string[]; // What must be established before this chapter
  establishesContext: string[]; // What this chapter establishes for later chapters
}

export interface Scene {
  id: string;
  chapterId: string;
  sceneNumberInChapter: number;
  title?: string;
  rawText: string;
  wordCount: number;
  
  // Scene metadata for consistency tracking  
  povCharacter: string;
  location: string;
  timeMarker: string; // "Day 1, Morning", etc.
  
  // Scene function in story
  sceneFunction: 'action' | 'exposition' | 'character' | 'plot' | 'transition';
  emotionalBeat: string;
  tensionLevel: 1 | 2 | 3 | 4 | 5;
  
  // Version tracking
  createdAt: number;
  updatedAt: number;
  lastModifiedInVersion: string;
}

// Version control for chapter arrangements
export interface ManuscriptVersion {
  id: string;
  name: string; // "Original Order", "Media Res Start", "Agent Query v1"
  description: string;
  createdAt: number;
  
  // Chapter arrangement
  chapterOrder: string[]; // Array of chapter IDs in order
  
  // Version metadata
  purpose: 'original' | 'agent_query' | 'experiment' | 'final';
  wordCount: number;
  isActive: boolean;
  
  // Analysis results for this arrangement
  openingStrength: number; // 1-10 score
  paceAnalysis: PaceAnalysis;
  consistencyIssues: ConsistencyIssue[];
}

// Pacing analysis for different chapter orders
export interface PaceAnalysis {
  versionId: string;
  
  // Act structure analysis
  act1EndChapter: number;
  act2MidpointChapter: number; 
  act3StartChapter: number;
  
  // Pacing metrics
  actionChapterDistribution: number[]; // Chapter numbers with action
  expositionLoad: number; // Percentage of exposition vs action
  tensionCurve: number[]; // Tension level per chapter (1-5)
  
  // Media res effectiveness
  startsInMediaRes: boolean;
  hookStrength: number; // 1-10 score for opening
  contextEstablishmentDelay: number; // How many chapters until context is clear
}

// Consistency tracking between versions
export interface ConsistencyIssue {
  id: string;
  versionId: string;
  type: 'character_arc' | 'plot_hole' | 'setting' | 'technology' | 'timeline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  description: string;
  affectedChapters: string[];
  
  // Specific issue details
  characterName?: string;
  plotThread?: string;
  timelineConflict?: string;
  technologyInconsistency?: string;
  
  // Resolution tracking  
  isResolved: boolean;
  resolutionNotes?: string;
  resolvedAt?: number;
}

// Chapter dependency graph for reordering validation
export interface ChapterDependency {
  chapterId: string;
  dependsOn: string[]; // Chapter IDs that must come before this one
  enables: string[]; // Chapter IDs that this chapter enables
  
  dependencyType: 'character_development' | 'plot_advancement' | 'setting_establishment' | 'technology_explanation';
  isHardDependency: boolean; // False if dependency can be worked around with editing
}

// Comparison between versions
export interface VersionComparison {
  baseVersionId: string;
  compareVersionId: string;
  
  chapterOrderDiff: {
    moved: Array<{chapterId: string, from: number, to: number}>;
    added: string[];
    removed: string[];
  };
  
  impactAnalysis: {
    affectedCharacterArcs: string[];
    brokenPlotThreads: string[];
    newConsistencyIssues: ConsistencyIssue[];
    paceImpact: 'improved' | 'degraded' | 'neutral';
    openingStrengthDelta: number; // Change in opening strength score
  };
}

// AI assistance context for chapter transitions
export interface TransitionContext {
  fromChapterId: string;
  toChapterId: string;
  versionId: string;
  
  // Context analysis
  narrativeGap: {
    timeSkip?: string;
    locationChange?: string;
    povChange?: string;
    toneShift?: string;
  };
  
  // AI suggestions
  bridgeTextSuggestions: string[];
  revisionNeeded: {
    fromChapterEnd: boolean;
    toChapterStart: boolean;
    suggestedChanges: string[];
  };
  
  // Consistency warnings
  warnings: string[];
}

// Simplified store state for single manuscript
export interface SingleManuscriptState {
  // Core data
  manuscript: TechnoThrillerManuscript;
  chapters: Map<string, Chapter>;
  
  // Version control
  versions: Map<string, ManuscriptVersion>;
  currentVersion: ManuscriptVersion;
  compareVersion?: ManuscriptVersion;
  
  // UI state
  isReorderMode: boolean;
  selectedChapterId?: string;
  dragPreview?: {
    chapterId: string;
    fromIndex: number;
    toIndex: number;
  };
  
  // Analysis state
  consistencyIssues: ConsistencyIssue[];
  paceAnalysis?: PaceAnalysis;
  dependencies: Map<string, ChapterDependency>;
  
  // Loading/error state
  isLoading: boolean;
  error?: string;
  
  // Actions (methods will be defined in store implementation)
  actions: {
    // Version control
    createVersion: (name: string, description: string, purpose: ManuscriptVersion['purpose']) => Promise<string>;
    switchVersion: (versionId: string) => Promise<void>;
    duplicateVersion: (versionId: string, newName: string) => Promise<string>;
    deleteVersion: (versionId: string) => Promise<void>;
    
    // Chapter reordering  
    reorderChapters: (newOrder: string[]) => Promise<void>;
    previewReorder: (newOrder: string[]) => VersionComparison;
    commitReorder: () => Promise<void>;
    resetReorder: () => void;
    
    // Analysis
    analyzeConsistency: (versionId?: string) => Promise<ConsistencyIssue[]>;
    analyzePacing: (versionId?: string) => Promise<PaceAnalysis>;
    generateTransitionSuggestions: (fromChapter: string, toChapter: string) => Promise<TransitionContext>;
    
    // Chapter editing
    updateChapterContent: (chapterId: string, updates: Partial<Chapter>) => Promise<void>;
    updateSceneContent: (sceneId: string, updates: Partial<Scene>) => Promise<void>;
    
    // Export
    exportVersion: (versionId: string, format: 'docx' | 'pdf' | 'markdown') => Promise<void>;
  };
}

// Migration types for transforming current data
export interface DataMigrationPlan {
  // Current manuscript to migrate (if any existing data)
  sourceManuscriptId?: string;
  
  // Hard-coded data setup
  manuscriptMetadata: {
    title: string;
    author: string;
    logline: string;
    elevator_pitch: string;
  };
  
  // Chapter structure setup
  chapterMapping: Array<{
    originalNumber: number;
    title: string;
    scenes: Array<{
      title?: string;
      povCharacter: string;
      location: string;
      sceneFunction: Scene['sceneFunction'];
    }>;
  }>;
  
  // Initial version setup  
  initialVersions: Array<{
    name: string;
    description: string;
    purpose: ManuscriptVersion['purpose'];
    chapterOrder: number[]; // Original order for first version
  }>;
}

// Database schema changes needed
export interface DatabaseMigration {
  // New tables
  createTables: string[];
  
  // Modified tables
  alterTables: string[];
  
  // Dropped tables (from multi-manuscript era)
  dropTables: string[];
  
  // Data migration queries
  dataMigration: string[];
}

// Export all types for use in implementation
export type {
  TechnoThrillerManuscript,
  Chapter,
  Scene,
  ManuscriptVersion,
  PaceAnalysis,
  ConsistencyIssue,
  ChapterDependency,
  VersionComparison,
  TransitionContext,
  SingleManuscriptState,
  DataMigrationPlan,
  DatabaseMigration
};