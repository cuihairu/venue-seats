> [English](data-format.md) | **中文**

# 数据格式

一份 JSON 文档描述一个场馆在某一种活动配置下的布局。三个消费端（React、Vue、Flutter）读取的都是这同一份文件 —— 没有按平台各自准备的数据。

```
VenueDocument
├── schemaVersion: "1"
├── venue { id, name, city, address, lat, lng }        # 场馆卡片所用的地理信息
├── stage? { x, y, rotation, w?, h? }                  # 舞台朝向 + 占地范围（演唱会）
├── provenance?: "official" | "demo" | "public"         # demo/public = 依据公开信息重建
├── priceTiers[] { id, name, color, price? }           # 颜色图例 + 定价
└── levels[]                                            # 楼层/层
    └── sections[] { id, name, polygon[][], priceTierId?, rows[] }   # 区 (L1)
        └── rows[] { id, label, seats[] }              # 排 (L1)
            └── seats[] { id, label, x, y, status, priceTierId? }    # 座 (L2)
```

## 规则

1. **坐标使用场馆空间单位**，而不是像素。每个渲染器自行把它们映射到自己的视口 —— 2D SVG 渲染器、3D three.js 渲染器（y=0 处的 XZ 地平面）和 Flutter 画笔消费的都是同一份文档，不存在按平台复制的副本。
2. **`polygon` 是 L1 层级某个区（`section`）的命中区域**。core 里的 `sectionAt()` 负责做点在多边形内的判定。
3. **Status（状态）** 取值为 `available | selected | sold | held` 之一。选中状态保存在客户端本地；`sold`/`held` 来自票务后端。
4. **provenance（数据来源）**：依据公开布局信息重建的文档标记为 `demo`（示意用的固定样例）或 `public`（真实场馆，其结构与容量遵循所引用的公开来源，但座位排布仍是我们自己的重建）。两者在 UI 文案中都必须描述为 示意/重建 —— 均未与真实场馆核对过。官方座位图的版权归其所有者，绝不会打包进本仓库。
5. `schemaVersion` 只在破坏性变更时才会改变。校验器要求该字段存在，并拒绝支持取值（`"1"`）以外的任何值，因此无法识别的文档会直接报错，而不是渲染到一半（审计表 A1）。

机器可读契约见 [`schemas/venue-seats.schema.json`](https://github.com/cuihairu/venue-seats/blob/main/schemas/venue-seats.schema.json)，`validate()` 见 `packages/core/src/index.ts`。

## 示例样本如何使用该模型

`examples/venues/` 为每个布局家族各提供一份样本（`provenance: "public"`，来源与许可见 [`examples/README.md`](https://github.com/cuihairu/venue-seats/blob/main/examples/README.md)）。它们展示了同一个模型如何覆盖截然不同的建筑：

| 样本 | 形状 | 模型映射 |
| --- | --- | --- |
| `public-ncpa-opera-house.json` | 扇形剧院，3 层挑台 | 池座和每层挑台各是一个楼层/层（`level`）；楼层的区（`sections`）是以舞台为圆心的同心扇形楔块，因此排（`rows`）/座（`seats`）随扇形弧度弯曲；`stage.rotation: 180` 让舞台面向观众 |
| `public-hangzhou-olympic-stadium.json` | 椭圆体育场，3 层看台 + 内场 | 三个由椭圆环状区（`sections`）组成的楼层/层（`levels`）；演唱会内场区块位于 `floor` 区块中；`priceTierId` 按相对舞台的中心程度切换 |
| `public-expo-culture-center.json` | 碗形体育馆，可变内场 | 保留已公布的区号（201–222 / 501–528）；可变内场是一个居中的 `stage` 加上一个 `backstage` 层级的核心区；包厢楼层暂不建模 |
| `public-hong-kong-coliseum.json` | 不规则矩形碗形看台 | 四面陡峭的碗形看台被从中心舞台（四面台）发出的射线切分为直边梯形区（`sections`）；两个价格层级按区块条带划分 |

用 `node scripts/gen-examples.mjs` 可以逐字节一致地重新生成（`packages/venues-demo/test/schema.test.ts` 中的可复现性测试守护这一点）。
