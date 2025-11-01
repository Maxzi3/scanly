import { CodeScanReport } from "@/types/code-scan";
import { walkDir } from "@/utils/fileSystem";

/**
 * Performs basic static analysis to detect insecure code patterns (SAST).
 */
export function runSAST(repoPath: string): CodeScanReport["sastFindings"] {
  const results: CodeScanReport["sastFindings"] = [];

  // 🧩 Define known risky patterns
  const patterns = [
    {
      regex: /SELECT\s+.*\s+FROM\s+.*\+\s*/gi,
      type: "sql_injection" as const,
      desc: "Potential SQL injection via string concatenation.",
    },
    {
      regex: /\$\{[^}]*req\.(query|body|params)/gi,
      type: "sql_injection" as const,
      desc: "User-controlled input directly used in SQL query string.",
    },
    {
      regex: /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      type: "xss" as const,
      desc: "Hardcoded <script> tag — potential XSS vector.",
    },
    {
      regex: /res\.send\(.*req\.(query|body|params)/gi,
      type: "xss" as const,
      desc: "Unsanitized user input directly sent in response.",
    },
    {
      regex: /fs\.read(File|Sync)\(.*req\.(query|params|body)/gi,
      type: "path_traversal" as const,
      desc: "User input used in file path — possible path traversal.",
    },
    {
      regex: /child_process\.(exec|spawn)\(.*req\.(query|body|params)/gi,
      type: "command_injection" as const,
      desc: "User input passed to shell command — command injection risk.",
    },
    {
      regex: /xml2js\.parseString\(/gi,
      type: "xxe" as const,
      desc: "Unsecured XML parser usage — potential XXE vulnerability.",
    },
  ];

  const excludeDirs = ["node_modules", ".git", "dist", "build", ".next"];

  walkDir(repoPath, excludeDirs, (fullPath, _, lines) => {
    for (const { regex, type, desc } of patterns) {
      lines.forEach((line, idx) => {
        if (regex.test(line)) {
          results.push({
            file: fullPath.replace(repoPath, ""),
            line: idx + 1,
            type,
            code: line.trim().slice(0, 80), // longer preview
            description: desc,
          });
        }
      });
    }
  });

  // Limit results to avoid overload
  return results.slice(0, 50);
}
