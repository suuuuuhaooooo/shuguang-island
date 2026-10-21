#!/usr/bin/env python3
"""數光島美術小工具(需要 Pillow:pip install pillow)
用法:
  python3 tools/art_tool.py missing                 # 列出還缺哪些圖
  python3 tools/art_tool.py one  圖.png  檔名 [--size 512] [--key]      # 單張轉成 webp 放進 assets/art/
  python3 tools/art_tool.py sheet 拼圖.png --cols 3 --rows 3 --names a,b,c,... [--size 512] [--key]   # 把「N 格拼圖」切開
    --key  把背景(取四個角落的顏色)變透明。請讓 Gemini 用「純綠底 #00FF00」或「純白底」畫,去背效果最好。
"""
import sys, os, json, argparse
from PIL import Image

ART = os.path.join(os.path.dirname(__file__), "..", "assets", "art")

def manifest():
    m = {}
    def add(group, names): m.setdefault(group, []).extend(names)
    add("UI", ["logo","bg_title","bg_world","bg_page","bg_battle","btn_primary","btn_secondary","btn_green","panel","hud_pill","bar_fill","pin","pin_locked",
      "ic_crystal","ic_star","ic_heart","ic_home","ic_practice","ic_quest","ic_bag","ic_book","ic_duel","ic_settings","ic_teacher","ic_shop","ic_farm","ic_pen","ic_lock","ic_back","ic_music","ic_sound","ic_check","ic_close","cursor_default","cursor_pointer"])
    add("角色", ["body_1","body_2","body_3","hair_1","hair_2","hair_3","hair_4","hair_5","outfit_1","outfit_2","outfit_3","acc_glasses","acc_cape"])
    add("地點", [f"map_loc_{i:02d}" for i in range(1, 11)])
    add("NPC", [f"npc_{i:02d}" for i in range(1, 7)])
    add("對手", ["cpu_1","cpu_2","cpu_3"])
    add("農牧", [f"crop_{c}_{s}" for c in ("carrot","tomato","wheat","star") for s in range(4)] + ["plot_empty","pen_empty","an_chicken","an_sheep"])
    add("物品", ["carrot","tomato","wheat","egg","wool","star_flower","seed_carrot","seed_tomato","seed_wheat","seed_star","feed_hay","feed_grain","dew","plot_ext","pen_ext","animal_sheep","animal_chicken"])
    add("成就", ["ach_first_answer","ach_ten","ach_hundred","ach_first_harvest","ach_farmer","ach_rancher","ach_streak3","ach_all_domains","ach_secret","ach_duel1","ach_duel5","ach_master"])
    gp = os.path.join(os.path.dirname(__file__), "..", "assets", "data", "guardians.json")
    if os.path.exists(gp): add("守護獸", ["coll_" + x for x in json.load(open(gp))])
    return m

def key_out(im, tol=60):
    im = im.convert("RGBA"); px = im.load(); w, h = im.size
    corners = [px[0,0], px[w-1,0], px[0,h-1], px[w-1,h-1]]; kc = max(set(corners), key=corners.count)[:3]
    for y in range(h):
        for x in range(w):
            r,g,b,a = px[x,y]; d = abs(r-kc[0])+abs(g-kc[1])+abs(b-kc[2])
            if d < tol: px[x,y] = (r,g,b,0)
            elif d < tol*2:  # 邊緣半透明,減少綠邊
                px[x,y] = (r,g,b,int(255*(d-tol)/tol))
    return im

def save(im, name, size, key):
    im = key_out(im) if key else im.convert("RGBA")
    if size: im.thumbnail((size, size), Image.LANCZOS) if "x" not in str(size) else None
    os.makedirs(ART, exist_ok=True); out = os.path.join(ART, name + ".webp"); im.save(out, "WEBP", quality=88, method=6); print("✓", out, im.size)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("cmd"); ap.add_argument("src", nargs="?"); ap.add_argument("name", nargs="?")
    ap.add_argument("--cols", type=int); ap.add_argument("--rows", type=int); ap.add_argument("--names"); ap.add_argument("--size", type=int, default=512); ap.add_argument("--key", action="store_true")
    a = ap.parse_args()
    if a.cmd == "missing":
        have = {f[:-5] for f in os.listdir(ART) if f.endswith(".webp")} if os.path.isdir(ART) else set(); tot = miss = 0
        for g, names in manifest().items():
            lack = [n for n in names if n not in have]; tot += len(names); miss += len(lack)
            print(f"{g}:{len(names)-len(lack)}/{len(names)}" + (("  缺 " + ", ".join(lack[:12]) + (" …" if len(lack) > 12 else "")) if lack else "  ✅"))
        print(f"合計 {tot-miss}/{tot}")
    elif a.cmd == "one": save(Image.open(a.src), a.name, a.size, a.key)
    elif a.cmd == "sheet":
        im = Image.open(a.src).convert("RGBA"); names = a.names.split(","); w, h = im.size; cw, ch = w // a.cols, h // a.rows
        if len(names) > a.cols * a.rows: sys.exit("名字比格子多")
        for i, n in enumerate(names):
            if not n or n == "-": continue
            r, c = divmod(i, a.cols); save(im.crop((c*cw, r*ch, (c+1)*cw, (r+1)*ch)), n, a.size, a.key)
    else: ap.print_help()
main()
