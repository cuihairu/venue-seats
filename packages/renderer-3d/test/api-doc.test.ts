import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as three from "../src/index";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const apiDoc = readFileSync(join(repoRoot, "docs/api.md"), "utf8");

function docSection(from: string, to: string): string {
  const start = apiDoc.indexOf(from);
  return apiDoc.slice(start, apiDoc.indexOf(to, start));
}

/**
 * Every identifier a docs section mentions. Fenced blocks are lifted out whole
 * (a ``` delimiter is an odd number of backticks, which would shift every span
 * pair after it), and kebab-case names stay in one piece so `@row-click` counts.
 */
const mentioned = (md: string) => {
  const fences = [...md.matchAll(/^```[a-zA-Z]*\n([\s\S]*?)^```$/gm)].map((m) => m[1]);
  const bare = md.replace(/^```[a-zA-Z]*\n[\s\S]*?^```$/gm, "");
  const spans = [...bare.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const out = new Set<string>();
  for (const part of [...spans, ...fences]) {
    for (const id of part.match(/[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z0-9]+)*/g) ?? []) out.add(id);
  }
  return [...out];
};

/** Members of a `{ name: ... }` literal, e.g. an imperative handle or expose(). */
const keysOf = (source: string, anchor: string) =>
  [...source.slice(source.indexOf(anchor)).matchAll(/^\s+(\w+):/gm)].map((m) => m[1]);

describe("docs/api.md renderer-3d section", () => {
  const md = docSection("## @venue-seats/renderer-3d", "## @venue-seats/react");
  const exports = Object.keys(three);

  it("documents every export the package has", () => {
    expect(exports.filter((n) => !mentioned(md).includes(n))).toEqual([]);
  });

  it("lists helpers that really exist", () => {
    const helpers = md.match(/\*\*Pure helpers[\s\S]*?:\*\*([\s\S]*?)\n\n/)?.[1] ?? "";
    const names = [...helpers.matchAll(/`([A-Za-z][A-Za-z0-9]*)[^`]*`/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(5);
    expect(names.filter((n) => !exports.includes(n))).toEqual([]);
  });
});

describe("docs/api.md react section", () => {
  const md = docSection("## @venue-seats/react", "## @venue-seats/vue");
  // lastIndexOf: the name also appears in the import at the top of the file
  const source = readFileSync(join(repoRoot, "packages/react/src/SeatMap.tsx"), "utf8");
  const at = source.lastIndexOf("useImperativeHandle");
  const exposed = keysOf(source.slice(at, at + 600), "() => ({");

  it("documents every imperative handle method", () => {
    expect(exposed.length).toBeGreaterThan(3);
    expect(exposed.filter((n) => !mentioned(md).includes(n))).toEqual([]);
  });

  it("documents only handle methods that exist", () => {
    const documented = md.match(/Imperative handle[^:]*:\s*([\s\S]*?)\n\n/)?.[1] ?? "";
    const names = [...documented.matchAll(/`([A-Za-z][A-Za-z0-9]*)[^`]*`/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => !exposed.includes(n))).toEqual([]);
  });
});

describe("docs/api.md vue section", () => {
  const md = docSection("## @venue-seats/vue", "## venue_seats (Flutter)");
  const source = readFileSync(join(repoRoot, "packages/vue/src/SeatMap.ts"), "utf8");
  const exposed = keysOf(source, "expose({");

  it("documents every exposed template-ref method", () => {
    expect(exposed.length).toBeGreaterThan(3);
    expect(exposed.filter((n) => !mentioned(md).includes(n))).toEqual([]);
  });

  it("documents every event the component emits", () => {
    const events = [...source.matchAll(/emit\("([A-Za-z][A-Za-z0-9]*)"/g)].map((m) => m[1]);
    const kebab = events.map((n) => n.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
    expect(kebab.length).toBeGreaterThan(3);
    expect(kebab.filter((n) => !mentioned(md).includes(n))).toEqual([]);
  });

  it("documents only events the component really emits", () => {
    const usage = md.match(/```vue\n([\s\S]*?)```/)?.[1] ?? "";
    const documented = [...usage.matchAll(/@([a-z][a-z-]*)/g)].map((m) => m[1]);
    const emitted = new Set(
      [...source.matchAll(/emit\("([A-Za-z][A-Za-z0-9]*)"/g)].map((m) =>
        m[1].replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
      ),
    );
    expect(documented.filter((n) => !emitted.has(n))).toEqual([]);
  });
});