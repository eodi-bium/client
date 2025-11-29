// vite.config.ts
import react from "@vitejs/plugin-react";
import process from "process";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(() => {
  const proxyTarget = loadEnv("prod", process.cwd(), "").VITE_BASE_URL;

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.removeHeader("origin");
            });
          },
        },
      },
    },
  };
});
