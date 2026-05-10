import { ResumeModel } from "../models/Resume";
import { logger } from "./logger";
import { groqCircuitBreaker } from "./circuitBreaker";
import type { ExtractedEntity, VerificationResult } from "@interview-minds/shared";

// Common tech skills taxonomy for verification
const TECH_SKILLS_TAXONOMY: Record<string, string[]> = {
  programming_languages: ["javascript", "typescript", "python", "java", "csharp", "go", "rust", "ruby", "php", "swift", "kotlin", "scala"],
  frameworks: ["react", "angular", "vue", "node", "express", "django", "flask", "spring", "rails", "nextjs", "nuxt", "svelte"],
  databases: ["mysql", "postgresql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb", "firebase", "supabase"],
  cloud: ["aws", "azure", "gcp", "kubernetes", "docker", "terraform", "cloudformation", "jenkins", "gitlab"],
  ml_ai: ["tensorflow", "pytorch", "keras", "pandas", "numpy", "scikit", "openai", "huggingface", "langchain"],
  devops: ["github", "gitlab", "jenkins", "circleci", "travis", "docker", "k8s", "helm", "prometheus", "grafana"],
};

// Common job titles
const JOB_TITLE_PATTERNS = [
  /software\s*engineer/i,
  /fullstack\s*developer/i,
  /frontend\s*developer/i,
  /backend\s*developer/i,
  /devops\s*engineer/i,
  /data\s*scientist/i,
  /machine\s*learning/i,
  /product\s*manager/i,
  /tech\s*lead/i,
  /architect/i,
  /senior\s*engineer/i,
  /junior\s*engineer/i,
  /intern/,
];

// Education patterns
const EDUCATION_PATTERNS = [
  /b\.?tech/i,
  /b\.?e\.?/i,
  /m\.?tech/i,
  /m\.?sc/i,
  /b\.?sc/i,
  /ph\.?d/i,
  /b\.?a\.?/i,
  /m\.?b\.?a\.?/i,
];

export class ResumeVerificationService {
  /**
   * Extract entities from resume text using NLP patterns
   */
  static extractEntities(content: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const lowerContent = content.toLowerCase();

    // Extract skills (case-insensitive matching)
    for (const [category, skills] of Object.entries(TECH_SKILLS_TAXONOMY)) {
      for (const skill of skills) {
        if (lowerContent.includes(skill)) {
          entities.push({
            type: "skill",
            name: skill,
            confidence: this.calculateSkillConfidence(skill, content),
            rawText: this.findRawText(skill, content),
            verified: false,
          });
        }
      }
    }

    // Extract job titles
    for (const pattern of JOB_TITLE_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        entities.push({
          type: "job_title",
          name: match[0].trim(),
          confidence: 0.9,
          rawText: match[0],
          verified: false,
        });
      }
    }

    // Extract education
    for (const pattern of EDUCATION_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        entities.push({
          type: "school",
          name: match[0].trim(),
          confidence: 0.7,
          rawText: match[0],
          verified: false,
        });
      }
    }

    // Deduplicate by name
    const uniqueEntities = entities.reduce((acc, entity) => {
      const exists = acc.find(
        (e) => e.type === entity.type && e.name.toLowerCase() === entity.name.toLowerCase()
      );
      if (!exists) {
        acc.push(entity);
      }
      return acc;
    }, [] as ExtractedEntity[]);

    return uniqueEntities;
  }

  /**
   * Calculate skill confidence based on context
   */
  private static calculateSkillConfidence(skill: string, content: string): number {
    let confidence = 0.5;

    // Check if skill appears multiple times
    const occurrences = (content.toLowerCase().match(new RegExp(skill, "gi")) || []).length;
    if (occurrences > 2) confidence += 0.2;

    // Check for project context (higher confidence)
    const projectPatterns = [
      /project/i,
      /built/i,
      /developed/i,
      /implemented/i,
      /created/i,
      /worked\s+with/i,
      /experience/i,
    ];
    for (const pattern of projectPatterns) {
      const match = content.match(new RegExp(`${skill}.{0,50}${pattern.source}`, "i"));
      if (match) {
        confidence += 0.2;
        break;
      }
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Find the raw text containing the entity
   */
  private static findRawText(entity: string, content: string): string {
    const index = content.toLowerCase().indexOf(entity.toLowerCase());
    if (index === -1) return "";

    const start = Math.max(0, index - 30);
    const end = Math.min(content.length, index + entity.length + 30);
    return content.substring(start, end);
  }

  /**
   * Analyze timeline for gaps and inconsistencies
   */
  static analyzeTimeline(content: string): VerificationResult["timelineAnalysis"] {
    // Extract dates using regex patterns
    const datePatterns = [
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}\b/gi,
      /\b\d{4}\b/g,
      /\b(present|current)\b/gi,
    ];

    const dates: { year: number; month: number; text: string }[] = [];

    for (const pattern of datePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const yearMatch = match.match(/\d{4}/);
          if (yearMatch) {
            const year = parseInt(yearMatch[0]);
            const month = match.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
            dates.push({
              year,
              month: month ? this.getMonthNumber(month[0]) : 0,
              text: match,
            });
          }
        }
      }
    }

    // Sort by year
    dates.sort((a, b) => a.year - b.year);

    // Find gaps (more than 6 months between positions)
    const gaps: { start: Date; end: Date; reason?: string }[] = [];
    for (let i = 1; i < dates.length; i++) {
      const diff = (dates[i].year - dates[i - 1].year) * 12 + (dates[i].month - dates[i - 1].month);
      if (diff > 6) {
        gaps.push({
          start: new Date(dates[i - 1].year, dates[i - 1].month),
          end: new Date(dates[i].year, dates[i].month),
        });
      }
    }

    return {
      gaps,
      overlapping: [],
      hasImpossibilities: false,
    };
  }

  private static getMonthNumber(month: string): number {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    return months[month.toLowerCase()] || 0;
  }

  /**
   * Perform skill gap analysis
   */
  static analyzeSkillGaps(
    entities: ExtractedEntity[],
    targetRole?: string
  ): { claimed: string[]; verified: string[]; unverified: string[]; missingForRole: string[] } {
    const claimedSkills = entities
      .filter((e) => e.type === "skill")
      .map((e) => e.name);

    const verifiedSkills = entities
      .filter((e) => e.type === "skill" && e.confidence >= 0.7)
      .map((e) => e.name);

    const unverifiedSkills = entities
      .filter((e) => e.type === "skill" && e.confidence < 0.7)
      .map((e) => e.name);

    // Determine missing skills for role (if specified)
    const missingForRole: string[] = [];
    if (targetRole) {
      const roleRequirements = this.getRoleRequirements(targetRole);
      for (const skill of roleRequirements) {
        if (!claimedSkills.includes(skill)) {
          missingForRole.push(skill);
        }
      }
    }

    return {
      claimed: claimedSkills,
      verified: verifiedSkills,
      unverified: unverifiedSkills,
      missingForRole,
    };
  }

  /**
   * Get required skills for a role
   */
  private static getRoleRequirements(role: string): string[] {
    const roleSkills: Record<string, string[]> = {
      "frontend developer": ["javascript", "typescript", "react", "html", "css", "webpack"],
      "backend developer": ["node", "python", "java", "sql", "rest", "docker"],
      "fullstack developer": ["javascript", "react", "node", "sql", "docker", "git"],
      "devops engineer": ["kubernetes", "docker", "aws", "terraform", "jenkins", "linux"],
      "data scientist": ["python", "tensorflow", "pandas", "sql", "machine learning"],
    };

    const lowerRole = role.toLowerCase();
    for (const [key, skills] of Object.entries(roleSkills)) {
      if (lowerRole.includes(key)) {
        return skills;
      }
    }

    return [];
  }

  /**
   * Verify resume content against external sources (mock implementation)
   * In production, this would integrate with:
   * - LinkedIn API
   * - Company registries
   * - Certification databases
   */
  static async verifyWithExternalSources(entity: ExtractedEntity): Promise<boolean> {
    // This is a mock implementation
    // In production, integrate with actual APIs

    logger.info({ entity: entity.name, type: entity.type }, "Verifying entity externally");

    // Simulate API call with circuit breaker
    try {
      await groqCircuitBreaker.execute(async () => {
        // In production, call appropriate verification API:
        // - LinkedIn for employment history
        // - Degree verification services for education
        // - Certification authority for certs
        // For now, return true for high-confidence entities
        return true;
      });
      return true;
    } catch (error) {
      logger.warn({ entity: entity.name }, "External verification failed, using local");
      return entity.confidence >= 0.7;
    }
  }

  /**
   * Generate overall verification result
   */
  static async verifyResume(
    resumeId: string,
    content: string,
    targetRole?: string
  ): Promise<VerificationResult> {
    // Extract entities
    const entities = this.extractEntities(content);

    // Analyze timeline
    const timelineAnalysis = this.analyzeTimeline(content);

    // Analyze skill gaps
    const skillAnalysis = this.analyzeSkillGaps(entities, targetRole);

    // Verify entities with external sources
    const verifiedEntities = await Promise.all(
      entities.map(async (entity) => {
        if (entity.type === "skill") {
          return entity; // Skills don't need external verification
        }
        const verified = await this.verifyWithExternalSources(entity);
        return { ...entity, verified };
      })
    );

    // Calculate overall score
    const verifiedCount = verifiedEntities.filter((e) => e.verified || e.confidence >= 0.7).length;
    const overallScore = Math.round((verifiedCount / verifiedEntities.length) * 100);

    // Generate red flags
    const redFlags: VerificationResult["redFlags"] = [];

    // Check for timeline gaps > 1 year
    if (timelineAnalysis.gaps.some((g) => (g.end.getTime() - g.start.getTime()) / (1000 * 60 * 60 * 24 * 30) > 12)) {
      redFlags.push({
        type: "timeline_gap",
        severity: "medium",
        description: "Significant employment gap detected (>1 year)",
        evidence: "Review timeline carefully",
      });
    }

    // Check for too many unverified skills
    if (skillAnalysis.unverified.length > skillAnalysis.verified.length) {
      redFlags.push({
        type: "exaggeration",
        severity: "high",
        description: "More unverified skills than verified skills",
        evidence: `${skillAnalysis.unverified.length} skills lack project context`,
      });
    }

    // Check for missing required skills
    if (targetRole && skillAnalysis.missingForRole.length > 3) {
      redFlags.push({
        type: "unverified_claim",
        severity: "low",
        description: "Missing common skills for role",
        evidence: `${skillAnalysis.missingForRole.join(", ")} not mentioned`,
      });
    }

    // Update resume in database
    await ResumeModel.findByIdAndUpdate(resumeId, {
      verificationStatus: overallScore >= 70 ? "verified" : overallScore >= 40 ? "pending" : "failed",
      verifiedAt: new Date(),
    });

    return {
      resumeId,
      overallScore,
      entities: verifiedEntities,
      timelineAnalysis,
      skillGapAnalysis: skillAnalysis,
      redFlags,
      createdAt: new Date(),
    };
  }
}

export default ResumeVerificationService;