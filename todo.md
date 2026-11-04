# todo — venue-seats

## P1 地基

- [x] 数据模型 + JSON Schema（venue/level/section/row/seat、stage 朝向与 w/h、票价分区）（469ddd6, 13 tests）
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
- [x] core/renderer/renderer-3d 语句行与分支覆盖补测至 100%（77af742, 分支 100%）
- [x] Flutter ViewFit 判等与 VenueBounds.empty 测试，analyze 零警告（40d83b0, Flutter 55）
- [x] 校验器拒绝未知 schemaVersion（A1 落地，core + Flutter 双端，SUPPORTED_SCHEMA_VERSION）（0f9a660, core 36 / Flutter 56）
- [x] JSON Schema 与 validate() 版本集合一致性门禁，schemaVersion 收口 enum ["1"]（b6105ac, venues-demo 14）
- [x] 发布前置元数据补齐：repository 字段（npm 6 包 + pubspec）与 demo private 门禁测试（808ad73, venues-demo 22）
- [x] CHANGELOG.md 骨架（Unreleased 按 L1/L2/L3/移动端/schemaVersion 收口，2026-10-15）
- [x] 发布契约门禁：publishConfig 路径 ⊆ npm pack 清单且落在 dist/（scripts/check-publish.mjs，CI build 后跑，6 包全过，2026-10-15）
- [x] 入口装载门禁抓出并修复三处消费者加载缺陷：react/vue 无扩展名相对导入、venues-demo JSON 缺 import attribute（dist-resolver 钩子按发布世界解析，2026-10-15）
- [x] 发布文件补齐：7 包 LICENSE + Flutter README/CHANGELOG + description 收进 60–180 + 版本 lockstep，pub dry-run 0 错误 0 警告（manifests 门禁 10 条，venues-demo 32，2026-10-15）
- [x] npm 6 包 README.md（registry 包页正文），tarball 必含 LICENSE+README 由 check-publish.mjs 断言（venues-demo 32，2026-10-15）
- [x] 非可发布成员（根 / apps/demo / docs）private 门禁泛化 + README 测试口径补记 publish:check（venues-demo 32，2026-10-15）
- [x] GitHub Pages 文档站落地：vitepress base "/venue-seats/" + pages.yml 部署 workflow + check-pages.mjs 读构建产物断言内部 URL 带 base（venues-demo 20，2026-10-15）

## 已定

- [x] 包发布策略已定 A/A/A：npmjs scope（6 包 publishConfig.access "public"）+ pub.dev（删 publish_to、补 homepage）+ 手动 workflow_dispatch 发布通路（publish.yml，dry_run 默认开、不打 tag 不建 Release）（3c6bef2, 2026-10-15）
- [x] 真实场馆样本 4 个落库 examples/venues/（provenance: public，gen-examples.mjs 可复现，demo 可选渲染）（venues-demo 48）
- [x] docs/ 根目录 6 篇全部双语配对（api/data-format/index/quickstart 补 zh，发布策略/审计 补 EN 对应件）（2026-10-16）

## 待办

- [x] 文档站导航挂双语入口（nav/sidebar 均列英文与中文入口，check-pages 门禁扩展到 12 个双语页面）（2026-10-16）
- [x] docs 子目录新增文档时同步配对双语（2026-10-16 复核：docs 子目录内无 md 文档，无需改动）
- [x] 自建数据集落地：Wikidata SPARQL（CC0 1.0）采得 2,113 场馆（stadium 1,865 / arena 40 / theatre 208）；schema 落 docs/design/dataset-schema.md、采集 collect-dataset.mjs、校验 validate-dataset.mjs、数据 data/venues.json + data/README.md、测试 dataset.test.ts（2026-10-18）
- [x] 文档时效性清理：api/dataset-schema/audit/README 对齐代码 + docs build 恢复绿 + 命令逐条实跑（validate-dataset / collect-dataset --merge / pnpm -r build / publish:check / check-pages / walkthrough:mobile / docs build）（2026-10-19，三项整改 ff8407b/eec9a7d/f093c70 之后）

## 代码深审 2026-11-01（docs/review/2026-11-01-code-review.md）

- [x] 钉版 pnpm 并迁移 overrides（根 package.json 补 packageManager: pnpm@9.15.0 匹配 lockfile 9.0；overrides 双声明于 package.json 与 pnpm-workspace.yaml，preinstall 拒绝 npm，CI 改由 packageManager 解析 pnpm；7375e9f, TS 8/8、JS 298 用例、publish:check 6 包、docs build、check-pages、dataset、flutter analyze 0 警告 + 60 测试全绿）
- [x] 3D 构造失败回退 2D 时移除已插入的孤儿 canvas 并补宿主清空断言（renderer-3d/src/controller.ts:98,101,449；F2）（属实并修复：构造器 try/catch 中 canvas.remove() 并释放已建 renderer，回退测试补 host.querySelector("canvas.vs3d-canvas") 为 null 断言；renderer-3d 89 / 全仓 TS typecheck + 298 tests 绿）
- [x] validate-dataset 去重键守卫补 lng 类型检查防校验器崩溃（scripts/validate-dataset.mjs:123-126；F3）（属实并修复：place 去重键构建补 `typeof venue.lng === "number"` 守卫，脚本支持可选路径参数；测试用注入非数字 lng 的临时 JSON 断言校验器不崩溃且报 lng violation，venues-demo 58 tests / 全仓 typecheck + 299 tests 绿）
- [x] Flutter _hex 容错非十六进制色值或两处 validate 校验色值格式（painter.dart:9-15；F4）（属实并修复：core validate 与 Flutter validate 均拒绝非 `#rgb`/`#rrggbb` 色值（PriceTier.hasValidColor），painter _hex 捕获 FormatException 回退中性灰不崩溃；core 41 / Flutter 61 tests 绿，flutter analyze 0 警告）
- [x] 3D setLevel 未知层级改为与 2D 一致的静默 no-op（controller.ts:150 vs renderer/controller.ts:157；F5）（属实并修复：setLevel 改为 `if (!level || level.id === this.levelId) return`，与 2D 行为一致；测试改为断言未知层级不抛错且 selection/doc 不变，renderer-3d 89 tests / typecheck 绿）
- [x] 3D setDoc keepSelection 后按 2D normalizeSel 归一化选区（controller.ts:140-147；F6）（属实并修复：3D 补同 2D 的 normalizeSel：当前层存在 section 但不存在 row 时降级为 `{ sectionId }`，setDoc keepSelection 与 setSelection 均应用；新增 kept selection / ghost row 两组测试，renderer-3d 91 tests + typecheck 绿）
- [x] Flutter validate 补 seat.status 合法值检查对齐 core（model.dart:216 vs core/index.ts:155；F7）（属实并修复：Seat 增 rawStatus 记录 JSON 原始串，validate 对非 four-state 值报 `invalid status`，与 core 对齐；新增非法/合法状态测试，Flutter 62 tests 绿 + analyze 0 警告）
- [x] demo 构建拆 chunk：manualChunks 或按场馆懒加载，消除 5.19MB 单 chunk（F8）（属实并修复：场馆 JSON 改按需 `import()` 懒加载（apps/demo/src/venues.ts 注册表），vite manualChunks 拆 react/three vendor；主 chunk 5.19MB→43.78KB，其余为每场馆独立 chunk（232–935KB 数据，非入口路径）；typecheck + 全仓 302 tests + build 绿）
- [x] fitViewBox 对零尺寸 bounds 加下限保护防退化 viewBox（renderer/src/geometry.ts:28-43；F9）（属实并修复：bw/bh 对零宽高取 `Math.max(..., 1e-6)` 下限，防 scale=Infinity 退化；补零尺寸三点 bounds 测试断言 viewBox 有限且正，renderer 85 tests + typecheck 绿）

## 审核发现

- [x] 审核发现：publish.yml 与 pages.yml 的 pnpm/action-setup 仍用浮动 `version: 9`，绕过根 packageManager 的 9.15.0 钉版，发布和文档构建入口仍会工具链漂移（.github/workflows/publish.yml:41,72；.github/workflows/pages.yml:30）（属实并修复：移除 publish.yml 两处与 pages.yml 一处 `version: 9`，与 ci.yml 一致交由 packageManager 解析；manifests 29 tests 绿）
- [x] 审核发现：新增钉版门禁只读取 ci.yml 且仅匹配 `version: 9`，未覆盖 publish.yml/pages.yml，也无法拦住 `version: 10` 或 `latest` 等显式覆盖（packages/venues-demo/test/manifests.test.ts:170,213）（属实并修复：门禁遍历 ci.yml/publish.yml/pages.yml 三件并拒绝 pnpm/action-setup 下任何显式 `version:`，manifests 29 tests 绿）

## 审核发现 2026-11-02（22902cf5..HEAD）

- [x] 审核发现：demo 懒加载场馆 JSON 的 `load()` 无 `.catch()`，chunk 加载失败（网络异常/404）时 Promise 未处理拒绝，界面永远停在「正在加载示例场馆…」，无错误提示与重试（apps/demo/src/App.tsx:29）（属实并修复：load() 补 `.catch` 置 loadError；首载失败时错误页 + 重试按钮（retryTick 重跑 effect），已载场馆后切换失败时 `.body` 顶部横幅提示重试；typecheck 8/8、全仓 303 tests、demo build 绿）
- [x] 审核发现：App.tsx 对 `level` 空值处理不一致——`stats` memo 用 `if (!level)` 兜底，而 JSX 用 `level!.sections.length` 非空断言，空 `levels` 文档会崩溃（apps/demo/src/App.tsx:82,172）（属实并修复：JSX 分区计数改 `level ? level.sections.length : 0`，与 stats memo 的 `{total:0}` 兜底一致；叠加 item 1 的 `.catch` 后空 levels 文档的 `levels[0].id` 抛错也被捕获为错误页而非未处理拒绝；typecheck 8/8、全仓 303 tests、demo build 绿）
- [x] 审核发现：3D `setDoc` 保留旧 `this.levelId` 且不重置，新文档缺该层时 `rebuild()→buildScene3D` 抛 `unknown level`，而本 diff 新增的 `normalizeSel(currentLevel())` 却按 `doc.levels[0]` 兜底，与 2D `setDoc` 直接重置 `levels[0]` 的契约不一致（packages/renderer-3d/src/controller.ts:149,154-155；packages/renderer/src/controller.ts:148）（属实并修复：setDoc 先 `this.levelId = doc.levels[0].id` 再 rebuild/normalizeSel，与 2D 契约一致，杜绝缺层抛 `unknown level`；新增「setDoc 重置到首层且不抛」测试；typecheck 7 工程、全仓 304 tests（renderer-3d 92）绿）
- [x] 审核发现：README 徽章行改动产生 `<p align="center">` 嵌套另一个 `<p align="center">` 并多出孤立 `</p>`，违反 HTML（`p` 不能含块级 `p`），浏览器会提前闭合外层 `p` 并产生多余空段落（README.md:3-5；README.zh.md:3-5）（属实并修复：去掉 60b762e 遗留的外层 `<p align="center">` 与孤立 `</p>`，并删除同 commit 掏空后的空 `<p align="center">\n</p>` 块；两文件均恢复为 2 开 2 闭、0 嵌套，徽章单行居中；全仓 304 tests 绿）
- [x] 审核发现：dataset.test.ts 用 `mkdtempSync` 建临时目录写入坏数据后从不 `rmSync` 清理，每次跑测试残留一个临时目录（packages/venues-demo/test/dataset.test.ts:51-54） （属实并修复：临时目录用 try/finally + `rmSync(..., { recursive: true, force: true })` 清理；目标包 58 tests 绿；证据：packages/venues-demo/test/dataset.test.ts:51,67），commit 3588448
- [x] 审核发现：manifests.test.ts 门禁正则 `pnpm\/action-setup@v6\.1\.0[\s\S]*?\n\s+version:` 未限定在 action-setup 的 `with:` 块内，扫描整份 workflow，日后任何后续步骤新增名为 `version` 的输入都会误报失败（packages/venues-demo/test/manifests.test.ts:216）（属实并修复：新增 pnpmSetupBlocks 只收集 action-setup 自身 step 块（uses 行 + 更深缩进行），门禁只在这些块内查 `^ {8,}version:`，并补「后续步骤 version 不误报」与「step 内 version 仍拒绝」两条回归；venues-demo 60 tests 绿；证据：packages/venues-demo/test/manifests.test.ts:171-180,232-256），commit 4605e03

## 审核发现 2026-11-03（22902cf5..HEAD·逐文件复审，覆盖全部 22 文件）

- [x] 审核发现：3D 构造失败 catch 未 `disconnect()` 已创建的 resizeObserver——若 `new ResizeObserver`/`observe(host)` 之后的代码（如 `setAnimationLoop`）抛错，孤儿 observer 仍观察 host，宿主后续 resize 会回调已 `renderer.dispose()` 的 `resize()` 并在 ResizeObserver 回调中抛未捕获异常；且构造已抛错无实例，`destroy()` 永不执行，泄漏无法回收（packages/renderer-3d/src/controller.ts:117,131-135）（属实并修复：catch 增加 `observerCreated` 标志，observer 已建即 `disconnect()` 再 dispose renderer + 移除 canvas；新增「setAnimationLoop 抛错后 observer 已 disconnect」测试；renderer-3d 95 tests 绿；证据：packages/renderer-3d/src/controller.ts:102,134-137；packages/renderer-3d/test/controller3d.test.ts:309-325），commit bf94ffb
- [x] 审核发现：3D 构造 catch 的 `rendererCreated===true` 分支（渲染器已建、后续步骤如 `buildScene3D` 因未知 levelId 抛错时 dispose+移除 canvas）无测试覆盖——现有回退测试仅覆盖 WebGL 不可用（rendererCreated=false）路径，中途失败路径缺断言（packages/renderer-3d/src/controller.ts:100-135；packages/renderer-3d/test/renderer3d.test.ts:530-536）（属实并修复：新增「未知 levelId 使 buildScene3D 抛错后 renderer 已 dispose、canvas 已移除」测试，覆盖 rendererCreated=true 中途失败路径；renderer-3d 95 tests 绿；证据：packages/renderer-3d/test/controller3d.test.ts:295-308），commit bf94ffb
- [x] 审核发现：3D `setDoc` 对空 `levels` 文档无守卫，`doc.levels[0].id` 直接抛不透明 TypeError；测试仅覆盖单层文档（`levels:[doc.levels[0]]`），未覆盖空 levels（packages/renderer-3d/src/controller.ts:152；packages/renderer-3d/test/renderer3d.test.ts:593）（属实并修复：setDoc 前置 `if (doc.levels.length === 0) throw new Error("document has no levels")`，抛出清晰错误且失败时不改动当前文档；新增空 levels 测试；renderer-3d 95 tests 绿；证据：packages/renderer-3d/src/controller.ts:151-152；packages/renderer-3d/test/controller3d.test.ts:398-405），commit bf94ffb
- [x] 审核发现：apps/demo/src/venues.ts 注册表手工复制 `id/name/city/provenance`，与各 JSON 的 `venue.id/name/city` 形成双源；下拉框/徽章读注册表、卡片读加载后的 `venue.*`，JSON 被编辑时两者静默分叉，无一致性测试守卫（当前核对 9 个场馆元数据一致，属漂移风险非现存 bug）（apps/demo/src/venues.ts:21-29）（属实并修复：新增 venues-demo 守卫测试，遍历注册表逐个 `load()` 后比对 `id/name/city/provenance`，并断言覆盖全部 DEMO_VENUES；venues-demo 62 tests 绿；证据：packages/venues-demo/test/selector-registry.test.ts:1-31），commit 69918bc
- [x] 审核发现：vite.config.ts `manualChunks` 用正斜杠 `id.includes("node_modules/react")`/`("node_modules/three")` 判断，Windows 下 rollup 模块 id 为反斜杠路径，vendor 拆分失效、仅影响 demo 构建 chunk 大小（apps/demo/vite.config.ts:10-13）（属实并修复：manualChunks 先 `id.replaceAll("\\", "/")` 归一化再按 `/node_modules/<pkg>/` 匹配，Windows 下同样生效；demo typecheck 绿、vite build 绿（react/three 独立 vendor chunk）；证据：apps/demo/vite.config.ts:12-28），commit 69918bc
- [x] 审核发现：App.tsx 切换场馆时 `switchVenue` 只改 `venueIdx`，异步 `load()` 期间下拉框已指向新索引而卡片/地图仍渲染旧场馆；大场馆（935 kB chunk）加载慢时明显不一致，加载失败时更难识别失败对象（apps/demo/src/App.tsx:112-114,156-167）（属实并修复：新增 `loadedIdx` 状态，加载成功才记录；`venueIdx !== loadedIdx` 期间渲染加载/错误页（含可切回的下拉框），杜绝旧场馆与新选中项并存，失败时也能从加载页识别对象；demo typecheck 绿、vite build 绿；证据：apps/demo/src/App.tsx:18,42,128-159），commit 9a30f0d
- [x] 审核发现：本轮 diff 未见注入/反序列化/越界/任意路径读写等安全问题——色值经 `^#(?:[0-9a-f]{3}|[0-9a-f]{6})$` 校验且经 React style/文本转义渲染，无 innerHTML/eval/危险属性；`process.argv[2]` 仅为本地校验脚本可选路径。已确认 22902cf5..HEAD 全部 22 文件均已审（属实并核实：`packages/core/src/index.ts:123-125` 色值正则守卫、`packages/renderer/src/controller.ts:483-489` tooltip 用 DOM API 而非 HTML、`scripts/validate-dataset.mjs:13` argv 仅读文件路径，确认无安全问题），commit cb9378b

- [x] 审核发现：空 `levels` 守卫只加在 3D `setDoc`（前置 `if (doc.levels.length === 0) throw new Error("document has no levels")`，抛错前不改动当前文档），但同契约的 2D `SeatMapController.setDoc` 无等价守卫——先 `this.doc = doc; this.level = doc.levels[0]`（空 levels 得 `undefined`），随后 `renderLevel()` 在 `this.level.sections` 抛不透明 `TypeError`，且 `doc`/`level` 已被改写，2D 控制器进入半换（doc=空文档、level=undefined）的污染状态；`createVenueView` 按设备能力返回 View2D 或 View3D，同一 `VenueView.setDoc` 对空 levels 输入因此按设备分叉（3D 清晰报错且原状保留，2D 先污染再抛错），diff 只补了 3D 守卫与测试、未补 2D 等价守卫/回归测试（packages/renderer-3d/src/controller.ts:152；packages/renderer/src/controller.ts:146-155,308）（属实并修复：2D `setDoc` 前移 `if (doc.levels.length === 0) throw` 守卫，与 3D 契约一致，失败换档不再污染 `doc`/`level`；新增「空 levels 清晰报错且原状保留」回归测试；renderer 86 tests 绿、typecheck 绿；证据：packages/renderer/src/controller.ts:147-149；packages/renderer/test/branches.test.ts:315-323），commit e65ea14

- [x] 审核发现：App.tsx `.then` 内 `setVenue(doc)`、`setLoadedIdx(venueIdx)` 先于 `setLevelId(doc.levels[0].id)` 执行——空 levels 文档令 `setLevelId` 在 `loadedIdx` 已置位后抛错，`.catch` 设 loadError，但 `loadedIdx === venueIdx` 已成立，新增门禁 `loadedIdx !== venueIdx` 放行，渲染出空场馆（0 层、`level` 为 `undefined`、`venue.levels.map` 为空）的内容页 + 「加载失败」横幅，而非加载/错误页；与 diff 前 `if (!venue)` 门禁行为一致（同为空内容页），非本次回归，但新门禁与既有 `.then` 写入顺序相互作用，建议将 `setLevelId` 前移或在 `setVenue`/`setLoadedIdx` 前校验 `doc.levels.length`（apps/demo/src/App.tsx:36-42）（属实并修复：`.then` 开头在发布前校验 `doc.levels.length === 0` 即抛错，catch 置 loadError，`loadedIdx` 保持旧值使门禁放行错误页而非空内容页；demo typecheck 绿、vite build 绿；证据：apps/demo/src/App.tsx:39-41），commit 78674d7

## 审核发现（62d7c32f..HEAD，只审不改，2026-11-03）

- [x] 审核发现：4605e03 在 todo.md 勾选 manifests 条目时丢失行首列表标记，第 99 行以 `[x]` 开头而非 `- [x]`，不再是合法 Markdown 任务列表项（todo.md:99）（属实并修复：第 99 行补回 `- ` 行首标记，恢复为合法 Markdown 任务列表项；验证：`sed -n 99p` 确认以 `- [x]` 开头；证据：todo.md:99），commit 2de8981
- [x] 审核发现：9a30f0d 在 3D 模式下切换场馆失败时旧 3D 视图不销毁——加载/错误页卸载 hostRef 容器，但 3D 视图 effect 依赖 `[mode3d, venue, levelId]` 未变，cleanup 不执行，旧 SeatMap3DController 的 setAnimationLoop 继续对已脱离 DOM 的 canvas 渲染，泄漏持续到下一次成功加载或切回 2D（apps/demo/src/App.tsx:53-70,128）（属实并修复：3D 视图 effect 增加 `loadedIdx !== venueIdx` 前置门禁并把 `venueIdx` 纳入依赖数组——切换/失败时依赖变化即 cleanup 销毁旧 VenueView（view.destroy 停 setAnimationLoop），成功加载前不再创建新视图；demo typecheck 绿、vite build 绿；证据：apps/demo/src/App.tsx:54-56,71），commit 4474ad1
- [x] 审核发现：9a30f0d 新增的 loadedIdx 切换门禁（含加载失败识别、cancelled 竞态、可切回下拉）无自动化测试——demo 应用无测试脚手架，仅靠 typecheck + build 验证，失败路径与竞态行为未覆盖（apps/demo/src/App.tsx:18）（属实并修复：为 demo 搭建 vitest+jsdom 测试脚手架（新增 `test` script 与 vitest/jsdom/@types/jsdom devDependencies），新增 App.test.tsx 覆盖 loadedIdx 门禁 4 条——首载显示加载页、加载失败显示错误页+重试、切换期间不渲染旧场馆、慢响应竞态不覆盖新选择；demo 4 tests 绿、typecheck 绿、build 绿；证据：apps/demo/test/App.test.tsx:1-166；apps/demo/package.json:6-22），commit ce160c2

## 审核发现（9a817384..0af6e954，只审不改，2026-11-04）

- [x] 审核发现：ce160c2 新增的 test/App.test.tsx 不在 typecheck 覆盖内——apps/demo/tsconfig.json include 仅 `["src"]`，`tsc --noEmit` 不检查 test 目录；且实测将该文件纳入 tsc 报 3 处错误（TS2305：`__mk` 仅存在于 vi.mock 工厂、真实 `../src/venues` 未导出；TS18047：`root` 可空闭包两处），"demo typecheck 绿" 未真正验证新测试（apps/demo/tsconfig.json:13；apps/demo/test/App.test.tsx:53,68,75）（属实并修复：`tsconfig.json` 把 `test` 目录纳入 `include`，测试文件改用 `vi.hoisted` 消除 `__mk` 导出缺失、以 `const r = root` 消除可空闭包两处，`tsc --noEmit` 现覆盖 test；demo typecheck 绿、demo 4 tests 绿；证据：apps/demo/tsconfig.json:13；apps/demo/test/App.test.tsx:10-11,71-80）
- [x] 审核发现：App.test.tsx 断言 `toContain("示例场馆")`（lines 92,110）由 `<select>` 选项文本"示例场馆"满足，而非加载后的场馆卡片——mock `__mk(i,"场馆i")` 把加载文档命名为"场馆0"/"场馆1"，与 VENUES 下拉标签（示例场馆/第二场馆）不一致，断言通过但未证明正确文档已渲染，属弱断言（apps/demo/test/App.test.tsx:35-38,82,92,110）（属实并修复：断言改为断言加载后的场馆卡片 `container.querySelector(".card h2")` 内容为 `场馆0`，不再由 `<select>` 选项文本满足；demo 4 tests 绿；证据：apps/demo/test/App.test.tsx:99,117）
- [x] 审核发现：branches.test.ts 空 levels 测试 `expect(c.getSelection()).toBeNull()`（line 326）是空断言——控制器以 `{ doc }` 构造、sel 本就为 null，未先 setSelection，故未证明失败换档保留既有选择（"不得污染选择"主张未覆盖）；`getDoc()).toBe(doc)` 为唯一非空验证（packages/renderer/test/branches.test.ts:319-328）（属实并修复：`setDoc` 前先 `setSelection({sectionId:"s1",rowId:"r1"})`，失败换档后断言 `getSelection()` 保留既有选择而非空断言；renderer branches 34 tests 绿；证据：packages/renderer/test/branches.test.ts:322,326-327）
- [x] 审核发现：e65ea14 的空 levels 守卫只加在 setDoc，未覆盖构造函数——constructor 仍 `this.level = levelById(...) ?? this.doc.levels[0]`（levels:[] 得 undefined）后 renderLevel() 迭代 `this.level.sections` 抛不透明 TypeError；3D 构造（renderer-3d/src/controller.ts:108 buildScene3D）同缺口，非新回归，但守卫"前置拒绝"意图未在构造路径落实（packages/renderer/src/controller.ts:100-114,149,311）（属实并修复：2D `SeatMapController` 与 3D `SeatMap3DController` 构造函数入口均前置拒绝空 levels 文档（`levels.length === 0` 抛错），并新增构造路径测试；renderer 34 / renderer-3d 47 tests 绿；证据：packages/renderer/src/controller.ts:100；packages/renderer-3d/src/controller.ts:81；packages/renderer/test/branches.test.ts:330-334；packages/renderer-3d/test/controller3d.test.ts:429-435）
- [x] 审核发现：`vi.mock("../src/venues", ...)` 工厂引用模块级 `const deferred`（line 7）——vitest 将 `vi.mock` 提升到该 const 声明之前，当前仅因 `deferred` 在 `load` 惰性闭包内引用才未触发 TDZ ReferenceError，属脆弱写法，后续若在工厂顶层直接引用将运行时报错；建议改用 `vi.hoisted`（apps/demo/test/App.test.tsx:7,9,40-41）（属实并修复：`deferred` 与 `mk` 改由 `vi.hoisted` 提升，工厂不再引用模块级 TDZ const，消除脆弱写法；demo 4 tests 绿；证据：apps/demo/test/App.test.tsx:10-11,41）
- [x] 审核发现：`@types/jsdom@^21.1.7` 与 `jsdom@^25.0.1` 版本错配（@types/jsdom 21 对应 jsdom 21；jsdom 25 无内建 types 字段），且测试从未直接 import `jsdom`（仅经 vitest jsdom 环境），该依赖实际未使用（apps/demo/package.json:28-29）（属实并修复：从 `apps/demo/package.json` 移除未使用且与 jsdom@25 错配的 `@types/jsdom@^21.1.7`，`pnpm-lock.yaml` 同步移除该 importer 条目，`pnpm install --frozen-lockfile` 通过；证据：apps/demo/package.json devDependencies 无 @types/jsdom；pnpm-lock.yaml demo importer 无 @types/jsdom）
- [x] 审核发现：bca745b 为 2D/3D 控制器新增空 levels 构造守卫并补测试，但 demo App 自身的空 levels 拒绝路径仍无测试——App.tsx:41 的 `if (doc.levels.length === 0) throw` 是内容页挂载前的唯一防线，App.test.tsx 的 `resolveLoad(i, doc?)` 允许注入自定义文档却无任何用例以 `{levels: []}` 触发，导致"示例场馆加载失败：document has no levels"错误页路径未覆盖（apps/demo/src/App.tsx:41；apps/demo/test/App.test.tsx:84,93-146）（属实并修复：新增用例 `shows the error page when a loaded document has no levels`，以 `resolveLoad(0, {...mk(0), levels: []})` 注入空 levels 文档，断言错误页含 "document has no levels" 与重试；demo 5 tests 绿、typecheck 绿；证据：apps/demo/test/App.test.tsx:120-125；commit 3b7eaab）
- [x] 审核发现：App.test.tsx 的 `resolveLoad(i)` 以 `deferred[i]` 按"load() 调用顺序"索引解析，把场馆 i 与 deferred 插入序耦合——当前仅因测试内 load 严格按 v0→v1 各触发一次且 `deferred.length = 0` 每用例重置才正确；若未来用例触发"重试"（retryTick）或乱序切换产生额外 pending entry，`resolveLoad(1)` 将静默解析错误场馆的 promise 或抛 "no pending load for index 1"，属脆弱索引（apps/demo/test/App.test.tsx:84-91,97-146）（属实并修复：`deferred` 改为按场馆索引的 `Map<number, {resolve,reject}[]>`，`load()` 将 pending entry 追加到对应 venue 的队列，`resolveLoad/rejectLoad` 经 `takePending(i)` 从该 venue 队列取首个，解耦场馆索引与加载插入顺序，重试/乱序不再错位；demo 5 tests 绿、typecheck 绿；证据：apps/demo/test/App.test.tsx:13-28,42-47,90-108；commit 3b7eaab）

- [x] 审核发现：本轮 diff 未见问题（bca745b9..HEAD）（属实：独立审阅 bca745b9..HEAD 完整 diff 仅改动 apps/demo/test/App.test.tsx（deferred 改按场馆索引 Map 队列解耦加载顺序、新增空 levels 错误页用例、弱断言改 .card h2 内容断言）与 todo.md 勾选，逻辑自洽无引入问题；证据：pnpm -r test 全仓 319 tests 绿（core 41/venues-demo 62/renderer 87/vue 15/renderer-3d 96/react 13/demo 5）、pnpm -r typecheck 8/8 绿）。

- [x] 审核发现：本轮 diff 未见问题（e837ce4b..HEAD）（属实：独立审阅 e837ce4b..HEAD 完整 diff 仅含 commit 081a10e 对 todo.md 的勾选改动，代码零改动、逻辑自洽无引入问题；证据：pnpm -r test -- --testTimeout=60000 全仓 319 tests 绿（core 41/venues-demo 62/renderer 87/vue 15/renderer-3d 96/react 13/demo 5）、pnpm -r typecheck 8/8 绿）。
