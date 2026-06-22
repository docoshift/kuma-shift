const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

const lines = c.split('\n');
console.log('533:', lines[532]);

// 533行目を正しい内容に置き換え
lines[532] = '                <table style={{ borderCollapse:"collapse", tableLayout:"fixed", width: NAME_W + COL_W * adminDays }}>';

c = lines.join('\n');
fs.writeFileSync('src/App.jsx', c);
console.log('done');
