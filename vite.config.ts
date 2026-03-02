import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  plugins: [
    react(),
    VitePWA({
      injectRegister: "auto",
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.png", "icon-192.png", "icon-512.png", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        scope: "/",
        lang: "tr",
        name: "Yalınızlar Filo Yönetimi",
        short_name: "Yalınızlar Filo",
        description: "Araç kiralama ve filo yönetim sistemi",
        theme_color: "#0f172a",
        background_color: "#ffffff",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
        orientation: "portrait-primary",
        start_url: "/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Arac Teslim",
            short_name: "Teslim",
            description: "Hizli arac teslim islemi",
            url: "/admin/operations?type=delivery",
            icons: [{ src: "icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Arac Iade",
            short_name: "Iade",
            description: "Hizli arac iade islemi",
            url: "/admin/operations?type=return",
            icons: [{ src: "icon-192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB (Three.js bundle)
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        globIgnores: [
          "**/assets/*.png",       // car images — loaded on demand via runtime cache
        ],
        navigateFallbackDenylist: [/^\/__\//, /^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(png|jpg|jpeg|webp|svg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "local-images-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "firebase-storage-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "firebase-vendor": ["firebase/app", "firebase/firestore", "firebase/auth", "firebase/storage"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-popover",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tooltip",
            "lucide-react",
            "clsx",
            "tailwind-merge"
          ],
          "charts-vendor": ["recharts"],
          "maps-vendor": ["react-leaflet", "leaflet"],
          "xlsx-vendor": ["xlsx"],
          "date-vendor": ["date-fns"],
          "pdf-vendor": ["jspdf", "html2canvas"],
        },
      },
    },
  },
}));
