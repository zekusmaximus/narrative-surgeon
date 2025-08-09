import { SceneParser } from '../src/services/sceneParser';

describe('SceneParser', () => {
  let parser: SceneParser;

  beforeEach(() => {
    parser = new SceneParser();
  });

  describe('detectChapterBreaks', () => {
    it('should detect numbered chapters', () => {
      const text = `Chapter 1
This is the first chapter content.

Chapter 2
This is the second chapter content.`;

      const breaks = parser.detectChapterBreaks(text);
      
      expect(breaks).toHaveLength(2);
      expect(breaks[0]).toMatchObject({
        chapterNumber: 1,
        type: 'numbered'
      });
      expect(breaks[1]).toMatchObject({
        chapterNumber: 2,
        type: 'numbered'
      });
    });

    it('should detect word-based chapters', () => {
      const text = `One
First chapter content.

Two
Second chapter content.`;

      const breaks = parser.detectChapterBreaks(text);
      
      expect(breaks).toHaveLength(2);
      expect(breaks[0]).toMatchObject({
        chapterNumber: 1,
        type: 'numbered'
      });
      expect(breaks[1]).toMatchObject({
        chapterNumber: 2,
        type: 'numbered'
      });
    });

    it('should detect roman numeral chapters', () => {
      const text = `I
First chapter content.

II
Second chapter content.`;

      const breaks = parser.detectChapterBreaks(text);
      
      expect(breaks).toHaveLength(2);
      expect(breaks[0]).toMatchObject({
        chapterNumber: 1,
        type: 'numbered'
      });
      expect(breaks[1]).toMatchObject({
        chapterNumber: 2,
        type: 'numbered'
      });
    });

    it('should detect chapter markers', () => {
      const text = `***
First section content.

### Chapter Break
Second section content.`;

      const breaks = parser.detectChapterBreaks(text);
      
      expect(breaks).toHaveLength(2);
      expect(breaks[0].type).toBe('marker');
      expect(breaks[1].type).toBe('marker');
    });

    it('should create default chapter if none detected', () => {
      const text = `This is just plain text without any chapter markers.
It continues for several paragraphs.`;

      const breaks = parser.detectChapterBreaks(text);
      
      expect(breaks).toHaveLength(1);
      expect(breaks[0]).toMatchObject({
        position: 0,
        chapterNumber: 1,
        type: 'numbered'
      });
    });

    it('should handle chapters with titles', () => {
      const text = `Chapter 1: The Beginning
This is the first chapter.

Chapter 2: The Journey Continues
This is the second chapter.`;

      const breaks = parser.detectChapterBreaks(text);
      
      expect(breaks).toHaveLength(2);
      expect(breaks[0]).toMatchObject({
        chapterNumber: 1,
        title: 'The Beginning',
        type: 'numbered'
      });
      expect(breaks[1]).toMatchObject({
        chapterNumber: 2,
        title: 'The Journey Continues',
        type: 'numbered'
      });
    });
  });

  describe('segmentScenes', () => {
    it('should segment scenes within chapters', () => {
      const text = `Chapter 1
First scene of chapter one.

***

Second scene of chapter one.

Chapter 2
First scene of chapter two.`;

      const breaks = parser.detectChapterBreaks(text);
      const scenes = parser.segmentScenes(text, breaks);
      
      expect(scenes).toHaveLength(3);
      
      expect(scenes[0]).toMatchObject({
        chapterNumber: 1,
        sceneNumberInChapter: 1,
        indexInManuscript: 0
      });
      
      expect(scenes[1]).toMatchObject({
        chapterNumber: 1,
        sceneNumberInChapter: 2,
        indexInManuscript: 1
      });
      
      expect(scenes[2]).toMatchObject({
        chapterNumber: 2,
        sceneNumberInChapter: 1,
        indexInManuscript: 2
      });
    });

    it('should calculate word counts correctly', () => {
      const text = `Chapter 1
This is a short scene with exactly ten words here.

***

This scene has many more words than the previous one, containing multiple sentences and various content.`;

      const breaks = parser.detectChapterBreaks(text);
      const scenes = parser.segmentScenes(text, breaks);
      
      expect(scenes).toHaveLength(2);
      expect(scenes[0].wordCount).toBe(10);
      expect(scenes[1].wordCount).toBe(16);
    });

    it('should handle chapters with no scene breaks', () => {
      const text = `Chapter 1
This is one long scene without any internal breaks. It continues for multiple sentences and paragraphs but remains as a single scene within the chapter.`;

      const breaks = parser.detectChapterBreaks(text);
      const scenes = parser.segmentScenes(text, breaks);
      
      expect(scenes).toHaveLength(1);
      expect(scenes[0]).toMatchObject({
        chapterNumber: 1,
        sceneNumberInChapter: 1,
        indexInManuscript: 0
      });
    });
  });

  describe('markOpeningPages', () => {
    it('should mark opening pages based on word count', () => {
      const scenes = [
        { id: '1', wordCount: 800, isOpening: false } as any,
        { id: '2', wordCount: 600, isOpening: false } as any,
        { id: '3', wordCount: 400, isOpening: false } as any, // Total so far: 1800, exceeds 1250 limit
        { id: '4', wordCount: 300, isOpening: false } as any,
      ];

      const result = parser.markOpeningPages(scenes);
      
      expect(result[0].isOpening).toBe(true);  // 800 words
      expect(result[1].isOpening).toBe(true);  // 800 + 600 = 1400, still within opening
      expect(result[2].isOpening).toBe(false); // 1400 + 400 = 1800, exceeds opening
      expect(result[3].isOpening).toBe(false); // Definitely not opening
    });

    it('should handle custom words per page', () => {
      const scenes = [
        { id: '1', wordCount: 600, isOpening: false } as any,
        { id: '2', wordCount: 600, isOpening: false } as any, // Total: 1200, within 1500 limit (300*5)
        { id: '3', wordCount: 400, isOpening: false } as any, // Total: 1600, exceeds limit
      ];

      const result = parser.markOpeningPages(scenes, 300);
      
      expect(result[0].isOpening).toBe(true);
      expect(result[1].isOpening).toBe(true);
      expect(result[2].isOpening).toBe(false);
    });
  });

  describe('identifyChapterEnds', () => {
    it('should mark the last scene in each chapter as chapter end', () => {
      const scenes = [
        { id: '1', chapterNumber: 1, isChapterEnd: false } as any,
        { id: '2', chapterNumber: 1, isChapterEnd: false } as any,
        { id: '3', chapterNumber: 2, isChapterEnd: false } as any,
        { id: '4', chapterNumber: 2, isChapterEnd: false } as any,
        { id: '5', chapterNumber: 3, isChapterEnd: false } as any,
      ];

      const result = parser.identifyChapterEnds(scenes);
      
      expect(result[0].isChapterEnd).toBe(false);
      expect(result[1].isChapterEnd).toBe(true);  // Last scene of chapter 1
      expect(result[2].isChapterEnd).toBe(false);
      expect(result[3].isChapterEnd).toBe(true);  // Last scene of chapter 2
      expect(result[4].isChapterEnd).toBe(true);  // Last scene of chapter 3
    });

    it('should handle scenes without chapter numbers', () => {
      const scenes = [
        { id: '1', chapterNumber: undefined, isChapterEnd: false } as any,
        { id: '2', chapterNumber: undefined, isChapterEnd: false } as any,
      ];

      const result = parser.identifyChapterEnds(scenes);
      
      expect(result[0].isChapterEnd).toBe(false);
      expect(result[1].isChapterEnd).toBe(false);
    });
  });

  describe('integration test', () => {
    it('should process a complete manuscript correctly', () => {
      const manuscriptText = `Chapter One: The Beginning

Sarah walked through the empty house, her footsteps echoing in the silence. The moving boxes were stacked everywhere, creating a maze of cardboard and tape.

***

Later that evening, she sat on the porch steps, watching the sunset paint the sky in shades of orange and pink.

Chapter Two

The next morning brought new challenges. Sarah had to find the local grocery store, figure out the bus routes, and somehow make this foreign place feel like home.

***

By afternoon, she had managed to unpack the kitchen and make her first cup of coffee in the new house.

Chapter 3: Settling In

A week had passed since the move. Sarah finally felt like she was getting into a rhythm.`;

      const breaks = parser.detectChapterBreaks(manuscriptText);
      let scenes = parser.segmentScenes(manuscriptText, breaks);
      scenes = parser.markOpeningPages(scenes);
      scenes = parser.identifyChapterEnds(scenes);

      // Should have 3 chapters
      expect(breaks).toHaveLength(3);
      expect(breaks[0]).toMatchObject({
        chapterNumber: 1,
        title: 'The Beginning'
      });
      expect(breaks[1]).toMatchObject({
        chapterNumber: 2,
        title: undefined
      });
      expect(breaks[2]).toMatchObject({
        chapterNumber: 3,
        title: 'Settling In'
      });

      // Should have 5 scenes total (2 + 2 + 1)
      expect(scenes).toHaveLength(5);

      // Check chapter assignment
      expect(scenes[0].chapterNumber).toBe(1);
      expect(scenes[1].chapterNumber).toBe(1);
      expect(scenes[2].chapterNumber).toBe(2);
      expect(scenes[3].chapterNumber).toBe(2);
      expect(scenes[4].chapterNumber).toBe(3);

      // Check opening scenes (first ~1250 words)
      const openingScenes = scenes.filter(scene => scene.isOpening);
      expect(openingScenes.length).toBeGreaterThan(0);

      // Check chapter ends
      expect(scenes[1].isChapterEnd).toBe(true);  // Last scene of chapter 1
      expect(scenes[3].isChapterEnd).toBe(true);  // Last scene of chapter 2
      expect(scenes[4].isChapterEnd).toBe(true);  // Last scene of chapter 3

      // All scenes should have valid word counts
      scenes.forEach(scene => {
        expect(scene.wordCount).toBeGreaterThan(0);
      });
    });
  });
});