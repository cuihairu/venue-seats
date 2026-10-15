#!/usr/bin/env node
/**
 * Version guard for the manual publish workflow (.github/workflows/publish.yml).
 *
 * Fails unless every publishable manifest already declares the requested
 * version: the workflow must never ship a version the manifests don't say.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requested = process.argv[2];

if (!requested) {
  console.error("usage: node scripts/check-version.mjs <version>");
  process.exit(1);
}

const problems = [];
for (const name of ["core", "renderer", "renderer-3d", "react", "vue", "venues-demo"]) {
  const manifest = JSON.parse(readFileSync(join(repoRoot, "packages", name, "package.json"), "utf8"));
  if (manifest.version !== requested) {
    problems.push(`packages/${name}/package.json is ${manifest.version}, expected ${requested}`);
  }
}
const pubspec = readFileSync(join(repoRoot, "packages", "venue_seats", "pubspec.yaml"), "utf8");
const dartVersion = /^version: (\S+)$/m.exec(pubspec)?.[1];
if (dartVersion !== requested) {
  problems.push(`packages/venue_seats/pubspec.yaml is ${dartVersion ?? "missing"}, expected ${requested}`);
}

if (problems.length > 0) {
  console.error(
    `version mismatch — bump the manifests to ${requested} first:\n` +
      problems.map((p) => `  - ${p}`).join("\n"),
  );
  process.exit(1);
}
console.log(`version ok: all publishable packages are ${requested}`);
