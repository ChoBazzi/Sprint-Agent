import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const devServerPort = Number(process.env.VITE_PORT ?? 5173);
const apiProxyTarget =
  process.env.VITE_API_PROXY_TARGET ?? `http://127.0.0.1:${process.env.PORT ?? 3001}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: devServerPort,
    proxy: {
      "/api": apiProxyTarget
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts"]
  }
});
