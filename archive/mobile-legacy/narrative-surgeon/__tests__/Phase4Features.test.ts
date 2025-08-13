import { 
  QueryLetterGenerator,
  queryLetterGenerator 
} from '../src/services/queryLetterGenerator';
import {
  SynopsisGenerator,
  synopsisGenerator
} from '../src/services/synopsisGenerator';
import {
  SamplePagesFormatter,
  samplePagesFormatter
} from '../src/services/samplePagesFormatter';
import {
  SubmissionTracker,
  submissionTracker
} from '../src/services/submissionTracker';
import {
  AgentResearchService,
  agentResearchService
} from '../src/services/agentResearch';
import {
  SubmissionAnalyticsService,
  submissionAnalytics
} from '../src/services/submissionAnalytics';
import {
  ExportService,
  exportService
} from '../src/services/exportService';
import {
  Manuscript,
  Scene,
  Agent,
  QueryLetter,
  Synopsis,
  SamplePages,
  SubmissionRecord
} from '../src/types';

// Mock dependencies
jest.mock('../src/services/database');
jest.mock('../src/services/llmProvider');

describe('Phase 4: Agent Submission Features', () => {
  let mockManuscript: Manuscript;
  let mockScenes: Scene[];
  let mockAgent: Agent;

  beforeEach(() => {
    mockManuscript = {
      id: 'ms-test-4',
      title: 'The Digital Divide',
      genre: 'thriller',
      targetAudience: 'adult',
      compTitles: ['Gone Girl', 'The Girl with the Dragon Tattoo'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalWordCount: 85000
    };

    mockScenes = [
      {
        id: 'scene-1',
        manuscriptId: 'ms-test-4',
        indexInManuscript: 0,
        rawText: 'Detective Sarah Chen stared at the encrypted message on her screen. The killer had struck again, but this time they left a digital signature that changed everything.',
        wordCount: 26,
        isOpening: true,
        isChapterEnd: false,
        opensWithHook: true,
        endsWithHook: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'scene-2',
        manuscriptId: 'ms-test-4',
        indexInManuscript: 1,
        rawText: 'The body was found in Central Park at dawn. Tech billionaire Marcus Webb, known for his privacy advocacy, was discovered with his own encryption device embedded in his chest.',
        wordCount: 31,
        isOpening: false,
        isChapterEnd: false,
        opensWithHook: false,
        endsWithHook: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    mockAgent = {
      id: 'agent-1',
      name: 'Jennifer Walsh',
      agency: 'Writers House',
      genres: ['thriller', 'mystery', 'crime'],
      clientList: ['John Grisham', 'Lisa Gardner', 'Tess Gerritsen'],
      submissionGuidelines: {
        queryFormat: 'email',
        synopsisRequired: true,
        samplePagesCount: 10,
        samplePagesFormat: 'first_pages',
        attachmentsAllowed: true,
        responsePolicy: 'Responds to all queries within 6 weeks',
        exclusiveSubmissions: false
      },
      responseTimeDays: 42,
      acceptanceRate: 0.08,
      clientSuccessStories: [
        'Debuted NY Times bestseller with debut thriller',
        'Multi-book deal for crime series'
      ],
      socialMediaHandles: {
        twitter: '@jwalsh_agent',
        instagram: '@jwalshagent'
      },
      interviewQuotes: [
        'I love thrillers with strong female protagonists',
        'Tech elements in crime fiction are very appealing right now'
      ],
      manuscriptWishlist: [
        'Psychological thrillers',
        'Tech-savvy crime fiction',
        'Strong female detectives'
      ],
      recentDeals: [
        {
          title: 'Digital Shadows',
          author: 'Maria Santos',
          publisher: 'Random House',
          year: 2024,
          genre: 'thriller'
        }
      ],
      queryPreferences: {
        personalizationRequired: true,
        genreInSubject: true,
        compTitlesRequired: true,
        wordCountRequired: true,
        bioRequired: true
      },
      redFlags: [],
      updatedAt: Date.now()
    };
  });

  describe('QueryLetterGenerator', () => {
    it('should generate a complete query letter', async () => {
      const authorBio = 'Jane Smith is a former cybersecurity analyst with over 10 years of experience in digital forensics. She holds an MFA in Creative Writing from NYU.';
      
      const queryLetter = await queryLetterGenerator.generateQueryLetter(
        mockManuscript,
        authorBio
      );

      expect(queryLetter.id).toBeDefined();
      expect(queryLetter.manuscriptId).toBe(mockManuscript.id);
      expect(queryLetter.versionNumber).toBe(1);
      expect(queryLetter.hook).toBeDefined();
      expect(queryLetter.bio).toBe(authorBio);
      expect(queryLetter.logline).toBeDefined();
      expect(queryLetter.wordCount).toBe(mockManuscript.totalWordCount);
      expect(queryLetter.compTitles).toEqual(mockManuscript.compTitles);
      expect(queryLetter.generatedText).toBeDefined();
      expect(queryLetter.optimizationScore).toBeGreaterThan(0);
      expect(queryLetter.createdAt).toBeDefined();
      expect(queryLetter.updatedAt).toBeDefined();
    });

    it('should optimize an existing query letter', async () => {
      const originalQuery = await queryLetterGenerator.generateQueryLetter(
        mockManuscript,
        'Test bio'
      );

      const optimized = await queryLetterGenerator.optimizeQueryLetter(
        originalQuery,
        ['Stronger hook', 'Clearer stakes', 'Better genre positioning']
      );

      expect(optimized.id).not.toBe(originalQuery.id);
      expect(optimized.versionNumber).toBe(originalQuery.versionNumber + 1);
      expect(optimized.manuscriptId).toBe(originalQuery.manuscriptId);
      expect(optimized.optimizationScore).toBeGreaterThanOrEqual(originalQuery.optimizationScore || 0);
    });

    it('should personalize query letter for specific agent', async () => {
      const queryLetter = await queryLetterGenerator.generateQueryLetter(
        mockManuscript,
        'Test bio'
      );

      const personalized = await queryLetterGenerator.personalizeForAgent(
        queryLetter,
        mockAgent,
        'Mentioned recent deal with similar tech thriller'
      );

      expect(personalized).toBeDefined();
      expect(personalized.length).toBeGreaterThan(queryLetter.generatedText.length);
      expect(personalized.toLowerCase()).toContain(mockAgent.name.toLowerCase());
    });

    it('should analyze query effectiveness', async () => {
      const queryLetter = await queryLetterGenerator.generateQueryLetter(
        mockManuscript,
        'Test bio'
      );

      const analysis = await queryLetterGenerator.analyzeQueryEffectiveness(queryLetter);

      expect(analysis.strengths).toBeDefined();
      expect(Array.isArray(analysis.strengths)).toBe(true);
      expect(analysis.weaknesses).toBeDefined();
      expect(Array.isArray(analysis.weaknesses)).toBe(true);
      expect(analysis.suggestions).toBeDefined();
      expect(Array.isArray(analysis.suggestions)).toBe(true);
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(100);
    });
  });

  describe('SynopsisGenerator', () => {
    it('should generate one-page synopsis', async () => {
      const synopsis = await synopsisGenerator.generateSynopsis(
        mockManuscript,
        'one_page'
      );

      expect(synopsis.id).toBeDefined();
      expect(synopsis.manuscriptId).toBe(mockManuscript.id);
      expect(synopsis.lengthType).toBe('one_page');
      expect(synopsis.wordCount).toBeGreaterThan(200);
      expect(synopsis.wordCount).toBeLessThan(600);
      expect(synopsis.content).toBeDefined();
      expect(synopsis.structuralBeats).toBeDefined();
      expect(Array.isArray(synopsis.structuralBeats)).toBe(true);
      expect(synopsis.characterArcs).toBeDefined();
      expect(synopsis.genreElements).toBeDefined();
      expect(Array.isArray(synopsis.genreElements)).toBe(true);
    });

    it('should generate two-page synopsis', async () => {
      const synopsis = await synopsisGenerator.generateSynopsis(
        mockManuscript,
        'two_page'
      );

      expect(synopsis.lengthType).toBe('two_page');
      expect(synopsis.wordCount).toBeGreaterThan(400);
      expect(synopsis.wordCount).toBeLessThan(1200);
    });

    it('should generate chapter-by-chapter synopsis', async () => {
      const synopsis = await synopsisGenerator.generateSynopsis(
        mockManuscript,
        'chapter_by_chapter'
      );

      expect(synopsis.lengthType).toBe('chapter_by_chapter');
      expect(synopsis.wordCount).toBeGreaterThan(800);
    });

    it('should optimize synopsis based on feedback', async () => {
      const originalSynopsis = await synopsisGenerator.generateSynopsis(
        mockManuscript,
        'one_page'
      );

      const optimized = await synopsisGenerator.optimizeSynopsis(
        originalSynopsis,
        ['Clearer plot progression', 'Stronger character motivations']
      );

      expect(optimized.id).not.toBe(originalSynopsis.id);
      expect(optimized.manuscriptId).toBe(originalSynopsis.manuscriptId);
      expect(optimized.lengthType).toBe(originalSynopsis.lengthType);
      expect(optimized.optimizationScore).toBeGreaterThanOrEqual(originalSynopsis.optimizationScore || 0);
    });

    it('should analyze synopsis effectiveness', async () => {
      const synopsis = await synopsisGenerator.generateSynopsis(
        mockManuscript,
        'one_page'
      );

      const analysis = await synopsisGenerator.analyzeSynopsisEffectiveness(synopsis);

      expect(analysis.strengths).toBeDefined();
      expect(analysis.weaknesses).toBeDefined();
      expect(analysis.suggestions).toBeDefined();
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(100);
      expect(analysis.marketability).toBeGreaterThanOrEqual(0);
      expect(analysis.marketability).toBeLessThanOrEqual(100);
    });
  });

  describe('SamplePagesFormatter', () => {
    it('should format industry standard sample pages', async () => {
      const samplePages = await samplePagesFormatter.formatSamplePages(
        mockManuscript,
        10,
        'industry_standard'
      );

      expect(samplePages.id).toBeDefined();
      expect(samplePages.manuscriptId).toBe(mockManuscript.id);
      expect(samplePages.pageCount).toBe(10);
      expect(samplePages.formatType).toBe('industry_standard');
      expect(samplePages.content).toBeDefined();
      expect(samplePages.fontSettings.family).toBe('Times New Roman');
      expect(samplePages.fontSettings.size).toBe(12);
      expect(samplePages.marginSettings.units).toBe('inches');
    });

    it('should format agent-specific sample pages', async () => {
      const agentRequirements = {
        pageCount: 5,
        fontFamily: 'Arial',
        fontSize: 11,
        margins: { left: 1.5, right: 1.5 },
        specialInstructions: 'Double spaced, no headers'
      };

      const samplePages = await samplePagesFormatter.formatAgentSpecificSample(
        mockManuscript,
        agentRequirements
      );

      expect(samplePages.pageCount).toBe(5);
      expect(samplePages.formatType).toBe('agent_specific');
      expect(samplePages.fontSettings.family).toBe('Arial');
      expect(samplePages.fontSettings.size).toBe(11);
    });

    it('should validate formatting', async () => {
      const samplePages = await samplePagesFormatter.formatSamplePages(
        mockManuscript,
        10
      );

      const validation = await samplePagesFormatter.validateFormatting(samplePages);

      expect(validation.isValid).toBeDefined();
      expect(Array.isArray(validation.issues)).toBe(true);
      expect(Array.isArray(validation.recommendations)).toBe(true);
    });

    it('should export to different formats', async () => {
      const samplePages = await samplePagesFormatter.formatSamplePages(
        mockManuscript,
        5
      );

      const htmlExport = await samplePagesFormatter.exportToFormat(samplePages, 'html');
      const rtfExport = await samplePagesFormatter.exportToFormat(samplePages, 'rtf');

      expect(htmlExport).toContain('<!DOCTYPE html>');
      expect(rtfExport).toContain('{\\rtf1');
    });
  });

  describe('SubmissionTracker', () => {
    it('should create a new submission record', async () => {
      const submission = await submissionTracker.createSubmission(
        mockManuscript.id,
        mockAgent.id,
        {
          queryLetterId: 'query-1',
          synopsisId: 'synopsis-1',
          samplePagesId: 'samples-1'
        },
        'Personalized based on recent interview about tech thrillers'
      );

      expect(submission.id).toBeDefined();
      expect(submission.manuscriptId).toBe(mockManuscript.id);
      expect(submission.agentId).toBe(mockAgent.id);
      expect(submission.status).toBe('queued');
      expect(submission.queryLetterId).toBe('query-1');
      expect(submission.personalizationNotes).toBe('Personalized based on recent interview about tech thrillers');
      expect(submission.submissionDate).toBeDefined();
    });

    it('should update submission status', async () => {
      const submission = await submissionTracker.createSubmission(
        mockManuscript.id,
        mockAgent.id,
        {}
      );

      const updated = await submissionTracker.updateSubmissionStatus(
        submission.id,
        'sent',
        {
          responseDate: Date.now(),
          notes: 'Submitted via QueryTracker'
        }
      );

      expect(updated.status).toBe('sent');
      expect(updated.responseDate).toBeDefined();
      expect(updated.notes).toBe('Submitted via QueryTracker');
      expect(updated.followUpDate).toBeDefined(); // Should auto-set follow-up date
    });

    it('should record agent response', async () => {
      const submission = await submissionTracker.createSubmission(
        mockManuscript.id,
        mockAgent.id,
        {}
      );

      const updated = await submissionTracker.recordResponse(
        submission.id,
        'request_for_full',
        Date.now(),
        'Requested full manuscript within 24 hours!'
      );

      expect(updated.status).toBe('requested_full');
      expect(updated.responseType).toBe('request_for_full');
      expect(updated.notes).toBe('Requested full manuscript within 24 hours!');
    });

    it('should get submission pipeline overview', async () => {
      // Create multiple submissions
      await submissionTracker.createSubmission(mockManuscript.id, mockAgent.id, {});
      await submissionTracker.createSubmission(mockManuscript.id, 'agent-2', {});
      await submissionTracker.createSubmission(mockManuscript.id, 'agent-3', {});

      const pipeline = await submissionTracker.getSubmissionPipeline(mockManuscript.id);

      expect(pipeline.total).toBe(3);
      expect(pipeline.byStatus).toBeDefined();
      expect(pipeline.byStatus.queued).toBe(3);
      expect(pipeline.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(pipeline.successRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('AgentResearchService', () => {
    it('should find matching agents for manuscript', async () => {
      // Mock agent database
      jest.spyOn(agentResearchService, 'getAgentsByGenre').mockResolvedValue([mockAgent]);

      const matches = await agentResearchService.findMatchingAgents(mockManuscript, {
        maxResults: 10
      });

      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);
      
      if (matches.length > 0) {
        const match = matches[0];
        expect(match.manuscriptId).toBe(mockManuscript.id);
        expect(match.agentId).toBe(mockAgent.id);
        expect(match.compatibilityScore).toBeGreaterThan(0);
        expect(match.compatibilityScore).toBeLessThanOrEqual(100);
        expect(match.matchReasoning).toBeDefined();
      }
    });

    it('should calculate agent match score accurately', async () => {
      const match = await agentResearchService.calculateAgentMatch(
        mockManuscript,
        mockAgent
      );

      expect(match.compatibilityScore).toBeGreaterThan(50); // Should be good match
      expect(match.genreMatchScore).toBeDefined();
      expect(match.clientSuccessScore).toBeDefined();
      expect(match.submissionPreferencesScore).toBeDefined();
      expect(match.marketPositionScore).toBeDefined();
      expect(match.matchReasoning).toBeDefined();
    });

    it('should research agent and provide insights', async () => {
      const research = await agentResearchService.researchAgent(mockAgent.id);

      expect(research.recentInterviews).toBeDefined();
      expect(research.manuscriptWishes).toBeDefined();
      expect(research.recentSales).toBeDefined();
      expect(research.lastUpdated).toBeDefined();
    });

    it('should provide agent insights', async () => {
      jest.spyOn(agentResearchService, 'getAgent').mockResolvedValue(mockAgent);

      const insights = await agentResearchService.getAgentInsights(mockAgent.id);

      expect(['low', 'medium', 'high']).toContain(insights.competitiveness);
      expect(Array.isArray(insights.bestSubmissionTiming)).toBe(true);
      expect(Array.isArray(insights.personalizedPitchSuggestions)).toBe(true);
      expect(Array.isArray(insights.recentTrends)).toBe(true);
      expect(Array.isArray(insights.clientSuccessPatterns)).toBe(true);
    });

    it('should update agent database', async () => {
      const agentData = {
        name: 'New Agent',
        agency: 'Test Agency',
        genres: ['fiction', 'non-fiction'],
        responseTimeDays: 30
      };

      const agent = await agentResearchService.updateAgentDatabase(agentData);

      expect(agent.name).toBe('New Agent');
      expect(agent.agency).toBe('Test Agency');
      expect(agent.genres).toEqual(['fiction', 'non-fiction']);
      expect(agent.responseTimeDays).toBe(30);
      expect(agent.id).toBeDefined();
      expect(agent.updatedAt).toBeDefined();
    });
  });

  describe('SubmissionAnalyticsService', () => {
    it('should generate submission analytics', async () => {
      const analytics = await submissionAnalytics.generateAnalytics(
        mockManuscript.id,
        'all'
      );

      expect(analytics.id).toBeDefined();
      expect(analytics.manuscriptId).toBe(mockManuscript.id);
      expect(analytics.timePeriod).toBe('all');
      expect(analytics.submissionsSent).toBeGreaterThanOrEqual(0);
      expect(analytics.responsesReceived).toBeGreaterThanOrEqual(0);
      expect(analytics.responseRate).toBeGreaterThanOrEqual(0);
      expect(analytics.requestRate).toBeGreaterThanOrEqual(0);
      expect(analytics.avgResponseTime).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(analytics.topRejectionReasons)).toBe(true);
      expect(Array.isArray(analytics.optimizationSuggestions)).toBe(true);
      expect(analytics.calculatedAt).toBeDefined();
    });

    it('should provide strategic insights', async () => {
      const insights = await submissionAnalytics.getInsights(mockManuscript.id);

      expect(insights.performanceTrends).toBeDefined();
      expect(insights.competitiveAnalysis).toBeDefined();
      expect(insights.strategicRecommendations).toBeDefined();
      expect(insights.nextBestActions).toBeDefined();
      expect(Array.isArray(insights.strategicRecommendations)).toBe(true);
      expect(Array.isArray(insights.nextBestActions)).toBe(true);
    });

    it('should analyze query letter performance', async () => {
      const queryLetterId = 'query-test-1';
      
      const performance = await submissionAnalytics.analyzeQueryLetterPerformance(queryLetterId);

      expect(performance.submissionsUsed).toBeGreaterThanOrEqual(0);
      expect(performance.responseRate).toBeGreaterThanOrEqual(0);
      expect(performance.requestRate).toBeGreaterThanOrEqual(0);
      expect(performance.performanceScore).toBeGreaterThanOrEqual(0);
      expect(performance.performanceScore).toBeLessThanOrEqual(100);
      expect(performance.comparisonToOtherVersions).toBeDefined();
      expect(Array.isArray(performance.suggestions)).toBe(true);
    });

    it('should generate market analysis', async () => {
      const marketAnalysis = await submissionAnalytics.generateMarketAnalysis('thriller');

      expect(['strong', 'moderate', 'challenging']).toContain(marketAnalysis.marketHealth);
      expect(marketAnalysis.averageResponseTimes).toBeGreaterThan(0);
      expect(Array.isArray(marketAnalysis.competitiveAgents)).toBe(true);
      expect(Array.isArray(marketAnalysis.genreTrends)).toBe(true);
      expect(Array.isArray(marketAnalysis.submissionStrategy)).toBe(true);
    });

    it('should export analytics report', async () => {
      const jsonReport = await submissionAnalytics.exportAnalyticsReport(
        mockManuscript.id,
        'json'
      );
      const csvReport = await submissionAnalytics.exportAnalyticsReport(
        mockManuscript.id,
        'csv'
      );
      const summaryReport = await submissionAnalytics.exportAnalyticsReport(
        mockManuscript.id,
        'summary'
      );

      expect(typeof jsonReport).toBe('string');
      expect(() => JSON.parse(jsonReport)).not.toThrow();
      
      expect(typeof csvReport).toBe('string');
      expect(csvReport).toContain('Metric,Value');
      
      expect(typeof summaryReport).toBe('string');
      expect(summaryReport).toContain('Submission Analytics Summary');
    });
  });

  describe('ExportService', () => {
    it('should export manuscript to different formats', async () => {
      const textExport = await exportService.exportManuscript(
        mockManuscript.id,
        'txt'
      );
      const rtfExport = await exportService.exportManuscript(
        mockManuscript.id,
        'rtf'
      );

      expect(textExport.content).toBeDefined();
      expect(textExport.filename).toBe('The_Digital_Divide.txt');
      expect(textExport.mimeType).toBe('text/plain');

      expect(rtfExport.content).toBeDefined();
      expect(rtfExport.filename).toBe('The_Digital_Divide.rtf');
      expect(rtfExport.mimeType).toBe('application/rtf');
    });

    it('should export submission package', async () => {
      const submissionPackage = await exportService.exportSubmissionPackage(
        mockManuscript.id,
        'full_submission',
        'pdf'
      );

      expect(submissionPackage.packageName).toBe('The_Digital_Divide_submission_full_submission');
      expect(Array.isArray(submissionPackage.files)).toBe(true);
      
      // Should include query letter, synopsis, and sample pages
      const fileNames = submissionPackage.files.map(f => f.name);
      expect(fileNames).toContain('query_letter.pdf');
      expect(fileNames).toContain('synopsis.pdf');
      expect(fileNames).toContain('sample_pages.pdf');
    });

    it('should generate industry standard submission', async () => {
      const standardSubmission = await exportService.generateIndustryStandardSubmission(
        mockManuscript.id,
        {
          samplePageCount: 10,
          synopsisLength: 'one_page'
        }
      );

      expect(standardSubmission.queryLetter).toBeDefined();
      expect(standardSubmission.synopsis).toBeDefined();
      expect(standardSubmission.samplePages).toBeDefined();
      expect(standardSubmission.coverLetter).toBeDefined();
      
      expect(standardSubmission.queryLetter.mimeType).toBeDefined();
      expect(standardSubmission.synopsis.mimeType).toBeDefined();
      expect(standardSubmission.samplePages.mimeType).toBeDefined();
      expect(standardSubmission.coverLetter?.mimeType).toBe('text/plain');
    });
  });

  describe('Integration Tests', () => {
    it('should complete end-to-end submission workflow', async () => {
      // 1. Generate query letter
      const queryLetter = await queryLetterGenerator.generateQueryLetter(
        mockManuscript,
        'Author bio here'
      );
      expect(queryLetter.id).toBeDefined();

      // 2. Generate synopsis
      const synopsis = await synopsisGenerator.generateSynopsis(
        mockManuscript,
        'one_page'
      );
      expect(synopsis.id).toBeDefined();

      // 3. Format sample pages
      const samplePages = await samplePagesFormatter.formatSamplePages(
        mockManuscript,
        10
      );
      expect(samplePages.id).toBeDefined();

      // 4. Find matching agents
      jest.spyOn(agentResearchService, 'getAgentsByGenre').mockResolvedValue([mockAgent]);
      const matches = await agentResearchService.findMatchingAgents(mockManuscript);
      expect(matches.length).toBeGreaterThan(0);

      // 5. Create submission
      const submission = await submissionTracker.createSubmission(
        mockManuscript.id,
        matches[0].agentId,
        {
          queryLetterId: queryLetter.id,
          synopsisId: synopsis.id,
          samplePagesId: samplePages.id
        }
      );
      expect(submission.id).toBeDefined();

      // 6. Export submission package
      const submissionPackage = await exportService.exportSubmissionPackage(
        mockManuscript.id,
        'full_submission'
      );
      expect(submissionPackage.files.length).toBeGreaterThan(0);

      // 7. Generate analytics
      const analytics = await submissionAnalytics.generateAnalytics(mockManuscript.id);
      expect(analytics.id).toBeDefined();
    });

    it('should handle error scenarios gracefully', async () => {
      // Test with non-existent manuscript
      const nonExistentId = 'non-existent-manuscript';
      
      await expect(
        exportService.exportManuscript(nonExistentId, 'txt')
      ).rejects.toThrow('Manuscript not found');

      // Test with invalid agent ID
      await expect(
        agentResearchService.getAgentInsights('invalid-agent-id')
      ).rejects.toThrow('Agent not found');
    });

    it('should maintain data consistency across services', async () => {
      const queryLetter = await queryLetterGenerator.generateQueryLetter(
        mockManuscript,
        'Test bio'
      );

      const submission = await submissionTracker.createSubmission(
        mockManuscript.id,
        mockAgent.id,
        { queryLetterId: queryLetter.id }
      );

      expect(submission.queryLetterId).toBe(queryLetter.id);
      expect(submission.manuscriptId).toBe(mockManuscript.id);
      expect(submission.manuscriptId).toBe(queryLetter.manuscriptId);
    });
  });

  describe('Performance Tests', () => {
    it('should generate query letter within reasonable time', async () => {
      const startTime = Date.now();
      
      await queryLetterGenerator.generateQueryLetter(mockManuscript, 'Test bio');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 10 seconds (allowing for AI processing)
      expect(duration).toBeLessThan(10000);
    });

    it('should handle multiple concurrent operations', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          queryLetterGenerator.generateQueryLetter(mockManuscript, `Bio ${i}`)
        );
      }
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(5);
      results.forEach((result, index) => {
        expect(result.id).toBeDefined();
        expect(result.bio).toBe(`Bio ${index}`);
      });
    });
  });
});

// Additional test utilities for Phase 4 features
export const Phase4TestUtils = {
  createMockQueryLetter: (manuscriptId: string, versionNumber: number = 1): QueryLetter => ({
    id: `query-${manuscriptId}-${versionNumber}`,
    manuscriptId,
    versionNumber,
    hook: 'When detective Sarah Chen discovers a digital signature at a crime scene, she must decode a killer\'s message before they strike again.',
    bio: 'Test author bio',
    logline: 'A cybersecurity expert turned detective must use her technical skills to catch a killer who leaves digital clues.',
    wordCount: 85000,
    compTitles: ['Gone Girl', 'The Girl with the Dragon Tattoo'],
    generatedText: 'Dear Agent,\n\nI am seeking representation for The Digital Divide...',
    optimizationScore: 78,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }),

  createMockSynopsis: (manuscriptId: string, lengthType: 'one_page' | 'two_page' | 'chapter_by_chapter' = 'one_page'): Synopsis => ({
    id: `synopsis-${manuscriptId}-${lengthType}`,
    manuscriptId,
    lengthType,
    wordCount: lengthType === 'one_page' ? 400 : lengthType === 'two_page' ? 800 : 1200,
    content: `Synopsis content for ${lengthType} format...`,
    structuralBeats: ['Opening', 'Inciting Incident', 'Plot Point 1', 'Midpoint', 'Plot Point 2', 'Climax', 'Resolution'],
    characterArcs: { 'Sarah Chen': 'Detective who learns to trust her instincts' },
    genreElements: ['tech thriller', 'police procedural'],
    optimizationScore: 82,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }),

  createMockAgent: (id: string = 'agent-1'): Agent => ({
    id,
    name: `Test Agent ${id}`,
    agency: 'Test Literary Agency',
    genres: ['thriller', 'mystery'],
    clientList: ['Author One', 'Author Two'],
    submissionGuidelines: {
      queryFormat: 'email',
      synopsisRequired: true,
      samplePagesCount: 10,
      samplePagesFormat: 'first_pages',
      attachmentsAllowed: true,
      responsePolicy: 'Responds within 6 weeks',
      exclusiveSubmissions: false
    },
    responseTimeDays: 42,
    acceptanceRate: 0.1,
    clientSuccessStories: ['Bestseller success', 'Award winner'],
    socialMediaHandles: { twitter: '@testagent' },
    interviewQuotes: ['I love great thrillers'],
    manuscriptWishlist: ['Psychological thrillers'],
    recentDeals: [{
      title: 'Test Book',
      author: 'Test Author',
      publisher: 'Test Publisher',
      year: 2024,
      genre: 'thriller'
    }],
    queryPreferences: {
      personalizationRequired: true,
      genreInSubject: true,
      compTitlesRequired: true,
      wordCountRequired: true,
      bioRequired: true
    },
    redFlags: [],
    updatedAt: Date.now()
  })
};