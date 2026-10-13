import { levelBounds, type Bounds, type Level, type Stage } from "@venue-seats/core";

/** svg viewBox state: {x,y} is the top-left corner in venue coordinates */
export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** display bounds of a level: sections, seats and the stage footprint */
export function levelDisplayBounds(level: Level, stage?: Stage): Bounds {
  const b = levelBounds(level) ?? { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  if (stage) {
    const hw = (stage.w ?? 240) / 2;
    const hh = (stage.h ?? 48) / 2;
    b.minX = Math.min(b.minX, stage.x - hw);
    b.minY = Math.min(b.minY, stage.y - hh);
    b.maxX = Math.max(b.maxX, stage.x + hw);
    b.maxY = Math.max(b.maxY, stage.y + hh);
  }
  return b;
}

/** smallest viewBox that contains `bounds` inside an element of elW x elH px */
export function fitViewBox(bounds: Bounds, elW: number, elH: number, padRatio = 0.05): ViewBox {
  const padX = (bounds.maxX - bounds.minX) * padRatio;
  const padY = (bounds.maxY - bounds.minY) * padRatio;
  const bw = bounds.maxX - bounds.minX + padX * 2;
  const bh = bounds.maxY - bounds.minY + padY * 2;
  const scale = Math.min(elW / bw, elH / bh); // px per venue unit
  const w = elW / scale;
  const h = elH / scale;
  // centre the content (preserveAspectRatio="xMidYMid meet" behaviour)
  return {
    x: (bounds.minX + bounds.maxX) / 2 - w / 2,
    y: (bounds.minY + bounds.maxY) / 2 - h / 2,
    w,
    h,
  };
}

/**
 * Zoom the viewBox by `factor` around a pivot given in venue coordinates.
 * Keeps the viewBox aspect ratio and clamps the scale against `fitW`.
 */
export function zoomViewBox(vb: ViewBox, factor: number, pivotX: number, pivotY: number, minW: number, maxW: number): ViewBox {
  const w = clamp(vb.w / factor, minW, maxW);
  const h = (vb.h / vb.w) * w;
  const kx = (pivotX - vb.x) / vb.w; // 0..1 pivot position
  const ky = (pivotY - vb.y) / vb.h;
  return { w, h, x: pivotX - kx * w, y: pivotY - ky * h };
}

export function polygonCentroid(polygon: [number, number][]): [number, number] {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of polygon) {
    sx += x;
    sy += y;
  }
  return [sx / polygon.length, sy / polygon.length];
}

export function polygonPath(polygon: [number, number][]): string {
  let d = "";
  polygon.forEach(([x, y], i) => {
    d += `${i === 0 ? "M" : "L"}${x} ${y}`;
  });
  return d + "Z";
}
