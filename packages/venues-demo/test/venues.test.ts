import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sectionAvailability, validate, venueBounds } from "@venue-seats/core";
import { DEMO_DISCLAIMER, DEMO_VENUES } from "../src/index";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const venuesDir = join(repoRoot, "packages/venues-demo/venues");

describe("demo venues", () => {
  it("contains 5 venues, all marked demo with a stage", () => {
    expect(DEMO_VENUES.length).toBe(5);
    for (const v of DEMO_VENUES) {
      expect(v.provenance).toBe("demo");
      expect(v.stage).toBeTruthy();
      expect(v.priceTiers.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("passes core validation and has unique ids", () => {
    for (const v of DEMO_VENUES) {
      expect(validate(v), v.venue.id).toEqual([]);
      const sectionIds = new Set<string>();
      const seatIds = new Set<string>();
      for (const l of v.levels) {
        for (const s of l.sections) {
          expect(sectionIds.has(s.id), `dup section ${s.id} in ${v.venue.id}`).toBe(false);
          sectionIds.add(s.id);
          for (const r of s.rows) for (const seat of r.seats) {
            expect(seatIds.has(seat.id), `dup seat ${seat.id} in ${v.venue.id}`).toBe(false);
            seatIds.add(seat.id);
          }
        }
      }
    }
  });

  it("has plausible sizes and sold inventory for every level", () => {
    for (const v of DEMO_VENUES) {
      for (const l of v.levels) {
        let total = 0;
        let sold = 0;
        for (const s of l.sections) {
          const a = sectionAvailability(s);
          total += a.total;
          sold += a.total - a.available;
        }
        expect(total, `${v.venue.id}/${l.id}`).toBeGreaterThan(200);
        expect(sold, `${v.venue.id}/${l.id} should have sold seats`).toBeGreaterThan(0);
      }
      // bounds must be finite and non-degenerate for the fit logic
      const b = venueBounds(v)!;
      expect(b.maxX - b.minX).toBeGreaterThan(300);
      expect(b.maxY - b.minY).toBeGreaterThan(200);
    }
  });

  it("every section references a known price tier", () => {
    for (const v of DEMO_VENUES) {
      const tiers = new Set(v.priceTiers.map((t) => t.id));
      for (const l of v.levels) for (const s of l.sections) {
        expect(tiers.has(s.priceTierId), `${s.id} tier ${s.priceTierId}`).toBe(true);
      }
    }
  });

  it("seat level tiers and row ids stay unique and resolvable", () => {
    for (const v of DEMO_VENUES) {
      const tiers = new Set(v.priceTiers.map((t) => t.id));
      const rowIds = new Set<string>();
      for (const l of v.levels)
        for (const s of l.sections)
          for (const r of s.rows) {
            expect(rowIds.has(r.id), `dup row ${r.id} in ${v.venue.id}`).toBe(false);
            rowIds.add(r.id);
            for (const seat of r.seats) {
              if (seat.priceTierId === undefined) continue;
              expect(tiers.has(seat.priceTierId), `${seat.id} tier ${seat.priceTierId}`).toBe(true);
            }
          }
    }
  });

  it("exports the disclaimer used in UI copy", () => {
    expect(DEMO_DISCLAIMER).toContain("示意");
  });

  it("regenerates byte-identical documents from scripts/gen-venues.mjs", () => {
    // The generator writes next to itself, so run a copy in a temp dir: the
    // repo must never be rewritten by a test.
    const tmp = mkdtempSync(join(tmpdir(), "venue-gen-"));
    try {
      cpSync(join(repoRoot, "scripts/gen-venues.mjs"), join(tmp, "scripts/gen-venues.mjs"));
      execFileSync(process.execPath, [join(tmp, "scripts/gen-venues.mjs")], { stdio: "pipe" });
      const outDir = join(tmp, "packages/venues-demo/venues");
      const generated = readdirSync(outDir).sort();
      expect(generated).toEqual(readdirSync(venuesDir).sort());
      for (const file of generated) {
        expect(readFileSync(join(outDir, file), "utf8"), file).toBe(
          readFileSync(join(venuesDir, file), "utf8"),
        );
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
