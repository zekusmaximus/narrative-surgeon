import { SamplePages, FontSettings, MarginSettings, HeaderSettings, Manuscript, Scene } from '../types';
import { databaseService } from './database';
import { v4 as uuidv4 } from 'uuid';

export class SamplePagesFormatter {
  private industryStandards = {
    font: {
      family: 'Times New Roman',
      size: 12,
      lineSpacing: 2.0
    },
    margins: {
      top: 1,
      bottom: 1,
      left: 1.25,
      right: 1,
      units: 'inches' as const
    },
    header: {
      includeTitle: true,
      includeAuthor: true,
      includePageNumbers: true
    },
    formatting: {
      paragraphIndent: 0.5,
      sceneBreak: '* * *',
      chapterStart: 'new_page',
      justification: 'left'
    }
  };

  async formatSamplePages(
    manuscript: Manuscript,
    pageCount: number,
    formatType: 'industry_standard' | 'agent_specific' | 'contest' = 'industry_standard',
    customSettings?: {
      font?: Partial<FontSettings>;
      margins?: Partial<MarginSettings>;
      headers?: Partial<HeaderSettings>;
    }
  ): Promise<SamplePages> {
    const scenes = await this.getManuscriptScenes(manuscript.id, pageCount);
    
    const fontSettings = this.getFontSettings(formatType, customSettings?.font);
    const marginSettings = this.getMarginSettings(formatType, customSettings?.margins);
    const headerSettings = this.getHeaderSettings(formatType, customSettings?.headers);
    
    const formattedContent = await this.formatContent(
      scenes,
      manuscript,
      pageCount,
      fontSettings,
      marginSettings,
      headerSettings
    );

    const samplePages: SamplePages = {
      id: uuidv4(),
      manuscriptId: manuscript.id,
      pageCount,
      formatType,
      content: formattedContent,
      fontSettings,
      marginSettings,
      headerSettings,
      industryStandard: this.getIndustryStandardName(formatType),
      createdAt: Date.now()
    };

    await this.saveSamplePages(samplePages);
    return samplePages;
  }

  async formatAgentSpecificSample(
    manuscript: Manuscript,
    agentRequirements: {
      pageCount: number;
      fontFamily?: string;
      fontSize?: number;
      margins?: Partial<MarginSettings>;
      headerRequirements?: string;
      specialInstructions?: string;
    }
  ): Promise<SamplePages> {
    const customFont: Partial<FontSettings> = {
      family: agentRequirements.fontFamily || this.industryStandards.font.family,
      size: agentRequirements.fontSize || this.industryStandards.font.size
    };

    const customHeaders = this.parseHeaderRequirements(agentRequirements.headerRequirements);

    return this.formatSamplePages(
      manuscript,
      agentRequirements.pageCount,
      'agent_specific',
      {
        font: customFont,
        margins: agentRequirements.margins,
        headers: customHeaders
      }
    );
  }

  async generateMultipleFormats(
    manuscript: Manuscript,
    formats: Array<{
      type: 'industry_standard' | 'agent_specific' | 'contest';
      pageCount: number;
      name: string;
      customSettings?: any;
    }>
  ): Promise<SamplePages[]> {
    const samples: SamplePages[] = [];

    for (const format of formats) {
      const sample = await this.formatSamplePages(
        manuscript,
        format.pageCount,
        format.type,
        format.customSettings
      );
      samples.push(sample);
    }

    return samples;
  }

  async exportToFormat(
    samplePages: SamplePages,
    outputFormat: 'html' | 'rtf' | 'docx_template'
  ): Promise<string> {
    switch (outputFormat) {
      case 'html':
        return this.generateHTMLFormat(samplePages);
      case 'rtf':
        return this.generateRTFFormat(samplePages);
      case 'docx_template':
        return this.generateDocxTemplate(samplePages);
      default:
        return samplePages.content;
    }
  }

  async validateFormatting(samplePages: SamplePages): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Font validation
    if (samplePages.fontSettings.size < 11 || samplePages.fontSettings.size > 14) {
      issues.push('Font size outside industry standard range (11-14pt)');
    }

    if (!['Times New Roman', 'Courier', 'Arial'].includes(samplePages.fontSettings.family)) {
      recommendations.push('Consider using Times New Roman for better industry acceptance');
    }

    // Margin validation
    if (samplePages.marginSettings.left < 1 || samplePages.marginSettings.right < 1) {
      issues.push('Margins too narrow for industry standards');
    }

    // Content validation
    const wordCount = this.countWords(samplePages.content);
    const estimatedPages = wordCount / 250; // Rough estimate
    
    if (Math.abs(estimatedPages - samplePages.pageCount) > 0.5) {
      recommendations.push(`Word count suggests ${estimatedPages.toFixed(1)} pages, but formatted for ${samplePages.pageCount}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  async getSamplePagesByManuscript(manuscriptId: string): Promise<SamplePages[]> {
    const query = `
      SELECT * FROM sample_pages 
      WHERE manuscript_id = ? 
      ORDER BY created_at DESC
    `;
    
    const rows = await databaseService.getAll(query, [manuscriptId]);
    return rows.map(row => this.mapDatabaseRow(row));
  }

  // Private helper methods
  private async getManuscriptScenes(manuscriptId: string, pageCount: number): Promise<Scene[]> {
    // Estimate how many scenes we need based on average scene length
    const estimatedScenesNeeded = Math.ceil(pageCount * 1.5);
    
    const query = `
      SELECT * FROM scenes 
      WHERE manuscript_id = ? 
      ORDER BY index_in_manuscript ASC 
      LIMIT ?
    `;
    
    const rows = await databaseService.getAll(query, [manuscriptId, estimatedScenesNeeded]);
    return rows.map(row => ({
      id: row.id,
      manuscriptId: row.manuscript_id,
      chapterNumber: row.chapter_number,
      sceneNumberInChapter: row.scene_number_in_chapter,
      indexInManuscript: row.index_in_manuscript,
      title: row.title,
      rawText: row.raw_text,
      wordCount: row.word_count,
      isOpening: Boolean(row.is_opening),
      isChapterEnd: Boolean(row.is_chapter_end),
      opensWithHook: Boolean(row.opens_with_hook),
      endsWithHook: Boolean(row.ends_with_hook),
      povCharacter: row.pov_character,
      location: row.location,
      timeMarker: row.time_marker,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  private getFontSettings(
    formatType: string,
    customFont?: Partial<FontSettings>
  ): FontSettings {
    const base = { ...this.industryStandards.font };
    
    if (formatType === 'contest') {
      base.family = 'Courier New';
      base.size = 12;
    }
    
    return { ...base, ...customFont };
  }

  private getMarginSettings(
    formatType: string,
    customMargins?: Partial<MarginSettings>
  ): MarginSettings {
    const base = { ...this.industryStandards.margins };
    
    if (formatType === 'contest') {
      base.left = 1.5;
      base.right = 1;
    }
    
    return { ...base, ...customMargins };
  }

  private getHeaderSettings(
    formatType: string,
    customHeaders?: Partial<HeaderSettings>
  ): HeaderSettings {
    const base = { ...this.industryStandards.header };
    
    if (formatType === 'contest') {
      base.includeTitle = false;
      base.includeAuthor = false;
    }
    
    return { ...base, ...customHeaders };
  }

  private async formatContent(
    scenes: Scene[],
    manuscript: Manuscript,
    pageCount: number,
    fontSettings: FontSettings,
    marginSettings: MarginSettings,
    headerSettings: HeaderSettings
  ): Promise<string> {
    let formattedText = '';
    let currentWordCount = 0;
    const targetWordCount = pageCount * 250; // Approximate words per page
    
    // Add title page elements if needed
    if (headerSettings.includeTitle) {
      formattedText += `${manuscript.title}\nby ${manuscript.author || '[Author Name]'}\n\n`;
    }

    let currentChapter = 0;
    
    for (const scene of scenes) {
      if (currentWordCount >= targetWordCount) break;
      
      // Chapter break handling
      if (scene.chapterNumber && scene.chapterNumber !== currentChapter) {
        if (currentChapter > 0) {
          formattedText += '\n\n';
        }
        formattedText += `Chapter ${scene.chapterNumber}\n\n`;
        currentChapter = scene.chapterNumber;
      }
      
      // Scene break
      if (scene.indexInManuscript > 0 && !scene.chapterNumber) {
        formattedText += '\n* * *\n\n';
      }
      
      // Scene content
      const sceneText = this.formatSceneText(scene.rawText, fontSettings);
      formattedText += sceneText + '\n\n';
      
      currentWordCount += scene.wordCount;
    }

    return this.applyFinalFormatting(formattedText, fontSettings, marginSettings);
  }

  private formatSceneText(text: string, fontSettings: FontSettings): string {
    // Basic formatting rules
    let formatted = text;
    
    // Ensure proper paragraph indentation
    formatted = formatted.replace(/^\s*([A-Z])/gm, '     $1');
    
    // Handle dialogue formatting
    formatted = formatted.replace(/^(\s*)"([^"]*)"(\s*,?\s*[a-z])/gm, '     "$2"$3');
    
    // Remove extra spaces
    formatted = formatted.replace(/\s+/g, ' ');
    
    // Ensure proper line breaks
    formatted = formatted.replace(/\n\s*\n/g, '\n\n');
    
    return formatted;
  }

  private applyFinalFormatting(
    text: string,
    fontSettings: FontSettings,
    marginSettings: MarginSettings
  ): string {
    // Apply basic text formatting
    let formatted = text;
    
    // Line spacing simulation (for plain text)
    if (fontSettings.lineSpacing === 2) {
      formatted = formatted.replace(/\n/g, '\n\n');
    }
    
    // Page breaks simulation
    const lines = formatted.split('\n');
    const linesPerPage = Math.floor(24 / (fontSettings.lineSpacing || 1));
    
    let pagedText = '';
    let lineCount = 0;
    
    for (const line of lines) {
      if (lineCount > 0 && lineCount % linesPerPage === 0) {
        pagedText += '\n[PAGE BREAK]\n\n';
      }
      pagedText += line + '\n';
      lineCount++;
    }
    
    return pagedText;
  }

  private parseHeaderRequirements(requirements?: string): Partial<HeaderSettings> {
    if (!requirements) return {};
    
    const settings: Partial<HeaderSettings> = {};
    
    if (requirements.toLowerCase().includes('no title')) {
      settings.includeTitle = false;
    }
    if (requirements.toLowerCase().includes('no author')) {
      settings.includeAuthor = false;
    }
    if (requirements.toLowerCase().includes('no page numbers')) {
      settings.includePageNumbers = false;
    }
    
    return settings;
  }

  private getIndustryStandardName(formatType: string): string {
    switch (formatType) {
      case 'industry_standard':
        return 'Standard Manuscript Format';
      case 'agent_specific':
        return 'Agent-Customized Format';
      case 'contest':
        return 'Contest Submission Format';
      default:
        return 'Custom Format';
    }
  }

  private generateHTMLFormat(samplePages: SamplePages): string {
    const { fontSettings, marginSettings } = samplePages;
    
    return `<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: "${fontSettings.family}";
            font-size: ${fontSettings.size}pt;
            line-height: ${fontSettings.lineSpacing};
            margin: ${marginSettings.top}in ${marginSettings.right}in ${marginSettings.bottom}in ${marginSettings.left}in;
            text-align: left;
        }
        .page-break {
            page-break-before: always;
        }
        .chapter {
            text-align: center;
            margin-top: 2em;
            margin-bottom: 2em;
            font-weight: bold;
        }
    </style>
</head>
<body>
    ${this.convertToHTML(samplePages.content)}
</body>
</html>`;
  }

  private generateRTFFormat(samplePages: SamplePages): string {
    const { fontSettings } = samplePages;
    
    // Basic RTF structure - this would need a proper RTF library for full implementation
    return `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 ${fontSettings.family};}}
\\f0\\fs${fontSettings.size * 2} 
${samplePages.content.replace(/\n/g, '\\par ')}
}`;
  }

  private generateDocxTemplate(samplePages: SamplePages): string {
    // This would return instructions for creating a DOCX file
    // In a full implementation, you'd use a library like docx or officegen
    return JSON.stringify({
      template: 'manuscript_submission',
      settings: {
        font: samplePages.fontSettings,
        margins: samplePages.marginSettings,
        headers: samplePages.headerSettings
      },
      content: samplePages.content
    });
  }

  private convertToHTML(content: string): string {
    return content
      .replace(/\[PAGE BREAK\]/g, '<div class="page-break"></div>')
      .replace(/^Chapter \d+$/gm, '<div class="chapter">$&</div>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^\s*\* \* \*\s*$/gm, '<div style="text-align: center; margin: 2em 0;">* * *</div>')
      .replace(/^(.*)$/, '<p>$1</p>');
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private mapDatabaseRow(row: any): SamplePages {
    return {
      id: row.id,
      manuscriptId: row.manuscript_id,
      pageCount: row.page_count,
      formatType: row.format_type,
      content: row.content,
      fontSettings: JSON.parse(row.font_settings),
      marginSettings: JSON.parse(row.margin_settings),
      headerSettings: JSON.parse(row.header_settings),
      industryStandard: row.industry_standard,
      filePath: row.file_path,
      createdAt: row.created_at
    };
  }

  private async saveSamplePages(samplePages: SamplePages): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO sample_pages 
      (id, manuscript_id, page_count, format_type, content, font_settings, 
       margin_settings, header_settings, industry_standard, file_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await databaseService.executeQuery(query, [
      samplePages.id,
      samplePages.manuscriptId,
      samplePages.pageCount,
      samplePages.formatType,
      samplePages.content,
      JSON.stringify(samplePages.fontSettings),
      JSON.stringify(samplePages.marginSettings),
      JSON.stringify(samplePages.headerSettings),
      samplePages.industryStandard,
      samplePages.filePath,
      samplePages.createdAt
    ]);
  }
}

export const samplePagesFormatter = new SamplePagesFormatter();