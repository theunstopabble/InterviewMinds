import { Router } from 'express';
import { questionBankService } from '../lib/questionBank';
import type { Difficulty, QuestionType } from '../lib/questionBank';

const router = Router();

// GET /api/question-bank - List questions
router.get('/', (req, res) => {
  try {
    const { category, difficulty, type, limit = '50', offset = '0' } = req.query;
    
    let questions;
    if (category && category !== 'all') {
      questions = questionBankService.getQuestionsByCategory(category as string, {
        difficulty: difficulty as Difficulty,
        type: type as QuestionType,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } else {
      // Get all questions
      const allQuestions = Array.from(questionBankService['questions'].values());
      if (difficulty) {
        questions = allQuestions.filter(q => q.difficulty === difficulty);
      } else {
        questions = allQuestions;
      }
      if (type) {
        questions = (questions as any[]).filter(q => q.type === type);
      }
      const off = parseInt(offset as string);
      const lim = parseInt(limit as string);
      questions = (questions as any[]).slice(off, off + lim);
    }
    
    res.json({ questions, count: (questions as any[]).length });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// GET /api/question-bank/categories
router.get('/categories', (_req, res) => {
  try {
    const categories = questionBankService.getCategories();
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/question-bank/stats
router.get('/stats', (_req, res) => {
  try {
    const stats = questionBankService.getQuestionStats();
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/question-bank/:id
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const question = questionBankService['questions'].get(id);
    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json({ question });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

// POST /api/question-bank - Create question
router.post('/', (req, res) => {
  try {
    const question = req.body;
    const created = questionBankService.createQuestion(question);
    res.status(201).json({ question: created });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// PATCH /api/question-bank/:id
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = questionBankService.updateQuestion(id, updates);
    if (!updated) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json({ question: updated });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /api/question-bank/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = questionBankService.deleteQuestion(id);
    if (!deleted) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// GET /api/question-bank/search
router.get('/search', (req, res) => {
  try {
    const { q, category, difficulty, tags } = req.query;
    const questions = questionBankService.searchQuestions(q as string, {
      category: category as string,
      difficulty: difficulty as Difficulty,
      tags: tags ? (tags as string).split(',') : undefined,
    });
    res.json({ questions, count: questions.length });
  } catch (error) {
    console.error('Error searching questions:', error);
    res.status(500).json({ error: 'Failed to search questions' });
  }
});

export default router;