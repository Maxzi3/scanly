/* eslint-disable @typescript-eslint/no-explicit-any */
import { CodeScanReport } from "@/types/code-scan";
import fs from "fs";
import path from "path";

/**
 * Check for outdated packages using npm registry
 * Simple, reliable, no authentication needed
 */
export async function checkOutdatedPackages(
  repoPath: string
): Promise<CodeScanReport["outdatedPackages"]> {
  const packageJsonPath = path.join(repoPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    console.warn("⚠️ package.json not found");
    return [];
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const dependencies = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };

    const packages = Object.entries(dependencies);
    if (packages.length === 0) {
      console.warn("⚠️ No dependencies found");
      return [];
    }

    console.log(`📦 Checking ${packages.length} packages for updates...`);

    const outdated: CodeScanReport["outdatedPackages"] = [];
    const BATCH_SIZE = 10;

    // Process in batches
    for (let i = 0; i < packages.length; i += BATCH_SIZE) {
      const batch = packages.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async ([name, versionRange]) => {
          try {
            const currentVersion = (versionRange as string).replace(
              /^[~^>=<]+/,
              ""
            );

            // Fetch latest version from npm registry
            const res = await fetch(
              `https://registry.npmjs.org/${encodeURIComponent(name)}/latest`,
              {
                headers: { "User-Agent": "SecurityScanner/1.0.0" },
              }
            );

            if (!res.ok) return null;

            const data = await res.json();
            const latestVersion = data.version;

            if (!latestVersion || latestVersion === currentVersion) return null;

            // Compare versions to determine severity
            const currentParts = currentVersion.split(".").map(Number);
            const latestParts = latestVersion.split(".").map(Number);

            const majorDiff = (latestParts[0] || 0) - (currentParts[0] || 0);
            const minorDiff = (latestParts[1] || 0) - (currentParts[1] || 0);

            // Determine severity based on how far behind
            let severity: "critical" | "high" | "medium" | "low" = "low";
            if (majorDiff >= 3) severity = "high";
            else if (majorDiff >= 2) severity = "medium";
            else if (majorDiff === 1 || minorDiff >= 5) severity = "low";

            // Check if package is deprecated
            if (data.deprecated) {
              severity = "high";
            }

            return {
              name,
              currentVersion,
              latestVersion,
              severity,
              description: data.deprecated
                ? `Deprecated: ${data.deprecated}`
                : `${majorDiff} major, ${minorDiff} minor versions behind`,
            };
          } catch {
            return null;
          }
        })
      );

      // Collect results
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          outdated.push(result.value);
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < packages.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Found ${outdated.length} outdated packages`);
    return outdated;
  } catch (err) {
    console.error("❌ Outdated check failed:", (err as Error).message);
    return [];
  }
}

/**
 * Scan for packages with risky licenses using npm registry
 * Simple, reliable, no authentication needed
 */
export async function scanLicenses(
  repoPath: string
): Promise<CodeScanReport["licenseIssues"]> {
  const packageJsonPath = path.join(repoPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    console.warn("⚠️ package.json not found");
    return [];
  }

  const riskyLicenses = [
    {
      patterns: ["GPL", "GPLv2", "GPLv3"],
      risk: "high" as const,
      reason: "Copyleft license - requires source code disclosure",
    },
    {
      patterns: ["AGPL", "AGPLv3"],
      risk: "high" as const,
      reason: "Network copyleft - SaaS restriction",
    },
    {
      patterns: ["SSPL"],
      risk: "high" as const,
      reason: "Service restriction - not OSI approved",
    },
    {
      patterns: ["CC-BY-NC", "CC BY-NC"],
      risk: "medium" as const,
      reason: "Non-commercial license",
    },
    {
      patterns: ["LGPL", "LGPLv2", "LGPLv3"],
      risk: "medium" as const,
      reason: "Partial copyleft - linking restrictions",
    },
  ];

  try {
    const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const deps = {
      ...(pkgJson.dependencies || {}),
      ...(pkgJson.devDependencies || {}),
    };

    const packages = Object.keys(deps);
    if (packages.length === 0) {
      console.warn("⚠️ No dependencies found");
      return [];
    }

    console.log(
      `📜 Checking ${packages.length} packages for license issues...`
    );

    const issues: CodeScanReport["licenseIssues"] = [];
    const BATCH_SIZE = 20;

    // Process in batches
    for (let i = 0; i < packages.length; i += BATCH_SIZE) {
      const batch = packages.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (pkgName) => {
          try {
            const res = await fetch(
              `https://registry.npmjs.org/${encodeURIComponent(
                pkgName
              )}/latest`,
              {
                headers: { "User-Agent": "SecurityScanner/1.0.0" },
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
              break; // Only report once per package
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
      `✅ License scan: ${packages.length} packages, ${issues.length} risky licenses`
    );
    return issues;
  } catch (err) {
    console.error("❌ License scan failed:", (err as Error).message);
    return [];
  }
}
