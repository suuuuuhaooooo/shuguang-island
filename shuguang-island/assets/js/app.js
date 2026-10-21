/* 數光島前端。所有判斷（答案、獎勵、解鎖、對戰勝負）都在伺服器，這裡只負責顯示與送出動作。 */
import { esc, tx } from "./tx.js";
import { Zhuyin } from "./zhuyin.js";
import { Settings, Snd } from "./audio.js";
import { art, initArt, pic, uiIcon } from "./art.js";
import { cpuSay } from "./cpu-lines.js";

const CFG = window.SI_CONFIG || {};
const DOMS = [["數與量", "🔢", "d0"], ["圖形與空間", "🔷", "d1"], ["測量", "📏", "d2"], ["統計與規律", "📊", "d3"], ["解題與關係", "🧩", "d4"]];
const MAPEMO = { town: "🏘️", shop: "🏪", farm: "🌾", pen: "🐑", work: "⚙️", tower: "🗼", nature: "🌲", sea: "🌊", other: "✨" };
const CATS = { body: "體型", hair: "髮型", outfit: "服裝", acc: "配件", seed: "種子", feed: "飼料", animal: "動物", tool: "工具", deco: "裝飾" };
const EMO = { carrot: "🥕", tomato: "🍅", wheat: "🌾", egg: "🥚", wool: "☁️", dew: "💧", star_flower: "🌸", seed_carrot: "🥕", seed_tomato: "🍅", seed_wheat: "🌾", seed_star: "🌸", feed_hay: "🌿", feed_grain: "🌾", animal_sheep: "🐑", animal_chicken: "🐥", plot_ext: "🟫", pen_ext: "🛖", crop_carrot: "🥕", crop_tomato: "🍅", crop_wheat: "🌾", crop_star: "🌸", an_sheep: "🐑", an_chicken: "🐥" };
const NUM = ["", "一", "二", "三", "四", "五", "六"];
const semName = (s) => NUM[+s[0]] + (s[1] === "u" ? "上" : "下");
const CPUN = ["", "見習夥伴", "進階夥伴", "達人夥伴"], CPUE = ["", "🐣", "🦊", "🐲"];
const ERR = {
  net: "連不上伺服器,請檢查網路後再試一次。", server: "伺服器忙碌中,請稍後再試。", bad_token: "登入已失效,請重新登入。", no_token: "請先登入。",
  not_in_roster: "這個帳號不在班級名單裡,請找老師。", expired: "你的使用期限到了,現在只能看,不能玩。請找老師。", forbidden: "這裡只有老師可以使用。",
  not_enough: "結晶不夠喔,再答幾題吧!", not_enough_item: "東西不夠。", limit: "已經擁有最多囉。", locked: "還沒解鎖,等級再高一點就可以了。", bad_request: "送出的資料不對,再試一次。",
  already_done: "這件事已經做過了。", occupied: "這裡已經有東西了。", not_ready: "還沒準備好,再等一下。", no_need: "不需要澆水了。", already_fed: "牠已經吃飽了。",
  empty_slot: "這裡是空的。", not_done: "任務目標還沒完成。", not_active: "這個任務還沒開始。", not_available: "這個任務還沒出現。", map_locked: "這個地點還沒開放。",
  no_questions: "這個領域的題目還在準備中,先比別的吧!", no_session: "這份練習找不到了,請重新開始。", session_expired: "練習放太久了,請重新開始。", no_curriculum: "老師還沒設定好章節。",
  bad_content: "內容格式有誤。", not_sellable: "這個不能賣。", bad_level: "沒有這個等級的夥伴。", no_duel: "找不到這場對戰。", bad_round: "回合已經過了。", not_open: "回合還沒開始,再等一下。",
  no_room: "找不到這個房間,或對戰已經開始了。", own_room: "這是你自己開的房間喔。", other_class: "只能和同班同學對戰。", room_full: "這個房間已經滿了。", bad_domain: "領域選擇有誤。"
};
const errMsg = (e) => ERR[e && e.code] || ("出了點問題(" + ((e && e.code) || "?") + ")");

/* ---------- 小工具 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const imgUrl = (p) => { const m = /^d:([0-9a-f]{16})$/.exec(p || ""); return m ? (ME && ME.config.imgBase || "") + "/api/img/" + m[1] : ""; };
const emoOf = (id, fb) => EMO[id] || fb || "🎁";
const itemPic = (id, fb, cls) => pic(id, emoOf(id, fb), cls);
function toast(msg) { const d = document.createElement("div"); d.className = "toast"; d.textContent = msg; $("#toasts").appendChild(d); setTimeout(() => d.remove(), 2800); }
function modal(html, btns = ["好"]) {
  return new Promise((res) => {
    Snd.sfx("open");
    const m = document.createElement("div"); m.className = "modal"; m.innerHTML = `<div>${html}<div class="row" style="justify-content:center;margin-top:14px">${btns.map((b, i) => `<button class="btn ${i ? "alt" : ""}" data-i="${i}">${esc(b)}</button>`).join("")}</div></div>`;
    m.onclick = (e) => { const b = e.target.closest("[data-i]"); if (b) { m.remove(); res(+b.dataset.i); } };
    document.body.appendChild(m);
  });
}
const footHtml = () => `<footer class="foot"><a rel="license noopener" href="https://creativecommons.org/licenses/by-nc-nd/4.0/deed.zh-hant" target="_blank"><img alt="創用 CC 姓名標示-非商業性-禁止改作" width="88" height="31" src="https://mirrors.creativecommons.org/presskit/buttons/88x31/svg/by-nc-nd.svg"></a><p>© ${new Date().getFullYear()} suuuuuhaooooo　本站圖文、音樂與題目依 CC BY-NC-ND 4.0 授權</p><p><a href="about.html">版權・隱私・字體授權</a></p></footer>`;
/* 角色:身體、頭髮、服裝、配件疊起來。沒有圖就用表情符號 */
const avatar = (look, cls = "") => {
  const layers = art.on && look ? ["body", "hair", "outfit", "acc"].filter((s) => look[s]).map((s) => `<img class="art" src="assets/art/${esc(look[s])}.webp" alt="" draggable="false" onload="this.closest('.av').classList.add('has')" onerror="this.remove()">`).join("") : "";
  return `<div class="av ${cls}"><span class="avfb">🧒</span><div class="avs">${layers}</div></div>`;
};

/* ---------- 設定 ---------- */
function applySettings() {
  const b = document.body, S = Settings.all();
  b.classList.toggle("fs-s", S.fs === "s"); b.classList.toggle("fs-l", S.fs === "l");
  b.classList.toggle("cur-on", !!S.cursor); b.classList.toggle("no-motion", !S.motion);
  const zy = !!ME && (S.zy === "on" || (S.zy === "auto" && ME.user.tier === "low"));
  b.classList.toggle("zymode", zy);
  if (zy) Zhuyin.enable().then((ok) => { if (!ok && !applySettings.warned) { applySettings.warned = 1; toast("注音暫時無法顯示(網路問題)"); } }); else Zhuyin.disable();
}
Settings.on(() => applySettings());
async function settingsModal() {
  const S = () => Settings.all(), seg = (k, opts) => `<div class="pick">${opts.map(([v, n]) => `<button class="${S()[k] === v ? "on" : ""}" data-set="${k}" data-v="${v}">${n}</button>`).join("")}</div>`;
  const m = document.createElement("div"); m.className = "modal";
  const draw = () => {
    m.innerHTML = `<div><h3>⚙️ 設定</h3>
    <div class="set"><span>背景音樂</span>${seg("bgm", [[true, "開"], [false, "關"]])}</div>
    <div class="set"><span>音量</span><input type="range" min="0" max="1" step="0.1" value="${S().bgmVol}" data-rng="bgmVol" aria-label="音樂音量" style="width:140px"></div>
    <div class="set"><span>音效</span>${seg("sfx", [[true, "開"], [false, "關"]])}</div>
    <div class="set"><span>音量</span><input type="range" min="0" max="1" step="0.1" value="${S().sfxVol}" data-rng="sfxVol" aria-label="音效音量" style="width:140px"></div>
    <div class="set"><span>注音</span>${seg("zy", [["auto", "自動"], ["on", "開"], ["off", "關"]])}</div>
    <div class="set"><span>字體大小</span>${seg("fs", [["s", "小"], ["m", "中"], ["l", "大"]])}</div>
    <div class="set"><span>特效游標</span>${seg("cursor", [[true, "開"], [false, "關"]])}</div>
    <div class="set"><span>動畫</span>${seg("motion", [[true, "開"], [false, "關"]])}</div>
    <p class="muted sm">注音「自動」:低年級自動顯示。音樂與設定只存在這台裝置。</p>
    <div class="row" style="justify-content:center;margin-top:10px"><button class="btn alt sm" data-x="ward">🧒 換造型</button><button class="btn alt sm" data-x="out">登出</button><button class="btn" data-x="ok">完成</button></div></div>`;
  };
  draw(); document.body.appendChild(m); Snd.sfx("open");
  m.onclick = (e) => {
    const b = e.target.closest("[data-set]"), x = e.target.closest("[data-x]");
    if (b) { const v = b.dataset.v; Settings.set(b.dataset.set, v === "true" ? true : v === "false" ? false : v); draw(); Snd.sfx("click"); }
    if (x) { m.remove(); if (x.dataset.x === "ward") go("/wardrobe"); if (x.dataset.x === "out") auth.signOut(); }
  };
  m.oninput = (e) => { const r = e.target.closest("[data-rng]"); if (r) Settings.set(r.dataset.rng, +r.value); };
}

/* ---------- 登入 ---------- */
let auth = null, ME = null, W = null, QZ = null, mainEl = null, leave = [];
const onLeave = (f) => leave.push(f);
async function initAuth() {
  if (window.SI_TEST_TOKEN) return { token: async () => window.SI_TEST_TOKEN, onChange: (cb) => cb(true), signIn() {}, signOut() { location.reload(); } };
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
  document.body.classList.add("login"); document.body.classList.remove("tier-low", "tier-mid", "tier-high"); Snd.stop();
  $("#app").innerHTML = `<div class="hero">${art.has.has("logo") ? `<img class="logo art" src="assets/art/logo.webp" alt="數光島">` : `<div class="big-ic logo">🏝️</div><h1 class="ttl">數光島</h1>`}
  <p class="muted" style="color:#24506e;font-weight:700">答對數學題,收集數光結晶,<br>種田、養動物、和夥伴對戰,把整座島點亮。</p>
  ${msg ? `<p class="err">${esc(msg)}</p>` : ""}<p><button class="btn blue" id="go" style="font-size:1.2rem;padding:8px 30px">用 Google 登入</button></p><p class="sm" style="color:#24506e">請用老師登記的 Google 帳號登入。</p></div>${footHtml()}`;
  $("#go").onclick = async (e) => { e.target.disabled = true; try { await auth.signIn(); } catch (err) { loginView(authMsg(err && err.code)); } };
}
const authMsg = (c) => ({ "auth/popup-closed-by-user": "登入視窗被關掉了,再按一次。", "auth/network-request-failed": "網路不穩,連不上 Google,請稍後再試。", "auth/unauthorized-domain": "這個網址還沒加進 Firebase 授權網域,請老師設定。" }[c] || "登入沒有成功(" + (c || "?") + "),再試一次。");

async function boot() {
  try { ME = await GET("/me"); }
  catch (e) { loginErr(e); return; }
  document.body.classList.remove("login"); document.body.classList.add("tier-" + ME.user.tier); applySettings(); startIdle();
  if (!ME.player && ME.user.role !== "teacher") { go("/wardrobe/new"); } else if (!location.hash || location.hash === "#/") go("/town");
  route();
}
function loginErr(e) {
  $("#app").innerHTML = `<div class="hero"><div class="big-ic">🔒</div><p class="err">${esc(errMsg(e))}</p><p><button class="btn alt" id="so">換個帳號登入</button> <button class="btn" id="rt">重試</button></p></div>${footHtml()}`;
  $("#so").onclick = () => auth.signOut(); $("#rt").onclick = () => boot();
}

/* 閒置 20 分鐘自動登出(對戰中不登出) */
let idleT = 0, idleBox = null, lastAct = Date.now();
function startIdle() {
  if (startIdle.on) return; startIdle.on = true;
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach((e) => addEventListener(e, () => { lastAct = Date.now(); if (idleBox) { idleBox.remove(); idleBox = null; } }, { passive: true }));
  setInterval(() => {
    if (!ME) return; if (/^#\/battle/.test(location.hash)) { lastAct = Date.now(); return; }
    const LIM = (CFG.idleMinutes || 20) * 60e3, idle = Date.now() - lastAct;
    if (idle >= LIM) { ME = null; auth.signOut(); }
    else if (idle >= LIM - 60e3) { if (!idleBox) { idleBox = document.createElement("div"); idleBox.className = "idle"; document.body.appendChild(idleBox); } idleBox.innerHTML = `閒置太久,${Math.ceil((LIM - idle) / 1000)} 秒後自動登出　<button class="btn sm" id="stay">繼續使用</button>`; $("#stay").onclick = () => { lastAct = Date.now(); idleBox.remove(); idleBox = null; }; }
  }, 1000);
}

/* ---------- 外框與路由 ---------- */
const go = (p) => { location.hash = "#" + p; };
const TABS = [["/town", "🗺️", "地圖", "ic_home"], ["/practice", "✏️", "練習", "ic_practice"], ["/duel", "⚔️", "對戰", "ic_duel"], ["/quests", "📜", "任務", "ic_quest"], ["/bag", "🎒", "背包", "ic_bag"], ["/book", "📖", "圖鑑", "ic_book"]];
const lvBar = () => { const w = ME.wallet, st = ME.config.levelStep, base = (w.lv - 1) * st; return Math.max(0, Math.min(100, ((w.earned - base) / st) * 100)); };
function chrome(active) {
  const w = ME.wallet, p = ME.player;
  $("#app").innerHTML = `<header class="top"><div class="who">${avatar(p && p.look)}<div class="nm">${esc(p ? p.nick : ME.user.name)}<small>${esc(ME.user.name)}・Lv ${w.lv}</small></div>
    <div class="pill" title="數光結晶">${uiIcon("ic_crystal", "💎")}<span class="gem">${w.bal}</span></div><button class="round" id="menu" aria-label="設定">${uiIcon("ic_settings", "⚙️")}</button></div><div class="bar"><i style="width:${lvBar()}%"></i></div></header>
    ${ME.user.expired ? `<div class="card err">你的使用期限到了,現在只能看,不能玩。</div>` : ""}<main id="main"></main>${footHtml()}
    <nav class="dock">${TABS.concat(ME.user.role === "teacher" ? [["/teacher", "🧑‍🏫", "老師", "ic_teacher"]] : []).map(([h, e, n, ic]) => `<a href="#${h}" class="${active === h ? "on" : ""}"><b>${uiIcon(ic, e)}</b>${n}</a>`).join("")}</nav>`;
  $("#menu").onclick = settingsModal;
  mainEl = $("#main"); return mainEl;
}
async function refreshMe() { ME = Object.assign(ME, await GET("/me")); if ($(".top")) { const w = ME.wallet; $(".gem").textContent = w.bal; $(".bar i").style.width = lvBar() + "%"; $(".nm small").textContent = ME.user.name + "・Lv " + w.lv; } }
const VIEWS = {};
const SCENE = { quiz: "quiz", battle: "battle" };
async function route() {
  if (!ME) return;
  leave.forEach((f) => { try { f(); } catch {} }); leave = [];
  const parts = (location.hash.slice(1) || "/town").split("/").filter(Boolean), name = parts[0] || "town", args = parts.slice(1).map(decodeURIComponent);
  Snd.bgm(SCENE[name] || "town");
  const v = VIEWS[name] || VIEWS.town;
  try { await v(args); } catch (e) { const m = mainEl && document.body.contains(mainEl) ? mainEl : chrome("/" + name); m.innerHTML = `<div class="card"><p class="err">${esc(errMsg(e))}</p><button class="btn" id="rt">重試</button> <a class="btn alt" href="#/town">回地圖</a></div>`; $("#rt").onclick = route; }
}
window.addEventListener("hashchange", route);
const lock = async (btn, fn) => { if (btn) btn.disabled = true; try { return await fn(); } catch (e) { Snd.sfx("no"); toast(errMsg(e)); } finally { if (btn) btn.disabled = false; } };
function bind(root, acts) { root.onclick = (e) => { const b = e.target.closest("[data-act]"); if (b && acts[b.dataset.act]) lock(b, () => acts[b.dataset.act](b)); }; }
document.addEventListener("click", (e) => { if (e.target.closest(".btn,.opt,.dock a,.pin,.dom,.pick button,.round")) Snd.sfx("click"); });

/* 解鎖通知:新地點、成就、影片、新任務 */
async function announce(u) {
  if (!u) return;
  for (const m of u.maps || []) { Snd.sfx("levelup"); toast("🗺️ 發現新地點:" + m.name); }
  for (const a of u.ach || []) { Snd.sfx("levelup"); await modal(`<div class="big-ic">🏅</div><h3>獲得成就</h3><p><b>${esc(a.name)}</b><br><span class="muted">${esc(a.desc || "")}</span></p>`); }
  for (const v of u.videos || []) { const i = await modal(`<div class="big-ic">🎬</div><h3>解鎖新影片</h3><p>${esc(v.title)}</p>`, ["看影片", "之後再看"]); if (i === 0) await playVideo(v); }
  if ((u.quests || []).length) toast("有新任務囉!");
}
async function playVideo(v) {
  await modal(v.yt ? `<h3>${esc(v.title)}</h3><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.yt)}?rel=0" allowfullscreen allow="autoplay; encrypted-media"></iframe>`
    : `<div class="big-ic">🎬</div><h3>${esc(v.title)}</h3><p class="muted">影片製作中,敬請期待!</p>`, ["關閉"]);
}
const back = (to = "/town", n = "回地圖") => `<p><a href="#${to}" class="btn sm alt">← ${n}</a></p>`;

/* ---------- 世界地圖 ---------- */
const SCENIC = `<svg class="bg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd6ff"/><stop offset="1" stop-color="#2f8fe0"/></linearGradient>
<radialGradient id="grass" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#b8ef7a"/><stop offset="1" stop-color="#5fc24a"/></radialGradient></defs>
<rect width="400" height="400" fill="url(#sea)"/>
<g fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"><path d="M20 40q15-10 30 0t30 0"/><path d="M300 70q15-10 30 0t30 0"/><path d="M40 350q15-10 30 0t30 0"/><path d="M290 340q15-10 30 0t30 0"/><path d="M330 200q12-8 24 0t24 0"/></g>
<path d="M200 28c70-6 128 36 150 96 22 58 6 120-44 160-52 42-132 56-190 22C60 274 40 214 56 156 72 96 126 34 200 28z" fill="#f6dc9a" stroke="#d9b45e" stroke-width="5"/>
<path d="M200 44c62-4 112 32 130 86 18 52 4 108-38 142-46 38-118 50-168 20-44-26-62-80-48-130 14-52 62-114 124-118z" fill="url(#grass)"/>
<path d="M120 250q40-30 70-10t80-20" fill="none" stroke="#8fd6ff" stroke-width="10" stroke-linecap="round" opacity=".9"/>
<g fill="#3d9a3a"><circle cx="110" cy="130" r="14"/><circle cx="130" cy="120" r="12"/><circle cx="290" cy="170" r="13"/><circle cx="310" cy="190" r="11"/><circle cx="250" cy="300" r="12"/><circle cx="150" cy="300" r="13"/></g>
<path d="M205 90l30 50 30-50-30-30z" fill="#c9b79a" stroke="#8d7a5c" stroke-width="3"/><path d="M185 140l28-44 26 44z" fill="#b6a688" stroke="#8d7a5c" stroke-width="3"/>
<g fill="#fff" opacity=".9"><ellipse cx="70" cy="60" rx="30" ry="12"/><ellipse cx="96" cy="52" rx="22" ry="10"/><ellipse cx="320" cy="40" rx="32" ry="12"/><ellipse cx="346" cy="48" rx="20" ry="9"/></g></svg>`;
const fallbackXY = (i, n) => { const a = (i / n) * Math.PI * 2 - 1.2; return [50 + 30 * Math.cos(a), 50 + 30 * Math.sin(a)]; };

VIEWS.town = async () => {
  const m = chrome("/town"); m.innerHTML = `<p class="muted">載入中…</p>`;
  const [w, q] = await Promise.all([GET("/world"), GET("/quests")]); W = w; await refreshMe();
  const next = q.quests.filter((x) => x.status !== "done").sort((a, b) => (b.main - a.main) || (b.claimable - a.claimable))[0];
  m.innerHTML = `${next ? `<div class="card"><span class="tag ${next.main ? "main" : ""}">${next.main ? "主線" : "任務"}</span> <b>${tx(next.title)}</b><br><span class="muted">${tx(next.text)}</span><div class="row sp" style="margin-top:8px"><small>${next.status === "available" ? "可以接任務" : `進度 ${next.progress.have}/${next.progress.need}`}</small><a class="btn sm" href="#/quests">${next.claimable ? "去領獎" : "看任務"}</a></div></div>` : ""}
  <div class="row sp"><h2 class="ttl">數光島</h2><button class="btn blue sm" data-act="ck">📅 今日簽到</button></div>
  <div class="world">${SCENIC}${w.maps.map((x, i) => {
    const [fx, fy] = fallbackXY(i, w.maps.length), px = typeof x.x === "number" ? x.x : fx, py = typeof x.y === "number" ? x.y : fy, n = x.unlocked ? x.quests.available + x.quests.active : 0;
    return x.unlocked
      ? `<a class="pin" style="left:${px}%;top:${py}%" href="#/map/${esc(x.id)}">${n ? `<span class="bang">!</span>` : ""}<span class="dot">${pic("map_" + x.id, MAPEMO[x.kind] || "✨")}</span><span class="lbl">${esc(x.name)}</span></a>`
      : `<a class="pin lock" style="left:${px}%;top:${py}%" href="javascript:void 0" data-act="hint" data-h="${esc(x.hint || "繼續冒險就會開放")}"><span class="dot">${uiIcon("ic_lock", "🔒")}</span><span class="lbl">？？？</span></a>`;
  }).join("")}</div>`;
  bind(m, {
    ck: async () => { const r = await POST("/checkin"); await refreshMe(); if (r.already) toast("今天已經簽到過囉!"); else { Snd.sfx("coin"); toast(`簽到成功!連續 ${r.streak} 天,+${r.reward} 💎`); } await announce(r.unlocked); },
    hint: (b) => toast("🔒 " + b.dataset.h),
  });
  await announce(w.unlocked);
};

VIEWS.map = async ([id]) => {
  const m = chrome("/town"); const w = W = await GET("/world"); const x = w.maps.find((k) => k.id === id);
  if (!x || !x.unlocked) { m.innerHTML = `<div class="card">這個地點還沒開放。</div>${back()}`; return; }
  const acts = { shop: ["🏪 逛商店", "/shop"], farm: ["🌱 去田裡", "/farm"], pen: ["🐑 去畜欄", "/pens"] }[x.kind];
  m.innerHTML = `${back()}<div class="card" style="text-align:center"><span class="emo">${pic("map_" + x.id, MAPEMO[x.kind] || "✨")}</span><h2>${tx(x.name)}</h2><p class="muted">${tx(x.desc || "")}</p>
  ${acts ? `<a class="btn green" href="#${acts[1]}">${acts[0]}</a>` : ""} ${x.domains && x.domains.length ? `<button class="btn" data-act="pr">✏️ 在這裡練習${x.domains.map(esc).join("、")}</button>` : ""}</div>
  <h3>這裡的朋友</h3><div class="grid">${x.npcs.map((n) => `<a class="card slot" style="text-decoration:none;color:inherit" href="#/talk/${esc(n.id)}"><span class="emo">${pic(n.id, "🧑")}</span><b>${tx(n.name)}</b><br><small class="muted">${tx(n.role || "")}</small></a>`).join("") || `<p class="muted">這裡暫時沒有人。</p>`}</div>`;
  bind(m, { pr: () => startQuiz(x.domains) });
};

/* ---------- 對話 ---------- */
VIEWS.talk = async ([npcId]) => {
  const m = chrome("/town");
  const r = await POST("/talk", { npc: npcId });
  const show = async (r) => {
    await refreshMe();
    if (!r.node || (r.end && !r.node.text)) { await announce(r.unlocked); return go("/town"); }
    const n = r.node;
    m.innerHTML = `<div class="card dlg"><div class="npcbox"><div class="av">${pic(r.npc.id, "🧑")}</div><div class="name">${tx(r.npc.name)}</div></div><p class="say">${tx(n.text)}</p>
    ${n.choices.map((c) => `<button class="btn alt choice" data-act="pick" data-i="${c.i}">${tx(c.t)}</button>`).join("")}
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
  m.innerHTML = `<h2 class="ttl">今天想練什麼?</h2><p class="muted" style="color:#24506e;font-weight:700">每答對一題就會得到數光結晶。答錯也沒關係,看看解答再試試。</p>
  <div class="grid">${DOMS.map(([n, e, c]) => `<button class="dom ${c}" data-act="go" data-d="${esc(n)}"><b>${e}</b>${n}</button>`).join("")}<button class="dom" style="border-color:#aaa" data-act="go" data-d="*"><b>🎲</b>隨機</button></div>`;
  bind(m, { go: (b) => startQuiz(b.dataset.d === "*" ? [] : [b.dataset.d]) });
};
async function startQuiz(domains) {
  if (ME.user.expired) return toast(ERR.expired);
  const r = await POST("/quiz/start", { domains: domains || [], count: 5 });
  QZ = { sid: r.sid, qs: r.qs, i: 0, right: 0, gain: 0, fallback: r.fallback, domains }; go("/quiz");
  if (location.hash === "#/quiz") route();
}
const dots = (n, i, st) => `<div class="dots">${Array.from({ length: n }, (_, k) => `<i class="${st[k] || (k === i ? "on" : "")}"></i>`).join("")}</div>`;
VIEWS.quiz = async () => {
  const m = chrome("/practice"); if (!QZ) return go("/practice");
  QZ.st = QZ.st || [];
  const q = QZ.qs[QZ.i], n = QZ.qs.length;
  if (!q) {
    Snd.bgm("win");
    m.innerHTML = `<div class="card result"><div class="big">🎉</div><h2>練習完成!</h2><p>答對 <b>${QZ.right}</b> / ${n} 題<br>這次得到 <b>💎 ${QZ.gain}</b></p><button class="btn" data-act="again">再練一次</button> <a class="btn alt" href="#/town">回地圖</a></div>`;
    const dm = QZ.domains; bind(m, { again: () => startQuiz(dm) }); await refreshMe(); return;
  }
  let sel = null, done = false;
  m.innerHTML = `${QZ.fallback && QZ.i === 0 ? `<div class="card muted">這個領域的題目還在準備中,先練別的~</div>` : ""}${dots(n, QZ.i, QZ.st)}<div class="card"><small class="muted">第 ${QZ.i + 1} / ${n} 題</small>
  <div class="q">${tx(q.q)}</div>${q.img ? `<img class="qimg" alt="附圖" src="${esc(imgUrl(q.img))}">` : ""}
  ${q.o ? `<div class="opts">${q.o.map((o, i) => `<button class="opt" data-act="opt" data-v="${esc(o)}"><b>${"ABCDEFGH"[i]}</b>${tx(o)}</button>`).join("")}</div>`
    : `<input id="ans" ${q.t === "text" ? "" : 'inputmode="decimal"'} autocomplete="off" placeholder="${q.t === "text" ? "寫下答案" : "輸入數字"}">`}
  <p><button class="btn" data-act="ok" id="okb" ${q.o ? "disabled" : ""}>送出答案</button></p><div id="fb"></div></div>`;
  const okb = $("#okb"), inp = $("#ans");
  if (inp) { inp.focus(); inp.onkeydown = (e) => e.key === "Enter" && okb.click(); }
  bind(m, {
    opt: (b) => { if (done) return; sel = b.dataset.v; m.querySelectorAll(".opt").forEach((x) => x.classList.toggle("on", x === b)); okb.disabled = false; },
    ok: async () => {
      if (done) return; const v = q.o ? sel : inp.value.trim(); if (v === null || v === "") return toast("先寫下答案喔");
      const r = await POST("/answer", { sid: QZ.sid, i: q.i, v }); done = true;
      Snd.sfx(r.correct ? "ok" : "no");
      if (q.o) m.querySelectorAll(".opt").forEach((x) => { if (x.dataset.v === v) x.classList.add(r.correct ? "ok" : "no"); if (!r.correct && x.dataset.v === String(r.a)) x.classList.add("ok"); });
      if (r.correct) QZ.right++; QZ.gain += r.reward || 0; QZ.st[QZ.i] = r.correct ? "ok" : "no";
      $("#fb").innerHTML = `<div class="fb ${r.correct ? "ok" : "no"}"><b>${r.correct ? "答對了!" : "再想想,沒關係~"}</b> ${r.reward ? `<span class="tag">+${r.reward} 💎${r.rewardKind === "comfort" ? "(安慰獎)" : ""}</span>` : ""}
      ${r.capped ? `<br><small>今天的結晶已經拿滿囉,明天再來!</small>` : ""}${r.correct ? "" : `<br>答案是 <b>${tx(r.a)}</b>。${tx(r.h || "")}${r.diag ? `<br><b>${tx(r.diag)}</b>` : ""}${r.himg ? `<img class="qimg" src="${esc(imgUrl(r.himg))}" alt="">` : ""}`}</div>
      <p><button class="btn" data-act="next">${QZ.i + 1 < n ? "下一題 ▶" : "看結果"}</button></p>`;
      okb.hidden = true; await refreshMe();
      if (r.levelUp) { Snd.sfx("levelup"); toast(`升級了!現在是 Lv ${r.lv ?? ME.wallet.lv} 🎉`); }
      if (r.coll) toast("收進圖鑑一隻守護獸!");
      await announce(r.unlocked);
    },
    next: () => { QZ.i++; route(); },
  });
};

/* ---------- 對戰 ---------- */
let DSEL = [];
VIEWS.duel = async () => {
  const m = chrome("/duel");
  const act = await GET("/duel/active");
  m.innerHTML = `<h2 class="ttl">⚔️ 數學對戰</h2>
  ${act.duel ? `<div class="card"><b>你有一場對戰還沒結束</b><div class="row" style="margin-top:8px"><a class="btn green" href="#/battle/${esc(act.duel.id)}">回到對戰</a><button class="btn alt sm" data-act="dc" data-id="${esc(act.duel.id)}">放棄這場</button></div></div>` : ""}
  <div class="card"><b>比賽規則</b><ul class="list"><li>每場 5 回合,雙方各 100 血。</li><li>同一題誰答對就能攻擊,<b>答得越快傷害越大</b>。</li><li>時間到沒答,算答錯。贏了有數光結晶,輸了也有安慰獎。</li></ul></div>
  <div class="card"><b>想比哪些領域?</b> <small class="muted">(最多選 2 個,不選就是隨機)</small><div class="pick" style="margin-top:8px">${DOMS.map(([n]) => `<button class="${DSEL.includes(n) ? "on" : ""}" data-act="dt" data-d="${esc(n)}">${n}</button>`).join("")}</div></div>
  <h3>和電腦夥伴比賽</h3><div class="grid">${[1, 2, 3].map((l) => `<div class="card slot"><span class="emo">${pic("cpu_" + l, CPUE[l])}</span><b>${CPUN[l]}</b><div style="margin-top:8px"><button class="btn sm" data-act="cpu" data-l="${l}">挑戰!</button></div></div>`).join("")}</div>
  <h3>和同班同學比賽</h3><div class="card"><p class="muted sm" style="margin-top:0">一個人開房間,把 4 碼代碼告訴同班同學,對方輸入就開打。</p>
  <button class="btn blue" data-act="mk">🏠 開一個房間</button>
  <div class="row" style="margin-top:12px"><input id="rc" maxlength="4" placeholder="輸入 4 碼代碼" style="max-width:190px;text-transform:uppercase" autocomplete="off"><button class="btn green" data-act="jn">加入</button></div></div>`;
  bind(m, {
    dt: (b) => { const d = b.dataset.d; DSEL = DSEL.includes(d) ? DSEL.filter((x) => x !== d) : DSEL.concat(d).slice(-2); route(); },
    cpu: async (b) => { if (ME.user.expired) return toast(ERR.expired); const r = await POST("/duel/cpu", { level: +b.dataset.l, domains: DSEL }); go("/battle/" + r.id); },
    mk: async () => { if (ME.user.expired) return toast(ERR.expired); const r = await POST("/duel/create", { domains: DSEL }); go("/battle/" + r.id); },
    jn: async () => { const c = $("#rc").value.trim().toUpperCase(); if (c.length !== 4) return toast("請輸入 4 碼代碼"); const r = await POST("/duel/join", { code: c }); go("/battle/" + r.id); },
    dc: async (b) => { await POST("/duel/cancel", { id: b.dataset.id }); toast("已放棄"); route(); },
  });
};

VIEWS.battle = async ([id]) => {
  const m = chrome("/duel"); m.innerHTML = `<p class="muted">連線中…</p>`;
  let st = null, sig = "", dead = false, sending = false, lastLog = 0, deadline = 0, startAt = 0, busyF = false;
  onLeave(() => { dead = true; });
  const sigOf = (r) => [r.status, r.round, r.startsIn > 0, r.answered, r.you.hp, r.foe.hp, r.log.length, r.result].join("|");
  const foeAv = (r) => (r.foe.cpu ? `<div class="av">${pic("cpu_" + r.foe.cpu, CPUE[r.foe.cpu])}</div>` : `<div class="av"><span class="avfb">🧒</span></div>`);
  const fighters = (r) => `<div class="fighters"><div class="fighter" id="fy">${avatar(ME.player && ME.player.look)}<b>${esc(r.you.nick)}</b><div class="hp me"><i style="width:${r.you.hp}%"></i></div><small>${r.you.hp} / 100</small></div><div class="vs">VS</div>
    <div class="fighter" id="ff">${foeAv(r)}<b>${esc(r.foe.nick)}</b><div class="hp"><i style="width:${r.foe.hp}%"></i></div><small>${r.foe.hp} / 100</small></div></div>`;
  function render(r) {
    if (r.status === "cancel") { m.innerHTML = `<div class="card"><p>這場對戰已經結束或被取消了。</p><a class="btn" href="#/duel">回對戰大廳</a></div>`; dead = true; return; }
    if (r.status === "wait") {
      m.innerHTML = `<div class="arena"><h3 style="text-align:center;margin:0 0 8px">等同班同學加入…</h3><div class="code">${esc(r.code)}</div><p style="text-align:center">把這 4 碼告訴同班同學,請他到「對戰」頁輸入。<br><small>10 分鐘內有效</small></p><p style="text-align:center"><button class="btn red sm" data-act="cx">取消房間</button></p></div>`;
      bind(m, { cx: async () => { await POST("/duel/cancel", { id }); dead = true; go("/duel"); } }); return;
    }
    if (r.status === "done") { renderDone(r); return; }
    const intermission = r.startsIn > 0, last = r.log[r.log.length - 1];
    let body;
    if (intermission) {
      body = `<div class="qcard" style="text-align:center">${last ? `<div>${last.you ? "✅ 你答對了" : "❌ 你沒答對"}${last.youDmg ? `,對手 -${last.youDmg}` : ""}　${last.foe ? "對手答對了" : "對手沒答對"}${last.foeDmg ? `,你 -${last.foeDmg}` : ""}<br><small class="muted">上一題答案:${tx(last.a)}</small></div>` : ""}
      ${r.foe.cpu ? `<div class="bannerx" style="color:#fff">💬 ${esc(r.foe.nick)}:${esc(last ? cpuSay(r.foe.cpu, last.foe ? "right" : "wrong", r.round) : cpuSay(r.foe.cpu, "open", ME.wallet.earned))}</div>` : ""}<h3 style="margin:.6em 0 0">第 ${r.round + 1} 回合 <span class="hl">準備!</span></h3><div class="big" id="cd">${Math.ceil(r.startsIn / 1000)}</div></div>`;
    } else if (r.answered) {
      body = `<div class="qcard" style="text-align:center"><h3>已送出!</h3><p class="muted" id="foeS">${r.foeAnswered ? "對手也答好了,結算中…" : "等對手作答…"}</p></div>`;
    } else {
      const q = r.q;
      body = `<div class="qcard"><small class="muted">第 ${r.round + 1} / ${r.total} 回合</small><div class="q">${tx(q.q)}</div>${q.img ? `<img class="qimg" alt="附圖" src="${esc(imgUrl(q.img))}">` : ""}
      ${q.o ? `<div class="opts">${q.o.map((o, i) => `<button class="opt" data-act="bo" data-v="${esc(o)}"><b>${"ABCDEFGH"[i]}</b>${tx(o)}</button>`).join("")}</div>`
        : `<input id="ans" ${q.t === "text" ? "" : 'inputmode="decimal"'} autocomplete="off" placeholder="${q.t === "text" ? "寫下答案" : "輸入數字"}"><p><button class="btn" data-act="bs">送出</button></p>`}
      <small class="muted" id="foeS">${r.foeAnswered ? "⚡ 對手已經答好了!" : ""}</small></div>`;
    }
    m.innerHTML = `<div class="arena" style="position:relative">${fighters(r)}<div class="timer"><i id="tm"></i></div>${body}</div>`;
    const inp = $("#ans"); if (inp) { inp.focus(); inp.onkeydown = (e) => e.key === "Enter" && submit(inp.value.trim()); }
    bind(m, { bo: (b) => { m.querySelectorAll(".opt").forEach((x) => x.classList.toggle("on", x === b)); return submit(b.dataset.v); }, bs: () => submit(($("#ans").value || "").trim()) });
  }
  function renderDone(r) {
    const win = r.result === "win", rw = r.reward || {};
    Snd.sfx(win ? "win" : r.result === "draw" ? "ok" : "lose"); if (win) Snd.bgm("win");
    m.innerHTML = `<div class="arena">${fighters(r)}<div class="qcard result"><div class="big">${win ? "🏆" : r.result === "draw" ? "🤝" : "💪"}</div><h2>${win ? "你贏了!" : r.result === "draw" ? "平手!" : "下次一定贏!"}</h2>
      ${r.foe.cpu ? `<div class="bannerx" style="color:#fff">💬 ${esc(r.foe.nick)}:${esc(cpuSay(r.foe.cpu, win ? "lose" : r.result === "draw" ? "win" : "win", r.log.length))}</div>` : ""}<p>${rw.give ? `獲得 <b>💎 ${rw.give}</b>` : "今天的對戰結晶已經拿滿囉"}${rw.capped && rw.give ? `(今天快到上限了)` : ""}</p>
      <div class="tbl"><table><tr><th>回合</th><th>答案</th><th>你</th><th>對手</th></tr>${r.log.map((x) => `<tr><td>${x.r + 1}</td><td>${tx(x.a)}</td><td>${x.you ? "✅" + (x.youDmg ? " -" + x.youDmg : "") : "❌"}</td><td>${x.foe ? "✅" + (x.foeDmg ? " -" + x.foeDmg : "") : "❌"}</td></tr>`).join("")}</table></div>
      <p><a class="btn" href="#/duel">再比一場</a> <a class="btn alt" href="#/town">回地圖</a></p></div></div>`;
    dead = true; refreshMe().catch(() => {});
  }
  function effects(r) {
    if (r.log.length > lastLog && lastLog >= 0 && st) {
      const x = r.log[r.log.length - 1];
      if (x.youDmg) Snd.sfx("hit"); if (x.foeDmg) Snd.sfx("hurt"); if (!x.you && !x.foe) Snd.sfx("no");
      setTimeout(() => { const f = $("#ff"), y = $("#fy"); if (x.youDmg && f) { f.classList.add("shake"); f.insertAdjacentHTML("beforeend", `<span class="dmg" style="left:40%;top:10px">-${x.youDmg}</span>`); } if (x.foeDmg && y) { y.classList.add("shake"); y.insertAdjacentHTML("beforeend", `<span class="dmg" style="left:40%;top:10px">-${x.foeDmg}</span>`); } }, 30);
    }
    lastLog = r.log.length;
  }
  function apply(r) {
    const ns = sigOf(r), now = performance.now(); deadline = now + r.msLeft; startAt = now + r.startsIn;
    const prev = st; st = r;
    if (ns !== sig) { sig = ns; render(r); effects(r); } else if (prev && r.foeAnswered !== prev.foeAnswered) { const e = $("#foeS"); if (e) e.textContent = r.answered ? "對手也答好了,結算中…" : "⚡ 對手已經答好了!"; }
  }
  async function fetchState() { if (busyF || dead) return; busyF = true; try { apply(await GET("/duel/state?id=" + encodeURIComponent(id))); } catch (e) { if (e.code === "no_duel") { dead = true; m.innerHTML = `<div class="card"><p class="err">${esc(errMsg(e))}</p><a class="btn" href="#/duel">回對戰大廳</a></div>`; } } finally { busyF = false; } }
  async function submit(v) {
    if (sending || !st || st.answered || st.startsIn > 0 || v === "" || v == null) { if (v === "") toast("先寫下答案喔"); return; }
    sending = true; Snd.sfx("click");
    try { apply(await POST("/duel/answer", { id, r: st.round, v })); }
    catch (e) { if (["already_done", "bad_round", "not_open"].includes(e.code)) { sig = ""; await fetchState(); } else toast(errMsg(e)); }
    sending = false;
  }
  await fetchState(); if (!st) return;
  const poll = setInterval(() => { if (!dead) fetchState(); else clearInterval(poll); }, 1500);
  const tick = setInterval(() => {
    if (dead || !st) return; const now = performance.now();
    const tm = $("#tm"), cd = $("#cd");
    if (st.status === "play" && st.startsIn <= 0 && tm) { const left = Math.max(0, deadline - now); tm.style.width = (left / st.limit) * 100 + "%"; if (left === 0 && !busyF && !sending) fetchState(); }
    else if (tm) tm.style.width = "100%";
    if (cd) { const s = Math.max(0, Math.ceil((startAt - now) / 1000)); cd.textContent = s; if (s === 0 && !busyF) fetchState(); }
  }, 150);
  onLeave(() => { clearInterval(poll); clearInterval(tick); });
};

/* ---------- 任務 ---------- */
VIEWS.quests = async () => {
  const m = chrome("/quests"); const [r, w] = await Promise.all([GET("/quests"), W ? W : GET("/world")]); W = w;
  const mapName = (id) => { const x = w.maps.find((k) => k.id === id); return x && x.unlocked ? x.name : ""; };
  const list = r.quests.filter((x) => x.status !== "done"), done = r.quests.filter((x) => x.status === "done");
  const card = (x) => `<div class="card"><div class="row sp"><div><span class="tag ${x.main ? "main" : ""}">${x.main ? "主線 第" + x.act + "幕" : "支線"}</span> <b>${tx(x.title)}</b></div>${mapName(x.map) ? `<small class="muted">📍${esc(mapName(x.map))}</small>` : ""}</div>
    <p class="muted" style="margin:.4em 0">${tx(x.text)}</p><div class="row sp">${x.status === "active" ? `<small>進度 ${x.progress.have} / ${x.progress.need}</small>` : "<span></span>"}
    ${x.status === "available" ? `<button class="btn sm" data-act="acc" data-id="${esc(x.id)}">接任務</button>` : x.status === "active" ? `<button class="btn green sm" data-act="clm" data-id="${esc(x.id)}" ${x.claimable ? "" : "disabled"}>領獎勵</button>` : `<small>✅ 完成</small>`}</div></div>`;
  m.innerHTML = `<h2 class="ttl">任務板</h2>${list.map(card).join("") || `<div class="card"><p class="muted">目前沒有任務,去地圖逛逛吧!</p></div>`}${done.length ? `<details><summary class="muted" style="color:#24506e;font-weight:800">已完成 ${done.length} 個</summary>${done.map(card).join("")}</details>` : ""}`;
  bind(m, {
    acc: async (b) => { const r2 = await POST("/quest/accept", { id: b.dataset.id }); toast("開始任務!"); await announce(r2.unlocked); route(); },
    clm: async (b) => { const r2 = await POST("/quest/claim", { id: b.dataset.id }); const c = (r2.rewards || []).filter((x) => x.crystal).reduce((s, x) => s + x.crystal, 0); Snd.sfx("coin"); toast("任務完成!" + (c ? ` +${c} 💎` : "")); await refreshMe(); if (r2.levelUp) { Snd.sfx("levelup"); toast("升級了!🎉"); } await announce(r2.unlocked); route(); },
  });
};

/* ---------- 農場 ---------- */
const STAGE = ["🌱", "🌿", "🌾", "🎉"];
function choose(html, items) { // 選單視窗:回傳選到的 index 或 null
  return new Promise((res) => {
    const mo = document.createElement("div"); mo.className = "modal"; mo.innerHTML = `<div>${html}${items}<button class="btn alt" data-i="x">取消</button></div>`; document.body.appendChild(mo);
    mo.onclick = (e) => { const x = e.target.closest("[data-i]"); if (x) { mo.remove(); res(x.dataset.i === "x" ? null : +x.dataset.i); } };
  });
}
VIEWS.farm = async () => {
  const m = chrome("/town"); const draw = async () => {
    const r = await GET("/farm");
    m.innerHTML = `${back()}<div class="row sp"><h2 class="ttl">🌾 農場</h2><span class="tag">💧 露水 ${r.dew}</span></div><p class="muted sm" style="color:#24506e">作物沒澆水只是長得慢,不會枯死。</p>
    <div class="grid">${r.slots.map((s) => s.crop ? `<div class="card slot"><span class="emo">${s.ready ? pic(`${s.crop}_3`, STAGE[3]) : pic(`${s.crop}_${s.stage}`, STAGE[s.stage])}</span><b>${tx(s.name)}</b><br><small class="muted">${s.ready ? "可以收成了!" : s.needsWater ? `需要澆水 ${s.waters}/${s.need}` : `還要約 ${s.minutesLeft} 分鐘`}</small>
      <div style="margin-top:8px">${s.ready ? `<button class="btn green sm" data-act="hv" data-s="${s.slot}">收成</button>` : s.needsWater ? `<button class="btn sm" data-act="wt" data-s="${s.slot}" ${r.dew ? "" : "disabled"}>💧澆水</button>` : `<small class="muted">長大中…</small>`}</div></div>`
      : `<div class="card slot"><span class="emo muted">${pic("plot_empty", "🟫")}</span><small class="muted">空地</small><div style="margin-top:8px"><button class="btn alt sm" data-act="pl" data-s="${s.slot}">種植</button></div></div>`).join("")}</div>
    <p class="muted sm" style="color:#24506e">想要更多田地或露水,到商店買。</p><a class="btn alt" href="#/shop">🏪 去商店</a>`;
    bind(m, {
      pl: async (b) => {
        const i = await choose("<h3>要種什麼?</h3>", r.crops.map((c, k) => `<button class="btn alt choice" data-i="${k}" ${c.locked || !c.seeds ? "disabled" : ""}>${pic(c.id + "_3", "🌱", "sm")} ${tx(c.name)}<small class="muted">　種子 ${c.seeds}${c.locked ? `・Lv ${c.min_lv} 解鎖` : ""}</small></button>`).join(""));
        if (i === null) return; await POST("/farm/plant", { crop: r.crops[i].id, slot: +b.dataset.s }); toast("種下去了!"); await draw();
      },
      wt: async (b) => { await POST("/farm/water", { slot: +b.dataset.s }); toast("💧 澆水完成"); await draw(); },
      hv: async (b) => { const x = await POST("/farm/harvest", { slot: +b.dataset.s }); Snd.sfx("coin"); toast(`收成!${x.got.qty} 個 ${EMO[x.got.item] || ""}`); await draw(); await refreshMe(); await announce(x.unlocked); },
    });
  };
  await draw(); const t = setInterval(() => { if (!document.querySelector(".modal")) draw().catch(() => {}); }, 30000); onLeave(() => clearInterval(t));
};

/* ---------- 牧場 ---------- */
VIEWS.pens = async () => {
  const m = chrome("/town"); const draw = async () => {
    const r = await GET("/pens");
    m.innerHTML = `${back()}<h2 class="ttl">🐑 牧場</h2><p class="muted sm" style="color:#24506e">動物肚子餓只會打哈欠,餵飽牠們就會送你禮物。</p>
    <div class="grid">${r.slots.map((s) => s.animal ? `<div class="card slot"><span class="emo">${pic(s.animal, "🐾")}</span><b>${tx(s.name)}</b><br><small class="muted">${s.ready ? "有禮物可以收!" : s.hungry ? "肚子餓了 🥱" : `還要約 ${s.minutesLeft} 分鐘`}</small>
      <div style="margin-top:8px">${s.ready ? `<button class="btn green sm" data-act="cl" data-s="${s.slot}">收取</button>` : s.hungry ? `<button class="btn sm" data-act="fd" data-s="${s.slot}">餵食</button>` : `<small class="muted">吃飽了 😊</small>`}</div></div>`
      : `<div class="card slot"><span class="emo muted">${pic("pen_empty", "🛖")}</span><small class="muted">空的畜欄</small><div style="margin-top:8px"><button class="btn alt sm" data-act="pl" data-s="${s.slot}">放動物</button></div></div>`).join("")}</div>
    <p class="muted sm" style="color:#24506e">動物和飼料都在商店買。</p><a class="btn alt" href="#/shop">🏪 去商店</a>`;
    bind(m, {
      pl: async (b) => {
        const i = await choose("<h3>放哪一隻?</h3>", r.animals.map((a, k) => `<button class="btn alt choice" data-i="${k}" ${a.locked || !a.owned ? "disabled" : ""}>${pic(a.id, "🐾", "sm")} ${tx(a.name)}<small class="muted">　擁有 ${a.owned}${a.locked ? `・Lv ${a.min_lv} 解鎖` : ""}</small></button>`).join(""));
        if (i === null) return; await POST("/pens/place", { animal: r.animals[i].id, slot: +b.dataset.s }); toast("牠住進來了!"); await draw();
      },
      fd: async (b) => { await POST("/pens/feed", { slot: +b.dataset.s }); toast("吃得好開心!"); await draw(); },
      cl: async (b) => { const x = await POST("/pens/collect", { slot: +b.dataset.s }); Snd.sfx("coin"); toast(`收到 ${x.got.qty} 個 ${EMO[x.got.item] || ""}`); await draw(); await announce(x.unlocked); },
    });
  };
  await draw(); const t = setInterval(() => { if (!document.querySelector(".modal")) draw().catch(() => {}); }, 30000); onLeave(() => clearInterval(t));
};

/* ---------- 商店 ---------- */
let SHOPCAT = "seed";
VIEWS.shop = async () => {
  const m = chrome("/town"); const draw = async () => {
    const r = await GET("/shop"), cats = [...new Set(r.items.map((i) => i.cat))].sort((a, b) => Object.keys(CATS).indexOf(a) - Object.keys(CATS).indexOf(b));
    if (!cats.includes(SHOPCAT)) SHOPCAT = cats[0];
    m.innerHTML = `${back()}<div class="row sp"><h2 class="ttl">🏪 叮噹百寶屋</h2><span class="tag">Lv ${r.lv}</span></div>
    <div class="seg pick">${cats.map((c) => `<button class="${c === SHOPCAT ? "on" : ""}" data-act="cat" data-c="${c}">${CATS[c] || c}</button>`).join("")}</div>
    <div class="grid">${r.items.filter((i) => i.cat === SHOPCAT).map((i) => `<div class="card slot ${i.locked ? "lock" : ""}"><span class="emo">${itemPic(i.id, "🎁")}</span><b>${tx(i.name)}</b><br>
      <small class="muted">${i.free ? "免費" : "💎 " + i.price}${i.maxOwn < 99 ? `・${i.owned}/${i.maxOwn}` : i.owned ? `・已有 ${i.owned}` : ""}</small>
      <div style="margin-top:8px">${i.locked ? `<small class="muted">Lv ${i.minLv} 解鎖</small>` : i.free ? `<small class="muted">一開始就有</small>` : i.owned >= i.maxOwn ? `<small>✅ 已擁有</small>` : `<button class="btn sm" data-act="buy" data-id="${esc(i.id)}">購買</button>${i.maxOwn > 1 ? ` <button class="btn alt sm" data-act="buy" data-id="${esc(i.id)}" data-n="5">×5</button>` : ""}`}</div></div>`).join("")}</div>`;
    bind(m, {
      cat: (b) => { SHOPCAT = b.dataset.c; draw(); },
      buy: async (b) => { if (ME.user.expired) return toast(ERR.expired); const n = +(b.dataset.n || 1); await POST("/buy", { item: b.dataset.id, qty: n }); Snd.sfx("coin"); toast("買好了!"); await refreshMe(); await draw(); },
    });
  };
  await draw();
};

/* ---------- 背包 ---------- */
VIEWS.bag = async () => {
  const m = chrome("/bag"); const draw = async () => {
    const r = await GET("/bag");
    m.innerHTML = `<h2 class="ttl">🎒 背包</h2>${r.items.length ? `<div class="grid">${r.items.map((i) => `<div class="card slot"><span class="emo">${itemPic(i.id, "🎁")}</span><b>${tx(i.name)}</b><br><small class="muted">× ${i.qty}</small>${i.sell > 0 ? `<div style="margin-top:8px"><button class="btn alt sm" data-act="sell" data-id="${esc(i.id)}" data-n="1">賣1個 💎${i.sell}</button>${i.qty > 1 ? ` <button class="btn alt sm" data-act="sell" data-id="${esc(i.id)}" data-n="${i.qty}">全賣</button>` : ""}</div>` : ""}</div>`).join("")}</div>` : `<div class="card"><p class="muted">背包是空的。去商店逛逛,或到農場收成吧!</p></div>`}`;
    bind(m, { sell: async (b) => { const x = await POST("/sell", { item: b.dataset.id, qty: +b.dataset.n }); Snd.sfx("coin"); toast(`賣出!+${x.got} 💎`); await refreshMe(); await announce(x.unlocked); await draw(); } });
  };
  await draw();
};

/* ---------- 圖鑑・成就・影片 ---------- */
let BOOKTAB = "coll", VIDS = [];
VIEWS.book = async () => {
  const m = chrome("/book"); const draw = async () => {
    const head = `<div class="seg pick">${[["coll", "守護獸"], ["ach", "成就"], ["vid", "回憶影片"]].map(([k, n]) => `<button class="${BOOKTAB === k ? "on" : ""}" data-act="tab" data-k="${k}">${n}</button>`).join("")}</div>`;
    let body = "";
    if (BOOKTAB === "coll") {
      const r = await GET("/collection"), by = {};
      r.chapters.forEach((c) => (by[c.semester] = by[c.semester] || []).push(c));
      body = `<div class="card"><p class="muted" style="margin:0">已收集 <b>${r.collected}</b> / ${r.total} 隻・目前有題目的章節 ${r.playable} 個。每章答對 ${ME.config.collAt} 題,守護獸就會加入圖鑑。</p></div>` +
        Object.keys(by).map((s) => `<details class="card" ${by[s].some((c) => c.playable) ? "open" : ""}><summary><b>${semName(s)}</b>　<small class="muted">${by[s].filter((c) => c.collected).length}/${by[s].length}</small></summary><div class="grid" style="margin:8px 0">${by[s].map((c) => `<div class="tile ${c.collected ? "on" : !c.playable ? "off" : ""}"><span class="emo">${c.collected ? pic("coll_" + c.id, "🐾") : c.playable ? "❔" : "🔒"}</span><b>${c.collected ? tx(c.name) : "？？？"}</b><br><small class="muted">${tx(c.title)}<br>${c.playable ? `${Math.min(c.correct, c.need)}/${c.need}` : "題目準備中"}</small></div>`).join("")}</div></details>`).join("");
    } else if (BOOKTAB === "ach") {
      const r = await GET("/achievements");
      body = `<div class="grid">${r.list.map((a) => `<div class="tile ${a.owned ? "on" : "off"}"><span class="emo">${a.owned ? pic(a.id, "🏅") : "🔒"}</span><b>${tx(a.name)}</b><br><small class="muted">${tx(a.desc || "")}</small></div>`).join("")}</div>`;
    } else {
      const r = await GET("/videos");
      body = r.list.length ? r.list.map((v) => `<div class="card row sp"><div><b>🎬 ${tx(v.title)}</b><br><small class="muted">${tx(v.desc || "")}</small></div><button class="btn sm" data-act="pv" data-id="${esc(v.id)}">播放</button></div>`).join("") : `<div class="card"><p class="muted">解鎖的影片會收在這裡。</p></div>`;
      VIDS = r.list;
    }
    m.innerHTML = `<h2 class="ttl">📖 圖鑑</h2>${head}${body}`;
    bind(m, { tab: (b) => { BOOKTAB = b.dataset.k; draw(); }, pv: (b) => playVideo(VIDS.find((v) => v.id === b.dataset.id)) });
  };
  await draw();
};

/* ---------- 換造型・建立角色 ---------- */
VIEWS.wardrobe = async ([mode]) => {
  const isNew = mode === "new"; const m = chrome(isNew ? "" : "/town");
  const shop = await GET("/shop"), cfg = ME.config, SL = cfg.slots, cur = ME.player;
  const sel = { a: cur ? cur.nickA : 0, b: cur ? cur.nickB : 0, look: { ...(cur ? cur.look : {}) } };
  const opts = (slot) => shop.items.filter((i) => i.cat === slot && (i.free || i.owned));
  if (isNew) { for (const s of SL) { const o = opts(s)[0]; if (s !== "acc" && o && !sel.look[s]) sel.look[s] = o.id; } }
  const draw = () => {
    m.innerHTML = `<h2 class="ttl">${isNew ? "捏出你的角色" : "換造型"}</h2>${isNew ? `<p class="muted" style="color:#24506e;font-weight:700">不分男生女生,選你喜歡的就好。之後還能在商店買更多造型。</p>` : ""}
    <div class="card" style="text-align:center">${avatar(sel.look, "xl").replace('class="av xl"', 'class="av" style="width:110px;height:110px;margin:0 auto;font-size:60px"')}<h3>${esc(cfg.nickA[sel.a] + cfg.nickB[sel.b])}</h3></div>
    <div class="card"><b>暱稱 前半</b><div class="pick" style="margin:6px 0">${cfg.nickA.map((n, i) => `<button class="${i === sel.a ? "on" : ""}" data-act="na" data-i="${i}">${esc(n)}</button>`).join("")}</div>
    <b>暱稱 後半</b><div class="pick" style="margin:6px 0">${cfg.nickB.map((n, i) => `<button class="${i === sel.b ? "on" : ""}" data-act="nb" data-i="${i}">${esc(n)}</button>`).join("")}</div></div>
    ${SL.map((s) => `<div class="card"><b>${CATS[s]}</b><div class="pick" style="margin-top:6px">${s === "acc" ? `<button class="${!sel.look.acc ? "on" : ""}" data-act="lk" data-s="acc" data-id="">不戴</button>` : ""}${opts(s).map((o) => `<button class="${sel.look[s] === o.id ? "on" : ""}" data-act="lk" data-s="${s}" data-id="${esc(o.id)}">${tx(o.name)}</button>`).join("")}</div></div>`).join("")}
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
      body = `<div class="card"><p>共 ${s.chapters} 章:有題 ${s.ok} ・太少(<5) ${s.few} ・沒題 ${s.none}。題庫共 ${s.bankQuestions} 題。</p><div class="tbl"><table><tr><th>章</th><th>名稱</th><th>題庫</th><th>產生器</th><th>碰過人數</th><th></th></tr>${r.chapters.map((c) => `<tr><td>${esc(c.id)}</td><td>${esc(c.title)}</td><td>${c.bank}</td><td>${c.gens}</td><td>${c.students}</td><td>${lab[c.status]}</td></tr>`).join("")}</table></div></div>`;
    } else if (TTAB === "prog") {
      body = `<div class="card"><p class="muted">設定某班教到哪一學期,學生練習與對戰只會出到這個學期(含)之前。沒設定的班級,出題範圍是該年級的下學期。</p>
      <p><input id="cls" placeholder="班級,例如 601"></p><p><select id="sem">${["1u", "1d", "2u", "2d", "3u", "3d", "4u", "4d", "5u", "5d", "6u", "6d"].map((s) => `<option value="${s}">${semName(s)}</option>`).join("")}</select></p><button class="btn" data-act="setp">儲存</button></div>`;
    } else {
      const r = await GET("/admin/overview");
      body = `<div class="card"><div class="tbl"><table><tr><th>班</th><th>號</th><th>姓名</th><th>結晶</th><th>累計</th><th>答題</th><th>答對</th><th>章數</th></tr>${r.students.map((x) => `<tr><td>${esc(x.cls)}</td><td>${x.no}</td><td>${esc(x.name)}</td><td>${x.bal}</td><td>${x.earned}</td><td>${x.answered}</td><td>${x.correct}</td><td>${x.chapters}</td></tr>`).join("")}</table></div></div>`;
    }
    m.innerHTML = `<h2 class="ttl">老師</h2>${head}${body}`;
    bind(m, { tab: (b) => { TTAB = b.dataset.k; draw(); }, setp: async () => { await POST("/admin/progress", { cls: $("#cls").value.trim(), semester: $("#sem").value }); toast("已儲存"); } });
  };
  await draw();
};

/* ---------- 啟動 ---------- */
(async function main() {
  await initArt(CFG);
  try { auth = await initAuth(); } catch { $("#app").innerHTML = `<div class="hero"><p class="err">連不上登入服務,請檢查網路後重新整理。</p></div>`; return; }
  applySettings();
  auth.onChange((u) => { if (u) boot(); else { ME = null; loginView(window.__authErr ? authMsg(window.__authErr) : ""); } });
})();
