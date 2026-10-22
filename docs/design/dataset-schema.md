# Dataset schema


The factual layer behind the project: one machine-readable file describing real-world
venues as facts — identity, location, capacity, class. It is deliberately separate from
[`schemas/venue-seats.schema.json`](https://github.com/cuihairu/venue-seats/blob/main/schemas/venue-seats.schema.json), which is
the seat-map rendering format.

Two layers, one project:

| Layer | File | What it holds |
|---|---|---|
| Facts | `data/venues.json` | who the venue is, where it stands, how many seats, which class — collected facts |
| Seat map | `examples/venues/*.json`, `packages/venues-demo/venues/*.json` | layout a renderer can draw, self-built from public layout information |

## Why the dataset never contains seat charts

Seat-level layouts of commercial venues are copyrighted by their owners and are never
bundled, scraped, or derived here. The dataset stops at the factual level: capacity is
a single published number, not a map of 80,000 seats. Nothing in `data/` is a chart.

## File

`data/venues.json` — one JSON document, 2-space indent, trailing newline, records
sorted by `id` so a re-collection produces a stable diff.

```json
{
  "datasetVersion": 1,
  "generatedAt": "2026-10-18T04:20:00.000Z",
  "generator": "scripts/collect-dataset.mjs",
  "licence": "CC0-1.0",
  "source": { "endpoint": "...", "query": "..." },
  "counts": { "rows": 2360, "entities": 2119, "merged": 0, "collapsedPlaces": 6, "droppedNoName": 0, "venues": 2113 },
  "venues": [ { "id": "wikidata-Q10758", "...": "..." } ]
}
```

## Header

| Field | Meaning |
|---|---|
| `datasetVersion` | schema version of this file; `1` is the only supported value |
| `generatedAt` | ISO-8601 timestamp of the collection run |
| `generator` | the script that produced the file |
| `licence` | `CC0-1.0` — the dataset and every record in it |
| `source.endpoint` | the public API the data was fetched from |
| `source.query` | the exact query sent, so the snapshot can be reproduced and audited |
| `counts` | fetch bookkeeping, see below |
| `venues` | the records |

`counts` carries the funnel from the raw query down to the records shipped:

| Count | Meaning |
|---|---|
| `rows` | result rows the endpoint returned, before any local filtering |
| `entities` | distinct Wikidata entities after deduplicating the rows |
| `merged` | records kept from the previous snapshot when running with `--merge` |
| `collapsedPlaces` | successor entities folded into one record, see deduplication |
| `droppedNoName` | entities discarded because the source has no usable name |
| `venues` | records actually shipped |

Every step is written down rather than implied, so a shrinking or growing snapshot
explains itself.

## Record

| Field | Type | Req. | Source | Meaning |
|---|---|---|---|---|
| `id` | string | yes | derived | stable key, always `wikidata-<qid>` |
| `qid` | string | yes | Wikidata entity | entity id, `Q` followed by digits |
| `name` | string | yes | rdfs:label | English label, any language as fallback |
| `venueType` | enum | yes | P31 / P279\* | one of `stadium`, `arena`, `theatre` |
| `capacity` | integer | yes | P1083 | seats; Wikidata's "maximum capacity" |
| `lat` | number | yes | P625 | WGS84 latitude, degrees |
| `lng` | number | yes | P625 | WGS84 longitude, degrees |
| `country` | string\|null | no | P17 → P297 | ISO 3166-1 alpha-2 code |
| `city` | string\|null | no | P131 | label of the containing place |
| `opened` | integer\|null | no | P571 | year of first use, when it lands in `1600–2100` |
| `retrievedAt` | string | yes | run | ISO-8601 date the record was fetched |
| `sources` | array | yes | run | at least one entry with `url`, `licence`, `method` |

## Coordinates and units

- **Geodetic datum:** WGS84. Both values are decimal degrees, not radians, not meters.
- **Order:** Wikidata stores a point as `Point(longitude latitude)`; the file stores
  `lat` and `lng` as separate numbers.
- **Multiple statements:** an entity may carry more than one P625 statement. The
  collector keeps the first one and records nothing about the discarded ones — the
  coordinates are a representative point, not a footprint.
- **Capacity unit:** seats, integer. Wikidata's P1083 is "maximum capacity", which for
  the venue classes collected here is a seat count. Values are not re-derived.
- **`opened`:** years outside `1600–2100` are dropped to `null` rather than stored —
  some amphitheatres and ruins carry dates that are not modern years.

## Collection thresholds

| Class | Wikidata root | Minimum capacity |
|---|---|---|
| `stadium` | Q483110 (stadium), walked down the subclass graph | 20,000 |
| `arena` | Q641226 (arena), walked down the subclass graph | 20,000 |
| `theatre` | Q24354 (theatre building), walked down the subclass graph | 3,000 |

The thresholds exist so a collection run stays bounded. They live in the SPARQL `FILTER`
that `sparql()` in `scripts/collect-dataset.mjs` emits (the `minCapacity` values on
`ROOTS` repeat the same numbers as documentation; the query text is what actually runs).
Re-running with `--merge` keeps records the fresh fetch no longer returns, but every
record it does return replaces its same-QID predecessor and the same-place fold still
applies — a merged snapshot can gain, correct, or shrink records; it is not grow-only.

## Deduplication

Two passes, both deterministic:

1. **Per entity.** One entity can sit under more than one root, or repeat a value. The
   collector keeps one record per entity and prefers `stadium` over `arena` over
   `theatre` when the entity matches several roots.
2. **Per place.** A rebuilt venue often gets a fresh Wikidata item while keeping its
   name and its site — the old and the new San Mamés, for instance, are two entities
   sharing one name and one location. The collector folds such successor pairs into the
   higher-capacity record, ties going to the later entity id. The key is
   (`name` lowercased, `country`, both coordinates rounded to two decimals) — roughly
   a one-kilometre square.

Rows returned, entities, and shipped records differ, and each difference is written to
`counts` rather than hidden.

## Validation

`scripts/validate-dataset.mjs` re-reads the file and fails with a non-zero exit on any
violation, printing `venues.json: <id>: <reason>` for each one:

1. Header: `datasetVersion` is `1`, `generatedAt` parses as a date, `licence` is
   `CC0-1.0`, `source.endpoint` and `source.query` are non-empty.
2. Required fields present per record; `name` non-empty; `venueType` inside the enum.
3. `capacity` a positive integer; `lat` inside `[-90, 90]`; `lng` inside `[-180, 180]`.
4. `qid` matches `Q\d+`; `id` equals `wikidata-<qid>`.
5. `retrievedAt` parses as a date; `sources` holds at least one entry carrying `url`,
   `licence` and `method`.
6. Uniqueness: no repeated `id`, no repeated `qid`, and no two records with the same
   `name`, `country`, and coordinates rounded to two decimals.

`packages/venues-demo/test/dataset.test.ts` runs that validator in CI, so the snapshot
cannot silently rot or be replaced by an empty file.

## Updating

```bash
node scripts/collect-dataset.mjs          # full rebuild
node scripts/collect-dataset.mjs --merge  # keep records the fresh fetch does not return
node scripts/validate-dataset.mjs         # integrity check, no network
```

The collector needs network access to the public SPARQL endpoint and sends a
`User-Agent` identifying this project; the validator never touches the network. A
re-collection is **not** byte-reproducible — the upstream data changes between runs,
unlike `scripts/gen-examples.mjs`, which is deterministic by construction. `generatedAt`
moves on every run and is the marker for that.

## Licence and attribution

Wikidata is published under **CC0 1.0** (public-domain dedication). Facts are recorded
with the entity URL as the per-record source, `licence: "CC0-1.0"` on each source entry,
and `method: "public-api"`. The dataset carries no name, logo, seat chart, or other asset
of any venue owner, and copies nothing from a commercial product.
