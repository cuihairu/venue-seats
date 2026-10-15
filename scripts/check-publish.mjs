#!/usr/bin/env node
/**
 * Publish-contract check. Run after `pnpm -r build`.
 *
 * `publishConfig` is the manifest npm/pnpm swap in at publish time, so its
 * entry points are what consumers actually import — but nothing type-checks
 * them against the tarball. If the build layout drifts (a tsconfig rootDir
 * change, a package that stops emitting, a hand-edit), the published package
 * silently points at files that are not there. This walks every publishable
 * package, asks npm for the real packed file list (`--dry-run`, no network),
 * and fails if a declared entry is missing, is not the built output, or does
 * not actually load under plain Node ESM (a JSON import without its import
 * attribute only breaks for consumers, never for the bundler-built demo).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// resolve workspace deps to their dist, so the load check sees the published graph
register("./dist-resolver.mjs", import.meta.url);

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** packages meant for the registry; apps/demo stays private */
const publishable = ["core", "renderer", "renderer-3d", "react", "vue", "venues-demo"];

/** every path a manifest hands to consumers through publishConfig */
function declaredPaths(manifest) {
  const cfg = manifest.publishConfig ?? {};
  const paths = new Set();
  const add = (p) => {
    if (typeof p === "string") paths.add(p.replace(/^\.\//, ""));
  };
  add(cfg.main);
  add(cfg.types);
  for (const [key, value] of Object.entries(cfg.exports ?? {})) {
    if (key === "./package.json") continue;
    for (const p of Object.values(value)) add(p);
  }
  return [...paths];
}

const problems = [];
// pnpm exports npm_config_* vars npm does not recognise; drop the noisy one
const env = { ...process.env };
delete env["npm_config_verify_deps_before_run"];
for (const name of publishable) {
  const dir = join(repoRoot, "packages", name);
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const pack = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: dir, encoding: "utf8", env });
  const packed = new Set(JSON.parse(pack)[0].files.map((f) => f.path));
  for (const path of declaredPaths(manifest)) {
    if (!packed.has(path)) {
      problems.push(`@venue-seats/${name}: publishConfig points at ${path}, which the tarball does not contain`);
      continue;
    }
    if (!path.startsWith("dist/")) {
      problems.push(`@venue-seats/${name}: publishConfig points at ${path}, outside the built dist/ output`);
      continue;
    }
    if (!path.endsWith(".js")) continue;
    try {
      await import(pathToFileURL(join(dir, path)).href);
    } catch (err) {
      problems.push(`@venue-seats/${name}: ${path} is packed but does not load under Node ESM (${err.code ?? err.message})`);
    }
  }
}

if (problems.length > 0) {
  console.error("publish contract broken:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`publish contract ok for ${publishable.length} packages`);
