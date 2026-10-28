"""Crop, resize and convert every source photo into assets/img as WebP.

Run from the project root:  python _src/tools/process_images.py
"""
import os
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DL = r"C:/Users/PC/Downloads/jabreel"
RAW = os.path.join(ROOT, "_src", "raw")
OUT = os.path.join(ROOT, "assets", "img")
os.makedirs(OUT, exist_ok=True)


def save(im, name, width=1600, q=78):
    im = ImageOps.exif_transpose(im).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + ".webp"), "WEBP", quality=q, method=6)


def src(path):
    return Image.open(path)


# ---- Provided photography -------------------------------------------------
save(src(f"{DL}/a690ab84-4d48-41d8-84ca-a9675dda0f43.jpg"), "hero-harare", 2400)
save(src(f"{DL}/vTgfLwZ.jpeg"), "home-hillside-pool", 1800)
save(src(f"{DL}/-1x-1.webp"), "home-glass-hilltop", 2000)
save(src(f"{DL}/000_par8321605-scaled.jpg"), "estate-golf", 2000)
save(src(f"{DL}/BGKY7HX.jpeg"), "aerial-homestead", 1600)
save(src(f"{DL}/images.jpg"), "render-clusters", 790)
save(src(f"{DL}/istockphoto-1302659815-612x612.jpg"), "harare-clouds", 612)
# The two iStock images (couple, family) are unlicensed watermarked comps and are
# deliberately NOT published. Once licensed, export the clean files here as
# people-couple / people-family and swap them back into services.html and index.html.
save(src(f"{RAW}/brand/hero_harare.jpg"), "harare-mono", 1920)

# ---- Development photography (from the firm's own listings) ---------------
for i in [1, 2, 5, 6, 3]:
    save(src(f"{RAW}/clipsham/{i}.jpg"), f"clipsham-{i}", 1200)
for i in [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 15, 17, 19]:
    save(src(f"{RAW}/ruparara/{i}.jpg"), f"ruparara-{i}", 2000)
for i in range(1, 14):
    save(src(f"{RAW}/amberwood/{i}.jpg"), f"amberwood-{i}", 1200)
save(src(f"{RAW}/borrowdale/1.img"), "borrowdale-1", 2000)
save(src(f"{RAW}/borrowdale/4.img"), "borrowdale-site", 1800)

def trim_white(im):
    """Drop edge rows/columns that are mostly collage-border white."""
    import numpy as np
    a = np.asarray(im.convert("L")) > 240
    rows, cols = a.mean(axis=1), a.mean(axis=0)
    t, b, l, r = 0, len(rows), 0, len(cols)
    while t < b - 1 and rows[t] > .6: t += 1
    while b > t + 1 and rows[b - 1] > .6: b -= 1
    while l < r - 1 and cols[l] > .6: l += 1
    while r > l + 1 and cols[r - 1] > .6: r -= 1
    return im.crop((l, t, r, b))


# The interiors sheet is a 4x3 collage of renders; cut each tile out.
sheet = src(f"{RAW}/borrowdale/2.img").convert("RGB")
cols = [(30, 492), (517, 978), (1003, 1464), (1489, 1954)]
rows = [(48, 393), (420, 778), (792, 1153)]
names = ["bedroom", "kitchen", "vanity", "shower",
         "wardrobe", "suite", "lounge", "kitchen-lounge",
         "dining", "dining-kitchen", "guest-bedroom", "main-bedroom"]
n = 0
for r in rows:
    for c in cols:
        save(trim_white(sheet.crop((c[0] + 3, r[0] + 3, c[1] - 3, r[1] - 3))), f"borrowdale-int-{names[n]}", 900, 85)
        n += 1

# ---- Brand ----------------------------------------------------------------
logo = src(f"{DL}/Jabreel+Real+Estate_horizontal+wordmark_dark.webp").convert("RGBA")
a = logo.getchannel("A")


def tint(alpha, rgb):
    im = Image.new("RGBA", alpha.size, rgb + (0,))
    im.putalpha(alpha)
    return im


tint(a, (101, 88, 74)).save(os.path.join(OUT, "logo-dark.webp"), "WEBP", lossless=True)
tint(a, (244, 240, 233)).save(os.path.join(OUT, "logo-light.webp"), "WEBP", lossless=True)
mark = a.crop((0, 0, 375, 374))
tint(mark, (101, 88, 74)).resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, "favicon.png"))
tint(mark, (244, 240, 233)).save(os.path.join(OUT, "mark-light.webp"), "WEBP", lossless=True)
tint(mark, (101, 88, 74)).save(os.path.join(OUT, "mark-dark.webp"), "WEBP", lossless=True)
print("done", len(os.listdir(OUT)), "files")
