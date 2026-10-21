# 新增內容的圖片清單(給 Gemini)

目前這些圖都是「既有圖片調色」的占位圖,能玩但長得像舊圖的換色版。
畫好同名 webp 放進 assets/art/ 就會自動取代(不用改程式)。風格、畫布大小與既有圖片一致。

## 作物(每種 4 張成長階段 + 種子袋 + 收成物)
畫布 512×512 透明底。階段 0=剛種下、1=發芽、2=長大、3=可收成。

| 作物 | 成長階段檔名 | 種子袋 | 收成物 |
|---|---|---|---|
| 白蘿蔔 | crop_radish_0 ~ crop_radish_3 | seed_radish | radish (雪白蘿蔔) |
| 玉米 | crop_corn_0 ~ crop_corn_3 | seed_corn | corn (甜玉米) |
| 馬鈴薯 | crop_potato_0 ~ crop_potato_3 | seed_potato | potato (胖胖馬鈴薯) |
| 南瓜 | crop_pumpkin_0 ~ crop_pumpkin_3 | seed_pumpkin | pumpkin (橘色南瓜) |
| 草莓 | crop_strawberry_0 ~ crop_strawberry_3 | seed_strawberry | strawberry (甜甜草莓) |
| 向日葵 | crop_sunflower_0 ~ crop_sunflower_3 | seed_sunflower | sunflower (向日葵) |
| 茄子 | crop_eggplant_0 ~ crop_eggplant_3 | seed_eggplant | eggplant (紫晶茄子) |
| 西瓜 | crop_watermelon_0 ~ crop_watermelon_3 | seed_watermelon | watermelon (大西瓜) |
| 葡萄 | crop_grape_0 ~ crop_grape_3 | seed_grape | grape (葡萄串) |
| 稻米 | crop_rice_0 ~ crop_rice_3 | seed_rice | rice (珍珠稻米) |
| 月光花 | crop_moon_0 ~ crop_moon_3 | seed_moon | moon (月光花) |
| 彩虹豆 | crop_bean_0 ~ crop_bean_3 | seed_bean | bean (彩虹豆) |
| 水晶瓜 | crop_melon_0 ~ crop_melon_3 | seed_melon | melon (水晶瓜) |
| 雲棉花 | crop_cotton_0 ~ crop_cotton_3 | seed_cotton | cotton (雲棉花) |
| 烈陽椒 | crop_pepper_0 ~ crop_pepper_3 | seed_pepper | pepper (烈陽椒) |
| 黃金穗 | crop_goldear_0 ~ crop_goldear_3 | seed_goldear | goldear (黃金穗) |

## 動物(每種 2 張動物圖 + 1 張產物)
| 動物 | 畫面圖 | 商店圖 | 產物 |
|---|---|---|---|
| 小鴨 | an_duck | animal_duck | duck_egg (青色鴨蛋) |
| 兔兔 | an_rabbit | animal_rabbit | rabbit_fur (兔毛球) |
| 乳牛 | an_cow | animal_cow | milk (新鮮牛奶) |
| 小豬 | an_pig | animal_pig | truffle (松露) |
| 羊駝 | an_alpaca | animal_alpaca | alpaca_wool (羊駝絨) |
| 獨角獸 | an_unicorn | animal_unicorn | rainbow_hair (彩虹鬃毛) |
| 小龍 | an_dragon | animal_dragon | dragon_scale (龍鱗) |

飼料:feed_fruit(果乾)、feed_star(星光糧)。

## 造型(768×768 透明底,和既有 body_1 / hair_1 / outfit_1 / acc_glasses 同一個位置與大小,才疊得起來)
| 部位 | 檔名 | 名稱 | 解鎖級 |
|---|---|---|---|
| body | body_4 | 體型 D | Lv 1 |
| body | body_5 | 體型 E | Lv 1 |
| body | body_6 | 體型 F | Lv 1 |
| hair | hair_6 | 夕陽短髮 | Lv 1 |
| hair | hair_7 | 薄荷長髮 | Lv 1 |
| hair | hair_8 | 櫻花雙馬尾 | Lv 1 |
| hair | hair_9 | 海藍捲捲頭 | Lv 3 |
| hair | hair_10 | 紫晶小髮髻 | Lv 5 |
| hair | hair_11 | 金色短髮 | Lv 8 |
| hair | hair_12 | 銀白長髮 | Lv 12 |
| hair | hair_13 | 火焰雙馬尾 | Lv 16 |
| hair | hair_14 | 彩虹捲捲頭 | Lv 22 |
| hair | hair_15 | 星空長髮 | Lv 30 |
| hair | hair_16 | 極光小髮髻 | Lv 40 |
| hair | hair_17 | 傳說金髮 | Lv 50 |
| outfit | outfit_4 | 森林背心 | Lv 1 |
| outfit | outfit_5 | 天空外套 | Lv 1 |
| outfit | outfit_6 | 夕陽斗篷裝 | Lv 4 |
| outfit | outfit_7 | 草莓背心 | Lv 7 |
| outfit | outfit_8 | 薄荷外套 | Lv 11 |
| outfit | outfit_9 | 學者長袍 | Lv 15 |
| outfit | outfit_10 | 月光外套 | Lv 22 |
| outfit | outfit_11 | 火焰背心 | Lv 30 |
| outfit | outfit_12 | 極光斗篷裝 | Lv 40 |
| outfit | outfit_13 | 數光大師袍 | Lv 55 |
| acc | acc_glasses2 | 方框眼鏡 | Lv 3 |
| acc | acc_cape2 | 紫色披風 | Lv 10 |
| acc | acc_glasses3 | 酷酷墨鏡 | Lv 18 |
| acc | acc_cape3 | 金色披風 | Lv 35 |
| acc | acc_cape4 | 彩虹披風 | Lv 45 |
