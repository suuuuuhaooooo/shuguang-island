"""為新增的作物/動物/造型產生「占位圖」:拿既有圖片調色(色相偏移)。
目標檔已存在就跳過,所以 Gemini 畫好同名 webp 放進 assets/art 後,不會被覆蓋。
用法(在前端專案根目錄):python3 tools/mkart.py  (需要 pillow、numpy、node)"""
import json, subprocess, os, sys
import numpy as np
from PIL import Image
ART = os.path.join(os.path.dirname(__file__), "..", "assets", "art")
CAT = os.environ.get("CATALOG", os.path.join(os.path.dirname(__file__), "..", "..", "shuguang-island-api", "tools", "catalog.mjs"))
cat = json.loads(subprocess.check_output(["node", "-e", f'import("file://{os.path.abspath(CAT)}").then(m=>console.log(JSON.stringify(m)))']))

def tint(src, dst, hue, bri=1.0):
    d = os.path.join(ART, dst + ".webp")
    if os.path.exists(d): return 0
    s = os.path.join(ART, src + ".webp")
    if not os.path.exists(s): print("缺來源", src); return 0
    im = Image.open(s).convert("RGBA"); a = im.getchannel("A")
    hsv = np.array(im.convert("RGB").convert("HSV"), dtype=np.int32)
    hsv[..., 0] = (hsv[..., 0] + int(hue / 360 * 256)) % 256
    if bri < 1: hsv[..., 1] = (hsv[..., 1] * (0.6 + 0.4 * bri)).astype(np.int32)  # 變暗時也稍微降飽和,比較自然
    hsv[..., 2] = np.clip(hsv[..., 2] * bri, 0, 255)
    out = Image.fromarray(hsv.astype(np.uint8), "HSV").convert("RGB").convert("RGBA"); out.putalpha(a)
    out.save(d, "WEBP", quality=88, method=6); return 1

n = 0
for c in cat["CROPS"]:
    cid, src, hue = c[0], c[9], c[10]
    for k in range(4): n += tint(f"crop_{src}_{k}", f"crop_{cid}_{k}", hue)
    n += tint(f"seed_{src}", f"seed_{cid}", hue)
    ysrc = "star_flower" if src == "star" else src; yid = "star_flower" if cid == "star" else cid
    n += tint(ysrc, yid, hue)
for a in cat["ANIMALS"]:
    aid, pid, src, hue = a[0], a[2], a[10], a[11]
    n += tint(f"an_{src}", f"an_{aid}", hue); n += tint(f"animal_{src}", f"animal_{aid}", hue)
    n += tint("egg" if src == "chicken" else "wool", pid, hue)
n += tint("feed_grain", "feed_fruit", 300); n += tint("feed_hay", "feed_star", 200)
for l in cat["LOOKS"]: n += tint(l[5], l[0], l[6], l[7])
print("新增占位圖", n, "張")
