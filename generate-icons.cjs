const zlib = require('zlib');
const fs = require('fs');

function makeBearPNG(size) {
  const s = size / 512;

  const buf = new Array(size * size).fill(null).map(() => [0, 0, 0]);

  function set(x, y, c) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    buf[y * size + x] = [...c];
  }

  function blend(x, y, c, alpha) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const cur = buf[y * size + x];
    buf[y * size + x] = [
      Math.round(cur[0] * (1 - alpha) + c[0] * alpha),
      Math.round(cur[1] * (1 - alpha) + c[1] * alpha),
      Math.round(cur[2] * (1 - alpha) + c[2] * alpha),
    ];
  }

  function fillCircle(cx, cy, r, c) {
    const x0 = Math.max(0, Math.floor(cx - r - 1));
    const x1 = Math.min(size - 1, Math.ceil(cx + r + 1));
    const y0 = Math.max(0, Math.floor(cy - r - 1));
    const y1 = Math.min(size - 1, Math.ceil(cy + r + 1));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, c);
  }

  function fillEllipse(cx, cy, rx, ry, c) {
    const x0 = Math.max(0, Math.floor(cx - rx - 1));
    const x1 = Math.min(size - 1, Math.ceil(cx + rx + 1));
    const y0 = Math.max(0, Math.floor(cy - ry - 1));
    const y1 = Math.min(size - 1, Math.ceil(cy + ry + 1));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if ((x - cx) ** 2 / rx ** 2 + (y - cy) ** 2 / ry ** 2 <= 1) set(x, y, c);
  }

  function blendCircle(cx, cy, r, c, alpha) {
    const x0 = Math.max(0, Math.floor(cx - r - 1));
    const x1 = Math.min(size - 1, Math.ceil(cx + r + 1));
    const y0 = Math.max(0, Math.floor(cy - r - 1));
    const y1 = Math.min(size - 1, Math.ceil(cy + r + 1));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2;
        if (d2 <= r * r) blend(x, y, c, alpha);
      }
  }

  // ── 背景：深いロイヤルブルーグラデーション ──
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ty = y / size;
      // 縦グラデ: 濃い藍青 → 深いロイヤルブルー
      const r = Math.round(20  + 30  * ty);
      const g = Math.round(60  + 40  * ty);
      const b = Math.round(160 + 40  * ty);
      set(x, y, [r, g, b]);
    }
  }

  // ── 光沢ハイライト（上部の白い楕円レンズ）──
  // 薄い大楕円
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - 256 * s) / (220 * s);
      const dy = (y - 120 * s) / (150 * s);
      const d2 = dx * dx + dy * dy;
      if (d2 <= 1) {
        // 中心に向かって薄れる
        const a = (1 - Math.sqrt(d2)) * 0.28;
        blend(x, y, [200, 225, 255], a);
      }
    }
  }
  // 強い小光点（左上）
  blendCircle(180 * s, 90 * s, 55 * s, [255, 255, 255], 0.22);
  blendCircle(195 * s, 100 * s, 30 * s, [255, 255, 255], 0.18);

  // 下部の反射光（底の青みがかった光）
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - 256 * s) / (180 * s);
      const dy = (y - 450 * s) / (100 * s);
      if (dx * dx + dy * dy <= 1) {
        blend(x, y, [80, 140, 255], 0.18);
      }
    }
  }

  // ── 小熊（リラックマ風: シンプル・まん丸・のほほん）──
  const cx = 256 * s;
  const cy = 290 * s;

  const CREAM   = [240, 215, 175]; // クリーム色の毛
  const LCREAM  = [250, 235, 200]; // 明るいクリーム
  const BROWN   = [90,  55,  20];  // 耳の縁・鼻
  const BEIGE   = [210, 175, 130]; // やや濃い毛色
  const INNEAR  = [210, 140, 130]; // 耳内側（くすみピンク）
  const MUZZLE  = [230, 195, 155]; // マズル
  const BLACK   = [30,  15,  5];   // 目
  const WHITE   = [255, 255, 255];

  // 耳（外）- 丸くて大きい
  fillCircle(152 * s, 188 * s, 72 * s, BROWN);
  fillCircle(360 * s, 188 * s, 72 * s, BROWN);
  // 耳（クリーム）
  fillCircle(152 * s, 184 * s, 56 * s, CREAM);
  fillCircle(360 * s, 184 * s, 56 * s, CREAM);
  // 耳の内側（ピンクベージュ）
  fillCircle(152 * s, 182 * s, 34 * s, INNEAR);
  fillCircle(360 * s, 182 * s, 34 * s, INNEAR);

  // 顔（大きく丸い）
  fillCircle(cx, cy, 168 * s, BEIGE);       // 輪郭の影
  fillCircle(cx, cy - 4 * s, 160 * s, CREAM); // 顔メイン

  // 頭頂ハイライト（毛並み感）
  fillEllipse(cx, cy - 80 * s, 90 * s, 60 * s, LCREAM);

  // マズル（口周り・楕円・リラックマらしく大きめ）
  fillEllipse(cx, cy + 50 * s, 75 * s, 55 * s, BEIGE);
  fillEllipse(cx, cy + 58 * s, 62 * s, 44 * s, MUZZLE);

  // 鼻（小さい逆三角・シンプル）
  fillEllipse(cx, cy + 6 * s, 20 * s, 14 * s, BROWN);
  fillEllipse(cx, cy + 4 * s, 20 * s, 14 * s, BLACK);
  // 鼻ハイライト
  fillCircle(cx - 6 * s, cy + 1 * s, 5 * s, [100, 60, 40]);

  // 口（リラックマ風：なだらかなW字・シンプル）
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    // 左弧
    const lx = Math.round((cx / s - 44 * t) * s);
    const ly = Math.round((cy / s + 22 + 18 * Math.sin(t * Math.PI)) * s);
    fillCircle(lx, ly, 4 * s, BROWN);
    // 右弧
    const rx = Math.round((cx / s + 44 * t) * s);
    fillCircle(rx, ly, 4 * s, BROWN);
  }

  // 目（シンプルな黒丸 + ツヤ）- リラックマらしく離れ気味
  fillCircle(cx - 58 * s, cy - 48 * s, 26 * s, BLACK);
  fillCircle(cx + 58 * s, cy - 48 * s, 26 * s, BLACK);
  // 目のハイライト（白い点ふたつ）
  fillCircle(cx - 50 * s, cy - 58 * s, 9 * s, WHITE);
  fillCircle(cx + 66 * s, cy - 58 * s, 9 * s, WHITE);
  fillCircle(cx - 44 * s, cy - 51 * s, 4 * s, WHITE);
  fillCircle(cx + 72 * s, cy - 51 * s, 4 * s, WHITE);

  // ほっぺ（うっすらピンク・やわらか）
  blendCircle(cx - 110 * s, cy + 10 * s, 45 * s, [240, 160, 140], 0.28);
  blendCircle(cx + 110 * s, cy + 10 * s, 45 * s, [240, 160, 140], 0.28);

  // ── PNG エンコード ──
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
      row[1 + x * 3] = r; row[1 + x * 3 + 1] = g; row[1 + x * 3 + 2] = b;
    }
    rows.push(row);
  }
  const compressed = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

fs.writeFileSync('public/icon-192.png', makeBearPNG(192));
fs.writeFileSync('public/icon-512.png', makeBearPNG(512));
console.log('✅ リラックマ風小熊アイコン生成完了');
