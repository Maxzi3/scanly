// ============== route.ts ==============
import {
  checkOutdatedPackages,
  scanDependencies,
  scanVulnerabilitiesNpmAudit,
} from "@/lib/scanners/dependencies";
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
      // 🔧 FIX 1: Separate vulnerabilities from outdated packages
      const [
        vulnerabilities,
        outdatedPackages,
        hardcodedSecrets,
        insecureFunctions,
        licenseIssues,
        dockerIssues,
        sastFindings,
      ] = await Promise.all([
        scanVulnerabilitiesNpmAudit(repoPath), // Returns vulnerabilities
        checkOutdatedPackages(repoPath), // Returns outdated packages
        scanForSecrets(repoPath),
        scanInsecureFunctions(repoPath),
        scanLicenses(repoPath),
        scanDocker(repoPath),
        runSAST(repoPath),
      ]);

      // 🔧 FIX 2: Combine vulnerabilities and outdated packages
      const allPackageIssues = [...vulnerabilities, ...outdatedPackages];

      const report: Omit<CodeScanReport, "summary"> = {
        repoUrl,
        scanDate: new Date().toISOString(),
        outdatedPackages: allPackageIssues, 
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

      // 🔧 FIX 3: Better summary calculation
      const summary = {
        totalIssues:
          allPackageIssues.length +
          hardcodedSecrets.length +
          insecureFunctions.length +
          sastFindings.length +
          dockerIssues.length +
          licenseIssues.length,
        critical: allPackageIssues.filter((p) => p.severity === "critical")
          .length,
        high:
          allPackageIssues.filter((p) => p.severity === "high").length +
          hardcodedSecrets.length +
          licenseIssues.filter((l) => l.risk === "high").length +
          dockerIssues.filter((d) => d.severity === "high").length,
        medium:
          allPackageIssues.filter((p) => p.severity === "medium").length +
          insecureFunctions.length +
          sastFindings.filter((s) => s.severity === "medium").length +
          licenseIssues.filter((l) => l.risk === "medium").length +
          dockerIssues.filter((d) => d.severity === "medium").length,
        low:
          allPackageIssues.filter((p) => p.severity === "low").length +
          sastFindings.filter((s) => s.severity === "low").length +
          dockerIssues.filter((d) => d.severity === "low").length,
        securityScore,
      };

      // 🔧 FIX 4: More detailed recommendations
      const recommendations = [
        hardcodedSecrets.length > 0 &&
          `🔐 Remove ${hardcodedSecrets.length} hardcoded secret${
            hardcodedSecrets.length > 1 ? "s" : ""
          } immediately`,

        vulnerabilities.length > 0 &&
          `⚠️ Fix ${vulnerabilities.length} vulnerable package${
            vulnerabilities.length > 1 ? "s" : ""
          } with known CVEs`,

        outdatedPackages.length > 0 &&
          `📦 Update ${outdatedPackages.length} outdated package${
            outdatedPackages.length > 1 ? "s" : ""
          } to latest versions`,

        sastFindings.length > 0 &&
          `🛡️ Address ${sastFindings.length} code security issue${
            sastFindings.length > 1 ? "s" : ""
          } (injection, XSS, etc.)`,

        insecureFunctions.length > 0 &&
          `⚡ Replace ${insecureFunctions.length} insecure function${
            insecureFunctions.length > 1 ? "s" : ""
          } with safer alternatives`,

        licenseIssues.length > 0 &&
          `📜 Review ${licenseIssues.length} package${
            licenseIssues.length > 1 ? "s" : ""
          } with risky licenses (${
            licenseIssues.filter((l) => l.risk === "high").length
          } high risk)`,

        dockerIssues.length > 0 &&
          `🐳 Fix ${dockerIssues.length} Docker security issue${
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
