// vite.config.ts
import { defineConfig, loadEnv, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve'
  const env = loadEnv(mode, process.cwd(), '') // lee .env (VITE_*)

  // Normaliza flags desde .env
  const sourcemap = env.VITE_SOURCEMAP === 'true'
  const minifyEnv = env.VITE_MINIFY?.toLowerCase()
  // <-- AQUI tipamos explícitamente a los valores válidos
  const minify: false | 'esbuild' | 'terser' =
    minifyEnv === 'false' ? false : minifyEnv === 'terser' ? 'terser' : 'esbuild'

  const base = isDev ? '/' : env.VITE_PUBLIC_BASE || '/'

  // Config común, tipada como UserConfig para evitar unions problemáticos
  const common: UserConfig = {
    base,
    plugins: [react()],
    define: {
      __DEV__: JSON.stringify(isDev),
      __API_BASE__: JSON.stringify(
        isDev
          ? env.VITE_API_BASE || 'http://localhost:4000'
          : env.VITE_PUBLIC_API || '/api'
      ),
    },
  }

  if (isDev) {
    return {
      ...common,
      server: {
        port: 5173,
        open: true as const,
        proxy: {
          '/api': {
            target: env.VITE_API_BASE || 'http://localhost:4000',
            changeOrigin: true,
            secure: false,
          },
        },
      },
      optimizeDeps: {
        include: ['react', 'react-dom'],
      },
    }
  }

  // build / preview (producción)
  return {
    ...common,
    build: {
      sourcemap,
      minify, // ✅ tipo correcto
      outDir: 'dist',
      rollupOptions: {
        output: { manualChunks: undefined },
      },
    },
    preview: {
      port: 8080,
    },
  }
})
