import {
  checkOutdatedPackages,
  scanLicenses,
} from "@/lib/scanners/dependencies";
import { scanDocker } from "@/lib/scanners/docker";
import { scanInsecureFunctions } from "@/lib/scanners/insecure";
import { runSAST } from "@/lib/scanners/sast";
import { calculateScore } from "@/lib/scanners/score";
import { scanForSecrets } from "@/lib/scanners/secrets";
import { CodeScanRequest, CodeScanReport } from "@/types/code-scan";
import { cleanupDir } from "@/utils/fileSystem";
import { cloneRepo } from "@/utils/gitClone";
import { checkRateLimit } from "@/utils/rateLimit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const { repoUrl, branch }: CodeScanRequest = await req.json();

    if (!repoUrl || !/^https:\/\/github\.com\/[\w-]+\/[\w-]+/.test(repoUrl)) {
      return NextResponse.json(
        { error: "Invalid GitHub URL" },
        { status: 400 }
      );
    }

    // Clean and validate branch name
    const safeBranch = (branch ?? "main").replace(/[^\w\-/.]/g, "");
    const repoPath = await cloneRepo(repoUrl, safeBranch);

    try {
      // Run all scans in parallel - simple and clean
      const [
        outdatedPackages,
        hardcodedSecrets,
        insecureFunctions,
        licenseIssues,
        dockerIssues,
        sastFindings,
      ] = await Promise.all([
        checkOutdatedPackages(repoPath), 
        scanForSecrets(repoPath),
        scanInsecureFunctions(repoPath),
        scanLicenses(repoPath),
        scanDocker(repoPath),
        runSAST(repoPath),
      ]);

      const report: Omit<CodeScanReport, "summary"> = {
        repoUrl,
        scanDate: new Date().toISOString(),
        outdatedPackages,
        hardcodedSecrets,
        insecureFunctions,
        vulnerableFrameworks: [],
        licenseIssues,
        dockerIssues,
        sastFindings,
        gitHistoryLeaks: [],
        recommendations: [],
      };

      const securityScore = calculateScore(report);

      // Calculate summary
      const summary = {
        totalIssues:
          outdatedPackages.length +
          hardcodedSecrets.length +
          insecureFunctions.length +
          sastFindings.length +
          dockerIssues.length +
          licenseIssues.length,
        critical:
          outdatedPackages.filter((p) => p.severity === "critical").length +
          sastFindings.filter((s) => s.severity === "critical").length,
        high:
          outdatedPackages.filter((p) => p.severity === "high").length +
          hardcodedSecrets.length +
          licenseIssues.filter((l) => l.risk === "high").length +
          sastFindings.filter((s) => s.severity === "high").length +
          dockerIssues.filter((d) => d.severity === "high").length,
        medium:
          outdatedPackages.filter((p) => p.severity === "medium").length +
          insecureFunctions.length +
          licenseIssues.filter((l) => l.risk === "medium").length +
          sastFindings.filter((s) => s.severity === "medium").length +
          dockerIssues.filter((d) => d.severity === "medium").length,
        low:
          outdatedPackages.filter((p) => p.severity === "low").length +
          sastFindings.filter((s) => s.severity === "low").length +
          dockerIssues.filter((d) => d.severity === "low").length,
        securityScore,
      };

      // Generate recommendations
      const recommendations = [
        hardcodedSecrets.length > 0 &&
          `🔐 Remove ${hardcodedSecrets.length} hardcoded secret${
            hardcodedSecrets.length > 1 ? "s" : ""
          }`,

        outdatedPackages.filter(
          (p) => p.severity === "critical" || p.severity === "high"
        ).length > 0 &&
          `⚠️ Update ${
            outdatedPackages.filter(
              (p) => p.severity === "critical" || p.severity === "high"
            ).length
          } critically outdated package${
            outdatedPackages.filter(
              (p) => p.severity === "critical" || p.severity === "high"
            ).length > 1
              ? "s"
              : ""
          }`,

        sastFindings.length > 0 &&
          `🛡️ Fix ${sastFindings.length} security issue${
            sastFindings.length > 1 ? "s" : ""
          } in code`,

        insecureFunctions.length > 0 &&
          `⚡ Replace ${insecureFunctions.length} insecure function${
            insecureFunctions.length > 1 ? "s" : ""
          }`,

        licenseIssues.length > 0 &&
          `📜 Review ${licenseIssues.length} license issue${
            licenseIssues.length > 1 ? "s" : ""
          } (${
            licenseIssues.filter((l) => l.risk === "high").length
          } high risk)`,

        dockerIssues.length > 0 &&
          `🐳 Fix ${dockerIssues.length} Docker issue${
            dockerIssues.length > 1 ? "s" : ""
          }`,
      ].filter(Boolean) as string[];

      return NextResponse.json({ ...report, summary, recommendations });
    } finally {
      cleanupDir(repoPath);
    }
  } catch (error) {
    console.error("Code scan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 }
    );
  }
}
