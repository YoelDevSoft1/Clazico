import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve("public");
const PORT = 4099;

const MIME = {
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

const TARGETS = [
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/favicon.ico",
];

const server = http.createServer(async (req, res) => {
  const url = req.url.split("?")[0];
  const file = path.join(ROOT, url);
  try {
    const data = await fs.readFile(file);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("404");
  }
});

server.listen(PORT, async () => {
  console.log(`Static server on http://127.0.0.1:${PORT}`);
  for (const t of TARGETS) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}${t}`);
      const ct = r.headers.get("content-type");
      console.log(`${r.ok ? "✓" : "✗"} ${t} → ${r.status} ${ct}`);
    } catch (e) {
      console.log(`✗ ${t} → ${e.message}`);
    }
  }
  server.close();
});