import { CodeScanReport } from "@/types/code-scan";
import fs from "fs";
import path from "path";


export function scanDocker(repoPath: string): CodeScanReport["dockerIssues"] {
  const dockerfilePath = path.join(repoPath, "Dockerfile");
  if (!fs.existsSync(dockerfilePath)) return [];

  const results: CodeScanReport["dockerIssues"] = [];
  try {
    const content = fs.readFileSync(dockerfilePath, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      if (/USER root/i.test(line)) {
        results.push({
          file: "Dockerfile",
          line: idx + 1,
          issue: "Running as root user",
          severity: "high",
        });
      }
      if (/EXPOSE 22/i.test(line)) {
        results.push({
          file: "Dockerfile",
          line: idx + 1,
          issue: "SSH port exposed",
          severity: "medium",
        });
      }
      if (
        /apt-get.*--no-install-recommends/i.test(line) === false &&
        /apt-get install/i.test(line)
      ) {
        results.push({
          file: "Dockerfile",
          line: idx + 1,
          issue: "Missing --no-install-recommends flag",
          severity: "low",
        });
      }
    });
  } catch {
    // No Dockerfile or unreadable
  }

  return results;
}
