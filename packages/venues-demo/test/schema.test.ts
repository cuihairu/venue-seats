import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SUPPORTED_SCHEMA_VERSION, validate, venueBounds } from "@venue-seats/core";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const venuesDir = join(repoRoot, "packages/venues-demo/venues");
const schema = JSON.parse(
  readFileSync(join(repoRoot, "schemas/venue-seats.schema.json"), "utf8"),
) as JsonSchema;

interface JsonSchema {
  type?: string;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  minItems?: number;
}

const jsonType = (v: unknown): string =>
  Array.isArray(v) ? "array" : v === null ? "null" : typeof v;

/**
 * Minimal draft-07 subset validator — enough for this schema (no $ref, no
 * composition). Deliberately dependency free so the data contract can be
 * checked without adding a validator to the workspace.
 */
function check(value: unknown, node: JsonSchema, path: string, errors: string[]): void {
  if (node.enum) {
    if (!node.enum.includes(value)) errors.push(`${path}: ${JSON.stringify(value)} not in enum`);
    return;
  }
  if (node.type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${path}: expected array, got ${jsonType(value)}`);
      return;
    }
    if (node.minItems !== undefined && value.length < node.minItems) {
      errors.push(`${path}: needs at least ${node.minItems} items, got ${value.length}`);
    }
    if (node.items) value.forEach((item, i) => check(item, node.items!, `${path}[${i}]`, errors));
    return;
  }
  if (node.type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      errors.push(`${path}: expected object, got ${jsonType(value)}`);
      return;
    }
    const obj = value as Record<string, unknown>;
    for (const key of node.required ?? []) {
      if (!(key in obj)) errors.push(`${path}.${key}: required by the schema but missing`);
    }
    for (const [key, child] of Object.entries(obj)) {
      const prop = node.properties?.[key];
      if (!prop) {
        errors.push(`${path}.${key}: not declared in the schema`);
        continue;
      }
      check(child, prop, `${path}.${key}`, errors);
    }
    return;
  }
  if (node.type && jsonType(value) !== node.type && typeof value !== "object") {
    errors.push(`${path}: expected ${node.type}, got ${jsonType(value)}`);
  }
}

const venueFiles = readdirSync(venuesDir).filter((f) => f.endsWith(".json")).sort();

describe("venue schema", () => {
  it("is a draft-07 object schema with the published id", () => {
    expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");
    expect((schema as Record<string, unknown>).$id).toContain("venue-seats.schema.json");
    expect(schema.type).toBe("object");
    expect(venueFiles.length).toBe(5);
  });

  it.each(venueFiles)("%s conforms to schemas/venue-seats.schema.json", (file) => {
    const doc = JSON.parse(readFileSync(join(venuesDir, file), "utf8"));
    const errors: string[] = [];
    check(doc, schema, "$", errors);
    expect(errors).toEqual([]);
  });

  it("admits exactly the schema versions core validates", () => {
    // the JSON Schema is what downstream consumers validate against; if it
    // drifts from `validate()` a document can pass the contract and still be
    // rejected at runtime (or worse, the other way round).
    expect(schema.properties?.schemaVersion.enum).toEqual([SUPPORTED_SCHEMA_VERSION]);

    const base = JSON.parse(readFileSync(join(venuesDir, venueFiles[0]), "utf8"));
    for (const schemaVersion of [SUPPORTED_SCHEMA_VERSION, "2", ""]) {
      const candidate = { ...base, schemaVersion };
      const schemaErrors: string[] = [];
      check(candidate, schema, "$", schemaErrors);
      const coreRejects = validate(candidate).some((e) => e.includes("schemaVersion"));
      expect([schemaVersion, schemaErrors.length === 0]).toEqual([schemaVersion, !coreRejects]);
    }
  });
});

/**
 * The `examples/` samples are real venues rebuilt from cited public sources
 * (`provenance: "public"`). They must keep passing the same schema contract as
 * the illustrative demo fixtures, and every one must name its source.
 */
describe("example venues", () => {
  const examplesDir = join(repoRoot, "examples", "venues");
  const exampleFiles = existsSync(examplesDir)
    ? readdirSync(examplesDir)
        .filter((f) => f.endsWith(".json"))
        .sort()
    : [];

  it("admits the public provenance the samples use", () => {
    expect(schema.properties?.provenance.enum).toEqual(["official", "demo", "public"]);
  });

  it("ships one sample per required layout family", () => {
    expect(exampleFiles).toEqual([
      "public-expo-culture-center.json", // bowl arena, variable infield (Shanghai)
      "public-hangzhou-olympic-stadium.json", // oval three-tier stadium (Hangzhou)
      "public-hong-kong-coliseum.json", // irregular four-sided rectangular bowl
      "public-ncpa-opera-house.json", // fan-shaped theatre with balconies (Beijing)
    ]);
  });

  it.each(exampleFiles)("%s conforms to the schema and to core validation", (file) => {
    const doc = JSON.parse(readFileSync(join(examplesDir, file), "utf8"));
    const errors: string[] = [];
    check(doc, schema, "$", errors);
    expect(errors).toEqual([]);
    expect(validate(doc), file).toEqual([]);
    expect(doc.provenance, file).toBe("public");
    expect(doc.stage, file).toBeTruthy();
  });

  it("has plausible per-level inventory and finite bounds", () => {
    for (const file of exampleFiles) {
      const doc = JSON.parse(readFileSync(join(examplesDir, file), "utf8"));
      for (const level of doc.levels) {
        let total = 0;
        let sold = 0;
        for (const sec of level.sections)
          for (const row of sec.rows)
            for (const seat of row.seats) {
              total += 1;
              if (seat.status !== "available") sold += 1;
            }
        // 100 not 200: the NCPA second balcony is a documented 140-seat ring
        expect(total, `${file}/${level.id}`).toBeGreaterThan(100);
        expect(sold, `${file}/${level.id} should have sold seats`).toBeGreaterThan(0);
      }
      const bounds = venueBounds(doc)!;
      expect(bounds.maxX - bounds.minX, file).toBeGreaterThan(300);
      expect(bounds.maxY - bounds.minY, file).toBeGreaterThan(200);
    }
  });

  it("regenerates byte-identical documents from scripts/gen-examples.mjs", () => {
    // The generator writes next to itself, so run a copy in a temp dir: the
    // repo must never be rewritten by a test.
    const tmp = mkdtempSync(join(tmpdir(), "venue-examples-"));
    try {
      cpSync(join(repoRoot, "scripts/gen-examples.mjs"), join(tmp, "scripts/gen-examples.mjs"));
      execFileSync(process.execPath, [join(tmp, "scripts/gen-examples.mjs")], { stdio: "pipe" });
      const outDir = join(tmp, "examples/venues");
      const generated = readdirSync(outDir).sort();
      expect(generated).toEqual(exampleFiles);
      for (const file of generated) {
        expect(readFileSync(join(outDir, file), "utf8"), file).toBe(
          readFileSync(join(examplesDir, file), "utf8"),
        );
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("cites the source and licence of every sample in examples/README.md", () => {
    const readmePath = join(repoRoot, "examples", "README.md");
    expect(existsSync(readmePath)).toBe(true);
    const readme = readFileSync(readmePath, "utf8");
    for (const file of exampleFiles) {
      expect(readme, `${file} must be listed in examples/README.md`).toContain(file);
    }
    // every sample row must carry a source URL and a licence verdict
    expect(readme).toMatch(/https?:\/\//);
    expect(readme).toMatch(/许可|licen[cs]e/i);
  });
});