# API


各包的公开面，均与源码核对过。所有包目前都是 workspace 内部包（尚未发布）。

## @venue-seats/core — `packages/core/src/index.ts`

框架无关的数据模型、校验与几何助手。

**类型：** `VenueDocument`、`Venue`、`Stage`、`Level`、`Section`、`Row`、
`Seat`、`PriceTier`、`SeatStatus`（`"available" | "selected" | "sold" | "held"`）、
`RowSelection`（`{ sectionId, rowId? }`）、`Availability`、`Bounds`。

| 导出 | 签名 | 说明 |
|---|---|---|
| `SUPPORTED_SCHEMA_VERSION` | `"1"` | 本构建唯一识别的 schema 版本；`validate()` 拒绝其他任何值 |
| `validate` | `(doc: unknown) => string[]` | 结构性错误；要求 `schemaVersion` 存在并拒绝未知版本 |
| `pointInPolygon` | `(x, y, polygon) => boolean` | 射线法判定 |
| `sectionAt` | `(level, x, y) => Section \| undefined` | 场馆坐标落在哪个 section 内 |
| `rowAt` | `(section, x, y, maxDistance = 40) => Row \| undefined` | `maxDistance` 内最近的行质心 |
| `seatAt` | `(section, x, y, hitRadius = 3.4) => Seat \| undefined` | `hitRadius` 内最近的座位（L2 命中测试） |
| `boundsOf` / `levelBounds` / `venueBounds` | `(points \| level \| doc) => Bounds \| undefined` | 包围盒 |
| `levelById` | `(doc, levelId) => Level \| undefined` | |
| `priceTierOf` | `(doc, tierId) => PriceTier \| undefined` | |
| `sectionColor` | `(doc, section) => string` | section 的票档配色，缺省 `#64748b` |
| `rowAvailability` / `sectionAvailability` | `(row \| section) => Availability` | 总数与可选数的对照 |
| `toggleSelect` | `(seat) => Seat` | sold/held 不能被选中；两个渲染器都经 L2 接线 |

## @venue-seats/renderer — `packages/renderer/src/`

框架无关的 SVG 引擎。一个 `SeatMapController` 驱动一个宿主元素；React 与
Vue 包装层都调用它。

```ts
new SeatMapController(host: HTMLElement, options: SeatMapOptions)
```

**`SeatMapOptions`：** `doc`（必填）、`levelId?`、`selection?`（受控）、
`seatVisibleAt?`（默认 `0.7` 屏幕像素/场馆单位——超过该值座位才出现）、
`seatRadius?`（默认 `3.4` 场馆单位）、`onSelectionChange?`、
`onSectionClick?`、`onRowClick?`、`onSeatToggle?`、`onHoverChange?`。

**方法：** `setDoc(doc, { keepSelection }?)`、`setLevel(levelId)`、
`setSelection(sel, emit?)`、`clearSelection()`、`moveRowSelection(delta)`、
`zoomBy(factor, clientX?, clientY?)`、`zoomIn()`、`zoomOut()`、`fit()`、
`reset()`、`destroy()`、`isSeatsVisible()`、`pxPerUnit()`、
`clientToVenue(clientX, clientY)`、`getDoc()`、
`getSelection()`、getter `levelId`。

**几何（`geometry.ts`）：** `ViewBox`、`clamp`、`levelDisplayBounds`、
`fitViewBox`、`zoomViewBox`、`polygonCentroid`、`polygonPath`。

**DOM（`dom.ts`）：** `DEFAULT_CSS`、`injectStyles`、`svgEl`、`htmlEl`、`SVG_NS`。

键盘：`Escape` 清除选择，`ArrowUp/Down` 在选中的 section 内移动行选择，
`Enter/Space` 激活 section 或切换聚焦的座位（选中行的座位可 Tab 聚焦）。
ARIA：地图容器带 `role="application"`，section 与选中行的座位带
`role="button"` + `aria-pressed`，选中与座位切换的播报走 polite live region。

**座位切换（L2）：** 座位可见后，点击选中 section 内的座位即切换其状态
（sold/held 忽略），并以新状态触发 `onSeatToggle(seat, section)`。切换结果
存放在本地 overlay，直到宿主以更新后的文档重渲染；L1 选择不受影响。

## @venue-seats/renderer-3d — `packages/renderer-3d/src/`

与 2D SVG 渲染器共用同一数据模型的 three.js 渲染器。低端设备、窄视口或
无 WebGL 时自动降级 2D。

```ts
import { createVenueView } from "@venue-seats/renderer-3d";

const view = createVenueView(host: HTMLElement, {
  doc, levelId?, selection?, seatVisibleAt?, seatRadius?,
  onSelectionChange?, onSectionClick?, onRowClick?, onSeatToggle?, onHoverChange?,
  force3D?,   // attempt 3D even when the probe says no; still falls back on failure
});
// view.mode: "3d" | "2d" — actually created mode
// view.controller: SeatMap3DController | SeatMapController
```

**`VenueView`**（两种模式一致）：`mode`、`controller`、`setDoc(doc, { keepSelection }?)`、
`setLevel(levelId)`、`setSelection(sel, emit?)`、`clearSelection()`、`zoomBy(factor)`、
`zoomIn()`、`zoomOut()`、`fit()`、`reset()`、`getDoc()`、`getSelection()`、
`destroy()`。在一端模式里做的选择在另一端同样可见——demo 应用用一个共享的
`selection` state 切换 2D/3D。

`createVenueView` 先探测设备（`probe3D()`：有 WebGL、非低端机——
`hardwareConcurrency ≤ 4` 或 `deviceMemory ≤ 2`——且视口不窄于手机宽度，
`innerWidth ≤ NARROW_VIEWPORT` = 640）；`force3D: true` 跳过探测。若 3D
构建失败（拿不到 WebGL context），工厂会兜住并改返 2D 的
`SeatMapController`。`use3D(options)` 把同一判定暴露给想先分支再创建视图的
调用方；demo 用它解释降级*为什么*发生（`probe3D().webgl`）。

**移动端对等：** 2D 渲染器基于 pointer event，触控与鼠标走同一条代码
路径：单指平移、双指以捏合中点为锚缩放、轻点激活（捏合绝不激活）。手机
宽度视口下 demo 默认展示 2D 地图并说明原因；桌面端保留 3D 画布。验收
走查（对构建出的 demo 用 CDP 模拟真实触控，13 项检查，含捏合/平移/选择与
窄视口降级）：`pnpm --filter @venue-seats/demo walkthrough:mobile`
（截图在 `docs/screenshots/10-mobile-*.png`）。

**3D 控制器：** 环绕/缩放/平移相机，取景于 level 包围盒；点击经射线投射到
地面平面（`venueFromRay`）换回场馆坐标，再由 `resolveVenueActivate` 解析
——与 2D 渲染器相同的 section → 座位（L2，按屏幕像素/单位门控）→ 行
漏斗，因此两种模式的命中测试几何一致。选中的行抬起并放大座位球；座位
配色与 2D 完全一致地跟随状态（override 优先于文档）。sold/held 座位永不
被切换。画布与 2D svg 一样带 `role="application"` 和场馆标签，且可聚焦；
`Escape` 与 2D 一致地清除选择。

**纯函数助手（`scene.ts`，无 WebGL 也可测）：** `buildScene3D(doc,
levelId?, { seatRadius }?)`（拉伸的 section 板块、每座位一颗按状态着色的
实例化球、舞台盒、地面平面）、`applySelection3D`、
`applyStatuses3D(overrides)`、`pxPerUnit3D(viewportHeight, distance, fovDeg)`、
`venueFromRay(camera, ndcX, ndcY)`、`createVenueCamera(bounds, aspect)`、
`resolveVenueActivate(level, x, y, { selection, seatsVisible, seatRadius })`。

**常量（`scene.ts`）：** `SEAT_COLORS`（`sold` / `held` / `selected` 的 3D
配色；可售座位优先取座位级 `priceTierId`，缺省回退所在 section 的票档色
——与 2D 同一规则）、`FOV_3D`（45°，`createVenueCamera` 取景用的垂直视场角）。

**能力探测（`capability.ts`）：** `hasWebGL()`、`probe3D()` →
`{ webgl, lowEnd, narrow }`、`supports3D()`、`isNarrowViewport(width?)`、
`NARROW_VIEWPORT`（640 px）。

## @venue-seats/react — `packages/react/src/`

```tsx
<SeatMap doc levelId? selection? seatVisibleAt? seatRadius?
  onSelectionChange? onSectionClick? onRowClick? onSeatToggle? onHoverChange?
  className? style? aria-label? />
```

命令式句柄（`ref`）：`zoomIn()`、`zoomOut()`、`reset()`、`fit()`、
`controller()`。

## @venue-seats/vue — `packages/vue/src/`

```vue
<VenueSeatMap :doc :level-id :selection :seat-visible-at :seat-radius
  @selection-change @section-click @row-click @seat-toggle @hover-change />
```

`v-model:selection` 可用（prop `selection` + 事件 `selectionChange`）。
template ref 暴露：`zoomIn()`、`zoomOut()`、`reset()`、`fit()`、`controller()`。

## venue_seats (Flutter) — `packages/venue_seats/lib/`

```dart
VenueSeatMap(
  document: doc,            // VenueDocument.fromJson(jsonDecode(...))
  levelId: ...,             // defaults to first level
  selection: sel,           // controlled SeatSelection(sectionId, rowId?)
  onSelectionChanged: ...,
  onSectionActivated: ...,
  onRowActivated: ...,
  onSeatActivated: ...,      // L2: seat toggled, seat.status is the new status
  onHoverChanged: ...,
  seatVisibleAt: 0.7,       // defaults
  seatRadius: 3.4,
  minZoom: 0.6, maxZoom: 40,
)
```

导出：`VenueDocument`（含 `fromJson`）、`Venue`、`Stage`、`Level`、`Section`、
`SeatRow`、`Seat`、`SeatStatus`、`PriceTier`、`SeatSelection`、`SeatMapHover`、
`VenueSeatMapPainter`、`ViewFit`、`VenueBounds`、`Availability`。几何与命中
测试镜像 JS core（`geometry.dart`）：`sectionPoints`、`boundsOf`、
`levelBounds`、`levelDisplayBounds`、`pointInPolygon`、`sectionAt`、`rowAt`
（maxDistance = 40）、`seatAt`（hitRadius = 3.4）、`rowAvailability`、
`sectionAvailability`、`priceTierOf`、`sectionColor`。
