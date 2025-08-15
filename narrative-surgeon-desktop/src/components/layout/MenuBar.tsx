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
    // For single manuscript app, this would create a new version instead
    console.log('New manuscript not implemented for single manuscript mode')
  }

  const handleSave = () => {
    // Trigger save through global shortcut handler
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    }))
  }

  const handleExport = (format: string) => {
    console.log(`Exporting as ${format}`)
    // TODO: Implement export functionality
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
          <DropdownMenuItem>
            Open Manuscript
            <DropdownMenuShortcut>Ctrl+O</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSave}>
            Save
            <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
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
          <DropdownMenuItem>
            Recent Files
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
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
          <DropdownMenuItem>
            Undo
            <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Redo
            <DropdownMenuShortcut>Ctrl+Y</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Cut
            <DropdownMenuShortcut>Ctrl+X</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Copy
            <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Paste
            <DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Find
            <DropdownMenuShortcut>Ctrl+F</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Find and Replace
            <DropdownMenuShortcut>Ctrl+H</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
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
          <DropdownMenuItem>
            Full Screen
            <DropdownMenuShortcut>F11</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Focus Mode
            <DropdownMenuShortcut>Ctrl+Shift+F</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Typewriter Mode
            <DropdownMenuShortcut>Ctrl+Shift+T</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Show Sidebar
            <DropdownMenuShortcut>Ctrl+\\</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Show Properties
            <DropdownMenuShortcut>Ctrl+;</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Zoom In
            <DropdownMenuShortcut>Ctrl++</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Zoom Out
            <DropdownMenuShortcut>Ctrl+-</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
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
          <DropdownMenuItem>
            AI Analysis
            <DropdownMenuShortcut>Ctrl+Shift+A</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Story Structure
            <DropdownMenuShortcut>Ctrl+Shift+S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Character Analysis
            <DropdownMenuShortcut>Ctrl+Shift+C</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Word Count
            <DropdownMenuShortcut>Ctrl+Shift+W</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Reading Time
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Spell Check
            <DropdownMenuShortcut>F7</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Grammar Check
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Import Text
          </DropdownMenuItem>
          <DropdownMenuItem>
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
          <DropdownMenuItem>
            Keyboard Shortcuts
            <DropdownMenuShortcut>F1</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            User Guide
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Check for Updates
          </DropdownMenuItem>
          <DropdownMenuItem>
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