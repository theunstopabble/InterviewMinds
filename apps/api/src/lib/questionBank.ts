import { v4 as uuidv4 } from 'uuid';

export type QuestionType = 
  | 'coding' 
  | 'multiple-choice' 
  | 'sql' 
  | 'system-design' 
  | 'behavioral' 
  | 'technical';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface QuestionTag {
  id: string;
  name: string;
  category: string;
}

export interface CodeTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  description: string;
}

export interface Question {
  id: string;
  title: string;
  description: string;
  type: QuestionType;
  difficulty: Difficulty;
  category: string;
  tags: string[];
  skills: string[];
  timeLimit: number;
  points: number;
  starterCode?: Record<string, string>;
  testCases: CodeTestCase[];
  solution?: string;
  explanation?: string;
  createdBy: string;
  companyId?: string;
  isPublic: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionCategory {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  icon: string;
}

class QuestionBankService {
  private questions: Map<string, Question> = new Map();
  private categories: Map<string, QuestionCategory> = new Map();
  private tags: Map<string, QuestionTag> = new Map();

  constructor() {
    this.initializeDefaultCategories();
  }

  private initializeDefaultCategories() {
    const defaultCategories: QuestionCategory[] = [
      { id: 'algorithms', name: 'Algorithms', description: 'Data structures & algorithms', questionCount: 0, icon: '🧮' },
      { id: 'frontend', name: 'Frontend', description: 'React, Vue, Angular, HTML/CSS', questionCount: 0, icon: '🎨' },
      { id: 'backend', name: 'Backend', description: 'Node.js, Python, Java, Go', questionCount: 0, icon: '⚙️' },
      { id: 'database', name: 'Database', description: 'SQL, NoSQL, System design', questionCount: 0, icon: '🗄️' },
      { id: 'devops', name: 'DevOps', description: 'CI/CD, Docker, Kubernetes', questionCount: 0, icon: '🚀' },
      { id: 'system-design', name: 'System Design', description: 'Architecture, Scalability', questionCount: 0, icon: '🏗️' },
      { id: 'behavioral', name: 'Behavioral', description: 'Past experiences, Situations', questionCount: 0, icon: '💬' },
      { id: 'mobile', name: 'Mobile', description: 'iOS, Android, Flutter', questionCount: 0, icon: '📱' },
      { id: 'security', name: 'Security', description: 'Auth, Encryption, OWASP', questionCount: 0, icon: '🔐' },
      { id: 'ai-ml', name: 'AI/ML', description: 'Machine Learning, Deep Learning', questionCount: 0, icon: '🤖' },
    ];

    defaultCategories.forEach(cat => this.categories.set(cat.id, cat));
  }

  createQuestion(
    data: Partial<Question> & { title: string; description: string; type: QuestionType; createdBy: string }
  ): Question {
    const question: Question = {
      id: uuidv4(),
      title: data.title,
      description: data.description,
      type: data.type,
      difficulty: data.difficulty || 'medium',
      category: data.category || 'algorithms',
      tags: data.tags || [],
      skills: data.skills || [],
      timeLimit: data.timeLimit || 30,
      points: data.points || 100,
      starterCode: data.starterCode,
      testCases: data.testCases || [],
      solution: data.solution,
      explanation: data.explanation,
      createdBy: data.createdBy,
      companyId: data.companyId,
      isPublic: data.isPublic ?? true,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.questions.set(question.id, question);

    const category = this.categories.get(question.category);
    if (category) {
      category.questionCount++;
      this.categories.set(category.id, category);
    }

    return question;
  }

  getQuestion(id: string): Question | null {
    const question = this.questions.get(id);
    if (question) {
      question.usageCount++;
      this.questions.set(id, question);
    }
    return question || null;
  }

  getQuestionsByCategory(categoryId: string, filters?: {
    difficulty?: Difficulty;
    type?: QuestionType;
    limit?: number;
    offset?: number;
  }): Question[] {
    let questions = Array.from(this.questions.values())
      .filter(q => q.category === categoryId);

    if (filters?.difficulty) {
      questions = questions.filter(q => q.difficulty === filters.difficulty);
    }
    if (filters?.type) {
      questions = questions.filter(q => q.type === filters.type);
    }

    const offset = filters?.offset || 0;
    const limit = filters?.limit || 20;

    return questions.slice(offset, offset + limit);
  }

  searchQuestions(query: string, filters?: {
    category?: string;
    difficulty?: Difficulty;
    type?: QuestionType;
    tags?: string[];
    limit?: number;
  }): Question[] {
    const searchLower = query.toLowerCase();
    let results = Array.from(this.questions.values())
      .filter(q =>
        q.title.toLowerCase().includes(searchLower) ||
        q.description.toLowerCase().includes(searchLower) ||
        q.tags.some(t => t.toLowerCase().includes(searchLower)) ||
        q.skills.some(s => s.toLowerCase().includes(searchLower))
      );

    if (filters?.category) {
      results = results.filter(q => q.category === filters.category);
    }
    if (filters?.difficulty) {
      results = results.filter(q => q.difficulty === filters.difficulty);
    }
    if (filters?.type) {
      results = results.filter(q => q.type === filters.type);
    }
    if (filters?.tags?.length) {
      results = results.filter(q =>
        filters.tags!.some(tag => q.tags.includes(tag))
      );
    }

    return results.slice(0, filters?.limit || 20);
  }

  getRandomQuestions(
    category: string,
    difficulty: Difficulty,
    count: number
  ): Question[] {
    const categoryQuestions = Array.from(this.questions.values())
      .filter(q => 
        q.category === category && 
        q.difficulty === difficulty &&
        q.isPublic
      );

    const shuffled = categoryQuestions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  updateQuestion(id: string, updates: Partial<Question>): Question | null {
    const question = this.questions.get(id);
    if (!question) return null;

    const updated = { ...question, ...updates, updatedAt: new Date() };
    this.questions.set(id, updated);
    return updated;
  }

  deleteQuestion(id: string): boolean {
    const question = this.questions.get(id);
    if (!question) return false;

    const category = this.categories.get(question.category);
    if (category) {
      category.questionCount = Math.max(0, category.questionCount - 1);
      this.categories.set(category.id, category);
    }

    return this.questions.delete(id);
  }

  getCategories(): QuestionCategory[] {
    return Array.from(this.categories.values());
  }

  createCategory(name: string, description: string, icon: string = '📝'): QuestionCategory {
    const category: QuestionCategory = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      questionCount: 0,
      icon,
    };
    this.categories.set(category.id, category);
    return category;
  }

  addTag(name: string, category: string): QuestionTag {
    const tag: QuestionTag = {
      id: uuidv4(),
      name,
      category,
    };
    this.tags.set(tag.id, tag);
    return tag;
  }

  getTags(category?: string): QuestionTag[] {
    const allTags = Array.from(this.tags.values());
    if (category) {
      return allTags.filter(t => t.category === category);
    }
    return allTags;
  }

  getQuestionStats() {
    const questions = Array.from(this.questions.values());
    return {
      total: questions.length,
      byDifficulty: {
        easy: questions.filter(q => q.difficulty === 'easy').length,
        medium: questions.filter(q => q.difficulty === 'medium').length,
        hard: questions.filter(q => q.difficulty === 'hard').length,
        expert: questions.filter(q => q.difficulty === 'expert').length,
      },
      byType: {
        coding: questions.filter(q => q.type === 'coding').length,
        'multiple-choice': questions.filter(q => q.type === 'multiple-choice').length,
        sql: questions.filter(q => q.type === 'sql').length,
        'system-design': questions.filter(q => q.type === 'system-design').length,
        behavioral: questions.filter(q => q.type === 'behavioral').length,
        technical: questions.filter(q => q.type === 'technical').length,
      },
      byCategory: Object.fromEntries(
        Array.from(this.categories.entries()).map(([id, cat]) => [id, cat.questionCount])
      ),
    };
  }

  importQuestions(questions: Partial<Question>[]): number {
    let imported = 0;
    questions.forEach(q => {
      if (q.title && q.description && q.type && q.createdBy) {
        this.createQuestion(q as any);
        imported++;
      }
    });
    return imported;
  }

  exportQuestions(filters?: {
    category?: string;
    difficulty?: Difficulty;
    isPublic?: boolean;
  }): Question[] {
    let questions = Array.from(this.questions.values());

    if (filters?.category) {
      questions = questions.filter(q => q.category === filters.category);
    }
    if (filters?.difficulty) {
      questions = questions.filter(q => q.difficulty === filters.difficulty);
    }
    if (filters?.isPublic !== undefined) {
      questions = questions.filter(q => q.isPublic === filters.isPublic);
    }

    return questions.map(q => ({
      ...q,
      solution: undefined,
      explanation: undefined,
    }));
  }
}

export const questionBankService = new QuestionBankService();
export default questionBankService;