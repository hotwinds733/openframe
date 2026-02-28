import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig(async () => {
  const plugins = [
    tanstackRouter({
      routesDirectory: '../ui/src/routes',
      generatedRouteTree: '../ui/src/routeTree.gen.ts',
    }),
    tailwindcss(),
    react(),
    ...(await electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: process.env.NODE_ENV === 'test' ? undefined : {},
    })),
  ]

  return { plugins }
})
