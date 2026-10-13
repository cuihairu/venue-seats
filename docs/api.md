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
| `boundsOf` / `levelBounds` / `venueBounds` | `(points \| level \| doc) => Bounds \| undefined` | bounding boxes |
| `levelById` | `(doc, levelId) => Level \| undefined` | |
| `priceTierOf` | `(doc, tierId) => PriceTier \| undefined` | |
| `sectionColor` | `(doc, section) => string` | section tier colour, else `#64748b` |
| `rowAvailability` / `sectionAvailability` | `(row \| section) => Availability` | total vs available counts |
| `toggleSelect` | `(seat) => Seat` | sold/held cannot be selected; **not yet wired into any renderer** (L2) |

## @venue-seats/renderer — `packages/renderer/src/`

Framework-agnostic SVG engine. One `SeatMapController` drives one host
element; the React and Vue wrappers call into it.

```ts
new SeatMapController(host: HTMLElement, options: SeatMapOptions)
```

**`SeatMapOptions`:** `doc` (required), `levelId?`, `selection?` (controlled),
`seatVisibleAt?` (default `0.7` screen px per venue unit — seats appear above
it), `seatRadius?` (default `3.4` venue units), `onSelectionChange?`,
`onSectionClick?`, `onRowClick?`, `onHoverChange?`.

**Methods:** `setDoc(doc, { keepSelection }?)`, `setLevel(levelId)`,
`setSelection(sel, emit?)`, `clearSelection()`, `moveRowSelection(delta)`,
`zoomBy(factor, clientX?, clientY?)`, `zoomIn()`, `zoomOut()`, `fit()`,
`reset()`, `destroy()`, `isSeatsVisible()`, `pxPerUnit()`, `getDoc()`,
`getSelection()`, getter `levelId`.

**Geometry (`geometry.ts`):** `ViewBox`, `clamp`, `levelDisplayBounds`,
`fitViewBox`, `zoomViewBox`, `polygonCentroid`, `polygonPath`.

**DOM (`dom.ts`):** `DEFAULT_CSS`, `injectStyles`, `svgEl`, `htmlEl`.

Keyboard: `Escape` clears, `ArrowUp/Down` moves row selection within the
selected section, `Enter/Space` activates a section. ARIA: `role="application"`
on the map, `role="button"` + `aria-pressed` on sections, polite live region
for selection changes.

## @venue-seats/react — `packages/react/src/`

```tsx
<SeatMap doc levelId? selection? seatVisibleAt? seatRadius?
  onSelectionChange? onSectionClick? onRowClick? onHoverChange?
  className? style? aria-label? />
```

Imperative handle (`ref`): `zoomIn()`, `zoomOut()`, `reset()`, `fit()`,
`controller()`.

## @venue-seats/vue — `packages/vue/src/`

```vue
<VenueSeatMap :doc :level-id :selection :seat-visible-at :seat-radius
  @selection-change @section-click @row-click @hover-change />
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
  onHoverChanged: ...,
  seatVisibleAt: 0.7,       // defaults
  seatRadius: 3.4,
  minZoom: 0.6, maxZoom: 40,
)
```

Exports: `VenueDocument` (+ `fromJson`), `Venue`, `Stage`, `Level`, `Section`,
`SeatRow`, `Seat`, `SeatStatus`, `PriceTier`, `SeatSelection`, `SeatMapHover`,
`VenueSeatMapPainter`, `ViewFit`, `VenueBounds`, `Availability`,
`levelDisplayBounds`.
