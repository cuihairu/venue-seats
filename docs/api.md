# API

Public surface of each package, verified against source. All packages are
workspace-internal (not yet published).

## @venue-seats/core — `packages/core/src/index.ts`

Framework-agnostic data model, validation and geometry helpers.

**Types:** `VenueDocument`, `Venue`, `Stage`, `Level`, `Section`, `Row`,
`Seat`, `PriceTier`, `SeatStatus` (`"available" | "selected" | "sold" | "held"`),
`RowSelection` (`{ sectionId, rowId? }`), `Availability`, `Bounds`.

| Export | Signature | Notes |
|---|---|---|
| `validate` | `(doc: unknown) => string[]` | structural errors; checks `schemaVersion` presence only (unknown-version rejection not yet enforced) |
| `pointInPolygon` | `(x, y, polygon) => boolean` | ray-casting test |
| `sectionAt` | `(level, x, y) => Section \| undefined` | which section contains a venue coordinate |
| `rowAt` | `(section, x, y, maxDistance = 40) => Row \| undefined` | nearest row centroid within `maxDistance` |
| `seatAt` | `(section, x, y, hitRadius = 3.4) => Seat \| undefined` | nearest seat within `hitRadius` (L2 hit-testing) |
| `boundsOf` / `levelBounds` / `venueBounds` | `(points \| level \| doc) => Bounds \| undefined` | bounding boxes |
| `levelById` | `(doc, levelId) => Level \| undefined` | |
| `priceTierOf` | `(doc, tierId) => PriceTier \| undefined` | |
| `sectionColor` | `(doc, section) => string` | section tier colour, else `#64748b` |
| `rowAvailability` / `sectionAvailability` | `(row \| section) => Availability` | total vs available counts |
| `toggleSelect` | `(seat) => Seat` | sold/held cannot be selected; wired into both renderers via L2 |

## @venue-seats/renderer — `packages/renderer/src/`

Framework-agnostic SVG engine. One `SeatMapController` drives one host
element; the React and Vue wrappers call into it.

```ts
new SeatMapController(host: HTMLElement, options: SeatMapOptions)
```

**`SeatMapOptions`:** `doc` (required), `levelId?`, `selection?` (controlled),
`seatVisibleAt?` (default `0.7` screen px per venue unit — seats appear above
it), `seatRadius?` (default `3.4` venue units), `onSelectionChange?`,
`onSectionClick?`, `onRowClick?`, `onSeatToggle?`, `onHoverChange?`.

**Methods:** `setDoc(doc, { keepSelection }?)`, `setLevel(levelId)`,
`setSelection(sel, emit?)`, `clearSelection()`, `moveRowSelection(delta)`,
`zoomBy(factor, clientX?, clientY?)`, `zoomIn()`, `zoomOut()`, `fit()`,
`reset()`, `destroy()`, `isSeatsVisible()`, `pxPerUnit()`,
`clientToVenue(clientX, clientY)`, `getDoc()`,
`getSelection()`, getter `levelId`.

**Geometry (`geometry.ts`):** `ViewBox`, `clamp`, `levelDisplayBounds`,
`fitViewBox`, `zoomViewBox`, `polygonCentroid`, `polygonPath`.

**DOM (`dom.ts`):** `DEFAULT_CSS`, `injectStyles`, `svgEl`, `htmlEl`, `SVG_NS`.

Keyboard: `Escape` clears, `ArrowUp/Down` moves row selection within the
selected section, `Enter/Space` activates a section or toggles the focused
seat (seats of the selected row are tabbable). ARIA: `role="application"` on
the map, `role="button"` + `aria-pressed` on sections and selected-row seats,
polite live region for selection and seat-toggle announcements.

**Seat toggling (L2):** once seats are visible, clicking a seat of the selected
section toggles its status (sold/held are ignored) and fires `onSeatToggle(seat,
section)` with the new status. The toggle lives in a local overlay until the
host re-renders with an updated document; the L1 selection is untouched.

## @venue-seats/renderer-3d — `packages/renderer-3d/src/`

three.js renderer sharing the same data model as the 2D SVG renderer.
Auto-degrades to 2D on low-end devices, narrow viewports, or when WebGL is
unavailable.

```ts
import { createVenueView } from "@venue-seats/renderer-3d";

const view = createVenueView(host: HTMLElement, {
  doc, levelId?, selection?, seatVisibleAt?, seatRadius?,
  onSelectionChange?, onSectionClick?, onRowClick?, onSeatToggle?, onHoverChange?,
  force3D?,   // attempt 3D even when the probe says no; still falls back on failure
});
// view.mode: "3d" | "2d" — actually created mode
// view.controller: SeatMap3DController | SeatMapController
```

**`VenueView`** (both modes): `mode`, `controller`, `setDoc(doc, { keepSelection }?)`,
`setLevel(levelId)`, `setSelection(sel, emit?)`, `clearSelection()`, `zoomBy(factor)`,
`zoomIn()`, `zoomOut()`, `fit()`, `reset()`, `getDoc()`, `getSelection()`,
`destroy()`. Selections made in one mode show in the other — the demo app
toggles 2D/3D with a shared `selection` state.

`createVenueView` probes the device (`probe3D()`: WebGL present, not
low-end — `hardwareConcurrency ≤ 4` or `deviceMemory ≤ 2` — and viewport not
phone-narrow, `innerWidth ≤ NARROW_VIEWPORT` = 640); `force3D: true`
skips the probe. If 3D construction fails (no WebGL context) the factory
catches it and returns the 2D `SeatMapController` instead. `use3D(options)`
exposes the same decision for callers who want to branch before creating a
view; the demo uses it to explain *why* the fallback happened
(`probe3D().webgl`).

**Mobile parity:** the 2D renderer is pointer-event based, so touch works
through the same code path as mouse: one finger pans, two fingers pinch-zoom
anchored at the pinch midpoint, a tap activates (and a pinch never
activates). On a phone-width viewport the demo shows the 2D map by default
and says so; desktop keeps the 3D canvas. Acceptance walkthrough (real touch
via CDP against the built demo, 13 checks incl. pinch/pan/select and the
narrow-viewport fallback): `pnpm --filter @venue-seats/demo walkthrough:mobile`
(screenshots in `docs/screenshots/10-mobile-*.png`).

**3D controller:** orbit/zoom/pan camera framed on the level bounds; a click
is raycast onto the ground plane (`venueFromRay`) back into venue
coordinates, then resolved by `resolveVenueActivate` — the same
section → seat (L2, gated on screen px per unit) → row funnel as the 2D
renderer, so both modes hit-test identical geometry. Selected rows lift and
grow their seat spheres; seat colours follow status exactly as in 2D
(overrides win over the document). Sold/held seats are never toggled. The
canvas carries `role="application"` plus the venue label like the 2D svg
and is focusable; `Escape` clears the selection exactly as in 2D.

**Pure helpers (`scene.ts`, testable without WebGL):** `buildScene3D(doc,
levelId?, { seatRadius }?)` (extruded section slabs, one instanced sphere per
seat coloured by status, stage box, ground plane), `applySelection3D`,
`applyStatuses3D(overrides)`, `pxPerUnit3D(viewportHeight, distance, fovDeg)`,
`venueFromRay(camera, ndcX, ndcY)`, `createVenueCamera(bounds, aspect)`,
`resolveVenueActivate(level, x, y, { selection, seatsVisible, seatRadius })`.

**Constants (`scene.ts`):** `SEAT_COLORS` (the 3D palette for `sold` /
`held` / `selected`; available seats take their section tier colour, exactly
as in 2D), `FOV_3D` (45°, the vertical field of view `createVenueCamera`
frames with).

**Capability (`capability.ts`):** `hasWebGL()`, `probe3D()` →
`{ webgl, lowEnd, narrow }`, `supports3D()`, `isNarrowViewport(width?)`,
`NARROW_VIEWPORT` (640 px).

## @venue-seats/react — `packages/react/src/`

```tsx
<SeatMap doc levelId? selection? seatVisibleAt? seatRadius?
  onSelectionChange? onSectionClick? onRowClick? onSeatToggle? onHoverChange?
  className? style? aria-label? />
```

Imperative handle (`ref`): `zoomIn()`, `zoomOut()`, `reset()`, `fit()`,
`controller()`.

## @venue-seats/vue — `packages/vue/src/`

```vue
<VenueSeatMap :doc :level-id :selection :seat-visible-at :seat-radius
  @selection-change @section-click @row-click @seat-toggle @hover-change />
```

`v-model:selection` works (prop `selection` + event `selectionChange`).
Template ref expose: `zoomIn()`, `zoomOut()`, `reset()`, `fit()`, `controller()`.

## venue_seats (Flutter) — `packages/venue_seats/lib/`

```dart
VenueSeatMap(
  document: doc,            // VenueDocument.fromJson(jsonDecode(...))
  levelId: ...,             // defaults to first level
  selection: sel,           // controlled SeatSelection(sectionId, rowId?)
  onSelectionChanged: ...,
  onSectionActivated: ...,
  onRowActivated: ...,
  onSeatActivated: ...,      // L2: seat toggled, seat.status is the new status
  onHoverChanged: ...,
  seatVisibleAt: 0.7,       // defaults
  seatRadius: 3.4,
  minZoom: 0.6, maxZoom: 40,
)
```

Exports: `VenueDocument` (+ `fromJson`), `Venue`, `Stage`, `Level`, `Section`,
`SeatRow`, `Seat`, `SeatStatus`, `PriceTier`, `SeatSelection`, `SeatMapHover`,
`VenueSeatMapPainter`, `ViewFit`, `VenueBounds`, `Availability`. Geometry and
hit-testing mirror the JS core (`geometry.dart`): `sectionPoints`, `boundsOf`,
`levelBounds`, `levelDisplayBounds`, `pointInPolygon`, `sectionAt`, `rowAt`
(maxDistance = 40), `seatAt` (hitRadius = 3.4), `rowAvailability`,
`sectionAvailability`, `priceTierOf`, `sectionColor`.
