import { scanDependencies } from "@/lib/scanners/dependencies";
import { scanDocker } from "@/lib/scanners/docker";
import { scanInsecureFunctions } from "@/lib/scanners/insecure";
import { scanLicenses } from "@/lib/scanners/licenses";
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

    // ✅ Ensure branch is always a clean, valid string
    const safeBranch = (branch ?? "main").replace(/[^\w\-/.]/g, "");
    const repoPath = await cloneRepo(repoUrl, safeBranch);

    try {
      const [
        outdatedPackages,
        hardcodedSecrets,
        insecureFunctions,
        licenseIssues,
        dockerIssues,
        sastFindings,
      ] = await Promise.all([
        scanDependencies(repoPath),
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
      const summary = {
        totalIssues:
          outdatedPackages.length +
          hardcodedSecrets.length +
          insecureFunctions.length +
          sastFindings.length +
          dockerIssues.length +
          licenseIssues.length,
        critical: outdatedPackages.filter((p) => p.severity === "critical")
          .length,
        high:
          outdatedPackages.filter((p) => p.severity === "high").length +
          hardcodedSecrets.length +
          licenseIssues.filter((l) => l.risk === "high").length,
        medium:
          insecureFunctions.length +
          licenseIssues.filter((l) => l.risk === "medium").length,
        low: dockerIssues.filter((d) => d.severity === "low").length,
        securityScore,
      };

      const recommendations = [
        hardcodedSecrets.length > 0 && "Remove hardcoded secrets",
        outdatedPackages.length > 0 && "Update dependencies",
        sastFindings.length > 0 && "Fix injection vulnerabilities",
        insecureFunctions.length > 0 && "Use safer functions",
        licenseIssues.length > 0 && "Review risky licenses",
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
