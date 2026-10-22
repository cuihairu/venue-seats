#!/usr/bin/env node
/**
 * Pages-readiness check. Run after the docs build.
 *
 * The docs site is published at a project path (cuihairu.github.io/venue-seats/),
 * so every internal asset and page link must carry the vitepress `base`. A
 * config that loses `base` still builds fine and only breaks once deployed —
 * this reads the built HTML and fails if any internal URL escapes the base.
 * It also verifies every documented language variant is reachable from the
 * site-wide navigation, so a paired Chinese page cannot regress into an
 * orphan page after a config refactor.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(repoRoot, "docs/.vitepress/dist");
const base = "/venue-seats/";
const languagePages = [
  "index.html",
  "zh/index.html",
  "quickstart.html",
  "zh/quickstart.html",
  "data-format.html",
  "zh/data-format.html",
  "design/dataset-schema.html",
  "zh/design/dataset-schema.html",
  "api.html",
  "zh/api.html",
  "release-strategy.html",
  "zh/release-strategy.html",
  "audit-doc-consistency.html",
  "zh/audit-doc-consistency.html",
];

const problems = [];
const navLinks = new Set();
const sidebarLinks = new Set();
if (!existsSync(join(dist, "index.html"))) {
  problems.push("docs site is not built (docs/.vitepress/dist/index.html missing)");
} else {
  const homeMarkup = readFileSync(join(dist, "index.html"), "utf8");
  const siteDataMatch = homeMarkup.match(
    /window\.__VP_SITE_DATA__=JSON\.parse\((".*")\);/
  );
  if (!siteDataMatch) {
    problems.push("VitePress site data missing; cannot verify site-wide navigation");
  } else {
    const siteData = JSON.parse(JSON.parse(siteDataMatch[1]));
    const collectNavigation = (areas, links) => {
      const collectLinks = (value) => {
        if (Array.isArray(value)) value.forEach(collectLinks);
        else if (value && typeof value === "object") collectLinks(Object.values(value));
        else if (typeof value === "string" && value.startsWith("/")) links.add(decodeURI(value).replace(/\.html$/, ""));
      };
      collectLinks(areas);
    };
    collectNavigation(siteData.locales?.root?.themeConfig?.nav, navLinks);
    collectNavigation(siteData.locales?.root?.themeConfig?.sidebar, sidebarLinks);
    collectNavigation(siteData.locales?.zh?.themeConfig?.nav, navLinks);
    collectNavigation(siteData.locales?.zh?.themeConfig?.sidebar, sidebarLinks);
  }

  for (const page of languagePages) {
    const file = join(dist, page);
    if (!existsSync(file)) {
      problems.push(`docs/.vitepress/dist/${page} missing`);
      continue;
    }
    for (const m of readFileSync(file, "utf8").matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      const url = m[1];
      if (!url.startsWith(base)) problems.push(`${page}: internal URL ${url} escapes the base ${base}`);
    }
  }
  for (const page of languagePages) {
    const normalized = page.replace(/\.html$/, "");
    const candidates = normalized === "index"
      ? ["/"]
      : normalized === "zh/index"
        ? ["/zh/"]
        : [`/${normalized}`, `/${normalized}/`];
    for (const [area, links] of [["nav", navLinks], ["sidebar", sidebarLinks]]) {
      if (!candidates.some((entry) => links.has(entry))) {
        problems.push(`site-wide ${area} does not link bilingual page ${normalized}`);
      }
    }
  }

  const checkTarget = (page, sourceUrl) => {
    const [withoutHash] = sourceUrl.split("#", 2);
    const path = decodeURIComponent(withoutHash).slice(base.length);
    const target = join(dist, path);
    if (existsSync(target) && statSync(target).isFile()) return;
    if (existsSync(join(target, "index.html"))) return;
    if (existsSync(`${target}.html`)) return;
    problems.push(`${page}: missing internal target ${sourceUrl}`);
  };

  for (const page of languagePages) {
    for (const m of readFileSync(join(dist, page), "utf8").matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      const url = m[1];
      if (!url.startsWith(base)) continue;
      checkTarget(page, url);
    }
  }
}

if (problems.length > 0) {
  console.error("pages readiness broken:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`pages readiness ok (base ${base})`);
