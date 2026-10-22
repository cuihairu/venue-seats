---
layout: home
hero:
  name: venue-seats
  text: 一份 JSON 文件生成场馆座位图
  tagline: 数据模型 + JSON Schema + React、Vue 和 Flutter 渲染器
  actions:
    - theme: brand
      text: 快速开始
      link: /quickstart
    - theme: alt
      text: 数据格式
      link: /data-format
features:
  - title: 一份 JSON，三个消费端
    details: React、Vue 和 Flutter 读取同一份场馆文档 —— 没有按平台各自准备的数据。命中测试在每个平台都走同一套 core 几何。
  - title: L1 + L2 选择，外加 3D 视图
    details: 先选区（section）再选排（row），放大后可逐座（seat）切换，并提供共享同一数据与选择状态的 three.js 3D 视图 —— 支持平滑缩放/平移、悬停高亮、售罄状态、价格层级配色以及键盘/读屏支持。
  - title: 净室开发，MIT 授权
    details: 自有代码、自有数据格式、自有几何。演示场馆依据公开布局信息重建，并标注为 示意 —— 不含任何官方座位图。
---

## 状态

| 消费端 | 包 | 状态 |
|---|---|---|
| React | `@venue-seats/react` | 源码可用，未发布 npm |
| Vue | `@venue-seats/vue` | 源码可用，未发布 npm |
| 3D（three.js） | `@venue-seats/renderer-3d` | 源码可用，未发布 npm |
| Flutter | `packages/venue_seats`（Dart） | 源码可用，未发布 pub |

范围：**L1 已完成**（区 + 排），**L2 已完成**（放大时的逐座切换），**L3 已完成**（three.js 3D 视图，自动回退到 2D），**移动端已完成**（触控能力对齐：平移 / 双指缩放 / 点按选择，窄视口回退）。参见 [数据格式](/data-format) 和 [API](/api)。
