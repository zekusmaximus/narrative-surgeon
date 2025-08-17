/**
 * Manuscript loader utilities
 */

import { TechnoThrillerManuscript } from './manuscript-data'

/**
 * Load manuscript from localStorage if it exists, otherwise use empty default
 */
export function loadManuscriptFromStorage(): Promise<TechnoThrillerManuscript> {
  return new Promise((resolve) => {
    const stored = localStorage.getItem('manuscript-content')
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Validate the structure
        if (parsed.metadata && parsed.chapters && Array.isArray(parsed.chapters)) {
          resolve(parsed as TechnoThrillerManuscript)
          return
        }
      } catch (error) {
        console.warn('Failed to parse stored manuscript, using default:', error)
      }
    }
    
    // Fall back to empty manuscript
    resolve(createEmptyManuscript())
  })
}

/**
 * Save manuscript to localStorage
 */
export function saveManuscriptToStorage(manuscript: TechnoThrillerManuscript): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      localStorage.setItem('manuscript-content', JSON.stringify(manuscript))
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Import manuscript from file
 */
export function importManuscriptFromFile(file: File): Promise<TechnoThrillerManuscript> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const manuscript = JSON.parse(content) as TechnoThrillerManuscript
        
        // Basic validation
        if (!manuscript.metadata || !manuscript.chapters) {
          throw new Error('Invalid manuscript format')
        }
        
        resolve(manuscript)
      } catch (error) {
        reject(new Error(`Failed to parse manuscript file: ${error}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read manuscript file'))
    }
    
    reader.readAsText(file)
  })
}

/**
 * Export manuscript to JSON file
 */
export function exportManuscriptToFile(manuscript: TechnoThrillerManuscript, filename?: string): void {
  const json = JSON.stringify(manuscript, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `${manuscript.metadata.title.toLowerCase().replace(/\s+/g, '-')}-manuscript.json`
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Create empty manuscript structure
 */
function createEmptyManuscript(): TechnoThrillerManuscript {
  return {
    metadata: {
      title: 'New Manuscript',
      author: 'Author Name',
      wordCount: 0,
      genre: 'techno-thriller',
      version: '1.0.0',
      lastModified: new Date(),
      created: new Date(),
      tags: []
    },
    chapters: [],
    characters: [],
    locations: [],
    techConcepts: [],
    timeline: []
  }
}