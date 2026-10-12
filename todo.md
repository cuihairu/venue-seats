# todo — venue-seats

来源：用户 2026-10-12「创建 venue-seats 项目吧，然后推进」「要和商业项目一样漂亮 可以对抄（看参考，不抄代码/素材/数据）」「要适合 Vue / React / Flutter 使用」。
调研依据：awn 的 `docs/research/venue-seatmaps.md`（单个推荐 = 本项目）。

## P1 — 地基（本期）

- [ ] 数据模型 + JSON Schema 定稿（venue → level → section → row → seat；stage 朝向；票价分区），schema 校验有测试
- [ ] 核心包 `@venue-seats/core`（加载、校验、命中测试/选中状态、与渲染无关）
- [ ] 2D 渲染器（SVG/Canvas：缩放拖动、悬停高亮、售罄置灰、票价配色、区/排两级先做）
- [ ] React 包装 `@venue-seats/react`
- [ ] Vue 包装 `@venue-seats/vue`
- [ ] Flutter（Dart）包，共用同一份 JSON 数据
- [ ] 示例场馆 3-5 个（公开资料重建，文件内标 `demo`/`示意`，README 注明不保证与真实场馆一致）
- [ ] 质量验收：商业级交互对照清单（缩放/拖动顺滑、hover、售罄态、票档色、楼层切换、键盘与无障碍）逐项给截图证据
- [ ] CI（pnpm install + test + build）绿

## P2 — 逐座（L2）与 3D（L3）

- [ ] 逐座几何（L2）：有数据再做，先定座级 schema 与状态机（available/selected/sold/held）
- [ ] 3D 视图（L3）：three.js 程序化几何，与 2D 同源数据、选中状态互通；低端机自动回 2D（帧率阈值写清）
- [ ] 移动端（触控缩放、窄屏降级）

## 待拍板

- [ ] 包发布策略（先 npm 私有/公开？Flutter 走 path 依赖还是 pub.dev？）
- [ ] 示例场馆清单（哪 3-5 个，名称由用户定或按公开资料自选）

验收铁律：完成 = 测试绿 + 证据（截图/命令输出）+ 单 commit 英文简短信息；不许只报"在做"。
