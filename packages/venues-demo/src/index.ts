import nationalStadium from "../venues/demo-national-stadium.json";
import shanghaiStadium from "../venues/demo-shanghai-stadium.json";
import mercedesArena from "../venues/demo-mercedes-arena.json";
import cadillacArena from "../venues/demo-cadillac-arena.json";
import shenzhenBay from "../venues/demo-shenzhen-bay.json";
import type { VenueDocument } from "@venue-seats/core";

/**
 * DEMO VENUES — 示意数据。
 *
 * Rebuilt from public layout information (capacity, tiering, bowl shape) and
 * heavily simplified. They are NOT guaranteed to match the real venues; no
 * official seat chart is bundled, scraped or copied. Regenerate with
 * `pnpm --filter @venue-seats/venues-demo gen`.
 */
export const DEMO_VENUES: VenueDocument[] = [
  nationalStadium,
  shanghaiStadium,
  mercedesArena,
  cadillacArena,
  shenzhenBay,
] as VenueDocument[];

export const DEMO_DISCLAIMER =
  "示例场馆按公开资料重建并简化（示意），不保证与真实场馆一致；不含任何官方座位图。";
