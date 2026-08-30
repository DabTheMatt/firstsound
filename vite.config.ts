import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Relative base so GitHub Pages project URLs and local preview both work.
  base: './',
  plugins: [react()],
  server: {
    port: 5199,
    host: true,
  },
  test: {
    environment: 'node',
  },
})
