import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionBankService } from '../services/enterprise';

interface GeneratedQuestion {
  id: string;
  text: string;
  competency: string;
  difficulty: string;
  category: string;
  modelAnswer?: string;
  followUpPrompts?: string[];
  showAnswer?: boolean;
}

const FALLBACK_QUESTIONS: Record<string, GeneratedQuestion[]> = {
  'Technical Knowledge': [
    { id: 'fk_tk_1', text: 'What is the difference between let, const, and var in JavaScript?', competency: 'Technical Knowledge', difficulty: 'entry', category: 'technical', modelAnswer: 'let and const are block-scoped while var is function-scoped. let allows reassignment while const does not. var is hoisted and initialized as undefined, let/const are in temporal dead zone.' },
    { id: 'fk_tk_2', text: 'Explain the concept of closures in JavaScript and provide a practical use case.', competency: 'Technical Knowledge', difficulty: 'mid', category: 'technical', modelAnswer: 'A closure is a function that has access to variables from its outer scope even after the outer function has returned. Use cases include data privacy, function factories, and maintaining state.' },
    { id: 'fk_tk_3', text: 'How would you optimize a React application that has slow rendering performance?', competency: 'Technical Knowledge', difficulty: 'senior', category: 'technical', modelAnswer: 'Use React.memo, useMemo, useCallback appropriately. Implement virtualization for long lists. Use React Profiler to identify bottlenecks. Consider code splitting and lazy loading.' },
    { id: 'fk_tk_4', text: 'Design a scalable frontend architecture for an enterprise application with millions of users.', competency: 'Technical Knowledge', difficulty: 'lead', category: 'technical', modelAnswer: 'Monorepo for code sharing, micro-frontends for team autonomy, CDN for static assets, edge computing for global distribution, comprehensive observability, modular component library.' },
  ],
  'Problem Solving': [
    { id: 'fk_ps_1', text: 'How would you debug a JavaScript error in production?', competency: 'Problem Solving', difficulty: 'entry', category: 'technical', modelAnswer: 'Check browser console, use console.error with context, implement error boundaries, use debug logs with correlation IDs, check server logs.' },
    { id: 'fk_ps_2', text: 'You notice an API endpoint is responding slowly. How would you diagnose and fix the issue?', competency: 'Problem Solving', difficulty: 'mid', category: 'technical', modelAnswer: 'Check latency metrics, analyze query performance, review server resources, add caching, optimize database queries, implement rate limiting.' },
    { id: 'fk_ps_3', text: 'A critical bug is causing 5% of users to lose data. The fix requires a schema migration. How do you handle this?', competency: 'Problem Solving', difficulty: 'senior', category: 'situational', modelAnswer: 'Implement backward-compatible migration, add feature flags, prepare rollback script, communicate with users, have monitoring ready.' },
    { id: 'fk_ps_4', text: 'Your team discovers a security vulnerability in your infrastructure. What is your incident response process?', competency: 'Problem Solving', difficulty: 'lead', category: 'situational', modelAnswer: 'Immediate assessment, containment, patching, notification, post-mortem, security audit, implement preventive measures.' },
  ],
  'System Design': [
    { id: 'fk_sd_1', text: 'What is the difference between REST and GraphQL APIs?', competency: 'System Design', difficulty: 'entry', category: 'technical', modelAnswer: 'REST uses multiple endpoints with fixed data structure, GraphQL uses single endpoint with flexible queries. REST is simpler, GraphQL is better for complex data requirements.' },
    { id: 'fk_sd_2', text: 'Design a URL shortener service. What are the key components and how would you handle high traffic?', competency: 'System Design', difficulty: 'mid', category: 'technical', modelAnswer: 'API gateway for routing, hash function for encoding, Redis for caching, database for persistence, CDN for redirects. Use consistent hashing for distribution.' },
    { id: 'fk_sd_3', text: 'Design a real-time notification system that supports millions of users across multiple channels.', competency: 'System Design', difficulty: 'senior', category: 'technical', modelAnswer: 'WebSocket for real-time, message queue for reliability, fan-out pattern for broadcasts, push services for mobile, email service for offline. Multi-region deployment.' },
    { id: 'fk_sd_4', text: 'Design a system that processes job applications, runs AI interviews, and provides real-time assessments for a hiring platform.', competency: 'System Design', difficulty: 'lead', category: 'technical', modelAnswer: 'Microservices architecture, event-driven for async processing, AI service for interview analysis, real-time WebSocket for feedback, encrypted storage for compliance.' },
  ],
  'Behavioral': [
    { id: 'fk_be_1', text: 'Tell me about a challenging technical problem you solved.', competency: 'Behavioral', difficulty: 'entry', category: 'behavioral', modelAnswer: 'Describe the situation, the technical challenge, the approach taken, and the outcome. Include what you learned.' },
    { id: 'fk_be_2', text: 'Describe a time when you had to work with a difficult team member. How did you handle it?', competency: 'Behavioral', difficulty: 'mid', category: 'behavioral', modelAnswer: 'Focus on understanding the root cause, communicate openly, find common ground, escalate if needed while maintaining professionalism.' },
    { id: 'fk_be_3', text: 'Tell me about a time you led a project that failed. What did you learn and how did you apply those lessons?', competency: 'Behavioral', difficulty: 'senior', category: 'behavioral', modelAnswer: 'Be honest about failures, focus on what you learned, show how you improved processes afterward.' },
    { id: 'fk_be_4', text: 'Describe how you have built and managed a high-performing engineering team.', competency: 'Behavioral', difficulty: 'lead', category: 'behavioral', modelAnswer: 'Discuss hiring strategy, onboarding process, mentorship programs, performance evaluation, team culture, and career development.' },
  ],
  'Domain Knowledge': [
    { id: 'fk_dk_1', text: 'What do you understand about our company and the role?', competency: 'Domain Knowledge', difficulty: 'entry', category: 'behavioral', modelAnswer: 'Show that you researched the company, understand the industry, and can articulate why you want to work there.' },
    { id: 'fk_dk_2', text: 'How would you approach building a feature for users with varying technical backgrounds?', competency: 'Domain Knowledge', difficulty: 'mid', category: 'technical', modelAnswer: 'Conduct user research, implement progressive disclosure, ensure accessibility, provide multiple interaction modes.' },
    { id: 'fk_dk_3', text: 'How do you stay current with industry trends and emerging technologies?', competency: 'Domain Knowledge', difficulty: 'senior', category: 'behavioral', modelAnswer: 'Discuss specific resources, community involvement, experimentation, and how you share knowledge with your team.' },
    { id: 'fk_dk_4', text: 'How would you drive innovation within your team while maintaining product stability?', competency: 'Domain Knowledge', difficulty: 'lead', category: 'behavioral', modelAnswer: 'Balance exploration and exploitation, implement innovation sprints, measure and celebrate experiments, maintain technical debt management.' },
  ],
};

const SECTIONS = [
  { id: 'Technical Knowledge', icon: '⚡', color: 'from-blue-500 to-cyan-500', desc: 'Programming, frameworks, and core CS concepts' },
  { id: 'Problem Solving', icon: '🧠', color: 'from-purple-500 to-pink-500', desc: 'Debugging, troubleshooting, and analytical thinking' },
  { id: 'System Design', icon: '🏗️', color: 'from-orange-500 to-red-500', desc: 'Architecture, scalability, and design patterns' },
  { id: 'Behavioral', icon: '💬', color: 'from-green-500 to-emerald-500', desc: 'STAR method questions about past experiences' },
  { id: 'Domain Knowledge', icon: '🎯', color: 'from-cyan-500 to-blue-500', desc: 'Industry and company-specific knowledge' },
];

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  entry: { label: 'Entry', color: 'bg-green-500/20 text-green-400', badge: 'bg-green-500/10 text-green-400 border-green-500/30' },
  mid: { label: 'Mid', color: 'bg-yellow-500/20 text-yellow-400', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  senior: { label: 'Senior', color: 'bg-orange-500/20 text-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  lead: { label: 'Lead', color: 'bg-red-500/20 text-red-400', badge: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  technical: { label: 'Technical', icon: '💻' },
  behavioral: { label: 'Behavioral', icon: '💬' },
  situational: { label: 'Situational', icon: '🔄' },
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRandom(arr: GeneratedQuestion[], n: number): GeneratedQuestion[] {
  return shuffleArray(arr).slice(0, Math.min(n, arr.length));
}

export default function QuestionBankPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [questions, setQuestions] = useState<Record<string, GeneratedQuestion[]>>({});
  const [_loading, setLoading] = useState<Record<string, boolean>>({});
  const [showAllAnswers, setShowAllAnswers] = useState(false);

  const generateForSection = useCallback(async (sectionId: string) => {
    setLoading(prev => ({ ...prev, [sectionId]: true }));
    try {
      const data = await questionBankService.getPracticeQuestions(6, undefined, undefined);
      const all: GeneratedQuestion[] = (data.questions || []).map((q: any) => ({
        id: q.id,
        text: q.question || q.text,
        competency: sectionId,
        difficulty: q.difficulty || 'mid',
        category: q.type || 'technical',
        modelAnswer: q.sampleAnswer || q.modelAnswer,
        showAnswer: false,
      }));
      const sectionQs = all.length >= 3 ? getRandom(all, 3) : [];
      if (sectionQs.length > 0) {
        setQuestions(prev => ({ ...prev, [sectionId]: sectionQs }));
        return;
      }
    } catch {}
    const fallback = FALLBACK_QUESTIONS[sectionId] || [];
    setQuestions(prev => ({ ...prev, [sectionId]: fallback.map(q => ({ ...q, showAnswer: false })) }));
    setLoading(prev => ({ ...prev, [sectionId]: false }));
  }, []);

  const regenerateForSection = async (sectionId: string) => {
    const fallback = FALLBACK_QUESTIONS[sectionId] || [];
    const shuffled = getRandom(fallback, 3);
    setQuestions(prev => ({ ...prev, [sectionId]: shuffled.map(q => ({ ...q, showAnswer: false })) }));
  };

  const toggleAnswer = (sectionId: string, qId: string) => {
    setQuestions(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] || []).map(q =>
        q.id === qId ? { ...q, showAnswer: !q.showAnswer } : q
      ),
    }));
  };

  useEffect(() => {
    generateForSection(activeSection);
  }, [activeSection, generateForSection]);

  useEffect(() => {
    SECTIONS.forEach(s => {
      if (!questions[s.id]) {
        const fb = FALLBACK_QUESTIONS[s.id] || [];
        setQuestions(prev => ({ ...prev, [s.id]: getRandom(fb, 3).map(q => ({ ...q, showAnswer: false })) }));
      }
    });
  }, []);

  const currentQuestions = questions[activeSection] || getRandom(FALLBACK_QUESTIONS[activeSection] || [], 3);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent" />
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-10 relative">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-white transition mb-4 flex items-center gap-2 text-sm"
          >
            <span>←</span> Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Interview Questions
              </h1>
              <p className="text-gray-400 mt-2 text-lg">
                Practice with randomly curated questions across every competency
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAllAnswers(!showAllAnswers)}
                className={`px-4 py-2 rounded-lg border transition text-sm ${
                  showAllAnswers
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {showAllAnswers ? 'Hide All Answers' : 'Show All Answers'}
              </button>
              <button
                onClick={() => regenerateForSection(activeSection)}
                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition flex items-center gap-2"
              >
                <span>🔄</span> Generate New
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-12">
        {/* Section Tabs */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {SECTIONS.map(s => {
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`relative p-4 rounded-xl border transition-all duration-200 ${
                  isActive
                    ? 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/5'
                    : 'border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-800/50'
                }`}
              >
                <div className={`text-2xl mb-2 ${isActive ? 'scale-110' : ''} transition-transform`}>
                  {s.icon}
                </div>
                <div className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {s.id}
                </div>
                {isActive && (
                  <div className="absolute -bottom-px left-4 right-4 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Section Description */}
        <div className="mb-6">
          <div className={`inline-block px-4 py-1.5 rounded-full text-sm bg-gradient-to-r ${SECTIONS.find(s => s.id === activeSection)?.color} bg-opacity-10 text-white/80`}>
            {SECTIONS.find(s => s.id === activeSection)?.desc}
          </div>
        </div>

        {/* Questions Grid */}
        <div className="grid gap-5">
          {currentQuestions.map((q, idx) => {
            const diffConfig = DIFFICULTY_CONFIG[q.difficulty] || DIFFICULTY_CONFIG.mid;
            const typeConfig = TYPE_CONFIG[q.category] || TYPE_CONFIG.technical;

            return (
              <div
                key={q.id}
                className="group bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all duration-200"
              >
                {/* Question Header */}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center text-lg font-bold text-blue-400">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-lg" title={typeConfig.label}>{typeConfig.icon}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${diffConfig.badge}`}>
                          {diffConfig.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {q.competency}
                        </span>
                      </div>
                      <p className="text-base leading-relaxed text-gray-200">
                        {q.text}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleAnswer(activeSection, q.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        q.showAnswer || showAllAnswers
                          ? 'bg-green-500/10 border-green-500/30 text-green-400'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                      }`}
                    >
                      {q.showAnswer || showAllAnswers ? '▲ Hide Answer' : '▼ View Answer'}
                    </button>
                    {q.followUpPrompts && q.followUpPrompts.length > 0 && (
                      <span className="text-xs text-gray-600">
                        {q.followUpPrompts.length} follow-up{q.followUpPrompts.length > 1 ? 's' : ''} available
                      </span>
                    )}
                  </div>

                  {/* Model Answer (expandable) */}
                  {(q.showAnswer || showAllAnswers) && q.modelAnswer && (
                    <div className="mt-3 p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-green-400 font-medium">Model Answer</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {q.modelAnswer}
                      </p>
                      {q.followUpPrompts && q.followUpPrompts.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-700/50">
                          <span className="text-xs text-gray-500 font-medium">Possible Follow-ups:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {q.followUpPrompts.map((fp, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-400">
                                {fp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Regenerate Section */}
        <div className="mt-8 flex items-center justify-center gap-4 py-6 border-t border-gray-800">
          <button
            onClick={() => regenerateForSection(activeSection)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all font-medium shadow-lg shadow-blue-600/20"
          >
            🔄 Generate New Questions
          </button>
          <div className="text-sm text-gray-500">
            Questions refresh randomly from a curated pool
          </div>
        </div>
      </div>
    </div>
  );
}
