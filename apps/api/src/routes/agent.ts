import { Router } from "express";
import {
  getAgents,
  getAgent,
  updateAgent,
  runAgent,
  getTasks,
  getTask,
  createAgent,
  deleteAgent,
} from "../lib/aiAgent";
import {
  getAutomations,
  getAutomation,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  runAutomation,
  getRuns,
  getRun,
  triggerAutomations,
  testAutomation,
} from "../lib/automationService";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/agents", requireAuth, (req, res) => {
  const agents = getAgents();
  res.json({ success: true, data: { agents, count: agents.length } });
});

router.get("/agents/:name", requireAuth, (req, res) => {
  const agent = getAgent(req.params.name);
  if (!agent) return res.status(404).json({ success: false, error: "Agent not found" });
  res.json({ success: true, data: agent });
});

router.post("/agents", requireAuth, (req, res) => {
  const agent = createAgent(req.body);
  res.json({ success: true, data: agent });
});

router.put("/agents/:name", requireAuth, (req, res) => {
  const agent = updateAgent(req.params.name, req.body);
  if (!agent) return res.status(404).json({ success: false, error: "Agent not found" });
  res.json({ success: true, data: agent });
});

router.delete("/agents/:name", requireAuth, (req, res) => {
  const deleted = deleteAgent(req.params.name);
  res.json({ success: deleted });
});

router.post("/agents/run", requireAuth, async (req, res) => {
  const { agentName, input } = req.body;
  const task = await runAgent(agentName, input);
  res.json({ success: true, data: task });
});

router.get("/tasks", requireAuth, (req, res) => {
  const { agentId } = req.query;
  const tasks = getTasks(agentId as string);
  res.json({ success: true, data: { tasks, count: tasks.length } });
});

router.get("/tasks/:taskId", requireAuth, (req, res) => {
  const task = getTask(req.params.taskId);
  if (!task) return res.status(404).json({ success: false, error: "Task not found" });
  res.json({ success: true, data: task });
});

router.get("/automations", requireAuth, (req, res) => {
  const automations = getAutomations();
  res.json({ success: true, data: { automations, count: automations.length } });
});

router.get("/automations/:id", requireAuth, (req, res) => {
  const automation = getAutomation(req.params.id);
  if (!automation) return res.status(404).json({ success: false, error: "Automation not found" });
  res.json({ success: true, data: automation });
});

router.post("/automations", requireAuth, (req, res) => {
  const automation = createAutomation(req.body);
  res.json({ success: true, data: automation });
});

router.put("/automations/:id", requireAuth, (req, res) => {
  const automation = updateAutomation(req.params.id, req.body);
  if (!automation) return res.status(404).json({ success: false, error: "Automation not found" });
  res.json({ success: true, data: automation });
});

router.delete("/automations/:id", requireAuth, (req, res) => {
  const deleted = deleteAutomation(req.params.id);
  res.json({ success: deleted });
});

router.post("/automations/:id/run", requireAuth, async (req, res) => {
  const { context } = req.body;
  const run = await runAutomation(req.params.id, "manual", context || {});
  res.json({ success: true, data: run });
});

router.post("/automations/:id/test", requireAuth, async (req, res) => {
  const { testContext } = req.body;
  const run = await testAutomation(req.params.id, testContext || {});
  res.json({ success: true, data: run });
});

router.get("/runs", requireAuth, (req, res) => {
  const { automationId } = req.query;
  const runs = getRuns(automationId as string);
  res.json({ success: true, data: { runs, count: runs.length } });
});

router.get("/runs/:runId", requireAuth, (req, res) => {
  const run = getRun(req.params.runId);
  if (!run) return res.status(404).json({ success: false, error: "Run not found" });
  res.json({ success: true, data: run });
});

router.post("/trigger", requireAuth, async (req, res) => {
  const { event, context } = req.body;
  const results = await triggerAutomations(event, context || {});
  res.json({ success: true, data: { triggered: results.length, runs: results } });
});

export default router;