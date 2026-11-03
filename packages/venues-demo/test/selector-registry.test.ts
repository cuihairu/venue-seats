import { describe, expect, it } from "vitest";
import { DEMO_VENUES } from "../src/index";
import { VENUES } from "../../../apps/demo/src/venues";

/**
 * The demo selector in apps/demo/src/venues.ts hand-copies id/name/city/
 * provenance into a registry, while the venue cards read the loaded JSON.
 * Those two sources must never drift: every registry entry has to match the
 * metadata of the document its lazy loader actually returns.
 */
describe("demo selector registry matches the venue documents", () => {
  it("covers the same venue set as the demo package", () => {
    // the registry is the UI's selector; the demo package ships the demo JSON
    const registryIds = new Set(VENUES.map((v) => v.id));
    for (const v of DEMO_VENUES) {
      expect(registryIds.has(v.venue.id), v.venue.id).toBe(true);
    }
  });

  it("copies id/name/city/provenance faithfully from the loaded documents", async () => {
    for (const entry of VENUES) {
      const doc = await entry.load();
      expect(entry.id, entry.id).toBe(doc.venue.id);
      expect(entry.name, entry.id).toBe(doc.venue.name);
      expect(entry.city, entry.id).toBe(doc.venue.city);
      expect(entry.provenance, entry.id).toBe(doc.provenance);
    }
  });
});
