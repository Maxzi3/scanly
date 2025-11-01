import path from "path";
import { walkDir } from "@/utils/fileSystem";
import { CodeScanReport } from "@/types/code-scan";

/**
 * Scans a repository folder for potential hardcoded secrets.
 */
export async function scanForSecrets(
  repoPath: string
): Promise<CodeScanReport["hardcodedSecrets"]> {
  const results: CodeScanReport["hardcodedSecrets"] = [];

  const secretPatterns = [
    {
      pattern: /\bapi[_-]?key\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi,
      type: "api_key",
    },
    {
      pattern: /\bsecret[_-]?key\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi,
      type: "secret",
    },
    { pattern: /\bpassword\s*[:=]\s*['"][^'"]{8,}['"]/gi, type: "password" },
    { pattern: /\b(bearer|token)\s+[A-Za-z0-9_\-\.]{20,}/gi, type: "token" },
    { pattern: /sk_live_[A-Za-z0-9]{24,}/g, type: "stripe_key" },
    { pattern: /AIza[0-9A-Za-z_\-]{35}/g, type: "google_api_key" },
    { pattern: /AKIA[0-9A-Z]{16}/g, type: "aws_key" },
  ];

  const excludeDirs = ["node_modules", ".git", "dist", "build", ".next"];

  await walkDir(repoPath, excludeDirs, async (fullPath, _, lines) => {
    for (const { pattern, type } of secretPatterns) {
      lines.forEach((line, idx) => {
        const matches = line.matchAll(pattern);
        for (const match of matches) {
          results.push({
            file: path.relative(repoPath, fullPath),
            line: idx + 1,
            type,
            preview: match[0].slice(0, 50) + "...",
            context: line.trim(),
          });
        }
      });
    }
  });

  // Cap results to avoid memory explosion
  return results.slice(0, 50);
}
