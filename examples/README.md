# examples/ — 真实场馆样本（provenance: "public"）

本目录的样本是**依据公开资料自建的重建**（`provenance: "public"`）：楼座结构、分区数、朝向与总容量跟随公开口径；**座位坐标是我们自己的重制**，不保证与真实场馆一致，也未复制任何官方座位图。价格档位是演示用途的虚构数字。

生成方式：`node scripts/gen-examples.mjs`（确定性种子，可复现）。改参数后重新生成，勿手改 JSON。

## 样本清单

| 文件 | 场馆 | 形态 | 公开容量 | 样本座位数（缩样比） | 来源 | 许可判定 |
| --- | --- | --- | --- | --- | --- | --- |
| `public-ncpa-opera-house.json` | 国家大剧院·歌剧院（北京，2007） | 扇形观众厅：池座 + 三层楼座 | 2,207（池座 640 / 一层 584 / 二层 140 / 三层 717 / 乐池 126；乐池未建模） | 2,141（1:1 逐层近似） | 官网剧场介绍 <https://www.chncpa.org/cgylx/jyjg/>；<https://zh.wikipedia.org/wiki/国家大剧院> | 容量与分层为事实性数据，可用；未复制官网文字段落与座位图图片 |
| `public-hangzhou-olympic-stadium.json` | 杭州奥体中心体育场“大莲花”（2019） | 椭圆三层看台 + 内场（演唱会配置） | 80,800 固定坐席（上/中/下三层看台有明文） | 7,816（约 1:10） | <https://zh.wikipedia.org/wiki/杭州奥林匹克体育中心>；<https://en.wikipedia.org/wiki/Hangzhou_Olympic_Sports_Expo_Center> | 事实性数据可用；三层结构为英文维基明文，缩样比在文件头注明 |
| `public-expo-culture-center.json` | 上海世博文化中心（2010） | 碗形两层看台 + 核心岛可变内场 | 18,000（四面/最大模式；一面台 13,000） | 4,632（约 1:3.9） | <https://zh.wikipedia.org/wiki/梅赛德斯-奔驰文化中心>；<https://en.wikipedia.org/wiki/Mercedes-Benz_Arena_(Shanghai)> | 事实性数据可用；刻意使用原名“上海世博文化中心”，不带冠名商标 |
| `public-hong-kong-coliseum.json` | 香港体育馆“红馆”（1983） | 异形：矩形 42×42m 中央表演场 + 四面陡看台（倒金字塔） | 12,500 = 固定 10,400 + 拉出式 2,000 | 3,152（约 1:4） | <https://zh.wikipedia.org/wiki/香港體育館>；<https://en.wikipedia.org/wiki/Hong_Kong_Coliseum> | 事实性数据可用；矩形内场/四面台/倒金字塔均为中英维基明文 |

各文件内部注释：`levels[].name` 标注楼层/看台名，分区名沿用公开编号（如世博文化中心 201–222 / 501–528）；未建模的部分（乐池、包厢层、拉出式座位）在来源列注明。

## 许可红线（本项目自守）

- **只取事实性数字**（容量、层数、分区数、尺寸、朝向），事实数据不受版权保护；不翻译、不照抄来源的文字段落与表格排版。
- **不复制任何座位图**：官网选座图、票务平台图、seats.io 等商业示例图、GitHub seatmap 项目的示例 JSON 一律不作为数据来源（后者即使代码 MIT，数据文件版权也常不明）。
- **不带入商标与肖像**：场馆用真实名称做文字指代；冠名场馆优先用原名（如“上海世博文化中心”）；不嵌入任何 logo、队徽、艺人素材。
- 维基引用遵循 CC BY-SA 署名精神：保留来源链接；本表访问日期均为 2026-10-15。

## 与模型概念的对应

见 [docs/data-format.md](../docs/data-format.md) 的「样本与模型概念对照」一节：四种形态分别演示 levels（楼层）、sections（分区多边形）、rows/seats（排与座）、stage.orientation（舞台朝向）如何组合。
