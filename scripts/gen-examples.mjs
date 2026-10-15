#!/usr/bin/env node
/**
 * Generates the example venue documents in examples/venues/.
 *
 * These are REAL venues (provenance "public"): level structure, section
 * count, orientation and total capacity follow the published record for each
 * venue — sources and licences are listed in examples/README.md. Seat
 * placement is our own reconstruction (see the README for the sampling ratio
 * per venue); no official seat chart is copied, scraped or bundled.
 *
 * Deterministic: same seed -> byte-identical documents.
 * Run from the repo root: `node scripts/gen-examples.mjs`
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "examples", "venues");

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
const UP = 1.5 * Math.PI; // ellipse angle pointing "up" (y grows downward)

// ---------- price tiers ----------
// tier ids stay stable across venues so renderer/legend code is uniform;
// display names are per venue (a theatre's "lower" is its 一层楼座)
const TIERS = {
  vip: { id: "vip", color: "#ff4d6d" },
  floorA: { id: "floor-a", color: "#ff9f43" },
  lower: { id: "lower", color: "#4d8dff" },
  upper: { id: "upper", color: "#2ec4b6" },
  top: { id: "top", color: "#9b5de5" },
  backstage: { id: "backstage", color: "#64748b" },
};

const DEFAULT_NAMES = {
  vip: "内场 VIP",
  "floor-a": "内场 A",
  lower: "看台下层",
  upper: "看台上层",
  top: "看台三层",
  backstage: "工作区",
};

function tierList(prices, names = {}) {
  const label = (key) => names[key] ?? DEFAULT_NAMES[key];
  return [
    { ...TIERS.vip, name: label("vip"), price: prices.vip },
    { ...TIERS.floorA, name: label("floor-a"), price: prices.floorA },
    { ...TIERS.lower, name: label("lower"), price: prices.lower },
    { ...TIERS.upper, name: label("upper"), price: prices.upper },
    { ...TIERS.top, name: label("top"), price: prices.top },
    { ...TIERS.backstage, name: label("backstage") }, // not for sale
  ];
}

// ---------- geometry ----------
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
    if (aisleEvery && count > aisleEvery && i % aisleEvery === aisleEvery - 1) continue;
    const t = t0 + ((i + 0.5) * (t1 - t0)) / count;
    const [x, y] = ePoint(cx, cy, rx, ry, t);
    seats.push({ x: r1(x), y: r1(y) });
  }
  return seats;
}

/** where a ray from the centre meets a rectangle of half-size (hw, hh) */
function rectPoint(cx, cy, hw, hh, t) {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const r = Math.min(hw / Math.max(Math.abs(c), 1e-6), hh / Math.max(Math.abs(s), 1e-6));
  return [cx + r * c, cy + r * s];
}

// ---------- status painting ----------

function scatterSold(seats, rng, ratio, clusterBoost = 0.35) {
  let hot = 0;
  for (const s of seats) {
    if (s.status && s.status !== "available") continue;
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

// ---------- builders ----------

/**
 * One section of an elliptical ring band. Rows run on lerped radii, row 1 is
 * the inner (field-side) edge.
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
 * One trapezoid section of a straight-sided block. a,b = inner edge (nearest
 * the stage/field); c,d = outer edge directly "behind" a,b.
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
      if (count > 14 && j % 16 === 15) continue;
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

/** pricing by centrality: angular distance from "directly opposite the stage" */
const OPPOSITE = 1.5 * Math.PI;
function angleFromOpposite(mid) {
  return Math.abs(((mid - OPPOSITE + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
}

/** elliptical bowl tiers + a pitch block (concert config, stage at the bottom) */
function ovalStadium(opts) {
  const { seed, venue, prices, names, W, H, rings, stage, floor, realCapacity, sampleRatio } = opts;
  const rng = mulberry32(seed);
  const cx = W / 2;
  const cy = H / 2;
  const prefix = venue.id;
  const levels = [];
  const STAGE_ARC = stage.arc * DEG;

  for (const ring of rings) {
    const sections = [];
    const step = (Math.PI * 2) / ring.sections;
    const gap = ring.gap * DEG;
    for (let i = 0; i < ring.sections; i++) {
      const t0 = i * step + gap / 2;
      const t1 = (i + 1) * step - gap / 2;
      const mid = (t0 + t1) / 2;
      const behindStage = Math.abs(((mid - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < STAGE_ARC / 2;
      const tierId = behindStage
        ? TIERS.backstage.id
        : angleFromOpposite(mid) < 75 * DEG
          ? TIERS[ring.kind === "lower" ? "lower" : "upper"].id
          : TIERS.top.id;
      const letter = String.fromCharCode(65 + i);
      const sec = ringSection({
        cx, cy, rxIn: ring.rxIn, ryIn: ring.ryIn, depth: ring.depth,
        t0, t1, id: letter,
        name: behindStage ? `${letter}区（台后）` : `${letter}区`,
        tierId, prefix: `${prefix}-${ring.kind}`,
        rows: ring.rows, spacing: ring.spacing, rng,
      });
      if (behindStage) markAllSold(sec);
      else if (ring.kind === "lower") scatterSold(sec.rows.flatMap((r) => r.seats), rng, 0.14);
      else scatterSold(sec.rows.flatMap((r) => r.seats), rng, 0.22);
      sections.push(sec);
    }
    levels.push({ id: `${prefix}-lv-${ring.kind}`, name: ring.name, sections });
  }

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
    provenance: "public",
    stage: { x: r1(cx), y: r1(floor.y1f + stage.h / 2 + 14), rotation: 180, w: stage.w, h: stage.h },
    priceTiers: tierList(prices, names),
    levels,
    // documentation only — stripped before writing (the schema admits no extras)
    _real: { capacity: realCapacity, sampleRatio },
  };
}

/**
 * Fan-shaped theatre: the stalls and each balcony are concentric wedges
 * centred just in front of the proscenium, so rows curve around the stage.
 */
function fanTheatre(opts) {
  const { seed, venue, prices, names, W, H, stage, tiers, realCapacity, sampleRatio } = opts;
  const rng = mulberry32(seed);
  const cx = W / 2;
  const stageY = H - stage.h / 2 - 26;
  const apex = stageY - 46; // fan centre sits just in front of the stage
  const prefix = venue.id;
  const levels = [];

  for (const tier of tiers) {
    const sections = [];
    const span = tier.span * DEG;
    const step = span / tier.sections;
    for (let i = 0; i < tier.sections; i++) {
      const t0 = UP - span / 2 + i * step;
      const t1 = t0 + step;
      const id = `${tier.code}${i + 1}`;
      const sec = ringSection({
        cx, cy: apex, rxIn: tier.rIn, ryIn: tier.rIn, depth: tier.depth,
        t0, t1, id, name: `${tier.name} ${i + 1} 区`,
        tierId: tier.tierId, prefix,
        rows: tier.rows, spacing: tier.spacing, rng,
      });
      scatterSold(sec.rows.flatMap((r) => r.seats), rng, tier.soldRatio);
      sections.push(sec);
    }
    levels.push({ id: `${prefix}-lv-${tier.code}`, name: tier.name, sections });
  }

  return {
    schemaVersion: "1",
    venue,
    provenance: "public",
    stage: { x: r1(cx), y: r1(stageY), rotation: 180, w: stage.w, h: stage.h },
    priceTiers: tierList(prices, names),
    levels,
    _real: { capacity: realCapacity, sampleRatio },
  };
}

/**
 * Oval bowl arena with a documented section-numbering plan (the published
 * record numbers the lower bowl 201–222 and the upper bowl 501–528; the box
 * levels between them are not modelled). Centre stage = the island-core
 * infield the venue is known for.
 */
function bowlArena(opts) {
  const { seed, venue, prices, names, W, H, rings, stage, floor, realCapacity, sampleRatio } = opts;
  const rng = mulberry32(seed);
  const cx = W / 2;
  const cy = H / 2;
  const prefix = venue.id;
  const levels = [];

  for (const ring of rings) {
    const sections = [];
    const step = (Math.PI * 2) / ring.sections;
    const gap = ring.gap * DEG;
    for (let i = 0; i < ring.sections; i++) {
      const t0 = i * step + gap / 2;
      const t1 = (i + 1) * step - gap / 2;
      const num = ring.first + i; // published section number
      const sec = ringSection({
        cx, cy, rxIn: ring.rxIn, ryIn: ring.ryIn, depth: ring.depth,
        t0, t1, id: `${num}`, name: `${num}区`,
        tierId: ring.kind === "lower" ? TIERS.lower.id : TIERS.upper.id,
        prefix: `${prefix}-${ring.kind}`,
        rows: ring.rows, spacing: ring.spacing, rng,
      });
      scatterSold(sec.rows.flatMap((r) => r.seats), rng, ring.kind === "lower" ? 0.15 : 0.24);
      sections.push(sec);
    }
    levels.push({ id: `${prefix}-lv-${ring.kind}`, name: ring.name, sections });
  }

  // variable infield: the island core itself is not for sale, the blocks
  // ringing it are (concert mode)
  const coreSection = {
    id: `${prefix}-floor-core`,
    name: "核心岛内场",
    polygon: [
      pt(cx - stage.w / 2, cy - stage.h / 2),
      pt(cx + stage.w / 2, cy - stage.h / 2),
      pt(cx + stage.w / 2, cy + stage.h / 2),
      pt(cx - stage.w / 2, cy + stage.h / 2),
    ],
    priceTierId: TIERS.backstage.id,
    rows: [
      {
        id: `${prefix}-floor-core-r1`,
        label: "场地",
        seats: [
          { x: r1(cx - stage.w / 4), y: r1(cy), id: `${prefix}-floor-core-1`, label: "场地", status: "sold" },
          { x: r1(cx + stage.w / 4), y: r1(cy), id: `${prefix}-floor-core-2`, label: "场地", status: "sold" },
        ],
      },
    ],
  };
  const floorSections = [coreSection];
  for (const block of floor.blocks) {
    const sec = straightSection({
      a: block.a, b: block.b, c: block.c, d: block.d,
      id: block.id, name: `内场${block.id}`,
      tierId: block.tierId, prefix, rows: floor.rows, spacing: floor.spacing, rng,
    });
    scatterSold(sec.rows.flatMap((r) => r.seats), rng, 0.2);
    floorSections.push(sec);
  }
  levels.unshift({ id: `${prefix}-lv-floor`, name: "内场", sections: floorSections });

  return {
    schemaVersion: "1",
    venue,
    provenance: "public",
    stage: { x: r1(cx), y: r1(cy), rotation: 0, w: stage.w, h: stage.h },
    priceTiers: tierList(prices, names),
    levels,
    _real: { capacity: realCapacity, sampleRatio },
  };
}

/**
 * Rectangular bowl (irregular sample): a steep four-sided bowl cut into
 * wedges by rays from the centre, around a centre stage (四面台) with floor
 * blocks on all four sides.
 */
function rectBowl(opts) {
  const { seed, venue, prices, names, W, H, inner, outer, wedges, stage, floor, rows, spacing, realCapacity, sampleRatio } = opts;
  const rng = mulberry32(seed);
  const cx = W / 2;
  const cy = H / 2;
  const prefix = venue.id;

  const sections = [];
  const step = (Math.PI * 2) / wedges;
  const gap = 2.4 * DEG;
  for (let i = 0; i < wedges; i++) {
    const t0 = i * step + gap / 2;
    const t1 = (i + 1) * step - gap / 2;
    const id = String.fromCharCode(65 + i);
    // 四面台: every block faces the centre stage, so tier banding follows the
    // wedge pattern (two neighbouring A blocks, two B blocks, around the bowl)
    const tierId = i % 4 < 2 ? TIERS.lower.id : TIERS.upper.id;
    const sec = straightSection({
      a: rectPoint(cx, cy, inner.w, inner.h, t0),
      b: rectPoint(cx, cy, inner.w, inner.h, t1),
      c: rectPoint(cx, cy, outer.w, outer.h, t0),
      d: rectPoint(cx, cy, outer.w, outer.h, t1),
      id, name: `${id}区`, tierId, prefix, rows, spacing, rng,
    });
    scatterSold(sec.rows.flatMap((r) => r.seats), rng, 0.2);
    sections.push(sec);
  }

  const floorSections = [];
  for (const block of floor.blocks) {
    const sec = straightSection({
      a: block.a, b: block.b, c: block.c, d: block.d,
      id: block.id, name: `内场${block.id}`,
      tierId: block.tierId, prefix, rows: floor.rows, spacing: floor.spacing, rng,
    });
    scatterSold(sec.rows.flatMap((r) => r.seats), rng, 0.24);
    floorSections.push(sec);
  }

  return {
    schemaVersion: "1",
    venue,
    provenance: "public",
    stage: { x: r1(cx), y: r1(cy), rotation: 0, w: stage.w, h: stage.h },
    priceTiers: tierList(prices, names),
    levels: [
      { id: `${prefix}-lv-floor`, name: "内场", sections: floorSections },
      { id: `${prefix}-lv-bowl`, name: "看台", sections },
    ],
    _real: { capacity: realCapacity, sampleRatio },
  };
}

// ---------- venue definitions (real venues, public sources) ----------
// sources & licences: examples/README.md

const venues = [];

// 1. National Centre for the Performing Arts, Opera House, Beijing (2007) —
//    published: 2,207 seats = 池座 640 + 一层楼座 584 + 二层楼座 140 +
//    三层楼座 717 + 乐池 126 (pit not modelled). Fan-shaped stalls plus three
//    balcony tiers ring the proscenium.
venues.push(
  fanTheatre({
    seed: 20261011,
    venue: { id: "public-ncpa-opera-house", name: "国家大剧院·歌剧院", city: "北京", address: "北京市西城区西长安街2号" },
    prices: { vip: 1280, floorA: 980, lower: 780, upper: 580, top: 380 },
    names: { vip: "池座前区", "floor-a": "池座后区", lower: "一层楼座", upper: "二层楼座", top: "三层楼座" },
    W: 1360, H: 830,
    stage: { w: 260, h: 54 },
    tiers: [
      { code: "pool", name: "池座", tierId: TIERS.vip.id, rIn: 170, depth: 180, span: 112, sections: 5, rows: 17, spacing: 11, soldRatio: 0.2 },
      { code: "tier1", name: "一层楼座", tierId: TIERS.lower.id, rIn: 390, depth: 90, span: 150, sections: 7, rows: 7, spacing: 11, soldRatio: 0.24 },
      { code: "tier2", name: "二层楼座", tierId: TIERS.upper.id, rIn: 505, depth: 60, span: 172, sections: 7, rows: 1, spacing: 11, soldRatio: 0.26 },
      { code: "tier3", name: "三层楼座", tierId: TIERS.top.id, rIn: 590, depth: 78, span: 180, sections: 7, rows: 5, spacing: 11, soldRatio: 0.28 },
    ],
    realCapacity: "2,207（池座 640 / 一层 584 / 二层 140 / 三层 717 / 乐池 126，乐池未建模）",
    sampleRatio: "1:1（逐层座位数按公开口径近似）",
  })
);

// 2. Hangzhou Olympic Sports Centre Stadium "Big Lotus" (2019) — published:
//    80,800 fixed seats over three tiers (lower / middle / upper) around the
//    athletics pitch. Sample keeps the three-tier structure, scaled down.
venues.push(
  ovalStadium({
    seed: 20261012,
    venue: { id: "public-hangzhou-olympic-stadium", name: "杭州奥体中心体育场（大莲花）", city: "杭州", address: "滨江区钱塘江畔" },
    prices: { vip: 1680, floorA: 1280, lower: 880, upper: 580, top: 380 },
    names: { lower: "看台下层", upper: "看台中层", top: "看台上层" },
    W: 1600, H: 1400,
    rings: [
      { kind: "lower", name: "看台下层", rxIn: 400, ryIn: 300, depth: 130, sections: 22, rows: 15, gap: 3.4, spacing: 10.5 },
      { kind: "upper", name: "看台中层", rxIn: 560, ryIn: 460, depth: 105, sections: 26, rows: 11, gap: 3.2, spacing: 11 },
      { kind: "top", name: "看台上层", rxIn: 690, ryIn: 590, depth: 85, sections: 22, rows: 8, gap: 3.0, spacing: 11 },
    ],
    stage: { w: 300, h: 56, arc: 44 },
    floor: { cols: 4, deep: 2, rows: 14, spacing: 13, x0f: 520, x1f: 1080, y0f: 500, y1f: 760 },
    realCapacity: "80,800 固定坐席（三层看台）",
    sampleRatio: "约 1:10（保结构缩样，保渲染流畅）",
  })
);

// 3. Shanghai Expo Culture Center (former Mercedes-Benz Arena, 2010) —
//    published: 18,000 max mode / 13,000 end-stage; lower bowl numbered
//    201–222, upper bowl 501–528, box levels between them not modelled.
//    Island-core infield. The sponsor name is avoided on purpose.
venues.push(
  bowlArena({
    seed: 20261013,
    venue: { id: "public-expo-culture-center", name: "上海世博文化中心", city: "上海", address: "浦东新区世博大道1200号" },
    prices: { vip: 1680, floorA: 1280, lower: 880, upper: 580, top: 380 },
    names: { lower: "二层看台", upper: "五层看台" },
    W: 1100, H: 940,
    rings: [
      { kind: "lower", name: "二层看台", first: 201, rxIn: 310, ryIn: 240, depth: 95, sections: 22, rows: 14, gap: 3.0, spacing: 10.5 },
      { kind: "upper", name: "五层看台", first: 501, rxIn: 435, ryIn: 365, depth: 85, sections: 28, rows: 11, gap: 2.8, spacing: 11 },
    ],
    stage: { w: 220, h: 160 }, // 核心岛（中央舞台）
    floor: {
      rows: 10,
      spacing: 12,
      blocks: [
        { id: "A", tierId: TIERS.vip.id, a: [380, 220], b: [720, 220], c: [380, 280], d: [720, 280] },
        { id: "B", tierId: TIERS.floorA.id, a: [380, 660], b: [720, 660], c: [380, 720], d: [720, 720] },
        { id: "C", tierId: TIERS.floorA.id, a: [250, 300], b: [250, 640], c: [330, 300], d: [330, 640] },
        { id: "D", tierId: TIERS.floorA.id, a: [770, 300], b: [770, 640], c: [850, 300], d: [850, 640] },
      ],
    },
    realCapacity: "18,000（四面/最大模式；一面台 13,000）",
    sampleRatio: "约 1:3.9（保结构缩样，保渲染流畅）",
  })
);

// 4. Hong Kong Coliseum (1983) — published: 12,500 = 10,400 fixed + 2,000
//    retractable; 42×42 m square centre performance area, four-sided steep
//    bowl, inverted-pyramid profile. Centre stage (四面台) concert config.
venues.push(
  rectBowl({
    seed: 20261014,
    venue: { id: "public-hong-kong-coliseum", name: "香港体育馆（红磡）", city: "香港", address: "九龙油尖旺区红磡畅运道9号" },
    prices: { vip: 1280, floorA: 980, lower: 680, upper: 480, top: 320 },
    names: { lower: "看台 A", upper: "看台 B" },
    W: 1000, H: 880,
    inner: { w: 170, h: 140 },
    outer: { w: 460, h: 390 },
    wedges: 16,
    rows: 18,
    spacing: 11,
    stage: { w: 180, h: 120 }, // 中央舞台（四面台）
    floor: {
      rows: 8,
      spacing: 12,
      blocks: [
        { id: "北", tierId: TIERS.vip.id, a: [430, 300], b: [570, 300], c: [430, 420], d: [570, 420] },
        { id: "南", tierId: TIERS.floorA.id, a: [430, 460], b: [570, 460], c: [430, 580], d: [570, 580] },
        { id: "西", tierId: TIERS.floorA.id, a: [300, 330], b: [300, 550], c: [410, 330], d: [410, 550] },
        { id: "东", tierId: TIERS.floorA.id, a: [590, 330], b: [590, 550], c: [700, 330], d: [700, 550] },
      ],
    },
    realCapacity: "12,500 = 固定 10,400 + 拉出式 2,000",
    sampleRatio: "约 1:4（保结构缩样，保渲染流畅）",
  })
);

// ---------- sanity + write ----------

function countSeats(doc) {
  let n = 0;
  for (const l of doc.levels) for (const s of l.sections) for (const r of s.rows) n += r.seats.length;
  return n;
}

mkdirSync(OUT, { recursive: true });

let total = 0;
for (const doc of venues) {
  const { _real, ...clean } = doc;
  const seats = countSeats(clean);
  total += seats;
  const file = join(OUT, `${clean.venue.id}.json`);
  writeFileSync(file, JSON.stringify(clean, null, 1) + "\n");
  console.log(
    `${clean.venue.id}.json  levels=${clean.levels.length} sections=${clean.levels.reduce((n, l) => n + l.sections.length, 0)} seats=${seats}  (${(JSON.stringify(clean).length / 1024).toFixed(0)} KB)`,
  );
}
console.log(`total seats ${total}`);
