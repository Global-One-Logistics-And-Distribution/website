import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
