import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: path.join(__dirname, 'src/main/index.ts'),
        vite: {
          build: {
            // For main process, we want project root context
            outDir: '../../dist-electron',
            rollupOptions: {
              external: ['electron', 'electron-squirrel-startup'],
            }
          }
        }
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        input: path.join(__dirname, 'src/main/preload.ts'),
        vite: {
          build: {
            outDir: '../../dist-electron',
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: 'preload.cjs', // Force .cjs extension for CommonJS
                inlineDynamicImports: true,
              },
            },
          }
        }
      },
      // Ployfill the Electron and Node.js built-in modules for Renderer process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: {},
    }),
  ],
  base: './',
  root: 'src/renderer',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src'),
      'src': path.resolve(__dirname, 'src'),
    },
  },
})
