/**
 * venue-seats core: data model, validation, geometry helpers.
 * Rendering-agnostic — React/Vue/Flutter all consume this JSON model.
 */

export type SeatStatus = "available" | "selected" | "sold" | "held";

export interface Stage {
  /** stage centre in venue coordinates */
  x: number;
  y: number;
  /** degrees clockwise; 0 means stage faces +y */
  rotation: number;
  /** optional drawn footprint in venue units; renderers default these */
  w?: number;
  h?: number;
}

export interface Seat {
  id: string;
  label: string;
  x: number;
  y: number;
  status: SeatStatus;
  priceTierId?: string;
}

export interface Row {
  id: string;
  label: string;
  seats: Seat[];
}

export interface Section {
  id: string;
  name: string;
  /** polygon outline in venue coordinates, >= 3 points */
  polygon: [number, number][];
  priceTierId?: string;
  rows: Row[];
}

export interface Level {
  id: string;
  name: string;
  sections: Section[];
}

export interface PriceTier {
  id: string;
  name: string;
  /** css colour used by renderers */
  color: string;
  price?: number;
}

export interface Venue {
  id: string;
  name: string;
  city?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface VenueDocument {
  /** schema version, e.g. "1" */
  schemaVersion: string;
  venue: Venue;
  stage?: Stage;
  priceTiers: PriceTier[];
  levels: Level[];
  /**
   * demo fixtures rebuilt from public layout info are labelled "demo";
   * they are NOT guaranteed to match the real venue.
   */
  provenance?: "official" | "demo";
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * L1 selection unit: a section, optionally narrowed to one of its rows.
 * Selection state is client-local; renderers treat it as controlled input.
 */
export interface RowSelection {
  sectionId: string;
  rowId?: string;
}

export interface Availability {
  total: number;
  available: number;
}

/** minimal structural validation; returns a list of human-readable errors */
export function validate(doc: unknown): string[] {
  const errors: string[] = [];
  if (!doc || typeof doc !== "object") return ["document must be an object"];
  const d = doc as Partial<VenueDocument>;
  if (!d.schemaVersion) errors.push("schemaVersion is required");
  if (!d.venue || typeof d.venue !== "object") errors.push("venue is required");
  else if (!d.venue.id) errors.push("venue.id is required");
  if (!Array.isArray(d.priceTiers)) errors.push("priceTiers must be an array");
  else for (const t of d.priceTiers) if (!t.id || !t.color) errors.push(`price tier ${JSON.stringify(t)} needs id and color`);
  const tierIds = new Set((Array.isArray(d.priceTiers) ? d.priceTiers : []).filter((t) => t && t.id).map((t) => t.id));
  if (!Array.isArray(d.levels) || d.levels.length === 0) {
    errors.push("levels must be a non-empty array");
    return errors;
  }
  for (const level of d.levels) {
    if (!level.id) errors.push("level.id is required");
    for (const sec of level.sections ?? []) {
      if (!sec.id) errors.push(`section in level ${level.id} is missing id`);
      if (!Array.isArray(sec.polygon) || sec.polygon.length < 3)
        errors.push(`section ${sec.id || "?"} polygon needs at least 3 points`);
      if (sec.priceTierId && !tierIds.has(sec.priceTierId))
        errors.push(`section ${sec.id || "?"} references unknown priceTierId "${sec.priceTierId}"`);
      for (const row of sec.rows ?? []) {
        for (const seat of row.seats ?? []) {
          if (!seat.id) errors.push(`seat in row ${row.id} of section ${sec.id} is missing id`);
          if (!["available", "selected", "sold", "held"].includes(seat.status))
            errors.push(`seat ${seat.id} has invalid status "${seat.status}"`);
          if (seat.priceTierId && !tierIds.has(seat.priceTierId))
            errors.push(`seat ${seat.id} references unknown priceTierId "${seat.priceTierId}"`);
        }
      }
    }
  }
  return errors;
}

/** ray-casting point-in-polygon test */
export function pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** which section contains the given venue coordinate, if any */
export function sectionAt(level: Level, x: number, y: number): Section | undefined {
  return level.sections.find((s) => pointInPolygon(x, y, s.polygon));
}

/** bounding box over every point of the given coordinate pairs */
export function boundsOf(points: Iterable<[number, number]>): Bounds | undefined {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return minX === Infinity ? undefined : { minX, minY, maxX, maxY };
}

function sectionPoints(s: Section): [number, number][] {
  const pts: [number, number][] = [...s.polygon];
  for (const row of s.rows ?? []) for (const seat of row.seats ?? []) pts.push([seat.x, seat.y]);
  return pts;
}

/** bounding box of a level's sections, polygons and seats */
export function levelBounds(level: Level): Bounds | undefined {
  const pts: [number, number][] = [];
  for (const s of level.sections ?? []) pts.push(...sectionPoints(s));
  return boundsOf(pts);
}

/** bounding box across every level of the document */
export function venueBounds(doc: VenueDocument): Bounds | undefined {
  const pts: [number, number][] = [];
  for (const level of doc.levels ?? [])
    for (const s of level.sections ?? []) pts.push(...sectionPoints(s));
  if (doc.stage) pts.push([doc.stage.x, doc.stage.y]);
  return boundsOf(pts);
}

export function levelById(doc: VenueDocument, levelId: string): Level | undefined {
  return doc.levels.find((l) => l.id === levelId);
}

export function priceTierOf(doc: VenueDocument, tierId: string | undefined): PriceTier | undefined {
  return doc.priceTiers.find((t) => t.id === tierId);
}

/** colour for a section: its own tier, else a fallback */
export function sectionColor(doc: VenueDocument, section: Section): string {
  return priceTierOf(doc, section.priceTierId)?.color ?? "#64748b";
}

/** nearest row to a venue coordinate inside a section (used for row hit-testing) */
export function rowAt(section: Section, x: number, y: number, maxDistance = 40): Row | undefined {
  let best: Row | undefined;
  let bestDist = maxDistance;
  for (const row of section.rows ?? []) {
    const seats = row.seats ?? [];
    if (seats.length === 0) continue;
    let sx = 0,
      sy = 0;
    for (const s of seats) {
      sx += s.x;
      sy += s.y;
    }
    const d = Math.hypot(sx / seats.length - x, sy / seats.length - y);
    if (d < bestDist) {
      bestDist = d;
      best = row;
    }
  }
  return best;
}

/**
 * Nearest seat to a venue coordinate inside a section, within `hitRadius`
 * venue units. Used for per-seat (L2) hit-testing; renderers pass their own
 * `seatRadius` so a click only lands on a seat that is actually drawn.
 */
export function seatAt(section: Section, x: number, y: number, hitRadius = 3.4): Seat | undefined {
  let best: Seat | undefined;
  let bestDist = hitRadius;
  for (const row of section.rows ?? []) {
    for (const seat of row.seats ?? []) {
      const d = Math.hypot(seat.x - x, seat.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = seat;
      }
    }
  }
  return best;
}

/** available vs total seat count of a row */
export function rowAvailability(row: Row): Availability {
  const seats = row.seats ?? [];
  return {
    total: seats.length,
    available: seats.filter((s) => s.status === "available" || s.status === "selected").length,
  };
}

/** available vs total seat count of a section */
export function sectionAvailability(section: Section): Availability {
  let total = 0,
    available = 0;
  for (const row of section.rows ?? []) {
    const a = rowAvailability(row);
    total += a.total;
    available += a.available;
  }
  return { total, available };
}

/**
 * Toggle a seat's selection. Sold/held seats cannot be selected.
 * Returns the seat with the new status (immutably).
 */
export function toggleSelect(seat: Seat): Seat {
  if (seat.status === "sold" || seat.status === "held") return seat;
  return { ...seat, status: seat.status === "selected" ? "available" : "selected" };
}
