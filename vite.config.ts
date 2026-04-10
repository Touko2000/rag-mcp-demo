import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/mcp': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mcp/, ''),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('代理错误:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('代理请求:', req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('代理响应:', req.url, proxyRes.statusCode);
            // 对于 SSE 请求，确保正确设置响应头
            if (req.url === '/mcp-sse' || req.url?.includes('/mcp-sse')) {
              res.setHeader('Content-Type', 'text/event-stream');
              res.setHeader('Cache-Control', 'no-cache, no-transform');
              res.setHeader('Connection', 'keep-alive');
              res.setHeader('X-Accel-Buffering', 'no');
            }
          });
        }
      }
    }
  }
})
