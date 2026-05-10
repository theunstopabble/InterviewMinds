import { v4 as uuidv4 } from 'uuid';

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

class ResumeScreenerService {
  private screenerResults: Map<string, ScreenerResult> = new Map();
  private conversations: Map<string, ChatbotConversation> = new Map();

  private roleKeywords: Record<string, string[]> = {
    'Software Engineer': ['javascript', 'python', 'java', 'react', 'node', 'sql', 'api', 'agile', 'git', 'debugging'],
    'Frontend Developer': ['react', 'vue', 'angular', 'css', 'html', 'javascript', 'typescript', 'responsive', 'ui', 'ux'],
    'Backend Developer': ['node', 'python', 'java', 'sql', 'nosql', 'api', 'rest', 'graphql', 'docker', 'kubernetes'],
    'Data Scientist': ['python', 'machine learning', 'tensorflow', 'pytorch', 'statistics', 'sql', 'visualization', 'nlp', 'deep learning', 'pandas'],
    'DevOps Engineer': ['docker', 'kubernetes', 'ci/cd', 'aws', 'azure', 'terraform', 'ansible', 'linux', 'monitoring', 'automation'],
    'Product Manager': ['roadmap', 'stakeholder', 'agile', 'market research', 'analytics', 'user research', ' prioritization', 'strategy'],
  };

  async screenResume(
    resumeId: string,
    candidateId: string,
    targetRole: string,
    resumeText: string
  ): Promise<ScreenerResult> {
    const text = resumeText.toLowerCase();
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

    let recommendation: ScreenerResult['recommendation'];
    if (fitScore >= 80) recommendation = 'strong_fit';
    else if (fitScore >= 60) recommendation = 'good_fit';
    else if (fitScore >= 40) recommendation = 'partial_fit';
    else recommendation = 'poor_fit';

    const score: ResumeScore = {
      overallScore,
      breakdown: {
        education,
        experience,
        skills,
        certifications,
        achievements,
      },
      matchedKeywords,
      missingKeywords,
      recommendation: recommendation as 'strong_fit' | 'good_fit' | 'partial_fit' | 'poor_fit',
      fitScore,
    };

    const result: ScreenerResult = {
      id: uuidv4(),
      resumeId,
      candidateId,
      targetRole,
      score,
      screeningStatus: this.determineScreeningStatus(score),
      aiSummary: this.generateAISummary(score, targetRole),
      strengths: this.extractStrengths(score, matchedKeywords),
      concerns: this.extractConcerns(score, missingKeywords),
      recommendation: this.generateRecommendation(recommendation),
      screenedAt: new Date(),
    };

    this.screenerResults.set(result.id, result);
    return result;
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

  private generateAISummary(score: ResumeScore, role: string): string {
    return `${score.overallScore}% match for ${role}. Strong in ${score.breakdown.experience > 70 ? 'experience' : 'skills'}. ${score.fitScore >= 60 ? 'Good candidate for interview.' : 'May need further evaluation.'}`;
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
      case 'strong_fit':
        return 'Highly recommended for interview. Strong match for the role.';
      case 'good_fit':
        return 'Recommended for interview. Good potential fit.';
      case 'partial_fit':
        return 'Consider for interview with caveat. Some skill gaps.';
      case 'poor_fit':
        return 'Not recommended at this time. Significant skill gaps.';
      default:
        return 'Further evaluation needed.';
    }
  }

  getScreeningResult(resultId: string): ScreenerResult | null {
    return this.screenerResults.get(resultId) || null;
  }

  getResultsByCandidate(candidateId: string): ScreenerResult[] {
    return Array.from(this.screenerResults.values())
      .filter(r => r.candidateId === candidateId)
      .sort((a, b) => b.score.overallScore - a.score.overallScore);
  }

  startChatbotConversation(candidateId: string): ChatbotConversation {
    const conversation: ChatbotConversation = {
      id: uuidv4(),
      candidateId,
      messages: [
        {
          id: uuidv4(),
          sender: 'bot',
          content: "Hi! I'm your pre-screening assistant. I'll ask you a few questions to understand your background better. Let's start with your name and current role.",
          timestamp: new Date(),
          options: ['Ready to begin', 'I have questions first'],
        },
      ],
      status: 'active',
      startedAt: new Date(),
      stage: 'initial',
    };

    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  respondToChatbot(conversationId: string, response: string): ChatbotMessage | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.status !== 'active') return null;

    const userMessage: ChatbotMessage = {
      id: uuidv4(),
      sender: 'candidate',
      content: response,
      timestamp: new Date(),
    };

    conversation.messages.push(userMessage);

    const botResponse = this.generateBotResponse(conversation, response);
    conversation.messages.push(botResponse);

    this.conversations.set(conversationId, conversation);

    return botResponse;
  }

  private generateBotResponse(conversation: ChatbotConversation, lastResponse: string): ChatbotMessage {
    const stage = conversation.stage || 'initial';
    let content = '';
    let options: string[] | undefined;

    switch (stage) {
      case 'initial':
        content = 'Great! Now, tell me about your work experience. How many years have you been working in your field?';
        options = ['0-2 years', '3-5 years', '5-10 years', '10+ years'];
        conversation.stage = 'background';
        break;
      case 'background':
        content = 'What technologies or tools are you most proficient in?';
        options = ['Frontend', 'Backend', 'Full Stack', 'DevOps', 'Data/ML'];
        conversation.stage = 'technical';
        break;
      case 'technical':
        content = 'Can you describe a challenging project you worked on?';
        options = ['Yes, describe it', 'Prefer to discuss in interview', 'No challenging projects'];
        conversation.stage = 'cultural';
        break;
      case 'cultural':
        content = 'What type of work environment do you prefer?';
        options = ['Remote', 'Hybrid', 'On-site', 'Flexible'];
        conversation.stage = 'closing';
        break;
      case 'closing':
        content = 'Thank you for completing the pre-screening! Based on your responses, we\'ll recommend next steps.';
        options = ['View Results', 'Schedule Interview'];
        conversation.stage = 'closing';
        conversation.status = 'completed';
        conversation.completedAt = new Date();
        conversation.score = Math.floor(60 + Math.random() * 30);
        break;
      default:
        content = 'Thank you for your responses. Our team will review and get back to you.';
    }

    return {
      id: uuidv4(),
      sender: 'bot',
      content,
      timestamp: new Date(),
      options,
    };
  }

  getConversation(conversationId: string): ChatbotConversation | null {
    return this.conversations.get(conversationId) || null;
  }

  getConversationsByCandidate(candidateId: string): ChatbotConversation[] {
    return Array.from(this.conversations.values())
      .filter(c => c.candidateId === candidateId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }
}

export const resumeScreenerService = new ResumeScreenerService();
export default resumeScreenerService;