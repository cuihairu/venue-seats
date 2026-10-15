# Changelog

Changes to the `venue_seats` Flutter package. The version tracks the
`@venue-seats` web packages; the JSON contract is pinned separately by
`schemaVersion`.

## [0.0.1] - unreleased

### Added

- `VenueSeatMap`: `CustomPainter` + `InteractiveViewer` seat map reading the
  same JSON documents as the web packages — zoom/pan, hover, sold-out states,
  price-tier colouring, stage, and section (区) then row (排) selection.
- Per-seat tapping once a section is selected (`onSeatActivated`), with a zoom
  gate that falls back to row picking when seats are too small to draw.
- Touch gestures: one-finger pan and pinch zoom.
- Geometry helpers mirroring core (`boundsOf`, `levelBounds`, `sectionAt`,
  `rowAt`, `seatAt`, availability) plus `ViewFit` framing.
- Structural validation mirroring core's `validate()`, including rejection of
  unknown `schemaVersion` values.

### Fixed

- `ViewFit` centring and painter repaint-equality; an unknown `levelId` falls
  back to the first level instead of an empty map.
