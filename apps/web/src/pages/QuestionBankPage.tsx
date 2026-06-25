import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Question {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  category: string;
  tags: string[];
  timeLimit: number;
  points: number;
}

interface Category {
  id: string;
  name: string;
  questionCount: number;
  icon: string;
}

const SEED_QUESTIONS: Question[] = [
  // ═══ EASY ═══
  { id: 'seed_e_1', title: 'Reverse a String', description: 'Write a function that reverses a given string without using built-in reverse methods.', type: 'coding', difficulty: 'easy', category: 'Algorithms', tags: ['strings', 'loops'], timeLimit: 15, points: 50 },
  { id: 'seed_e_2', title: 'FizzBuzz', description: 'Print numbers 1 to N. For multiples of 3 print "Fizz", for 5 print "Buzz", for both print "FizzBuzz".', type: 'coding', difficulty: 'easy', category: 'Algorithms', tags: ['loops', 'conditionals'], timeLimit: 10, points: 30 },
  { id: 'seed_e_3', title: 'HTML Form Validation', description: 'Create a form with email and password validation using only HTML5 attributes.', type: 'multiple-choice', difficulty: 'easy', category: 'Frontend', tags: ['html', 'forms'], timeLimit: 10, points: 20 },
  { id: 'seed_e_4', title: 'What is CSS Specificity?', description: 'Explain how CSS specificity works and how the cascade determines which styles apply when multiple rules target the same element.', type: 'behavioral', difficulty: 'easy', category: 'Frontend', tags: ['css', 'cascade'], timeLimit: 10, points: 25 },
  { id: 'seed_e_5', title: 'SQL SELECT Basics', description: 'Write a query to select all users who signed up in the last 30 days, ordered by signup date.', type: 'sql', difficulty: 'easy', category: 'Database', tags: ['sql', 'select'], timeLimit: 10, points: 30 },
  { id: 'seed_e_6', title: 'Difference Between let and var', description: 'What is the difference between let, const, and var in JavaScript? Explain scope, hoisting, and reassignment rules.', type: 'multiple-choice', difficulty: 'easy', category: 'Frontend', tags: ['javascript', 'es6'], timeLimit: 10, points: 25 },
  { id: 'seed_e_7', title: 'Git Commit Workflow', description: 'Walk through the steps to clone a repo, create a branch, make changes, commit, and push to the remote.', type: 'behavioral', difficulty: 'easy', category: 'DevOps', tags: ['git', 'version-control'], timeLimit: 10, points: 20 },
  { id: 'seed_e_8', title: 'Array Sum', description: 'Given an array of integers, return the sum of all elements. Do not use built-in sum functions.', type: 'coding', difficulty: 'easy', category: 'Algorithms', tags: ['arrays', 'iteration'], timeLimit: 10, points: 30 },

  // ═══ MEDIUM ═══
  { id: 'seed_m_1', title: 'Two Sum Problem', description: 'Given an array of integers and a target, return indices of two numbers that add up to the target.', type: 'coding', difficulty: 'medium', category: 'Algorithms', tags: ['arrays', 'hash-map'], timeLimit: 20, points: 60 },
  { id: 'seed_m_2', title: 'React State Management', description: 'Compare useState, useReducer, and Context API. When would you choose one over the others?', type: 'behavioral', difficulty: 'medium', category: 'Frontend', tags: ['react', 'state'], timeLimit: 15, points: 50 },
  { id: 'seed_m_3', title: 'REST API Design', description: 'Design a RESTful API for a blog platform with posts, comments, and user authentication.', type: 'system-design', difficulty: 'medium', category: 'Backend', tags: ['api', 'rest'], timeLimit: 25, points: 70 },
  { id: 'seed_m_4', title: 'SQL JOINs Explained', description: 'Given a users table and an orders table, write a query to find all users who have placed more than 3 orders.', type: 'sql', difficulty: 'medium', category: 'Database', tags: ['sql', 'joins'], timeLimit: 15, points: 50 },
  { id: 'seed_m_5', title: 'Docker Compose Setup', description: 'Write a docker-compose.yml that runs a Node.js app with a PostgreSQL database and Redis cache.', type: 'multiple-choice', difficulty: 'medium', category: 'DevOps', tags: ['docker', 'compose'], timeLimit: 20, points: 55 },
  { id: 'seed_m_6', title: 'Palindrome Checker', description: 'Check if a given string is a palindrome. Consider only alphanumeric characters and ignore case.', type: 'coding', difficulty: 'medium', category: 'Algorithms', tags: ['strings', 'two-pointers'], timeLimit: 15, points: 50 },
  { id: 'seed_m_7', title: 'Debounce Function', description: 'Implement a debounce function that delays invoking a callback until after N ms of inactivity.', type: 'coding', difficulty: 'medium', category: 'Frontend', tags: ['javascript', 'performance'], timeLimit: 20, points: 60 },
  { id: 'seed_m_8', title: 'Rate Limiting Strategies', description: 'Explain token bucket vs leaky bucket rate limiting. How would you implement rate limiting in an Express app?', type: 'system-design', difficulty: 'medium', category: 'Backend', tags: ['api', 'security'], timeLimit: 20, points: 60 },
  { id: 'seed_m_9', title: 'OAuth Flow', description: 'Walk through the OAuth 2.0 authorization code flow. What is the role of the redirect URI and authorization code?', type: 'multiple-choice', difficulty: 'medium', category: 'Security', tags: ['oauth', 'auth'], timeLimit: 15, points: 50 },
  { id: 'seed_m_10', title: 'Agile Estimation', description: 'How do you estimate story points in Scrum? What is the difference between t-shirt sizing and planning poker?', type: 'behavioral', difficulty: 'medium', category: 'Behavioral', tags: ['agile', 'scrum'], timeLimit: 15, points: 40 },

  // ═══ HARD ═══
  { id: 'seed_h_1', title: 'LRU Cache', description: 'Design and implement an LRU (Least Recently Used) cache with get and put operations in O(1) time.', type: 'coding', difficulty: 'hard', category: 'Algorithms', tags: ['cache', 'design'], timeLimit: 35, points: 100 },
  { id: 'seed_h_2', title: 'Real-Time Collaboration', description: 'Design a real-time collaborative document editor like Google Docs. Handle conflict resolution and OT/CRDT.', type: 'system-design', difficulty: 'hard', category: 'System Design', tags: ['real-time', 'architecture'], timeLimit: 40, points: 120 },
  { id: 'seed_h_3', title: 'Webpack Performance Optimization', description: 'Your webpack build takes 5 minutes. Walk through everything you would do to optimize it — code splitting, tree shaking, cache invalidation, loader rules.', type: 'behavioral', difficulty: 'hard', category: 'Frontend', tags: ['webpack', 'performance'], timeLimit: 25, points: 80 },
  { id: 'seed_h_4', title: 'Database Sharding', description: 'Design a sharding strategy for a multi-tenant SaaS database handling 10M+ records. Compare hash-based vs range-based sharding.', type: 'system-design', difficulty: 'hard', category: 'Database', tags: ['sharding', 'scalability'], timeLimit: 35, points: 100 },
  { id: 'seed_h_5', title: 'Kubernetes Deployment Strategy', description: 'Design a zero-downtime deployment strategy on Kubernetes using rolling updates, readiness probes, and canary releases.', type: 'multiple-choice', difficulty: 'hard', category: 'DevOps', tags: ['kubernetes', 'deployment'], timeLimit: 30, points: 90 },
  { id: 'seed_h_6', title: 'JWT Token Security', description: 'You find that your JWT tokens are being intercepted. Redesign the auth system — refresh tokens, rotation, blacklisting, and secure storage.', type: 'system-design', difficulty: 'hard', category: 'Security', tags: ['jwt', 'security'], timeLimit: 30, points: 90 },
  { id: 'seed_h_7', title: 'GraphQL Federation', description: 'Design a GraphQL federation architecture for a microservices ecosystem. Handle schema stitching, gateway routing, and resolver delegation.', type: 'system-design', difficulty: 'hard', category: 'Backend', tags: ['graphql', 'microservices'], timeLimit: 35, points: 100 },
  { id: 'seed_h_8', title: 'Merge K Sorted Lists', description: 'Given K sorted linked lists, merge them into one sorted list. Optimize for both time and space complexity.', type: 'coding', difficulty: 'hard', category: 'Algorithms', tags: ['linked-lists', 'heap'], timeLimit: 30, points: 90 },

  // ═══ EXPERT ═══
  { id: 'seed_x_1', title: 'Distributed Transaction Coordinator', description: 'Design a distributed transaction coordinator that handles sagas across 5 microservices with compensation logic for each step.', type: 'system-design', difficulty: 'expert', category: 'System Design', tags: ['distributed-systems', 'transactions'], timeLimit: 45, points: 150 },
  { id: 'seed_x_2', title: 'Custom Babel Plugin', description: 'Write a custom Babel plugin that automatically wraps every async function with try-catch and logs errors to a monitoring service.', type: 'coding', difficulty: 'expert', category: 'Frontend', tags: ['babel', 'ast'], timeLimit: 40, points: 130 },
  { id: 'seed_x_3', title: 'Vector Clock Implementation', description: 'Implement a vector clock system for conflict resolution in a distributed database. Handle concurrent writes and causality tracking.', type: 'coding', difficulty: 'expert', category: 'Backend', tags: ['distributed-systems', 'conflict'], timeLimit: 45, points: 150 },
  { id: 'seed_x_4', title: 'GDPR Data Pipeline', description: 'Design a data pipeline that enforces GDPR right-to-forget across 20+ services, including backups, logs, and analytics exports.', type: 'system-design', difficulty: 'expert', category: 'Security', tags: ['compliance', 'data'], timeLimit: 45, points: 150 },
  { id: 'seed_x_5', title: 'Multi-Region Active-Active DB', description: 'Design a multi-region active-active database setup with CRDT-based conflict resolution and sub-50ms p99 latency globally.', type: 'system-design', difficulty: 'expert', category: 'Database', tags: ['multi-region', 'crdt'], timeLimit: 50, points: 160 },
  { id: 'seed_x_6', title: 'Scaling WebSockets to 1M', description: 'You need to support 1M concurrent WebSocket connections on a single cluster. Design the architecture — horizontal scaling, sticky sessions, backpressure.', type: 'system-design', difficulty: 'expert', category: 'Backend', tags: ['websockets', 'scaling'], timeLimit: 45, points: 150 },
  { id: 'seed_x_7', title: 'CI/CD Pipeline for Microservices', description: 'Design a CI/CD pipeline for 50+ microservices with dependency-aware build ordering, integration testing, blue-green deployment, and automated rollback.', type: 'system-design', difficulty: 'expert', category: 'DevOps', tags: ['ci-cd', 'microservices'], timeLimit: 40, points: 140 },
  { id: 'seed_x_8', title: 'Technical Strategy for 10x Growth', description: 'Your startup is growing 10x year-over-year. Outline the technical strategy for infrastructure, team scaling, and architectural evolution.', type: 'behavioral', difficulty: 'expert', category: 'Behavioral', tags: ['strategy', 'leadership'], timeLimit: 30, points: 120 },
];

const CATEGORIES_WITH_ICONS: Category[] = [
  { id: 'Algorithms', name: 'Algorithms', questionCount: 0, icon: '🧮' },
  { id: 'Frontend', name: 'Frontend', questionCount: 0, icon: '🎨' },
  { id: 'Backend', name: 'Backend', questionCount: 0, icon: '⚙️' },
  { id: 'Database', name: 'Database', questionCount: 0, icon: '🗄️' },
  { id: 'DevOps', name: 'DevOps', questionCount: 0, icon: '🚀' },
  { id: 'System Design', name: 'System Design', questionCount: 0, icon: '🏗️' },
  { id: 'Behavioral', name: 'Behavioral', questionCount: 0, icon: '💬' },
  { id: 'Security', name: 'Security', questionCount: 0, icon: '🔐' },
];

function filterQuestions(all: Question[], category: string, difficulty: string, query: string): Question[] {
  let filtered = all;
  if (category !== 'all') filtered = filtered.filter(q => q.category === category);
  if (difficulty) filtered = filtered.filter(q => q.difficulty === difficulty);
  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      qs => qs.title.toLowerCase().includes(q) || qs.description.toLowerCase().includes(q) || qs.tags.some(t => t.toLowerCase().includes(q))
    );
  }
  return filtered;
}

export default function QuestionBankPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    title: '', description: '', type: 'coding', difficulty: 'medium',
    timeLimit: 30, points: 100,
  });

  useEffect(() => {
    const catCounts: Record<string, number> = {};
    SEED_QUESTIONS.forEach(q => {
      catCounts[q.category] = (catCounts[q.category] || 0) + 1;
    });
    setCategories(
      CATEGORIES_WITH_ICONS.map(c => ({ ...c, questionCount: catCounts[c.name] || 0 }))
    );
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedCategory, difficulty]);

  const loadData = async () => {
    setLoading(true);
    const filtered = filterQuestions(SEED_QUESTIONS, selectedCategory, difficulty, searchQuery);
    setQuestions(filtered);
    setLoading(false);
  };

  const handleSearch = () => {
    loadData();
  };

  const handleCreate = async () => {
    const newQ: Question = {
      id: `q_${Date.now()}`,
      title: formData.title,
      description: formData.description,
      type: formData.type,
      difficulty: formData.difficulty,
      category: selectedCategory === 'all' ? 'Algorithms' : selectedCategory,
      tags: [],
      timeLimit: formData.timeLimit,
      points: formData.points,
    };
    SEED_QUESTIONS.push(newQ);
    setShowCreateModal(false);
    setEditingQuestion(null);
    setFormData({ title: '', description: '', type: 'coding', difficulty: 'medium', timeLimit: 30, points: 100 });
    loadData();
  };

  const handleEditClick = (q: Question) => {
    setEditingQuestion(q);
    setFormData({ title: q.title, description: q.description, type: q.type, difficulty: q.difficulty, timeLimit: q.timeLimit, points: q.points });
    setShowCreateModal(true);
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy':
        return 'bg-green-500/20 text-green-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'hard':
        return 'bg-orange-500/20 text-orange-400';
      case 'expert':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'coding':
        return '💻';
      case 'multiple-choice':
        return '❓';
      case 'sql':
        return '🗄️';
      case 'system-design':
        return '🏗️';
      case 'behavioral':
        return '💬';
      default:
        return '📝';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">📚 Question Bank</h1>
            <p className="text-gray-400 mt-1">Manage and organize interview questions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
            >
              ← Back
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
            >
              + Add Question
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
              selectedCategory === 'all' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            All ({questions.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                selectedCategory === cat.id ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {cat.icon} {cat.name} ({cat.questionCount})
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
          >
            <option value="">All Levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
          >
            Search
          </button>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {questions.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">📭</div>
                <h3 className="text-xl font-semibold mb-2">No Questions Found</h3>
                <p className="text-gray-400">Try adjusting your filters or add new questions</p>
              </div>
            ) : (
              questions.map((q) => (
                <div
                  key={q.id}
                  className="bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getTypeIcon(q.type)}</span>
                        <h3 className="font-semibold text-lg">{q.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${getDifficultyColor(q.difficulty)}`}>
                          {q.difficulty}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{q.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">⏱️ {q.timeLimit} min</span>
                        <span className="text-gray-500">⭐ {q.points} pts</span>
                        <span className="text-gray-500">🏷️ {q.category}</span>
                      </div>
                      {q.tags.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {q.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditClick(q)} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">
                        Edit
                      </button>
                      <button className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500 text-sm">
                        Use
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl">
              <h2 className="text-2xl font-bold mb-4">{editingQuestion ? 'Edit Question' : 'Add New Question'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    placeholder="e.g., Two Sum Problem"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 h-32"
                    placeholder="Describe the problem..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Type</label>
                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                      <option value="coding">Coding</option>
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="sql">SQL</option>
                      <option value="system-design">System Design</option>
                      <option value="behavioral">Behavioral</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Difficulty</label>
                    <select value={formData.difficulty} onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Time Limit (min)</label>
                    <input
                      type="number"
                      value={formData.timeLimit}
                      onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 0 })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Points</label>
                    <input
                      type="number"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowCreateModal(false); setEditingQuestion(null); }}
                  className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition">
                  {editingQuestion ? 'Save Changes' : 'Create Question'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
