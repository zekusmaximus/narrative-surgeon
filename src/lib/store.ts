import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { TauriAPI } from './tauri'
import type { Manuscript, Scene, ManuscriptSummary } from '../types'
import { loadManuscriptFromStorage } from '../manuscript/loader'
import type { TechnoThrillerManuscript } from '../manuscript/manuscript-data'

interface AppState {
  // UI State
  currentView: 'dashboard' | 'editor' | 'analysis' | 'submissions' | 'settings'
  sidebarCollapsed: boolean
  loading: boolean
  error: string | null

  // Single-manuscript state
  currentManuscript: TechnoThrillerManuscript | null
  scenes: Scene[]

  // Editor State (enhanced for new system)
  activeSceneId: string | null
  activeChapterId: number | null // New: for chapter-based editing
  editorContent: string
  unsavedChanges: boolean
  editorSettings: {
    fontSize: number
    theme: 'light' | 'dark'
    focusMode: boolean
    typewriterMode: boolean
    showWordCount: boolean
    showChapterNumbers: boolean
    lineHeight: number
    fontFamily: string
  }

  // Actions
  setCurrentView: (view: AppState['currentView']) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Manuscript actions
  loadManuscript: () => Promise<void>
  initializeManuscriptMode: () => Promise<void>
  
  // Enhanced editor actions for chapters
  setActiveChapter: (chapterId: number | null) => void
  updateChapterContent: (chapterId: number, content: string) => void
  saveCurrentChapter: () => Promise<void>

  // Scene actions
  loadScenes: () => Promise<void>
  updateScene: (sceneId: string, updates: Partial<Scene>) => Promise<void>
  setActiveScene: (sceneId: string | null) => void

  // Editor Actions
  setEditorContent: (content: string) => void
  saveCurrentScene: () => Promise<void>
  updateEditorSettings: (settings: Partial<AppState['editorSettings']>) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial State
      currentView: 'dashboard',
      sidebarCollapsed: false,
      loading: false,
      error: null,

      // Manuscript state
      currentManuscript: null,
      scenes: [],

      activeSceneId: null,
      activeChapterId: null,
      editorContent: '',
      unsavedChanges: false,
      editorSettings: {
        fontSize: 16,
        theme: 'light',
        focusMode: false,
        typewriterMode: false,
        showWordCount: true,
        showChapterNumbers: true,
        lineHeight: 1.6,
        fontFamily: 'Inter',
      },

      // UI Actions
      setCurrentView: (view) => set({ currentView: view }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // Manuscript Actions

      // Scene Actions
      loadScenes: async () => {
        set({ loading: true, error: null })
        try {
          const scenes = await TauriAPI.getScenes()
          set({ scenes, loading: false })
          
          // Set first scene as active if none selected
          if (scenes.length > 0 && !get().activeSceneId) {
            set({ 
              activeSceneId: scenes[0].id,
              editorContent: scenes[0].raw_text || ''
            })
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load scenes',
            loading: false 
          })
        }
      },

      updateScene: async (sceneId, updates) => {
        try {
          await TauriAPI.updateScene(sceneId, updates)
          
          // Update local scene state
          set(state => ({
            scenes: state.scenes.map(scene =>
              scene.id === sceneId ? { ...scene, ...updates } : scene
            ),
            unsavedChanges: false
          }))
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update scene'
          })
        }
      },

      setActiveScene: (sceneId) => {
        const scene = get().scenes.find(s => s.id === sceneId)
        set({ 
          activeSceneId: sceneId,
          editorContent: scene?.raw_text || '',
          unsavedChanges: false
        })
      },

      // Editor Actions
      setEditorContent: (content) => {
        const currentContent = get().scenes.find(s => s.id === get().activeSceneId)?.raw_text || ''
        set({ 
          editorContent: content,
          unsavedChanges: content !== currentContent
        })
      },

      saveCurrentScene: async () => {
        const { activeSceneId, editorContent } = get()
        if (!activeSceneId) return

        await get().updateScene(activeSceneId, { raw_text: editorContent })
      },

      updateEditorSettings: (settings) => {
        set(state => ({
          editorSettings: { ...state.editorSettings, ...settings }
        }))
      },

      // New manuscript actions implementation
      loadManuscript: async () => {
        set({ loading: true, error: null })
        try {
          const manuscript = await loadManuscriptFromStorage()
          set({ 
            currentManuscript: manuscript,
            isManuscriptMode: true,
            loading: false 
          })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load manuscript',
            loading: false 
          })
        }
      },

      initializeManuscriptMode: async () => {
        set({ loading: true, error: null })
        try {
          const manuscript = await loadManuscriptFromStorage()
          set({ 
            currentManuscript: manuscript,
            isManuscriptMode: true,
            loading: false 
          })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to initialize manuscript mode',
            loading: false 
          })
        }
      },

      switchToLegacyMode: () => {
        set({ 
          currentManuscript: null,
          isManuscriptMode: false,
          activeChapterId: null
        })
      },

      // Enhanced editor actions for chapters
      setActiveChapter: (chapterId) => {
        const { currentManuscript } = get()
        if (currentManuscript && chapterId !== null) {
          const chapter = currentManuscript.content.chapters.find(c => c.currentPosition === chapterId)
          set({ 
            activeChapterId: chapterId,
            editorContent: chapter?.content || '',
            unsavedChanges: false
          })
        } else {
          set({ 
            activeChapterId: null,
            editorContent: '',
            unsavedChanges: false
          })
        }
      },

      updateChapterContent: (chapterId, content) => {
        const { currentManuscript } = get()
        if (currentManuscript) {
          const updatedManuscript = { ...currentManuscript }
          const chapterIndex = updatedManuscript.content.chapters.findIndex(c => c.currentPosition === chapterId)
          if (chapterIndex !== -1) {
            updatedManuscript.content.chapters[chapterIndex] = {
              ...updatedManuscript.content.chapters[chapterIndex],
              content
            }
            set({ 
              currentManuscript: updatedManuscript,
              editorContent: content,
              unsavedChanges: true
            })
          }
        }
      },

      saveCurrentChapter: async () => {
        const { activeChapterId, editorContent, currentManuscript } = get()
        if (!activeChapterId || !currentManuscript) return

        try {
          // Update the chapter content in the manuscript
          get().updateChapterContent(activeChapterId, editorContent)
          
          // Here you would typically save to backend
          // await TauriAPI.updateManuscript(currentManuscript)
          
          set({ unsavedChanges: false })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to save chapter'
          })
        }
      },
    })) as any,
    { name: 'narrative-surgeon-store' }
  ) as any
)

// Persist editor settings to localStorage
if (typeof window !== 'undefined') {
  useAppStore.subscribe(
    (state) => state.editorSettings,
    (settings) => {
      localStorage.setItem('narrative-surgeon-editor-settings', JSON.stringify(settings))
    }
  )

  // Load editor settings from localStorage on startup
  const savedSettings = localStorage.getItem('narrative-surgeon-editor-settings')
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings)
      useAppStore.getState().updateEditorSettings(settings)
    } catch (error) {
      console.warn('Failed to load editor settings:', error)
    }
  }
}