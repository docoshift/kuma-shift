const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(
  'const NAME_W = 100;\nconst COL_W = 58;',
  'const NAME_W = 100;\nconst COL_W = typeof window !== "undefined" ? Math.floor((window.innerWidth - NAME_W) / 14) : 58;'
);

fs.writeFileSync('src/App.jsx', c);
console.log('done');
