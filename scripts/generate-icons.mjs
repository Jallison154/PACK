// Minimal valid 1x1 orange PNG
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

import { writeFileSync } from 'fs'

for (const name of ['pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png']) {
  writeFileSync(`public/${name}`, PNG_1X1)
}
console.log('Placeholder icons created')
