import React from 'react'

type WordCountDisplayProps = {
  text: string
  showCharacters?: boolean
  showReadingTime?: boolean
  className?: string
}

function countWords(text: string): number {
  if (!text) return 0
  const tokens = text.trim().match(/\S+/g)
  return tokens ? tokens.length : 0
}

function readingTimeMinutes(words: number, wpm = 200): number {
  if (words <= 0) return 0
  return Math.max(1, Math.round(words / wpm))
}

export const WordCountDisplay: React.FC<WordCountDisplayProps> = ({
  text,
  showCharacters = false,
  showReadingTime = false,
  className
}) => {
  const words = countWords(text)
  const chars = text ? text.length : 0
  const mins = readingTimeMinutes(words)

  return (
    <div className={className} aria-label="word count">
      <span>{words} {words === 1 ? 'word' : 'words'}</span>
      {showCharacters && (
        <>
          {' '}•{' '}
          <span>{chars} {chars === 1 ? 'character' : 'characters'}</span>
        </>
      )}
      {showReadingTime && (
        <>
          {' '}•{' '}
          <span>{mins} {mins === 1 ? 'min' : 'mins'} read</span>
        </>
      )}
    </div>
  )
}

export default WordCountDisplay
