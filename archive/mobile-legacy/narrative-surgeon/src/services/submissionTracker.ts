import { 
  SubmissionRecord, 
  SubmissionStatus, 
  ResponseType, 
  Agent, 
  QueryLetter, 
  Synopsis, 
  SamplePages,
  Manuscript 
} from '../types';
import { databaseService } from './database';
import { v4 as uuidv4 } from 'uuid';

export class SubmissionTracker {
  async createSubmission(
    manuscriptId: string,
    agentId: string,
    materials: {
      queryLetterId?: string;
      synopsisId?: string;
      samplePagesId?: string;
    },
    personalizationNotes?: string
  ): Promise<SubmissionRecord> {
    const submission: SubmissionRecord = {
      id: uuidv4(),
      manuscriptId,
      agentId,
      queryLetterId: materials.queryLetterId,
      synopsisId: materials.synopsisId,
      samplePagesId: materials.samplePagesId,
      submissionDate: Date.now(),
      status: 'queued',
      personalizationNotes,
      tags: []
    };

    await this.saveSubmission(submission);
    return submission;
  }

  async updateSubmissionStatus(
    submissionId: string,
    status: SubmissionStatus,
    responseDetails?: {
      responseType?: ResponseType;
      responseDate?: number;
      notes?: string;
    }
  ): Promise<SubmissionRecord> {
    const submission = await this.getSubmission(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const updated: SubmissionRecord = {
      ...submission,
      status,
      responseDate: responseDetails?.responseDate,
      responseType: responseDetails?.responseType,
      notes: responseDetails?.notes || submission.notes
    };

    // Auto-calculate follow-up dates
    if (status === 'sent' && !updated.followUpDate) {
      updated.followUpDate = Date.now() + (90 * 24 * 60 * 60 * 1000); // 90 days
    }

    await this.saveSubmission(updated);
    return updated;
  }

  async markSubmissionSent(
    submissionId: string,
    sentDate: number = Date.now()
  ): Promise<SubmissionRecord> {
    return this.updateSubmissionStatus(submissionId, 'sent', {
      responseDate: sentDate
    });
  }

  async recordResponse(
    submissionId: string,
    responseType: ResponseType,
    responseDate: number = Date.now(),
    notes?: string
  ): Promise<SubmissionRecord> {
    const status: SubmissionStatus = 
      responseType === 'request_for_full' || responseType === 'request_for_partial' ? 'requested_full' :
      responseType === 'offer_of_representation' ? 'requested_full' :
      'rejected';

    return this.updateSubmissionStatus(submissionId, status, {
      responseType,
      responseDate,
      notes
    });
  }

  async scheduleFollowUp(submissionId: string, followUpDate: number): Promise<void> {
    const query = `
      UPDATE submission_tracking 
      SET follow_up_date = ? 
      WHERE id = ?
    `;
    
    await databaseService.executeQuery(query, [followUpDate, submissionId]);
  }

  async getSubmissionsByManuscript(
    manuscriptId: string,
    filters?: {
      status?: SubmissionStatus[];
      dateRange?: { start: number; end: number };
      agentIds?: string[];
    }
  ): Promise<SubmissionRecord[]> {
    let query = `
      SELECT * FROM submission_tracking 
      WHERE manuscript_id = ?
    `;
    const params: any[] = [manuscriptId];

    if (filters?.status && filters.status.length > 0) {
      query += ` AND status IN (${filters.status.map(() => '?').join(',')})`;
      params.push(...filters.status);
    }

    if (filters?.dateRange) {
      query += ` AND submission_date BETWEEN ? AND ?`;
      params.push(filters.dateRange.start, filters.dateRange.end);
    }

    if (filters?.agentIds && filters.agentIds.length > 0) {
      query += ` AND agent_id IN (${filters.agentIds.map(() => '?').join(',')})`;
      params.push(...filters.agentIds);
    }

    query += ` ORDER BY submission_date DESC`;

    const rows = await databaseService.getAll(query, params);
    return rows.map(row => this.mapDatabaseRow(row));
  }

  async getUpcomingFollowUps(daysAhead: number = 30): Promise<SubmissionRecord[]> {
    const cutoffDate = Date.now() + (daysAhead * 24 * 60 * 60 * 1000);
    
    const query = `
      SELECT * FROM submission_tracking 
      WHERE follow_up_date IS NOT NULL 
      AND follow_up_date <= ? 
      AND status IN ('sent', 'acknowledged', 'under_review')
      ORDER BY follow_up_date ASC
    `;

    const rows = await databaseService.getAll(query, [cutoffDate]);
    return rows.map(row => this.mapDatabaseRow(row));
  }

  async getSubmissionPipeline(manuscriptId?: string): Promise<{
    total: number;
    byStatus: Record<SubmissionStatus, number>;
    pendingFollowUps: number;
    averageResponseTime: number;
    successRate: number;
  }> {
    const baseQuery = manuscriptId 
      ? 'WHERE manuscript_id = ?'
      : '';
    const params = manuscriptId ? [manuscriptId] : [];

    // Get status counts
    const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM submission_tracking 
      ${baseQuery}
      GROUP BY status
    `;
    
    const statusRows = await databaseService.getAll(statusQuery, params);
    const byStatus: Record<SubmissionStatus, number> = {} as any;
    let total = 0;

    for (const row of statusRows) {
      byStatus[row.status as SubmissionStatus] = row.count;
      total += row.count;
    }

    // Get pending follow-ups
    const followUpQuery = `
      SELECT COUNT(*) as count 
      FROM submission_tracking 
      WHERE follow_up_date IS NOT NULL 
      AND follow_up_date <= ? 
      AND status IN ('sent', 'acknowledged', 'under_review')
      ${manuscriptId ? 'AND manuscript_id = ?' : ''}
    `;
    
    const followUpParams = [Date.now(), ...(manuscriptId ? [manuscriptId] : [])];
    const followUpResult = await databaseService.getFirst(followUpQuery, followUpParams);
    const pendingFollowUps = followUpResult?.count || 0;

    // Calculate average response time
    const responseTimeQuery = `
      SELECT AVG(response_date - submission_date) as avg_time 
      FROM submission_tracking 
      WHERE response_date IS NOT NULL 
      ${baseQuery}
    `;
    
    const responseTimeResult = await databaseService.getFirst(responseTimeQuery, params);
    const averageResponseTime = responseTimeResult?.avg_time || 0;

    // Calculate success rate (requests + offers / total responses)
    const successQuery = `
      SELECT COUNT(*) as success_count 
      FROM submission_tracking 
      WHERE response_type IN ('request_for_full', 'request_for_partial', 'offer_of_representation')
      ${baseQuery}
    `;
    
    const totalResponsesQuery = `
      SELECT COUNT(*) as total_responses 
      FROM submission_tracking 
      WHERE response_date IS NOT NULL 
      ${baseQuery}
    `;
    
    const [successResult, totalResponsesResult] = await Promise.all([
      databaseService.getFirst(successQuery, params),
      databaseService.getFirst(totalResponsesQuery, params)
    ]);
    
    const successRate = totalResponsesResult?.total_responses > 0 
      ? (successResult?.success_count || 0) / totalResponsesResult.total_responses * 100
      : 0;

    return {
      total,
      byStatus,
      pendingFollowUps,
      averageResponseTime: averageResponseTime / (24 * 60 * 60 * 1000), // Convert to days
      successRate
    };
  }

  async getAgentSubmissionHistory(agentId: string): Promise<{
    submissions: SubmissionRecord[];
    responseRate: number;
    averageResponseTime: number;
    successRate: number;
  }> {
    const submissions = await this.getSubmissionsByAgent(agentId);
    
    const totalSubmissions = submissions.length;
    const responsesReceived = submissions.filter(s => s.responseDate).length;
    const successfulResponses = submissions.filter(s => 
      s.responseType && ['request_for_full', 'request_for_partial', 'offer_of_representation'].includes(s.responseType)
    ).length;

    const responseRate = totalSubmissions > 0 ? (responsesReceived / totalSubmissions) * 100 : 0;
    const successRate = responsesReceived > 0 ? (successfulResponses / responsesReceived) * 100 : 0;

    const responseTimes = submissions
      .filter(s => s.responseDate && s.submissionDate)
      .map(s => s.responseDate! - s.submissionDate);
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / (24 * 60 * 60 * 1000)
      : 0;

    return {
      submissions,
      responseRate,
      averageResponseTime,
      successRate
    };
  }

  async addSubmissionTags(submissionId: string, tags: string[]): Promise<void> {
    const submission = await this.getSubmission(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const updatedTags = [...new Set([...submission.tags, ...tags])];
    
    const query = `
      UPDATE submission_tracking 
      SET tags = ? 
      WHERE id = ?
    `;
    
    await databaseService.executeQuery(query, [JSON.stringify(updatedTags), submissionId]);
  }

  async bulkUpdateSubmissions(
    submissionIds: string[],
    updates: {
      status?: SubmissionStatus;
      tags?: string[];
      notes?: string;
    }
  ): Promise<void> {
    for (const id of submissionIds) {
      const updateFields: string[] = [];
      const params: any[] = [];

      if (updates.status) {
        updateFields.push('status = ?');
        params.push(updates.status);
      }

      if (updates.tags) {
        updateFields.push('tags = ?');
        params.push(JSON.stringify(updates.tags));
      }

      if (updates.notes) {
        updateFields.push('notes = ?');
        params.push(updates.notes);
      }

      if (updateFields.length > 0) {
        params.push(id);
        const query = `
          UPDATE submission_tracking 
          SET ${updateFields.join(', ')} 
          WHERE id = ?
        `;
        
        await databaseService.executeQuery(query, params);
      }
    }
  }

  async generateSubmissionReport(
    manuscriptId: string,
    timeframe: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'all'
  ): Promise<{
    totalSubmissions: number;
    responseStats: {
      received: number;
      rate: number;
      averageDays: number;
    };
    outcomeBreakdown: Record<ResponseType, number>;
    topPerformingAgents: Array<{ agentId: string; successRate: number; submissions: number }>;
    timeline: Array<{ date: string; submissions: number; responses: number }>;
  }> {
    const timeRange = this.getTimeRange(timeframe);
    const submissions = await this.getSubmissionsByManuscript(manuscriptId, {
      dateRange: timeRange
    });

    const totalSubmissions = submissions.length;
    const responsesReceived = submissions.filter(s => s.responseDate).length;
    const responseRate = totalSubmissions > 0 ? (responsesReceived / totalSubmissions) * 100 : 0;

    // Calculate average response time
    const responseTimes = submissions
      .filter(s => s.responseDate)
      .map(s => s.responseDate! - s.submissionDate);
    const averageDays = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / (24 * 60 * 60 * 1000)
      : 0;

    // Outcome breakdown
    const outcomeBreakdown: Record<ResponseType, number> = {} as any;
    submissions.forEach(s => {
      if (s.responseType) {
        outcomeBreakdown[s.responseType] = (outcomeBreakdown[s.responseType] || 0) + 1;
      }
    });

    // Top performing agents
    const agentStats = new Map<string, { submissions: number; successes: number }>();
    submissions.forEach(s => {
      const current = agentStats.get(s.agentId) || { submissions: 0, successes: 0 };
      current.submissions++;
      if (s.responseType && ['request_for_full', 'request_for_partial', 'offer_of_representation'].includes(s.responseType)) {
        current.successes++;
      }
      agentStats.set(s.agentId, current);
    });

    const topPerformingAgents = Array.from(agentStats.entries())
      .map(([agentId, stats]) => ({
        agentId,
        successRate: stats.submissions > 0 ? (stats.successes / stats.submissions) * 100 : 0,
        submissions: stats.submissions
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10);

    // Timeline data (simplified)
    const timeline = this.generateTimeline(submissions, timeframe);

    return {
      totalSubmissions,
      responseStats: {
        received: responsesReceived,
        rate: responseRate,
        averageDays
      },
      outcomeBreakdown,
      topPerformingAgents,
      timeline
    };
  }

  // Private helper methods
  private async getSubmission(submissionId: string): Promise<SubmissionRecord | null> {
    const query = `
      SELECT * FROM submission_tracking 
      WHERE id = ?
    `;
    
    const result = await databaseService.getFirst(query, [submissionId]);
    return result ? this.mapDatabaseRow(result) : null;
  }

  private async getSubmissionsByAgent(agentId: string): Promise<SubmissionRecord[]> {
    const query = `
      SELECT * FROM submission_tracking 
      WHERE agent_id = ? 
      ORDER BY submission_date DESC
    `;
    
    const rows = await databaseService.getAll(query, [agentId]);
    return rows.map(row => this.mapDatabaseRow(row));
  }

  private getTimeRange(timeframe: string): { start: number; end: number } | undefined {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    switch (timeframe) {
      case 'week':
        return { start: now - (7 * day), end: now };
      case 'month':
        return { start: now - (30 * day), end: now };
      case 'quarter':
        return { start: now - (90 * day), end: now };
      case 'year':
        return { start: now - (365 * day), end: now };
      default:
        return undefined;
    }
  }

  private generateTimeline(
    submissions: SubmissionRecord[],
    timeframe: string
  ): Array<{ date: string; submissions: number; responses: number }> {
    // Simplified timeline generation
    const timeline: Array<{ date: string; submissions: number; responses: number }> = [];
    
    // Group by month for now (could be made more sophisticated)
    const monthGroups = new Map<string, { submissions: number; responses: number }>();
    
    submissions.forEach(s => {
      const date = new Date(s.submissionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const current = monthGroups.get(monthKey) || { submissions: 0, responses: 0 };
      current.submissions++;
      if (s.responseDate) current.responses++;
      monthGroups.set(monthKey, current);
    });
    
    Array.from(monthGroups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, stats]) => {
        timeline.push({ date, ...stats });
      });
    
    return timeline;
  }

  private mapDatabaseRow(row: any): SubmissionRecord {
    return {
      id: row.id,
      manuscriptId: row.manuscript_id,
      agentId: row.agent_id,
      queryLetterId: row.query_letter_id,
      synopsisId: row.synopsis_id,
      samplePagesId: row.sample_pages_id,
      submissionDate: row.submission_date,
      status: row.status,
      responseDate: row.response_date,
      responseType: row.response_type,
      personalizationNotes: row.personalization_notes,
      followUpDate: row.follow_up_date,
      notes: row.notes,
      tags: row.tags ? JSON.parse(row.tags) : []
    };
  }

  private async saveSubmission(submission: SubmissionRecord): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO submission_tracking 
      (id, manuscript_id, agent_id, query_letter_id, synopsis_id, sample_pages_id, 
       submission_date, status, response_date, response_type, personalization_notes, 
       follow_up_date, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await databaseService.executeQuery(query, [
      submission.id,
      submission.manuscriptId,
      submission.agentId,
      submission.queryLetterId,
      submission.synopsisId,
      submission.samplePagesId,
      submission.submissionDate,
      submission.status,
      submission.responseDate,
      submission.responseType,
      submission.personalizationNotes,
      submission.followUpDate,
      submission.notes,
      JSON.stringify(submission.tags)
    ]);
  }
}

export const submissionTracker = new SubmissionTracker();