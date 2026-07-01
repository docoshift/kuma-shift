const zlib = require('zlib');
const fs = require('fs');

function makeBearPNG(size) {
  const s = size / 512;

  // Colors
  const BLUE       = [24, 95, 165];
  const BROWN      = [107, 76, 42];
  const LIGHT_BR   = [196, 154, 108];
  const MED_BR     = [160, 120, 80];
  const DARK       = [44, 24, 16];
  const WHITE      = [255, 255, 255];

  // pixel buffer [r,g,b] per pixel
  const buf = [];
  for (let i = 0; i < size * size; i++) buf.push([...BLUE]);

  function set(x, y, c) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    buf[y * size + x] = c;
  }

  function fillCircle(cx, cy, r, c) {
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(size - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(size - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, c);
      }
    }
  }

  function fillEllipse(cx, cy, rx, ry, c) {
    const x0 = Math.max(0, Math.floor(cx - rx));
    const x1 = Math.min(size - 1, Math.ceil(cx + rx));
    const y0 = Math.max(0, Math.floor(cy - ry));
    const y1 = Math.min(size - 1, Math.ceil(cy + ry));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if ((x - cx) ** 2 / rx ** 2 + (y - cy) ** 2 / ry ** 2 <= 1) set(x, y, c);
      }
    }
  }

  // --- Draw bear ---
  // Ears (outer)
  fillCircle(155 * s, 150 * s, 68 * s, BROWN);
  fillCircle(357 * s, 150 * s, 68 * s, BROWN);
  // Ears (inner)
  fillCircle(155 * s, 148 * s, 40 * s, LIGHT_BR);
  fillCircle(357 * s, 148 * s, 40 * s, LIGHT_BR);
  // Face
  fillCircle(256 * s, 268 * s, 148 * s, LIGHT_BR);
  // Snout
  fillEllipse(256 * s, 300 * s, 60 * s, 46 * s, MED_BR);
  // Eyes
  fillCircle(198 * s, 228 * s, 26 * s, DARK);
  fillCircle(314 * s, 228 * s, 26 * s, DARK);
  // Eye highlights
  fillCircle(206 * s, 220 * s, 10 * s, WHITE);
  fillCircle(322 * s, 220 * s, 10 * s, WHITE);
  // Nose
  fillEllipse(256 * s, 284 * s, 24 * s, 17 * s, DARK);

  // --- Encode PNG ---
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[i] = c;
  }
  function crc32(b) {
    let c = 0xffffffff;
    for (const byte of b) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
    const cv = Buffer.alloc(4); cv.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([l, t, data, cv]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8bit RGB

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = buf[y * size + x];
      row[1 + x * 3] = r;
      row[1 + x * 3 + 1] = g;
      row[1 + x * 3 + 2] = b;
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

fs.writeFileSync('public/icon-192.png', makeBearPNG(192));
fs.writeFileSync('public/icon-512.png', makeBearPNG(512));
console.log('✅ 熊アイコン icon-192.png と icon-512.png を生成しました');
