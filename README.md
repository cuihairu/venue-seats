# venue-seats

> **English** | [中文](README.zh.md)

<p align="center"><img src="logo.svg" alt="venue-seats logo" width="64" height="64"></p>

<p align="center">
  <a href="https://github.com/cuihairu/venue-seats/tree/main/packages/react"><img src="https://img.shields.io/badge/React-0.0.1-61dafb" alt="React 0.0.1"></a>
  <a href="https://github.com/cuihairu/venue-seats/tree/main/packages/vue"><img src="https://img.shields.io/badge/Vue-0.0.1-42b883" alt="Vue 0.0.1"></a>
  <a href="https://github.com/cuihairu/venue-seats/tree/main/packages/venue_seats"><img src="https://img.shields.io/badge/Flutter-0.0.1-02569b" alt="Flutter 0.0.1"></a>
  <a href="https://github.com/cuihairu/venue-seats/tree/main/packages"><img src="https://img.shields.io/badge/TypeScript-5.6-3178c6" alt="TypeScript 5.6"></a>
  <a href="https://github.com/cuihairu/venue-seats/tree/main/packages/venue_seats"><img src="https://img.shields.io/badge/Dart-3.4-0175c2" alt="Dart 3.4"></a>
  <a href="https://github.com/cuihairu/venue-seats/actions/workflows/ci.yml"><img src="https://github.com/cuihairu/venue-seats/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://cuihairu.github.io/venue-seats/"><img src="https://img.shields.io/badge/docs-site-blue" alt="Docs"></a>
  <a href="https://codecov.io/gh/cuihairu/venue-seats"><img src="https://codecov.io/gh/cuihairu/venue-seats/branch/main/graph/badge.svg" alt="codecov"></a>
  <a href="https://github.com/cuihairu/venue-seats/blob/main/LICENSE"><img src="https://img.shields.io/github/license/cuihairu/venue-seats" alt="License: MIT"></a>
</p>

Venue seat maps for events — data model, JSON Schema, and renderers.

`venue-seats` turns a venue description (levels, sections, rows, seats,
stage orientation) into an interactive seat map you can render, click, and
zoom. One JSON data format, three consumers:

| Consumer | Package | Status |
|---|---|---|
| React | `@venue-seats/react` | in repo, not yet on npm |
| Vue | `@venue-seats/vue` | in repo, not yet on npm |
| Flutter | `packages/venue_seats` (Dart) | in repo, not yet on pub |

## Demo

`apps/demo` is a Vite app rendering the five demo venues plus the four
rebuilt public samples (`provenance: "public"`, see
[`docs/data-format.md`](docs/data-format.md)) with `@venue-seats/react`:
level tabs, price-tier legend, section → row selection, zoom/pan,
sold-out states, and a 2D/3D toggle sharing one selection state.

![overview](docs/screenshots/01-overview-national-stadium.png)

More states in [`docs/screenshots/`](docs/screenshots): level switch,
tier colours, section/row selection, hover tooltip, sold-out sections,
and the octagonal arena venue.

| Venue | Shape | File |
|---|---|---|
| National Stadium "Bird's Nest" · Beijing | oval stadium, 3 levels | `demo-national-stadium.json` |
| Shanghai Stadium · Shanghai | oval stadium, 3 levels | `demo-shanghai-stadium.json` |
| Mercedes-Benz Arena · Shanghai | octagonal arena | `demo-mercedes-arena.json` |
| Cadillac Arena (Wukesong) · Beijing | octagonal arena | `demo-cadillac-arena.json` |
| Shenzhen Bay Sports Center · Shenzhen | oval stadium, 3 levels | `demo-shenzhen-bay.json` |

All five are rebuilt from public layout information, simplified, and
marked `"provenance": "demo"`. **They are not guaranteed to match the
real venues, and no official seat chart is included.**

## Why this exists

Real venue seat data in the open-source world is close to zero, and the
commercial tools (seats.io, seatmap.pro, SeatLayer) are either licensed or
keep the renderer closed. This project is a clean-room implementation with a
MIT-licensed core: **our own code, our own data format, our own geometry.**

- No code or seat data copied from commercial products.
- Example venues are rebuilt from public layout information and are clearly
  labelled `demo` (illustrative) — they are not guaranteed to match the real
  venue.
- Official venue seat charts are copyrighted by their owners and are never
  bundled or scraped into this repository.

## Scope

**L1 — section and row selection. Done.** Pick a section, then a row. This is
what most Chinese stadium/concert flows need.

**L2 — per-seat. Done.** Once seats are visible (zoomed in), clicking a
seat toggles it and `onSeatToggle` (TS) / `onSeatActivated` (Flutter) reports
the seat with its new status; keyboard users tab through the selected row and
press Enter. The L1 section → row selection is left untouched.

**L3 — 3D view. Done.** WebGL (three.js) renderer sharing the same data
model as the 2D SVG renderer: procedural geometry (extruded section slabs,
instanced seat spheres coloured by status, stage box), the same
section → row → seat hit-testing funnel, and a shared selection state — the
demo app toggles 2D/3D with one `selection`. Auto-degrades to 2D on low-end
devices, phone-width viewports, or when WebGL is unavailable
(`createVenueView`). Mobile touch (one-finger pan, two-finger pinch-zoom, tap
to select) goes through the same pointer-event path as the desktop mouse
interactions; `pnpm --filter @venue-seats/demo walkthrough:mobile` runs the
acceptance walkthrough (real touch via CDP) against the built demo.

## Design bar

The visual and interaction quality target is the commercial products in this
space: smooth zoom/pan, hover highlights, sold-out states, price-tier colour
coding, stage orientation, level switching, and keyboard/screen-reader
accessibility. Looking at those products for reference is fine; copying their
code, assets, or seat data is not.

## Data format

See [`schemas/venue-seats.schema.json`](schemas/venue-seats.schema.json) and
[`docs/data-format.md`](docs/data-format.md).

## Local test policy

CI and local development split by change surface - a one-line docs edit must
not compile everything.

1. **Docs only** (`*.md`, `docs/**`, images): no compile. The main CI
   workflow's `paths-ignore` already skips those paths.
2. **Code**: run the changed subset only, never the full suite.
   - `pnpm --filter <changed-package> test`
   - `flutter test packages/venue_seats`
3. **Full suite** (`pnpm -r test` + `flutter test`): only when
   package.json / pnpm-lock.yaml / pubspec.yaml, `.github/**`,
   Docker/Compose config changes, or before a release.

Release readiness has its own gate: run `pnpm publish:check` after
`pnpm -r build` (CI wires it straight after the build step). For each
package it takes the real tarball via `npm pack --dry-run`, confirms the
files declared in `publishConfig` are present inside `dist/`, that the
package carries `LICENSE` and `README.md`, and really `import()`s every
`.js` entry point through the published dependency graph - a package that
builds but a consumer cannot load (extension-less relative import, JSON
without an import attribute) goes red here.

