export interface Manuscript {
  id: string;
  title: string;
  genre?: 'literary' | 'thriller' | 'romance' | 'mystery' | 'fantasy' | 'scifi' | 'historical' | 'other';
  targetAudience?: 'adult' | 'ya' | 'mg';
  compTitles?: string[];
  createdAt: number;
  updatedAt: number;
  totalWordCount: number;
  openingStrengthScore?: number;
  hookEffectiveness?: number;
}

export interface Scene {
  id: string;
  manuscriptId: string;
  chapterNumber?: number;
  sceneNumberInChapter?: number;
  indexInManuscript: number;
  title?: string;
  rawText: string;
  wordCount: number;
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
  manuscriptId: string;
  name: string;
  role?: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  firstAppearanceSceneId?: string;
  voiceSample?: string;
  createdAt: number;
}

export interface RevisionNote {
  id: string;
  sceneId: string;
  type?: 'plot_hole' | 'consistency' | 'pacing' | 'voice' | 'hook';
  content: string;
  resolved: boolean;
  createdAt: number;
}

export interface ChapterBreak {
  position: number;
  chapterNumber?: number;
  title?: string;
  type: 'numbered' | 'titled' | 'marker';
}

export interface GenreProfile {
  name: string;
  typicalOpeningElements: string[];
  expectedPaceBeats: number;
  averageSceneLength: number;
  chapterEndExpectations: string[];
}

export interface EditorState {
  currentScene: Scene;
  wordCountDelta: number;
  unsavedChanges: boolean;
  lastSaved: Date;
  revisionNotes: RevisionNote[];
}