import path from "node:path"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const backend = env.VITE_BACKEND_ORIGIN || "http://127.0.0.1:8000"

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "./src") },
    },
    server: {
      port: 5173,
      // Same-origin proxy: cookies (sf_access / sf_refresh / csrftoken) just work, no CORS.
      proxy: {
        "/api": { target: backend, changeOrigin: false },
        "/media": { target: backend, changeOrigin: false },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        "/api": { target: backend, changeOrigin: false },
        "/media": { target: backend, changeOrigin: false },
      },
    },
    build: {
      sourcemap: mode !== "production",
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return undefined
            if (/react-dom|react-router|scheduler/.test(id)) return "react"
            if (/@tanstack/.test(id)) return "query"
            if (/recharts|d3-/.test(id)) return "charts"
            if (/motion|framer/.test(id)) return "motion"
            if (/radix-ui|@radix-ui|cmdk|vaul|sonner/.test(id)) return "ui"
            return undefined
          },
        },
      },
    },
  }
})
