/**
 * @venue-seats/renderer — framework-agnostic SVG seat-map engine.
 * React (`@venue-seats/react`) and Vue (`@venue-seats/vue`) are thin wrappers
 * around `SeatMapController`; Flutter has a Dart-native twin (`packages/venue_seats`)
 * driven by the same JSON documents.
 */
export { SeatMapController } from "./controller.js";
export type { SeatMapEvents, SeatMapOptions, HoverInfo } from "./controller.js";
export { DEFAULT_CSS } from "./dom.js";
export { fitViewBox, levelDisplayBounds, polygonCentroid, polygonPath, zoomViewBox } from "./geometry.js";
export type { ViewBox } from "./geometry.js";
