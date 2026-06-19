import { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const STAFF = [
  { name: "廣瀬 郁哉", priority: null },
  { name: "桝田 大智", priority: null },
  { name: "柳田 煌介", priority: 2 },
  { name: "石倉 美来", priority: 1 },
  { name: "中村 凌斗", priority: 3 },
  { name: "山代 陽翔", priority: null },
  { name: "藤野 なつ", priority: null },
  { name: "小栗 悠", priority: null },
  { name: "中原 雪乃", priority: null },
  { name: "久冨 陽之介", priority: null },
  { name: "置鮎 悠人", priority: null },
  { name: "はまち 正光", priority: null },
  { name: "奥川 瑞羽", priority: null },
  { name: "山田 胡々菜", priority: null },
  { name: "田中 智也", priority: null },
];

const DOW = ["日", "月", "火", "水", "木", "金", "土"];
const ADMIN_PASSWORD = "Doco5555";
const NAME_W = 100;
const COL_W = 58;

function getDow(y, m, d) { return new Date(y, m - 1, d).getDay(); }
function getNeeded(dow) { return dow === 5 || dow === 6 ? 4 : dow === 0 ? 3 : 2; }

const now = new Date();
const YEAR = now.getFullYear();
const NEXT_MONTH = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;

export default function App() {
  const [page, setPage] = useState("staff");
  const [staffPage, setStaffPage] = useState("wish");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [month, setMonth] = useState(NEXT_MONTH);
  const [wishDays, setWishDays] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [modalDay, setModalDay] = useState(null);
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("24:00");
  const [adminTab, setAdminTab] = useState("list");
  const [shiftState, setShiftState] = useState({});
  const [shiftModal, setShiftModal] = useState(null);
  const [dragData, setDragData] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [adminMonth, setAdminMonth] = useState(NEXT_MONTH);
  const [swapFrom, setSwapFrom] = useState("");
  const [swapTo, setSwapTo] = useState("");
  const [swapDay, setSwapDay] = useState("");
  const [swapNote, setSwapNote] = useState("");
  const [swapSubmitted, setSwapSubmitted] = useState(false);
  const [swapRequests, setSwapRequests] = useState([]);

  const daysInMonth = new Date(YEAR, month, 0).getDate();
  const adminDays = new Date(YEAR, adminMonth, 0).getDate();
  const times = ["15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00"];
  const endTimes = ["20:00","20:30","21:00","21:30","22:00","22:30","23:00","23:30","24:00"];

  // シフトデータ取得ヘルパー
  function getShiftText(si, d) {
    const st = shiftState[`${si}_${d}`] || {};
    const parts = [];
    if (st.wish && !st.wishOff) parts.push(st.wish);
    if (st.moved?.length) st.moved.forEach(m => parts.push(m.time));
    if (st.admin) parts.push(st.admin);
    return parts.join("/");
  }

  // Excelダウンロード
  function printCalendar() {
    const allDays = Array.from({ length: adminDays }, (_, i) => i + 1);
    const col1 = allDays.slice(0, 11);
    const col2 = allDays.slice(11, 21);
    const col3 = allDays.slice(21);

    function makeColHTML(days) {
      return days.map(d => {
        const dow = getDow(YEAR, adminMonth, d);
        const color = dow === 0 ? "#cc0000" : dow === 6 ? "#0044aa" : "#333";
        const bg = dow === 0 ? "#ffe6e6" : dow === 6 ? "#e6f0ff" : "#efefef";
        const staffList = STAFF.map((s, si) => {
          const text = getShiftText(si, d);
          return text ? `<div style="font-size:11px;padding:2px 4px;border-bottom:1px solid #eee;">${s.name}　${text}</div>` : "";
        }).join("");
        return `
          <div style="margin-bottom:6px;">
            <div style="background:${bg};color:${color};font-weight:bold;font-size:12px;padding:3px 6px;border:1px solid #ccc;">
              ${adminMonth}/${d}（${DOW[dow]}）
            </div>
            ${staffList || '<div style="font-size:11px;padding:2px 4px;color:#999;">（出勤者なし）</div>'}
          </div>
        `;
      }).join("");
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${YEAR}年${adminMonth}月 シフト表</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: "Meiryo", "Yu Gothic", sans-serif; margin: 0; }
          h2 { font-size: 14px; margin: 0 0 8px; text-align: center; }
          .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h2>${YEAR}年${adminMonth}月 シフト表</h2>
        <div class="grid">
          <div>${makeColHTML(col1)}</div>
          <div>${makeColHTML(col2)}</div>
          <div>${makeColHTML(col3)}</div>
        </div>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }

  function downloadExcel() {
    const allDays = Array.from({ length: adminDays }, (_, i) => i + 1);
    const header = ["名前", ...allDays.map(d => `${d}(${DOW[getDow(YEAR, adminMonth, d)]})`), ""];
    const rows = STAFF.map((_s, si) => {
      const name = STAFF[si].name;
      const cells = allDays.map(d => getShiftText(si, d));
      return [name, ...cells, ""];
    });
    const countRow = ["人数", ...allDays.map(d => {
      return STAFF.filter((_, si) => {
        const st = shiftState[`${si}_${d}`] || {};
        return (st.wish && !st.wishOff) || st.admin || (st.moved?.length > 0);
      }).length;
    }), ""];

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows, countRow]);

    // 列幅設定
    ws["!cols"] = [{ wch: 14 }, ...allDays.map(() => ({ wch: 10 })), { wch: 2 }];

    // ヘッダー行のスタイル
    allDays.forEach((d, i) => {
      const dow = getDow(YEAR, adminMonth, d);
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i + 1 })];
      if (cell) {
        cell.s = {
          fill: { fgColor: { rgb: dow === 0 ? "FFE6E6" : dow === 6 ? "E6F0FF" : "F0F0F0" } },
          font: { bold: true, color: { rgb: dow === 0 ? "CC0000" : dow === 6 ? "0044AA" : "000000" } },
          alignment: { horizontal: "center" },
          border: { top:{style:"thin"}, bottom:{style:"thin"}, left:{style:"thin"}, right:{style:"thin"} }
        };
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${YEAR}年${adminMonth}月シフト`);
    XLSX.writeFile(wb, `シフト表_${YEAR}年${adminMonth}月.xlsx`);
  }

  // PDFダウンロード
  function downloadPDF() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });

    // フォント設定（日本語対応のためBase64フォントは使わずデフォルトで）
    doc.setFont("helvetica");

    const allDays = Array.from({ length: adminDays }, (_, i) => i + 1);
    const head = [["名前", ...allDays.map(d => `${d}\n${DOW[getDow(YEAR, adminMonth, d)]}`)]];
    const body = STAFF.map((_s, si) => [
      STAFF[si].name,
      ...allDays.map(d => getShiftText(si, d))
    ]);
    const countRow = ["人数", ...allDays.map(d => {
      const count = STAFF.filter((_, si) => {
        const st = shiftState[`${si}_${d}`] || {};
        return (st.wish && !st.wishOff) || st.admin || (st.moved?.length > 0);
      }).length;
      return String(count);
    })];
    body.push(countRow);

    doc.setFontSize(14);
    doc.text(`${YEAR}年${adminMonth}月 シフト表`, 14, 14);

    autoTable(doc, {
      head,
      body,
      startY: 20,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.5, halign: "center", valign: "middle" },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 7 },
      columnStyles: { 0: { halign: "left", cellWidth: 22, fontStyle: "bold" } },
      didParseCell: (data) => {
        if (data.section === "head" && data.column.index > 0) {
          const d = allDays[data.column.index - 1];
          const dow = getDow(YEAR, adminMonth, d);
          if (dow === 0) { data.cell.styles.textColor = [200, 0, 0]; data.cell.styles.fillColor = [255, 230, 230]; }
          else if (dow === 6) { data.cell.styles.textColor = [0, 50, 180]; data.cell.styles.fillColor = [230, 240, 255]; }
        }
        if (data.section === "body" && data.row.index < STAFF.length) {
          const d = allDays[data.column.index - 1];
          if (data.column.index > 0 && d) {
            const si = data.row.index;
            const st = shiftState[`${si}_${d}`] || {};
            if (st.wish && !st.wishOff) data.cell.styles.fillColor = [181, 212, 244];
            else if (st.admin || st.moved?.length > 0) data.cell.styles.fillColor = [204, 255, 102];
          }
        }
      },
      margin: { left: 5, right: 5 },
    });

    doc.save(`シフト表_${YEAR}年${adminMonth}月.pdf`);
  }

  function submitWish() {
    if (!selectedStaff) return alert("名前を選択してください");
    if (Object.keys(wishDays).length === 0) return alert("希望日を選択してください");
    const si = STAFF.findIndex((s) => s.name === selectedStaff);
    setShiftState((prev) => {
      const n = { ...prev };
      Object.entries(wishDays).forEach(([d, t]) => { n[`${si}_${d}`] = { ...n[`${si}_${d}`], wish: t, wishOff: false }; });
      return n;
    });
    setSubmitted(true);
  }

  function submitSwap() {
    if (!swapFrom) return alert("申請者を選択してください");
    if (!swapTo) return alert("交代相手を選択してください");
    if (!swapDay) return alert("交代日を入力してください");
    if (swapFrom === swapTo) return alert("同じ人は選択できません");
    setSwapRequests((prev) => [...prev, { id: Date.now(), from: swapFrom, to: swapTo, day: swapDay, note: swapNote, status: "pending" }]);
    setSwapSubmitted(true);
  }

  function approveSwap(id) {
    const req = swapRequests.find((r) => r.id === id);
    if (!req) return;
    setSwapRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "approved" } : r));
    const fromSi = STAFF.findIndex((s) => s.name === req.from);
    const toSi = STAFF.findIndex((s) => s.name === req.to);
    setShiftState((prev) => {
      const n = { ...prev };
      const fromK = `${fromSi}_${req.day}`;
      const toK = `${toSi}_${req.day}`;
      const time = n[fromK]?.wish || n[fromK]?.admin || "17:00-24:00";
      if (!n[toK]) n[toK] = {};
      if (!n[toK].moved) n[toK].moved = [];
      n[toK].moved.push({ time, swapFrom: req.from });
      return n;
    });
  }

  function rejectSwap(id) { setSwapRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected" } : r)); }

  function openWishModal(d) { setModalDay(d); setStartTime(wishDays[d]?.split("-")[0] || "17:00"); setEndTime(wishDays[d]?.split("-")[1] || "24:00"); }
  function saveWishModal() { setWishDays((p) => ({ ...p, [modalDay]: `${startTime}-${endTime}` })); setModalDay(null); }
  function login() { if (pwInput === ADMIN_PASSWORD) { setAdminUnlocked(true); setPwError(false); } else setPwError(true); }
  function removeWish(si, d) { setShiftState((p) => ({ ...p, [`${si}_${d}`]: { ...p[`${si}_${d}`], wishOff: true } })); }
  function restoreWish(si, d) { setShiftState((p) => ({ ...p, [`${si}_${d}`]: { ...p[`${si}_${d}`], wishOff: false } })); }
  function removeAdmin(si, d) { setShiftState((p) => { const n = { ...p }; if (n[`${si}_${d}`]) delete n[`${si}_${d}`].admin; return n; }); }
  function removeMoved(si, d, mi) {
    setShiftState((p) => { const n = { ...p }; const k = `${si}_${d}`; if (n[k]?.moved) { n[k] = { ...n[k], moved: [...n[k].moved] }; n[k].moved.splice(mi, 1); } return n; });
  }
  function saveShiftModal() {
    const { si, d, mi } = shiftModal;
    const k = `${si}_${d}`;
    if (mi !== undefined) {
      setShiftState((p) => { const n = { ...p }; n[k] = { ...n[k], moved: [...(n[k].moved||[])] }; n[k].moved[mi] = { ...n[k].moved[mi], time: `${startTime}-${endTime}` }; return n; });
    } else {
      setShiftState((p) => ({ ...p, [k]: { ...p[k], admin: `${startTime}-${endTime}` } }));
    }
    setShiftModal(null);
  }
  function onDrop(toSi, toD) {
    setDragOver(null);
    if (!dragData) return;
    const { si, d, type, mi } = dragData;
    if (si === toSi && String(d) === String(toD)) return;
    setShiftState((p) => {
      const n = JSON.parse(JSON.stringify(p));
      const fk = `${si}_${d}`, tk = `${toSi}_${toD}`;
      let time = "";
      if (type === "wish") { time = n[fk]?.wish; }
      else if (type === "moved") { time = n[fk]?.moved?.[mi]?.time; if (n[fk]?.moved) n[fk].moved.splice(mi, 1); }
      else if (type === "admin") { time = n[fk]?.admin; if (n[fk]) delete n[fk].admin; }
      if (!n[tk]) n[tk] = {};
      if (!n[tk].moved) n[tk].moved = [];
      n[tk].moved.push({ time });
      return n;
    });
    setDragData(null);
  }

  const thName = { position:"sticky", left:0, zIndex:3, background:"#f0f0f0", border:"0.5px solid #bbb", padding:"4px 6px", fontWeight:600, fontSize:12, width:NAME_W, minWidth:NAME_W, maxWidth:NAME_W, textAlign:"left" };
  const tdName = { position:"sticky", left:0, zIndex:2, background:"#f9f9f9", border:"0.5px solid #ddd", padding:"3px 6px", whiteSpace:"nowrap", fontWeight:500, fontSize:11, width:NAME_W, minWidth:NAME_W, maxWidth:NAME_W };
  const thDate = (dow) => ({ background:"#f0f0f0", border:"0.5px solid #bbb", padding:"2px 0", textAlign:"center", color: dow===0?"#E24B4A":dow===6?"#185FA5":"#444", fontSize:10, fontWeight:500, width:COL_W, minWidth:COL_W, maxWidth:COL_W });
  const tdDate = (isOver) => ({ border:"0.5px solid #ddd", padding:1, verticalAlign:"top", background: isOver?"#f0f9e8":"#fff", width:COL_W, minWidth:COL_W, maxWidth:COL_W, height:40 });
  const chip = (bg, color) => ({ fontSize:11, background:bg, color, borderRadius:2, padding:"2px 4px", margin:"1px 0", cursor:"grab", lineHeight:1.5, display:"flex", justifyContent:"space-between", alignItems:"center", fontWeight:600 });
  const pendingCount = swapRequests.filter((r) => r.status === "pending").length;

  return (
    <div style={{ fontFamily:"sans-serif", width:"100vw", margin:0, padding:0, overflowX:"hidden" }}>

      {/* ナビ */}
      <div style={{ display:"flex", borderBottom:"2px solid #185FA5" }}>
        <button onClick={() => setPage("staff")} style={{ flex:1, padding:"11px 0", background: page==="staff"?"#185FA5":"#f5f5f5", color: page==="staff"?"#fff":"#333", border:"none", cursor:"pointer", fontWeight:600, fontSize:14 }}>スタッフ用 入力画面</button>
        <button onClick={() => setPage("admin")} style={{ flex:1, padding:"11px 0", background: page==="admin"?"#185FA5":"#f5f5f5", color: page==="admin"?"#fff":"#333", border:"none", cursor:"pointer", fontWeight:600, fontSize:14, position:"relative" }}>
          管理者用 シフト管理
          {pendingCount > 0 && <span style={{ position:"absolute", top:6, right:20, background:"#E24B4A", color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:11, fontWeight:700 }}>{pendingCount}</span>}
        </button>
      </div>

      {/* スタッフサブナビ */}
      {page==="staff" && (
        <div style={{ display:"flex", borderBottom:"1px solid #ddd", background:"#fafafa" }}>
          <button onClick={() => { setStaffPage("wish"); setSubmitted(false); }} style={{ flex:1, padding:"8px", fontSize:13, background: staffPage==="wish"?"#E6F1FB":"transparent", color: staffPage==="wish"?"#185FA5":"#555", border:"none", borderBottom: staffPage==="wish"?"2px solid #185FA5":"2px solid transparent", cursor:"pointer", fontWeight: staffPage==="wish"?600:400 }}>シフト希望入力</button>
          <button onClick={() => { setStaffPage("swap"); setSwapSubmitted(false); }} style={{ flex:1, padding:"8px", fontSize:13, background: staffPage==="swap"?"#E6F1FB":"transparent", color: staffPage==="swap"?"#185FA5":"#555", border:"none", borderBottom: staffPage==="swap"?"2px solid #185FA5":"2px solid transparent", cursor:"pointer", fontWeight: staffPage==="swap"?600:400 }}>交代申請</button>
        </div>
      )}

      {/* スタッフ希望入力 */}
      {page==="staff" && staffPage==="wish" && !submitted && (
        <div style={{ maxWidth:480, margin:"0 auto", padding:"0 12px" }}>
          <div style={{ padding:"12px 0 8px", borderBottom:"1px solid #eee" }}>
            <div style={{ fontSize:16, fontWeight:600 }}>シフト希望入力</div>
            <div style={{ fontSize:12, color:"#666", marginTop:3 }}>希望日をタップして出勤時間を入力してください</div>
          </div>
          <div style={{ padding:"10px 0", borderBottom:"1px solid #eee", display:"flex", gap:8, alignItems:"center" }}>
            <label style={{ fontSize:13, color:"#666", minWidth:36 }}>名前</label>
            <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} style={{ flex:1, fontSize:14, padding:"5px 8px", border:"1px solid #ddd", borderRadius:4 }}>
              <option value="">選択してください</option>
              {STAFF.map((s) => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #eee" }}>
            <button onClick={() => setMonth((m) => m<=1?12:m-1)} style={{ background:"none", border:"1px solid #ddd", borderRadius:4, padding:"4px 14px", cursor:"pointer", fontSize:14 }}>＜</button>
            <span style={{ fontWeight:600, fontSize:15 }}>{YEAR}年{month}月</span>
            <button onClick={() => setMonth((m) => m>=12?1:m+1)} style={{ background:"none", border:"1px solid #ddd", borderRadius:4, padding:"4px 14px", cursor:"pointer", fontSize:14 }}>＞</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
            {DOW.map((d, i) => <div key={d} style={{ textAlign:"center", fontSize:12, padding:"5px 0", color: i===0?"#E24B4A":i===6?"#185FA5":"#666", fontWeight:500, borderBottom:"1px solid #eee" }}>{d}</div>)}
            {Array.from({ length: new Date(YEAR, month-1, 1).getDay() }).map((_, i) => <div key={i} style={{ minHeight:58, background:"#f9f9f9", border:"0.5px solid #eee" }} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i+1).map((d) => {
              const dow = getDow(YEAR, month, d);
              return (
                <div key={d} onClick={() => openWishModal(d)} style={{ minHeight:58, border:"0.5px solid #eee", padding:4, cursor:"pointer", background: wishDays[d]?"#ddeeff":"#fff" }}>
                  <div style={{ fontSize:13, fontWeight:600, color: dow===0?"#E24B4A":dow===6?"#185FA5":"#333" }}>{d}</div>
                  {wishDays[d] && <div style={{ fontSize:9, background:"#185FA5", color:"#fff", borderRadius:2, padding:"1px 3px", marginTop:2 }}>{wishDays[d].replace("-","〜")}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ padding:"12px 0", display:"flex", gap:8 }}>
            <button onClick={() => setWishDays({})} style={{ padding:"8px 16px", fontSize:13, cursor:"pointer", border:"1px solid #ddd", borderRadius:4 }}>クリア</button>
            <button onClick={submitWish} style={{ flex:1, padding:"10px", fontSize:15, fontWeight:600, background:"#185FA5", color:"#fff", border:"none", borderRadius:4, cursor:"pointer" }}>希望を送信する ➤</button>
          </div>
        </div>
      )}

      {page==="staff" && staffPage==="wish" && submitted && (
        <div style={{ padding:"2rem 1rem", textAlign:"center", maxWidth:480, margin:"0 auto" }}>
          <div style={{ fontSize:48 }}>✅</div>
          <div style={{ fontSize:17, fontWeight:600, marginTop:10 }}>送信しました！</div>
          <div style={{ fontSize:13, color:"#666", marginTop:5 }}>シフトが確定したらLINEでお知らせします</div>
          <div style={{ background:"#f5f5f5", borderRadius:8, padding:"14px 16px", margin:"16px 0", textAlign:"left" }}>
            <div style={{ fontWeight:600, marginBottom:8 }}>👤 {selectedStaff}</div>
            {Object.entries(wishDays).sort(([a],[b]) => parseInt(a)-parseInt(b)).map(([d, t]) => (
              <div key={d} style={{ fontSize:13, lineHeight:2 }}>{month}/{d}（{DOW[getDow(YEAR, month, parseInt(d))]}） {t.replace("-","〜")}</div>
            ))}
          </div>
          <button onClick={() => setSubmitted(false)} style={{ width:"100%", padding:11, fontSize:14, color:"#185FA5", background:"#fff", border:"1px solid #185FA5", borderRadius:4, cursor:"pointer" }}>✏️ 内容を修正する</button>
        </div>
      )}

      {/* 交代申請 */}
      {page==="staff" && staffPage==="swap" && !swapSubmitted && (
        <div style={{ maxWidth:480, margin:"0 auto", padding:"12px" }}>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>交代申請</div>
          <div style={{ fontSize:12, color:"#666", marginBottom:16 }}>管理者が承認後にシフトに反映されます。</div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:13, color:"#666", display:"block", marginBottom:4 }}>申請者（自分）</label>
            <select value={swapFrom} onChange={(e) => setSwapFrom(e.target.value)} style={{ width:"100%", fontSize:14, padding:"8px", border:"1px solid #ddd", borderRadius:4 }}>
              <option value="">選択してください</option>
              {STAFF.map((s) => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:13, color:"#666", display:"block", marginBottom:4 }}>交代相手</label>
            <select value={swapTo} onChange={(e) => setSwapTo(e.target.value)} style={{ width:"100%", fontSize:14, padding:"8px", border:"1px solid #ddd", borderRadius:4 }}>
              <option value="">選択してください</option>
              {STAFF.filter((s) => s.name !== swapFrom).map((s) => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:13, color:"#666", display:"block", marginBottom:4 }}>交代希望日</label>
            <input type="number" value={swapDay} onChange={(e) => setSwapDay(e.target.value)} placeholder="例：15" min="1" max="31"
              style={{ width:"100%", fontSize:14, padding:"8px", border:"1px solid #ddd", borderRadius:4 }} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, color:"#666", display:"block", marginBottom:4 }}>メモ（任意）</label>
            <textarea value={swapNote} onChange={(e) => setSwapNote(e.target.value)} placeholder="理由や補足など" rows={3}
              style={{ width:"100%", fontSize:14, padding:"8px", border:"1px solid #ddd", borderRadius:4, resize:"vertical" }} />
          </div>
          <button onClick={submitSwap} style={{ width:"100%", padding:"11px", fontSize:15, fontWeight:600, background:"#185FA5", color:"#fff", border:"none", borderRadius:4, cursor:"pointer" }}>交代申請を送信 ➤</button>
        </div>
      )}

      {page==="staff" && staffPage==="swap" && swapSubmitted && (
        <div style={{ padding:"2rem 1rem", textAlign:"center", maxWidth:480, margin:"0 auto" }}>
          <div style={{ fontSize:48 }}>📨</div>
          <div style={{ fontSize:17, fontWeight:600, marginTop:10 }}>申請を送信しました！</div>
          <div style={{ fontSize:13, color:"#666", marginTop:5 }}>管理者が承認するとシフトに反映されます</div>
          <button onClick={() => { setSwapSubmitted(false); setSwapFrom(""); setSwapTo(""); setSwapDay(""); setSwapNote(""); }}
            style={{ width:"100%", padding:11, fontSize:14, color:"#185FA5", background:"#fff", border:"1px solid #185FA5", borderRadius:4, cursor:"pointer", marginTop:16 }}>別の申請をする</button>
        </div>
      )}

      {/* 管理者パスワード */}
      {page==="admin" && !adminUnlocked && (
        <div style={{ padding:"3rem 1rem", textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🔒</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>管理者パスワードを入力</div>
          <input type="password" value={pwInput} onChange={(e) => setPwInput(e.target.value)} onKeyDown={(e) => e.key==="Enter"&&login()} placeholder="パスワード"
            style={{ padding:"10px 14px", fontSize:15, border:`1px solid ${pwError?"#E24B4A":"#ddd"}`, borderRadius:6, width:220, display:"block", margin:"0 auto 8px", textAlign:"center" }} />
          {pwError && <div style={{ color:"#E24B4A", fontSize:13, marginBottom:8 }}>パスワードが違います</div>}
          <button onClick={login} style={{ padding:"10px 32px", background:"#185FA5", color:"#fff", border:"none", borderRadius:6, fontSize:15, cursor:"pointer", fontWeight:600, marginTop:4 }}>ログイン</button>
        </div>
      )}

      {/* 管理者メイン */}
      {page==="admin" && adminUnlocked && (
        <div>
          <div style={{ display:"flex", borderBottom:"1px solid #ddd" }}>
            {[["list","希望一覧"],["shift","シフト調整"],["swap","交代申請"]].map(([t, label]) => (
              <button key={t} onClick={() => setAdminTab(t)} style={{ flex:1, padding:"9px", fontSize:13, background: adminTab===t?"#E6F1FB":"#fff", color: adminTab===t?"#185FA5":"#555", border:"none", borderBottom: adminTab===t?"2px solid #185FA5":"2px solid transparent", cursor:"pointer", fontWeight: adminTab===t?600:400 }}>
                {label}{t==="swap"&&pendingCount>0?` (${pendingCount})`:""}
              </button>
            ))}
          </div>

          {/* 希望一覧 */}
          {adminTab==="list" && (
            <div style={{ padding:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <button onClick={() => setAdminMonth((m) => m<=1?12:m-1)} style={{ background:"none", border:"1px solid #ddd", borderRadius:4, padding:"4px 12px", cursor:"pointer" }}>＜</button>
                <span style={{ fontWeight:600, fontSize:15 }}>{YEAR}年{adminMonth}月</span>
                <button onClick={() => setAdminMonth((m) => m>=12?1:m+1)} style={{ background:"none", border:"1px solid #ddd", borderRadius:4, padding:"4px 12px", cursor:"pointer" }}>＞</button>
              </div>
              {STAFF.map((s, si) => {
                const days = Object.entries(shiftState).filter(([k,v]) => k.startsWith(`${si}_`) && v?.wish).map(([k,v]) => {
                  const d = k.split("_")[1];
                  return `${adminMonth}/${d}（${DOW[getDow(YEAR, adminMonth, parseInt(d))]}） ${v.wish}`;
                });
                return (
                  <div key={si} style={{ border:"1px solid #eee", borderRadius:8, padding:"10px 14px", marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                      <span style={{ fontSize:14, fontWeight:600 }}>
                        {s.name}
                        {s.priority && <span style={{ fontSize:10, background: s.priority===1?"#FAECE7":s.priority===2?"#FAEEDA":"#EAF3DE", color: s.priority===1?"#993C1D":s.priority===2?"#854F0B":"#3B6D11", borderRadius:8, padding:"1px 7px", marginLeft:6 }}>優先{s.priority}</span>}
                      </span>
                      <span style={{ fontSize:11, padding:"2px 9px", borderRadius:10, background: days.length?"#E6F1FB":"#f0f0f0", color: days.length?"#185FA5":"#999" }}>{days.length?"✓ 提出済み":"未提出"}</span>
                    </div>
                    <div style={{ fontSize:12, color:"#555", lineHeight:2 }}>{days.length?days.join("　"):"希望未提出"}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 交代申請管理 */}
          {adminTab==="swap" && (
            <div style={{ padding:14 }}>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:12 }}>交代申請一覧</div>
              {swapRequests.length === 0 && <div style={{ textAlign:"center", color:"#999", padding:"2rem", fontSize:14 }}>交代申請はありません</div>}
              {swapRequests.map((r) => (
                <div key={r.id} style={{ border:`1px solid ${r.status==="pending"?"#185FA5":r.status==="approved"?"#1D9E75":"#ddd"}`, borderRadius:8, padding:"12px 14px", marginBottom:10, background: r.status==="pending"?"#f0f7ff":r.status==="approved"?"#f0fff8":"#fafafa" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <span style={{ fontSize:13, fontWeight:600 }}>{r.from} → {r.to}</span>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:10, background: r.status==="pending"?"#fff3cd":r.status==="approved"?"#d4edda":"#f8d7da", color: r.status==="pending"?"#856404":r.status==="approved"?"#155724":"#721c24", fontWeight:600 }}>
                      {r.status==="pending"?"⏳ 承認待ち":r.status==="approved"?"✅ 承認済み":"❌ 却下"}
                    </span>
                  </div>
                  <div style={{ fontSize:13, color:"#555", marginBottom:8, lineHeight:1.8 }}>
                    <div>📅 {adminMonth}月{r.day}日</div>
                    {r.note && <div>📝 {r.note}</div>}
                  </div>
                  {r.status==="pending" && (
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => approveSwap(r.id)} style={{ flex:1, padding:"8px", background:"#1D9E75", color:"#fff", border:"none", borderRadius:4, cursor:"pointer", fontWeight:600, fontSize:13 }}>✅ 承認・シフト反映</button>
                      <button onClick={() => rejectSwap(r.id)} style={{ flex:1, padding:"8px", background:"#fff", color:"#E24B4A", border:"1px solid #E24B4A", borderRadius:4, cursor:"pointer", fontWeight:600, fontSize:13 }}>❌ 却下</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* シフト調整 */}
          {adminTab==="shift" && (
            <div style={{ padding:"6px 0 4px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, paddingLeft:6, flexWrap:"wrap" }}>
                <button onClick={() => setAdminMonth((m) => m<=1?12:m-1)} style={{ background:"none", border:"1px solid #ddd", borderRadius:4, padding:"3px 10px", cursor:"pointer", fontSize:13 }}>＜</button>
                <span style={{ fontWeight:600, fontSize:14 }}>{YEAR}年{adminMonth}月</span>
                <button onClick={() => setAdminMonth((m) => m>=12?1:m+1)} style={{ background:"none", border:"1px solid #ddd", borderRadius:4, padding:"3px 10px", cursor:"pointer", fontSize:13 }}>＞</button>
                <span style={{ fontSize:11, display:"flex", alignItems:"center", gap:3 }}><span style={{ display:"inline-block", width:20, height:10, background:"#B5D4F4", border:"1px solid #185FA5", borderRadius:2 }} />希望</span>
                <span style={{ fontSize:11, display:"flex", alignItems:"center", gap:3 }}><span style={{ display:"inline-block", width:20, height:10, background:"#CCFF66", border:"1px solid #8AAD00", borderRadius:2 }} />調整済み</span>
                <span style={{ fontSize:11, display:"flex", alignItems:"center", gap:3 }}><span style={{ display:"inline-block", width:20, height:10, background:"#ddeeff", border:"1px solid #7aaad0", borderRadius:2 }} />不採用</span>
                {/* ダウンロードボタン */}
                <div style={{ marginLeft:"auto", display:"flex", gap:8, paddingRight:8 }}>
                  <button onClick={downloadExcel} style={{ padding:"6px 14px", background:"#1D6F42", color:"#fff", border:"none", borderRadius:4, cursor:"pointer", fontSize:13, fontWeight:600 }}>📊 Excel</button>
                  <button onClick={printCalendar} style={{ padding:"6px 14px", background:"#E24B4A", color:"#fff", border:"none", borderRadius:4, cursor:"pointer", fontSize:13, fontWeight:600 }}>🖨️ 印刷/PDF</button>
                </div>
              </div>
              <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:"calc(100vh - 120px)", width:"100%" }}>
                <table style={{ borderCollapse:"collapse", tableLayout:"fixed", width: NAME_W + COL_W * adminDays }}>
                  <thead style={{ position:"sticky", top:0, zIndex:4 }}>
                    <tr>
                      <th style={thName}>名前</th>
                      {Array.from({ length: adminDays }, (_, i) => i+1).map((d) => (
                        <th key={d} style={thDate(getDow(YEAR, adminMonth, d))}>{d}<br />{DOW[getDow(YEAR, adminMonth, d)]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {STAFF.map((s, si) => (
                      <tr key={si}>
                        <td style={tdName}>{s.name}</td>
                        {Array.from({ length: adminDays }, (_, i) => i+1).map((d) => {
                          const k = `${si}_${d}`;
                          const st = shiftState[k] || {};
                          const isOver = dragOver === k;
                          return (
                            <td key={d} style={tdDate(isOver)}
                              onDragOver={(e) => { e.preventDefault(); setDragOver(k); }}
                              onDragLeave={() => setDragOver(null)}
                              onDrop={() => onDrop(si, d)}>
                              {st.wish && (st.wishOff
                                ? <div style={{ ...chip("#ddeeff","#0a3060"), cursor:"pointer" }} onClick={() => restoreWish(si, d)}>{st.wish} ↩</div>
                                : <div draggable onDragStart={() => setDragData({ si, d, type:"wish" })} style={chip("#B5D4F4","#0a3060")}>
                                    <span>{st.wish}</span>
                                    <span onClick={(e) => { e.stopPropagation(); removeWish(si, d); }} style={{ cursor:"pointer" }}>×</span>
                                  </div>
                              )}
                              {st.moved?.map((m, mi) => (
                                <div key={mi} draggable onDragStart={() => setDragData({ si, d, type:"moved", mi })}
                                  onClick={() => { setShiftModal({ si, d, mi }); setStartTime(m.time.split("-")[0]); setEndTime(m.time.split("-")[1]); }}
                                  style={chip("#CCFF66","#3A5200")}>
                                  <span>{m.time}</span>
                                  <span onClick={(e) => { e.stopPropagation(); removeMoved(si, d, mi); }} style={{ cursor:"pointer" }}>×</span>
                                </div>
                              ))}
                              {st.admin && (
                                <div draggable onDragStart={() => setDragData({ si, d, type:"admin" })}
                                  onClick={() => { setShiftModal({ si, d }); setStartTime(st.admin.split("-")[0]); setEndTime(st.admin.split("-")[1]); }}
                                  style={chip("#CCFF66","#3A5200")}>
                                  <span>{st.admin}</span>
                                  <span onClick={(e) => { e.stopPropagation(); removeAdmin(si, d); }} style={{ cursor:"pointer" }}>×</span>
                                </div>
                              )}
                              <div onClick={() => { setShiftModal({ si, d }); setStartTime("17:00"); setEndTime("24:00"); }} style={{ fontSize:11, color:"#ccc", textAlign:"center", cursor:"pointer" }}>+</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td style={{ ...tdName, background:"#f0f0f0", fontWeight:600 }}>人数</td>
                      {Array.from({ length: adminDays }, (_, i) => i+1).map((d) => {
                        const dow = getDow(YEAR, adminMonth, d);
                        const needed = getNeeded(dow);
                        const count = STAFF.filter((_, si) => { const st = shiftState[`${si}_${d}`]||{}; return (st.wish&&!st.wishOff)||st.admin||(st.moved?.length>0); }).length;
                        return <td key={d} style={{ border:"0.5px solid #ddd", padding:2, textAlign:"center", background:"#f5f5f5", fontWeight:600, color: count>=needed?"#1D9E75":count>0?"#BA7517":"#ccc", fontSize:10 }}>{count}</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 希望入力モーダル */}
      {modalDay !== null && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:14, padding:"1.4rem", width:270, boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:14 }}>{month}月{modalDay}日（{DOW[getDow(YEAR, month, modalDay)]}）</div>
            {[["開始", startTime, setStartTime, times],["終了", endTime, setEndTime, endTimes]].map(([label, val, setter, opts]) => (
              <div key={label} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
                <label style={{ fontSize:13, color:"#666", minWidth:36 }}>{label}</label>
                <select value={val} onChange={(e) => setter(e.target.value)} style={{ flex:1, fontSize:14, padding:"5px 8px", border:"1px solid #ddd", borderRadius:4 }}>
                  {opts.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            ))}
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => { setWishDays((p) => { const n={...p}; delete n[modalDay]; return n; }); setModalDay(null); }} style={{ flex:1, fontSize:13, padding:9, color:"#E24B4A", border:"1px solid #E24B4A", borderRadius:6, background:"#fff", cursor:"pointer" }}>削除</button>
              <button onClick={() => setModalDay(null)} style={{ flex:1, fontSize:13, padding:9, cursor:"pointer", border:"1px solid #ddd", borderRadius:6 }}>キャンセル</button>
              <button onClick={saveWishModal} style={{ flex:1, fontSize:13, padding:9, background:"#185FA5", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600 }}>決定</button>
            </div>
          </div>
        </div>
      )}

      {/* シフト編集モーダル */}
      {shiftModal !== null && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:14, padding:"1.4rem", width:270, boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>{adminMonth}月{shiftModal.d}日 シフト編集</div>
            <div style={{ fontSize:13, color:"#666", marginBottom:14 }}>{STAFF[shiftModal.si].name}</div>
            {[["開始", startTime, setStartTime, times],["終了", endTime, setEndTime, endTimes]].map(([label, val, setter, opts]) => (
              <div key={label} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
                <label style={{ fontSize:13, color:"#666", minWidth:36 }}>{label}</label>
                <select value={val} onChange={(e) => setter(e.target.value)} style={{ flex:1, fontSize:14, padding:"5px 8px", border:"1px solid #ddd", borderRadius:4 }}>
                  {opts.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            ))}
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setShiftModal(null)} style={{ flex:1, fontSize:13, padding:9, cursor:"pointer", border:"1px solid #ddd", borderRadius:6 }}>キャンセル</button>
              <button onClick={saveShiftModal} style={{ flex:1, fontSize:13, padding:9, background:"#8AAD00", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600 }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
