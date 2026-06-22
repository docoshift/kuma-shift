const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// テーブルコンテナの幅を画面幅に合わせて、名前列+14日分を初期表示
c = c.replace(
  'overflowX:"auto", overflowY:"auto", maxHeight:"calc(100vh - 120px)", width:"100%"',
  'overflowX:"auto", overflowY:"auto", maxHeight:"calc(100vh - 120px)", width:"100%", WebkitOverflowScrolling:"touch"'
);

// COL_Wを動的に計算（画面幅から名前列を引いて14日分で割る）
c = c.replace(
  'const NAME_W = 100;\nconst COL_W = 58;',
  'const NAME_W = 100;\nconst COL_W = typeof window !== "undefined" ? Math.floor((window.innerWidth - NAME_W) / 14) : 58;'
);

fs.writeFileSync('src/App.jsx', c);
console.log('done');
