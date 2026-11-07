# 架构目录解说

本文是 HEAD `58d21c478e80ab980c937470704c820079bfd0eb` 的源码级分析，按职责归纳为九层，而不是按目录名。运行时依赖图中没有服务进程、Redis、MySQL、SQLite 或其他持久化服务。源码中唯一的出站 fetch 是构建期采集脚本调用 Wikidata SPARQL；其余状态都在内存、Git 跟踪文件或浏览器 DOM 中。[英文架构](/architecture)与本文同步；术语见[中文术语表](/zh/glossary)。

## 读法

- 层是职责，不是包目录；一个包可以跨多层，一层也可以跨多个包。
- 规范选择状态由宿主应用拥有。壳层和控制器只保留瞬态输入、悬停、相机和座位覆盖。
- 运行时通道是直接包导入、函数调用、React/Vue 回调、DOM 事件、Flutter 回调和渲染器原生 API。源码级唯一 HTTP 客户端是 `scripts/collect-dataset.mjs:25`。
- 包依赖边由 manifest 声明：renderer 依赖 core；React/Vue 依赖 core 和 renderer；renderer-3d 依赖 core、renderer 和 three；demo 依赖 core、React、renderer、renderer-3d 和 venues-demo。

## L0 数据契约层

### 实现

`packages/core/src/index.ts:72` 定义 `VenueDocument` 和 `Venue → Level → Section → Row → Seat` 树；座位状态在第 6 行；L1 选择在第 95 行；结构校验从第 110 行开始，几何、命中测试和可用性延续到第 308 行。JSON Schema 是 `schemas/venue-seats.schema.json:1`。演示 fixture 由 `packages/venues-demo/src/index.ts:16` 导入；事实数据集记录使用独立的版本化快照结构，由 `scripts/validate-dataset.mjs:34` 校验。

### 配置 schema

`packages/core/src/index.ts:12` 固定 schema 版本；嵌套字段和交叉引用由 `schemas/venue-seats.schema.json:1` 约束。没有独立运行时配置文件。

### 协议文件与文案

没有专属运行时协议文件。`docs/data-format.md:1` 和 `docs/zh/data-format.md:1` 说明 JSON 协议。演示免责声明在 `apps/demo/src/venues.ts:12` 和 `packages/venues-demo/src/index.ts:24`；渲染器 ARIA/状态字符串和注入 CSS 内联在源码中。

### 配置输入

JSON 文档、层 id、受控选择、座位可见阈值、座位半径和事件回调。2D 公共选项契约从 `packages/renderer/src/controller.ts:46` 开始。

### 状态存储

规范文档是 Git 跟踪 JSON 值或 fixture；运行时副本是控制器内存。没有 Redis、MySQL、SQLite、localStorage、sessionStorage、IndexedDB、服务、队列或缓存。

### 生命周期

文档通过包导入、demo `load()` 或 Flutter `fromJson` 进入；渲染前校验拒绝不支持的版本。宿主可替换文档并重置状态，详见渲染层。

### 调用面

每个渲染器导入契约。演示 fixture 解析经 `packages/venues-demo/src/index.ts:16` 和 `apps/demo/src/venues.ts:20` 的懒加载导入。

## L1 状态层

### 实现

运行时模型包括选择、悬停、座位覆盖和视图/变换状态。Web 2D 在 `packages/renderer/src/controller.ts:68` 拥有这些状态；3D 在 `packages/renderer-3d/src/controller.ts:60`；Flutter 在 `packages/venue_seats/lib/src/seat_map.dart:76`。宿主的规范选择以受控 prop 进入。

### 配置 schema

没有独立 schema 文件。控制器选项对象由 `packages/renderer/src/controller.ts:46` 类型化；Flutter 阈值和回调由 `packages/venue_seats/lib/src/seat_map.dart:17` 声明。

### 协议文件与文案

没有专属协议文件。悬停预览样式属于 `packages/renderer/src/dom.ts:28` 的 SVG DOM/CSS；状态相关文案内联在渲染器源码中。

### 配置输入

文档、层 id、选择、座位可见度/半径、回调、Flutter 缩放边界和背景色。

### 状态存储

全部状态在内存：JavaScript 对象/映射加 DOM/canvas 状态，或 Dart widget 状态。规范选择仍是宿主状态；悬停、视图和座位覆盖是渲染器生命周期状态。

### 生命周期

Web 2D 构建宿主/SVG、注入样式、挂监听和 `ResizeObserver`，再适配渲染；`destroy()` 移除事件、观察器、DOM 和动画工作。Flutter `initState`/`didUpdateWidget`/`dispose` 拥有 `TransformationController`、悬停、适配、视口、选择和状态映射。3D 构建场景、相机、控制、监听、观察器和动画循环；销毁时取消渲染、移除监听、释放控制/渲染器并移除画布。统一视图创建先试 3D，捕获构建失败后返回 2D。

### 调用面

宿主发送 props；渲染器回调返回待采纳的选择/状态变更；控制器调用 core 几何/模型函数，并只修改自己的 DOM、canvas 或 widget 状态。

## L2 Web 2D 渲染层

### 实现

`packages/renderer/src/controller.ts:68` 是单宿主 SVG 引擎。DOM 创建和默认 CSS 在 `packages/renderer/src/dom.ts:3`；视图适配、边界和 SVG 助手在 `packages/renderer/src/geometry.ts:4`；公共导出面在 `packages/renderer/src/index.ts:1`。

### 配置 schema

没有独立配置 schema。`SeatMapOptions extends SeatMapEvents` 在 `packages/renderer/src/controller.ts:46`；回退尺寸、拖拽阈值、SVG namespace 和 CSS 是 `packages/renderer/src/controller.ts:58` 与 `packages/renderer/src/dom.ts:3` 的源码常量。

### 协议文件与文案

没有专属线协议。DOM/CSS class 协议在 `packages/renderer/src/dom.ts:30`；渲染器可见的中文 ARIA 和可用性字符串内联在 `packages/renderer/src/controller.ts`；公共文档在 `docs/api.md:30` 与 `docs/zh/api.md:29`。

### 配置输入

宿主元素加 `SeatMapOptions`；`seatVisibleAt` 默认 `0.7`，`seatRadius` 默认 `3.4`。

### 状态存储

文档/层/选择/事件/阈值/座位索引/座位覆盖，加 wrapper、SVG、tooltip、live region、viewBox、fit、hover、pointers、drag、pinch、rAF、destroyed 和 resize，都是 `packages/renderer/src/controller.ts:69` 的私有字段；后端只有宿主 DOM。

### 生命周期

构造函数从第 99 行开始。`setDoc` 在第 147 行重置/清空状态，除非显式保留选择；`setLevel` 在第 161 行清选择并重渲染；`fit` 从第 253 行开始；`destroy` 在第 280 行解绑全部监听、断开观察器、取消 rAF 并清空宿主子节点。

### 调用面

入站有宿主到控制器调用和 DOM 事件；出站有选择/区/排/座位/悬停回调；内部调用 core 几何、可用性和状态转换，以及 renderer DOM/geometry 导入。

## L3 Web 3D 渲染与视图选择层

### 实现

能力检查在 `packages/renderer-3d/src/capability.ts:1`；纯场景组装/更新/射线助手在 `packages/renderer-3d/src/scene.ts:31`；WebGL 控制器和 `VenueView` 门面从 `packages/renderer-3d/src/controller.ts:27` 开始；公共导出在 `packages/renderer-3d/src/index.ts:1`；回退工厂 `createVenueView` 在 `packages/renderer-3d/src/controller.ts:478`。

### 配置 schema

没有独立 schema。`VenueViewOptions extends SeatMapOptions` 加可选 `force3D` 定义在 `packages/renderer-3d/src/controller.ts:44`；阈值和相机常量是源码常量。

### 协议文件与文案

没有专属协议文件。three.js 程序化场景就是协议；canvas ARIA 字符串内联；公共契约在 `docs/api.md:67` 与 `docs/zh/api.md:64`。

### 配置输入

宿主、2D 选项加可选 `force3D`；运行时视口宽度、内存/并发探测和 WebGL 可用性；相机距离、点击容差、缩放因子、FOV、窄视口和座位配色都是源码常量。

### 状态存储

宿主、canvas、renderer、controls、相机/场景工厂、文档、层、选择、座位覆盖、阈值、事件、resize observer、指针和销毁标记，都是 `packages/renderer-3d/src/controller.ts:69` 的控制器字段；后端是浏览器 WebGL canvas 和 DOM。

### 生命周期

`SeatMap3DController` 在 `packages/renderer-3d/src/controller.ts:155` 安全回收构造资源；文档/层/选择 setter 重建并规范化状态；销毁停止动画、移除监听、断开 resize、释放 controls/renderer 并移除 canvas。`createVenueView` 探测、尝试 3D、捕获失败并返回 2D。

### 调用面

demo 应用到 `createVenueView`、`VenueView` 委托、指针/键盘 DOM 事件、three.js 调用、纯场景助手调用和 renderer/core 契约调用。

## L4 Flutter 渲染层

### 实现

公共 widget 契约从 `packages/venue_seats/lib/src/seat_map.dart:17` 开始；画笔从 `packages/venue_seats/lib/src/painter.dart:11` 开始；纯 Dart 契约镜像在 `packages/venue_seats/lib/src/model.dart:1`；几何、命中测试和视图适配在 `packages/venue_seats/lib/src/geometry.dart:1`；公共导出在 `packages/venue_seats/lib/venue_seats.dart:19`。

### 配置 schema

没有独立 schema 文件。widget 阈值和回调在 `packages/venue_seats/lib/src/seat_map.dart:17`；`packages/venue_seats/pubspec.yaml:1` 是包/平台元数据，不是渲染器运行时配置。

### 协议文件与文案

没有专属协议文件。Dart 模型显式针对共享 JSON schema 镜像 TypeScript core（`packages/venue_seats/lib/src/model.dart:1`）。状态文案内联在 painter/widget 代码中。

### 配置输入

文档、层 id、选择、回调、座位可见度/半径、最小/最大缩放和背景色。

### 状态存储

widget `State` 在 `packages/venue_seats/lib/src/seat_map.dart:76` 拥有 `TransformationController`、悬停、适配、视口、选择镜像和座位状态映射；文档仍是不可变输入。

### 生命周期

`initState` 镜像初始选择并监听变换；`didUpdateWidget` 同步选择、换文档清覆盖、换文档/层清 hover 和 fit 并重新适配；`dispose` 移除并释放变换。画笔重绘门控在 `packages/venue_seats/lib/src/painter.dart:246` 比较文档、选择、hover、fit 和覆盖。

### 调用面

Flutter framework 回调入；widget/painter 调几何和模型助手；交互回调出。没有到 JavaScript 渲染器的通道，也没有进程边界。

## L5 框架壳层

### 实现

React 壳从 `packages/react/src/SeatMap.tsx:37` 开始；Vue 壳从 `packages/vue/src/SeatMap.ts:20` 开始；Flutter 公共 widget 在 `packages/venue_seats/lib/src/seat_map.dart:17`。

### 配置 schema

没有独立 schema。类型化 props/events 就是 schema：React `SeatMapProps` 从 `packages/react/src/SeatMap.tsx:5` 开始；Vue props 从 `packages/vue/src/SeatMap.ts:20` 开始；Flutter widget 字段从 `packages/venue_seats/lib/src/seat_map.dart:17` 开始。

### 协议文件与文案

没有专属协议文件。跨框架语义协议是控制器契约加 `RowSelection`；API 文案在 `docs/api.md:136` 与 `docs/zh/api.md:125`。

### 配置输入

文档、层、选择、渲染阈值、class/style/ARIA 属性和框架回调。

### 状态存储

只有适配器 ref、标志、latest-props ref 和框架生命周期局部状态。规范选择和文档仍是宿主状态。

### 生命周期

React 一次挂载、effect cleanup 销毁，再用 effect 同步文档/层/选择。Vue 随框架生命周期挂载/销毁，watcher 同步 props。Flutter 用自身 stateful 生命周期，不桥接到 JavaScript。

### 调用面

框架宿主到壳 props/events，壳到控制器方法调用，控制器到壳回调转发。

## L6 演示应用层

### 实现

Vite React 应用组合场馆注册、加载编排、模式选择、统计/选择详情推导和 UI 文案。应用状态从 `apps/demo/src/App.tsx:7` 开始；注册表从 `apps/demo/src/venues.ts:20` 开始；入口是 `apps/demo/src/main.tsx:1`。

### 配置 schema

没有独立应用 schema。类型化 `VenueEntry` 在 `apps/demo/src/venues.ts:4`；Vite/TypeScript 项目配置和 package scripts 只服务构建。

### 协议文件与文案

没有专属协议文件。懒加载 JSON import 是运行时输入通道。来源文案在 `apps/demo/src/venues.ts:12`；中文 UI 文案内联在 `apps/demo/src/App.tsx`，回退文案从第 305 行开始。

### 配置输入

用户选择器/模式/缩放/层操作、懒加载场馆 `load()`、`probe3D` 结果。

### 状态存储

React `useState` 持有场馆索引、已加载索引、文档、层、选择、请求的 3D 标志、实际模式、错误和重试计数；ref 持有地图宿主和活动统一视图。

### 生命周期

选择场馆启动可取消异步加载并拒绝空层文档。匹配的已加载场馆挂载 3D `VenueView`、保存视图、报告实际模式，并在场馆/层/模式变化时销毁；选择同步用 `setSelection(..., false)`。2D 组件仍是单独受控的 React 壳。

### 调用面

应用到 React 壳 props、应用到统一视图调用、应用到 core 推导、应用到场馆入口动态导入；浏览器/Vite 解析 chunk URL。

## L7 静态数据资产层

### 实现

演示 fixture 是 Git 跟踪 JSON，由 `packages/venues-demo/src/index.ts:16` 导入；生成脚本在 `scripts/gen-venues.mjs:1`；公开示例生成在 `scripts/gen-examples.mjs:1`；事实数据集快照是 `data/venues.json:1`，由 `scripts/collect-dataset.mjs:1` 采集、`scripts/validate-dataset.mjs:1` 校验。

### 配置 schema

演示/公开文档遵循 `schemas/venue-seats.schema.json:1`；数据集头部/记录由 `scripts/validate-dataset.mjs:34` 源码校验；来源在 `packages/core/src/index.ts:79` 声明。

### 协议文件与文案

JSON 文档是数据协议；`docs/data-format.md:1` 与 `docs/zh/data-format.md:1` 说明。数据集结构文档是 `docs/design/dataset-schema.md:1` 与 `docs/zh/design/dataset-schema.md:1`；来源文案内联在 fixture sources 中。

### 配置输入

生成规则/阈值；采集器的 Wikidata endpoint、根类型和容量边界；`--merge` 控制留存。

### 状态存储

Git 跟踪 JSON 是规范提交输出。生成读写本地文件；没有服务端数据库。演示包在构建/运行时把 fixture 导入内存。

### 生命周期

生成 → 提交 JSON → 导入/解析/校验 → 不可变文档。采集手动/离线触发；校验离线运行。

### 调用面

脚本到本地文件系统、采集器到 Wikidata SPARQL HTTPS、脚本/包导入结果 JSON。

## L8 构建发布层

### 实现

workspace 编排从 `package.json:7` 开始；包构建/导出/发布元数据在 `packages/core/package.json:11`；版本门禁在 `scripts/check-version.mjs:1`；tarball/ESM 门禁在 `scripts/check-publish.mjs:1`；Pages URL 检查在 `scripts/check-pages.mjs:1`；dist resolver 在 `scripts/dist-resolver.mjs:1`；CI 从 `.github/workflows/ci.yml:22` 开始。

### 配置 schema

根 package/workspace manifest、包 manifest、TypeScript 配置、pubspec 和 workflow inputs。TypeScript 源配置把导入指到 `src`；`publishConfig` 重定向到 `dist`，证据是 `packages/core/package.json:20`。

### 协议文件与文案

没有专属运行时协议。package manifest 和 `publishConfig` 是发布协议；发布策略在 `docs/release-strategy.md:1` 与 `docs/zh/release-strategy.md:1`。

### 配置输入

pnpm/Node/Flutter 版本和脚本、请求版本与 dry-run 开关、workflow secrets/environments、VitePress base/locales。

### 状态存储

构建输出是文件系统 `dist/`；tarball 和 Pages 输出是临时/构建工件；没有运行时数据库。发布使用 registry secrets，不使用仓库状态。

### 生命周期

安装 → typecheck/tests/coverage/build → 发布门禁 → 手动 workflow 发布。Pages 单独构建文档、检查 URL、部署。

### 调用面

根脚本到包脚本、CI 到脚本、manifest 到 workspace 协议、发布脚本到文件系统/npm dry-run。手动 workflow dispatch 先跑门禁，再发布 npm/pub。

## L9 文档站层

### 实现

`docs/.vitepress/config.mts:1` 定义双语 VitePress locales、`/venue-seats/` base 和 review 排除。英文页在根 Markdown；中文页在 `docs/zh/`；主题包装是 `docs/.vitepress/theme/index.ts:1`。

### 配置 schema

没有 JSON schema。VitePress 配置和 `docs/package.json:1` 的脚本就是 schema；review 排除从 `docs/.vitepress/config.mts:7` 开始。

### 协议文件与文案

Markdown 是创作协议。文档站承载 API/数据/发布文档；API 导出面和页面小节由测试对齐（`packages/core/test/api-doc.test.ts:1`、`packages/renderer/test/api-doc.test.ts:1`、`packages/renderer-3d/test/api-doc.test.ts:1`、`packages/venue_seats/test/api_doc_test.dart:1`）。

### 配置输入

VitePress base/locales/nav/sidebar、Markdown/frontmatter、链接和主题 CSS。

### 状态存储

Git 跟踪 Markdown、配置、主题和图片；生成文档输出只落在文件系统。

### 生命周期

创作/编辑 → VitePress build → Pages checker → `.github/workflows/pages.yml:22` 部署 GitHub Pages。

### 调用面

Markdown 互链、配置到主题/页面导入、CI/Pages 到 docs build/check。没有服务端渲染 API 或数据库。

## 九层拆分理由

1. **先契约，后渲染器。** 共享 `VenueDocument`、固定 schema 版本和版本拒绝让 Web 与 Dart 消费端不需要 TypeScript 桥就能互通（`packages/core/src/index.ts:9`、`schemas/venue-seats.schema.json:1`）。
2. **宿主状态与渲染器瞬态状态分开。** core 把选择定为受控客户端状态（`packages/core/src/index.ts:95`），hover/view/seat override 则是控制器字段（`packages/renderer/src/controller.ts:69`）；这避免壳层悄悄接管应用数据，也让 props 同步可测。
3. **2D DOM 引擎与框架壳分开。** React 和 Vue 挂载同一 `SeatMapController` 并转发同一回调（`packages/react/src/SeatMap.tsx:47`、`packages/vue/src/SeatMap.ts:43`），避免在每个框架重复指针、命中测试和无障碍行为。
4. **隔离 WebGL 并显式降级。** `createVenueView` 先探测再捕获 3D 构建失败（`packages/renderer-3d/src/controller.ts:478`），渲染器故障不会直接变成应用崩溃。
5. **显式保留 Flutter 平台边界。** Flutter 不能导入 TypeScript，因此必须用 Dart 镜像 JSON 契约并使用原生 `CustomPainter`/`InteractiveViewer`（`packages/venue_seats/lib/src/model.dart:1`、`packages/venue_seats/lib/src/seat_map.dart:17`），对等行为仍可通过测试约束。
6. **应用组合与可复用渲染器分开。** demo 状态组合已加载场馆、层、模式和重试（`apps/demo/src/App.tsx:7`）；包只暴露可复用控制器，场馆选择和懒加载 chunk 不进入渲染器 API。
7. **生成 JSON 是提交资产，不是服务。** fixture 与数据集是 Git 文件，由脚本生成/校验（`packages/venues-demo/src/index.ts:16`、`scripts/validate-dataset.mjs:1`），支持离线测试，也避免为静态数据引入后端。
8. **构建发布检查是可执行契约。** 版本和 tarball 门禁在发布前失败（`scripts/check-version.mjs:1`、`scripts/check-publish.mjs:51`），阻止声明路径指向缺失或不可加载工件。
9. **文档导航与源码导出契约分开。** VitePress 控制 locales/base/nav（`docs/.vitepress/config.mts:10`），API 测试对齐源码导出；文档站不会变成运行时依赖。

## 相关文档

- [术语表](/zh/glossary)
- [API](/zh/api)
- [数据格式](/zh/data-format)
- [数据集结构](/zh/design/dataset-schema)
