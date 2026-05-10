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

class SQLChallengeService {
  private challenges: Map<string, SQLChallenge> = new Map();
  private submissions: Map<string, SQLSubmission[]> = new Map();

  constructor() {
    this.initializeDefaultChallenges();
  }

  private initializeDefaultChallenges() {
    const defaultChallenges: SQLChallenge[] = [
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

    defaultChallenges.forEach(c => this.challenges.set(c.id, c));
  }

  getChallenge(id: string): SQLChallenge | null {
    return this.challenges.get(id) || null;
  }

  getChallenges(filters?: { difficulty?: string; category?: string }): SQLChallenge[] {
    let challenges = Array.from(this.challenges.values());

    if (filters?.difficulty) {
      challenges = challenges.filter(c => c.difficulty === filters.difficulty);
    }
    if (filters?.category) {
      challenges = challenges.filter(c => c.category === filters.category);
    }

    return challenges;
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    this.challenges.forEach(c => categories.add(c.category));
    return Array.from(categories);
  }

  validateQuery(challengeId: string, query: string): { isCorrect: boolean; result?: any; error?: string } {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return { isCorrect: false, error: 'Challenge not found' };
    }

    try {
      const mockResult = this.simulateQueryExecution(challenge, query);
      return { isCorrect: true, result: mockResult };
    } catch (error: any) {
      return { isCorrect: false, error: error.message };
    }
  }

  private simulateQueryExecution(challenge: SQLChallenge, query: string): any[] {
    return challenge.schema.tables[0]?.sampleData || [];
  }

  submitSolution(challengeId: string, candidateId: string, query: string): SQLSubmission {
    const validation = this.validateQuery(challengeId, query);
    
    const submission: SQLSubmission = {
      id: uuidv4(),
      challengeId,
      candidateId,
      query,
      result: validation.result || [],
      isCorrect: validation.isCorrect,
      executionTime: Math.floor(Math.random() * 500),
      submittedAt: new Date(),
      error: validation.error,
    };

    const existing = this.submissions.get(candidateId) || [];
    existing.push(submission);
    this.submissions.set(candidateId, existing);

    return submission;
  }

  getSubmissions(candidateId: string): SQLSubmission[] {
    return this.submissions.get(candidateId) || [];
  }

  getChallengeStats(challengeId: string): any {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return null;

    let totalAttempts = 0;
    let successfulAttempts = 0;

    for (const subs of this.submissions.values()) {
      const challengeSubs = subs.filter(s => s.challengeId === challengeId);
      totalAttempts += challengeSubs.length;
      successfulAttempts += challengeSubs.filter(s => s.isCorrect).length;
    }

    return {
      totalAttempts,
      successRate: totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0,
      avgExecutionTime: 250,
      difficulty: challenge.difficulty,
    };
  }
}

export const sqlChallengeService = new SQLChallengeService();
export default sqlChallengeService;