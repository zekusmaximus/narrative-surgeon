import type { 
  TechnoThrillerManuscript, 
  ManuscriptVersion,
  Chapter 
} from '@/types/single-manuscript'

export interface ExportOptions {
  format: 'txt' | 'markdown' | 'docx' | 'pdf'
  versionId: string
  includeMetadata: boolean
  includeOutline: boolean
  includeNotes: boolean
  pageBreakBetweenChapters: boolean
  customTitle?: string
  customAuthor?: string
  customCover?: boolean
  fontSize?: number
  fontFamily?: string
  lineSpacing?: number
  margins?: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

export class ExportEngine {
  private manuscript: TechnoThrillerManuscript
  
  constructor(manuscript: TechnoThrillerManuscript) {
    this.manuscript = manuscript
  }
  
  /**
   * Exports a specific version in the requested format
   */
  async exportVersion(options: ExportOptions): Promise<Blob> {
    const version = this.manuscript.versions.get(options.versionId)
    if (!version) {
      throw new Error(`Version ${options.versionId} not found`)
    }
    
    const chapters = this.getChaptersInOrder(version)
    
    switch (options.format) {
      case 'txt':
        return this.exportAsText(chapters, options)
      case 'markdown':
        return this.exportAsMarkdown(chapters, options)
      case 'docx':
        return this.exportAsDocx(chapters, options)
      case 'pdf':
        return this.exportAsPdf(chapters, options)
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }
  }
  
  /**
   * Generates a comparison report between two versions
   */
  async generateComparisonReport(baseVersionId: string, compareVersionId: string): Promise<string> {
    const baseVersion = this.manuscript.versions.get(baseVersionId)
    const compareVersion = this.manuscript.versions.get(compareVersionId)
    
    if (!baseVersion || !compareVersion) {
      throw new Error('One or both versions not found')
    }
    
    let report = `# Version Comparison Report\n\n`
    report += `**Base Version:** ${baseVersion.name}\n`
    report += `**Compare Version:** ${compareVersion.name}\n`
    report += `**Generated:** ${new Date().toISOString()}\n\n`
    
    // Chapter order comparison
    report += `## Chapter Order Changes\n\n`
    const baseOrder = baseVersion.chapterOrder
    const compareOrder = compareVersion.chapterOrder
    
    if (JSON.stringify(baseOrder) === JSON.stringify(compareOrder)) {
      report += '*No chapter order changes*\n\n'
    } else {
      report += '| Position | Base Version | Compare Version |\n'
      report += '|----------|--------------|----------------|\n'
      
      const maxLength = Math.max(baseOrder.length, compareOrder.length)
      for (let i = 0; i < maxLength; i++) {
        const baseChapter = baseOrder[i] ? this.getChapterTitle(baseOrder[i]) : '-'
        const compareChapter = compareOrder[i] ? this.getChapterTitle(compareOrder[i]) : '-'
        report += `| ${i + 1} | ${baseChapter} | ${compareChapter} |\n`
      }
      report += '\n'
    }
    
    // Changes summary
    report += `## Summary\n\n`
    report += `- **Base version chapters:** ${baseOrder.length}\n`
    report += `- **Compare version chapters:** ${compareOrder.length}\n`
    report += `- **Changes made:** ${compareVersion.changes.length}\n\n`
    
    if (compareVersion.changes.length > 0) {
      report += `## Change Log\n\n`
      compareVersion.changes.forEach((change, index) => {
        report += `${index + 1}. **${change.type}**: ${change.description}\n`
        report += `   - *${change.timestamp.toISOString()}*\n`
      })
    }
    
    return report
  }
  
  private getChaptersInOrder(version: ManuscriptVersion): Chapter[] {
    return version.chapterOrder
      .map(id => this.manuscript.content.chapters.find(c => c.id === id))
      .filter(Boolean) as Chapter[]
  }
  
  private async exportAsText(chapters: Chapter[], options: ExportOptions): Promise<Blob> {
    let content = ''
    
    // Title page
    const title = options.customTitle || this.manuscript.metadata.title
    const author = options.customAuthor || this.manuscript.metadata.author
    
    content += `${title.toUpperCase()}\n`
    content += `by ${author}\n\n`
    content += `${this.manuscript.metadata.wordCount.toLocaleString()} words\n\n`
    
    if (options.includeOutline) {
      content += 'OUTLINE\n'
      content += '=======\n\n'
      chapters.forEach((chapter, index) => {
        content += `Chapter ${index + 1}: ${chapter.title}\n`
        if (chapter.metadata.majorEvents.length > 0) {
          content += `   Events: ${chapter.metadata.majorEvents.join(', ')}\n`
        }
      })
      content += '\n\n'
    }
    
    // Chapters
    chapters.forEach((chapter, index) => {
      if (options.pageBreakBetweenChapters && index > 0) {
        content += '\f' // Form feed character for page break
      }
      
      content += `Chapter ${index + 1}: ${chapter.title}\n\n`
      content += chapter.content + '\n\n'
    })
    
    // Metadata
    if (options.includeMetadata) {
      content += '\n\nMETADATA\n'
      content += '=========\n\n'
      content += `Genre: ${this.manuscript.metadata.genre}\n`
      content += `Total Word Count: ${this.manuscript.metadata.wordCount.toLocaleString()}\n`
      content += `Chapter Count: ${chapters.length}\n`
      content += `Version: ${this.manuscript.versions.get(options.versionId)?.name}\n`
      content += `Last Modified: ${this.manuscript.metadata.lastModified.toISOString()}\n`
    }
    
    return new Blob([content], { type: 'text/plain;charset=utf-8' })
  }
  
  private async exportAsMarkdown(chapters: Chapter[], options: ExportOptions): Promise<Blob> {
    let content = ''
    
    // Title page
    const title = options.customTitle || this.manuscript.metadata.title
    const author = options.customAuthor || this.manuscript.metadata.author
    
    content += `# ${title}\n\n`
    content += `**by ${author}**\n\n`
    content += `*${this.manuscript.metadata.wordCount.toLocaleString()} words*\n\n`
    
    if (options.includeOutline) {
      content += '## Outline\n\n'
      chapters.forEach((chapter, index) => {
        content += `${index + 1}. **${chapter.title}** _(${chapter.wordCount} words)_\n`
        if (chapter.metadata.majorEvents.length > 0) {
          content += `   - Events: ${chapter.metadata.majorEvents.join(', ')}\n`
        }
      })
      content += '\n---\n\n'
    }
    
    // Chapters
    chapters.forEach((chapter, index) => {
      if (options.pageBreakBetweenChapters && index > 0) {
        content += '\n<div style="page-break-before: always;"></div>\n\n'
      }
      
      content += `## Chapter ${index + 1}: ${chapter.title}\n\n`
      
      // Chapter metadata
      if (options.includeNotes && (chapter.metadata.pov || chapter.metadata.location.length > 0)) {
        content += '> **Chapter Details:**\n'
        if (chapter.metadata.pov) {
          content += `> - POV: ${chapter.metadata.pov}\n`
        }
        if (chapter.metadata.location.length > 0) {
          content += `> - Location: ${chapter.metadata.location.join(', ')}\n`
        }
        if (chapter.metadata.tensionLevel) {
          content += `> - Tension Level: ${chapter.metadata.tensionLevel}/10\n`
        }
        content += '\n'
      }
      
      content += chapter.content + '\n\n'
    })
    
    // Metadata
    if (options.includeMetadata) {
      content += '---\n\n'
      content += '## Manuscript Details\n\n'
      content += `- **Genre:** ${this.manuscript.metadata.genre}\n`
      content += `- **Total Word Count:** ${this.manuscript.metadata.wordCount.toLocaleString()}\n`
      content += `- **Chapter Count:** ${chapters.length}\n`
      content += `- **Version:** ${this.manuscript.versions.get(options.versionId)?.name}\n`
      content += `- **Last Modified:** ${this.manuscript.metadata.lastModified.toLocaleDateString()}\n`
    }
    
    return new Blob([content], { type: 'text/markdown;charset=utf-8' })
  }
  
  private async exportAsDocx(chapters: Chapter[], options: ExportOptions): Promise<Blob> {
    // For a real implementation, you would use libraries like docx or mammoth
    // Here we'll create a simplified HTML version that can be opened in Word
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${options.customTitle || this.manuscript.metadata.title}</title>
    <style>
        body {
            font-family: ${options.fontFamily || 'Times New Roman'}, serif;
            font-size: ${options.fontSize || 12}pt;
            line-height: ${options.lineSpacing || 2};
            margin: ${options.margins?.top || 1}in ${options.margins?.right || 1}in ${options.margins?.bottom || 1}in ${options.margins?.left || 1}in;
            color: black;
        }
        .title-page {
            text-align: center;
            page-break-after: always;
            margin-top: 3in;
        }
        .title {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 2in;
        }
        .author {
            font-size: 18pt;
            margin-bottom: 1in;
        }
        .wordcount {
            font-size: 12pt;
            font-style: italic;
        }
        .chapter-title {
            text-align: center;
            font-weight: bold;
            margin-top: 1in;
            margin-bottom: 0.5in;
            page-break-before: ${options.pageBreakBetweenChapters ? 'always' : 'auto'};
        }
        .chapter-content {
            text-align: left;
            text-indent: 0.5in;
        }
        .outline {
            page-break-after: always;
        }
        .metadata {
            page-break-before: always;
            font-size: 10pt;
        }
        p {
            margin-bottom: 12pt;
            text-indent: 0.5in;
        }
        p:first-child {
            text-indent: 0;
        }
    </style>
</head>
<body>
`
    
    // Title page
    const title = options.customTitle || this.manuscript.metadata.title
    const author = options.customAuthor || this.manuscript.metadata.author
    
    html += `
    <div class="title-page">
        <div class="title">${title}</div>
        <div class="author">by ${author}</div>
        <div class="wordcount">${this.manuscript.metadata.wordCount.toLocaleString()} words</div>
    </div>
`
    
    // Outline
    if (options.includeOutline) {
      html += '<div class="outline"><h2>Outline</h2><ul>'
      chapters.forEach((chapter, index) => {
        html += `<li><strong>Chapter ${index + 1}: ${chapter.title}</strong> (${chapter.wordCount} words)`
        if (chapter.metadata.majorEvents.length > 0) {
          html += `<br><em>Events: ${chapter.metadata.majorEvents.join(', ')}</em>`
        }
        html += '</li>'
      })
      html += '</ul></div>'
    }
    
    // Chapters
    chapters.forEach((chapter, index) => {
      html += `<div class="chapter-title">Chapter ${index + 1}: ${chapter.title}</div>`
      html += '<div class="chapter-content">'
      
      // Convert chapter content to HTML paragraphs
      const paragraphs = chapter.content.split('\n\n')
      paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
          html += `<p>${paragraph.trim()}</p>`
        }
      })
      
      html += '</div>'
    })
    
    // Metadata
    if (options.includeMetadata) {
      html += `
      <div class="metadata">
          <h3>Manuscript Details</h3>
          <p><strong>Genre:</strong> ${this.manuscript.metadata.genre}</p>
          <p><strong>Total Word Count:</strong> ${this.manuscript.metadata.wordCount.toLocaleString()}</p>
          <p><strong>Chapter Count:</strong> ${chapters.length}</p>
          <p><strong>Version:</strong> ${this.manuscript.versions.get(options.versionId)?.name}</p>
          <p><strong>Last Modified:</strong> ${this.manuscript.metadata.lastModified.toLocaleDateString()}</p>
      </div>
`
    }
    
    html += '</body></html>'
    
    return new Blob([html], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  }
  
  private async exportAsPdf(chapters: Chapter[], options: ExportOptions): Promise<Blob> {
    // For a real implementation, you would use libraries like jsPDF or Puppeteer
    // Here we'll create a print-ready HTML version that can be printed to PDF
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${options.customTitle || this.manuscript.metadata.title}</title>
    <style>
        @page {
            size: 8.5in 11in;
            margin: ${options.margins?.top || 1}in ${options.margins?.right || 1}in ${options.margins?.bottom || 1}in ${options.margins?.left || 1}in;
        }
        
        body {
            font-family: ${options.fontFamily || 'Times New Roman'}, serif;
            font-size: ${options.fontSize || 12}pt;
            line-height: ${options.lineSpacing || 1.5};
            color: black;
            margin: 0;
            padding: 0;
        }
        
        .title-page {
            text-align: center;
            page-break-after: always;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .title {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 2in;
        }
        
        .author {
            font-size: 18pt;
            margin-bottom: 1in;
        }
        
        .wordcount {
            font-size: 12pt;
            font-style: italic;
        }
        
        .chapter-title {
            text-align: center;
            font-weight: bold;
            font-size: 16pt;
            margin-top: 1in;
            margin-bottom: 0.5in;
            page-break-before: ${options.pageBreakBetweenChapters ? 'always' : 'auto'};
        }
        
        .chapter-content {
            text-align: justify;
            hyphens: auto;
        }
        
        .chapter-content p {
            margin-bottom: 12pt;
            text-indent: 0.5in;
        }
        
        .chapter-content p:first-child {
            text-indent: 0;
        }
        
        .outline {
            page-break-after: always;
        }
        
        .metadata {
            page-break-before: always;
            font-size: 10pt;
        }
        
        h1, h2, h3 {
            font-weight: bold;
        }
        
        .page-number::after {
            content: counter(page);
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
`
    
    // Title page
    const title = options.customTitle || this.manuscript.metadata.title
    const author = options.customAuthor || this.manuscript.metadata.author
    
    html += `
    <div class="title-page">
        <div class="title">${title}</div>
        <div class="author">by ${author}</div>
        <div class="wordcount">${this.manuscript.metadata.wordCount.toLocaleString()} words</div>
    </div>
`
    
    // Outline
    if (options.includeOutline) {
      html += '<div class="outline"><h2>Outline</h2><ol>'
      chapters.forEach((chapter, index) => {
        html += `<li><strong>${chapter.title}</strong> (${chapter.wordCount} words)`
        if (chapter.metadata.majorEvents.length > 0) {
          html += `<br><em>Key events: ${chapter.metadata.majorEvents.join(', ')}</em>`
        }
        html += '</li>'
      })
      html += '</ol></div>'
    }
    
    // Chapters
    chapters.forEach((chapter, index) => {
      html += `<div class="chapter-title">Chapter ${index + 1}: ${chapter.title}</div>`
      html += '<div class="chapter-content">'
      
      // Convert chapter content to HTML paragraphs
      const paragraphs = chapter.content.split('\n\n')
      paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
          html += `<p>${paragraph.trim()}</p>`
        }
      })
      
      html += '</div>'
    })
    
    // Metadata
    if (options.includeMetadata) {
      html += `
      <div class="metadata">
          <h3>Publication Details</h3>
          <p><strong>Genre:</strong> ${this.manuscript.metadata.genre}</p>
          <p><strong>Word Count:</strong> ${this.manuscript.metadata.wordCount.toLocaleString()}</p>
          <p><strong>Chapters:</strong> ${chapters.length}</p>
          <p><strong>Version:</strong> ${this.manuscript.versions.get(options.versionId)?.name}</p>
          <p><strong>Prepared:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
`
    }
    
    html += '</body></html>'
    
    return new Blob([html], { type: 'application/pdf' })
  }
  
  private getChapterTitle(chapterId: string): string {
    const chapter = this.manuscript.content.chapters.find(c => c.id === chapterId)
    return chapter ? chapter.title : `Chapter ${chapterId}`
  }
  
  /**
   * Generates export statistics
   */
  async getExportStats(options: ExportOptions): Promise<{
    estimatedFileSize: string
    pageCount: number
    wordCount: number
    characterCount: number
  }> {
    const version = this.manuscript.versions.get(options.versionId)
    if (!version) {
      throw new Error(`Version ${options.versionId} not found`)
    }
    
    const chapters = this.getChaptersInOrder(version)
    const totalContent = chapters.map(c => c.content).join(' ')
    
    const wordCount = totalContent.split(/\s+/).length
    const characterCount = totalContent.length
    
    // Rough estimates based on format
    let estimatedBytes: number
    let pageCount: number
    
    switch (options.format) {
      case 'txt':
        estimatedBytes = characterCount * 1.1 // UTF-8 overhead
        pageCount = Math.ceil(wordCount / 250) // ~250 words per page
        break
      case 'markdown':
        estimatedBytes = characterCount * 1.2 // Markdown markup overhead
        pageCount = Math.ceil(wordCount / 250)
        break
      case 'docx':
        estimatedBytes = characterCount * 3 // XML + formatting overhead
        pageCount = Math.ceil(wordCount / 250)
        break
      case 'pdf':
        estimatedBytes = characterCount * 5 // PDF overhead
        pageCount = Math.ceil(wordCount / 250)
        break
      default:
        estimatedBytes = characterCount
        pageCount = Math.ceil(wordCount / 250)
    }
    
    const formatSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
    
    return {
      estimatedFileSize: formatSize(estimatedBytes),
      pageCount,
      wordCount,
      characterCount
    }
  }
}

export default ExportEngine