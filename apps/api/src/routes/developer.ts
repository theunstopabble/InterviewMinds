import { Router } from "express";
import {
  getUserRepos,
  getRepoContents,
  getFileContent,
  createOrUpdateFile,
  listBranches,
  getCommits,
  validateGitHubUrl,
} from "../lib/githubIntegration";
import {
  getUserProjects,
  getProjectContents,
  getFileContent as getGitLabFileContent,
  createOrUpdateFile as updateGitLabFile,
  listBranches as listGitLabBranches,
  getCommits as getGitLabCommits,
  validateGitLabUrl,
} from "../lib/gitlabIntegration";
import { reviewCode, calculateCodeMetrics, suggestRefactoring } from "../lib/codeReview";
import {
  runTests,
  runHiddenTests,
  getLanguageByExtension,
  validateCodeSyntax,
  generateTestCases,
  supportedLanguages,
} from "../lib/testRunner";
import {
  createSandbox,
  executeInSandbox,
  checkResourceLimits,
  terminateSandbox,
  getSandboxStatus,
  estimateExecutionTime,
  validateCodeForSandbox,
} from "../lib/sandboxService";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/github/repos", requireAuth, async (req, res) => {
  const { username } = req.body;
  const repos = await getUserRepos(username);
  res.json({ success: true, data: repos });
});

router.post("/github/contents", requireAuth, async (req, res) => {
  const { accessToken, owner, repo, path } = req.body;
  const contents = await getRepoContents({ accessToken, owner, repo }, path);
  res.json({ success: true, data: contents });
});

router.post("/github/file", requireAuth, async (req, res) => {
  const { accessToken, owner, repo, filePath } = req.body;
  const content = await getFileContent({ accessToken, owner, repo }, filePath);
  res.json({ success: true, data: { content } });
});

router.post("/github/commit", requireAuth, async (req, res) => {
  const { accessToken, owner, repo, path, content, message } = req.body;
  const commit = await createOrUpdateFile({ accessToken, owner, repo }, path, content, message);
  res.json({ success: true, data: commit });
});

router.get("/github/branches", requireAuth, async (req, res) => {
  const accessToken = req.query.accessToken as string;
  const owner = req.query.owner as string;
  const repo = req.query.repo as string;
  const branches = await listBranches({ accessToken, owner, repo });
  res.json({ success: true, data: branches });
});

router.get("/github/commits", requireAuth, async (req, res) => {
  const accessToken = req.query.accessToken as string;
  const owner = req.query.owner as string;
  const repo = req.query.repo as string;
  const limit = req.query.limit as string;
  const commits = await getCommits({ accessToken, owner, repo }, Number(limit) || 10);
  res.json({ success: true, data: commits });
});

router.post("/github/validate", requireAuth, (req, res) => {
  const { url } = req.body;
  const result = validateGitHubUrl(url);
  res.json({ success: true, data: result });
});

router.post("/gitlab/projects", requireAuth, async (req, res) => {
  const { username } = req.body;
  const projects = await getUserProjects(username);
  res.json({ success: true, data: projects });
});

router.post("/gitlab/contents", requireAuth, async (req, res) => {
  const { accessToken, projectId, path } = req.body;
  const contents = await getProjectContents({ accessToken, projectId }, path);
  res.json({ success: true, data: contents });
});

router.post("/gitlab/file", requireAuth, async (req, res) => {
  const { accessToken, projectId, filePath } = req.body;
  const content = await getGitLabFileContent({ accessToken, projectId }, filePath);
  res.json({ success: true, data: { content } });
});

router.post("/gitlab/validate", requireAuth, (req, res) => {
  const { url } = req.body;
  const result = validateGitLabUrl(url);
  res.json({ success: true, data: result });
});

router.post("/code-review", requireAuth, (req, res) => {
  const { code, language, filename } = req.body;
  const result = reviewCode(code, language || "javascript", filename || "solution.js");
  res.json({ success: true, data: result });
});

router.post("/code-metrics", requireAuth, (req, res) => {
  const { code, language } = req.body;
  const metrics = calculateCodeMetrics(code, language || "javascript");
  res.json({ success: true, data: metrics });
});

router.post("/code-refactor", requireAuth, (req, res) => {
  const { code } = req.body;
  const result = suggestRefactoring(code);
  res.json({ success: true, data: result });
});

router.post("/test/run", requireAuth, async (req, res) => {
  const { code, language, testCases } = req.body;
  const result = await runTests(code, language || "javascript", testCases);
  res.json({ success: true, data: result });
});

router.post("/test/hidden", requireAuth, async (req, res) => {
  const { code, language, testCases } = req.body;
  const result = await runHiddenTests(code, language || "javascript", testCases);
  res.json({ success: true, data: result });
});

router.get("/languages", requireAuth, (req, res) => {
  res.json({ success: true, data: supportedLanguages });
});

router.post("/test/generate", requireAuth, (req, res) => {
  const { problemType } = req.body;
  const testCases = generateTestCases(problemType || "array");
  res.json({ success: true, data: testCases });
});

router.post("/sandbox/create", requireAuth, async (req, res) => {
  try {
    const { code, language, timeout, memoryLimit, networkAccess } = req.body;
    const sandbox = await createSandbox(code, { language, timeout, memoryLimit, networkAccess });
    res.json({ success: true, data: sandbox });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/sandbox/execute", requireAuth, async (req, res) => {
  try {
    const { sandboxId, input } = req.body;
    const result = await executeInSandbox(sandboxId, input);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

router.post("/sandbox/terminate", requireAuth, async (req, res) => {
  try {
    const { sandboxId } = req.body;
    const terminated = await terminateSandbox(sandboxId);
    res.json({ success: terminated, data: { sandboxId } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/sandbox/status/:sandboxId", requireAuth, async (req, res) => {
  try {
    const { sandboxId } = req.params;
    const status = await getSandboxStatus(sandboxId);
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/sandbox/validate", requireAuth, (req, res) => {
  const { code, language } = req.body;
  const result = validateCodeForSandbox(code, language || "javascript");
  res.json({ success: true, data: result });
});

router.post("/sandbox/estimate", requireAuth, (req, res) => {
  const { codeSize, complexity, language } = req.body;
  const time = estimateExecutionTime(codeSize || 1000, complexity || 1, language || "javascript");
  res.json({ success: true, data: { estimatedTime: time } });
});

router.post("/syntax/validate", requireAuth, (req, res) => {
  const { code, language } = req.body;
  const result = validateCodeSyntax(code, language || "javascript");
  res.json({ success: true, data: result });
});

router.post("/language/detect", requireAuth, (req, res) => {
  const { filename } = req.body;
  const language = getLanguageByExtension(filename || "test.js");
  res.json({ success: true, data: { language } });
});

export default router;
