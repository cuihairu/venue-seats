import { defineConfig } from "vitepress";

export default defineConfig({
  // published as a GitHub project page: cuihairu.github.io/venue-seats/
  // (scripts/check-pages.mjs fails the build if any internal URL escapes it)
  base: "/venue-seats/",
  // review/ keeps raw archival records (pasted tool logs); they are not site
  // pages and their unescaped markup must not be compiled as such
  srcExclude: ["review/**"],
  title: "venue-seats",
  description:
    "Venue seat maps from one JSON file — React, Vue and Flutter renderers",
  themeConfig: {
    socialLinks: [{ icon: "github", link: "https://github.com/cuihairu/venue-seats" }],
    nav: [
      { text: "Home", link: "/" },
      {
        text: "Docs",
        items: [
          { text: "Quick start", link: "/quickstart" },
          { text: "Data format", link: "/data-format" },
          { text: "API", link: "/api" },
          { text: "Release strategy", link: "/release-strategy" },
          { text: "Consistency audit", link: "/audit-doc-consistency" },
        ],
      },
      {
        text: "中文文档",
        items: [
          { text: "首页", link: "/index.zh" },
          { text: "快速开始", link: "/quickstart.zh" },
          { text: "数据格式", link: "/data-format.zh" },
          { text: "API", link: "/api.zh" },
          { text: "发布策略", link: "/发布策略" },
          { text: "一致性审计", link: "/审计-文档一致性" },
        ],
      },
    ],
    sidebar: [
      {
        text: "English",
        items: [
          { text: "Home", link: "/" },
          { text: "Quick start", link: "/quickstart" },
          { text: "Data format", link: "/data-format" },
          { text: "API", link: "/api" },
          { text: "Release strategy", link: "/release-strategy" },
          { text: "Consistency audit", link: "/audit-doc-consistency" },
        ],
      },
      {
        text: "中文",
        items: [
          { text: "首页", link: "/index.zh" },
          { text: "快速开始", link: "/quickstart.zh" },
          { text: "数据格式", link: "/data-format.zh" },
          { text: "API", link: "/api.zh" },
          { text: "发布策略", link: "/发布策略" },
          { text: "一致性审计", link: "/审计-文档一致性" },
        ],
      },
    ],
  },
});
