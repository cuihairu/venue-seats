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
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500, right: 800, bottom: 500, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
});

describe("VenueSeatMap", () => {
  it("renders sections and stage, fires sectionClick", async () => {
    const sectionClick = vi.fn();
    const selectionChange = vi.fn();
    const w = mount(VenueSeatMap, { props: { doc, "onSectionClick": sectionClick, "onSelectionChange": selectionChange } });
    expect(w.findAll(".vs-section").length).toBe(2);
    expect(w.find(".vs-stage").exists()).toBe(true);
    const svg = w.find("svg") as any;
    svg.element.getBoundingClientRect = w.element.getBoundingClientRect;
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

  it("exposes imperative zoom helpers", async () => {
    const w = mount(VenueSeatMap, { props: { doc } });
    const svg = w.find("svg") as any;
    svg.element.getBoundingClientRect = w.element.getBoundingClientRect;
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
});
