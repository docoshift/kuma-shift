const zlib = require('zlib');
const fs = require('fs');

function makeBearPNG(size) {
  const s = size / 512;

  // カラーパレット（よりリッチな配色）
  const NAVY      = [18, 52, 96];    // 濃紺背景
  const BLUE      = [24, 95, 165];   // メインブルー
  const LIGHTBLUE = [56, 140, 220];  // ハイライトブルー
  const BROWN     = [90, 55, 25];    // 耳・輪郭
  const FUR       = [210, 165, 110]; // 顔の毛色
  const LIGHTFUR  = [235, 200, 155]; // 明るい毛色
  const SNOUT     = [185, 135, 85];  // 鼻周り
  const DARK      = [30, 15, 5];     // 目・鼻
  const WHITE     = [255, 255, 255]; // 目の輝き
  const PINK      = [220, 140, 130]; // 鼻ピンク
  const CREAM     = [245, 225, 190]; // 鼻下クリーム

  const buf = [];
  for (let i = 0; i < size * size; i++) buf.push([...NAVY]);

  function set(x, y, c) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    buf[y * size + x] = [...c];
  }

  function inCircle(x, y, cx, cy, r) {
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  }

  function inEllipse(x, y, cx, cy, rx, ry) {
    return (x - cx) ** 2 / rx ** 2 + (y - cy) ** 2 / ry ** 2 <= 1;
  }

  function fillCircle(cx, cy, r, c) {
    const x0 = Math.max(0, Math.floor(cx - r - 1));
    const x1 = Math.min(size - 1, Math.ceil(cx + r + 1));
    const y0 = Math.max(0, Math.floor(cy - r - 1));
    const y1 = Math.min(size - 1, Math.ceil(cy + r + 1));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (inCircle(x, y, cx, cy, r)) set(x, y, c);
  }

  function fillEllipse(cx, cy, rx, ry, c) {
    const x0 = Math.max(0, Math.floor(cx - rx - 1));
    const x1 = Math.min(size - 1, Math.ceil(cx + rx + 1));
    const y0 = Math.max(0, Math.floor(cy - ry - 1));
    const y1 = Math.min(size - 1, Math.ceil(cy + ry + 1));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (inEllipse(x, y, cx, cy, rx, ry)) set(x, y, c);
  }

  // グラデーション風背景（上が明るい青、下が濃紺）
  for (let y = 0; y < size; y++) {
    const t = y / size;
    const r = Math.round(LIGHTBLUE[0] * (1 - t) + NAVY[0] * t);
    const g = Math.round(LIGHTBLUE[1] * (1 - t) + NAVY[1] * t);
    const b = Math.round(LIGHTBLUE[2] * (1 - t) + NAVY[2] * t);
    for (let x = 0; x < size; x++) set(x, y, [r, g, b]);
  }

  // 耳（外側・影）
  fillCircle(148 * s, 158 * s, 72 * s, BROWN);
  fillCircle(364 * s, 158 * s, 72 * s, BROWN);
  // 耳（内側・明るい）
  fillCircle(148 * s, 154 * s, 44 * s, FUR);
  fillCircle(364 * s, 154 * s, 44 * s, FUR);
  // 耳（内側ピンク）
  fillCircle(148 * s, 154 * s, 26 * s, PINK);
  fillCircle(364 * s, 154 * s, 26 * s, PINK);

  // 顔の影（輪郭）
  fillCircle(256 * s, 285 * s, 158 * s, BROWN);
  // 顔メイン
  fillCircle(256 * s, 280 * s, 150 * s, FUR);
  // 顔の上部ハイライト
  fillEllipse(256 * s, 220 * s, 110 * s, 70 * s, LIGHTFUR);

  // 目の周り（影）
  fillCircle(192 * s, 240 * s, 32 * s, BROWN);
  fillCircle(320 * s, 240 * s, 32 * s, BROWN);
  // 目（黒目）
  fillCircle(192 * s, 238 * s, 26 * s, DARK);
  fillCircle(320 * s, 238 * s, 26 * s, DARK);
  // 目の輝き（大）
  fillCircle(200 * s, 228 * s, 10 * s, WHITE);
  fillCircle(328 * s, 228 * s, 10 * s, WHITE);
  // 目の輝き（小）
  fillCircle(205 * s, 234 * s, 5 * s, WHITE);
  fillCircle(333 * s, 234 * s, 5 * s, WHITE);

  // 鼻周り（マズル）
  fillEllipse(256 * s, 308 * s, 68 * s, 52 * s, SNOUT);
  // 鼻下クリーム
  fillEllipse(256 * s, 318 * s, 52 * s, 38 * s, CREAM);
  // 鼻
  fillEllipse(256 * s, 293 * s, 26 * s, 19 * s, DARK);
  // 鼻のハイライト
  fillCircle(248 * s, 288 * s, 7 * s, [80, 60, 55]);

  // 口（くぼみ）
  fillCircle(256 * s, 322 * s, 6 * s, SNOUT);
  // 口角の線（左）
  for (let i = 0; i < 22 * s; i++) {
    const x = Math.round((256 - i) * s);
    const y = Math.round((322 + i * 0.55) * s);
    fillCircle(x, y, 3 * s, BROWN);
  }
  // 口角の線（右）
  for (let i = 0; i < 22 * s; i++) {
    const x = Math.round((256 + i) * s);
    const y = Math.round((322 + i * 0.55) * s);
    fillCircle(x, y, 3 * s, BROWN);
  }

  // PNG エンコード
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
  ihdr[8] = 8; ihdr[9] = 2;

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
  const compressed = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

fs.writeFileSync('public/icon-192.png', makeBearPNG(192));
fs.writeFileSync('public/icon-512.png', makeBearPNG(512));
console.log('✅ かっこいい熊アイコンを生成しました');
