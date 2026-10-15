# @venue-seats/renderer-3d

three.js seat map sharing the same data model and hit-testing funnel as the 2D
SVG renderer, so a selection made in one mode shows in the other. Degrades to
the 2D renderer on low-end devices, narrow viewports, or when WebGL is
unavailable.

Part of the [venue-seats](https://github.com/cuihairu/venue-seats) monorepo.
Source-available; not yet published to npm — see the repository for status.

## Usage

```ts
import { createVenueView } from "@venue-seats/renderer-3d";

const view = createVenueView(host, {
  doc, // the same VenueDocument the 2D renderer takes
  selection,
  onSelectionChange: (selection) => {},
  onSeatToggle: (seat, section) => {},
  force3D: false, // true attempts 3D even when the probe says no
});

view.mode; // "3d" | "2d" — the mode actually created
view.controller; // SeatMap3DController | SeatMapController
```

`createVenueView` probes the device (`probe3D()`: WebGL, not low-end, viewport
wider than `NARROW_VIEWPORT` = 640 px) and returns the 2D controller if 3D
construction fails; `use3D(options)` exposes the same decision for callers that
want to branch first. See `docs/api.md` for the pure `scene.ts` helpers.
