import { describe, expect, it } from "vitest";
import { sectionAt, toggleSelect, validate, type VenueDocument } from "../src/index";

const doc: VenueDocument = {
  schemaVersion: "1",
  venue: { id: "demo-olympic", name: "示例·市体育中心", city: "上海" },
  provenance: "demo",
  stage: { x: 500, y: 900, rotation: 180 },
  priceTiers: [
    { id: "t1", name: "内场", color: "#E53935", price: 1280 },
    { id: "t2", name: "看台", color: "#1E88E5", price: 680 },
  ],
  levels: [
    {
      id: "l1",
      name: "看台层",
      sections: [
        {
          id: "s1",
          name: "A 区",
          polygon: [
            [0, 0],
            [300, 0],
            [300, 200],
            [0, 200],
          ],
          priceTierId: "t2",
          rows: [
            {
              id: "r1",
              label: "1 排",
              seats: [
                { id: "s1-r1-1", label: "1 号", x: 50, y: 50, status: "available" },
                { id: "s1-r1-2", label: "2 号", x: 80, y: 50, status: "sold" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("validate", () => {
  it("accepts the demo fixture", () => {
    expect(validate(doc)).toEqual([]);
  });
  it("rejects a missing venue id", () => {
    const broken = { ...doc, venue: { ...doc.venue, id: "" } };
    expect(validate(broken).some((e) => e.includes("venue.id"))).toBe(true);
  });
  it("rejects a bad seat status", () => {
    const broken = structuredClone(doc);
    broken.levels[0].sections[0].rows[0].seats[0].status = "nope" as never;
    expect(validate(broken).some((e) => e.includes("invalid status"))).toBe(true);
  });
  it("rejects an empty level list", () => {
    expect(validate({ ...doc, levels: [] })).not.toEqual([]);
  });
});

describe("sectionAt", () => {
  it("finds the section under a point", () => {
    const level = doc.levels[0];
    expect(sectionAt(level, 100, 100)?.id).toBe("s1");
    expect(sectionAt(level, 400, 100)).toBeUndefined();
  });
});

describe("toggleSelect", () => {
  it("selects an available seat", () => {
    const seat = doc.levels[0].sections[0].rows[0].seats[0];
    expect(toggleSelect(seat).status).toBe("selected");
    expect(toggleSelect(toggleSelect(seat)).status).toBe("available");
  });
  it("never re-selects a sold seat", () => {
    const seat = doc.levels[0].sections[0].rows[0].seats[1];
    expect(toggleSelect(seat).status).toBe("sold");
  });
});
