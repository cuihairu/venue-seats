// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { VenueSeatMap } from "../src/index";
import type { VenueDocument } from "@venue-seats/core";

const doc: VenueDocument = {
  schemaVersion: "1",
  venue: { id: "v", name: "示例场馆" },
  provenance: "demo",
  stage: { x: 150, y: 260, rotation: 180 },
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
          rows: [{ id: "s1-r1", label: "1 排", seats: [{ id: "a1", label: "1", x: 30, y: 30, status: "available" }] }],
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
          rows: [{ id: "s2-r1", label: "1 排", seats: [{ id: "b1", label: "1", x: 50, y: 130, status: "available" }] }],
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
            [60, 0],
            [60, 40],
            [0, 40],
          ],
          priceTierId: "t2",
          rows: [{ id: "s3-r1", label: "1 排", seats: [{ id: "c1", label: "1", x: 30, y: 20, status: "available" }] }],
        },
      ],
    },
  ],
};

beforeEach(() => {
  document.body.innerHTML = "";
  const host = document.createElement("div");
  document.body.appendChild(host);
  stubBox(host);
});

/** jsdom has no layout: give an element a fixed box so the engine can fit */
const stubBox = (el: HTMLElement) => {
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 800, height: 500, right: 800, bottom: 500, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
};

describe("VenueSeatMap", () => {
  it("renders sections and stage, fires sectionClick", async () => {
    const sectionClick = vi.fn();
    const selectionChange = vi.fn();
    const w = mount(VenueSeatMap, { props: { doc, "onSectionClick": sectionClick, "onSelectionChange": selectionChange } });
    expect(w.findAll(".vs-section").length).toBe(2);
    expect(w.find(".vs-stage").exists()).toBe(true);
    const svg = w.find("svg") as any;
    stubBox(svg.element);
    await w.find('[data-sec="s1"]').trigger("keydown", { key: "Enter" });
    expect(sectionClick).toHaveBeenCalledWith("s1", { sectionId: "s1" });
    expect(selectionChange).toHaveBeenCalledWith({ sectionId: "s1" });
  });

  it("switches level through the levelId prop", async () => {
    const w = mount(VenueSeatMap, { props: { doc, levelId: "l1" } });
    expect(w.findAll(".vs-section").length).toBe(2);
    await w.setProps({ levelId: "l2" });
    expect(w.findAll(".vs-section").length).toBe(1);
    expect(w.find('[data-sec="s3"]').exists()).toBe(true);
  });

  it("applies a controlled selection and clears it", async () => {
    const w = mount(VenueSeatMap, { props: { doc, selection: { sectionId: "s2" } } });
    expect(w.find('[data-sec="s2"]').classes().includes("vs-section--selected")).toBe(true);
    await w.setProps({ selection: null });
    expect(w.find('[data-sec="s2"]').classes().includes("vs-section--selected")).toBe(false);
  });

  it("ignores a selection prop that already matches", async () => {
    const w = mount(VenueSeatMap, { props: { doc, selection: { sectionId: "s2" } } });
    await w.setProps({ selection: { sectionId: "s2" } });
    expect(w.emitted("selectionChange")).toBeUndefined();
    expect(w.find('[data-sec="s2"]').classes().includes("vs-section--selected")).toBe(true);
  });

  it("drops the row when the selection moves back to section level", async () => {
    const w = mount(VenueSeatMap, { props: { doc, selection: { sectionId: "s1", rowId: "s1-r1" } } });
    expect(w.find('[data-row="s1-r1"]').classes().includes("vs-row--selected")).toBe(true);
    await w.setProps({ selection: { sectionId: "s1" } });
    expect(w.emitted("selectionChange")![0][0]).toEqual({ sectionId: "s1" });
    expect(w.find('[data-row="s1-r1"]').classes().includes("vs-row--selected")).toBe(false);
  });

  it("keeps the current level when the levelId prop is cleared", async () => {
    const w = mount(VenueSeatMap, { props: { doc, levelId: "l2" } });
    expect(w.find('[data-sec="s3"]').exists()).toBe(true);
    await w.setProps({ levelId: undefined });
    expect(w.find('[data-sec="s3"]').exists()).toBe(true);
    expect(w.findAll(".vs-section").length).toBe(1);
  });

  it("exposes imperative zoom helpers", async () => {
    const w = mount(VenueSeatMap, { props: { doc } });
    const svg = w.find("svg") as any;
    stubBox(svg.element);
    const ctrl = w.vm.controller();
    expect(ctrl).toBeTruthy();
    const before = ctrl.pxPerUnit();
    w.vm.zoomIn();
    expect(ctrl.pxPerUnit()).toBeGreaterThan(before);
    w.vm.reset();
    expect(ctrl.pxPerUnit()).toBeCloseTo(before, 5);
  });

  it("destroys the engine on unmount", async () => {
    const w = mount(VenueSeatMap, { props: { doc } });
    expect(w.find(".vs-map").exists()).toBe(true);
    w.unmount();
    await nextTick();
    expect(document.querySelector(".vs-map")).toBeNull();
  });

  it("fires seatToggle when a seat is clicked", async () => {
    const w = mount(VenueSeatMap, { props: { doc, onSeatToggle: () => {} } });
    const svg = w.find("svg") as any;
    stubBox(svg.element);
    const toClient = (vx: number, vy: number) => {
      const vb = svg.element.getAttribute("viewBox")!.split(" ").map(Number);
      return { x: ((vx - vb[0]) / vb[2]) * 800, y: ((vy - vb[1]) / vb[3]) * 500 };
    };
    const click = (vx: number, vy: number) => {
      const p = toClient(vx, vy);
      svg.element.dispatchEvent(new MouseEvent("pointerdown", { clientX: p.x, clientY: p.y, bubbles: true }));
      svg.element.dispatchEvent(new MouseEvent("pointerup", { clientX: p.x, clientY: p.y, bubbles: true }));
    };
    click(30, 30); // first click selects the section
    expect(w.emitted("seatToggle")).toBeUndefined();
    click(30, 30); // second click toggles seat a1
    expect(w.emitted("seatToggle")!.length).toBe(1);
    expect(w.emitted("seatToggle")![0][0]).toMatchObject({ id: "a1", status: "selected" });
    expect(w.emitted("seatToggle")![0][1]).toMatchObject({ id: "s1" });
  });

  it("fires rowClick when a row of a selected section is clicked", async () => {
    const w = mount(VenueSeatMap, { props: { doc } });
    const svg = w.find("svg") as any;
    stubBox(svg.element);
    const toClient = (vx: number, vy: number) => {
      const vb = svg.element.getAttribute("viewBox")!.split(" ").map(Number);
      return { x: ((vx - vb[0]) / vb[2]) * 800, y: ((vy - vb[1]) / vb[3]) * 500 };
    };
    const click = (vx: number, vy: number) => {
      const p = toClient(vx, vy);
      svg.element.dispatchEvent(new MouseEvent("pointerdown", { clientX: p.x, clientY: p.y, bubbles: true }));
      svg.element.dispatchEvent(new MouseEvent("pointerup", { clientX: p.x, clientY: p.y, bubbles: true }));
    };
    click(50, 30); // select s1
    expect(w.emitted("rowClick")).toBeUndefined();
    click(60, 30); // on row s1-r1 (centroid 30,30, within 40) but clear of seat a1
    expect(w.emitted("rowClick")![0][0]).toBe("s1-r1");
    expect(w.emitted("rowClick")![0][1]).toBe("s1");
  });

  it("fires hoverChange as the pointer moves over a section", async () => {
    const w = mount(VenueSeatMap, { props: { doc } });
    const svg = w.find("svg") as any;
    stubBox(svg.element);
    const vb = svg.element.getAttribute("viewBox")!.split(" ").map(Number);
    const p = { x: ((60 - vb[0]) / vb[2]) * 800, y: ((30 - vb[1]) / vb[3]) * 500 };
    svg.element.dispatchEvent(new MouseEvent("pointermove", { clientX: p.x, clientY: p.y, bubbles: true }));
    // the 2d controller resolves hover inside rAF, so let one frame run first
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(w.emitted("hoverChange")![0][0]).toMatchObject({ kind: "section", section: { id: "s1" } });
  });

  it("exposes zoomOut and fit alongside zoomIn", async () => {
    const w = mount(VenueSeatMap, { props: { doc } });
    const svg = w.find("svg") as any;
    stubBox(svg.element);
    const ctrl = w.vm.controller();
    const rest = ctrl.pxPerUnit();
    w.vm.zoomIn();
    w.vm.zoomOut();
    expect(ctrl.pxPerUnit()).toBeCloseTo(rest, 5);
    w.vm.zoomIn();
    w.vm.fit();
    expect(ctrl.pxPerUnit()).toBeCloseTo(rest, 5);
  });
});

describe("VenueSeatMap doc prop", () => {
  /** same venue, a single differently-named section */
  const other: VenueDocument = {
    ...doc,
    venue: { id: "w", name: "另一场馆" },
    levels: [
      {
        id: "m1",
        name: "主层",
        sections: [
          {
            id: "x1",
            name: "X 区",
            polygon: [
              [0, 0],
              [80, 0],
              [80, 50],
              [0, 50],
            ],
            priceTierId: "t1",
            rows: [
              {
                id: "x1-r1",
                label: "1 排",
                seats: [{ id: "q1", label: "1", x: 20, y: 20, status: "available" }],
              },
            ],
          },
        ],
      },
    ],
  };

  it("rebuilds the map when the doc prop changes", async () => {
    const w = mount(VenueSeatMap, { props: { doc } });
    expect(w.findAll(".vs-section").length).toBe(2);
    expect(w.find('[data-sec="s1"]').exists()).toBe(true);

    await w.setProps({ doc: other });
    expect(w.findAll(".vs-section").length).toBe(1);
    expect(w.find('[data-sec="x1"]').exists()).toBe(true);
    expect(w.find('[data-sec="s1"]').exists()).toBe(false);
    // vue wraps the prop in a reactive proxy, so compare by value
    expect(w.vm.controller()!.getDoc()).toEqual(other);
  });

  it("keeps showing the level named by the levelId prop after a doc swap", async () => {
    const sameLevels: VenueDocument = {
      ...doc,
      venue: { id: "w", name: "另一场馆" },
      levels: doc.levels.map((l) => ({ ...l })),
    };
    const w = mount(VenueSeatMap, { props: { doc, levelId: "l2" } });
    expect(w.find('[data-sec="s3"]').exists()).toBe(true);

    await w.setProps({ doc: sameLevels });
    expect(w.find('[data-sec="s3"]').exists()).toBe(true);
    expect(w.find('[data-sec="s1"]').exists()).toBe(false);
  });

  it("ignores a doc prop that is the same object", async () => {
    const w = mount(VenueSeatMap, { props: { doc } });
    const before = w.vm.controller()!.getDoc();
    await w.setProps({ doc });
    expect(w.vm.controller()!.getDoc()).toBe(before);
    expect(w.findAll(".vs-section").length).toBe(2);
  });
});
