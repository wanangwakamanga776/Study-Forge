import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');

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
    // AI keys must NEVER be injected into the client bundle. All model calls
    // go through the Supabase edge function (see supabase/functions/generate).
    define: {
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
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
