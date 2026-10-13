# todo — venue-seats

## P1 — 地基

- [x] 数据模型 + JSON Schema（venue → level → section → row → seat；stage 朝向+w/h；票价分区）— 469ddd6, core 13 tests
- [x] 核心包 @venue-seats/core（加载、校验、命中测试、bounds/availability）— 469ddd6, 13 tests
- [x] 2D 渲染器 @venue-seats/renderer（SVG 缩放拖动、悬停、售罄、票档配色、舞台、键盘/ARIA）— 469ddd6, 12 tests
- [x] React 包装 @venue-seats/react（组件 + 事件回调 + 命令式 zoom）— 469ddd6, 5 tests
- [x] Vue 包装 @venue-seats/vue（同一 API 语义，共用 renderer 引擎）— 469ddd6, 5 tests
- [x] Flutter 包 packages/venue_seats（CustomPainter + InteractiveViewer，Dart 镜像 core 几何）— 469ddd6, 10 tests
- [x] 示例场馆 5 个（provenance: demo，scripts/gen-venues.mjs 可复现）— 469ddd6, venues-demo 5 tests
- [x] 交互截图 9 张（docs/screenshots/01..09）— 469ddd6
- [x] CI 绿（typecheck + test + build + flutter analyze/test）— a4b2360
- [x] 示例场馆清单（用户授权按公开资料自选，已定 5 个）— 469ddd6

## P2 — 逐座（L2）与 3D（L3）

- [x] 逐座选择交互（座级几何与状态机已在数据模型中）— core `seatAt` + renderer `onSeatToggle`（含键盘/ARIA）+ Flutter `onSeatActivated`，react/vue 同步透传；测试 16/17/7/6/12 全绿
- [ ] 3D 视图（three.js 程序化几何，与 2D 同源数据、选中互通，低端机自动回 2D）
- [ ] 移动端（触控缩放、窄屏降级）

## 待拍板

- [ ] 包发布策略（npm 私有/公开；Flutter 走 path 依赖还是 pub.dev）
