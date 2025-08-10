import { 
  Manuscript, 
  Scene, 
  QueryLetter, 
  Synopsis, 
  SamplePages,
  FontSettings,
  MarginSettings,
  HeaderSettings 
} from '../types';
import { databaseService } from './database';

export class ExportService {
  async exportManuscript(
    manuscriptId: string,
    format: 'pdf' | 'docx' | 'rtf' | 'txt',
    options?: {
      includeTitle?: boolean;
      includeWordCount?: boolean;
      fontSettings?: FontSettings;
      marginSettings?: MarginSettings;
      headerSettings?: HeaderSettings;
    }
  ): Promise<{
    content: string;
    filename: string;
    mimeType: string;
  }> {
    const manuscript = await this.getManuscript(manuscriptId);
    const scenes = await this.getManuscriptScenes(manuscriptId);
    
    if (!manuscript) {
      throw new Error('Manuscript not found');
    }

    const exportOptions = {
      includeTitle: options?.includeTitle ?? true,
      includeWordCount: options?.includeWordCount ?? true,
      fontSettings: options?.fontSettings || this.getDefaultFontSettings(),
      marginSettings: options?.marginSettings || this.getDefaultMarginSettings(),
      headerSettings: options?.headerSettings || this.getDefaultHeaderSettings()
    };

    let content: string;
    let mimeType: string;

    switch (format) {
      case 'pdf':
        content = this.generatePDFContent(manuscript, scenes, exportOptions);
        mimeType = 'application/pdf';
        break;
      case 'docx':
        content = this.generateDocxContent(manuscript, scenes, exportOptions);
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'rtf':
        content = this.generateRTFContent(manuscript, scenes, exportOptions);
        mimeType = 'application/rtf';
        break;
      case 'txt':
        content = this.generateTextContent(manuscript, scenes, exportOptions);
        mimeType = 'text/plain';
        break;
      default:
        throw new Error('Unsupported export format');
    }

    return {
      content,
      filename: `${manuscript.title.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`,
      mimeType
    };
  }

  async exportSubmissionPackage(
    manuscriptId: string,
    packageType: 'query_only' | 'query_synopsis' | 'full_submission',
    format: 'pdf' | 'docx' | 'rtf' = 'pdf'
  ): Promise<{
    files: Array<{
      name: string;
      content: string;
      mimeType: string;
    }>;
    packageName: string;
  }> {
    const manuscript = await this.getManuscript(manuscriptId);
    if (!manuscript) {
      throw new Error('Manuscript not found');
    }

    const files: Array<{ name: string; content: string; mimeType: string }> = [];

    // Get latest query letter
    const queryLetter = await this.getLatestQueryLetter(manuscriptId);
    if (queryLetter) {
      const queryExport = await this.exportQueryLetter(queryLetter, format);
      files.push({
        name: `query_letter.${format}`,
        content: queryExport.content,
        mimeType: queryExport.mimeType
      });
    }

    if (packageType === 'query_synopsis' || packageType === 'full_submission') {
      // Get synopsis
      const synopsis = await this.getLatestSynopsis(manuscriptId);
      if (synopsis) {
        const synopsisExport = await this.exportSynopsis(synopsis, format);
        files.push({
          name: `synopsis.${format}`,
          content: synopsisExport.content,
          mimeType: synopsisExport.mimeType
        });
      }
    }

    if (packageType === 'full_submission') {
      // Get sample pages
      const samplePages = await this.getLatestSamplePages(manuscriptId);
      if (samplePages) {
        const samplesExport = await this.exportSamplePages(samplePages, format);
        files.push({
          name: `sample_pages.${format}`,
          content: samplesExport.content,
          mimeType: samplesExport.mimeType
        });
      }
    }

    return {
      files,
      packageName: `${manuscript.title}_submission_${packageType}`
    };
  }

  async exportQueryLetter(
    queryLetter: QueryLetter,
    format: 'pdf' | 'docx' | 'rtf' | 'txt' = 'txt'
  ): Promise<{
    content: string;
    filename: string;
    mimeType: string;
  }> {
    let content: string;
    let mimeType: string;

    const manuscript = await this.getManuscript(queryLetter.manuscriptId);
    const title = manuscript?.title || 'Query Letter';

    switch (format) {
      case 'pdf':
        content = this.generatePDFDocument(queryLetter.generatedText, {
          title: 'Query Letter',
          author: manuscript?.author || '',
          fontFamily: 'Times New Roman',
          fontSize: 12
        });
        mimeType = 'application/pdf';
        break;
      case 'docx':
        content = this.generateDocxDocument(queryLetter.generatedText, {
          title: 'Query Letter'
        });
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'rtf':
        content = this.generateRTFDocument(queryLetter.generatedText);
        mimeType = 'application/rtf';
        break;
      default:
        content = queryLetter.generatedText;
        mimeType = 'text/plain';
    }

    return {
      content,
      filename: `${title.replace(/[^a-zA-Z0-9]/g, '_')}_query_letter.${format}`,
      mimeType
    };
  }

  async exportSynopsis(
    synopsis: Synopsis,
    format: 'pdf' | 'docx' | 'rtf' | 'txt' = 'txt'
  ): Promise<{
    content: string;
    filename: string;
    mimeType: string;
  }> {
    let content: string;
    let mimeType: string;

    const manuscript = await this.getManuscript(synopsis.manuscriptId);
    const title = manuscript?.title || 'Synopsis';

    switch (format) {
      case 'pdf':
        content = this.generatePDFDocument(synopsis.content, {
          title: `${title} - Synopsis (${synopsis.lengthType})`,
          author: manuscript?.author || '',
          fontFamily: 'Times New Roman',
          fontSize: 12
        });
        mimeType = 'application/pdf';
        break;
      case 'docx':
        content = this.generateDocxDocument(synopsis.content, {
          title: `Synopsis - ${synopsis.lengthType}`
        });
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'rtf':
        content = this.generateRTFDocument(synopsis.content);
        mimeType = 'application/rtf';
        break;
      default:
        content = synopsis.content;
        mimeType = 'text/plain';
    }

    return {
      content,
      filename: `${title.replace(/[^a-zA-Z0-9]/g, '_')}_synopsis_${synopsis.lengthType}.${format}`,
      mimeType
    };
  }

  async exportSamplePages(
    samplePages: SamplePages,
    format: 'pdf' | 'docx' | 'rtf' | 'txt' = 'pdf'
  ): Promise<{
    content: string;
    filename: string;
    mimeType: string;
  }> {
    let content: string;
    let mimeType: string;

    const manuscript = await this.getManuscript(samplePages.manuscriptId);
    const title = manuscript?.title || 'Sample Pages';

    switch (format) {
      case 'pdf':
        content = this.generatePDFDocument(samplePages.content, {
          title,
          author: manuscript?.author || '',
          fontFamily: samplePages.fontSettings.family,
          fontSize: samplePages.fontSettings.size,
          margins: samplePages.marginSettings,
          headers: samplePages.headerSettings
        });
        mimeType = 'application/pdf';
        break;
      case 'docx':
        content = this.generateDocxDocument(samplePages.content, {
          title,
          fontSettings: samplePages.fontSettings,
          margins: samplePages.marginSettings,
          headers: samplePages.headerSettings
        });
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'rtf':
        content = this.generateRTFDocument(samplePages.content, {
          fontSettings: samplePages.fontSettings
        });
        mimeType = 'application/rtf';
        break;
      default:
        content = samplePages.content;
        mimeType = 'text/plain';
    }

    return {
      content,
      filename: `${title.replace(/[^a-zA-Z0-9]/g, '_')}_sample_pages.${format}`,
      mimeType
    };
  }

  async generateIndustryStandardSubmission(
    manuscriptId: string,
    agentRequirements: {
      samplePageCount: number;
      synopsisLength: 'one_page' | 'two_page' | 'chapter_by_chapter';
      formatPreferences?: {
        font?: string;
        fontSize?: number;
        margins?: Partial<MarginSettings>;
      };
    }
  ): Promise<{
    queryLetter: { content: string; mimeType: string };
    synopsis: { content: string; mimeType: string };
    samplePages: { content: string; mimeType: string };
    coverLetter?: { content: string; mimeType: string };
  }> {
    const manuscript = await this.getManuscript(manuscriptId);
    if (!manuscript) {
      throw new Error('Manuscript not found');
    }

    // Get materials
    const queryLetter = await this.getLatestQueryLetter(manuscriptId);
    const synopsis = await this.getLatestSynopsis(manuscriptId, agentRequirements.synopsisLength);
    const samplePages = await this.getLatestSamplePages(manuscriptId);

    if (!queryLetter || !synopsis || !samplePages) {
      throw new Error('Required submission materials not found');
    }

    // Generate exports
    const [queryExport, synopsisExport, samplesExport] = await Promise.all([
      this.exportQueryLetter(queryLetter, 'pdf'),
      this.exportSynopsis(synopsis, 'pdf'),
      this.exportSamplePages(samplePages, 'pdf')
    ]);

    // Generate cover letter
    const coverLetter = this.generateCoverLetter(manuscript, {
      queryIncluded: true,
      synopsisIncluded: true,
      samplePagesIncluded: true,
      pageCount: agentRequirements.samplePageCount
    });

    return {
      queryLetter: queryExport,
      synopsis: synopsisExport,
      samplePages: samplesExport,
      coverLetter: {
        content: coverLetter,
        mimeType: 'text/plain'
      }
    };
  }

  // Private helper methods
  private async getManuscript(manuscriptId: string): Promise<Manuscript | null> {
    const query = 'SELECT * FROM manuscripts WHERE id = ?';
    const result = await databaseService.getFirst(query, [manuscriptId]);
    
    return result ? {
      id: result.id,
      title: result.title,
      genre: result.genre,
      targetAudience: result.target_audience,
      compTitles: JSON.parse(result.comp_titles || '[]'),
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      totalWordCount: result.total_word_count,
      openingStrengthScore: result.opening_strength_score,
      hookEffectiveness: result.hook_effectiveness,
      author: result.author // Assuming this field exists
    } : null;
  }

  private async getManuscriptScenes(manuscriptId: string): Promise<Scene[]> {
    const query = `
      SELECT * FROM scenes 
      WHERE manuscript_id = ? 
      ORDER BY index_in_manuscript ASC
    `;
    
    const rows = await databaseService.getAll(query, [manuscriptId]);
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

  private async getLatestQueryLetter(manuscriptId: string): Promise<QueryLetter | null> {
    const query = `
      SELECT * FROM query_letters 
      WHERE manuscript_id = ? 
      ORDER BY version_number DESC 
      LIMIT 1
    `;
    
    const result = await databaseService.getFirst(query, [manuscriptId]);
    return result ? {
      id: result.id,
      manuscriptId: result.manuscript_id,
      versionNumber: result.version_number,
      hook: result.hook,
      bio: result.bio,
      logline: result.logline,
      wordCount: result.word_count,
      compTitles: JSON.parse(result.comp_titles || '[]'),
      personalizationTemplate: result.personalization_template,
      generatedText: result.generated_text,
      optimizationScore: result.optimization_score,
      abTestGroup: result.ab_test_group,
      performanceMetrics: result.performance_metrics ? JSON.parse(result.performance_metrics) : undefined,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    } : null;
  }

  private async getLatestSynopsis(
    manuscriptId: string, 
    lengthType?: string
  ): Promise<Synopsis | null> {
    let query = `
      SELECT * FROM synopses 
      WHERE manuscript_id = ?
    `;
    const params = [manuscriptId];
    
    if (lengthType) {
      query += ' AND length_type = ?';
      params.push(lengthType);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 1';
    
    const result = await databaseService.getFirst(query, params);
    return result ? {
      id: result.id,
      manuscriptId: result.manuscript_id,
      lengthType: result.length_type,
      wordCount: result.word_count,
      content: result.content,
      structuralBeats: JSON.parse(result.structural_beats || '[]'),
      characterArcs: JSON.parse(result.character_arcs || '{}'),
      genreElements: JSON.parse(result.genre_elements || '[]'),
      optimizationScore: result.optimization_score,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    } : null;
  }

  private async getLatestSamplePages(manuscriptId: string): Promise<SamplePages | null> {
    const query = `
      SELECT * FROM sample_pages 
      WHERE manuscript_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await databaseService.getFirst(query, [manuscriptId]);
    return result ? {
      id: result.id,
      manuscriptId: result.manuscript_id,
      pageCount: result.page_count,
      formatType: result.format_type,
      content: result.content,
      fontSettings: JSON.parse(result.font_settings),
      marginSettings: JSON.parse(result.margin_settings),
      headerSettings: JSON.parse(result.header_settings),
      industryStandard: result.industry_standard,
      filePath: result.file_path,
      createdAt: result.created_at
    } : null;
  }

  private generatePDFContent(
    manuscript: Manuscript,
    scenes: Scene[],
    options: any
  ): string {
    // In production, this would use a PDF library like PDFKit or jsPDF
    // For now, return a template/instructions for PDF generation
    return JSON.stringify({
      type: 'pdf_instructions',
      title: manuscript.title,
      author: options.author || 'Author Name',
      content: scenes.map(scene => scene.rawText).join('\n\n'),
      formatting: {
        font: options.fontSettings,
        margins: options.marginSettings,
        headers: options.headerSettings
      }
    });
  }

  private generateDocxContent(
    manuscript: Manuscript,
    scenes: Scene[],
    options: any
  ): string {
    // In production, this would use a DOCX library like docx or officegen
    return JSON.stringify({
      type: 'docx_instructions',
      title: manuscript.title,
      content: scenes.map(scene => ({
        type: 'paragraph',
        text: scene.rawText
      })),
      formatting: options
    });
  }

  private generateRTFContent(
    manuscript: Manuscript,
    scenes: Scene[],
    options: any
  ): string {
    const fontFamily = options.fontSettings?.family || 'Times New Roman';
    const fontSize = (options.fontSettings?.size || 12) * 2; // RTF uses half-points
    
    let rtf = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 ${fontFamily};}}\n`;
    rtf += `\\f0\\fs${fontSize}\n`;
    
    if (options.includeTitle) {
      rtf += `{\\b\\fs28 ${manuscript.title}}\\par\\par\n`;
    }
    
    scenes.forEach(scene => {
      rtf += scene.rawText.replace(/\n/g, '\\par ') + '\\par\\par\n';
    });
    
    rtf += '}';
    return rtf;
  }

  private generateTextContent(
    manuscript: Manuscript,
    scenes: Scene[],
    options: any
  ): string {
    let content = '';
    
    if (options.includeTitle) {
      content += `${manuscript.title}\n`;
      content += `${'='.repeat(manuscript.title.length)}\n\n`;
    }
    
    if (options.includeWordCount) {
      content += `Word Count: ${manuscript.totalWordCount.toLocaleString()}\n\n`;
    }
    
    scenes.forEach((scene, index) => {
      if (scene.chapterNumber) {
        content += `Chapter ${scene.chapterNumber}\n\n`;
      } else if (index > 0) {
        content += '\n* * *\n\n';
      }
      
      content += scene.rawText + '\n\n';
    });
    
    return content;
  }

  private generatePDFDocument(
    text: string,
    options: {
      title: string;
      author?: string;
      fontFamily?: string;
      fontSize?: number;
      margins?: MarginSettings;
      headers?: HeaderSettings;
    }
  ): string {
    return JSON.stringify({
      type: 'pdf_document',
      title: options.title,
      author: options.author || '',
      content: text,
      formatting: {
        fontFamily: options.fontFamily || 'Times New Roman',
        fontSize: options.fontSize || 12,
        margins: options.margins || this.getDefaultMarginSettings(),
        headers: options.headers || this.getDefaultHeaderSettings()
      }
    });
  }

  private generateDocxDocument(
    text: string,
    options: {
      title: string;
      fontSettings?: FontSettings;
      margins?: MarginSettings;
      headers?: HeaderSettings;
    }
  ): string {
    return JSON.stringify({
      type: 'docx_document',
      title: options.title,
      content: text,
      formatting: {
        font: options.fontSettings || this.getDefaultFontSettings(),
        margins: options.margins || this.getDefaultMarginSettings(),
        headers: options.headers || this.getDefaultHeaderSettings()
      }
    });
  }

  private generateRTFDocument(
    text: string,
    options?: {
      fontSettings?: FontSettings;
    }
  ): string {
    const fontFamily = options?.fontSettings?.family || 'Times New Roman';
    const fontSize = (options?.fontSettings?.size || 12) * 2; // RTF uses half-points
    
    let rtf = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 ${fontFamily};}}\n`;
    rtf += `\\f0\\fs${fontSize}\n`;
    rtf += text.replace(/\n/g, '\\par ') + '\\par\n';
    rtf += '}';
    
    return rtf;
  }

  private generateCoverLetter(
    manuscript: Manuscript,
    options: {
      queryIncluded: boolean;
      synopsisIncluded: boolean;
      samplePagesIncluded: boolean;
      pageCount: number;
    }
  ): string {
    const inclusions = [];
    if (options.queryIncluded) inclusions.push('query letter');
    if (options.synopsisIncluded) inclusions.push('synopsis');
    if (options.samplePagesIncluded) inclusions.push(`first ${options.pageCount} pages`);

    return `Dear Agent,

Please find attached my submission for ${manuscript.title}, a ${manuscript.genre} novel complete at ${manuscript.totalWordCount.toLocaleString()} words.

This package includes:
${inclusions.map(item => `- ${item}`).join('\n')}

Thank you for your time and consideration.

Sincerely,
[Author Name]`;
  }

  private getDefaultFontSettings(): FontSettings {
    return {
      family: 'Times New Roman',
      size: 12,
      lineSpacing: 2.0
    };
  }

  private getDefaultMarginSettings(): MarginSettings {
    return {
      top: 1,
      bottom: 1,
      left: 1.25,
      right: 1,
      units: 'inches'
    };
  }

  private getDefaultHeaderSettings(): HeaderSettings {
    return {
      includeTitle: true,
      includeAuthor: true,
      includePageNumbers: true
    };
  }
}

export const exportService = new ExportService();