import { execSync } from "child_process";
import path from "path";
import os from "os";

export async function cloneRepo(
  repoUrl: string,
  branch: string = "main"
): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `scan-${Date.now()}`);
  try {
    execSync(`git clone --depth 1 --branch ${branch} ${repoUrl} ${tempDir}`, {
      stdio: "pipe",
      timeout: 30000,
    });
    return tempDir;
  } catch {
    try {
      execSync(`git clone --depth 1 --branch master ${repoUrl} ${tempDir}`, {
        stdio: "pipe",
        timeout: 30000,
      });
      return tempDir;
    } catch {
      throw new Error(
        "Failed to clone. Ensure the repo is public or use a personal access token."
      );
    }
  }
}
