#!/usr/bin/env node
/**
 * Generates the demo venue documents (provenance "demo"/示意).
 *
 * The venues are REBUILT FROM PUBLIC LAYOUT INFORMATION (capacity, tier count,
 * bowl shape, stage position). They are deliberately simplified and are NOT
 * verified against the real venues — no official seat chart is bundled,
 * scraped or copied. Deterministic: same seed, same output.
 *
 * Usage: node scripts/gen-venues.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "venues-demo", "venues");

// ---------- deterministic rng ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n) => Math.round(n * 10) / 10;
const pt = (x, y) => [r1(x), r1(y)];
const lerp = (a, b, f) => a + (b - a) * f;
const DEG = Math.PI / 180;

// ---------- shared tier sets (concert config) ----------
// tier ids are stable across venues so renderers/legend code stays uniform
const TIERS = {
  vip: { id: "vip", name: "内场 VIP", color: "#ff4d6d" },
  floorA: { id: "floor-a", name: "内场 A", color: "#ff9f43" },
  lower: { id: "lower", name: "看台下层", color: "#4d8dff" },
  upper: { id: "upper", name: "看台上层", color: "#2ec4b6" },
  top: { id: "top", name: "山顶", color: "#9b5de5" },
  backstage: { id: "backstage", name: "工作区", color: "#64748b" },
};

function tierList(p) {
  return [
    { ...TIERS.vip, price: p.vip },
    { ...TIERS.floorA, price: p.floorA },
    { ...TIERS.lower, price: p.lower },
    { ...TIERS.upper, price: p.upper },
    { ...TIERS.top, price: p.top },
    { ...TIERS.backstage }, // not for sale
  ];
}

// ellipse point, y grows downward (svg style); t=0 right, PI/2 bottom
function ePoint(cx, cy, rx, ry, t) {
  return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
}

function arcPoints(cx, cy, rx, ry, t0, t1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(ePoint(cx, cy, rx, ry, lerp(t0, t1, i / n)));
  return pts;
}

function arcLength(rx, ry, t0, t1, n = 80) {
  let len = 0;
  let prev = ePoint(0, 0, rx, ry, t0);
  for (let i = 1; i <= n; i++) {
    const p = ePoint(0, 0, rx, ry, lerp(t0, t1, i / n));
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return len;
}

/** seats along an elliptical arc, evenly spaced by arc length */
function seatsOnArc(cx, cy, rx, ry, t0, t1, spacing, aisleEvery) {
  const L = arcLength(rx, ry, t0, t1);
  const count = Math.max(2, Math.floor(L / spacing));
  const seats = [];
  for (let i = 0; i < count; i++) {
    // aisle gap every few seats
    if (aisleEvery && count > aisleEvery && i % aisleEvery === aisleEvery - 1) continue;
    const t = t0 + ((i + 0.5) * (t1 - t0)) / count;
    const [x, y] = ePoint(cx, cy, rx, ry, t);
    seats.push({ x: r1(x), y: r1(y) });
  }
  return seats;
}

/** status painting ------------------------------------------------------- */

function scatterSold(seats, rng, ratio, clusterBoost = 0.35) {
  let hot = 0;
  for (const s of seats) {
    if (s.status && s.status !== "available") continue; // already decided (held/sold)
    const p = ratio + hot * clusterBoost + (rng() - 0.5) * 0.12;
    if (rng() < p) {
      s.status = "sold";
      hot = Math.min(1, hot + 0.22);
    } else {
      hot = Math.max(0, hot - 0.1);
    }
  }
}

function markAllSold(section) {
  for (const row of section.rows) for (const s of row.seats) s.status = "sold";
}

/** builders --------------------------------------------------------------- */

let seatSeq = 0;

/**
 * One section of an elliptical ring band. Rows run on lerped radii, row 1 is
 * the inner (field-side) edge. t0<t1; sections face the field.
 */
function ringSection({ cx, cy, rxIn, ryIn, depth, t0, t1, id, name, tierId, prefix, rows, spacing, rng, arcPts = 6 }) {
  const rxOut = rxIn + depth;
  const ryOut = ryIn + depth;
  const inner = arcPoints(cx, cy, rxIn, ryIn, t0, t1, arcPts);
  const outer = arcPoints(cx, cy, rxOut, ryOut, t0, t1, arcPts);
  const polygon = [...inner, ...outer.reverse()].map(([x, y]) => pt(x, y));
  const section = { id: `${prefix}-${id}`, name, polygon, priceTierId: tierId, rows: [] };
  const padT = Math.min(2.2 * DEG, (t1 - t0) * 0.055);
  for (let i = 0; i < rows; i++) {
    const f = (i + 0.5) / rows;
    const rx = lerp(rxIn + depth * 0.1, rxOut - depth * 0.12, f);
    const ry = lerp(ryIn + depth * 0.1, ryOut - depth * 0.12, f);
    const seats = seatsOnArc(cx, cy, rx, ry, t0 + padT, t1 - padT, spacing, 18);
    seats.forEach((s, j) => {
      s.id = `${prefix}-${id}-r${i + 1}-${j + 1}`;
      s.label = `${j + 1}号`;
      s.status ??= "available";
    });
    section.rows.push({ id: `${prefix}-${id}-r${i + 1}`, label: `${i + 1}排`, seats });
  }
  return section;
}

/**
 * One trapezoid section of a straight-sided bowl. a,b = inner edge (left to
 * right seen from the field); c,d = outer edge directly "behind" b,a.
 */
function straightSection({ a, b, c, d, id, name, tierId, prefix, rows, spacing, rng, aisleEvery = 16 }) {
  const polygon = [pt(a[0], a[1]), pt(b[0], b[1]), pt(d[0], d[1]), pt(c[0], c[1])];
  const section = { id: `${prefix}-${id}`, name, polygon, priceTierId: tierId, rows: [] };
  for (let i = 0; i < rows; i++) {
    const f = lerp(0.12, 0.88, (i + 0.5) / rows);
    const p0 = [lerp(a[0], c[0], f), lerp(a[1], c[1], f)];
    const p1 = [lerp(b[0], d[0], f), lerp(b[1], d[1], f)];
    const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const count = Math.max(2, Math.floor((L - spacing) / spacing));
    const seats = [];
    for (let j = 0; j < count; j++) {
      if (aisleEvery && count > aisleEvery && j % aisleEvery === aisleEvery - 1) continue;
      const g = ((j + 0.5) * L) / count;
      seats.push({
        x: r1(lerp(p0[0], p1[0], g / L)),
        y: r1(lerp(p0[1], p1[1], g / L)),
        id: `${prefix}-${id}-r${i + 1}-${j + 1}`,
        label: `${j + 1}号`,
        status: "available",
      });
    }
    section.rows.push({ id: `${prefix}-${id}-r${i + 1}`, label: `${i + 1}排`, seats });
  }
  return section;
}

/** rectangular floor block, row 1 nearest the stage (bottom edge y1) */
function floorBlock({ x0, x1, y0, y1, id, tierId, prefix, rows, spacing, rng }) {
  const section = {
    id: `${prefix}-floor-${id}`,
    name: `内场${id}`,
    polygon: [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)],
    priceTierId: tierId,
    rows: [],
  };
  const H = y1 - y0;
  const W = x1 - x0;
  for (let i = 0; i < rows; i++) {
    const y = y1 - ((i + 0.5) * H) / rows;
    const count = Math.max(2, Math.floor((W - spacing) / spacing));
    const seats = [];
    for (let j = 0; j < count; j++) {
      if (count > 14 && j % 16 === 15) continue; // centre aisle
      seats.push({
        x: r1(x0 + ((j + 0.5) * W) / count),
        y: r1(y),
        id: `${prefix}-floor-${id}-r${i + 1}-${j + 1}`,
        label: `${j + 1}号`,
        status: "available",
      });
    }
    section.rows.push({ id: `${prefix}-floor-${id}-r${i + 1}`, label: `${i + 1}排`, seats });
  }
  return section;
}

/** pricing by centrality: angle distance from "directly opposite the stage" */
const OPPOSITE = 1.5 * Math.PI; // top of the map, farthest from stage
function angleFromOpposite(mid) {
  const d = Math.abs(((mid - OPPOSITE + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  return d; // 0 = opposite stage, PI = behind stage
}

function tierForRing(mid, ring) {
  if (ring.kind === "lower") return TIERS.lower.id;
  // upper ring: direct-view sections vs far "mountain top" corners
  return angleFromOpposite(mid) < 75 * DEG ? TIERS.upper.id : TIERS.top.id;
}

/** assemble one elliptical-bowl stadium (concert config) */
function ovalStadium(opts) {
  const {
    seed, venue, prices, W, H, rings, // rings: [{rxIn, ryIn, depth, sections, rows, gap}]
    stage, // {w, h}
    floor, // {cols, deep, rows, x0f, x1f, y0f, y1f}
  } = opts;
  const rng = mulberry32(seed);
  const cx = W / 2;
  const cy = H / 2;
  const prefix = venue.id;
  const levels = [];
  const STAGE_ARC = stage.arc * DEG; // blocked arc at the bottom (behind stage)

  for (const ring of rings) {
    const sections = [];
    const step = (Math.PI * 2) / ring.sections;
    const gap = ring.gap * DEG;
    for (let i = 0; i < ring.sections; i++) {
      const t0 = i * step + gap / 2;
      const t1 = (i + 1) * step - gap / 2;
      const mid = (t0 + t1) / 2;
      // behind-stage arc? (bottom of the map)
      const behindStage = Math.abs(((mid - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < STAGE_ARC / 2;
      const tierId = behindStage ? TIERS.backstage.id : tierForRing(mid, ring);
      const letter = String.fromCharCode(65 + i);
      const name = behindStage ? `${letter}区（台后）` : `${letter}区`;
      const sec = ringSection({
        cx, cy, rxIn: ring.rxIn, ryIn: ring.ryIn, depth: ring.depth,
        t0, t1, id: letter, name, tierId, prefix: `${prefix}-${ring.kind}`,
        rows: ring.rows, spacing: ring.spacing, rng,
      });
      if (behindStage) markAllSold(sec);
      else if (ring.kind === "upper") scatterSold(sec.rows.flatMap((r) => r.seats), rng, 0.22);
      else scatterSold(sec.rows.flatMap((r) => r.seats), rng, 0.14);
      sections.push(sec);
    }
    levels.push({ id: `${prefix}-lv-${ring.kind}`, name: ring.kind === "upper" ? "看台上层" : "看台下层", sections });
  }

  // floor (pitch) blocks — front deep row nearest the stage = VIP
  const floorSections = [];
  const bw = (floor.x1f - floor.x0f) / floor.cols;
  const bd = (floor.y1f - floor.y0f) / floor.deep;
  for (let d = 0; d < floor.deep; d++) {
    for (let c = 0; c < floor.cols; c++) {
      const letter = String.fromCharCode(65 + d * floor.cols + c);
      const sec = floorBlock({
        x0: floor.x0f + c * bw + 8,
        x1: floor.x0f + (c + 1) * bw - 8,
        y0: floor.y0f + d * bd + 6,
        y1: floor.y0f + (d + 1) * bd - 6,
        id: letter,
        tierId: d === floor.deep - 1 ? TIERS.vip.id : TIERS.floorA.id,
        prefix,
        rows: floor.rows,
        spacing: floor.spacing,
        rng,
      });
      scatterSold(sec.rows.flatMap((r) => r.seats), rng, d === floor.deep - 1 ? 0.3 : 0.18);
      floorSections.push(sec);
    }
  }
  levels.unshift({ id: `${prefix}-lv-floor`, name: "内场", sections: floorSections });

  return {
    schemaVersion: "1",
    venue,
    provenance: "demo",
    stage: { x: r1(cx), y: r1(floor.y1f + stage.h / 2 + 14), rotation: 180, w: stage.w, h: stage.h },
    priceTiers: tierList(prices),
    levels,
  };
}

// ---------- octagonal arena bowl ----------

function octagon(W, H, chamfer, inset) {
  // returns 8 vertices, clockwise, starting top-left corner cut
  const pts = [
    [chamfer, inset],
    [W - chamfer, inset],
    [W - inset, chamfer],
    [W - inset, H - chamfer],
    [W - chamfer, H - inset],
    [chamfer, H - inset],
    [inset, H - chamfer],
    [inset, chamfer],
  ];
  return pts;
}

/** inset a convex polygon by moving each vertex towards the centroid */
function insetPolygon(pts, d) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, y]) => {
    const vx = x - cx, vy = y - cy;
    const len = Math.hypot(vx, vy);
    return [x - (vx / len) * d, y - (vy / len) * d];
  });
}

function arenaBowl(opts) {
  const { seed, venue, prices, W, H, chamfer, lowerDepth, upperDepth, edgeSections, upperEdgeSections, rowsLow, rowsUp, floor, stage } = opts;
  const rng = mulberry32(seed);
  const prefix = venue.id;
  const inner = octagon(W, H, chamfer, lowerDepth);
  const outerLow = octagon(W, H, chamfer, 0);
  const levels = [];

  function buildRing(idPrefix, kind, innerPts, outerPts, sectionCount, rows, name) {
    const sections = [];
    const N = innerPts.length;
    // edges: index 4 = bottom side (behind stage) — vertices order: 4-5 is bottom
    for (let e = 0; e < N; e++) {
      const a = innerPts[e];
      const b = innerPts[(e + 1) % N];
      const c = outerPts[(e + 1) % N];
      const d = outerPts[e];
      // split each edge into `sectionCount[e]` pieces with aisle gaps
      const parts = Array.isArray(sectionCount) ? sectionCount[e] : sectionCount;
      for (let p = 0; p < parts; p++) {
        const f0 = p / parts;
        const f1 = (p + 1) / parts;
        const P = (q0, q1, f) => [lerp(q0[0], q1[0], f), lerp(q0[1], q1[1], f)];
        // shrink to create aisles between pieces
        const s0 = lerp(f0, f1, 0.03);
        const s1 = lerp(f0, f1, 0.97);
        const A = P(a, b, s0), B = P(a, b, s1);
        const C = P(d, c, s0), D = P(d, c, s1);
        const mid = P(P(A, B, 0.5), P(C, D, 0.5), 0.5);
        const behindStage = Math.abs(mid[0] - W / 2) < stage.w / 2 + 60 && mid[1] > H * 0.8;
        const letter = String.fromCharCode(65 + e * 10 + p);
        const tierId = behindStage && kind === "lower" ? TIERS.backstage.id : tierForRingPoint(mid[0], mid[1], W, H, kind);
        const sec = straightSection({
          a: A, b: B, c: C, d: D,
          id: letter, name: behindStage && kind === "lower" ? `${letter}区（台后）` : `${letter}区`,
          tierId, prefix: `${prefix}-${idPrefix}`, rows, spacing: 13, rng,
        });
        sec.id = `${prefix}-${idPrefix}-${letter}`;
        for (const r of sec.rows) r.id = `${prefix}-${idPrefix}-${letter}-r${r.label.replace("排", "")}`;
        if (behindStage) markAllSold(sec); // decks behind the stage are closed
        else scatterSold(sec.rows.flatMap((r) => r.seats), rng, kind === "upper" ? 0.2 : 0.13);
        sections.push(sec);
      }
    }
    return { id: `${prefix}-${idPrefix}`, name, sections };
  }

  function tierForRingPoint(x, y, W_, H_, kind) {
    // centrality: distance from the point directly opposite the stage (top centre)
    const opposite = [W_ / 2, H_ * 0.12];
    const d = Math.hypot(x - opposite[0], y - opposite[1]) / Math.hypot(W_ / 2, H_ / 2);
    if (kind === "lower") return TIERS.lower.id;
    return d < 0.55 ? TIERS.upper.id : TIERS.top.id;
  }

  const outerUp = insetPolygon(outerLow, -(upperDepth));
  levels.push(buildRing("lv-lower", "lower", inner, outerLow, edgeSections, rowsLow, "看台下层"));
  levels.push(buildRing("lv-upper", "upper", insetPolygon(inner, -(lowerDepth + 26)), outerUp, upperEdgeSections, rowsUp, "看台上层"));

  // floor
  const floorSections = [];
  const bw = (floor.x1f - floor.x0f) / floor.cols;
  const bd = (floor.y1f - floor.y0f) / floor.deep;
  for (let dd = 0; dd < floor.deep; dd++) {
    for (let cc = 0; cc < floor.cols; cc++) {
      const letter = String.fromCharCode(65 + dd * floor.cols + cc);
      const sec = floorBlock({
        x0: floor.x0f + cc * bw + 7,
        x1: floor.x0f + (cc + 1) * bw - 7,
        y0: floor.y0f + dd * bd + 5,
        y1: floor.y0f + (dd + 1) * bd - 5,
        id: letter,
        tierId: dd === floor.deep - 1 ? TIERS.vip.id : TIERS.floorA.id,
        prefix,
        rows: floor.rows,
        spacing: floor.spacing,
        rng,
      });
      scatterSold(sec.rows.flatMap((r) => r.seats), rng, dd === floor.deep - 1 ? 0.3 : 0.18);
      floorSections.push(sec);
    }
  }
  levels.unshift({ id: `${prefix}-lv-floor`, name: "内场", sections: floorSections });

  return {
    schemaVersion: "1",
    venue,
    provenance: "demo",
    stage: { x: r1(W / 2), y: r1(floor.y1f + stage.h / 2 + 10), rotation: 180, w: stage.w, h: stage.h },
    priceTiers: tierList(prices),
    levels,
  };
}

// ---------- venue definitions (rebuilt from public info, simplified) ------

const venues = [];

// 1. National Stadium "Bird's Nest", Beijing — double-ring oval, ~80k (real);
//    simplified here to ~10k illustrative seats.
venues.push(
  ovalStadium({
    seed: 20261001,
    venue: { id: "demo-national-stadium", name: "国家体育场（鸟巢）", city: "北京", address: "朝阳区奥林匹克公园" },
    prices: { vip: 1680, floorA: 1280, lower: 880, upper: 580, top: 380 },
    W: 1240, H: 1000,
    rings: [
      { kind: "lower", rxIn: 385, ryIn: 285, depth: 132, sections: 22, rows: 16, gap: 3.4, spacing: 10.5 },
      { kind: "upper", rxIn: 545, ryIn: 445, depth: 108, sections: 26, rows: 12, gap: 3.2, spacing: 11 },
    ],
    stage: { w: 300, h: 56, arc: 46 },
    floor: { cols: 4, deep: 2, rows: 12, spacing: 13, x0f: 460, x1f: 780, y0f: 330, y1f: 560 },
  })
);

// 2. Shanghai Stadium — large oval, athletics bowl, ~72k (real).
venues.push(
  ovalStadium({
    seed: 20261002,
    venue: { id: "demo-shanghai-stadium", name: "上海体育场", city: "上海", address: "徐汇区天钥桥路666号" },
    prices: { vip: 1580, floorA: 1180, lower: 880, upper: 580, top: 380 },
    W: 1300, H: 980,
    rings: [
      { kind: "lower", rxIn: 420, ryIn: 300, depth: 128, sections: 24, rows: 15, gap: 3.0, spacing: 10.5 },
      { kind: "upper", rxIn: 576, ryIn: 456, depth: 100, sections: 28, rows: 11, gap: 2.8, spacing: 11 },
    ],
    stage: { w: 300, h: 56, arc: 42 },
    floor: { cols: 4, deep: 2, rows: 11, spacing: 13, x0f: 490, x1f: 810, y0f: 320, y1f: 540 },
  })
);

// 3. Mercedes-Benz Arena, Shanghai — indoor octagonal arena, ~18k (real).
venues.push(
  arenaBowl({
    seed: 20261003,
    venue: { id: "demo-mercedes-arena", name: "梅赛德斯-奔驰文化中心", city: "上海", address: "浦东新区世博大道1200号" },
    prices: { vip: 1680, floorA: 1280, lower: 880, upper: 580, top: 380 },
    W: 900, H: 720, chamfer: 190,
    lowerDepth: 92, upperDepth: 74,
    edgeSections: [2, 2, 1, 2, 2, 1, 2, 2],
    upperEdgeSections: [2, 3, 1, 3, 2, 1, 3, 2],
    rowsLow: 12, rowsUp: 9,
    stage: { w: 210, h: 48 },
    floor: { cols: 3, deep: 2, rows: 11, spacing: 13, x0f: 250, x1f: 650, y0f: 220, y1f: 505 },
  })
);

// 4. Cadillac Arena (Wukesong), Beijing — indoor arena, ~18k (real).
venues.push(
  arenaBowl({
    seed: 20261004,
    venue: { id: "demo-cadillac-arena", name: "凯迪拉克中心（五棵松）", city: "北京", address: "海淀区复兴路69号" },
    prices: { vip: 1680, floorA: 1280, lower: 880, upper: 580, top: 380 },
    W: 860, H: 680, chamfer: 170,
    lowerDepth: 88, upperDepth: 70,
    edgeSections: [2, 2, 1, 2, 2, 1, 2, 2],
    upperEdgeSections: [2, 3, 1, 3, 2, 1, 3, 2],
    rowsLow: 12, rowsUp: 9,
    stage: { w: 200, h: 46 },
    floor: { cols: 3, deep: 2, rows: 11, spacing: 13, x0f: 235, x1f: 625, y0f: 205, y1f: 475 },
  })
);

// 5. Shenzhen Bay Sports Center "Spring Cocoon" arena, Shenzhen — compact oval.
venues.push(
  ovalStadium({
    seed: 20261005,
    venue: { id: "demo-shenzhen-bay", name: "深圳湾体育中心体育馆", city: "深圳", address: "南山区滨海大道3001号" },
    prices: { vip: 1480, floorA: 1080, lower: 780, upper: 480, top: 320 },
    W: 1000, H: 780,
    rings: [
      { kind: "lower", rxIn: 300, ryIn: 210, depth: 110, sections: 18, rows: 14, gap: 3.6, spacing: 10.5 },
      { kind: "upper", rxIn: 438, ryIn: 348, depth: 92, sections: 22, rows: 11, gap: 3.4, spacing: 11 },
    ],
    stage: { w: 240, h: 50, arc: 50 },
    floor: { cols: 3, deep: 2, rows: 11, spacing: 13, x0f: 360, x1f: 640, y0f: 250, y1f: 450 },
  })
);

// ---------- sanity + write ----------

function countSeats(doc) {
  let n = 0;
  for (const l of doc.levels) for (const s of l.sections) for (const r of s.rows) n += r.seats.length;
  return n;
}

mkdirSync(OUT, { recursive: true });
for (const doc of venues) {
  const seats = countSeats(doc);
  const file = join(OUT, `${doc.venue.id}.json`);
  writeFileSync(file, JSON.stringify(doc, null, 1) + "\n");
  console.log(`${doc.venue.id}.json  levels=${doc.levels.length} seats=${seats}  (${(JSON.stringify(doc).length / 1024).toFixed(0)} KB)`);
}
console.log(`\nwrote ${venues.length} demo venues to ${OUT}`);
