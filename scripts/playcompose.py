"""Compone las capturas de Google Play (titular + marco) y el gráfico de cabecera de Finanverso.

Entrada: build/playshots/*.png (teléfono) y build/playshots-t/*.png (tablet), de scripts/playshots.mjs.
Salida:  docs/marketing/play-screenshots/0N-*.png (1080x1920), tablet/0N-*.png (1600x2560),
         feature-graphic-1024x500.png y docs/marketing/assets/play-store-header.png.
Todo en RGB (sin alfa), como pide Play. Falla si algún texto dice «Money Manager».
Uso, desde la raíz del repo: python3 scripts/playcompose.py
"""
import os
import re

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = "docs/marketing/play-screenshots"
# Orden y titulares de docs/marketing/play-listing.md
CAPS = [
    ("01-home", "Sabe a dónde va tu dinero", "Tu mes de un vistazo"),
    ("02-forecast", "¿Llegas a fin de mes?", "Mira cuánto puedes gastar al día"),
    ("03-budgets", "Ponle límite a cada categoría", "Con avisos antes de pasarte"),
    ("04-renta", "Haz tu Renta paso a paso", "Deducciones y resultado estimado, en 9 pasos"),
    ("05-autonomos", "Tus modelos 130 y 303 listos para copiar", "Borrador del trimestre, casilla a casilla"),
    ("06-investments", "Cripto y fondos: ganancias listas para Renta WEB", "Importa los archivos de tu exchange o tu banco"),
    ("07-goals", "Ahorra para lo que importa", "Metas con progreso y fecha"),
    ("08-invite", "Invita a un amigo y gana Premium", "Hasta 5 meses gratis para ti"),
]
for _, title, sub in CAPS:
    if re.search(r"money\s*manager", title + sub, re.I):
        raise SystemExit("Texto con la marca antigua: " + title)

# Fondo: azul noche de la app hacia el verde azulado del logo
TOP = (18, 92, 96)
BOTTOM = (8, 12, 28)
SUB = (200, 236, 228)


def font(size, bold=True):
    return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size, index=1 if bold else 0)


def background(w, h):
    # Diagonal gradient, drawn small and scaled up (smooth, no numpy needed)
    sw, sh = 64, 64
    small = Image.new("RGB", (sw, sh))
    px = small.load()
    for y in range(sh):
        for x in range(sw):
            t = min(1, (y / (sh - 1)) * 0.95 + (x / (sw - 1)) * 0.2)
            px[x, y] = tuple(round(a * (1 - t) + b * t) for a, b in zip(TOP, BOTTOM))
    return small.resize((w, h), Image.BICUBIC)


def wrap(draw, text, fnt, width):
    lines, line = [], ""
    for word in text.split():
        probe = (line + " " + word).strip()
        if draw.textlength(probe, font=fnt) <= width:
            line = probe
        else:
            lines.append(line)
            line = word
    lines.append(line)
    return lines


def headline(draw, text, sizes, width, max_lines=2):
    for size in sizes:
        fnt = font(size)
        lines = wrap(draw, text, fnt, width)
        if len(lines) <= max_lines:
            return fnt, lines
    return fnt, lines


def compose(name, title, sub, shots, W, H, margin, sizes, sub_size, frame, inset, radius):
    im = background(W, H)
    d = ImageDraw.Draw(im)
    fnt, lines = headline(d, title, sizes, W - 2 * margin)
    y = int(margin * 1.4)
    for line in lines:
        d.text((margin, y), line, font=fnt, fill="white")
        y += int(fnt.size * 1.15)
    sfnt = font(sub_size, False)
    d.text((margin, y + int(sub_size * 0.5)), sub, font=sfnt, fill=SUB)
    fx0, fy0, fx1 = frame
    d.rounded_rectangle((fx0, fy0, fx1, H + 400), radius=radius + inset, fill=(10, 14, 28), outline=(70, 160, 150), width=4)
    shot = Image.open(f"{shots}/{name}.png").convert("RGB")
    sw = fx1 - fx0 - 2 * inset
    sh = int(shot.height * sw / shot.width)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw, sh + 400), radius=radius, fill=255)
    im.paste(shot, (fx0 + inset, fy0 + inset), mask)
    return im


os.makedirs(OUT, exist_ok=True)
for name, title, sub in CAPS:
    im = compose(name, title, sub, "build/playshots", 1080, 1920, 70, range(86, 60, -4), 42, (108, 468, 972), 14, 84)
    im.save(f"{OUT}/{name}.png", optimize=True)
print("teléfono ok")

if os.path.isdir("build/playshots-t"):
    os.makedirs(f"{OUT}/tablet", exist_ok=True)
    for name, title, sub in CAPS:
        if not os.path.exists(f"build/playshots-t/{name}.png"):
            continue
        im = compose(name, title, sub, "build/playshots-t", 1600, 2560, 100, range(110, 80, -4), 58, (80, 590, 1520), 20, 48)
        im.save(f"{OUT}/tablet/{name}.png", optimize=True)
    print("tablet ok")


# ---- Gráfico de cabecera (1024x500): logo, nombre y lo que hace la app
def feature(path, chips):
    W, H = 1024, 500
    im = background(W, H)
    d = ImageDraw.Draw(im)
    logo = Image.open("frontend/public/logo-512.png").convert("RGBA").resize((290, 290), Image.LANCZOS)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((70, 110, 310, 390), fill=(40, 200, 160, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    im.paste(glow, (0, 0), glow)
    im.paste(logo, (40, 105), logo)
    x = 340
    d.text((x, 120 if chips else 150), "Finanverso", font=font(92), fill="white")
    d.text((x, 240 if chips else 270), "Gastos, ahorro, Renta y autónomos", font=font(34, False), fill=SUB)
    d.text((x, 285 if chips else 315), "Gratis, en español y sin anuncios", font=font(30, False), fill=(150, 200, 195))
    if chips:
        cx, cy, cf = x, 350, font(24)
        for c in chips:
            w = int(d.textlength(c, font=cf)) + 36
            d.rounded_rectangle((cx, cy, cx + w, cy + 46), radius=23, fill=(16, 60, 66), outline=(70, 170, 155), width=2)
            d.text((cx + 18, cy + 10), c, font=cf, fill="white")
            cx += w + 12
    im.convert("RGB").save(path, optimize=True)


feature(f"{OUT}/feature-graphic-1024x500.png", None)
feature("docs/marketing/assets/play-store-header.png", ["Presupuestos", "Renta guiada", "Modelos 130 y 303"])
print("cabecera ok")
