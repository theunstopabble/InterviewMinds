import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface SQLSchema {
  tables: SQLTable[];
  relationships: SQLRelationship[];
}

export interface SQLTable {
  name: string;
  columns: SQLColumn[];
  sampleData?: Record<string, any>[];
}

export interface SQLColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  references?: string;
}

export interface SQLRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface SQLChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  category: string;
  schema: SQLSchema;
  expectedOutput: string;
  hints: string[];
  solution: string;
  points: number;
  timeLimit: number;
}

export interface SQLSubmission {
  id: string;
  challengeId: string;
  candidateId: string;
  query: string;
  result: any[];
  isCorrect: boolean;
  executionTime: number;
  submittedAt: Date;
  error?: string;
}

const challengeSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'expert'], required: true },
  category: { type: String, required: true },
  schema: { type: Schema.Types.Mixed, required: true },
  expectedOutput: { type: String, required: true },
  hints: [String],
  solution: { type: String, required: true },
  points: { type: Number, required: true },
  timeLimit: { type: Number, required: true },
}, { timestamps: true });

const submissionSchema = new Schema({
  id: { type: String, required: true, unique: true },
  challengeId: { type: String, required: true },
  candidateId: { type: String, required: true },
  query: { type: String, required: true },
  result: [Schema.Types.Mixed],
  isCorrect: { type: Boolean, required: true },
  executionTime: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now },
  error: String,
}, { timestamps: true });

submissionSchema.index({ challengeId: 1 });
submissionSchema.index({ candidateId: 1 });
submissionSchema.index({ challengeId: 1, candidateId: 1 });

const ChallengeModel = mongoose.model('SQLChallengeContent', challengeSchema);
const SubmissionModel = mongoose.model('SQLSubmissionContent', submissionSchema);

const DEFAULT_CHALLENGES: SQLChallenge[] = [
  {
    id: 'sql-basic-1',
    title: 'Find All Customers Who Placed Orders',
    description: 'Write a query to find all customers who have placed at least one order. Return customer names and their order counts.',
    difficulty: 'easy',
    category: 'Joins',
    schema: {
      tables: [
        {
          name: 'customers',
          columns: [
            { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false, isNullable: false },
            { name: 'name', type: 'VARCHAR', isPrimaryKey: false, isForeignKey: false, isNullable: false },
            { name: 'email', type: 'VARCHAR', isPrimaryKey: false, isForeignKey: false, isNullable: true },
          ],
          sampleData: [
            { id: 1, name: 'John Doe', email: 'john@example.com' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
            { id: 3, name: 'Bob Wilson', email: 'bob@example.com' },
          ],
        },
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false, isNullable: false },
            { name: 'customer_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, isNullable: false, references: 'customers.id' },
            { name: 'total', type: 'DECIMAL', isPrimaryKey: false, isForeignKey: false, isNullable: false },
            { name: 'order_date', type: 'DATE', isPrimaryKey: false, isForeignKey: false, isNullable: false },
          ],
          sampleData: [
            { id: 1, customer_id: 1, total: 100.00, order_date: '2024-01-15' },
            { id: 2, customer_id: 1, total: 250.00, order_date: '2024-02-20' },
            { id: 3, customer_id: 2, total: 75.00, order_date: '2024-03-10' },
          ],
        },
      ],
      relationships: [
        { fromTable: 'orders', fromColumn: 'customer_id', toTable: 'customers', toColumn: 'id' },
      ],
    },
    expectedOutput: JSON.stringify([
      { name: 'John Doe', order_count: 2 },
      { name: 'Jane Smith', order_count: 1 },
    ]),
    hints: ['Use INNER JOIN or LEFT JOIN', 'Use GROUP BY with COUNT', 'Use HAVING to filter customers with orders'],
    solution: 'SELECT c.name, COUNT(o.id) as order_count FROM customers c INNER JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name;',
    points: 100,
    timeLimit: 20,
  },
  {
    id: 'sql-medium-1',
    title: 'Find Top Selling Products',
    description: 'Find the top 5 products by total sales amount. Include product name and total revenue.',
    difficulty: 'medium',
    category: 'Aggregation',
    schema: {
      tables: [
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false, isNullable: false },
            { name: 'name', type: 'VARCHAR', isPrimaryKey: false, isForeignKey: false, isNullable: false },
            { name: 'price', type: 'DECIMAL', isPrimaryKey: false, isForeignKey: false, isNullable: false },
          ],
        },
        {
          name: 'order_items',
          columns: [
            { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false, isNullable: false },
            { name: 'order_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, isNullable: false },
            { name: 'product_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, isNullable: false },
            { name: 'quantity', type: 'INT', isPrimaryKey: false, isForeignKey: false, isNullable: false },
            { name: 'unit_price', type: 'DECIMAL', isPrimaryKey: false, isForeignKey: false, isNullable: false },
          ],
        },
      ],
      relationships: [],
    },
    expectedOutput: JSON.stringify([]),
    hints: ['Join products with order_items', 'Calculate revenue = quantity * unit_price', 'Use ORDER BY and LIMIT'],
    solution: 'SELECT p.name, SUM(oi.quantity * oi.unit_price) as total_revenue FROM products p JOIN order_items oi ON p.id = oi.product_id GROUP BY p.id, p.name ORDER BY total_revenue DESC LIMIT 5;',
    points: 150,
    timeLimit: 25,
  },
  {
    id: 'sql-hard-1',
    title: 'Employee Hierarchy Analysis',
    description: 'Find all employees who earn more than their managers. Return employee name, manager name, and salary difference.',
    difficulty: 'hard',
    category: 'Self-Join',
    schema: {
      tables: [
        {
          name: 'employees',
          columns: [
            { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false, isNullable: false },
            { name: 'name', type: 'VARCHAR', isPrimaryKey: false, isForeignKey: false, isNullable: false },
            { name: 'salary', type: 'DECIMAL', isPrimaryKey: false, isForeignKey: false, isNullable: false },
            { name: 'manager_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, isNullable: true },
          ],
        },
      ],
      relationships: [],
    },
    expectedOutput: JSON.stringify([]),
    hints: ['Self-join the employees table', 'Compare employee salary with manager salary', 'Use WHERE clause to filter'],
    solution: 'SELECT e.name as employee, m.name as manager, (e.salary - m.salary) as salary_difference FROM employees e JOIN employees m ON e.manager_id = m.id WHERE e.salary > m.salary;',
    points: 200,
    timeLimit: 30,
  },
];

class SQLChallengeService {
  async seedDefaultChallenges(): Promise<void> {
    for (const challenge of DEFAULT_CHALLENGES) {
      await ChallengeModel.findOneAndUpdate(
        { id: challenge.id },
        { $setOnInsert: challenge },
        { upsert: true, new: true },
      );
    }
  }

  async getChallenges(category?: string, difficulty?: string): Promise<SQLChallenge[]> {
    const filter: Record<string, any> = {};
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    const docs = await ChallengeModel.find(filter).lean();
    return docs as unknown as SQLChallenge[];
  }

  async getChallenge(id: string): Promise<SQLChallenge | null> {
    const doc = await ChallengeModel.findOne({ id }).lean();
    return doc as unknown as SQLChallenge | null;
  }

  async createChallenge(data: Omit<SQLChallenge, 'id'>): Promise<SQLChallenge> {
    const doc = await ChallengeModel.create({ id: uuidv4(), ...data });
    return doc.toObject() as unknown as SQLChallenge;
  }

  async submitSolution(
    challengeId: string,
    candidateId: string,
    query: string,
  ): Promise<SQLSubmission> {
    const { passed, result, message } = this.simulateQueryExecution(query);

    const submission: SQLSubmission = {
      id: uuidv4(),
      challengeId,
      candidateId,
      query,
      result,
      isCorrect: passed,
      executionTime: 0,
      submittedAt: new Date(),
      error: message,
    };

    await SubmissionModel.create(submission);
    return submission;
  }

  async getSubmissions(challengeId: string, candidateId?: string): Promise<SQLSubmission[]> {
    const filter: Record<string, any> = { challengeId };
    if (candidateId) filter.candidateId = candidateId;
    const docs = await SubmissionModel.find(filter).lean();
    return docs as unknown as SQLSubmission[];
  }

  async getChallengeStats(challengeId: string): Promise<any> {
    const challenge = await ChallengeModel.findOne({ id: challengeId }).lean();
    if (!challenge) return null;

    const stats = await SubmissionModel.aggregate([
      { $match: { challengeId } },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          successfulAttempts: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        },
      },
    ]);

    const totalAttempts = stats[0]?.totalAttempts || 0;
    const successfulAttempts = stats[0]?.successfulAttempts || 0;

    return {
      totalAttempts,
      successRate: totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0,
      avgExecutionTime: 250,
      difficulty: (challenge as any).difficulty,
    };
  }

  async getCategories(): Promise<string[]> {
    return ChallengeModel.distinct('category');
  }

  private simulateQueryExecution(_query: string): { passed: boolean; result: any[]; message?: string } {
    return {
      passed: false,
      result: [],
      message: 'SQL execution requires a real database — configure DATABASE_URL',
    };
  }
}

export const sqlChallengeService = new SQLChallengeService();
export default sqlChallengeService;
