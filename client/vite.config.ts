import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@sproot/common": fileURLToPath(
        new URL("../common/src", import.meta.url),
      ),
    },
  },
  define: {},
  css: {
    modules: {},
  },
});
