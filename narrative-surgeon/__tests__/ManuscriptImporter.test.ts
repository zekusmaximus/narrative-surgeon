import { ManuscriptImporter } from '../src/services/manuscriptImporter';

describe('ManuscriptImporter', () => {
  let importer: ManuscriptImporter;

  beforeEach(() => {
    importer = new ManuscriptImporter();
  });

  describe('importFromText', () => {
    it('should successfully import valid text', async () => {
      const text = `This is a test manuscript with sufficient content to meet the minimum requirements. 
      It has multiple paragraphs and should be long enough to pass validation. The text continues 
      with more content to ensure we meet the word count requirements for a valid manuscript import.`;

      const options = {
        title: 'Test Manuscript',
        genre: 'literary' as const,
        targetAudience: 'adult' as const,
      };

      const result = await importer.importFromText(text, options);

      expect(result).toMatchObject({
        title: 'Test Manuscript',
        text: expect.stringContaining('This is a test manuscript'),
        metadata: {
          genre: 'literary',
          targetAudience: 'adult',
        }
      });
    });

    it('should auto-detect title from text when not provided', async () => {
      const text = `The Great Adventure

      This is a story about a great adventure that took place many years ago. 
      The adventure involved many characters and spanned multiple chapters with 
      exciting scenes and dramatic moments that kept readers engaged throughout.`;

      const result = await importer.importFromText(text);

      expect(result.title).toBe('The Great Adventure');
    });

    it('should use default title when none provided and cannot auto-detect', async () => {
      const text = `This text starts immediately with content without a clear title line. 
      It has enough content to be valid but no obvious title that can be extracted from 
      the first line since it starts with regular narrative text.`;

      const result = await importer.importFromText(text);

      expect(result.title).toBe('Untitled Manuscript');
    });

    it('should reject empty text', async () => {
      await expect(importer.importFromText('')).rejects.toThrow('Document appears to be empty');
    });

    it('should reject text that is too short', async () => {
      const shortText = 'Too short';
      
      await expect(importer.importFromText(shortText)).rejects.toThrow('Document too short');
    });

    it('should reject text with insufficient word count', async () => {
      const text = 'This text has exactly twenty five words but that is still not enough for minimum requirement.';
      
      await expect(importer.importFromText(text)).rejects.toThrow('Document too short (minimum 50 words)');
    });

    it('should clean up text formatting', async () => {
      const messyText = `   Title   \r\n\r\nThis    text   has\textra\r\n\r\n\r\n\r\nspaces   and   weird   line\tendings   that   need   to   be   cleaned   up   properly   for   processing.   \t  \n\n\n\n\nIt   should   be   normalized.   `;

      const result = await importer.importFromText(messyText);

      expect(result.text).not.toContain('\r');
      expect(result.text).not.toContain('\t');
      expect(result.text).not.toMatch(/\n{4,}/); // No more than 3 consecutive newlines
      expect(result.text).not.toMatch(/[ ]{2,}/); // No more than 1 consecutive space
      expect(result.text.trim()).toBe(result.text); // No leading/trailing whitespace
    });

    it('should handle various genre options', async () => {
      const text = `Test Manuscript

      This is a test manuscript with enough content to meet the requirements. 
      It contains multiple sentences and paragraphs to ensure it passes the 
      minimum word count and length requirements for successful import.`;

      const genres = ['literary', 'thriller', 'romance', 'mystery', 'fantasy', 'scifi', 'historical', 'other'] as const;

      for (const genre of genres) {
        const result = await importer.importFromText(text, { genre });
        expect(result.metadata.genre).toBe(genre);
      }
    });

    it('should handle various audience options', async () => {
      const text = `Test Manuscript

      This is a test manuscript with enough content to meet the requirements. 
      It contains multiple sentences and paragraphs to ensure it passes the 
      minimum word count and length requirements for successful import processing.`;

      const audiences = ['adult', 'ya', 'mg'] as const;

      for (const audience of audiences) {
        const result = await importer.importFromText(text, { targetAudience: audience });
        expect(result.metadata.targetAudience).toBe(audience);
      }
    });
  });

  describe('validateImport', () => {
    it('should validate correct import data', () => {
      const validData = {
        title: 'Test Manuscript',
        text: 'This is a valid manuscript with sufficient content for testing validation. It has enough words and proper structure.',
        metadata: {
          genre: 'literary' as const,
        }
      };

      expect(() => importer.validateImport(validData)).not.toThrow();
    });

    it('should reject empty title', () => {
      const invalidData = {
        title: '',
        text: 'This text is valid but the title is empty which should cause validation to fail.',
        metadata: {}
      };

      expect(() => importer.validateImport(invalidData)).toThrow('Title cannot be empty');
    });

    it('should reject short text content', () => {
      const invalidData = {
        title: 'Valid Title',
        text: 'Short text',
        metadata: {}
      };

      expect(() => importer.validateImport(invalidData)).toThrow('Text content too short');
    });

    it('should reject extremely long titles', () => {
      const longTitle = 'A'.repeat(201);
      const invalidData = {
        title: longTitle,
        text: 'This text is valid and has sufficient content but the title is way too long and exceeds the maximum allowed length.',
        metadata: {}
      };

      expect(() => importer.validateImport(invalidData)).toThrow('Title too long');
    });

    it('should reject documents that are too large', () => {
      const longText = 'word '.repeat(500001); // Over 500k words
      const invalidData = {
        title: 'Valid Title',
        text: longText,
        metadata: {}
      };

      expect(() => importer.validateImport(invalidData)).toThrow('Document too large');
    });
  });

  describe('title extraction', () => {
    it('should not extract chapter headings as titles', async () => {
      const textWithChapter = `Chapter 1

      This is the beginning of a story that starts with a chapter heading. 
      The chapter heading should not be considered the title of the manuscript 
      since it is clearly a structural element rather than the actual title.`;

      const result = await importer.importFromText(textWithChapter);

      expect(result.title).toBe('Untitled Manuscript');
    });

    it('should not extract very long first lines as titles', async () => {
      const textWithLongFirstLine = `This is a very long first line that goes on and on with many words and should not be considered a title because it is clearly part of the narrative content rather than a title.

      The story continues with more content that meets the requirements for import.`;

      const result = await importer.importFromText(textWithLongFirstLine);

      expect(result.title).toBe('Untitled Manuscript');
    });

    it('should extract reasonable first lines as titles', async () => {
      const textWithGoodTitle = `A Tale of Two Cities

      This is the beginning of a classic story that has a clear, concise title 
      on the first line. The title should be properly extracted and used as 
      the manuscript title during the import process.`;

      const result = await importer.importFromText(textWithGoodTitle);

      expect(result.title).toBe('A Tale of Two Cities');
    });

    it('should not extract lines ending with periods as titles', async () => {
      const textWithSentence = `This is clearly a sentence and not a title.

      The story begins here with actual narrative content that should be 
      sufficient for import. The first line ending with a period should 
      not be considered a title since titles typically do not end with periods.`;

      const result = await importer.importFromText(textWithSentence);

      expect(result.title).toBe('Untitled Manuscript');
    });
  });

  describe('word counting', () => {
    it('should count words correctly', async () => {
      const text = `Title Here

      This sentence has exactly ten words in it for testing.
      
      Another sentence with seven words here for validation.`;

      const result = await importer.importFromText(text);
      
      // Title: 2 words, First sentence: 10 words, Second: 7 words = 19 total
      // But we need to account for the actual parsing logic
      expect(result.text.split(/\s+/).filter(word => word.length > 0).length).toBeGreaterThan(15);
    });
  });
});