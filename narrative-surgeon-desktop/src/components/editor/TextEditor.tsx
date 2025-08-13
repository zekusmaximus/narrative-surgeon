import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type TextEditorProps = {
  content: string
  onChange: (value: string) => void
  onSave?: () => void
  isAutoSaving?: boolean
  placeholder?: string
  className?: string
}

export function TextEditor({
  content,
  onChange,
  onSave,
  isAutoSaving = false,
  placeholder = 'Start typing...',
  className
}: TextEditorProps) {
  const [value, setValue] = useState(content ?? '')
  const ref = useRef<HTMLTextAreaElement | null>(null)

  // Keep internal state in sync when content prop changes
  useEffect(() => {
    setValue(content ?? '')
  }, [content])

  // Preserve focus between re-renders
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // If the textarea had focus previously, keep it focused
    if (document.activeElement === el) {
      el.focus()
    }
  })

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value
      setValue(next)
      onChange?.(next)
    },
    [onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl/Cmd + S triggers save
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        onSave?.()
      }
    },
    [onSave]
  )

  const status = useMemo(() => {
    return isAutoSaving ? 'Saving...' : ''
  }, [isAutoSaving])

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        ref={ref}
        role="textbox"
        aria-label="text editor"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: '100%',
          minHeight: 200,
          padding: 8,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 14,
          lineHeight: 1.5,
          border: '1px solid #ccc',
          borderRadius: 6,
          resize: 'vertical'
        }}
      />
      {status ? (
        <div aria-live="polite" style={{ color: '#666', fontSize: 12 }}>
          {status}
        </div>
      ) : null}
    </div>
  )
}

export default TextEditor
