// Generates the app icons: a 2×2 grid of four coloured squares on near-black.
// No dependencies. Opaque RGB PNGs (iOS shows transparency as black). Run: npm run icons
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";

const BG = [8, 8, 16];
const SQUARES = [[91, 163, 245], [82, 201, 122], [224, 123, 53], [155, 127, 232]]; // blue, green, orange, violet

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const SS = 3; // supersampling for smooth corners
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = pixel((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size);
        r += c[0]; g += c[1]; b += c[2];
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = Math.round(r / 9); raw[o + 1] = Math.round(g / 9); raw[o + 2] = Math.round(b / 9);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB, no alpha
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// margin = empty border around the grid, as a fraction of the icon
function mark(margin) {
  const gap = 0.07, side = (1 - 2 * margin - gap) / 2, rad = side * 0.24;
  return (u, v) => {
    for (let i = 0; i < 4; i++) {
      const x0 = margin + (i % 2) * (side + gap), y0 = margin + Math.floor(i / 2) * (side + gap);
      const dx = Math.max(x0 + rad - u, 0, u - (x0 + side - rad));
      const dy = Math.max(y0 + rad - v, 0, v - (y0 + side - rad));
      if (u >= x0 && u <= x0 + side && v >= y0 && v <= y0 + side && dx * dx + dy * dy <= rad * rad) return SQUARES[i];
    }
    return BG;
  };
}

mkdirSync("public", { recursive: true });
writeFileSync("public/apple-touch-icon.png", png(180, mark(0.2)));
writeFileSync("public/icon-192.png", png(192, mark(0.2)));
writeFileSync("public/icon-512.png", png(512, mark(0.2)));
writeFileSync("public/icon-maskable-512.png", png(512, mark(0.27)));
writeFileSync("public/favicon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#080810"/>` +
  `<rect x="20" y="20" width="26.5" height="26.5" rx="6.4" fill="#5ba3f5"/><rect x="53.5" y="20" width="26.5" height="26.5" rx="6.4" fill="#52c97a"/>` +
  `<rect x="20" y="53.5" width="26.5" height="26.5" rx="6.4" fill="#e07b35"/><rect x="53.5" y="53.5" width="26.5" height="26.5" rx="6.4" fill="#9b7fe8"/></svg>\n`);
console.log("icons written to public/");
