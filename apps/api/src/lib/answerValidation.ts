interface AnswerEvaluation {
  questionId: string;
  transcript: string;
  evaluation: {
    contentScore: number;
    technicalAccuracy: number;
    clarity: number;
    depthScore: number;
    starMethod: { situation: number; task: number; action: number; result: number };
  };
  redFlags: {
    type: 'vague' | 'inconsistent' | 'memorized' | 'copied' | 'over_confident' | 'under_confident';
    description: string;
    timestamp: string;
  }[];
  suggestedFollowUp?: string;
  overallScore: number;
  feedback: string;
}

interface AnswerContext {
  question: string;
  transcript: string;
  resumeEntities?: {
    companies: string[];
    schools: string[];
    skills: string[];
    jobTitles: string[];
  };
  questionType?: 'behavioral' | 'technical' | 'situational';
  expectedCompetencies?: string[];
}

interface RedFlag {
  type: 'vague' | 'inconsistent' | 'memorized' | 'copied' | 'over_confident' | 'under_confident';
  description: string;
  timestamp: string;
}

interface ContentMatch {
  keyPoints: { keyword: string; found: boolean; relevance: number }[];
  detailLevel: number;
  technicalAccuracy: number;
  examplesProvided: boolean;
}

function extractKeyPhrases(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
    'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'being', 'being'
  ]);

  const words = text.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  const freq: Record<string, number> = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

function detectVaguePhrases(text: string): RedFlag | null {
  const vaguePatterns = [
    /\b(something|stuff|things?|kinda|sorta|pretty much|basically|actually|you know|like)\b/gi,
    /\b(obviously|clearly|definitely|absolutely|definitely)\b/gi,
    /\b(I think|I believe|I feel|I guess)\b/gi
  ];

  for (const pattern of vaguePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length >= 2) {
      return {
        type: 'vague',
        description: `Contains vague language: "${matches.slice(0, 2).join(', ')}"`,
        timestamp: new Date().toISOString()
      };
    }
  }

  if (text.split(/\s+/).filter(w => w.length > 0).length < 20) {
    return {
      type: 'vague',
      description: 'Answer is too short and lacks detail',
      timestamp: new Date().toISOString()
    };
  }

  return null;
}

function detectInconsistency(text: string, context: AnswerContext): RedFlag | null {
  const resumeText = [
    ...(context.resumeEntities?.companies || []),
    ...(context.resumeEntities?.skills || []),
    ...(context.resumeEntities?.jobTitles || [])
  ].join(' ').toLowerCase();

  const textLower = text.toLowerCase();

  const contradictionPatterns = [
    { positive: /\bno experience\b/i, negative: /\b\d+\+?\s*years?\b/i },
    { positive: /\bnever\b/i, negative: /\b(used to|previously|before)\b/i },
    { positive: /\bnot familiar\b/i, negative: /\b(expert|proficient|experienced)\b/i }
  ];

  for (const pattern of contradictionPatterns) {
    if (pattern.positive.test(textLower) && pattern.negative.test(textLower)) {
      return {
        type: 'inconsistent',
        description: 'Answer contains contradictory statements',
        timestamp: new Date().toISOString()
      };
    }
  }

  const mentionedSkills = extractKeyPhrases(text);
  const claimMismatch = mentionedSkills.filter((skill: string) => {
    const mentioned = context.resumeEntities?.skills?.some(
      rs => rs.toLowerCase().includes(skill) || skill.includes(rs.toLowerCase())
    );
    return !mentioned && skill.length > 5;
  });

  if (claimMismatch.length > 3) {
    return {
      type: 'inconsistent',
      description: `Claims expertise in unlisted skills: ${claimMismatch.slice(0, 3).join(', ')}`,
      timestamp: new Date().toISOString()
    };
  }

  return null;
}

function detectMemorizedAnswer(text: string): RedFlag | null {
  const scriptedPhrases = [
    /\b(I am|I'm) (a|an) (passionate|driven|motivated|dedicated|experienced)/i,
    /\b(I have|I possess) (excellent|strong|extensive) (experience|skills|knowledge)/i,
    /\b(my (greatest|biggest) (strength|achievement|accomplishment))/i,
    /\b(I (strive|aim|focus) to (be|become|achieve))/i
  ];

  for (const pattern of scriptedPhrases) {
    if (pattern.test(text)) {
      return {
        type: 'memorized',
        description: 'Answer appears to be a rehearsed/memorized response',
        timestamp: new Date().toISOString()
      };
    }
  }

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 1) {
    const similarStructures = sentences.slice(0, -1).every(s => {
      const hasStartPattern = /^(I (have|am|will|want)|My|The|Because)/i.test(s.trim());
      return hasStartPattern;
    });
    if (similarStructures) {
      return {
        type: 'memorized',
        description: 'Answer has overly structured pattern suggesting memorization',
        timestamp: new Date().toISOString()
      };
    }
  }

  return null;
}

function detectCopiedContent(text: string): RedFlag | null {
  const technicalTerms = [
    'algorithm', 'database', 'api', 'framework', 'architecture', 'optimization',
    'implementation', 'deployment', 'scalability', 'performance', 'security'
  ];

  const lowerText = text.toLowerCase();
  const technicalCount = technicalTerms.filter(term => lowerText.includes(term)).length;

  const words = text.split(/\s+/).filter(w => w.length > 0);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const vocabularyRatio = uniqueWords.size / words.length;

  if (vocabularyRatio < 0.3 && words.length > 50) {
    return {
      type: 'copied',
      description: 'Low vocabulary diversity suggests potential copied content',
      timestamp: new Date().toISOString()
    };
  }

  if (technicalCount >= 5 && vocabularyRatio < 0.4) {
    return {
      type: 'copied',
      description: 'Contains technical terms but with low variation - possible copied content',
      timestamp: new Date().toISOString()
    };
  }

  return null;
}

function detectConfidenceLevel(text: string): RedFlag | null {
  const overConfidentPatterns = [
    /\b(perfect|flawless|impossible|never fail|guaranteed)\b/i,
    /\b(100%|completely|certainly|without doubt)\b/i
  ];

  for (const pattern of overConfidentPatterns) {
    if (pattern.test(text)) {
      return {
        type: 'over_confident',
        description: 'Answer shows unrealistic over-confidence',
        timestamp: new Date().toISOString()
      };
    }
  }

  const underConfidentPatterns = [
    /\b(not sure|I don\'t know|might be|probably maybe)\b/gi,
    /\b(I\'m not (good|experienced|qualified))\b/i
  ];

  let uncertainCount = 0;
  for (const pattern of underConfidentPatterns) {
    uncertainCount += (text.match(pattern) || []).length;
  }

  if (uncertainCount >= 3) {
    return {
      type: 'under_confident',
      description: 'Answer shows excessive uncertainty',
      timestamp: new Date().toISOString()
    };
  }

  return null;
}

function analyzeContentMatch(text: string, context: AnswerContext): ContentMatch {
  const keyPhrases = extractKeyPhrases(text);
  const expectedCompetencies = context.expectedCompetencies || [];

  const keyPoints = expectedCompetencies.map(comp => ({
    keyword: comp,
    found: keyPhrases.some(kp => kp.includes(comp.toLowerCase()) || comp.toLowerCase().includes(kp)),
    relevance: keyPhrases.some(kp => kp.includes(comp.toLowerCase())) ? 1 : 0
  }));

  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const avgSentenceLength = text.split(/\s+/).length / Math.max(sentenceCount, 1);
  const detailLevel = Math.min(100, Math.round((avgSentenceLength / 30) * 100));

  const technicalTerms = [
    'api', 'database', 'algorithm', 'framework', 'architecture', 'code',
    'implementation', 'optimization', 'testing', 'deployment', 'security'
  ];
  const technicalTermsFound = technicalTerms.filter(t => text.toLowerCase().includes(t)).length;
  const technicalAccuracy = Math.min(100, (technicalTermsFound / technicalTerms.length) * 100);

  const exampleIndicators = ['for example', 'for instance', 'such as', 'e.g.', 'like when', 'specifically'];
  const examplesProvided = exampleIndicators.some(ind => text.toLowerCase().includes(ind));

  return { keyPoints, detailLevel, technicalAccuracy, examplesProvided };
}

function analyzeSTARMethod(text: string): { situation: number; task: number; action: number; result: number } {
  const starKeywords = {
    situation: ['when', 'where', 'before', 'after', 'at the time', 'situation was'],
    task: ['needed to', 'had to', 'goal was', 'responsible for', 'task was'],
    action: ['i did', 'i decided', 'i created', 'i implemented', 'i worked', 'i led', 'i developed', 'i built'],
    result: ['result was', 'outcome', 'achieved', 'accomplished', 'improved', 'increased', 'reduced', 'successful']
  };

  const scoreComponent = (keywords: string[], text: string): number => {
    const matches = keywords.filter(kw => text.toLowerCase().includes(kw)).length;
    return Math.min(100, matches * 33);
  };

  return {
    situation: scoreComponent(starKeywords.situation, text),
    task: scoreComponent(starKeywords.task, text),
    action: scoreComponent(starKeywords.action, text),
    result: scoreComponent(starKeywords.result, text)
  };
}

function calculateOverallScore(evaluation: AnswerEvaluation['evaluation'], redFlags: RedFlag[]): number {
  const contentWeight = 0.35;
  const technicalWeight = 0.25;
  const clarityWeight = 0.15;
  const depthWeight = 0.15;
  const starWeight = 0.10;

  const starAvg = (
    evaluation.starMethod.situation +
    evaluation.starMethod.task +
    evaluation.starMethod.action +
    evaluation.starMethod.result
  ) / 400;

  let baseScore =
    evaluation.contentScore * contentWeight +
    evaluation.technicalAccuracy * technicalWeight +
    evaluation.clarity * clarityWeight +
    evaluation.depthScore * depthWeight +
    starAvg * 100 * starWeight;

  const highSeverityFlags = redFlags.filter(rf => 
    rf.type === 'inconsistent' || rf.type === 'copied'
  ).length;
  const penalty = highSeverityFlags * 10;

  return Math.max(0, Math.min(100, Math.round(baseScore - penalty)));
}

function generateFeedback(evaluation: AnswerEvaluation['evaluation'], redFlags: RedFlag[]): string {
  const feedbackParts: string[] = [];

  if (evaluation.contentScore >= 80) {
    feedbackParts.push('Good coverage of key concepts.');
  } else if (evaluation.contentScore < 50) {
    feedbackParts.push('Consider providing more specific details and examples.');
  }

  if (evaluation.technicalAccuracy >= 80) {
    feedbackParts.push('Strong technical understanding demonstrated.');
  } else if (evaluation.technicalAccuracy < 50) {
    feedbackParts.push('Review technical fundamentals for this topic.');
  }

  if (evaluation.clarity < 60) {
    feedbackParts.push('Try to be more concise and structured in your responses.');
  }

  if (evaluation.depthScore < 50) {
    feedbackParts.push('Go deeper into the reasoning behind your answers.');
  }

  const starComponent = (evaluation.starMethod.situation + evaluation.starMethod.task + evaluation.starMethod.action + evaluation.starMethod.result) / 400;
  if (starComponent < 50) {
    feedbackParts.push('Use the STAR method (Situation, Task, Action, Result) for behavioral questions.');
  }

  const criticalFlags = redFlags.filter(rf => 
    rf.type === 'inconsistent' || rf.type === 'copied'
  );
  if (criticalFlags.length > 0) {
    feedbackParts.push(`Warning: ${criticalFlags.length} critical issue(s) detected in your response.`);
  }

  return feedbackParts.join(' ');
}

function generateFollowUp(evaluation: AnswerEvaluation['evaluation'], redFlags: RedFlag[], context: AnswerContext): string | undefined {
  if (redFlags.some(rf => rf.type === 'vague')) {
    return 'Can you provide a specific example to illustrate your point?';
  }

  if (evaluation.depthScore < 50 && context.questionType === 'technical') {
    return 'What challenges did you face during implementation and how did you overcome them?';
  }

  if (evaluation.contentScore < 60) {
    return 'Could you elaborate more on the technical approach you used?';
  }

  const starComponent = (evaluation.starMethod.situation + evaluation.starMethod.task + evaluation.starMethod.action + evaluation.starMethod.result) / 400;
  if (starComponent < 40 && context.questionType === 'behavioral') {
    return 'What was the measurable outcome of that situation?';
  }

  return undefined;
}

export async function evaluateAnswer(context: AnswerContext): Promise<AnswerEvaluation> {
  const { transcript, question } = context;

  const redFlags: RedFlag[] = [];

  const vagueFlag = detectVaguePhrases(transcript);
  if (vagueFlag) redFlags.push(vagueFlag);

  const inconsistentFlag = detectInconsistency(transcript, context);
  if (inconsistentFlag) redFlags.push(inconsistentFlag);

  const memorizedFlag = detectMemorizedAnswer(transcript);
  if (memorizedFlag) redFlags.push(memorizedFlag);

  const copiedFlag = detectCopiedContent(transcript);
  if (copiedFlag) redFlags.push(copiedFlag);

  const confidenceFlag = detectConfidenceLevel(transcript);
  if (confidenceFlag) redFlags.push(confidenceFlag);

  const contentMatch = analyzeContentMatch(transcript, context);
  const starMethod = analyzeSTARMethod(transcript);

  const contentScore = Math.round(
    (contentMatch.detailLevel * 0.4) +
    (contentMatch.keyPoints.filter(kp => kp.found).length / Math.max(contentMatch.keyPoints.length, 1)) * 60
  );

  const technicalAccuracy = Math.round(contentMatch.technicalAccuracy);
  const clarity = Math.round(Math.min(100, (transcript.split(/\s+/).length / 50) * 80));
  const depthScore = Math.round(
    (contentMatch.examplesProvided ? 40 : 0) +
    (contentMatch.detailLevel * 0.3) +
    (contentMatch.keyPoints.filter(kp => kp.relevance > 0).length / Math.max(contentMatch.keyPoints.length, 1)) * 30
  );

  const evaluation = {
    contentScore,
    technicalAccuracy,
    clarity,
    depthScore,
    starMethod
  };

  const overallScore = calculateOverallScore(evaluation, redFlags);
  const feedback = generateFeedback(evaluation, redFlags);
  const suggestedFollowUp = generateFollowUp(evaluation, redFlags, context);

  return {
    questionId: crypto.randomUUID(),
    transcript,
    evaluation,
    redFlags: redFlags.map(rf => ({
      type: rf.type,
      description: rf.description,
      timestamp: rf.timestamp
    })),
    suggestedFollowUp,
    overallScore,
    feedback
  };
}

export async function batchEvaluateAnswers(answers: AnswerContext[]): Promise<AnswerEvaluation[]> {
  return Promise.all(answers.map(answer => evaluateAnswer(answer)));
}