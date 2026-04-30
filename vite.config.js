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
      // Route ESPN calls through Vite to avoid browser CORS issues.
      "^/espnapi(/|$)": {
        target: "https://site.api.espn.com",
        changeOrigin: true,
        secure: true,
        // /espnapi/foo -> /apis/site/v2/foo
        rewrite: (p) => p.replace(/^\/espnapi(?=\/|$)/, "/apis/site/v2"),
      },
    },
  },
});
