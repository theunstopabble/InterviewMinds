import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionBankService } from '../services/enterprise';

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
    loadData();
  }, [selectedCategory, difficulty]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [questionsData, categoriesData] = await Promise.all([
        questionBankService.getQuestions(selectedCategory === 'all' ? undefined : selectedCategory, {
          difficulty: difficulty || undefined,
          limit: 50,
        }).catch(() => ({ questions: [] })),
        questionBankService.getCategories().catch(() => ({ categories: [] })),
      ]);
      setQuestions(questionsData.questions || []);
      setCategories(categoriesData.categories || []);
    } catch (e) {
      console.error('Error loading data:', e);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }
    setLoading(true);
    try {
      const data = await questionBankService.search(searchQuery, {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        difficulty: difficulty || undefined,
      });
      setQuestions(data.questions || []);
    } catch (e) {
      console.error('Error searching:', e);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      await questionBankService.create({
        title: formData.title, description: formData.description,
        type: formData.type, difficulty: formData.difficulty,
        timeLimit: formData.timeLimit, points: formData.points,
      });
      setShowCreateModal(false);
      setEditingQuestion(null);
      setFormData({ title: '', description: '', type: 'coding', difficulty: 'medium', timeLimit: 30, points: 100 });
      loadData();
    } catch (e) {
      console.error('Error creating question:', e);
    }
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