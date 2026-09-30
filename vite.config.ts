import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  build: {
    rollupOptions: {
      // Two independent pages: the atlas keeps its own first-screen budget, and the
      // visitor-record tool ships as a separate bundle that never joins the atlas entry
      // (see scripts/visitor-records.test.mjs).
      input: {
        index: path.resolve(__dirname, 'index.html'),
        visitor: path.resolve(__dirname, 'visitor-records/index.html'),
      },
    },
  },
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
