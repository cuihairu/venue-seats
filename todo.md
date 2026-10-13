# todo — venue-seats

来源：用户 2026-10-12「创建 venue-seats 项目吧，然后推进」「要和商业项目一样漂亮 可以对抄（看参考，不抄代码/素材/数据）」「要适合 Vue / React / Flutter 使用」。
调研依据：awn 的 `docs/research/venue-seatmaps.md`（单个推荐 = 本项目）。

## P1 — 地基（本期，2026-10-13 完成）

- [x] 数据模型 + JSON Schema 定稿（venue → level → section → row → seat；stage 朝向+w/h；票价分区），schema 校验有测试（core 13 测试含 tier 引用校验）
- [x] 核心包 `@venue-seats/core`（加载、校验、pointInPolygon/sectionAt/rowAt 命中、bounds/availability、与渲染无关；13 测试）
- [x] 2D 渲染器 `@venue-seats/renderer`（SVG：viewBox 缩放拖动、悬停高亮、售罄置灰、priceTiers 配色、舞台朝向、座位像素阈值、键盘 Escape/方向键、ARIA；11 测试）
- [x] React 包装 `@venue-seats/react`（组件 + 事件回调 + 命令式 zoom 句柄；5 测试）
- [x] Vue 包装 `@venue-seats/vue`（同一 API 语义，共用 renderer 引擎；5 测试）
- [x] Flutter 包 `packages/venue_seats`（CustomPainter + InteractiveViewer，Dart 镜像 core 几何；widget/geometry/golden 测试）
- [x] 示例场馆 5 个（鸟巢/上海体育场/梅赛德斯/凯迪拉克中心/深圳湾春茧，`provenance: demo`，生成脚本 `scripts/gen-venues.mjs` 可复现；venues-demo 5 测试）
- [x] 质量验收：商业级交互对照截图 9 张在 `docs/screenshots/01..09`（总览/楼层切换/票档配色/选区/悬停 tooltip/选排/售罄/arena/arena 选区）
- [x] CI（pnpm install + typecheck + test + build）绿（.github/workflows/ci.yml）

验收口径：`pnpm -r typecheck && pnpm -r test && pnpm -r build` 全绿（JS 端 39 测试）+ `flutter analyze` / `flutter test` 绿；截图 docs/screenshots/01..09；示例 UI 标注「示意重建 · 不代表真实场馆」。

## P2 — 逐座（L2）与 3D（L3）

- [ ] 逐座几何（L2）：有数据再做，先定座级 schema 与状态机（available/selected/sold/held）
- [ ] 3D 视图（L3）：three.js 程序化几何，与 2D 同源数据、选中状态互通；低端机自动回 2D（帧率阈值写清）
- [ ] 移动端（触控缩放、窄屏降级）

## 待拍板

- [ ] 包发布策略（先 npm 私有/公开？Flutter 走 path 依赖还是 pub.dev？）
- [x] 示例场馆清单（用户授权「按公开资料自选」→ 已定 5 个，见 P1；可随 P2 再扩充）

验收铁律：完成 = 测试绿 + 证据（截图/命令输出）+ 单 commit 英文简短信息；不许只报"在做"。
