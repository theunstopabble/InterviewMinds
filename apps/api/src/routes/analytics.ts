import { Router } from 'express';
import { 
  getDashboardAnalytics, 
  getInterviewTrends, 
  getTopPerformers,
  predictSuccess,
  analyzePipeline,
  getTrainingRecommendations,
  generateReport
} from '../lib/analytics';

const router = Router();

router.get('/dashboard', async (req, res) => {
  try {
    const tenantId = req.query.tenantId as string;
    const analytics = getDashboardAnalytics(tenantId);

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

router.get('/trends', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const trends = getInterviewTrends(days);

    res.json({ trends });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

router.get('/top-performers', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const performers = getTopPerformers(limit);

    res.json({ performers });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({ error: 'Failed to fetch performers' });
  }
});

router.post('/predict', async (req, res) => {
  try {
    const { candidateId, interviewId } = req.body;

    if (!candidateId || !interviewId) {
      res.status(400).json({ error: 'candidateId and interviewId are required' });
      return;
    }

    const prediction = predictSuccess(candidateId, interviewId);

    res.json(prediction);
  } catch (error) {
    console.error('Error predicting success:', error);
    res.status(500).json({ error: 'Failed to predict success' });
  }
});

router.get('/pipeline', async (req, res) => {
  try {
    const tenantId = req.query.tenantId as string;
    const analysis = analyzePipeline(tenantId);

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing pipeline:', error);
    res.status(500).json({ error: 'Failed to analyze pipeline' });
  }
});

router.get('/training/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const recommendations = getTrainingRecommendations(candidateId);

    res.json({ candidateId, recommendations });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

router.get('/report/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['summary', 'detailed', 'export'];

    if (!validTypes.includes(type)) {
      res.status(400).json({ error: 'Invalid report type' });
      return;
    }

    const report = generateReport(type as 'summary' | 'detailed' | 'export');

    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;