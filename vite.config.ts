import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';

  return {
    plugins: [react(), tailwindcss()],
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom', 'motion', 'lucide-react'],
            'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'ai': ['@google/genai'],
            'utils': ['date-fns', 'clsx', 'tailwind-merge'],
            'content': ['react-markdown', 'katex', 'react-katex']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    define: {
      // FIX: Expose API key via BOTH names so every code path works.
      // process.env.GEMINI_API_KEY  → AI Studio injection + some service files
      // import.meta.env.VITE_GEMINI_API_KEY → Standard Vite browser builds
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'global': 'globalThis',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
