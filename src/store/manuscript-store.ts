/**
 * Simplified Zustand store for single-manuscript state management
 * Focused on Digital Shadows techno-thriller chapter reordering
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { 
  TechnoThrillerManuscript, 
  Chapter, 
  ReorderingAnalysis, 
  ReadingProgress,
  Bookmark,
  Note,
  ChapterFilterCriteria,
  ChapterSortKey,
  ManuscriptValidationResult
} from '../manuscript/manuscript-data'
import { ManuscriptVersionControl, ManuscriptVersion, VersionDiff, Branch } from '../manuscript/version-control'

export interface EditorState {
  // Current editing context
  currentChapterId: number | null
  cursorPosition: number
  selectedText: string
  
  // View settings
  viewMode: 'editor' | 'outline' | 'timeline' | 'analysis'
  showWordCount: boolean
  showChapterNumbers: boolean
  focusMode: boolean
  typewriterMode: boolean
  
  // Editor preferences
  fontSize: number
  fontFamily: string
  lineHeight: number
  
  // Panel visibility
  showLeftPanel: boolean
  showRightPanel: boolean
  leftPanelWidth: number
  rightPanelWidth: number
}

export interface ReorderingState {
  // Current reordering operation
  isDragging: boolean
  draggedChapterId: number | null
  dropTargetPosition: number | null
  
  // Reordering analysis
  currentAnalysis: ReorderingAnalysis | null
  analysisLoading: boolean
  
  // Temporary chapter order (during drag)
  temporaryOrder: number[] | null
  
  // Undo/redo for reordering
  canUndoReorder: boolean
  canRedoReorder: boolean
}

export interface UIState {
  // Loading states
  isLoading: boolean
  loadingMessage: string
  
  // Notifications
  notifications: Notification[]
  
  // Dialogs and modals
  activeDialog: string | null
  dialogData: any
  
  // Search and filters
  searchQuery: string
  activeFilters: ChapterFilterCriteria
  sortBy: ChapterSortKey
  sortDirection: 'asc' | 'desc'
  
  // Selection
  selectedChapterIds: number[]
  lastSelectedChapterId: number | null
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  autoHide: boolean
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: () => void
  style?: 'primary' | 'secondary' | 'danger'
}

export interface ManuscriptStoreState {
  // Core manuscript data
  manuscript: TechnoThrillerManuscript | null
  isManuscriptLoaded: boolean
  
  // Version control
  versionControl: ManuscriptVersionControl
  currentVersion: ManuscriptVersion | null
  availableBranches: Branch[]
  
  // Reading progress
  readingProgress: ReadingProgress
  
  // Editor state
  editorState: EditorState
  
  // Reordering state
  reorderingState: ReorderingState
  
  // UI state
  uiState: UIState
  
  // Validation cache
  lastValidationResult: ManuscriptValidationResult | null
  validationTimestamp: Date | null
}

export interface ManuscriptStoreActions {
  // Manuscript loading
  loadManuscript: (manuscript: TechnoThrillerManuscript) => void
  unloadManuscript: () => void
  saveManuscript: () => Promise<void>
  
  // Chapter operations
  updateChapter: (chapterId: number, updates: Partial<Chapter>) => void
  updateChapterContent: (chapterId: number, content: string) => void
  updateChapterPosition: (chapterId: number, newPosition: number) => void
  
  // Bulk chapter operations
  reorderChapters: (newOrder: number[]) => Promise<void>
  resetChapterOrder: () => void
  analyzeReordering: (proposedOrder: number[]) => Promise<ReorderingAnalysis>
  
  // Version control
  createVersion: (name: string, description: string) => ManuscriptVersion
  switchToVersion: (versionId: string) => void
  rollbackToVersion: (versionId: string) => void
  createBranch: (name: string, description: string) => Branch
  switchToBranch: (branchId: string) => void
  getVersionDiff: (fromVersionId: string, toVersionId: string) => VersionDiff | null
  
  // Editor state
  setCurrentChapter: (chapterId: number | null) => void
  setCursorPosition: (position: number) => void
  setSelectedText: (text: string) => void
  setViewMode: (mode: EditorState['viewMode']) => void
  updateEditorSettings: (settings: Partial<EditorState>) => void
  
  // Reading progress
  updateReadingProgress: (updates: Partial<ReadingProgress>) => void
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'created'>) => void
  removeBookmark: (bookmarkId: string) => void
  addNote: (note: Omit<Note, 'id' | 'created'>) => void
  updateNote: (noteId: string, updates: Partial<Note>) => void
  removeNote: (noteId: string) => void
  
  // Reordering operations
  startChapterDrag: (chapterId: number) => void
  updateDragTarget: (position: number) => void
  confirmChapterReorder: () => Promise<void>
  cancelChapterReorder: () => void
  undoLastReorder: () => void
  redoLastReorder: () => void
  
  // Search and filtering
  setSearchQuery: (query: string) => void
  updateFilters: (filters: Partial<ChapterFilterCriteria>) => void
  clearFilters: () => void
  setSorting: (sortBy: ChapterSortKey, direction: 'asc' | 'desc') => void
  
  // Selection
  selectChapter: (chapterId: number, multiSelect?: boolean) => void
  selectAllChapters: () => void
  clearSelection: () => void
  
  // UI operations
  showNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  hideNotification: (notificationId: string) => void
  openDialog: (dialogName: string, data?: any) => void
  closeDialog: () => void
  setLoading: (loading: boolean, message?: string) => void
  
  // Validation
  validateManuscript: () => Promise<ManuscriptValidationResult>
  
  // Utility
  getFilteredChapters: () => Chapter[]
  getChapterById: (chapterId: number) => Chapter | undefined
  exportManuscript: (options: any) => Promise<Blob>
  resetStore: () => void
}

type ManuscriptStore = ManuscriptStoreState & ManuscriptStoreActions

// Default state
const defaultEditorState: EditorState = {
  currentChapterId: null,
  cursorPosition: 0,
  selectedText: '',
  viewMode: 'editor',
  showWordCount: true,
  showChapterNumbers: true,
  focusMode: false,
  typewriterMode: false,
  fontSize: 16,
  fontFamily: 'Inter',
  lineHeight: 1.6,
  showLeftPanel: true,
  showRightPanel: true,
  leftPanelWidth: 300,
  rightPanelWidth: 300
}

const defaultReorderingState: ReorderingState = {
  isDragging: false,
  draggedChapterId: null,
  dropTargetPosition: null,
  currentAnalysis: null,
  analysisLoading: false,
  temporaryOrder: null,
  canUndoReorder: false,
  canRedoReorder: false
}

const defaultUIState: UIState = {
  isLoading: false,
  loadingMessage: '',
  notifications: [],
  activeDialog: null,
  dialogData: null,
  searchQuery: '',
  activeFilters: {},
  sortBy: 'currentPosition',
  sortDirection: 'asc',
  selectedChapterIds: [],
  lastSelectedChapterId: null
}

const defaultReadingProgress: ReadingProgress = {
  currentChapter: 1,
  currentPosition: 0,
  readingTime: 0,
  chaptersCompleted: [],
  bookmarks: [],
  notes: []
}

// Create the store
export const useManuscriptStore = create<ManuscriptStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      manuscript: null,
      isManuscriptLoaded: false,
      versionControl: new ManuscriptVersionControl(),
      currentVersion: null,
      availableBranches: [],
      readingProgress: defaultReadingProgress,
      editorState: defaultEditorState,
      reorderingState: defaultReorderingState,
      uiState: defaultUIState,
      lastValidationResult: null,
      validationTimestamp: null,

      // Manuscript loading
      loadManuscript: (manuscript) =>
        set((state) => {
          state.manuscript = manuscript
          state.isManuscriptLoaded = true
          
          // Create initial version
          const initialVersion = state.versionControl.createVersion(
            manuscript,
            'Initial Load',
            'Manuscript loaded into editor',
            'Initial manuscript state'
          )
          state.currentVersion = initialVersion
          
          // Set first chapter as current
          if (manuscript.chapters.length > 0) {
            const firstChapter = manuscript.chapters.find(c => c.currentPosition === 1)
            state.editorState.currentChapterId = firstChapter?.id || manuscript.chapters[0].id
          }
          
          // Clear loading state
          state.uiState.isLoading = false
        }),

      unloadManuscript: () =>
        set((state) => {
          state.manuscript = null
          state.isManuscriptLoaded = false
          state.currentVersion = null
          state.editorState.currentChapterId = null
          state.readingProgress = defaultReadingProgress
          state.lastValidationResult = null
          state.validationTimestamp = null
        }),

      saveManuscript: async () => {
        const state = get()
        if (!state.manuscript) return
        
        set((draft) => {
          draft.uiState.isLoading = true
          draft.uiState.loadingMessage = 'Saving manuscript...'
        })

        try {
          // Save to localStorage (could be enhanced to save to file system)
          localStorage.setItem(
            'digital-shadows-manuscript',
            JSON.stringify(state.manuscript)
          )
          
          // Create save version
          const version = state.versionControl.createVersion(
            state.manuscript,
            `Save ${new Date().toLocaleTimeString()}`,
            'Manual save operation',
            'User-initiated save'
          )

          set((draft) => {
            draft.currentVersion = version
            draft.uiState.isLoading = false
            draft.uiState.loadingMessage = ''
          })

          get().showNotification({
            type: 'success',
            title: 'Manuscript Saved',
            message: 'Your changes have been saved successfully',
            autoHide: true
          })
        } catch (error) {
          set((draft) => {
            draft.uiState.isLoading = false
            draft.uiState.loadingMessage = ''
          })

          get().showNotification({
            type: 'error',
            title: 'Save Failed',
            message: 'Failed to save manuscript. Please try again.',
            autoHide: true
          })
        }
      },

      // Chapter operations
      updateChapter: (chapterId, updates) =>
        set((state) => {
          if (!state.manuscript) return
          
          const chapter = state.manuscript.chapters.find(c => c.id === chapterId)
          if (chapter) {
            Object.assign(chapter, updates, {
              editorState: {
                ...chapter.editorState,
                lastModified: new Date()
              }
            })
            
            // Update manuscript metadata
            state.manuscript.metadata.lastModified = new Date()
            
            // Invalidate validation cache
            state.lastValidationResult = null
            state.validationTimestamp = null
          }
        }),

      updateChapterContent: (chapterId, content) =>
        set((state) => {
          if (!state.manuscript) return
          
          const chapter = state.manuscript.chapters.find(c => c.id === chapterId)
          if (chapter) {
            chapter.content = content
            chapter.wordCount = content.split(/\s+/).filter(word => word.length > 0).length
            
            if (chapter.editorState) {
              chapter.editorState.lastModified = new Date()
            }
            
            // Update total word count
            state.manuscript.metadata.wordCount = state.manuscript.chapters
              .reduce((sum, ch) => sum + ch.wordCount, 0)
            state.manuscript.metadata.lastModified = new Date()
          }
        }),

      updateChapterPosition: (chapterId, newPosition) =>
        set((state) => {
          if (!state.manuscript) return
          
          const chapter = state.manuscript.chapters.find(c => c.id === chapterId)
          if (chapter) {
            const oldPosition = chapter.currentPosition
            chapter.currentPosition = newPosition
            
            // Adjust positions of other chapters
            state.manuscript.chapters.forEach(ch => {
              if (ch.id === chapterId) return
              
              if (newPosition > oldPosition) {
                // Moving chapter later - shift earlier chapters up
                if (ch.currentPosition > oldPosition && ch.currentPosition <= newPosition) {
                  ch.currentPosition--
                }
              } else {
                // Moving chapter earlier - shift later chapters down
                if (ch.currentPosition >= newPosition && ch.currentPosition < oldPosition) {
                  ch.currentPosition++
                }
              }
            })
          }
        }),

      // Reordering operations
      reorderChapters: async (newOrder) => {
        const state = get()
        if (!state.manuscript) return

        set((draft) => {
          draft.reorderingState.analysisLoading = true
        })

        // Analyze the reordering
        const analysis = await get().analyzeReordering(newOrder)

        set((draft) => {
          if (!draft.manuscript) return
          
          // Apply the new order
          newOrder.forEach((chapterId, index) => {
            const chapter = draft.manuscript!.chapters.find(c => c.id === chapterId)
            if (chapter) {
              chapter.currentPosition = index + 1
            }
          })
          
          // Update reordering state
          draft.reorderingState.currentAnalysis = analysis
          draft.reorderingState.analysisLoading = false
          draft.reorderingState.canUndoReorder = true
          draft.reorderingState.temporaryOrder = null
          
          // Create version for this reorder
          const version = draft.versionControl.createVersion(
            draft.manuscript!,
            `Reorder ${new Date().toLocaleTimeString()}`,
            'Chapter reordering operation',
            `Moved ${analysis.errors.length > 0 ? 'with issues' : 'successfully'}`
          )
          draft.currentVersion = version
        })

        // Show notification based on analysis
        if (analysis.errors.length > 0) {
          get().showNotification({
            type: 'warning',
            title: 'Reordering Complete with Issues',
            message: `Found ${analysis.errors.length} potential problems`,
            autoHide: false
          })
        } else {
          get().showNotification({
            type: 'success',
            title: 'Chapters Reordered',
            message: 'Chapter order updated successfully',
            autoHide: true
          })
        }
      },

      analyzeReordering: async (proposedOrder) => {
        // Placeholder implementation - would perform actual analysis
        const analysis: ReorderingAnalysis = {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          impactScore: 0,
          readabilityScore: 85,
          tensionCurve: proposedOrder.map(() => Math.random() * 10),
          brokenDependencies: [],
          newOpportunities: []
        }
        
        // Simulate analysis delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        return analysis
      },

      // Version control operations
      createVersion: (name, description) => {
        const state = get()
        if (!state.manuscript) throw new Error('No manuscript loaded')
        
        const version = state.versionControl.createVersion(
          state.manuscript,
          name,
          description,
          'User-created version'
        )
        
        set((draft) => {
          draft.currentVersion = version
        })
        
        return version
      },

      switchToVersion: (versionId) => {
        const state = get()
        const version = state.versionControl.getCurrentVersion()
        if (!version) return
        
        set((draft) => {
          draft.manuscript = version.manuscript
          draft.currentVersion = version
        })
      },

      getVersionDiff: (fromVersionId, toVersionId) => {
        return get().versionControl.getVersionDiff(fromVersionId, toVersionId)
      },

      // UI operations
      showNotification: (notification) =>
        set((state) => {
          const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const fullNotification: Notification = {
            ...notification,
            id,
            timestamp: new Date()
          }
          
          state.uiState.notifications.push(fullNotification)
          
          // Auto-hide if specified
          if (notification.autoHide) {
            setTimeout(() => {
              get().hideNotification(id)
            }, 5000)
          }
        }),

      hideNotification: (notificationId) =>
        set((state) => {
          state.uiState.notifications = state.uiState.notifications.filter(
            n => n.id !== notificationId
          )
        }),

      setLoading: (loading, message = '') =>
        set((state) => {
          state.uiState.isLoading = loading
          state.uiState.loadingMessage = message
        }),

      // Utility functions
      getFilteredChapters: () => {
        const state = get()
        if (!state.manuscript) return []
        
        let chapters = [...state.manuscript.chapters]
        
        // Apply filters
        const filters = state.uiState.activeFilters
        if (filters.povCharacter) {
          chapters = chapters.filter(ch => ch.metadata.pov === filters.povCharacter)
        }
        if (filters.location) {
          chapters = chapters.filter(ch => ch.metadata.location === filters.location)
        }
        if (filters.plotRole) {
          chapters = chapters.filter(ch => ch.metadata.plotRole === filters.plotRole)
        }
        
        // Apply search
        if (state.uiState.searchQuery) {
          const query = state.uiState.searchQuery.toLowerCase()
          chapters = chapters.filter(ch => 
            ch.title.toLowerCase().includes(query) ||
            ch.content.toLowerCase().includes(query)
          )
        }
        
        // Apply sorting
        chapters.sort((a, b) => {
          const sortBy = state.uiState.sortBy
          const direction = state.uiState.sortDirection === 'asc' ? 1 : -1
          
          let aVal: any, bVal: any
          
          switch (sortBy) {
            case 'title':
              aVal = a.title
              bVal = b.title
              break
            case 'wordCount':
              aVal = a.wordCount
              bVal = b.wordCount
              break
            case 'tensionLevel':
              aVal = a.metadata.tensionLevel
              bVal = b.metadata.tensionLevel
              break
            default:
              aVal = a[sortBy]
              bVal = b[sortBy]
          }
          
          if (typeof aVal === 'string') {
            return aVal.localeCompare(bVal) * direction
          } else {
            return (aVal - bVal) * direction
          }
        })
        
        return chapters
      },

      getChapterById: (chapterId) => {
        const state = get()
        return state.manuscript?.chapters.find(c => c.id === chapterId)
      },

      // Placeholder implementations for remaining actions
      resetChapterOrder: () => set((state) => { /* implementation */ }),
      startChapterDrag: (chapterId) => set((state) => { /* implementation */ }),
      updateDragTarget: (position) => set((state) => { /* implementation */ }),
      confirmChapterReorder: async () => { /* implementation */ },
      cancelChapterReorder: () => set((state) => { /* implementation */ }),
      undoLastReorder: () => set((state) => { /* implementation */ }),
      redoLastReorder: () => set((state) => { /* implementation */ }),
      rollbackToVersion: (versionId) => { /* implementation */ },
      createBranch: (name, description) => { return {} as Branch },
      switchToBranch: (branchId) => { /* implementation */ },
      setCurrentChapter: (chapterId) => set((state) => { state.editorState.currentChapterId = chapterId }),
      setCursorPosition: (position) => set((state) => { state.editorState.cursorPosition = position }),
      setSelectedText: (text) => set((state) => { state.editorState.selectedText = text }),
      setViewMode: (mode) => set((state) => { state.editorState.viewMode = mode }),
      updateEditorSettings: (settings) => set((state) => { Object.assign(state.editorState, settings) }),
      updateReadingProgress: (updates) => set((state) => { Object.assign(state.readingProgress, updates) }),
      addBookmark: (bookmark) => set((state) => { /* implementation */ }),
      removeBookmark: (bookmarkId) => set((state) => { /* implementation */ }),
      addNote: (note) => set((state) => { /* implementation */ }),
      updateNote: (noteId, updates) => set((state) => { /* implementation */ }),
      removeNote: (noteId) => set((state) => { /* implementation */ }),
      setSearchQuery: (query) => set((state) => { state.uiState.searchQuery = query }),
      updateFilters: (filters) => set((state) => { Object.assign(state.uiState.activeFilters, filters) }),
      clearFilters: () => set((state) => { state.uiState.activeFilters = {} }),
      setSorting: (sortBy, direction) => set((state) => { state.uiState.sortBy = sortBy; state.uiState.sortDirection = direction }),
      selectChapter: (chapterId, multiSelect) => set((state) => { /* implementation */ }),
      selectAllChapters: () => set((state) => { /* implementation */ }),
      clearSelection: () => set((state) => { state.uiState.selectedChapterIds = [] }),
      openDialog: (dialogName, data) => set((state) => { state.uiState.activeDialog = dialogName; state.uiState.dialogData = data }),
      closeDialog: () => set((state) => { state.uiState.activeDialog = null; state.uiState.dialogData = null }),
      validateManuscript: async () => { return {} as ManuscriptValidationResult },
      exportManuscript: async (options) => { return new Blob() },
      resetStore: () => set(() => ({
        manuscript: null,
        isManuscriptLoaded: false,
        versionControl: new ManuscriptVersionControl(),
        currentVersion: null,
        availableBranches: [],
        readingProgress: defaultReadingProgress,
        editorState: defaultEditorState,
        reorderingState: defaultReorderingState,
        uiState: defaultUIState,
        lastValidationResult: null,
        validationTimestamp: null
      }))
    })),
    {
      name: 'manuscript-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential data
        editorState: state.editorState,
        readingProgress: state.readingProgress,
        uiState: {
          ...state.uiState,
          notifications: [], // Don't persist notifications
          isLoading: false // Reset loading state
        }
      })
    }
  )
)