import { v4 as uuidv4 } from 'uuid';
import Groq from 'groq-sdk';
import { ScreenerResultModel } from '../models/ScreenerResult';
import { ChatbotConversationModel } from '../models/ChatbotConversation';

export interface ResumeScore {
  overallScore: number;
  breakdown: {
    education: number;
    experience: number;
    skills: number;
    certifications: number;
    achievements: number;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendation: 'strong_fit' | 'good_fit' | 'partial_fit' | 'poor_fit';
  fitScore: number;
}

export interface ScreenerResult {
  id: string;
  resumeId: string;
  candidateId: string;
  targetRole: string;
  score: ResumeScore;
  screeningStatus: 'pending' | 'screened' | 'approved' | 'rejected';
  aiSummary: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  screenedAt: Date;
}

export interface ChatbotConversation {
  id: string;
  candidateId: string;
  messages: ChatbotMessage[];
  status: 'active' | 'completed' | 'abandoned';
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  stage?: 'initial' | 'background' | 'technical' | 'cultural' | 'closing';
}

export interface ChatbotMessage {
  id: string;
  sender: 'bot' | 'candidate';
  content: string;
  timestamp: Date;
  options?: string[];
  isCorrect?: boolean;
  evaluation?: string;
}

function getGroqClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured");
  return new Groq({ apiKey: key });
}

class ResumeScreenerService {
  private roleKeywords: Record<string, string[]> = {
    'Software Engineer': ['javascript', 'python', 'java', 'react', 'node', 'sql', 'api', 'agile', 'git', 'debugging'],
    'Frontend Developer': ['react', 'vue', 'angular', 'css', 'html', 'javascript', 'typescript', 'responsive', 'ui', 'ux'],
    'Backend Developer': ['node', 'python', 'java', 'sql', 'nosql', 'api', 'rest', 'graphql', 'docker', 'kubernetes'],
    'Data Scientist': ['python', 'machine learning', 'tensorflow', 'pytorch', 'statistics', 'sql', 'visualization', 'nlp', 'deep learning', 'pandas'],
    'DevOps Engineer': ['docker', 'kubernetes', 'ci/cd', 'aws', 'azure', 'terraform', 'ansible', 'linux', 'monitoring', 'automation'],
    'Product Manager': ['roadmap', 'stakeholder', 'agile', 'market research', 'analytics', 'user research', ' prioritization', 'strategy'],
  };

  /* --------------------------------------------------------------- */
  /*  AI-POWERED RESUME SCREENING (Groq)                               */
  /* --------------------------------------------------------------- */

  async screenResume(
    resumeId: string,
    candidateId: string,
    targetRole: string,
    resumeText: string
  ): Promise<ScreenerResult> {
    const text = resumeText.toLowerCase();

    try {
      const groq = getGroqClient();
      const prompt = `You are an expert technical recruiter. Evaluate this resume for the role of ${targetRole}.

Resume:
${resumeText.slice(0, 5000)}

Return ONLY a JSON object with this exact structure:
{
  "overallScore": <number 0-100>,
  "breakdown": { "education": <number>, "experience": <number>, "skills": <number>, "certifications": <number>, "achievements": <number> },
  "matchedKeywords": ["..."],
  "missingKeywords": ["..."],
  "recommendation": "strong_fit" | "good_fit" | "partial_fit" | "poor_fit",
  "fitScore": <number>,
  "aiSummary": "...",
  "strengths": ["..."],
  "concerns": ["..."],
  "screeningStatus": "approved" | "screened" | "pending" | "rejected"
}`;

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1200,
      });

      const content = completion.choices[0]?.message?.content || "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const score: ResumeScore = {
        overallScore: Math.min(100, Math.max(0, parsed.overallScore || 50)),
        breakdown: {
          education: Math.min(100, Math.max(0, parsed.breakdown?.education || 50)),
          experience: Math.min(100, Math.max(0, parsed.breakdown?.experience || 50)),
          skills: Math.min(100, Math.max(0, parsed.breakdown?.skills || 50)),
          certifications: Math.min(100, Math.max(0, parsed.breakdown?.certifications || 50)),
          achievements: Math.min(100, Math.max(0, parsed.breakdown?.achievements || 50)),
        },
        matchedKeywords: parsed.matchedKeywords || [],
        missingKeywords: parsed.missingKeywords || [],
        recommendation: parsed.recommendation || 'neutral',
        fitScore: Math.min(100, Math.max(0, parsed.fitScore || 50)),
      };

      const result: ScreenerResult = {
        id: uuidv4(),
        resumeId,
        candidateId,
        targetRole,
        score,
        screeningStatus: parsed.screeningStatus || this.determineScreeningStatus(score),
        aiSummary: parsed.aiSummary || `AI screening: ${score.overallScore}% match`,
        strengths: parsed.strengths || ["Resume screened via AI"],
        concerns: parsed.concerns || [],
        recommendation: this.generateRecommendation(score.recommendation),
        screenedAt: new Date(),
      };

      await this.saveScreenerResult(result);
      return result;
    } catch {
      return this.fallbackScreenResume(resumeId, candidateId, targetRole, text);
    }
  }

  /* --------------------------------------------------------------- */
  /*  Keyword-based fallback screening                                  */
  /* --------------------------------------------------------------- */

  private async fallbackScreenResume(resumeId: string, candidateId: string, targetRole: string, text: string): Promise<ScreenerResult> {
    const keywords = this.roleKeywords[targetRole] || this.roleKeywords['Software Engineer'];
    const matchedKeywords = keywords.filter(kw => text.includes(kw.toLowerCase()));
    const missingKeywords = keywords.filter(kw => !text.includes(kw.toLowerCase()));

    const education = this.calculateEducationScore(text);
    const experience = this.calculateExperienceScore(text);
    const skills = matchedKeywords.length / keywords.length * 100;
    const certifications = this.calculateCertificationsScore(text);
    const achievements = this.calculateAchievementsScore(text);

    const overallScore = Math.round(
      education * 0.15 + experience * 0.35 + skills * 0.25 + certifications * 0.1 + achievements * 0.15
    );
    const fitScore = matchedKeywords.length / keywords.length * 100;

    let recommendation: ScreenerResult['score']['recommendation'];
    if (fitScore >= 80) recommendation = 'strong_fit';
    else if (fitScore >= 60) recommendation = 'good_fit';
    else if (fitScore >= 40) recommendation = 'partial_fit';
    else recommendation = 'poor_fit';

    const score: ResumeScore = {
      overallScore,
      breakdown: { education, experience, skills, certifications, achievements },
      matchedKeywords,
      missingKeywords,
      recommendation,
      fitScore,
    };

    const result: ScreenerResult = {
      id: uuidv4(),
      resumeId,
      candidateId,
      targetRole,
      score,
      screeningStatus: this.determineScreeningStatus(score),
      aiSummary: `${score.overallScore}% match for ${targetRole}. (Fallback keyword scoring)`,
      strengths: this.extractStrengths(score, matchedKeywords),
      concerns: this.extractConcerns(score, missingKeywords),
      recommendation: this.generateRecommendation(recommendation),
      screenedAt: new Date(),
    };

    await this.saveScreenerResult(result);
    return result;
  }

  private async saveScreenerResult(result: ScreenerResult): Promise<void> {
    await ScreenerResultModel.create({
      id: result.id,
      candidateId: result.candidateId,
      resumeId: result.resumeId,
      jobTitle: result.targetRole,
      company: '',
      overallScore: result.score.overallScore,
      skillMatches: [
        ...result.score.matchedKeywords.map(kw => ({
          name: kw, matched: true, yearsRequired: 0, yearsActual: 0, source: 'resume' as const,
        })),
        ...result.score.missingKeywords.map(kw => ({
          name: kw, matched: false, yearsRequired: 0, yearsActual: 0, source: 'inferred' as const,
        })),
      ],
      experience: { years: 0, relevance: Math.round(result.score.breakdown.experience) },
      education: { level: '', field: '', matched: result.score.breakdown.education >= 50 },
      cultureFit: result.score.fitScore,
      recommendation: this.mapRecommendation(result.score.recommendation),
      redFlags: result.concerns,
      notes: result.aiSummary,
      processedAt: result.screenedAt,
    });
  }

  private mapRecommendation(r: string): 'strong_reject' | 'reject' | 'maybe' | 'hire' | 'strong_hire' {
    switch (r) {
      case 'strong_fit': return 'strong_hire';
      case 'good_fit': return 'hire';
      case 'partial_fit': return 'maybe';
      case 'poor_fit': return 'reject';
      default: return 'maybe';
    }
  }

  private reverseMapRecommendation(r: string): 'strong_fit' | 'good_fit' | 'partial_fit' | 'poor_fit' {
    switch (r) {
      case 'strong_hire': return 'strong_fit';
      case 'hire': return 'good_fit';
      case 'maybe': return 'partial_fit';
      case 'reject':
      case 'strong_reject': return 'poor_fit';
      default: return 'partial_fit';
    }
  }

  private calculateEducationScore(text: string): number {
    let score = 50;
    if (text.includes('phd') || text.includes('doctoral')) score += 25;
    else if (text.includes('master') || text.includes('m.s') || text.includes('m.tech')) score += 20;
    else if (text.includes('bachelor') || text.includes('b.s') || text.includes('b.tech')) score += 15;
    if (text.includes('computer science') || text.includes('software')) score += 15;
    if (text.includes('stanford') || text.includes('mit') || text.includes('iit')) score += 10;
    return Math.min(100, score);
  }

  private calculateExperienceScore(text: string): number {
    let score = 30;
    const yearsMatch = text.match(/(\d+)\+?\s*years?/i);
    if (yearsMatch) {
      const years = parseInt(yearsMatch[1]);
      score = Math.min(80, 30 + years * 8);
    }
    if (text.includes('lead') || text.includes('senior') || text.includes('principal')) score += 10;
    if (text.includes('manager') || text.includes('director')) score += 15;
    return Math.min(100, score);
  }

  private calculateCertificationsScore(text: string): number {
    const certs = ['aws', 'azure', 'gcp', 'kubernetes', 'docker', 'pmp', 'scrum', 'agile', 'cissp', 'ccna'];
    const found = certs.filter(c => text.includes(c));
    return Math.min(100, 40 + found.length * 12);
  }

  private calculateAchievementsScore(text: string): number {
    const achievements = ['award', 'recognition', 'promotion', 'launch', 'built', 'developed', 'created', 'achieved'];
    const found = achievements.filter(a => text.includes(a));
    return Math.min(100, 40 + found.length * 10);
  }

  private determineScreeningStatus(score: ResumeScore): ScreenerResult['screeningStatus'] {
    if (score.overallScore >= 80) return 'approved';
    if (score.overallScore >= 60) return 'screened';
    if (score.overallScore >= 40) return 'pending';
    return 'rejected';
  }

  private extractStrengths(score: ResumeScore, matched: string[]): string[] {
    const strengths: string[] = [];
    if (score.breakdown.education >= 70) strengths.push('Strong educational background');
    if (score.breakdown.experience >= 70) strengths.push('Relevant work experience');
    if (matched.length >= 5) strengths.push(`Key skills: ${matched.slice(0, 5).join(', ')}`);
    if (score.breakdown.achievements >= 60) strengths.push('Proven track record');
    return strengths;
  }

  private extractConcerns(score: ResumeScore, missing: string[]): string[] {
    const concerns: string[] = [];
    if (score.overallScore < 60) concerns.push('Overall score below target');
    if (missing.length > 5) concerns.push(`Missing key skills: ${missing.slice(0, 3).join(', ')}`);
    if (score.breakdown.experience < 50) concerns.push('Limited experience');
    return concerns;
  }

  private generateRecommendation(recommendation: string): string {
    switch (recommendation) {
      case 'strong_fit': return 'Highly recommended for interview. Strong match for the role.';
      case 'good_fit': return 'Recommended for interview. Good potential fit.';
      case 'partial_fit': return 'Consider for interview with caveat. Some skill gaps.';
      case 'poor_fit': return 'Not recommended at this time. Significant skill gaps.';
      default: return 'Further evaluation needed.';
    }
  }

  async getScreenerResult(id: string): Promise<ScreenerResult | null> {
    const doc = await ScreenerResultModel.findOne({ id }).lean();
    if (!doc) return null;
    return this.toScreenerResult(doc);
  }

  async getScreenerResultsByCandidate(candidateId: string): Promise<ScreenerResult[]> {
    const docs = await ScreenerResultModel.find({ candidateId }).sort({ overallScore: -1 }).lean();
    return docs.map(d => this.toScreenerResult(d));
  }

  private toScreenerResult(doc: Record<string, any>): ScreenerResult {
    const matchedKeywords: string[] = (doc.skillMatches || [])
      .filter((s: any) => s.matched)
      .map((s: any) => s.name);
    const missingKeywords: string[] = (doc.skillMatches || [])
      .filter((s: any) => !s.matched)
      .map((s: any) => s.name);

    const overallScore = doc.overallScore || 0;
    const fitScore = doc.cultureFit || 0;
    const matchedCount = matchedKeywords.length;
    const totalSkills = (doc.skillMatches || []).length;
    const skillsScore = totalSkills > 0 ? Math.round((matchedCount / totalSkills) * 100) : 50;

    const recommendation = this.reverseMapRecommendation(doc.recommendation || 'maybe');

    const score: ResumeScore = {
      overallScore,
      breakdown: {
        education: doc.education?.matched ? 70 : 40,
        experience: doc.experience?.relevance || 50,
        skills: skillsScore,
        certifications: 50,
        achievements: 50,
      },
      matchedKeywords,
      missingKeywords,
      recommendation,
      fitScore,
    };

    return {
      id: doc.id,
      resumeId: doc.resumeId,
      candidateId: doc.candidateId,
      targetRole: doc.jobTitle || '',
      score,
      screeningStatus: this.determineScreeningStatus(score),
      aiSummary: doc.notes || `AI screening: ${overallScore}% match`,
      strengths: overallScore >= 70 ? ['Strong match'] : [],
      concerns: doc.redFlags || [],
      recommendation: this.generateRecommendation(recommendation),
      screenedAt: doc.processedAt || doc.createdAt || new Date(),
    };
  }

  /* --------------------------------------------------------------- */
  /*  AI-POWERED CHATBOT (Groq-driven conversation)                     */
  /* --------------------------------------------------------------- */

  async startChatbotConversation(candidateId: string, sessionId: string): Promise<ChatbotConversation> {
    const id = uuidv4();
    const conversation: ChatbotConversation = {
      id,
      candidateId,
      messages: [
        {
          id: uuidv4(),
          sender: 'bot',
          content: "Hi! I'm your AI pre-screening assistant. I'll ask you a few questions to understand your background better. Let's start — what's your current role and how many years of experience do you have?",
          timestamp: new Date(),
        },
      ],
      status: 'active',
      startedAt: new Date(),
      stage: 'initial',
    };

    await ChatbotConversationModel.create({
      id,
      candidateId,
      sessionId,
      messages: conversation.messages.map(m => ({
        id: m.id,
        role: m.sender === 'bot' ? 'assistant' as const : 'candidate' as const,
        content: m.content,
        timestamp: m.timestamp,
        metadata: new Map<string, any>(),
      })),
      status: conversation.status,
      startedAt: conversation.startedAt,
      endedAt: null,
    });

    return conversation;
  }

  async sendChatbotMessage(
    candidateId: string,
    sessionId: string,
    role: 'bot' | 'candidate',
    content: string
  ): Promise<ChatbotConversation | null> {
    const doc = await ChatbotConversationModel.findOne({ candidateId, sessionId });
    if (!doc || doc.status !== 'active') return null;

    const message: ChatbotMessage = {
      id: uuidv4(),
      sender: role,
      content,
      timestamp: new Date(),
    };

    doc.messages.push({
      id: message.id,
      role: role === 'bot' ? 'assistant' : 'candidate',
      content: message.content,
      timestamp: message.timestamp,
      metadata: new Map<string, any>(),
    });
    await doc.save();

    return this.toConversation(doc.toObject());
  }

  async endChatbotConversation(candidateId: string, sessionId: string): Promise<ChatbotConversation | null> {
    const doc = await ChatbotConversationModel.findOne({ candidateId, sessionId });
    if (!doc) return null;

    doc.status = 'completed';
    doc.endedAt = new Date();
    await doc.save();

    return this.toConversation(doc.toObject());
  }

  async getChatbotConversation(candidateId: string, sessionId: string): Promise<ChatbotConversation | null> {
    const doc = await ChatbotConversationModel.findOne({ candidateId, sessionId }).lean();
    if (!doc) return null;
    return this.toConversation(doc);
  }

  async respondToChatbot(conversationId: string, response: string): Promise<ChatbotMessage | null> {
    const doc = await ChatbotConversationModel.findOne({ id: conversationId });
    if (!doc || doc.status !== 'active') return null;

    const userMessage: ChatbotMessage = {
      id: uuidv4(),
      sender: 'candidate',
      content: response,
      timestamp: new Date(),
    };

    doc.messages.push({
      id: userMessage.id,
      role: 'candidate',
      content: userMessage.content,
      timestamp: userMessage.timestamp,
      metadata: new Map<string, any>(),
    });

    try {
      const groq = getGroqClient();
      const history = doc.messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const prompt = `You are a friendly AI pre-screening recruiter for a tech company. Continue the conversation naturally. Ask ONE concise follow-up question based on the candidate's last answer. If you have enough info (role, experience, key skills), say "Thank you! We'll be in touch." and end the conversation.

Conversation so far:
${history}

Return ONLY JSON: {"content": "...", "options": ["..."] || null, "endConversation": true/false}`;

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: 300,
      });

      const content = completion.choices[0]?.message?.content || "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const botResponse: ChatbotMessage = {
        id: uuidv4(),
        sender: 'bot',
        content: parsed.content || "Thank you for your time! We'll review your responses and get back to you.",
        timestamp: new Date(),
        options: parsed.options || undefined,
      };

      doc.messages.push({
        id: botResponse.id,
        role: 'assistant',
        content: botResponse.content,
        timestamp: botResponse.timestamp,
        metadata: botResponse.options ? new Map<string, any>([['options', botResponse.options]]) : new Map<string, any>(),
      });

      if (parsed.endConversation) {
        doc.status = 'completed';
        doc.endedAt = new Date();
      }

      await doc.save();
      return botResponse;
    } catch {
      const botResponse: ChatbotMessage = {
        id: uuidv4(),
        sender: 'bot',
        content: "Thank you for your response. Our team will review your information and get back to you.",
        timestamp: new Date(),
      };

      doc.messages.push({
        id: botResponse.id,
        role: 'assistant',
        content: botResponse.content,
        timestamp: botResponse.timestamp,
        metadata: new Map<string, any>(),
      });

      await doc.save();
      return botResponse;
    }
  }

  private toConversation(doc: Record<string, any>): ChatbotConversation {
    const messages = (doc.messages || []).map((m: any) => {
      const meta = m.metadata && typeof m.metadata.get === 'function'
        ? Object.fromEntries(m.metadata)
        : (m.metadata || {});
      return {
        id: m.id,
        sender: m.role === 'assistant' ? 'bot' as const : 'candidate' as const,
        content: m.content,
        timestamp: m.timestamp,
        options: meta.options as string[] | undefined,
        isCorrect: meta.isCorrect as boolean | undefined,
        evaluation: meta.evaluation as string | undefined,
      };
    });
    return {
      id: doc.id,
      candidateId: doc.candidateId,
      messages,
      status: doc.status as 'active' | 'completed' | 'abandoned',
      startedAt: doc.startedAt || new Date(),
      completedAt: doc.endedAt || undefined,
      stage: 'initial',
    };
  }
}

export const resumeScreenerService = new ResumeScreenerService();
export default resumeScreenerService;
