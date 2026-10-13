#!/usr/bin/env node
/**
 * Screenshot evidence for P1 acceptance: drives the built demo (vite preview)
 * through its states and captures PNGs into docs/screenshots/.
 *
 * Usage: pnpm --filter @venue-seats/demo shoot   (after pnpm build)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = join(root, "docs", "screenshots");
const PORT = 4517;
const URL0 = `http://localhost:${PORT}/`;

mkdirSync(OUT, { recursive: true });

let server = null;
if (!process.env.VS_PREVIEW_URL) {
  server = spawn("pnpm", ["preview"], { cwd: join(root, "apps", "demo"), stdio: "pipe", shell: true });
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => d.toString().includes(URL0) && resolve());
    server.on("error", reject);
    setTimeout(() => reject(new Error("preview server timeout")), 20000);
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});

const shot = async (name) => {
  await page.waitForTimeout(350); // settle transitions
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log("✓", name);
};

const clickSection = async (sel = '.vs-section:not(.vs-section--none)') => page.locator(sel).first().click({ force: true });
const hoverSeat = async (sel = ".vs-seat:not(.vs-seat--sold)") => page.locator(sel).first().hover();

await page.goto(URL0, { waitUntil: "networkidle" });
await page.waitForSelector(".vs-section");
// money shot: full bowl of the lower deck
await page.getByRole("tab", { name: "看台下" }).click();
await page.getByRole("button", { name: "复位" }).click();
await shot("01-overview-national-stadium");

// level switch to upper deck
await page.getByRole("tab", { name: "看台上层" }).click();
await shot("02-level-switch-upper");

// back to lower; zoom out → section-only view (seats hidden)
await page.getByRole("tab", { name: "内场" }).click();
await page.getByRole("button", { name: "缩小" }).click();
await page.getByRole("button", { name: "缩小" }).click();
await shot("03-zoomed-out-tier-colors");

// reset, select a section
await page.getByRole("button", { name: "复位" }).click();
await clickSection();
await shot("04-section-selected");

// hover a seat inside the selected section → row highlight + tooltip
await hoverSeat();
await shot("05-row-hover-tooltip");

// click the hovered seat → row selected
await page.locator(".vs-seat:not(.vs-seat--sold)").first().click();
await shot("06-row-selected");

// sold-out backstage region: switch to a level that has fully-sold sections
await page.getByRole("tab", { name: "看台下" }).click();
await page.getByRole("button", { name: "复位" }).click();
await page.locator(".vs-section--none").first().click({ force: true });
await page.getByRole("button", { name: "放大" }).click();
await page.getByRole("button", { name: "放大" }).click();
await shot("07-sold-out-section");

// arena venue
await page.selectOption(".venue-select", { index: 2 });
await page.waitForSelector(".vs-section");
await shot("08-arena-mercedes");
await page.locator(".vs-section").first().click({ force: true });
await shot("09-arena-section-selected");

await browser.close();
server?.kill();
console.log(`\nscreenshots → ${OUT}`);
