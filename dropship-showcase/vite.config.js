import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteCompression from "vite-plugin-compression";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteCompression({ algorithm: "gzip", ext: ".gz" }),
    viteCompression({ algorithm: "brotliCompress", ext: ".br" }),
  ],
  build: {
    minify: "esbuild",
    cssMinify: true,
    sourcemap: false,
  },
  server: {
    proxy: {
      // Forward /api/* requests to Django backend during development
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      '/dropship/login/admin/': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
