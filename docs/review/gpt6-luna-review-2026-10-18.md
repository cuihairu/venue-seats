[0m
> build · gpt-6-luna
[0m→ [0mSkill "code-review" 
> build · gpt-6-luna
我会先盘点代码、文档与测试范围，再按风险核对关键实现和文档承诺；只报告能定位到证据的结论。
[0m✱ [0mGlob "**/*" [90m100 matches[0m
[0m$ [0mgit status --short && git log -1 --oneline
31a01dc feat: self-built venue dataset from wikidata
> build · gpt-6-luna
[0m→ [0mRead todo.md 
[0m→ [0mRead package.json 
[0m✱ [0mGlob ".github/**/*" [90m0 matches[0m
[0m✱ [0mGlob "packages/{core,renderer-3d,vue}/**/*" [90m73 matches[0m
> build · gpt-6-luna
[0m✱ [0mGlob "packages/*/src/**/*" [90m14 matches[0m
[0m✱ [0mGlob "packages/*/test/**/*" [90m22 matches[0m
[0m✱ [0mGlob "docs/**/*.md" [90m14 matches[0m
[0m✱ [0mGlob ".github/workflows/*" [90m3 matches[0m
[0m✱ [0mGlob "scripts/*.mjs" [90m8 matches[0m
[0m✱ [0mGlob "data/**/*" [90m2 matches[0m
> build · gpt-6-luna
[0m→ [0mRead packages/core/src/index.ts 
[0m→ [0mRead packages/renderer/src/controller.ts 
[0m→ [0mRead packages/renderer/src/geometry.ts 
[0m→ [0mRead packages/renderer/src/dom.ts 
[0m→ [0mRead packages/renderer-3d/src/controller.ts 
[0m→ [0mRead packages/renderer-3d/src/scene.ts 
[0m→ [0mRead packages/renderer-3d/src/capability.ts 
[0m→ [0mRead packages/venues-demo/src/index.ts 
> build · gpt-6-luna
[0m→ [0mRead packages/react/src/SeatMap.tsx 
[0m→ [0mRead packages/vue/src/SeatMap.ts 
[0m→ [0mRead packages/react/src/index.ts 
[0m✗ [0mRead packages/venue_seats/lib/src/venue_seats.dart failed
[91m[1mError: [0mFile not found: packages/venue_seats/lib/src/venue_seats.dart
[0m→ [0mRead packages/vue/src/index.ts 
[0m✱ [0mGlob "packages/venue_seats/lib/src/**/*.dart" [90m4 matches[0m
> build · gpt-6-luna
[0m→ [0mRead packages/venue_seats/lib/src/model.dart 
[0m→ [0mRead packages/venue_seats/lib/src/geometry.dart 
[0m→ [0mRead packages/venue_seats/lib/src/painter.dart 
[0m→ [0mRead packages/venue_seats/lib/src/seat_map.dart 
[0m→ [0mRead docs/audit-doc-consistency.md 
[0m→ [0mRead docs/data-format.md 
[0m→ [0mRead docs/api.md 
[0m→ [0mRead docs/design/dataset-schema.md 
> build · gpt-6-luna
[0m→ [0mRead schemas/venue-seats.schema.json 
[0m→ [0mRead scripts/collect-dataset.mjs 
[0m→ [0mRead scripts/validate-dataset.mjs 
[0m→ [0mRead packages/venues-demo/test/dataset.test.ts 
[0m→ [0mRead packages/core/test/core.test.ts 
[0m→ [0mRead packages/renderer-3d/test/renderer3d.test.ts 
> build · gpt-6-luna
已看到一个高风险输入边界问题（提示内容由 HTML 字符串拼装），以及 3D 与 2D 座位票档处理不一致。接下来在核对其余跨包契约、Flutter 镜像、发布/数据集文档后排序，避免把单点瑕疵当成全局结论。
[0m→ [0mRead README.md 
[0m→ [0mRead README.zh.md 
[0m→ [0mRead docs/release-strategy.md 
[0m→ [0mRead docs/quickstart.md 
[0m→ [0mRead data/README.md 
[0m→ [0mRead .github/workflows/ci.yml 
[0m→ [0mRead packages/renderer-3d/package.json 
[0m→ [0mRead .github/workflows/publish.yml 
> build · gpt-6-luna
[0m✱ [0mGrep "innerHTML|textContent|seat.priceTierId|BoxGeometry|requestAnimationFrame|setAnimationLoop|seatVisibleAt|seatRadius" [90min packages · 94 matches[0m
[0m→ [0mRead packages/renderer/package.json 
[0m→ [0mRead packages/renderer/src/index.ts 
[0m→ [0mRead packages/renderer-3d/src/index.ts 
[0m→ [0mRead packages/venue_seats/lib/venue_seats.dart 
[0m✱ [0mGrep "three consumers|seat colours follow status exactly|--merge|planned|3D.*planned" [90min docs · 15 matches[0m
> build · gpt-6-luna
[0m$ [0mpnpm -r test
Scope: 8 of 9 workspace projects
packages/core test$ vitest run
packages/core test:  RUN  v4.1.11 /home/cui/workspaces/venue-seats/packages/core
packages/core test:  Test Files  2 passed (2)
packages/core test:       Tests  36 passed (36)
packages/core test:    Start at  18:03:40
packages/core test:    Duration  317ms (transform 161ms, setup 0ms, import 208ms, tests 23ms, environment 0ms)
packages/core test: Done
packages/renderer test$ vitest run
packages/venues-demo test$ vitest run
packages/renderer test:  RUN  v4.1.11 /home/cui/workspaces/venue-seats/packages/renderer
packages/venues-demo test:  RUN  v4.1.11 /home/cui/workspaces/venue-seats/packages/venues-demo
packages/venues-demo test:  Test Files  4 passed (4)
packages/venues-demo test:       Tests  53 passed (53)
packages/venues-demo test:    Start at  18:03:41
packages/venues-demo test:    Duration  1.50s (transform 476ms, setup 0ms, import 750ms, tests 1.88s, environment 1ms)
packages/venues-demo test: Done
packages/renderer test:  Test Files  3 passed (3)
packages/renderer test:       Tests  81 passed (81)
packages/renderer test:    Start at  18:03:41
packages/renderer test:    Duration  1.77s (transform 301ms, setup 0ms, import 387ms, tests 1.09s, environment 1.67s)
packages/renderer test: Done
packages/react test$ vitest run
packages/renderer-3d test$ vitest run
packages/vue test$ vitest run
packages/renderer-3d test:  RUN  v4.1.11 /home/cui/workspaces/venue-seats/packages/renderer-3d
packages/vue test:  RUN  v4.1.11 /home/cui/workspaces/venue-seats/packages/vue
packages/react test:  RUN  v4.1.11 /home/cui/workspaces/venue-seats/packages/react
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:22)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:161:19
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:2326:20
packages/renderer-3d test:     at new Promise (<anonymous>) undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:53)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:161:19
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:2326:20
packages/renderer-3d test:     at new Promise (<anonymous>) undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:22)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:164:12
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:2326:20 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:53)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:164:12
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:2326:20 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:22)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:450:12
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:2326:20
packages/renderer-3d test:     at new Promise (<anonymous>) undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:53)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:450:12
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:2326:20
packages/renderer-3d test:     at new Promise (<anonymous>) undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:22)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:452:12
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:2326:20
packages/renderer-3d test:     at new Promise (<anonymous>) undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:53)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:452:12
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:2326:20
packages/renderer-3d test:     at new Promise (<anonymous>) undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:22)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:457:12
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:2326:20 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:53)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:457:12
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:2326:20 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:22)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at use3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:437:38)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:462:12
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:53)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at use3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:437:38)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:462:12
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:22)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at use3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:437:38)
packages/renderer-3d test:     at createVenueView (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:446:7)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:470:18
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:53)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at use3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:437:38)
packages/renderer-3d test:     at createVenueView (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:446:7)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:470:18
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at getContext (file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/three@0.182.0/node_modules/three/build/three.module.js:15882:18)
packages/renderer-3d test:     at new WebGLRenderer (file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/three@0.182.0/node_modules/three/build/three.module.js:15911:11)
packages/renderer-3d test:     at new SeatMap3DController (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:101:21)
packages/renderer-3d test:     at createVenueView (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:448:25)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:479:18
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at getContext (file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/three@0.182.0/node_modules/three/build/three.module.js:15882:18)
packages/renderer-3d test:     at new WebGLRenderer (file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/three@0.182.0/node_modules/three/build/three.module.js:15915:11)
packages/renderer-3d test:     at new SeatMap3DController (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:101:21)
packages/renderer-3d test:     at createVenueView (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:448:25)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:479:18
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:22)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at use3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:437:38)
packages/renderer-3d test:     at createVenueView (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:446:7)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:489:18
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:53)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at use3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:437:38)
packages/renderer-3d test:     at createVenueView (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:446:7)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:489:18
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at getContext (file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/three@0.182.0/node_modules/three/build/three.module.js:15882:18)
packages/renderer-3d test:     at new WebGLRenderer (file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/three@0.182.0/node_modules/three/build/three.module.js:15911:11)
packages/renderer-3d test:     at new SeatMap3DController (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:101:21)
packages/renderer-3d test:     at createVenueView (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:448:25)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:498:18
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at getContext (file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/three@0.182.0/node_modules/three/build/three.module.js:15882:18)
packages/renderer-3d test:     at new WebGLRenderer (file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/three@0.182.0/node_modules/three/build/three.module.js:15915:11)
packages/renderer-3d test:     at new SeatMap3DController (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:101:21)
packages/renderer-3d test:     at createVenueView (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:448:25)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:498:18
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:22)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at use3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:437:38)
packages/renderer-3d test:     at createVenueView (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:446:7)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:507:18
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:53)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at use3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:437:38)
packages/renderer-3d test:     at createVenueView (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:446:7)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:507:18
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:22)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at use3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:437:38)
packages/renderer-3d test:     at createVenueView (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:446:7)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:521:18
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11 undefined
packages/renderer-3d test: Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)
packages/renderer-3d test:     at module.exports (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
packages/renderer-3d test:     at HTMLCanvasElementImpl.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js:42:5)
packages/renderer-3d test:     at HTMLCanvasElement.getContext (/home/cui/workspaces/venue-seats/node_modules/.pnpm/jsdom@25.0.1/node_modules/jsdom/lib/jsdom/living/generated/HTMLCanvasElement.js:131:58)
packages/renderer-3d test:     at hasWebGL (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:18:53)
packages/renderer-3d test:     at probe3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:36:19)
packages/renderer-3d test:     at supports3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/capability.ts:41:37)
packages/renderer-3d test:     at use3D (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:437:38)
packages/renderer-3d test:     at createVenueView (/home/cui/workspaces/venue-seats/packages/renderer-3d/src/controller.ts:446:7)
packages/renderer-3d test:     at /home/cui/workspaces/venue-seats/packages/renderer-3d/test/renderer3d.test.ts:521:18
packages/renderer-3d test:     at file:///home/cui/workspaces/venue-seats/node_modules/.pnpm/@vitest+runner@4.1.11/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11 undefined
packages/renderer-3d test:  Test Files  3 passed (3)
packages/renderer-3d test:       Tests  85 passed (85)
packages/renderer-3d test:    Start at  18:03:43
packages/renderer-3d test:    Duration  1.25s (transform 464ms, setup 0ms, import 795ms, tests 419ms, environment 1.20s)
packages/renderer-3d test: Done
packages/react test:  Test Files  1 passed (1)
packages/react test:       Tests  13 passed (13)
packages/react test:    Start at  18:03:43
packages/react test:    Duration  1.35s (transform 194ms, setup 0ms, import 276ms, tests 266ms, environment 580ms)
packages/react test: Done
packages/vue test:  Test Files  1 passed (1)
packages/vue test:       Tests  15 passed (15)
packages/vue test:    Start at  18:03:43
packages/vue test:    Duration  1.40s (transform 182ms, setup 0ms, import 325ms, tests 286ms, environment 575ms)
packages/vue test: Done
> build · gpt-6-luna
[0m$ [0mflutter test
(no output)

Command exceeded timeout of 120000 ms. Retry with a larger timeout if the command is expected to take longer.
> build · gpt-6-luna
[0m→ [0mRead apps/demo/src/App.tsx 
[0m→ [0mRead apps/demo/src/main.tsx 
[0m→ [0mRead apps/demo/src/app.css 
[0m→ [0mRead scripts/check-version.mjs 
[0m→ [0mRead scripts/check-publish.mjs 
[0m→ [0mRead scripts/check-pages.mjs 
[0m→ [0mRead scripts/dist-resolver.mjs 
[0m→ [0mRead apps/demo/src/example-venues.ts 
> build · gpt-6-luna
[0m✱ [0mGrep "unique|唯一|duplicate|重复" [90min packages/venues-demo/test · 2 matches[0m
[0m→ [0mRead docs/api.zh.md [90m[offset=1, limit=190][0m
[0m→ [0mRead packages/renderer/test/branches.test.ts [90m[offset=390, limit=90][0m
[0m→ [0mRead docs/data-format.zh.md 
[0m→ [0mRead docs/design/dataset-schema.zh.md [90m[offset=85, limit=70][0m
> build · gpt-6-luna
[0m→ [0mRead packages/venues-demo/test/venues.test.ts [90m[offset=1, limit=105][0m
> build · gpt-6-luna
## 1）最薄弱的 3 处（按风险排序）

1. **高：提示框存在 DOM XSS。** `packages/renderer/src/controller.ts:473-494` 把场馆名、分区名、排/座标签、票档名和颜色直接拼进 HTML，再赋给 `innerHTML`。若 `VenueDocument` 来自用户、CMS 或远端 JSON，恶意字段可注入 HTML/事件处理器，在宿主页面执行脚本。
2. **中高：输入校验没有覆盖渲染器依赖的 ID 不变量。** `packages/core/src/index.ts:127-145` 未检查 `row.id` 是否存在，也未检查 section/row/seat ID 是否重复；但 `packages/renderer/src/controller.ts:307-310` 和 `packages/renderer-3d/src/scene.ts:139-145` 都用 ID 建 Map。重复 seat ID 会覆盖映射，导致键盘操作或状态覆盖指向错误座位。当前唯一性检查主要在示例数据测试里，不是通用 `validate()` 的保证。
3. **中：3D 与 2D 的一致性及资源生命周期薄弱。** `packages/renderer-3d/src/controller.ts:123-127` 让渲染循环持续运行到销毁，即使静止也持续占用 GPU。另有可见差异：`packages/renderer-3d/src/scene.ts:61-65` 的可售座位颜色忽略 `seat.priceTierId`（2D 在 `packages/renderer/src/controller.ts:335` 会处理）；舞台尺寸未提供时也未沿用 2D 的默认尺寸，且 3D bounds 未包含舞台（`scene.ts:81,154-159`）。

## 2）最值得补的 3 项新能力

1. **库存/预订适配层：**提供库存状态同步、临时锁座、超时释放、并发冲突与失败回滚。现在选座只是本地 override 和回调，文档也说明它不会持久化（`docs/api.md:63-66`）；项目目前是框架无关的渲染库，没有票务后端或事务语义。
2. **大场馆性能方案：**为 2D 增加分级细节、可见区域渲染或空间索引，并设定座位数量基准。目前 2D 对每个座位创建 SVG 节点（`packages/renderer/src/controller.ts:331-350`）；仓库数据集是场馆事实数据，不含逐座布局，因此还没有真实大规模座位图的性能验收条件。
3. **可配置本地化与主题：**支持 locale、价格格式化、无障碍文案及主题 token。当前 renderer 内的播报和提示文案、人民币符号及配色均硬编码（如 `controller.ts:109,447,486,504-508`）；现有定位和 demo 偏中文市场，暂未建立多语言/主题抽象。

## 3）文档与实现可能对不上的地方

- `docs/api.md:115,127-130`、`docs/api.zh.md:106,117-119` 声称 3D 座位配色与 2D 一致；但 3D 忽略座位级 `priceTierId`，而 2D 会按座位票档着色。
- `docs/design/dataset-schema.md:105-107` 及中文版 `docs/design/dataset-schema.zh.md:100-101` 称放宽阈值后 `--merge` 会让快照“只增不减”；实际 `scripts/collect-dataset.mjs:172-182` 会用新抓取结果替换相同 QID 的旧记录，并对同址记录折叠，数量并非只增不减。
- 数据集文档说阈值是脚本顶部常量（`docs/design/dataset-schema.md:105-107`），但 `scripts/collect-dataset.mjs:20-23` 的 `minCapacity` 没用于生成查询；`sparql()` 在第 43 行另写了 `3000/20000`。只改顶部配置不会改变查询阈值。
- `docs/audit-doc-consistency.md` 标注的复核日期止于 2026-10-15；新数据集文档和采集实现是在 10-18 落地的，旧审计不能视为当前完整审计。

**验证：**`pnpm -r test` 通过（283 个 TS 测试）；Flutter 测试运行 120 秒超时，未能确认结果。
