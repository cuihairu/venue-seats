# venue-seats

Venue seat maps for events — data model, JSON Schema, and renderers.

`venue-seats` turns a venue description (levels, sections, rows, seats,
stage orientation) into an interactive seat map you can render, click, and
filter. One JSON data format, three consumers:

| Consumer | Package | Status |
|---|---|---|
| React | `@venue-seats/react` | planned |
| Vue | `@venue-seats/vue` | planned |
| Flutter | `packages/venue_seats` (Dart) | planned |

## Why this exists

Real venue seat data in the open-source world is close to zero, and the
commercial tools (seats.io, seatmap.pro, SeatLayer) are either licensed or
keep the renderer closed. This project is a clean-room implementation with a
MIT-licensed core: **our own code, our own data format, our own geometry.**

- No code or seat data copied from commercial products.
- Example venues are rebuilt from public layout information and are clearly
  labelled `demo` / `示意` — they are not guaranteed to match the real venue.
- Official venue seat charts are copyrighted by their owners and are never
  bundled or scraped into this repository.

## Scope

**L1 — sections (区) and rows (排) selection.** First milestone: pick a
section, then a row. This is what most Chinese stadium/concert flows need.

**L2 — per-seat (座).** Optional upgrade once per-seat geometry is available.

**L3 — 3D view.** WebGL (three.js) renderer sharing the same data model as the
2D canvas/SVG renderer; auto-degrades to 2D on low-end devices.

## Design bar

The visual and interaction quality target is the commercial products in this
space: smooth zoom/pan, hover highlights, sold-out states, price-tier colour
coding, stage orientation, level switching, and keyboard/screen-reader
accessibility. Looking at those products for reference is fine; copying their
code, assets, or seat data is not.

## Data format

See [`schemas/venue-seats.schema.json`](schemas/venue-seats.schema.json) and
[`docs/data-format.md`](docs/data-format.md).

## 中文说明

中文文档见 [README.zh.md](README.zh.md)。本项目只放我们自己实现的代码与数据，
不抄任何商业项目的代码、素材或座位数据；示例场馆按公开资料重建并标注"示意"。
