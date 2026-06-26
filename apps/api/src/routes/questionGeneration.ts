import { Router } from 'express';
import { logger } from '../lib/logger';
import { generateQuestions, getQuestionById, getCompetencyQuestions, getAllCompetencies } from '../lib/questionGeneration';

const router = Router();

interface GenerateQuestionsRequest {
  jobType: string;
  experienceYears: number;
  requiredSkills?: string[];
  count?: number;
}

router.get('/competencies', async (req, res) => {
  try {
    const competencies = getAllCompetencies();
    res.json({ competencies });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching competencies:');
    res.status(500).json({ error: 'Failed to fetch competencies' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const body = req.body as GenerateQuestionsRequest;

    if (!body.jobType || body.experienceYears === undefined) {
      res.status(400).json({ error: 'jobType and experienceYears are required' });
      return;
    }

    const validJobTypes = ['frontend', 'backend', 'fullstack', 'devops', 'data', 'mobile', 'qa', 'security'];
    if (!validJobTypes.includes(body.jobType)) {
      res.status(400).json({ error: 'Invalid job type' });
      return;
    }

    const count = Math.min(Math.max(body.count || 10, 1), 50);
    const questions = generateQuestions(
      body.jobType,
      body.experienceYears,
      body.requiredSkills || [],
      count
    );

    res.json({ questions, count: questions.length });
  } catch (error) {
    logger.error({ err: error }, 'Error generating questions:');
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

router.get('/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const question = getQuestionById(questionId);

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    res.json({ question });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching question:');
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

router.get('/competency/:competency/:difficulty', async (req, res) => {
  try {
    const { competency, difficulty } = req.params;
    const questions = getCompetencyQuestions(competency, difficulty);

    res.json({ competency, difficulty, questions, count: questions.length });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching competency questions:');
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Practice questions for preparation
router.get('/practice/random', async (req, res) => {
  try {
    const { count = '5', type, difficulty } = req.query;
    const questions = generateQuestions(
      'fullstack',
      3,
      [],
      parseInt(count as string) || 5
    );
    
    let filtered = questions;
    if (type) {
      filtered = filtered.filter((q: any) => q.category === type);
    }
    if (difficulty) {
      filtered = filtered.filter((q: any) => q.difficulty === difficulty);
    }
    
    const formatted = filtered.map((q: any) => ({
      id: q.id,
      question: q.text,
      type: q.category,
      difficulty: q.difficulty,
      sampleAnswer: q.modelAnswer,
    }));
    
    res.json({ questions: formatted, count: formatted.length });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching practice questions:');
    res.status(500).json({ error: 'Failed to fetch practice questions' });
  }
});

export default router;