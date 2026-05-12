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

function createTestRunner(language: string): (code: string, input: unknown) => Promise<{ output: string; error?: string }> {
  return async (code: string, input: unknown) => {
    logger.info(`Running ${language} code with input: ${JSON.stringify(input)}`);
    
    const mockResults: Record<string, { output: string; error?: string }> = {
      javascript: { output: "42" },
      python: { output: "42" },
      java: { output: "42" },
      cpp: { output: "42" },
      go: { output: "42" },
      rust: { output: "42" },
    };

    return mockResults[language] || { output: "Unsupported language" };
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