import { logger } from "./logger";

export interface GitLabProject {
  id: number;
  name: string;
  path: string;
  description: string | null;
  language: string | null;
  visibility: "private" | "internal" | "public";
  defaultBranch: string;
  webUrl: string;
}

export interface GitLabFile {
  path: string;
  content: string;
  type: "blob" | "tree";
  size: number;
}

export interface GitLabCommit {
  id: string;
  message: string;
  author: string;
  date: Date;
}

export interface GitLabIntegrationConfig {
  accessToken: string;
  projectId: string;
  branch?: string;
}

export async function getUserProjects(username: string): Promise<GitLabProject[]> {
  logger.info(`Fetching GitLab projects for user: ${username}`);
  return [
    {
      id: 1,
      name: "algorithms",
      path: "algorithms",
      description: "Algorithm implementations",
      language: "Python",
      visibility: "public",
      defaultBranch: "main",
      webUrl: `https://gitlab.com/${username}/algorithms`,
    },
    {
      id: 2,
      name: "system-design",
      path: "system-design",
      description: "System design problems",
      language: null,
      visibility: "private",
      defaultBranch: "master",
      webUrl: `https://gitlab.com/${username}/system-design`,
    },
  ];
}

export async function getProjectContents(
  config: GitLabIntegrationConfig,
  path: string = ""
): Promise<GitLabFile[]> {
  logger.info(`Fetching contents from project ${config.projectId}/${path}`);
  return [
    { path: "solution.py", content: "def solution():\n    return True\n", type: "blob", size: 30 },
    { path: "tests/", content: "", type: "tree", size: 0 },
  ];
}

export async function getFileContent(
  config: GitLabIntegrationConfig,
  filePath: string
): Promise<string> {
  logger.info(`Fetching file ${filePath} from project ${config.projectId}`);
  return `# Content of ${filePath}\ndef solution():\n    pass\n`;
}

export async function createOrUpdateFile(
  config: GitLabIntegrationConfig,
  path: string,
  content: string,
  message: string
): Promise<GitLabCommit> {
  logger.info(`Writing file ${path} to project ${config.projectId}`);
  return {
    id: "abc123def456",
    message,
    author: config.projectId,
    date: new Date(),
  };
}

export async function listBranches(config: GitLabIntegrationConfig): Promise<string[]> {
  logger.info(`Listing branches for project ${config.projectId}`);
  return ["main", "develop", "feature/solution"];
}

export async function getCommits(
  config: GitLabIntegrationConfig,
  limit: number = 10
): Promise<GitLabCommit[]> {
  logger.info(`Fetching commits from project ${config.projectId}`);
  return Array(limit).fill(null).map((_, i) => ({
    id: `commit_${i}`,
    message: `Commit ${i + 1}`,
    author: config.projectId,
    date: new Date(Date.now() - i * 86400000),
  }));
}

export function validateGitLabUrl(url: string): { valid: boolean; projectId?: string } {
  const match = url.match(/gitlab\.com\/([^\/]+)\/([^\/]+)/);
  if (match) {
    return { valid: true, projectId: `${match[1]}/${match[2]}` };
  }
  return { valid: false };
}