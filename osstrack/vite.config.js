import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // Isso facilita o teste do PWA enquanto você desenvolve
      },
      manifest: {
        name: 'OSS.TRACK',
        short_name: 'Osstrack',
        description: 'Sistema de Gestão BJJ',
        theme_color: '#dc2626',
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          {
            src: '/logo.png', 
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})