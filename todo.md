# todo — venue-seats

## P1 地基

- [x] 数据模型 + JSON Schema（venue/level/section/row/seat，stage 朝向与 w/h，票价分区）（469ddd6, 13 tests）
- [x] 核心包 @venue-seats/core（加载、校验、命中测试、bounds/availability）（469ddd6, 13 tests）
- [x] 2D 渲染器 @venue-seats/renderer（SVG 缩放拖动、悬停、售罄、票档配色、舞台、键盘/ARIA）（469ddd6, 12 tests）
- [x] React 包装 @venue-seats/react（组件 + 事件回调 + 命令式 zoom）（469ddd6, 5 tests）
- [x] Vue 包装 @venue-seats/vue（同一 API 语义，共用 renderer 引擎）（469ddd6, 5 tests）
- [x] Flutter 包 packages/venue_seats（CustomPainter + InteractiveViewer，Dart 镜像 core 几何）（469ddd6, 10 tests）
- [x] 示例场馆 5 个（provenance: demo，scripts/gen-venues.mjs 可复现）（469ddd6, 5 tests）
- [x] 交互截图 9 张（docs/screenshots/01..09）（469ddd6）
- [x] CI 绿（typecheck + test + build + flutter analyze/test）（a4b2360）
- [x] 示例场馆清单（按公开资料自选 5 个）（469ddd6）

## P2 逐座（L2）与 3D（L3）

- [x] 逐座选择交互（core seatAt、renderer onSeatToggle 含键盘/ARIA、Flutter onSeatActivated，react/vue 透传）（3192eed, core 16 / renderer 17 / react 7 / vue 6 / Flutter 12）
- [x] 3D 视图（three.js 程序化几何，与 2D 同源、选中互通，低端机回退 2D）（d3f2717, renderer-3d 26 / 全仓 TS 82 / Flutter 12）
- [x] 移动端触控与窄屏降级（单指平移、双指捏合缩放、≤640px 降级 2D）（6e9820a, renderer 21 / renderer-3d 26）
- [x] 3D 座位可逆切换与悬停对齐 2D（9d2a125, renderer-3d 58）
- [x] Vue 包装事件与 doc prop 测试（e9b2a00, vue 12）
- [x] 3D canvas 无障碍对齐 2D（role/aria-label/tabindex/Escape）（494b93d, renderer-3d 59）
- [x] setDoc 后刷新场馆 aria-label（2D 与 3D）（97073af, renderer 22 / renderer-3d 33 / vue 12 / react 8）
- [x] React 包装事件与 doc prop 测试（e9cec92, react 13）
- [x] core 校验错误分支与 levelById 测试（e4e5115, core 18）
- [x] renderer 指针交互测试（滚轮缩放、双击缩放、悬停与离开）（18c7195, renderer 25）
- [x] VenueView 委托面测试（2D 回退路径全量委托 + 3D zoomBy）（7be3b9c, renderer-3d 60）
- [x] 3D 行选择可逆与渲染器尺寸测试（62a262e, renderer-3d 62）
- [x] Flutter 悬停离开清除与换文档重置测试（ad1e792, Flutter 14）
- [x] Flutter 校验规则测试（polygon/票档/空票档/缺 id）（33b9ca4, Flutter 17）
- [x] 2D 行选择可逆、悬停预览与行锚点缩放测试（f22431b, renderer 30）
- [x] Vue 选择/层级 watcher 守卫测试（fcddf01, vue 15）

## 待拍板

- [ ] 包发布策略（npm 范围 / Flutter 分发 / 发版通路），前置元数据已备（2538060）
