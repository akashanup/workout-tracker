// Script to generate PWA icons from SVG
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, 'public');

// Simple colored square with "W" letter as icon
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#4f46e5"/>
  <text x="256" y="380" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="320" font-weight="bold">W</text>
</svg>
`;

async function generateIcons() {
  const svgBuffer = Buffer.from(svgIcon);
  
  // Generate 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Created pwa-192x192.png');
  
  // Generate 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Created pwa-512x512.png');
  
  // Generate apple-touch-icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png');
  
  // Generate favicon (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon.png'));
  console.log('✓ Created favicon.png');
  
  console.log('\n✅ All PWA icons generated successfully!');
  console.log('Note: Rename favicon.png to favicon.ico or use a converter for proper ICO format.');
}

generateIcons().catch(console.error);
