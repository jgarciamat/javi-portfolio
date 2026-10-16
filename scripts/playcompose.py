import numpy as np
from PIL import Image, ImageDraw, ImageFont
CAPS = {
 "01-home": ("Sabe a dónde va tu\ndinero", "Tu mes de un vistazo"),
 "02-budgets": ("Ponle límite a cada\ncategoría", "Con avisos antes de pasarte"),
 "03-goals": ("Ahorra para lo que\nimporta", "Metas con progreso y fecha"),
 "04-forecast": ("¿Llegas a fin de mes?", "Mira cuánto puedes gastar al día"),
 "05-analysis": ("Descubre lo que pagas\nsin usar", "Detecta tus suscripciones"),
 "06-household": ("Finanzas en pareja", "Comparte movimientos, presupuestos y\nmetas"),
}
W, H = 1080, 1920
def font(size, bold=True):
    return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size, index=1 if bold else 0)
yy, xx = np.mgrid[0:H, 0:W]
t = np.clip((yy / H) * 0.9 + (xx / W) * 0.25, 0, 1)[..., None]
c0 = np.array([98, 108, 245.0]); c1 = np.array([10, 10, 34.0])
bg = Image.fromarray((c0 * (1 - t) + c1 * t).astype("uint8"), "RGB")
for name, (title, sub) in CAPS.items():
    im = bg.copy(); d = ImageDraw.Draw(im)
    d.multiline_text((70, 105), title, font=font(86), fill="white", spacing=14)
    d.multiline_text((70, 340), sub, font=font(42, False), fill=(220, 222, 252), spacing=8)
    # phone frame
    fx0, fy0, fx1 = 108, 468, 972
    d.rounded_rectangle((fx0, fy0, fx1, H + 400), radius=100, fill=(14, 16, 32), outline=(86, 92, 170), width=4)
    shot = Image.open(f"build/playshots/{name}.png").convert("RGB")
    sw = 836; sh = int(shot.height * sw / shot.width)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw, sh + 200), radius=84, fill=255)
    im.paste(shot, (122, 482), mask)
    im.save(f"build/playshots/out-{name}.png")
print("ok")

# ---- tablet (10" and 7"): 1600x2560 portrait, tablet frame
import os
if os.path.isdir("build/playshots-t"):
    TW, TH = 1600, 2560
    yy, xx = np.mgrid[0:TH, 0:TW]
    t = np.clip((yy / TH) * 0.9 + (xx / TW) * 0.25, 0, 1)[..., None]
    tbg = Image.fromarray((c0 * (1 - t) + c1 * t).astype("uint8"), "RGB")
    for name, (title, sub) in CAPS.items():
        if not os.path.exists(f"build/playshots-t/{name}.png"): continue
        im = tbg.copy(); d = ImageDraw.Draw(im)
        d.multiline_text((100, 140), title.replace("\n", " "), font=font(124), fill="white", spacing=18)
        d.multiline_text((100, 360), sub.replace("\n", " "), font=font(60, False), fill=(220, 222, 252))
        d.rounded_rectangle((80, 560, 1520, TH + 400), radius=70, fill=(14, 16, 32), outline=(86, 92, 170), width=5)
        shot = Image.open(f"build/playshots-t/{name}.png").convert("RGB")
        sw = 1400; sh = int(shot.height * sw / shot.width)
        shot = shot.resize((sw, sh), Image.LANCZOS)
        mask = Image.new("L", (sw, sh), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw, sh + 200), radius=48, fill=255)
        im.paste(shot, (100, 580), mask)
        im.save(f"build/playshots-t/out-{name}.png")
    print("tablet ok")
