const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
c = c.replace('const COL_W = 58;', 'const COL_W = typeof window !== "undefined" ? Math.floor((window.innerWidth - 100) / 14) : 58;');
fs.writeFileSync('src/App.jsx', c);
console.log('done');
