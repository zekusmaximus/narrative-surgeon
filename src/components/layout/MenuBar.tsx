'use client'

import React from 'react'
import { useSingleManuscriptStore } from '@/store/singleManuscriptStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { 
  Shuffle, 
  GitBranch, 
  Save
} from 'lucide-react'

interface MenuBarProps {
  className?: string
}

export function MenuBar({ className }: MenuBarProps) {
  const { manuscript, editorMode, unsavedChanges } = useSingleManuscriptStore()
  const { saveManuscript, setEditorMode } = useSingleManuscriptStore(state => state.actions)

  const handleNewManuscript = () => {
    if (confirm('Create a new manuscript? This will replace the current one.')) {
      window.location.reload()
    }
  }

  const handleOpenManuscript = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.docx,.md'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        console.log('Opening file:', file.name)
        // TODO: Implement file import functionality
      }
    }
    input.click()
  }

  const handleSave = () => {
    saveManuscript()
  }

  const handleSaveAs = () => {
    const filename = prompt('Save as filename:', `${manuscript?.metadata.title || 'manuscript'}.txt`)
    if (filename) {
      console.log('Saving as:', filename)
      // TODO: Implement save as functionality
    }
  }

  const handleExport = (format: string) => {
    console.log(`Exporting as ${format}`)
    // TODO: Implement export functionality
  }

  const handleRecentFiles = () => {
    console.log('Opening recent files menu')
    // TODO: Implement recent files functionality
  }

  const handleExit = () => {
    if (unsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to exit?')) {
        window.close()
      }
    } else {
      window.close()
    }
  }

  const handleUndo = () => {
    document.execCommand('undo')
  }

  const handleRedo = () => {
    document.execCommand('redo')
  }

  const handleCut = () => {
    document.execCommand('cut')
  }

  const handleCopy = () => {
    document.execCommand('copy')
  }

  const handlePaste = () => {
    document.execCommand('paste')
  }

  const handleFind = () => {
    document.dispatchEvent(new CustomEvent('global-find'))
  }

  const handleFindReplace = () => {
    document.dispatchEvent(new CustomEvent('global-find-replace'))
  }

  const handleSelectAll = () => {
    document.execCommand('selectAll')
  }

  const handleFullScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  const handleFocusMode = () => {
    document.dispatchEvent(new CustomEvent('global-toggle-focus-mode'))
  }

  const handleTypewriterMode = () => {
    document.dispatchEvent(new CustomEvent('global-toggle-typewriter-mode'))
  }

  const handleToggleSidebar = () => {
    document.dispatchEvent(new CustomEvent('global-toggle-sidebar'))
  }

  const handleToggleProperties = () => {
    document.dispatchEvent(new CustomEvent('global-toggle-properties'))
  }

  const handleZoomIn = () => {
    document.dispatchEvent(new CustomEvent('global-zoom-in'))
  }

  const handleZoomOut = () => {
    document.dispatchEvent(new CustomEvent('global-zoom-out'))
  }

  const handleResetZoom = () => {
    document.dispatchEvent(new CustomEvent('global-reset-zoom'))
  }

  const handleAIAnalysis = () => {
    document.dispatchEvent(new CustomEvent('global-ai-analysis'))
  }

  const handleStoryStructure = () => {
    console.log('Opening story structure analysis')
    // TODO: Implement story structure functionality
  }

  const handleCharacterAnalysis = () => {
    console.log('Opening character analysis')
    // TODO: Implement character analysis functionality
  }

  const handleWordCount = () => {
    const content = manuscript?.content.chapters.reduce((acc, ch) => acc + ch.content, '') || ''
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
    alert(`Word count: ${wordCount}`)
  }

  const handleReadingTime = () => {
    const content = manuscript?.content.chapters.reduce((acc, ch) => acc + ch.content, '') || ''
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
    const readingTime = Math.ceil(wordCount / 250) // Average reading speed
    alert(`Estimated reading time: ${readingTime} minutes`)
  }

  const handleSpellCheck = () => {
    console.log('Running spell check')
    // TODO: Implement spell check functionality
  }

  const handleGrammarCheck = () => {
    console.log('Running grammar check')
    // TODO: Implement grammar check functionality
  }

  const handleImportText = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.md'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        console.log('Importing text from:', file.name)
        // TODO: Implement text import functionality
      }
    }
    input.click()
  }

  const handleBatchImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.txt,.md'
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      if (files.length > 0) {
        console.log('Batch importing files:', files.map(f => f.name))
        // TODO: Implement batch import functionality
      }
    }
    input.click()
  }

  const handleKeyboardShortcuts = () => {
    alert(`Keyboard Shortcuts:
    
File:
• Ctrl+N - New Manuscript
• Ctrl+O - Open Manuscript
• Ctrl+S - Save
• Ctrl+Shift+S - Save As

Edit:
• Ctrl+Z - Undo
• Ctrl+Y - Redo
• Ctrl+X - Cut
• Ctrl+C - Copy
• Ctrl+V - Paste
• Ctrl+F - Find
• Ctrl+H - Find & Replace
• Ctrl+A - Select All

View:
• F11 - Full Screen
• Ctrl+Shift+F - Focus Mode
• Ctrl+Shift+T - Typewriter Mode

Tools:
• Ctrl+Shift+A - AI Analysis
• Ctrl+Shift+W - Word Count
• F7 - Spell Check`)
  }

  const handleUserGuide = () => {
    window.open('/help', '_blank')
  }

  const handleCheckUpdates = () => {
    alert('You are using the latest version of Narrative Surgeon.')
  }

  const handleAbout = () => {
    alert(`Narrative Surgeon - Chapter Reordering Editor
Version 1.0.0

A professional manuscript editor for chapter reordering and consistency checking.

© 2024 Narrative Surgeon`)
  }

  return (
    <div className={`bg-background border-b border-border h-8 flex items-center px-2 ${className}`}>
      {/* Editor Mode Controls */}
      <div className="flex items-center gap-1 mr-4">
        <Button
          variant={editorMode === 'reorder' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setEditorMode('reorder')}
          className="h-6 px-2 text-xs"
        >
          <Shuffle className="h-3 w-3 mr-1" />
          Reorder
        </Button>

        <Button
          variant={editorMode === 'compare' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setEditorMode('compare')}
          className="h-6 px-2 text-xs"
        >
          <GitBranch className="h-3 w-3 mr-1" />
          Versions
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={saveManuscript}
          disabled={!unsavedChanges}
          className="h-6 px-2 text-xs"
        >
          <Save className="h-3 w-3 mr-1" />
          {unsavedChanges ? 'Save' : 'Saved'}
        </Button>
      </div>

      {/* File Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs font-normal"
          >
            File
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={handleNewManuscript}>
            New Manuscript
            <DropdownMenuShortcut>Ctrl+N</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenManuscript}>
            Open Manuscript
            <DropdownMenuShortcut>Ctrl+O</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSave}>
            Save
            <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSaveAs}>
            Save As...
            <DropdownMenuShortcut>Ctrl+Shift+S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Export</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                PDF Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('docx')}>
                Word Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('txt')}>
                Plain Text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('epub')}>
                EPUB eBook
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleRecentFiles}>
            Recent Files
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExit}>
            Exit
            <DropdownMenuShortcut>Ctrl+Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs font-normal"
          >
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={handleUndo}>
            Undo
            <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRedo}>
            Redo
            <DropdownMenuShortcut>Ctrl+Y</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCut}>
            Cut
            <DropdownMenuShortcut>Ctrl+X</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopy}>
            Copy
            <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePaste}>
            Paste
            <DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleFind}>
            Find
            <DropdownMenuShortcut>Ctrl+F</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleFindReplace}>
            Find and Replace
            <DropdownMenuShortcut>Ctrl+H</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSelectAll}>
            Select All
            <DropdownMenuShortcut>Ctrl+A</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs font-normal"
          >
            View
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={handleFullScreen}>
            Full Screen
            <DropdownMenuShortcut>F11</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleFocusMode}>
            Focus Mode
            <DropdownMenuShortcut>Ctrl+Shift+F</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleTypewriterMode}>
            Typewriter Mode
            <DropdownMenuShortcut>Ctrl+Shift+T</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleToggleSidebar}>
            Show Sidebar
            <DropdownMenuShortcut>Ctrl+\\</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleProperties}>
            Show Properties
            <DropdownMenuShortcut>Ctrl+;</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleZoomIn}>
            Zoom In
            <DropdownMenuShortcut>Ctrl++</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleZoomOut}>
            Zoom Out
            <DropdownMenuShortcut>Ctrl+-</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleResetZoom}>
            Reset Zoom
            <DropdownMenuShortcut>Ctrl+0</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tools Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs font-normal"
          >
            Tools
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={handleAIAnalysis}>
            AI Analysis
            <DropdownMenuShortcut>Ctrl+Shift+A</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleStoryStructure}>
            Story Structure
            <DropdownMenuShortcut>Ctrl+Shift+S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCharacterAnalysis}>
            Character Analysis
            <DropdownMenuShortcut>Ctrl+Shift+C</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleWordCount}>
            Word Count
            <DropdownMenuShortcut>Ctrl+Shift+W</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleReadingTime}>
            Reading Time
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSpellCheck}>
            Spell Check
            <DropdownMenuShortcut>F7</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleGrammarCheck}>
            Grammar Check
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleImportText}>
            Import Text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleBatchImport}>
            Batch Import
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Help Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs font-normal"
          >
            Help
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={handleKeyboardShortcuts}>
            Keyboard Shortcuts
            <DropdownMenuShortcut>F1</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleUserGuide}>
            User Guide
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCheckUpdates}>
            Check for Updates
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAbout}>
            About Narrative Surgeon
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Window Title */}
      <div className="flex-1 text-center text-xs text-muted-foreground">
        {manuscript ? manuscript.metadata.title : 'Narrative Surgeon'}
      </div>

      {/* Window Controls Placeholder */}
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <div className="w-3 h-3 rounded-full bg-red-400" />
      </div>
    </div>
  )
}

export default MenuBar