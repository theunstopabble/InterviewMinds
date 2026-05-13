import axios from "axios";
import { logger } from "./logger";

export interface GitHubProfile {
  username: string;
  name: string;
  email: string;
  avatarUrl: string;
  bio: string;
  location: string;
  publicRepos: number;
  followers: number;
  following: number;
  joinedAt: Date;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  size: number;
  isPrivate: boolean;
  defaultBranch: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepositoryAnalysis {
  repositoryId: number;
  candidateId: string;
  analysis: {
    totalCommits: number;
    totalPRs: number;
    totalIssues: number;
    languages: { name: string; percentage: number }[];
    recentActivity: { date: string; count: number }[];
    qualityScore: number;
  };
  evaluatedAt: Date;
}

class GitIntegrationService {
  private linkedAccounts: Map<string, string> = new Map();
  private repositories: Map<string, GitHubRepository[]> = new Map();
  private analyses: Map<string, RepositoryAnalysis> = new Map();

  async connectGitHub(candidateId: string, accessToken: string): Promise<boolean> {
    try {
      this.linkedAccounts.set(candidateId, accessToken);
      await this.fetchRepositories(candidateId);
      return true;
    } catch (error: any) {
      logger.error({ error: error.message }, "GitHub connection error");
      return false;
    }
  }

  disconnectGitHub(candidateId: string): boolean {
    return this.linkedAccounts.delete(candidateId);
  }

  isGitHubConnected(candidateId: string): boolean {
    return this.linkedAccounts.has(candidateId);
  }

  private async fetchRepositories(candidateId: string): Promise<GitHubRepository[]> {
    const token = this.linkedAccounts.get(candidateId);
    if (!token) return [];

    logger.info({ candidateId }, "Fetching GitHub repositories");
    const res = await axios.get("https://api.github.com/user/repos", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
      params: { per_page: 100, sort: "updated", type: "owner" },
      timeout: 15000,
    });

    const repos: GitHubRepository[] = (res.data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description || "",
      language: r.language || "Unknown",
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      size: r.size || 0,
      isPrivate: r.private,
      defaultBranch: r.default_branch || "main",
      url: r.html_url,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));

    this.repositories.set(candidateId, repos);
    return repos;
  }

  getRepositories(candidateId: string): GitHubRepository[] {
    return this.repositories.get(candidateId) || [];
  }

  async analyzeRepository(candidateId: string, repoId: number): Promise<RepositoryAnalysis> {
    const repos = this.repositories.get(candidateId) || [];
    const repo = repos.find(r => r.id === repoId);
    if (!repo) throw new Error("Repository not found");

    const token = this.linkedAccounts.get(candidateId);
    const analysis = await this.fetchGitHubAnalysis(repo, token);

    const result: RepositoryAnalysis = {
      repositoryId: repoId,
      candidateId,
      analysis,
      evaluatedAt: new Date(),
    };
    this.analyses.set(`${candidateId}-${repoId}`, result);
    return result;
  }

  private async fetchGitHubAnalysis(
    repo: GitHubRepository,
    token?: string
  ): Promise<RepositoryAnalysis["analysis"]> {
    const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const [commitsRes, prsRes, issuesRes, langsRes] = await Promise.all([
      axios.get(`https://api.github.com/repos/${repo.fullName}/commits`, { headers, params: { per_page: 1 }, timeout: 10000 }).catch(() => ({ data: [], headers: {} as any })),
      axios.get(`https://api.github.com/repos/${repo.fullName}/pulls`, { headers, params: { per_page: 1, state: "all" }, timeout: 10000 }).catch(() => ({ data: [], headers: {} as any })),
      axios.get(`https://api.github.com/repos/${repo.fullName}/issues`, { headers, params: { per_page: 1, state: "all" }, timeout: 10000 }).catch(() => ({ data: [], headers: {} as any })),
      axios.get(`https://api.github.com/repos/${repo.fullName}/languages`, { headers, timeout: 10000 }).catch(() => ({ data: {} })),
    ]);

    const totalCommits = (commitsRes.data?.length ?? 0) > 0 ? (commitsRes.headers["link"] ? parseInt(commitsRes.headers["link"].match(/page=(\d+)>;\s*rel="last"/)?.[1] || "0", 10) : commitsRes.data.length) : 0;
    const totalPRs = (prsRes.data?.length ?? 0) > 0 ? (prsRes.headers["link"] ? parseInt(prsRes.headers["link"].match(/page=(\d+)>;\s*rel="last"/)?.[1] || "0", 10) : prsRes.data.length) : 0;
    const totalIssues = (issuesRes.data?.length ?? 0) > 0 ? (issuesRes.headers["link"] ? parseInt(issuesRes.headers["link"].match(/page=(\d+)>;\s*rel="last"/)?.[1] || "0", 10) : issuesRes.data.length) : 0;

    const langData = langsRes.data || {};
    const langTotal = Object.values(langData).reduce((sum: number, v: any) => sum + (v as number), 0);
    const languages = Object.entries(langData).map(([name, bytes]) => ({
      name,
      percentage: langTotal > 0 ? Math.round(((bytes as number) / langTotal) * 100) : 0,
    })).sort((a, b) => b.percentage - a.percentage);

    const qualityScore = Math.min(100, Math.round(
      Math.min(40, totalCommits / 10) +
      Math.min(30, totalPRs / 2) +
      Math.min(20, repo.stars) +
      Math.min(10, repo.forks * 2)
    ));

    const recentActivity = await this.fetchCommitActivity(repo.fullName, headers);

    return { totalCommits, totalPRs, totalIssues, languages, recentActivity, qualityScore };
  }

  private async fetchCommitActivity(fullName: string, headers: Record<string, string>): Promise<{ date: string; count: number }[]> {
    try {
      const res = await axios.get(`https://api.github.com/repos/${fullName}/stats/commit_activity`, { headers, timeout: 10000 });
      const weeks = res.data || [];
      const activity: { date: string; count: number }[] = [];
      for (const week of weeks.slice(-4)) {
        const base = new Date(week.week * 1000);
        week.days.forEach((count: number, idx: number) => {
          const date = new Date(base);
          date.setDate(date.getDate() + idx);
          activity.push({ date: date.toISOString().split("T")[0], count });
        });
      }
      return activity;
    } catch {
      return [];
    }
  }

  getAnalysis(candidateId: string, repoId: number): RepositoryAnalysis | null {
    return this.analyses.get(`${candidateId}-${repoId}`) || null;
  }

  getAllAnalyses(candidateId: string): RepositoryAnalysis[] {
    const analyses: RepositoryAnalysis[] = [];
    this.analyses.forEach((analysis, key) => {
      if (key.startsWith(candidateId)) analyses.push(analysis);
    });
    return analyses;
  }

  generateCandidateReport(candidateId: string): any {
    const repos = this.getRepositories(candidateId);
    const analyses = this.getAllAnalyses(candidateId);

    const totalStars = repos.reduce((sum, r) => sum + r.stars, 0);
    const totalForks = repos.reduce((sum, r) => sum + r.forks, 0);
    const avgQuality = analyses.length > 0
      ? analyses.reduce((sum, a) => sum + a.analysis.qualityScore, 0) / analyses.length
      : 0;

    const languages = new Map<string, number>();
    repos.forEach(r => {
      const current = languages.get(r.language) || 0;
      languages.set(r.language, current + 1);
    });

    return {
      candidateId,
      profile: {
        totalRepositories: repos.length,
        totalStars,
        totalForks,
      },
      qualityMetrics: {
        averageQualityScore: Math.round(avgQuality),
        totalCommits: analyses.reduce((sum, a) => sum + a.analysis.totalCommits, 0),
        totalPRs: analyses.reduce((sum, a) => sum + a.analysis.totalPRs, 0),
      },
      topLanguages: Array.from(languages.entries()).map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5),
      recommendation: this.getRecommendation(avgQuality),
      generatedAt: new Date(),
    };
  }

  private getRecommendation(qualityScore: number): string {
    if (qualityScore >= 85) return "Excellent GitHub profile. Highly technical candidate.";
    if (qualityScore >= 70) return "Good GitHub activity. Candidate shows consistent contributions.";
    if (qualityScore >= 50) return "Average GitHub profile. May need more contributions.";
    return "Limited GitHub presence. Consider other evaluation criteria.";
  }

  async getActivityCalendar(candidateId: string): Promise<any> {
    const token = this.linkedAccounts.get(candidateId);
    if (!token) {
      return { candidateId, totalContributions: 0, days: [] };
    }
    try {
      const res = await axios.get("https://api.github.com/user/events", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
        params: { per_page: 100 },
        timeout: 15000,
      });
      const days = new Map<string, number>();
      for (const event of res.data || []) {
        const date = event.created_at?.split("T")[0];
        if (date) days.set(date, (days.get(date) || 0) + 1);
      }
      const result = Array.from(days.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
      return {
        candidateId,
        totalContributions: result.reduce((sum, d) => sum + d.count, 0),
        days: result,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, "Failed to fetch GitHub activity calendar");
      return { candidateId, totalContributions: 0, days: [] };
    }
  }
}

export const gitIntegrationService = new GitIntegrationService();
export default gitIntegrationService;