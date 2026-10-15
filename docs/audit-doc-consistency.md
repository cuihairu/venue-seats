# Documentation–code consistency audit (2026-10-13; re-run 2026-10-14)

> **English** | [中文](审计-文档一致性.md)

Line references below were captured on 2026-10-13–15; every page since gained a
language switcher, so a reference may be off by two lines.

Method per `~/workspaces/standards/文档与源码一致性审计规范.md` (three
drift classes: docs ahead of code / code ahead of docs / description
mismatch). Fixes follow the code; no entry required changing code to match
the docs.

Audit surface: `README.md`, `README.zh.md`, `docs/data-format.md`,
`todo.md`, GitHub About (`gh repo view`).

Bucket counts: **ahead 5 · code ahead of docs 2 · mismatch 7** (14 entries
in total).

| ID | Page | Claim | Source evidence (file:line) | Class | Severity | Fix |
|---|---|---|---|---|---|---|
| A1 | docs/data-format.md:31-32 | "renderers must reject versions they do not know" | packages/core/src/index.ts:106 only checks that `schemaVersion` exists; packages/venue_seats/lib/src/model.dart:212 the same; no version-comparison logic anywhere in the repo | ahead | P0 | Reword to "the current validators only check that `schemaVersion` exists; rejecting unknown versions is planned behaviour" |
| A2 | docs/data-format.md:21-22 | "the same file drives both 2D and 3D" | no three.js / 3D rendering code in the repo (grep finds nothing); 3D was a todo P2 item | ahead | P1 | Reword to "the same file drives the web and Flutter renderers; 3D is planned" |
| A3 | README.md:54-60 | Scope's L3 (three.js, low-end fallback to 2D) carries no "not implemented" marker; L1 is not marked done either | no 3D code in the repo; L1 is implemented (packages/renderer/src/controller.ts:56 onwards is the L1 engine) | ahead | P1 | Mark L1 done, L2/L3 planned; sync README.zh.md:34-38 |
| A4 | README.md:6 | "render, click, and filter" | no filtering feature: grep "filter" only hits CSS backdrop-filter (packages/renderer/src/dom.ts:64) | ahead | P2 | Change to "render, click, and zoom" |
| A5 | README.md:11-13 / README.zh.md:7-9 | three-consumer status "available" / "可用" | every package is 0.0.1 and unpublished on npm (publish_to: none, or no registry record; the publishing strategy is settled A/A/A, see docs/发布策略.md) | ahead | P2 | Status becomes "in repo, not yet on npm / 源码可用，未发 npm" |
| B1 | docs/data-format.md:10 | stage is only { x, y, rotation } | packages/core/src/index.ts:14-16 defines w?/h?; schemas/venue-seats.schema.json:28-29 includes w/h; scripts/gen-venues.mjs uses stage w/h | code ahead | P1 | Add w?/h? to the tree |
| B2 | repo-wide | none of the 5 packages' public APIs had any interface documentation | the exports of core/renderer/react/vue/flutter (e.g. controller.ts:24-45 SeatMapOptions, seat_map.dart:17-44 constructor parameters) appeared on no documentation page | code ahead | P1 | Stand up a vitepress site; docs/api.md lists each package's public API (checked against source) |
| C1 | README.md:33 | Shenzhen Bay "oval stadium, 2 levels" | packages/venues-demo/venues/demo-shenzhen-bay.json has 3 levels (infield / lower tier / upper tier); scripts/gen-venues.mjs:487-495 two rings + floor | mismatch | P1 | Change to "3 levels" |
| C2 | README.md:32 | venue name "华熙Live·五棵松（凯迪拉克中心）" | scripts/gen-venues.mjs:474 name: "凯迪拉克中心（五棵松）" (the data is the truth) | mismatch | P2 | Align with the data name |
| C3 | README.md:33 | venue name "深圳湾体育中心（春茧）" | scripts/gen-venues.mjs:489 name: "深圳湾体育中心体育馆" | mismatch | P2 | Align with the data name |
| C4 | README.zh.md:21-22 | venue name "深圳湾体育中心" | same as C3 | mismatch | P2 | Align with the data name |
| C5 | README.md:57 | L2 "once per-seat geometry is available" | per-seat geometry is already in the data model (packages/core/src/index.ts:19-26 seats carry x/y/status) and the renderer draws seats by threshold (packages/renderer/src/controller.ts:41-42, 171-172, 306-323); what was missing is the per-seat selection interaction (toggleSelect unwired, core/src/index.ts:252) | mismatch | P2 | Reword to "per-seat geometry is in the data model and the rendering; the per-seat selection interaction is unimplemented" |
| C6 | docs/data-format.md:11 | provenance has no optional marker | packages/core/src/index.ts:77 `provenance?`; schemas/venue-seats.schema.json:6 required does not include provenance | mismatch | P3 | Add `?` to the tree |
| C7 | GitHub About | (front door empty: both description and topics empty) | `gh repo view` returned description:"" homepageUrl:"" topics:null | front door missing | P1 | Fill description and topics via `gh repo edit`, aligned with the README positioning |

## Fix record (2026-10-13, code as truth)

- A1–A5, B1, C1–C6: doc wording changed per the "Fix" column above; no code
  was changed.
- B2: a minimal vitepress site was created under `docs/` (home / quickstart
  / data-format / api); `pnpm -r build` covers its build.
- C7: the About section got its description + topics written via
  `gh repo edit`.
- todo.md was reorganised into a requirements list (see the
  `docs: tidy todo list` commit).

## Re-run (2026-10-14, after L2/L3/mobile landed)

The 14 entries above were re-checked one by one against the current code:
A5 (the packages are still unpublished), B1/B2 and C1–C7 all still match
their fixes; the renderer-3d section of `docs/api.md` was checked item by
item against the real exports of `capability.ts`
(`NARROW_VIEWPORT` = 640, `probe3D()` → `{ webgl, lowEnd, narrow }`,
`use3D`); the GitHub About (C7) description/topics are still in place.

## Re-run (2026-10-15, after A1 landed)

A1 moved from "reword the doc" to "implement in code": `validate()` (core)
and `VenueDocument.validate()` (Flutter) now compare against
`SUPPORTED_SCHEMA_VERSION` / `supportedSchemaVersion` and report
`unsupported schemaVersion "x", expected "1"` for unknown versions;
`schemas/venue-seats.schema.json` was tightened in sync with
`enum: ["1"]`, and `packages/venues-demo/test/schema.test.ts` gates that
"the set of versions the JSON Schema accepts == the set `validate()`
accepts", so it cannot drift again.

Three new entries — all "code ahead of docs": once L2/L3/mobile landed,
some of the fixes in the table above were themselves overtaken (a typical
case: A2's fix said "3D is planned", but 3D is implemented).

| ID | Page | Claim | Source evidence | Class | Severity | Fix |
|---|---|---|---|---|---|---|
| D1 | docs/data-format.md:21-23 | "a 3D view is planned, not built" | `packages/renderer-3d/` exists (d3f2717); `createVenueView` takes the same `VenueDocument` as 2D | code ahead | P1 | Reword to "the 2D SVG, 3D three.js and Flutter painter renderers all take one document, with no per-platform copy" |
| D2 | docs/quickstart.md:81-82 | the demo capability description misses the 2D/3D toggle, per-seat selection and mobile touch | `apps/demo/src/App.tsx` has the 2D/3D toggle with a shared selection; `onSeatToggle` is wired; `walkthrough:mobile` runs 13 checks | code ahead | P2 | Complete all four capabilities |
| D3 | docs/api.md:67-68 | the renderer-3d intro omits the "narrow viewport" degradation condition | `capability.ts`'s `supports3D()` includes the `narrow` gate | code ahead | P3 | Add the narrow viewport to the intro |

Fixes: D1–D3 changed the doc wording; no code was changed. Bucket counts
update to **code ahead of docs 3 (D1, D2, D3)**; the other 11 entries keep
their original verdicts.

## Re-run (2026-10-15, after Pages landed)

C7 closed out: the About homepageUrl
(`https://cuihairu.github.io/venue-seats/`) was previously a 404 — Pages
was enabled in the repository settings (`build_type: "workflow"`) but no
workflow deployed it. Completed: `docs/.vitepress/config.mts` gained
`base: "/venue-seats/"` (the project-page path; without base the build
emits `/assets/...` absolute URLs that 404 once deployed), and the new
`.github/workflows/pages.yml` (build the docs → the
`scripts/check-pages.mjs` gate reads the built HTML and asserts every
internal URL carries the base → configure / upload / deploy-pages). After
the first run the homepageUrl really resolves; C7's three pieces
(description / topics / homepage) all landed.

## Re-run (2026-10-15, after the publishing strategy was decided)

The publishing strategy moved from "pending a decision" to "decided
A/A/A": `docs/发布策略-待拍板.md` was renamed `docs/发布策略.md` and
rewritten as a decision record (decisions + rationale + channel +
remaining manual steps); the A5 evidence note "publishing strategy pending
in todo" was updated to match. Landed items: `publishConfig.access:
"public"` on the 6 packages, the pubspec dropping `publish_to: none` and
gaining `homepage`, the `scripts/check-version.mjs` version guard, and the
`.github/workflows/publish.yml` manual publishing channel (red gates publish
nothing, `dry_run` on by default, no tags). A5's "the packages are not
published" status is unchanged — the channel is ready but no real publish
has run.
