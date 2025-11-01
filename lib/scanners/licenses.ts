import { CodeScanReport } from "@/types/code-scan";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

/**
 * Scans a repository for packages with risky or restrictive licenses.
 * Uses `npm ls --json` or fallback to package.json.
 */
export function scanLicenses(
  repoPath: string
): CodeScanReport["licenseIssues"] {
  const packageJsonPath = path.join(repoPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) return [];

  const riskyLicenses = [
    {
      name: "GPL",
      risk: "high" as const,
      reason: "Requires disclosing derivative source code (copyleft).",
    },
    {
      name: "AGPL",
      risk: "high" as const,
      reason: "Forces network applications to share source (SaaS restriction).",
    },
    {
      name: "SSPL",
      risk: "high" as const,
      reason: "Restricts hosting as a service — not open-source friendly.",
    },
    {
      name: "CC-BY-NC",
      risk: "medium" as const,
      reason: "Non-commercial license — not suitable for commercial projects.",
    },
    {
      name: "LGPL",
      risk: "medium" as const,
      reason: "Partial copyleft — may impose source linking obligations.",
    },
  ];

  try {
    // Try to get license info from npm
    const npmData = execSync("npm ls --json --long", {
      cwd: repoPath,
      stdio: "pipe",
      timeout: 20000,
    }).toString();

    const parsed = JSON.parse(npmData);
    const licenses: Record<string, string> = {};

    // Extract license from npm data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function collectLicenses(node: any) {
      if (node?.name && node?.license) {
        licenses[node.name] =
          typeof node.license === "string"
            ? node.license
            : node.license.type || "unknown";
      }
      if (node?.dependencies) {
        Object.values(node.dependencies).forEach(collectLicenses);
      }
    }
    collectLicenses(parsed);

    // Detect risky licenses
    const issues: CodeScanReport["licenseIssues"] = [];
    for (const [pkg, license] of Object.entries(licenses)) {
      for (const { name, risk, reason } of riskyLicenses) {
        if (license.toUpperCase().includes(name)) {
          issues.push({ package: pkg, license, risk, reason });
        }
      }
    }

    return issues;
  } catch (err) {
    console.warn("⚠️ License scan failed:", (err as Error).message);

    // Fallback: very basic license check via package.json if npm fails
    try {
      const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const deps = {
        ...pkgJson.dependencies,
        ...pkgJson.devDependencies,
      };

      const issues: CodeScanReport["licenseIssues"] = [];

      for (const pkg of Object.keys(deps)) {
        for (const { name, risk, reason } of riskyLicenses) {
          // Lightweight static license guess
          if (pkg.toUpperCase().includes(name)) {
            issues.push({ package: pkg, license: name, risk, reason });
          }
        }
      }

      return issues;
    } catch {
      return [];
    }
  }
}
