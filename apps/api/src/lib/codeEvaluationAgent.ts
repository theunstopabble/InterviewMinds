import Groq from 'groq-sdk';
import { logger } from './logger';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface CodeEvaluationRequest {
  code: string;
  language: string;
  problemStatement: string;
  testCases?: { input: string; expectedOutput: string }[];
  candidateName?: string;
  role?: string;
  challengeName?: string;
  deadline?: string;
  duration?: string;
  email?: string;
}

export interface CodeEvaluationResult {
  scores: {
    correctness: number;
    efficiency: number;
    codeQuality: number;
    bestPractices: number;
    overall: number;
  };
  feedback: {
    strengths: string[];
    improvements: string[];
    suggestions: { line?: number; message: string }[];
  };
  complexity: {
    time: string;
    space: string;
    explanation: string;
  };
  summary: string;
}

export async function evaluateCode(request: CodeEvaluationRequest): Promise<CodeEvaluationResult> {
  const { code, language, problemStatement, testCases } = request;

  const testCaseBlock = testCases?.length
    ? `\nTest Cases:\n${testCases.map((tc, i) => `  ${i + 1}. Input: ${tc.input} → Expected: ${tc.expectedOutput}`).join('\n')}`
    : '';

  const prompt = `You are a senior software engineering interviewer. Evaluate the following code submission.

Problem:
${problemStatement}

Language: ${language}
${testCaseBlock}

Candidate Code:
\`\`\`${language}
${code}
\`\`\`

Evaluate this code and return a JSON object (no markdown, no backticks):
{
  "scores": {
    "correctness": <0-100>,
    "efficiency": <0-100>,
    "codeQuality": <0-100>,
    "bestPractices": <0-100>,
    "overall": <weighted average>
  },
  "feedback": {
    "strengths": ["<strength 1>", "<strength 2>", ...],
    "improvements": ["<improvement 1>", "<improvement 2>", ...],
    "suggestions": [{"line": <number or null>, "message": "<suggestion detail>"}]
  },
  "complexity": {
    "time": "<Big-O notation>",
    "space": "<Big-O notation>",
    "explanation": "<brief explanation>"
  },
  "summary": "<2-3 sentence overall assessment>"
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const result: CodeEvaluationResult = JSON.parse(jsonMatch[0]);
    return result;
  } catch (error) {
    logger.error({ err: error, code: code.substring(0, 100) }, 'Code evaluation failed');
    return {
      scores: { correctness: 0, efficiency: 0, codeQuality: 0, bestPractices: 0, overall: 0 },
      feedback: { strengths: [], improvements: ['Unable to evaluate code at this time'], suggestions: [] },
      complexity: { time: 'N/A', space: 'N/A', explanation: 'Evaluation failed' },
      summary: 'Code evaluation encountered an error. Please try again.',
    };
  }
}
