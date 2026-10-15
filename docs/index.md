---
layout: home
hero:
  name: venue-seats
  text: Venue seat maps from one JSON file
  tagline: Data model + JSON Schema + renderers for React, Vue and Flutter
  actions:
    - theme: brand
      text: Quick start
      link: /quickstart
    - theme: alt
      text: Data format
      link: /data-format
features:
  - title: One JSON, three consumers
    details: React, Vue and Flutter read the same venue document — no per-platform data. Hit-testing goes through the same core geometry on every platform.
  - title: L1 + L2 selection, plus a 3D view
    details: Section, then row, then per-seat selection once zoomed in, and a three.js 3D view sharing the same data and selection — with smooth zoom/pan, hover highlights, sold-out states, price-tier colouring and keyboard/screen-reader support.
  - title: Clean-room and MIT
    details: Own code, own data format, own geometry. Demo venues are rebuilt from public layout info and marked as illustrative — no official seat charts.
---

> **English** | [中文](index.zh.md)

## Status

| Consumer | Package | Status |
|---|---|---|
| React | `@venue-seats/react` | in repo, not yet on npm |
| Vue | `@venue-seats/vue` | in repo, not yet on npm |
| 3D (three.js) | `@venue-seats/renderer-3d` | in repo, not yet on npm |
| Flutter | `packages/venue_seats` (Dart) | in repo, not yet on pub |

Scope: **L1 done** (sections + rows), **L2 done** (per-seat toggling while
zoomed in), **L3 done** (three.js 3D view, auto-fallback to 2D), **mobile
done** (touch parity: pan / pinch-zoom / tap-select, narrow-viewport
fallback). See [Data format](/data-format) and [API](/api).
