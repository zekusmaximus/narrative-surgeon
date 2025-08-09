import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export interface ImportOptions {
  title?: string;
  genre?: string;
  targetAudience?: string;
  compTitles?: string[];
}

export class ManuscriptImporter {
  
  async pickDocument(): Promise<string | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return this.extractTextFromFile(asset.uri, asset.mimeType);
      
    } catch (error) {
      console.error('Failed to pick document:', error);
      throw new Error('Failed to select document');
    }
  }

  private async extractTextFromFile(uri: string, mimeType?: string): Promise<string> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // For now, only handle plain text files
      // In a real app, you'd want to add support for .docx parsing
      if (mimeType === 'text/plain' || mimeType === 'text/markdown' || uri.endsWith('.txt') || uri.endsWith('.md')) {
        const content = await FileSystem.readAsStringAsync(uri);
        return this.cleanText(content);
      }
      
      // For unsupported file types, throw an error
      throw new Error(`Unsupported file type: ${mimeType || 'unknown'}`);
      
    } catch (error) {
      console.error('Failed to extract text from file:', error);
      throw new Error('Failed to read file content');
    }
  }

  private cleanText(text: string): string {
    return text
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive whitespace but preserve intentional formatting
      .replace(/[ \t]+/g, ' ')
      // Remove more than 3 consecutive newlines
      .replace(/\n{4,}/g, '\n\n\n')
      // Trim leading/trailing whitespace
      .trim();
  }

  async importFromText(text: string, options: ImportOptions = {}): Promise<{ title: string; text: string; metadata: ImportOptions }> {
    const cleanedText = this.cleanText(text);
    
    if (cleanedText.length === 0) {
      throw new Error('Document appears to be empty');
    }

    if (cleanedText.length < 100) {
      throw new Error('Document too short (minimum 100 characters)');
    }

    // Auto-detect title if not provided
    const title = options.title || this.extractTitleFromText(cleanedText) || 'Untitled Manuscript';

    // Validate word count for reasonable manuscript size
    const wordCount = this.countWords(cleanedText);
    if (wordCount < 50) {
      throw new Error('Document too short (minimum 50 words)');
    }

    if (wordCount > 500000) {
      throw new Error('Document too large (maximum 500,000 words)');
    }

    return {
      title,
      text: cleanedText,
      metadata: {
        genre: options.genre,
        targetAudience: options.targetAudience,
        compTitles: options.compTitles,
      }
    };
  }

  private extractTitleFromText(text: string): string | null {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) return null;

    const firstLine = lines[0];
    
    // Check if first line looks like a title
    if (firstLine.length <= 100 && 
        firstLine.length >= 3 && 
        !firstLine.endsWith('.') && 
        !firstLine.includes('\t') &&
        firstLine.split(' ').length <= 15) {
      
      // Check if it's not a chapter heading
      if (!this.isChapterHeading(firstLine)) {
        return firstLine;
      }
    }

    return null;
  }

  private isChapterHeading(line: string): boolean {
    const chapterPatterns = [
      /^Chapter\s+\d+/i,
      /^Ch\.?\s+\d+/i,
      /^\d+\.?\s/,
      /^(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty)/i,
      /^(I{1,3}|IV|V|VI{0,3}|IX|X|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX)/,
      /^[#*]{3,}/,
      /^\*\*\*+/,
    ];

    return chapterPatterns.some(pattern => pattern.test(line));
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  async importFromFile(options: ImportOptions = {}): Promise<{ title: string; text: string; metadata: ImportOptions }> {
    const text = await this.pickDocument();
    
    if (!text) {
      throw new Error('No document selected');
    }

    return this.importFromText(text, options);
  }

  // Validate imported data before processing
  validateImport(data: { title: string; text: string; metadata: ImportOptions }): boolean {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }

    if (!data.text || data.text.trim().length < 100) {
      throw new Error('Text content too short');
    }

    if (data.title.length > 200) {
      throw new Error('Title too long (maximum 200 characters)');
    }

    const wordCount = this.countWords(data.text);
    if (wordCount > 500000) {
      throw new Error('Document too large');
    }

    return true;
  }
}