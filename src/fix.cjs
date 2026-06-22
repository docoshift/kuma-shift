const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(
  'overflowX:"auto", overflowY:"auto", ...(zoomOut?{transform:"scale(0.45)",transformOrigin:"top left"}:{})',
  'overflowX:"auto", overflowY:"auto", ...(zoomOut?{transform:"scale(0.45)",transformOrigin:"top left",width:"222%"}:{})'
);

fs.writeFileSync('src/App.jsx', c);
console.log('done');
