import type { VenueDocument } from "@venue-seats/core";

/** A lazy venue: metadata for the selector, loader pulls the document on demand. */
export interface VenueEntry {
  id: string;
  name: string;
  city: string;
  provenance: "demo" | "public";
  load: () => Promise<VenueDocument>;
}

export const DEMO_DISCLAIMER =
  "示例场馆按公开资料重建并简化（示意），不保证与真实场馆一致；不含任何官方座位图。";
export const EXAMPLES_NOTE =
  "真实场馆样本：结构与容量按公开资料重建（来源与许可见仓库 examples/README.md），座位排布为示意重排，不保证与现场一致。";

// demo fixtures first, then the real-venue samples — the same order the app
// has always shown. Each JSON is a dynamic import so Vite splits it into its
// own chunk instead of one 5 MB bundle.
export const VENUES: VenueEntry[] = [
  { id: "demo-national-stadium", name: "国家体育场（鸟巢）", city: "北京", provenance: "demo", load: () => import("../../../packages/venues-demo/venues/demo-national-stadium.json").then((m) => m.default as VenueDocument) },
  { id: "demo-shanghai-stadium", name: "上海体育场", city: "上海", provenance: "demo", load: () => import("../../../packages/venues-demo/venues/demo-shanghai-stadium.json").then((m) => m.default as VenueDocument) },
  { id: "demo-mercedes-arena", name: "梅赛德斯-奔驰文化中心", city: "上海", provenance: "demo", load: () => import("../../../packages/venues-demo/venues/demo-mercedes-arena.json").then((m) => m.default as VenueDocument) },
  { id: "demo-cadillac-arena", name: "凯迪拉克中心（五棵松）", city: "北京", provenance: "demo", load: () => import("../../../packages/venues-demo/venues/demo-cadillac-arena.json").then((m) => m.default as VenueDocument) },
  { id: "demo-shenzhen-bay", name: "深圳湾体育中心体育馆", city: "深圳", provenance: "demo", load: () => import("../../../packages/venues-demo/venues/demo-shenzhen-bay.json").then((m) => m.default as VenueDocument) },
  { id: "public-ncpa-opera-house", name: "国家大剧院·歌剧院", city: "北京", provenance: "public", load: () => import("../../../examples/venues/public-ncpa-opera-house.json").then((m) => m.default as VenueDocument) },
  { id: "public-hangzhou-olympic-stadium", name: "杭州奥体中心体育场（大莲花）", city: "杭州", provenance: "public", load: () => import("../../../examples/venues/public-hangzhou-olympic-stadium.json").then((m) => m.default as VenueDocument) },
  { id: "public-expo-culture-center", name: "上海世博文化中心", city: "上海", provenance: "public", load: () => import("../../../examples/venues/public-expo-culture-center.json").then((m) => m.default as VenueDocument) },
  { id: "public-hong-kong-coliseum", name: "香港体育馆（红磡）", city: "香港", provenance: "public", load: () => import("../../../examples/venues/public-hong-kong-coliseum.json").then((m) => m.default as VenueDocument) },
];
