# CRITICAL BUG FIXES - PRIORITY LIST

## Immediate (Blocking)

### 1. Memory Leak in TiptapEditor.tsx - Line 133-141
**Issue**: AutoSave extension creates timeout that's never cleared, causing memory leaks during extended editing sessions.

**Current Buggy Code**:
```typescript
onCreate() {
  let timeout: NodeJS.Timeout

  this.editor.on('update', () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      this.options.onSave()
    }, this.options.delay)
  })
},
```

**Fixed Code**:
```typescript
onCreate() {
  let timeout: NodeJS.Timeout

  const updateHandler = () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      this.options.onSave()
    }, this.options.delay)
  }

  this.editor.on('update', updateHandler)
  
  // Clean up event listener and timeout
  this.editor.on('destroy', () => {
    this.editor.off('update', updateHandler)
    clearTimeout(timeout)
  })
},
```

**Test**: Create editor, type continuously for 5+ minutes, destroy editor. Monitor memory usage.

### 2. TypeScript `any` Casts Throughout TiptapEditor.tsx
**Issue**: Multiple `any` casts mask type errors and prevent IDE assistance.

**Current Buggy Code (Lines 19, 52, 112, etc.)**:
```typescript
const { Extension: CoreExtension, Node: CoreNode, Editor: CoreEditor, Commands: CoreCommands } = Tiptap as any
// ... later ...
insertSceneBreak: () => ({ commands }: { commands: any }) => {
  return (commands as any).insertContent({ type: this.name })
},
```

**Fixed Code**:
```typescript
import { Extension, Node, Editor, Commands } from '@tiptap/core'

// Define proper command interface
interface EditorCommands {
  insertContent: (content: { type: string; attrs?: Record<string, unknown> }) => boolean
  setContent: (content: string) => boolean
  focus: (position?: 'start' | 'end' | number) => boolean
  blur: () => boolean
}

insertSceneBreak: () => ({ commands }: { commands: EditorCommands }) => {
  return commands.insertContent({ type: this.name })
},
```

**Test**: Compile with strict TypeScript settings. Verify all commands work correctly.

### 3. Incomplete Return Statements in useImperativeHandle - Lines 252-272
**Issue**: Some imperative handle methods don't properly handle null editor state.

**Current Buggy Code**:
```typescript
useImperativeHandle(ref, () => ({
  getWordCount: () => editor?.storage?.characterCount?.words() || 0,
  focus: () => (editor?.commands as any).focus(),
  // Missing null checks cause runtime errors
}), [editor])
```

**Fixed Code**:
```typescript
useImperativeHandle(ref, () => ({
  getWordCount: () => {
    if (!editor?.storage?.characterCount) return 0
    return editor.storage.characterCount.words()
  },
  focus: () => {
    if (!editor?.commands) return false
    return editor.commands.focus()
  },
  blur: () => {
    if (!editor?.commands) return false
    return editor.commands.blur()
  },
  setContent: (content: string) => {
    if (!editor?.commands) return false
    return editor.commands.setContent(content)
  },
  insertText: (text: string) => {
    if (!editor?.commands) return false
    return editor.commands.insertContent(text)
  },
  getHTML: () => editor?.getHTML() || '',
  getText: () => editor?.getText() || '',
  insertSceneBreak: () => {
    if (!editor?.commands?.insertSceneBreak) return false
    return editor.commands.insertSceneBreak()
  },
  insertChapterDivision: (number: number, title?: string) => {
    if (!editor?.commands?.insertChapterDivision) return false
    return editor.commands.insertChapterDivision({ number, title })
  },
  find: (searchTerm: string) => {
    // TODO: Implement proper find functionality
    console.warn('Find functionality not yet implemented:', searchTerm)
  },
  replace: (searchTerm: string, replaceWith: string) => {
    // TODO: Implement proper replace functionality  
    console.warn('Replace functionality not yet implemented:', searchTerm, replaceWith)
  },
}), [editor])
```

**Test**: Call each method when editor is null/undefined. Verify no runtime errors.

## High Priority (Stability)

### 4. Missing Error Boundary in Main Editor Component
**Issue**: Unhandled errors in editor crash entire application.

**Location**: src/components/editor/ProfessionalEditor.tsx (needs to be created/updated)

**Fixed Code**:
```typescript
import React, { ErrorInfo, ReactNode } from 'react'

interface EditorErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class EditorErrorBoundary extends React.Component<
  { children: ReactNode },
  EditorErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): EditorErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Editor Error:', error, errorInfo)
    // Log to error tracking service in production
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Editor Error
          </h3>
          <p className="text-red-700 mb-4">
            Something went wrong with the editor. Please refresh the page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default EditorErrorBoundary
```

**Test**: Force an error in editor component. Verify graceful fallback.

### 5. Race Condition in Content Updates - TiptapEditor.tsx Lines 275-279
**Issue**: Rapid content changes can cause editor state desynchronization.

**Current Buggy Code**:
```typescript
useEffect(() => {
  if (editor && content !== editor.getHTML()) {
    (editor.commands as any).setContent(content)
  }
}, [content, editor])
```

**Fixed Code**:
```typescript
const [isUpdatingContent, setIsUpdatingContent] = useState(false)

useEffect(() => {
  if (editor && content !== editor.getHTML() && !isUpdatingContent) {
    setIsUpdatingContent(true)
    
    // Use transaction to ensure atomic update
    editor.chain()
      .focus()
      .setContent(content, false) // false = don't emit update event
      .run()
      
    // Reset flag after content is set
    setTimeout(() => setIsUpdatingContent(false), 0)
  }
}, [content, editor, isUpdatingContent])

// Update onChange to prevent circular updates
onUpdate: ({ editor }: { editor: Editor }) => {
  if (!isUpdatingContent) {
    onChange(editor.getHTML())
  }
},
```

**Test**: Rapidly change content prop. Verify no infinite update loops.

### 6. Tauri Command Mismatches - src/lib/tauri.ts
**Issue**: Frontend expects different return types than Rust backend provides.

**Example Current Issue**:
```typescript
// Frontend expects { success: boolean }
static async deleteManuscript(id: string): Promise<{ success: boolean }> {
  return await invoke('delete_manuscript_safe', { manuscriptId: id })
}
```

**Fixed Code**:
```typescript
// Add proper error handling and type validation
static async deleteManuscript(id: string): Promise<{ success: boolean }> {
  try {
    const result = await invoke('delete_manuscript_safe', { manuscriptId: id })
    
    // Validate return type
    if (typeof result === 'object' && result !== null && 'success' in result) {
      return result as { success: boolean }
    }
    
    // Handle unexpected return format
    console.warn('Unexpected return format from delete_manuscript_safe:', result)
    return { success: !!result }
    
  } catch (error) {
    console.error('Delete manuscript failed:', error)
    return { success: false }
  }
}
```

**Test**: Call all Tauri commands. Verify return types match expectations.

## Medium Priority (Performance)

### 7. Missing Memoization in Heavy Components
**Location**: src/components/DocumentOutline.tsx (inferred from directory structure)

**Performance Fix**:
```typescript
import React, { memo, useMemo } from 'react'

const DocumentOutline = memo(({ chapters, currentChapter, onChapterSelect }) => {
  const outlineItems = useMemo(() => {
    return chapters.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      wordCount: chapter.wordCount,
      isActive: chapter.id === currentChapter?.id
    }))
  }, [chapters, currentChapter])

  return (
    <div className="document-outline">
      {outlineItems.map(item => (
        <OutlineItem 
          key={item.id} 
          {...item} 
          onClick={() => onChapterSelect(item.id)} 
        />
      ))}
    </div>
  )
})
```

### 8. Inefficient Re-renders in Store Updates
**Location**: src/store/manuscriptStore.ts

**Performance Fix**:
```typescript
// Use Immer for immutable updates to prevent unnecessary re-renders
import { produce } from 'immer'

// Replace direct state mutations with Immer produce
updateManuscript: async (manuscriptId, updates) => {
  try {
    await invoke('update_manuscript', { manuscriptId, updates })
    
    set(produce((state: ManuscriptStore) => {
      const index = state.manuscripts.findIndex(m => m.id === manuscriptId)
      if (index >= 0) {
        state.manuscripts[index] = { 
          ...state.manuscripts[index], 
          ...updates, 
          updatedAt: Date.now() 
        }
      }
      
      if (state.activeManuscript?.id === manuscriptId) {
        state.activeManuscript = { 
          ...state.activeManuscript, 
          ...updates, 
          updatedAt: Date.now() 
        }
      }
    }))
  } catch (error) {
    // error handling
  }
}
```

## Automation Test Script

```bash
#!/bin/bash
# Critical bug verification script

echo "Running critical bug fix verification..."

# Test 1: Memory leak test
echo "1. Testing memory leak fix..."
npm run test -- --testNamePattern="memory leak" --runInBand

# Test 2: TypeScript compilation with strict settings
echo "2. Testing TypeScript strict compilation..."
npx tsc --noEmit --strict

# Test 3: Editor error boundary
echo "3. Testing error boundary..."
npm run test -- --testNamePattern="error boundary"

# Test 4: Race condition test  
echo "4. Testing content update race conditions..."
npm run test -- --testNamePattern="content update"

# Test 5: Tauri command validation
echo "5. Testing Tauri command interfaces..."
npm run test:integration -- --grep "tauri commands"

echo "Bug fix verification complete."
```