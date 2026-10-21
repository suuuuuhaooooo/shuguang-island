# 數光島 部署說明書(完整版)

兩個資料夾、兩個地方部署:
| 資料夾 | 是什麼 | 放去哪 |
|---|---|---|
| `shuguang-island-api` | 後端(Cloudflare Worker + 資料庫) | Cloudflare |
| `shuguang-island` | 前端(網頁) | GitHub Pages(你的 `shuguang-island` repo) |

**順序一定是:先後端、再前端。** 老師後台的新功能需要後端先更新。

---
## 0. 事前準備(只做一次)
1. 電腦裝好 **Node.js 18 以上**(終端機輸入 `node -v` 看版本)和 **git**。
2. 有 Cloudflare 帳號,而且資料庫 `math-class` 就是數學筆記本在用的那個。
3. 把兩個 zip 各自解壓縮到一個空資料夾。**解壓縮後會多一層同名資料夾**,後面的指令已經考慮到。

---
## 1. 部署後端

打開終端機,進到解壓縮出來的後端資料夾:
```bash
cd shuguang-island-api
npm install
npx wrangler login          # 會開瀏覽器,按「Allow」。之前出現 Authentication error [code: 10000] 就先 npx wrangler logout 再重登
```

### 1-1 檢查設定(`wrangler.toml`,通常不用改)
| 設定 | 要確認 |
|---|---|
| `database_id` | 是 `9584932b-e3aa-4fd3-af3f-2f8c78cb2047`(和筆記本同一個) |
| `ALLOWED_ORIGINS` | `https://suuuuuhaooooo.github.io`(只放網域,不含 `/shuguang-island`) |
| `FIREBASE_PROJECT_ID` | `math-illustration` |
| `ALLOW_LOCALHOST` | 平常 `"0"` |
| `G_*` | 獎勵預設值。這些**之後可以在老師後台「遊戲設定」直接改**,不必再動檔案 |

### 1-2 建表與資料(依序執行,可重複執行、不會破壞筆記本的資料)
```bash
# ① 建遊戲資料表(只新增 g_ 開頭的表)
npx wrangler d1 execute math-class --remote --file=schema.sql

# ② 起始商品與造型(重跑不會蓋掉你改過的)
npx wrangler d1 execute math-class --remote --file=seed.sql

# ②-2 六年份的商品目錄(20 種作物種子、9 種動物、造型、飼料;重跑安全)
npx wrangler d1 execute math-class --remote --file=seed_catalog.sql

# ③ 檢查 111 章章節總表有沒有匯入過
npx wrangler d1 execute math-class --remote --command "SELECT COUNT(*) AS n FROM g_curriculum"
#   n = 111 → 已完成,跳過。
#   n = 0   → 要先匯入 data/curriculum.csv(見 README.md「匯入章節總表」);沒有這份就遊戲沒有題目範圍。

# ④ 產生並匯入遊戲內容(地圖、NPC、對話、任務、成就、111 隻守護獸…)
npm run content             # 看到「OK 283 筆」就對了
npx wrangler d1 execute math-class --remote --file=data/content.sql
```
**④ 重跑是安全的**:同 id 的內容會被更新成這一版。

### 1-3 上線
```bash
npx wrangler deploy
```
成功會印出網址 `https://shuguang-island-api.<你的帳號>.workers.dev`。

### 1-4 驗證後端
- 瀏覽器開 `網址/api/g/me`,看到 `{"err":"no_token"}` = **正常**(因為還沒登入)。
- 想看即時錯誤:`npx wrangler tail`,再去操作網站,紅字就是原因。

---
## 2. 部署前端

### 2-1 檢查 `assets/config.js`
- `api` 要是上一步的 Worker 網址(預設已是 `https://shuguang-island-api.suuuuuhaooooo.workers.dev`)。
- `art: true`、`audio: true` 保持。`video: false`(影片做好、放進 `assets/video/` 之後才改 `true`)。

### 2-2 蓋到你的前端 repo 並推上去
**「repo 根目錄」就是你放 `index.html` 的那個資料夾**(Codespaces 裡通常是 `/workspaces/shuguang-island`)。不要自己換新名字的資料夾。
假設你已經把 `shuguang-island.zip` 放進 repo 根目錄並解壓縮(會多出一個 `shuguang-island/` 資料夾):
```bash
cd /workspaces/shuguang-island        # 先確定在 repo 根目錄:ls 要看到 index.html、.git(ls -a)
unzip -o shuguang-island.zip           # 解壓出 shuguang-island/
cp -r shuguang-island/. .              # 把裡面的內容複製到「這裡」(注意結尾是 空格 + .)
rm -rf shuguang-island shuguang-island.zip   # 刪掉解壓出來的暫存資料夾和 zip
ls                                     # 必須直接看到 index.html、assets、DEPLOY.md,不能有 shuguang-island 資料夾
git add -A
git commit -m "數光島更新"
git push
```
> 不要把 zip 和解壓資料夾一起 commit。上次網站沒變、這次多出重複資料夾,都是因為檔案沒有直接放在根目錄。

### 2-3 GitHub Pages
Repo → Settings → Pages → Source 選 `Deploy from a branch`、Branch `main`、資料夾 `/ (root)`。推上去後約 1–2 分鐘生效。
**手機或電腦看到舊版時,請強制重新整理**(電腦 Ctrl+Shift+R;手機關掉分頁重開,或清除該網站資料)。

### 2-4 Firebase 授權網域(若登入顯示 `auth/unauthorized-domain`)
Firebase 控制台 → Authentication → Settings → Authorized domains → 加入 `suuuuuhaooooo.github.io`(數學筆記本通常已經有)。

---
## 3. 第一次上線後的設定(老師)
1. 用**老師的 Google 帳號**登入。老師帳號必須在名單(`roster`)裡,`role` 是 `teacher`。
2. 底部導覽出現「老師」→ 進去是**老師後台**:
   - **名單**:新增學生(Email、班級、座號、姓名、年級、期限)。可從試算表貼上整批匯入。
   - **遊戲設定 → 各班教學進度**:每班選「教到哪一學期」,學生就只會被出到這之前的題。**沒設定的班級,出題範圍是該年級的下學期。**
   - **遊戲設定 → 獎勵與公告**:每天結晶上限、安慰獎、對戰獎勵、是否開放對戰、全班公告。
3. 叫一位學生登入試玩(第一次會先捏角色)。

### 老師後台功能一覽
| 分頁 | 做什麼 |
|---|---|
| 總覽 | 今天有幾人上線、答幾題、正確率;整班發(或扣)結晶 |
| 學生 | 全部學生列表、篩班級、搜尋、匯出 CSV;點「明細」看每章作答、14 天紀錄、結晶流水、背包;調整結晶;重設(今天上限歸零、重捏角色、清空全部資料) |
| 名單 | 新增/修改/停用單人;貼上多筆匯入;整班升年級、延長期限、整班停用;匯出名單 |
| 遊戲設定 | 獎勵參數、對戰開關、公告;各班進度 |
| 商店 | 改價、改等級、年段、上下架;新增商品 |
| 內容 | 地點、NPC、對話、任務、作物、動物、物品、成就、影片、圖鑑:檢視、啟用/停用、刪除、用 JSON 編輯或匯入(送出前會檢查格式與互相引用) |
| 題庫 | 每章有幾題、幾人練過、正確率;匯出 CSV(找出缺題的章) |

設定存檔後 **10 秒內**全部學生生效。

---
## 4. 部署完成檢查清單
- [ ] 老師登入看得到「老師」分頁
- [ ] 後台「名單」能新增一位測試學生
- [ ] 測試學生登入 → 捏角色 → 進世界地圖
- [ ] 練習答一題,結晶增加
- [ ] 農場、商店、對戰(和電腦)可以用
- [ ] 手機(直向)與電腦都沒有跑版
- [ ] 後台寫一則公告,學生主城頂端看得到

---
## 5. 之後怎麼更新
| 要改什麼 | 做法 |
|---|---|
| 獎勵、公告、進度、名單、商品 | 直接在老師後台改,**不用部署** |
| 地圖/NPC/對話/任務文字 | 後台「內容」分頁,或改 `tools/mkcontent.mjs` → `npm run content` → 匯入 `data/content.sql` |
| 美術 | 換 `assets/art/` 裡同名的 `.webp`,推上 GitHub |
| 音樂音效 | 換 `assets/audio/` 的 mp3,推上 GitHub |
| 影片 | 放進 `assets/video/`,`config.js` 的 `video` 改 `true`,推上 GitHub |
| 後端程式 | `npx wrangler deploy` |
| 前端程式 | `git push` |

---
### 從舊版升級到「六年版」要多做的事
1. 後端資料夾:`npm run content`,再執行 `seed_catalog.sql` 和 `data/content.sql` 兩個匯入(指令見 1-2 的 ②-2 與 ④),最後 `npx wrangler deploy`。
2. 前端:把新的檔案覆蓋進前端 repo(含 `assets/art/` 新增的占位圖與 `tools/mkart.py`),commit、push。
3. 等級算法改了(最高 60 級、越高越難升,`G_LEVEL_STEP` 預設改成 100):舊的測試帳號等級會依累積結晶重新計算,這是正常的。
4. 想改作物、動物、造型、價格:改 `tools/catalog.mjs`(單一來源),再 `npm run content`、匯入 `seed_catalog.sql` 與 `data/content.sql`。後台「商店」分頁可直接調價格。
5. 新圖片:畫好同名 `.webp` 放進 `assets/art/`(清單見 `ART_TODO_NEW.md`)。

## 6. 出問題怎麼辦
| 症狀 | 原因 / 解法 |
|---|---|
| 網站沒變 | 多包一層資料夾(`ls` 要看到 `index.html`);沒強制重新整理;Pages 還在建置 |
| `Authentication error [code: 10000]` | `npx wrangler logout` 再 `npx wrangler login`;或建 API Token(權限要有 D1 Edit、Workers Scripts Edit)並設 `CLOUDFLARE_API_TOKEN` |
| 登入後說「這個帳號不在班級名單」 | 老師後台「名單」沒加這個 Google 帳號,或被停用/Email 打錯 |
| 說「使用期限到了」 | 名單的期限過了;在「名單」改期限,或用「整班操作」延長 |
| 畫面上方「連不上伺服器」 | `config.js` 的 `api` 網址錯,或 `ALLOWED_ORIGINS` 和網站網域不一致(CORS) |
| 出 `bad_content` | 內容匯入格式錯,畫面會列出第幾筆、什麼問題 |
| 沒有題目 / 「題目還在準備中」 | `g_curriculum` 沒匯入,或題庫沒有該章題目(看後台「題庫」分頁) |
| 沒聲音 | 手機要先點一下畫面才會播;檢查 `config.js` 的 `audio: true`;設定裡有沒有靜音 |
| 圖片是表情符號 | 該張圖還沒放進 `assets/art/`,或檔名不對 |
| 想復原後端 | `npx wrangler rollback`(退回前一版);前端用 `git revert HEAD` 再 `git push` |

資料庫的備份建議:大改之前執行 `npx wrangler d1 export math-class --remote --output=backup.sql`。
