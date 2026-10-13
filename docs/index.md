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
  - title: L1 selection today
    details: Section (区) then row (排) selection with smooth zoom/pan, hover highlights, sold-out states, price-tier colouring and keyboard/screen-reader support.
  - title: Clean-room and MIT
    details: Own code, own data format, own geometry. Demo venues are rebuilt from public layout info and marked 示意 — no official seat charts.
---

## Status

| Consumer | Package | Status |
|---|---|---|
| React | `@venue-seats/react` | in repo, not yet on npm |
| Vue | `@venue-seats/vue` | in repo, not yet on npm |
| Flutter | `packages/venue_seats` (Dart) | in repo, not yet on pub |

Scope: **L1 done** (sections + rows), **L2 planned** (per-seat selection; seat
geometry is already in the data model), **L3 planned, not started** (3D view).
See [Data format](/data-format) and [API](/api).
