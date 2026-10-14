// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { levelById, levelBounds, sectionColor } from "@venue-seats/core";
import type { VenueDocument } from "@venue-seats/core";
import { SeatMapController } from "@venue-seats/renderer";
import {
  applySelection3D,
  applyStatuses3D,
  buildScene3D,
  createVenueCamera,
  createVenueView,
  pxPerUnit3D,
  probe3D,
  resolveVenueActivate,
  supports3D,
  use3D,
  venueFromRay,
} from "../src/index";

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

const level1 = levelById(doc, "l1")!;
const level2 = levelById(doc, "l2")!;

function colorAt(scene: ReturnType<typeof buildScene3D>, seatId: string): THREE.Color {
  const index = scene.seatIndex.get(seatId);
  expect(index, `seat ${seatId} in scene`).toBeDefined();
  const color = new THREE.Color();
  scene.seats.getColorAt(index!, color);
  return color;
}

function scaleAt(scene: ReturnType<typeof buildScene3D>, seatId: string): number {
  const index = scene.seatIndex.get(seatId)!;
  const m = new THREE.Matrix4();
  scene.seats.getMatrixAt(index, m);
  return new THREE.Vector3().setFromMatrixScale(m).x;
}

function yAt(scene: ReturnType<typeof buildScene3D>, seatId: string): number {
  const index = scene.seatIndex.get(seatId)!;
  const m = new THREE.Matrix4();
  scene.seats.getMatrixAt(index, m);
  return new THREE.Vector3().setFromMatrixPosition(m).y;
}

describe("capability", () => {
  it("probe3D reports no webgl in jsdom", () => {
    const probe = probe3D();
    expect(probe.webgl).toBe(false);
    expect(typeof probe.lowEnd).toBe("boolean");
    expect(supports3D()).toBe(false);
  });
});

describe("buildScene3D", () => {
  it("builds one extruded mesh per section", () => {
    const scene = buildScene3D(doc);
    expect(scene.sectionMeshes).toHaveLength(2);
    for (const mesh of scene.sectionMeshes) {
      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.geometry).toBeInstanceOf(THREE.ExtrudeGeometry);
    }
  });

  it("builds one instanced seat per seat with status colors", () => {
    const scene = buildScene3D(doc);
    expect(scene.seats.count).toBe(7);
    expect(scene.seatIndex.get("a1")).toBeDefined();

    const tier = new THREE.Color(sectionColor(doc, level1.sections[0]));
    expect(colorAt(scene, "a1").r).toBeCloseTo(tier.r, 3);
    expect(colorAt(scene, "a1").g).toBeCloseTo(tier.g, 3);
    expect(colorAt(scene, "a1").b).toBeCloseTo(tier.b, 3);

    expect(colorAt(scene, "a2").getHexString()).toBe("333c50"); // sold
    expect(colorAt(scene, "b2").getHexString()).toBe("3d4a63"); // held
  });

  it("places seats at venue coordinates", () => {
    const scene = buildScene3D(doc);
    const index = scene.seatIndex.get("a1")!;
    const m = new THREE.Matrix4();
    scene.seats.getMatrixAt(index, m);
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    expect(pos.x).toBeCloseTo(20, 5);
    expect(pos.z).toBeCloseTo(20, 5);
    expect(pos.y).toBeCloseTo(3.4, 5); // sphere centre on the slab top
  });

  it("builds stage and ground", () => {
    const scene = buildScene3D(doc);
    expect(scene.stage).toBeInstanceOf(THREE.Mesh);
    expect(scene.stage.position.x).toBeCloseTo(150, 5);
    expect(scene.stage.position.z).toBeCloseTo(260, 5);
    expect(scene.ground).toBeInstanceOf(THREE.Mesh);
  });

  it("switches levels and rejects unknown ones", () => {
    expect(buildScene3D(doc, "l2").seats.count).toBe(2);
    expect(buildScene3D(doc).seats.count).toBe(7); // defaults to first level
    expect(() => buildScene3D(doc, "nope")).toThrow();
  });
});

describe("pxPerUnit3D", () => {
  it("matches the pinhole formula", () => {
    const expected = 500 / (2 * 100 * Math.tan(Math.PI / 8));
    expect(pxPerUnit3D(500, 100, 45)).toBeCloseTo(expected, 9);
  });

  it("grows with viewport height and shrinks with distance", () => {
    expect(pxPerUnit3D(1000, 100, 45)).toBeGreaterThan(pxPerUnit3D(500, 100, 45));
    expect(pxPerUnit3D(500, 200, 45)).toBeLessThan(pxPerUnit3D(500, 100, 45));
  });
});

describe("venueFromRay", () => {
  it("maps the screen centre to the look-at target", () => {
    const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 1000);
    camera.position.set(50, 100, 30);
    camera.lookAt(50, 0, 30);
    camera.updateMatrixWorld();
    const hit = venueFromRay(camera, 0, 0)!;
    expect(hit.x).toBeCloseTo(50, 1);
    expect(hit.y).toBeCloseTo(30, 1);
  });

  it("createVenueCamera frames the level bounds", () => {
    const bounds = levelBounds(level1)!;
    const cam = createVenueCamera(bounds, 2);
    const hit = venueFromRay(cam.camera, 0, 0)!;
    expect(hit.x).toBeCloseTo((bounds.minX + bounds.maxX) / 2, 4);
    expect(hit.y).toBeCloseTo((bounds.minY + bounds.maxY) / 2, 4);
  });

  it("round-trips a projected venue point", () => {
    const bounds = levelBounds(level1)!;
    const cam = createVenueCamera(bounds, 2);
    const ndc = new THREE.Vector3(60, 0, 40).project(cam.camera);
    const back = venueFromRay(cam.camera, ndc.x, ndc.y)!;
    expect(back.x).toBeCloseTo(60, 4);
    expect(back.y).toBeCloseTo(40, 4);
  });
});

describe("applySelection3D / applyStatuses3D", () => {
  it("lifts and scales the selected row, restores on clear", () => {
    const scene = buildScene3D(doc);
    applySelection3D(scene, { sectionId: "s1", rowId: "s1-r1" });
    expect(scaleAt(scene, "a1")).toBeGreaterThan(1.3);
    expect(scaleAt(scene, "a1")).toBeLessThan(1.5);
    expect(scaleAt(scene, "c1")).toBeCloseTo(1, 5);
    expect(yAt(scene, "a1")).toBeGreaterThan(3.4);

    applySelection3D(scene, null);
    expect(scaleAt(scene, "a1")).toBeCloseTo(1, 5);
    expect(yAt(scene, "a1")).toBeCloseTo(3.4, 5);
  });

  it("paints seat overrides and restores the document status", () => {
    const scene = buildScene3D(doc);
    applyStatuses3D(scene, new Map([["a1", "selected"]]));
    expect(colorAt(scene, "a1").getHexString()).toBe("ffffff");
    // an override wins over the document status
    applyStatuses3D(scene, new Map([["a2", "selected"]]));
    expect(colorAt(scene, "a2").getHexString()).toBe("ffffff");

    applyStatuses3D(scene, new Map());
    expect(colorAt(scene, "a1").getHexString()).toBe(
      new THREE.Color(sectionColor(doc, level1.sections[0])).getHexString(),
    );
    expect(colorAt(scene, "a2").getHexString()).toBe("333c50");
  });
});

describe("resolveVenueActivate", () => {
  const opts = { selection: null, seatsVisible: false, seatRadius: 3.4 };

  it("selects a section on first click", () => {
    const hit = resolveVenueActivate(level1, 50, 30, opts);
    expect(hit.type).toBe("select-section");
    if (hit.type === "select-section") expect(hit.section.id).toBe("s1");
  });

  it("toggles a seat when seats are visible", () => {
    const hit = resolveVenueActivate(level1, 20, 20, {
      ...opts,
      selection: { sectionId: "s1" },
      seatsVisible: true,
    });
    expect(hit.type).toBe("toggle-seat");
    if (hit.type === "toggle-seat") expect(hit.seat.id).toBe("a1");
  });

  it("falls back to row selection when seats are hidden", () => {
    const hit = resolveVenueActivate(level1, 20, 20, {
      ...opts,
      selection: { sectionId: "s1" },
      seatsVisible: false,
    });
    expect(hit.type).toBe("select-row");
    if (hit.type === "select-row") expect(hit.row.id).toBe("s1-r1");
  });

  it("clears the selection outside sections", () => {
    expect(resolveVenueActivate(level1, 500, 500, opts).type).toBe("clear");
  });

  it("resolves sold seats too (the controller guards them)", () => {
    const hit = resolveVenueActivate(level1, 40, 20, {
      ...opts,
      selection: { sectionId: "s1" },
      seatsVisible: true,
    });
    expect(hit.type).toBe("toggle-seat");
    if (hit.type === "toggle-seat") expect(hit.seat.id).toBe("a2");
  });
});

describe("narrow viewport degradation", () => {
  function setViewport(width: number): void {
    Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  }

  afterEach(() => {
    setViewport(1024); // jsdom default
  });

  it("probe3D reports a narrow viewport on phone widths", () => {
    setViewport(390);
    expect(probe3D().narrow).toBe(true);
    setViewport(1440);
    expect(probe3D().narrow).toBe(false);
  });

  it("supports3D is false on a narrow viewport", () => {
    setViewport(390);
    expect(supports3D()).toBe(false);
  });

  it("use3D honours force3D over the narrow-viewport gate", () => {
    setViewport(390);
    expect(use3D()).toBe(false);
    expect(use3D({ force3D: true })).toBe(true);
  });

  it("createVenueView degrades to 2d on a narrow viewport", () => {
    setViewport(390);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const view = createVenueView(host, { doc });
    expect(view.mode).toBe("2d");
    view.destroy();
  });

  it("force3D still attempts 3d on a narrow viewport and falls back here", () => {
    setViewport(390);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const view = createVenueView(host, { doc, force3D: true });
    expect(view.mode).toBe("2d"); // 3d attempted, WebGL construction fails in jsdom
    view.destroy();
  });
});

describe("createVenueView", () => {
  it("falls back to the 2d controller without webgl", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const view = createVenueView(host, { doc });
    expect(view.mode).toBe("2d");
    expect(view.controller).toBeInstanceOf(SeatMapController);
    view.destroy();
  });

  it("force3d falls back when webgl construction fails", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const view = createVenueView(host, { doc, force3D: true });
    expect(view.mode).toBe("2d");
    expect(view.controller).toBeInstanceOf(SeatMapController);
    view.destroy();
  });

  it("selection interops through the view", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const view = createVenueView(host, { doc });
    view.setSelection({ sectionId: "s1", rowId: "s1-r1" });
    expect(view.getSelection()).toEqual({ sectionId: "s1", rowId: "s1-r1" });
    view.clearSelection();
    expect(view.getSelection()).toBeNull();
    view.destroy();
    expect(host.childElementCount).toBe(0);
  });

  it("delegates the whole VenueView surface to the 2d controller", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    host.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 800, height: 500, right: 800, bottom: 500, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    const view = createVenueView(host, { doc });
    const ctl = view.controller as SeatMapController;
    ctl.fit();
    const framed = ctl.pxPerUnit();

    expect(view.getDoc()).toBe(doc);
    expect(view.getSelection()).toBeNull();
    view.setSelection({ sectionId: "s1", rowId: "s1-r1" });
    expect(view.getSelection()).toEqual({ sectionId: "s1", rowId: "s1-r1" });

    view.zoomIn();
    expect(ctl.pxPerUnit()).toBeGreaterThan(framed);
    view.zoomOut();
    view.zoomBy(1.1);
    view.fit();
    expect(ctl.pxPerUnit()).toBeCloseTo(framed, 3);
    view.reset();
    expect(ctl.pxPerUnit()).toBeCloseTo(framed, 3);

    view.setLevel("l2");
    expect(view.getSelection()).toBeNull();
    view.setDoc(doc, { keepSelection: false });
    expect(view.getDoc()).toBe(doc);
    view.clearSelection();
    expect(view.getSelection()).toBeNull();
    view.destroy();
    expect(host.childElementCount).toBe(0);
  });
});
