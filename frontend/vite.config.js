import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forwards /api/... to the backend (backend/.env PORT, default 3000). No CORS issues in development.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
