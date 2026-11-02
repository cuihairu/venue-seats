import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    // the venue JSON chunks are data, not code: the largest (the 935 kB
    // Hangzhou stadium) is a one-off lazy download, not part of the entry path
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // keep the framework and the 3D engine out of the entry chunk so the
          // initial page stays small; the heavy venue JSON is already split by
          // the dynamic imports in venues.ts.
          if (id.includes("node_modules/three") || id.includes("three/examples")) return "three";
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/scheduler")) return "react";
        },
      },
    },
  },
});
