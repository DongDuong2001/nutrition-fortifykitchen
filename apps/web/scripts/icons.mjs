// Regenerates the PWA icons in public/icons from icon.svg with sharp (already installed as a dependency of next).
// Run: node scripts/icons.mjs   Output: icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png, favicon.ico
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
const svg = readFileSync(join(dir, "icon.svg"));

const png = (size) => sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

// PNG-in-ICO: the ICO container may hold PNG images directly.
function ico(images) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e[0] = size === 256 ? 0 : size;
    e[1] = size === 256 ? 0 : size;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([head, ...entries, ...images.map((i) => i.data)]);
}

const out = {
  "icon-192.png": await png(192),
  "icon-512.png": await png(512),
  "icon-512-maskable.png": await png(512),
  "apple-touch-icon.png": await png(180),
};
for (const [name, data] of Object.entries(out)) writeFileSync(join(dir, name), data);
writeFileSync(join(dir, "favicon.ico"), ico([{ size: 32, data: await png(32) }, { size: 48, data: await png(48) }]));
console.log("icons written:", [...Object.keys(out), "favicon.ico"].join(", "));
