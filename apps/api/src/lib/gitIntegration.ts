import { v4 as uuidv4 } from 'uuid';

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
    } catch (error) {
      console.error('GitHub connection error:', error);
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
    const mockRepos: GitHubRepository[] = [
      {
        id: 1,
        name: 'portfolio',
        fullName: `${candidateId}/portfolio`,
        description: 'My personal portfolio website',
        language: 'TypeScript',
        stars: 12,
        forks: 3,
        size: 1024,
        isPrivate: false,
        defaultBranch: 'main',
        url: 'https://github.com/user/portfolio',
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: 2,
        name: 'react-components',
        fullName: `${candidateId}/react-components`,
        description: 'Reusable React component library',
        language: 'JavaScript',
        stars: 45,
        forks: 8,
        size: 2048,
        isPrivate: false,
        defaultBranch: 'main',
        url: 'https://github.com/user/react-components',
        createdAt: new Date('2022-06-10'),
        updatedAt: new Date('2024-02-15'),
      },
      {
        id: 3,
        name: 'node-api-starter',
        fullName: `${candidateId}/node-api-starter`,
        description: 'Node.js API starter template with Express',
        language: 'TypeScript',
        stars: 28,
        forks: 12,
        size: 512,
        isPrivate: false,
        defaultBranch: 'master',
        url: 'https://github.com/user/node-api-starter',
        createdAt: new Date('2023-03-22'),
        updatedAt: new Date('2024-01-05'),
      },
    ];

    this.repositories.set(candidateId, mockRepos);
    return mockRepos;
  }

  getRepositories(candidateId: string): GitHubRepository[] {
    return this.repositories.get(candidateId) || [];
  }

  async analyzeRepository(candidateId: string, repoId: number): Promise<RepositoryAnalysis> {
    const repos = this.repositories.get(candidateId) || [];
    const repo = repos.find(r => r.id === repoId);

    if (!repo) {
      throw new Error('Repository not found');
    }

    const analysis: RepositoryAnalysis = {
      repositoryId: repoId,
      candidateId,
      analysis: this.generateMockAnalysis(repo),
      evaluatedAt: new Date(),
    };

    this.analyses.set(`${candidateId}-${repoId}`, analysis);
    return analysis;
  }

  private generateMockAnalysis(repo: GitHubRepository): RepositoryAnalysis['analysis'] {
    const languages = this.getLanguageDistribution(repo.language);

    return {
      totalCommits: Math.floor(Math.random() * 200) + 20,
      totalPRs: Math.floor(Math.random() * 30) + 5,
      totalIssues: Math.floor(Math.random() * 15),
      languages,
      recentActivity: this.generateRecentActivity(),
      qualityScore: Math.floor(Math.random() * 30) + 70,
    };
  }

  private getLanguageDistribution(primary: string): { name: string; percentage: number }[] {
    const langs = [
      { name: primary, percentage: 60 + Math.random() * 20 },
      { name: 'JavaScript', percentage: 10 + Math.random() * 15 },
      { name: 'CSS', percentage: 5 + Math.random() * 10 },
      { name: 'Other', percentage: 5 + Math.random() * 10 },
    ];

    const total = langs.reduce((sum, l) => sum + l.percentage, 0);
    return langs.map(l => ({
      name: l.name,
      percentage: Math.round((l.percentage / total) * 100),
    }));
  }

  private generateRecentActivity(): { date: string; count: number }[] {
    const activity: { date: string; count: number }[] = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      activity.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 5),
      });
    }

    return activity;
  }

  getAnalysis(candidateId: string, repoId: number): RepositoryAnalysis | null {
    return this.analyses.get(`${candidateId}-${repoId}`) || null;
  }

  getAllAnalyses(candidateId: string): RepositoryAnalysis[] {
    const analyses: RepositoryAnalysis[] = [];
    this.analyses.forEach((analysis, key) => {
      if (key.startsWith(candidateId)) {
        analyses.push(analysis);
      }
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
      topLanguages: Array.from(languages.entries()).map(([name, count]) => ({
        name,
        count,
      })).sort((a, b) => b.count - a.count).slice(0, 5),
      recommendation: this.getRecommendation(avgQuality),
      generatedAt: new Date(),
    };
  }

  private getRecommendation(qualityScore: number): string {
    if (qualityScore >= 85) return 'Excellent GitHub profile. Highly technical candidate.';
    if (qualityScore >= 70) return 'Good GitHub activity. Candidate shows consistent contributions.';
    if (qualityScore >= 50) return 'Average GitHub profile. May need more contributions.';
    return 'Limited GitHub presence. Consider other evaluation criteria.';
  }

  getActivityCalendar(candidateId: string): any {
    const days: { date: string; count: number }[] = [];
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 10),
      });
    }

    return {
      candidateId,
      totalContributions: days.reduce((sum, d) => sum + d.count, 0),
      days,
    };
  }
}

export const gitIntegrationService = new GitIntegrationService();
export default gitIntegrationService;