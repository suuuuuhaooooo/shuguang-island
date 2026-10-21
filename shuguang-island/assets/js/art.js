/* 美術圖:有放進 assets/art/ 的就用,沒有的退回 CSS 與表情符號。
   啟動時一次探測「介面套件」會用到的圖,有的就用 CSS 變數套上去;遊戲內容的圖(NPC、物品、地圖…)在顯示時才載入,載入失敗自動換回表情符號。 */
export const UI_KEYS = ["logo", "bg_title", "bg_world", "bg_page", "bg_battle", "btn_primary", "btn_secondary", "btn_green", "panel", "hud_pill", "bar_fill", "pin", "pin_locked",
  "ic_crystal", "ic_star", "ic_heart", "ic_home", "ic_practice", "ic_quest", "ic_bag", "ic_book", "ic_duel", "ic_settings", "ic_teacher", "ic_shop", "ic_farm", "ic_pen", "ic_lock", "ic_back", "ic_music", "ic_sound", "ic_check", "ic_close", "cursor_default", "cursor_pointer"];
export const art = { on: false, has: new Set(), base: "assets/art/" };
const probe = (k) => new Promise((res) => { const i = new Image(); i.onload = () => res(k); i.onerror = () => res(null); i.src = art.base + k + ".webp"; });
export async function initArt(cfg) {
  art.on = !!(cfg && cfg.art); if (!art.on) return;
  const ok = (await Promise.all(UI_KEYS.map(probe))).filter(Boolean); ok.forEach((k) => art.has.add(k));
  const r = document.documentElement.style, abs = (f) => new URL(art.base + f, document.baseURI).href;
  for (const k of ok) { r.setProperty("--art-" + k.replace(/_/g, "-"), `url(${abs(k + ".webp")})`); document.body.classList.add("art-" + k.replace(/_/g, "-")); }
  if (art.has.has("cursor_default")) { r.setProperty("--cur", `url(${abs("cursor_default.webp")}) 4 4, auto`); r.setProperty("--cur-p", `url(${abs((art.has.has("cursor_pointer") ? "cursor_pointer" : "cursor_default") + ".webp")}) 4 4, pointer`); document.body.classList.add("art-cursor"); }
}
/* 圖片或表情符號。key 是檔名(不含 .webp);fallback 是找不到圖時顯示的表情符號。 */
export const pic = (key, fallback, cls = "") => art.on
  ? `<img class="art ${cls}" src="${art.base}${key}.webp" alt="" draggable="false" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'emo-fb ${cls}',textContent:'${fallback}'}))">`
  : `<span class="emo-fb ${cls}">${fallback}</span>`;
export const uiIcon = (k, fb) => (art.has.has(k) ? `<i class="uic" style="background-image:var(--art-${k.replace(/_/g, "-")})"></i>` : `<span class="emo-fb">${fb}</span>`);
