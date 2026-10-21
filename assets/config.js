/* 數光島前端設定。api 是數光島 Worker 的網址；firebase 設定和數學筆記本共用同一個專案。 */
window.SI_CONFIG = {
  api: "https://shuguang-island-api.suuuuuhaooooo.workers.dev",
  firebase: {
    apiKey: "AIzaSyAw8FAsZkFl4bQFQCMCj7HY1bjeOS7XOmw",
    authDomain: "math-illustration.firebaseapp.com",
    projectId: "math-illustration",
    appId: "1:189482002176:web:6c76c566eda2eea787b5e5"
  },
  /* 美術圖放進 assets/art/ 之後改成 true。檔名規則見 gemini-task-pack.md，例如 assets/art/npc_01.webp、item_carrot.webp、map_loc_01.webp。
     還沒有圖的時候用表情符號占位。 */
  art: true,
  /* 音樂與音效檔放進 assets/audio/ 之後改成 true(bgm_town.mp3、bgm_quiz.mp3、bgm_battle.mp3、bgm_win.mp3、sfx_*.mp3)。false 時用瀏覽器即時合成的簡單音樂。 */
  audio: true,
  /* 循環動態影片放進 assets/video/(title.mp4、world.mp4、battle.mp4,6–10 秒、可無縫循環、小於 3MB)之後改成 true。沒有影片時,畫面本來就有 SVG 動畫。 */
  video: false,
  /* 題庫圖片(SVG/PNG)放在「數學筆記本」網站的 assets/q/ 底下。把筆記本網站的題圖資料夾網址填在這裡(結尾要有 /),
     例如 "https://你的帳號.github.io/筆記本repo名/assets/q/";留空就讀本站的 assets/q/。 */
  qBase: "",
  idleMinutes: 20
};
