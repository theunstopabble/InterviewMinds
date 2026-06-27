import { v4 as uuidv4 } from 'uuid';
import { ReportModel } from '../models/Report';
import { ReportTemplateModel } from '../models/ReportTemplate';

export interface CandidateInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  LinkedIn?: string;
  github?: string;
}

export interface InterviewSummary {
  id: string;
  date: Date;
  duration: number;
  type: string;
  role: string;
  interviewer: string;
  score: number;
}

export interface ReportData {
  reportId: string;
  candidate: CandidateInfo;
  interviews: InterviewSummary[];
  overallScore: number;
  recommendation: string;
  strengths: string[];
  weaknesses: string[];
  detailedScores: {
    category: string;
    score: number;
    maxScore: number;
    feedback: string;
  }[];
  proctoringReport?: {
    violations: number;
    riskLevel: 'low' | 'medium' | 'high';
    facePresence: number;
    eyeContact: number;
  };
  generatedAt: Date;
  expiresAt: Date;
}

export interface ReportTemplate {
  id: string;
  name: string;
  logo?: string;
  primaryColor: string;
  includeProctoring: boolean;
  includeCodeSamples: boolean;
  showWeaknesses: boolean;
}

class ReportGeneratorService {
  generateReportId(): string {
    return `RPT-${Date.now().toString(36).toUpperCase()}-${uuidv4().split('-')[0].toUpperCase()}`;
  }

  async createReport(
    candidate: CandidateInfo,
    interviews: InterviewSummary[],
    detailedScores: ReportData['detailedScores'],
    proctoringData?: ReportData['proctoringReport']
  ): Promise<ReportData> {
    const overallScore = interviews.length > 0
      ? interviews.reduce((sum, i) => sum + i.score, 0) / interviews.length
      : 0;

    const reportId = this.generateReportId();
    const reportData: ReportData = {
      reportId,
      candidate,
      interviews,
      overallScore: Math.round(overallScore * 10) / 10,
      recommendation: this.getRecommendation(overallScore),
      strengths: this.extractStrengths(detailedScores),
      weaknesses: this.extractWeaknesses(detailedScores),
      detailedScores,
      proctoringReport: proctoringData,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    await ReportModel.create({
      id: reportId,
      title: `Candidate Report - ${candidate.name}`,
      type: 'candidate',
      candidateId: candidate.id,
      interviewIds: interviews.map(i => i.id),
      generatedBy: 'system',
      data: reportData,
      format: 'pdf',
      status: 'ready',
      expiresAt: reportData.expiresAt,
    });

    return reportData;
  }

  private getRecommendation(score: number): string {
    if (score >= 85) return 'Strong Hire - Highly recommended for the position';
    if (score >= 70) return 'Hire - Recommended for the position';
    if (score >= 55) return 'Neutral - Consider for the position with further evaluation';
    if (score >= 40) return 'No Hire - Not recommended at this time';
    return 'Strong No Hire - Does not meet requirements';
  }

  private extractStrengths(scores: ReportData['detailedScores']): string[] {
    return scores
      .filter(s => s.score >= s.maxScore * 0.75)
      .map(s => s.category);
  }

  private extractWeaknesses(scores: ReportData['detailedScores']): string[] {
    return scores
      .filter(s => s.score < s.maxScore * 0.5)
      .map(s => s.category);
  }

  async getReport(reportId: string): Promise<ReportData | null> {
    const doc = await ReportModel.findOne({ id: reportId, expiresAt: { $gt: new Date() } });
    if (!doc) return null;
    return doc.data as ReportData;
  }

  async getReportsByCandidate(candidateId: string): Promise<ReportData[]> {
    const docs = await ReportModel.find({ candidateId, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 });
    return docs.map(d => d.data as ReportData);
  }

  generatePDFContent(report: ReportData, template: ReportTemplate): string {
    const { candidate, interviews, overallScore, recommendation, strengths, weaknesses, detailedScores, proctoringReport } = report;

    const stars = overallScore >= 70 ? '⭐⭐⭐' : overallScore >= 50 ? '⭐⭐' : '⭐';

    return `
═══════════════════════════════════════════════════════════════════════
                    INTERVIEW MINDS - CANDIDATE REPORT
═══════════════════════════════════════════════════════════════════════

REPORT ID: ${report.reportId}
Generated: ${report.generatedAt.toLocaleString()}
Expires: ${report.expiresAt.toLocaleString()}

───────────────────────────────────────────────────────────────────────
                        CANDIDATE INFORMATION
───────────────────────────────────────────────────────────────────────

Name: ${candidate.name}
Email: ${candidate.email}
${candidate.phone ? `Phone: ${candidate.phone}` : ''}
${candidate.LinkedIn ? `LinkedIn: ${candidate.LinkedIn}` : ''}
${candidate.github ? `GitHub: ${candidate.github}` : ''}

───────────────────────────────────────────────────────────────────────
                        INTERVIEW SUMMARY
───────────────────────────────────────────────────────────────────────

Overall Score: ${overallScore}/100 ${stars}
Recommendation: ${recommendation}

Total Interviews: ${interviews.length}
${interviews.map(i => `
  • ${i.type} - ${i.role}
    Date: ${new Date(i.date).toLocaleDateString()}
    Duration: ${Math.round(i.duration / 60)} mins
    Score: ${i.score}/100
`).join('')}

───────────────────────────────────────────────────────────────────────
                        DETAILED SCORES
───────────────────────────────────────────────────────────────────────

${detailedScores.map(d => `
${d.category}
  Score: ${d.score}/${d.maxScore} (${Math.round((d.score/d.maxScore)*100)}%)
  ${d.feedback}
`).join('')}

${template.showWeaknesses ? `
───────────────────────────────────────────────────────────────────────
                        KEY INSIGHTS
───────────────────────────────────────────────────────────────────────

STRENGTHS:
${strengths.map(s => `  ✓ ${s}`).join('\n')}

AREAS FOR IMPROVEMENT:
${weaknesses.map(w => `  • ${w}`).join('\n')}
` : ''}

${template.includeProctoring && proctoringReport ? `
───────────────────────────────────────────────────────────────────────
                        PROCTORING ANALYSIS
───────────────────────────────────────────────────────────────────────

Risk Level: ${proctoringReport.riskLevel.toUpperCase()}
Violations: ${proctoringReport.violations}
Face Presence: ${proctoringReport.facePresence}%
Eye Contact: ${proctoringReport.eyeContact}%
` : ''}

═══════════════════════════════════════════════════════════════════════
                    Generated by InterviewMinds
                     https://interviewminds.com
═══════════════════════════════════════════════════════════════════════
    `.trim();
  }

  generateCSVExport(reports: ReportData[]): string {
    const headers = ['Report ID', 'Candidate Name', 'Email', 'Overall Score', 'Recommendation', 'Interviews', 'Generated At'];
    
    const rows = reports.map(r => [
      r.reportId,
      r.candidate.name,
      r.candidate.email,
      r.overallScore,
      r.recommendation,
      r.interviews.length,
      r.generatedAt.toISOString(),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  generateJSONExport(reports: ReportData[]): string {
    return JSON.stringify(reports, null, 2);
  }

  async getTemplates(): Promise<ReportTemplate[]> {
    const docs = await ReportTemplateModel.find({}).lean();
    if (docs.length > 0) {
      return docs.map(d => ({
        id: d.id,
        name: d.name,
        primaryColor: '#2563EB',
        includeProctoring: true,
        includeCodeSamples: true,
        showWeaknesses: true,
      }));
    }

    const defaults: ReportTemplate[] = [
      {
        id: 'standard',
        name: 'Standard Report',
        primaryColor: '#2563EB',
        includeProctoring: true,
        includeCodeSamples: true,
        showWeaknesses: true,
      },
      {
        id: 'executive',
        name: 'Executive Summary',
        primaryColor: '#7C3AED',
        includeProctoring: true,
        includeCodeSamples: false,
        showWeaknesses: false,
      },
      {
        id: 'technical',
        name: 'Technical Deep-Dive',
        primaryColor: '#059669',
        includeProctoring: true,
        includeCodeSamples: true,
        showWeaknesses: true,
      },
    ];

    for (const t of defaults) {
      await ReportTemplateModel.create({
        id: t.id,
        name: t.name,
        type: 'candidate',
        sections: [],
        isDefault: true,
        createdBy: 'system',
      });
    }

    return defaults;
  }

  async createCustomTemplate(template: Omit<ReportTemplate, 'id'>): Promise<ReportTemplate> {
    const newTemplate: ReportTemplate = {
      ...template,
      id: uuidv4(),
    };

    await ReportTemplateModel.create({
      id: newTemplate.id,
      name: newTemplate.name,
      type: 'candidate',
      sections: [],
      isDefault: false,
      createdBy: 'system',
    });

    return newTemplate;
  }

  async expireOldReports(): Promise<number> {
    const result = await ReportModel.deleteMany({ expiresAt: { $lt: new Date() } });
    return result.deletedCount || 0;
  }
}

export const reportGeneratorService = new ReportGeneratorService();
export default reportGeneratorService;
