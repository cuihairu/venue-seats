# Glossary

This page states the repository's source-level architecture as reusable terms. Paths resolve from the repository root. The [Chinese glossary](/zh/glossary) mirrors the same concepts; see also the [architecture layers](/architecture).

## Canonical Data Contract

| Term | English | Definition | Evidence |
|---|---|---|---|
| 场馆文档 | Venue Document | The versioned JSON tree handed to every renderer: venue metadata, stage, price tiers, levels, and provenance. `schemaVersion` must equal `"1"` or validation rejects it. | `packages/core/src/index.ts:72` |
| 座位状态 | Seat Status | The four local visual states—`available`, `selected`, `sold`, and `held`. Input documents carry them; runtime seat toggles add controller-local overrides. | `packages/core/src/index.ts:6` |
| 一级选择 | L1 Selection | A section plus an optional row. It is a controlled client-local value, not persisted repository state. | `packages/core/src/index.ts:95` |
| 命中测试 | Hit Testing | Venue-coordinate resolution of a pointer into a section, row, or visible seat; web and Flutter duplicate the geometry because Flutter cannot import TypeScript. | `packages/core/src/index.ts:166` |

## State Model

| Term | English | Definition | Evidence |
|---|---|---|---|
| 受控选择 | Controlled Selection | A selection owned by the host application and passed into each renderer; callbacks only propose changes, so React, Vue, and Flutter wrappers do not own canonical state. | `packages/core/src/index.ts:95` |
| 座位覆盖 | Seat Override | An in-memory map of seat status changes made after a document is loaded; it disappears on teardown and is cleared when the document or level changes. | `packages/renderer/src/controller.ts:78` |
| 悬停信息 | Hover Info | Controller-local section/row/seat preview plus screen coordinates, throttled by `requestAnimationFrame`; no database or network store participates. | `packages/renderer/src/controller.ts:90` |
| 视图状态 | View State | The zoomable SVG viewBox, viewport size, fit scale, active pointers, drag phase, and destroyed flag—integral to each web controller's lifetime. | `packages/renderer/src/controller.ts:88` |
| Flutter 变换 | Flutter Transform | `TransformationController` state for user pan/zoom plus a painter fit transform; state is tied to the widget `State`, and a document change clears seat overrides and refits. | `packages/venue_seats/lib/src/seat_map.dart:76` |

## Renderer Layers

| Term | English | Definition | Evidence |
|---|---|---|---|
| 二维控制器 | 2D Controller | A one-host SVG controller that combines document state, DOM, pointer/keyboard input, hit testing, ARIA, and zoom state; `destroy()` detaches listeners and clears children. | `packages/renderer/src/controller.ts:68` |
| 二维样式协议 | 2D Style Contract | The injected `<style>` node and default CSS classes provide each host's visual contract; content strings are localized in the renderer source. | `packages/renderer/src/dom.ts:28` |
| 三维场景 | 3D Scene | A three.js scene assembled from stretched sections, instanced seats, a stage, and a ground plane, with pure helpers for selection/status/ray-to-venue updates. | `packages/renderer-3d/src/scene.ts:31` |
| 三维控制器 | 3D Controller | A canvas/WebGL controller owning scene, camera, orbit controls, selection overrides, pointer state, resizing, and the animation loop. | `packages/renderer-3d/src/controller.ts:60` |
| 能力探测 | Capability Probe | The narrow-viewport, low-end device, and WebGL checks that decide whether 3D is attempted. | `packages/renderer-3d/src/capability.ts:1` |
| 统一视图 | Unified View | A small facade with `mode` plus document, selection, zoom, and lifecycle methods; creation tries 3D when allowed and catches construction failure to build 2D. | `packages/renderer-3d/src/controller.ts:27` |
| Flutter 画笔 | Flutter Painter | A `CustomPainter` that reads document, selection, hover, fit, and status overrides to paint sections, rows, seats, labels, and stage. | `packages/venue_seats/lib/src/painter.dart:11` |

## Application Boundaries

| Term | English | Definition | Evidence |
|---|---|---|---|
| React 壳 | React Shell | A one-time mounted controller wrapped in React refs and effects; document/level/selection props sync into it while callbacks are read from a latest-props ref. | `packages/react/src/SeatMap.tsx:37` |
| Vue 壳 | Vue Shell | Vue lifecycle manages the same controller and exposes imperative zoom/controller methods; `v-model:selection` and watchers bridge controlled state. | `packages/vue/src/SeatMap.ts:20` |
| Flutter 组件 | Flutter Widget | The public `VenueSeatMap` props, callbacks, zoom limits, and interaction thresholds form the Dart shell contract; state subclasses stay private. | `packages/venue_seats/lib/src/seat_map.dart:17` |
| 演示应用状态 | Demo Application State | React state owns selected/loaded venue, level, selection, requested 3D mode, actual view mode, load error, and retry tick; it lazily imports venue JSON. | `apps/demo/src/App.tsx:7` |
| 场馆入口 | Venue Entry | A lazy `load()` plus metadata and provenance; Vite splits each dynamic import into its own JSON chunk. | `apps/demo/src/venues.ts:4` |
| 演示数据包 | Demo Venue Package | Static JSON fixtures imported as typed documents and exported as one array; generation is a reproducible script, not a runtime service. | `packages/venues-demo/src/index.ts:16` |
| 数据集快照 | Dataset Snapshot | The factual venue metadata file committed to Git and checked without network access; seat charts are intentionally absent. | `scripts/validate-dataset.mjs:1` |

## Build And Release

| Term | English | Definition | Evidence |
|---|---|---|---|
| 发布包图 | Publish Package Graph | Six publishable npm workspace packages plus one private app; workspace resolution uses source TypeScript locally and `dist/` after `publishConfig` substitution. | `packages/core/package.json:11` |
| 发布契约 | Publish Contract | Before release, dry-run tarballs must contain declared `dist/` entrypoints and load under Node ESM. | `scripts/check-publish.mjs:26` |
| 版本门禁 | Version Gate | Every publishable manifest and the Flutter pubspec must already match the requested release version. | `scripts/check-version.mjs:1` |
| Pages 输出 | Pages Output | A VitePress bilingual build under `/venue-seats/`, excluding raw review archives; its checker verifies base-safe internal URLs. | `docs/.vitepress/config.mts:3` |

## Glossary Navigation

- [Chinese glossary](/zh/glossary)
- [Architecture layers](/architecture)
- [API](/api)
