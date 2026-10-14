import { describe, expect, it } from "vitest";
import {
  levelBounds,
  levelById,
  priceTierOf,
  rowAt,
  rowAvailability,
  seatAt,
  sectionAt,
  sectionAvailability,
  sectionColor,
  toggleSelect,
  validate,
  venueBounds,
  type VenueDocument,
} from "../src/index";

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
            {
              id: "r2",
              label: "2 排",
              seats: [
                { id: "s1-r2-1", label: "1 号", x: 50, y: 150, status: "available" },
                { id: "s1-r2-2", label: "2 号", x: 80, y: 150, status: "held" },
                { id: "s1-r2-3", label: "3 号", x: 110, y: 150, status: "available" },
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
  it("rejects a section referencing an unknown price tier", () => {
    const broken = structuredClone(doc);
    broken.levels[0].sections[0].priceTierId = "nope";
    expect(validate(broken).some((e) => e.includes("unknown priceTierId"))).toBe(true);
  });
  it("rejects a seat referencing an unknown price tier", () => {
    const broken = structuredClone(doc);
    broken.levels[0].sections[0].rows[0].seats[0].priceTierId = "nope";
    expect(validate(broken).some((e) => e.includes("unknown priceTierId"))).toBe(true);
  });
  it("rejects a section polygon with fewer than 3 points", () => {
    const broken = structuredClone(doc);
    broken.levels[0].sections[0].polygon = [[0, 0], [10, 10]] as never;
    expect(validate(broken).some((e) => e.includes("at least 3 points"))).toBe(true);
  });
  it("rejects anything that is not an object", () => {
    expect(validate(null)).toEqual(["document must be an object"]);
    expect(validate("nope")).toEqual(["document must be an object"]);
  });
  it("requires schemaVersion, venue and an array of price tiers", () => {
    const errors = validate({ levels: [{ id: "l1", sections: [] }] });
    expect(errors).toEqual(["schemaVersion is required", "venue is required", "priceTiers must be an array"]);
    expect(validate({ ...doc, venue: undefined })).toContain("venue is required");
    expect(validate({ ...doc, priceTiers: "none" })).toContain("priceTiers must be an array");
  });
  it("rejects a schema version it does not know", () => {
    expect(validate({ ...doc, schemaVersion: "2" })).toEqual([
      'unsupported schemaVersion "2", expected "1"',
    ]);
    // an empty version keeps its own dedicated error
    expect(validate({ ...doc, schemaVersion: "" })).toEqual(["schemaVersion is required"]);
  });
  it("rejects a price tier without id or colour", () => {
    expect(validate({ ...doc, priceTiers: [{ id: "t1" }] as never }).some((e) => e.includes("needs id and color"))).toBe(true);
    expect(validate({ ...doc, priceTiers: [{ color: "#fff" }] as never }).some((e) => e.includes("needs id and color"))).toBe(
      true,
    );
  });
  it("rejects missing level, section and seat ids", () => {
    expect(validate({ ...doc, levels: [{ id: "", sections: [] }] }).some((e) => e.includes("level.id"))).toBe(true);
    const noSectionId = structuredClone(doc);
    noSectionId.levels[0].sections[0].id = "";
    expect(validate(noSectionId).some((e) => e.includes("is missing id"))).toBe(true);
    const noSeatId = structuredClone(doc);
    noSeatId.levels[0].sections[0].rows[0].seats[0].id = "";
    expect(validate(noSeatId).some((e) => e.includes("is missing id"))).toBe(true);
  });
});

describe("optional field fallbacks", () => {
  // documents in the wild may omit nested collections; every reader must
  // degrade to "no rows / no sections" instead of throwing
  it("validates a level without sections", () => {
    expect(validate({ ...doc, levels: [{ id: "l1" } as never] })).toEqual([]);
  });

  it("validates sections and rows without ids, rows or seats", () => {
    const errors = validate({
      ...doc,
      levels: [
        {
          id: "l1",
          sections: [
            { polygon: [], priceTierId: "nope" }, // no id -> "?" in both messages
            { id: "s3", polygon: [[0, 0], [1, 0], [1, 1]], rows: [{ id: "r1" }] },
            { id: "s4", polygon: [[0, 0], [1, 0], [1, 1]], rows: [{ id: "r2", seats: [{ status: "x" }] }] },
          ],
        },
      ],
    });
    expect(errors.filter((e) => e.startsWith("section "))).toEqual([
      "section in level l1 is missing id",
      "section ? polygon needs at least 3 points",
      'section ? references unknown priceTierId "nope"',
    ]);
    // s3 omits rows and s4 omits seats: no crash, and the only complaints are
    // about the seat objects s4 does supply
    expect(errors).toContain("seat in row r2 of section s4 is missing id");
    expect(errors).toContain('seat undefined has invalid status "x"');
  });

  it("bounds a level whose sections omit rows and seats", () => {
    expect(levelBounds({ id: "l1", sections: [{ polygon: [[0, 0], [10, 0], [10, 10]], rows: undefined } as never] })).toEqual(
      { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    );
    expect(
      levelBounds({
        id: "l1",
        sections: [
          { polygon: [[0, 0], [10, 0], [10, 10]], rows: [{ id: "r", seats: undefined, label: "" } as never] },
        ],
      }),
    ).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 });
  });

  it("bounds a level and a document without sections or levels", () => {
    expect(levelBounds({ id: "empty" } as never)).toBeUndefined();
    // without levels only the stage bounds the venue
    expect(venueBounds({ ...doc, levels: undefined } as never)).toEqual({ minX: 500, minY: 900, maxX: 500, maxY: 900 });
    expect(venueBounds({ ...doc, levels: [{ id: "l1" } as never], stage: undefined })).toBeUndefined();
  });

  it("hit-tests sections without rows or with rows without seats", () => {
    const section = doc.levels[0].sections[0];
    expect(rowAt({ ...section, rows: undefined } as never, 60, 55)).toBeUndefined();
    expect(seatAt({ ...section, rows: undefined } as never, 50, 50)).toBeUndefined();
    expect(rowAt({ ...section, rows: [{ id: "r", seats: undefined }] } as never, 60, 55)).toBeUndefined();
    expect(seatAt({ ...section, rows: [{ id: "r", seats: undefined }] } as never, 50, 50)).toBeUndefined();
  });
});

describe("levelById", () => {
  it("finds a level by id and misses unknown ids", () => {
    expect(levelById(doc, doc.levels[0].id)?.id).toBe(doc.levels[0].id);
    expect(levelById(doc, "nope")).toBeUndefined();
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

describe("geometry helpers", () => {
  const level = doc.levels[0];
  const section = level.sections[0];

  it("computes level and venue bounds", () => {
    expect(levelBounds(level)).toEqual({ minX: 0, minY: 0, maxX: 300, maxY: 200 });
    const vb = venueBounds(doc);
    expect(vb?.minX).toBe(0);
    expect(vb?.maxX).toBe(500); // stage x
    expect(vb?.maxY).toBe(900); // stage y
  });

  it("finds the nearest row to a point", () => {
    expect(rowAt(section, 60, 55)?.id).toBe("r1");
    expect(rowAt(section, 60, 145)?.id).toBe("r2");
    expect(rowAt(section, 60, 1000)).toBeUndefined();
  });

  it("finds the nearest seat to a point within the hit radius", () => {
    expect(seatAt(section, 50, 50)?.id).toBe("s1-r1-1");
    expect(seatAt(section, 110, 150)?.id).toBe("s1-r2-3");
    // 15 units from the seat at (80,50), closer than anything else
    expect(seatAt(section, 95, 50, 20)?.id).toBe("s1-r1-2");
  });

  it("returns no seat outside the hit radius", () => {
    expect(seatAt(section, 200, 100)).toBeUndefined();
    // 5 units from the seat at (50,50): outside the default radius, inside a custom one
    expect(seatAt(section, 55, 50)).toBeUndefined();
    expect(seatAt(section, 55, 50, 10)?.id).toBe("s1-r1-1");
  });

  it("ignores a section without seats", () => {
    expect(seatAt({ ...section, rows: [] }, 50, 50)).toBeUndefined();
    expect(seatAt({ ...section, rows: [{ id: "r", seats: undefined }] } as never, 50, 50)).toBeUndefined();
  });

  it("skips rows without seats when finding the nearest row", () => {
    const withEmpty = { ...section, rows: [{ id: "empty", seats: [] }, ...section.rows] };
    expect(rowAt(withEmpty, 60, 55)?.id).toBe("r1");
    expect(rowAt({ ...section, rows: [{ id: "empty", seats: [] }] }, 60, 55)).toBeUndefined();
  });

  it("falls back to a neutral colour for an unrecognised tier", () => {
    expect(sectionColor(doc, { ...section, priceTierId: undefined })).toBe("#64748b");
    expect(sectionColor(doc, { ...section, priceTierId: "nope" })).toBe("#64748b");
  });

  it("bounds ignore the stage when the venue has none", () => {
    const noStage = { ...doc, stage: undefined };
    expect(venueBounds(noStage)).toEqual({ minX: 0, minY: 0, maxX: 300, maxY: 200 });
    expect(levelBounds({ id: "empty", sections: [] })).toBeUndefined();
  });

  it("counts an empty row as zero seats", () => {
    expect(rowAvailability({ id: "r", seats: undefined } as never)).toEqual({ total: 0, available: 0 });
    expect(sectionAvailability({ ...section, rows: undefined } as never)).toEqual({ total: 0, available: 0 });
  });

  it("counts availability per row and section", () => {
    expect(rowAvailability(section.rows[0])).toEqual({ total: 2, available: 1 });
    expect(rowAvailability(section.rows[1])).toEqual({ total: 3, available: 2 });
    expect(sectionAvailability(section)).toEqual({ total: 5, available: 3 });
  });

  it("resolves price tiers and section colours", () => {
    expect(priceTierOf(doc, "t1")?.name).toBe("内场");
    expect(priceTierOf(doc, "nope")).toBeUndefined();
    expect(sectionColor(doc, section)).toBe("#1E88E5");
  });
});
