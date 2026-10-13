// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createRef } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { SeatMap, type SeatMapHandle } from "../src/index";
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

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const anyDiv = container as HTMLDivElement;
  anyDiv.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500, right: 800, bottom: 500, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
});

const render = (ui: React.ReactNode) =>
  act(async () => {
    root.render(ui);
  });

function stubSvg() {
  const svg = container.querySelector("svg");
  if (svg) svg.getBoundingClientRect = container.getBoundingClientRect;
  return svg;
}

describe("<SeatMap>", () => {
  it("renders the map and fires selection callbacks", async () => {
    const onSelectionChange = vi.fn();
    const onSectionClick = vi.fn();
    await render(<SeatMap doc={doc} onSelectionChange={onSelectionChange} onSectionClick={onSectionClick} />);
    stubSvg();
    expect(container.querySelectorAll(".vs-section").length).toBe(2);
    expect(container.querySelector(".vs-stage")).toBeTruthy();

    const path = container.querySelector('[data-sec="s1"]') as SVGPathElement;
    await act(async () => {
      path.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(onSectionClick).toHaveBeenCalledWith("s1", { sectionId: "s1" });
    expect(onSelectionChange).toHaveBeenCalledWith({ sectionId: "s1" });
  });

  it("switches levels via the levelId prop", async () => {
    await render(<SeatMap doc={doc} levelId="l1" />);
    stubSvg();
    expect(container.querySelectorAll(".vs-section").length).toBe(2);
    await render(<SeatMap doc={doc} levelId="l2" />);
    expect(container.querySelectorAll(".vs-section").length).toBe(1);
    expect(container.querySelector('[data-sec="s3"]')).toBeTruthy();
  });

  it("applies a controlled selection", async () => {
    await render(<SeatMap doc={doc} selection={{ sectionId: "s2" }} />);
    stubSvg();
    expect(container.querySelector('[data-sec="s2"]')?.classList.contains("vs-section--selected")).toBe(true);
    await render(<SeatMap doc={doc} selection={null} />);
    expect(container.querySelector('[data-sec="s2"]')?.classList.contains("vs-section--selected")).toBe(false);
  });

  it("exposes imperative zoom controls", async () => {
    const handle = createRef<SeatMapHandle>();
    await render(<SeatMap ref={handle} doc={doc} />);
    stubSvg();
    const before = handle.current!.controller()!.pxPerUnit();
    act(() => handle.current!.zoomIn());
    expect(handle.current!.controller()!.pxPerUnit()).toBeGreaterThan(before);
    act(() => handle.current!.reset());
    expect(handle.current!.controller()!.pxPerUnit()).toBeCloseTo(before, 5);
  });

  it("unmounts cleanly", async () => {
    await render(<SeatMap doc={doc} />);
    stubSvg();
    await act(async () => root.unmount());
    expect(container.querySelector(".vs-map")).toBeNull();
  });
});
