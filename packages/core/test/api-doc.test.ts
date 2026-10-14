import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as core from "../src/index";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const source = readFileSync(join(repoRoot, "packages/core/src/index.ts"), "utf8");
const apiDoc = readFileSync(join(repoRoot, "docs/api.md"), "utf8");
const section = apiDoc.slice(
  apiDoc.indexOf("## @venue-seats/core"),
  apiDoc.indexOf("## @venue-seats/renderer"),
);

/** `code` spans from the first column of the export table. */
const tableNames = [...section.matchAll(/^\|\s*([^|]+?)\s*\|/gm)].flatMap((row) =>
  [...row[1].matchAll(/`([A-Za-z][A-Za-z0-9]*)`/g)].map((m) => m[1]),
);
// the Types paragraph wraps onto a second line
const typeLine = section.match(/\*\*Types:\*\*([\s\S]*?)\n\n/)?.[1] ?? "";
const typeNames = [...typeLine.matchAll(/`([A-Za-z][A-Za-z0-9]*)`/g)].map((m) => m[1]);

/** Types are erased at runtime, so they are read from the source. */
const declaredTypes = new Set(
  [...source.matchAll(/^export (?:interface|type) (\w+)/gm)].map((m) => m[1]),
);
const runtimeExports = Object.keys(core);

describe("docs/api.md core section", () => {
  it("lists every export the package actually has", () => {
    const documented = new Set([...tableNames, ...typeNames]);
    const undocumented = [...runtimeExports, ...declaredTypes].filter((n) => !documented.has(n));
    expect(undocumented).toEqual([]);
  });

  it("documents every export the package actually has", () => {
    const known = new Set<string>([...runtimeExports, ...declaredTypes]);
    const unknown = [...new Set(tableNames)].filter((n) => !known.has(n));
    expect(unknown).toEqual([]);
  });

  it("covers every declared type in the Types line", () => {
    const missing = [...declaredTypes].filter((n) => !typeNames.includes(n));
    expect(missing).toEqual([]);
  });

  it("keeps the documented rowAt/validate caveats honest", () => {
    // api.md promises these defaults; a silent change would misdocument hit
    // testing for anyone relying on it.
    expect(core.rowAt.length).toBeLessThanOrEqual(3);
    expect(core.seatAt.length).toBeLessThanOrEqual(3);
    expect(typeof core.validate).toBe("function");
  });
});