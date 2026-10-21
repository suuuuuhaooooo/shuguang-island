/* 輕量防護:擋右鍵選單、複製、框選、拖曳、常見的存檔與檢視快捷鍵(輸入框除外)。
   這只能勸退一般使用者,不是安全機制——真正的防護在後端(答案、判分、計時、獎勵都在伺服器)。 */
(function () {
  var inField = function (e) { var t = e.target; return t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName); };
  ["contextmenu", "copy", "cut", "selectstart", "dragstart", "dblclick"].forEach(function (n) { document.addEventListener(n, function (e) { if (!inField(e)) e.preventDefault(); }); });
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ["s", "u", "c", "x", "p", "a"].indexOf(k) >= 0 && !inField(e)) e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].indexOf(k) >= 0) e.preventDefault();
    if (e.key === "F12" || e.key === "PrintScreen") e.preventDefault();
  });
  document.addEventListener("keyup", function (e) { if (e.key === "PrintScreen" && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(" ").catch(function () {}); });
})();
