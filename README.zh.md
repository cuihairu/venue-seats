# venue-seats

场馆座位图库：数据模型 + JSON Schema + 渲染器，一个数据格式，三端可用。

| 端 | 包 | 状态 |
|---|---|---|
| React | `@venue-seats/react` | 计划中 |
| Vue | `@venue-seats/vue` | 计划中 |
| Flutter | `packages/venue_seats`（Dart） | 计划中 |

## 为什么开这个项目

开源世界的中国场馆座位数据接近为零，商业方案（seats.io、seatmap.pro、SeatLayer）
要么收授权费、要么渲染器闭源。本项目做干净的自研实现，核心 MIT：

- 不抄任何商业项目的代码、素材、座位数据；
- 示例场馆按公开资料重建，明确标注 `demo` / **示意**，不保证与真实场馆一致；
- 官方座位图受版权保护，仓库不收录、不爬取。

## 分期

- **L1 先做**：选区、选排（中国大型体育馆/演唱会场馆最常用的粒度）
- L2：逐座（有真实逐座几何后再做）
- L3：3D（three.js 程序化几何，与 2D 共用同一份数据；低端机自动回 2D）

## 质量标尺

对标商业级交互：缩放/拖动顺滑、悬停高亮、售罄置灰、票价分区配色、舞台朝向、
楼层切换、键盘与无障碍可用。**看商业产品做参考可以，抄它的代码/素材/数据不行。**

## 数据格式

见 [`schemas/venue-seats.schema.json`](schemas/venue-seats.schema.json) 与
[`docs/data-format.md`](docs/data-format.md)。英文文档见 [README.md](README.md)。
