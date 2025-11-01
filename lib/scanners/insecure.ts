import { CodeScanReport } from "@/types/code-scan";
import { walkDir } from "@/utils/fileSystem";

export function scanInsecureFunctions(
  repoPath: string
): CodeScanReport["insecureFunctions"] {
  const results: CodeScanReport["insecureFunctions"] = [];

  const insecurePatterns = [
    {
      pattern: /\beval\s*\(/,
      func: "eval()",
      risk: "Code Injection",
      suggestion: "Use JSON.parse or safer alternatives instead of eval().",
    },
    {
      pattern: /\bFunction\s*\(/,
      func: "Function()",
      risk: "Code Injection",
      suggestion: "Avoid dynamic code execution — use safe parser functions.",
    },
    {
      pattern: /\bchild_process\.exec\s*\(/,
      func: "exec()",
      risk: "Command Injection",
      suggestion:
        "Use execFile() or spawn() with validated arguments instead of exec().",
    },
    {
      pattern: /\binnerHTML\s*=/,
      func: "innerHTML",
      risk: "XSS Vulnerability",
      suggestion: "Use textContent or sanitize user input before rendering.",
    },
    {
      pattern: /\bdangerouslySetInnerHTML\b/,
      func: "dangerouslySetInnerHTML",
      risk: "XSS Vulnerability",
      suggestion:
        "Sanitize or escape HTML before using dangerouslySetInnerHTML.",
    },
    {
      pattern: /\bprocess\.env\.[A-Z0-9_]+/i,
      func: "process.env",
      risk: "Environment Variable Exposure",
      suggestion: "Avoid exposing env variables to client-side code.",
    },
  ];

  const excludeDirs = ["node_modules", ".git", "dist", "build", ".next"];

  walkDir(repoPath, excludeDirs, (fullPath, content) => {
    insecurePatterns.forEach(({ pattern, func, risk, suggestion }) => {
      // Instead of splitting into lines first, scan once and collect matches
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (pattern.test(line)) {
          results.push({
            file: fullPath.replace(repoPath, ""),
            line: idx + 1,
            function: func,
            risk,
            suggestion,
          });
        }
      });
    });
  });

  // Limit result count to avoid memory bloat in huge repos
  return results.slice(0, 50);
}
