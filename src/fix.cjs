const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(
  '</head>',
  '  <style>html{touch-action:pan-x pan-y pinch-zoom;}</style>\n  </head>'
);
fs.writeFileSync('index.html', c);
console.log('done');
