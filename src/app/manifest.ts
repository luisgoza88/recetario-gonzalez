import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Recetario Familia González',
    short_name: 'Recetario',
    description: 'Plan de 15 días - Menú rotativo familiar',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f5',
    theme_color: '#2E7D32',
    orientation: 'portrait',
    scope: '/',
    lang: 'es',
    categories: ['food', 'lifestyle'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/api/pwa-icon/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/api/pwa-icon/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      // Tamaños adicionales para mejor compatibilidad
      {
        src: '/api/pwa-icon/72',
        sizes: '72x72',
        type: 'image/png',
      },
      {
        src: '/api/pwa-icon/96',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/api/pwa-icon/128',
        sizes: '128x128',
        type: 'image/png',
      },
      {
        src: '/api/pwa-icon/144',
        sizes: '144x144',
        type: 'image/png',
      },
      {
        src: '/api/pwa-icon/152',
        sizes: '152x152',
        type: 'image/png',
      },
      {
        src: '/api/pwa-icon/384',
        sizes: '384x384',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Ver Calendario',
        short_name: 'Calendario',
        description: 'Ver el menú del día',
        url: '/?tab=calendar',
      },
      {
        name: 'Lista de Mercado',
        short_name: 'Mercado',
        description: 'Ver lista de compras',
        url: '/?tab=market',
      },
    ],
  };
}
