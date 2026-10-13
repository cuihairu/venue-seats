import { defineConfig } from "vitepress";

export default defineConfig({
  title: "venue-seats",
  description:
    "Venue seat maps from one JSON file — React, Vue and Flutter renderers",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Quick start", link: "/quickstart" },
      { text: "Data format", link: "/data-format" },
      { text: "API", link: "/api" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Quick start", link: "/quickstart" },
          { text: "Data format", link: "/data-format" },
          { text: "API", link: "/api" },
        ],
      },
    ],
  },
});
