export type OutdatedPackage = {
  name: string;
  currentVersion: string;
  latestVersion: string;
  severity: "critical" | "high" | "medium" | "low";
  cve?: string;
  description?: string;
};

export type HardcodedSecret = {
  file: string;
  line: number;
  type: string; // "api_key", "password", "token", etc.
  preview: string;
  context?: string;
};

export type InsecureFunction = {
  file: string;
  line: number;
  function: string;
  risk: string;
  suggestion: string;
};

export type VulnerableFramework = {
  framework: string;
  version: string;
  cve: string;
  severity: string;
  fixVersion?: string;
};

export type LicenseIssue = {
  package: string;
  license: string;
  risk: "high" | "medium" | "low";
  reason: string;
};

export type DockerIssue = {
  file: string;
  line: number;
  issue: string;
  severity: string;
};

export type SASTFinding = {
  file: string;
  line: number;
  type:
    | "sql_injection"
    | "xss"
    | "path_traversal"
    | "command_injection"
    | "xxe"
    | "insecure_deserialization"
    | "code_injection"
    | "open_redirect"
    | "ssrf"
    | "weak_crypto"
    | "hardcoded_secret";
  severity: "critical" | "high" | "medium" | "low";
  code: string;
  description: string;
};

export type GitHistoryLeak = {
  commit: string;
  file: string;
  type: string;
  date: string;
};

export type CodeScanReport = {
  repoUrl: string;
  scanDate: string;
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    securityScore: number;
  };
  outdatedPackages: OutdatedPackage[];
  hardcodedSecrets: HardcodedSecret[];
  insecureFunctions: InsecureFunction[];
  vulnerableFrameworks: VulnerableFramework[];
  licenseIssues: LicenseIssue[];
  dockerIssues: DockerIssue[];
  sastFindings: SASTFinding[];
  gitHistoryLeaks: GitHistoryLeak[];
  recommendations: string[];
};

export interface CodeScanRequest {
  repoUrl?: string;
  branch?: string;
}
