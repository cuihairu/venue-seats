# Architecture

This is a source-level analysis of tracked code at HEAD `58d21c478e80ab980c937470704c820079bfd0eb`. It describes nine layers by responsibility rather than directory name. The runtime dependency graph has no server process, Redis, MySQL, SQLite, or other persistent service. Source files contain one outbound fetch in a build-time collector; all other state lives in memory, Git-tracked files, or the browser DOM. The [Chinese architecture](/zh/architecture) mirrors this page; the [English glossary](/glossary) names each boundary.

## Reading Rules

- A layer is a responsibility, not a package directory. One package can span several layers; one layer can span several packages.
- Canonical selection is controlled by the host application. Wrappers and controllers keep transient input, hover, camera, and status-override state only.
- Runtime channels are direct package imports, function calls, React/Vue callbacks, DOM events, Flutter callbacks, and renderer-native APIs. The only source-level HTTP client is `scripts/collect-dataset.mjs` calling the Wikidata SPARQL endpoint at line 25.
- Package dependency edges are declared by manifests, not implied by directories: renderer imports core; React and Vue import core and renderer; renderer-3d imports core, renderer, and three; demo imports core, React, renderer, renderer-3d, and venues-demo.

## L0 Canonical Data Contract

### Implementation

`packages/core/src/index.ts:72` defines `VenueDocument` and the `Venue → Level → Section → Row → Seat` tree; seat states begin at line 6; L1 `RowSelection` begins at line 95; structural validation begins at line 110; geometry, hit testing, and availability helpers continue through line 308. The JSON Schema is `schemas/venue-seats.schema.json:1`. Demo fixtures are imported as typed documents by `packages/venues-demo/src/index.ts:16`; factual dataset records use a separate versioned snapshot shape checked by `scripts/validate-dataset.mjs:34`.

### Configuration Schema

The schema version is pinned at `packages/core/src/index.ts:12`; nested fields and cross-references are constrained by `schemas/venue-seats.schema.json:1`. No separate runtime configuration file exists.

### Protocol Files And Copy

No dedicated runtime protocol file exists. `docs/data-format.md:1` and `docs/zh/data-format.md:1` document the JSON protocol. Demo disclaimer copy is in `apps/demo/src/venues.ts:12` and `packages/venues-demo/src/index.ts:24`; renderer ARIA/status strings and injected CSS are inline.

### Configuration Inputs

JSON documents, selected level id, controlled selection, seat visibility threshold, seat radius, and event callbacks. The 2D public option contract begins at `packages/renderer/src/controller.ts:46`.

### State Storage

Canonical documents are Git-tracked JSON values or fixtures; runtime copies are controller-local memory. No Redis, MySQL, SQLite, localStorage, sessionStorage, IndexedDB, service, queue, or cache is used.

### Lifecycle

Documents enter by package import, demo `load()`, or Flutter `fromJson`; validation rejects unsupported versions before rendering. Hosts can replace documents and reset state, as described in the renderer layers.

### Calls

Every renderer imports the contract. Demo fixture resolution flows through `packages/venues-demo/src/index.ts:16` and lazy imports in `apps/demo/src/venues.ts:20`.

## L1 State Model

### Implementation

Selection, hover, seat overrides, and view/transform state are the runtime model. Web 2D owns them in `packages/renderer/src/controller.ts:68`; 3D owns scene-independent equivalents in `packages/renderer-3d/src/controller.ts:60`; Flutter owns them in `packages/venue_seats/lib/src/seat_map.dart:76`. Host-owned canonical selection enters as a controlled prop.

### Configuration Schema

No standalone schema file. Controller option objects are typed by `packages/renderer/src/controller.ts:46`; Flutter thresholds and callbacks are declared by `packages/venue_seats/lib/src/seat_map.dart:17`.

### Protocol Files And Copy

No dedicated protocol file. Hover preview styling is part of the SVG DOM/CSS from `packages/renderer/src/dom.ts:28`; state-related status labels are inline in renderer source.

### Configuration Inputs

Document, level id, selection, seat visibility and radius, callbacks, Flutter zoom bounds, and background color.

### State Storage

All state is in memory: JavaScript objects/maps plus DOM/canvas state, or Dart widget state. Canonical selection remains host state; hover, view, and seat overrides are renderer-lifetime state.

### Lifecycle

Web 2D construction builds host/SVG, injects styles, attaches listeners and `ResizeObserver`, then fit-renders; `destroy()` removes events, observer, DOM, and animation work. Flutter `initState`/`didUpdateWidget`/`dispose` owns `TransformationController`, hover, fit, viewport, selection, and status map. 3D construction builds scene, camera, controls, listeners, observer, and animation loop; teardown cancels rendering, removes listeners, disposes controls/renderer, and removes the canvas. Unified view creation tries 3D and catches construction failure to return 2D.

### Calls

The host sends props; renderer callbacks return proposed selection/status changes; controllers call core geometry/model functions and mutate their own DOM, canvas, or widget state.

## L2 Web 2D Renderer

### Implementation

`packages/renderer/src/controller.ts:68` is the one-host SVG engine. DOM creation and default CSS live in `packages/renderer/src/dom.ts:3`; view fitting, bounds, and SVG helpers live in `packages/renderer/src/geometry.ts:4`; the public re-export surface is `packages/renderer/src/index.ts:1`.

### Configuration Schema

No standalone config schema. `SeatMapOptions extends SeatMapEvents` is in `packages/renderer/src/controller.ts:46`; fallback size, drag tolerance, SVG namespace, and CSS are source constants in `packages/renderer/src/controller.ts:58` and `packages/renderer/src/dom.ts:3`.

### Protocol Files And Copy

No dedicated wire protocol. The DOM/CSS class contract is in `packages/renderer/src/dom.ts:30`; renderer-visible Chinese ARIA and availability strings are inline in `packages/renderer/src/controller.ts`; public docs copy is in `docs/api.md:30` and `docs/zh/api.md:29`.

### Configuration Inputs

Host element plus `SeatMapOptions`; `seatVisibleAt` defaults to `0.7` and `seatRadius` to `3.4`.

### State Storage

Document/level/selection/events/thresholds/seat indexes/seat overrides plus wrapper, SVG, tooltip, live region, viewBox, fit, hover, pointers, drag, pinch, rAF, destroyed, and resize state are private controller fields at `packages/renderer/src/controller.ts:69`; the backing store is host DOM only.

### Lifecycle

The constructor begins at line 99. `setDoc` at line 147 resets/clears state unless selection is explicitly kept; `setLevel` at line 161 clears selection and rerenders; `fit` begins at line 253; `destroy` at line 280 detaches all listeners, disconnects the observer, cancels rAF, and clears host children.

### Calls

Inbound host-to-controller calls and DOM events; outbound selection/section/row/seat/hover callbacks; calls into core geometry, availability, and status transitions; imports from renderer DOM/geometry modules.

## L3 Web 3D Renderer And View Selection

### Implementation

Capability checks are `packages/renderer-3d/src/capability.ts:1`; pure scene assembly/update/ray helpers are `packages/renderer-3d/src/scene.ts:31`; the WebGL controller and `VenueView` facade begin at `packages/renderer-3d/src/controller.ts:27`; public exports are `packages/renderer-3d/src/index.ts:1`. The fallback factory is `createVenueView` at `packages/renderer-3d/src/controller.ts:478`.

### Configuration Schema

No standalone schema. `VenueViewOptions extends SeatMapOptions` with optional `force3D` is defined at `packages/renderer-3d/src/controller.ts:44`; thresholds and camera constants are source constants.

### Protocol Files And Copy

No dedicated protocol file. The three.js programmatic scene is the protocol; canvas ARIA strings are inline; public contract copy is in `docs/api.md:67` and `docs/zh/api.md:64`.

### Configuration Inputs

Host, 2D options plus optional `force3D`; runtime viewport width, memory/concurrency probes, and WebGL availability; camera distances, click tolerance, zoom factors, FOV, narrow viewport, and seat color map are source constants.

### State Storage

Host, canvas, renderer, controls, camera/scene factories, document, level, selection, seat overrides, thresholds, events, resize observer, pointer state, and destroyed flag are controller fields at `packages/renderer-3d/src/controller.ts:69`; backing stores are browser WebGL canvas and DOM.

### Lifecycle

`SeatMap3DController` safely unwinds constructor resources at `packages/renderer-3d/src/controller.ts:155`; document/level/selection setters rebuild and normalize state; teardown stops animation, removes listeners, disconnects resizing, disposes controls/renderer, and removes the canvas. `createVenueView` probes, attempts 3D, catches failure, and returns 2D.

### Calls

Demo app-to-`createVenueView`, `VenueView` delegation, pointer/keyboard DOM events, three.js calls, pure scene-helper calls, and renderer/core contract calls.

## L4 Flutter Renderer

### Implementation

The public widget contract begins at `packages/venue_seats/lib/src/seat_map.dart:17`; the painter begins at `packages/venue_seats/lib/src/painter.dart:11`; the pure-Dart contract mirror is `packages/venue_seats/lib/src/model.dart:1`; geometry, hit testing, and view fit are `packages/venue_seats/lib/src/geometry.dart:1`; public exports are `packages/venue_seats/lib/venue_seats.dart:19`.

### Configuration Schema

No standalone schema file. Widget thresholds and callbacks are declared at `packages/venue_seats/lib/src/seat_map.dart:17`; `packages/venue_seats/pubspec.yaml:1` is package/platform metadata, not renderer runtime config.

### Protocol Files And Copy

No dedicated protocol file. The Dart model explicitly mirrors TypeScript core against the shared JSON schema (`packages/venue_seats/lib/src/model.dart:1`). ARIA/status label copy is inline in painter/widget code.

### Configuration Inputs

Document, level id, selection, callbacks, seat visibility/radius, min/max zoom, and background color.

### State Storage

Widget `State` owns `TransformationController`, hover, fit, viewport, selection mirror, and seat status map at `packages/venue_seats/lib/src/seat_map.dart:76`; the document remains immutable widget input.

### Lifecycle

`initState` mirrors the initial selection and listens to transform; `didUpdateWidget` syncs selection, clears overrides on document change, clears hover/fit and refits on document/level change; `dispose` removes and disposes transform. Painter rebuild gating compares document, selection, hover, fit, and overrides at `packages/venue_seats/lib/src/painter.dart:246`.

### Calls

Flutter framework callbacks in; widget/painter call geometry and model helpers; interaction callbacks out. There is no channel to the JavaScript renderer and no process boundary.

## L5 Framework Shells

### Implementation

The React shell begins at `packages/react/src/SeatMap.tsx:37`; the Vue shell begins at `packages/vue/src/SeatMap.ts:20`; Flutter's public widget is its own shell/renderer boundary at `packages/venue_seats/lib/src/seat_map.dart:17`.

### Configuration Schema

No standalone schema. Typed props/events are the schema: React `SeatMapProps` begins at `packages/react/src/SeatMap.tsx:5`; Vue props begin at `packages/vue/src/SeatMap.ts:20`; Flutter widget fields begin at `packages/venue_seats/lib/src/seat_map.dart:17`.

### Protocol Files And Copy

No dedicated protocol file. The cross-framework semantic protocol is the controller contract plus `RowSelection`; API copy is in `docs/api.md:136` and `docs/zh/api.md:125`.

### Configuration Inputs

Document, level, selection, rendering thresholds, class/style/ARIA attributes, and framework-specific callbacks.

### State Storage

Only adapter refs, flags, latest-props ref, and framework lifecycle locals. Canonical selection and document remain host state.

### Lifecycle

React mounts once and destroys in effect cleanup, then syncs document/level/selection with effects. Vue mounts/disposes with framework lifecycle and watchers sync props. Flutter uses its own stateful lifecycle and is not bridged to JavaScript.

### Calls

Framework host-to-shell props/events, shell-to-controller method calls, and controller-to-shell callback forwarding.

## L6 Demo Application

### Implementation

The Vite React app combines venue registry, load orchestration, mode selection, stats/selected-detail derivation, and UI copy. App state begins at `apps/demo/src/App.tsx:7`; the registry begins at `apps/demo/src/venues.ts:20`; the entry is `apps/demo/src/main.tsx:1`.

### Configuration Schema

No standalone app schema. Typed `VenueEntry` is at `apps/demo/src/venues.ts:4`; Vite/TypeScript project config and package scripts configure build only.

### Protocol Files And Copy

No dedicated protocol file. Lazy JSON imports are the runtime input channel. Provenance copy is at `apps/demo/src/venues.ts:12`; Chinese UI copy is inline in `apps/demo/src/App.tsx`, including fallback text beginning at line 305.

### Configuration Inputs

User selector/mode/zoom/level actions, lazy venue `load()`, and `probe3D` results.

### State Storage

React `useState` owns venue index, loaded index, document, level, selection, requested 3D flag, actual view mode, error, and retry tick; refs own the map host and active unified view.

### Lifecycle

Selecting a venue starts a cancellable async load and rejects an empty-level document. A matching loaded venue mounts a 3D `VenueView`, stores it, reports actual mode, and destroys it on venue/level/mode changes; selection sync uses `setSelection(..., false)`. The 2D component remains a separately controlled React shell.

### Calls

App-to-React shell props, app-to-unified-view calls, app-to-core derivations, and app-to-venue-entry dynamic imports; the browser/Vite runtime resolves chunk URLs.

## L7 Static Data Assets

### Implementation

Demo fixtures are Git-tracked JSON imported by `packages/venues-demo/src/index.ts:16`; generation is `scripts/gen-venues.mjs:1`; public examples are generated by `scripts/gen-examples.mjs:1`; the factual dataset snapshot is `data/venues.json:1`, collected by `scripts/collect-dataset.mjs:1` and checked by `scripts/validate-dataset.mjs:1`.

### Configuration Schema

Demo/public documents follow `schemas/venue-seats.schema.json:1`; dataset header/records are source-enforced by `scripts/validate-dataset.mjs:34`; provenance is declared in core at `packages/core/src/index.ts:79`.

### Protocol Files And Copy

JSON documents are the data protocol; `docs/data-format.md:1` and `docs/zh/data-format.md:1` document it. Dataset schema docs are `docs/design/dataset-schema.md:1` and `docs/zh/design/dataset-schema.md:1`; provenance copy is inline in fixture sources.

### Configuration Inputs

Generation rules/thresholds and, for the collector, Wikidata endpoint/root types/capacity bounds; the `--merge` CLI flag controls retention.

### State Storage

Git-tracked JSON files are canonical committed output. Generation reads/writes local files; no service-side database exists. Demo package imports fixtures into memory at build/runtime.

### Lifecycle

Generator → committed JSON → import/parse/validate → immutable document. The collector is manually/offline triggered; the validator runs network-free.

### Calls

Script-to-local filesystem, collector-to-Wikidata SPARQL HTTPS, and script/package imports of resulting JSON.

## L8 Build And Release Pipeline

### Implementation

Workspace orchestration begins at `package.json:7`; package build/exports/publish metadata are package manifests such as `packages/core/package.json:11`; the version gate is `scripts/check-version.mjs:1`; the tarball/ESM gate is `scripts/check-publish.mjs:1`; the Pages URL checker is `scripts/check-pages.mjs:1`; the dist resolver is `scripts/dist-resolver.mjs:1`; CI begins at `.github/workflows/ci.yml:22`.

### Configuration Schema

Root package and workspace manifests, package manifests, TypeScript configs, pubspec, and workflow inputs. TypeScript source configs point imports at `src`; `publishConfig` redirects to `dist`, evidenced by `packages/core/package.json:20`.

### Protocol Files And Copy

No dedicated runtime protocol. Package manifests and `publishConfig` are the release protocol; release strategy copy is in `docs/release-strategy.md:1` and `docs/zh/release-strategy.md:1`.

### Configuration Inputs

pnpm/Node/Flutter versions and scripts, requested release version and dry-run switches, workflow secrets/environments, and VitePress base/locales.

### State Storage

Build outputs are filesystem `dist/`; tarballs and Pages output are temporary/build artifacts; no runtime database. Publishing uses registry secrets rather than repo state.

### Lifecycle

Install → typecheck/tests/coverage/build → release gates → manual workflow publishing. Pages separately builds docs, checks URLs, and deploys.

### Calls

Root scripts-to-package scripts, CI-to-scripts, manifest-to-workspace protocol, and release scripts-to-filesystem/npm dry-run. Manual workflow dispatch triggers gates before npm/pub publishing.

## L9 Documentation Site

### Implementation

`docs/.vitepress/config.mts:1` defines bilingual VitePress locales, `/venue-seats/` base, and review exclusion. English pages are root Markdown files; Chinese pages live under `docs/zh/`; the theme wrapper is `docs/.vitepress/theme/index.ts:1`.

### Configuration Schema

No JSON schema. VitePress config and scripts at `docs/package.json:1` are the schema; review exclusion begins at `docs/.vitepress/config.mts:7`.

### Protocol Files And Copy

Markdown is the authoring protocol. This site hosts API/data/release documentation; API source exports and page sections are kept aligned by tests (`packages/core/test/api-doc.test.ts:1`, `packages/renderer/test/api-doc.test.ts:1`, `packages/renderer-3d/test/api-doc.test.ts:1`, `packages/venue_seats/test/api_doc_test.dart:1`).

### Configuration Inputs

VitePress base/locales/nav/sidebar, Markdown/frontmatter, links, and theme CSS.

### State Storage

Git-tracked Markdown, config, theme, and images; generated documentation output is filesystem only.

### Lifecycle

Author/edit → VitePress build → Pages checker → GitHub Pages deployment via `.github/workflows/pages.yml:22`.

### Calls

Markdown cross-links, config-to-theme/page imports, and CI/Pages-to-docs build/check. No server-side rendering API or database.

## Why These Nine Layers

1. **Contract first, not renderer first.** A shared `VenueDocument`, schema pin, and version rejection let web and Dart consumers stay interoperable without a TypeScript bridge (`packages/core/src/index.ts:9`, `schemas/venue-seats.schema.json:1`).
2. **Separate host-owned state from transient renderer state.** Selection is controlled and client-local in core (`packages/core/src/index.ts:95`), while hover/view/seat overrides are controller fields (`packages/renderer/src/controller.ts:69`). This prevents wrappers from silently owning app data and makes prop synchronization testable.
3. **Separate the 2D DOM engine from framework shells.** React and Vue mount the same `SeatMapController` and forward the same callbacks (`packages/react/src/SeatMap.tsx:47`, `packages/vue/src/SeatMap.ts:43`), avoiding duplicated pointer, hit-testing, and accessibility behavior in each framework.
4. **Isolate WebGL and degrade explicitly.** 3D construction is guarded by probes and caught by `createVenueView` (`packages/renderer-3d/src/controller.ts:478`), so a renderer-specific failure does not become an application crash.
5. **Keep the Flutter boundary explicit.** Flutter cannot import TypeScript, so it mirrors the JSON contract in Dart and uses native `CustomPainter`/`InteractiveViewer` (`packages/venue_seats/lib/src/model.dart:1`, `packages/venue_seats/lib/src/seat_map.dart:17`) while parity remains testable.
6. **Keep application composition separate from reusable renderers.** Demo state composes loaded venue, level, mode, and retry state (`apps/demo/src/App.tsx:7`); packages expose reusable controllers, keeping venue selection and lazy chunks out of renderer APIs.
7. **Treat generated JSON as committed assets, not a service.** Fixtures and the dataset are Git files produced and validated by scripts (`packages/venues-demo/src/index.ts:16`, `scripts/validate-dataset.mjs:1`), enabling offline tests without a backend.
8. **Make build and release checks executable contracts.** Version and tarball gates fail before publish (`scripts/check-version.mjs:1`, `scripts/check-publish.mjs:51`), preventing declared paths from pointing at missing or unloadable artifacts.
9. **Keep prose navigation separate from source-derived contracts.** VitePress controls locales/base/nav (`docs/.vitepress/config.mts:10`), while API tests enforce exported API docs against source exports, so documentation is not an accidental runtime dependency.

## Related

- [Glossary](/glossary)
- [API](/api)
- [Data format](/data-format)
- [Dataset schema](/design/dataset-schema)
