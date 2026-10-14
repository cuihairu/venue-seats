/**
 * WebGL seat map (three.js) with automatic fallback to the 2D SVG renderer.
 *
 * `createVenueView` is the entry point: it probes the device, tries the 3D
 * controller, and degrades to `SeatMapController` when WebGL is missing or
 * construction fails. Both paths expose the same `VenueView` surface and
 * share the core geometry, so a selection made in one view shows in the other.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SeatMapController } from "@venue-seats/renderer";
import type { HoverInfo, SeatMapOptions } from "@venue-seats/renderer";
import { levelById, rowAt, seatAt, sectionAt, toggleSelect } from "@venue-seats/core";
import type { RowSelection, Seat, SeatStatus, Section, VenueDocument } from "@venue-seats/core";
import {
  applySelection3D,
  applyStatuses3D,
  buildScene3D,
  createVenueCamera,
  pxPerUnit3D,
  resolveVenueActivate,
  venueFromRay,
} from "./scene.js";
import { supports3D } from "./capability.js";

/** Shared surface of both renderers (2D and 3D). */
export interface VenueView {
  readonly mode: "2d" | "3d";
  readonly controller: SeatMapController | SeatMap3DController;
  setDoc(doc: VenueDocument, opts?: { keepSelection?: boolean }): void;
  setLevel(levelId: string): void;
  setSelection(sel: RowSelection | null, emit?: boolean): void;
  clearSelection(): void;
  zoomBy(factor: number): void;
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  reset(): void;
  getDoc(): VenueDocument;
  getSelection(): RowSelection | null;
  destroy(): void;
}

export type VenueViewOptions = SeatMapOptions & {
  /** attempt 3D even when the capability probe says no (still falls back on failure) */
  force3D?: boolean;
};

const CLICK_TOLERANCE_PX = 6;
const ZOOM_IN_FACTOR = 1.25;
const ZOOM_OUT_FACTOR = 0.8;
const MIN_DISTANCE = 20;
const MAX_DISTANCE = 4000;

/**
 * WebGL seat map. One controller drives one host element; hit-testing goes
 * through the same core geometry as the 2D renderer, resolved in venue
 * coordinates by `resolveVenueActivate`.
 */
export class SeatMap3DController {
  readonly mode = "3d" as const;

  private host: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private cam3d: ReturnType<typeof createVenueCamera>;
  private scene3d: ReturnType<typeof buildScene3D>;
  private doc: VenueDocument;
  private levelId: string | undefined;
  private sel: RowSelection | null = null;
  private seatOverrides = new Map<string, SeatStatus>();
  private seatVisibleAt: number;
  private seatRadius: number;
  private events: SeatMapOptions;
  private resizeObserver: ResizeObserver;
  private pointerDown: { x: number; y: number; button: number } | null = null;
  private destroyed = false;

  constructor(host: HTMLElement, options: SeatMapOptions) {
    this.host = host;
    this.doc = options.doc;
    this.levelId = options.levelId;
    this.sel = options.selection ?? null;
    this.seatVisibleAt = options.seatVisibleAt ?? 0.7;
    this.seatRadius = options.seatRadius ?? 3.4;
    this.events = options;

    this.canvas = document.createElement("canvas");
    this.canvas.className = "vs3d-canvas";
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    // same identification as the 2d svg; Escape mirrors its clear-selection key
    this.canvas.setAttribute("role", "application");
    this.canvas.setAttribute("aria-label", `${this.doc.venue.name} 座位图（3D）`);
    this.canvas.setAttribute("tabindex", "0");
    host.appendChild(this.canvas);

    // throws when no WebGL context can be created — the factory catches this
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setClearColor(0x0b101b);

    this.scene3d = buildScene3D(this.doc, this.levelId, { seatRadius: this.seatRadius });
    this.cam3d = createVenueCamera(this.scene3d.bounds, this.aspect());
    this.controls = new OrbitControls(this.cam3d.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // stay above the ground
    this.frame();

    this.applyState();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();

    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("keydown", this.onKeyDown);

    this.renderer.setAnimationLoop(() => {
      if (this.destroyed) return;
      this.controls.update();
      this.renderer.render(this.scene3d.scene, this.cam3d.camera);
    });
  }

  // ---- public surface -----------------------------------------------------

  getDoc(): VenueDocument {
    return this.doc;
  }

  getSelection(): RowSelection | null {
    return this.sel;
  }

  setDoc(doc: VenueDocument, opts: { keepSelection?: boolean } = {}): void {
    this.doc = doc;
    this.seatOverrides.clear();
    if (!opts.keepSelection) this.sel = null;
    this.rebuild();
  }

  setLevel(levelId: string): void {
    if (!levelById(this.doc, levelId)) throw new Error(`unknown level: ${levelId}`);
    this.levelId = levelId;
    this.sel = null;
    this.seatOverrides.clear();
    this.rebuild();
  }

  setSelection(sel: RowSelection | null, emit = true): void {
    this.sel = sel;
    applySelection3D(this.scene3d, sel);
    if (emit) this.events.onSelectionChange?.(sel);
  }

  clearSelection(): void {
    this.setSelection(null);
  }

  zoomBy(factor: number): void {
    const cam = this.cam3d.camera;
    const target = this.controls.target;
    const dir = cam.position.clone().sub(target);
    const dist = THREE.MathUtils.clamp(
      dir.length() / factor,
      MIN_DISTANCE,
      MAX_DISTANCE,
    );
    cam.position.copy(target.clone().add(dir.normalize().multiplyScalar(dist)));
  }

  zoomIn(): void {
    this.zoomBy(ZOOM_IN_FACTOR);
  }

  zoomOut(): void {
    this.zoomBy(ZOOM_OUT_FACTOR);
  }

  /** re-frame the camera on the level bounds */
  fit(): void {
    this.frame();
  }

  reset(): void {
    this.frame();
  }

  destroy(): void {
    this.destroyed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("keydown", this.onKeyDown);
    this.controls.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }

  // ---- internals ----------------------------------------------------------

  private aspect(): number {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    return w > 0 && h > 0 ? w / h : 16 / 9;
  }

  private resize(): void {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.cam3d.camera.aspect = w / h;
    this.cam3d.camera.updateProjectionMatrix();
  }

  private frame(): void {
    this.cam3d = createVenueCamera(this.scene3d.bounds, this.aspect());
    this.controls.target.copy(this.cam3d.target);
    this.controls.update();
  }

  private rebuild(): void {
    this.scene3d = buildScene3D(this.doc, this.levelId, { seatRadius: this.seatRadius });
    this.applyState();
    this.frame();
  }

  private applyState(): void {
    applyStatuses3D(this.scene3d, this.seatOverrides);
    applySelection3D(this.scene3d, this.sel);
  }

  /** seats are clickable once they are big enough on screen (same gate as 2D) */
  private isSeatsVisible(): boolean {
    const h = this.host.clientHeight || 560;
    const distance = this.cam3d.camera.position.distanceTo(this.controls.target);
    return pxPerUnit3D(h, distance, this.cam3d.fov) >= this.seatVisibleAt;
  }

  private ndcFromEvent(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    };
  }

  /** Escape clears the selection, same as the 2d svg's key handler */
  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this.setSelection(null);
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDown = { x: e.clientX, y: e.clientY, button: e.button };
  };

  private onPointerUp = (e: PointerEvent): void => {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!down || down.button !== e.button) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_TOLERANCE_PX) return;
    const ndc = this.ndcFromEvent(e);
    this.activateAt(ndc.x, ndc.y);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const ndc = this.ndcFromEvent(e);
    const v = venueFromRay(this.cam3d.camera, ndc.x, ndc.y);
    this.events.onHoverChange?.(v ? this.hoverAt(v.x, v.y) : null);
  };

  private hoverAt(x: number, y: number): HoverInfo | null {
    const sec = sectionAt(this.scene3d.level, x, y);
    if (!sec) return null;
    // rows and seats preview what a click there would do, and a click only
    // resolves below the section once it is selected — same funnel as 2D
    if (this.sel?.sectionId !== sec.id) return { kind: "section", section: sec };
    if (this.isSeatsVisible()) {
      const seat = seatAt(sec, x, y, this.seatRadius);
      if (seat) return { kind: "seat", section: sec, seat };
    }
    const row = rowAt(sec, x, y);
    if (row) return { kind: "row", section: sec, row };
    return { kind: "section", section: sec };
  }

  /** effective status of a seat: a local override, else the document's */
  private seatStatus(seat: Seat): SeatStatus {
    return this.seatOverrides.get(seat.id) ?? seat.status;
  }

  /**
   * Toggle one seat's status (sold/held are ignored). The new status lives in a
   * local overlay until the host re-renders with an updated document, exactly as
   * in the 2D controller, so clicking a selected seat again clears it.
   */
  private toggleSeat(seat: Seat, section: Section): void {
    const current = this.seatStatus(seat);
    const next = toggleSelect({ ...seat, status: current });
    if (next.status === current) return; // sold / held never toggle
    if (next.status === seat.status) this.seatOverrides.delete(seat.id);
    else this.seatOverrides.set(seat.id, next.status);
    applyStatuses3D(this.scene3d, this.seatOverrides);
    this.events.onSeatToggle?.(next, section);
  }

  private activateAt(ndcX: number, ndcY: number): void {
    const v = venueFromRay(this.cam3d.camera, ndcX, ndcY);
    if (!v) return;
    const hit = resolveVenueActivate(this.scene3d.level, v.x, v.y, {
      selection: this.sel,
      seatsVisible: this.isSeatsVisible(),
      seatRadius: this.seatRadius,
    });
    switch (hit.type) {
      case "select-section":
        this.setSelection({ sectionId: hit.section.id });
        this.events.onSectionClick?.(hit.section, this.sel);
        break;
      case "select-row": {
        const sel: RowSelection =
          this.sel?.rowId === hit.row.id
            ? { sectionId: hit.section.id }
            : { sectionId: hit.section.id, rowId: hit.row.id };
        this.setSelection(sel);
        this.events.onRowClick?.(hit.row, hit.section, this.sel);
        break;
      }
      case "toggle-seat":
        this.toggleSeat(hit.seat, hit.section);
        break;
      case "clear":
        this.setSelection(null);
        break;
    }
  }
}

class View2D implements VenueView {
  readonly mode = "2d" as const;
  constructor(readonly controller: SeatMapController) {}
  setDoc(doc: VenueDocument, opts?: { keepSelection?: boolean }): void {
    this.controller.setDoc(doc, opts);
  }
  setLevel(levelId: string): void {
    this.controller.setLevel(levelId);
  }
  setSelection(sel: RowSelection | null, emit?: boolean): void {
    this.controller.setSelection(sel, emit);
  }
  clearSelection(): void {
    this.controller.clearSelection();
  }
  zoomBy(factor: number): void {
    this.controller.zoomBy(factor);
  }
  zoomIn(): void {
    this.controller.zoomIn();
  }
  zoomOut(): void {
    this.controller.zoomOut();
  }
  fit(): void {
    this.controller.fit();
  }
  reset(): void {
    this.controller.reset();
  }
  getDoc(): VenueDocument {
    return this.controller.getDoc();
  }
  getSelection(): RowSelection | null {
    return this.controller.getSelection();
  }
  destroy(): void {
    this.controller.destroy();
  }
}

class View3D implements VenueView {
  readonly mode = "3d" as const;
  constructor(readonly controller: SeatMap3DController) {}
  setDoc(doc: VenueDocument, opts?: { keepSelection?: boolean }): void {
    this.controller.setDoc(doc, opts);
  }
  setLevel(levelId: string): void {
    this.controller.setLevel(levelId);
  }
  setSelection(sel: RowSelection | null, emit?: boolean): void {
    this.controller.setSelection(sel, emit);
  }
  clearSelection(): void {
    this.controller.clearSelection();
  }
  zoomBy(factor: number): void {
    this.controller.zoomBy(factor);
  }
  zoomIn(): void {
    this.controller.zoomIn();
  }
  zoomOut(): void {
    this.controller.zoomOut();
  }
  fit(): void {
    this.controller.fit();
  }
  reset(): void {
    this.controller.reset();
  }
  getDoc(): VenueDocument {
    return this.controller.getDoc();
  }
  getSelection(): RowSelection | null {
    return this.controller.getSelection();
  }
  destroy(): void {
    this.controller.destroy();
  }
}

/**
 * Decide whether the 3D renderer is even attempted: `force3D` opts in
 * unconditionally, otherwise the device must support 3D (WebGL present, not
 * low-end, viewport not phone-narrow).
 */
export function use3D(options: { force3D?: boolean } = {}): boolean {
  return options.force3D === true || supports3D();
}

/**
 * Create a venue view for `host`: the 3D renderer when the device supports
 * it (or `force3D` is set), otherwise — or whenever 3D construction fails —
 * the 2D SVG renderer. Both share the same document and selection state.
 */
export function createVenueView(host: HTMLElement, options: VenueViewOptions): VenueView {
  if (use3D(options)) {
    try {
      return new View3D(new SeatMap3DController(host, options));
    } catch {
      // no WebGL / context creation failed — degrade to 2D
    }
  }
  return new View2D(new SeatMapController(host, options));
}
