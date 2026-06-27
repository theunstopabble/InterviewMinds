import { logger } from "./logger";

export interface TestCase {
  id: string;
  input: unknown;
  expectedOutput: unknown;
  isHidden?: boolean;
}

export interface TestResult {
  testId: string;
  passed: boolean;
  input: unknown;
  expected: unknown;
  actual: unknown;
  executionTime: number;
  error?: string;
}

export interface TestSuiteResult {
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
  executionTime: number;
}

export interface TestSuite {
  name: string;
  testCases: TestCase[];
}

export interface SupportedLanguage {
  id: string;
  name: string;
  extensions: string[];
  compileCommand?: string;
  runCommand: string;
  timeout: number;
}

export const supportedLanguages: SupportedLanguage[] = [
  { id: "javascript", name: "JavaScript", extensions: ["js"], runCommand: "node", timeout: 5000 },
  { id: "typescript", name: "TypeScript", extensions: ["ts"], runCommand: "npx ts-node", timeout: 10000 },
  { id: "python", name: "Python", extensions: ["py"], runCommand: "python3", timeout: 5000 },
  { id: "java", name: "Java", extensions: ["java"], compileCommand: "javac", runCommand: "java", timeout: 10000 },
  { id: "cpp", name: "C++", extensions: ["cpp", "cc"], compileCommand: "g++", runCommand: "./a.out", timeout: 5000 },
  { id: "go", name: "Go", extensions: ["go"], runCommand: "go run", timeout: 5000 },
  { id: "rust", name: "Rust", extensions: ["rs"], compileCommand: "rustc", runCommand: "./main", timeout: 10000 },
];

const PISTON_API = "https://emkc.org/api/v2/piston";

const runtimeVersions: Record<string, string> = {
  javascript: "18.15.0",
  typescript: "5.0.3",
  python: "3.10.0",
  java: "15.0.2",
  cpp: "10.2.0",
  go: "1.16.0",
  rust: "1.68.2",
};

let fetchedVersions: Record<string, string> = {};

async function fetchRuntimes(): Promise<void> {
  try {
    const res = await fetch(`${PISTON_API}/runtimes`);
    if (!res.ok) return;
    const runtimes: Array<{ language: string; version: string }> = await res.json();
    for (const lang of supportedLanguages) {
      const match = runtimes.find(r => r.language === lang.id);
      if (match) fetchedVersions[lang.id] = match.version;
    }
    logger.info(`Fetched ${Object.keys(fetchedVersions).length} Piston runtime versions`);
  } catch (err) {
    logger.error({ err }, "Failed to fetch Piston runtimes, using defaults");
  }
}

function serializeInput(input: unknown): string {
  if (input === null || input === undefined) return "";
  if (typeof input === "string") return input;
  if (typeof input === "number" || typeof input === "boolean") return String(input);
  return JSON.stringify(input);
}

function normalizeOutput(output: string): string {
  return output.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

async function pistonExecute(
  language: string,
  version: string,
  code: string,
  stdin: string,
  timeout: number
): Promise<{ stdout: string; stderr: string; error?: string }> {
  try {
    const res = await fetch(`${PISTON_API}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language,
        version,
        files: [{ content: code }],
        stdin,
        args: [],
        run_timeout: Math.min(timeout, 10000),
        compile_timeout: 20000,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { stdout: "", stderr: "", error: `Piston API error ${res.status}: ${text}` };
    }

    const data = await res.json();
    const run = data.run || {};
    return {
      stdout: run.stdout || "",
      stderr: run.stderr || "",
      error: run.stderr || (run.signal ? `Killed by signal ${run.signal}` : undefined),
    };
  } catch (err) {
    return { stdout: "", stderr: "", error: String(err) };
  }
}

function createTestRunner(language: string): (code: string, input: unknown) => Promise<{ output: string; error?: string }> {
  return async (code: string, input: unknown) => {
    const version = fetchedVersions[language] || runtimeVersions[language] || "*";
    const langDef = supportedLanguages.find(l => l.id === language);
    const timeout = langDef?.timeout || 5000;
    const stdin = serializeInput(input);

    logger.info(`Running ${language} ${version} via Piston`);

    const result = await pistonExecute(language, version, code, stdin, timeout);

    if (result.error && !result.stdout) {
      return { output: "", error: result.error };
    }

    return { output: normalizeOutput(result.stdout), error: result.error || undefined };
  };
}

export async function runTests(
  code: string,
  language: string,
  testCases: TestCase[]
): Promise<TestSuiteResult> {
  const startTime = Date.now();
  const runner = createTestRunner(language);
  const results: TestResult[] = [];

  for (const testCase of testCases) {
    const testStartTime = Date.now();
    try {
      const { output, error } = await runner(code, testCase.input);
      const executionTime = Date.now() - testStartTime;

      const actual = output.trim();
      const expected = String(testCase.expectedOutput).trim();
      const passed = actual === expected;

      results.push({
        testId: testCase.id,
        passed,
        input: testCase.input,
        expected: testCase.expectedOutput,
        actual: output,
        executionTime,
        error: error || undefined,
      });
    } catch (err) {
      results.push({
        testId: testCase.id,
        passed: false,
        input: testCase.input,
        expected: testCase.expectedOutput,
        actual: "Error",
        executionTime: Date.now() - testStartTime,
        error: String(err),
      });
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    totalTests: testCases.length,
    passed,
    failed,
    results,
    executionTime: Date.now() - startTime,
  };
}

export async function runHiddenTests(
  code: string,
  language: string,
  testCases: TestCase[]
): Promise<{ allPassed: boolean; passedCount: number; totalCount: number }> {
  const result = await runTests(code, language, testCases);
  return {
    allPassed: result.failed === 0,
    passedCount: result.passed,
    totalCount: result.totalTests,
  };
}

export function getLanguageByExtension(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  for (const lang of supportedLanguages) {
    if (lang.extensions.includes(ext || "")) {
      return lang.id;
    }
  }
  return null;
}

export function validateCodeSyntax(code: string, language: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (language === "javascript" || language === "typescript") {
    try {
      new Function(code);
    } catch (err) {
      errors.push(String(err));
    }
  }

  if (language === "python") {
    const hasSyntaxError = code.includes("def :") || code.includes("if :");
    if (hasSyntaxError) {
      errors.push("Potential syntax error detected");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function generateTestCases(
  problemType: "array" | "string" | "tree" | "graph" | "math"
): TestCase[] {
  const generators: Record<string, () => TestCase[]> = {
    array: () => [
      { id: "1", input: [[1, 2, 3]], expectedOutput: [1, 2, 3] },
      { id: "2", input: [[5, 4, 3, 2, 1]], expectedOutput: [1, 2, 3, 4, 5] },
      { id: "3", input: [[1]], expectedOutput: [1] },
    ],
    string: () => [
      { id: "1", input: ["hello"], expectedOutput: "hello" },
      { id: "2", input: ["world"], expectedOutput: "world" },
    ],
    tree: () => [
      { id: "1", input: [[1, null, 2]], expectedOutput: [1, 2] },
    ],
    graph: () => [
      { id: "1", input: [[[0, 1], [1, 2]], 0], expectedOutput: [0, 1, 2] },
    ],
    math: () => [
      { id: "1", input: [2, 3], expectedOutput: 6 },
      { id: "2", input: [5, 5], expectedOutput: 10 },
    ],
  };

  return generators[problemType]?.() || [];
}

fetchRuntimes();
