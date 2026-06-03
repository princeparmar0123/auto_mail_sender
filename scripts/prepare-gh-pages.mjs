/**
 * Prepare dist/client for GitHub Pages:
 * - index.html + 404.html from the SPA shell (client-side routing)
 * - .nojekyll so Jekyll does not strip underscored assets
 */
import { copyFile, access, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist", "client");

const shellCandidates = ["_shell.html", ".html", "index.html"];

async function resolveShell() {
  for (const name of shellCandidates) {
    const file = path.join(outDir, name);
    try {
      await access(file);
      return file;
    } catch {
      // try next
    }
  }
  throw new Error(
    `No SPA shell found in ${outDir}. Expected one of: ${shellCandidates.join(", ")}`,
  );
}

const shell = await resolveShell();
const indexPath = path.join(outDir, "index.html");
const notFoundPath = path.join(outDir, "404.html");

await copyFile(shell, indexPath);
await copyFile(shell, notFoundPath);
await writeFile(path.join(outDir, ".nojekyll"), "");

// GitHub Pages serves project sites at /repo-name/ — root index.html is required
const stats = await stat(indexPath);
if (stats.size < 100) {
  throw new Error("index.html is too small; SPA shell copy may have failed");
}

console.log(`[prepare-gh-pages] Using shell: ${path.basename(shell)} (${stats.size} bytes)`);
console.log("[prepare-gh-pages] Wrote index.html, 404.html, .nojekyll");
