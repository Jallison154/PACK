// One-off icon generator: trims transparent padding from the source mark,
// centers it on a square canvas with padding, and emits all PWA/favicon sizes.
// Usage: node scripts/generate-icons.mjs <source.png>
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const src = process.argv[2]
if (!src) {
  console.error('Usage: node scripts/generate-icons.mjs <source.png>')
  process.exit(1)
}

const publicDir = resolve(import.meta.dirname, '..', 'public')
mkdirSync(publicDir, { recursive: true })

// Trim transparent edges so the mark is centered regardless of source layout.
const trimmed = await sharp(src).trim().png().toBuffer()
const meta = await sharp(trimmed).metadata()
const size = Math.max(meta.width, meta.height)

// Pad ~12% around the mark so it breathes inside the icon.
const pad = Math.round(size * 0.12)
const canvas = size + pad * 2

const centered = await sharp(trimmed)
  .extend({
    top: Math.round((canvas - meta.height) / 2),
    bottom: Math.round((canvas - meta.height) / 2),
    left: Math.round((canvas - meta.width) / 2),
    right: Math.round((canvas - meta.width) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer()

// The mark contains white shapes, so every icon needs the dark brand
// background — a transparent favicon would disappear on light tabs.
const outputs = [
  { file: 'favicon.png', px: 64, bg: '#0a0a0a' },
  { file: 'pack-icon.png', px: 512, bg: '#0a0a0a' },
  { file: 'pwa-192x192.png', px: 192, bg: '#0a0a0a' },
  { file: 'pwa-512x512.png', px: 512, bg: '#0a0a0a' },
  { file: 'apple-touch-icon.png', px: 180, bg: '#0a0a0a' },
]

for (const { file, px, bg } of outputs) {
  let img = sharp(centered).resize(px, px, {
    fit: 'contain',
    background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 },
  })
  if (bg) img = img.flatten({ background: bg })
  await img.png().toFile(resolve(publicDir, file))
  console.log(`wrote public/${file} (${px}x${px}${bg ? `, bg ${bg}` : ', transparent'})`)
}

console.log('Done.')
