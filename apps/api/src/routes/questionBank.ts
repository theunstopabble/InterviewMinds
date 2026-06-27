import { Router } from 'express';
import { questionBankService } from '../lib/questionBank';
import type { Difficulty, QuestionType } from '../lib/questionBank';
import { logger } from '../lib/logger';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { category, difficulty, type, limit = '50', offset = '0' } = req.query;

    let questions;
    if (category && category !== 'all') {
      questions = await questionBankService.getQuestionsByCategory(category as string, {
        difficulty: difficulty as Difficulty,
        type: type as QuestionType,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } else {
      questions = await questionBankService.getAllQuestions({
        difficulty: difficulty as Difficulty,
        type: type as QuestionType,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    }

    res.json({ questions, count: questions.length });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching questions:');
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

router.get('/categories', async (_req, res) => {
  try {
    const categories = await questionBankService.getCategories();
    res.json({ categories });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching categories:');
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const stats = await questionBankService.getQuestionStats();
    res.json({ stats });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching stats:');
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const question = await questionBankService.getQuestion(id);
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

router.post('/', async (req, res) => {
  try {
    const question = req.body;
    const created = await questionBankService.createQuestion(question);
    res.status(201).json({ question: created });
  } catch (error) {
    logger.error({ err: error }, 'Error creating question:');
    res.status(500).json({ error: 'Failed to create question' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await questionBankService.updateQuestion(id, updates);
    if (!updated) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json({ question: updated });
  } catch (error) {
    logger.error({ err: error }, 'Error updating question:');
    res.status(500).json({ error: 'Failed to update question' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await questionBankService.deleteQuestion(id);
    if (!deleted) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting question:');
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q, category, difficulty, tags } = req.query;
    const questions = await questionBankService.searchQuestions(q as string, {
      category: category as string,
      difficulty: difficulty as Difficulty,
      tags: tags ? (tags as string).split(',') : undefined,
    });
    res.json({ questions, count: questions.length });
  } catch (error) {
    logger.error({ err: error }, 'Error searching questions:');
    res.status(500).json({ error: 'Failed to search questions' });
  }
});

export default router;
