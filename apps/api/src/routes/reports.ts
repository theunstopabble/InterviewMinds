import { Router } from 'express';
import { reportGeneratorService, CandidateInfo, InterviewSummary } from '../lib/reportGenerator';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/reports/candidate/:candidateId
router.get('/candidate/:candidateId', requireAuth, (req, res) => {
  try {
    const { candidateId } = req.params;
    const reports = reportGeneratorService.getReportsByCandidate(candidateId);
    res.json({ reports, count: reports.length });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/:reportId
router.get('/:reportId', requireAuth, (req, res) => {
  try {
    const { reportId } = req.params;
    const report = reportGeneratorService.getReport(reportId);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json({ report });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// POST /api/reports/generate
router.post('/generate', requireAuth, (req, res) => {
  try {
    const { candidateId, interviewIds } = req.body;
    const candidate: CandidateInfo = {
      id: candidateId || 'default',
      name: 'Candidate',
      email: 'candidate@example.com',
    };
    const interviews: InterviewSummary[] = (interviewIds || []).length > 0
      ? (interviewIds as string[]).map((id, i) => ({
          id,
          date: new Date(),
          duration: 60,
          type: ['technical', 'behavioral', 'system-design'][i % 3],
          role: ['Frontend Engineer', 'Backend Engineer', 'Full Stack'][i % 3],
          interviewer: 'AI Interviewer',
          score: Math.floor(Math.random() * 35) + 65,
        }))
      : [
          { id: 'sample_1', date: new Date(), duration: 45, type: 'technical', role: 'Frontend Engineer', interviewer: 'AI Interviewer', score: 82 },
          { id: 'sample_2', date: new Date(), duration: 30, type: 'behavioral', role: 'Behavioral', interviewer: 'AI Interviewer', score: 78 },
        ];
    const detailedScores = [
      { category: 'Technical Skills', score: 80, maxScore: 100, feedback: 'Strong technical foundation with good problem-solving approach.' },
      { category: 'Communication', score: 85, maxScore: 100, feedback: 'Clear and articulate responses. Explains concepts well.' },
      { category: 'Problem Solving', score: 75, maxScore: 100, feedback: 'Systematic approach to problems. Could improve on optimization.' },
      { category: 'System Design', score: 70, maxScore: 100, feedback: 'Understands core concepts but needs more depth in distributed systems.' },
    ];
    const report = reportGeneratorService.createReport(candidate, interviews, detailedScores);
    res.json({ success: true, report });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/reports/:reportId/pdf
router.get('/:reportId/pdf', requireAuth, (req, res) => {
  try {
    const { reportId } = req.params;
    const report = reportGeneratorService.getReport(reportId);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    const template = reportGeneratorService.getTemplates()[0];
    const pdfContent = reportGeneratorService.generatePDFContent(report, template);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.txt"`);
    res.send(pdfContent);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// POST /api/reports/export/csv
router.post('/export/csv', requireAuth, (req, res) => {
  try {
    const { reportIds } = req.body;
    const reports = (reportIds as string[] || [])
      .map((id: string) => reportGeneratorService.getReport(id))
      .filter(Boolean);
    const csvContent = reportGeneratorService.generateCSVExport(reports as any[]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reports-export.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// POST /api/reports/export/json
router.post('/export/json', requireAuth, (req, res) => {
  try {
    const { reportIds } = req.body;
    const reports = (reportIds as string[] || [])
      .map((id: string) => reportGeneratorService.getReport(id))
      .filter(Boolean);
    const jsonContent = reportGeneratorService.generateJSONExport(reports as any[]);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reports-export.json"`);
    res.send(jsonContent);
  } catch (error) {
    console.error('Error exporting JSON:', error);
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

// GET /api/reports/templates
router.get('/templates', (_req, res) => {
  try {
    const templates = reportGeneratorService.getTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

export default router;