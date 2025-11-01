import { CodeScanReport } from "@/types/code-scan";
import { walkDir } from "@/utils/fileSystem";

/**
 * Performs static analysis to detect insecure code patterns (SAST).
 * ✅ Production-ready with better pattern matching and severity scoring
 */
export function runSAST(repoPath: string): CodeScanReport["sastFindings"] {
  const results: CodeScanReport["sastFindings"] = [];

  // 🔧 Enhanced patterns with severity levels
  const patterns = [
    // SQL Injection - Critical
    {
      regex: /SELECT\s+.*\s+FROM\s+.*[\+`]/gi,
      type: "sql_injection" as const,
      severity: "critical" as const,
      desc: "SQL query uses string concatenation - high SQL injection risk.",
    },
    {
      regex: /\$\{[^}]*(req\.(query|body|params)|request\.|query\.|params\.)/gi,
      type: "sql_injection" as const,
      severity: "critical" as const,
      desc: "User input directly interpolated in SQL query string.",
    },
    {
      regex: /execute\s*\(\s*[`"'].*\$\{/gi,
      type: "sql_injection" as const,
      severity: "critical" as const,
      desc: "Template literal used in SQL execution without parameterization.",
    },
    {
      regex: /query\s*\(\s*.*\+\s*(req\.|request\.|query\.|params\.)/gi,
      type: "sql_injection" as const,
      severity: "high" as const,
      desc: "SQL query concatenated with user input.",
    },

    // XSS - High
    {
      regex: /innerHTML\s*=\s*(req\.|request\.|query\.|params\.|body\.)/gi,
      type: "xss" as const,
      severity: "high" as const,
      desc: "User input directly assigned to innerHTML - XSS vulnerability.",
    },
    {
      regex: /dangerouslySetInnerHTML\s*=\s*\{\{.*req\./gi,
      type: "xss" as const,
      severity: "high" as const,
      desc: "React dangerouslySetInnerHTML with unsanitized user input.",
    },
    {
      regex: /res\.send\s*\(\s*(req\.|request\.|query\.|params\.)/gi,
      type: "xss" as const,
      severity: "high" as const,
      desc: "Unsanitized user input sent directly in HTTP response.",
    },
    {
      regex: /document\.write\s*\(\s*(req\.|request\.|query\.|params\.)/gi,
      type: "xss" as const,
      severity: "high" as const,
      desc: "document.write with user input - reflected XSS risk.",
    },

    // Path Traversal - High
    {
      regex:
        /fs\.(readFile|readFileSync|readdir|readdirSync|createReadStream)\s*\(\s*(req\.|request\.|query\.|params\.)/gi,
      type: "path_traversal" as const,
      severity: "high" as const,
      desc: "User-controlled file path in filesystem operation - path traversal risk.",
    },
    {
      regex: /path\.join\s*\([^)]*req\./gi,
      type: "path_traversal" as const,
      severity: "high" as const,
      desc: "User input used in path.join - potential directory traversal.",
    },

    // Command Injection - Critical
    {
      regex:
        /child_process\.(exec|spawn|execSync|spawnSync)\s*\(\s*[`"'].*\$\{/gi,
      type: "command_injection" as const,
      severity: "critical" as const,
      desc: "User input in shell command via template literal - command injection.",
    },
    {
      regex: /exec\s*\(\s*(req\.|request\.|query\.|params\.)/gi,
      type: "command_injection" as const,
      severity: "critical" as const,
      desc: "Direct user input passed to exec() - severe command injection risk.",
    },

    // XXE - Medium
    {
      regex: /xml2js\.parseString\s*\(/gi,
      type: "xxe" as const,
      severity: "medium" as const,
      desc: "XML parser without explicit external entity prevention - XXE risk.",
    },
    {
      regex: /new\s+DOMParser\(\)\.parseFromString\(/gi,
      type: "xxe" as const,
      severity: "medium" as const,
      desc: "DOM parser used without security configuration.",
    },

    // Insecure Deserialization - High
    {
      regex: /JSON\.parse\s*\(\s*(req\.|request\.|query\.|params\.)/gi,
      type: "insecure_deserialization" as const,
      severity: "medium" as const,
      desc: "Direct JSON.parse of user input - potential prototype pollution.",
    },
    {
      regex: /eval\s*\(/gi,
      type: "code_injection" as const,
      severity: "critical" as const,
      desc: "Use of eval() - arbitrary code execution vulnerability.",
    },
    {
      regex: /new\s+Function\s*\(/gi,
      type: "code_injection" as const,
      severity: "high" as const,
      desc: "Dynamic function creation - code injection risk.",
    },

    // Open Redirect - Medium
    {
      regex: /res\.redirect\s*\(\s*(req\.|request\.|query\.|params\.)/gi,
      type: "open_redirect" as const,
      severity: "medium" as const,
      desc: "Unvalidated redirect with user input - open redirect vulnerability.",
    },

    // SSRF - High
    {
      regex: /fetch\s*\(\s*(req\.|request\.|query\.|params\.)/gi,
      type: "ssrf" as const,
      severity: "high" as const,
      desc: "User-controlled URL in fetch() - SSRF vulnerability.",
    },
    {
      regex:
        /axios\.(get|post|put|delete)\s*\(\s*(req\.|request\.|query\.|params\.)/gi,
      type: "ssrf" as const,
      severity: "high" as const,
      desc: "User input used as HTTP request URL - SSRF risk.",
    },

    // Weak Crypto - Low
    {
      regex: /crypto\.createHash\s*\(\s*['"]md5['"]/gi,
      type: "weak_crypto" as const,
      severity: "low" as const,
      desc: "MD5 hash algorithm used - cryptographically broken.",
    },
    {
      regex: /crypto\.createHash\s*\(\s*['"]sha1['"]/gi,
      type: "weak_crypto" as const,
      severity: "low" as const,
      desc: "SHA1 hash algorithm used - deprecated and weak.",
    },

    // Hardcoded Credentials (backup check)
    {
      regex: /password\s*=\s*['"][^'"]{8,}['"]/gi,
      type: "hardcoded_secret" as const,
      severity: "high" as const,
      desc: "Possible hardcoded password in source code.",
    },
  ];

  const excludeDirs = [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    ".cache",
    "vendor",
    "__pycache__",
    ".pytest_cache",
  ];

  // Track findings to avoid duplicates
  const seenFindings = new Set<string>();

  try {
    walkDir(repoPath, excludeDirs, (fullPath, _, lines) => {
      // Skip non-code files
      const ext = fullPath.split(".").pop()?.toLowerCase();
      if (
        !ext ||
        !["js", "ts", "jsx", "tsx", "py", "java", "php", "go", "rb"].includes(
          ext
        )
      ) {
        return;
      }

      for (const { regex, type, severity, desc } of patterns) {
        lines.forEach((line, idx) => {
          // Reset regex index for each line
          regex.lastIndex = 0;

          if (regex.test(line)) {
            const relativePath = fullPath
              .replace(repoPath, "")
              .replace(/^\//, "");
            const lineNum = idx + 1;

            // Create unique key to avoid duplicates
            const key = `${relativePath}:${lineNum}:${type}`;
            if (seenFindings.has(key)) return;
            seenFindings.add(key);

            // Skip false positives in comments
            const trimmedLine = line.trim();
            if (
              trimmedLine.startsWith("//") ||
              trimmedLine.startsWith("*") ||
              trimmedLine.startsWith("#")
            ) {
              return;
            }

            results.push({
              file: relativePath,
              line: lineNum,
              type,
              severity,
              code: line.trim().slice(0, 100), // Longer preview
              description: desc,
            });
          }
        });
      }
    });

    // Sort by severity: critical > high > medium > low
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    results.sort((a, b) => {
      const severityDiff =
        severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.file.localeCompare(b.file);
    });

    // Group and limit results
    const grouped = {
      critical: results.filter((r) => r.severity === "critical").slice(0, 20),
      high: results.filter((r) => r.severity === "high").slice(0, 30),
      medium: results.filter((r) => r.severity === "medium").slice(0, 40),
      low: results.filter((r) => r.severity === "low").slice(0, 10),
    };

    const finalResults = [
      ...grouped.critical,
      ...grouped.high,
      ...grouped.medium,
      ...grouped.low,
    ];

    console.log(
      `🛡️ SAST scan complete: ${finalResults.length} findings (${grouped.critical.length} critical, ${grouped.high.length} high, ${grouped.medium.length} medium, ${grouped.low.length} low)`
    );

    return finalResults;
  } catch (err) {
    console.error("⚠️ SAST scan error:", (err as Error).message);
    return [];
  }
}
