/* 設定、背景音樂、音效。
   有檔案就用檔案(assets/audio/bgm_town.mp3、sfx_ok.mp3 …),沒有就用瀏覽器即時合成的簡單音樂與音效,所以不放任何音檔也有聲音。
   瀏覽器規定要使用者點過畫面才能發聲,所以第一次點擊後才會開始播放。 */
const KEY = "si-settings";
const DEF = { bgm: true, bgmVol: 0.5, sfx: true, sfxVol: 0.7, zy: "auto", fs: "m", cursor: true, motion: true };
let S = { ...DEF }; try { S = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch {}
const subs = [];
export const Settings = {
  get: (k) => S[k], all: () => ({ ...S }),
  set(k, v) { S[k] = v; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} subs.forEach((f) => f(k, v)); },
  on: (f) => subs.push(f),
};
let ctx = null, master = null, scene = null, want = null, timer = 0, step = 0, nextT = 0, el = null, fileScenes = {}, unlocked = false;
const SCENES = { // 速度、音階(半音)、根音、波形
  town: { bpm: 86, scale: [0, 2, 4, 7, 9, 12, 9, 7], root: 261.63, wave: "triangle", pad: [0, 4, 7] },
  quiz: { bpm: 72, scale: [0, 4, 7, 9, 7, 4, 2, 4], root: 220, wave: "sine", pad: [0, 4, 9] },
  battle: { bpm: 132, scale: [0, 3, 5, 7, 10, 7, 5, 3], root: 220, wave: "square", pad: [0, 3, 7] },
  win: { bpm: 100, scale: [0, 4, 7, 12, 7, 12, 16, 12], root: 261.63, wave: "triangle", pad: [0, 4, 7] },
};
const ac = () => { if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); master = ctx.createGain(); master.connect(ctx.destination); } return ctx; };
const hz = (root, semi) => root * Math.pow(2, semi / 12);
function tone(f, t, dur, type, vol, dest) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05);
}
function schedule() {
  if (!ctx || !scene || !S.bgm) return;
  const sc = SCENES[scene] || SCENES.town, beat = 60 / sc.bpm / 2, v = 0.16 * S.bgmVol;
  while (nextT < ctx.currentTime + 0.4) {
    const i = step % sc.scale.length, t = Math.max(nextT, ctx.currentTime + 0.02);
    tone(hz(sc.root, sc.scale[i]), t, beat * 1.8, sc.wave, v * (i % 4 === 0 ? 1 : 0.65));
    if (step % 8 === 0) sc.pad.forEach((p) => tone(hz(sc.root / 2, p), t, beat * 7.5, "sine", v * 0.55));
    if (scene === "battle" && step % 2 === 0) tone(hz(sc.root / 4, 0), t, beat * 0.9, "triangle", v * 0.9);
    nextT += beat; step++;
  }
}
async function hasFile(url) { try { const r = await fetch(url, { method: "HEAD" }); return r.ok && /audio|octet/.test(r.headers.get("content-type") || "audio"); } catch { return false; } }
async function playScene(name) {
  stopAll(); scene = name; if (!S.bgm || !unlocked) return;
  if (fileScenes[name] === undefined) fileScenes[name] = (window.SI_CONFIG && window.SI_CONFIG.audio) ? await hasFile(`assets/audio/bgm_${name}.mp3`) : false;
  if (scene !== name) return;
  if (fileScenes[name]) { el = new Audio(`assets/audio/bgm_${name}.mp3`); el.loop = true; el.volume = S.bgmVol; el.play().catch(() => {}); return; }
  if (!ac()) return; if (ctx.state === "suspended") ctx.resume(); master.gain.value = 1; step = 0; nextT = ctx.currentTime + 0.1; timer = setInterval(schedule, 120);
}
function stopAll() { clearInterval(timer); timer = 0; if (el) { el.pause(); el = null; } }
export const Snd = {
  unlock() { if (unlocked) return; unlocked = true; ac(); if (ctx && ctx.state === "suspended") ctx.resume(); if (want) playScene(want); },
  bgm(name) { want = name; if (scene === name && (timer || el)) return; if (unlocked) playScene(name); else scene = name; },
  stop() { want = null; scene = null; stopAll(); },
  sfx(name) {
    if (!S.sfx || !unlocked || !ac()) return; if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime + 0.01, v = 0.22 * S.sfxVol, d = master;
    const seq = (notes, type = "triangle", gap = 0.09, dur = 0.16, vol = v) => notes.forEach((n, i) => tone(n, t + i * gap, dur, type, vol, d));
    ({
      click: () => seq([660], "triangle", 0, 0.06, v * 0.7), open: () => seq([440, 660], "triangle", 0.06, 0.1),
      ok: () => seq([523, 659, 784], "triangle", 0.08, 0.18), no: () => seq([300, 240], "sawtooth", 0.1, 0.18, v * 0.5),
      coin: () => seq([988, 1319], "square", 0.07, 0.14, v * 0.5), levelup: () => seq([523, 659, 784, 1047, 1319], "triangle", 0.09, 0.22),
      hit: () => seq([180, 120], "sawtooth", 0.05, 0.12, v * 0.8), hurt: () => seq([220, 150, 100], "square", 0.06, 0.14, v * 0.5),
      win: () => seq([523, 659, 784, 659, 784, 1047], "triangle", 0.12, 0.28), lose: () => seq([392, 349, 311, 262], "triangle", 0.16, 0.3, v * 0.8),
      page: () => seq([880], "sine", 0, 0.05, v * 0.4),
    }[name] || (() => {}))();
    if (window.SI_CONFIG && window.SI_CONFIG.audio) { try { const a = new Audio(`assets/audio/sfx_${name}.mp3`); a.volume = S.sfxVol; a.play().catch(() => {}); } catch {} }
  },
};
Settings.on((k) => { if (k === "bgm") { if (S.bgm) playScene(want || scene || "town"); else stopAll(); } if (k === "bgmVol" && el) el.volume = S.bgmVol; });
document.addEventListener("visibilitychange", () => { if (document.hidden) { stopAll(); } else if (want && S.bgm && unlocked) playScene(want); });
["pointerdown", "keydown", "touchstart"].forEach((e) => addEventListener(e, () => Snd.unlock(), { passive: true }));
