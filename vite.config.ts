import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
        proxy: {
          '/openwa-proxy': {
            target: 'https://193-29-187-66.sslip.io',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/openwa-proxy/, ''),
            router: (req) => {
              const targetHeader = req.headers['x-target-url'];
              if (typeof targetHeader === 'string' && targetHeader.startsWith('http')) {
                return targetHeader.replace(/\/$/, '');
              }
              return undefined;
            }
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
