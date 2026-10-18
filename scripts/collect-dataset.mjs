#!/usr/bin/env node
/**
 * Collect the factual venue dataset from Wikidata's public SPARQL endpoint.
 *
 * Data licence: CC0 1.0 (https://www.wikidata.org/wiki/Wikidata:Licensing).
 * Nothing here is scraped from a commercial product; every record cites its
 * own Wikidata entity URL. Re-runs are safe and repeatable; with --merge the
 * records a fresh fetch no longer returns are kept instead of dropped.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(repoRoot, "data/venues.json");
const merge = process.argv.includes("--merge");

// Slice bounds. Stadiums and arenas only enter at 20k seats; theatres at 3k
// keeps the run bounded while still covering real houses.
const ROOTS = [
  { key: "stadium", qid: "Q483110", minCapacity: 20000 },
  { key: "arena", qid: "Q641226", minCapacity: 20000 },
  { key: "theatre", qid: "Q24354", minCapacity: 3000 },
];
const ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "venue-seats-dataset/0.1 (https://github.com/cuihairu/venue-seats; chuihairu@gmail.com)";

// Type priority when one entity sits under several roots.
const TYPE_RANK = { stadium: 0, arena: 1, theatre: 2 };
// Successor entities (a rebuilt stadium keeps its name and site) collapse to
// one record; the surviving item is the higher-capacity, then the newer qid.
const PLACE_ROUNDING = 2;
// Nonsense inception years (amphitheatres, ruins) collapse to null.
const OPENED_MIN = 1600;
const OPENED_MAX = 2100;

function sparql() {
  const roots = ROOTS.map((r) => `wd:${r.qid}`).join(" ");
  return `SELECT DISTINCT ?item ?label ?coord ?cap ?root ?countryCode ?cityLabel ?inception WHERE {
  VALUES ?root { ${roots} }
  ?item wdt:P31/wdt:P279* ?root .
  ?item wdt:P1083 ?cap .
  FILTER(?cap >= IF(?root = wd:Q24354, 3000, 20000))
  ?item wdt:P625 ?coord .
  OPTIONAL { ?item wdt:P17 ?country . ?country wdt:P297 ?countryCode }
  OPTIONAL { ?item wdt:P131 ?city }
  OPTIONAL { ?item wdt:P571 ?inception }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?item rdfs:label ?label . ?city rdfs:label ?cityLabel . }
}
ORDER BY ?item`;
}

async function fetchJson(query) {
  const body = new URLSearchParams({ format: "json", query });
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`SPARQL endpoint returned ${response.status}`);
  }
  return response.json();
}

async function fetchWithRetry(query) {
  try {
    return await fetchJson(query);
  } catch (error) {
    console.error(`first attempt failed (${error.message}); retrying once`);
    return fetchJson(query);
  }
}

function valueOf(binding, key) {
  return binding[key]?.value;
}

function parsePoint(wkt) {
  const match = /^Point\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)$/.exec(wkt ?? "");
  if (!match) return null;
  // WKT stores Point(longitude latitude).
  const lng = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function toRecord(binding, rootKey, retrievedAt) {
  const qid = (valueOf(binding, "item") ?? "").split("/").at(-1);
  const name = (valueOf(binding, "label") ?? "").trim();
  const coord = parsePoint(valueOf(binding, "coord"));
  const capacity = Number(valueOf(binding, "cap"));
  if (!/^Q\d+$/.test(qid) || name.length === 0 || coord === null) return null;
  if (!Number.isInteger(capacity) || capacity <= 0) return null;

  const inceptionYear = valueOf(binding, "inception");
  const inception = inceptionYear === undefined ? null : new Date(inceptionYear).getUTCFullYear();
  return {
    id: `wikidata-${qid}`,
    qid,
    name,
    venueType: rootKey,
    capacity,
    lat: coord.lat,
    lng: coord.lng,
    country: valueOf(binding, "countryCode") ?? null,
    city: (valueOf(binding, "cityLabel") ?? "").trim() || null,
    opened: inception !== null && inception >= OPENED_MIN && inception <= OPENED_MAX ? inception : null,
    retrievedAt,
    sources: [
      { url: `https://www.wikidata.org/wiki/${qid}`, licence: "CC0-1.0", method: "public-api" },
    ],
  };
}

function placeKey(venue) {
  return [
    venue.name.trim().toLowerCase(),
    venue.country ?? "?",
    venue.lat.toFixed(PLACE_ROUNDING),
    venue.lng.toFixed(PLACE_ROUNDING),
  ].join("|");
}

function collapsePlaces(records) {
  const kept = new Map();
  for (const record of records) {
    const key = placeKey(record);
    const held = kept.get(key);
    // Higher capacity wins; a tie goes to the later entity id (the successor item).
    if (
      held === undefined ||
      record.capacity > held.capacity ||
      (record.capacity === held.capacity && Number(record.qid.slice(1)) > Number(held.qid.slice(1)))
    ) {
      kept.set(key, record);
    }
  }
  return [...kept.values()];
}

async function main() {
  const query = sparql();
  const retrievedAt = new Date().toISOString().slice(0, 10);
  console.error(`querying ${ENDPOINT} (${ROOTS.length} roots)...`);
  const payload = await fetchWithRetry(query);
  const bindings = payload?.results?.bindings ?? [];

  let droppedNoName = 0;
  const byQid = new Map();
  for (const binding of bindings) {
    const rootKey = ROOTS.find((r) => valueOf(binding, "root")?.endsWith(r.qid))?.key;
    if (rootKey === undefined) continue;
    const record = toRecord(binding, rootKey, retrievedAt);
    if (record === null) {
      droppedNoName += 1;
      continue;
    }
    const kept = byQid.get(record.qid);
    if (kept === undefined || TYPE_RANK[record.venueType] < TYPE_RANK[kept.venueType]) {
      byQid.set(record.qid, record);
    }
  }

  const fetched = [...byQid.values()];

  let previous = [];
  if (merge && existsSync(outputPath)) {
    const existing = JSON.parse(readFileSync(outputPath, "utf8"));
    previous = existing.venues.filter((v) => !byQid.has(v.qid));
    if (previous.length > 0) {
      console.error(`merging ${previous.length} record(s) absent from the fresh fetch`);
    }
  }

  const collapsed = collapsePlaces([...fetched, ...previous]);
  const venues = collapsed.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const collapsedAway = fetched.length + previous.length - venues.length;

  const dataset = {
    datasetVersion: 1,
    generatedAt: new Date().toISOString(),
    generator: "scripts/collect-dataset.mjs",
    licence: "CC0-1.0",
    source: { endpoint: ENDPOINT, query },
    counts: {
      rows: bindings.length,
      entities: fetched.length,
      merged: previous.length,
      collapsedPlaces: collapsedAway,
      droppedNoName,
      venues: venues.length,
    },
    venues,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);
  const byType = {};
  for (const venue of dataset.venues) byType[venue.venueType] = (byType[venue.venueType] ?? 0) + 1;
  console.log(
    `collected ${dataset.venues.length} venues ` +
      `(rows=${dataset.counts.rows}, entities=${dataset.counts.entities}, ` +
      `collapsedPlaces=${collapsedAway}, droppedNoName=${droppedNoName}, merged=${previous.length})`,
  );
  for (const [type, count] of Object.entries(byType)) console.log(`  ${type}: ${count}`);
}

main().catch((error) => {
  console.error(`collection failed: ${error.message}`);
  process.exit(1);
});
