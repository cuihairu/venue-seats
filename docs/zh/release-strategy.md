# 包发布策略 — 已定：A/A/A（2026-10-15）


三项分发决定已于 2026-10-15 拍板，全部采纳推荐方案 A。本文档由「备料」转为
「方案说明」：记录决定与理由、已落地的发布通路、剩余人工步骤。

红线不变：**版本号只能由用户给出并手动触发**；未通过验收测试的产物不得出现在
Releases 页、不得称正式版。

## 决定与理由

| 决定 | 结论 | 理由 |
|---|---|---|
| 1 npm 包名与源 | **A：`@venue-seats/*` scope 发 npmjs 公共源** | 占住命名空间；仅需每包 `publishConfig.access: "public"`（scope 包默认 restricted） |
| 2 Flutter 分发 | **A：pub.dev** | dry-run 已 0 错误 0 警告；版本随 npm lockstep，无需另建通路 |
| 3 发版通路 | **A：手动 `workflow_dispatch`** | 与红线一致——版本号与触发都在用户手里，自动化发版会破坏这条 |

## 已落地（2026-10-15）

- 6 个 npm 包补 `publishConfig.access: "public"`
  （`packages/venues-demo/test/manifests.test.ts` 门禁守护，改坏即红）。
- `packages/venue_seats/pubspec.yaml`：删 `publish_to: none`、补
  `homepage: https://cuihairu.github.io/venue-seats/`（同上门禁守护）。
- `scripts/check-version.mjs <version>`：发布前断言「输入版本 == 全部 6 个
  package.json + pubspec 的 version」，不一致即红（防止发出 manifest 未声明的版本）。
- `.github/workflows/publish.yml`：手动发布通路（见下节）。

## 发布通路说明（`.github/workflows/publish.yml`）

- **触发**：仅 `workflow_dispatch`。无 push / schedule / tag 触发，不会自行启动。
- **输入参数**：
  - `version`（必填）：要发布的版本号，须先写进全部 manifest；
  - `npm` / `pub_dev`（布尔，默认 true）：分别控制 npm 6 包与 pub.dev 的发布；
  - `dry_run`（布尔，**默认 true**）：试跑（校验 + pack，不上传）；实发需手动取消勾选。
- **门禁串联**：`gates` job 依次跑 `check-version.mjs` → `pnpm -r typecheck` →
  `test` → `test:coverage` → `build` → `pnpm publish:check`（tarball 契约 + 真实
  import 装载门禁）→ flutter `pub get` / `analyze` / `test`。npm 与 pub 两个 job
  均 `needs: gates`——**门禁红则不发**。
- **不打 tag、不建 Release**：npm 步骤显式 `NPM_CONFIG_GIT_TAG_VERSION=false`
  （版本 tag 只能用户手动打）；workflow 全程无 tag/release 动作。
- `concurrency: publish` 串行化，避免并发发布。

## 剩余人工步骤（仅用户可做）

1. **secrets**：`NPM_TOKEN`（npmjs 的 Automation token）、`PUB_TOKEN`
   （pub.dev 发布 token，供 `dart pub token add` 用）。缺了对应 job 会失败。
2. **environments**：workflow 引用 `npm-publish` / `pub-publish` 两个 GitHub
   Environment；如需审批保护，在仓库设置中为它们配置 required reviewer
   （首次触发时 GitHub 会自动创建无保护的同名 environment，配置审批需手动）。
3. **发版流程**：改 7 个 manifest 版本号 → commit → 手动触发 `publish.yml` 并填
   `version` → 先 `dry_run` 核对产物 → 再实发。版本号只能用户给出。

## 前置元数据与门禁现状（决策依据，留存）

- npm 侧 7 个包均挂 `@venue-seats/*` scope，version `0.0.1`；`license: MIT`、
  `files: ["dist"]`、`publishConfig`（发布时 main/types/exports 切到 `dist/`）齐备；
  6 个可发布包已带 `repository`（type/url/directory），由
  `packages/venues-demo/test/manifests.test.ts` 门禁，改坏即红。
- `apps/demo` 已 `private: true`，递归 publish 也带不走它（同上测试守护）。
- 发布契约门禁 `scripts/check-publish.mjs`（`pnpm publish:check`，CI 在 build 之后跑）：
  逐包用 `npm pack --dry-run --json` 取真实 tarball 清单，断言 `publishConfig` 的
  main/types/exports 每条路径都在包内、且落在 `dist/`；再把每条 `.js` 入口按发布
  世界的依赖图（`scripts/dist-resolver.mjs` 把裸 `@venue-seats/*` 指向对方 dist，
  而非工作区源码）真实 `import()` 一次，装载失败即红。当前 6 包全过。
- 该门禁首跑即抓出三处「包能构建、消费者加载不了」的缺陷并已修：react/vue 的
  `index.ts` 用无扩展名相对导入（`./SeatMap`），Node ESM 无法解析；venues-demo 的
  JSON 导入缺 import attribute（`with { type: "json" }`）。bundler 消费无感，
  纯 Node 消费直接报错。
- 发布文件齐备（磁盘 + 真实 tarball 双重守护）：7 个包各带 `LICENSE`
  （根 MIT 逐字复制，未改条款；npm 即使 `files` 只列 dist 也会强带包根 LICENSE）；
  Flutter 包另有 `README.md` + `CHANGELOG.md`（pub.dev 缺 LICENSE 直接拒收，README/
  CHANGELOG 计警告），description 收进 pub.dev 的 60–180 字符窗口，CHANGELOG 提及
  当前版本，Dart 版本与 npm 各包 lockstep；npm 侧 6 包另带 `README.md`（registry
  包页正文来源）。`flutter pub publish --dry-run` **0 错误 0 警告**。
- 文档站已上线 GitHub Pages：`https://cuihairu.github.io/venue-seats/`
  （`docs/.vitepress/config.mts` 带 `base: "/venue-seats/"`，
  `.github/workflows/pages.yml` 构建 + `scripts/check-pages.mjs` 门禁 + 部署），
  作为 pubspec `homepage` 指向。
