# Data format

One JSON document describes one venue for one event configuration. All three
consumers (React, Vue, Flutter) read exactly this file — no per-platform data.

```
VenueDocument
├── schemaVersion: "1"
├── venue { id, name, city, address, lat, lng }        # geography for the venue card
├── stage? { x, y, rotation, w?, h? }                  # stage orientation + footprint (concerts)
├── provenance?: "official" | "demo"                   # demo = rebuilt from public info
├── priceTiers[] { id, name, color, price? }           # colour legend + pricing
└── levels[]                                            # 楼层/层
    └── sections[] { id, name, polygon[][], priceTierId?, rows[] }   # 区 (L1)
        └── rows[] { id, label, seats[] }              # 排 (L1)
            └── seats[] { id, label, x, y, status, priceTierId? }    # 座 (L2)
```

## Rules

1. **Coordinates are venue space units**, not pixels. Renderers map them to the
   viewport; that is how the same file drives the web and Flutter renderers
   today (a 3D view is planned, not built).
2. **`polygon` is the hit area** for a section at L1. `sectionAt()` in core does
   the point-in-polygon test.
3. **Status** is one of `available | selected | sold | held`. Selection state is
   client-local; `sold`/`held` come from the ticketing backend.
4. **provenance**: example venues rebuilt from public layout info MUST be
   `demo` and must be described as 示意 (illustrative) in UI copy — they are not
   verified against the real venue. Official charts are copyrighted by their
   owners and are never bundled here.
5. `schemaVersion` changes only on breaking changes. Validators currently
   check that it is present only; rejecting unknown versions is planned but
   not yet enforced (see 审计表 A1).

See [`schemas/venue-seats.schema.json`](https://github.com/cuihairu/venue-seats/blob/main/schemas/venue-seats.schema.json)
for the machine-readable contract and `packages/core/src/index.ts` for `validate()`.
