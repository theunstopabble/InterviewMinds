interface FollowUpContext {
  questionId: string;
  originalQuestion: string;
  previousAnswer: string;
  evaluation?: {
    contentScore: number;
    technicalAccuracy: number;
    depthScore: number;
    redFlags: string[];
  };
  resumeEntities?: {
    companies: string[];
    skills: string[];
    jobTitles: string[];
  };
  questionType: 'behavioral' | 'technical' | 'situational';
  competency?: string;
}

interface GeneratedFollowUp {
  question: string;
  expectedDepth: 'surface' | 'intermediate' | 'deep' | 'expert';
  evaluationCriteria: string[];
  triggerReason: string;
}

function detectVagueTrigger(answer: string): boolean {
  const vaguePhrases = [
    'something', 'stuff', 'things', 'kinda', 'sorta', 'pretty much',
    'basically', 'actually', 'you know', 'like', 'I think', 'I feel'
  ];
  const wordCount = answer.split(/\s+/).length;
  const vagueCount = vaguePhrases.filter(phrase => 
    answer.toLowerCase().includes(phrase)
  ).length;
  return vagueCount >= 2 || wordCount < 30;
}

function detectMissingDetailTrigger(answer: string, questionType: string): boolean {
  if (questionType === 'behavioral') {
    const hasSituation = /when|where|before|at the time|situation/i.test(answer);
    const hasAction = /i did|i decided|i created|i implemented/i.test(answer);
    const hasResult = /result|outcome|achieved|improved|increased/i.test(answer);
    return !hasSituation || !hasAction || !hasResult;
  }
  if (questionType === 'technical') {
    const exampleIndicators = ['for example', 'for instance', 'such as', 'like when', 'specifically'];
    const hasExample = exampleIndicators.some(ind => answer.toLowerCase().includes(ind));
    const hasTechnicalTerms = /api|database|algorithm|framework|code|implementation/i.test(answer);
    return !hasExample || (hasTechnicalTerms && answer.split(/\s+/).length < 50);
  }
  return false;
}

function detectContradictionTrigger(answer: string, resumeEntities?: FollowUpContext['resumeEntities']): boolean {
  const contradictionIndicators = [
    /\b(no|never|not)\b.*\b(experience|worked|used)\b/i,
    /\b(not familiar|don\'t know|can\'t remember)\b.*\b(previous|before|last)\b/i
  ];
  
  if (contradictionIndicators.some(p => p.test(answer))) {
    return true;
  }

  if (resumeEntities?.skills) {
    const mentionedSkills = extractSkills(answer);
    const unlistedClaims = mentionedSkills.filter(
      s => !resumeEntities.skills.some(rs => rs.toLowerCase().includes(s.toLowerCase()))
    );
    if (unlistedClaims.length >= 2) return true;
  }

  return false;
}

function detectInconsistencyTrigger(answer: string): boolean {
  const positiveClaims = /\b(expert|proficient|extensive|years|experience)\b/i.test(answer);
  const negativeClaims = /\b(no|never|not|limited|basic)\b/i.test(answer);
  return positiveClaims && negativeClaims;
}

function extractSkills(text: string): string[] {
  const skillKeywords = [
    'javascript', 'typescript', 'python', 'java', 'react', 'node', 'angular', 'vue',
    'sql', 'nosql', 'mongodb', 'postgresql', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
    'api', 'rest', 'graphql', 'microservices', 'agile', 'scrum', 'ci/cd', 'devops'
  ];
  return skillKeywords.filter(skill => text.toLowerCase().includes(skill));
}

const behavioralFollowUps: Record<string, string[]> = {
  vague: [
    'Can you describe a specific situation where you demonstrated this?',
    'What was the exact outcome of that experience?',
    'Tell me more about the context and your specific role.'
  ],
  missingDetail: [
    'What was your specific contribution to that team?',
    'What challenges did you face and how did you overcome them?',
    'What was the measurable impact of your actions?'
  ],
  contradiction: [
    'You mentioned earlier that you have experience with this. Can you elaborate?',
    'How did you apply this skill in your previous role?',
    'What projects did you work on that demonstrate this?'
  ],
  inconsistency: [
    'Could you clarify what you mean by that?',
    'There seems to be some conflicting information. Can you explain?',
    'What training or experience gave you this expertise?'
  ]
};

const technicalFollowUps: Record<string, string[]> = {
  vague: [
    'Can you walk me through the implementation details?',
    'What was your approach to solving this problem?',
    'What specific technologies did you use?'
  ],
  missingDetail: [
    'What challenges did you encounter during development?',
    'How did you optimize the performance?',
    'What alternatives did you consider and why?'
  ],
  contradiction: [
    'Earlier you mentioned experience with this. What projects used it?',
    'How would you handle this scenario in production?',
    'What edge cases did you need to consider?'
  ],
  inconsistency: [
    'What is the difference between this approach and alternative solutions?',
    'When would you choose this over other methods?',
    'What are the trade-offs of this implementation?'
  ]
};

const situationalFollowUps: Record<string, string[]> = {
  vague: [
    'What specific steps would you take in this situation?',
    'How would you prioritize your actions?',
    'What would be your first concern?'
  ],
  missingDetail: [
    'How would you communicate this to stakeholders?',
    'What resources would you need?',
    'What is the timeline you would expect?'
  ],
  contradiction: [
    'How does this align with company policies?',
    'What are the ethical considerations here?',
    'How would you handle pushback?'
  ],
  inconsistency: [
    'What would you do differently in a similar situation?',
    'How do you balance competing priorities?',
    'What principles guide your decision-making?'
  ]
};

function selectFollowUp(triggerType: string, questionType: string): string {
  const questionTypeMap: Record<string, Record<string, string[]>> = {
    behavioral: behavioralFollowUps,
    technical: technicalFollowUps,
    situational: situationalFollowUps
  };

  const followUps = questionTypeMap[questionType]?.[triggerType] || 
    behavioralFollowUps[triggerType] || 
    ['Can you provide more details?'];

  return followUps[Math.floor(Math.random() * followUps.length)];
}

function determineExpectedDepth(evaluation?: FollowUpContext['evaluation']): 'surface' | 'intermediate' | 'deep' | 'expert' {
  if (!evaluation) return 'intermediate';

  const avgScore = (evaluation.contentScore + evaluation.technicalAccuracy + evaluation.depthScore) / 3;

  if (avgScore >= 80) return 'expert';
  if (avgScore >= 60) return 'deep';
  if (avgScore >= 40) return 'intermediate';
  return 'surface';
}

function getEvaluationCriteria(questionType: string, competency?: string): string[] {
  const baseCriteria = ['clarity', 'specificity', 'relevance'];

  if (questionType === 'behavioral') {
    return [...baseCriteria, 'STAR method', 'measurable outcomes', 'personal accountability'];
  }
  if (questionType === 'technical') {
    return [...baseCriteria, 'technical accuracy', 'depth of understanding', 'practical application'];
  }
  return [...baseCriteria, 'problem-solving approach', 'feasibility', 'communication'];
}

export function generateFollowUp(context: FollowUpContext): GeneratedFollowUp {
  const triggers: { type: string; detected: boolean; reason: string }[] = [
    { type: 'vague', detected: detectVagueTrigger(context.previousAnswer), reason: 'Answer lacks specificity' },
    { type: 'missingDetail', detected: detectMissingDetailTrigger(context.previousAnswer, context.questionType), reason: 'Answer missing key details' },
    { type: 'contradiction', detected: detectContradictionTrigger(context.previousAnswer, context.resumeEntities), reason: 'Answer conflicts with resume' },
    { type: 'inconsistency', detected: detectInconsistencyTrigger(context.previousAnswer), reason: 'Answer contains inconsistencies' }
  ];

  const activeTrigger = triggers.find(t => t.detected);
  const triggerType = activeTrigger?.type || 'vague';

  const question = selectFollowUp(triggerType, context.questionType);
  const expectedDepth = determineExpectedDepth(context.evaluation);
  const evaluationCriteria = getEvaluationCriteria(context.questionType, context.competency);

  return {
    question,
    expectedDepth,
    evaluationCriteria,
    triggerReason: activeTrigger?.reason || 'General clarification needed'
  };
}

function calculateAnswerScores(answer: string, questionType: string): { contentScore: number; technicalAccuracy: number; depthScore: number; redFlags: string[] } {
  const redFlags: string[] = [];
  const words = answer.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const charCount = answer.length;

  /* Content score: based on length, specificity, and structure */
  let contentScore = Math.min(100, Math.round((wordCount / 80) * 60 + (charCount / 500) * 40));
  if (wordCount < 20) { contentScore = Math.min(contentScore, 30); redFlags.push("Answer too short"); }
  if (/\bsomething\b|\bstuff\b|\bthings\b|\bkinda\b|\bsorta\b/.test(answer.toLowerCase())) {
    contentScore -= 15; redFlags.push("Vague language detected");
  }

  /* Technical accuracy: based on technical terms and examples */
  const techTerms = ["api", "database", "algorithm", "framework", "code", "implementation", "architecture", "scalability", "performance", "security", "testing", "deployment", "cache", "queue", "microservice"];
  const techCount = techTerms.filter(t => answer.toLowerCase().includes(t)).length;
  let technicalAccuracy = Math.min(100, Math.round((techCount / 3) * 60 + (wordCount / 100) * 40));
  if (questionType === "technical" && techCount === 0) { technicalAccuracy = Math.min(technicalAccuracy, 25); redFlags.push("No technical terms found"); }

  /* Depth score: based on detail indicators and complexity */
  const detailIndicators = ["because", "therefore", "however", "specifically", "for example", "for instance", "in contrast", "as a result", "moreover", "furthermore", "additionally"];
  const detailCount = detailIndicators.filter(d => answer.toLowerCase().includes(d)).length;
  let depthScore = Math.min(100, Math.round((detailCount / 2) * 50 + (wordCount / 120) * 50));
  if (questionType === "behavioral" && !/result|outcome|achieved|improved|increased/i.test(answer)) {
    depthScore -= 15; redFlags.push("Missing measurable result");
  }

  return {
    contentScore: Math.max(0, Math.round(contentScore)),
    technicalAccuracy: Math.max(0, Math.round(technicalAccuracy)),
    depthScore: Math.max(0, Math.round(depthScore)),
    redFlags,
  };
}

export function generateSequenceFollowUps(context: FollowUpContext, count: number = 3): GeneratedFollowUp[] {
  const followUps: GeneratedFollowUp[] = [];
  let currentContext = { ...context };

  for (let i = 0; i < count; i++) {
    const followUp = generateFollowUp(currentContext);
    followUps.push(followUp);

    const scores = calculateAnswerScores(currentContext.previousAnswer, currentContext.questionType);
    currentContext = {
      ...currentContext,
      previousAnswer: `Previous answer was assessed with score ${followUp.expectedDepth}`,
      evaluation: scores
    };
  }

  return followUps;
}