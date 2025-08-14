'use client'

import React, { useRef, useEffect, useState } from 'react'
import { TiptapEditor, EditorRef } from './TiptapEditor'
import { MainLayout } from '../layout/MainLayout'
import { useAppStore } from '@/lib/store'
import { useGlobalShortcuts } from '@/lib/shortcuts'
import { ErrorBoundary } from '../ErrorBoundary'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Bold,
  Italic,
  Underline,
  Copy,
  Scissors,
  ClipboardPaste,
  MessageSquare,
  Zap,
  Search,
  BookOpen,
  Bookmark
} from 'lucide-react'

interface ProfessionalEditorProps {
  manuscriptId: string
  sceneId?: string
}

export function ProfessionalEditor({ manuscriptId }: ProfessionalEditorProps) {
  const editorRef = useRef<EditorRef>(null)
  const [selectedText, setSelectedText] = useState('')
  const [showFindReplace, setShowFindReplace] = useState(false)

  const {
    activeSceneId,
    editorContent,
    setEditorContent,
    saveCurrentScene,
    editorSettings,
    loading,
  } = useAppStore()

  // Enable global keyboard shortcuts
  useGlobalShortcuts()

  // Handle custom events from global shortcuts
  useEffect(() => {
    const handleGlobalSave = () => {
      saveCurrentScene()
    }

    const handleGlobalFind = () => {
      setShowFindReplace(true)
    }

    const handleGlobalFindReplace = () => {
      setShowFindReplace(true)
    }

    const handleGlobalToggleFocusMode = () => {
      // This will be handled by the toolbar
    }

    const handleGlobalAIAnalysis = () => {
      if (selectedText) {
        console.log('Analyzing selected text:', selectedText)
        // TODO: Implement AI analysis
      }
    }

    document.addEventListener('global-save', handleGlobalSave)
    document.addEventListener('global-find', handleGlobalFind)
    document.addEventListener('global-find-replace', handleGlobalFindReplace)
    document.addEventListener('global-toggle-focus-mode', handleGlobalToggleFocusMode)
    document.addEventListener('global-ai-analysis', handleGlobalAIAnalysis)

    return () => {
      document.removeEventListener('global-save', handleGlobalSave)
      document.removeEventListener('global-find', handleGlobalFind)
      document.removeEventListener('global-find-replace', handleGlobalFindReplace)
      document.removeEventListener('global-toggle-focus-mode', handleGlobalToggleFocusMode)
      document.removeEventListener('global-ai-analysis', handleGlobalAIAnalysis)
    }
  }, [saveCurrentScene, selectedText])

  // Handle text selection for context menus
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (selection) {
        setSelectedText(selection.toString())
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  const handleContextMenuAction = (action: string) => {
    const editor = editorRef.current
    if (!editor) return

    switch (action) {
      case 'bold':
        // TODO: Toggle bold for selected text
        break
      case 'italic':
        // TODO: Toggle italic for selected text
        break
      case 'underline':
        // TODO: Toggle underline for selected text
        break
      case 'copy':
        document.execCommand('copy')
        break
      case 'cut':
        document.execCommand('cut')
        break
      case 'paste':
        document.execCommand('paste')
        break
      case 'comment':
        // TODO: Add comment to selected text
        console.log('Adding comment to:', selectedText)
        break
      case 'analyze':
        // TODO: Analyze selected text with AI
        console.log('Analyzing:', selectedText)
        break
      case 'lookup':
        // TODO: Look up selected word/phrase
        console.log('Looking up:', selectedText)
        break
      case 'bookmark':
        // TODO: Bookmark selected text/position
        console.log('Bookmarking:', selectedText)
        break
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading editor...</div>
      </div>
    )
  }

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Editor Container with Context Menu */}
        <ErrorBoundary
          onError={(error, errorInfo) => {
            console.error('Editor error:', error, errorInfo)
            // Log to store or external service
          }}
        >
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="flex-1 overflow-hidden">
                <ErrorBoundary
                  onError={(error, errorInfo) => {
                    console.error('TiptapEditor error:', error, errorInfo)
                  }}
                  fallback={
                    <div className="flex items-center justify-center min-h-[500px] text-muted-foreground">
                      <div className="text-center space-y-2">
                        <p>Editor failed to load</p>
                        <button 
                          onClick={() => window.location.reload()}
                          className="text-sm underline hover:no-underline"
                        >
                          Reload editor
                        </button>
                      </div>
                    </div>
                  }
                >
                  <TiptapEditor
                    ref={editorRef}
                    content={editorContent}
                    onChange={setEditorContent}
                    manuscriptId={manuscriptId}
                    sceneId={activeSceneId || undefined}
                    onSave={saveCurrentScene}
                    placeholder="Begin writing your story..."
                    className={`
                      ${editorSettings.focusMode ? 'focus-mode' : ''}
                      ${editorSettings.typewriterMode ? 'typewriter-mode' : ''}
                    `}
                  />
                </ErrorBoundary>
              </div>
            </ContextMenuTrigger>
          
          <ContextMenuContent className="w-64">
            {selectedText && (
              <>
                <ContextMenuItem onClick={() => handleContextMenuAction('cut')}>
                  <Scissors className="mr-2 h-4 w-4" />
                  Cut
                  <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleContextMenuAction('copy')}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                  <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Bold className="mr-2 h-4 w-4" />
                    Format
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-48">
                    <ContextMenuItem onClick={() => handleContextMenuAction('bold')}>
                      <Bold className="mr-2 h-4 w-4" />
                      Bold
                      <ContextMenuShortcut>Ctrl+B</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleContextMenuAction('italic')}>
                      <Italic className="mr-2 h-4 w-4" />
                      Italic
                      <ContextMenuShortcut>Ctrl+I</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleContextMenuAction('underline')}>
                      <Underline className="mr-2 h-4 w-4" />
                      Underline
                      <ContextMenuShortcut>Ctrl+U</ContextMenuShortcut>
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                
                <ContextMenuSeparator />
                
                <ContextMenuItem onClick={() => handleContextMenuAction('comment')}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Add Comment
                  <ContextMenuShortcut>Ctrl+Alt+M</ContextMenuShortcut>
                </ContextMenuItem>
                
                <ContextMenuItem onClick={() => handleContextMenuAction('analyze')}>
                  <Zap className="mr-2 h-4 w-4" />
                  AI Analysis
                  <ContextMenuShortcut>Ctrl+Shift+A</ContextMenuShortcut>
                </ContextMenuItem>
                
                <ContextMenuSeparator />
                
                <ContextMenuItem onClick={() => handleContextMenuAction('lookup')}>
                  <Search className="mr-2 h-4 w-4" />
                  Look Up
                </ContextMenuItem>
                
                <ContextMenuItem onClick={() => handleContextMenuAction('bookmark')}>
                  <Bookmark className="mr-2 h-4 w-4" />
                  Bookmark
                </ContextMenuItem>
              </>
            )}
            
            {!selectedText && (
              <>
                <ContextMenuItem onClick={() => handleContextMenuAction('paste')}>
                  <ClipboardPaste className="mr-2 h-4 w-4" />
                  Paste
                  <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
                </ContextMenuItem>
                
                <ContextMenuSeparator />
                
                <ContextMenuItem onClick={() => setShowFindReplace(true)}>
                  <Search className="mr-2 h-4 w-4" />
                  Find & Replace
                  <ContextMenuShortcut>Ctrl+H</ContextMenuShortcut>
                </ContextMenuItem>
                
                <ContextMenuSeparator />
                
                <ContextMenuItem>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Insert Scene Break
                  <ContextMenuShortcut>Ctrl+Shift+Enter</ContextMenuShortcut>
                </ContextMenuItem>
                
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Insert
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-48">
                    <ContextMenuItem>
                      Chapter Division
                    </ContextMenuItem>
                    <ContextMenuItem>
                      Scene Break
                    </ContextMenuItem>
                    <ContextMenuItem>
                      Page Break
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem>
                      Today's Date
                    </ContextMenuItem>
                    <ContextMenuItem>
                      Word Count
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              </>
            )}
          </ContextMenuContent>
          </ContextMenu>
        </ErrorBoundary>

        {/* Find and Replace Dialog */}
        {showFindReplace && (
          <div className="absolute top-4 right-4 bg-background border border-border rounded-lg p-4 shadow-lg z-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Find & Replace</h3>
                <button
                  onClick={() => setShowFindReplace(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Find..."
                  className="w-full px-2 py-1 text-sm border border-border rounded"
                />
                <input
                  type="text"
                  placeholder="Replace with..."
                  className="w-full px-2 py-1 text-sm border border-border rounded"
                />
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded">
                  Find Next
                </button>
                <button className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded">
                  Replace
                </button>
                <button className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded">
                  Replace All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default ProfessionalEditor