/**
 * Prepare dist/client for GitHub Pages:
 * - index.html + 404.html from the SPA shell (client-side routing)
 * - .nojekyll so Jekyll does not strip underscored assets
 */
import { copyFile, access, writeFile } from "node:fs/promises";
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
await copyFile(shell, path.join(outDir, "index.html"));
await copyFile(shell, path.join(outDir, "404.html"));
await writeFile(path.join(outDir, ".nojekyll"), "");

console.log(`[prepare-gh-pages] Using shell: ${path.basename(shell)}`);
console.log("[prepare-gh-pages] Wrote index.html, 404.html, .nojekyll");
