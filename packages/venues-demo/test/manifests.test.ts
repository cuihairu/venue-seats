import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const REPO_URL = "git+https://github.com/cuihairu/venue-seats.git";
/** the packages meant for the npm registry; apps/demo is deliberately absent */
const publishable = ["core", "renderer", "renderer-3d", "react", "vue", "venues-demo"];

/**
 * Publishing prerequisites gate: every publishable manifest must point back at
 * this repository (npm warns without it, and monorepo `directory` keeps the
 * link landing on the right folder), while the demo app must stay private so
 * a recursive publish can never ship it. The Flutter package needs the same
 * link in pubspec.yaml or `dart pub publish --dry-run` refuses to score it.
 */
describe("publishing metadata", () => {
  for (const name of publishable) {
    it(`manifest of @venue-seats/${name} points back at the repository`, () => {
      const manifest = JSON.parse(readFileSync(join(repoRoot, "packages", name, "package.json"), "utf8"));
      expect(manifest.repository).toEqual({
        type: "git",
        url: REPO_URL,
        directory: `packages/${name}`,
      });
    });
  }

  it("keeps the demo app out of the registry", () => {
    const demo = JSON.parse(readFileSync(join(repoRoot, "apps/demo/package.json"), "utf8"));
    expect(demo.private).toBe(true);
  });

  it("pubspec carries the repository link for pub.dev", () => {
    const pubspec = readFileSync(join(repoRoot, "packages/venue_seats/pubspec.yaml"), "utf8");
    expect(pubspec).toMatch(/^repository: https:\/\/github\.com\/cuihairu\/venue-seats$/m);
  });
});
