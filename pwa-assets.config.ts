import { defineConfig } from '@vite-pwa/assets-generator/config'

const brandBackground = '#0F3D2E'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[48, 'favicon.ico']],
      padding: 0,
    },
    maskable: {
      sizes: [512],
      padding: 0,
      resizeOptions: { background: brandBackground },
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { background: brandBackground },
    },
  },
  images: ['public/logo.svg'],
})
