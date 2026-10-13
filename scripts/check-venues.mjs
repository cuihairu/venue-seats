#!/usr/bin/env node
/** Dev sanity check for generated demo venues (not part of the test gate). */
import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "./packages/venues-demo/venues";
for (const f of readdirSync(dir)) {
  const doc = JSON.parse(await readFile(join(dir, f), "utf8"));
  const errs = [];
  // structural mirror of validate() until the package test covers it
  if (!doc.schemaVersion) errs.push("schemaVersion");
  let seats = 0, sold = 0, sections = 0, perLevel = [];
  for (const l of doc.levels) {
    let n = 0;
    for (const s of l.sections) {
      sections++;
      if (s.polygon.length < 3) errs.push(`polygon ${s.id}`);
      for (const r of s.rows) for (const st of r.seats) { n++; seats++; if (st.status === "sold") sold++; }
    }
    perLevel.push(`${l.name}=${n}`);
  }
  const ids = new Set();
  for (const l of doc.levels) for (const s of l.sections) for (const r of s.rows) for (const st of r.seats) {
    if (ids.has(st.id)) errs.push(`dup seat id ${st.id}`);
    ids.add(st.id);
  }
  console.log(f.padEnd(34), "errors:", errs.length ? errs.slice(0, 3) : "none", "| sections:", String(sections).padStart(3), "| sold:", (100 * sold / seats).toFixed(0) + "%", "|", perLevel.join(" "));
}
