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
          // Rollup may deliver Windows paths with backslashes, so normalize
          // before matching dependency directories.
          const normalizedId = id.replaceAll("\\", "/");
          if (
            normalizedId.includes("/node_modules/three/") ||
            normalizedId.includes("/node_modules/three/examples/")
          ) {
            return "three";
          }
          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/scheduler/")
          ) {
            return "react";
          }
        },
      },
    },
  },
});
