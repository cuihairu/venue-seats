# 术语表

本页按源码层归纳术语，路径均从仓库根开始。本文与[英文术语表](/glossary)同义互链；分层解说见[架构目录解说](/architecture)。

## 数据契约层

| 术语 | 英文 | 定义 | 证据 |
|---|---|---|---|
| 场馆文档 | Venue Document | 面向全部渲染器的版本化 JSON 树，包含场馆元数据、舞台、票档、层级与数据来源；`schemaVersion` 必须为 `"1"`。 | `packages/core/src/index.ts:72` |
| 座位状态 | Seat Status | `available`、`selected`、`sold`、`held` 四个本地视觉状态；文档提供初始值，运行时切换会写入控制器内存覆盖。 | `packages/core/src/index.ts:6` |
| 一级选择 | L1 Selection | 区（section）加可选排（row）的选择单元，属于客户端受控输入，不进入持久化存储。 | `packages/core/src/index.ts:95` |
| 命中测试 | Hit Testing | 把场馆坐标解析为区、排或可见座位；Web 与 Flutter 重复实现几何，因为 Flutter 无法导入 TypeScript。 | `packages/core/src/index.ts:166` |

## 状态层

| 术语 | 英文 | 定义 | 证据 |
|---|---|---|---|
| 受控选择 | Controlled Selection | 由宿主应用拥有的选择值；回调只提出变更。React、Vue 和 Flutter 壳都不拥有规范状态。 | `packages/core/src/index.ts:95` |
| 座位覆盖 | Seat Override | 文档加载后临时写入内存的座位状态映射；销毁时消失，换文档或换层时清空。 | `packages/renderer/src/controller.ts:78` |
| 悬停信息 | Hover Info | 控制器内的区/排/座位预览和屏幕坐标，经 `requestAnimationFrame` 节流；不涉及数据库或网络存储。 | `packages/renderer/src/controller.ts:90` |
| 视图状态 | View State | SVG viewBox、视口尺寸、适配比例、指针、拖拽阶段和销毁标记，都属于单个 Web 控制器生命周期。 | `packages/renderer/src/controller.ts:88` |
| Flutter 变换 | Flutter Transform | 用户平移/缩放的 `TransformationController` 与画笔适配变换；状态随 Widget `State` 生命周期存在，换文档会清覆盖并重新适配。 | `packages/venue_seats/lib/src/seat_map.dart:76` |

## 渲染层

| 术语 | 英文 | 定义 | 证据 |
|---|---|---|---|
| 二维控制器 | 2D Controller | 单宿主 SVG 控制器，组合文档状态、DOM、指针/键盘输入、命中测试、ARIA 和缩放状态；`destroy()` 解绑监听并清空子节点。 | `packages/renderer/src/controller.ts:68` |
| 二维样式协议 | 2D Style Contract | 注入的 `<style>` 节点和默认 CSS 类构成宿主视觉协议；提示与 ARIA 文案内联在渲染器源码中。 | `packages/renderer/src/dom.ts:28` |
| 三维场景 | 3D Scene | 用拉伸区面、实例化座位球、舞台盒和地面组装 three.js 场景，选择/状态/射线换算由纯函数更新。 | `packages/renderer-3d/src/scene.ts:31` |
| 三维控制器 | 3D Controller | Canvas/WebGL 控制器，拥有场景、相机、轨道控制、选择覆盖、指针状态、尺寸监听和动画循环。 | `packages/renderer-3d/src/controller.ts:60` |
| 能力探测 | Capability Probe | 判断是否尝试 3D 的窄视口、低端设备和 WebGL 检查。 | `packages/renderer-3d/src/capability.ts:1` |
| 统一视图 | Unified View | 以 `mode` 加文档、选择、缩放和生命周期方法暴露的小门面；允许时先建 3D，构建失败则捕获异常改建 2D。 | `packages/renderer-3d/src/controller.ts:27` |
| Flutter 画笔 | Flutter Painter | `CustomPainter` 读取文档、选择、悬停、适配和座位覆盖，绘制区、排、座位、标签与舞台。 | `packages/venue_seats/lib/src/painter.dart:11` |

## 应用边界层

| 术语 | 英文 | 定义 | 证据 |
|---|---|---|---|
| React 壳 | React Shell | 一次性挂载控制器，用 refs/effects 同步文档、层和选择；回调经 latest-props ref 转发。 | `packages/react/src/SeatMap.tsx:37` |
| Vue 壳 | Vue Shell | Vue 生命周期管理同一控制器，暴露命令式缩放与控制器方法；`v-model:selection` 和 watcher 桥接受控状态。 | `packages/vue/src/SeatMap.ts:20` |
| Flutter 组件 | Flutter Widget | 公共 `VenueSeatMap` 的 props、回调、缩放限制和交互阈值构成 Dart 壳契约；状态子类保持私有。 | `packages/venue_seats/lib/src/seat_map.dart:17` |
| 演示应用状态 | Demo Application State | React state 持有选中/已加载场馆、层、选择、请求的 3D 模式、实际模式、加载错误和重试计数，并懒加载场馆 JSON。 | `apps/demo/src/App.tsx:7` |
| 场馆入口 | Venue Entry | 懒加载函数加元数据与来源；Vite 把每个动态导入拆成独立 JSON chunk。 | `apps/demo/src/venues.ts:4` |
| 演示数据包 | Demo Venue Package | 静态 JSON fixture 以类型化文档导入并导出为一个数组；生成靠可复现脚本，不是运行时服务。 | `packages/venues-demo/src/index.ts:16` |
| 数据集快照 | Dataset Snapshot | 提交进 Git 的事实场馆元数据文件，离线校验，刻意不含座位图。 | `scripts/validate-dataset.mjs:1` |

## 构建发布层

| 术语 | 英文 | 定义 | 证据 |
|---|---|---|---|
| 发布包图 | Publish Package Graph | 六个可发布 npm workspace 包加一个私有应用；本地 workspace 从 TS 源解析，发布配置替换后走 `dist/`。 | `packages/core/package.json:11` |
| 发布契约 | Publish Contract | 发布前 dry-run 包必须包含声明的 `dist/` 入口，并能以 Node ESM 加载。 | `scripts/check-publish.mjs:26` |
| 版本门禁 | Version Gate | 全部可发布 manifest 和 Flutter pubspec 必须先等于请求版本。 | `scripts/check-version.mjs:1` |
| Pages 输出 | Pages Output | VitePress 双语站点构建在 `/venue-seats/` 下，排除原始审查记录；检查器校验 base 内部 URL。 | `docs/.vitepress/config.mts:3` |

## 术语导航

- [英文术语表](/glossary)
- [架构目录解说](/architecture)
- [API](/zh/api)
