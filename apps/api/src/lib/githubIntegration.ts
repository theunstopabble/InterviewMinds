import { logger } from "./logger";

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  private: boolean;
  defaultBranch: string;
  url: string;
}

export interface GitHubFile {
  path: string;
  content: string;
  type: "file" | "dir";
  size: number;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: Date;
}

export interface GitHubIntegrationConfig {
  accessToken: string;
  owner: string;
  repo: string;
  branch?: string;
}

export async function getUserRepos(username: string): Promise<GitHubRepo[]> {
  logger.info(`Fetching repos for user: ${username}`);
  return [
    {
      id: 1,
      name: "interview-problems",
      fullName: `${username}/interview-problems`,
      description: "My solutions to coding problems",
      language: "JavaScript",
      private: false,
      defaultBranch: "main",
      url: `https://github.com/${username}/interview-problems`,
    },
    {
      id: 2,
      name: "data-structures",
      fullName: `${username}/data-structures`,
      description: "Implementation of common data structures",
      language: "Python",
      private: true,
      defaultBranch: "master",
      url: `https://github.com/${username}/data-structures`,
    },
  ];
}

export async function getRepoContents(
  config: GitHubIntegrationConfig,
  path: string = ""
): Promise<GitHubFile[]> {
  logger.info(`Fetching contents from ${config.owner}/${config.repo}/${path}`);
  return [
    { path: "solution.js", content: "console.log('Hello');", type: "file", size: 20 },
    { path: "tests/", content: "", type: "dir", size: 0 },
  ];
}

export async function getFileContent(
  config: GitHubIntegrationConfig,
  filePath: string
): Promise<string> {
  logger.info(`Fetching file ${filePath} from ${config.owner}/${config.repo}`);
  return `// Content of ${filePath}\nfunction solution() {\n  return true;\n}\nmodule.exports = solution;`;
}

export async function createOrUpdateFile(
  config: GitHubIntegrationConfig,
  path: string,
  content: string,
  message: string
): Promise<GitHubCommit> {
  logger.info(`Writing file ${path} to ${config.owner}/${config.repo}`);
  return {
    sha: "abc123def456",
    message,
    author: config.owner,
    date: new Date(),
  };
}

export async function listBranches(config: GitHubIntegrationConfig): Promise<string[]> {
  logger.info(`Listing branches for ${config.owner}/${config.repo}`);
  return ["main", "develop", "feature/new-solution"];
}

export async function getCommits(
  config: GitHubIntegrationConfig,
  limit: number = 10
): Promise<GitHubCommit[]> {
  logger.info(`Fetching commits from ${config.owner}/${config.repo}`);
  return Array(limit).fill(null).map((_, i) => ({
    sha: `commit_${i}`,
    message: `Commit ${i + 1}`,
    author: config.owner,
    date: new Date(Date.now() - i * 86400000),
  }));
}

export function validateGitHubUrl(url: string): { valid: boolean; owner?: string; repo?: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match) {
    return { valid: true, owner: match[1], repo: match[2].replace(/\.git$/, "") };
  }
  return { valid: false };
}