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

const render = (ui: React.ReactNode) =>
  act(async () => {
    root.render(ui);
  });

function stubSvg() {
  const svg = container.querySelector("svg");
  if (svg) svg.getBoundingClientRect = container.getBoundingClientRect;
  return svg;
}

/** venue coords -> client px through the svg viewBox and the stubbed 800x500 box */
function toClient(svg: SVGSVGElement, vx: number, vy: number) {
  const vb = svg.getAttribute("viewBox")!.split(" ").map(Number);
  return { x: ((vx - vb[0]) / vb[2]) * 800, y: ((vy - vb[1]) / vb[3]) * 500 };
}

function clicker(svg: SVGSVGElement) {
  return (vx: number, vy: number) => {
    const p = toClient(svg, vx, vy);
    svg.dispatchEvent(new MouseEvent("pointerdown", { clientX: p.x, clientY: p.y, bubbles: true }));
    svg.dispatchEvent(new MouseEvent("pointerup", { clientX: p.x, clientY: p.y, bubbles: true }));
  };
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

  it("keeps callback props off the host div", async () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    await render(
      <SeatMap
        doc={doc}
        onSelectionChange={() => {}}
        onSectionClick={() => {}}
        onRowClick={() => {}}
        onSeatToggle={() => {}}
        onHoverChange={() => {}}
        className="map"
      />,
    );
    stubSvg();
    expect(container.querySelector(".vs-map")).toBeTruthy();
    // React ignores unknown on* props on DOM nodes and warns about each one
    expect(warn.mock.calls.some((call) => String(call[0]).includes("Unknown event handler"))).toBe(
      false,
    );
    warn.mockRestore();
  });

  it("unmounts cleanly", async () => {
    await render(<SeatMap doc={doc} />);
    stubSvg();
    await act(async () => root.unmount());
    expect(container.querySelector(".vs-map")).toBeNull();
  });

  it("fires onSeatToggle when a seat is clicked", async () => {
    const onSeatToggle = vi.fn();
    await render(<SeatMap doc={doc} onSeatToggle={onSeatToggle} />);
    stubSvg();
    const svg = container.querySelector("svg") as SVGSVGElement;
    const toClient = (vx: number, vy: number) => {
      const vb = svg.getAttribute("viewBox")!.split(" ").map(Number);
      return { x: ((vx - vb[0]) / vb[2]) * 800, y: ((vy - vb[1]) / vb[3]) * 500 };
    };
    const click = (vx: number, vy: number) => {
      const p = toClient(vx, vy);
      svg.dispatchEvent(new MouseEvent("pointerdown", { clientX: p.x, clientY: p.y, bubbles: true }));
      svg.dispatchEvent(new MouseEvent("pointerup", { clientX: p.x, clientY: p.y, bubbles: true }));
    };
    await act(async () => click(30, 30)); // first click selects the section
    expect(onSeatToggle).not.toHaveBeenCalled();
    await act(async () => click(30, 30)); // second click toggles seat a1
    expect(onSeatToggle).toHaveBeenCalledTimes(1);
    expect(onSeatToggle).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1", status: "selected" }),
      expect.objectContaining({ id: "s1" }),
    );
    await act(async () => click(30, 30)); // and back
    expect(onSeatToggle).toHaveBeenCalledTimes(2);
    expect(onSeatToggle.mock.calls[1][0]).toMatchObject({ id: "a1", status: "available" });
  });

  it("toggles a seat of the selected row with Enter", async () => {
    const onSeatToggle = vi.fn();
    await render(<SeatMap doc={doc} selection={{ sectionId: "s1", rowId: "s1-r1" }} onSeatToggle={onSeatToggle} />);
    stubSvg();
    const a1 = container.querySelector<SVGCircleElement>('[data-seat="a1"]')!;
    expect(a1.getAttribute("tabindex")).toBe("0");
    await act(async () => {
      a1.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(onSeatToggle).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1", status: "selected" }),
      expect.objectContaining({ id: "s1" }),
    );
  });

  it("fires onRowClick for a row of the selected section", async () => {
    const onRowClick = vi.fn();
    await render(<SeatMap doc={doc} onRowClick={onRowClick} />);
    const svg = stubSvg() as SVGSVGElement;
    const click = clicker(svg);
    await act(async () => click(50, 30)); // first click selects section s1
    expect(onRowClick).not.toHaveBeenCalled();
    await act(async () => click(60, 30)); // on row s1-r1 (centroid 30,30) but clear of seat a1
    expect(onRowClick).toHaveBeenCalledWith("s1-r1", "s1", { sectionId: "s1", rowId: "s1-r1" });
  });

  it("fires onHoverChange as the pointer moves over a section", async () => {
    const onHoverChange = vi.fn();
    await render(<SeatMap doc={doc} onHoverChange={onHoverChange} />);
    const svg = stubSvg() as SVGSVGElement;
    const p = toClient(svg, 60, 30);
    await act(async () => {
      svg.dispatchEvent(new MouseEvent("pointermove", { clientX: p.x, clientY: p.y, bubbles: true }));
      // the 2d controller resolves hover inside rAF, so let one frame run first
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(onHoverChange).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "section", section: expect.objectContaining({ id: "s1" }) }),
    );
  });

  it("exposes zoomOut and fit alongside zoomIn", async () => {
    const handle = createRef<SeatMapHandle>();
    await render(<SeatMap ref={handle} doc={doc} />);
    stubSvg();
    const rest = handle.current!.controller()!.pxPerUnit();
    act(() => handle.current!.zoomIn());
    act(() => handle.current!.zoomOut());
    expect(handle.current!.controller()!.pxPerUnit()).toBeCloseTo(rest, 5);
    act(() => handle.current!.zoomIn());
    act(() => handle.current!.fit());
    expect(handle.current!.controller()!.pxPerUnit()).toBeCloseTo(rest, 5);
  });

  it("rebuilds the map when the doc prop changes", async () => {
    await render(<SeatMap doc={doc} />);
    stubSvg();
    expect(container.querySelectorAll(".vs-section").length).toBe(2);
    expect(container.querySelector('[data-sec="s1"]')).toBeTruthy();

    await render(<SeatMap doc={other} />);
    expect(container.querySelectorAll(".vs-section").length).toBe(1);
    expect(container.querySelector('[data-sec="x1"]')).toBeTruthy();
    expect(container.querySelector('[data-sec="s1"]')).toBeNull();
  });

  it("keeps the levelId prop after a doc swap", async () => {
    const sameLevels: VenueDocument = {
      ...doc,
      venue: { id: "w", name: "另一场馆" },
      levels: doc.levels.map((l) => ({ ...l })),
    };
    await render(<SeatMap doc={doc} levelId="l2" />);
    stubSvg();
    expect(container.querySelector('[data-sec="s3"]')).toBeTruthy();

    await render(<SeatMap doc={sameLevels} levelId="l2" />);
    expect(container.querySelector('[data-sec="s3"]')).toBeTruthy();
    expect(container.querySelector('[data-sec="s1"]')).toBeNull();
  });
});
