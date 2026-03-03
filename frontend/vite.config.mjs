import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import jsconfigPaths from 'vite-jsconfig-paths';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const API_URL = env.VITE_APP_BASE_NAME || '/';
  const API_BASE_URL = env.VITE_API_URL || 'http://localhost:8080/api';
  const PORT = 3000;

  return {
    base: API_URL,
    // Force host to localhost and disable auto open to avoid external preview links (Codespaces previews)
    server: {
      open: false,
      port: PORT,
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false
        }
      }
    },
    preview: {
      open: false,
      host: 'localhost'
    },
    define: {
      global: 'window' // Only if you need it for legacy packages
    },
    resolve: {
      alias: {
        '@ant-design/icons': path.resolve(__dirname, 'node_modules/@ant-design/icons')
        // Add more aliases as needed
      }
    },
    plugins: [react(), jsconfigPaths()],

    optimizeDeps: {
      include: ['@mui/material/Tooltip', 'react', 'react-dom', 'react-router-dom']
    },
    build: {
      chunkSizeWarningLimit: 1000, // Raise warning limit to 1000kb
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === 'EVAL' && typeof warning.id === 'string' && warning.id.includes('exceljs.min.js')) {
            return;
          }
          warn(warning);
        },
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // ExcelJS is the only truly standalone chunk (large, no React dependency)
              if (id.includes('exceljs')) {
                return 'excel';
              }
              // EVERYTHING ELSE from node_modules goes into vendor.
              // Splitting React, MUI, charts, etc. into separate chunks causes
              // circular chunk initialization errors in production builds.
              return 'vendor';
            }
          }
        }
      }
    }
  };
});