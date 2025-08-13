import { GenreAnalyzer, genreProfiles } from '../src/services/genreProfiles';

describe('GenreAnalyzer', () => {
  let analyzer: GenreAnalyzer;

  beforeEach(() => {
    analyzer = new GenreAnalyzer();
  });

  describe('getProfile', () => {
    it('should return correct profile for known genres', () => {
      const thrillerProfile = analyzer.getProfile('thriller');
      expect(thrillerProfile).toEqual(genreProfiles.thriller);
      expect(thrillerProfile.name).toBe('Thriller');
      expect(thrillerProfile.expectedPaceBeats).toBe(4);
    });

    it('should return default profile for unknown genres', () => {
      const unknownProfile = analyzer.getProfile('unknown_genre');
      expect(unknownProfile).toEqual(genreProfiles.other);
      expect(unknownProfile.name).toBe('General Fiction');
    });

    it('should handle all predefined genres', () => {
      Object.keys(genreProfiles).forEach(genre => {
        const profile = analyzer.getProfile(genre);
        expect(profile).toBeDefined();
        expect(profile.name).toBeDefined();
        expect(profile.typicalOpeningElements).toBeInstanceOf(Array);
        expect(profile.expectedPaceBeats).toBeGreaterThan(0);
        expect(profile.averageSceneLength).toBeGreaterThan(0);
        expect(profile.chapterEndExpectations).toBeInstanceOf(Array);
      });
    });
  });

  describe('analyzeOpeningAlignment', () => {
    it('should return 0 for no opening scenes', () => {
      const scenes = [
        { isOpening: false, rawText: 'Regular scene content' },
        { isOpening: false, rawText: 'Another regular scene' }
      ];

      const alignment = analyzer.analyzeOpeningAlignment(scenes, 'thriller');
      expect(alignment).toBe(0);
    });

    it('should detect action elements in thriller opening', () => {
      const scenes = [
        { 
          isOpening: true, 
          rawText: 'The protagonist ran through the dark alley as gunshots echoed behind him. He jumped over obstacles and fought his way to safety.'
        }
      ];

      const alignment = analyzer.analyzeOpeningAlignment(scenes, 'thriller');
      expect(alignment).toBeGreaterThan(0);
    });

    it('should detect character elements in literary fiction opening', () => {
      const scenes = [
        {
          isOpening: true,
          rawText: 'Sarah was the kind of person who noticed everything. She walked through the quiet house, thinking about her life.'
        }
      ];

      const alignment = analyzer.analyzeOpeningAlignment(scenes, 'literary');
      expect(alignment).toBeGreaterThan(0);
    });

    it('should detect romance elements in romance opening', () => {
      const scenes = [
        {
          isOpening: true,
          rawText: 'When Emma saw the handsome stranger across the coffee shop, her heart skipped a beat. Their eyes met and she felt an instant attraction.'
        }
      ];

      const alignment = analyzer.analyzeOpeningAlignment(scenes, 'romance');
      expect(alignment).toBeGreaterThan(0);
    });

    it('should detect mystery elements in mystery opening', () => {
      const scenes = [
        {
          isOpening: true,
          rawText: 'Detective Johnson examined the crime scene carefully, looking for clues. The mystery deepened with each piece of evidence.'
        }
      ];

      const alignment = analyzer.analyzeOpeningAlignment(scenes, 'mystery');
      expect(alignment).toBeGreaterThan(0);
    });

    it('should return higher scores for better aligned openings', () => {
      const wellAlignedScenes = [
        {
          isOpening: true,
          rawText: 'The explosion rocked the building as Agent Smith raced up the stairs. Gunfire erupted from below as dangerous enemies pursued him.'
        }
      ];

      const poorlyAlignedScenes = [
        {
          isOpening: true,
          rawText: 'It was a quiet morning. The birds were singing. Nothing much happened.'
        }
      ];

      const goodAlignment = analyzer.analyzeOpeningAlignment(wellAlignedScenes, 'thriller');
      const poorAlignment = analyzer.analyzeOpeningAlignment(poorlyAlignedScenes, 'thriller');

      expect(goodAlignment).toBeGreaterThan(poorAlignment);
    });
  });

  describe('analyzePacing', () => {
    it('should analyze scene length consistency', () => {
      const consistentScenes = [
        { wordCount: 1000, isChapterEnd: false, rawText: 'Scene 1 content' },
        { wordCount: 1100, isChapterEnd: false, rawText: 'Scene 2 content' },
        { wordCount: 950, isChapterEnd: false, rawText: 'Scene 3 content' },
        { wordCount: 1050, isChapterEnd: true, rawText: 'Scene 4 content' }
      ];

      const analysis = analyzer.analyzePacing(consistentScenes, 'literary');
      
      expect(analysis.score).toBeGreaterThan(70);
      expect(analysis.issues).toHaveLength(0);
    });

    it('should identify pacing issues with inconsistent scene lengths', () => {
      const inconsistentScenes = [
        { wordCount: 500, isChapterEnd: false, rawText: 'Very short scene' },
        { wordCount: 3000, isChapterEnd: false, rawText: 'Very long scene with lots of content' },
        { wordCount: 800, isChapterEnd: true, rawText: 'Medium scene' }
      ];

      const analysis = analyzer.analyzePacing(inconsistentScenes, 'thriller');
      
      expect(analysis.score).toBeLessThan(100);
      expect(analysis.issues.length).toBeGreaterThan(0);
    });

    it('should consider genre-specific expectations', () => {
      const scenes = [
        { wordCount: 800, isChapterEnd: false, rawText: 'Action scene' },
        { wordCount: 850, isChapterEnd: false, rawText: 'Another action scene' },
        { wordCount: 750, isChapterEnd: true, rawText: 'Final scene' }
      ];

      const thrillerAnalysis = analyzer.analyzePacing(scenes, 'thriller');
      const literaryAnalysis = analyzer.analyzePacing(scenes, 'literary');

      // Thriller expects shorter scenes (800 avg) vs literary (1200 avg)
      // So thriller should score better with these scene lengths
      expect(thrillerAnalysis.score).toBeGreaterThanOrEqual(literaryAnalysis.score);
    });

    it('should analyze chapter ending quality', () => {
      const goodEndingScenes = [
        { wordCount: 1000, isChapterEnd: false, rawText: 'Regular scene content' },
        { 
          wordCount: 1000, 
          isChapterEnd: true, 
          rawText: 'The chapter ended with a shocking revelation that changed everything. But there was more to discover.' 
        }
      ];

      const poorEndingScenes = [
        { wordCount: 1000, isChapterEnd: false, rawText: 'Regular scene content' },
        { 
          wordCount: 1000, 
          isChapterEnd: true, 
          rawText: 'And then they went to sleep. The end of the chapter was boring.' 
        }
      ];

      const goodAnalysis = analyzer.analyzePacing(goodEndingScenes, 'thriller');
      const poorAnalysis = analyzer.analyzePacing(poorEndingScenes, 'thriller');

      expect(goodAnalysis.score).toBeGreaterThanOrEqual(poorAnalysis.score);
    });
  });

  describe('getRecommendations', () => {
    it('should recommend setting genre when none specified', () => {
      const manuscriptData = {
        manuscript: { genre: undefined, title: 'Test' },
        scenes: [{ wordCount: 1000, isOpening: false, rawText: 'Content' }]
      };

      const recommendations = analyzer.getRecommendations(manuscriptData);
      
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toContain('Consider setting a genre');
    });

    it('should provide opening improvement suggestions', () => {
      const manuscriptData = {
        manuscript: { genre: 'thriller', title: 'Test Thriller' },
        scenes: [
          { 
            wordCount: 500, 
            isOpening: true, 
            rawText: 'It was a quiet day. Nothing interesting happened. The weather was nice.'
          }
        ]
      };

      const recommendations = analyzer.getRecommendations(manuscriptData);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => rec.includes('opening'))).toBe(true);
    });

    it('should suggest scene length adjustments', () => {
      const manuscriptData = {
        manuscript: { genre: 'thriller', title: 'Test Thriller' },
        scenes: [
          { wordCount: 200, isOpening: false, rawText: 'Very short' },
          { wordCount: 300, isOpening: false, rawText: 'Also short' },
          { wordCount: 250, isOpening: false, rawText: 'Short again' }
        ]
      };

      const recommendations = analyzer.getRecommendations(manuscriptData);
      
      expect(recommendations.some(rec => 
        rec.includes('expanding scenes') || rec.includes('shorter than typical')
      )).toBe(true);
    });

    it('should suggest breaking up long scenes', () => {
      const manuscriptData = {
        manuscript: { genre: 'thriller', title: 'Test Thriller' },
        scenes: [
          { wordCount: 2000, isOpening: false, rawText: 'Very long scene content' },
          { wordCount: 1800, isOpening: false, rawText: 'Another long scene' },
          { wordCount: 2200, isOpening: false, rawText: 'Yet another long scene' }
        ]
      };

      const recommendations = analyzer.getRecommendations(manuscriptData);
      
      expect(recommendations.some(rec => 
        rec.includes('breaking up') || rec.includes('longer than typical')
      )).toBe(true);
    });

    it('should provide fewer recommendations for well-structured manuscripts', () => {
      const manuscriptData = {
        manuscript: { genre: 'thriller', title: 'Well-Structured Thriller' },
        scenes: [
          { 
            wordCount: 800, 
            isOpening: true, 
            rawText: 'The explosion rocked the building as our protagonist fought dangerous enemies in an action-packed sequence.'
          },
          { wordCount: 850, isOpening: false, rawText: 'More action and character development' },
          { wordCount: 750, isOpening: false, rawText: 'Continued thriller elements' }
        ]
      };

      const recommendations = analyzer.getRecommendations(manuscriptData);
      
      // Should have fewer recommendations for a well-structured manuscript
      expect(recommendations.length).toBeLessThan(3);
    });

    it('should provide genre-specific recommendations', () => {
      const thrillerData = {
        manuscript: { genre: 'thriller', title: 'Test Thriller' },
        scenes: [{ 
          wordCount: 500, 
          isOpening: true, 
          rawText: 'A peaceful morning with birds singing and gentle sunshine.'
        }]
      };

      const romanceData = {
        manuscript: { genre: 'romance', title: 'Test Romance' },
        scenes: [{ 
          wordCount: 500, 
          isOpening: true, 
          rawText: 'The detective examined the crime scene methodically.'
        }]
      };

      const thrillerRecs = analyzer.getRecommendations(thrillerData);
      const romanceRecs = analyzer.getRecommendations(romanceData);

      // Should get different recommendations based on genre
      expect(thrillerRecs.some(rec => rec.includes('thriller'))).toBe(true);
      expect(romanceRecs.some(rec => rec.includes('romance'))).toBe(true);
    });
  });
});