import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Drunk-Cubing-Thing/',
  optimizeDeps: {
    exclude: ['cubing'],
  },
})
