import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Enable source maps for production debugging
    sourcemap: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks: {
          // Core vendor libraries
          vendor: ["react", "react-dom", "wouter"],
          // UI components and styling
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-slot", "class-variance-authority", "clsx", "tailwind-merge"],
          // Data fetching and state
          data: ["@tanstack/react-query"],
          // Date handling
          dates: ["date-fns"],
          // Maps (heavy, lazy loaded)
          maps: ["leaflet"],
          // Charts and visualization
          charts: ["recharts"],
          // Stripe (load only when needed)
          stripe: ["@stripe/stripe-js", "@stripe/react-stripe-js"],
        },
        // Optimize asset file names for long-term caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name ?? "";
          if (/\.(css)$/i.test(info)) {
            return "assets/css/[name]-[hash][extname]";
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(info)) {
            return "assets/images/[name]-[hash][extname]";
          }
          if (/\.(woff2?|ttf|otf|eot)$/i.test(info)) {
            return "assets/fonts/[name]-[hash][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
        // Optimize chunk file names
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
      },
    },
    // Minify with esbuild for faster builds
    minify: "esbuild",
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for smaller bundles
    target: "es2020",
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: ["react", "react-dom", "wouter", "@tanstack/react-query", "date-fns"],
    exclude: ["leaflet", "@stripe/stripe-js"], // Lazy load heavy deps
  },
});
