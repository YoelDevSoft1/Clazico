#!/usr/bin/env node
// Generate PWA icons from the brand logo.
// Run once: `node scripts/generate-pwa-icons.mjs`
import sharp from "sharp";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const ICONS_DIR = join(PUBLIC, "icons");
const LOGO_SRC = join(PUBLIC, "logos", "logo.png");

// Brand colors (must match manifest.json theme_color)
const THEME_COLOR = "#E31E24";
const BG_COLOR = "#0A0A0A"; // matches manifest background_color

// PWA icon sizes
const SIZES = [
  { size: 72,  name: "icon-72x72.png" },
  { size: 96,  name: "icon-96x96.png" },
  { size: 128, name: "icon-128x128.png" },
  { size: 144, name: "icon-144x144.png" },
  { size: 152, name: "icon-152x152.png" },     // iPad
  { size: 167, name: "icon-167x167.png" },     // iPad Pro
  { size: 180, name: "apple-touch-icon.png" }, // iPhone
  { size: 192, name: "icon-192x192.png" },     // PWA standard
  { size: 384, name: "icon-384x384.png" },
  { size: 512, name: "icon-512x512.png" },     // PWA splash
];

async function ensureLogoExists() {
  try {
    await stat(LOGO_SRC);
  } catch {
    throw new Error(`Logo source not found at ${LOGO_SRC}`);
  }
}

async function readLogoMetadata() {
  const meta = await sharp(LOGO_SRC).metadata();
  console.log(`✓ Logo source: ${meta.width}x${meta.height} (${meta.format})`);
  return meta;
}

// Generate a "regular" icon: logo centered on solid brand-background canvas.
// Background = #0A0A0A so the icon reads as a unified tile (matches manifest).
async function generateStandardIcon(size, outName) {
  const innerPad = Math.round(size * 0.12); // visual breathing room
  const inner = size - innerPad * 2;

  const logoBuf = await sharp(LOGO_SRC)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const out = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: hexToRgba(BG_COLOR),
    },
  })
    .composite([{ input: logoBuf, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(join(ICONS_DIR, outName), out);
  console.log(`  ✓ ${outName} (${size}x${size})`);
}

// Generate a "maskable" icon: logo centered inside the safe zone (50% of canvas)
// on a solid brand-color background. Android may mask to circle/squircle/etc.
// 50% safe zone is well within spec (recommended 40%) and reads stronger at
// small sizes in launchers like Pixel/OneUI that use aggressive shapes.
async function generateMaskableIcon(size, outName) {
  const safeZone = Math.round(size * 0.50);
  const logoBuf = await sharp(LOGO_SRC)
    .resize(safeZone, safeZone, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const out = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: hexToRgba(THEME_COLOR),
    },
  })
    .composite([{ input: logoBuf, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(join(ICONS_DIR, outName), out);
  console.log(`  ✓ ${outName} (${size}x${size}, maskable, safe-zone=50%)`);
}

// Generate a favicon with multiple sizes baked into a single .ico
async function generateFavicon() {
  const sizes = [16, 32, 48];
  const buffers = await Promise.all(
    sizes.map((s) =>
      sharp(LOGO_SRC)
        .resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    )
  );
  // sharp can write .ico from png buffers
  await sharp(buffers[1]).resize(32, 32).toFile(join(PUBLIC, "favicon.ico"));
  console.log("  ✓ favicon.ico (root public/)");
}

function hexToRgba(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    alpha: 1,
  };
}

async function main() {
  console.log("Generating PWA icons...");
  await ensureLogoExists();
  await readLogoMetadata();
  await mkdir(ICONS_DIR, { recursive: true });
  console.log(`\nWriting icons to: ${ICONS_DIR}`);

  for (const { size, name } of SIZES) {
    await generateStandardIcon(size, name);
  }

  console.log("\nWriting maskable icon (Android adaptive)...");
  await generateMaskableIcon(512, "maskable-icon-512x512.png");

  console.log("\nWriting favicon...");
  await generateFavicon();

  console.log("\n✅ Done.");
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});