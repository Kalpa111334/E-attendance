import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 3000,
      open: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', '@supabase/supabase-js'],
          },
        },
      },
    },
    base: '/',
    define: {
      'import.meta.env.VITE_TEXTLOCAL_API_KEY': JSON.stringify(process.env.VITE_TEXTLOCAL_API_KEY),
    },
  }
}) 