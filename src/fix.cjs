const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// 1. useState追加
c = c.replace(
  'export default function App() {',
  'export default function App() {\n  const [zoomOut, setZoomOut] = useState(false);'
);

// 2. 全体表示ボタンをExcelの左隣に追加
c = c.replace(
  '<button onClick={downloadExcel}',
  '<button onClick={() => setZoomOut(!zoomOut)} style={{padding:"6px 14px",background:"#4a90e2",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:13,fontWeight:600}}>全体表示</button>\n                  <button onClick={downloadExcel}'
);

// 3. ズーム機能をテーブルに適用
c = c.replace(
  'overflowX:"auto", overflowY:"auto"',
  'overflowX:"auto", overflowY:"auto", ...(zoomOut?{transform:"scale(0.45)",transformOrigin:"top left"}:{})'
);

fs.writeFileSync('src/App.jsx', c);
console.log('done');
