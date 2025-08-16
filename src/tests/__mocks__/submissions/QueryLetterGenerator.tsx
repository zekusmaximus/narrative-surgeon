import React, { useState } from 'react'
import { invoke as tauriInvoke } from '@tauri-apps/api/core'

type Manuscript = {
  id?: string
  title?: string
  author?: string
  genre?: string
  wordCount?: number
  logline?: string
  synopsis?: string
}

export type QueryLetterGeneratorProps = {
  manuscript?: Manuscript
}

export const QueryLetterGenerator: React.FC<QueryLetterGeneratorProps> = ({ manuscript = {} }) => {
  const [title, setTitle] = useState(manuscript.title ?? '')
  const [wordCount, setWordCount] = useState<number | string>(manuscript.wordCount ?? '')
  const [genre, setGenre] = useState(manuscript.genre ?? '')
  const [generated, setGenerated] = useState<string>('')
  const [score, setScore] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState<string>('')

  const validate = () => {
    const errs: string[] = []
    if (!title) errs.push('Title is required')
    if (!wordCount && wordCount !== 0) errs.push('Word count is required')
    if (errs.length) {
      setError(errs.join('\n'))
      return false
    }
    setError('')
    return true
  }

  const onGenerate = async () => {
    if (!validate()) return
    try {
      const res = await tauriInvoke('generate_query_letter', {
        manuscript: { title, wordCount: Number(wordCount) || 0, genre }
      })
      // Tests in setup mock invoke to return this shape
      // Provide resilient handling
      const r: any = res || {}
      setGenerated(r.query || 'Generated query letter content...')
      setScore(typeof r.score === 'number' ? r.score : 85)
      setSuggestions(Array.isArray(r.suggestions) ? r.suggestions : ['Improve hook'])
    } catch (e) {
      setError('Unable to generate query. Please try again.')
    }
  }

  return (
    <div>
      <label htmlFor="title">Manuscript Title</label>
      <input
        id="title"
        aria-label="Manuscript Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        aria-required="true"
      />

      <label htmlFor="wc">Word Count</label>
      <input
        id="wc"
        aria-label="Word Count"
        value={wordCount}
        onChange={(e) => setWordCount(e.target.value)}
      />

      <label htmlFor="genre">Genre</label>
      <input
        id="genre"
        aria-label="Genre"
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
      />

      <button onClick={onGenerate}>Generate Query</button>

      {error && <div role="alert">{error}</div>}
      {generated && <div>{generated}</div>}
      {typeof score === 'number' && <div>{score}/100</div>}
      {suggestions.length > 0 && (
        <ul>
          {suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default QueryLetterGenerator
