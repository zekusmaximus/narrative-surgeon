// SIMPLIFIED STORE IMPLEMENTATION FOR SINGLE MANUSCRIPT

import { create } from 'zustand';
import { produce } from 'immer';
import { invoke } from '@tauri-apps/api/core';
import type { 
  TechnoThrillerManuscript, 
  Chapter, 
  ManuscriptVersion, 
  ConsistencyIssue,
  PaceAnalysis,
  VersionComparison,
  TransitionContext,
  SingleManuscriptState
} from './new-data-model';

// Hard-coded manuscript configuration
const MANUSCRIPT_CONFIG = {
  id: 'techno-thriller-2024',
  title: 'Digital Shadows', // Update this to your actual title
  author: 'Author Name', // Update this
  genre: 'techno-thriller' as const,
  targetWordCount: 90000,
  logline: 'When a cybersecurity expert discovers a conspiracy buried in code, they must navigate a digital labyrinth where every connection could be their last.',
  elevator_pitch: 'A fast-paced techno-thriller that explores the intersection of technology and human nature in our hyperconnected world.'
};

export const useSingleManuscriptStore = create<SingleManuscriptState>((set, get) => ({
  // Initialize with hard-coded manuscript
  manuscript: {
    id: MANUSCRIPT_CONFIG.id,
    title: MANUSCRIPT_CONFIG.title,
    author: MANUSCRIPT_CONFIG.author,
    totalWordCount: MANUSCRIPT_CONFIG.targetWordCount,
    genre: MANUSCRIPT_CONFIG.genre,
    targetAudience: 'adult',
    logline: MANUSCRIPT_CONFIG.logline,
    elevator_pitch: MANUSCRIPT_CONFIG.elevator_pitch,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    currentVersionId: 'original',
    originalVersionId: 'original'
  },

  // State
  chapters: new Map(),
  versions: new Map(),
  currentVersion: {
    id: 'original',
    name: 'Original Chapter Order',
    description: 'The manuscript as originally written',
    createdAt: Date.now(),
    chapterOrder: [],
    purpose: 'original',
    wordCount: MANUSCRIPT_CONFIG.targetWordCount,
    isActive: true,
    openingStrength: 5,
    paceAnalysis: {
      versionId: 'original',
      act1EndChapter: 6,
      act2MidpointChapter: 12,
      act3StartChapter: 18,
      actionChapterDistribution: [],
      expositionLoad: 0.3,
      tensionCurve: [],
      startsInMediaRes: false,
      hookStrength: 6,
      contextEstablishmentDelay: 2
    },
    consistencyIssues: []
  },
  compareVersion: undefined,

  // UI State
  isReorderMode: false,
  selectedChapterId: undefined,
  dragPreview: undefined,

  // Analysis State  
  consistencyIssues: [],
  paceAnalysis: undefined,
  dependencies: new Map(),

  // Loading State
  isLoading: false,
  error: undefined,

  // Actions
  actions: {
    // Initialize store - load from database
    initialize: async () => {
      set({ isLoading: true, error: undefined });
      try {
        // Load chapters from database
        const chapters = await invoke<Chapter[]>('get_all_chapters');
        const versions = await invoke<ManuscriptVersion[]>('get_all_versions');
        
        // Convert to Maps for efficient lookup
        const chaptersMap = new Map(chapters.map(ch => [ch.id, ch]));
        const versionsMap = new Map(versions.map(v => [v.id, v]));
        
        // Find current version
        const currentVersionId = get().manuscript.currentVersionId;
        const currentVersion = versionsMap.get(currentVersionId) || get().currentVersion;
        
        set({
          chapters: chaptersMap,
          versions: versionsMap,
          currentVersion,
          isLoading: false
        });

        // Analyze consistency for current version
        await get().actions.analyzeConsistency();
        
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to initialize',
          isLoading: false 
        });
      }
    },

    // Version Control Operations
    createVersion: async (name: string, description: string, purpose: ManuscriptVersion['purpose']) => {
      const newVersionId = `version-${Date.now()}`;
      const currentVersion = get().currentVersion;
      
      const newVersion: ManuscriptVersion = {
        id: newVersionId,
        name,
        description,
        purpose,
        createdAt: Date.now(),
        chapterOrder: [...currentVersion.chapterOrder], // Copy current order
        wordCount: currentVersion.wordCount,
        isActive: false,
        openingStrength: 0, // Will be calculated
        paceAnalysis: {
          versionId: newVersionId,
          act1EndChapter: 0,
          act2MidpointChapter: 0, 
          act3StartChapter: 0,
          actionChapterDistribution: [],
          expositionLoad: 0,
          tensionCurve: [],
          startsInMediaRes: false,
          hookStrength: 0,
          contextEstablishmentDelay: 0
        },
        consistencyIssues: []
      };

      try {
        await invoke('create_version', { version: newVersion });
        
        set(produce((state: SingleManuscriptState) => {
          state.versions.set(newVersionId, newVersion);
        }));

        return newVersionId;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create version' });
        throw error;
      }
    },

    switchVersion: async (versionId: string) => {
      const version = get().versions.get(versionId);
      if (!version) {
        throw new Error(`Version ${versionId} not found`);
      }

      try {
        // Update database
        await invoke('set_active_version', { versionId });
        
        // Update state
        set(produce((state: SingleManuscriptState) => {
          // Mark old version as inactive
          if (state.currentVersion) {
            state.versions.set(state.currentVersion.id, {
              ...state.currentVersion,
              isActive: false
            });
          }
          
          // Set new version as active
          const updatedVersion = { ...version, isActive: true };
          state.versions.set(versionId, updatedVersion);
          state.currentVersion = updatedVersion;
          state.manuscript.currentVersionId = versionId;
          state.manuscript.updatedAt = Date.now();
          
          // Clear UI state
          state.isReorderMode = false;
          state.selectedChapterId = undefined;
          state.dragPreview = undefined;
        }));

        // Refresh analysis
        await get().actions.analyzeConsistency(versionId);
        await get().actions.analyzePacing(versionId);

      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to switch version' });
        throw error;
      }
    },

    duplicateVersion: async (versionId: string, newName: string) => {
      const sourceVersion = get().versions.get(versionId);
      if (!sourceVersion) {
        throw new Error(`Source version ${versionId} not found`);
      }

      return await get().actions.createVersion(
        newName,
        `Duplicated from ${sourceVersion.name}`,
        sourceVersion.purpose
      );
    },

    deleteVersion: async (versionId: string) => {
      if (versionId === 'original') {
        throw new Error('Cannot delete original version');
      }
      
      if (get().currentVersion.id === versionId) {
        throw new Error('Cannot delete active version');
      }

      try {
        await invoke('delete_version', { versionId });
        
        set(produce((state: SingleManuscriptState) => {
          state.versions.delete(versionId);
        }));
        
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to delete version' });
        throw error;
      }
    },

    // Chapter Reordering
    reorderChapters: async (newOrder: string[]) => {
      const currentVersion = get().currentVersion;
      
      set(produce((state: SingleManuscriptState) => {
        state.currentVersion.chapterOrder = newOrder;
        state.versions.set(currentVersion.id, state.currentVersion);
      }));

      try {
        await invoke('update_chapter_order', { 
          versionId: currentVersion.id, 
          chapterOrder: newOrder 
        });
        
        // Trigger consistency analysis
        await get().actions.analyzeConsistency();
        
      } catch (error) {
        // Rollback on error
        set(produce((state: SingleManuscriptState) => {
          state.currentVersion.chapterOrder = currentVersion.chapterOrder;
          state.versions.set(currentVersion.id, currentVersion);
        }));
        
        set({ error: error instanceof Error ? error.message : 'Failed to reorder chapters' });
        throw error;
      }
    },

    previewReorder: (newOrder: string[]) => {
      const currentVersion = get().currentVersion;
      const chapters = get().chapters;
      
      // Calculate impact of reordering
      const moved: Array<{chapterId: string, from: number, to: number}> = [];
      
      newOrder.forEach((chapterId, newIndex) => {
        const oldIndex = currentVersion.chapterOrder.indexOf(chapterId);
        if (oldIndex !== newIndex) {
          moved.push({ chapterId, from: oldIndex, to: newIndex });
        }
      });

      // Analyze character arc disruptions
      const affectedCharacterArcs: string[] = [];
      const brokenPlotThreads: string[] = [];
      
      moved.forEach(({ chapterId }) => {
        const chapter = chapters.get(chapterId);
        if (chapter) {
          affectedCharacterArcs.push(...chapter.characterArcs);
          brokenPlotThreads.push(...chapter.plotThreads);
        }
      });

      // Estimate opening strength change
      const newFirstChapter = chapters.get(newOrder[0]);
      const openingStrengthDelta = newFirstChapter?.opensWithHook ? +2 : -1;

      const comparison: VersionComparison = {
        baseVersionId: currentVersion.id,
        compareVersionId: 'preview',
        chapterOrderDiff: {
          moved,
          added: [],
          removed: []
        },
        impactAnalysis: {
          affectedCharacterArcs: [...new Set(affectedCharacterArcs)],
          brokenPlotThreads: [...new Set(brokenPlotThreads)],
          newConsistencyIssues: [], // Would need deeper analysis
          paceImpact: moved.length > 3 ? 'degraded' : 'neutral',
          openingStrengthDelta
        }
      };

      return comparison;
    },

    commitReorder: async () => {
      // Current implementation just persists the current order
      // In a more sophisticated version, this could create a new version
      const currentVersion = get().currentVersion;
      try {
        await invoke('commit_chapter_order', { versionId: currentVersion.id });
        
        set(produce((state: SingleManuscriptState) => {
          state.manuscript.updatedAt = Date.now();
        }));
        
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to commit reorder' });
        throw error;
      }
    },

    resetReorder: () => {
      const originalVersion = get().versions.get(get().manuscript.originalVersionId);
      if (originalVersion) {
        set(produce((state: SingleManuscriptState) => {
          state.currentVersion.chapterOrder = [...originalVersion.chapterOrder];
          state.dragPreview = undefined;
        }));
      }
    },

    // Analysis Operations
    analyzeConsistency: async (versionId?: string) => {
      const targetVersionId = versionId || get().currentVersion.id;
      const version = get().versions.get(targetVersionId);
      
      if (!version) return [];

      try {
        const issues = await invoke<ConsistencyIssue[]>('analyze_consistency', { 
          versionId: targetVersionId 
        });
        
        set({ consistencyIssues: issues });
        return issues;
        
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to analyze consistency' });
        return [];
      }
    },

    analyzePacing: async (versionId?: string) => {
      const targetVersionId = versionId || get().currentVersion.id;
      
      try {
        const analysis = await invoke<PaceAnalysis>('analyze_pacing', { 
          versionId: targetVersionId 
        });
        
        set({ paceAnalysis: analysis });
        
        // Update version with analysis results
        set(produce((state: SingleManuscriptState) => {
          const version = state.versions.get(targetVersionId);
          if (version) {
            version.paceAnalysis = analysis;
            version.openingStrength = analysis.hookStrength;
            state.versions.set(targetVersionId, version);
          }
        }));
        
        return analysis;
        
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to analyze pacing' });
        return undefined;
      }
    },

    generateTransitionSuggestions: async (fromChapter: string, toChapter: string) => {
      try {
        const context = await invoke<TransitionContext>('generate_transition_context', {
          fromChapterId: fromChapter,
          toChapterId: toChapter,
          versionId: get().currentVersion.id
        });
        
        return context;
        
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to generate transition suggestions' });
        throw error;
      }
    },

    // Content Operations  
    updateChapterContent: async (chapterId: string, updates: Partial<Chapter>) => {
      try {
        await invoke('update_chapter', { chapterId, updates });
        
        set(produce((state: SingleManuscriptState) => {
          const chapter = state.chapters.get(chapterId);
          if (chapter) {
            Object.assign(chapter, updates, { updatedAt: Date.now() });
            state.chapters.set(chapterId, chapter);
          }
        }));
        
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update chapter' });
        throw error;
      }
    },

    updateSceneContent: async (sceneId: string, updates: Partial<Scene>) => {
      try {
        await invoke('update_scene', { sceneId, updates });
        
        // Update scene in chapter
        set(produce((state: SingleManuscriptState) => {
          for (const chapter of state.chapters.values()) {
            const sceneIndex = chapter.scenes.findIndex(s => s.id === sceneId);
            if (sceneIndex >= 0) {
              Object.assign(chapter.scenes[sceneIndex], updates, { 
                updatedAt: Date.now(),
                lastModifiedInVersion: state.currentVersion.id
              });
              break;
            }
          }
        }));
        
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update scene' });
        throw error;
      }
    },

    // Export Operations
    exportVersion: async (versionId: string, format: 'docx' | 'pdf' | 'markdown') => {
      const version = get().versions.get(versionId);
      if (!version) {
        throw new Error(`Version ${versionId} not found`);
      }

      try {
        const filePath = await invoke<string>('export_version', {
          versionId,
          format,
          chapterOrder: version.chapterOrder
        });
        
        // Could open file or show success message
        console.log(`Exported ${version.name} as ${format} to ${filePath}`);
        
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to export version' });
        throw error;
      }
    }
  }
}));

// Convenience hooks for specific store slices
export const useCurrentVersion = () => useSingleManuscriptStore(state => state.currentVersion);
export const useChapters = () => useSingleManuscriptStore(state => state.chapters);
export const useVersions = () => useSingleManuscriptStore(state => state.versions);
export const useConsistencyIssues = () => useSingleManuscriptStore(state => state.consistencyIssues);
export const useReorderMode = () => useSingleManuscriptStore(state => state.isReorderMode);

// Action hooks
export const useVersionActions = () => useSingleManuscriptStore(state => ({
  createVersion: state.actions.createVersion,
  switchVersion: state.actions.switchVersion,
  deleteVersion: state.actions.deleteVersion
}));

export const useReorderActions = () => useSingleManuscriptStore(state => ({
  reorderChapters: state.actions.reorderChapters,
  previewReorder: state.actions.previewReorder,
  commitReorder: state.actions.commitReorder,
  resetReorder: state.actions.resetReorder
}));

export const useAnalysisActions = () => useSingleManuscriptStore(state => ({
  analyzeConsistency: state.actions.analyzeConsistency,
  analyzePacing: state.actions.analyzePacing,
  generateTransitionSuggestions: state.actions.generateTransitionSuggestions
}));