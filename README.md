# 數光島(前端)

純靜態網站,沒有建置步驟。後端是 `shuguang-island-api`(Cloudflare Worker),登入用 Firebase(和數學筆記本同一個專案)。

## 上線(GitHub Pages)
把這個資料夾**裡面的全部檔案**放到儲存庫 `shuguang-island` 的根目錄(`index.html` 要在最外層),Settings → Pages → `main` / root。網址:`https://suuuuuhaooooo.github.io/shuguang-island/`。

## 檔案
- `index.html` 入口(字體、版權標示、防複製)
- `about.html` 版權・隱私・字體授權(CC BY-NC-ND 4.0)
- `assets/config.js` 後端網址、Firebase、美術/音訊開關、閒置登出分鐘數
- `assets/js/app.js` 所有畫面:登入、捏角色、世界地圖、對話、練習、**對戰(電腦/同班同學)**、任務、農場、牧場、商店、背包、圖鑑、設定、老師
- `assets/js/tx.js` 題目數字與算式的 LaTeX(KaTeX)排版,規則同數學筆記本
- `assets/js/zhuyin.js` 注音(低年級自動;可在設定開關)。破音字修正放 `assets/data/zhuyin-fix.json`
- `assets/js/audio.js` 設定、背景音樂、音效(沒有音檔時用即時合成)
- `assets/js/art.js` 美術圖載入與退回機制
- `assets/js/protect.js` 禁右鍵、複製、框選、常見快捷鍵(只能勸退,真正的防護在後端)
- `assets/js/footer.js` 版權頁尾(about.html 用)
- `assets/css/island.css` 樣式。每一種物件(按鈕、面板、HUD、地圖背景、游標…)都有 CSS 預設,放進 AI 生成圖後自動覆蓋

## 放美術圖
圖放進 `assets/art/`(webp),檔名規則見《Gemini 任務包 v2》,然後把 `assets/config.js` 的 `art` 改成 `true`。沒有對應檔案的圖會自動退回 CSS/表情符號,所以可以一批一批放。
音樂音效放進 `assets/audio/`,`audio` 改成 `true`。

## 對戰
5 回合、各 100 血、答對攻擊(越快越痛)。一個人開房間給 4 碼代碼,同班同學輸入即可;也能挑戰三種等級的電腦夥伴。判分、計時、電腦表現與獎勵全在後端。
