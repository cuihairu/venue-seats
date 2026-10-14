// @vitest-environment jsdom
//
// Covers SeatMap3DController — the 3D counterpart of the 2D SeatMapController.
// The class is untestable in jsdom as-is: the real WebGLRenderer throws without
// a WebGL context, OrbitControls needs a live DOM element and jsdom ships no
// ResizeObserver. All three are mocked here so the controller's own logic (state
// machine, zoom clamp, selection emit, pointer funnel, teardown) runs for real.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { levelById, levelBounds } from "@venue-seats/core";
import type { RowSelection, VenueDocument } from "@venue-seats/core";
import type { SeatMapOptions } from "@venue-seats/renderer";
import {
  buildScene3D,
  createVenueCamera,
  createVenueView,
  SeatMap3DController,
} from "../src/index";

// ---- mocks -----------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  animationLoop: null as (() => void) | null,
  rendererDisposed: false,
  controlsDisposed: false,
  roDisconnected: false,
  roCallback: null as (() => void) | null,
  renderCalls: 0,
}));

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: class {
      setClearColor() {}
      setSize() {}
      setAnimationLoop(cb: (() => void) | null) {
        mocks.animationLoop = cb;
      }
      render() {
        mocks.renderCalls++;
      }
      dispose() {
        mocks.rendererDisposed = true;
      }
    },
  };
});

vi.mock("three/examples/jsm/controls/OrbitControls.js", async () => {
  const THREE = await import("three");
  return {
    OrbitControls: class {
      // zoomBy() calls target.clone().add(...), so a real Vector3 is needed
      target = new THREE.Vector3();
      constructor(_camera: unknown, _dom: unknown) {}
      update() {}
      dispose() {
        mocks.controlsDisposed = true;
      }
    },
  };
});

class ResizeObserverStub {
  constructor(cb: () => void) {
    mocks.roCallback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {
    mocks.roDisconnected = true;
  }
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;

// ---- fixture (same shape as renderer3d.test.ts) ---------------------------

const doc: VenueDocument = {
  schemaVersion: "1",
  venue: { id: "v", name: "示例场馆" },
  provenance: "demo",
  stage: { x: 150, y: 260, rotation: 180, w: 100, h: 24 },
  priceTiers: [
    { id: "t1", name: "内场", color: "#ff4d6d", price: 1280 },
    { id: "t2", name: "看台", color: "#4d8dff", price: 680 },
  ],
  levels: [
    {
      id: "l1",
      name: "下层",
      sections: [
        {
          id: "s1",
          name: "A 区",
          polygon: [
            [0, 0],
            [100, 0],
            [100, 60],
            [0, 60],
          ],
          priceTierId: "t1",
          rows: [
            {
              id: "s1-r1",
              label: "1 排",
              seats: [
                { id: "a1", label: "1", x: 20, y: 20, status: "available" },
                { id: "a2", label: "2", x: 40, y: 20, status: "sold" },
                { id: "a3", label: "3", x: 60, y: 20, status: "available" },
              ],
            },
            {
              id: "s1-r2",
              label: "2 排",
              seats: [
                { id: "b1", label: "1", x: 20, y: 40, status: "available" },
                { id: "b2", label: "2", x: 40, y: 40, status: "held" },
              ],
            },
          ],
        },
        {
          id: "s2",
          name: "B 区",
          polygon: [
            [120, 0],
            [220, 0],
            [220, 60],
            [120, 60],
          ],
          priceTierId: "t2",
          rows: [
            {
              id: "s2-r1",
              label: "1 排",
              seats: [
                { id: "c1", label: "1", x: 140, y: 20, status: "available" },
                { id: "c2", label: "2", x: 160, y: 20, status: "sold" },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "l2",
      name: "上层",
      sections: [
        {
          id: "s3",
          name: "C 区",
          polygon: [
            [0, 0],
            [80, 0],
            [80, 50],
            [0, 50],
          ],
          priceTierId: "t2",
          rows: [
            {
              id: "s3-r1",
              label: "1 排",
              seats: [
                { id: "d1", label: "1", x: 20, y: 20, status: "available" },
                { id: "d2", label: "2", x: 40, y: 20, status: "available" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const doc2: VenueDocument = {
  ...doc,
  venue: { ...doc.venue, id: "v2" },
  levels: [doc.levels[1]],
};

// The stubbed canvas rect; the controller reads getBoundingClientRect to turn
// client coords into NDC.
const W = 800;
const H = 600;

const hosts: HTMLElement[] = [];

beforeEach(() => {
  mocks.animationLoop = null;
  mocks.rendererDisposed = false;
  mocks.controlsDisposed = false;
  mocks.roDisconnected = false;
  mocks.roCallback = null;
  mocks.renderCalls = 0;
});

afterEach(() => {
  for (const h of hosts.splice(0)) h.remove();
});

function makeController(options: Partial<SeatMapOptions> = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const controller = new SeatMap3DController(host, { doc, ...options });
  const canvas = host.querySelector("canvas")!;
  canvas.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: W,
      bottom: H,
      width: W,
      height: H,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  hosts.push(host);
  return { host, controller, canvas };
}

/**
 * Project a venue point onto the stubbed canvas. Uses the same camera the
 * controller builds (aspect 16:9 — jsdom reports no layout size, so the
 * controller falls back to its default aspect).
 */
function aimAt(levelId: string, vx: number, vy: number): { clientX: number; clientY: number } {
  const bounds = levelBounds(levelById(doc, levelId)!)!;
  const ndc = new THREE.Vector3(vx, 0, vy).project(createVenueCamera(bounds, 16 / 9).camera);
  return { clientX: ((ndc.x + 1) / 2) * W, clientY: ((1 - ndc.y) / 2) * H };
}

function tap(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  for (const type of ["pointerdown", "pointerup"]) {
    canvas.dispatchEvent(new MouseEvent(type, { clientX, clientY, button: 0, bubbles: true }));
  }
}

function move(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  canvas.dispatchEvent(new MouseEvent("pointermove", { clientX, clientY, button: 0, bubbles: true }));
}

function distance(controller: SeatMap3DController): number {
  const { cam3d, controls } = controller as unknown as {
    cam3d: { camera: THREE.PerspectiveCamera };
    controls: { target: THREE.Vector3 };
  };
  return cam3d.camera.position.distanceTo(controls.target);
}

function aspect(controller: SeatMap3DController): number {
  const { cam3d } = controller as unknown as { cam3d: { camera: THREE.PerspectiveCamera } };
  return cam3d.camera.aspect;
}

// ---- construction ---------------------------------------------------------

describe("construction", () => {
  it("appends the 3d canvas and starts the render loop", () => {
    const { host, controller } = makeController();
    expect(controller.mode).toBe("3d");
    expect(host.querySelector("canvas.vs3d-canvas")).not.toBeNull();
    expect(typeof mocks.animationLoop).toBe("function");
    // one frame runs the controller's animation body without throwing
    (mocks.animationLoop as () => void)();
  });

  it("falls back to a 16:9 aspect when the host has no layout size", () => {
    const { controller } = makeController();
    expect(aspect(controller)).toBeCloseTo(16 / 9, 6);
  });

  it("sizes the renderer from the host box when it has one", () => {
    const host = document.createElement("div");
    Object.defineProperty(host, "clientWidth", { value: 640 });
    Object.defineProperty(host, "clientHeight", { value: 480 });
    document.body.appendChild(host);
    hosts.push(host);
    const controller = new SeatMap3DController(host, { doc });
    // resize() runs during construction and drives the camera aspect from the box
    expect(aspect(controller)).toBeCloseTo(640 / 480, 6);
    controller.destroy();
  });

  it("refits when the observed host changes size", () => {
    const { host, controller } = makeController();
    expect(aspect(controller)).toBeCloseTo(16 / 9, 6);
    Object.defineProperty(host, "clientWidth", { value: 500, configurable: true });
    Object.defineProperty(host, "clientHeight", { value: 500, configurable: true });
    mocks.roCallback?.();
    expect(aspect(controller)).toBeCloseTo(1, 6);
  });
});

// ---- selection state ------------------------------------------------------

describe("selection state", () => {
  it("setSelection stores the selection and emits onSelectionChange", () => {
    const seen: (RowSelection | null)[] = [];
    const { controller } = makeController({ onSelectionChange: (sel) => seen.push(sel) });
    const sel = { sectionId: "s1", rowId: "s1-r1" };
    controller.setSelection(sel);
    expect(controller.getSelection()).toEqual(sel);
    expect(seen).toEqual([sel]);
  });

  it("setSelection with emit=false stays silent", () => {
    const seen: (RowSelection | null)[] = [];
    const { controller } = makeController({ onSelectionChange: (sel) => seen.push(sel) });
    controller.setSelection({ sectionId: "s1" }, false);
    expect(controller.getSelection()).toEqual({ sectionId: "s1" });
    expect(seen).toEqual([]);
  });

  it("clearSelection resets to null and emits", () => {
    const seen: (RowSelection | null)[] = [];
    const { controller } = makeController({ onSelectionChange: (sel) => seen.push(sel) });
    controller.setSelection({ sectionId: "s1" }, false);
    controller.clearSelection();
    expect(controller.getSelection()).toBeNull();
    expect(seen).toEqual([null]);
  });
});

// ---- document and level ---------------------------------------------------

describe("setDoc / setLevel", () => {
  it("setDoc swaps the document and clears the selection", () => {
    const { controller } = makeController();
    controller.setSelection({ sectionId: "s1" }, false);
    controller.setDoc(doc2);
    expect(controller.getDoc()).toBe(doc2);
    expect(controller.getSelection()).toBeNull();
  });

  it("setDoc with keepSelection preserves the selection", () => {
    const { controller } = makeController();
    const sel = { sectionId: "s1", rowId: "s1-r1" };
    controller.setSelection(sel, false);
    controller.setDoc(doc2, { keepSelection: true });
    expect(controller.getDoc()).toBe(doc2);
    expect(controller.getSelection()).toEqual(sel);
  });

  it("setLevel rebuilds the scene for the new level", () => {
    const { controller, canvas } = makeController();
    controller.setLevel("l2");
    const { clientX, clientY } = aimAt("l2", 40, 25);
    tap(canvas, clientX, clientY);
    // the same point sits in l1's s1 — s3 proves the level actually switched
    expect(controller.getSelection()).toEqual({ sectionId: "s3" });
  });

  it("rejects an unknown level", () => {
    const { controller } = makeController();
    expect(() => controller.setLevel("nope")).toThrow(/unknown level/);
  });
});

// ---- zoom -----------------------------------------------------------------

describe("zoom", () => {
  it("zoomIn moves the camera closer", () => {
    const { controller } = makeController();
    const d0 = distance(controller);
    controller.zoomIn();
    expect(distance(controller)).toBeCloseTo(d0 / 1.25, 4);
  });

  it("zoomOut moves the camera farther", () => {
    const { controller } = makeController();
    const d0 = distance(controller);
    controller.zoomOut();
    expect(distance(controller)).toBeCloseTo(d0 / 0.8, 4);
  });

  it("clamps the camera to the minimum distance", () => {
    const { controller } = makeController();
    for (let i = 0; i < 20; i++) controller.zoomIn();
    expect(distance(controller)).toBeCloseTo(20, 4);
  });

  it("clamps the camera to the maximum distance", () => {
    const { controller } = makeController();
    for (let i = 0; i < 20; i++) controller.zoomOut();
    expect(distance(controller)).toBeCloseTo(4000, 2);
  });

  it("fit and reset re-frame the camera on the level bounds", () => {
    const { controller } = makeController();
    const d0 = distance(controller);
    controller.zoomIn();
    controller.fit();
    expect(distance(controller)).toBeCloseTo(d0, 2);
    controller.zoomOut();
    controller.reset();
    expect(distance(controller)).toBeCloseTo(d0, 2);
  });
});

// ---- teardown -------------------------------------------------------------

describe("destroy", () => {
  it("removes the canvas, stops the loop and disposes resources", () => {
    const { host, controller } = makeController();
    controller.destroy();
    expect(host.querySelector("canvas")).toBeNull();
    expect(mocks.animationLoop).toBeNull();
    expect(mocks.rendererDisposed).toBe(true);
    expect(mocks.controlsDisposed).toBe(true);
    expect(mocks.roDisconnected).toBe(true);
  });

  it("detaches the pointer listeners", () => {
    const onSectionClick = vi.fn();
    const { controller, canvas } = makeController({ onSectionClick });
    controller.destroy();
    const { clientX, clientY } = aimAt("l1", 50, 30);
    tap(canvas, clientX, clientY);
    expect(onSectionClick).not.toHaveBeenCalled();
  });

  it("the render loop stops rendering once destroyed", () => {
    const { controller } = makeController();
    const loop = mocks.animationLoop as () => void;
    controller.destroy();
    loop();
    expect(mocks.renderCalls).toBe(0);
  });
});

// ---- pointer funnel -------------------------------------------------------

describe("pointer interaction", () => {
  it("a tap on a section selects it and fires onSectionClick", () => {
    const onSectionClick = vi.fn();
    const { controller, canvas } = makeController({ onSectionClick });
    const { clientX, clientY } = aimAt("l1", 50, 30);
    tap(canvas, clientX, clientY);
    expect(controller.getSelection()).toEqual({ sectionId: "s1" });
    expect(onSectionClick).toHaveBeenCalledTimes(1);
    expect(onSectionClick.mock.calls[0][0].id).toBe("s1");
    expect(onSectionClick.mock.calls[0][1]).toEqual({ sectionId: "s1" });
  });

  it("a tap outside the sections clears the selection", () => {
    const { controller, canvas } = makeController();
    controller.setSelection({ sectionId: "s1" }, false);
    const { clientX, clientY } = aimAt("l1", 300, 30);
    tap(canvas, clientX, clientY);
    expect(controller.getSelection()).toBeNull();
  });

  it("a tap inside the selected section but away from any row clears it", () => {
    const { controller, canvas } = makeController();
    controller.setSelection({ sectionId: "s1" }, false);
    // (90,50) sits inside s1, clear of every seat and both row centroids
    const { clientX, clientY } = aimAt("l1", 90, 50);
    tap(canvas, clientX, clientY);
    expect(controller.getSelection()).toBeNull();
  });

  it("a tap on a visible seat toggles it and fires onSeatToggle", () => {
    const onSeatToggle = vi.fn();
    const { controller, canvas } = makeController({ onSeatToggle });
    const at = aimAt("l1", 50, 30);
    tap(canvas, at.clientX, at.clientY); // first click selects the section
    const seat = aimAt("l1", 20, 20);
    tap(canvas, seat.clientX, seat.clientY);
    expect(onSeatToggle).toHaveBeenCalledTimes(1);
    expect(onSeatToggle.mock.calls[0][0]).toMatchObject({ id: "a1", status: "selected" });
    expect(onSeatToggle.mock.calls[0][1].id).toBe("s1");
  });

  it("never toggles a sold seat", () => {
    const onSeatToggle = vi.fn();
    const { controller, canvas } = makeController({ onSeatToggle });
    const at = aimAt("l1", 50, 30);
    tap(canvas, at.clientX, at.clientY);
    const seat = aimAt("l1", 40, 20); // a2 — sold
    tap(canvas, seat.clientX, seat.clientY);
    expect(onSeatToggle).not.toHaveBeenCalled();
    expect(controller.getSelection()).toEqual({ sectionId: "s1" });
  });

  it("toggling a seat back to its document status clears the override", () => {
    const onSeatToggle = vi.fn();
    const { controller, canvas } = makeController({ onSeatToggle });
    const at = aimAt("l1", 50, 30);
    tap(canvas, at.clientX, at.clientY); // select the section first
    const seat = aimAt("l1", 20, 20); // a1
    tap(canvas, seat.clientX, seat.clientY); // a1 -> selected
    tap(canvas, seat.clientX, seat.clientY); // a1 -> available again
    expect(onSeatToggle).toHaveBeenCalledTimes(2);
    expect(onSeatToggle.mock.calls[1][0]).toMatchObject({ id: "a1", status: "available" });
  });

  it("ignores a pointerup without a matching pointerdown", () => {
    const { controller, canvas } = makeController();
    const { clientX, clientY } = aimAt("l1", 50, 30);
    canvas.dispatchEvent(new MouseEvent("pointerup", { clientX, clientY, button: 0, bubbles: true }));
    expect(controller.getSelection()).toBeNull();
  });

  it("a drag beyond the click tolerance does not activate", () => {
    const { controller, canvas } = makeController();
    const down = aimAt("l1", 50, 30);
    const up = aimAt("l1", 200, 30); // inside s2 — a leaked activation would hit it
    canvas.dispatchEvent(new MouseEvent("pointerdown", { ...down, button: 0, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent("pointerup", { ...up, button: 0, bubbles: true }));
    expect(controller.getSelection()).toBeNull();
  });

  it("re-clicking the selected row drops back to the section", () => {
    const onRowClick = vi.fn();
    const { controller, canvas } = makeController({ onRowClick });
    const at = aimAt("l1", 50, 30); // in s1, no seat within the hit radius
    tap(canvas, at.clientX, at.clientY);
    expect(controller.getSelection()).toEqual({ sectionId: "s1" });
    tap(canvas, at.clientX, at.clientY); // section is selected now, so this picks row s1-r1
    expect(controller.getSelection()).toEqual({ sectionId: "s1", rowId: "s1-r1" });
    tap(canvas, at.clientX, at.clientY); // the same row again -> back to the section
    expect(controller.getSelection()).toEqual({ sectionId: "s1" });
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });
});

// ---- hover ---------------------------------------------------------------

describe("hover", () => {
  it("stays at section level until the section is selected", () => {
    const seen: unknown[] = [];
    const { controller, canvas } = makeController({ onHoverChange: (h) => seen.push(h) });
    const { clientX, clientY } = aimAt("l1", 50, 30); // nearest row is s1-r1
    move(canvas, clientX, clientY);
    // a click there would only select the section, so hover previews that
    expect(seen[seen.length - 1]).toMatchObject({ kind: "section", section: { id: "s1" } });

    controller.setSelection({ sectionId: "s1" });
    move(canvas, clientX, clientY);
    expect(seen[seen.length - 1]).toMatchObject({
      kind: "row",
      section: { id: "s1" },
      row: { id: "s1-r1" },
    });
  });

  it("reports a seat when seats are visible", () => {
    const seen: unknown[] = [];
    const { controller, canvas } = makeController({ onHoverChange: (h) => seen.push(h) });
    controller.setSelection({ sectionId: "s1" });
    const { clientX, clientY } = aimAt("l1", 20, 20); // seat a1
    move(canvas, clientX, clientY);
    expect(seen[seen.length - 1]).toMatchObject({
      kind: "seat",
      section: { id: "s1" },
      seat: { id: "a1" },
    });
  });

  it("reports a plain section away from any row", () => {
    const seen: unknown[] = [];
    const { controller, canvas } = makeController({ onHoverChange: (h) => seen.push(h) });
    const { clientX, clientY } = aimAt("l1", 90, 55);
    move(canvas, clientX, clientY);
    expect(seen[seen.length - 1]).toMatchObject({ kind: "section", section: { id: "s1" } });

    // same spot with the section selected: no seat, no row, still a section
    controller.setSelection({ sectionId: "s1" });
    move(canvas, clientX, clientY);
    expect(seen[seen.length - 1]).toMatchObject({ kind: "section", section: { id: "s1" } });
  });

  it("clears the hover when the pointer leaves the venue", () => {
    const seen: unknown[] = [];
    const { controller, canvas } = makeController({ onHoverChange: (h) => seen.push(h) });
    const inside = aimAt("l1", 50, 30);
    move(canvas, inside.clientX, inside.clientY);
    const outside = aimAt("l1", 300, 30);
    move(canvas, outside.clientX, outside.clientY);
    expect(seen[seen.length - 1]).toBeNull();
  });

  it("reports no hover and no click when the ray misses the ground", () => {
    const seen: unknown[] = [];
    const onSectionClick = vi.fn();
    const { controller, canvas } = makeController({
      onHoverChange: (h) => seen.push(h),
      onSectionClick,
    });
    // park the camera level with the ground plane: rays never meet it
    const { cam3d } = controller as unknown as { cam3d: { camera: THREE.PerspectiveCamera } };
    cam3d.camera.position.set(110, 60, 30);
    cam3d.camera.lookAt(110, 60, 300);
    cam3d.camera.updateMatrixWorld();
    move(canvas, W / 2, H / 2);
    tap(canvas, W / 2, H / 2);
    expect(seen[seen.length - 1]).toBeNull();
    expect(onSectionClick).not.toHaveBeenCalled();
    expect(controller.getSelection()).toBeNull();
  });
});

// ---- keyboard and aria ------------------------------------------------------
//
// The 2d svg is role=application with a venue label and Escape clears the
// selection; the 3d canvas must answer to the same basics so a keyboard or
// screen-reader user is not stranded after switching views.

describe("keyboard and aria", () => {
  it("identifies the canvas like the 2d svg does", () => {
    const { controller, canvas } = makeController();
    expect(controller.mode).toBe("3d");
    expect(canvas.getAttribute("role")).toBe("application");
    expect(canvas.getAttribute("aria-label")).toContain("示例场馆");
  });

  it("is focusable and Escape clears the selection", () => {
    const { controller, canvas } = makeController();
    expect(canvas.getAttribute("tabindex")).toBe("0");
    controller.setSelection({ sectionId: "s1" }, false);
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(controller.getSelection()).toBeNull();
  });

  it("leaves other keys alone", () => {
    const { controller, canvas } = makeController();
    controller.setSelection({ sectionId: "s1" }, false);
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(controller.getSelection()).toEqual({ sectionId: "s1" });
  });

  it("detaches the keydown listener on destroy", () => {
    const { controller, canvas } = makeController();
    controller.setSelection({ sectionId: "s1" }, false);
    controller.destroy();
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(controller.getSelection()).toEqual({ sectionId: "s1" });
  });

  it("refreshes the aria-label when the document is swapped", () => {
    const { controller, canvas } = makeController();
    const renamed: VenueDocument = { ...doc, venue: { ...doc.venue, name: "另一场馆" } };
    controller.setDoc(renamed);
    expect(canvas.getAttribute("aria-label")).toContain("另一场馆");
    expect(canvas.getAttribute("aria-label")).not.toContain("示例场馆");
  });
});

// ---- createVenueView -------------------------------------------------------
//
// renderer3d.test.ts can only see the fallback: jsdom has no WebGL, so every
// view it builds degrades to 2D. The 3D success branch is reachable here.

describe("createVenueView with WebGL available", () => {
  it("force3D returns the 3d view when construction succeeds", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    hosts.push(host);

    const view = createVenueView(host, { doc, force3D: true });
    expect(view.mode).toBe("3d");
    expect(view.controller).toBeInstanceOf(SeatMap3DController);
    view.destroy();
    expect(host.childElementCount).toBe(0);
  });

  it("delegates the whole VenueView surface to the 3d controller", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    hosts.push(host);

    const view = createVenueView(host, { doc, force3D: true });
    const ctl = view.controller as SeatMap3DController;

    expect(view.getDoc()).toBe(doc);
    expect(view.getSelection()).toBeNull();

    view.setSelection({ sectionId: "s1", rowId: "s1-r1" });
    expect(view.getSelection()).toEqual({ sectionId: "s1", rowId: "s1-r1" });

    const framed = distance(ctl);
    view.zoomIn();
    expect(distance(ctl)).toBeLessThan(framed);
    view.fit();
    expect(distance(ctl)).toBeCloseTo(framed, 3);
    view.zoomOut();
    view.zoomBy(1.25);
    view.reset();
    expect(distance(ctl)).toBeCloseTo(framed, 3);

    view.setLevel("l2");
    expect(view.getSelection()).toBeNull();
    view.setSelection({ sectionId: "s3" });
    view.clearSelection();
    expect(view.getSelection()).toBeNull();

    view.setDoc(doc, { keepSelection: false });
    expect(view.getDoc()).toBe(doc);
    view.destroy();
  });
});
