// Single manuscript types - aligned with database schema
export interface Manuscript {
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

export interface Scene {
  id: string;
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

export interface Character {
  id: string;
  name: string;
  role?: string;
  firstAppearanceSceneId?: string;
  voiceSample?: string;
  createdAt: number;
}

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

/* Additional exports to satisfy desktop code imports */
export interface ManuscriptSummary {
  id: string;
  title: string;
  wordCount: number;
  author?: string;
  genre?: string;
  updatedAt: number;
}

export interface AnalysisResult {
  summary: string;
  scores?: Record<string, number>;
  recommendations?: string[];
}

export interface QueryLetter {
  content: string;
  score?: number;
  suggestions?: string[];
}

export interface ImportResult {
  manuscript: Manuscript;
  scenes: Scene[];
  errors?: string[];
}

export type ExportFormat = 'markdown' | 'docx' | 'pdf' | 'txt' | string;
