import { logger } from "./logger";

export interface CodeReviewIssue {
  line: number;
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  code: string;
  suggestion?: string;
}

export interface CodeReviewResult {
  score: number;
  issues: CodeReviewIssue[];
  summary: {
    errors: number;
    warnings: number;
    hints: number;
  };
  strengths: string[];
  improvements: string[];
}

export interface CodeMetrics {
  lines: number;
  functions: number;
  complexity: number;
  maintainability: number;
  testCoverage?: number;
}

function detectLanguage(filename: string, code: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    go: "go",
    rs: "rust",
    rb: "ruby",
    php: "php",
  };
  return langMap[ext || ""] || "javascript";
}

function analyzeComplexity(code: string): number {
  let complexity = 1;
  const patterns = [
    /\bif\s*\(/g,
    /\bwhile\s*\(/g,
    /\bfor\s*\(/g,
    /\bswitch\s*\(/g,
    /\bcatch\s*\(/g,
    /\?\s*[^:]+:/g,
    /\bcase\s+/g,
  ];
  patterns.forEach(p => {
    const matches = code.match(p);
    if (matches) complexity += matches.length;
  });
  return complexity;
}

function calculateMaintainability(code: string, complexity: number): number {
  const lines = code.split("\n").length;
  const avgLineLength = code.length / lines;
  let score = 100;
  score -= Math.min(30, complexity * 2);
  score -= Math.min(20, (lines > 200 ? (lines - 200) / 10 : 0));
  score -= avgLineLength > 80 ? 10 : 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function reviewCode(code: string, language: string, filename: string): CodeReviewResult {
  const issues: CodeReviewIssue[] = [];
  const lines = code.split("\n");
  const complexity = analyzeComplexity(code);
  const maintainability = calculateMaintainability(code, complexity);

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.length > 100) {
      issues.push({
        line: lineNum,
        severity: "warning",
        message: "Line exceeds 100 characters",
        code: "line-too-long",
        suggestion: "Consider breaking into multiple lines",
      });
    }

    if (line.includes("console.log") && language === "javascript") {
      issues.push({
        line: lineNum,
        severity: "info",
        message: "Debug console statement found",
        code: "no-console",
        suggestion: "Remove console statements in production code",
      });
    }

    if (line.includes("eval(")) {
      issues.push({
        line: lineNum,
        severity: "error",
        message: "Use of eval() is dangerous",
        code: "no-eval",
        suggestion: "Use alternative parsing methods",
      });
    }

    if (line.includes("TODO") || line.includes("FIXME")) {
      issues.push({
        line: lineNum,
        severity: "hint",
        message: "TODO/FIXME comment found",
        code: "todo-comment",
      });
    }

    if (/\bvar\s+/.test(line) && language === "javascript") {
      issues.push({
        line: lineNum,
        severity: "warning",
        message: "Use 'const' or 'let' instead of 'var'",
        code: "no-var",
        suggestion: "Use 'const' for constants, 'let' for variables",
      });
    }
  });

  const summary = {
    errors: issues.filter(i => i.severity === "error").length,
    warnings: issues.filter(i => i.severity === "warning").length,
    hints: issues.filter(i => i.severity === "info" || i.severity === "hint").length,
  };

  let score = 100;
  score -= summary.errors * 10;
  score -= summary.warnings * 3;
  score -= summary.hints * 1;
  score = Math.max(0, Math.min(100, score));

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (complexity < 10) strengths.push("Low code complexity");
  if (maintainability > 80) strengths.push("High maintainability");
  if (!code.includes("eval")) strengths.push("No security vulnerabilities detected");
  if (code.includes("function") || code.includes("=>")) strengths.push("Proper function definitions");

  if (complexity > 15) improvements.push("Consider refactoring complex functions");
  if (summary.warnings > 5) improvements.push("Address warning-level issues");
  if (lines.length > 100) improvements.push("Consider breaking into multiple functions/files");

  return {
    score,
    issues,
    summary,
    strengths,
    improvements,
  };
}

export function calculateCodeMetrics(code: string, language: string): CodeMetrics {
  const lines = code.split("\n").filter(l => l.trim().length > 0).length;
  const functionMatches = code.match(/(?:function\s+\w+|const\s+\w+\s*=|=>)/g) || [];
  const functions = functionMatches.length;
  const complexity = analyzeComplexity(code);
  const maintainability = calculateMaintainability(code, complexity);

  return {
    lines,
    functions,
    complexity,
    maintainability,
  };
}

export function suggestRefactoring(code: string): {
  suggestions: Array<{ type: string; original: string; suggested: string; reason: string }>;
} {
  const suggestions: Array<{ type: string; original: string; suggested: string; reason: string }> = [];

  if (code.includes("var ")) {
    suggestions.push({
      type: "variable-declaration",
      original: "var x = 1",
      suggested: "const x = 1",
      reason: "Use const/let instead of var for block scoping",
    });
  }

  if (code.includes("==") || code.includes("!=")) {
    suggestions.push({
      type: "comparison",
      original: "a == b",
      suggested: "a === b",
      reason: "Use strict equality to avoid type coercion bugs",
    });
  }

  const funcMatches = code.match(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?^\}/gm);
  if (funcMatches && funcMatches.length > 5) {
    suggestions.push({
      type: "modularization",
      original: "// large file with many functions",
      suggested: "// split into modules",
      reason: "Consider splitting into smaller, focused modules",
    });
  }

  return { suggestions };
}