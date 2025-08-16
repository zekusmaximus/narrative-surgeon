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
    // Initialization
    initialize: () => Promise<void>
    loadManuscript: (manuscriptId: string) => Promise<void>
    setManuscript: (manuscript: TechnoThrillerManuscript) => void
    
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
              // Load default manuscript
              await get().actions.loadManuscript('default')
            } catch (error) {
              set({ 
                error: error instanceof Error ? error.message : 'Failed to initialize',
                isLoading: false 
              })
            }
          },
          
          loadManuscript: async (manuscriptId: string) => {
            set({ isLoading: true })
            
            try {
              // Create default manuscript structure
              const defaultManuscript: TechnoThrillerManuscript = {
                id: manuscriptId,
                metadata: {
                  title: 'Untitled Techno-Thriller',
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
                isLoading: false,
                error: null
              })
              
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to load manuscript',
                isLoading: false
              })
            }
          },
          
          setManuscript: (manuscript: TechnoThrillerManuscript) => {
            set({
              manuscript,
              currentVersion: manuscript.versions.get(manuscript.currentVersionId) || null,
              availableVersions: Array.from(manuscript.versions.values()),
              isLoading: false,
              error: null
            })
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
              // TODO: Implement Tauri save command
              console.log('Saving manuscript...')
              
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