# 數光島(前端)

純靜態網站,沒有建置步驟。後端是 `shuguang-island-api`(Cloudflare Worker),登入用 Firebase(和數學筆記本同一個專案)。

## 上線(GitHub Pages)
1. 在 GitHub 建立新的儲存庫,名稱 `shuguang-island`。
2. 把這個資料夾**裡面的全部檔案**放到儲存庫根目錄(`index.html` 要在最外層)。
3. 儲存庫 Settings → Pages → Source 選 `main` 分支、`/ (root)`,儲存。
4. 幾分鐘後網址是 `https://suuuuuhaooooo.github.io/shuguang-island/`。
5. 第一次登入如果出現 `auth/unauthorized-domain`,到 Firebase Console → Authentication → Settings → 授權網域,確認 `suuuuuhaooooo.github.io` 在清單裡(筆記本已經加過,通常不用再加)。

後端的 `ALLOWED_ORIGINS` 已經是 `https://suuuuuhaooooo.github.io`,所以不用改。

## 檔案
- `assets/config.js` 後端網址、Firebase 設定、美術開關
- `assets/js/app.js` 全部畫面(登入、捏角色、城鎮、對話、練習、任務、農場、牧場、商店、背包、圖鑑、老師)
- `assets/css/island.css` 樣式(手機優先,低年段字比較大)
- `assets/vendor/katex` 數學式顯示

## 放美術圖
把圖放進 `assets/art/`,檔名照 Gemini 任務包的規則(例如 `npc_01.webp`、`item_carrot.webp`、`map_loc_01.webp`、`coll_6d-5.webp`),然後把 `assets/config.js` 的 `art` 改成 `true`。沒有對應檔案的圖會自動退回表情符號。

## 目前是占位的部分
角色頭像、地圖與 NPC 圖、作物動物圖都用表情符號占位。低年段注音尚未做(可加注音字型);目前每段台詞和題目旁有 🔊 可以朗讀。
