const zlib = require('zlib');
const fs = require('fs');

function makeBearPNG(size) {
  const s = size / 512;

  // 明るいきれいな青のパレット
  const BG_TOP    = [100, 180, 255]; // 明るいスカイブルー
  const BG_BOT    = [24,  95,  200]; // 鮮やかなブルー
  const BROWN     = [80,  45,  10];  // 耳の輪郭
  const FUR       = [220, 175, 120]; // 顔の毛色
  const LIGHTFUR  = [245, 215, 165]; // 明るい毛色
  const INNEAR    = [200, 130, 110]; // 耳の内側ピンク
  const SNOUT_C   = [200, 150, 95];  // マズル
  const DARK      = [25,  10,  0];   // 目・鼻
  const WHITE     = [255, 255, 255];
  const NOSE_C    = [180, 80,  80];  // 鼻（赤みがかった）

  const buf = [];
  for (let i = 0; i < size * size; i++) buf.push([0, 0, 0]);

  function set(x, y, c) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    buf[y * size + x] = [...c];
  }

  function fillCircle(cx, cy, r, c) {
    const x0 = Math.max(0, Math.floor(cx - r - 1));
    const x1 = Math.min(size - 1, Math.ceil(cx + r + 1));
    const y0 = Math.max(0, Math.floor(cy - r - 1));
    const y1 = Math.min(size - 1, Math.ceil(cy + r + 1));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if ((x-cx)**2 + (y-cy)**2 <= r*r) set(x, y, c);
  }

  function fillEllipse(cx, cy, rx, ry, c) {
    const x0 = Math.max(0, Math.floor(cx - rx - 1));
    const x1 = Math.min(size - 1, Math.ceil(cx + rx + 1));
    const y0 = Math.max(0, Math.floor(cy - ry - 1));
    const y1 = Math.min(size - 1, Math.ceil(cy + ry + 1));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if ((x-cx)**2/rx**2 + (y-cy)**2/ry**2 <= 1) set(x, y, c);
  }

  // グラデーション背景（明るいスカイブルー→鮮やかブルー）
  for (let y = 0; y < size; y++) {
    const t = y / size;
    const r = Math.round(BG_TOP[0] * (1-t) + BG_BOT[0] * t);
    const g = Math.round(BG_TOP[1] * (1-t) + BG_BOT[1] * t);
    const b = Math.round(BG_TOP[2] * (1-t) + BG_BOT[2] * t);
    for (let x = 0; x < size; x++) set(x, y, [r, g, b]);
  }

  // 耳（外側）- 小熊らしく大きめ丸耳
  fillCircle(150*s, 175*s, 78*s, BROWN);
  fillCircle(362*s, 175*s, 78*s, BROWN);
  // 耳（毛色）
  fillCircle(150*s, 172*s, 62*s, FUR);
  fillCircle(362*s, 172*s, 62*s, FUR);
  // 耳の内側（ピンク）
  fillCircle(150*s, 170*s, 38*s, INNEAR);
  fillCircle(362*s, 170*s, 38*s, INNEAR);

  // 顔（大きくて丸い・小熊らしく）
  fillCircle(256*s, 295*s, 168*s, BROWN); // 影
  fillCircle(256*s, 288*s, 160*s, FUR);   // 顔メイン
  // 頭頂部ハイライト
  fillEllipse(256*s, 200*s, 100*s, 65*s, LIGHTFUR);

  // 目（大きくてかわいい・子熊らしく）
  fillCircle(190*s, 250*s, 36*s, DARK); // 左目
  fillCircle(322*s, 250*s, 36*s, DARK); // 右目
  // 目の輝き
  fillCircle(200*s, 238*s, 13*s, WHITE);
  fillCircle(332*s, 238*s, 13*s, WHITE);
  fillCircle(207*s, 247*s,  6*s, WHITE);
  fillCircle(339*s, 247*s,  6*s, WHITE);

  // マズル（口周り・楕円）
  fillEllipse(256*s, 318*s, 70*s, 54*s, SNOUT_C);
  fillEllipse(256*s, 326*s, 58*s, 44*s, LIGHTFUR);

  // 鼻（小さくてかわいい）
  fillEllipse(256*s, 300*s, 22*s, 16*s, DARK);
  fillEllipse(256*s, 297*s, 22*s, 16*s, NOSE_C);
  fillCircle(248*s, 293*s, 6*s, [230, 120, 120]); // 鼻ハイライト

  // 口（w字型・かわいく）
  for (let i = 0; i <= 20; i++) {
    const t2 = i / 20;
    // 左の弧
    const lx = Math.round((256 - 40 * t2) * s);
    const ly = Math.round((322 + 18 * Math.sin(t2 * Math.PI)) * s);
    fillCircle(lx, ly, 4*s, BROWN);
    // 右の弧
    const rx = Math.round((256 + 40 * t2) * s);
    const ry2 = Math.round((322 + 18 * Math.sin(t2 * Math.PI)) * s);
    fillCircle(rx, ry2, 4*s, BROWN);
  }

  // ほっぺ（赤みがかったピンク・かわいさUP）
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 左ほっぺ
      if ((x-152*s)**2 + (y-295*s)**2 <= (42*s)**2) {
        const cur = buf[y*size+x];
        buf[y*size+x] = [
          Math.min(255, cur[0] + 30),
          Math.max(0, cur[1] - 10),
          Math.max(0, cur[2] - 10),
        ];
      }
      // 右ほっぺ
      if ((x-360*s)**2 + (y-295*s)**2 <= (42*s)**2) {
        const cur = buf[y*size+x];
        buf[y*size+x] = [
          Math.min(255, cur[0] + 30),
          Math.max(0, cur[1] - 10),
          Math.max(0, cur[2] - 10),
        ];
      }
    }
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
      row[1+x*3] = r; row[1+x*3+1] = g; row[1+x*3+2] = b;
    }
    rows.push(row);
  }
  const compressed = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

fs.writeFileSync('public/icon-192.png', makeBearPNG(192));
fs.writeFileSync('public/icon-512.png', makeBearPNG(512));
console.log('✅ かわいい小熊アイコンを生成しました');
