# data/ — 自建场馆事实数据集

`venues.json` 是从公开渠道自行采集并结构化的场馆**事实**数据：身份、类别、坐标、
容量、国家/城市、启用年份。每条记录引用其 Wikidata 实体页作为来源。
字段定义、坐标系、单位、去重与校验规则见
[docs/design/dataset-schema.md](../docs/design/dataset-schema.md)（中文版
[docs/zh/design/dataset-schema.md](../docs/zh/design/dataset-schema.md)）。

本目录**不含任何座位图**：座位级布局受版权保护，数据集止步于事实层。与
`examples/venues/` 的关系见 schema 文档的「两层」一节。

## 规模（2026-10-18 采集）

| 指标 | 数值 |
|---|---|
| 记录数（venues） | 2,113 |
| 原始行数 / 去重实体数 | 2,360 / 2,119 |
| stadium（≥20,000 座） | 1,865 |
| arena（≥20,000 座） | 40 |
| theatre（≥3,000 座） | 208 |
| 覆盖国家/地区（ISO 3166-1 alpha-2） | 158 |
| city 填充 / opened 填充 | 2,058 / 1,429 |

文件约 1.0 MB；记录按 `id` 排序，重新采集后 diff 稳定。

## 数据来源清单

| 来源 | URL | 许可 | 采集方式 |
|---|---|---|---|
| Wikidata Query Service（SPARQL 端点） | <https://query.wikidata.org/sparql> | CC0 1.0（<https://www.wikidata.org/wiki/Wikidata:Licensing>） | 公开 API（脚本 `scripts/collect-dataset.mjs` 发送 SPARQL 查询，查询原文存于文件头 `source.query`） |

- 每条记录的 `sources[0].url` 指向该场馆自己的 Wikidata 实体页，`licence: "CC0-1.0"`、
  `method: "public-api"`；`retrievedAt` 为该轮采集日期。
- 根类：stadium = Q483110、arena = Q641226、theatre = Q24354（沿子类图 P279 展开）。
- 采集时按 Wikimedia 政策发送带项目名的 `User-Agent`。

## 红线（本项目自守）

- 事实性数据（名称、坐标、容量、年份）来自 CC0 公开渠道，未抄取任何商业产品的
  代码、素材或数据；不含任何场馆 logo、商标素材或座位图。
- 上游为维基生态的共享数据，数值可能随时被编辑；快照带 `generatedAt`，不做
  字节级复现承诺。

## 更新方式

```bash
node scripts/collect-dataset.mjs          # 全量重建（联网）
node scripts/collect-dataset.mjs --merge  # 增量：保留新拉取不到的旧记录
node scripts/validate-dataset.mjs         # 完整性校验（不联网，违规非零退出）
```

`packages/venues-demo/test/dataset.test.ts` 在 CI 里跑同一校验器并断言来源、
规模下限与记录形状，防止数据悄悄烂掉。
