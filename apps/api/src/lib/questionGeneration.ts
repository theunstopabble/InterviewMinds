interface Question {
  id: string;
  text: string;
  competency: string;
  difficulty: 'entry' | 'mid' | 'senior' | 'lead';
  evaluationCriteria: string[];
  modelAnswer: string;
  followUpPrompts: string[];
  category: 'technical' | 'behavioral' | 'situational';
}

interface QuestionBank {
  [competency: string]: {
    entry: Question[];
    mid: Question[];
    senior: Question[];
    lead: Question[];
  };
}

const questionBank: QuestionBank = {
  'Technical Knowledge': {
    entry: [
      {
        id: 'tk_entry_1',
        text: 'What is the difference between let, const, and var in JavaScript?',
        competency: 'Technical Knowledge',
        difficulty: 'entry',
        evaluationCriteria: ['Scope', 'Hoisting', 'Mutability'],
        modelAnswer: 'let and const are block-scoped while var is function-scoped. let allows reassignment while const does not. var is hoisted and initialized as undefined, let/const are in temporal dead zone.',
        followUpPrompts: ['Explain hoisting in detail', 'When would you choose each?'],
        category: 'technical'
      }
    ],
    mid: [
      {
        id: 'tk_mid_1',
        text: 'Explain the concept of closures in JavaScript and provide a practical use case.',
        competency: 'Technical Knowledge',
        difficulty: 'mid',
        evaluationCriteria: ['Definition', 'Practical Application', 'Memory Implications'],
        modelAnswer: 'A closure is a function that has access to variables from its outer scope even after the outer function has returned. Use cases include data privacy, function factories, and maintaining state.',
        followUpPrompts: ['What are the memory implications?', 'Create a simple currying example'],
        category: 'technical'
      }
    ],
    senior: [
      {
        id: 'tk_senior_1',
        text: 'How would you optimize a React application that has slow rendering performance?',
        competency: 'Technical Knowledge',
        difficulty: 'senior',
        evaluationCriteria: ['React Optimization', 'Profiler Usage', 'Memo Strategies'],
        modelAnswer: 'Use React.memo, useMemo, useCallback appropriately. Implement virtualization for long lists. Use React Profiler to identify bottlenecks. Consider code splitting and lazy loading.',
        followUpPrompts: ['When would you NOT use memo?', 'Explain useMemo dependency array'],
        category: 'technical'
      }
    ],
    lead: [
      {
        id: 'tk_lead_1',
        text: 'Design a scalable frontend architecture for an enterprise application with millions of users.',
        competency: 'Technical Knowledge',
        difficulty: 'lead',
        evaluationCriteria: ['Scalability', 'Performance', 'Maintainability', 'Team Structure'],
        modelAnswer: 'Monorepo for code sharing, micro-frontends for team autonomy, CDN for static assets, edge computing for global distribution, comprehensive observability, modular component library.',
        followUpPrompts: ['How would you handle state management?', 'What about SEO considerations?'],
        category: 'technical'
      }
    ]
  },
  'Problem Solving': {
    entry: [
      {
        id: 'ps_entry_1',
        text: 'How would you debug a JavaScript error in production?',
        competency: 'Problem Solving',
        difficulty: 'entry',
        evaluationCriteria: ['Debugging Tools', 'Process', 'Logging'],
        modelAnswer: 'Check browser console, use console.error with context, implement error boundaries, use debug logs with correlation IDs, check server logs.',
        followUpPrompts: ['What tools do you use?', 'How would you reproduce the issue?'],
        category: 'technical'
      }
    ],
    mid: [
      {
        id: 'ps_mid_1',
        text: 'You notice an API endpoint is responding slowly. How would you diagnose and fix the issue?',
        competency: 'Problem Solving',
        difficulty: 'mid',
        evaluationCriteria: ['Diagnosis', 'Monitoring', 'Optimization'],
        modelAnswer: 'Check latency metrics, analyze query performance, review server resources, add caching, optimize database queries, implement rate limiting.',
        followUpPrompts: ['What metrics matter most?', 'How would you prevent recurrence?'],
        category: 'technical'
      }
    ],
    senior: [
      {
        id: 'ps_senior_1',
        text: 'A critical bug is causing 5% of users to lose data. The fix requires a schema migration. How do you handle this?',
        competency: 'Problem Solving',
        difficulty: 'senior',
        evaluationCriteria: ['Risk Assessment', 'Rollback Plan', 'Communication'],
        modelAnswer: 'Implement backward-compatible migration, add feature flags, prepare rollback script, communicate with users, have monitoring ready.',
        followUpPrompts: ['How do you test this?', 'What if migration fails?'],
        category: 'situational'
      }
    ],
    lead: [
      {
        id: 'ps_lead_1',
        text: 'Your team discovers a security vulnerability in your infrastructure. What is your incident response process?',
        competency: 'Problem Solving',
        difficulty: 'lead',
        evaluationCriteria: ['Incident Response', 'Communication', 'Prevention'],
        modelAnswer: 'Immediate assessment, containment, patching, notification, post-mortem, security audit, implement预防 measures.',
        followUpPrompts: ['How do you communicate with stakeholders?', 'What about regulatory requirements?'],
        category: 'situational'
      }
    ]
  },
  'System Design': {
    entry: [
      {
        id: 'sd_entry_1',
        text: 'What is the difference between REST and GraphQL APIs?',
        competency: 'System Design',
        difficulty: 'entry',
        evaluationCriteria: ['API Concepts', 'Data Fetching', 'Use Cases'],
        modelAnswer: 'REST uses multiple endpoints with fixed data structure, GraphQL uses single endpoint with flexible queries. REST is simpler, GraphQL is better for complex data requirements.',
        followUpPrompts: ['When would you choose each?', 'What are the downsides of GraphQL?'],
        category: 'technical'
      }
    ],
    mid: [
      {
        id: 'sd_mid_1',
        text: 'Design a URL shortener service. What are the key components and how would you handle high traffic?',
        competency: 'System Design',
        difficulty: 'mid',
        evaluationCriteria: ['Architecture', 'Scalability', 'Data Model'],
        modelAnswer: 'API gateway for routing, hash function for encoding, Redis for caching, database for persistence, CDN for redirects. Use consistent hashing for distribution.',
        followUpPrompts: ['How do you handle collision?', 'What about analytics?'],
        category: 'technical'
      }
    ],
    senior: [
      {
        id: 'sd_senior_1',
        text: 'Design a real-time notification system that supports millions of users across multiple channels.',
        competency: 'System Design',
        difficulty: 'senior',
        evaluationCriteria: ['Real-time Architecture', 'Scalability', 'Reliability'],
        modelAnswer: 'WebSocket for real-time, message queue for reliability, fan-out pattern for broadcasts, push services for mobile, email service for offline. Multi-region deployment.',
        followUpPrompts: ['How do you handle offline users?', 'What about message ordering?'],
        category: 'technical'
      }
    ],
    lead: [
      {
        id: 'sd_lead_1',
        text: 'Design a system that processes job applications, runs AI interviews, and provides real-time assessments for a hiring platform.',
        competency: 'System Design',
        difficulty: 'lead',
        evaluationCriteria: ['Complex System', 'AI Integration', 'Real-time', 'Compliance'],
        modelAnswer: 'Microservices architecture, event-driven for async processing, AI service for interview analysis, real-time WebSocket for feedback, encrypted storage for compliance.',
        followUpPrompts: ['How do you ensure AI fairness?', 'What about data privacy regulations?'],
        category: 'technical'
      }
    ]
  },
  'Behavioral': {
    entry: [
      {
        id: 'be_entry_1',
        text: 'Tell me about a challenging technical problem you solved.',
        competency: 'Behavioral',
        difficulty: 'entry',
        evaluationCriteria: ['STAR Method', 'Technical Depth', 'Learning'],
        modelAnswer: 'Describe the situation, the technical challenge, the approach taken, and the outcome. Include what you learned.',
        followUpPrompts: ['What was the hardest part?', 'What would you do differently?'],
        category: 'behavioral'
      }
    ],
    mid: [
      {
        id: 'be_mid_1',
        text: 'Describe a time when you had to work with a difficult team member. How did you handle it?',
        competency: 'Behavioral',
        difficulty: 'mid',
        evaluationCriteria: ['Conflict Resolution', 'Communication', 'Empathy'],
        modelAnswer: 'Focus on understanding the root cause, communicate openly, find common ground, escalate if needed while maintaining professionalism.',
        followUpPrompts: ['What was the outcome?', 'What did you learn?'],
        category: 'behavioral'
      }
    ],
    senior: [
      {
        id: 'be_senior_1',
        text: 'Tell me about a time you led a project that failed. What did you learn and how did you apply those lessons?',
        competency: 'Behavioral',
        difficulty: 'senior',
        evaluationCriteria: ['Leadership', 'Accountability', 'Growth Mindset'],
        modelAnswer: 'Be honest about failures, focus on what you learned, show how you improved processes afterward.',
        followUpPrompts: ['How did the team respond?', 'What would you do differently?'],
        category: 'behavioral'
      }
    ],
    lead: [
      {
        id: 'be_lead_1',
        text: 'Describe how you have built and managed a high-performing engineering team.',
        competency: 'Behavioral',
        difficulty: 'lead',
        evaluationCriteria: ['Team Building', 'Mentorship', 'Performance Management'],
        modelAnswer: 'Discuss hiring strategy, onboarding process, mentorship programs, performance evaluation, team culture, and career development.',
        followUpPrompts: ['How do you handle underperformers?', 'What is your hiring philosophy?'],
        category: 'behavioral'
      }
    ]
  },
  'Domain Knowledge': {
    entry: [
      {
        id: 'dk_entry_1',
        text: 'What do you understand about our company and the role?',
        competency: 'Domain Knowledge',
        difficulty: 'entry',
        evaluationCriteria: ['Research', 'Understanding', 'Fit'],
        modelAnswer: 'Show that you researched the company, understand the industry, and can articulate why you want to work there.',
        followUpPrompts: ['What excites you most?', 'How do you see yourself contributing?'],
        category: 'behavioral'
      }
    ],
    mid: [
      {
        id: 'dk_mid_1',
        text: 'How would you approach building a feature for users with varying technical backgrounds?',
        competency: 'Domain Knowledge',
        difficulty: 'mid',
        evaluationCriteria: ['User Research', 'UX Design', 'Accessibility'],
        modelAnswer: 'Conduct user research, implement progressive disclosure, ensure accessibility, provide multiple interaction modes.',
        followUpPrompts: ['How do you prioritize features?', 'What about performance?'],
        category: 'technical'
      }
    ],
    senior: [
      {
        id: 'dk_senior_1',
        text: 'How do you stay current with industry trends and emerging technologies?',
        competency: 'Domain Knowledge',
        difficulty: 'senior',
        evaluationCriteria: ['Learning Strategy', 'Knowledge Sharing', 'Application'],
        modelAnswer: 'Discuss specific resources, community involvement, experimentation, and how you share knowledge with your team.',
        followUpPrompts: ['What technologies are you exploring?', 'How do you evaluate new tools?'],
        category: 'behavioral'
      }
    ],
    lead: [
      {
        id: 'dk_lead_1',
        text: 'How would you drive innovation within your team while maintaining product stability?',
        competency: 'Domain Knowledge',
        difficulty: 'lead',
        evaluationCriteria: ['Innovation Strategy', 'Risk Management', 'Culture'],
        modelAnswer: 'Balance exploration and exploitation, implement innovation sprints, measure and celebrate experiments, maintain technical debt management.',
        followUpPrompts: ['How do you measure innovation success?', 'What is your approach to technical debt?'],
        category: 'behavioral'
      }
    ]
  }
};

function generateQuestionId(): string {
  return `q_${crypto.randomUUID().slice(0, 8)}`;
}

function getCompetencies(): string[] {
  return Object.keys(questionBank);
}

function getDifficultyLevel(experience: number): 'entry' | 'mid' | 'senior' | 'lead' {
  if (experience < 2) return 'entry';
  if (experience < 5) return 'mid';
  if (experience < 8) return 'senior';
  return 'lead';
}

function getCategoryWeights(jobType: string): Record<string, number> {
  const defaults: Record<string, Record<string, number>> = {
    frontend: { 'Technical Knowledge': 0.35, 'Problem Solving': 0.25, 'System Design': 0.15, 'Behavioral': 0.15, 'Domain Knowledge': 0.10 },
    backend: { 'Technical Knowledge': 0.30, 'Problem Solving': 0.25, 'System Design': 0.25, 'Behavioral': 0.10, 'Domain Knowledge': 0.10 },
    fullstack: { 'Technical Knowledge': 0.30, 'Problem Solving': 0.25, 'System Design': 0.20, 'Behavioral': 0.15, 'Domain Knowledge': 0.10 },
    devops: { 'Technical Knowledge': 0.30, 'Problem Solving': 0.25, 'System Design': 0.25, 'Behavioral': 0.10, 'Domain Knowledge': 0.10 },
    data: { 'Technical Knowledge': 0.35, 'Problem Solving': 0.25, 'System Design': 0.15, 'Behavioral': 0.15, 'Domain Knowledge': 0.10 }
  };
  return defaults[jobType] || defaults.fullstack;
}

export function generateQuestions(
  jobType: string,
  experienceYears: number,
  requiredSkills: string[],
  count: number = 10
): Question[] {
  const questions: Question[] = [];
  const difficulty = getDifficultyLevel(experienceYears);
  const categoryWeights = getCategoryWeights(jobType);
  const competencies = getCompetencies();

  for (let i = 0; i < count; i++) {
    const competency = competencies[i % competencies.length];
    const levelQuestions = questionBank[competency][difficulty];
    
    if (levelQuestions.length > 0) {
      const question = { ...levelQuestions[i % levelQuestions.length] };
      question.id = generateQuestionId();
      questions.push(question);
    }
  }

  return questions;
}

export function getQuestionById(id: string): Question | null {
  for (const competency of Object.keys(questionBank)) {
    for (const level of Object.keys(questionBank[competency]) as ('entry' | 'mid' | 'senior' | 'lead')[]) {
      const found = questionBank[competency][level].find(q => q.id === id);
      if (found) return found;
    }
  }
  return null;
}

export function getCompetencyQuestions(competency: string, difficulty: string): Question[] {
  const level = difficulty as 'entry' | 'mid' | 'senior' | 'lead';
  return questionBank[competency]?.[level] || [];
}

export function getAllCompetencies(): { name: string; description: string; questionCount: number }[] {
  return [
    { name: 'Technical Knowledge', description: 'Programming, frameworks, and technical concepts', questionCount: 16 },
    { name: 'Problem Solving', description: 'Debugging, troubleshooting, and analytical thinking', questionCount: 16 },
    { name: 'System Design', description: 'Architecture, scalability, and design patterns', questionCount: 16 },
    { name: 'Behavioral', description: 'STAR method questions about experiences', questionCount: 16 },
    { name: 'Domain Knowledge', description: 'Industry and company-specific knowledge', questionCount: 16 }
  ];
}