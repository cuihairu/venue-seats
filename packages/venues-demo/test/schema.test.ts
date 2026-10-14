import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SUPPORTED_SCHEMA_VERSION, validate } from "@venue-seats/core";

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