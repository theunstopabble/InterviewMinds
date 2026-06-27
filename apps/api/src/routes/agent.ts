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

router.get("/agents", requireAuth, async (req, res) => {
  const agents = await getAgents();
  res.json({ success: true, data: { agents, count: agents.length } });
});

router.get("/agents/:name", requireAuth, async (req, res) => {
  const agent = await getAgent(req.params.name);
  if (!agent) return res.status(404).json({ success: false, error: "Agent not found" });
  res.json({ success: true, data: agent });
});

router.post("/agents", requireAuth, async (req, res) => {
  const agent = await createAgent(req.body);
  res.json({ success: true, data: agent });
});

router.put("/agents/:name", requireAuth, async (req, res) => {
  const agent = await updateAgent(req.params.name, req.body);
  if (!agent) return res.status(404).json({ success: false, error: "Agent not found" });
  res.json({ success: true, data: agent });
});

router.delete("/agents/:name", requireAuth, async (req, res) => {
  const deleted = await deleteAgent(req.params.name);
  res.json({ success: deleted });
});

router.post("/agents/run", requireAuth, async (req, res) => {
  const { agentName, input } = req.body;
  const task = await runAgent(agentName, input);
  res.json({ success: true, data: task });
});

router.get("/tasks", requireAuth, async (req, res) => {
  const { agentId } = req.query;
  const tasks = getTasks(agentId as string);
  res.json({ success: true, data: { tasks, count: tasks.length } });
});

router.get("/tasks/:taskId", requireAuth, async (req, res) => {
  const task = getTask(req.params.taskId);
  if (!task) return res.status(404).json({ success: false, error: "Task not found" });
  res.json({ success: true, data: task });
});

router.get("/automations", requireAuth, async (req, res) => {
  const automations = await getAutomations();
  res.json({ success: true, data: { automations, count: automations.length } });
});

router.get("/automations/:id", requireAuth, async (req, res) => {
  const automation = await getAutomation(req.params.id);
  if (!automation) return res.status(404).json({ success: false, error: "Automation not found" });
  res.json({ success: true, data: automation });
});

router.post("/automations", requireAuth, async (req, res) => {
  const automation = await createAutomation(req.body);
  res.json({ success: true, data: automation });
});

router.put("/automations/:id", requireAuth, async (req, res) => {
  const automation = await updateAutomation(req.params.id, req.body);
  if (!automation) return res.status(404).json({ success: false, error: "Automation not found" });
  res.json({ success: true, data: automation });
});

router.delete("/automations/:id", requireAuth, async (req, res) => {
  const deleted = await deleteAutomation(req.params.id);
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

router.get("/runs", requireAuth, async (req, res) => {
  const { automationId } = req.query;
  const runs = await getRuns(automationId as string);
  res.json({ success: true, data: { runs, count: runs.length } });
});

router.get("/runs/:runId", requireAuth, async (req, res) => {
  const run = await getRun(req.params.runId);
  if (!run) return res.status(404).json({ success: false, error: "Run not found" });
  res.json({ success: true, data: run });
});

router.post("/trigger", requireAuth, async (req, res) => {
  const { event, context } = req.body;
  const results = await triggerAutomations(event, context || {});
  res.json({ success: true, data: { triggered: results.length, runs: results } });
});

export default router;
