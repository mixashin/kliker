import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Кликер",
        short_name: "Кликер",
        description: "Учење азбуке и бројева",
        lang: "sr",
        theme_color: "#14171c",
        background_color: "#14171c",
        display: "fullscreen",
        display_override: ["fullscreen", "standalone"],
        orientation: "any",
        start_url: base,
        scope: base,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,ico,wasm,gz,json,mp3}"],
        // The .wasm.js cores embed the binary (base64), so bare .wasm files are never fetched.
        // Default OEM is LSTM only, so only the -lstm cores load.
        globIgnores: [
          "tesseract/*.wasm",
          "tesseract/tesseract-core.wasm.js",
          "tesseract/tesseract-core-simd.wasm.js",
          "tesseract/tesseract-core-relaxedsimd.wasm.js",
        ],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/tesseract/") || url.pathname.includes("/tessdata/"),
            handler: "CacheFirst",
            options: { cacheName: "ocr-runtime" },
          },
        ],
      },
    }),
  ],
  test: { environment: "jsdom", setupFiles: ["src/test/setup.ts"], globals: true },
});
