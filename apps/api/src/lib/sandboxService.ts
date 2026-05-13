import { logger } from "./logger";
import axios from "axios";

export interface SandboxConfig {
  language: string;
  timeout: number;
  memoryLimit: number;
  cpuLimit: number;
  networkAccess: boolean;
  maxProcesses: number;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memoryUsed?: number;
  exitCode: number;
}

export interface ResourceUsage {
  cpuTime: number;
  memoryBytes: number;
  processes: number;
  networkCalls: number;
}

const defaultConfig: SandboxConfig = {
  language: "javascript",
  timeout: 5000,
  memoryLimit: 128 * 1024 * 1024,
  cpuLimit: 1,
  networkAccess: false,
  maxProcesses: 5,
};

/* Piston language → version mapping (same as compiler.ts) */
const PISTON_VERSIONS: Record<string, string> = {
  javascript: "18.15.0",
  typescript: "5.0.3",
  python: "3.10.0",
  java: "15.0.2",
  c: "10.2.0",
  cpp: "10.2.0",
  go: "1.16.2",
  rust: "1.68.2",
};

const sandboxStore = new Map<string, {
  config: SandboxConfig;
  code: string;
  status: "created" | "running" | "completed" | "terminated" | "error";
  startedAt: Date;
  completedAt?: Date;
  result?: ExecutionResult;
}>();

export function createSandbox(code: string, config: Partial<SandboxConfig> = {}): {
  id: string;
  config: SandboxConfig;
  code: string;
} {
  const mergedConfig = { ...defaultConfig, ...config };
  const sandboxId = `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  sandboxStore.set(sandboxId, {
    config: mergedConfig,
    code,
    status: "created",
    startedAt: new Date(),
  });

  logger.info({ sandboxId, language: mergedConfig.language }, "Sandbox created");

  return {
    id: sandboxId,
    config: mergedConfig,
    code,
  };
}

export async function executeInSandbox(
  sandboxId: string,
  input?: string
): Promise<ExecutionResult> {
  const record = sandboxStore.get(sandboxId);
  if (!record) throw new Error(`Sandbox ${sandboxId} not found`);

  const { config, code } = record;
  record.status = "running";

  const startTime = Date.now();
  const version = PISTON_VERSIONS[config.language] || "18.15.0";

  try {
    const response = await axios.post(
      "https://emkc.org/api/v2/piston/execute",
      {
        language: config.language,
        version,
        files: [{ content: code }],
        stdin: input || "",
      },
      { timeout: config.timeout + 2000 }
    );

    const run = response.data?.run || {};
    const stdout = run.stdout || "";
    const stderr = run.stderr || "";
    const exitCode = run.code ?? 0;
    const compileOutput = response.data?.compile?.output || "";

    const output = compileOutput
      ? `[COMPILE]\n${compileOutput}\n[RUN]\n${stdout}`
      : stdout;

    const result: ExecutionResult = {
      success: exitCode === 0 && !stderr,
      output: output || (stderr ? "" : "Execution completed successfully"),
      error: stderr || undefined,
      executionTime: Date.now() - startTime,
      memoryUsed: run.memory ? run.memory * 1024 : undefined,
      exitCode,
    };

    record.status = exitCode === 0 ? "completed" : "error";
    record.completedAt = new Date();
    record.result = result;

    logger.info({ sandboxId, exitCode, duration: result.executionTime }, "Sandbox execution finished");
    return result;
  } catch (err: any) {
    const errorResult: ExecutionResult = {
      success: false,
      output: "",
      error: err.message || "Sandbox execution failed",
      executionTime: Date.now() - startTime,
      exitCode: 1,
    };
    record.status = "error";
    record.completedAt = new Date();
    record.result = errorResult;
    logger.error({ sandboxId, err: err.message }, "Sandbox execution error");
    return errorResult;
  }
}

export function checkResourceLimits(usage: ResourceUsage, config: SandboxConfig): {
  withinLimits: boolean;
  exceeded: string[];
} {
  const exceeded: string[] = [];

  if (usage.cpuTime > config.cpuLimit * 1000) {
    exceeded.push("CPU time");
  }

  if (usage.memoryBytes > config.memoryLimit) {
    exceeded.push("Memory");
  }

  if (usage.processes > config.maxProcesses) {
    exceeded.push("Max processes");
  }

  return {
    withinLimits: exceeded.length === 0,
    exceeded,
  };
}

export async function terminateSandbox(sandboxId: string): Promise<boolean> {
  const record = sandboxStore.get(sandboxId);
  if (!record) return false;
  record.status = "terminated";
  logger.info({ sandboxId }, "Sandbox terminated");
  return true;
}

export function estimateExecutionTime(
  codeSize: number,
  complexity: number,
  language: string
): number {
  const baseTimes: Record<string, number> = {
    javascript: 1000,
    python: 2000,
    java: 3000,
    cpp: 500,
    go: 800,
    rust: 600,
  };

  const baseTime = baseTimes[language] || 1000;
  const complexityMultiplier = 1 + (complexity / 10);
  const sizeMultiplier = 1 + (codeSize / 10000);

  return Math.round(baseTime * complexityMultiplier * sizeMultiplier);
}

export function getSandboxStatus(sandboxId: string): {
  id: string;
  status: "created" | "running" | "completed" | "terminated" | "error";
  resourceUsage: ResourceUsage;
  startedAt: Date;
  completedAt?: Date;
} {
  const record = sandboxStore.get(sandboxId);
  if (!record) {
    return {
      id: sandboxId,
      status: "error",
      resourceUsage: { cpuTime: 0, memoryBytes: 0, processes: 0, networkCalls: 0 },
      startedAt: new Date(),
    };
  }

  const result = record.result;
  return {
    id: sandboxId,
    status: record.status,
    resourceUsage: {
      cpuTime: result?.executionTime || 0,
      memoryBytes: result?.memoryUsed || 0,
      processes: record.status === "running" ? 1 : 0,
      networkCalls: 0,
    },
    startedAt: record.startedAt,
    completedAt: record.completedAt,
  };
}

export function validateCodeForSandbox(code: string, language: string): {
  allowed: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  const dangerousPatterns = [
    { pattern: /process\.exit/g, reason: "Process termination not allowed" },
    { pattern: /child_process/g, reason: "Child process spawning not allowed" },
    { pattern: /require\s*\(\s*['"]fs['"]\s*\)/g, reason: "File system access not allowed" },
    { pattern: /require\s*\(\s*['"]net['"]\s*\)/g, reason: "Network access not allowed" },
    { pattern: /import\s+.*from\s+['"]fs['"]/g, reason: "File system access not allowed" },
  ];

  for (const { pattern, reason } of dangerousPatterns) {
    if (pattern.test(code)) {
      reasons.push(reason);
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}