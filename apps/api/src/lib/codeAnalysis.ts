interface CodeAnalysisResult {
  correctness: number;
  efficiency: number;
  codeQuality: number;
  security: number;
  testCoverage: number;
  output: string;
  issues: CodeIssue[];
  suggestions: string[];
}

interface CodeIssue {
  type: 'error' | 'warning' | 'info' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  line: number;
  message: string;
  suggestion?: string;
}

interface SecurityCheck {
  vulnerability: string;
  detected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface ComplexityMetrics {
  cyclomaticComplexity: number;
  linesOfCode: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
}

function analyzeCodeQuality(code: string, language: string): { score: number; issues: CodeIssue[] } {
  const issues: CodeIssue[] = [];
  const lines = code.split('\n');
  let score = 100;

  const issuesByLine: { [key: number]: string[] } = {};

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    if (trimmed.length > 120) {
      issues.push({ type: 'warning', severity: 'low', line: lineNum, message: 'Line exceeds 120 characters' });
      score -= 2;
    }

    if (/function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{/.test(trimmed) && trimmed.includes('function') && trimmed.length > 80) {
      if (!issuesByLine[lineNum]) issuesByLine[lineNum] = [];
      issuesByLine[lineNum].push('Consider breaking down this function');
    }

    if (trimmed.match(/^[A-Z_][A-Z0-9_]*\s*=\s*['"`]/)) {
      issues.push({ type: 'warning', severity: 'medium', line: lineNum, message: 'Constant used directly in code', suggestion: 'Use constants file' });
      score -= 5;
    }

    if (trimmed.includes('console.log') || trimmed.includes('console.error')) {
      issues.push({ type: 'info', severity: 'low', line: lineNum, message: 'Console statement found', suggestion: 'Remove in production' });
      score -= 1;
    }

    if (trimmed.includes('TODO') || trimmed.includes('FIXME')) {
      issues.push({ type: 'info', severity: 'low', line: lineNum, message: 'TODO/FIXME comment found' });
      score -= 1;
    }

    if (trimmed.includes('any') && language === 'typescript') {
      issues.push({ type: 'warning', severity: 'medium', line: lineNum, message: 'Avoid using "any" type', suggestion: 'Use specific types' });
      score -= 5;
    }
  });

  const duplicatePatterns = lines.filter(l => l.length > 20);
  const duplicates = duplicatePatterns.filter((l, i) => duplicatePatterns.indexOf(l) !== i);
  if (duplicates.length > 3) {
    issues.push({ type: 'warning', severity: 'medium', line: 0, message: 'Potential code duplication detected' });
    score -= 10;
  }

  return { score: Math.max(0, score), issues };
}

function checkSecurityVulnerabilities(code: string): SecurityCheck[] {
  const checks: SecurityCheck[] = [
    { vulnerability: 'SQL Injection', detected: false, severity: 'critical', description: '' },
    { vulnerability: 'XSS', detected: false, severity: 'critical', description: '' },
    { vulnerability: 'Hardcoded Secrets', detected: false, severity: 'high', description: '' },
    { vulnerability: 'Command Injection', detected: false, severity: 'high', description: '' },
    { vulnerability: 'Insecure Deserialization', detected: false, severity: 'high', description: '' },
    { vulnerability: 'Weak Cryptography', detected: false, severity: 'medium', description: '' },
    { vulnerability: 'Path Traversal', detected: false, severity: 'high', description: '' },
    { vulnerability: 'Unsafe Regex', detected: false, severity: 'medium', description: '' }
  ];

  const codeLower = code.toLowerCase();

  if (/exec\s*\(|system\s*\(|shell_exec\s*\(|\bmkdir\b|\bunlink\b/.test(codeLower)) {
    checks.find(c => c.vulnerability === 'Command Injection')!.detected = true;
    checks.find(c => c.vulnerability === 'Command Injection')!.description = 'Potential command injection via system calls';
  }

  if (/process\.env\.|apiKey|api_key|secret|password|token/.test(code) && /=\s*['"][^'"]+['"]/.test(code)) {
    checks.find(c => c.vulnerability === 'Hardcoded Secrets')!.detected = true;
    checks.find(c => c.vulnerability === 'Hardcoded Secrets')!.description = 'Potential hardcoded credentials detected';
  }

  if (/eval\s*\(|new\s+Function\s*\(|innerHTML\s*=|.html\(/.test(codeLower)) {
    const xssCheck = checks.find(c => c.vulnerability === 'XSS');
    if (xssCheck) {
      xssCheck.detected = true;
      xssCheck.description = 'Potential XSS vulnerability via eval or innerHTML';
    }
  }

  if (/query\s*\(|execute\s*\(|raw\s*\(|\$\{.*\}|\+.*\+.*where/.test(codeLower)) {
    const sqlCheck = checks.find(c => c.vulnerability === 'SQL Injection');
    if (sqlCheck) {
      sqlCheck.detected = true;
      sqlCheck.description = 'Potential SQL injection vulnerability';
    }
  }

  if (/crypto\.createHash\s*\(\s*['"]md5['"]\)|crypto\.createHash\s*\(\s*['"]sha1['"]\)/.test(code)) {
    checks.find(c => c.vulnerability === 'Weak Cryptography')!.detected = true;
    checks.find(c => c.vulnerability === 'Weak Cryptography')!.description = 'Use of deprecated MD5 or SHA1';
  }

  if (/\.\.\/|\.\.\\\\|readFile\s*\(|readFileSync\s*\(/.test(code)) {
    checks.find(c => c.vulnerability === 'Path Traversal')!.detected = true;
    checks.find(c => c.vulnerability === 'Path Traversal')!.description = 'Potential path traversal vulnerability';
  }

  return checks;
}

export function calculateComplexity(code: string): ComplexityMetrics {
  const lines = code.split('\n').filter(l => l.trim().length > 0);
  const linesOfCode = lines.length;

  let cyclomaticComplexity = 1;
  const controlPatterns = /if|while|for|switch|case|catch|\?\.|&&|\|\|/g;
  const matches = code.match(controlPatterns);
  if (matches) cyclomaticComplexity += matches.length;

  let cognitiveComplexity = 0;
  let nestedLevel = 0;
  lines.forEach(line => {
    const indent = line.match(/^\s*/)?.[0].length || 0;
    if (indent > nestedLevel * 2) {
      nestedLevel++;
      cognitiveComplexity += nestedLevel;
    } else if (indent < nestedLevel * 2) {
      nestedLevel = Math.max(0, nestedLevel - 1);
    }
  });

  const maintainabilityIndex = Math.max(0, Math.round(171 - 5.2 * Math.log(linesOfCode) - 0.23 * cyclomaticComplexity - 16.2));

  return {
    cyclomaticComplexity,
    linesOfCode,
    cognitiveComplexity,
    maintainabilityIndex
  };
}

function analyzeEfficiency(code: string, language: string): { score: number; suggestions: string[] } {
  const suggestions: string[] = [];
  let score = 100;

  if (language === 'javascript' || language === 'typescript') {
    if (code.includes('forEach') && code.includes('push')) {
      suggestions.push('Consider using map() instead of forEach() with push');
      score -= 5;
    }

    if (/JSON\.parse\s*\(\s*\w+\s*\)/.test(code)) {
      suggestions.push('Wrap JSON.parse in try-catch for error handling');
      score -= 3;
    }

    if (/\.filter\(\s*\w+\s*\)\.map\(/.test(code)) {
      suggestions.push('Consider using reduce() to combine filter and map');
      score -= 5;
    }
  }

  if (language === 'python') {
    if (code.includes('for') && code.includes('append')) {
      suggestions.push('Consider list comprehension');
      score -= 3;
    }
  }

  const loopNesting = (code.match(/for\s*\([^)]*\)\s*\{/g) || []).length;
  if (loopNesting > 2) {
    suggestions.push('Deep loop nesting detected - consider refactoring');
    score -= 10;
  }

  return { score: Math.max(0, score), suggestions };
}

function estimateTestCoverage(code: string): number {
  const lines = code.split('\n');
  const hasTests = code.includes('describe') || code.includes('test') || code.includes('it(') || code.includes('assert');
  const hasDescribe = code.includes('describe') || code.includes('describe.each');
  const hasIt = code.includes('it(') || code.includes('test(');

  let coverage = 0;

  if (hasTests) coverage += 30;
  if (hasDescribe) coverage += 20;
  if (hasIt) coverage += 30;

  const functionCount = (code.match(/function\s+\w+|const\s+\w+\s*=\s*(async\s*)?\(|=>\s*{/g) || []).length;
  const mockCount = (code.match(/mock\(|jest\.mock/g) || []).length;

  if (functionCount > 0) {
    coverage += Math.min(20, (mockCount / functionCount) * 20);
  }

  return Math.min(100, Math.round(coverage));
}

export function analyzeCode(
  code: string,
  language: string,
  expectedOutput?: string
): CodeAnalysisResult {
  const qualityAnalysis = analyzeCodeQuality(code, language);
  const securityChecks = checkSecurityVulnerabilities(code);
  const complexity = calculateComplexity(code);
  const efficiencyAnalysis = analyzeEfficiency(code, language);
  const testCoverage = estimateTestCoverage(code);

  const securityIssues: CodeIssue[] = securityChecks
    .filter(c => c.detected)
    .map(c => ({
      type: 'security' as const,
      severity: c.severity,
      line: 0,
      message: `${c.vulnerability}: ${c.description}`,
      suggestion: `Fix ${c.vulnerability.toLowerCase()} vulnerability`
    }));

  const allIssues = [...qualityAnalysis.issues, ...securityIssues];

  const criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
  const highIssues = allIssues.filter(i => i.severity === 'high').length;

  let securityScore = 100;
  if (criticalIssues > 0) securityScore -= criticalIssues * 25;
  if (highIssues > 0) securityScore -= highIssues * 15;
  securityScore = Math.max(0, securityScore);

  const correctness = expectedOutput ? 100 : 50;

  const overallOutput = `Code analyzed successfully.
- Lines: ${complexity.linesOfCode}
- Complexity: ${complexity.cyclomaticComplexity}
- Security issues: ${securityIssues.length}`;

  return {
    correctness,
    efficiency: efficiencyAnalysis.score,
    codeQuality: qualityAnalysis.score,
    security: securityScore,
    testCoverage,
    output: overallOutput,
    issues: allIssues,
    suggestions: [
      ...efficiencyAnalysis.suggestions,
      ...securityChecks.filter(c => !c.detected).slice(0, 2).map(c => `Consider checking for ${c.vulnerability}`)
    ]
  };
}

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    go: 'go',
    rs: 'rust',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin'
  };
  return langMap[ext] || 'unknown';
}