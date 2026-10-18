import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const datasetPath = join(repoRoot, "data/venues.json");

interface DatasetSource {
  url: string;
  licence: string;
  method: string;
}

interface DatasetVenue {
  id: string;
  qid: string;
  name: string;
  venueType: string;
  capacity: number;
  lat: number;
  lng: number;
  country: string | null;
  city: string | null;
  opened: number | null;
  retrievedAt: string;
  sources: DatasetSource[];
}

interface Dataset {
  datasetVersion: number;
  generatedAt: string;
  licence: string;
  source: { endpoint: string; query: string };
  counts: Record<string, number>;
  venues: DatasetVenue[];
}

const dataset = JSON.parse(readFileSync(datasetPath, "utf8")) as Dataset;

describe("self-built dataset", () => {
  it("passes the integrity validator with exit code zero", () => {
    execFileSync(process.execPath, [join(repoRoot, "scripts/validate-dataset.mjs")], {
      stdio: "pipe",
    });
  });

  it("records the public source, its licence, and the fetch metadata", () => {
    expect(dataset.datasetVersion).toBe(1);
    expect(dataset.licence).toBe("CC0-1.0");
    expect(dataset.source.endpoint).toContain("wikidata.org");
    expect(dataset.source.query.trim().length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(dataset.generatedAt))).toBe(false);
  });

  it("covers a large slice of real venues across many countries", () => {
    expect(dataset.venues.length).toBeGreaterThanOrEqual(2000);
    const types = new Set(dataset.venues.map((v) => v.venueType));
    for (const expected of ["stadium", "arena", "theatre"]) {
      expect(types.has(expected)).toBe(true);
    }
    const countries = new Set(
      dataset.venues.map((v) => v.country).filter((c): c is string => c !== null),
    );
    expect(countries.size).toBeGreaterThanOrEqual(120);
  });

  it("cites a CC0 source link that resolves to the record's own entity", () => {
    for (const venue of dataset.venues) {
      expect(venue.sources.length).toBeGreaterThanOrEqual(1);
      const primary = venue.sources[0];
      expect(primary.licence).toBe("CC0-1.0");
      expect(primary.method).toBe("public-api");
      expect(primary.url).toContain(`wikidata.org/wiki/${venue.qid}`);
    }
  });

  it("marks every record with the retrieval date and a wikidata id", () => {
    for (const venue of dataset.venues) {
      expect(venue.qid).toMatch(/^Q\d+$/);
      expect(Number.isNaN(Date.parse(venue.retrievedAt))).toBe(false);
    }
  });
});
