/**
 * Pure three.js scene construction for the 3D seat map.
 *
 * Everything in this module is CPU-side (Scene / ExtrudeGeometry /
 * InstancedMesh), so it is fully testable without a WebGL context.
 * Venue coordinates map to world coordinates as (x, y) -> (x, z):
 * the ground plane is XZ, +Y is up, and the slab top sits at y = 0.
 */
import * as THREE from "three";
import { levelById, levelBounds, rowAt, seatAt, sectionAt, sectionColor } from "@venue-seats/core";
import type {
  Bounds,
  Level,
  Row,
  RowSelection,
  Seat,
  SeatStatus,
  Section,
  VenueDocument,
} from "@venue-seats/core";

/** vertical thickness of a section slab */
const SLAB_DEPTH = 4;
/** how much a selected row's seats lift and grow */
const ROW_HOT_LIFT = 2.5;
const ROW_HOT_SCALE = 1.4;

export const SEAT_COLORS = {
  sold: new THREE.Color("#333c50"),
  held: new THREE.Color("#3d4a63"),
  selected: new THREE.Color("#ffffff"),
} as const;

export interface SeatInstance {
  seat: Seat;
  row: Row;
  section: Section;
  /** index into the InstancedMesh */
  index: number;
}

export interface Scene3D {
  scene: THREE.Scene;
  doc: VenueDocument;
  level: Level;
  bounds: Bounds;
  seatRadius: number;
  sectionMeshes: THREE.Mesh[];
  seats: THREE.InstancedMesh;
  seatMeta: SeatInstance[];
  seatIndex: Map<string, number>;
  stage: THREE.Mesh | null;
  ground: THREE.Mesh;
}

export interface Scene3DOptions {
  /** seat sphere radius in venue units (default 3.4, same as 2D) */
  seatRadius?: number;
}

function statusColor(doc: VenueDocument, section: Section, status: SeatStatus): THREE.Color {
  if (status === "sold") return SEAT_COLORS.sold;
  if (status === "held") return SEAT_COLORS.held;
  if (status === "selected") return SEAT_COLORS.selected;
  return new THREE.Color(sectionColor(doc, section));
}

/**
 * Build the 3D scene for one level: extruded section slabs, instanced
 * spheres for seats (one instance per seat, coloured by status), the stage
 * box and a ground plane. Throws for an unknown level id.
 */
export function buildScene3D(
  doc: VenueDocument,
  levelId?: string,
  opts: Scene3DOptions = {},
): Scene3D {
  const level = levelId ? levelById(doc, levelId) : doc.levels[0];
  if (!level) throw new Error(`unknown level: ${levelId}`);
  const radius = opts.seatRadius ?? 3.4;
  const bounds = levelBounds(level) ?? { minX: 0, minY: 0, maxX: 100, maxY: 100 };

  const scene = new THREE.Scene();
  scene.name = "venue3d";

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(0.4, 1, 0.25);
  scene.add(sun);

  // ground plane just under the slab bottoms
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const pad = span * 0.5 + 40;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(bounds.maxX - bounds.minX + pad * 2, bounds.maxY - bounds.minY + pad * 2),
    new THREE.MeshLambertMaterial({ color: 0x0b101b }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((bounds.minX + bounds.maxX) / 2, -SLAB_DEPTH - 0.1, (bounds.minY + bounds.maxY) / 2);
  ground.name = "ground";
  scene.add(ground);

  // one extruded slab per section, top face at y = 0
  const sectionMeshes: THREE.Mesh[] = [];
  const gSections = new THREE.Group();
  gSections.name = "sections";
  for (const section of level.sections ?? []) {
    const shape = new THREE.Shape(section.polygon.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: SLAB_DEPTH, bevelEnabled: false });
    geo.rotateX(Math.PI / 2); // extrude +Z becomes -Y: slab occupies y in [-SLAB_DEPTH, 0]
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(sectionColor(doc, section)).multiplyScalar(0.55),
      }),
    );
    mesh.name = `section:${section.id}`;
    gSections.add(mesh);
    sectionMeshes.push(mesh);
  }
  scene.add(gSections);

  // one instanced sphere per seat, coloured by status
  const flat: SeatInstance[] = [];
  for (const section of level.sections ?? []) {
    for (const row of section.rows ?? []) {
      for (const seat of row.seats ?? []) {
        flat.push({ seat, row, section, index: flat.length });
      }
    }
  }
  const seats = new THREE.InstancedMesh(
    new THREE.SphereGeometry(radius, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    Math.max(flat.length, 1),
  );
  seats.count = flat.length;
  seats.name = "seats";
  const seatIndex = new Map<string, number>();
  const m = new THREE.Matrix4();
  for (const it of flat) {
    seatIndex.set(it.seat.id, it.index);
    m.identity().setPosition(it.seat.x, radius, it.seat.y);
    seats.setMatrixAt(it.index, m);
    seats.setColorAt(it.index, statusColor(doc, it.section, it.seat.status));
  }
  seats.instanceMatrix.needsUpdate = true;
  if (seats.instanceColor) seats.instanceColor.needsUpdate = true;
  scene.add(seats);

  // stage box (absent when the document has no stage)
  let stage: THREE.Mesh | null = null;
  if (doc.stage) {
    stage = new THREE.Mesh(
      new THREE.BoxGeometry(doc.stage.w, 12, doc.stage.h),
      new THREE.MeshLambertMaterial({ color: 0x1e2a3f }),
    );
    stage.position.set(doc.stage.x, 6, doc.stage.y);
    stage.rotation.y = -THREE.MathUtils.degToRad(doc.stage.rotation ?? 0);
    stage.name = "stage";
    scene.add(stage);
  }

  return { scene, doc, level, bounds, seatRadius: radius, sectionMeshes, seats, seatMeta: flat, seatIndex, stage, ground };
}

/**
 * Repaint every seat from local overrides (L2 overlay) falling back to the
 * document status — the 3D mirror of the 2D `seatStatus` overlay.
 */
export function applyStatuses3D(scene: Scene3D, overrides: ReadonlyMap<string, SeatStatus>): void {
  for (const it of scene.seatMeta) {
    scene.seats.setColorAt(it.index, statusColor(scene.doc, it.section, overrides.get(it.seat.id) ?? it.seat.status));
  }
  if (scene.seats.instanceColor) scene.seats.instanceColor.needsUpdate = true;
}

/**
 * Highlight the selected row: its seats lift and grow (the 3D analogue of
 * the 2D row outline). Seat colours are untouched — a sold seat must never
 * look selected.
 */
export function applySelection3D(scene: Scene3D, selection: RowSelection | null): void {
  const m = new THREE.Matrix4();
  for (const it of scene.seatMeta) {
    const hot = !!selection && it.section.id === selection.sectionId && it.row.id === selection.rowId;
    const s = hot ? ROW_HOT_SCALE : 1;
    m.makeScale(s, s, s).setPosition(it.seat.x, hot ? scene.seatRadius + ROW_HOT_LIFT : scene.seatRadius, it.seat.y);
    scene.seats.setMatrixAt(it.index, m);
  }
  scene.seats.instanceMatrix.needsUpdate = true;
}

/**
 * Screen pixels per venue unit for a pinhole camera: the vertical field of
 * view at `distance` covers `viewportHeight` px.
 */
export function pxPerUnit3D(viewportHeight: number, distance: number, fovDeg = 45): number {
  return viewportHeight / (2 * distance * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
}

export interface VenueCamera3D {
  camera: THREE.PerspectiveCamera;
  target: THREE.Vector3;
  /** distance from target, used by pxPerUnit3D for seat visibility */
  distance: number;
  fov: number;
}

export const FOV_3D = 45;

/** Frame a perspective camera on the level bounds, elevated from the south. */
export function createVenueCamera(bounds: Bounds, aspect: number): VenueCamera3D {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const fov = FOV_3D;
  const distance = (span / 2 / Math.tan(THREE.MathUtils.degToRad(fov) / 2)) * 1.25;
  const elevation = THREE.MathUtils.degToRad(55);
  const target = new THREE.Vector3(cx, 0, cy);
  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, distance * 10 + 1000);
  camera.position.set(cx, Math.sin(elevation) * distance, cy + Math.cos(elevation) * distance);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  return { camera, target, distance, fov };
}

const _raycaster = new THREE.Raycaster();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();

/**
 * Cast a screen-space ray (NDC) onto the ground plane and return the hit in
 * venue coordinates. Returns undefined when the ray misses the plane.
 */
export function venueFromRay(
  camera: THREE.PerspectiveCamera,
  ndcX: number,
  ndcY: number,
  planeY = 0,
): { x: number; y: number } | undefined {
  _plane.constant = -planeY;
  _ndc.set(ndcX, ndcY);
  _raycaster.setFromCamera(_ndc, camera);
  if (!_raycaster.ray.intersectPlane(_plane, _hit)) return undefined;
  return { x: _hit.x, y: _hit.z };
}

export interface VenueActivateOptions {
  selection: RowSelection | null;
  seatsVisible: boolean;
  seatRadius: number;
}

export type VenueActivate =
  | { type: "select-section"; section: Section }
  | { type: "select-row"; row: Row; section: Section }
  | { type: "toggle-seat"; seat: Seat; section: Section }
  | { type: "clear" };

/**
 * The 3D click funnel — identical resolution to the 2D `activateAt`:
 * section first, then seat (only while seats are visible), then row.
 */
export function resolveVenueActivate(
  level: Level,
  x: number,
  y: number,
  opts: VenueActivateOptions,
): VenueActivate {
  const sec = sectionAt(level, x, y);
  if (!sec) return { type: "clear" };
  if (opts.selection?.sectionId !== sec.id) return { type: "select-section", section: sec };
  if (opts.seatsVisible) {
    const seat = seatAt(sec, x, y, opts.seatRadius);
    if (seat) return { type: "toggle-seat", seat, section: sec };
  }
  const row = rowAt(sec, x, y);
  if (!row) return { type: "clear" };
  return { type: "select-row", row, section: sec };
}
