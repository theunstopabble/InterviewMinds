import { v4 as uuidv4 } from 'uuid';

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
  private reports: Map<string, ReportData> = new Map();
  private templates: Map<string, ReportTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    const defaultTemplates: ReportTemplate[] = [
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

    defaultTemplates.forEach(t => this.templates.set(t.id, t));
  }

  generateReportId(): string {
    return `RPT-${Date.now().toString(36).toUpperCase()}-${uuidv4().split('-')[0].toUpperCase()}`;
  }

  createReport(
    candidate: CandidateInfo,
    interviews: InterviewSummary[],
    detailedScores: ReportData['detailedScores'],
    proctoringData?: ReportData['proctoringReport']
  ): ReportData {
    const overallScore = interviews.length > 0
      ? interviews.reduce((sum, i) => sum + i.score, 0) / interviews.length
      : 0;

    const report: ReportData = {
      reportId: this.generateReportId(),
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

    this.reports.set(report.reportId, report);
    return report;
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

  getReport(reportId: string): ReportData | null {
    const report = this.reports.get(reportId);
    if (report && new Date() < report.expiresAt) {
      return report;
    }
    return null;
  }

  getReportsByCandidate(candidateId: string): ReportData[] {
    return Array.from(this.reports.values())
      .filter(r => r.candidate.id === candidateId)
      .filter(r => new Date() < r.expiresAt)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
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

  getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  createCustomTemplate(template: Omit<ReportTemplate, 'id'>): ReportTemplate {
    const newTemplate: ReportTemplate = {
      ...template,
      id: uuidv4(),
    };
    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  expireOldReports(): number {
    let expired = 0;
    const now = new Date();
    
    for (const [id, report] of this.reports.entries()) {
      if (now >= report.expiresAt) {
        this.reports.delete(id);
        expired++;
      }
    }
    
    return expired;
  }
}

export const reportGeneratorService = new ReportGeneratorService();
export default reportGeneratorService;