'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Highlighter,
  Type,
  Save,
  Search,
  Zap,
  Eye,
  EyeOff,
  Maximize,
  ChevronDown,
  Palette,
  MessageSquare,
  BarChart3
} from 'lucide-react'
import { useAppStore } from '@/lib/store'

interface ToolbarProps {
  editor?: any // Tiptap editor instance
  className?: string
}

export function Toolbar({ editor, className }: ToolbarProps) {
  const { 
    unsavedChanges, 
    saveCurrentScene,
    editorSettings,
    updateEditorSettings 
  } = useAppStore()

  const handleSave = async () => {
    try {
      await saveCurrentScene()
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  const toggleBold = () => editor?.chain().focus().toggleBold().run()
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run()
  const toggleUnderline = () => editor?.chain().focus().toggleUnderline().run()
  const toggleHighlight = () => editor?.chain().focus().toggleHighlight().run()
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run()
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run()
  const toggleBlockquote = () => editor?.chain().focus().toggleBlockquote().run()
  
  const setTextAlign = (alignment: 'left' | 'center' | 'right') => {
    editor?.chain().focus().setTextAlign(alignment).run()
  }

  const insertSceneBreak = () => {
    editor?.chain().focus().insertSceneBreak().run()
  }

  const toggleFocusMode = () => {
    updateEditorSettings({ focusMode: !editorSettings.focusMode })
  }

  return (
    <div className={`bg-background border-b border-border px-2 py-1.5 flex items-center gap-1 ${className}`}>
      {/* Save Button */}
      <Button
        variant={unsavedChanges ? "default" : "ghost"}
        size="sm"
        onClick={handleSave}
        disabled={!unsavedChanges}
        className="h-7"
      >
        <Save className="w-3.5 h-3.5 mr-1" />
        Save
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text Formatting */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleBold}
          className={`h-7 w-7 p-0 ${editor?.isActive('bold') ? 'bg-accent' : ''}`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleItalic}
          className={`h-7 w-7 p-0 ${editor?.isActive('italic') ? 'bg-accent' : ''}`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleUnderline}
          className={`h-7 w-7 p-0 ${editor?.isActive('underline') ? 'bg-accent' : ''}`}
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-3.5 h-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleHighlight}
          className={`h-7 w-7 p-0 ${editor?.isActive('highlight') ? 'bg-accent' : ''}`}
          title="Highlight"
        >
          <Highlighter className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text Alignment */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTextAlign('left')}
          className={`h-7 w-7 p-0 ${editor?.isActive({ textAlign: 'left' }) ? 'bg-accent' : ''}`}
          title="Align Left"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTextAlign('center')}
          className={`h-7 w-7 p-0 ${editor?.isActive({ textAlign: 'center' }) ? 'bg-accent' : ''}`}
          title="Align Center"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTextAlign('right')}
          className={`h-7 w-7 p-0 ${editor?.isActive({ textAlign: 'right' }) ? 'bg-accent' : ''}`}
          title="Align Right"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists and Structure */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleBulletList}
          className={`h-7 w-7 p-0 ${editor?.isActive('bulletList') ? 'bg-accent' : ''}`}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleOrderedList}
          className={`h-7 w-7 p-0 ${editor?.isActive('orderedList') ? 'bg-accent' : ''}`}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleBlockquote}
          className={`h-7 w-7 p-0 ${editor?.isActive('blockquote') ? 'bg-accent' : ''}`}
          title="Quote"
        >
          <Quote className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Manuscript-Specific Tools */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={insertSceneBreak}
          className="h-7 px-2"
          title="Insert Scene Break (Ctrl+Shift+Enter)"
        >
          ***
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              Chapter
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => editor?.chain().focus().insertChapterDivision({ number: 1 }).run()}>
              New Chapter
            </DropdownMenuItem>
            <DropdownMenuItem>
              Part Division
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* View Controls */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title="Find (Ctrl+F)"
        >
          <Search className="w-3.5 h-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFocusMode}
          className={`h-7 w-7 p-0 ${editorSettings.focusMode ? 'bg-accent' : ''}`}
          title="Focus Mode"
        >
          {editorSettings.focusMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title="Full Screen (F11)"
        >
          <Maximize className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* AI and Analysis Tools */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          title="AI Analysis (Ctrl+Shift+A)"
        >
          <Zap className="w-3.5 h-3.5 mr-1" />
          AI
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title="Comments"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title="Statistics"
        >
          <BarChart3 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Side Controls */}
      <div className="flex items-center gap-1">
        {/* Color Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Text Color">
              <Palette className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="grid grid-cols-6 gap-1 p-2">
              {[
                '#000000', '#FF0000', '#00FF00', '#0000FF', 
                '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
                '#800080', '#008000', '#000080', '#808080'
              ].map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => editor?.chain().focus().setColor(color).run()}
                  title={color}
                />
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font Size */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Type className="w-3.5 h-3.5 mr-1" />
              {editorSettings.fontSize}px
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {[12, 14, 16, 18, 20, 24, 28, 32].map((size) => (
              <DropdownMenuItem
                key={size}
                onClick={() => updateEditorSettings({ fontSize: size })}
                className={size === editorSettings.fontSize ? 'bg-accent' : ''}
              >
                {size}px
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export default Toolbar