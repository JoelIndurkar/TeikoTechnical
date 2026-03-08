import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // needed for Codespaces to expose the port
    proxy: {
      '/api': 'http://localhost:8000', // forward API calls to FastAPI
    },
  },
})
