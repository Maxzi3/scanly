import { CodeScanReport } from "@/types/code-scan";

/**
 * Calculates a weighted security score (0–100) from a scan report.
 */
export function calculateScore(
  report: Omit<CodeScanReport, "summary">
): number {
  const weights = {
    criticalVuln: 15,
    highVuln: 8,
    secret: 10,
    insecureFunc: 5,
    sqlInjection: 12,
    highDocker: 7,
    license: 3,
  };

  let deductions = 0;

  // 🧩 Count issues once to avoid repeated filtering
  let criticalCount = 0;
  let highCount = 0;
  for (const pkg of report.outdatedPackages) {
    if (pkg.severity === "critical") criticalCount++;
    else if (pkg.severity === "high") highCount++;
  }

  const sqlInjectionCount = report.sastFindings.filter(
    (f) => f.type === "sql_injection"
  ).length;
  const highDockerCount = report.dockerIssues.filter(
    (d) => d.severity === "high"
  ).length;

  // 💯 Calculate weighted deductions
  deductions += criticalCount * weights.criticalVuln;
  deductions += highCount * weights.highVuln;
  deductions += report.hardcodedSecrets.length * weights.secret;
  deductions += report.insecureFunctions.length * weights.insecureFunc;
  deductions += sqlInjectionCount * weights.sqlInjection;
  deductions += highDockerCount * weights.highDocker;
  deductions += report.licenseIssues.length * weights.license;

  // 🧮 Compute score and clamp between 0 and 100
  const rawScore = 100 - deductions;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return score;
}
