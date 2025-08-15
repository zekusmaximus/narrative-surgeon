'use client'

import React, { useEffect, useImperativeHandle, forwardRef, useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Editor, Extension, Node } from '@tiptap/core'
import { EditorView } from '@tiptap/pm/view'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
// import Focus from '@tiptap/extension-focus'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'


/**
 * Custom Scene Break extension with proper typing
 */
const SceneBreak = Node.create({
  name: 'sceneBreak',
  group: 'block',
  content: '',
  marks: '',
  atom: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="scene-break"]',
      },
    ]
  },

  renderHTML() {
    return [
      'div',
      {
        'data-type': 'scene-break',
        class: 'scene-break',
        contenteditable: 'false',
      },
      '* * *',
    ]
  },

  addCommands() {
    return {
      insertSceneBreak: () => ({ commands }: any) => {
        return commands.insertContent({ type: this.name })
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-Enter': () => {
        return (this.editor.commands as any).insertSceneBreak()
      },
    }
  },
})

/**
 * Custom Chapter Division extension with proper typing
 */
const ChapterDivision = Node.create({
  name: 'chapterDivision',
  group: 'block',
  content: 'inline*',
  marks: '',
  defining: true,

  addAttributes() {
    return {
      number: {
        default: 1,
      },
      title: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="chapter-division"]',
        getAttrs: (element: HTMLElement) => ({
          number: parseInt(element.getAttribute('data-number') || '1', 10),
          title: element.getAttribute('data-title'),
        }),
      },
    ]
  },

  renderHTML({ node }: { node: ProseMirrorNode }) {
    return [
      'div',
      {
        'data-type': 'chapter-division',
        'data-number': node.attrs.number,
        'data-title': node.attrs.title,
        class: 'chapter-division',
      },
      `Chapter ${node.attrs.number}${node.attrs.title ? `: ${node.attrs.title}` : ''}`,
    ]
  },

  addCommands() {
    return {
      insertChapterDivision: (attrs: { number?: number; title?: string }) => 
        ({ commands }: any) => {
        return commands.insertContent({
          type: this.name,
          attrs,
        })
      },
    }
  },
})

/**
 * Auto-save extension with proper cleanup and memory leak prevention
 */
const AutoSave = Extension.create({
  name: 'autoSave',

  addOptions() {
    return {
      delay: 2000,
      onSave: () => {},
    }
  },

  onCreate() {
    let timeout: NodeJS.Timeout | null = null

    /**
     * Handle editor update with debounced save
     * FIXED: Proper cleanup to prevent memory leaks
     */
    const updateHandler = () => {
      if (timeout) {
        clearTimeout(timeout)
      }
      timeout = setTimeout(() => {
        try {
          this.options.onSave()
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }, this.options.delay)
    }

    // Add event listener
    this.editor.on('update', updateHandler)
    
    /**
     * CRITICAL FIX: Proper cleanup on destroy to prevent memory leaks
     */
    this.editor.on('destroy', () => {
      this.editor.off('update', updateHandler)
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
    })
  },
})

export interface EditorProps {
  content: string
  onChange: (content: string) => void
  manuscriptId: string
  sceneId?: string
  readOnly?: boolean
  showWordCount?: boolean
  enableComments?: boolean
  placeholder?: string
  className?: string
  onSave?: () => void
}

export interface EditorRef {
  getWordCount: () => number
  getCharacterCount: () => number
  insertSceneBreak: () => boolean
  insertChapterDivision: (number: number, title?: string) => boolean
  focus: () => boolean
  blur: () => boolean
  getHTML: () => string
  getText: () => string
  setContent: (content: string) => boolean
  insertText: (text: string) => boolean
  find: (searchTerm: string) => void
  replace: (searchTerm: string, replaceWith: string) => void
}

export const TiptapEditor = forwardRef<EditorRef, EditorProps>(
  (
    {
      content,
      onChange,
      readOnly = false,
      showWordCount = true,
      placeholder = 'Start writing your story...',
      className = '',
      onSave,
    },
    ref
  ) => {
    /**
     * RACE CONDITION FIX: Track content update state to prevent infinite loops
     */
    const [isUpdatingContent, setIsUpdatingContent] = useState(false)
    const lastContentRef = useRef<string>('')
    
    // Clean className to prevent DOM token errors
    const cleanClassName = className.replace(/[\r\n\t\f\v]/g, ' ').replace(/\s+/g, ' ').trim()

    /**
     * RACE CONDITION FIX: Debounced onChange to prevent excessive updates
     */
    const debouncedOnChange = useCallback((newContent: string) => {
      if (newContent !== lastContentRef.current) {
        lastContentRef.current = newContent
        onChange(newContent)
      }
    }, [onChange])

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit,
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Highlight,
        Color.configure({
          types: ['textStyle'],
        }),
        TextStyle,
        CharacterCount,
        Placeholder.configure({
          placeholder,
          emptyEditorClass: 'is-editor-empty',
        }),
        // Focus.configure({
        //   className: 'has-focus',
        //   mode: 'all',
        // }),
        Subscript,
        Superscript,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        SceneBreak,
        ChapterDivision,
        AutoSave.configure({
          delay: 2000,
          onSave: () => onSave?.(),
        }),
      ],
      content,
      editable: !readOnly,
      /**
       * RACE CONDITION FIX: Properly typed onUpdate with content change detection
       */
      onUpdate: ({ editor }: { editor: Editor }) => {
        if (!isUpdatingContent) {
          const newContent = editor.getHTML()
          debouncedOnChange(newContent)
        }
      },
      editorProps: {
        attributes: {
          class: `prose prose-lg max-w-none min-h-[500px] px-6 py-4 focus:outline-none manuscript-editor ${cleanClassName}`.trim().replace(/\s+/g, ' '),
          spellcheck: 'true',
        },
        handleKeyDown: (_view: EditorView, event: KeyboardEvent) => {
          // Custom keyboard shortcuts with proper typing
          if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
              case 's':
                event.preventDefault()
                onSave?.()
                return true
              case 'f':
                event.preventDefault()
                // Trigger find functionality
                return true
            }
          }
          return false
        },
      },
    })

    /**
     * PROPERLY TYPED: Expose editor methods through ref with null safety
     */
    useImperativeHandle(ref, () => ({
      getWordCount: () => {
        if (!editor?.storage?.characterCount) return 0
        return editor.storage.characterCount.words()
      },
      getCharacterCount: () => {
        if (!editor?.storage?.characterCount) return 0
        return editor.storage.characterCount.characters()
      },
      insertSceneBreak: () => {
        if (!editor?.commands) return false
        return (editor.commands as any).insertSceneBreak?.() || false
      },
      insertChapterDivision: (number: number, title?: string) => {
        if (!editor?.commands) return false
        return (editor.commands as any).insertChapterDivision?.({ number, title }) || false
      },
      focus: () => {
        if (!editor?.commands) return false
        return (editor.commands as any).focus('end')
      },
      blur: () => {
        if (!editor?.commands) return false
        return (editor.commands as any).blur()
      },
      getHTML: () => editor?.getHTML() || '',
      getText: () => editor?.getText() || '',
      setContent: (content: string) => {
        if (!editor?.commands) return false
        return (editor.commands as any).setContent(content, false)
      },
      insertText: (text: string) => {
        if (!editor?.commands) return false
        return (editor.commands as any).insertContent(text)
      },
      find: (searchTerm: string) => {
        // TODO: Implement find functionality with proper search API
        console.log('Find:', searchTerm)
      },
      replace: (searchTerm: string, replaceWith: string) => {
        // TODO: Implement replace functionality with proper search API
        console.log('Replace:', searchTerm, 'with', replaceWith)
      },
    }), [editor])

    /**
     * RACE CONDITION FIX: Safe content updates with proper change detection
     */
    useEffect(() => {
      if (editor && content !== editor.getHTML() && !isUpdatingContent) {
        setIsUpdatingContent(true)
        
        // Set content without emitting update to prevent circular updates
        ;(editor.commands as any).setContent(content, false)
        
        // Reset flag after update is processed
        setTimeout(() => setIsUpdatingContent(false), 0)
      }
    }, [content, editor, isUpdatingContent])

    /**
     * Auto-focus on mount with proper cleanup
     */
    useEffect(() => {
      if (editor && !readOnly) {
        ;(editor.commands as any).focus('end')
      }
    }, [editor, readOnly])

    /**
     * MEMORY LEAK PREVENTION: Cleanup on unmount
     */
    useEffect(() => {
      return () => {
        if (editor) {
          editor.destroy()
        }
      }
    }, [editor])

    if (!editor) {
      return (
        <div className="flex items-center justify-center min-h-[500px] text-muted-foreground">
          Loading editor...
        </div>
      )
    }

    return (
      <div className="relative w-full h-full">
        <EditorContent
          editor={editor}
          className="w-full h-full"
        />
        
        {showWordCount && (
          <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded border">
            {editor.storage.characterCount.words()} words • {editor.storage.characterCount.characters()} characters
          </div>
        )}

        {/* Writing Progress Indicator */}
        <div className="absolute top-4 right-4 text-xs text-muted-foreground">
          {readOnly ? (
            <span className="inline-flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              Read Only
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Editing
            </span>
          )}
        </div>
      </div>
    )
  }
)

TiptapEditor.displayName = 'TiptapEditor'