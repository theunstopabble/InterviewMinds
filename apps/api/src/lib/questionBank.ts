import { QuestionModel, IQuestion } from '../models/Question';
import { QuestionCategoryModel, IQuestionCategory } from '../models/QuestionCategory';
import { QuestionTagModel, IQuestionTag } from '../models/QuestionTag';
import { logger } from './logger';

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
  async createQuestion(
    data: Partial<Question> & { title: string; description: string; type: QuestionType; createdBy: string }
  ): Promise<IQuestion> {
    const question = await QuestionModel.create({
      title: data.title,
      description: data.description,
      type: data.type,
      difficulty: data.difficulty || 'medium',
      category: data.category || 'algorithms',
      tags: data.tags || [],
      skills: data.skills || [],
      timeLimit: data.timeLimit || 30,
      points: data.points || 100,
      starterCode: data.starterCode ? new Map(Object.entries(data.starterCode)) : new Map(),
      testCases: data.testCases || [],
      solution: data.solution,
      explanation: data.explanation,
      createdBy: data.createdBy,
      companyId: data.companyId,
      isPublic: data.isPublic ?? true,
    });

    await QuestionCategoryModel.updateOne(
      { id: question.category },
      { $inc: { questionCount: 1 } }
    ).catch(() => {});

    return question;
  }

  async getQuestion(id: string): Promise<IQuestion | null> {
    return QuestionModel.findOneAndUpdate(
      { id },
      { $inc: { usageCount: 1 } },
      { new: true }
    );
  }

  async getAllQuestions(filters?: {
    difficulty?: Difficulty;
    type?: QuestionType;
    limit?: number;
    offset?: number;
  }): Promise<IQuestion[]> {
    const query: Record<string, unknown> = {};
    if (filters?.difficulty) query.difficulty = filters.difficulty;
    if (filters?.type) query.type = filters.type;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    return QuestionModel.find(query).skip(offset).limit(limit) as unknown as Promise<IQuestion[]>;
  }

  async getQuestionsByCategory(
    categoryId: string,
    filters?: {
      difficulty?: Difficulty;
      type?: QuestionType;
      limit?: number;
      offset?: number;
    }
  ): Promise<IQuestion[]> {
    const query: Record<string, unknown> = { category: categoryId };
    if (filters?.difficulty) query.difficulty = filters.difficulty;
    if (filters?.type) query.type = filters.type;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 20;
    return QuestionModel.find(query).skip(offset).limit(limit) as unknown as Promise<IQuestion[]>;
  }

  async searchQuestions(
    query: string,
    filters?: {
      category?: string;
      difficulty?: Difficulty;
      type?: QuestionType;
      tags?: string[];
      limit?: number;
    }
  ): Promise<IQuestion[]> {
    const mongoQuery: Record<string, unknown> = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } },
        { skills: { $regex: query, $options: 'i' } },
      ],
    };
    if (filters?.category) mongoQuery.category = filters.category;
    if (filters?.difficulty) mongoQuery.difficulty = filters.difficulty;
    if (filters?.type) mongoQuery.type = filters.type;
    if (filters?.tags?.length) {
      mongoQuery.tags = { $in: filters.tags };
    }
    return QuestionModel.find(mongoQuery).limit(filters?.limit || 20) as unknown as Promise<IQuestion[]>;
  }

  async getRandomQuestions(
    category: string,
    difficulty: Difficulty,
    count: number
  ): Promise<IQuestion[]> {
    return QuestionModel.aggregate([
      { $match: { category, difficulty, isPublic: true } },
      { $sample: { size: count } },
    ]) as unknown as Promise<IQuestion[]>;
  }

  async updateQuestion(id: string, updates: Record<string, unknown>): Promise<IQuestion | null> {
    delete updates.id;
    return QuestionModel.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    );
  }

  async deleteQuestion(id: string): Promise<boolean> {
    const question = await QuestionModel.findOneAndDelete({ id });
    if (!question) return false;

    await QuestionCategoryModel.updateOne(
      { id: question.category },
      { $inc: { questionCount: -1 } }
    ).catch(() => {});

    return true;
  }

  async getCategories(): Promise<IQuestionCategory[]> {
    return QuestionCategoryModel.find() as unknown as Promise<IQuestionCategory[]>;
  }

  async createCategory(name: string, description: string, icon: string = '📝'): Promise<IQuestionCategory> {
    return QuestionCategoryModel.create({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      icon,
      questionCount: 0,
    });
  }

  async addTag(name: string, category: string): Promise<IQuestionTag> {
    return QuestionTagModel.create({ name, category });
  }

  async getTags(category?: string): Promise<IQuestionTag[]> {
    if (category) {
      return QuestionTagModel.find({ category }) as unknown as Promise<IQuestionTag[]>;
    }
    return QuestionTagModel.find() as unknown as Promise<IQuestionTag[]>;
  }

  async getQuestionStats(): Promise<{
    total: number;
    byDifficulty: Record<string, number>;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    const [total, byDifficulty, byType, byCategory] = await Promise.all([
      QuestionModel.countDocuments(),
      QuestionModel.aggregate([
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      ]),
      QuestionModel.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      QuestionCategoryModel.find().select('id questionCount').lean(),
    ]);

    const diffMap: Record<string, number> = { easy: 0, medium: 0, hard: 0, expert: 0 };
    for (const d of byDifficulty) {
      diffMap[d._id as string] = d.count;
    }

    const typeMap: Record<string, number> = { coding: 0, 'multiple-choice': 0, sql: 0, 'system-design': 0, behavioral: 0, technical: 0 };
    for (const t of byType) {
      typeMap[t._id as string] = t.count;
    }

    const catMap: Record<string, number> = {};
    for (const c of byCategory) {
      catMap[c.id] = c.questionCount;
    }

    return { total, byDifficulty: diffMap, byType: typeMap, byCategory: catMap };
  }

  async importQuestions(questions: Partial<IQuestion>[]): Promise<number> {
    const valid = questions.filter(q => q.title && q.description && q.type && q.createdBy);
    if (valid.length === 0) return 0;
    await QuestionModel.insertMany(valid);
    return valid.length;
  }

  async exportQuestions(filters?: {
    category?: string;
    difficulty?: Difficulty;
    isPublic?: boolean;
  }): Promise<Partial<IQuestion>[]> {
    const query: Record<string, unknown> = {};
    if (filters?.category) query.category = filters.category;
    if (filters?.difficulty) query.difficulty = filters.difficulty;
    if (filters?.isPublic !== undefined) query.isPublic = filters.isPublic;

    return QuestionModel.find(query)
      .select('-solution -explanation') as unknown as Promise<Partial<IQuestion>[]>;
  }
}

export const questionBankService = new QuestionBankService();

export async function seedDefaultCategories(): Promise<void> {
  const defaults = [
    { id: 'algorithms', name: 'Algorithms', description: 'Data structures & algorithms', icon: '🧮' },
    { id: 'frontend', name: 'Frontend', description: 'React, Vue, Angular, HTML/CSS', icon: '🎨' },
    { id: 'backend', name: 'Backend', description: 'Node.js, Python, Java, Go', icon: '⚙️' },
    { id: 'database', name: 'Database', description: 'SQL, NoSQL, System design', icon: '🗄️' },
    { id: 'devops', name: 'DevOps', description: 'CI/CD, Docker, Kubernetes', icon: '🚀' },
    { id: 'system-design', name: 'System Design', description: 'Architecture, Scalability', icon: '🏗️' },
    { id: 'behavioral', name: 'Behavioral', description: 'Past experiences, Situations', icon: '💬' },
    { id: 'mobile', name: 'Mobile', description: 'iOS, Android, Flutter', icon: '📱' },
    { id: 'security', name: 'Security', description: 'Auth, Encryption, OWASP', icon: '🔐' },
    { id: 'ai-ml', name: 'AI/ML', description: 'Machine Learning, Deep Learning', icon: '🤖' },
  ];

  for (const cat of defaults) {
    await QuestionCategoryModel.updateOne(
      { id: cat.id },
      { $setOnInsert: cat },
      { upsert: true }
    );
  }
  logger.info('Default question categories seeded');
}

export default questionBankService;
