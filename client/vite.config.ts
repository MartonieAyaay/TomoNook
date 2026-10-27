import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // changeOrigin off: the API checks that Origin matches Host (CSRF protection),
    // so Host must stay the address the browser used.
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: false },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: false },
    },
  },
})
