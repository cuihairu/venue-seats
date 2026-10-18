#!/usr/bin/env node
/**
 * Integrity check for data/venues.json. Network-free; exits non-zero on any
 * violation so a broken snapshot can never pass CI silently.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const datasetPath = join(repoRoot, "data/venues.json");

const VENUE_TYPES = new Set(["stadium", "arena", "theatre"]);
const OPENED_MIN = 1600;
const OPENED_MAX = 2100;
const SUPPORTED_VERSION = 1;

const errors = [];

function fail(id, reason) {
  errors.push(`venues.json: ${id}: ${reason}`);
}

function isInt(value) {
  return typeof value === "number" && Number.isInteger(value);
}

function isDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validateHeader(dataset) {
  if (!dataset || typeof dataset !== "object" || Array.isArray(dataset)) {
    fail("(header)", "file must hold one JSON object");
    return false;
  }
  if (dataset.datasetVersion !== SUPPORTED_VERSION) {
    fail("(header)", `datasetVersion must be ${SUPPORTED_VERSION}`);
  }
  if (!isDate(dataset.generatedAt)) fail("(header)", "generatedAt must parse as a date");
  if (dataset.licence !== "CC0-1.0") fail("(header)", 'licence must be "CC0-1.0"');
  if (typeof dataset.source?.endpoint !== "string" || dataset.source.endpoint.length === 0) {
    fail("(header)", "source.endpoint must be a non-empty string");
  }
  if (typeof dataset.source?.query !== "string" || dataset.source.query.trim().length === 0) {
    fail("(header)", "source.query must be a non-empty string");
  }
  if (!dataset.counts || typeof dataset.counts !== "object") {
    fail("(header)", "counts must be an object");
  }
  if (!Array.isArray(dataset.venues)) {
    fail("(header)", "venues must be an array");
    return false;
  }
  return true;
}

function validateVenue(venue) {
  const label = typeof venue?.id === "string" ? venue.id : "(unknown)";
  if (typeof venue?.id !== "string" || venue.id.length === 0) fail(label, "id must be a non-empty string");
  if (typeof venue?.qid !== "string" || !/^Q\d+$/.test(venue.qid)) fail(label, `qid must match Q\\d+`);
  if (typeof venue?.id === "string" && typeof venue?.qid === "string" && venue.id !== `wikidata-${venue.qid}`) {
    fail(label, `id must be wikidata-${venue.qid}`);
  }
  if (typeof venue?.name !== "string" || venue.name.trim().length === 0) fail(label, "name must be non-empty");
  if (!VENUE_TYPES.has(venue?.venueType)) {
    fail(label, `venueType must be one of ${[...VENUE_TYPES].join(", ")}`);
  }
  if (!isInt(venue?.capacity) || venue.capacity <= 0) fail(label, "capacity must be a positive integer");
  if (typeof venue?.lat !== "number" || !Number.isFinite(venue.lat) || venue.lat < -90 || venue.lat > 90) {
    fail(label, "lat must be a finite number in [-90, 90]");
  }
  if (typeof venue?.lng !== "number" || !Number.isFinite(venue.lng) || venue.lng < -180 || venue.lng > 180) {
    fail(label, "lng must be a finite number in [-180, 180]");
  }
  if (venue?.country !== null && venue?.country !== undefined && (typeof venue.country !== "string" || !/^[A-Z]{2}$/.test(venue.country))) {
    fail(label, "country must be null or an ISO 3166-1 alpha-2 code");
  }
  if (venue?.city !== null && venue?.city !== undefined && (typeof venue.city !== "string" || venue.city.trim().length === 0)) {
    fail(label, "city must be null or a non-empty string");
  }
  if (venue?.opened !== null && venue?.opened !== undefined) {
    if (!isInt(venue.opened) || venue.opened < OPENED_MIN || venue.opened > OPENED_MAX) {
      fail(label, `opened must be null or an integer in [${OPENED_MIN}, ${OPENED_MAX}]`);
    }
  }
  if (!isDate(venue?.retrievedAt)) fail(label, "retrievedAt must parse as a date");
  if (!Array.isArray(venue?.sources) || venue.sources.length === 0) {
    fail(label, "sources must hold at least one entry");
  } else {
    venue.sources.forEach((source, index) => {
      if (typeof source?.url !== "string" || source.url.length === 0) fail(label, `sources[${index}].url must be non-empty`);
      if (source?.licence !== "CC0-1.0") fail(label, `sources[${index}].licence must be "CC0-1.0"`);
      if (typeof source?.method !== "string" || source.method.length === 0) fail(label, `sources[${index}].method must be non-empty`);
    });
  }
}

function main() {
  let dataset;
  try {
    dataset = JSON.parse(readFileSync(datasetPath, "utf8"));
  } catch (error) {
    console.error(`venues.json: cannot parse: ${error.message}`);
    process.exit(1);
  }

  const headerOk = validateHeader(dataset);
  if (headerOk) {
    const seenIds = new Map();
    const seenQids = new Map();
    const seenPlaces = new Map();
    for (const venue of dataset.venues) {
      validateVenue(venue);
      if (typeof venue?.id === "string") {
        if (seenIds.has(venue.id)) fail(venue.id, `duplicate id (also on ${seenIds.get(venue.id)})`);
        else seenIds.set(venue.id, venue.id);
      }
      if (typeof venue?.qid === "string") {
        if (seenQids.has(venue.qid)) fail(venue.id ?? "(unknown)", `duplicate qid ${venue.qid} (also on ${seenQids.get(venue.qid)})`);
        else seenQids.set(venue.qid, venue.id ?? "(unknown)");
      }
      const place =
        venue && typeof venue.name === "string" && typeof venue.country === "string" && typeof venue.lat === "number"
          ? `${venue.name.trim().toLowerCase()}|${venue.country}|${venue.lat.toFixed(2)}|${venue.lng.toFixed(2)}`
          : null;
      if (place !== null) {
        if (seenPlaces.has(place)) {
          fail(venue.id ?? "(unknown)", `duplicate place ${venue.name} @ ${venue.country} (also on ${seenPlaces.get(place)})`);
        } else seenPlaces.set(place, venue.id ?? "(unknown)");
      }
    }
  }

  if (errors.length > 0) {
    console.error(`${errors.length} violation(s):\n${errors.join("\n")}`);
    process.exit(1);
  }
  console.log(`venues.json ok (${dataset.venues.length} venues, version ${dataset.datasetVersion})`);
}

main();
