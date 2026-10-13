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

- [x] 逐座选择交互（座级几何与状态机已在数据模型中）— 3192eed：core `seatAt` + renderer `onSeatToggle`（含键盘/ARIA）+ Flutter `onSeatActivated`，react/vue 同步透传；当轮测试 core 16 / renderer 17 / react 7 / vue 6 / Flutter 12 全绿
- [x] 3D 视图（three.js 程序化几何，与 2D 同源数据、选中互通，低端机自动回 2D）— d3f2717：新包 `@venue-seats/renderer-3d`：`buildScene3D`（拉伸分区 + InstancedMesh 座位球 + 舞台/地面）+ `createVenueView` 工厂（probe3D 探测，WebGL 缺失/低端/构建失败均回退 2D）+ `resolveVenueActivate` 与 2D 同一命中漏斗；demo 已加 2D/3D 切换共用 selection；现 renderer-3d 26 tests，全仓 TS 82 + Flutter 12 全绿
- [x] 移动端（触控缩放、窄屏降级）— 6e9820a：触控与桌面对等（单指拖动平移、双指捏合缩放锚点在捏合中点、点选区/排，捏合不误触发点击）+ 窄屏（≤640px，`probe3D().narrow`/`use3D`）降级 2D 并说明原因；renderer 21 + renderer-3d 26 tests 全绿，`walkthrough:mobile` 390×844 真触控走查 13/13，截图 `docs/screenshots/10-11-mobile-*`

## 待拍板

- [ ] 包发布策略（npm 私有/公开；Flutter 走 path 依赖还是 pub.dev）
