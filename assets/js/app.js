/* 數光島前端。所有判斷（答案、獎勵、解鎖）都在伺服器，這裡只負責顯示與送出動作。 */
"use strict";
const CFG = window.SI_CONFIG || {};
const DOMS = [["數與量", "🔢", "d0"], ["圖形與空間", "🔷", "d1"], ["測量", "📏", "d2"], ["統計與規律", "📊", "d3"], ["解題與關係", "🧩", "d4"]];
const MAPEMO = { town: "🏘️", shop: "🏪", farm: "🌾", pen: "🐑", work: "⚙️", tower: "🗼", nature: "🌲", sea: "🌊", other: "✨" };
const CATS = { body: "體型", hair: "髮型", outfit: "服裝", acc: "配件", seed: "種子", feed: "飼料", animal: "動物", tool: "工具", deco: "裝飾" };
const EMO = { carrot: "🥕", tomato: "🍅", wheat: "🌾", egg: "🥚", wool: "☁️", dew: "💧", star_flower: "🌸", seed_carrot: "🥕", seed_tomato: "🍅", seed_wheat: "🌾", seed_star: "🌸", feed_hay: "🌿", feed_grain: "🌾", animal_sheep: "🐑", animal_chicken: "🐥", plot_ext: "🟫", pen_ext: "🛖", crop_carrot: "🥕", crop_tomato: "🍅", crop_wheat: "🌾", crop_star: "🌸", an_sheep: "🐑", an_chicken: "🐥" };
const NUM = ["", "一", "二", "三", "四", "五", "六"];
const semName = (s) => NUM[+s[0]] + (s[1] === "u" ? "上" : "下");
const ERR = {
  net: "連不上伺服器,請檢查網路後再試一次。", server: "伺服器忙碌中,請稍後再試。", bad_token: "登入已失效,請重新登入。", no_token: "請先登入。",
  not_in_roster: "這個帳號不在班級名單裡,請找老師。", expired: "你的使用期限到了,現在只能看,不能玩。請找老師。", forbidden: "這裡只有老師可以使用。",
  not_enough: "結晶不夠喔,再答幾題吧!", not_enough_item: "東西不夠。", limit: "已經擁有最多囉。", locked: "還沒解鎖,等級再高一點就可以了。", bad_request: "送出的資料不對,再試一次。",
  already_done: "這件事已經做過了。", occupied: "這裡已經有東西了。", not_ready: "還沒準備好,再等一下。", no_need: "不需要澆水了。", already_fed: "牠已經吃飽了。",
  empty_slot: "這裡是空的。", not_done: "任務目標還沒完成。", not_active: "這個任務還沒開始。", not_available: "這個任務還沒出現。", map_locked: "這個地點還沒開放。",
  no_questions: "這個領域的題目還在準備中,先練別的吧!", no_session: "這份練習找不到了,請重新開始。", session_expired: "練習放太久了,請重新開始。", no_curriculum: "老師還沒設定好章節。",
  bad_content: "內容格式有誤。", not_sellable: "這個不能賣。"
};
const errMsg = (e) => ERR[e && e.code] || ("出了點問題(" + ((e && e.code) || "?") + ")");

/* ---------- 小工具 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const kx = (t, d) => { if (!window.katex) return esc(t); try { return katex.renderToString(t, { displayMode: !!d, throwOnError: false, strict: false }); } catch { return esc(t); } };
const tx = (s) => String(s ?? "").split(/(\$\$[^$]+\$\$|\$[^$]+\$)/).map((p, i) => (i % 2 ? (p.startsWith("$$") ? kx(p.slice(2, -2), 1) : kx(p.slice(1, -1))) : esc(p))).join("");
const imgUrl = (p) => { const m = /^d:([0-9a-f]{16})$/.exec(p || ""); return m ? (ME && ME.config.imgBase || "") + "/api/img/" + m[1] : ""; };
const icon = (id, fb) => (CFG.art ? `<img class="ico" src="assets/art/${esc(id)}.webp" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${fb || EMO[id] || "🎁"}'}))">` : esc(fb || EMO[id] || "🎁"));
let toastT;
function toast(msg) { const d = document.createElement("div"); d.className = "toast"; d.textContent = msg; $("#toasts").appendChild(d); setTimeout(() => d.remove(), 2800); }
function modal(html, btns = ["好"]) {
  return new Promise((res) => {
    const m = document.createElement("div"); m.className = "modal"; m.innerHTML = `<div>${html}<div class="row" style="justify-content:center;margin-top:14px">${btns.map((b, i) => `<button class="btn ${i ? "alt" : ""}" data-i="${i}">${esc(b)}</button>`).join("")}</div></div>`;
    m.onclick = (e) => { const b = e.target.closest("[data-i]"); if (b) { m.remove(); res(+b.dataset.i); } };
    document.body.appendChild(m);
  });
}
function speak(t) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(t).replace(/\$/g, "")); u.lang = "zh-TW"; u.rate = 0.9; speechSynthesis.speak(u); } catch {} }

/* ---------- 登入 ---------- */
let auth = null, ME = null, W = null, QZ = null, timer = null, mainEl = null;
async function initAuth() {
  if (window.SI_TEST_TOKEN) return { token: async () => window.SI_TEST_TOKEN, onChange: (cb) => cb(true), signIn() {}, signOut() {} };
  const v = "10.14.1", base = `https://www.gstatic.com/firebasejs/${v}/`;
  const [{ initializeApp }, A] = await Promise.all([import(base + "firebase-app.js"), import(base + "firebase-auth.js")]);
  const fb = A.getAuth(initializeApp(CFG.firebase)); fb.languageCode = "zh-TW";
  const red = A.getRedirectResult(fb).catch((e) => { window.__authErr = (e && e.code) || "auth/unknown"; });
  return {
    token: () => fb.currentUser.getIdToken(),
    onChange: (cb) => A.onAuthStateChanged(fb, (u) => red.then(() => cb(!!u))),
    signIn() { const p = new A.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" }); return A.signInWithPopup(fb, p).catch((e) => { if (e && e.code === "auth/popup-blocked") return A.signInWithRedirect(fb, p); throw e; }); },
    signOut: () => A.signOut(fb),
  };
}
async function api(method, path, body) {
  let r, j;
  try {
    const t = await auth.token();
    r = await fetch(CFG.api + path, { method, headers: { Authorization: "Bearer " + t, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    j = await r.json();
  } catch { const e = new Error("net"); e.code = "net"; throw e; }
  if (!r.ok || j.err) { const e = new Error(j.err || "server"); e.code = j.err || "server"; e.detail = j.detail; throw e; }
  return j;
}
const GET = (p) => api("GET", "/api/g" + p), POST = (p, b) => api("POST", "/api/g" + p, b || {});

function loginView(msg) {
  document.body.className = "";
  $("#app").innerHTML = `<div class="hero"><div class="big">🏝️</div><h1>數光島</h1><p class="muted">答對數學題,收集數光結晶,<br>種田、養動物,把整座島點亮。</p>
  ${msg ? `<p class="err">${esc(msg)}</p>` : ""}<p><button class="btn" id="go">用 Google 登入</button></p><p class="muted sm">請用老師登記的 Google 帳號登入。</p></div>`;
  $("#go").onclick = async (e) => { e.target.disabled = true; try { await auth.signIn(); } catch (err) { loginView(authMsg(err && err.code)); } };
}
const authMsg = (c) => ({ "auth/popup-closed-by-user": "登入視窗被關掉了,再按一次。", "auth/network-request-failed": "網路不穩,連不上 Google,請稍後再試。", "auth/unauthorized-domain": "這個網址還沒加進 Firebase 授權網域,請老師設定。" }[c] || "登入沒有成功(" + (c || "?") + "),再試一次。");

async function boot() {
  try { ME = await GET("/me"); }
  catch (e) { loginErr(e); return; }
  document.body.className = "tier-" + ME.user.tier;
  if (!ME.player && ME.user.role !== "teacher") { go("/wardrobe/new"); } else if (!location.hash || location.hash === "#/") go("/town");
  route();
}
function loginErr(e) {
  $("#app").innerHTML = `<div class="hero"><div class="big">🔒</div><p class="err">${esc(errMsg(e))}</p><p><button class="btn alt" id="so">換個帳號登入</button> <button class="btn" id="rt">重試</button></p></div>`;
  $("#so").onclick = () => auth.signOut(); $("#rt").onclick = () => boot();
}

/* ---------- 外框與路由 ---------- */
const go = (p) => { location.hash = "#" + p; };
const TABS = [["/town", "🏘️", "城鎮"], ["/practice", "✏️", "練習"], ["/quests", "📜", "任務"], ["/bag", "🎒", "背包"], ["/book", "📖", "圖鑑"]];
const lvBar = () => { const w = ME.wallet, st = ME.config.levelStep, base = (w.lv - 1) * st; return Math.max(0, Math.min(100, ((w.earned - base) / st) * 100)); };
function chrome(active) {
  const w = ME.wallet, p = ME.player;
  $("#app").innerHTML = `<header class="top"><div class="who"><div class="av">${p ? "🧒" : "❔"}</div><div class="nm">${esc(p ? p.nick : ME.user.name)}<small>${esc(ME.user.name)}・Lv ${w.lv}</small></div>
    <div class="gem">✨ ${w.bal}</div><button class="btn alt sm" id="menu" aria-label="選單">⋯</button></div><div class="bar"><i style="width:${lvBar()}%"></i></div></header>
    ${ME.user.expired ? `<div class="card err">你的使用期限到了,現在只能看,不能玩。</div>` : ""}<main id="main"></main>
    <nav class="tabs">${TABS.concat(ME.user.role === "teacher" ? [["/teacher", "🧑‍🏫", "老師"]] : []).map(([h, e, n]) => `<a href="#${h}" class="${active === h ? "on" : ""}"><b>${e}</b>${n}</a>`).join("")}</nav>`;
  $("#menu").onclick = async () => { const i = await modal("<h3>選單</h3>", ["換造型", "登出", "關閉"]); if (i === 0) go("/wardrobe"); if (i === 1) auth.signOut(); };
  mainEl = $("#main"); return mainEl;
}
async function refreshMe() { ME = Object.assign(ME, await GET("/me")); const t = $(".top"); if (t) { const w = ME.wallet; $(".gem").textContent = "✨ " + w.bal; $(".bar i").style.width = lvBar() + "%"; $(".nm small").textContent = ME.user.name + "・Lv " + w.lv; } }
const VIEWS = {};
async function route() {
  if (!ME) return;
  clearInterval(timer); timer = null;
  const parts = (location.hash.slice(1) || "/town").split("/").filter(Boolean), name = parts[0] || "town", args = parts.slice(1).map(decodeURIComponent);
  const v = VIEWS[name] || VIEWS.town, tab = TABS.find((t) => t[0] === "/" + name);
  try { await v(args); } catch (e) { const m = mainEl && document.body.contains(mainEl) ? mainEl : chrome("/" + name); m.innerHTML = `<div class="card"><p class="err">${esc(errMsg(e))}</p><button class="btn" id="rt">重試</button> <a class="btn alt" href="#/town">回城鎮</a></div>`; $("#rt").onclick = route; }
}
window.addEventListener("hashchange", route);
const lock = async (btn, fn) => { if (btn) btn.disabled = true; try { return await fn(); } catch (e) { toast(errMsg(e)); } finally { if (btn) btn.disabled = false; } };
function bind(root, acts) { root.onclick = (e) => { const b = e.target.closest("[data-act]"); if (b && acts[b.dataset.act]) lock(b, () => acts[b.dataset.act](b)); }; }

/* 解鎖通知:新地點、成就、影片、新任務 */
async function announce(u) {
  if (!u) return;
  for (const m of u.maps || []) toast("🗺️ 發現新地點:" + m.name);
  for (const a of u.ach || []) await modal(`<div class="big">🏅</div><h3>獲得成就</h3><p><b>${esc(a.name)}</b><br><span class="muted">${esc(a.desc || "")}</span></p>`);
  for (const v of u.videos || []) { const i = await modal(`<div class="big">🎬</div><h3>解鎖新影片</h3><p>${esc(v.title)}</p>`, ["看影片", "之後再看"]); if (i === 0) await playVideo(v); }
  if ((u.quests || []).length) toast("有新任務囉!");
}
async function playVideo(v) {
  await modal(v.yt ? `<h3>${esc(v.title)}</h3><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.yt)}?rel=0" allowfullscreen allow="autoplay; encrypted-media"></iframe>`
    : `<div class="big">🎬</div><h3>${esc(v.title)}</h3><p class="muted">影片製作中,敬請期待!</p>`, ["關閉"]);
}
const speakBtn = (t) => `<button class="speak" data-say="${esc(t)}" aria-label="朗讀">🔊</button>`;
document.addEventListener("click", (e) => { const b = e.target.closest("[data-say]"); if (b) speak(b.dataset.say); });

/* ---------- 城鎮 ---------- */
VIEWS.town = async () => {
  const m = chrome("/town"); m.innerHTML = `<p class="muted">載入中…</p>`;
  const [w, q] = await Promise.all([GET("/world"), GET("/quests")]); W = w; await refreshMe();
  const next = q.quests.filter((x) => x.status !== "done").sort((a, b) => (b.main - a.main) || (b.claimable - a.claimable))[0];
  m.innerHTML = `${next ? `<div class="card"><span class="tag ${next.main ? "main" : ""}">${next.main ? "主線" : "任務"}</span> <b>${esc(next.title)}</b><br><span class="muted">${esc(next.text)}</span><div class="row sp" style="margin-top:8px"><small>${next.status === "available" ? "可以接任務" : `進度 ${next.progress.have}/${next.progress.need}`}</small><a class="btn sm" href="#/quests">${next.claimable ? "去領獎" : "看任務"}</a></div></div>` : ""}
  <div class="row sp"><h2>島上的地點</h2><button class="btn alt sm" data-act="ck">📅 今日簽到</button></div>
  <div class="grid">${w.maps.map((x) => x.unlocked ? `<a class="card" style="text-decoration:none;color:inherit" href="#/map/${x.id}"><span class="emo">${icon("map_" + x.id, MAPEMO[x.kind] || "✨")}</span><h3>${esc(x.name)}</h3><small class="muted">${(x.quests.available + x.quests.active) ? `📜 ${x.quests.available + x.quests.active} 個任務` : esc(x.desc || "")}</small></a>`
    : `<div class="card lock"><span class="emo">🔒</span><h3>？？？</h3><small class="muted">${esc(x.hint || "")}</small></div>`).join("")}</div>`;
  bind(m, { ck: async () => { const r = await POST("/checkin"); await refreshMe(); toast(r.already ? "今天已經簽到過囉!" : `簽到成功!連續 ${r.streak} 天,+${r.reward} ✨`); await announce(r.unlocked); } });
  await announce(w.unlocked);
};

VIEWS.map = async ([id]) => {
  const m = chrome("/town"); const w = W = await GET("/world"); const x = w.maps.find((k) => k.id === id);
  if (!x || !x.unlocked) { m.innerHTML = `<div class="card">這個地點還沒開放。<br><a class="btn" href="#/town">回城鎮</a></div>`; return; }
  const acts = { shop: ["🏪 逛商店", "/shop"], farm: ["🌱 去田裡", "/farm"], pen: ["🐑 去畜欄", "/pens"] }[x.kind];
  m.innerHTML = `<a href="#/town" class="muted">← 回城鎮</a><div class="card" style="text-align:center"><span class="emo big">${icon("map_" + x.id, MAPEMO[x.kind] || "✨")}</span><h2>${esc(x.name)}</h2><p class="muted">${esc(x.desc || "")}</p>
  ${acts ? `<a class="btn green" href="#${acts[1]}">${acts[0]}</a>` : ""} ${x.domains && x.domains.length ? `<button class="btn" data-act="pr">✏️ 在這裡練習${x.domains.map(esc).join("、")}</button>` : ""}</div>
  <h3>這裡的朋友</h3><div class="grid">${x.npcs.map((n) => `<a class="card slot" style="text-decoration:none;color:inherit" href="#/talk/${n.id}"><span class="emo">${icon(n.id, "🧑")}</span><b>${esc(n.name)}</b><br><small class="muted">${esc(n.role || "")}</small></a>`).join("") || `<p class="muted">這裡暫時沒有人。</p>`}</div>`;
  bind(m, { pr: () => startQuiz(x.domains) });
};

/* ---------- 對話 ---------- */
VIEWS.talk = async ([npcId, nodeId]) => {
  const m = chrome("/town");
  let r = await POST("/talk", { npc: npcId });
  const show = async (r) => {
    await refreshMe();
    if (!r.node || (r.end && !r.node.text)) { await announce(r.unlocked); return go("/town"); }
    const n = r.node, last = !n.choices.length && !n.next;
    m.innerHTML = `<div class="card dlg"><div class="npc"><div class="av">${icon(r.npc.id, "🧑")}</div><h3>${esc(r.npc.name)}</h3></div><p class="say">${tx(n.text)} ${speakBtn(n.text)}</p>
    ${n.choices.map((c) => `<button class="btn alt choice" data-act="pick" data-i="${c.i}">${esc(c.t)}</button>`).join("")}
    ${!n.choices.length ? `<button class="btn" data-act="${n.next ? "next" : "end"}">${n.next ? "繼續 ▶" : "好的!"}</button>` : ""}</div>`;
    bind(m, {
      pick: async (b) => show(await POST("/talk", { npc: npcId, node: n.id, choice: +b.dataset.i })),
      next: async () => show(await POST("/talk", { npc: npcId, node: n.next })),
      end: () => history.length > 1 ? history.back() : go("/town"),
    });
    await announce(r.unlocked);
  };
  await show(r);
};

/* ---------- 練習 ---------- */
VIEWS.practice = async () => {
  const m = chrome("/practice");
  m.innerHTML = `<h2>今天想練什麼?</h2><p class="muted">每答對一題就會得到數光結晶。答錯也沒關係,看看解答再試試。</p>
  <div class="grid">${DOMS.map(([n, e, c]) => `<button class="dom ${c}" data-act="go" data-d="${esc(n)}"><b>${e}</b>${n}</button>`).join("")}<button class="dom" style="border-color:var(--line)" data-act="go" data-d="*"><b>🎲</b>隨機</button></div>`;
  bind(m, { go: (b) => startQuiz(b.dataset.d === "*" ? [] : [b.dataset.d]) });
};
async function startQuiz(domains) {
  if (ME.user.expired) return toast(ERR.expired);
  const r = await POST("/quiz/start", { domains: domains || [], count: 5 });
  QZ = { sid: r.sid, qs: r.qs, i: 0, right: 0, gain: 0, fallback: r.fallback, domains }; go("/quiz");
  if (location.hash === "#/quiz") route();
}
VIEWS.quiz = async () => {
  const m = chrome("/practice"); if (!QZ) return go("/practice");
  const q = QZ.qs[QZ.i], n = QZ.qs.length;
  if (!q) {
    m.innerHTML = `<div class="card" style="text-align:center"><div class="big">🎉</div><h2>練習完成!</h2><p>答對 <b>${QZ.right}</b> / ${n} 題<br>這次得到 <b>✨ ${QZ.gain}</b></p><button class="btn" data-act="again">再練一次</button> <a class="btn alt" href="#/town">回城鎮</a></div>`;
    const dm = QZ.domains; bind(m, { again: () => startQuiz(dm) }); await refreshMe(); return;
  }
  let sel = null, done = false;
  m.innerHTML = `${QZ.fallback && QZ.i === 0 ? `<div class="card muted">這個領域的題目還在準備中,先練別的~</div>` : ""}<div class="row sp"><small class="muted">第 ${QZ.i + 1} / ${n} 題</small>${speakBtn(q.q)}</div>
  <div class="q">${tx(q.q)}</div>${q.img ? `<img class="qimg" alt="附圖" src="${esc(imgUrl(q.img))}">` : ""}
  ${q.o ? `<div class="opts">${q.o.map((o, i) => `<button class="opt" data-act="opt" data-v="${esc(o)}">${"ABCDEFGH"[i]}．${tx(o)}</button>`).join("")}</div>`
    : `<input id="ans" ${q.t === "text" ? "" : 'inputmode="decimal"'} autocomplete="off" placeholder="${q.t === "text" ? "寫下答案" : "輸入數字"}">`}
  <p><button class="btn" data-act="ok" id="okb" ${q.o ? "disabled" : ""}>送出答案</button></p><div id="fb"></div>`;
  const okb = $("#okb"), inp = $("#ans");
  if (inp) { inp.focus(); inp.onkeydown = (e) => e.key === "Enter" && okb.click(); }
  bind(m, {
    opt: (b) => { if (done) return; sel = b.dataset.v; m.querySelectorAll(".opt").forEach((x) => x.classList.toggle("on", x === b)); okb.disabled = false; },
    ok: async () => {
      if (done) return; const v = q.o ? sel : inp.value.trim(); if (v === null || v === "") return toast("先寫下答案喔");
      const r = await POST("/answer", { sid: QZ.sid, i: q.i, v }); done = true;
      if (q.o) m.querySelectorAll(".opt").forEach((x) => { if (x.dataset.v === v) x.classList.add(r.correct ? "ok" : "no"); if (!r.correct && x.dataset.v === String(r.a)) x.classList.add("ok"); });
      if (r.correct) QZ.right++; QZ.gain += r.reward || 0;
      $("#fb").innerHTML = `<div class="fb ${r.correct ? "ok" : "no"}"><b>${r.correct ? "答對了!" : "再想想,沒關係~"}</b> ${r.reward ? `<span class="tag">+${r.reward} ✨${r.rewardKind === "comfort" ? "(安慰獎)" : ""}</span>` : ""}
      ${r.capped ? `<br><small>今天的結晶已經拿滿囉,明天再來!</small>` : ""}${r.correct ? "" : `<br>答案是 <b>${tx(r.a)}</b>。${tx(r.h || "")}${r.diag ? `<br><b>${tx(r.diag)}</b>` : ""}${r.himg ? `<img class="qimg" src="${esc(imgUrl(r.himg))}" alt="">` : ""}`}</div>
      <p><button class="btn" data-act="next">${QZ.i + 1 < n ? "下一題 ▶" : "看結果"}</button></p>`;
      okb.hidden = true; await refreshMe();
      if (r.levelUp) toast(`升級了!現在是 Lv ${r.lv ?? ME.wallet.lv} 🎉`);
      if (r.coll) toast("收進圖鑑一隻守護獸!");
      await announce(r.unlocked);
    },
    next: () => { QZ.i++; route(); },
  });
};

/* ---------- 任務 ---------- */
VIEWS.quests = async () => {
  const m = chrome("/quests"); const [r, w] = await Promise.all([GET("/quests"), W ? W : GET("/world")]); W = w;
  const mapName = (id) => { const x = w.maps.find((k) => k.id === id); return x && x.unlocked ? x.name : ""; };
  const list = r.quests.filter((x) => x.status !== "done"), done = r.quests.filter((x) => x.status === "done");
  const card = (x) => `<div class="card"><div class="row sp"><div><span class="tag ${x.main ? "main" : ""}">${x.main ? "主線 第" + x.act + "幕" : "支線"}</span> <b>${esc(x.title)}</b></div>${mapName(x.map) ? `<small class="muted">📍${esc(mapName(x.map))}</small>` : ""}</div>
    <p class="muted" style="margin:.4em 0">${esc(x.text)}</p><div class="row sp">${x.status === "active" ? `<small>進度 ${x.progress.have} / ${x.progress.need}</small>` : "<span></span>"}
    ${x.status === "available" ? `<button class="btn sm" data-act="acc" data-id="${x.id}">接任務</button>` : x.status === "active" ? `<button class="btn green sm" data-act="clm" data-id="${x.id}" ${x.claimable ? "" : "disabled"}>領獎勵</button>` : `<small>✅ 完成</small>`}</div></div>`;
  m.innerHTML = `<h2>任務板</h2>${list.map(card).join("") || `<p class="muted">目前沒有任務,去城鎮逛逛吧!</p>`}${done.length ? `<details><summary class="muted">已完成 ${done.length} 個</summary>${done.map(card).join("")}</details>` : ""}`;
  bind(m, {
    acc: async (b) => { const r2 = await POST("/quest/accept", { id: b.dataset.id }); toast("開始任務!"); await announce(r2.unlocked); route(); },
    clm: async (b) => { const r2 = await POST("/quest/claim", { id: b.dataset.id }); const c = (r2.rewards || []).filter((x) => x.crystal).reduce((s, x) => s + x.crystal, 0); toast("任務完成!" + (c ? ` +${c} ✨` : "")); await refreshMe(); if (r2.levelUp) toast("升級了!🎉"); await announce(r2.unlocked); route(); },
  });
};

/* ---------- 農場 ---------- */
const STAGE = ["🌱", "🌿", "🌾", "🎉"];
VIEWS.farm = async () => {
  const m = chrome("/town"); const draw = async () => {
    const r = await GET("/farm");
    m.innerHTML = `<a href="#/town" class="muted">← 回城鎮</a><div class="row sp"><h2>🌾 農場</h2><span class="tag">💧 露水 ${r.dew}</span></div><p class="muted sm">作物沒澆水只是長得慢,不會枯死。</p>
    <div class="grid">${r.slots.map((s) => s.crop ? `<div class="card slot"><span class="emo">${s.ready ? icon(s.crop, STAGE[3]) : STAGE[s.stage]}</span><b>${esc(s.name)}</b><br><small class="muted">${s.ready ? "可以收成了!" : s.needsWater ? `需要澆水 ${s.waters}/${s.need}` : `還要約 ${s.minutesLeft} 分鐘`}</small>
      <div style="margin-top:8px">${s.ready ? `<button class="btn green sm" data-act="hv" data-s="${s.slot}">收成</button>` : s.needsWater ? `<button class="btn sm" data-act="wt" data-s="${s.slot}" ${r.dew ? "" : "disabled"}>💧澆水</button>` : `<small class="muted">長大中…</small>`}</div></div>`
      : `<div class="card slot"><span class="emo muted">🟫</span><small class="muted">空地</small><div style="margin-top:8px"><button class="btn alt sm" data-act="pl" data-s="${s.slot}">種植</button></div></div>`).join("")}</div>
    <p class="muted sm">想要更多田地或露水,到商店買。</p><a class="btn alt" href="#/shop">🏪 去商店</a>`;
    bind(m, {
      pl: async (b) => {
        const opts = r.crops.map((c, i) => `<button class="btn alt choice" data-i="${i}" ${c.locked || !c.seeds ? "disabled" : ""}>${icon(c.id, "🌱")} ${esc(c.name)}<small class="muted">　種子 ${c.seeds}${c.locked ? `・Lv ${c.min_lv} 解鎖` : ""}</small></button>`).join("");
        const mo = document.createElement("div"); mo.className = "modal"; mo.innerHTML = `<div><h3>要種什麼?</h3>${opts}<button class="btn alt" data-i="x">取消</button></div>`; document.body.appendChild(mo);
        const pick = await new Promise((res) => { mo.onclick = (e) => { const x = e.target.closest("[data-i]"); if (x) { mo.remove(); res(x.dataset.i); } }; });
        if (pick === "x") return; await POST("/farm/plant", { crop: r.crops[+pick].id, slot: +b.dataset.s }); toast("種下去了!"); await draw();
      },
      wt: async (b) => { await POST("/farm/water", { slot: +b.dataset.s }); toast("💧 澆水完成"); await draw(); },
      hv: async (b) => { const x = await POST("/farm/harvest", { slot: +b.dataset.s }); toast(`收成!${x.got.qty} 個 ${EMO[x.got.item] || ""}`); await draw(); await refreshMe(); await announce(x.unlocked); },
    });
  };
  await draw(); timer = setInterval(() => { if (!document.querySelector(".modal")) draw().catch(() => {}); }, 30000);
};

/* ---------- 牧場 ---------- */
VIEWS.pens = async () => {
  const m = chrome("/town"); const draw = async () => {
    const r = await GET("/pens");
    m.innerHTML = `<a href="#/town" class="muted">← 回城鎮</a><h2>🐑 牧場</h2><p class="muted sm">動物肚子餓只會打哈欠,餵飽牠們就會送你禮物。</p>
    <div class="grid">${r.slots.map((s) => s.animal ? `<div class="card slot"><span class="emo">${icon(s.animal, "🐾")}</span><b>${esc(s.name)}</b><br><small class="muted">${s.ready ? "有禮物可以收!" : s.hungry ? "肚子餓了 🥱" : `還要約 ${s.minutesLeft} 分鐘`}</small>
      <div style="margin-top:8px">${s.ready ? `<button class="btn green sm" data-act="cl" data-s="${s.slot}">收取</button>` : s.hungry ? `<button class="btn sm" data-act="fd" data-s="${s.slot}">餵食</button>` : `<small class="muted">吃飽了 😊</small>`}</div></div>`
      : `<div class="card slot"><span class="emo muted">🛖</span><small class="muted">空的畜欄</small><div style="margin-top:8px"><button class="btn alt sm" data-act="pl" data-s="${s.slot}">放動物</button></div></div>`).join("")}</div>
    <p class="muted sm">動物和飼料都在商店買。</p><a class="btn alt" href="#/shop">🏪 去商店</a>`;
    bind(m, {
      pl: async (b) => {
        const opts = r.animals.map((a, i) => `<button class="btn alt choice" data-i="${i}" ${a.locked || !a.owned ? "disabled" : ""}>${icon(a.id, "🐾")} ${esc(a.name)}<small class="muted">　擁有 ${a.owned}${a.locked ? `・Lv ${a.min_lv} 解鎖` : ""}</small></button>`).join("");
        const mo = document.createElement("div"); mo.className = "modal"; mo.innerHTML = `<div><h3>放哪一隻?</h3>${opts}<button class="btn alt" data-i="x">取消</button></div>`; document.body.appendChild(mo);
        const pick = await new Promise((res) => { mo.onclick = (e) => { const x = e.target.closest("[data-i]"); if (x) { mo.remove(); res(x.dataset.i); } }; });
        if (pick === "x") return; await POST("/pens/place", { animal: r.animals[+pick].id, slot: +b.dataset.s }); toast("牠住進來了!"); await draw();
      },
      fd: async (b) => { await POST("/pens/feed", { slot: +b.dataset.s }); toast("吃得好開心!"); await draw(); },
      cl: async (b) => { const x = await POST("/pens/collect", { slot: +b.dataset.s }); toast(`收到 ${x.got.qty} 個 ${EMO[x.got.item] || ""}`); await draw(); await announce(x.unlocked); },
    });
  };
  await draw(); timer = setInterval(() => { if (!document.querySelector(".modal")) draw().catch(() => {}); }, 30000);
};

/* ---------- 商店 ---------- */
let SHOPCAT = "seed";
VIEWS.shop = async () => {
  const m = chrome("/town"); const draw = async () => {
    const r = await GET("/shop"), cats = [...new Set(r.items.map((i) => i.cat))].sort((a, b) => Object.keys(CATS).indexOf(a) - Object.keys(CATS).indexOf(b));
    if (!cats.includes(SHOPCAT)) SHOPCAT = cats[0];
    m.innerHTML = `<a href="#/town" class="muted">← 回城鎮</a><div class="row sp"><h2>🏪 叮噹百寶屋</h2><span class="tag">Lv ${r.lv}</span></div>
    <div class="seg pick">${cats.map((c) => `<button class="${c === SHOPCAT ? "on" : ""}" data-act="cat" data-c="${c}">${CATS[c] || c}</button>`).join("")}</div>
    <div class="grid">${r.items.filter((i) => i.cat === SHOPCAT).map((i) => `<div class="card slot ${i.locked ? "lock" : ""}"><span class="emo">${icon(i.id, EMO[i.id] || "🎁")}</span><b>${esc(i.name)}</b><br>
      <small class="muted">${i.free ? "免費" : "✨ " + i.price}${i.maxOwn < 99 ? `・${i.owned}/${i.maxOwn}` : i.owned ? `・已有 ${i.owned}` : ""}</small>
      <div style="margin-top:8px">${i.locked ? `<small class="muted">Lv ${i.minLv} 解鎖</small>` : i.free ? `<small class="muted">一開始就有</small>` : i.owned >= i.maxOwn ? `<small>✅ 已擁有</small>` : `<button class="btn sm" data-act="buy" data-id="${i.id}" data-p="${i.price}" ${r.bal < i.price ? 'data-poor="1"' : ""}>購買</button>${i.maxOwn > 1 ? ` <button class="btn alt sm" data-act="buy" data-id="${i.id}" data-n="5" data-p="${i.price * 5}">×5</button>` : ""}`}</div></div>`).join("")}</div>`;
    bind(m, {
      cat: (b) => { SHOPCAT = b.dataset.c; draw(); },
      buy: async (b) => { if (ME.user.expired) return toast(ERR.expired); const n = +(b.dataset.n || 1); const x = await POST("/buy", { item: b.dataset.id, qty: n }); toast("買好了!"); await refreshMe(); await draw(); },
    });
  };
  await draw();
};

/* ---------- 背包 ---------- */
VIEWS.bag = async () => {
  const m = chrome("/bag"); const draw = async () => {
    const r = await GET("/bag");
    m.innerHTML = `<h2>🎒 背包</h2>${r.items.length ? `<div class="grid">${r.items.map((i) => `<div class="card slot"><span class="emo">${icon(i.id, EMO[i.id] || "🎁")}</span><b>${esc(i.name)}</b><br><small class="muted">× ${i.qty}</small>${i.sell > 0 ? `<div style="margin-top:8px"><button class="btn alt sm" data-act="sell" data-id="${i.id}" data-n="1">賣1個 ✨${i.sell}</button>${i.qty > 1 ? ` <button class="btn alt sm" data-act="sell" data-id="${i.id}" data-n="${i.qty}">全賣</button>` : ""}</div>` : ""}</div>`).join("")}</div>` : `<p class="muted">背包是空的。去商店逛逛,或到農場收成吧!</p>`}`;
    bind(m, { sell: async (b) => { const x = await POST("/sell", { item: b.dataset.id, qty: +b.dataset.n }); toast(`賣出!+${x.got} ✨`); await refreshMe(); await announce(x.unlocked); await draw(); } });
  };
  await draw();
};

/* ---------- 圖鑑・成就・影片 ---------- */
let BOOKTAB = "coll";
VIEWS.book = async () => {
  const m = chrome("/book"); const draw = async () => {
    const head = `<div class="seg pick">${[["coll", "守護獸"], ["ach", "成就"], ["vid", "回憶影片"]].map(([k, n]) => `<button class="${BOOKTAB === k ? "on" : ""}" data-act="tab" data-k="${k}">${n}</button>`).join("")}</div>`;
    let body = "";
    if (BOOKTAB === "coll") {
      const r = await GET("/collection"), by = {};
      r.chapters.forEach((c) => (by[c.semester] = by[c.semester] || []).push(c));
      body = `<p class="muted">已收集 <b>${r.collected}</b> / ${r.total} 隻・目前有題目的章節 ${r.playable} 個。每章答對 ${ME.config.collAt} 題,守護獸就會加入圖鑑。</p>` +
        Object.keys(by).map((s) => `<details ${by[s].some((c) => c.playable) ? "open" : ""}><summary><b>${semName(s)}</b>　<small class="muted">${by[s].filter((c) => c.collected).length}/${by[s].length}</small></summary><div class="grid" style="margin:8px 0">${by[s].map((c) => `<div class="tile ${c.collected ? "on" : !c.playable ? "off" : ""}"><span class="emo">${c.collected ? icon("coll_" + c.id, "🐾") : c.playable ? "❔" : "🔒"}</span><b>${c.collected ? esc(c.name) : "？？？"}</b><br><small class="muted">${esc(c.title)}<br>${c.playable ? `${Math.min(c.correct, c.need)}/${c.need}` : "題目準備中"}</small></div>`).join("")}</div></details>`).join("");
    } else if (BOOKTAB === "ach") {
      const r = await GET("/achievements");
      body = `<div class="grid">${r.list.map((a) => `<div class="tile ${a.owned ? "on" : "off"}"><span class="emo">${a.owned ? "🏅" : "🔒"}</span><b>${esc(a.name)}</b><br><small class="muted">${esc(a.desc || "")}</small></div>`).join("")}</div>`;
    } else {
      const r = await GET("/videos");
      body = r.list.length ? r.list.map((v) => `<div class="card row sp"><div><b>🎬 ${esc(v.title)}</b><br><small class="muted">${esc(v.desc || "")}</small></div><button class="btn sm" data-act="pv" data-id="${v.id}">播放</button></div>`).join("") : `<p class="muted">解鎖的影片會收在這裡。</p>`;
      VIDS = r.list;
    }
    m.innerHTML = `<h2>📖 圖鑑</h2>${head}${body}`;
    bind(m, { tab: (b) => { BOOKTAB = b.dataset.k; draw(); }, pv: (b) => playVideo(VIDS.find((v) => v.id === b.dataset.id)) });
  };
  await draw();
};
let VIDS = [];

/* ---------- 換造型・建立角色 ---------- */
VIEWS.wardrobe = async ([mode]) => {
  const isNew = mode === "new"; const m = chrome(isNew ? "" : "/town");
  const shop = await GET("/shop"), cfg = ME.config, SL = cfg.slots, cur = ME.player;
  const sel = { a: cur ? cur.nickA : 0, b: cur ? cur.nickB : 0, look: { ...(cur ? cur.look : {}) } };
  const opts = (slot) => shop.items.filter((i) => i.cat === slot && (i.free || i.owned));
  if (isNew) { for (const s of SL) { const o = opts(s)[0]; if (s !== "acc" && o && !sel.look[s]) sel.look[s] = o.id; } }
  const draw = () => {
    m.innerHTML = `<h2>${isNew ? "捏出你的角色" : "換造型"}</h2>${isNew ? `<p class="muted">不分男生女生,選你喜歡的就好。之後還能在商店買更多造型。</p>` : ""}
    <div class="card" style="text-align:center"><div class="big">🧒</div><h3>${esc(cfg.nickA[sel.a] + cfg.nickB[sel.b])}</h3></div>
    <div class="card"><b>暱稱 前半</b><div class="pick" style="margin:6px 0">${cfg.nickA.map((n, i) => `<button class="${i === sel.a ? "on" : ""}" data-act="na" data-i="${i}">${esc(n)}</button>`).join("")}</div>
    <b>暱稱 後半</b><div class="pick" style="margin:6px 0">${cfg.nickB.map((n, i) => `<button class="${i === sel.b ? "on" : ""}" data-act="nb" data-i="${i}">${esc(n)}</button>`).join("")}</div></div>
    ${SL.map((s) => `<div class="card"><b>${CATS[s]}</b><div class="pick" style="margin-top:6px">${s === "acc" ? `<button class="${!sel.look.acc ? "on" : ""}" data-act="lk" data-s="acc" data-id="">不戴</button>` : ""}${opts(s).map((o) => `<button class="${sel.look[s] === o.id ? "on" : ""}" data-act="lk" data-s="${s}" data-id="${o.id}">${esc(o.name)}</button>`).join("")}</div></div>`).join("")}
    <p><button class="btn green" data-act="save">${isNew ? "開始冒險!" : "儲存"}</button></p>`;
  };
  draw();
  bind(m, {
    na: (b) => { sel.a = +b.dataset.i; draw(); }, nb: (b) => { sel.b = +b.dataset.i; draw(); },
    lk: (b) => { if (b.dataset.id) sel.look[b.dataset.s] = b.dataset.id; else delete sel.look[b.dataset.s]; draw(); },
    save: async () => { const r = await POST("/character", { nickA: sel.a, nickB: sel.b, look: sel.look }); ME.player = r.player; toast("儲存好了!"); go("/town"); },
  });
};

/* ---------- 老師 ---------- */
let TTAB = "cov";
VIEWS.teacher = async () => {
  if (ME.user.role !== "teacher") return go("/town");
  const m = chrome("/teacher"); const draw = async () => {
    const head = `<div class="seg pick">${[["cov", "題庫覆蓋"], ["prog", "班級進度"], ["stu", "學生總覽"]].map(([k, n]) => `<button class="${TTAB === k ? "on" : ""}" data-act="tab" data-k="${k}">${n}</button>`).join("")}</div>`;
    let body = "";
    if (TTAB === "cov") {
      const r = await GET("/admin/coverage"), s = r.summary, lab = { none: "❌ 沒題", few: "⚠️ 太少", ok: "✅" };
      body = `<p>共 ${s.chapters} 章:有題 ${s.ok} ・太少(<5) ${s.few} ・沒題 ${s.none}。題庫共 ${s.bankQuestions} 題。</p><div class="tbl"><table><tr><th>章</th><th>名稱</th><th>題庫</th><th>產生器</th><th>碰過人數</th><th></th></tr>${r.chapters.map((c) => `<tr><td>${esc(c.id)}</td><td>${esc(c.title)}</td><td>${c.bank}</td><td>${c.gens}</td><td>${c.students}</td><td>${lab[c.status]}</td></tr>`).join("")}</table></div>`;
    } else if (TTAB === "prog") {
      body = `<div class="card"><p class="muted">設定某班教到哪一學期,學生練習只會出到這個學期(含)之前。沒設定的班級,出題範圍是該年級的下學期。</p>
      <p><input id="cls" placeholder="班級,例如 601"></p><p><select id="sem">${["1u", "1d", "2u", "2d", "3u", "3d", "4u", "4d", "5u", "5d", "6u", "6d"].map((s) => `<option value="${s}">${semName(s)}</option>`).join("")}</select></p><button class="btn" data-act="setp">儲存</button></div>`;
    } else {
      const r = await GET("/admin/overview");
      body = `<div class="tbl"><table><tr><th>班</th><th>號</th><th>姓名</th><th>結晶</th><th>累計</th><th>答題</th><th>答對</th><th>章數</th></tr>${r.students.map((x) => `<tr><td>${esc(x.cls)}</td><td>${x.no}</td><td>${esc(x.name)}</td><td>${x.bal}</td><td>${x.earned}</td><td>${x.answered}</td><td>${x.correct}</td><td>${x.chapters}</td></tr>`).join("")}</table></div>`;
    }
    m.innerHTML = `<h2>老師</h2>${head}${body}`;
    bind(m, { tab: (b) => { TTAB = b.dataset.k; draw(); }, setp: async () => { await POST("/admin/progress", { cls: $("#cls").value.trim(), semester: $("#sem").value }); toast("已儲存"); } });
  };
  await draw();
};

/* ---------- 啟動 ---------- */
(async function main() {
  try { auth = await initAuth(); } catch { $("#app").innerHTML = `<div class="hero"><p class="err">連不上登入服務,請檢查網路後重新整理。</p></div>`; return; }
  auth.onChange((u) => { if (u) boot(); else { ME = null; loginView(window.__authErr ? authMsg(window.__authErr) : ""); } });
})();
