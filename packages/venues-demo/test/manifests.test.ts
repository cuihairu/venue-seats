import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

  it("keeps every non-publishable workspace package private", () => {
    // a recursive publish must never ship the monorepo root, the demo app or
    // the docs site
    for (const rel of ["package.json", "apps/demo/package.json", "docs/package.json"]) {
      const manifest = JSON.parse(readFileSync(join(repoRoot, rel), "utf8"));
      expect(manifest.private, rel).toBe(true);
    }
  });

  it("pubspec carries the repository link for pub.dev", () => {
    const pubspec = readFileSync(join(repoRoot, "packages/venue_seats/pubspec.yaml"), "utf8");
    expect(pubspec).toMatch(/^repository: https:\/\/github\.com\/cuihairu\/venue-seats$/m);
  });

  it("declares public access for the scoped npm packages", () => {
    // npmjs publishes scoped packages as restricted by default — decision 1A
    // (npmjs public registry) needs publishConfig.access on every package
    for (const name of publishable) {
      const manifest = JSON.parse(readFileSync(join(repoRoot, "packages", name, "package.json"), "utf8"));
      expect(manifest.publishConfig?.access, `packages/${name}/package.json`).toBe("public");
    }
  });
});

/**
 * Every published artifact must carry its licence text: npm force-includes a
 * package-root LICENSE even when `files` lists only `dist`, and pub.dev refuses
 * the upload outright without one. The Flutter package also needs the README
 * and CHANGELOG pub.dev asks for, and a description inside pub.dev's 60–180
 * character window.
 */
describe("publish files", () => {
  for (const name of publishable) {
    it(`packages/${name} ships a LICENSE and a README`, () => {
      expect(existsSync(join(repoRoot, "packages", name, "LICENSE"))).toBe(true);
      // npm renders the package page from the tarball README; without one the
      // registry listing is blank
      expect(existsSync(join(repoRoot, "packages", name, "README.md"))).toBe(true);
    });
  }

  const flutterDir = join(repoRoot, "packages", "venue_seats");

  it("the flutter package carries the files pub.dev requires", () => {
    for (const file of ["LICENSE", "README.md", "CHANGELOG.md"]) {
      expect(existsSync(join(flutterDir, file)), `packages/venue_seats/${file}`).toBe(true);
    }
  });

  it("keeps the flutter description inside pub.dev's 60-180 characters", () => {
    const pubspec = readFileSync(join(flutterDir, "pubspec.yaml"), "utf8");
    const block = /description: >-\n((?:  .*\n)+)/.exec(pubspec)?.[1] ?? "";
    const description = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ");
    expect(description.length).toBeGreaterThanOrEqual(60);
    expect(description.length).toBeLessThanOrEqual(180);
  });

  it("mentions the current version in the flutter changelog", () => {
    // pub's own dry-run warns when CHANGELOG.md skips the version being published
    const pubspec = readFileSync(join(flutterDir, "pubspec.yaml"), "utf8");
    const version = /^version: (\S+)$/m.exec(pubspec)?.[1] ?? "";
    const changelog = readFileSync(join(flutterDir, "CHANGELOG.md"), "utf8");
    expect(changelog, `packages/venue_seats/CHANGELOG.md should mention ${version}`).toContain(version);
  });

  it("keeps the dart version in lockstep with the npm packages", () => {
    const pubspec = readFileSync(join(flutterDir, "pubspec.yaml"), "utf8");
    const dartVersion = /^version: (\S+)$/m.exec(pubspec)?.[1];
    expect(dartVersion).toBeTruthy();
    for (const name of publishable) {
      const manifest = JSON.parse(readFileSync(join(repoRoot, "packages", name, "package.json"), "utf8"));
      expect(manifest.version, `packages/${name}/package.json`).toBe(dartVersion);
    }
  });
});

describe("pages deployment", () => {
  it("declares the project-page base in the vitepress config", () => {
    // the site is published at cuihairu.github.io/venue-seats/; without base the
    // build emits /assets/... absolute URLs that 404 once deployed
    const config = readFileSync(join(repoRoot, "docs", ".vitepress", "config.mts"), "utf8");
    expect(config).toContain('base: "/venue-seats/"');
  });

  it("has a pages workflow that deploys the built docs", () => {
    expect(existsSync(join(repoRoot, ".github", "workflows", "pages.yml"))).toBe(true);
  });
});

describe("release channel", () => {
  const versionScript = join(repoRoot, "scripts", "check-version.mjs");

  it("is publishable to pub.dev (publish_to override removed)", () => {
    // decision 2A: pub.dev distribution — a leftover publish_to: none would
    // make dart pub publish refuse to upload
    const pubspec = readFileSync(join(repoRoot, "packages", "venue_seats", "pubspec.yaml"), "utf8");
    expect(pubspec).not.toMatch(/publish_to:/);
    expect(pubspec).toMatch(/^homepage: https:\/\/cuihairu\.github\.io\/venue-seats\/$/m);
  });

  it("has a manual publish workflow gated on the acceptance suite", () => {
    const workflow = readFileSync(join(repoRoot, ".github", "workflows", "publish.yml"), "utf8");
    // decision 3A: manual-only — no push/schedule/tag triggers
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toMatch(/on:\s*(push|schedule|release|tag)/);
    // gates must chain: the version guard and the publish contract run before publish
    expect(workflow).toContain("check-version.mjs");
    expect(workflow).toContain("publish:check");
  });

  it("version guard passes when every manifest declares the requested version", () => {
    const version = JSON.parse(readFileSync(join(repoRoot, "packages", "core", "package.json"), "utf8")).version;
    execFileSync("node", [versionScript, version], { encoding: "utf8" });
  });

  it("version guard fails when the requested version matches the manifests of no package", () => {
    expect(() =>
      execFileSync("node", [versionScript, "9.9.9-should-not-exist"], { encoding: "utf8", stdio: "pipe" }),
    ).toThrow();
  });
});
