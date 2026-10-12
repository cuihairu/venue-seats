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
      for (const row of sec.rows ?? []) {
        for (const seat of row.seats ?? []) {
          if (!seat.id) errors.push(`seat in row ${row.id} of section ${sec.id} is missing id`);
          if (!["available", "selected", "sold", "held"].includes(seat.status))
            errors.push(`seat ${seat.id} has invalid status "${seat.status}"`);
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

/**
 * Toggle a seat's selection. Sold/held seats cannot be selected.
 * Returns the seat with the new status (immutably).
 */
export function toggleSelect(seat: Seat): Seat {
  if (seat.status === "sold" || seat.status === "held") return seat;
  return { ...seat, status: seat.status === "selected" ? "available" : "selected" };
}
