import { defineConfig } from "vitepress";

export default defineConfig({
  // published as a GitHub project page: cuihairu.github.io/venue-seats/
  // (scripts/check-pages.mjs fails the build if any internal URL escapes it)
  base: "/venue-seats/",
  // review/ keeps raw archival records (pasted tool logs); they are not site
  // pages and their unescaped markup must not be compiled as such
  srcExclude: ["review/**"],
  locales: {
    root: {
      label: "English",
      lang: "en-US",
      title: "venue-seats",
      description:
        "Venue seat maps from one JSON file — React, Vue and Flutter renderers",
      themeConfig: {
        nav: [
          { text: "Home", link: "/" },
          {
            text: "Docs",
            items: [
              { text: "Quick start", link: "/quickstart" },
              { text: "Data format", link: "/data-format" },
              { text: "Dataset schema", link: "/design/dataset-schema" },
              { text: "API", link: "/api" },
              { text: "Release strategy", link: "/release-strategy" },
              { text: "Consistency audit", link: "/audit-doc-consistency" },
            ],
          },
        ],
        sidebar: [
          {
            text: "Docs",
            items: [
              { text: "Home", link: "/" },
              { text: "Quick start", link: "/quickstart" },
              { text: "Data format", link: "/data-format" },
              { text: "Dataset schema", link: "/design/dataset-schema" },
              { text: "API", link: "/api" },
              { text: "Release strategy", link: "/release-strategy" },
              { text: "Consistency audit", link: "/audit-doc-consistency" },
            ],
          },
        ],
      },
    },
    zh: {
      label: "简体中文",
      lang: "zh-CN",
      title: "venue-seats",
      description: "一个 JSON 文件驱动的场馆座位图 — React、Vue 和 Flutter 渲染器",
      themeConfig: {
        nav: [
          { text: "首页", link: "/zh/" },
          {
            text: "文档",
            items: [
              { text: "快速开始", link: "/zh/quickstart" },
              { text: "数据格式", link: "/zh/data-format" },
              { text: "数据集结构", link: "/zh/design/dataset-schema" },
              { text: "API", link: "/zh/api" },
              { text: "发布策略", link: "/zh/release-strategy" },
              { text: "一致性审计", link: "/zh/audit-doc-consistency" },
            ],
          },
        ],
        sidebar: [
          {
            text: "文档",
            items: [
              { text: "首页", link: "/zh/" },
              { text: "快速开始", link: "/zh/quickstart" },
              { text: "数据格式", link: "/zh/data-format" },
              { text: "数据集结构", link: "/zh/design/dataset-schema" },
              { text: "API", link: "/zh/api" },
              { text: "发布策略", link: "/zh/release-strategy" },
              { text: "一致性审计", link: "/zh/audit-doc-consistency" },
            ],
          },
        ],
      },
    },
  },
  themeConfig: {
    socialLinks: [{ icon: "github", link: "https://github.com/cuihairu/venue-seats" }],
  },
});
