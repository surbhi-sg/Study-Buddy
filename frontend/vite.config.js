import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forwards /api/... to P3's backend. Change the port if P3 uses a different one.
    proxy: { '/api': 'http://localhost:8000' },
  },
})
