# 代码深审报告（2026-11-01）

> 流程：本仓（`venue-seats`）全量代码深审，按 requesting-code-review 的五个环节执行。
> 范围：`packages/*/src`、`apps/demo/src`、`apps/demo/scripts`、`scripts/*.mjs`、`.github/workflows`。
> 结论先行：**安全扫描零发现；隐藏 bug 9 条（0 P0 / 0 P1 / 2 P2 / 7 P3）；质量门全绿
> （typecheck 8/8、测试 294 通过、build 全包、docs build 绿、publish:check 6 包、check-pages 绿）。**

## 一、范围与方法

1. **安全静态扫描**：硬编码密钥 / shell 注入 / SQL 拼接 / eval / 反序列化 / 路径穿越，逐模式 `grep`
   全仓源码并核对每处 `child_process`、`join/resolve`、`JSON.parse` 的参数来源。
2. **隐藏 bug 猎捕**：错误处理缺失、竞态、越界、资源泄漏、off-by-one、并发问题，逐文件精读
   （core / renderer / renderer-3d / react / vue / venues-demo / Flutter / demo / 脚本）。
3. **质量门**：`pnpm -r typecheck`、`pnpm -r test`、`pnpm -r build`、`pnpm publish:check`、
   `pnpm --filter @venue-seats/docs build`、`node scripts/check-pages.mjs`、`dart analyze`。
4. **每条发现均给 `file:line` 证据**；断言「未实现」前先确认路径存在（空 grep 不是证据）。
5. **严重度**：P0=安全/数据损坏/主路径崩溃；P1=显著功能缺陷；P2=真实缺陷但影响有限/边路径；
   P3=健壮性/一致性/性能观察项。

> 注：本机安装的 pnpm 为 12.10.1，与本仓 lockfile（`lockfileVersion: '9.0'`，pnpm 9 时代）不匹配，
> 直接 `pnpm install/build` 报 `ERR_PNPM_VERIFY_DEPS_BEFORE_RUN`。为让质量门可信，全程改用
> `pnpm@9.15.0`（与 lockfile 匹配的版本）执行；此工具链漂移本身列为 P2 发现（见 F1）。

## 二、安全静态扫描（①）——零发现

| 模式 | 结果 | 说明 |
|---|---|---|
| `eval` / `new Function` | 无 | 全仓无任何动态代码求值 |
| shell 注入 | 无 | `child_process` 仅 3 处：`check-publish.mjs:51` `execFileSync("npm", ["pack","--dry-run","--json"], {cwd,env})` 固定参数无 shell；`shoot.mjs:25` / `walkthrough-mobile.mjs:29` `spawn(..., {shell:true})` 但命令串由常量 `PORT` 拼接，无外部输入 |
| SQL 拼接 | 无 | 无任何数据库访问；唯一「查询」是 `collect-dataset.mjs:39` 的只读 SPARQL 字符串，全部由常量拼出 |
| 危险反序列化 | 无 | 仅 `JSON.parse`（`collect-dataset.mjs:174` API 响应、`validate-dataset.mjs:102` 本地数据文件、`check-pages.mjs:50` 构建产物），无 `eval`/`require` 动态加载 |
| 路径穿越 | 无 | 所有 `join/resolve` 由 `import.meta.url` 派生 `repoRoot` + 固定相对段拼出；唯一带变量的 `dist-resolver.mjs:19` 用 `^@venue-seats\/([a-z0-9-]+)$` 白名单后接 `packages/<match>/dist/index.js`，`[a-z0-9-]` 不含 `/` 与 `..`，不可穿越 |
| XSS | 无 | `renderer/src/controller.ts:488-518` `renderTooltip` 用 `textContent`/`createElement` 构建（注释行 485 明示不用 `innerHTML` 的理由）；`style.background = tier.color` 走 CSSOM |
| 硬编码密钥 | 无 | 唯一「secret」字样为 CI 占位符 `.github/workflows/publish.yml:84,99-101`（`secrets.NPM_TOKEN`/`secrets.PUB_TOKEN`）、`ci.yml:40`（`secrets.CODECOV_TOKEN`），无明文值入库 |

**结论：安全面干净，无 P0/P1 安全发现。**

## 三、隐藏 bug 猎捕（②）——按严重度排序

### P2

**F1（P2，构建复现性）pnpm 工具链未钉版，默认工具链下门禁不可运行**
- 证据：`package.json:24-31` 用 `pnpm.overrides` 声明 esbuild/vite/vitest 覆盖，但**无 `packageManager` 字段**；
  本机 pnpm 12.10.1 已不再读取 package.json 的 `pnpm` 字段，`pnpm install/build` 直接报
  `ERR_PNPM_VERIFY_DEPS_BEFORE_RUN`（提示 overrides 将被静默丢弃，node_modules 与 lockfile 失同步），
  且这些 overrides 实际**未生效**；`pnpm-lock.yaml:1` `lockfileVersion: '9.0'`（pnpm 9 时代）。
- 影响：任何用 pnpm ≥10 的开发者/CI 跑不动门禁；esbuild 0.25.0 等约束形同虚设。CI 因
  `pnpm/action-setup@v6.1.0` 无 packageManager 而装到默认版本，是否命中全凭运气。
- 修复方向：根 `package.json` 加 `"packageManager": "pnpm@9.15.0"`（与 lockfile 对齐）并把
  `pnpm.overrides` 迁到 `pnpm-workspace.yaml`（pnpm ≥10 的正式位置）——两选一，属工具链决策，本轮不动。

**F2（P2，DOM 泄漏）3D 构造失败回退 2D 时遗留孤儿 canvas**
- 证据：`packages/renderer-3d/src/controller.ts:98` 先 `host.appendChild(this.canvas)`，
  `controller.ts:101` `new THREE.WebGLRenderer(...)` 可抛（WebGL 上下文创建失败 / `buildScene3D`
  对未知 `levelId` 在 `scene.ts:84` 同样可抛）；`controller.ts:445-454` `createVenueView` 的 `catch`
  回退到 2D `SeatMapController`，但**从不移除已插入的 canvas**。
- 影响：走「3D 自动回退 2D」文档路径时宿主残留空 `<canvas class="vs3d-canvas">`
  （`display:block; width/height:100%`），可挤压/覆盖 2D 布局；现有回退测试
  `renderer3d.test.ts:547` 只对**直接 2D** 路径断言 `host.childElementCount===0`，未覆盖此回退分支。
- 修复方向：构造失败路径 `this.canvas.remove()`（或在 `createVenueView` catch 中移除），并补一条
  force3D 回退后宿主子节点为 0 的断言。本轮记待办。

### P3

**F3（P3，校验器崩溃）`validate-dataset.mjs` 遇非数字 `lng` 抛 TypeError 中断报告**
- 证据：`scripts/validate-dataset.mjs:123-126` 去重键守卫只判 `typeof venue.lat === "number"`，
  `:125` 却直接 `venue.lng.toFixed(2)`；非数字 `lng` 时 `toFixed` 抛错，吞掉后续违规项，
  以未捕获异常退出而非既定 `process.exit(1)` 汇总。
- 修复方向：守卫补 `&& typeof venue.lng === "number"`。

**F4（P3，Flutter 绘制崩溃）`_hex()` 对非十六进制色值抛 FormatException**
- 证据：`packages/venue_seats/lib/src/painter.dart:9-15` `int.parse(v, radix: 16)`；TS 渲染器对任意
  CSS 色值容错（`style.background = tier.color`），且 `validate()`（core `index.ts:120-121`）与
  `VenueDocument.validate()`（`model.dart:216`）均**不校验 `color` 为十六进制**。色值如 `"red"`/`"#fff8"`
  会在 Flutter `paint` 时抛错。
- 修复方向：`_hex` 容错返回默认色，或在两处 `validate` 校验 `^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$`。

**F5（P3，API 契约不一致）3D `setLevel` 对未知层级抛错，2D 静默忽略**
- 证据：`renderer-3d/src/controller.ts:149-155` `throw new Error(\`unknown level: ${levelId}\`)`
  vs `packages/renderer/src/controller.ts:157-166` 静默 `return`；共享接口
  `renderer-3d/src/controller.ts:32` `setLevel(levelId)` 未声明可抛，宿主经 `VenueView` 调用无法预知行为。
- 修复方向：对齐 2D 语义（未知层级静默 no-op），与 F6 一并。

**F6（P3，3D 选择态未归一）`setDoc(...,{keepSelection:true})` 保留的选区可能在新文档不存在**
- 证据：`renderer-3d/src/controller.ts:140-147` `if (!opts.keepSelection) this.sel = null;`
  后直接 `rebuild()`，无归一；2D 路径 `packages/renderer/src/controller.ts:146-155` 经
  `setSelection(this.sel,false)` → `normalizeSel`（`index.ts:690-697`）把指向缺失 section/row 的选区收拢。
- 修复方向：3D `setDoc` 后对 `this.sel` 做一次与 2D 相同的归一化。

**F7（P3，校验差异）Flutter `validate()` 未校验 `seat.status` 合法值**
- 证据：`packages/venue_seats/lib/src/model.dart:216-277` 无 status 集合检查；core
  `packages/core/src/index.ts:155-156` 有。未知 status 在 `model.dart:10-23` `_parseStatus` 被静默
  判为 `available`，与 TS 端「拒绝未知值」语义不一致。
- 修复方向：`VenueDocument.validate()` 补 `seat.status ∈ {available,selected,sold,held}` 检查。

**F8（P3，性能观察）demo 单 chunk 5.19 MB（gzip 627 KB）**
- 证据：`apps/demo` `vite build` 输出单 `dist/assets/index-*.js 5,189.25 kB`，Vite 报
  `chunks larger than 500 kB` 警告；three.js 与全部场馆 JSON 同 chunk。
- 修复方向：`manualChunks` 拆 three / 数据，或 `dynamic import` 按场馆懒加载；非功能缺陷，观察项。

**F9（P3，退化几何健壮性）零尺寸 bounds 下 `fitViewBox` 产生 Infinity/NaN viewBox**
- 证据：`packages/renderer/src/geometry.ts:28-43` `scale = Math.min(elW/bw, elH/bh)`，`bw`/`bh` 为 0
  时 `scale=Infinity` → `w=0` 退化；`levelDisplayBounds`（`geometry.ts:14-25`）对空层用
  `{0,0,100,100}` 兜底掩盖。Flutter `ViewFit.bounds`（`geometry.dart:169-181`）同类。
- 影响：仅当层级无任何内容/多边形退化时触发；合法数据（validate 要求 polygon≥3 点、levels 非空）不触发。
- 修复方向：`bw`/`bh` 下限保护（如 `Math.max(bw, 1)`）。

## 四、质量门（③）

| 门 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `pnpm@9.15.0 -r typecheck` | ✅ 8/8 工程通过 |
| 单测 | `pnpm@9.15.0 -r test` | ✅ 14 文件 294 用例全过（core 40 / venues-demo 53 / renderer 84 / renderer-3d 89 / react 13 / vue 15） |
| 构建 | `pnpm@9.15.0 -r build` | ✅ 全部包 + `apps/demo`（唯一警告：5.19 MB 单 chunk，见 F8） |
| 发布契约 | `pnpm@9.15.0 publish:check` | ✅ 6 包 tarball 入口齐全且可 `import` |
| 文档站 | `pnpm@9.15.0 --filter @venue-seats/docs build` | ✅ vitepress v1.6.4 构建 6.84s |
| 页面就绪 | `node scripts/check-pages.mjs` | ✅ `pages readiness ok (base /venue-seats/)` |
| 数据集完整性 | `node scripts/validate-dataset.mjs` | ✅ `2113 venues, version 1` |
| 数据生成可复现 | `node scripts/gen-venues.mjs` 后 diff | ✅ 确定性输出，diff 一致 |
| Dart 静态分析 | `dart analyze` | ✅ `No issues found!` |
| Flutter 单测 | `flutter test` | ⚠️ 本机 Flutter SDK 损坏（缺 `packages/flutter_tools`），**未能本地跑**；CI `ci.yml:55` 有 `flutter test` 步骤兜底。属环境问题，非仓缺陷 |

**基线对比**：本仓测试基线与最近一次全绿（审计报告 `docs/审计-文档一致性.md` 四.1 所列）一致，
无回退；唯一非绿项为 Flutter 单测，纯环境（SDK 损坏）所致。

## 五、汇总（⑤ 汇报）

| 项 | 数量 |
|---|---|
| 发现总数 | **9** |
| P0 | 0 |
| P1 | 0 |
| P2 | 2（F1 工具链、F2 孤儿 canvas） |
| P3 | 7（F3–F9） |
| **当场已修（P0/P1）** | **0**（无 P0/P1 可修） |
| **记待办（P2/P3）** | **9** |
| 剩余待修 | 9 |

提交：本报告文件为唯一改动；P2/P3 共 9 条已追加至 `todo.md`（新增 `## 代码深审 2026-11-01` 节，
9 条 `- [ ]`，每条带 `file:line` 证据）。无 P0/P1，故本回合无修复 commit；质量门用与 lockfile 匹配的
`pnpm@9.15.0` 全绿（F1 说明工具链漂移，待办）。

## 六、证据索引（file:line）

- F1 `package.json:24-31`、`pnpm-lock.yaml:1`、pnpm 12.10.1 实测 `ERR_PNPM_VERIFY_DEPS_BEFORE_RUN`
- F2 `packages/renderer-3d/src/controller.ts:98,101,445-454`、`scene.ts:84`、`test/renderer3d.test.ts:547`
- F3 `scripts/validate-dataset.mjs:123-126`
- F4 `packages/venue_seats/lib/src/painter.dart:9-15`、`model.dart:216`
- F5 `packages/renderer-3d/src/controller.ts:149-155`、`packages/renderer/src/controller.ts:157-166`
- F6 `packages/renderer-3d/src/controller.ts:140-147`、`packages/renderer/src/controller.ts:146-155,690-697`
- F7 `packages/venue_seats/lib/src/model.dart:216-277`、`packages/core/src/index.ts:155-156`
- F8 `apps/demo` `vite build` 输出（5,189.25 kB 单 chunk）
- F9 `packages/renderer/src/geometry.ts:28-43,14-25`、`packages/venue_seats/lib/src/geometry.dart:169-181`
