# 数据集 Schema

> [English](dataset-schema.md) | **中文**

项目的事实层：一份机器可读的文件，把真实场馆描述为一组事实——身份、位置、容量、
类别。它刻意与 [`schemas/venue-seats.schema.json`](../../schemas/venue-seats.schema.json)
分开，后者是座位图的渲染格式。

一个项目，两层：

| 层 | 文件 | 装什么 |
|---|---|---|
| 事实 | `data/venues.json` | 场馆是谁、在哪、多少座、属哪类——采集来的事实 |
| 座位图 | `examples/venues/*.json`、`packages/venues-demo/venues/*.json` | 渲染器能画的布局，依据公开布局信息自建 |

## 为什么数据集永远不含座位图

商业场馆的逐座布局受版权保护，绝不在本仓打包、抓取或派生。数据集止步于事实层：
容量是一个公开发布的数字，不是一张 8 万座位的图。`data/` 里没有任何图。

## 文件

`data/venues.json`——单个 JSON 文档，2 空格缩进，末尾换行，记录按 `id` 排序，
重新采集后 diff 保持稳定。

```json
{
  "datasetVersion": 1,
  "generatedAt": "2026-10-18T04:20:00.000Z",
  "generator": "scripts/collect-dataset.mjs",
  "licence": "CC0-1.0",
  "source": { "endpoint": "...", "query": "..." },
  "counts": { "rows": 2360, "entities": 2119, "merged": 0, "collapsedPlaces": 6, "droppedNoName": 0, "venues": 2113 },
  "venues": [ { "id": "wikidata-Q10758", "...": "..." } ]
}
```

## 头部字段

| 字段 | 含义 |
|---|---|
| `datasetVersion` | 本文件的 schema 版本；目前只支持 `1` |
| `generatedAt` | 本次采集的 ISO-8601 时间戳 |
| `generator` | 产出本文件的脚本 |
| `licence` | `CC0-1.0`——数据集及其每条记录 |
| `source.endpoint` | 取数的公开 API |
| `source.query` | 当时发出的原始查询，快照可据此复现与审计 |
| `counts` | 采集记账，明细见下 |
| `venues` | 记录数组 |

`counts` 记录从原始查询到最终入库的漏斗：

| 计数 | 含义 |
|---|---|
| `rows` | 端点返回的行数，尚未做本地过滤 |
| `entities` | 按实体去重后的不同 Wikidata 实体数 |
| `merged` | `--merge` 运行时从旧快照保留的记录数 |
| `collapsedPlaces` | 合并进同一记录的继任实体数，见去重 |
| `droppedNoName` | 因来源缺可用名称而被丢弃的实体数 |
| `venues` | 最终入库的记录数 |

每一步都写进文件而不是隐含，快照缩水或增长都自带解释。

## 记录字段

| 字段 | 类型 | 必填 | 来源 | 含义 |
|---|---|---|---|---|
| `id` | string | 是 | 派生 | 稳定主键，恒为 `wikidata-<qid>` |
| `qid` | string | 是 | Wikidata 实体 | 实体 id，`Q` 加数字 |
| `name` | string | 是 | rdfs:label | 英文标签，无英文时取任一语言 |
| `venueType` | 枚举 | 是 | P31 / P279\* | `stadium`、`arena`、`theatre` 三者之一 |
| `capacity` | integer | 是 | P1083 | 座位数；Wikidata 的"最大容量" |
| `lat` | number | 是 | P625 | WGS84 纬度，度 |
| `lng` | number | 是 | P625 | WGS84 经度，度 |
| `country` | string\|null | 否 | P17 → P297 | ISO 3166-1 alpha-2 代码 |
| `city` | string\|null | 否 | P131 | 所在地的标签 |
| `opened` | integer\|null | 否 | P571 | 启用年份，仅当落在 `1600–2100` 内 |
| `retrievedAt` | string | 是 | 运行时 | 取数日期，ISO-8601 |
| `sources` | array | 是 | 运行时 | 至少一条，含 `url`、`licence`、`method` |

## 坐标系与单位

- **大地基准：** WGS84。两个值都是十进制度，不是弧度，不是米。
- **顺序：** Wikidata 存成 `Point(经度 纬度)`；文件里拆成 `lat`、`lng` 两个独立数字。
- **多条声明：** 一个实体可能带多条 P625 声明。采集脚本取第一条，被丢弃的不做
  记录——坐标是代表点，不是轮廓。
- **容量单位：** 座位数，整数。Wikidata 的 P1083 是"最大容量"，对本次采集的
  场馆类别就是座位数。数值不做再推导。
- **`opened`：** 落在 `1600–2100` 之外的年份一律置 `null` 而非入库——一些圆形
  剧场和遗迹带着并非现代年份的日期。

## 采集阈值

| 类别 | Wikidata 根 | 最低容量 |
|---|---|---|
| `stadium` | Q483110（stadium），沿子类图向下 | 20,000 |
| `arena` | Q641226（arena），沿子类图向下 | 20,000 |
| `theatre` | Q24354（theatre building），沿子类图向下 | 3,000 |

阈值是为了让单次采集保持有界，是 `scripts/collect-dataset.mjs` 顶部的常量。
日后放宽阈值再用 `--merge` 重跑，快照只增不减。

## 去重

两趟，都确定：

1. **按实体。** 一个实体可能同时挂在多个根下，或同一值出现多行。采集脚本按实体
   只留一条；命中多个根时按 `stadium` > `arena` > `theatre` 的优先级归类。
2. **按地点。** 重建的场馆常常保留原名与原址、却领到新的 Wikidata 条目——新老
   圣马梅斯就是共享同名同址的两个实体。采集脚本把这类继任对折进容量更高的那条
   记录，容量持平取更晚的实体 id。键为（小写的 `name`、`country`、两个坐标各
   四舍五入到两位小数），约一公里见方。

返回行数、实体数、入库条数三者不同，每个差值都写进 `counts`，不藏。

## 校验

`scripts/validate-dataset.mjs` 重读文件，任何违规都以非零码退出，每条违规打印
`venues.json: <id>: <reason>`：

1. 头部：`datasetVersion` 为 `1`，`generatedAt` 可解析为日期，`licence` 为
   `CC0-1.0`，`source.endpoint` 与 `source.query` 非空。
2. 每条记录必填字段齐全；`name` 非空；`venueType` 在枚举内。
3. `capacity` 为正整数；`lat` 在 `[-90, 90]`；`lng` 在 `[-180, 180]`。
4. `qid` 匹配 `Q\d+`；`id` 等于 `wikidata-<qid>`。
5. `retrievedAt` 可解析为日期；`sources` 至少一条且带 `url`、`licence`、`method`。
6. 唯一性：`id` 不重复、`qid` 不重复、`name` + `country` + 坐标四舍五入到两位
   小数的组合不重复。

`packages/venues-demo/test/dataset.test.ts` 在 CI 里跑这个校验器，快照不会
悄悄烂掉，也不会被空文件顶替。

## 更新

```bash
node scripts/collect-dataset.mjs          # 全量重建
node scripts/collect-dataset.mjs --merge  # 保留新拉取不到的旧记录
node scripts/validate-dataset.mjs         # 完整性校验，不联网
```

采集脚本需要访问公开 SPARQL 端点的网络，并按本项目建设发送 `User-Agent`；
校验器完全不联网。重新采集**不保证字节级复现**——上游数据在变，
`scripts/gen-examples.mjs` 那种确定性在这里不成立。`generatedAt` 每次都会
移动，就是这一点的标记。

## 许可与署名

Wikidata 以 **CC0 1.0**（公有领域贡献）发布。每条事实都以实体 URL 作为该记录
的来源，来源条目带 `licence: "CC0-1.0"` 与 `method: "public-api"`。数据集不含
任何场馆方的名称标识、logo、座位图或其他素材，不抄任何商业产品。
