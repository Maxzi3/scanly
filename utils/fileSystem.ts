/* eslint-disable @typescript-eslint/no-unused-vars */
import fs from "fs/promises";
import path from "path";

/**
 * Recursively walks through a directory and executes a callback for each file.
 */
export async function walkDir(
  dir: string,
  excludeDirs: string[],
  callback: (
    fullPath: string,
    content: string,
    lines: string[]
  ) => Promise<void> | void,
  allowedExts: string[] = [
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".env",
    ".json",
    ".yml",
    ".yaml",
  ]
): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          await walkDir(fullPath, excludeDirs, callback, allowedExts);
        }
      } else if (
        entry.isFile() &&
        allowedExts.some((ext) => entry.name.toLowerCase().endsWith(ext))
      ) {
        try {
          const content = await fs.readFile(fullPath, "utf8");
          const lines = content.split(/\r?\n/);
          await callback(fullPath, content, lines);
        } catch (err) {
          console.warn(`⚠️ Skipped unreadable file: ${fullPath}`);
        }
      }
    }
  } catch (err) {
    console.warn(`⚠️ Cannot access directory: ${dir}`);
  }
}

/**
 * Deletes a directory and all its contents.
 */
export async function cleanupDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (err) {
    console.warn(`⚠️ Cleanup failed for ${dir}`);
  }
}
