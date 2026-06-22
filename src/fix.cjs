const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// ズーム時はCOL_Wを小さくする
c = c.replace(
  'overflowX:"auto", overflowY:"auto", ...(zoomOut?{transform:"scale(0.45)",transformOrigin:"top left",width:"222%"}:{})',
  'overflowX:"auto", overflowY:"auto"'
);

c = c.replace(
  'width: NAME_W + COL_W * adminDays',
  'width: zoomOut ? "100%" : NAME_W + COL_W * adminDays'
);

c = c.replace(
  'const thDate = (dow) => ({ background:"#f0f0f0"',
  'const colW = zoomOut ? Math.floor((window.innerWidth - 60) / adminDays) : COL_W;\n  const thDate = (dow) => ({ background:"#f0f0f0"'
);

c = c.replace(
  'width:COL_W, minWidth:COL_W, maxWidth:COL_W });',
  'width:colW, minWidth:colW, maxWidth:colW });'
);

c = c.replace(
  'width:COL_W, minWidth:COL_W, maxWidth:COL_W, height:40',
  'width:colW, minWidth:colW, maxWidth:colW, height:40'
);

fs.writeFileSync('src/App.jsx', c);
console.log('done');
