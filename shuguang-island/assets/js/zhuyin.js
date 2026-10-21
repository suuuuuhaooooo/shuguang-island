/* 注音:把畫面上的國字加上注音(<ruby>)。
   拼音來自 pinyin-pro(MIT,執行時從 CDN 載入,含破音字判斷),再轉成注音符號。
   台灣讀音和大陸不同的字,可以寫在 assets/data/zhuyin-fix.json 覆蓋(格式:{"詞或字":"ㄗ ㄧˇ"},字之間用空白分開)。
   載入失敗時整個功能自動關閉,畫面照常顯示國字。 */
const INI = { b: "ㄅ", p: "ㄆ", m: "ㄇ", f: "ㄈ", d: "ㄉ", t: "ㄊ", n: "ㄋ", l: "ㄌ", g: "ㄍ", k: "ㄎ", h: "ㄏ", j: "ㄐ", q: "ㄑ", x: "ㄒ", zh: "ㄓ", ch: "ㄔ", sh: "ㄕ", r: "ㄖ", z: "ㄗ", c: "ㄘ", s: "ㄙ" };
const FIN = { a: "ㄚ", o: "ㄛ", e: "ㄜ", ê: "ㄝ", ai: "ㄞ", ei: "ㄟ", ao: "ㄠ", ou: "ㄡ", an: "ㄢ", en: "ㄣ", ang: "ㄤ", eng: "ㄥ", er: "ㄦ", i: "ㄧ", ia: "ㄧㄚ", io: "ㄧㄛ", ie: "ㄧㄝ", iao: "ㄧㄠ", iu: "ㄧㄡ", iou: "ㄧㄡ", ian: "ㄧㄢ", in: "ㄧㄣ", iang: "ㄧㄤ", ing: "ㄧㄥ", iong: "ㄩㄥ", u: "ㄨ", ua: "ㄨㄚ", uo: "ㄨㄛ", uai: "ㄨㄞ", ui: "ㄨㄟ", uei: "ㄨㄟ", uan: "ㄨㄢ", un: "ㄨㄣ", uen: "ㄨㄣ", uang: "ㄨㄤ", ong: "ㄨㄥ", ueng: "ㄨㄥ", "ü": "ㄩ", "üe": "ㄩㄝ", "üan": "ㄩㄢ", "ün": "ㄩㄣ" };
const MARK = { ā: ["a", 1], á: ["a", 2], ǎ: ["a", 3], à: ["a", 4], ē: ["e", 1], é: ["e", 2], ě: ["e", 3], è: ["e", 4], ī: ["i", 1], í: ["i", 2], ǐ: ["i", 3], ì: ["i", 4], ō: ["o", 1], ó: ["o", 2], ǒ: ["o", 3], ò: ["o", 4], ū: ["u", 1], ú: ["u", 2], ǔ: ["u", 3], ù: ["u", 4], ǖ: ["ü", 1], ǘ: ["ü", 2], ǚ: ["ü", 3], ǜ: ["ü", 4], ế: ["ê", 2], ề: ["ê", 4] };
const TONE = ["", "", "ˊ", "ˇ", "ˋ", "˙"];
/* 單一拼音音節(帶聲調符號,例如 "nǐ"、"lǜ"、"de")轉成注音 */
export function pyToZy(py) {
  let s = String(py || "").toLowerCase().trim(), tone = 5, plain = "";
  for (const ch of s) { if (MARK[ch]) { plain += MARK[ch][0]; tone = MARK[ch][1]; } else if (/[1-5]/.test(ch)) tone = +ch; else plain += ch === "v" ? "ü" : ch; }
  if (!/^[a-zêü]+$/.test(plain)) return "";
  if (!/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜếề1-4]/.test(s)) tone = /[1-5]/.test(s) ? tone : 5; // 沒有聲調符號 = 輕聲
  let ini = "", fin = plain;
  if (/^(zh|ch|sh)/.test(plain)) { ini = plain.slice(0, 2); fin = plain.slice(2); }
  else if (/^y/.test(plain)) { const r = plain.slice(1); fin = /^i/.test(r) ? r : /^[uü]/.test(r) ? "ü" + r.slice(1) : "i" + r; if (fin === "iu") fin = "iou"; }
  else if (/^w/.test(plain)) { const r = plain.slice(1); fin = /^u/.test(r) ? r : "u" + r; }
  else if (/^[bpmfdtnlgkhjqxrzcs]/.test(plain)) { ini = plain[0]; fin = plain.slice(1); }
  if (ini && "jqx".includes(ini) && /^u/.test(fin)) fin = "ü" + fin.slice(1);
  if (ini === "y" || ini === "w") ini = "";
  let f;
  if (fin === "i" && ["zh", "ch", "sh", "r", "z", "c", "s"].includes(ini)) f = "";
  else if (fin === "" && INI[ini]) f = "";
  else { f = FIN[fin]; if (f === undefined) return ""; }
  if (plain === "er") { ini = ""; f = "ㄦ"; }
  const body = (INI[ini] || "") + f;
  return tone === 5 ? "˙" + body : body + TONE[tone];
}

const ZH = /[\u3400-\u9fff]/, RUNZ = /([\u3400-\u9fff]+)/;
let lib = null, fixes = {}, on = false, obs = null, failed = false;
async function ensure() {
  if (lib || failed) return !!lib;
  try {
    const m = await import("https://cdn.jsdelivr.net/npm/pinyin-pro@3/+esm"); lib = m.pinyin || (m.default && m.default.pinyin);
    if (!lib) throw 0;
    try { const r = await fetch("assets/data/zhuyin-fix.json"); if (r.ok) fixes = await r.json(); } catch {}
  } catch { failed = true; }
  return !!lib;
}
/* 一段純國字 → 每個字的注音(陣列);失敗的字給空字串 */
export function syllables(run, L = lib) {
  const out = new Array([...run].length).fill("");
  let py = []; try { py = L(run, { type: "array", toneType: "symbol" }) || []; } catch {}
  [...run].forEach((_, i) => { out[i] = pyToZy(py[i] || ""); });
  for (const [w, z] of Object.entries(fixes)) { let at = run.indexOf(w); const zs = String(z).split(/\s+/); while (at >= 0) { [...w].forEach((_, k) => { if (zs[k]) out[at + k] = zs[k]; }); at = run.indexOf(w, at + 1); } }
  return out;
}
const SKIP = "ruby,rt,.katex,input,textarea,select,script,style,[data-nozy],.nozy,.emo,.zy";
function annotate(root) {
  if (!on || !lib || !root) return;
  const list = [];
  if (root.nodeType === 3) list.push(root); else { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) list.push(n); }
  for (const n of list) {
    const p = n.parentElement; if (!p || !ZH.test(n.nodeValue) || p.closest(SKIP)) continue;
    const frag = document.createElement("span"); frag.className = "zy"; frag.dataset.o = n.nodeValue;
    n.nodeValue.split(RUNZ).forEach((seg, i) => {
      if (i % 2 === 0) { if (seg) frag.appendChild(document.createTextNode(seg)); return; }
      const z = syllables(seg); [...seg].forEach((c, k) => { if (!z[k]) { frag.appendChild(document.createTextNode(c)); return; } const r = document.createElement("ruby"); r.append(c); const t = document.createElement("rt"); t.textContent = z[k]; r.appendChild(t); frag.appendChild(r); });
    });
    n.replaceWith(frag);
  }
}
let queued = new Set(), raf = 0;
function flush() { raf = 0; const q = [...queued]; queued.clear(); q.forEach((n) => { if (n.isConnected) annotate(n); }); }
export const Zhuyin = {
  syllables, pyToZy,
  async enable() {
    if (!(await ensure())) return false;
    on = true; annotate(document.getElementById("app")); annotate(document.getElementById("toasts"));
    if (!obs) { obs = new MutationObserver((ms) => { if (!on) return; for (const m of ms) { m.addedNodes.forEach((n) => { if (n.nodeType === 1 || n.nodeType === 3) { if (n.nodeType === 1 && n.closest && n.closest(".zy")) return; queued.add(n); } }); if (m.type === "characterData" && m.target.parentElement && !m.target.parentElement.closest(".zy")) queued.add(m.target); } if (queued.size && !raf) raf = requestAnimationFrame(flush); }); obs.observe(document.body, { childList: true, subtree: true, characterData: true }); }
    return true;
  },
  disable() { on = false; document.querySelectorAll(".zy").forEach((s) => s.replaceWith(document.createTextNode(s.dataset.o || s.textContent))); },
  get failed() { return failed; },
  _setLib(l) { lib = l; }, // 測試用
};
