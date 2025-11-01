import { CodeScanReport } from "@/types/code-scan";
import fs from "fs";
import path from "path";


/**
 * Scans repository for packages with risky or restrictive licenses.
 * Uses `npm ls` locally, and a safe fallback in production.
 */
export async function scanLicenses(
  repoPath: string
): Promise<CodeScanReport["licenseIssues"]> {
  const packageJsonPath = path.join(repoPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) return [];

  const riskyLicenses = [
    {
      patterns: ["GPL", "GPLv2", "GPLv3"],
      risk: "high" as const,
      reason: "Copyleft license",
    },
    {
      patterns: ["AGPL", "AGPLv3"],
      risk: "high" as const,
      reason: "SaaS restriction",
    },
    {
      patterns: ["SSPL"],
      risk: "high" as const,
      reason: "Service restriction",
    },
    {
      patterns: ["CC-BY-NC"],
      risk: "medium" as const,
      reason: "Non-commercial",
    },
    { patterns: ["LGPL"], risk: "medium" as const, reason: "Partial copyleft" },
  ];

  try {
    const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const deps = {
      ...(pkgJson.dependencies || {}),
      ...(pkgJson.devDependencies || {}),
    };

    const packages = Object.keys(deps);
    const BATCH_SIZE = 20; // Check 20 packages at once
    const issues: CodeScanReport["licenseIssues"] = [];

    // Process in batches to avoid overwhelming npm registry
    for (let i = 0; i < packages.length; i += BATCH_SIZE) {
      const batch = packages.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (pkgName) => {
          try {
            const res = await fetch(
              `https://registry.npmjs.org/${pkgName}/latest`,
              {
                headers: { "User-Agent": "SecurityScanner/1.0" },
              }
            );

            if (!res.ok) return null;
            const data = await res.json();
            return { name: pkgName, license: data.license || "unknown" };
          } catch {
            return null;
          }
        })
      );

      // Check results for risky licenses
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          const { name, license } = result.value;
          const licenseUpper = license.toUpperCase();

          for (const { patterns, risk, reason } of riskyLicenses) {
            if (patterns.some((p) => licenseUpper.includes(p.toUpperCase()))) {
              issues.push({
                package: `${name}@${deps[name]}`,
                license,
                risk,
                reason,
              });
              break;
            }
          }
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < packages.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    console.log(
      `📜 Batch license scan: ${packages.length} packages, ${issues.length} risky licenses`
    );
    return issues;
  } catch (err) {
    console.warn("⚠️ Batch license scan failed:", (err as Error).message);
    return [];
  }
}