import { 
  SubmissionAnalytics, 
  SubmissionRecord, 
  Manuscript, 
  QueryLetter, 
  Agent,
  ResponseType 
} from '../types';
import { databaseService } from './database';
import { ChunkedLLMProvider } from './llmProvider';
import { submissionTracker } from './submissionTracker';
import { v4 as uuidv4 } from 'uuid';

export class SubmissionAnalyticsService {
  private llmProvider: ChunkedLLMProvider;

  constructor() {
    this.llmProvider = new ChunkedLLMProvider();
  }

  async generateAnalytics(
    manuscriptId: string,
    timePeriod: string = 'all'
  ): Promise<SubmissionAnalytics> {
    const submissions = await this.getSubmissions(manuscriptId, timePeriod);
    
    const analytics: SubmissionAnalytics = {
      id: uuidv4(),
      manuscriptId,
      timePeriod,
      submissionsSent: submissions.length,
      responsesReceived: submissions.filter(s => s.responseDate).length,
      requestsForMore: submissions.filter(s => 
        s.responseType && ['request_for_full', 'request_for_partial'].includes(s.responseType)
      ).length,
      rejections: submissions.filter(s => 
        s.responseType && ['form_rejection', 'personalized_rejection'].includes(s.responseType)
      ).length,
      noResponses: submissions.filter(s => !s.responseDate && this.isPastDeadline(s)).length,
      responseRate: 0,
      requestRate: 0,
      avgResponseTime: 0,
      topRejectionReasons: await this.analyzeRejectionReasons(submissions),
      optimizationSuggestions: await this.generateOptimizationSuggestions(manuscriptId, submissions),
      calculatedAt: Date.now()
    };

    // Calculate rates
    if (analytics.submissionsSent > 0) {
      analytics.responseRate = (analytics.responsesReceived / analytics.submissionsSent) * 100;
    }
    
    if (analytics.responsesReceived > 0) {
      analytics.requestRate = (analytics.requestsForMore / analytics.responsesReceived) * 100;
    }

    // Calculate average response time
    const responseTimes = submissions
      .filter(s => s.responseDate)
      .map(s => s.responseDate! - s.submissionDate);
    
    if (responseTimes.length > 0) {
      analytics.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      analytics.avgResponseTime = analytics.avgResponseTime / (24 * 60 * 60 * 1000); // Convert to days
    }

    await this.saveAnalytics(analytics);
    return analytics;
  }

  async getInsights(manuscriptId: string): Promise<{
    performanceTrends: {
      responseRateChange: number;
      requestRateChange: number;
      avgResponseTimeChange: number;
    };
    competitiveAnalysis: {
      industryBenchmarks: {
        averageResponseRate: number;
        averageRequestRate: number;
        averageResponseTime: number;
      };
      yourPerformance: string;
    };
    strategicRecommendations: string[];
    nextBestActions: Array<{
      action: string;
      priority: 'high' | 'medium' | 'low';
      expectedImpact: string;
    }>;
  }> {
    const [currentAnalytics, previousAnalytics] = await Promise.all([
      this.generateAnalytics(manuscriptId, 'current_quarter'),
      this.generateAnalytics(manuscriptId, 'previous_quarter')
    ]);

    const performanceTrends = {
      responseRateChange: currentAnalytics.responseRate - (previousAnalytics?.responseRate || 0),
      requestRateChange: currentAnalytics.requestRate - (previousAnalytics?.requestRate || 0),
      avgResponseTimeChange: currentAnalytics.avgResponseTime - (previousAnalytics?.avgResponseTime || 0)
    };

    const competitiveAnalysis = {
      industryBenchmarks: {
        averageResponseRate: 65, // Industry averages
        averageRequestRate: 12,
        averageResponseTime: 45
      },
      yourPerformance: this.assessPerformanceLevel(currentAnalytics)
    };

    const strategicRecommendations = await this.generateStrategicRecommendations(
      manuscriptId, 
      currentAnalytics,
      performanceTrends
    );

    const nextBestActions = await this.identifyNextBestActions(
      manuscriptId,
      currentAnalytics,
      performanceTrends
    );

    return {
      performanceTrends,
      competitiveAnalysis,
      strategicRecommendations,
      nextBestActions
    };
  }

  async analyzeQueryLetterPerformance(
    queryLetterId: string
  ): Promise<{
    submissionsUsed: number;
    responseRate: number;
    requestRate: number;
    performanceScore: number;
    comparisonToOtherVersions: {
      betterThan: number;
      worseThan: number;
    };
    suggestions: string[];
  }> {
    const submissions = await this.getSubmissionsByQueryLetter(queryLetterId);
    const manuscript = await this.getManuscriptFromQuery(queryLetterId);
    
    if (!manuscript) {
      throw new Error('Manuscript not found for query letter');
    }

    const allVersions = await this.getAllQueryVersions(manuscript.id);
    
    const submissionsUsed = submissions.length;
    const responses = submissions.filter(s => s.responseDate).length;
    const requests = submissions.filter(s => 
      s.responseType && ['request_for_full', 'request_for_partial'].includes(s.responseType)
    ).length;

    const responseRate = submissionsUsed > 0 ? (responses / submissionsUsed) * 100 : 0;
    const requestRate = responses > 0 ? (requests / responses) * 100 : 0;
    const performanceScore = Math.round((responseRate * 0.6) + (requestRate * 0.4));

    // Compare to other versions
    const otherVersionsPerformance = await Promise.all(
      allVersions
        .filter(v => v.id !== queryLetterId)
        .map(async v => {
          const vSubmissions = await this.getSubmissionsByQueryLetter(v.id);
          const vResponses = vSubmissions.filter(s => s.responseDate).length;
          const vRequests = vSubmissions.filter(s => 
            s.responseType && ['request_for_full', 'request_for_partial'].includes(s.responseType)
          ).length;
          const vResponseRate = vSubmissions.length > 0 ? (vResponses / vSubmissions.length) * 100 : 0;
          const vRequestRate = vResponses > 0 ? (vRequests / vResponses) * 100 : 0;
          return Math.round((vResponseRate * 0.6) + (vRequestRate * 0.4));
        })
    );

    const betterThan = otherVersionsPerformance.filter(score => performanceScore > score).length;
    const worseThan = otherVersionsPerformance.filter(score => performanceScore < score).length;

    const suggestions = await this.generateQueryImprovements(queryLetterId, {
      responseRate,
      requestRate,
      performanceScore
    });

    return {
      submissionsUsed,
      responseRate,
      requestRate,
      performanceScore,
      comparisonToOtherVersions: { betterThan, worseThan },
      suggestions
    };
  }

  async generateMarketAnalysis(genre: string): Promise<{
    marketHealth: 'strong' | 'moderate' | 'challenging';
    averageResponseTimes: number;
    competitiveAgents: Array<{
      agentId: string;
      name: string;
      responseRate: number;
      recentActivity: string;
    }>;
    genreTrends: string[];
    submissionStrategy: string[];
  }> {
    // This would integrate with external market data in production
    const mockAnalysis = {
      marketHealth: 'moderate' as const,
      averageResponseTimes: 42,
      competitiveAgents: [
        {
          agentId: 'agent-1',
          name: 'Jane Smith',
          responseRate: 78,
          recentActivity: 'Recently signed 3 new clients in this genre'
        }
      ],
      genreTrends: [
        `${genre} market showing steady growth`,
        'Publishers seeking diverse voices',
        'Digital-first strategies gaining popularity'
      ],
      submissionStrategy: [
        'Target mid-tier agents for better response rates',
        'Emphasize unique market positioning',
        'Submit Tuesday-Thursday for optimal timing'
      ]
    };

    return mockAnalysis;
  }

  async trackSubmissionPatterns(manuscriptId: string): Promise<{
    optimalSubmissionDays: string[];
    bestPerformingAgentTypes: string[];
    seasonalTrends: Record<string, number>;
    responseTimePatterns: {
      fastResponders: string[];
      slowResponders: string[];
      noResponders: string[];
    };
  }> {
    const submissions = await this.getSubmissions(manuscriptId, 'all');
    
    // Analyze submission days
    const dayPerformance = new Map<string, { total: number; responses: number }>();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    submissions.forEach(sub => {
      const dayOfWeek = days[new Date(sub.submissionDate).getDay()];
      const current = dayPerformance.get(dayOfWeek) || { total: 0, responses: 0 };
      current.total++;
      if (sub.responseDate) current.responses++;
      dayPerformance.set(dayOfWeek, current);
    });

    const optimalSubmissionDays = Array.from(dayPerformance.entries())
      .sort((a, b) => (b[1].responses / b[1].total) - (a[1].responses / a[1].total))
      .slice(0, 3)
      .map(([day]) => day);

    // Analyze agent types (simplified)
    const agentTypePerformance = new Map<string, number>();
    // This would require more sophisticated agent categorization in production

    // Analyze seasonal patterns
    const seasonalTrends = {
      'Spring': this.calculateSeasonalPerformance(submissions, 'spring'),
      'Summer': this.calculateSeasonalPerformance(submissions, 'summer'),
      'Fall': this.calculateSeasonalPerformance(submissions, 'fall'),
      'Winter': this.calculateSeasonalPerformance(submissions, 'winter')
    };

    // Response time categorization
    const responseTimePatterns = this.categorizeByResponseTime(submissions);

    return {
      optimalSubmissionDays,
      bestPerformingAgentTypes: ['Mid-tier agencies', 'Genre specialists'],
      seasonalTrends,
      responseTimePatterns
    };
  }

  async exportAnalyticsReport(
    manuscriptId: string,
    format: 'json' | 'csv' | 'summary'
  ): Promise<string> {
    const analytics = await this.generateAnalytics(manuscriptId);
    const insights = await this.getInsights(manuscriptId);
    
    switch (format) {
      case 'json':
        return JSON.stringify({ analytics, insights }, null, 2);
      case 'csv':
        return this.convertToCSV(analytics);
      case 'summary':
        return this.generateSummaryReport(analytics, insights);
      default:
        return JSON.stringify(analytics, null, 2);
    }
  }

  // Private helper methods
  private async getSubmissions(
    manuscriptId: string, 
    timePeriod: string
  ): Promise<SubmissionRecord[]> {
    const timeRange = this.getTimeRange(timePeriod);
    return submissionTracker.getSubmissionsByManuscript(manuscriptId, {
      dateRange: timeRange
    });
  }

  private getTimeRange(timePeriod: string): { start: number; end: number } | undefined {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    switch (timePeriod) {
      case 'current_quarter':
        const currentQuarterStart = new Date();
        currentQuarterStart.setMonth(Math.floor(currentQuarterStart.getMonth() / 3) * 3, 1);
        return { start: currentQuarterStart.getTime(), end: now };
      case 'previous_quarter':
        const prevQuarterEnd = new Date();
        prevQuarterEnd.setMonth(Math.floor(prevQuarterEnd.getMonth() / 3) * 3, 0);
        const prevQuarterStart = new Date(prevQuarterEnd);
        prevQuarterStart.setMonth(prevQuarterStart.getMonth() - 2, 1);
        return { start: prevQuarterStart.getTime(), end: prevQuarterEnd.getTime() };
      case 'last_30_days':
        return { start: now - (30 * day), end: now };
      case 'last_90_days':
        return { start: now - (90 * day), end: now };
      default:
        return undefined;
    }
  }

  private isPastDeadline(submission: SubmissionRecord): boolean {
    const daysSinceSubmission = (Date.now() - submission.submissionDate) / (24 * 60 * 60 * 1000);
    return daysSinceSubmission > 90; // Consider 90+ days as no response
  }

  private async analyzeRejectionReasons(submissions: SubmissionRecord[]): Promise<string[]> {
    const rejections = submissions.filter(s => 
      s.responseType && ['form_rejection', 'personalized_rejection'].includes(s.responseType)
    );

    if (rejections.length === 0) return [];

    // In production, this would analyze actual rejection text
    return [
      'Not a good fit for current list',
      'Market saturation in genre',
      'Query needs stronger hook',
      'Synopsis unclear on stakes'
    ];
  }

  private async generateOptimizationSuggestions(
    manuscriptId: string,
    submissions: SubmissionRecord[]
  ): Promise<string[]> {
    const prompt = `Analyze these submission results and provide optimization suggestions:

Submissions: ${submissions.length}
Responses: ${submissions.filter(s => s.responseDate).length}
Requests: ${submissions.filter(s => s.responseType && ['request_for_full', 'request_for_partial'].includes(s.responseType)).length}
Rejections: ${submissions.filter(s => s.responseType && ['form_rejection', 'personalized_rejection'].includes(s.responseType)).length}

Common response types: ${Array.from(new Set(submissions.map(s => s.responseType).filter(Boolean))).join(', ')}

Provide 5 specific, actionable optimization suggestions.`;

    try {
      const suggestions = await this.llmProvider.callLLM('optimization-suggestions', prompt);
      return Array.isArray(suggestions) ? suggestions : [
        'Improve query letter hook strength',
        'Target agents more precisely by genre',
        'Optimize submission timing',
        'Enhance manuscript opening pages',
        'Research agent preferences more thoroughly'
      ];
    } catch (error) {
      return [
        'Review and strengthen query letter opening',
        'Research agents more thoroughly before submitting',
        'Consider revising manuscript opening pages',
        'Optimize submission timing and frequency'
      ];
    }
  }

  private assessPerformanceLevel(analytics: SubmissionAnalytics): string {
    if (analytics.responseRate >= 70 && analytics.requestRate >= 15) {
      return 'Excellent - Above industry average';
    } else if (analytics.responseRate >= 50 && analytics.requestRate >= 10) {
      return 'Good - Meeting industry standards';
    } else if (analytics.responseRate >= 30) {
      return 'Fair - Below average but improving';
    } else {
      return 'Needs improvement - Consider strategy revision';
    }
  }

  private async generateStrategicRecommendations(
    manuscriptId: string,
    analytics: SubmissionAnalytics,
    trends: any
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (analytics.responseRate < 50) {
      recommendations.push('Focus on improving query letter and synopsis quality');
      recommendations.push('Research agents more thoroughly for better targeting');
    }

    if (analytics.requestRate < 10) {
      recommendations.push('Consider revising opening pages to increase request rate');
    }

    if (analytics.avgResponseTime > 60) {
      recommendations.push('Target agents with faster response times');
    }

    if (trends.responseRateChange < 0) {
      recommendations.push('Analyze recent changes and adjust strategy accordingly');
    }

    return recommendations.length > 0 ? recommendations : [
      'Continue current strategy with minor optimizations',
      'Monitor performance trends closely'
    ];
  }

  private async identifyNextBestActions(
    manuscriptId: string,
    analytics: SubmissionAnalytics,
    trends: any
  ): Promise<Array<{ action: string; priority: 'high' | 'medium' | 'low'; expectedImpact: string }>> {
    const actions = [];

    if (analytics.responseRate < 40) {
      actions.push({
        action: 'Revise query letter with professional feedback',
        priority: 'high' as const,
        expectedImpact: 'Could improve response rate by 15-25%'
      });
    }

    if (analytics.submissionsSent < 20) {
      actions.push({
        action: 'Expand agent research and submit to 10-15 more agents',
        priority: 'high' as const,
        expectedImpact: 'Increase overall chances by expanding reach'
      });
    }

    actions.push({
      action: 'Follow up on pending submissions over 60 days',
      priority: 'medium' as const,
      expectedImpact: 'May convert some no-responses to actual responses'
    });

    return actions;
  }

  private async getSubmissionsByQueryLetter(queryLetterId: string): Promise<SubmissionRecord[]> {
    const query = `
      SELECT * FROM submission_tracking 
      WHERE query_letter_id = ?
    `;
    
    const rows = await databaseService.getAll(query, [queryLetterId]);
    return rows.map(row => submissionTracker['mapDatabaseRow'](row));
  }

  private async getManuscriptFromQuery(queryLetterId: string): Promise<Manuscript | null> {
    const query = `
      SELECT m.* FROM manuscripts m 
      JOIN query_letters q ON m.id = q.manuscript_id 
      WHERE q.id = ?
    `;
    
    const result = await databaseService.getFirst(query, [queryLetterId]);
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
      hookEffectiveness: result.hook_effectiveness
    } : null;
  }

  private async getAllQueryVersions(manuscriptId: string): Promise<QueryLetter[]> {
    const query = `
      SELECT * FROM query_letters 
      WHERE manuscript_id = ? 
      ORDER BY version_number ASC
    `;
    
    const rows = await databaseService.getAll(query, [manuscriptId]);
    return rows.map(row => ({
      id: row.id,
      manuscriptId: row.manuscript_id,
      versionNumber: row.version_number,
      hook: row.hook,
      bio: row.bio,
      logline: row.logline,
      wordCount: row.word_count,
      compTitles: JSON.parse(row.comp_titles || '[]'),
      personalizationTemplate: row.personalization_template,
      generatedText: row.generated_text,
      optimizationScore: row.optimization_score,
      abTestGroup: row.ab_test_group,
      performanceMetrics: row.performance_metrics ? JSON.parse(row.performance_metrics) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  private async generateQueryImprovements(
    queryLetterId: string,
    performance: { responseRate: number; requestRate: number; performanceScore: number }
  ): Promise<string[]> {
    if (performance.responseRate < 40) {
      return [
        'Strengthen opening hook to grab attention faster',
        'Clarify the stakes and consequences',
        'Make the genre and target audience more explicit',
        'Shorten and tighten the query overall'
      ];
    }

    if (performance.requestRate < 10) {
      return [
        'Improve the synopsis to show stronger plot structure',
        'Enhance the character development arc description',
        'Add more compelling conflict details',
        'Review and strengthen sample pages'
      ];
    }

    return [
      'Fine-tune personalization for each agent',
      'Consider A/B testing different approaches',
      'Optimize submission timing'
    ];
  }

  private calculateSeasonalPerformance(
    submissions: SubmissionRecord[],
    season: string
  ): number {
    const seasonalSubmissions = submissions.filter(s => {
      const month = new Date(s.submissionDate).getMonth();
      switch (season) {
        case 'spring': return month >= 2 && month <= 4;
        case 'summer': return month >= 5 && month <= 7;
        case 'fall': return month >= 8 && month <= 10;
        case 'winter': return month === 11 || month <= 1;
        default: return false;
      }
    });

    const responses = seasonalSubmissions.filter(s => s.responseDate).length;
    return seasonalSubmissions.length > 0 ? (responses / seasonalSubmissions.length) * 100 : 0;
  }

  private categorizeByResponseTime(submissions: SubmissionRecord[]): {
    fastResponders: string[];
    slowResponders: string[];
    noResponders: string[];
  } {
    const responded = submissions.filter(s => s.responseDate);
    const notResponded = submissions.filter(s => !s.responseDate);

    const fast = responded.filter(s => (s.responseDate! - s.submissionDate) <= (14 * 24 * 60 * 60 * 1000));
    const slow = responded.filter(s => (s.responseDate! - s.submissionDate) > (60 * 24 * 60 * 60 * 1000));

    return {
      fastResponders: fast.map(s => s.agentId).slice(0, 10),
      slowResponders: slow.map(s => s.agentId).slice(0, 10),
      noResponders: notResponded.filter(s => this.isPastDeadline(s)).map(s => s.agentId).slice(0, 10)
    };
  }

  private convertToCSV(analytics: SubmissionAnalytics): string {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Submissions Sent', analytics.submissionsSent.toString()],
      ['Responses Received', analytics.responsesReceived.toString()],
      ['Response Rate', `${analytics.responseRate.toFixed(1)}%`],
      ['Requests for More', analytics.requestsForMore.toString()],
      ['Request Rate', `${analytics.requestRate.toFixed(1)}%`],
      ['Average Response Time (Days)', analytics.avgResponseTime.toFixed(1)],
      ['Rejections', analytics.rejections.toString()],
      ['No Responses', analytics.noResponses.toString()]
    ];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private generateSummaryReport(analytics: SubmissionAnalytics, insights: any): string {
    return `Submission Analytics Summary

Performance Overview:
- Submissions Sent: ${analytics.submissionsSent}
- Response Rate: ${analytics.responseRate.toFixed(1)}%
- Request Rate: ${analytics.requestRate.toFixed(1)}%
- Average Response Time: ${analytics.avgResponseTime.toFixed(1)} days

Key Insights:
${insights.strategicRecommendations.map((rec: string) => `- ${rec}`).join('\n')}

Next Actions:
${insights.nextBestActions.map((action: any) => `- ${action.action} (${action.priority} priority)`).join('\n')}

Generated: ${new Date().toLocaleDateString()}`;
  }

  private async saveAnalytics(analytics: SubmissionAnalytics): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO submission_analytics 
      (id, manuscript_id, time_period, submissions_sent, responses_received, 
       requests_for_more, rejections, no_responses, response_rate, request_rate, 
       avg_response_time, top_rejection_reasons, optimization_suggestions, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await databaseService.executeQuery(query, [
      analytics.id,
      analytics.manuscriptId,
      analytics.timePeriod,
      analytics.submissionsSent,
      analytics.responsesReceived,
      analytics.requestsForMore,
      analytics.rejections,
      analytics.noResponses,
      analytics.responseRate,
      analytics.requestRate,
      analytics.avgResponseTime,
      JSON.stringify(analytics.topRejectionReasons),
      JSON.stringify(analytics.optimizationSuggestions),
      analytics.calculatedAt
    ]);
  }
}

export const submissionAnalytics = new SubmissionAnalyticsService();