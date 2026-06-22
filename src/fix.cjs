const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// 既存のzoom関連コードを全部削除してやり直し
c = c.replace(
  'const colW = zoomOut ? Math.floor((window.innerWidth - 60) / 31) : COL_W;',
  ''
);
c = c.replace(
  'overflowX:"auto", overflowY:"auto", ...(zoomOut?{transform:"scale(0.45)",transformOrigin:"top left",height:"222%"}:{})',
  'overflowX:"auto", overflowY:"auto"'
);
c = c.replace(
  'width: zoomOut ? "100%" : NAME_W + COL_W * adminDays',
  'width: NAME_W + COL_W * adminDays'
);
c = c.replace(
  'width:colW, minWidth:colW, maxWidth:colW });',
  'width:COL_W, minWidth:COL_W, maxWidth:COL_W });'
);
c = c.replace(
  'width:colW, minWidth:colW, maxWidth:colW, height:40',
  'width:COL_W, minWidth:COL_W, maxWidth:COL_W, height:40'
);

// 新しい全体表示：テーブル全体をdivで囲んでscaleをdivに適用
c = c.replace(
  '<div style={{ overflowX:"auto", overflowY:"auto"',
  '<div style={{ overflowX: zoomOut?"hidden":"auto", overflowY: zoomOut?"hidden":"auto"'
);

c = c.replace(
  'width: NAME_W + COL_W * adminDays }}>',
  'width: NAME_W + COL_W * adminDays, ...(zoomOut?{transform:`scale(${Math.min(window.innerWidth/(NAME_W+COL_W*adminDays), (window.innerHeight-200)/(45*16+50))})`,transformOrigin:"top left"}:{}) }}>'
);

fs.writeFileSync('src/App.jsx', c);
console.log('done');
