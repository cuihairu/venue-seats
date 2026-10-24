# venue-seats

<p align="center">
<a href="https://github.com/cuihairu/venue-seats/releases"><img alt="Status" src="https://img.shields.io/badge/status-in%20development-orange"></a>
</p>

[English](README.md) | **中文**

<p align="center"><img src="logo.svg" alt="venue-seats logo" width="64" height="64"></p>

<p align="center">
<a href="https://github.com/cuihairu/venue-seats/tree/main/packages/react"><img src="https://img.shields.io/badge/React-0.0.1-61dafb" alt="React 0.0.1"></a> <a href="https://github.com/cuihairu/venue-seats/tree/main/packages/vue"><img src="https://img.shields.io/badge/Vue-0.0.1-42b883" alt="Vue 0.0.1"></a> <a href="https://github.com/cuihairu/venue-seats/tree/main/packages/venue_seats"><img src="https://img.shields.io/badge/Flutter-0.0.1-02569b" alt="Flutter 0.0.1"></a> <a href="https://github.com/cuihairu/venue-seats/tree/main/packages"><img src="https://img.shields.io/badge/TypeScript-5.6-3178c6" alt="TypeScript 5.6"></a> <a href="https://github.com/cuihairu/venue-seats/tree/main/packages/venue_seats"><img src="https://img.shields.io/badge/Dart-3.4-0175c2" alt="Dart 3.4"></a> <a href="https://github.com/cuihairu/venue-seats/actions/workflows/ci.yml"><img src="https://github.com/cuihairu/venue-seats/actions/workflows/ci.yml/badge.svg" alt="CI"></a> <a href="https://cuihairu.github.io/venue-seats/"><img src="https://img.shields.io/badge/docs-site-blue" alt="Docs"></a> <a href="https://codecov.io/gh/cuihairu/venue-seats"><img src="https://codecov.io/gh/cuihairu/venue-seats/branch/main/graph/badge.svg" alt="codecov"></a> <a href="https://github.com/cuihairu/venue-seats/blob/main/LICENSE"><img src="https://img.shields.io/github/license/cuihairu/venue-seats" alt="License: MIT"></a>
</p>

场馆座位图库：数据模型 + JSON Schema + 渲染器，一个数据格式，三端可用。

| 端 | 包 | 状态 |
|---|---|---|
| React | `@venue-seats/react` | 源码可用，未发 npm |
| Vue | `@venue-seats/vue` | 源码可用，未发 npm |
| Flutter | `packages/venue_seats`（Dart） | 源码可用，未发 pub |

## 示例

`apps/demo` 是 Vite 示例应用：楼层切换、票价图例、区/排两级选择、缩放拖动、
售罄态、2D/3D 视图切换（共用选中状态），渲染 5 个演示场馆与 4 个公开重建样本
（`provenance: "public"`，见 [`docs/zh/data-format.md`](docs/zh/data-format.md)）。

![总览](docs/screenshots/01-overview-national-stadium.png)

其余状态截图见 [`docs/screenshots/`](docs/screenshots)：楼层切换、票档配色、
选区选排、悬停提示、售罄分区、八边形 arena 场馆。

示例场馆 5 个，均按公开布局资料重建并简化，`"provenance": "demo"`：

| 场馆 | 形状 | 文件 |
|---|---|---|
| 国家体育场（鸟巢）· 北京 | 椭圆体育场，3 层 | `demo-national-stadium.json` |
| 上海体育场 · 上海 | 椭圆体育场，3 层 | `demo-shanghai-stadium.json` |
| 梅赛德斯-奔驰文化中心 · 上海 | 八角形场馆 | `demo-mercedes-arena.json` |
| 凯迪拉克中心（五棵松）· 北京 | 八角形场馆 | `demo-cadillac-arena.json` |
| 深圳湾体育中心体育馆 · 深圳 | 椭圆体育场，3 层 | `demo-shenzhen-bay.json` |

**不保证与真实场馆一致；不收录任何官方座位图。**

## 为什么开这个项目

开源世界的中国场馆座位数据接近为零，商业方案（seats.io、seatmap.pro、SeatLayer）
要么收授权费、要么渲染器闭源。本项目做干净的自研实现，核心 MIT：

- 不抄任何商业项目的代码、素材、座位数据；
- 示例场馆按公开资料重建，明确标注 `demo` / **示意**，不保证与真实场馆一致；
- 官方座位图受版权保护，仓库不收录、不爬取。

## 分期

- **L1 已完成**：选区、选排（中国大型体育馆/演唱会场馆最常用的粒度）
- **L2 已完成**：逐座选择交互（座位可见后点选切换选中，`onSeatToggle` / `onSeatActivated` 回报新状态；不影响 L1 选区/选排）
- **L3 已完成**：3D 视图（three.js 程序化几何：拉伸分区 + 实例化座位球 + 舞台；与 2D 共用同一份文档与选中状态，demo 可一键切换 2D/3D；低端机、窄屏视口或无 WebGL 自动回 2D）
- **移动端已完成**：触控与桌面交互对等（单指拖动平移、双指捏合缩放、点选区/排），390×844 真机触控走查 13 项全绿；`pnpm --filter @venue-seats/demo walkthrough:mobile` 可复现（截图见 `docs/screenshots/10-mobile-*.png`）

## 质量标尺

对标商业级交互：缩放/拖动顺滑、悬停高亮、售罄置灰、票价分区配色、舞台朝向、
楼层切换、键盘与无障碍可用。**看商业产品做参考可以，抄它的代码/素材/数据不行。**

## 数据格式

见 [`schemas/venue-seats.schema.json`](schemas/venue-seats.schema.json) 与
[`docs/zh/data-format.md`](docs/zh/data-format.md)。

## 本地测试口径

CI 与本地开发按改动面三路分流——改一行文档不该全量编译。

1. **文档改动**（`*.md`、`docs/**`、图片）：不编译。主 CI workflow 的 `paths-ignore` 已跳过这些路径。
2. **代码改动**：只跑改动子集，不全量。
   - `pnpm --filter <改动包> test`
   - `flutter test packages/venue_seats`
3. **全量**（`pnpm -r test` + `flutter test`）：仅以下情形触发——package.json / pnpm-lock.yaml / pubspec.yaml、`.github/**`、Docker/Compose 配置、发布前。

发布就绪另有独立门禁：`pnpm -r build` 之后跑 `pnpm publish:check`（CI 在 build 步之后接一步）。
它逐包用 `npm pack --dry-run` 取真实 tarball，核对 `publishConfig` 声明的产物都在包内且落在
`dist/`、包内带 `LICENSE` 与 `README.md`，并把每条 `.js` 入口按发布世界的依赖图真实 `import()`
一次——包能构建但消费者加载不了（无扩展名相对导入、JSON 缺 import attribute）会在这里红。
