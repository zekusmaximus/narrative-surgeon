'use client'

import React, { useEffect, useImperativeHandle, forwardRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import Focus from '@tiptap/extension-focus'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import * as Tiptap from '@tiptap/core'
const { Extension: CoreExtension, Node: CoreNode, Editor: CoreEditor, Commands: CoreCommands } = Tiptap as any
import { Node as ProseMirrorNode } from '@tiptap/pm/model'

// Custom Scene Break extension
const SceneBreak = CoreNode.create({
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
  insertSceneBreak: () => ({ commands }: { commands: any }) => {
        return (commands as any).insertContent({ type: this.name })
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-Enter': () => this.editor.commands.insertSceneBreak(),
    }
  },
})

// Custom Chapter Division extension
const ChapterDivision = CoreNode.create({
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
  insertChapterDivision: (attrs: { number?: number; title?: string }) => ({ commands }: { commands: any }) => {
        return (commands as any).insertContent({
          type: this.name,
          attrs,
        })
      },
    }
  },
})

// Auto-save extension
const AutoSave = CoreExtension.create({
  name: 'autoSave',

  addOptions() {
    return {
      delay: 2000,
      onSave: () => {},
    }
  },

  onCreate() {
    let timeout: NodeJS.Timeout

    this.editor.on('update', () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        this.options.onSave()
      }, this.options.delay)
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
  insertSceneBreak: () => void
  insertChapterDivision: (number: number, title?: string) => void
  focus: () => void
  blur: () => void
  getHTML: () => string
  getText: () => string
  setContent: (content: string) => void
  insertText: (text: string) => void
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
    const editor = useEditor({
      extensions: [
  // StarterKit (history disabled manually by not including history extension)
  StarterKit.configure({}),
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Highlight.configure({
          multicolor: true,
        }),
        Color.configure({
          types: ['textStyle'],
        }),
        TextStyle,
        CharacterCount,
        Placeholder.configure({
          placeholder,
          emptyEditorClass: 'is-editor-empty',
        }),
        Focus.configure({
          className: 'has-focus',
          mode: 'all',
        }),
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
  onUpdate: ({ editor }: { editor: any }) => {
        onChange(editor.getHTML())
      },
      editorProps: {
        attributes: {
          class: `prose prose-lg max-w-none min-h-[500px] px-6 py-4 focus:outline-none manuscript-editor ${className}`,
          spellcheck: 'true',
        },
        handleKeyDown: (_view: any, event: KeyboardEvent) => {
          // Custom keyboard shortcuts
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

    // Expose editor methods through ref
    useImperativeHandle(ref, () => ({
      getWordCount: () => editor?.storage?.characterCount?.words() || 0,
      getCharacterCount: () => editor?.storage?.characterCount?.characters() || 0,
      insertSceneBreak: () => (editor?.commands as any).insertSceneBreak(),
      insertChapterDivision: (number: number, title?: string) =>
        (editor?.commands as any).insertChapterDivision({ number, title }),
  focus: () => (editor?.commands as any).focus(),
  blur: () => (editor?.commands as any).blur(),
      getHTML: () => editor?.getHTML() || '',
      getText: () => editor?.getText() || '',
  setContent: (content: string) => (editor?.commands as any).setContent(content),
  insertText: (text: string) => (editor?.commands as any).insertContent(text),
      find: (searchTerm: string) => {
        // TODO: Implement find functionality
        console.log('Find:', searchTerm)
      },
      replace: (searchTerm: string, replaceWith: string) => {
        // TODO: Implement replace functionality
        console.log('Replace:', searchTerm, 'with', replaceWith)
      },
    }), [editor])

    // Update content when prop changes
    useEffect(() => {
      if (editor && content !== editor.getHTML()) {
  (editor.commands as any).setContent(content)
      }
    }, [content, editor])

    // Auto-focus on mount
    useEffect(() => {
      if (editor && !readOnly) {
  (editor.commands as any).focus('end')
      }
    }, [editor, readOnly])

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