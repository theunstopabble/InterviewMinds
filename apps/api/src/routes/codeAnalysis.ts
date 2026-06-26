import { Router } from 'express';
import { logger } from '../lib/logger';
import { analyzeCode, getLanguageFromFilename, calculateComplexity } from '../lib/codeAnalysis';

const router = Router();

interface AnalyzeCodeRequest {
  code: string;
  language?: string;
  filename?: string;
  expectedOutput?: string;
}

router.post('/analyze', async (req, res) => {
  try {
    const body = req.body as AnalyzeCodeRequest;

    if (!body.code) {
      res.status(400).json({ error: 'Code is required' });
      return;
    }

    let language = body.language;
    if (!language && body.filename) {
      language = getLanguageFromFilename(body.filename);
    }

    if (!language) {
      res.status(400).json({ error: 'Language or filename is required' });
      return;
    }

    const result = analyzeCode(body.code, language, body.expectedOutput);

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error analyzing code:');
    res.status(500).json({ error: 'Failed to analyze code' });
  }
});

router.post('/security-scan', async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Code is required' });
      return;
    }

    const lang = language || 'javascript';
    const result = analyzeCode(code, lang);

    const securityIssues = result.issues.filter(i => i.type === 'security');

    res.json({
      hasVulnerabilities: securityIssues.length > 0,
      issues: securityIssues,
      score: result.security
    });
  } catch (error) {
    logger.error({ err: error }, 'Error scanning code:');
    res.status(500).json({ error: 'Failed to scan code' });
  }
});

router.post('/complexity', async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Code is required' });
      return;
    }

    const complexity = calculateComplexity(code);

    res.json(complexity);
  } catch (error) {
    logger.error({ err: error }, 'Error calculating complexity:');
    res.status(500).json({ error: 'Failed to calculate complexity' });
  }
});

export default router;