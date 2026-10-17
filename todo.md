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
- [x] 3D 座位二次切换清 override 与渲染循环停止测试（0417dd5, renderer-3d 65）
- [x] 2D 公共面与守卫测试（getDoc/setLevel/clearSelection/zoomOut/fit 守卫/键盘节流）（eb4a30a, renderer 42）
- [x] Flutter ViewFit 居中修复与几何助手测试（bounds/seatAt/availability/ViewFit）（e7307e9, Flutter 38）
- [x] Flutter 选中区内点击空处清除测试（69070e9, Flutter 51）
- [x] Flutter 画笔重绘判等修复与票档/座位态 golden（41f15cc, Flutter 46）
- [x] Flutter 层级切换、未知 levelId 回退、座位可见门限与 held 忽略测试（9406de9, Flutter 50）
- [x] 示例场馆生成可复现测试并删除无人引用的 check-venues.mjs（63ea6de, venues-demo 6）
- [x] JSON Schema 契约测试并清除场馆数据里的未声明字段 _mid（8b6029e, venues-demo 12）
- [x] 场馆座位票档可解析与排 id 唯一性守卫（85ee3e5, venues-demo 13）
- [x] docs/api.md 与源码导出面一致性测试，并补记 clientToVenue（4e9e67d, core 30 / renderer 45）
- [x] validate 对畸形输入（非数组 priceTiers/非对象/缺 id）的守卫与测试（5bce521, core 30）
- [x] renderer-3d 导出面、react 命令式 handle、vue expose 与事件的 api.md 一致性测试，并补记 SEAT_COLORS/FOV_3D（7163470, renderer-3d 72）
- [x] Flutter 导出面 api.md 一致性测试，并补记 geometry.dart 全部命中测试函数（37a0a09, Flutter 53）
- [x] renderer geometry/dom 模块导出 api.md 一致性测试，并补记 SVG_NS（6652712, renderer 47）
- [x] react SeatMapProps 与 vue props 的 api.md 一致性测试（6b1e01c, renderer-3d 74）
- [x] 可选字段与守卫分支补测：core/renderer/renderer-3d 语句行函数全 100%、分支 100%（77af742, 08a2ab2, 2af1c66, bc0fad0, ba85b63; react/vue 各剩 1 个防御分支）
- [x] Flutter ViewFit 判等与 VenueBounds.empty 测试，analyze 零警告（40d83b0, Flutter 55）
- [x] 校验器拒绝未知 schemaVersion（A1 落地，core + Flutter 双端，SUPPORTED_SCHEMA_VERSION）（0f9a660, c0436ca, core 36 / Flutter 56）
- [x] JSON Schema 与 validate() 版本集合一致性门禁，schemaVersion 收口 enum ["1"]（b6105ac, d8cdf37, venues-demo 14）
- [x] 发布前置元数据补齐：repository 字段（npm 6 包 + pubspec）与 demo private 门禁测试（808ad73, venues-demo 22）
- [x] CHANGELOG.md 骨架（Unreleased 按 L1/L2/L3/移动端/schemaVersion 收口，2026-10-15）
- [x] 发布契约门禁：publishConfig 路径 ⊆ npm pack 清单且落在 dist/（scripts/check-publish.mjs，CI build 后跑，6 包全过，2026-10-15）
- [x] 入口装载门禁抓出并修复三处消费者加载缺陷：react/vue 无扩展名相对导入、venues-demo JSON 缺 import attribute（dist-resolver 钩子按发布世界解析，2026-10-15）
- [x] 发布文件补齐：7 包 LICENSE + Flutter README/CHANGELOG + description 收进 60–180 + 版本 lockstep，pub dry-run 0 错误 0 警告（manifests 门禁 10 条，venues-demo 32，2026-10-15）
- [x] npm 6 包 README.md（registry 包页正文），tarball 必含 LICENSE+README 由 check-publish.mjs 断言（venues-demo 32，2026-10-15）
- [x] 非可发布成员（根 / apps/demo / docs）private 门禁泛化 + README 测试口径补记 publish:check（venues-demo 32，2026-10-15）
- [x] GitHub Pages 文档站落地：vitepress `base: "/venue-seats/"`（否则 `/assets/...` 绝对路径上线 404）+ `.github/workflows/pages.yml` 部署 workflow + `check-pages.mjs` 读构建产物断言内部 URL 带 base（venues-demo 20，2026-10-15）

## 已定

- [x] 包发布策略已定 A/A/A（2026-10-15，3c6bef2）：npmjs scope（6 包 `publishConfig.access: "public"`）+ pub.dev（删 `publish_to: none`、补 `homepage`）+ 手动 `workflow_dispatch` 发布通路（`publish.yml`：`check-version.mjs` + 全量门禁串联、门禁红不发、`dry_run` 默认开、不打 tag 不建 Release）；方案与剩余人工步骤见 docs/发布策略.md（manifests 门禁 4 条新增，venues-demo 39）
- [x] 真实场馆样本 4 个落库 `examples/venues/`（provenance: public）：国家大剧院·歌剧院（扇形 + 三层楼座）/ 杭州大莲花（椭圆三层看台）/ 上海世博文化中心（碗形两层看台 + 可变内场）/ 香港红馆（矩形四面异形）；结构容量按公开口径、座位为自建重制，来源与许可判定见 `examples/README.md`，`scripts/gen-examples.mjs` 可复现，demo 可选渲染（2D + 3D 均验证出画布），docs/data-format.md 补样本对照节（venues-demo 48）

- [x] docs/ 根目录 6 篇全部双语配对（2026-10-16）：`api` / `data-format` / `index` / `quickstart` 补 `.zh.md`；`发布策略.md` / `审计-文档一致性.md` 补英文对应件 `release-strategy.md` / `audit-doc-consistency.md`；6 对页面首屏均带语言切换器（index 两页因 VitePress frontmatter 必须置顶，切换器置于 frontmatter 之后首行）；英文页清掉残留中文括注，仅留切换器与规则要求写进 UI 文案的 `示意/重建`；重名对应件 `publishing-strategy.md` / `docs-consistency-audit.md` 已删；审计页注明行号取自 2026-10-13–15、加切换器后可能相差两行；docs 子目录经复核无 md 文档需配对

## 待办

- [x] 文档站导航挂双语入口（2026-10-16）：nav/sidebar 均列英文与中文入口，覆盖首页、快速开始、数据格式、API、发布策略、一致性审计；Pages 门禁扩展到 12 个双语页面并校验全局导航可达（docs build 通过，check-pages 1 条通过）
- [x] docs 子目录新增文档时同步配对双语（2026-10-16 复核：docs 子目录内当前无 md 文档——`.vitepress`/`screenshots` 非文档、`node_modules` 排除；当前无新增文档，无需改动）
