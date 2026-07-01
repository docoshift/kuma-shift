import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "./supabase";

const DOW = ["日", "月", "火", "水", "木", "金", "土"];
const ADMIN_PASSWORD = "Doco5555";
const NAME_W = 110;
const COL_W = typeof window !== "undefined" ? Math.max(44, Math.floor((window.innerWidth - NAME_W) / 31)) : 44;

function getDow(y, m, d) { return new Date(y, m - 1, d).getDay(); }

function TimeChip({ t, bg, color, onRemove, onClickChip, faded, overridden, label, ...rest }) {
  const [start, end] = (t || "").split("-");
  // overridden: 背景だけ薄く、文字はそのまま見える
  const actualBg = overridden ? "#dceef9" : faded ? bg : bg;
  const actualColor = overridden ? "#4a80b0" : color;
  const actualOpacity = faded ? 0.6 : 1;
  return (
    <div
      onClick={onClickChip}
      style={{
        background: actualBg, color: actualColor, borderRadius: 4, margin: "2px 1px",
        padding: "2px 3px", cursor: onClickChip ? "pointer" : overridden ? "default" : "grab",
        position: "relative", opacity: actualOpacity,
        textAlign: "center", lineHeight: 1.2,
        border: overridden ? "1px dashed #7ab0d8" : "none",
      }}
      {...rest}
    >
      <div style={{ fontSize: 11, fontWeight: 800 }}>{start}</div>
      <div style={{ fontSize: 11, fontWeight: 800 }}>{end}{label || ""}</div>
      {onRemove && !overridden && (
        <span
          onClick={onRemove}
          style={{
            position: "absolute", top: 1, right: 2,
            fontSize: 10, cursor: "pointer", opacity: 0.55, lineHeight: 1,
          }}
        >×</span>
      )}
    </div>
  );
}
function getNeeded(dow) { return dow === 5 || dow === 6 ? 4 : dow === 0 ? 3 : 2; }

const now = new Date();
const YEAR = now.getFullYear();
const NEXT_MONTH = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;

export default function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const [myName, setMyName] = useState(() => localStorage.getItem('docoshift_name') || '');
  const [nameRegistered, setNameRegistered] = useState(() => !!localStorage.getItem('docoshift_name'));
  const [nameSelectTemp, setNameSelectTemp] = useState('');
  const [adminBypass, setAdminBypass] = useState(false);

  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [staffModalOpen, setStaffModalOpen] = useState(null);
  const [staffForm, setStaffForm] = useState({ name: "", hourly_wage: "", contact: "", rating: 3, priority: "" });

  const [page, setPage] = useState("staff");
  const [staffPage, setStaffPage] = useState("wish");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [month, setMonth] = useState(NEXT_MONTH);
  const [wishDays, setWishDays] = useState({});
  const [wishDaysByStaff, setWishDaysByStaff] = useState({});
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
  const [scopeModal, setScopeModal] = useState(null);
  const [scopeType, setScopeType] = useState("individual");
  const [scopeSelected, setScopeSelected] = useState([]);
  const [bulkDay, setBulkDay] = useState(1);
  const [bulkStart, setBulkStart] = useState("17:00");
  const [bulkEnd, setBulkEnd] = useState("24:00");
  const [reflectModal, setReflectModal] = useState(false);
  const [reflectSelected, setReflectSelected] = useState([]);
  const [autoCreateOpen, setAutoCreateOpen] = useState(false);
  const [dowRequired, setDowRequired] = useState({ 0:3, 1:2, 2:2, 3:2, 4:2, 5:4, 6:5 });
  const [autoNote, setAutoNote] = useState("");
  const [autoStaffPriority, setAutoStaffPriority] = useState({});
  const [staffDragFrom, setStaffDragFrom] = useState(null);
  const [showRetired, setShowRetired] = useState(false);
  const [staffDragOver, setStaffDragOver] = useState(null);
  const [autoResult, setAutoResult] = useState(null);

  const daysInMonth = new Date(YEAR, month, 0).getDate();
  const adminDays = new Date(YEAR, adminMonth, 0).getDate();
  const times = ["15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00"];
  const endTimes = ["20:00","20:30","21:00","21:30","22:00","22:30","23:00","23:30","24:00"];

  useEffect(() => {
    if (myName) setSelectedStaff(myName);
  }, [myName, staffList]);

  function registerMyName() {
    if (!nameSelectTemp) return alert('名前を選択してください');
    localStorage.setItem('docoshift_name', nameSelectTemp);
    setMyName(nameSelectTemp);
    setSelectedStaff(nameSelectTemp);
    setNameRegistered(true);
  }

  useEffect(() => {
    loadStaff();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'activated') {
              window.location.reload();
            }
          });
        });
      });
    }
  }, []);

  useEffect(() => { loadShiftState(adminMonth); }, [adminMonth]);
  useEffect(() => { loadShiftState(month); }, [month]);

  useEffect(() => {
    const ch = supabase.channel('shift-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_requests' }, () => loadShiftState(month))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_state' }, () => loadShiftState(adminMonth))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [month, adminMonth]);

  async function loadShiftState(targetMonth) {
    const [{ data: reqs }, { data: states }] = await Promise.all([
      supabase.from("shift_requests").select("*").eq("year", YEAR).eq("month", targetMonth),
      supabase.from("shift_state").select("*").eq("year", YEAR).eq("month", targetMonth),
    ]);
    setShiftState(() => {
      const n = {};
      reqs?.forEach(r => {
        const k = `${r.staff_id}_${r.day}`;
        if (!n[k]) n[k] = {};
        n[k].wish = `${r.start_time}-${r.end_time}`;
      });
      states?.forEach(s => {
        const k = `${s.staff_id}_${s.day}`;
        if (!n[k]) n[k] = {};
        if (s.type === "admin") n[k].admin = `${s.start_time}-${s.end_time}`;
        else if (s.type === "draft") { if (!n[k].admin) n[k].admin = `${s.start_time}-${s.end_time}`; }
        else if (s.type === "wish_off") n[k].wishOff = true;
        else if (s.type === "moved") {
          if (!n[k].moved) n[k].moved = [];
          n[k].moved.push({ time: `${s.start_time}-${s.end_time}` });
        }
      });
      return n;
    });
  }

  async function loadStaff() {
    setLoadingStaff(true);
    try {
      const { data, error } = await supabase.from("staff").select("*").order("created_at");
      if (error) {
        alert("スタッフ読み込みエラー: " + JSON.stringify(error));
      } else if (data) {
        data.sort((a, b) => {
          if (a.display_order == null && b.display_order == null) return 0;
          if (a.display_order == null) return 1;
          if (b.display_order == null) return -1;
          return a.display_order - b.display_order;
        });
        setStaffList(data);
        if (data.length === 0) alert("スタッフデータが0件です。Supabaseの接続を確認してください。");
      }
    } catch(e) {
      alert("スタッフ読み込み例外: " + e.message);
    }
    setLoadingStaff(false);
  }

  async function moveStaff(index, dir) {
    const list = [...staffList];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    setStaffList(list);
    await Promise.all(list.map((s, i) =>
      supabase.from("staff").update({ display_order: i + 1 }).eq("id", s.id)
    ));
  }

  async function handleStaffDrop(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const list = [...staffList];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    setStaffList(list);
    await Promise.all(list.map((s, i) =>
      supabase.from("staff").update({ display_order: i + 1 }).eq("id", s.id)
    ));
  }

  async function saveStaff() {
    const form = {
      name: staffForm.name,
      hourly_wage: staffForm.hourly_wage ? parseInt(staffForm.hourly_wage) : null,
      contact: staffForm.contact || null,
      rating: staffForm.rating || null,
      priority: staffForm.priority ? parseInt(staffForm.priority) : null,
    };
    if (staffModalOpen.mode === "add") {
      await supabase.from("staff").insert(form);
    } else {
      await supabase.from("staff").update(form).eq("id", staffModalOpen.staff.id);
    }
    setStaffModalOpen(null);
    loadStaff();
  }

  async function deleteStaff(id) {
    if (!confirm("このスタッフを退社済みにしますか？\nアプリへのアクセスができなくなります。")) return;
    await supabase.from("staff").update({ is_retired: true }).eq("id", id);
    loadStaff();
  }

  async function restoreStaff(id) {
    if (!confirm("このスタッフを現役に戻しますか？")) return;
    await supabase.from("staff").update({ is_retired: false }).eq("id", id);
    loadStaff();
  }

  function getShiftText(staffId, d) {
    const st = shiftState[`${staffId}_${d}`] || {};
    const parts = [];
    // 管理者シフト優先。なければ希望
    if (st.admin) parts.push(st.admin);
    else if (st.wish && !st.wishOff) parts.push(st.wish);
    if (st.moved?.length) st.moved.forEach(m => parts.push(m.time));
    return parts.join("/");
  }

  function printCalendar() {
    const allDays = Array.from({ length: adminDays }, (_, i) => i + 1);
    const col1 = allDays.slice(0, 11), col2 = allDays.slice(11, 21), col3 = allDays.slice(21);
    function makeColHTML(days) {
      return days.map(d => {
        const dow = getDow(YEAR, adminMonth, d);
        const color = dow === 0 ? "#cc0000" : dow === 6 ? "#0044aa" : "#333";
        const bg = dow === 0 ? "#ffe6e6" : dow === 6 ? "#e6f0ff" : "#efefef";
        const sl = staffList.map(s => { const t = getShiftText(s.id, d); return t ? `<div style="font-size:11px;padding:2px 4px;border-bottom:1px solid #eee;">${s.name}　${t}</div>` : ""; }).join("");
        return `<div style="margin-bottom:6px;"><div style="background:${bg};color:${color};font-weight:bold;font-size:12px;padding:3px 6px;border:1px solid #ccc;">${adminMonth}/${d}（${DOW[dow]}）</div>${sl || '<div style="font-size:11px;padding:2px 4px;color:#999;">（出勤者なし）</div>'}</div>`;
      }).join("");
    }
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${YEAR}年${adminMonth}月</title><style>@page{size:A4 portrait;margin:10mm}body{font-family:"Meiryo",sans-serif;margin:0}h2{font-size:14px;margin:0 0 8px;text-align:center}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><h2>${YEAR}年${adminMonth}月 シフト表</h2><div class="grid"><div>${makeColHTML(col1)}</div><div>${makeColHTML(col2)}</div><div>${makeColHTML(col3)}</div></div></body></html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }

  function downloadExcel() {
    const allDays = Array.from({ length: adminDays }, (_, i) => i + 1);
    const header = ["名前", ...allDays.map(d => `${d}(${DOW[getDow(YEAR, adminMonth, d)]})`), ""];
    const rows = staffList.map(s => [s.name, ...allDays.map(d => getShiftText(s.id, d)), ""]);
    const countRow = ["人数", ...allDays.map(d => staffList.filter(s => { const st = shiftState[`${s.id}_${d}`] || {}; return (st.wish && !st.wishOff) || st.admin || (st.moved?.length > 0); }).length), ""];
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows, countRow]);
    ws["!cols"] = [{ wch: 14 }, ...allDays.map(() => ({ wch: 10 })), { wch: 2 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${YEAR}年${adminMonth}月シフト`);
    XLSX.writeFile(wb, `シフト表_${YEAR}年${adminMonth}月.xlsx`);
  }

  function submitWish() {
    if (!selectedStaff) return alert("名前を選択してください");
    if (Object.keys(wishDays).length === 0) return alert("希望日を選択してください");
    const s = staffList.find(s => s.name === selectedStaff);
    if (!s) return;
    setShiftState(prev => {
      const n = { ...prev };
      Object.entries(wishDays).forEach(([d, t]) => { n[`${s.id}_${d}`] = { ...n[`${s.id}_${d}`], wish: t, wishOff: false }; });
      return n;
    });
    const records = Object.entries(wishDays).map(([d, t]) => ({
      staff_id: s.id, year: YEAR, month, day: parseInt(d),
      start_time: t.split("-")[0], end_time: t.split("-")[1], status: "submitted"
    }));
    supabase.from("shift_requests").upsert(records, { onConflict: "staff_id,year,month,day" });
    setSubmitted(true);
  }

  function submitSwap() {
    if (!swapFrom) return alert("申請者を選択してください");
    if (!swapTo) return alert("交代相手を選択してください");
    if (!swapDay) return alert("交代日を入力してください");
    if (swapFrom === swapTo) return alert("同じ人は選択できません");
    const fromS = staffList.find(s => s.name === swapFrom);
    const toS = staffList.find(s => s.name === swapTo);
    setSwapRequests(prev => [...prev, { id: Date.now(), from: swapFrom, to: swapTo, day: swapDay, note: swapNote, status: "pending" }]);
    supabase.from("swap_requests").insert({ from_staff_id: fromS?.id, to_staff_id: toS?.id, year: YEAR, month: adminMonth, day: parseInt(swapDay), note: swapNote, status: "pending" });
    setSwapSubmitted(true);
  }

  function approveSwap(id) {
    const req = swapRequests.find(r => r.id === id);
    if (!req) return;
    setSwapRequests(prev => prev.map(r => r.id === id ? { ...r, status: "approved" } : r));
    const fromS = staffList.find(s => s.name === req.from);
    const toS = staffList.find(s => s.name === req.to);
    setShiftState(prev => {
      const n = { ...prev };
      const fromK = `${fromS?.id}_${req.day}`, toK = `${toS?.id}_${req.day}`;
      const time = n[fromK]?.wish || n[fromK]?.admin || "17:00-24:00";
      if (!n[toK]) n[toK] = {};
      if (!n[toK].moved) n[toK].moved = [];
      n[toK].moved.push({ time, swapFrom: req.from });
      return n;
    });
  }

  function rejectSwap(id) { setSwapRequests(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" } : r)); }
  function calcLaborCost() {
    let total = 0;
    staffList.forEach(s => {
      if (!s.hourly_wage) return;
      let mins = 0;
      for (let d = 1; d <= adminDays; d++) {
        const st = shiftState[`${s.id}_${d}`] || {};
        const slots = [];
        // 管理者シフトがあればそれのみ。なければ希望を使う
        if (st.admin) {
          slots.push(st.admin);
        } else if (st.wish && !st.wishOff) {
          slots.push(st.wish);
        }
        if (st.moved?.length) st.moved.forEach(m => slots.push(m.time));
        slots.forEach(t => {
          const [start, end] = t.split("-");
          const [sh, sm] = start.split(":").map(Number);
          const [eh, em] = end.split(":").map(Number);
          mins += (eh * 60 + em) - (sh * 60 + sm);
        });
      }
      total += (mins / 60) * s.hourly_wage;
    });
    return Math.round(total);
  }

  function shortTime(t) {
    if (!t) return "";
    return t.split("-").map(s => s.split(":")[0]).join("-");
  }

  function openWishModal(d) { setModalDay(d); setStartTime(wishDays[d]?.split("-")[0] || "17:00"); setEndTime(wishDays[d]?.split("-")[1] || "24:00"); }
  function saveWishModal() { setWishDays(p => ({ ...p, [modalDay]: `${startTime}-${endTime}` })); setModalDay(null); }
  function login() { if (pwInput === ADMIN_PASSWORD) { setAdminUnlocked(true); setPwError(false); } else setPwError(true); }
  async function removeWish(sid, d) {
    setShiftState(p => ({ ...p, [`${sid}_${d}`]: { ...p[`${sid}_${d}`], wishOff: true } }));
    await supabase.from("shift_state").upsert(
      { staff_id: sid, year: YEAR, month: adminMonth, day: d, start_time: "00:00", end_time: "00:00", type: "wish_off", scope: "individual" },
      { onConflict: "staff_id,year,month,day,type" }
    );
  }
  async function restoreWish(sid, d) {
    setShiftState(p => ({ ...p, [`${sid}_${d}`]: { ...p[`${sid}_${d}`], wishOff: false } }));
    await supabase.from("shift_state").delete()
      .eq("staff_id", sid).eq("year", YEAR).eq("month", adminMonth).eq("day", d).eq("type", "wish_off");
  }
  async function removeAdmin(sid, d) {
    setShiftState(p => { const n = { ...p }; if (n[`${sid}_${d}`]) delete n[`${sid}_${d}`].admin; return n; });
    await supabase.from("shift_state").delete()
      .eq("staff_id", sid).eq("year", YEAR).eq("month", adminMonth).eq("day", d).eq("type", "draft");
  }
  function removeMoved(sid, d, mi) {
    setShiftState(p => { const n = { ...p }; const k = `${sid}_${d}`; if (n[k]?.moved) { n[k] = { ...n[k], moved: [...n[k].moved] }; n[k].moved.splice(mi, 1); } return n; });
  }

  function openShiftEdit(staffId, d, mi, st) {
    setShiftModal({ staffId, d, mi });
    if (mi !== undefined) { setStartTime(st.moved[mi].time.split("-")[0]); setEndTime(st.moved[mi].time.split("-")[1]); }
    else if (st.admin) { setStartTime(st.admin.split("-")[0]); setEndTime(st.admin.split("-")[1]); }
    else { setStartTime("17:00"); setEndTime("24:00"); }
  }

  // 草稿保存（Supabaseにdraftとして保存）
  async function saveShiftLocal() {
    const { staffId, d, mi } = shiftModal;
    const time = `${startTime}-${endTime}`;
    setShiftState(prev => {
      const n = { ...prev };
      const k = `${staffId}_${d}`;
      if (mi !== undefined) {
        n[k] = { ...n[k], moved: [...(n[k].moved || [])] };
        n[k].moved[mi] = { ...n[k].moved[mi], time };
      } else {
        n[k] = { ...n[k], admin: time };
      }
      return n;
    });
    if (mi === undefined) {
      await supabase.from("shift_state").upsert(
        { staff_id: staffId, year: YEAR, month: adminMonth, day: d,
          start_time: time.split("-")[0], end_time: time.split("-")[1], type: "draft", scope: "individual" },
        { onConflict: "staff_id,year,month,day,type" }
      );
    }
    setShiftModal(null);
  }

  // 一括入力（草稿としてSupabaseに保存）
  async function applyBulkLocal() {
    const time = `${bulkStart}-${bulkEnd}`;
    const targets = scopeType === "all" ? staffList.map(s => s.id) : scopeSelected;
    setShiftState(prev => {
      const n = { ...prev };
      targets.forEach(sid => { n[`${sid}_${bulkDay}`] = { ...n[`${sid}_${bulkDay}`], admin: time }; });
      return n;
    });
    const records = targets.map(sid => ({
      staff_id: sid, year: YEAR, month: adminMonth, day: bulkDay,
      start_time: time.split("-")[0], end_time: time.split("-")[1], type: "draft", scope: "individual"
    }));
    await supabase.from("shift_state").upsert(records, { onConflict: "staff_id,year,month,day,type" });
    setScopeModal(null);
  }

  // スタッフへ実際に反映（Supabase保存）
  async function reflectToStaff(targetIds) {
    const records = [];
    targetIds.forEach(sid => {
      for (let d = 1; d <= adminDays; d++) {
        const st = shiftState[`${sid}_${d}`];
        if (st?.admin) {
          records.push({ staff_id: sid, year: YEAR, month: adminMonth, day: d,
            start_time: st.admin.split("-")[0], end_time: st.admin.split("-")[1], type: "admin", scope: "individual" });
        }
        st?.moved?.forEach(m => {
          records.push({ staff_id: sid, year: YEAR, month: adminMonth, day: d,
            start_time: m.time.split("-")[0], end_time: m.time.split("-")[1], type: "moved", scope: "individual" });
        });
      }
    });
    if (records.length > 0) {
      await supabase.from("shift_state").upsert(records, { onConflict: "staff_id,year,month,day,type" });
    }
    // 反映済みのdraft草稿を削除
    for (const sid of targetIds) {
      await supabase.from("shift_state").delete()
        .eq("staff_id", sid).eq("year", YEAR).eq("month", adminMonth).eq("type", "draft");
    }
    setReflectModal(false);
    alert(`✅ ${targetIds.length}名のシフトをスタッフに反映しました`);
  }

  // 自動作成（希望日のみ。草稿としてSupabaseに保存。確認後に反映）
  async function autoCreateShift() {
    const newState = { ...shiftState };
    let totalAssigned = 0;

    const sortFn = (a, b) => {
      // モーダルで設定した優先順位 → 保存済み優先度 → 評価 の順
      const pa = autoStaffPriority[a.id] !== "" && autoStaffPriority[a.id] !== undefined
        ? Number(autoStaffPriority[a.id]) : (a.priority ?? 99);
      const pb = autoStaffPriority[b.id] !== "" && autoStaffPriority[b.id] !== undefined
        ? Number(autoStaffPriority[b.id]) : (b.priority ?? 99);
      if (pa !== pb) return pa - pb;
      return (b.rating ?? 0) - (a.rating ?? 0);
    };

    for (let d = 1; d <= adminDays; d++) {
      const dow = getDow(YEAR, adminMonth, d);
      const needed = dowRequired[dow] ?? getNeeded(dow);
      // 希望を出しているスタッフのみが対象（希望なし日はスキップ）
      const candidates = staffList
        .filter(s => { const st = shiftState[`${s.id}_${d}`]; return st?.wish && !st?.wishOff; })
        .sort(sortFn)
        .slice(0, needed);
      candidates.forEach(s => {
        const k = `${s.id}_${d}`;
        if (!newState[k]?.admin) {
          newState[k] = { ...newState[k], admin: newState[k]?.wish };
          totalAssigned++;
        }
      });
    }

    // 0シフトになるスタッフを検出
    const zeroStaff = staffList.filter(s => {
      for (let d = 1; d <= adminDays; d++) {
        if (newState[`${s.id}_${d}`]?.admin) return false;
      }
      return true;
    });
    // 希望提出日数も集計
    const wishCounts = {};
    staffList.forEach(s => {
      wishCounts[s.id] = Array.from({ length: adminDays }, (_, i) => i + 1)
        .filter(d => { const st = shiftState[`${s.id}_${d}`]; return st?.wish && !st?.wishOff; }).length;
    });

    setShiftState(newState);

    // 自動作成結果をdraftとしてSupabaseに一括保存
    const draftRecords = [];
    staffList.forEach(s => {
      for (let d = 1; d <= adminDays; d++) {
        const admin = newState[`${s.id}_${d}`]?.admin;
        if (admin) {
          draftRecords.push({
            staff_id: s.id, year: YEAR, month: adminMonth, day: d,
            start_time: admin.split("-")[0], end_time: admin.split("-")[1], type: "draft", scope: "individual"
          });
        }
      }
    });
    if (draftRecords.length > 0) {
      await supabase.from("shift_state").upsert(draftRecords, { onConflict: "staff_id,year,month,day,type" });
    }

    setAutoResult({ totalAssigned, zeroStaff, wishCounts });
    setAutoCreateOpen(false);
  }

  function openBulkScope(type) {
    setScopeModal({ bulk: true });
    setScopeType(type);
    setScopeSelected(type === "all" ? staffList.map(s => s.id) : []);
  }

  function confirmScopeAndSave() {
    const { staffId, d, mi } = scopeModal;
    const time = `${startTime}-${endTime}`;
    const targetIds = scopeType === "all" ? staffList.map(s => s.id) : scopeSelected;
    setShiftState(prev => {
      const n = { ...prev };
      targetIds.forEach(sid => {
        const k = `${sid}_${d}`;
        if (mi !== undefined && sid === staffId) {
          n[k] = { ...n[k], moved: [...(n[k].moved || [])] };
          n[k].moved[mi] = { ...n[k].moved[mi], time };
        } else {
          n[k] = { ...n[k], admin: time };
        }
      });
      return n;
    });
    const records = targetIds.map(sid => ({
      staff_id: sid, year: YEAR, month: adminMonth, day: parseInt(d),
      start_time: startTime, end_time: endTime,
      type: mi !== undefined && sid === staffId ? "moved" : "admin",
      scope: scopeType,
    }));
    supabase.from("shift_state").upsert(records, { onConflict: "staff_id,year,month,day,type" });
    setScopeModal(null);
    setShiftModal(null);
  }

  function onDrop(toSid, toD) {
    setDragOver(null);
    if (!dragData) return;
    const { staffId, d, type, mi } = dragData;
    if (staffId === toSid && String(d) === String(toD)) return;
    setShiftState(p => {
      const n = JSON.parse(JSON.stringify(p));
      const fk = `${staffId}_${d}`, tk = `${toSid}_${toD}`;
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

  const thName = { position:"sticky", left:0, zIndex:3, background:"#185FA5", border:"0.5px solid #2a6ab0", padding:"8px 10px", fontWeight:700, fontSize:14, color:"#fff", width:NAME_W, minWidth:NAME_W, maxWidth:NAME_W, textAlign:"left" };
  const tdName = { position:"sticky", left:0, zIndex:2, background:"#f4f7fb", border:"0.5px solid #dde3ea", padding:"0 10px", whiteSpace:"nowrap", fontWeight:700, fontSize:14, color:"#1a3a5c", width:NAME_W, minWidth:NAME_W, maxWidth:NAME_W, verticalAlign:"middle" };
  const thDate = (dow) => ({ background: dow===0?"#FDEAEA":dow===6?"#EAF0FD":"#185FA5", border:"0.5px solid rgba(0,0,0,0.08)", padding:"4px 2px", textAlign:"center", color: dow===0?"#CC2222":dow===6?"#1144CC":"#fff", fontWeight:700, width:COL_W, minWidth:COL_W, maxWidth:COL_W });
  const tdDate = (isOver, dow) => ({ border:"0.5px solid #e4e8ef", padding:"2px 1px", verticalAlign:"top", background: isOver?"#edfbea": dow===0?"#fff8f8":dow===6?"#f8f9ff":"#fff", width:COL_W, minWidth:COL_W, maxWidth:COL_W, height:64 });
  const chip = (bg, color) => ({ fontSize:11, background:bg, color, borderRadius:3, padding:"3px 4px", margin:"1px 0", cursor:"grab", lineHeight:1.3, display:"flex", justifyContent:"space-between", alignItems:"center", fontWeight:700 });
  const pendingCount = swapRequests.filter(r => r.status === "pending").length;

  // 名前未登録かつ管理者バイパスでもない場合は登録画面を表示
  if (!nameRegistered && !adminBypass) {
    return (
      <div style={{ minHeight:"100vh", background:"#185FA5", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
        <div style={{ background:"white", borderRadius:20, padding:"36px 28px", maxWidth:340, width:"100%", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.18)" }}>
          <div style={{ fontSize:64, marginBottom:8 }}>🐻</div>
          <div style={{ fontSize:24, fontWeight:900, color:"#185FA5", marginBottom:4, letterSpacing:1 }}>DocoSHIFT</div>
          <div style={{ fontSize:14, color:"#888", marginBottom:24 }}>はじめに名前を登録してください</div>
          {loadingStaff ? (
            <div style={{ color:"#aaa", fontSize:14, padding:20 }}>読み込み中...</div>
          ) : (
            <>
              <select
                value={nameSelectTemp}
                onChange={e => setNameSelectTemp(e.target.value)}
                style={{ width:"100%", fontSize:17, padding:"12px 14px", border:"2px solid #ddd", borderRadius:10, marginBottom:16, boxSizing:"border-box" }}
              >
                <option value="">名前を選んでください</option>
                {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <button
                onClick={registerMyName}
                style={{ width:"100%", background:"#185FA5", color:"white", border:"none", borderRadius:10, padding:"14px", fontSize:17, fontWeight:700, cursor:"pointer", marginBottom:12 }}
              >
                登録する
              </button>
              <div style={{ fontSize:12, color:"#bbb", marginBottom:20 }}>⚠️ 一度登録すると変更できません</div>
            </>
          )}
          <div
            onClick={() => setAdminBypass(true)}
            style={{ fontSize:12, color:"#ccc", cursor:"pointer", marginTop:4 }}
          >
            管理者の方はこちら
          </div>
        </div>
      </div>
    );
  }

  // 退社スタッフはアプリをブロック
  const myStaffData = staffList.find(s => s.name === myName);
  if (nameRegistered && !adminBypass && myStaffData?.is_retired) {
    return (
      <div style={{ minHeight:"100vh", background:"#185FA5", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
        <div style={{ background:"white", borderRadius:20, padding:"36px 28px", maxWidth:340, width:"100%", textAlign:"center" }}>
          <div style={{ fontSize:56, marginBottom:12 }}>🚫</div>
          <div style={{ fontSize:20, fontWeight:700, color:"#333", marginBottom:12 }}>アクセスできません</div>
          <div style={{ fontSize:14, color:"#888", marginBottom:24 }}>このアカウントは無効になっています。<br/>管理者にお問い合わせください。</div>
          <div onClick={() => setAdminBypass(true)} style={{ fontSize:12, color:"#ccc", cursor:"pointer" }}>管理者の方はこちら</div>
        </div>
      </div>
    );
  }

  const activeStaff = staffList.filter(s => !s.is_retired);
  const retiredStaff = staffList.filter(s => s.is_retired);

  return (
    <div style={{ fontFamily:"sans-serif", width:"100vw", margin:0, padding:0, overflowX:"hidden" }}>

      {/* ナビ */}
      {page === "staff" ? (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding: isMobile?"14px 14px":"26px 20px", borderBottom:"3px solid #185FA5", background:"#185FA5" }}>
          <span style={{ fontSize: isMobile?20:30, fontWeight:900, color:"#fff", letterSpacing:2 }}>🐻 DocoSHIFT</span>
          <button onClick={() => setPage("admin")} style={{ fontSize: isMobile?12:13, color:"rgba(255,255,255,0.6)", background:"transparent", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, padding: isMobile?"5px 10px":"6px 12px", cursor:"pointer", fontWeight:600 }}>管理者</button>
        </div>
      ) : (
        <div style={{ display:"flex", borderBottom:"3px solid #185FA5" }}>
          <button onClick={() => { setPage("staff"); setAdminUnlocked(false); setPwInput(""); }} style={{ padding: isMobile?"14px 12px":"26px 20px", background:"#f0f4fa", color:"#185FA5", border:"none", cursor:"pointer", fontWeight:800, fontSize: isMobile?15:20 }}>← スタッフ</button>
          <div style={{ flex:1, padding: isMobile?"14px 12px":"26px 20px", background:"#185FA5", color:"#fff", fontWeight:900, fontSize: isMobile?18:26, textAlign:"center", position:"relative", letterSpacing:1 }}>
            管理者 シフト管理
            {pendingCount > 0 && <span style={{ position:"absolute", top: isMobile?10:16, right: isMobile?12:24, background:"#E24B4A", color:"#fff", borderRadius:10, padding:"2px 9px", fontSize:14, fontWeight:700 }}>{pendingCount}</span>}
          </div>
        </div>
      )}

      {/* スタッフサブナビ */}
      {page==="staff" && (
        <div style={{ display:"flex", borderBottom:"2px solid #eee", background:"#fafafa" }}>
          {[["wish","シフト希望入力"],["swap","交代申請"]].map(([k,label]) => (
            <button key={k} onClick={() => { setStaffPage(k); setSubmitted(false); setSwapSubmitted(false); }} style={{ flex:1, padding: isMobile?"10px 4px":"14px 8px", fontSize: isMobile?13:16, background:staffPage===k?"#E6F1FB":"transparent", color:staffPage===k?"#185FA5":"#666", border:"none", borderBottom:staffPage===k?"3px solid #185FA5":"3px solid transparent", cursor:"pointer", fontWeight:staffPage===k?700:400 }}>{label}</button>
          ))}
        </div>
      )}

      {loadingStaff && <div style={{ textAlign:"center", padding:"2rem", color:"#999" }}>読み込み中...</div>}

      {/* シフト希望入力 */}
      {!loadingStaff && page==="staff" && staffPage==="wish" && !submitted && (
        <div style={{ width:"100%", maxWidth:1100, margin:"0 auto", padding:"0 8px", boxSizing:"border-box" }}>
          <div style={{ padding:"8px 4px 6px", borderBottom:"1px solid #eee" }}>
            <div style={{ fontSize:14, fontWeight:600, color:"#555" }}>希望日をタップして時間を入力</div>
          </div>
          <div style={{ padding:"12px 4px", borderBottom:"1px solid #eee", display:"flex", gap:8, alignItems:"center" }}>
            <label style={{ fontSize:14, color:"#666", minWidth:40 }}>名前</label>
            {nameRegistered ? (
              <div style={{ flex:1, fontSize:16, padding:"10px 12px", background:"#f0f4ff", borderRadius:8, color:"#185FA5", fontWeight:700, border:"1px solid #c0d0f0" }}>
                {myName}
              </div>
            ) : (
              <select value={selectedStaff} onChange={e => {
                const newName = e.target.value;
                setWishDaysByStaff(prev => ({ ...prev, [selectedStaff]: wishDays }));
                setSelectedStaff(newName);
                setWishDays(wishDaysByStaff[newName] || {});
              }} style={{ flex:1, fontSize:16, padding:"10px 12px", border:"1px solid #ddd", borderRadius:8 }}>
                <option value="">選択してください</option>
                {staffList.map(s => <option key={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 4px", borderBottom:"1px solid #eee" }}>
            <button onClick={() => setMonth(m => m<=1?12:m-1)} style={{ background:"none", border:"1px solid #ddd", borderRadius:8, padding:"8px 20px", cursor:"pointer", fontSize:18 }}>＜</button>
            <span style={{ fontWeight:700, fontSize:18 }}>{YEAR}年{month}月</span>
            <button onClick={() => setMonth(m => m>=12?1:m+1)} style={{ background:"none", border:"1px solid #ddd", borderRadius:8, padding:"8px 20px", cursor:"pointer", fontSize:18 }}>＞</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap: isMobile?2:3, padding:"8px 0" }}>
            {DOW.map((d, i) => (
              <div key={d} style={{ textAlign:"center", fontSize: isMobile?12:15, padding: isMobile?"6px 0":"10px 0", color:i===0?"#E24B4A":i===6?"#185FA5":"#555", fontWeight:700 }}>{d}</div>
            ))}
            {Array.from({ length: new Date(YEAR, month-1, 1).getDay() }).map((_, i) => (
              <div key={i} style={{ aspectRatio:"1/1", minHeight: isMobile?44:150, background:"#f9f9f9", borderRadius: isMobile?4:8 }} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i+1).map(d => {
              const dow = getDow(YEAR, month, d);
              return (
                <div key={d} onClick={() => openWishModal(d)} style={{ aspectRatio:"1/1", minHeight: isMobile?44:150, borderRadius: isMobile?4:8, border: wishDays[d]?"3px solid #185FA5":"1px solid #e0e0e0", padding: isMobile?"4px 2px":"10px 4px", cursor:"pointer", background:wishDays[d]?"#ddeeff":"#fff", display:"flex", flexDirection:"column", alignItems:"center", justifyContent: isMobile?"center":"flex-start", boxShadow: wishDays[d]?"0 2px 10px rgba(24,95,165,0.2)":"none", boxSizing:"border-box" }}>
                  <div style={{ fontSize: isMobile?13:30, fontWeight:700, color:dow===0?"#E24B4A":dow===6?"#185FA5":"#333" }}>{d}</div>
                  {wishDays[d] && (
                    isMobile
                      ? <div style={{ width:6, height:6, borderRadius:"50%", background:"#185FA5", marginTop:2 }} />
                      : <div style={{ fontSize:20, background:"#fff", color:"#111", borderRadius:4, padding:"5px 4px", marginTop:6, textAlign:"center", lineHeight:1.4, width:"100%", boxSizing:"border-box", fontWeight:800, border:"1px solid #ddd" }}>{wishDays[d].replace("-","〜")}</div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ padding:"8px 4px 20px", display:"flex", gap:8 }}>
            <button onClick={() => setWishDays({})} style={{ padding:"10px 16px", fontSize:14, cursor:"pointer", border:"1px solid #ddd", borderRadius:8, color:"#666" }}>クリア</button>
            <button onClick={submitWish} style={{ flex:1, padding:"12px", fontSize:16, fontWeight:700, background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer" }}>送信 ➤</button>
          </div>
        </div>
      )}

      {!loadingStaff && page==="staff" && staffPage==="wish" && submitted && (
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
      {!loadingStaff && page==="staff" && staffPage==="swap" && !swapSubmitted && (
        <div style={{ maxWidth:600, margin:"0 auto", padding:"16px" }}>
          <div style={{ fontSize:14, color:"#888", marginBottom:20 }}>管理者が承認後にシフトに反映されます。</div>
          {[["申請者（自分）", swapFrom, setSwapFrom, staffList],["交代相手", swapTo, setSwapTo, staffList.filter(s => s.name !== swapFrom)]].map(([label, val, setter, list]) => (
            <div key={label} style={{ marginBottom:20 }}>
              <label style={{ fontSize:17, color:"#444", display:"block", marginBottom:8, fontWeight:600 }}>{label}</label>
              <select value={val} onChange={e => setter(e.target.value)} style={{ width:"100%", fontSize:22, padding:"16px 14px", border:"2px solid #ddd", borderRadius:10, boxSizing:"border-box" }}>
                <option value="">選択してください</option>
                {list.map(s => <option key={s.id}>{s.name}</option>)}
              </select>
            </div>
          ))}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:17, color:"#444", display:"block", marginBottom:8, fontWeight:600 }}>交代希望日</label>
            <input type="number" value={swapDay} onChange={e => setSwapDay(e.target.value)} placeholder="例：15" min="1" max="31" style={{ width:"100%", fontSize:22, padding:"16px 14px", border:"2px solid #ddd", borderRadius:10, boxSizing:"border-box" }} />
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:17, color:"#444", display:"block", marginBottom:8, fontWeight:600 }}>メモ（任意）</label>
            <textarea value={swapNote} onChange={e => setSwapNote(e.target.value)} rows={4} style={{ width:"100%", fontSize:20, padding:"16px 14px", border:"2px solid #ddd", borderRadius:10, resize:"vertical", boxSizing:"border-box" }} />
          </div>
          <button onClick={submitSwap} style={{ width:"100%", padding:"20px", fontSize:20, fontWeight:700, background:"#185FA5", color:"#fff", border:"none", borderRadius:10, cursor:"pointer" }}>交代申請を送信 ➤</button>
        </div>
      )}

      {page==="staff" && staffPage==="swap" && swapSubmitted && (
        <div style={{ padding:"2rem 1rem", textAlign:"center", maxWidth:480, margin:"0 auto" }}>
          <div style={{ fontSize:48 }}>📨</div>
          <div style={{ fontSize:17, fontWeight:600, marginTop:10 }}>申請を送信しました！</div>
          <div style={{ fontSize:13, color:"#666", marginTop:5 }}>管理者が承認するとシフトに反映されます</div>
          <button onClick={() => { setSwapSubmitted(false); setSwapFrom(""); setSwapTo(""); setSwapDay(""); setSwapNote(""); }} style={{ width:"100%", padding:11, fontSize:14, color:"#185FA5", background:"#fff", border:"1px solid #185FA5", borderRadius:4, cursor:"pointer", marginTop:16 }}>別の申請をする</button>
        </div>
      )}

      {/* 管理者パスワード */}
      {page==="admin" && !adminUnlocked && (
        <div style={{ padding:"3rem 1rem", textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🔒</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>管理者パスワードを入力</div>
          <input type="password" value={pwInput} onChange={e => setPwInput(e.target.value)} onKeyDown={e => e.key==="Enter"&&login()} placeholder="パスワード" style={{ padding:"10px 14px", fontSize:15, border:`1px solid ${pwError?"#E24B4A":"#ddd"}`, borderRadius:6, width:220, display:"block", margin:"0 auto 8px", textAlign:"center" }} />
          {pwError && <div style={{ color:"#E24B4A", fontSize:13, marginBottom:8 }}>パスワードが違います</div>}
          <button onClick={login} style={{ padding:"10px 32px", background:"#185FA5", color:"#fff", border:"none", borderRadius:6, fontSize:15, cursor:"pointer", fontWeight:600, marginTop:4 }}>ログイン</button>
        </div>
      )}

      {/* 管理者メイン */}
      {page==="admin" && adminUnlocked && (
        <div>
          <div style={{ display:"flex", alignItems:"center", borderBottom:"2px solid #ddd" }}>
            {[["list","希望一覧"],["shift","シフト調整"],["swap","交代申請"],["staffmgmt","スタッフ管理"]].map(([t, label]) => (
              <button key={t} onClick={() => setAdminTab(t)} style={{ flex:1, padding: isMobile?"10px 2px":"14px 6px", fontSize: isMobile?11:16, background:adminTab===t?"#E6F1FB":"#fff", color:adminTab===t?"#185FA5":"#555", border:"none", borderBottom:adminTab===t?"3px solid #185FA5":"3px solid transparent", cursor:"pointer", fontWeight:adminTab===t?800:500 }}>
                {label}{t==="swap"&&pendingCount>0?` (${pendingCount})`:""}
              </button>
            ))}
            <button onClick={async () => { await loadStaff(); await loadShiftState(adminMonth); await loadShiftState(month); }}
              style={{ padding:"10px 14px", margin:"0 8px", background:"#f4f7fb", border:"1.5px solid #ddd", borderRadius:8, cursor:"pointer", fontSize:18, color:"#555", flexShrink:0 }}
              title="データを最新に更新">🔄</button>
          </div>

          {/* 希望一覧 */}
          {adminTab==="list" && (
            <div style={{ padding:16 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <button onClick={() => setAdminMonth(m => m<=1?12:m-1)} style={{ background:"none", border:"2px solid #ddd", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontSize:18, fontWeight:700 }}>＜</button>
                <span style={{ fontWeight:800, fontSize:22 }}>{YEAR}年 {adminMonth}月</span>
                <button onClick={() => setAdminMonth(m => m>=12?1:m+1)} style={{ background:"none", border:"2px solid #ddd", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontSize:18, fontWeight:700 }}>＞</button>
              </div>
              {staffList.map(s => {
                const days = Object.entries(shiftState).filter(([k,v]) => k.startsWith(`${s.id}_`) && v?.wish).map(([k,v]) => { const d = k.split("_")[1]; return `${adminMonth}/${d}（${DOW[getDow(YEAR, adminMonth, parseInt(d))]}） ${v.wish}`; });
                return (
                  <div key={s.id} style={{ border:"1px solid #eee", borderRadius:10, padding:"14px 16px", marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ fontSize:18, fontWeight:700 }}>{s.name}{s.priority&&<span style={{ fontSize:12, background:s.priority===1?"#FAECE7":s.priority===2?"#FAEEDA":"#EAF3DE", color:s.priority===1?"#993C1D":s.priority===2?"#854F0B":"#3B6D11", borderRadius:8, padding:"2px 9px", marginLeft:8 }}>優先{s.priority}</span>}</span>
                      <span style={{ fontSize:14, fontWeight:600, padding:"4px 12px", borderRadius:10, background:days.length?"#E6F1FB":"#f0f0f0", color:days.length?"#185FA5":"#999" }}>{days.length?"✓ 提出済み":"未提出"}</span>
                    </div>
                    <div style={{ fontSize:15, color:"#555", lineHeight:2 }}>{days.length?days.join("　"):"希望未提出"}</div>
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
              {swapRequests.map(r => (
                <div key={r.id} style={{ border:`1px solid ${r.status==="pending"?"#185FA5":r.status==="approved"?"#1D9E75":"#ddd"}`, borderRadius:8, padding:"12px 14px", marginBottom:10, background:r.status==="pending"?"#f0f7ff":r.status==="approved"?"#f0fff8":"#fafafa" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <span style={{ fontSize:13, fontWeight:600 }}>{r.from} → {r.to}</span>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:10, background:r.status==="pending"?"#fff3cd":r.status==="approved"?"#d4edda":"#f8d7da", color:r.status==="pending"?"#856404":r.status==="approved"?"#155724":"#721c24", fontWeight:600 }}>
                      {r.status==="pending"?"⏳ 承認待ち":r.status==="approved"?"✅ 承認済み":"❌ 却下"}
                    </span>
                  </div>
                  <div style={{ fontSize:13, color:"#555", marginBottom:8, lineHeight:1.8 }}>
                    <div>📅 {adminMonth}月{r.day}日</div>
                    {r.note&&<div>📝 {r.note}</div>}
                  </div>
                  {r.status==="pending"&&(
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => approveSwap(r.id)} style={{ flex:1, padding:"8px", background:"#1D9E75", color:"#fff", border:"none", borderRadius:4, cursor:"pointer", fontWeight:600, fontSize:13 }}>✅ 承認・シフト反映</button>
                      <button onClick={() => rejectSwap(r.id)} style={{ flex:1, padding:"8px", background:"#fff", color:"#E24B4A", border:"1px solid #E24B4A", borderRadius:4, cursor:"pointer", fontWeight:600, fontSize:13 }}>❌ 却下</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* スタッフ管理 */}
          {adminTab==="staffmgmt" && (
            <div style={{ padding:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:18, fontWeight:700 }}>スタッフ管理</div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => { setStaffModalOpen({ mode:"add" }); setStaffForm({ name:"", hourly_wage:"", contact:"", rating:3, priority:"" }); setShowRetired(false); }} style={{ padding:"12px 20px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:16 }}>＋ スタッフ追加</button>
                  <button onClick={() => setShowRetired(v => !v)} style={{ padding:"12px 20px", background:showRetired?"#888":"#f0f0f0", color:showRetired?"#fff":"#666", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:16 }}>
                    退社スタッフ {retiredStaff.length > 0 && `(${retiredStaff.length})`}
                  </button>
                </div>
              </div>
              {/* 人件費サマリー */}
              {staffList.some(s => s.hourly_wage) && (
                <div style={{ background:"#E6F1FB", border:"2px solid #185FA5", borderRadius:10, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:16, fontWeight:700, color:"#185FA5" }}>📊 {YEAR}年{adminMonth}月 推定人件費</span>
                  <span style={{ fontSize:24, fontWeight:900, color:"#185FA5" }}>¥{calcLaborCost().toLocaleString()}</span>
                </div>
              )}
              {!showRetired && activeStaff.length===0 && <div style={{ textAlign:"center", color:"#999", padding:"2rem", fontSize:16 }}>スタッフが登録されていません</div>}
              {!showRetired && activeStaff.length > 0 && <div style={{ fontSize:12, color:"#aaa", marginBottom:8 }}>☰ をドラッグ、または ▲▼ で順番を変えられます</div>}
              {!showRetired && activeStaff.map((s, index) => (
                <div key={s.id}
                  draggable
                  onDragStart={() => setStaffDragFrom(index)}
                  onDragOver={e => { e.preventDefault(); setStaffDragOver(index); }}
                  onDragLeave={() => setStaffDragOver(null)}
                  onDrop={() => { handleStaffDrop(staffDragFrom, index); setStaffDragFrom(null); setStaffDragOver(null); }}
                  onDragEnd={() => { setStaffDragFrom(null); setStaffDragOver(null); }}
                  style={{ border: staffDragOver === index ? "2px dashed #185FA5" : "1px solid #eee",
                    borderRadius:10, padding:"14px 16px", marginBottom:10,
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    background: staffDragFrom === index ? "#f0f6ff" : "#fff",
                    opacity: staffDragFrom === index ? 0.6 : 1,
                    cursor:"grab", transition:"border 0.15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      <button onClick={() => moveStaff(index, -1)} disabled={index===0}
                        style={{ padding:"4px 8px", fontSize:13, lineHeight:1, border:"1px solid #ddd", borderRadius:5, cursor:index===0?"not-allowed":"pointer", background:"#f5f5f5", color:index===0?"#ccc":"#555", fontWeight:700 }}>▲</button>
                      <button onClick={() => moveStaff(index, 1)} disabled={index===activeStaff.length-1}
                        style={{ padding:"4px 8px", fontSize:13, lineHeight:1, border:"1px solid #ddd", borderRadius:5, cursor:index===activeStaff.length-1?"not-allowed":"pointer", background:"#f5f5f5", color:index===activeStaff.length-1?"#ccc":"#555", fontWeight:700 }}>▼</button>
                    </div>
                    <span style={{ fontSize:20, color:"#bbb", cursor:"grab", userSelect:"none" }}>☰</span>
                    <div>
                      <div style={{ fontSize:18, fontWeight:700 }}>{s.name}{s.priority&&<span style={{ fontSize:12, background:"#EAF3DE", color:"#3B6D11", borderRadius:8, padding:"2px 9px", marginLeft:8 }}>優先{s.priority}</span>}</div>
                      <div style={{ fontSize:14, color:"#666", marginTop:4, display:"flex", gap:14 }}>
                        {s.hourly_wage&&<span>💴 {s.hourly_wage.toLocaleString()}円/h</span>}
                        {s.contact&&<span>📞 {s.contact}</span>}
                        {s.rating&&<span style={{ color:"#F5A623" }}>{"★".repeat(s.rating)}<span style={{ color:"#ddd" }}>{"★".repeat(5-s.rating)}</span></span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={() => { setStaffModalOpen({ mode:"edit", staff:s }); setStaffForm({ name:s.name, hourly_wage:s.hourly_wage||"", contact:s.contact||"", rating:s.rating||3, priority:s.priority||"" }); }} style={{ padding:"10px 20px", border:"2px solid #185FA5", color:"#185FA5", background:"#fff", borderRadius:8, cursor:"pointer", fontSize:16, fontWeight:700 }}>編集</button>
                    <button onClick={() => deleteStaff(s.id)} style={{ padding:"10px 20px", border:"2px solid #E24B4A", color:"#E24B4A", background:"#fff", borderRadius:8, cursor:"pointer", fontSize:16, fontWeight:700 }}>退社</button>
                  </div>
                </div>
              ))}

              {/* 退社スタッフ一覧（ボタン押したとき） */}
              {showRetired && (
                retiredStaff.length === 0
                  ? <div style={{ textAlign:"center", color:"#999", padding:"2rem", fontSize:16 }}>退社スタッフはいません</div>
                  : retiredStaff.map(s => (
                    <div key={s.id} style={{ border:"1px solid #eee", borderRadius:10, padding:"14px 16px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f9f9f9" }}>
                      <div>
                        <div style={{ fontSize:17, fontWeight:700, color:"#999" }}>{s.name}</div>
                        <div style={{ fontSize:12, color:"#bbb", marginTop:2 }}>退社済み・アクセス不可</div>
                      </div>
                      <button onClick={() => restoreStaff(s.id)} style={{ padding:"10px 18px", border:"2px solid #888", color:"#888", background:"#fff", borderRadius:8, cursor:"pointer", fontSize:14, fontWeight:700 }}>復帰</button>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* シフト調整 */}
          {adminTab==="shift" && (
            <div style={{ padding:"6px 0 4px" }}>
              <div style={{ padding:"10px 12px 6px", borderBottom:"1px solid #e0e8f0" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, flexWrap:"wrap" }}>
                  <button onClick={() => setAdminMonth(m => m<=1?12:m-1)} style={{ background:"none", border:"2px solid #ddd", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontSize:18, fontWeight:700 }}>＜</button>
                  <span style={{ fontWeight:800, fontSize:22 }}>{YEAR}年 {adminMonth}月</span>
                  <button onClick={() => setAdminMonth(m => m>=12?1:m+1)} style={{ background:"none", border:"2px solid #ddd", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontSize:18, fontWeight:700 }}>＞</button>
                  <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                    <button onClick={downloadExcel} style={{ padding:"10px 16px", background:"#1D6F42", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:15, fontWeight:700 }}>📊 Excel</button>
                    <button onClick={printCalendar} style={{ padding:"10px 16px", background:"#E24B4A", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:15, fontWeight:700 }}>🖨️ 印刷/PDF</button>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                  <span style={{ fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}><span style={{ display:"inline-block", width:22, height:12, background:"#B5D4F4", border:"1px solid #185FA5", borderRadius:2 }} />希望</span>
                  <span style={{ fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}><span style={{ display:"inline-block", width:22, height:12, background:"#CCFF66", border:"1px solid #8AAD00", borderRadius:2 }} />調整済み</span>
                  {staffList.some(s => s.hourly_wage) && (
                    <div style={{ marginLeft:"auto", background:"#E6F1FB", border:"2px solid #185FA5", borderRadius:8, padding:"8px 18px", display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:"#185FA5" }}>📊 {adminMonth}月 推定人件費</span>
                      <span style={{ fontSize:20, fontWeight:900, color:"#185FA5" }}>¥{calcLaborCost().toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:"calc(100vh - 200px)", width:"100%", WebkitOverflowScrolling:"touch" }}>
                <table style={{ borderCollapse:"collapse", tableLayout:"fixed", width: NAME_W + COL_W * adminDays }}>
                  <thead style={{ position:"sticky", top:0, zIndex:4 }}>
                    <tr>
                      <th style={thName}>名前</th>
                      {Array.from({ length: adminDays }, (_, i) => i+1).map(d => {
                        const dow = getDow(YEAR, adminMonth, d);
                        return (
                          <th key={d} style={thDate(dow)}>
                            <div style={{ fontSize:18, fontWeight:800, lineHeight:1.1 }}>{d}</div>
                            <div style={{ fontSize:12, fontWeight:600, marginTop:1 }}>{DOW[dow]}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map(s => (
                      <tr key={s.id}>
                        <td style={tdName}>{s.name}</td>
                        {Array.from({ length: adminDays }, (_, i) => i+1).map(d => {
                          const k = `${s.id}_${d}`;
                          const st = shiftState[k] || {};
                          const dow = getDow(YEAR, adminMonth, d);
                          const isOver = dragOver === k;
                          return (
                            <td key={d} style={tdDate(isOver, dow)} onDragOver={e => { e.preventDefault(); setDragOver(k); }} onDragLeave={() => setDragOver(null)} onDrop={() => onDrop(s.id, d)}>
                              {/* 希望は常に表示。管理者シフトがあれば薄く（overridden） */}
                              {st.wish && (st.wishOff
                                ? <TimeChip t={st.wish} bg="#ddeeff" color="#0a3060" faded onClickChip={() => restoreWish(s.id, d)} label="↩" />
                                : <TimeChip t={st.wish} bg="#B5D4F4" color="#0a3060"
                                    overridden={!!st.admin}
                                    draggable={!st.admin} onDragStart={!st.admin ? () => setDragData({ staffId:s.id, d, type:"wish" }) : undefined}
                                    onRemove={!st.admin ? e => { e.stopPropagation(); removeWish(s.id, d); } : undefined} />
                              )}
                              {st.moved?.map((m, mi) => (
                                <TimeChip key={mi} t={m.time} bg="#CCFF66" color="#3A5200"
                                  draggable onDragStart={() => setDragData({ staffId:s.id, d, type:"moved", mi })}
                                  onClickChip={() => openShiftEdit(s.id, d, mi, st)}
                                  onRemove={e => { e.stopPropagation(); removeMoved(s.id, d, mi); }} />
                              ))}
                              {/* 管理者シフト（希望より常に優先） */}
                              {st.admin && (
                                <TimeChip t={st.admin} bg="#CCFF66" color="#3A5200"
                                  draggable onDragStart={() => setDragData({ staffId:s.id, d, type:"admin" })}
                                  onClickChip={() => openShiftEdit(s.id, d, undefined, st)}
                                  onRemove={e => { e.stopPropagation(); removeAdmin(s.id, d); }} />
                              )}
                              <div onClick={() => openShiftEdit(s.id, d, undefined, st)} style={{ fontSize:14, color:"#c8d4e0", textAlign:"center", cursor:"pointer", lineHeight:1, marginTop:1 }}>＋</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr style={{ position:"sticky", bottom:0, zIndex:3 }}>
                      <td style={{ ...tdName, background:"#1a3a5c", color:"#fff", fontWeight:800, fontSize:14 }}>出勤人数</td>
                      {Array.from({ length: adminDays }, (_, i) => i+1).map(d => {
                        const dow = getDow(YEAR, adminMonth, d);
                        const needed = getNeeded(dow);
                        const count = staffList.filter(s => { const st = shiftState[`${s.id}_${d}`]||{}; return (st.wish&&!st.wishOff)||st.admin||(st.moved?.length>0); }).length;
                        return (
                          <td key={d} style={{ border:"0.5px solid #c8d4e0", padding:"4px 2px", textAlign:"center", background: count>=needed?"#d4f5e9":count>0?"#fff9e6":"#f8f8f8", fontWeight:800, fontSize:16, color:count>=needed?"#0d7a55":count>0?"#8a6000":"#ccc", verticalAlign:"middle" }}>
                            {count}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 操作パネル */}
          {adminTab==="shift" && (
            <div style={{ borderTop:"3px solid #e0e8f0", background:"#f4f7fb" }}>
              {/* 一括入力セクション */}
              <div style={{ padding:"14px 16px", borderBottom:"1px solid #e0e8f0" }}>
                <div style={{ fontSize:14, fontWeight:800, color:"#555", marginBottom:10 }}>✏️ 一括入力（草稿）</div>
                <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                  {[["日",bulkDay,v=>setBulkDay(parseInt(v)),Array.from({length:adminDays},(_,i)=>({v:i+1,l:`${i+1}日`}))],
                    ["開始",bulkStart,setBulkStart,times.map(t=>({v:t,l:t}))],
                    ["終了",bulkEnd,setBulkEnd,endTimes.map(t=>({v:t,l:t}))]].map(([label,val,setter,opts])=>(
                    <div key={label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:"#555" }}>{label}</span>
                      <select value={val} onChange={e=>setter(e.target.value)} style={{ fontSize:14, padding:"7px 10px", border:"2px solid #ddd", borderRadius:8 }}>
                        {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  ))}
                  <button onClick={()=>openBulkScope("all")} style={{ padding:"9px 16px", background:"#555", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:14 }}>全員に入力</button>
                  <button onClick={()=>openBulkScope("individual")} style={{ padding:"9px 16px", background:"#fff", color:"#555", border:"2px solid #aaa", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:14 }}>個別を選んで入力</button>
                </div>
              </div>
              {/* 自動作成 ＋ スタッフへ反映 */}
              <div style={{ padding:"14px 16px", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                <button onClick={()=>{ setAutoStaffPriority(staffList.reduce((acc,s)=>({...acc,[s.id]:s.priority??''}),{})); setAutoCreateOpen(true); }} style={{ padding:"11px 20px", background:"#8AAD00", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:800, fontSize:15 }}>🤖 シフト自動作成</button>
                <div style={{ flex:1 }} />
                <button onClick={()=>{ setReflectModal(true); setReflectSelected(staffList.map(s=>s.id)); }} style={{ padding:"11px 24px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:800, fontSize:15 }}>🌐 全員のシフトを反映</button>
                <button onClick={()=>{ setReflectModal(true); setReflectSelected([]); }} style={{ padding:"11px 24px", background:"#fff", color:"#185FA5", border:"2px solid #185FA5", borderRadius:8, cursor:"pointer", fontWeight:800, fontSize:15 }}>👤 個別を選んで反映</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 希望入力モーダル */}
      {modalDay !== null && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"2rem", width:"90%", maxWidth:480, boxShadow:"0 8px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize:24, fontWeight:700, marginBottom:24, textAlign:"center" }}>{month}月{modalDay}日（{DOW[getDow(YEAR, month, modalDay)]}）</div>
            {[["開始", startTime, setStartTime, times],["終了", endTime, setEndTime, endTimes]].map(([label, val, setter, opts]) => (
              <div key={label} style={{ display:"flex", gap:12, alignItems:"center", marginBottom:20 }}>
                <label style={{ fontSize:20, color:"#444", minWidth:48, fontWeight:600 }}>{label}</label>
                <select value={val} onChange={e => setter(e.target.value)} style={{ flex:1, fontSize:24, padding:"14px 12px", border:"2px solid #ddd", borderRadius:10 }}>
                  {opts.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            ))}
            <div style={{ display:"flex", gap:10, marginTop:8 }}>
              <button onClick={() => { setWishDays(p => { const n={...p}; delete n[modalDay]; return n; }); setModalDay(null); }} style={{ flex:1, fontSize:18, padding:"14px", color:"#E24B4A", border:"2px solid #E24B4A", borderRadius:10, background:"#fff", cursor:"pointer", fontWeight:600 }}>削除</button>
              <button onClick={() => setModalDay(null)} style={{ flex:1, fontSize:18, padding:"14px", cursor:"pointer", border:"2px solid #ddd", borderRadius:10, fontWeight:600 }}>キャンセル</button>
              <button onClick={saveWishModal} style={{ flex:1, fontSize:18, padding:"14px", background:"#185FA5", color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700 }}>決定</button>
            </div>
          </div>
        </div>
      )}

      {/* シフト編集モーダル */}
      {shiftModal !== null && scopeModal === null && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:22, padding:"2.8rem 3rem", width:isMobile?"96vw":720, boxShadow:"0 8px 40px rgba(0,0,0,0.22)" }}>
            <div style={{ fontSize:26, fontWeight:700, marginBottom:8 }}>{adminMonth}月{shiftModal.d}日 シフト編集</div>
            <div style={{ fontSize:20, color:"#666", marginBottom:28 }}>{staffList.find(s=>s.id===shiftModal.staffId)?.name}</div>
            {[["開始", startTime, setStartTime, times],["終了", endTime, setEndTime, endTimes]].map(([label, val, setter, opts]) => (
              <div key={label} style={{ display:"flex", gap:16, alignItems:"center", marginBottom:24 }}>
                <label style={{ fontSize:22, color:"#666", minWidth:64 }}>{label}</label>
                <select value={val} onChange={e => setter(e.target.value)} style={{ flex:1, fontSize:24, padding:"14px 18px", border:"2px solid #ddd", borderRadius:10 }}>{opts.map(t => <option key={t}>{t}</option>)}</select>
              </div>
            ))}
            <div style={{ display:"flex", gap:16, marginTop:12 }}>
              <button onClick={() => setShiftModal(null)} style={{ flex:1, fontSize:20, padding:20, cursor:"pointer", border:"2px solid #ddd", borderRadius:12 }}>キャンセル</button>
              <button onClick={saveShiftLocal} style={{ flex:1, fontSize:20, padding:20, background:"#185FA5", color:"#fff", border:"none", borderRadius:12, cursor:"pointer", fontWeight:700 }}>保存（草稿）</button>
            </div>
          </div>
        </div>
      )}

      {/* 反映範囲選択モーダル */}
      {scopeModal !== null && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:14, padding:"1.4rem", width:300, boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>反映範囲を選択</div>
            <div style={{ fontSize:12, color:"#666", marginBottom:14 }}>{adminMonth}月{scopeModal.d}日　{startTime}〜{endTime}</div>
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {[["all","🌐 全員に反映"],["individual","👤 個別に反映"]].map(([v, label]) => (
                <button key={v} onClick={() => setScopeType(v)} style={{ flex:1, padding:"9px", border:`2px solid ${scopeType===v?"#185FA5":"#ddd"}`, borderRadius:8, background:scopeType===v?"#E6F1FB":"#fff", color:scopeType===v?"#185FA5":"#555", cursor:"pointer", fontWeight:scopeType===v?600:400, fontSize:13 }}>{label}</button>
              ))}
            </div>
            {scopeType==="individual" && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, color:"#666", marginBottom:6 }}>対象スタッフを選択（複数可）</div>
                <div style={{ maxHeight:180, overflowY:"auto", border:"1px solid #eee", borderRadius:6 }}>
                  {staffList.map(s => (
                    <label key={s.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderBottom:"1px solid #f0f0f0", cursor:"pointer", background:scopeSelected.includes(s.id)?"#E6F1FB":"#fff" }}>
                      <input type="checkbox" checked={scopeSelected.includes(s.id)} onChange={e => setScopeSelected(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))} />
                      <span style={{ fontSize:13 }}>{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setScopeModal(null)} style={{ flex:1, fontSize:13, padding:9, cursor:"pointer", border:"1px solid #ddd", borderRadius:6 }}>キャンセル</button>
              <button onClick={applyBulkLocal} style={{ flex:1, fontSize:13, padding:9, background:"#185FA5", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600 }}>入力（草稿）</button>
            </div>
          </div>
        </div>
      )}

      {/* 自動作成モーダル */}
      {autoCreateOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"2rem", width:"90%", maxWidth:580, boxShadow:"0 8px 40px rgba(0,0,0,0.25)", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>🤖 シフト自動作成</div>
            <div style={{ fontSize:13, color:"#888", marginBottom:20 }}>希望を出した日のみ割当。草稿として作成し、確認後に反映してください。</div>

            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:10, color:"#333" }}>📅 曜日別 必要人数</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6 }}>
                {DOW.map((day, i) => (
                  <div key={i} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:14, fontWeight:700, color:i===0?"#E24B4A":i===6?"#185FA5":"#444", marginBottom:4 }}>{day}</div>
                    <input type="number" min="0" max="20" value={dowRequired[i] ?? 2}
                      onChange={e => setDowRequired(p => ({ ...p, [i]: parseInt(e.target.value)||0 }))}
                      style={{ width:"100%", fontSize:18, fontWeight:700, padding:"8px 2px", border:"2px solid #ddd", borderRadius:8, textAlign:"center", boxSizing:"border-box" }} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:8, color:"#333" }}>👥 スタッフ優先順位（この月のみ・数字が小さいほど優先）</div>
              <div style={{ border:"1px solid #e8edf2", borderRadius:12, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", background:"#f4f7fb", padding:"8px 14px", fontSize:12, fontWeight:700, color:"#666" }}>
                  <span>スタッフ</span><span style={{ width:80, textAlign:"center" }}>この月の優先</span><span style={{ width:80, textAlign:"center" }}>評価</span>
                </div>
                {staffList.map(s => (
                  <div key={s.id} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", alignItems:"center", padding:"10px 14px", borderTop:"1px solid #f0f0f0" }}>
                    <span style={{ fontSize:15, fontWeight:600 }}>{s.name}</span>
                    <input type="number" min="1" max="99"
                      value={autoStaffPriority[s.id] ?? (s.priority || "")}
                      onChange={e => setAutoStaffPriority(p => ({ ...p, [s.id]: e.target.value }))}
                      placeholder={s.priority ? String(s.priority) : "–"}
                      style={{ width:70, fontSize:16, fontWeight:700, padding:"6px 4px", border:"2px solid #ddd", borderRadius:8, textAlign:"center" }} />
                    <div style={{ width:80, textAlign:"center", color:"#F5A623", fontSize:14 }}>
                      {"★".repeat(s.rating||0)}<span style={{ color:"#ddd" }}>{"★".repeat(5-(s.rating||0))}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, color:"#999", marginTop:6 }}>※ 空欄の場合はスタッフ管理の優先度 → 評価順で割当</div>
            </div>

            <div style={{ background:"#f4f7fb", borderRadius:10, padding:"12px 14px", fontSize:13, color:"#555", lineHeight:2, marginBottom:22 }}>
              <div>① 希望を出した日のみ割当（希望なしの日は入れない）</div>
              <div>② 各日：この月の優先順位 → 保存済み優先度 → 評価（★）順で選出</div>
              <div>③ 既に管理者シフトが入っている日はスキップ</div>
              <div>④ 作成後に0日のスタッフは警告で通知</div>
            </div>

            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:6, color:"#333" }}>📝 特記メモ（記録用）</div>
              <textarea value={autoNote} onChange={e=>setAutoNote(e.target.value)} rows={2}
                placeholder="例：田中さんは金土優先。木曜は最低3人確保したい…"
                style={{ width:"100%", fontSize:15, padding:"12px 14px", border:"2px solid #ddd", borderRadius:10, resize:"vertical", boxSizing:"border-box" }} />
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setAutoCreateOpen(false)} style={{ flex:1, fontSize:16, padding:"13px", cursor:"pointer", border:"2px solid #ddd", borderRadius:10, fontWeight:600 }}>キャンセル</button>
              <button onClick={autoCreateShift} style={{ flex:2, fontSize:16, padding:"13px", background:"#8AAD00", color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:800 }}>🤖 自動作成（草稿）</button>
            </div>
          </div>
        </div>
      )}

      {/* 自動作成結果モーダル */}
      {autoResult && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"2rem", width:"90%", maxWidth:480, boxShadow:"0 8px 40px rgba(0,0,0,0.25)", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ fontSize:22, fontWeight:800, marginBottom:6 }}>✅ 自動作成 完了</div>
            <div style={{ fontSize:15, color:"#555", marginBottom:18 }}>
              <b style={{ fontSize:22, color:"#8AAD00" }}>{autoResult.totalAssigned}</b> コマを草稿として組みました。
            </div>
            {autoResult.zeroStaff.length > 0 ? (
              <div style={{ background:"#fff7e6", border:"1.5px solid #F5A623", borderRadius:12, padding:"14px 16px", marginBottom:18 }}>
                <div style={{ fontSize:15, fontWeight:800, color:"#c47800", marginBottom:8 }}>⚠️ 0日のスタッフがいます</div>
                <div style={{ fontSize:13, color:"#666", marginBottom:10 }}>以下のスタッフは希望を出した日がなかったため、1コマも入れられませんでした。</div>
                {autoResult.zeroStaff.map(s => (
                  <div key={s.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderTop:"1px solid #fce8c0", fontSize:14 }}>
                    <span style={{ fontWeight:700 }}>{s.name}</span>
                    <span style={{ color:"#999" }}>希望日数：{autoResult.wishCounts[s.id] ?? 0}日</span>
                  </div>
                ))}
                <div style={{ marginTop:12, fontSize:13, color:"#888", lineHeight:1.7 }}>
                  → 希望を再提出してもらうか、シフト調整で手動で入れてください。
                </div>
              </div>
            ) : (
              <div style={{ background:"#f0f8eb", border:"1.5px solid #8AAD00", borderRadius:12, padding:"12px 16px", marginBottom:18, fontSize:14, color:"#4a7a00", fontWeight:600 }}>
                🎉 全スタッフに1コマ以上割り当てられました！
              </div>
            )}
            <div style={{ fontSize:13, color:"#888", marginBottom:20 }}>
              シフト調整タブで内容を確認・修正して、「スタッフへ反映」で本反映してください。
            </div>
            <button onClick={()=>setAutoResult(null)} style={{ width:"100%", fontSize:17, padding:"13px", background:"#185FA5", color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:800 }}>OK、シフトを確認する</button>
          </div>
        </div>
      )}

      {/* スタッフへ反映モーダル */}
      {reflectModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"2rem", width:"90%", maxWidth:440, boxShadow:"0 8px 40px rgba(0,0,0,0.25)", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ fontSize:20, fontWeight:800, marginBottom:6 }}>📤 シフトをスタッフに反映</div>
            <div style={{ fontSize:13, color:"#E24B4A", background:"#fff5f5", border:"1px solid #fcc", borderRadius:8, padding:"10px 14px", marginBottom:18 }}>
              ⚠️ 反映するとスタッフ側に即座に表示されます。確定前に内容を確認してください。
            </div>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:8, color:"#333" }}>対象スタッフを選択</div>
            <div style={{ background:"#f4f7fb", borderRadius:10, marginBottom:18, maxHeight:240, overflowY:"auto" }}>
              <label style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderBottom:"1px solid #e8edf2", cursor:"pointer", background:"#eaf0fb" }}>
                <input type="checkbox" checked={reflectSelected.length===staffList.length}
                  onChange={e=>setReflectSelected(e.target.checked?staffList.map(s=>s.id):[])} style={{ width:18, height:18 }} />
                <span style={{ fontSize:15, fontWeight:700 }}>全員選択</span>
              </label>
              {staffList.map(s=>(
                <label key={s.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderBottom:"1px solid #e8edf2", cursor:"pointer", background:reflectSelected.includes(s.id)?"#E6F1FB":"#fff" }}>
                  <input type="checkbox" checked={reflectSelected.includes(s.id)}
                    onChange={e=>setReflectSelected(prev=>e.target.checked?[...prev,s.id]:prev.filter(id=>id!==s.id))} style={{ width:18, height:18 }} />
                  <span style={{ fontSize:15, fontWeight:600 }}>{s.name}</span>
                </label>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setReflectModal(false)} style={{ flex:1, fontSize:16, padding:"13px", cursor:"pointer", border:"2px solid #ddd", borderRadius:10, fontWeight:600 }}>キャンセル</button>
              <button onClick={()=>reflectToStaff(reflectSelected)} disabled={reflectSelected.length===0}
                style={{ flex:2, fontSize:16, padding:"13px", background:reflectSelected.length>0?"#185FA5":"#ccc", color:"#fff", border:"none", borderRadius:10, cursor:reflectSelected.length>0?"pointer":"not-allowed", fontWeight:800 }}>
                ✅ {reflectSelected.length}名に反映する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* スタッフ追加・編集モーダル */}
      {staffModalOpen !== null && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"2rem", width:"90%", maxWidth:520, boxShadow:"0 8px 40px rgba(0,0,0,0.25)", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ fontSize:22, fontWeight:800, marginBottom:24 }}>{staffModalOpen.mode==="add"?"スタッフ追加":"スタッフ編集"}</div>
            {[["名前 *","name","text","例：山田 太郎"],["時給（円）","hourly_wage","number","例：1050"],["連絡先","contact","text","例：090-0000-0000"]].map(([label,key,type,ph]) => (
              <div key={key} style={{ marginBottom:20 }}>
                <label style={{ fontSize:16, color:"#555", display:"block", marginBottom:8, fontWeight:600 }}>{label}</label>
                <input type={type} value={staffForm[key]} onChange={e => setStaffForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={{ width:"100%", fontSize:20, padding:"14px 16px", border:"2px solid #ddd", borderRadius:10, boxSizing:"border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:16, color:"#555", display:"block", marginBottom:8, fontWeight:600 }}>評価（管理者のみ表示）</label>
              <div style={{ display:"flex", gap:6 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setStaffForm(p => ({ ...p, rating:n }))} style={{ flex:1, padding:"10px", fontSize:28, border:"none", background:"none", cursor:"pointer", color:staffForm.rating>=n?"#F5A623":"#ddd" }}>★</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:28 }}>
              <label style={{ fontSize:16, color:"#555", display:"block", marginBottom:8, fontWeight:600 }}>優先度（1が最高・管理者のみ）</label>
              <select value={staffForm.priority} onChange={e => setStaffForm(p => ({ ...p, priority:e.target.value }))} style={{ width:"100%", fontSize:20, padding:"14px 16px", border:"2px solid #ddd", borderRadius:10 }}>
                <option value="">なし</option>
                {[1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStaffModalOpen(null)} style={{ flex:1, fontSize:18, padding:"14px", cursor:"pointer", border:"2px solid #ddd", borderRadius:10, fontWeight:600 }}>キャンセル</button>
              <button onClick={saveStaff} disabled={!staffForm.name} style={{ flex:1, fontSize:18, padding:"14px", background:staffForm.name?"#185FA5":"#ccc", color:"#fff", border:"none", borderRadius:10, cursor:staffForm.name?"pointer":"not-allowed", fontWeight:700 }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
