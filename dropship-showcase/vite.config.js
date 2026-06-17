import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteCompression from "vite-plugin-compression";
import sri from "vite-plugin-sri";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sri(),
    viteCompression({ algorithm: "gzip", ext: ".gz" }),
    viteCompression({ algorithm: "brotliCompress", ext: ".br" }),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
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
