/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    cors: true,
  },
  preview: {
    port: 3000,
    host: true,
    cors: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.jsx"],
  },
});
