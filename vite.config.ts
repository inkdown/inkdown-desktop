import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  // Build optimizations
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-tauri': ['@tauri-apps/api', '@tauri-apps/plugin-updater'],
          'vendor-editor': ['@codemirror/view', '@codemirror/state', '@codemirror/lang-markdown'],
          'vendor-ui': ['lucide-react'],
          
          // App chunks
          'settings': [
            './src/components/settings/SettingsModal.tsx',
            './src/components/settings/sections/AppearanceSettings.tsx',
            './src/components/settings/sections/EditorSettings.tsx',
            './src/components/settings/sections/ShortcutsSettings.tsx',
            './src/components/settings/sections/UpdateSettings.tsx',
            './src/components/settings/sections/WorkspaceSettings.tsx',
            './src/components/settings/sections/AppSettings.tsx',
            './src/components/settings/sections/PluginsSettings.tsx'
          ],
          'editor': [
            './src/components/editor/EditorComponent.tsx',
            './src/components/editor/codemirror/extensions.ts',
            './src/components/editor/codemirror/theme.ts'
          ]
        }
      }
    },
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
