// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { VenueDocument } from "@venue-seats/core";

const deferred: Array<{ resolve: (v: VenueDocument) => void; reject: (e: unknown) => void }> = [];

vi.mock("../src/venues", () => {
  const base: VenueDocument = {
    schemaVersion: "1",
    venue: { id: "v0", name: "示例场馆", city: "北京", address: "测试路 1 号" },
    priceTiers: [{ id: "t1", name: "内场", color: "#ff4d6d", price: 100 }],
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
            rows: [{ id: "r1", label: "1 排", seats: [{ id: "a1", label: "1", x: 30, y: 30, status: "available" }] }],
          },
        ],
      },
    ],
  };
  const mk = (i: number, name: string): VenueDocument => ({
    ...structuredClone(base),
    venue: { ...base.venue, id: `v${i}`, name },
  });
  const VENUES = [
    { id: "v0", name: "示例场馆", city: "北京", provenance: "demo", load: () => new Promise<VenueDocument>((resolve, reject) => deferred.push({ resolve, reject })) },
    { id: "v1", name: "第二场馆", city: "上海", provenance: "demo", load: () => new Promise<VenueDocument>((resolve, reject) => deferred.push({ resolve, reject })) },
  ];
  return { DEMO_DISCLAIMER: "示意重建", EXAMPLES_NOTE: "公开口径重建", VENUES, __mk: mk };
});

vi.mock("@venue-seats/react", () => ({ SeatMap: () => null }));
vi.mock("@venue-seats/renderer-3d", () => ({
  probe3D: () => ({ webgl: true }),
  createVenueView: vi.fn(() => ({ mode: "3d", destroy: vi.fn(), setSelection: vi.fn() })),
}));

import { App } from "../src/App";
import { VENUES, __mk } from "../src/venues";

let root: Root | null = null;
let container: HTMLDivElement;

beforeEach(() => {
  deferred.length = 0;
  vi.clearAllMocks();
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
});

function renderApp() {
  root = createRoot(container);
  act(() => root.render(<App />));
}

async function resolveLoad(i: number, doc?: VenueDocument) {
  const d = deferred[i];
  if (!d) throw new Error(`no pending load for index ${i}`);
  await act(async () => {
    d.resolve(doc ?? __mk(i, `场馆${i}`));
    await Promise.resolve();
  });
}

describe("App loadedIdx switch gate", () => {
  it("shows the loading page until the first document resolves", async () => {
    renderApp();
    expect(container.textContent).toContain("正在加载示例场馆");
    await resolveLoad(0);
    expect(container.textContent).toContain("示例场馆");
  });

  it("renders the error page after a failed load", async () => {
    renderApp();
    const d = deferred[0];
    await act(async () => {
      d.reject(new Error("chunk 404"));
      await Promise.resolve();
    });
    expect(container.textContent).toContain("示例场馆加载失败");
    expect(container.textContent).toContain("chunk 404");
    expect(container.textContent).toContain("重试");
  });

  it("shows the loading page during a mid-switch instead of the old venue", async () => {
    renderApp();
    await resolveLoad(0);
    expect(container.textContent).toContain("示例场馆");
    const select = container.querySelector("select")!;
    act(() => {
      select.value = "1";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.textContent).toContain("正在加载示例场馆");
    expect(container.textContent).not.toContain("楼层");
    await resolveLoad(1);
    expect(container.textContent).toContain("场馆1");
  });

  it("ignores a slow response that raced past a newer switch", async () => {
    renderApp();
    const select = container.querySelector("select")!;
    act(() => {
      select.value = "1";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const slow = deferred[0];
    await act(async () => {
      slow.resolve(__mk(0, "迟到的旧场馆"));
      await Promise.resolve();
    });
    expect(container.textContent).toContain("正在加载示例场馆");
    expect(container.textContent).not.toContain("迟到的旧场馆");
    await resolveLoad(1);
    expect(container.textContent).toContain("场馆1");
  });
});
