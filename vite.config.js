// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // match /nbaapi and /nbaapi/... exactly
      "^/nbaapi(/|$)": {
        target: "http://rest.nbaapi.com",
        changeOrigin: true,
        // /nbaapi/foo -> /api/foo
        rewrite: (p) => p.replace(/^\/nbaapi(?=\/|$)/, "/api"),
      },
    },
  },
});
