"""Builds every Finanverso icon from docs/brand/finanverso-original.png (logo + wordmark on white)."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

SRC = "docs/brand/finanverso-original.png"
FE = "frontend"
RES = f"{FE}/android/app/src/main/res"
src = Image.open(SRC).convert("RGB")


def white_to_alpha(img):
    a = np.asarray(img).astype(float)
    alpha = np.clip((255 - a.min(axis=2)) / 255 * 1.6, 0, 1)  # soft threshold
    alpha = np.where(alpha < 0.03, 0, alpha)
    out = np.zeros(a.shape[:2] + (4,))
    safe = np.maximum(alpha, 1e-3)[..., None]
    out[..., :3] = np.clip((a - 255 * (1 - safe)) / safe, 0, 255)
    out[..., 3] = alpha * 255
    return Image.fromarray(out.astype("uint8"), "RGBA")


mark = white_to_alpha(src.crop((40, 178, 440, 478)))  # planet only, 400x300
mark.paste((0, 0, 0, 0), (388, 105, 400, 300))  # sliver of the "F" next to the planet
bbox = mark.getbbox()
mark = mark.crop(bbox)
word = white_to_alpha(src.crop((436, 270, 1500, 470)))
word = word.crop(word.getbbox())


def square(img, size, pad=0.0, bg=None):
    s = int(size * (1 - 2 * pad))
    r = img.copy()
    r.thumbnail((s, s), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    canvas.alpha_composite(r, ((size - r.width) // 2, (size - r.height) // 2))
    return canvas


WHITE = (255, 255, 255, 255)
os.makedirs("docs/brand", exist_ok=True)
mark.save("docs/brand/finanverso-mark.png")
Image.open(SRC).crop((40, 178, 1500, 478)).save("docs/brand/finanverso-logo.png")

# web / PWA
for name, size, pad in [("icon-512", 512, 0.12), ("icon-192", 192, 0.12), ("apple-touch-icon", 180, 0.1),
                        ("favicon-64", 64, 0.04), ("favicon-32", 32, 0.02)]:
    square(mark, size, pad, WHITE).convert("RGB" if name.startswith("icon") else "RGBA").save(f"{FE}/public/{name}.png")

# Android launcher (legacy square + round + adaptive foreground)
dens = {"mdpi": (48, 108), "hdpi": (72, 162), "xhdpi": (96, 216), "xxhdpi": (144, 324), "xxxhdpi": (192, 432)}
for d, (ic, fg) in dens.items():
    sq = square(mark, ic, 0.12, WHITE)
    sq.save(f"{RES}/mipmap-{d}/ic_launcher.png")
    m = Image.new("L", (ic, ic), 0)
    ImageDraw.Draw(m).ellipse((0, 0, ic - 1, ic - 1), fill=255)
    r = sq.copy(); r.putalpha(m); r.save(f"{RES}/mipmap-{d}/ic_launcher_round.png")
    square(mark, fg, 0.27).save(f"{RES}/mipmap-{d}/ic_launcher_foreground.png")  # inside the 66% safe zone

# splash screens: white, logo + wordmark centred
def splash(w, h):
    c = Image.new("RGBA", (w, h), WHITE)
    lw = int(w * 0.8) if w < h else int(h * 1.5)
    lg = Image.open("docs/brand/finanverso-logo.png").convert("RGB")
    lg = white_to_alpha(lg); lg = lg.crop(lg.getbbox())
    lw = min(lw, int(w * 0.7))
    lg = lg.resize((lw, int(lg.height * lw / lg.width)), Image.LANCZOS)
    c.alpha_composite(lg, ((w - lg.width) // 2, (h - lg.height) // 2))
    return c.convert("RGB")

import glob
for f in glob.glob(f"{RES}/drawable*/splash.png"):
    w, h = Image.open(f).size
    splash(w, h).save(f)

# Open Graph card 1200x630 + in-app splash logo
og = Image.new("RGB", (1200, 630), (255, 255, 255))
lg = white_to_alpha(Image.open("docs/brand/finanverso-logo.png").convert("RGB")); lg = lg.crop(lg.getbbox())
lg = lg.resize((900, int(lg.height * 900 / lg.width)), Image.LANCZOS)
og = og.convert("RGBA"); og.alpha_composite(lg, (150, 150))
d = ImageDraw.Draw(og)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 44)
except Exception:
    font = ImageFont.load_default()
t = "Todo sobre tu dinero, en un lugar"
tw = d.textlength(t, font=font)
d.text(((1200 - tw) / 2, 470), t, fill=(15, 52, 80), font=font)
og.convert("RGB").save(f"{FE}/public/og-image.png")
mark.resize((256, int(mark.height * 256 / mark.width)), Image.LANCZOS).save(f"{FE}/public/logo-mark.png")
print("ok")
