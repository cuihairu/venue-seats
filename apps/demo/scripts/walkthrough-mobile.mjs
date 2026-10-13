#!/usr/bin/env node
/**
 * Mobile acceptance walkthrough: emulates a 390x844 phone (touch, isMobile),
 * drives the built demo (vite preview) with real touch input via CDP, and
 * asserts the mobile parity contract:
 *
 *   - the map fills the phone width and sits at the top
 *   - tap selects a section, second tap selects a row
 *   - two-finger pinch zooms, one-finger drag pans, a pinch never clicks
 *   - 3D degrades to 2D on a narrow viewport with an explanation
 *   - desktop still gets the 3D canvas (regression)
 *
 * Screenshots land in docs/screenshots/10-mobile-*.png.
 *
 * Usage: pnpm --filter @venue-seats/demo walkthrough:mobile   (after pnpm build)
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PORT = 4518;
const URL0 = `http://localhost:${PORT}/`;

let server = null;
if (!process.env.VS_PREVIEW_URL) {
  server = spawn(`pnpm preview --port ${PORT}`, {
    cwd: join(root, "apps", "demo"),
    stdio: "ignore",
    shell: true,
    detached: true,
  });
}
const base = process.env.VS_PREVIEW_URL ?? URL0;

// poll instead of parsing server output (the banner's stream varies by vite version)
async function waitUntil(url, timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`preview server timeout: ${url}`);
}
await waitUntil(base);

const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch();

// ---------- phone: 390x844, touch, mobile emulation ----------
const phone = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const pageErrors = [];
phone.on("pageerror", (e) => pageErrors.push(e.message));
await phone.goto(base, { waitUntil: "networkidle" });

// 1. narrow layout: map on top, fills the phone width AND the map area height
// (the svg's height:100% chain needs a definite host — regression guard)
const svgBox = await phone.locator("svg").first().boundingBox();
check("map fills phone width", Math.abs(svgBox.width - 390) < 30, `svg ${svgBox.width}px wide`);
check("map sits at the top", svgBox.y < 120, `top=${Math.round(svgBox.y)}`);
const areaBox = await phone.locator(".map-area").boundingBox();
check(
  "map fills the map area height",
  svgBox.height > areaBox.height * 0.8,
  `svg ${Math.round(svgBox.height)}px vs area ${Math.round(areaBox.height)}px`,
);

// 2. tap a section (real touch) -> selection panel below the map shows it
const cdp = await phone.context().newCDPSession(phone);
async function tap(x, y) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
// venue sections sit around the canvas centre; tap left-of-centre where a section is
await tap(svgBox.x + svgBox.width * 0.35, svgBox.y + svgBox.height * 0.3);
await phone.waitForTimeout(300);
let sel = await phone.locator(".selection .sel-name").textContent().catch(() => null);
check("tap selects a section", !!sel, sel ?? "no selection");

// 3. second tap picks a row
await tap(svgBox.x + svgBox.width * 0.35, svgBox.y + svgBox.height * 0.3);
await phone.waitForTimeout(300);
const row = await phone.locator(".selection .sel-row").textContent().catch(() => null);
check("second tap selects a row", !!row, row ?? "no row");
await phone.screenshot({ path: join(root, "docs", "screenshots", "10-mobile-2d-select.png") });

// 4. pinch zoom (two real touch points spreading apart)
const viewBox = () =>
  phone
    .locator("svg")
    .first()
    .getAttribute("viewBox")
    .then((v) => v.split(" ").map(Number));
const before = await viewBox();
const cx = svgBox.x + svgBox.width / 2;
const cy = svgBox.y + svgBox.height / 2;
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [
    { x: cx - 40, y: cy },
    { x: cx + 40, y: cy },
  ],
});
for (let d = 50; d <= 160; d += 20) {
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: cx - d, y: cy },
      { x: cx + d, y: cy },
    ],
  });
}
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
const after = await viewBox();
check(
  "pinch zooms in (viewBox shrinks)",
  after[2] < before[2] * 0.75,
  `${Math.round(before[2])} -> ${Math.round(after[2])}`,
);
// selection must survive a pinch
sel = await phone.locator(".selection .sel-name").textContent().catch(() => null);
check("selection survives the pinch", !!sel, sel ?? "cleared");

// 5. one-finger drag pans (viewBox origin moves, width unchanged)
const pre = await viewBox();
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy }] });
for (let i = 1; i <= 6; i++) {
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: cx - i * 15, y: cy }],
  });
}
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
const post = await viewBox();
check(
  "drag pans (x moves, width fixed)",
  Math.abs(post[2] - pre[2]) < 1e-6 && Math.abs(post[0] - pre[0]) > 1,
  `x ${Math.round(pre[0])} -> ${Math.round(post[0])}, w ${Math.round(post[2])}`,
);

// 6. 3D on a phone degrades to 2D with an explanation
await phone.getByRole("button", { name: "3D", exact: true }).click();
await phone.waitForTimeout(500);
const footnote = await phone
  .locator(".map-area .footnote")
  .first()
  .textContent()
  .catch(() => "");
check("3D degrades to 2D on phone", footnote.includes("回退 2D"), footnote.trim().slice(0, 40));
check("2D map still shown", await phone.locator("svg").first().isVisible());
await phone.screenshot({ path: join(root, "docs", "screenshots", "11-mobile-3d-fallback.png") });
check("no page errors on phone", pageErrors.length === 0, pageErrors.join("; ").slice(0, 80));

// ---------- desktop regression: wide viewport still gets 3D ----------
const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desk.goto(base, { waitUntil: "networkidle" });
await desk.getByRole("button", { name: "3D", exact: true }).click();
await desk.waitForSelector(".map-3d canvas.vs3d-canvas", { timeout: 15000 });
check("desktop still gets the 3D canvas", true);
const fn = await desk.locator(".map-area .footnote").first().textContent().catch(() => "");
check("no fallback message on desktop", !fn.includes("回退"), fn.trim().slice(0, 30));

await browser.close();
if (server) {
  // detached + shell: kill the whole process group
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // already gone
  }
}
console.log(results.join("\n"));
process.exitCode = results.some((r) => r.startsWith("FAIL")) ? 1 : 0;
