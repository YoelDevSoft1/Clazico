import sharp from "sharp";
import path from "node:path";

const dir = "public/icons";
const expected = {
  "icon-72x72.png": 72,
  "icon-96x96.png": 96,
  "icon-128x128.png": 128,
  "icon-144x144.png": 144,
  "icon-152x152.png": 152,
  "icon-167x167.png": 167,
  "apple-touch-icon.png": 180,
  "icon-192x192.png": 192,
  "icon-384x384.png": 384,
  "icon-512x512.png": 512,
  "maskable-icon-512x512.png": 512,
};

let allOk = true;
for (const [f, exp] of Object.entries(expected)) {
  const p = path.join(dir, f);
  const meta = await sharp(p).metadata();
  const ok = meta.width === exp && meta.height === exp && meta.format === "png";
  console.log(`${ok ? "✓" : "✗"} ${f}: ${meta.width}x${meta.height} (${meta.format})`);
  if (!ok) allOk = false;
}
process.exit(allOk ? 0 : 1);