# @venue-seats/core

Framework-agnostic venue data model, structural validation and geometry
helpers — the shared foundation for the 2D SVG, 3D three.js and Flutter seat
maps, all driven by one JSON document (`schemaVersion: "1"`).

Part of the [venue-seats](https://github.com/cuihairu/venue-seats) monorepo.
Source-available; not yet published to npm — see the repository for status.

## Usage

```ts
import { seatAt, sectionAt, toggleSelect, validate, venueBounds } from "@venue-seats/core";

const errors = validate(doc); // structural; requires schemaVersion and rejects unknown ones

const level = doc.levels[0];
const section = sectionAt(level, x, y); // section holding a venue coordinate
const seat = seatAt(section, x, y); // nearest seat within the hit radius (L2)
const next = toggleSelect(seat); // sold/held seats are never re-selected
const bounds = venueBounds(doc); // bounding box incl. the stage
```

See `docs/api.md` in the repository for the full export list, and
`docs/data-format.md` for the JSON contract.
