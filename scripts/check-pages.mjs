#!/usr/bin/env node
/**
 * Pages-readiness check. Run after the docs build.
 *
 * The docs site is published at a project path (cuihairu.github.io/venue-seats/),
 * so every internal asset and page link must carry the vitepress `base`. A
 * config that loses `base` still builds fine and only breaks once deployed —
 * this reads the built HTML and fails if any internal URL escapes the base.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(repoRoot, "docs/.vitepress/dist");
const base = "/venue-seats/";

const problems = [];
if (!existsSync(join(dist, "index.html"))) {
  problems.push("docs site is not built (docs/.vitepress/dist/index.html missing)");
} else {
  for (const page of ["index.html", "quickstart.html", "data-format.html", "api.html"]) {
    const file = join(dist, page);
    if (!existsSync(file)) {
      problems.push(`docs/.vitepress/dist/${page} missing`);
      continue;
    }
    for (const m of readFileSync(file, "utf8").matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      if (!m[1].startsWith(base)) problems.push(`${page}: internal URL ${m[1]} escapes the base ${base}`);
    }
  }
}

if (problems.length > 0) {
  console.error("pages readiness broken:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`pages readiness ok (base ${base})`);
