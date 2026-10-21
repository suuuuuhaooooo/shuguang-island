/* 題目與台詞的顯示:跳脫 HTML、把 $...$ 與「看起來像算式」的片段用 KaTeX(LaTeX)排版,和數學筆記本一致。 */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const kx = (t, d) => { if (!window.katex) return esc(t); try { return katex.renderToString(t, { displayMode: !!d, throwOnError: false, strict: false }); } catch { return esc(t); } };
const RUN = /[0-9A-Za-zπ.,()+\-−×÷＝=<>≤≥≈²³\/／ ]+/g, OPS = /[×÷＝=+−<>≤≥≈²³π]|\d\s*\/\s*\d/;
const toTex = (r) => r.replace(/[A-Za-z]{2,}/g, "\\text{$&}").replace(/×/g, "\\times ").replace(/÷/g, "\\div ").replace(/＝/g, "=").replace(/−/g, "-").replace(/≤/g, "\\le ").replace(/≥/g, "\\ge ").replace(/≈/g, "\\approx ").replace(/π/g, "\\pi ").replace(/（/g, "(").replace(/）/g, ")").replace(/²/g, "^2").replace(/³/g, "^3").replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g, "\\frac{$1}{$2}");
function plain(seg) {
  let out = "", last = 0, m; RUN.lastIndex = 0;
  while ((m = RUN.exec(seg))) {
    const t = m[0].trim();
    out += esc(seg.slice(last, m.index));
    if (t && OPS.test(t) && /[0-9A-Za-z]/.test(t)) { const lead = m[0].match(/^\s*/)[0], tail = m[0].match(/\s*$/)[0]; out += esc(lead) + kx(toTex(t)) + esc(tail); } else out += esc(m[0]);
    last = m.index + m[0].length; if (m[0] === "") RUN.lastIndex++;
  }
  return out + esc(seg.slice(last));
}
export const tx = (s) => String(s ?? "").split(/(\$\$[^$]+\$\$|\$[^$]+\$)/).map((p, i) => (i % 2 ? (p.startsWith("$$") ? kx(p.slice(2, -2), 1) : kx(p.slice(1, -1))) : plain(p))).join("");
