import { Router } from 'express';
import { logger } from '../lib/logger';
import { reportGeneratorService, CandidateInfo, InterviewSummary } from '../lib/reportGenerator';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/reports/candidate/:candidateId
router.get('/candidate/:candidateId', requireAuth, async (req, res) => {
  try {
    const { candidateId } = req.params;
    const reports = await reportGeneratorService.getReportsByCandidate(candidateId);
    res.json({ reports, count: reports.length });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching reports:');
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/:reportId
router.get('/:reportId', requireAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await reportGeneratorService.getReport(reportId);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json({ report });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching report:');
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// POST /api/reports/generate
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { candidateId, candidateName, candidateEmail, interviews, detailedScores } = req.body;
    if (!candidateId) {
      res.status(400).json({ error: 'candidateId is required' });
      return;
    }
    const candidate: CandidateInfo = {
      id: candidateId,
      name: candidateName || 'Candidate',
      email: candidateEmail || `${candidateId}@example.com`,
    };
    const interviewSummaries: InterviewSummary[] = (interviews || []).map((i: any) => ({
      id: i.id || `int_${Date.now()}`,
      date: i.date ? new Date(i.date) : new Date(),
      duration: i.duration || 60,
      type: i.type || 'technical',
      role: i.role || 'General',
      interviewer: i.interviewer || 'AI Interviewer',
      score: i.score || 0,
    }));
    const scoreDetails = (detailedScores || []).map((s: any) => ({
      category: s.category,
      score: s.score,
      maxScore: s.maxScore || 100,
      feedback: s.feedback || '',
    }));
    const report = await reportGeneratorService.createReport(candidate, interviewSummaries, scoreDetails);
    res.json({ success: true, report });
  } catch (error) {
    logger.error({ err: error }, 'Error generating report:');
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/reports/:reportId/pdf
router.get('/:reportId/pdf', requireAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await reportGeneratorService.getReport(reportId);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    const templates = await reportGeneratorService.getTemplates();
    const template = templates[0];
    const pdfContent = reportGeneratorService.generatePDFContent(report, template);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.txt"`);
    res.send(pdfContent);
  } catch (error) {
    logger.error({ err: error }, 'Error generating PDF:');
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// POST /api/reports/export/csv
router.post('/export/csv', requireAuth, async (req, res) => {
  try {
    const { reportIds } = req.body;
    const reports = await Promise.all(
      (reportIds as string[] || []).map((id: string) => reportGeneratorService.getReport(id))
    );
    const validReports = reports.filter(Boolean);
    const csvContent = reportGeneratorService.generateCSVExport(validReports as any[]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reports-export.csv"`);
    res.send(csvContent);
  } catch (error) {
    logger.error({ err: error }, 'Error exporting CSV:');
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// POST /api/reports/export/json
router.post('/export/json', requireAuth, async (req, res) => {
  try {
    const { reportIds } = req.body;
    const reports = await Promise.all(
      (reportIds as string[] || []).map((id: string) => reportGeneratorService.getReport(id))
    );
    const validReports = reports.filter(Boolean);
    const jsonContent = reportGeneratorService.generateJSONExport(validReports as any[]);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reports-export.json"`);
    res.send(jsonContent);
  } catch (error) {
    logger.error({ err: error }, 'Error exporting JSON:');
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

// GET /api/reports/templates
router.get('/templates', async (_req, res) => {
  try {
    const templates = await reportGeneratorService.getTemplates();
    res.json({ templates });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching templates:');
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

export default router;
