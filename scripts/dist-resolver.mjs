/**
 * Node ESM resolver hook used by `check-publish.mjs`.
 *
 * In the workspace, a bare `@venue-seats/renderer` specifier resolves through
 * the pnpm symlink to that package's *source* entry (`main: src/index.ts`),
 * which is not what a consumer of the published tarball would ever load. This
 * maps every `@venue-seats/<pkg>` specifier to that package's built
 * `dist/index.js` so the load check exercises the published graph. Relative
 * specifiers are left alone, so a package whose own dist is broken still fails.
 */
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

export async function resolve(specifier, context, nextResolve) {
  const match = /^@venue-seats\/([a-z0-9-]+)$/.exec(specifier);
  if (match) {
    return { url: pathToFileURL(join(repoRoot, "packages", match[1], "dist/index.js")).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
