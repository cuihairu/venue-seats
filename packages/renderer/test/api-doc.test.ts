import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const source = readFileSync(join(repoRoot, "packages/renderer/src/controller.ts"), "utf8");
const apiDoc = readFileSync(join(repoRoot, "docs/api.md"), "utf8");
const section = apiDoc.slice(
  apiDoc.indexOf("## @venue-seats/renderer"),
  apiDoc.indexOf("## @venue-seats/renderer-3d"),
);

const methodsParagraph = section.match(/\*\*Methods:\*\*([\s\S]*?)\n\n/)?.[1] ?? "";
const documented = [
  ...new Set([
    ...[...methodsParagraph.matchAll(/`([A-Za-z][A-Za-z0-9]*)\(/g)].map((m) => m[1]),
    ...[...methodsParagraph.matchAll(/getter `([A-Za-z][A-Za-z0-9]*)`/g)].map((m) => m[1]),
  ]),
];

/** Public members of the class: `private` is erased by tsc, so read the source. */
const declared = [
  ...new Set(
    [...source.matchAll(/^ {2}(?!private |constructor)(?:get )?(\w+)\(/gm)].map((m) => m[1]),
  ),
];

describe("docs/api.md renderer section", () => {
  it("documents every public SeatMapController method", () => {
    expect(declared.filter((n) => !documented.includes(n))).toEqual([]);
  });

  it("documents only methods the controller really has", () => {
    expect(documented.filter((n) => !declared.includes(n))).toEqual([]);
  });

  it("keeps the documented SeatMapOptions callbacks in sync", () => {
    const optionsParagraph = section.match(/\*\*`SeatMapOptions`:\*\*([\s\S]*?)\n\n/)?.[1] ?? "";
    const callbacks = [...optionsParagraph.matchAll(/`(on[A-Za-z]+)\??`/g)].map((m) => m[1]);
    expect(callbacks.length).toBeGreaterThan(0);
    // SeatMapOptions extends SeatMapEvents, which is where the callbacks live
    const events = source.slice(source.indexOf("export interface SeatMapEvents"));
    const real = [...events.matchAll(/^\s+(on[A-Za-z]+)\?\(/gm)].map((m) => m[1]);
    expect(callbacks.filter((c) => !real.includes(c))).toEqual([]);
  });
});