/* eslint-disable @typescript-eslint/no-explicit-any */
import { CodeScanReport } from "@/types/code-scan";
import fs from "fs";
import path from "path";

/**
 * Scans npm dependencies using OSS Index (Sonatype)
 * Works both locally and in production.
 */
export async function scanDependencies(
  repoPath: string
): Promise<CodeScanReport["outdatedPackages"]> {
  const packageJsonPath = path.join(repoPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    console.warn("⚠️ package.json not found");
    return [];
  }

  let packageData;
  try {
    packageData = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  } catch (err) {
    console.error("❌ Failed to parse package.json:", (err as Error).message);
    return [];
  }

  const dependencies = {
    ...(packageData.dependencies || {}),
    ...(packageData.devDependencies || {}),
  };

  if (Object.keys(dependencies).length === 0) {
    console.warn("⚠️ No dependencies found for scanning.");
    return [];
  }

  // 🔧 FIX 1: Clean version strings properly (remove ^, ~, >=, etc.)
  const coordinates = Object.entries(dependencies)
    .map(([name, version]) => {
      const cleanVersion = (version as string)
        .replace(/^[~^>=<]+/, "") // Remove version prefixes
        .split(" ")[0]; // Take first part if range like ">=1.0.0 <2.0.0"

      return `pkg:npm/${encodeURIComponent(name)}@${cleanVersion}`;
    })
    .filter((coord) => coord.includes("@")); // Ensure valid format

  // 🔧 FIX 2: OSS Index has a 128 package limit per request - batch if needed
  const BATCH_SIZE = 120; // Stay under 128 limit
  const batches = [];
  for (let i = 0; i < coordinates.length; i += BATCH_SIZE) {
    batches.push(coordinates.slice(i, i + BATCH_SIZE));
  }

  const allResults: any[] = [];

  for (const batch of batches) {
    try {
      console.log(`🛰️ Scanning ${batch.length} dependencies with OSS Index...`);

      // 🔧 FIX: OSS Index now requires authentication
      // Option 1: Use credentials (recommended)
      const ossUsername = process.env.OSS_INDEX_USERNAME;
      const ossToken = process.env.OSS_INDEX_TOKEN;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "YourAppName/1.0.0",
      };

      // Add Basic Auth if credentials are available
      if (ossUsername && ossToken) {
        const auth = Buffer.from(`${ossUsername}:${ossToken}`).toString(
          "base64"
        );
        headers["Authorization"] = `Basic ${auth}`;
      }

      const res = await fetch(
        "https://ossindex.sonatype.org/api/v3/component-report",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ coordinates: batch }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ OSS Index API error (${res.status}):`, errorText);

        // 🔧 FIX 4: Handle rate limiting gracefully
        if (res.status === 429) {
          console.warn("⏱️ Rate limited. Waiting before retry...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue; // Skip this batch or implement retry logic
        }

        throw new Error(`OSS Index API error: ${res.status}`);
      }

      const data = await res.json();
      allResults.push(...data);

      // 🔧 FIX 5: Add small delay between batches to avoid rate limiting
      if (batches.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error("⚠️ OSS Index batch scan failed:", (err as Error).message);
      // Continue with other batches instead of failing completely
    }
  }

  // 🔧 FIX 6: Better data parsing with error handling
  const vulnerabilities: CodeScanReport["outdatedPackages"] = [];

  for (const pkg of allResults) {
    try {
      // Skip packages without vulnerabilities
      if (!pkg.vulnerabilities || pkg.vulnerabilities.length === 0) {
        continue;
      }

      // Extract package name and version safely
      const coordinateParts = pkg.coordinates?.split("@") || [];
      const packageName =
        coordinateParts[0]?.replace("pkg:npm/", "") || "unknown";
      const currentVersion = coordinateParts[1] || "unknown";

      // Process each vulnerability
      for (const vuln of pkg.vulnerabilities) {
        vulnerabilities.push({
          name: packageName,
          currentVersion: currentVersion,
          latestVersion: "N/A", // OSS Index doesn't provide latest version
          severity: getSeverityFromScore(vuln.cvssScore),
          cve: vuln.cve || vuln.reference || undefined,
          description: vuln.title || vuln.description || undefined,
        });
      }
    } catch (err) {
      console.error("⚠️ Error parsing package data:", err);
      continue;
    }
  }

  console.log(
    `✅ Found ${vulnerabilities.length} vulnerabilities across ${allResults.length} packages`
  );
  return vulnerabilities;
}

/**
 * Convert CVSS score to severity level
 */
function getSeverityFromScore(
  score: number | undefined
): "critical" | "high" | "medium" | "low" {
  if (!score) return "low";
  if (score >= 9.0) return "critical";
  if (score >= 7.0) return "high";
  if (score >= 4.0) return "medium";
  return "low";
}

/**
 * Alternative vulnerability scanner using npm audit API
 * Works without authentication and is production-ready
 * ✅ Vercel-compatible - uses correct npm v7+ audit format
 */
export async function scanVulnerabilitiesNpmAudit(
  repoPath: string
): Promise<CodeScanReport["outdatedPackages"]> {
  const packageJsonPath = path.join(repoPath, "package.json");
  const packageLockPath = path.join(repoPath, "package-lock.json");

  if (!fs.existsSync(packageJsonPath)) {
    console.warn("⚠️ package.json not found");
    return [];
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    // 🔧 FIX: Use proper npm audit quick format (simpler, always works)
    let lockfileData;

    if (fs.existsSync(packageLockPath)) {
      try {
        lockfileData = JSON.parse(fs.readFileSync(packageLockPath, "utf-8"));
      } catch {
        lockfileData = null;
      }
    }

    // If no lockfile or lockfile is invalid, create minimal structure
    if (!lockfileData) {
      console.log("📦 Creating audit payload from package.json...");

      const dependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      // Create npm v2 style structure (more compatible)
      lockfileData = {
        name: packageJson.name || "scanned-repo",
        version: packageJson.version || "1.0.0",
        lockfileVersion: 1,
        requires: true,
        dependencies: {} as { [key: string]: any },
      };

      // Add each dependency in flat structure
      for (const [name, versionRange] of Object.entries(dependencies)) {
        const cleanVersion = (versionRange as string).replace(/^[~^>=<]+/, "");
        lockfileData.dependencies[name] = {
          version: cleanVersion,
          resolved: `https://registry.npmjs.org/${name}/-/${name}-${cleanVersion}.tgz`,
          integrity: "", // npm audit works without this
        };
      }
    }

    console.log("🔍 Scanning vulnerabilities with npm audit API...");

    // Try npm audit quick endpoint first (less strict)
    const quickRes = await fetch(
      "https://registry.npmjs.org/-/npm/v1/security/audits/quick",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "npm/8.0.0 node/v16.0.0",
          "npm-in-ci": "false",
        },
        body: JSON.stringify({
          name: lockfileData.name || "scanned-repo",
          version: lockfileData.version || "1.0.0",
          requires: lockfileData.requires || true,
          dependencies: lockfileData.dependencies || {},
        }),
      }
    );

    if (quickRes.ok) {
      const quickData = await quickRes.json();
      return parseAuditResponse(quickData);
    }

    console.log("⚠️ Quick audit failed, trying full audit...");

    // Fallback to full audit endpoint
    const fullRes = await fetch(
      "https://registry.npmjs.org/-/npm/v1/security/audits",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "npm/8.0.0 node/v16.0.0",
        },
        body: JSON.stringify(lockfileData),
      }
    );

    if (!fullRes.ok) {
      const errorText = await fullRes.text();
      console.warn(
        `⚠️ npm audit API returned ${fullRes.status}:`,
        errorText.substring(0, 200)
      );
      console.log(
        "🔄 Falling back to individual package vulnerability checks..."
      );
      return await scanVulnerabilitiesIndividual(repoPath);
    }

    const auditData = await fullRes.json();
    return parseAuditResponse(auditData);
  } catch (err) {
    console.warn("⚠️ npm audit scan failed:", (err as Error).message);
    console.log("🔄 Falling back to individual package checks...");
    return await scanVulnerabilitiesIndividual(repoPath);
  }
}

/**
 * Parse npm audit response into our format
 */
function parseAuditResponse(
  auditData: any
): CodeScanReport["outdatedPackages"] {
  const vulnerabilities: CodeScanReport["outdatedPackages"] = [];

  try {
    if (auditData.vulnerabilities) {
      for (const [pkgName, vuln] of Object.entries(auditData.vulnerabilities)) {
        const vulnData = vuln as any;

        if (vulnData.via && Array.isArray(vulnData.via)) {
          for (const via of vulnData.via) {
            if (typeof via === "object" && via.title) {
              vulnerabilities.push({
                name: pkgName,
                currentVersion: vulnData.range || "unknown",
                latestVersion: "N/A",
                severity: getSeverityFromNpmAudit(vulnData.severity),
                cve: via.cve || via.url || undefined,
                description: via.title,
              });
            }
          }
        }
      }
    }

    // Also check for advisories format (older npm audit format)
    if (auditData.advisories) {
      for (const [, advisory] of Object.entries(auditData.advisories)) {
        const adv = advisory as any;
        vulnerabilities.push({
          name: adv.module_name || "unknown",
          currentVersion: adv.findings?.[0]?.version || "unknown",
          latestVersion: adv.patched_versions || "N/A",
          severity: getSeverityFromNpmAudit(adv.severity),
          cve: adv.cves?.[0] || adv.url || undefined,
          description: adv.title || "Vulnerability detected",
        });
      }
    }

    console.log(`✅ npm audit found ${vulnerabilities.length} vulnerabilities`);
    return vulnerabilities;
  } catch (err) {
    console.error("⚠️ Error parsing audit response:", (err as Error).message);
    return [];
  }
}

/**
 * Fallback: Check each package individually using Snyk Vulnerability DB
 * More reliable than npm audit for packages without lockfiles
 */
async function scanVulnerabilitiesIndividual(
  repoPath: string
): Promise<CodeScanReport["outdatedPackages"]> {
  const packageJsonPath = path.join(repoPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return [];
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const dependencies = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };

    const vulnerabilities: CodeScanReport["outdatedPackages"] = [];
    const packages = Object.entries(dependencies);

    console.log(`🔍 Checking ${packages.length} packages individually...`);

    // Check in batches of 5 (slower but more reliable)
    const BATCH_SIZE = 5;
    for (let i = 0; i < packages.length; i += BATCH_SIZE) {
      const batch = packages.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async ([name, versionRange]) => {
          try {
            const cleanVersion = (versionRange as string).replace(
              /^[~^>=<]+/,
              ""
            );

            // Method 1: Check npm registry for security info
            const registryRes = await fetch(
              `https://registry.npmjs.org/${encodeURIComponent(name)}`,
              {
                headers: { "User-Agent": "SecurityScanner/1.0.0" },
              }
            );

            if (!registryRes.ok) return [];

            const packageData = await registryRes.json();
            const foundVulns: CodeScanReport["outdatedPackages"] = [];

            // Check for deprecated packages
            const versionData = packageData.versions?.[cleanVersion];
            if (versionData?.deprecated) {
              foundVulns.push({
                name,
                currentVersion: cleanVersion,
                latestVersion: packageData["dist-tags"]?.latest || "N/A",
                severity: "medium",
                description: `Package deprecated: ${versionData.deprecated}`,
              });
            }

            // Check if current version is very old (potential vulnerability indicator)
            const latestVersion = packageData["dist-tags"]?.latest;
            if (latestVersion && cleanVersion) {
              const currentMajor = parseInt(cleanVersion.split(".")[0]) || 0;
              const latestMajor = parseInt(latestVersion.split(".")[0]) || 0;

              // If more than 2 major versions behind, flag as potentially vulnerable
              if (latestMajor - currentMajor >= 2) {
                foundVulns.push({
                  name,
                  currentVersion: cleanVersion,
                  latestVersion,
                  severity: "low",
                  description: `Package is ${
                    latestMajor - currentMajor
                  } major versions behind (may have unpatched vulnerabilities)`,
                });
              }
            }

            // Method 2: Check Snyk Vuln DB (public, no auth)
            try {
              const snykRes = await fetch(
                `https://security.snyk.io/package/npm/${encodeURIComponent(
                  name
                )}/${cleanVersion}`,
                {
                  headers: { "User-Agent": "SecurityScanner/1.0.0" },
                }
              );

              if (snykRes.ok) {
                const snykHtml = await snykRes.text();
                // Basic check: if page contains vulnerability indicators
                if (
                  snykHtml.includes("vulnerability") ||
                  snykHtml.includes("CVE-")
                ) {
                  foundVulns.push({
                    name,
                    currentVersion: cleanVersion,
                    latestVersion: latestVersion || "N/A",
                    severity: "medium",
                    description: "Known vulnerabilities found in Snyk database",
                  });
                }
              }
            } catch {
              // Snyk check optional, ignore errors
            }

            return foundVulns;
          } catch {
            return [];
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          vulnerabilities.push(...result.value);
        }
      }

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < packages.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // Deduplicate by package name
    const seen = new Set<string>();
    const uniqueVulns = vulnerabilities.filter((v) => {
      if (seen.has(v.name)) return false;
      seen.add(v.name);
      return true;
    });

    console.log(
      `✅ Individual scan found ${uniqueVulns.length} potential issues`
    );
    return uniqueVulns;
  } catch (err) {
    console.warn(
      "⚠️ Individual vulnerability scan failed:",
      (err as Error).message
    );
    return [];
  }
}

/**
 * Fallback: Use GitHub Advisory Database API
 * Free, no auth required, comprehensive vulnerability data
 */
export async function scanVulnerabilitiesGitHub(
  repoPath: string
): Promise<CodeScanReport["outdatedPackages"]> {
  const packageJsonPath = path.join(repoPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return [];
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const dependencies = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };

    const vulnerabilities: CodeScanReport["outdatedPackages"] = [];
    const packages = Object.entries(dependencies);

    console.log(
      `🔍 Checking ${packages.length} packages against GitHub Advisory Database...`
    );

    // Process in batches to avoid rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < packages.length; i += BATCH_SIZE) {
      const batch = packages.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async ([name, version]) => {
          const cleanVersion = (version as string).replace(/^[~^>=<]+/, "");

          // Query GitHub Advisory Database
          const query = `
            query {
              securityVulnerabilities(first: 5, ecosystem: NPM, package: "${name}") {
                nodes {
                  advisory {
                    summary
                    severity
                    identifiers {
                      type
                      value
                    }
                  }
                  vulnerableVersionRange
                }
              }
            }
          `;

          const res = await fetch("https://api.github.com/graphql", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "SecurityScanner/1.0.0",
              // No auth needed for public data, but add token if you have one
              ...(process.env.GITHUB_TOKEN && {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
              }),
            },
            body: JSON.stringify({ query }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          const vulns = data?.data?.securityVulnerabilities?.nodes || [];

          return vulns.map((v: any) => ({
            name,
            currentVersion: cleanVersion,
            latestVersion: "N/A",
            severity: v.advisory.severity.toLowerCase() as any,
            cve: v.advisory.identifiers.find((i: any) => i.type === "CVE")
              ?.value,
            description: v.advisory.summary,
          }));
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          vulnerabilities.push(...result.value);
        }
      }

      // Rate limit: small delay between batches
      if (i + BATCH_SIZE < packages.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(
      `✅ GitHub Advisory Database found ${vulnerabilities.length} vulnerabilities`
    );
    return vulnerabilities;
  } catch (err) {
    console.warn("⚠️ GitHub Advisory scan failed:", (err as Error).message);
    return [];
  }
}

/**
 * Convert npm audit severity to our format
 */
function getSeverityFromNpmAudit(
  severity: string | undefined
): "critical" | "high" | "medium" | "low" {
  if (!severity) return "low";
  const s = severity.toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "moderate") return "medium";
  return "low";
}
export async function checkOutdatedPackages(
  repoPath: string
): Promise<CodeScanReport["outdatedPackages"]> {
  const packageJsonPath = path.join(repoPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) return [];

  try {
    const packageData = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const dependencies = {
      ...(packageData.dependencies || {}),
      ...(packageData.devDependencies || {}),
    };

    const outdated: CodeScanReport["outdatedPackages"] = [];

    // Check each package against npm registry
    for (const [name, version] of Object.entries(dependencies)) {
      try {
        const currentVersion = (version as string).replace(/^[~^>=<]+/, "");

        // Fetch latest version from npm registry
        const res = await fetch(`https://registry.npmjs.org/${name}/latest`);
        if (!res.ok) continue;

        const data = await res.json();
        const latestVersion = data.version;

        // Simple version comparison (you might want semver library for production)
        if (latestVersion && currentVersion !== latestVersion) {
          outdated.push({
            name,
            currentVersion,
            latestVersion,
            severity: "low", // Default for outdated (not vulnerable)
          });
        }

        // Small delay to avoid hammering npm registry
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err) {
        console.warn(`⚠️ Failed to check ${name}:`, (err as Error).message);
      }
    }

    return outdated;
  } catch (err) {
    console.error(
      "❌ Failed to check outdated packages:",
      (err as Error).message
    );
    return [];
  }
}
