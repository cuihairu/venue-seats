# @venue-seats/renderer

Framework-agnostic 2D SVG seat-map engine: zoom and pan, hover, sold-out
states, price-tier colouring, stage, keyboard/ARIA support, then section → row →
seat selection. One `SeatMapController` drives one host element; the React and
Vue wrappers call into it, so behaviour is identical across frameworks.

Part of the [venue-seats](https://github.com/cuihairu/venue-seats) monorepo.
Source-available; not yet published to npm — see the repository for status.

## Usage

```ts
import { SeatMapController } from "@venue-seats/renderer";

const controller = new SeatMapController(host, {
  doc, // VenueDocument (schemaVersion "1")
  levelId, // optional; defaults to the first level
  selection, // controlled: { sectionId, rowId? }
  onSelectionChange: (selection) => {},
  onSeatToggle: (seat, section) => {}, // L2; seat.status is the new status
});

controller.zoomIn();
controller.fit();
controller.destroy();
```

Keyboard: `Escape` clears, `ArrowUp/Down` move the row selection, `Enter/Space`
activates. Seats are drawn once they pass `seatVisibleAt` screen px per venue
unit. See `docs/api.md` for the full surface and `geometry.ts`/`dom.ts` helpers.
