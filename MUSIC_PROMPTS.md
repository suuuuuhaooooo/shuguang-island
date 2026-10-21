# 給 Manus 的背景音樂提示詞(3 首,中世紀風,可無縫循環)

參考曲:你附的 `bgm.mp3`(約 2 分 41 秒,中世紀奇幻、木質/弦樂/木管為主)。
**注意**:那首結尾是漸弱到靜音,所以直接拿去循環會有明顯的「斷掉再重來」。新的三首要做成「結尾接得回開頭」。

## 共同規格(每一首都要貼)

```
Create an instrumental background music track for a children's educational RPG game
(a cozy medieval fantasy island, warm and storybook-like, NOT dark or epic).
Reference style: acoustic medieval/folk fantasy — lute, harp, soft strings, flute/recorder,
light hand percussion, gentle and friendly. No vocals, no lyrics, no sudden loud sounds.

CRITICAL — it must loop seamlessly:
- Length 2:00 to 2:30, a whole number of bars.
- NO fade-in, NO fade-out, NO intro build-up, NO final ending/outro, NO final cadence.
- The last bar must flow naturally into the first bar (end on the chord/phrase that leads back
  to the opening chord). Same key, same tempo throughout, no tempo changes, no key changes.
- Do not let reverb/delay tails ring past the end: the tail of the last bar must be
  mixed back onto the start (or crossfaded) so there is no silence and no click at the join.
- Consistent loudness throughout (target about -16 LUFS, peaks below -1 dBFS), no long silences,
  nothing that jumps out when it repeats for 30+ minutes. Calm enough to sit behind math practice.
Export: MP3 192 kbps, 44.1 kHz, stereo.
After exporting, VERIFY the loop: concatenate the file with itself and check that the join point
has no silence, no click and no tempo/beat shift; if there is any, fix it before delivering.
```

## 曲目一:晨曦廣場(檔名 `bgm_a.mp3`)——明亮、輕快的城鎮早晨

```
Track A "Morning Plaza": bright, cheerful medieval village morning. Around 100 BPM, major key (D major or G major),
lively lute and pizzicato strings carrying a catchy simple melody, wooden flute answering,
light tambourine and hand drum, warm harp arpeggios. Feels like a bustling friendly town square
at sunrise, hopeful and playful. Simple, memorable, repeating 8-bar phrases.
```

## 曲目二:森林小徑(檔名 `bgm_b.mp3`)——悠閒、放鬆、適合專心做題

```
Track B "Forest Path": relaxed, dreamy medieval forest walk. Around 76 BPM, gentle 6/8 or 3/4 feel,
soft harp and acoustic guitar/lute arpeggios, warm cello and viola pads, breathy flute or ocarina melody,
very light percussion (soft frame drum / shaker) or none. Calm, peaceful, a little mysterious but safe.
Low energy, minimal dynamics, ideal as a concentration background while solving problems.
```

## 曲目三:星空營火(檔名 `bgm_c.mp3`)——溫暖、夜晚、帶一點冒險感

```
Track C "Starlit Campfire": warm night-time medieval fantasy camp. Around 88 BPM, minor-leaning but cozy
(A minor / E minor with warm major lifts), fingerpicked lute, soft fiddle/violin melody, low hand drum heartbeat,
subtle glockenspiel or music-box sparkles like stars, gentle choir-less pads. Nostalgic, adventurous yet comforting,
like gathering around a fire before the next quest. Never aggressive.
```

## 如果 Manus 做出來接不好(補救做法)
讓它對成品做「頭尾交叉淡化」:取最後 4 秒和最前面 4 秒做等功率交叉淡化(equal-power crossfade),
把淡化後的片段接在曲子尾端,並把最前面那 4 秒刪掉,這樣結尾自然銜接開頭。
做完再把檔案接自己兩次聽接點。

## 放進網站
把三個檔案放到 `assets/audio/`:`bgm_a.mp3`、`bgm_b.mp3`、`bgm_c.mp3`,commit、push。
玩家在「設定 → 曲目」選「晨曦廣場 / 森林小徑 / 星空營火 / 依場景自動」。
選了曲目後,地圖和練習會播那一首;對戰與勝利仍用各自的音樂。
(網站用記憶體解碼循環播放,所以只要檔案本身頭尾接得上,播放時就不會有空白。)
