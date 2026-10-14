// @vitest-environment jsdom
// Branch coverage for the renderer's fallback paths: optional attributes,
// missing stages, zero-sized hosts, hostile input and defensive guards.
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { SeatMapController, levelDisplayBounds } from "../src/index";
import { htmlEl, svgEl, injectStyles } from "../src/dom.js";
import type { VenueDocument } from "@venue-seats/core";

/**
 * - section s1 carries a priced tier and a mix of seat states (plus a seat with
 *   its own tier, a seat with an unknown tier and a seat without a label)
 * - row r2 and section s2 are sold out, s2 has no tier at all
 */
const doc: VenueDocument = {
  schemaVersion: "1",
  venue: { id: "v", name: "示例场馆" },
  priceTiers: [
    { id: "t1", name: "内场", color: "#ff4d6d", price: 1280 },
    { id: "free", name: "赠票", color: "#00ff00" },
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
              id: "r1",
              label: "1 排",
              seats: [
                { id: "a1", label: "1", x: 20, y: 20, status: "available" },
                { id: "a2", label: "2", x: 40, y: 20, status: "sold" },
                { id: "a3", x: 60, y: 20, status: "held" }, // no label
                { id: "a4", label: "4", x: 80, y: 20, status: "available", priceTierId: "free" },
                { id: "a5", label: "5", x: 90, y: 55, status: "available", priceTierId: "nope" },
              ],
            },
            {
              id: "r2",
              label: "2 排",
              seats: [
                { id: "b1", label: "1", x: 20, y: 45, status: "sold" },
                { id: "b2", label: "2", x: 40, y: 45, status: "sold" },
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
          rows: [{ id: "r3", label: "1 排", seats: [{ id: "c1", label: "1", x: 30, y: 120, status: "sold" }] }],
        },
      ],
    },
  ],
};

const withStage = (stage: VenueDocument["stage"]): VenueDocument => ({ ...doc, stage });

let host: HTMLDivElement;
beforeEach(() => {
  document.body.innerHTML = "";
  host = document.createElement("div");
  document.body.appendChild(host);
});
afterEach(() => vi.unstubAllGlobals());

/** 800x500 css box; jsdom reports 0x0 unless the rect is stubbed */
function stubLayout(h: HTMLElement, w = 800, h2 = 500) {
  h.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: w, bottom: h2, width: w, height: h2, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  const svg = h.querySelector("svg")!;
  svg.getBoundingClientRect = h.getBoundingClientRect;
}

function fire(el: Element, type: string, x: number, y: number, pointerId = 1) {
  const ev = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(ev, "pointerId", { value: pointerId });
  el.dispatchEvent(ev);
}

function key(el: Element, k: string) {
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
}

function toClient(vx: number, vy: number) {
  const vb = host.querySelector("svg")!.getAttribute("viewBox")!.split(/\s+/).map(Number);
  return { x: ((vx - vb[0]) / vb[2]) * 800, y: ((vy - vb[1]) / vb[3]) * 500 };
}

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** private members are erased at runtime; reach them the way the sibling suite does */
function internals<T>(c: unknown): T {
  return c as T;
}

describe("dom helpers", () => {
  it("creates unattached elements without attributes", () => {
    const rect = svgEl("rect");
    expect(rect.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(rect.attributes).toHaveLength(0);
    expect(rect.parentNode).toBeNull();
    const div = htmlEl("div");
    expect(div.attributes).toHaveLength(0);
    expect(div.parentNode).toBeNull();
  });

  it("skips undefined attribute values", () => {
    const rect = svgEl("rect", { x: 1, y: undefined, width: 10 });
    expect(rect.getAttribute("x")).toBe("1");
    expect(rect.hasAttribute("y")).toBe(false);
  });

  it("injects the stylesheet only once", () => {
    injectStyles(document);
    injectStyles(document);
    expect(document.querySelectorAll("style")).toHaveLength(1);
  });
});

describe("levelDisplayBounds", () => {
  // a single small section, so the stage footprint is what grows the box
  const level = {
    id: "l1",
    sections: [{ id: "s1", name: "A", polygon: [[0, 0], [20, 0], [20, 10], [0, 10]] as [number, number][], rows: [] }],
  };

  it("falls back to a neutral box for a level without sections", () => {
    expect(levelDisplayBounds({ id: "l1", sections: [] })).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
  });

  it("ignores the stage when the document has none", () => {
    expect(levelDisplayBounds(level)).toEqual({ minX: 0, minY: 0, maxX: 20, maxY: 10 });
  });

  it("defaults the stage footprint to 240x48", () => {
    // the stage only grows the box: the section already reaches y = 10
    expect(levelDisplayBounds(level, { x: 50, y: 50, rotation: 0 })).toEqual({
      minX: -70,
      minY: 0,
      maxX: 170,
      maxY: 74,
    });
    expect(levelDisplayBounds(level, { x: 50, y: 50, rotation: 0, w: 100, h: 24 })).toEqual({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 62,
    });
  });
});

describe("SeatMapController optional fields", () => {
  it("renders a document without a stage", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    expect(host.querySelector(".vs-stagegroup")).toBeNull();
    expect(host.querySelector(".vs-label--stage")).toBeNull();
    c.destroy();
  });

  it("renders a stage without an explicit footprint", () => {
    const c = new SeatMapController(host, { doc: withStage({ x: 50, y: 50, rotation: 0 }) });
    stubLayout(host);
    const block = host.querySelector(".vs-stage")!;
    expect(block.getAttribute("width")).toBe("240");
    expect(block.getAttribute("height")).toBe("48");
    c.destroy();
  });

  it("colours a seat by its own tier, then by the section, then by the fallback", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    const fill = (id: string) => host.querySelector(`[data-seat="${id}"]`)!.getAttribute("fill");
    expect(fill("a1")).toBe("#ff4d6d"); // section tier
    expect(fill("a4")).toBe("#00ff00"); // seat tier wins
    expect(fill("a5")).toBe("#ff4d6d"); // unknown seat tier falls back to the section
    c.destroy();
  });

  it("labels a section with no tier as sold out", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    expect(host.querySelector('[data-sec="s2"]')!.getAttribute("aria-label")).toBe("B 区，已售罄");
    c.destroy();
  });

  it("labels a seat by its id when it has no label", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    c.setSelection({ sectionId: "s1", rowId: "r1" });
    const label = (id: string) => host.querySelector(`[data-seat="${id}"]`)!.getAttribute("aria-label");
    expect(label("a3")).toBe("a3 号座，已锁定");
    expect(label("a1")).toBe("1 号座，可选");
    c.destroy();
  });

  it("marks a toggled seat as selected for screen readers", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    c.setSelection({ sectionId: "s1", rowId: "r1" });
    const circle = host.querySelector('[data-seat="a1"]')!;
    circle.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(circle.getAttribute("aria-pressed")).toBe("true");
    expect(circle.getAttribute("aria-label")).toBe("1 号座，已选中");
    c.destroy();
  });

  it("skips a seat that is no longer in the level index", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    internals<{ seatById: Map<string, unknown> }>(c).seatById.delete("a1");
    expect(() => c.setSelection({ sectionId: "s1", rowId: "r1" })).not.toThrow();
    expect(host.querySelector('[data-seat="a1"]')!.hasAttribute("aria-label")).toBe(false);
    c.destroy();
  });
});

describe("SeatMapController sizing fallbacks", () => {
  it("fits a host that reports no size", () => {
    const c = new SeatMapController(host, { doc });
    c.fit(); // jsdom reports 0x0 -> the 900x560 fallback
    const [x, y, w, h] = host.querySelector("svg")!.getAttribute("viewBox")!.split(" ").map(Number);
    // the level spans 0..100 x 0..160, centred in a 900x560 box
    expect(x + w / 2).toBeCloseTo(50, 6);
    expect(y + h / 2).toBeCloseTo(80, 6);
    expect(h / w).toBeCloseTo(560 / 900, 6);
    expect(c.pxPerUnit()).toBeCloseTo(900 / w, 6);
    c.zoomIn();
    expect(c.pxPerUnit()).toBeGreaterThan(0);
    c.destroy();
  });

  it("pans on a host that reports no size", () => {
    const c = new SeatMapController(host, { doc });
    const svg = host.querySelector("svg")!;
    const read = () => svg.getAttribute("viewBox")!.split(" ").map(Number);
    const before = read();
    fire(svg, "pointerdown", 400, 250);
    fire(svg, "pointermove", 300, 250);
    fire(svg, "pointerup", 300, 250);
    // the 100px drag moves the viewBox by 100px at the 900px fallback scale
    const after = read();
    expect(after[0]).toBeCloseTo(before[0] - (100 * before[2]) / 900, 6);
    c.destroy();
  });

  it("hit-tests a hover on a host that reports no size", async () => {
    const seen: unknown[] = [];
    const c = new SeatMapController(host, { doc, onHoverChange: (h) => seen.push(h) });
    const svg = host.querySelector("svg")!;
    // the 900x560 fallback box maps client y=105 to venue y=30, inside s1
    fire(svg, "pointermove", 450, 105);
    await frame();
    expect(seen[seen.length - 1]).toMatchObject({ section: { id: "s1" } });
    c.destroy();
  });
});

describe("SeatMapController resize observation", () => {
  it("refits on resize and disconnects on destroy", () => {
    let onResize = () => {};
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          onResize = cb;
        }
        observe = observe;
        disconnect = disconnect;
      },
    );
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    expect(observe).toHaveBeenCalledWith(host.querySelector(".vs-map"));
    const fitted = host.querySelector("svg")!.getAttribute("viewBox");
    c.zoomIn();
    expect(host.querySelector("svg")!.getAttribute("viewBox")).not.toBe(fitted);
    onResize();
    expect(host.querySelector("svg")!.getAttribute("viewBox")).toBe(fitted);
    c.destroy();
    expect(disconnect).toHaveBeenCalled();
  });
});

describe("SeatMapController guards", () => {
  it("keeps the selection across setDoc when asked", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    c.setSelection({ sectionId: "s1", rowId: "r1" });
    const other = structuredClone(doc);
    other.venue.name = "另一个场馆";
    c.setDoc(other, { keepSelection: true });
    expect(c.getSelection()).toEqual({ sectionId: "s1", rowId: "r1" });
    c.setDoc(other);
    expect(c.getSelection()).toBeNull();
    c.destroy();
  });

  it("keeps the current row when the arrow step cannot leave it", () => {
    const onSelectionChange = vi.fn();
    const c = new SeatMapController(host, { doc, onSelectionChange });
    stubLayout(host);
    c.setSelection({ sectionId: "s1", rowId: "r1" });
    onSelectionChange.mockClear();
    internals<{ moveRowSelection: (d: number) => void }>(c).moveRowSelection(-1);
    expect(c.getSelection()).toEqual({ sectionId: "s1", rowId: "r1" });
    expect(onSelectionChange).not.toHaveBeenCalled();
    c.destroy();
  });

  it("moves up a row with ArrowUp", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    c.setSelection({ sectionId: "s1", rowId: "r2" });
    key(host.querySelector("svg")!, "ArrowUp");
    expect(c.getSelection()).toEqual({ sectionId: "s1", rowId: "r1" });
    c.destroy();
  });

  it("activates a section with Space", () => {
    const onSectionClick = vi.fn();
    const c = new SeatMapController(host, { doc, onSectionClick });
    stubLayout(host);
    key(host.querySelector('[data-sec="s1"]')!, " ");
    expect(onSectionClick).toHaveBeenCalledTimes(1);
    expect(c.getSelection()).toEqual({ sectionId: "s1" });
    c.destroy();
  });

  it("ignores keys it does not handle", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    key(host.querySelector('[data-sec="s1"]')!, "Tab");
    expect(c.getSelection()).toBeNull();
    c.destroy();
  });

  it("ignores Enter on a seat when no section is selected", () => {
    const onSeatToggle = vi.fn();
    const c = new SeatMapController(host, { doc, onSeatToggle });
    stubLayout(host);
    key(host.querySelector('[data-seat="a1"]')!, "Enter");
    expect(onSeatToggle).not.toHaveBeenCalled();
    c.destroy();
  });

  it("ignores a click outside every section while nothing is selected", () => {
    const onSelectionChange = vi.fn();
    const c = new SeatMapController(host, { doc, onSelectionChange });
    stubLayout(host);
    c.fit();
    const svg = host.querySelector("svg")!;
    fire(svg, "pointerdown", 795, 5);
    fire(svg, "pointerup", 795, 5);
    expect(c.getSelection()).toBeNull();
    expect(onSelectionChange).not.toHaveBeenCalled();
    c.destroy();
  });

  it("survives a third finger landing mid-pinch", () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    c.fit();
    const svg = host.querySelector("svg")!;
    fire(svg, "pointerdown", 300, 250, 1);
    fire(svg, "pointerdown", 500, 250, 2);
    fire(svg, "pointerdown", 400, 250, 3);
    fire(svg, "pointerup", 400, 250, 3);
    fire(svg, "pointerup", 500, 250, 2);
    fire(svg, "pointerup", 300, 250, 1);
    expect(c.pxPerUnit()).toBeGreaterThan(0);
    c.destroy();
  });
});

describe("SeatMapController hover", () => {
  it("reports no hover outside every section", async () => {
    const seen: unknown[] = [];
    const c = new SeatMapController(host, { doc, onHoverChange: (h) => seen.push(h) });
    stubLayout(host);
    c.fit();
    const svg = host.querySelector("svg")!;
    const inside = toClient(50, 30);
    fire(svg, "pointermove", inside.x, inside.y);
    await frame();
    expect(seen[seen.length - 1]).toMatchObject({ kind: "section" });
    fire(svg, "pointermove", 795, 5);
    await frame();
    expect(seen[seen.length - 1]).toBeNull();
    c.destroy();
  });

  it("previews rows but no seats while seats are hidden", async () => {
    const seen: unknown[] = [];
    const c = new SeatMapController(host, { doc, seatVisibleAt: 1e9, onHoverChange: (h) => seen.push(h) });
    stubLayout(host);
    c.fit();
    c.setSelection({ sectionId: "s1" });
    const svg = host.querySelector("svg")!;
    const p = toClient(60, 25); // seat a3, i.e. right on row r1
    fire(svg, "pointermove", p.x, p.y);
    await frame();
    expect(seen[seen.length - 1]).toMatchObject({ kind: "row", row: { id: "r1" } });
    c.destroy();
  });

  it("drops a hover that resolved to no row", async () => {
    const seen: unknown[] = [];
    const c = new SeatMapController(host, { doc, onHoverChange: (h) => seen.push(h) });
    stubLayout(host);
    c.fit();
    c.setSelection({ sectionId: "s1" });
    const svg = host.querySelector("svg")!;
    // inside s1 but far from both rows, beyond the 40 unit row hit radius
    const p = toClient(95, 2);
    fire(svg, "pointermove", p.x, p.y);
    await frame();
    expect(seen[seen.length - 1]).toMatchObject({ kind: "section", section: { id: "s1" } });
    c.destroy();
  });
});

describe("SeatMapController tooltip", () => {
  const hover = async (c: SeatMapController, vx: number, vy: number) => {
    const p = toClient(vx, vy);
    fire(host.querySelector("svg")!, "pointermove", p.x, p.y);
    await frame();
    return host.querySelector(".vs-tooltip")!.innerHTML;
  };

  it("shows the price of a priced tier", async () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    c.fit();
    c.setSelection({ sectionId: "s1" });
    const html = await hover(c, 20, 20);
    expect(html).toContain("vs-dot");
    expect(html).toContain("¥1280");
    expect(html).toContain("内场 · ");
    c.destroy();
  });

  it("omits the price for a tier that has none", async () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    c.fit();
    c.setSelection({ sectionId: "s1" });
    const html = await hover(c, 80, 20); // seat a4, tier "free"
    expect(html).toContain("vs-dot");
    expect(html).not.toContain("¥");
    expect(html).toContain("赠票");
    c.destroy();
  });

  it("omits the tier entirely for an untiered section", async () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    c.fit();
    const html = await hover(c, 50, 130); // section s2, no price tier
    expect(html).not.toContain("vs-dot");
    expect(html).not.toContain("¥");
    expect(html).toContain("<b>B 区</b>");
    c.destroy();
  });

  it("reports a sold-out row and a sold-out section", async () => {
    const c = new SeatMapController(host, { doc });
    stubLayout(host);
    c.fit();
    c.setSelection({ sectionId: "s1" });
    expect(await hover(c, 30, 45)).toContain("已售罄"); // row r2
    expect(await hover(c, 50, 130)).toContain("已售罄"); // section s2
    c.destroy();
  });
});