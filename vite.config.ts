// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

function getBasePath(): string {
  if (process.env.VITE_BASE_PATH) {
    return process.env.VITE_BASE_PATH.replace(/\/?$/, "/");
  }
  // GitHub Actions: derive project-pages base from repo name (e.g. /auto_mail_sender/)
  if (process.env.GITHUB_REPOSITORY) {
    const repo = process.env.GITHUB_REPOSITORY.split("/")[1];
    if (repo) return `/${repo}/`;
  }
  return "/";
}

const basePath = getBasePath();

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
    router: {
      basepath: basePath === "/" ? undefined : basePath.replace(/\/$/, ""),
    },
    // SPA shell for static hosts (GitHub Pages). Client handles auth routes after load.
    spa: {
      enabled: process.env.VITE_SPA !== "false",
      maskPath: "/",
    },
    prerender: {
      enabled: process.env.VITE_PRERENDER !== "false",
      crawlLinks: false,
      failOnError: false,
      // Only prerender the SPA shell — skip auth routes that need Supabase at build time
      autoStaticPathsDiscovery: false,
    },
  },
  // Nitro: off for GitHub Pages (static). Set NITRO_PRESET=cloudflare-module (etc.) for full-stack hosts.
  nitro:
    process.env.NITRO_PRESET === "false" || !process.env.NITRO_PRESET
      ? false
      : { preset: process.env.NITRO_PRESET },
  vite: {
    base: basePath,
  },
});
