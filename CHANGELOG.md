# Changelog

Notable changes to venue-seats are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); the project pins
`schemaVersion` (data contract) separately from package versions.

## [Unreleased]

### Added

- L1 seat-map foundation: venue data model + JSON Schema, structural
  validation, hit-testing and bounds helpers (`@venue-seats/core`);
  2D SVG renderer with zoom/pan, hover, sold-out states, price-tier
  colouring, stage and keyboard/ARIA support (`@venue-seats/renderer`);
  React and Vue wrappers sharing the same engine; Flutter package
  (`venue_seats`) mirroring the geometry with CustomPainter;
  five demo venues (`provenance: demo`) plus the docs site.
- L2 per-seat selection: `seatAt` hit-testing in core, `onSeatToggle`
  with keyboard/ARIA in the renderer, `onSeatActivated` on Flutter,
  passed through by the React/Vue wrappers.
- L3 3D view: three.js programmatic geometry reading the same document
  as 2D, with shared selection state and a low-end/narrow-viewport
  fallback to 2D (`@venue-seats/renderer-3d`).
- Mobile touch: one-finger pan, pinch zoom, and ≤640px viewport
  fallback to the 2D renderer.
- Validators reject unknown `schemaVersion` on both web (core) and
  Flutter, mirrored against the JSON Schema `enum` by a gate test.
- Publishing prerequisites: `repository` metadata on every publishable
  manifest and pubspec, guarded by
  `packages/venues-demo/test/manifests.test.ts`.

### Fixed

- Flutter `ViewFit` centring and painter repaint-equality; unknown
  `levelId` falls back to the first level instead of an empty map.
