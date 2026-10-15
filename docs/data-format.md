# Data format

> **English** | [中文](data-format.zh.md)

One JSON document describes one venue for one event configuration. All three
consumers (React, Vue, Flutter) read exactly this file — no per-platform data.

```
VenueDocument
├── schemaVersion: "1"
├── venue { id, name, city, address, lat, lng }        # geography for the venue card
├── stage? { x, y, rotation, w?, h? }                  # stage orientation + footprint (concerts)
├── provenance?: "official" | "demo" | "public"         # demo/public = rebuilt from public info
├── priceTiers[] { id, name, color, price? }           # colour legend + pricing
└── levels[]                                            # level
    └── sections[] { id, name, polygon[][], priceTierId?, rows[] }   # section (L1)
        └── rows[] { id, label, seats[] }              # row (L1)
            └── seats[] { id, label, x, y, status, priceTierId? }    # seat (L2)
```

## Rules

1. **Coordinates are venue space units**, not pixels. Every renderer maps them
   to its own viewport — the 2D SVG renderer, the 3D three.js renderer (XZ
   ground plane at y=0) and the Flutter painter all consume the same document,
   with no per-platform copy.
2. **`polygon` is the hit area** for a section at L1. `sectionAt()` in core does
   the point-in-polygon test.
3. **Status** is one of `available | selected | sold | held`. Selection state is
   client-local; `sold`/`held` come from the ticketing backend.
4. **provenance**: documents rebuilt from public layout info are marked `demo`
   (illustrative fixtures) or `public` (real venues whose structure and
   capacity follow cited public sources, with seat placement still our own
   reconstruction). Both MUST be described as 示意/重建 in UI copy — neither is
   verified against the real venue. Official charts are copyrighted by their
   owners and are never bundled here.
5. `schemaVersion` changes only on breaking changes. Validators require it and
   reject any value other than the supported one (`"1"`), so an unrecognised
   document fails loudly instead of being half-rendered (audit table A1).

See [`schemas/venue-seats.schema.json`](https://github.com/cuihairu/venue-seats/blob/main/schemas/venue-seats.schema.json)
for the machine-readable contract and `packages/core/src/index.ts` for `validate()`.

## How the example samples use the model

`examples/venues/` ships one sample per layout family (`provenance: "public"`,
sources and licences in [`examples/README.md`](https://github.com/cuihairu/venue-seats/blob/main/examples/README.md)).
They show how one model covers very different buildings:

| sample | shape | model mapping |
| --- | --- | --- |
| `public-ncpa-opera-house.json` | fan theatre, 3 balcony tiers | the stalls and each balcony are one `level`; a level's `sections` are concentric wedges centred on the stage, so `rows`/`seats` curve with the fan; `stage.rotation: 180` faces the audience |
| `public-hangzhou-olympic-stadium.json` | oval stadium, 3 tiers + infield | three `levels` of elliptical ring sections; concert-infield blocks sit in `floor` blocks; `priceTierId` switches by centrality relative to the stage |
| `public-expo-culture-center.json` | bowl arena, variable infield | the published section numbers are kept (201–222 / 501–528); the variable infield is a centre `stage` plus a `backstage`-tier core section; box levels stay unmodelled |
| `public-hong-kong-coliseum.json` | irregular rectangular bowl | the four-sided steep bowl is cut into straight trapezoid `sections` by rays from the centre stage (four-sided stage); two price tiers are banded per block |

Regenerate byte-identically with `node scripts/gen-examples.mjs` (the
reproducibility test in `packages/venues-demo/test/schema.test.ts` guards it).
