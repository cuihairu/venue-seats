// REAL-VENUE samples (provenance "public") — structure and capacity follow
// the published record for each venue, seat placement is our own
// reconstruction. Sources and licences: examples/README.md in the repo root.
import type { VenueDocument } from "@venue-seats/core";
import coliseum from "../../../examples/venues/public-hong-kong-coliseum.json" with { type: "json" };
import ncpa from "../../../examples/venues/public-ncpa-opera-house.json" with { type: "json" };
import stadium from "../../../examples/venues/public-hangzhou-olympic-stadium.json" with { type: "json" };
import expo from "../../../examples/venues/public-expo-culture-center.json" with { type: "json" };

export const EXAMPLE_VENUES: VenueDocument[] = [ncpa, stadium, expo, coliseum] as VenueDocument[];

export const EXAMPLES_NOTE =
  "真实场馆样本：结构与容量按公开资料重建（来源与许可见仓库 examples/README.md），座位排布为示意重排，不保证与现场一致。";
