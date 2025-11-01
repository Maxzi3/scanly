/* eslint-disable @typescript-eslint/no-explicit-any */
import { CodeScanReport, OutdatedPackage } from "@/types/code-scan";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export function scanDependencies(
  repoPath: string
): CodeScanReport["outdatedPackages"] {
  const packageJsonPath = path.join(repoPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) return [];

  try {
    execSync("npm -v", { stdio: "ignore" });
  } catch {
    console.warn("⚠️ npm is not installed or not available in PATH");
    return [];
  }

  // 🧠 Install dependencies before auditing
  try {
    console.log("📦 Installing dependencies before audit...");
    execSync("npm install --ignore-scripts --legacy-peer-deps", {
      cwd: repoPath,
      stdio: "pipe",
      timeout: 60000,
    });
  } catch (installErr) {
    console.warn(
      `⚠️ npm install failed in ${repoPath}:`,
      (installErr as Error).message
    );
  }

  try {
    let output = "";

    try {
      // 🧩 Run npm audit, but don't crash if exit code ≠ 0
      output = execSync("npm audit --json", {
        cwd: repoPath,
        stdio: "pipe",
        timeout: 20000,
      }).toString();
    } catch (auditErr: any) {
      // ✅ still try to parse the output if npm audit threw an error
      output = auditErr.stdout?.toString() || "";
      if (!output.trim()) {
        console.warn(`⚠️ npm audit failed for ${repoPath}:`, auditErr.message);
        return [];
      }
    }

    const auditData = JSON.parse(output);
    const vulnerabilities: Record<string, any> =
      auditData.vulnerabilities || auditData.advisories || {};

    return Object.entries(vulnerabilities).map(
      ([name, data]): OutdatedPackage => ({
        name,
        currentVersion:
          typeof data.range === "string"
            ? data.range
            : data.installedVersion || "unknown",
        latestVersion:
          data.fixAvailable && typeof data.fixAvailable.version === "string"
            ? data.fixAvailable.version
            : "N/A",
        severity: (data.severity || "low") as
          | "critical"
          | "high"
          | "medium"
          | "low",
        cve:
          Array.isArray(data.via) && data.via.length > 0
            ? data.via[0]?.cve || undefined
            : undefined,
      })
    );
  } catch (err) {
    console.warn(`⚠️ Dependency scan failed:`, (err as Error).message);
    return [];
  }
}
