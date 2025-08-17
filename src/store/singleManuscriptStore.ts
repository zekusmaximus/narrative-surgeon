import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { StateCreator } from 'zustand'
import type {
  TechnoThrillerManuscript,
  ManuscriptVersion,
  Chapter,
  ConsistencyReport,
  VersionComparison
} from '@/types/single-manuscript'
import { manuscriptToSerializable, manuscriptFromSerializable } from '@/types/single-manuscript'
import { ConsistencyEngine } from '@/lib/consistency-engine'
import { ExportEngine } from '@/lib/export-engine'
import { performanceMonitor } from '@/lib/performance-monitor'

interface SingleManuscriptState {
  // Core manuscript data
  manuscript: TechnoThrillerManuscript | null
  isLoading: boolean
  error: string | null
  
  // Version control
  currentVersion: ManuscriptVersion | null
  availableVersions: ManuscriptVersion[]
  isComparingVersions: boolean
  comparisonResult: VersionComparison | null
  
  // Editor state
  activeChapterId: string | null
  editorMode: 'edit' | 'reorder' | 'compare'
  unsavedChanges: boolean
  
  // Consistency tracking
  consistencyReport: ConsistencyReport | null
  consistencyCheckEnabled: boolean
  
  // Actions
  actions: {
    // Initialization - simplified for single manuscript
    initialize: () => Promise<void>
    
    // Content editing
    updateChapterContent: (chapterId: string, content: string) => void
    updateChapterMetadata: (chapterId: string, metadata: Partial<Chapter['metadata']>) => void
    
    // Version control
    createVersion: (name: string, description: string) => Promise<string>
    switchVersion: (versionId: string) => Promise<void>
    compareVersions: (baseVersionId: string, compareVersionId: string) => Promise<void>
    
    // Chapter reordering
    reorderChapters: (newOrder: string[]) => void
    previewReordering: (newOrder: string[]) => Promise<{ checks: any[] }>
    applyReordering: () => Promise<void>
    cancelReordering: () => void
    
    // Consistency checking
    runConsistencyCheck: () => Promise<void>
    
    // Editor state
    setActiveChapter: (chapterId: string) => void
    setEditorMode: (mode: 'edit' | 'reorder' | 'compare') => void
    markSaved: () => void
    
    // Persistence
    saveManuscript: () => Promise<void>
    exportVersion: (versionId: string, format: 'docx' | 'pdf' | 'txt' | 'markdown') => Promise<void>
  }
}

const storeConfig: StateCreator<
  SingleManuscriptState,
  [],
  [],
  SingleManuscriptState
> = (set, get) => ({
        // Initial state
        manuscript: null,
        isLoading: false,
        error: null,
        currentVersion: null,
        availableVersions: [],
        isComparingVersions: false,
        comparisonResult: null,
        activeChapterId: null,
        editorMode: 'edit',
        unsavedChanges: false,
        consistencyReport: null,
        consistencyCheckEnabled: true,
        
        actions: {
          initialize: async () => {
            set({ isLoading: true, error: null })
            
            try {
              // Check if we're in a Tauri environment
              if (typeof window === 'undefined' || !window.__TAURI__) {
                // In SSR or non-Tauri environment, create a default manuscript
                const defaultManuscript: TechnoThrillerManuscript = {
                  id: 'default',
                  metadata: {
                    title: 'New Manuscript',
                    author: 'Author Name',
                    genre: 'techno-thriller',
                    wordCount: 0,
                    characterCount: 0,
                    chapterCount: 0,
                    lastModified: new Date(),
                    created: new Date(),
                    version: '1.0.0'
                  },
                  content: {
                    chapters: [],
                    characters: [],
                    locations: [],
                    techConcepts: [],
                    timeline: [],
                    notes: []
                  },
                  versions: new Map(),
                  currentVersionId: 'original',
                  settings: {
                    autoSave: true,
                    autoSaveInterval: 30,
                    showWordCount: true,
                    showCharacterCount: true,
                    enableConsistencyChecking: true,
                    highlightInconsistencies: true,
                    defaultView: 'editor'
                  }
                }
                
                const originalVersion: ManuscriptVersion = {
                  id: 'original',
                  name: 'Original',
                  description: 'Original chapter order',
                  chapterOrder: [],
                  created: new Date(),
                  isBaseVersion: true,
                  changes: []
                }
                
                defaultManuscript.versions.set('original', originalVersion)
                
                set({
                  manuscript: defaultManuscript,
                  currentVersion: originalVersion,
                  availableVersions: [originalVersion],
                  activeChapterId: null,
                  isLoading: false,
                  error: null
                })
                return
              }
              
              // Import Tauri invoke function
              const { invoke } = await import('@tauri-apps/api/tauri')
              
              // Load the hardcoded manuscript from database
              const manuscript = await invoke('get_manuscript') as any
              const scenes = await invoke('get_all_scenes') as any[]
              
              if (!manuscript) {
                throw new Error('No manuscript found in database')
              }
              
              // Convert database format to store format
              const chapters = (scenes || []).map((scene, index) => ({
                id: scene.id,
                number: scene.chapter_number || index + 1,
                title: scene.title || `Chapter ${scene.chapter_number || index + 1}`,
                content: scene.raw_text,
                wordCount: scene.word_count,
                originalPosition: scene.index_in_manuscript,
                currentPosition: scene.index_in_manuscript + 1,
                dependencies: {
                  requiredKnowledge: [],
                  introduces: [],
                  references: [],
                  continuityRules: []
                },
                metadata: {
                  pov: scene.pov_character || 'Unknown',
                  location: scene.location ? [scene.location] : [],
                  timeframe: scene.time_marker || '',
                  tensionLevel: 5,
                  majorEvents: [],
                  techElements: [],
                  characterArcs: []
                }
              }))
              
              const technoManuscript: TechnoThrillerManuscript = {
                id: manuscript.id,
                metadata: {
                  title: manuscript.title,
                  author: manuscript.author || 'Unknown Author',
                  genre: manuscript.genre,
                  wordCount: manuscript.total_word_count,
                  characterCount: 0,
                  chapterCount: chapters.length,
                  lastModified: new Date(manuscript.updated_at),
                  created: new Date(manuscript.created_at),
                  version: '1.0.0'
                },
                content: {
                  chapters,
                  characters: [], // TODO: Load from database
                  locations: [],
                  techConcepts: [],
                  timeline: [],
                  notes: []
                },
                versions: new Map(),
                currentVersionId: 'original',
                settings: {
                  autoSave: true,
                  autoSaveInterval: 30,
                  showWordCount: true,
                  showCharacterCount: true,
                  enableConsistencyChecking: true,
                  highlightInconsistencies: true,
                  defaultView: 'editor'
                }
              }
              
              const originalVersion: ManuscriptVersion = {
                id: 'original',
                name: 'Original',
                description: 'Original chapter order',
                chapterOrder: chapters.map(c => c.id),
                created: new Date(),
                isBaseVersion: true,
                changes: []
              }
              
              technoManuscript.versions.set('original', originalVersion)
              
              set({
                manuscript: technoManuscript,
                currentVersion: originalVersion,
                availableVersions: [originalVersion],
                activeChapterId: chapters[0]?.id || null,
                isLoading: false,
                error: null
              })
              
            } catch (error) {
              console.error('Failed to initialize manuscript:', error)
              set({
                error: error instanceof Error ? error.message : 'Failed to initialize manuscript',
                isLoading: false
              })
            }
          },
          
          updateChapterContent: (chapterId: string, content: string) => {
            const state = get()
            if (!state.manuscript) return
            
            const chapter = state.manuscript.content.chapters.find(c => c.id === chapterId)
            if (chapter) {
              chapter.content = content
              chapter.wordCount = content.split(/\s+/).filter(word => word.length > 0).length
              
              // Update manuscript totals
              const wordCount = state.manuscript.content.chapters.reduce((sum, ch) => sum + ch.wordCount, 0)
              const characterCount = state.manuscript.content.chapters.reduce((sum, ch) => sum + ch.content.length, 0)
              
              set({
                manuscript: {
                  ...state.manuscript,
                  metadata: {
                    ...state.manuscript.metadata,
                    wordCount,
                    characterCount,
                    lastModified: new Date()
                  }
                },
                unsavedChanges: true
              })
            }
          },
          
          updateChapterMetadata: (chapterId: string, metadata: Partial<Chapter['metadata']>) => {
            const state = get()
            if (!state.manuscript) return
            
            const chapter = state.manuscript.content.chapters.find(c => c.id === chapterId)
            if (chapter) {
              Object.assign(chapter.metadata, metadata)
              
              set({
                manuscript: {
                  ...state.manuscript,
                  metadata: {
                    ...state.manuscript.metadata,
                    lastModified: new Date()
                  }
                },
                unsavedChanges: true
              })
            }
          },
          
          createVersion: async (name: string, description: string) => {
            const state = get()
            if (!state.manuscript || !state.currentVersion) {
              throw new Error('No manuscript loaded')
            }
            
            const newVersionId = `version_${Date.now()}`
            const newVersion: ManuscriptVersion = {
              id: newVersionId,
              name,
              description,
              chapterOrder: [...state.currentVersion.chapterOrder],
              created: new Date(),
              isBaseVersion: false,
              parentVersionId: state.currentVersion.id,
              changes: []
            }
            
            state.manuscript.versions.set(newVersionId, newVersion)
            
            set({
              manuscript: state.manuscript,
              availableVersions: Array.from(state.manuscript.versions.values())
            })
            
            return newVersionId
          },
          
          switchVersion: async (versionId: string) => {
            const state = get()
            if (!state.manuscript) return
            
            const version = state.manuscript.versions.get(versionId)
            if (!version) {
              throw new Error(`Version ${versionId} not found`)
            }
            
            // Reorder chapters according to version's chapterOrder
            const reorderedChapters = version.chapterOrder
              .map(id => state.manuscript!.content.chapters.find(c => c.id === id))
              .filter(Boolean) as Chapter[]
            
            // Update positions
            reorderedChapters.forEach((chapter, index) => {
              chapter.currentPosition = index + 1
            })
            
            set({
              manuscript: {
                ...state.manuscript,
                currentVersionId: versionId,
                content: {
                  ...state.manuscript.content,
                  chapters: reorderedChapters
                }
              },
              currentVersion: version
            })
          },
          
          compareVersions: async (baseVersionId: string, compareVersionId: string) => {
            const state = get()
            if (!state.manuscript) return
            
            const baseVersion = state.manuscript.versions.get(baseVersionId)
            const compareVersion = state.manuscript.versions.get(compareVersionId)
            
            if (!baseVersion || !compareVersion) {
              throw new Error('One or both versions not found')
            }
            
            // Basic comparison implementation
            const comparison: VersionComparison = {
              baseVersion,
              compareVersion,
              differences: [],
              reorderingAnalysis: {
                consistencyIssues: [],
                flowImpact: 0,
                recommendedAdjustments: [],
                riskLevel: 'low'
              }
            }
            
            set({
              comparisonResult: comparison,
              isComparingVersions: true
            })
          },
          
          reorderChapters: (newOrder: string[]) => {
            const state = get()
            if (!state.manuscript || !state.currentVersion) return
            
            // Update the current version's chapter order
            state.currentVersion.chapterOrder = newOrder
            
            // Reorder the actual chapters
            const reorderedChapters = newOrder
              .map(id => state.manuscript!.content.chapters.find(c => c.id === id))
              .filter(Boolean) as Chapter[]
            
            // Update positions
            reorderedChapters.forEach((chapter, index) => {
              chapter.currentPosition = index + 1
            })
            
            set({
              manuscript: {
                ...state.manuscript,
                content: {
                  ...state.manuscript.content,
                  chapters: reorderedChapters
                }
              },
              unsavedChanges: true
            })
          },
          
          previewReordering: async (newOrder: string[]) => {
            const state = get()
            if (!state.manuscript) return { checks: [] }
            
            performanceMonitor.startTimer('reorderPreview')
            
            try {
              const engine = new ConsistencyEngine(state.manuscript)
              const checks = await engine.analyzeConsistency(newOrder)
              
              performanceMonitor.endTimer('reorderPreview')
              
              return { checks }
            } catch (error) {
              performanceMonitor.endTimer('reorderPreview')
              performanceMonitor.recordError(error as Error)
              return { checks: [] }
            }
          },
          
          applyReordering: async () => {
            // Apply reordering changes and run consistency check
            await get().actions.runConsistencyCheck()
            set({ unsavedChanges: false })
          },
          
          cancelReordering: () => {
            // Reset to original order from current version
            const state = get()
            if (state.currentVersion && state.manuscript) {
              const originalOrder = state.currentVersion.chapterOrder
              get().actions.reorderChapters(originalOrder)
            }
          },
          
          runConsistencyCheck: async () => {
            const state = get()
            if (!state.manuscript) return
            
            performanceMonitor.startTimer('consistencyCheck')
            
            try {
              const engine = new ConsistencyEngine(state.manuscript)
              const checks = await engine.analyzeConsistency()
              
              const report: ConsistencyReport = {
                timestamp: new Date(),
                checks,
                summary: {
                  total: checks.length,
                  errors: checks.filter(c => c.severity === 'error').length,
                  warnings: checks.filter(c => c.severity === 'warning').length,
                  info: checks.filter(c => c.severity === 'info').length
                }
              }
              
              set({ consistencyReport: report })
              performanceMonitor.recordConsistencyCheck()
              
            } catch (error) {
              performanceMonitor.endTimer('consistencyCheck')
              performanceMonitor.recordError(error as Error)
              set({ error: 'Consistency check failed' })
            }
          },
          
          setActiveChapter: (chapterId: string) => {
            performanceMonitor.startTimer('chapterSwitch')
            set({ activeChapterId: chapterId })
            performanceMonitor.recordChapterSwitch()
          },
          
          setEditorMode: (mode: 'edit' | 'reorder' | 'compare') => {
            performanceMonitor.recordModeSwitch(mode)
            set({ editorMode: mode })
          },
          
          markSaved: () => {
            set({ unsavedChanges: false })
          },
          
          saveManuscript: async () => {
            const state = get()
            if (!state.manuscript) return
            
            performanceMonitor.startTimer('saveOperation')
            
            try {
              const { invoke } = await import('@tauri-apps/api/tauri')
              
              // Update manuscript metadata
              await invoke('update_manuscript', {
                manuscript: {
                  id: state.manuscript.id,
                  title: state.manuscript.metadata.title,
                  author: state.manuscript.metadata.author,
                  genre: state.manuscript.metadata.genre,
                  target_audience: 'Adult', // Default value
                  comp_titles: 'Various',
                  created_at: state.manuscript.metadata.created.getTime(),
                  updated_at: Date.now(),
                  total_word_count: state.manuscript.metadata.wordCount,
                  opening_strength_score: 8,
                  hook_effectiveness: 7
                }
              })
              
              // Update scenes
              for (const chapter of state.manuscript.content.chapters) {
                await invoke('update_scene', {
                  scene: {
                    id: chapter.id,
                    chapter_number: chapter.metadata.chapterNumber,
                    scene_number_in_chapter: chapter.metadata.sceneNumber,
                    index_in_manuscript: chapter.currentPosition - 1,
                    title: chapter.title,
                    raw_text: chapter.content,
                    word_count: chapter.wordCount,
                    is_opening: chapter.metadata.isOpening,
                    is_chapter_end: chapter.metadata.isChapterEnd,
                    opens_with_hook: chapter.metadata.opensWithHook,
                    ends_with_hook: chapter.metadata.endsWithHook,
                    pov_character: chapter.metadata.pov,
                    location: chapter.metadata.location,
                    time_marker: chapter.metadata.timeMarker,
                    created_at: Date.now(),
                    updated_at: Date.now()
                  }
                })
              }
              
              set({
                unsavedChanges: false,
                manuscript: {
                  ...state.manuscript,
                  metadata: {
                    ...state.manuscript.metadata,
                    lastModified: new Date()
                  }
                }
              })
              
              performanceMonitor.recordSaveOperation()
              
            } catch (error) {
              performanceMonitor.endTimer('saveOperation')
              performanceMonitor.recordError(error as Error)
              console.error('Save failed:', error)
              throw new Error('Failed to save manuscript')
            }
          },
          
          exportVersion: async (versionId: string, format: 'docx' | 'pdf' | 'txt' | 'markdown') => {
            const state = get()
            if (!state.manuscript) return
            
            performanceMonitor.startTimer('exportOperation')
            
            try {
              const engine = new ExportEngine(state.manuscript)
              const blob = await engine.exportVersion({
                format: format as any,
                versionId,
                includeMetadata: true,
                includeOutline: true,
                includeNotes: false,
                pageBreakBetweenChapters: true
              })
              
              // Download the file
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = `${state.manuscript.metadata.title}_${versionId}.${format}`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              URL.revokeObjectURL(url)
              
              performanceMonitor.recordExportOperation()
              
            } catch (error) {
              performanceMonitor.endTimer('exportOperation')
              performanceMonitor.recordError(error as Error)
              set({ error: `Export failed: ${error}` })
            }
          }
        }
})

export const useSingleManuscriptStore = create<SingleManuscriptState>()(
  devtools(
    persist(
      storeConfig,
      {
        name: 'single-manuscript-store',
        partialize: (state) => ({
          manuscript: state.manuscript ? manuscriptToSerializable(state.manuscript) : null,
          currentVersion: state.currentVersion,
          availableVersions: state.availableVersions,
          activeChapterId: state.activeChapterId,
          editorMode: state.editorMode
        }),
        merge: (persistedState: any, currentState: SingleManuscriptState): SingleManuscriptState => {
          return {
            ...currentState,
            ...persistedState,
            manuscript: persistedState.manuscript 
              ? manuscriptFromSerializable(persistedState.manuscript)
              : null
          }
        }
      }
    ),
    { name: 'single-manuscript-store' }
  )
)

export default useSingleManuscriptStore