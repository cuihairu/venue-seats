// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from "vitest";
import { SeatMapController, polygonPath, fitViewBox, zoomViewBox } from "../src/index";
import type { VenueDocument } from "@venue-seats/core";

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
                { id: "b1", label: "1", x: 20, y: 45, status: "available" },
                { id: "b2", label: "2", x: 40, y: 45, status: "available" },
              ],
            },
          ],
        },
        {
          id: "s2",
          name: "B 区",
          polygon: [
            [0, 100],
            [100, 100],
            [100, 160],
            [0, 160],
          ],
          priceTierId: "t2",
          rows: [
            {
              id: "s2-r1",
              label: "1 排",
              seats: [
                { id: "c1", label: "1", x: 30, y: 120, status: "available" },
                { id: "c2", label: "2", x: 60, y: 120, status: "held" },
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
            [80, 40],
            [0, 40],
          ],
          priceTierId: "t2",
          rows: [{ id: "s3-r1", label: "1 排", seats: [{ id: "d1", label: "1", x: 40, y: 20, status: "available" }] }],
        },
      ],
    },
  ],
};

// jsdom has no layout: give the host a fixed box
function stubLayout(host: HTMLElement, w = 800, h = 500) {
  host.getBoundingClientRect = () => ({ left: 0, top: 0, right: w, bottom: h, width: w, height: h, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
  const svg = host.querySelector("svg")!;
  svg.getBoundingClientRect = host.getBoundingClientRect;
  return { w, h };
}

function fire(el: Element, type: string, x: number, y: number, pointerId = 1) {
  // jsdom has no PointerEvent; the pinch tests need real ids on the events
  const ev = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(ev, "pointerId", { value: pointerId });
  el.dispatchEvent(ev);
}

let host: HTMLDivElement;
beforeEach(() => {
  document.body.innerHTML = "";
  host = document.createElement("div");
  Object.defineProperty(host, "clientWidth", { value: 800 });
  document.body.appendChild(host);
});

describe("SeatMapController rendering", () => {
  it("builds sections, seats, labels and stage", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    c.fit();
    expect(host.querySelectorAll(".vs-section").length).toBe(2);
    expect(host.querySelectorAll(".vs-seat").length).toBe(7);
    expect(host.querySelectorAll(".vs-seat--sold").length).toBe(1);
    expect(host.querySelectorAll(".vs-seat--held").length).toBe(1);
    expect(host.querySelector(".vs-stage")).toBeTruthy();
    expect(host.querySelector(".vs-label--stage")?.textContent).toContain("舞台");
    // tier colour reaches the seat fill
    const seat = host.querySelector('[data-seat="a1"]') as SVGCircleElement;
    expect(seat.getAttribute("fill")).toBe("#ff4d6d");
    c.destroy();
  });

  it("switches levels and clears the selection", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    c.setSelection({ sectionId: "s1", rowId: "s1-r1" });
    let selection = c.getSelection();
    expect(selection).toEqual({ sectionId: "s1", rowId: "s1-r1" });
    c.setLevel("l2");
    expect(c.levelId).toBe("l2");
    expect(c.getSelection()).toBeNull();
    expect(host.querySelectorAll(".vs-section").length).toBe(1);
    c.destroy();
  });

  it("marks sold-out sections", () => {
    const d2 = structuredClone(doc);
    for (const r of d2.levels[0].sections[1].rows) for (const s of r.seats) s.status = "sold";
    const c = new SeatMapController(host, { doc: d2 });
    stubLayout(host);
    const none = host.querySelector('[data-sec="s2"]');
    expect(none?.classList.contains("vs-section--none")).toBe(true);
    c.destroy();
  });
});

describe("SeatMapController hit-testing (core sectionAt/rowAt)", () => {
  it("selects a section on click, then a row inside it", () => {
    const onSectionClick = vi.fn();
    const onRowClick = vi.fn();
    const c = new SeatMapController(host, { doc, onSectionClick, onRowClick });
    stubLayout(host, 800, 500);
    c.fit();
    // venue (50,30) lands where? fit of bounds(-140..190 x, -12..184 y with stage)
    // compute: use clientToVenue inverse via controller is easier: pick client point for venue point
    const toClient = (vx: number, vy: number) => {
      const vbStr = (host.querySelector("svg") as SVGSVGElement).getAttribute("viewBox")!.split(" ").map(Number);
      const [vx0, vy0, vw, vh] = vbStr;
      return { x: ((vx - vx0) / vw) * 800, y: ((vy - vy0) / vh) * 500 };
    };
    const p = toClient(50, 30); // inside A 区 near row 1
    fire(host.querySelector("svg")!, "pointerdown", p.x, p.y);
    fire(host.querySelector("svg")!, "pointerup", p.x, p.y);
    expect(onSectionClick).toHaveBeenCalledOnce();
    expect(c.getSelection()?.sectionId).toBe("s1");
    expect(c.getSelection()?.rowId).toBeUndefined();

    // second click inside the same section near row 2 selects the row
    const p2 = toClient(50, 45);
    fire(host.querySelector("svg")!, "pointerdown", p2.x, p2.y);
    fire(host.querySelector("svg")!, "pointerup", p2.x, p2.y);
    expect(onRowClick).toHaveBeenCalledOnce();
    expect(c.getSelection()).toEqual({ sectionId: "s1", rowId: "s1-r2" });
    c.destroy();
  });

  it("clears the selection when clicking outside any section", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host, 800, 500);
    c.fit();
    c.setSelection({ sectionId: "s1" });
    // venue point far from everything: top-right corner of the fitted viewBox
    const vb = (host.querySelector("svg") as SVGSVGElement).getAttribute("viewBox")!.split(" ").map(Number);
    fire(host.querySelector("svg")!, "pointerdown", 795, 5);
    fire(host.querySelector("svg")!, "pointerup", 795, 5);
    void vb;
    expect(c.getSelection()).toBeNull();
    c.destroy();
  });

  it("does not treat a drag as a click", () => {
    const onSectionClick = vi.fn();
    const c = new SeatMapController(host, { doc, onSectionClick });
    stubLayout(host, 800, 500);
    c.fit();
    const svg = host.querySelector("svg")!;
    fire(svg, "pointerdown", 400, 250);
    fire(svg, "pointermove", 480, 310);
    fire(svg, "pointerup", 480, 310);
    expect(onSectionClick).not.toHaveBeenCalled();
    c.destroy();
  });
});

describe("touch: two-finger pinch", () => {
  it("zoomViewBox pins the pivot while resizing", () => {
    const vb = { x: 0, y: 0, w: 100, h: 60 };
    const out = zoomViewBox(vb, 2, 40, 30, 0.01, 10000);
    expect(out.w).toBeCloseTo(50, 10);
    expect(out.h).toBeCloseTo(30, 10);
    // the venue point under the pivot stays put
    expect(out.x + (40 / 100) * out.w).toBeCloseTo(40, 10);
    expect(out.y + (30 / 60) * out.h).toBeCloseTo(30, 10);
  });

  it("spreads two fingers to zoom in and squeezes to zoom out", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host, 800, 500);
    c.fit();
    const atFit = c.pxPerUnit();
    const svg = host.querySelector("svg")!;
    fire(svg, "pointerdown", 300, 250, 1);
    fire(svg, "pointerdown", 500, 250, 2);
    fire(svg, "pointermove", 200, 250, 1);
    fire(svg, "pointermove", 600, 250, 2);
    const zoomed = c.pxPerUnit();
    expect(zoomed).toBeGreaterThan(atFit);
    fire(svg, "pointermove", 350, 250, 1);
    fire(svg, "pointermove", 450, 250, 2);
    expect(c.pxPerUnit()).toBeLessThan(zoomed);
    fire(svg, "pointerup", 600, 250, 2);
    fire(svg, "pointerup", 200, 250, 1);
    c.destroy();
  });

  it("does not activate a section on a pinch", () => {
    const onSectionClick = vi.fn();
    const c = new SeatMapController(host, { doc, onSectionClick });
    stubLayout(host, 800, 500);
    c.fit();
    const svg = host.querySelector("svg")!;
    fire(svg, "pointerdown", 300, 250, 1);
    fire(svg, "pointerdown", 500, 250, 2);
    fire(svg, "pointermove", 200, 250, 1);
    fire(svg, "pointermove", 600, 250, 2);
    fire(svg, "pointerup", 600, 250, 2);
    fire(svg, "pointerup", 200, 250, 1);
    expect(onSectionClick).not.toHaveBeenCalled();
    expect(c.getSelection()).toBeNull();
    c.destroy();
  });

  it("pans with one finger while keeping the selection", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host, 800, 500);
    c.fit();
    const svg = host.querySelector("svg")!;
    fire(svg, "pointerdown", 400, 250);
    fire(svg, "pointermove", 300, 250);
    fire(svg, "pointerup", 300, 250);
    const before = c.pxPerUnit();
    fire(svg, "pointerdown", 400, 250);
    fire(svg, "pointermove", 260, 260);
    fire(svg, "pointerup", 260, 260);
    expect(c.pxPerUnit()).toBeCloseTo(before, 5); // a pan never rescales
    c.destroy();
  });
});

describe("SeatMapController zoom & keyboard", () => {
  it("zooms via zoomBy and clamps", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host, 800, 500);
    c.fit();
    const vb0 = c.pxPerUnit();
    c.zoomIn();
    expect(c.pxPerUnit()).toBeGreaterThan(vb0 * 1.3);
    for (let i = 0; i < 40; i++) c.zoomIn(); // clamped
    expect(c.pxPerUnit()).toBeLessThan(vb0 * 100);
    c.reset?.();
    c.destroy();
  });

  it("zooms around the selected section, not the view centre", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host, 800, 500);
    c.fit();
    const svg = host.querySelector("svg")!;
    const readVB = () => svg.getAttribute("viewBox")!.split(/\s+/).map(Number);
    // relative position of a point inside the viewbox, x1000 for readable tolerances
    const rel = (vb: number[], x: number, y: number): number[] => [
      ((x - vb[0]) / vb[2]) * 1000,
      ((y - vb[1]) / vb[3]) * 1000,
    ];
    const vb0 = readVB();
    const sec = rel(vb0, 50, 30); // centroid of section s1
    const centre = rel(vb0, vb0[0] + vb0[2] / 2, vb0[1] + vb0[3] / 2);
    c.setSelection({ sectionId: "s1" });
    c.zoomIn();
    const vb1 = readVB();
    // the selected section stays put
    expect(rel(vb1, 50, 30)[0]).toBeCloseTo(sec[0], 3);
    expect(rel(vb1, 50, 30)[1]).toBeCloseTo(sec[1], 3);
    // ...so the previous view centre moved: the section was the anchor
    const centreAfter = rel(vb1, vb0[0] + vb0[2] / 2, vb0[1] + vb0[3] / 2);
    expect(Math.abs(centreAfter[0] - centre[0])).toBeGreaterThan(0.5);
    c.destroy();
  });

  it("activates a focused section with Enter and moves rows with arrows", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host, 800, 500);
    c.fit();
    const path = host.querySelector<SVGPathElement>('[data-sec="s1"]')!;
    path.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(c.getSelection()?.sectionId).toBe("s1");
    // select row 1 first, then ArrowDown moves to row 2
    c.setSelection({ sectionId: "s1", rowId: "s1-r1" });
    host.querySelector("svg")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(c.getSelection()).toEqual({ sectionId: "s1", rowId: "s1-r2" });
    host.querySelector("svg")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(c.getSelection()).toBeNull();
    c.destroy();
  });

  it("refreshes the svg aria-label when the document is swapped", () => {
    const c = new SeatMapController(host, { doc });
    const renamed: VenueDocument = { ...doc, venue: { ...doc.venue, name: "另一场馆" } };
    c.setDoc(renamed);
    const svg = host.querySelector("svg")!;
    expect(svg.getAttribute("aria-label")).toContain("另一场馆");
    expect(svg.getAttribute("aria-label")).not.toContain("示例场馆");
    c.destroy();
  });
});

describe("seat visibility by zoom", () => {
  it("hides seats zoomed out and shows them zoomed in", () => {
    const c = new SeatMapController(host, { doc, seatVisibleAt: 2 });
    stubLayout(host, 800, 500);
    c.fit();
    expect(c.isSeatsVisible()).toBe(false);
    expect(host.querySelector(".vs-map")!.classList.contains("vs-zoomed-out")).toBe(true);
    for (let i = 0; i < 20; i++) c.zoomIn();
    expect(c.isSeatsVisible()).toBe(true);
    expect(host.querySelector(".vs-map")!.classList.contains("vs-zoomed-out")).toBe(false);
    c.destroy();
  });
});

describe("SeatMapController seat selection (L2)", () => {
  const toClient = (vx: number, vy: number) => {
    const vb = (host.querySelector("svg") as SVGSVGElement).getAttribute("viewBox")!.split(" ").map(Number);
    return { x: ((vx - vb[0]) / vb[2]) * 800, y: ((vy - vb[1]) / vb[3]) * 500 };
  };
  const click = (c: SeatMapController, vx: number, vy: number) => {
    const p = toClient(vx, vy);
    fire(host.querySelector("svg")!, "pointerdown", p.x, p.y);
    fire(host.querySelector("svg")!, "pointerup", p.x, p.y);
  };

  it("toggles a seat on click once its section is selected", () => {
    const onSeatToggle = vi.fn();
    const c = new SeatMapController(host, { doc, onSeatToggle });
    stubLayout(host, 800, 500);
    c.fit();
    click(c, 50, 30); // first click only selects the section (no seat within reach)
    expect(c.getSelection()?.sectionId).toBe("s1");
    expect(onSeatToggle).not.toHaveBeenCalled();

    click(c, 20, 20); // exactly on seat a1 -> toggles to selected
    expect(onSeatToggle).toHaveBeenCalledOnce();
    expect(onSeatToggle.mock.calls[0][0].id).toBe("a1");
    expect(onSeatToggle.mock.calls[0][0].status).toBe("selected");
    expect(onSeatToggle.mock.calls[0][1].id).toBe("s1");
    expect(host.querySelector('[data-seat="a1"]')!.classList.contains("vs-seat--selected")).toBe(true);

    click(c, 20, 20); // toggles back
    expect(onSeatToggle).toHaveBeenCalledTimes(2);
    expect(onSeatToggle.mock.calls[1][0].status).toBe("available");
    expect(host.querySelector('[data-seat="a1"]')!.classList.contains("vs-seat--selected")).toBe(false);
    // row selection is untouched by seat toggles
    expect(c.getSelection()).toEqual({ sectionId: "s1" });
    c.destroy();
  });

  it("ignores a sold seat", () => {
    const onSeatToggle = vi.fn();
    const c = new SeatMapController(host, { doc, onSeatToggle });
    stubLayout(host, 800, 500);
    c.fit();
    click(c, 50, 30);
    click(c, 40, 20); // a2 is sold
    expect(onSeatToggle).not.toHaveBeenCalled();
    expect(host.querySelector('[data-seat="a2"]')!.classList.contains("vs-seat--selected")).toBe(false);
    c.destroy();
  });

  it("still selects a row when the click misses every seat", () => {
    const onRowClick = vi.fn();
    const c = new SeatMapController(host, { doc, onRowClick });
    stubLayout(host, 800, 500);
    c.fit();
    click(c, 50, 30); // section
    click(c, 50, 45); // 10 units from both b1 (20,45) and b2 (40,45): row logic
    expect(c.getSelection()).toEqual({ sectionId: "s1", rowId: "s1-r2" });
    expect(onRowClick).toHaveBeenCalledOnce();
    c.destroy();
  });

  it("falls back to row selection while seats are not visible", () => {
    const onSeatToggle = vi.fn();
    const onRowClick = vi.fn();
    const c = new SeatMapController(host, { doc, onSeatToggle, onRowClick, seatVisibleAt: 2 });
    stubLayout(host, 800, 500);
    c.fit();
    expect(c.isSeatsVisible()).toBe(false);
    click(c, 50, 30);
    expect(c.getSelection()?.sectionId).toBe("s1");
    click(c, 20, 20); // would be seat a1, but seats are hidden at this zoom
    expect(onSeatToggle).not.toHaveBeenCalled();
    expect(onRowClick).toHaveBeenCalledOnce();
    expect(c.getSelection()).toEqual({ sectionId: "s1", rowId: "s1-r1" });
    c.destroy();
  });

  it("toggles a seat of the selected row with Enter", () => {
    const onSeatToggle = vi.fn();
    const c = new SeatMapController(host, { doc, onSeatToggle });
    stubLayout(host, 800, 500);
    c.fit();
    c.setSelection({ sectionId: "s1", rowId: "s1-r1" });
    const a1 = host.querySelector<SVGCircleElement>('[data-seat="a1"]')!;
    const b1 = host.querySelector<SVGCircleElement>('[data-seat="b1"]')!;
    expect(a1.getAttribute("tabindex")).toBe("0");
    expect(a1.getAttribute("aria-pressed")).toBe("false");
    expect(a1.getAttribute("aria-label")).toContain("号座");
    expect(b1.getAttribute("tabindex")).toBeNull();
    a1.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(onSeatToggle).toHaveBeenCalledOnce();
    expect(onSeatToggle.mock.calls[0][0].status).toBe("selected");
    expect(a1.getAttribute("aria-pressed")).toBe("true");
    // Space toggles it back
    a1.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(onSeatToggle).toHaveBeenCalledTimes(2);
    expect(onSeatToggle.mock.calls[1][0].status).toBe("available");
    c.destroy();
  });
});

describe("geometry helpers", () => {
  it("polygonPath emits a closed path", () => {
    const d = polygonPath([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    expect(d.startsWith("M0 0")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
  });

  it("fitViewBox contains the bounds with padding", () => {
    const vb = fitViewBox({ minX: 0, minY: 0, maxX: 100, maxY: 50 }, 400, 400);
    expect(vb.w).toBeGreaterThanOrEqual(100);
    expect(vb.h).toBeGreaterThanOrEqual(50);
  });
});
