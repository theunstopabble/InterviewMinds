import { Router } from 'express';
import { reportGeneratorService } from '../lib/reportGenerator';
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
    const { candidateId, interviewIds, template } = req.body;
    const report = reportGeneratorService.createReport(candidateId, interviewIds || [], template);
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
    res.json({ content: pdfContent, format: 'pdf' });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET /api/reports/:reportId/csv
router.get('/:reportId/csv', requireAuth, (req, res) => {
  try {
    const { reportId } = req.params;
    const report = reportGeneratorService.getReport(reportId);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    const csvContent = reportGeneratorService.generateCSVExport([report]);
    res.json({ content: csvContent, format: 'csv' });
  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// GET /api/reports/:reportId/json
router.get('/:reportId/json', requireAuth, (req, res) => {
  try {
    const { reportId } = req.params;
    const report = reportGeneratorService.getReport(reportId);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    const jsonContent = reportGeneratorService.generateJSONExport([report]);
    res.json({ content: jsonContent, format: 'json' });
  } catch (error) {
    console.error('Error generating JSON:', error);
    res.status(500).json({ error: 'Failed to generate JSON' });
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