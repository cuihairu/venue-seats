# Package publishing strategy — decided: A/A/A (2026-10-15)

> **English** | [中文](发布策略.md)

The three distribution decisions were settled on 2026-10-15, all adopting
option A. This document has moved from "provisioning" to "decision
record": it holds the decisions and their rationale, the publishing channel
that has landed, and the remaining manual steps.

The red lines are unchanged: **version numbers are given and triggered by
the user only**; artifacts that have not passed acceptance testing must not
appear on the Releases page and must not be called a release.

## Decisions and rationale

| Decision | Outcome | Rationale |
|---|---|---|
| 1 npm package names and registry | **A: `@venue-seats/*` scope published to the npmjs public registry** | Claim the namespace; each package only needs `publishConfig.access: "public"` (scoped packages default to restricted) |
| 2 Flutter distribution | **A: pub.dev** | dry-run is already 0 errors 0 warnings; the version follows npm in lockstep, no second channel needed |
| 3 Publishing channel | **A: manual `workflow_dispatch`** | Consistent with the red lines — the version number and the trigger stay in the user's hands; automated publishing would break this |

## Landed (2026-10-15)

- The 6 npm packages gained `publishConfig.access: "public"`
  (guarded by the `packages/venues-demo/test/manifests.test.ts` gate — a
  regression goes red).
- `packages/venue_seats/pubspec.yaml`: removed `publish_to: none`, added
  `homepage: https://cuihairu.github.io/venue-seats/` (same gate guards it).
- `scripts/check-version.mjs <version>`: a pre-publish assertion that "the
  input version == the version of all 6 package.json files + the pubspec",
  red on any mismatch (prevents publishing a version the manifests do not
  declare).
- `.github/workflows/publish.yml`: the manual publishing channel (see the
  next section).

## Publishing channel (`.github/workflows/publish.yml`)

- **Trigger**: `workflow_dispatch` only. No push / schedule / tag trigger, so
  it never starts on its own.
- **Inputs**:
  - `version` (required): the version to publish; it must already be written
    into all the manifests;
  - `npm` / `pub_dev` (boolean, default true): control publishing the 6 npm
    packages and pub.dev respectively;
  - `dry_run` (boolean, **default true**): rehearsal (validate + pack, no
    upload); a real publish requires manually unchecking it.
- **Chained gates**: the `gates` job runs `check-version.mjs` →
  `pnpm -r typecheck` → `test` → `test:coverage` → `build` →
  `pnpm publish:check` (tarball contract + a real import-loading gate) →
  flutter `pub get` / `analyze` / `test`, in that order. Both the npm and
  pub jobs are `needs: gates` — **red gates publish nothing**.
- **No tags, no Releases**: the npm step sets
  `NPM_CONFIG_GIT_TAG_VERSION=false` explicitly (version tags are only ever
  created manually by the user); the workflow has no tag/release action
  anywhere.
- `concurrency: publish` serialises runs to avoid concurrent publishing.

## Remaining manual steps (user only)

1. **secrets**: `NPM_TOKEN` (an npmjs Automation token) and `PUB_TOKEN` (a
   pub.dev publish token, for `dart pub token add`). The corresponding job
   fails without them.
2. **environments**: the workflow references the `npm-publish` /
   `pub-publish` GitHub Environments; to add approval protection, configure
   a required reviewer for them in the repository settings (GitHub
   auto-creates the same-named environments with no protection on the first
   trigger; wiring up approvals is manual).
3. **Release flow**: bump the version in the 7 manifests → commit → trigger
   `publish.yml` manually and fill in `version` → run `dry_run` first to
   inspect the artifacts → then publish for real. The user is the only one
   who can set the version number.

## Prior metadata and gate status (decision basis, kept for the record)

- All 7 packages on the npm side carry the `@venue-seats/*` scope with
  version `0.0.1`; `license: MIT`, `files: ["dist"]` and `publishConfig`
  (main/types/exports switch over to `dist/` at publish time) are all in
  place; the 6 publishable packages carry `repository`
  (type/url/directory), gated by
  `packages/venues-demo/test/manifests.test.ts` — a regression goes red.
- `apps/demo` is `private: true`, so a recursive publish cannot take it
  along (guarded by the same test).
- Publishing contract gate `scripts/check-publish.mjs` (`pnpm publish:check`,
  run in CI right after build): per package it takes the real tarball
  listing via `npm pack --dry-run --json`, asserts that every path declared
  in `publishConfig` main/types/exports exists inside the package and lives
  under `dist/`, then really `import()`s each `.js` entry through the
  published-world dependency graph (`scripts/dist-resolver.mjs` redirects
  bare `@venue-seats/*` specifiers at each other's dist, not the workspace
  sources); a failed load goes red. All 6 packages currently pass.
- On its first run this gate caught three "the package builds but a consumer
  cannot load it" defects, all since fixed: react/vue `index.ts` used
  extension-less relative imports (`./SeatMap`) that Node ESM cannot
  resolve, and venues-demo's JSON import lacked an import attribute
  (`with { type: "json" }`). Bundler consumers never noticed; plain Node
  consumers errored outright.
- The published file set is complete (guarded twice — on disk and in the
  real tarball): all 7 packages carry a `LICENSE` (the root MIT copied
  verbatim, no clause edits; npm force-includes the package-root LICENSE even
  when `files` lists only dist); the Flutter package additionally has
  `README.md` + `CHANGELOG.md` (pub.dev rejects a missing LICENSE outright;
  README/CHANGELOG count as warnings), the description is kept inside
  pub.dev's 60–180 character window, the CHANGELOG mentions the current
  version, and the Dart version is in lockstep with the npm packages; the 6
  npm packages also carry `README.md` (the registry package page body).
  `flutter pub publish --dry-run` reports **0 errors 0 warnings**.
- The docs site is live on GitHub Pages:
  `https://cuihairu.github.io/venue-seats/`
  (`docs/.vitepress/config.mts` carries `base: "/venue-seats/"`,
  `.github/workflows/pages.yml` builds, runs the `scripts/check-pages.mjs`
  gate and deploys), which the pubspec `homepage` points to.
