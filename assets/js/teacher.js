/* 老師後台:總覽、學生、名單、遊戲設定、商店、內容、題庫覆蓋。畫面全在這一支,資料都走 /api/g/admin/*。 */
import { esc } from "./tx.js";

const $ = (s, r = document) => r.querySelector(s);
const val = (id) => { const e = $("#" + id); return e ? e.value.trim() : ""; };
const NUMS = ["", "一", "二", "三", "四", "五", "六"];
const dt = (ts) => { if (!ts) return "—"; const d = new Date(+ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const pct = (a, b) => (b ? Math.round((100 * a) / b) + "%" : "—");
const csvCell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function download(name, rows) {
  const blob = new Blob(["﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function parseCsv(t) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === "," || c === "\t") { row.push(f); f = ""; } else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; } else if (c !== "\r") f += c; }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
const KIND_NAME = { map: "地點", npc: "NPC", dlg: "對話", quest: "任務", crop: "作物", animal: "動物", item: "物品", ach: "成就", video: "影片", coll: "圖鑑" };
const CAT = { body: "體型", hair: "髮型", outfit: "服裝", acc: "配件", seed: "種子", feed: "飼料", animal: "動物", tool: "工具", deco: "裝飾" };
const TABS = [["ov", "總覽"], ["stu", "學生"], ["ros", "名單"], ["set", "遊戲設定"], ["shop", "商店"], ["cont", "內容"], ["cov", "題庫"]];

export function makeTeacher(H) {
  const { GET, POST, chrome, bind, toast, modal, semName, go, errMsg } = H;
  const S = { tab: "ov", cls: "", q: "", who: null, kind: "npc", edit: "", shopEdit: null };
  const detail = (e) => (e && e.detail ? (Array.isArray(e.detail) ? e.detail.join("\n") : String(e.detail)) : "");
  const fail = async (e) => { const d = detail(e); await modal(`<h3>${esc(errMsg(e))}</h3>${d ? `<pre class="adm-pre">${esc(d)}</pre>` : ""}`); };
  const ask = async (msg) => (await modal(`<p>${esc(msg)}</p>`, ["確定", "取消"])) === 0;

  /* ---------- 各分頁 ---------- */
  const views = {
    async ov() {
      const r = await GET("/admin/stats"), cls = r.classes;
      const tot = cls.reduce((a, c) => ({ s: a.s + c.students, t: a.t + c.activeToday, n: a.n + c.answeredToday, k: a.k + c.correctToday }), { s: 0, t: 0, n: 0, k: 0 });
      return `<div class="card"><h3>今天(${esc(r.day)})</h3><div class="adm-kpi"><div><b>${tot.s}</b><span>學生</span></div><div><b>${tot.t}</b><span>今天有上線</span></div><div><b>${tot.n}</b><span>今天答題</span></div><div><b>${pct(tot.k, tot.n)}</b><span>今天正確率</span></div><div><b>${r.characters}</b><span>已建角色</span></div></div></div>
      <div class="card"><h3>各班</h3><div class="tbl"><table><tr><th>班</th><th>學生</th><th>今天上線</th><th>答題</th><th>正確率</th></tr>${cls.map((c) => `<tr><td>${esc(c.cls)}</td><td>${c.students}</td><td>${c.activeToday}</td><td>${c.answeredToday}</td><td>${pct(c.correctToday, c.answeredToday)}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">名單裡還沒有學生。到「名單」分頁新增。</td></tr>`}</table></div></div>
      <div class="card adm"><h3>整班發(或扣)結晶</h3><p class="muted sm">獎勵活動用。每個人最多一次 ±1000,餘額不會扣成負的。</p>
        <div class="adm-form"><label>班級<select id="gc">${cls.map((c) => `<option>${esc(c.cls)}</option>`).join("")}</select></label><label>每人顆數<input id="ga" type="number" value="10"></label><label>原因<input id="gr" placeholder="例:週考進步獎" maxlength="40"></label></div>
        <button class="btn" data-act="gclass">發放</button></div>`;
    },
    async stu() {
      if (S.who) return studentDetail();
      const r = await GET("/admin/overview"), cl = [...new Set(r.students.map((x) => x.cls))].sort((a, b) => a.localeCompare(b, "zh", { numeric: true }));
      const list = r.students.filter((x) => (!S.cls || x.cls === S.cls) && (!S.q || (x.name || "").includes(S.q) || x.email.includes(S.q.toLowerCase())));
      S._list = list;
      return `<div class="card adm"><div class="adm-form"><label>班級<select id="fc"><option value="">全部</option>${cl.map((c) => `<option ${c === S.cls ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label><label>搜尋姓名<input id="fq" value="${esc(S.q)}" placeholder="姓名或 Email"></label></div>
        <div class="row"><button class="btn sm" data-act="filt">套用</button><button class="btn alt sm" data-act="csvStu">匯出 CSV</button></div>
        <p class="muted sm">只列出玩過遊戲的學生(${list.length} 位)。點「明細」看每章作答、結晶流水、可調整結晶或重設。</p>
        <div class="tbl"><table><tr><th>班</th><th>號</th><th>姓名</th><th>結晶</th><th>累計</th><th>答題</th><th>正確率</th><th>章數</th><th>最近</th><th></th></tr>${list.map((x) => `<tr><td>${esc(x.cls)}</td><td>${x.no}</td><td>${esc(x.name)}</td><td>${x.bal}</td><td>${x.earned}</td><td>${x.answered}</td><td>${pct(x.correct, x.answered)}</td><td>${x.chapters}</td><td>${dt(x.last)}</td><td><button class="btn sm" data-act="open" data-e="${esc(x.email)}">明細</button></td></tr>`).join("")}</table></div></div>`;
    },
    async ros() {
      const r = await GET("/admin/roster"), cl = [...new Set(r.rows.map((x) => x.cls))].sort((a, b) => a.localeCompare(b, "zh", { numeric: true }));
      S._ros = r.rows; const show = r.rows.filter((x) => !S.cls || x.cls === S.cls);
      const e = S.rosEdit || {};
      return `<div class="card adm"><h3>新增／修改一位</h3><p class="muted sm">Email 已存在就是修改。名單與「數學筆記本」共用,改這裡兩邊都會變。</p>
        <div class="adm-form"><label>Google Email<input id="re" value="${esc(e.email || "")}" placeholder="student@gmail.com"></label><label>班級<input id="rc" value="${esc(e.cls || S.cls || "")}" placeholder="601"></label><label>座號<input id="rn" type="number" value="${e.no ?? ""}"></label><label>姓名<input id="rm" value="${esc(e.name || "")}" maxlength="20"></label>
          <label>年級<select id="rg">${[1, 2, 3, 4, 5, 6].map((g) => `<option value="${g}" ${(e.grade || 3) === g ? "selected" : ""}>${NUMS[g]}年級</option>`).join("")}</select></label><label>身分<select id="rr"><option value="student">學生</option><option value="teacher" ${e.role === "teacher" ? "selected" : ""}>老師</option></select></label><label>使用期限(留空=不限)<input id="rx" value="${esc(e.expires || "")}" placeholder="2027-01-31"></label></div>
        <div class="row"><button class="btn" data-act="rsave">儲存</button><button class="btn alt" data-act="rclear">清空表單</button></div></div>
      <div class="card adm"><h3>一次匯入多位</h3><p class="muted sm">每行一位,欄位用逗號或 Tab 分開:<b>email,班級,座號,姓名,年級,期限(可省)</b>。可直接從試算表複製貼上。</p>
        <textarea id="rb" rows="5" placeholder="a@gmail.com,601,1,小明,3&#10;b@gmail.com,601,2,小華,3,2027-01-31"></textarea><button class="btn" data-act="rimport">匯入</button></div>
      <div class="card adm"><h3>整班操作</h3><p class="muted sm">學期末升年級、延長使用期限、整班停用都在這。(不會動到老師帳號)</p>
        <div class="adm-form"><label>班級<select id="bc">${cl.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label><label>年級<select id="bg"><option value="">不改</option><option value="+1">升一年級</option>${[1, 2, 3, 4, 5, 6].map((g) => `<option value="${g}">改成${NUMS[g]}年級</option>`).join("")}</select></label><label>使用期限<input id="bx" placeholder="不改請留空;清除請填 none"></label><label>狀態<select id="ba"><option value="">不改</option><option value="1">啟用</option><option value="0">整班停用</option></select></label></div>
        <button class="btn" data-act="rbulk">套用到整班</button></div>
      <div class="card adm"><div class="adm-form"><label>只看班級<select id="fc"><option value="">全部</option>${cl.map((c) => `<option ${c === S.cls ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label></div><div class="row"><button class="btn sm" data-act="filt">套用</button><button class="btn alt sm" data-act="csvRos">匯出名單 CSV</button></div>
        <div class="tbl"><table><tr><th>班</th><th>號</th><th>姓名</th><th>Email</th><th>年級</th><th>身分</th><th>期限</th><th>狀態</th><th></th></tr>${show.map((x, i) => `<tr class="${x.active ? "" : "off"}"><td>${esc(x.cls)}</td><td>${x.no}</td><td>${esc(x.name)}</td><td class="sm">${esc(x.email)}</td><td>${x.grade}</td><td>${x.role === "teacher" ? "老師" : "學生"}</td><td>${esc(x.expires || "—")}</td><td>${x.active ? "啟用" : "停用"}</td><td><button class="btn sm" data-act="redit" data-e="${esc(x.email)}">編輯</button> <button class="btn alt sm" data-act="rtoggle" data-e="${esc(x.email)}">${x.active ? "停用" : "啟用"}</button></td></tr>`).join("")}</table></div></div>`;
    },
    async set() {
      const r = await GET("/admin/settings"), sp = r.spec, v = r.values;
      const fld = (k) => { const s = sp[k]; const id = "s_" + k;
        if (s.type === "bool") return `<label>${esc(s.label)}<select id="${id}"><option value="1" ${v[k] !== "0" ? "selected" : ""}>開放</option><option value="0" ${v[k] === "0" ? "selected" : ""}>關閉</option></select></label>`;
        if (s.type === "text") return `<label class="wide">${esc(s.label)}<input id="${id}" maxlength="${s.max}" value="${esc(v[k])}"></label>`;
        if (s.type === "pts") return `<label>${esc(s.label)}<input id="${id}" value="${esc(v[k])}" placeholder="3,5,8"></label>`;
        return `<label>${esc(s.label)}<input id="${id}" type="number" min="${s.min}" max="${s.max}" value="${esc(v[k])}"></label>`; };
      const prog = Object.entries(r.progress);
      S._setKeys = Object.keys(sp);
      return `<div class="card adm"><h3>獎勵與公告</h3><p class="muted sm">存檔後 10 秒內全部學生生效。</p><div class="adm-form">${Object.keys(sp).map(fld).join("")}</div><button class="btn" data-act="ssave">儲存設定</button></div>
      <div class="card adm"><h3>各班教學進度</h3><p class="muted sm">學生練習與對戰只會出到這個學期(含)之前。沒設定的班級,出題範圍是該年級的下學期。</p>
        <div class="tbl"><table><tr><th>班</th><th>進度</th><th></th></tr>${prog.map(([c, s]) => `<tr><td>${esc(c)}</td><td>${semName(s)}</td><td><button class="btn alt sm" data-act="pdel" data-c="${esc(c)}">清除</button></td></tr>`).join("") || `<tr><td colspan="3" class="muted">尚未設定任何班級</td></tr>`}</table></div>
        <div class="adm-form"><label>班級<input id="cls" placeholder="601"></label><label>教到<select id="sem">${r.semesters.map((s) => `<option value="${s}">${semName(s)}</option>`).join("")}</select></label></div><button class="btn" data-act="setp">設定進度</button></div>`;
    },
    async shop() {
      const r = await GET("/admin/shop"); S._shop = r.items;
      return `<div class="card adm"><h3>商品(${r.items.length})</h3><p class="muted sm">直接改價格、等級、上下架,按該列「存」。想新增商品請用下方表單。造型部位(體型、髮型、服裝、配件)每人最多 1 個。</p>
        <div class="tbl"><table><tr><th>id</th><th>類別</th><th>名稱</th><th>價格</th><th>等級</th><th>年段</th><th>上限</th><th>上架</th><th></th></tr>${r.items.map((x, i) => `<tr class="${x.active ? "" : "off"}"><td class="sm">${esc(x.id)}</td><td>${esc(CAT[x.cat] || x.cat)}</td><td><input id="n${i}" value="${esc(x.name)}" maxlength="30"></td><td><input id="p${i}" type="number" min="0" value="${x.price}"></td><td><input id="l${i}" type="number" min="1" value="${x.minLv}"></td>
          <td><select id="t${i}">${["all", "low", "mid", "high"].map((t) => `<option ${t === x.tier ? "selected" : ""}>${t}</option>`).join("")}</select></td><td>${x.maxOwn}</td><td><input id="a${i}" type="checkbox" ${x.active ? "checked" : ""}></td><td><button class="btn sm" data-act="shsave" data-i="${i}">存</button></td></tr>`).join("")}</table></div></div>
      <div class="card adm"><h3>新增商品</h3><div class="adm-form"><label>id(小寫英數底線)<input id="ni" placeholder="deco_lamp"></label><label>類別<select id="nc">${Object.entries(CAT).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label><label>名稱<input id="nn" maxlength="30"></label><label>價格<input id="np" type="number" value="20"></label><label>最低等級<input id="nl" type="number" value="1"></label><label>可持有上限<input id="nm" type="number" value="999"></label></div><button class="btn" data-act="shnew">新增</button></div>`;
    },
    async cont() {
      const r = await GET("/admin/content?kind=" + S.kind), nm = (x) => x.name || x.title || (x.text || "").slice(0, 24) || x.id;
      S._cont = r.rows;
      return `<div class="card adm"><div class="adm-form"><label>種類<select id="ck">${Object.entries(KIND_NAME).map(([k, n]) => `<option value="${k}" ${k === S.kind ? "selected" : ""}>${n}(${k})</option>`).join("")}</select></label></div>
        <p class="muted sm">共 ${r.rows.length} 筆。「編輯」會把那一筆放進下方文字框(JSON),改完按儲存;也可以貼上一個 JSON 陣列一次匯入多筆。儲存前會檢查格式和互相引用,有錯會指出是哪一筆。</p>
        <div class="tbl"><table><tr><th>id</th><th>名稱</th><th>排序</th><th>啟用</th><th></th></tr>${r.rows.map((x, i) => `<tr class="${x.active ? "" : "off"}"><td class="sm">${esc(x.id)}</td><td>${esc(nm(x))}</td><td>${x.sort}</td><td>${x.active ? "是" : "否"}</td><td><button class="btn sm" data-act="cedit" data-i="${i}">編輯</button> <button class="btn alt sm" data-act="ctog" data-i="${i}">${x.active ? "停用" : "啟用"}</button> <button class="btn alt sm" data-act="cdel" data-i="${i}">刪除</button></td></tr>`).join("")}</table></div>
        <h3>編輯／匯入</h3><textarea id="ce" rows="9" spellcheck="false" placeholder='{"kind":"${S.kind}","id":"...", ...}'>${esc(S.edit)}</textarea><div class="row"><button class="btn" data-act="csave">儲存</button><button class="btn alt" data-act="cnew">填入空白範本</button></div></div>`;
    },
    async cov() {
      const r = await GET("/admin/coverage"), s = r.summary, lab = { none: "❌ 沒題", few: "⚠️ 太少", ok: "✅" };
      return `<div class="card adm"><p>共 ${s.chapters} 章:有題 ${s.ok} ・太少(&lt;5) ${s.few} ・沒題 ${s.none}。題庫共 ${s.bankQuestions} 題。</p><button class="btn alt sm" data-act="csvCov">匯出 CSV</button><div class="tbl"><table><tr><th>章</th><th>名稱</th><th>題庫</th><th>產生器</th><th>碰過人數</th><th>答題</th><th>正確率</th><th></th></tr>${r.chapters.map((c) => `<tr><td>${esc(c.id)}</td><td>${esc(c.title)}</td><td>${c.bank}</td><td>${c.gens}</td><td>${c.students}</td><td>${c.answered}</td><td>${pct(c.correct, c.answered)}</td><td>${lab[c.status]}</td></tr>`).join("")}</table></div></div>`;
    },
  };
  async function studentDetail() {
    const r = await GET("/admin/student?email=" + encodeURIComponent(S.who)); S._st = r;
    const ro = r.roster, rec = r.recent, pr = r.progress;
    return `<div class="card adm"><div class="row sp"><h3>${esc(ro.name)}(${esc(ro.cls)} 班 ${ro.no} 號・${ro.grade} 年級)</h3><button class="btn alt sm" data-act="back">← 回列表</button></div>
      <p class="sm muted">${esc(ro.email)}${ro.expires ? "・期限 " + esc(ro.expires) : ""}・${r.hasCharacter ? "已建立角色" : "還沒建立角色"}</p>
      <div class="adm-kpi"><div><b>${r.wallet.bal}</b><span>結晶</span></div><div><b>${r.wallet.earned}</b><span>累計賺到</span></div><div><b>${pct(rec.c || 0, rec.n || 0)}</b><span>最近 ${rec.n || 0} 題正確率</span></div><div><b>${pr.length}</b><span>碰過章數</span></div></div></div>
      <div class="card adm"><h3>調整結晶</h3><div class="adm-form"><label>顆數(負數=扣)<input id="ga" type="number" value="10"></label><label>原因<input id="gr" maxlength="40" placeholder="例:補發"></label></div><button class="btn" data-act="grant">確定</button></div>
      <div class="card adm"><h3>重設</h3><div class="row"><button class="btn alt sm" data-act="rs" data-w="daily">今天的獎勵上限歸零</button><button class="btn alt sm" data-act="rs" data-w="character">讓他重捏角色</button><button class="btn alt sm" data-act="rs" data-w="all">清空全部遊戲資料…</button></div><div class="adm-form"><label>要「清空全部」請在這輸入他的 Email 確認<input id="cf" autocomplete="off"></label></div><p class="muted sm">「清空全部」會刪掉結晶、背包、進度、農場等,無法復原,需再輸入一次 Email 確認。</p></div>
      <div class="card adm"><h3>每章作答</h3><div class="tbl"><table><tr><th>章</th><th>答題</th><th>答對</th><th>正確率</th><th>最近</th></tr>${pr.map((p) => `<tr><td>${esc(p.chapter)}</td><td>${p.answered}</td><td>${p.correct}</td><td>${pct(p.correct, p.answered)}</td><td>${dt(p.last)}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">還沒作答</td></tr>`}</table></div></div>
      <div class="card adm"><h3>最近 14 天</h3><div class="tbl"><table><tr><th>日期</th><th>賺到</th><th>答題</th><th>答對</th></tr>${r.daily.map((d) => `<tr><td>${esc(d.day)}</td><td>${d.earned}</td><td>${d.answered}</td><td>${d.correct}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">沒有紀錄</td></tr>`}</table></div></div>
      <div class="card adm"><h3>結晶流水(最近 30 筆)</h3><div class="tbl"><table><tr><th>時間</th><th>變動</th><th>原因</th><th>備註</th></tr>${r.ledger.map((l) => `<tr><td>${dt(l.ts)}</td><td>${l.delta > 0 ? "+" : ""}${l.delta}</td><td>${esc(l.reason || "")}</td><td class="sm">${esc(l.ref || "")}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">沒有紀錄</td></tr>`}</table></div></div>
      <div class="card adm"><h3>背包與任務</h3><p class="sm">${r.inventory.map((i) => esc(i.item) + "×" + i.qty).join("、") || "背包是空的"}</p><p class="sm">${r.quests.map((q) => esc(q.quest) + "(" + esc(q.status) + ")").join("、") || "沒有任務紀錄"}</p></div>`;
  }

  /* ---------- 動作 ---------- */
  const tplFor = (k) => ({ npc: { kind: "npc", id: "npc_new", name: "新角色", map: "loc_01", role: "", text: "" }, map: { kind: "map", id: "loc_new", name: "新地點", type: "other", desc: "", domains: [], unlock: "", fx: "", x: 50, y: 50 }, quest: { kind: "quest", id: "q_new", title: "新任務", goal: "answer:*:5", fx: "crystal:+20", cond: "", text: "" }, dlg: { kind: "dlg", id: "d_new", npc: "npc_01", start: 1, text: "你好!", choices: "" } }[k] || { kind: k, id: k + "_new", name: "新項目" });
  const A = (rerender) => ({
    gclass: async () => { const r = await POST("/admin/grant/class", { cls: val("gc"), amount: +val("ga"), reason: val("gr") }); toast(`已發給 ${r.students} 位`); },
    filt: () => { S.cls = val("fc"); S.q = val("fq") || ""; rerender(); },
    open: (b) => { S.who = b.dataset.e; rerender(); },
    back: () => { S.who = null; rerender(); },
    grant: async () => { const a = +val("ga"); if (!Number.isInteger(a) || !a) return toast("請輸入整數"); await POST("/admin/grant", { email: S.who, amount: a, reason: val("gr") || "teacher" }); toast("已調整"); rerender(); },
    rs: async (b) => { const w = b.dataset.w; if (w === "all") { const c = val("cf"); if (!c) return toast("請先在下方輸入他的 Email 確認"); await POST("/admin/student/reset", { email: S.who, what: "all", confirm: c }); } else { if (!(await ask(w === "daily" ? "把今天的獎勵上限歸零?" : "他下次進遊戲會重新捏角色,確定?"))) return; await POST("/admin/student/reset", { email: S.who, what: w }); } toast("已重設"); rerender(); },
    csvStu: () => download("students.csv", [["班", "號", "姓名", "Email", "結晶", "累計", "答題", "答對", "章數"], ...(S._list || []).map((x) => [x.cls, x.no, x.name, x.email, x.bal, x.earned, x.answered, x.correct, x.chapters])]),
    csvRos: () => download("roster.csv", [["email", "班級", "座號", "姓名", "年級", "身分", "期限", "啟用"], ...(S._ros || []).filter((x) => !S.cls || x.cls === S.cls).map((x) => [x.email, x.cls, x.no, x.name, x.grade, x.role, x.expires, x.active])]),
    csvCov: async () => { const r = await GET("/admin/coverage"); download("coverage.csv", [["章", "名稱", "題庫", "產生器", "碰過人數", "答題", "答對"], ...r.chapters.map((c) => [c.id, c.title, c.bank, c.gens, c.students, c.answered, c.correct])]); },
    rsave: async () => { try { await POST("/admin/roster", { rows: [{ email: val("re"), cls: val("rc"), no: +val("rn") || 0, name: val("rm"), grade: +val("rg"), role: val("rr"), expires: val("rx"), active: 1 }] }); S.rosEdit = null; toast("已儲存"); rerender(); } catch (e) { await fail(e); } },
    rclear: () => { S.rosEdit = null; rerender(); },
    redit: (b) => { S.rosEdit = S._ros.find((x) => x.email === b.dataset.e); rerender().then(() => window.scrollTo({ top: 0, behavior: "smooth" })); },
    rtoggle: async (b) => { const x = S._ros.find((y) => y.email === b.dataset.e); await POST("/admin/roster", { rows: [{ ...x, class: x.cls, active: x.active ? 0 : 1 }] }); rerender(); },
    rimport: async () => {
      const rows = parseCsv(val("rb")).map((c) => ({ email: c[0].trim(), cls: (c[1] || "").trim(), no: +c[2] || 0, name: (c[3] || "").trim(), grade: +c[4] || 3, expires: (c[5] || "").trim(), active: 1 }));
      if (!rows.length) return toast("沒有資料");
      try { const r = await POST("/admin/roster", { rows }); toast(`已匯入 ${r.saved} 位`); rerender(); } catch (e) { await fail(e); }
    },
    rbulk: async () => {
      const set = {}, g = val("bg"), x = val("bx"), a = val("ba");
      if (g === "+1") set.gradeDelta = 1; else if (g) set.grade = +g;
      if (x) set.expires = x === "none" ? "" : x; if (a) set.active = +a;
      if (!Object.keys(set).length) return toast("請至少選一項要改的");
      if (!(await ask(`確定要套用到 ${val("bc")} 班全部學生?`))) return;
      await POST("/admin/roster/bulk", { cls: val("bc"), set }); toast("已套用"); rerender();
    },
    ssave: async () => { const values = {}; S._setKeys.forEach((k) => { const e = $("#s_" + k); if (e) values[k] = e.type === "number" ? +e.value : e.value; }); try { await POST("/admin/settings", { values }); toast("已儲存,10 秒內生效"); } catch (e) { await fail(e); } },
    setp: async () => { await POST("/admin/progress", { cls: val("cls"), semester: val("sem") }); toast("已儲存"); rerender(); },
    pdel: async (b) => { await POST("/admin/progress/delete", { cls: b.dataset.c }); rerender(); },
    shsave: async (b) => { const i = +b.dataset.i, x = S._shop[i]; try { await POST("/admin/shop", { items: [{ ...x, name: val("n" + i), price: +val("p" + i), minLv: +val("l" + i), tier: val("t" + i), active: $("#a" + i).checked ? 1 : 0 }] }); toast("已儲存"); rerender(); } catch (e) { await fail(e); } },
    shnew: async () => { try { await POST("/admin/shop", { items: [{ id: val("ni"), cat: val("nc"), name: val("nn"), price: +val("np"), minLv: +val("nl"), maxOwn: ["body", "hair", "outfit", "acc"].includes(val("nc")) ? 1 : +val("nm"), tier: "all", active: 1, data: {} }] }); toast("已新增"); rerender(); } catch (e) { await fail(e); } },
    cedit: (b) => { const x = S._cont[+b.dataset.i]; S.edit = JSON.stringify(x, null, 1); rerender().then(() => $("#ce").scrollIntoView({ behavior: "smooth" })); },
    cnew: () => { S.edit = JSON.stringify(tplFor(S.kind), null, 1); rerender(); },
    ctog: async (b) => { const x = S._cont[+b.dataset.i]; try { await POST("/admin/content", { rows: [{ ...x, active: x.active ? 0 : 1 }] }); rerender(); } catch (e) { await fail(e); } },
    cdel: async (b) => { const x = S._cont[+b.dataset.i]; if (!(await ask(`刪除「${x.id}」?如果有別的內容引用它會出問題,建議改用「停用」。`))) return; await POST("/admin/content/delete", { kind: S.kind, id: x.id }); rerender(); },
    csave: async () => {
      let v; try { v = JSON.parse($("#ce").value); } catch (e) { return fail({ code: "bad_content", detail: "不是正確的 JSON:" + e.message }); }
      const rows = (Array.isArray(v) ? v : [v]).map((x) => ({ kind: S.kind, ...x }));
      try { const r = await POST("/admin/content", { rows }); S.edit = ""; toast(`已儲存 ${r.saved} 筆`); rerender(); } catch (e) { await fail(e); }
    },
  });

  return async function teacher() {
    const m = chrome("/teacher");
    const draw = async () => {
      const keep = window.scrollY;
      m.innerHTML = `<h2 class="ttl">老師後台</h2><div class="seg pick">${TABS.map(([k, n]) => `<button class="${S.tab === k ? "on" : ""}" data-act="tab" data-k="${k}">${n}</button>`).join("")}</div><div id="tb"><p class="muted">載入中…</p></div>`;
      try { $("#tb").innerHTML = await views[S.tab](); } catch (e) { $("#tb").innerHTML = `<div class="card"><p class="err">${esc(errMsg(e))}</p></div>`; }
      const ck = $("#ck"); if (ck) ck.onchange = () => { S.kind = ck.value; S.edit = ""; draw(); };
      window.scrollTo(0, keep);
    };
    const acts = A(draw);
    bind(m, { ...acts, tab: (b) => { S.tab = b.dataset.k; if (S.tab !== "stu") S.who = null; draw(); } });
    await draw();
  };
}
