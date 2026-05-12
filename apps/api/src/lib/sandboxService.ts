import { logger } from "./logger";

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

export function createSandbox(code: string, config: Partial<SandboxConfig> = {}): {
  id: string;
  config: SandboxConfig;
  code: string;
} {
  const mergedConfig = { ...defaultConfig, ...config };
  const sandboxId = `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info(`Creating sandbox ${sandboxId} for ${mergedConfig.language}`);

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
  logger.info(`Executing code in sandbox ${sandboxId}`);

  const startTime = Date.now();
  const mockOutput = "Execution completed successfully";

  return {
    success: true,
    output: input ? `Processed input: ${input}\n${mockOutput}` : mockOutput,
    executionTime: Date.now() - startTime,
    memoryUsed: Math.floor(Math.random() * 50) * 1024 * 1024,
    exitCode: 0,
  };
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
  logger.info(`Terminating sandbox ${sandboxId}`);
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
  return {
    id: sandboxId,
    status: "running",
    resourceUsage: {
      cpuTime: 150,
      memoryBytes: 25 * 1024 * 1024,
      processes: 2,
      networkCalls: 0,
    },
    startedAt: new Date(Date.now() - 5000),
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