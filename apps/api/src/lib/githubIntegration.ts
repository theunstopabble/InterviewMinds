import axios from "axios";
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

function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
}

export async function getUserRepos(username: string): Promise<GitHubRepo[]> {
  logger.info({ username }, "Fetching GitHub user repos");
  try {
    const res = await axios.get(`https://api.github.com/users/${username}/repos`, {
      params: { per_page: 100, sort: "updated" },
      timeout: 15000,
    });
    return (res.data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description || null,
      language: r.language || null,
      private: r.private,
      defaultBranch: r.default_branch || "main",
      url: r.html_url,
    }));
  } catch (err: any) {
    logger.error({ username, err: err.message }, "Failed to fetch user repos");
    return [];
  }
}

export async function getRepoContents(
  config: GitHubIntegrationConfig,
  path: string = ""
): Promise<GitHubFile[]> {
  logger.info({ owner: config.owner, repo: config.repo, path }, "Fetching repo contents");
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`,
      { headers: getHeaders(config.accessToken), timeout: 15000 }
    );
    const items = Array.isArray(res.data) ? res.data : [res.data];
    return items.map((item: any) => ({
      path: item.path,
      content: item.type === "file" ? (item.content ? Buffer.from(item.content, "base64").toString("utf-8") : "") : "",
      type: item.type === "dir" ? "dir" : "file",
      size: item.size || 0,
    }));
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to fetch repo contents");
    return [];
  }
}

export async function getFileContent(
  config: GitHubIntegrationConfig,
  filePath: string
): Promise<string> {
  logger.info({ filePath, owner: config.owner, repo: config.repo }, "Fetching file content");
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}`,
      { headers: getHeaders(config.accessToken), timeout: 15000 }
    );
    if (res.data?.content) {
      return Buffer.from(res.data.content, "base64").toString("utf-8");
    }
    return "";
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to fetch file content");
    return "";
  }
}

export async function createOrUpdateFile(
  config: GitHubIntegrationConfig,
  path: string,
  content: string,
  message: string
): Promise<GitHubCommit> {
  logger.info({ path, owner: config.owner, repo: config.repo }, "Creating or updating file");
  try {
    const base64Content = Buffer.from(content).toString("base64");
    /* Try to get existing file SHA for update */
    let sha: string | undefined;
    try {
      const existing = await axios.get(
        `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`,
        { headers: getHeaders(config.accessToken), params: { ref: config.branch || "main" }, timeout: 10000 }
      );
      sha = existing.data?.sha;
    } catch {
      sha = undefined;
    }

    const body: any = {
      message,
      content: base64Content,
      branch: config.branch || "main",
    };
    if (sha) body.sha = sha;

    const res = await axios.put(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`,
      body,
      { headers: getHeaders(config.accessToken), timeout: 15000 }
    );
    return {
      sha: res.data?.commit?.sha || "",
      message: res.data?.commit?.message || message,
      author: res.data?.commit?.author?.name || config.owner,
      date: new Date(res.data?.commit?.committer?.date || Date.now()),
    };
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create or update file");
    return { sha: "", message, author: config.owner, date: new Date() };
  }
}

export async function listBranches(config: GitHubIntegrationConfig): Promise<string[]> {
  logger.info({ owner: config.owner, repo: config.repo }, "Listing branches");
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${config.owner}/${config.repo}/branches`,
      { headers: getHeaders(config.accessToken), params: { per_page: 100 }, timeout: 15000 }
    );
    return (res.data || []).map((b: any) => b.name);
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to list branches");
    return [];
  }
}

export async function getCommits(
  config: GitHubIntegrationConfig,
  limit: number = 10
): Promise<GitHubCommit[]> {
  logger.info({ owner: config.owner, repo: config.repo }, "Fetching commits");
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${config.owner}/${config.repo}/commits`,
      { headers: getHeaders(config.accessToken), params: { per_page: limit }, timeout: 15000 }
    );
    return (res.data || []).map((c: any) => ({
      sha: c.sha,
      message: c.commit?.message || "",
      author: c.commit?.author?.name || c.author?.login || config.owner,
      date: new Date(c.commit?.author?.date || Date.now()),
    }));
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to fetch commits");
    return [];
  }
}

export function validateGitHubUrl(url: string): { valid: boolean; owner?: string; repo?: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match) {
    return { valid: true, owner: match[1], repo: match[2].replace(/\.git$/, "") };
  }
  return { valid: false };
}