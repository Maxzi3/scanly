import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

/**
 * Downloads and extracts a GitHub repo ZIP (works on Vercel)
 */
export async function downloadRepo(
  repoUrl: string,
  branch = "main"
): Promise<string> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Invalid GitHub URL");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, owner, repo] = match;
  const zipUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`;

  console.log(`⬇️ Downloading repo ZIP from: ${zipUrl}`);

  const res = await fetch(zipUrl);
  if (!res.ok) throw new Error(`Failed to download ZIP: ${res.statusText}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buffer);

  const tmpDir = path.join("/tmp", `${repo}-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  zip.extractAllTo(tmpDir, true);

  // GitHub zips repos as folder "repo-branch"
  const extractedDir = path.join(tmpDir, `${repo}-${branch}`);
  console.log(`📂 Extracted to: ${extractedDir}`);

  return extractedDir;
}
