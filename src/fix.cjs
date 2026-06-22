const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// テーブルコンテナの高さ制限を解除してscaleで縦も縮小
c = c.replace(
  'overflowX:"auto", overflowY:"auto"',
  'overflowX:"auto", overflowY:"auto", ...(zoomOut?{transform:"scale(0.45)",transformOrigin:"top left",height:"222%"}:{})'
);

// colWの計算を31日で固定
c = c.replace(
  'const colW = zoomOut ? Math.floor((window.innerWidth - 60) / adminDays) : COL_W;',
  'const colW = zoomOut ? Math.floor((window.innerWidth - 60) / 31) : COL_W;'
);

fs.writeFileSync('src/App.jsx', c);
console.log('done');
