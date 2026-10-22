"""Control de ganchos para Reels de Finanverso. Solo biblioteca estandar, sin red ni ficheros.

Uso: python3 -I ganchos.py "Deja de apuntar gastos a mano" ["otro gancho" ...]
Devuelve una puntuacion orientativa 0-100 y avisos. No predice visualizaciones.
"""
import re
import sys

PROHIBIDAS = ("perfecto", "perfecta", "exacto", "exacta", "garantizado", "garantizada",
              "gestor", "gestoria", "no confirmado", "sin riesgo", "100 %", "100%")
SALUDOS = ("hola", "buenas", "bienvenid", "en este video", "en este vídeo", "hoy os", "hoy te")
NUMEROS = ("un", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez",
           "doce", "veinte", "treinta", "cien")
TENSION = ("error", "errores", "deja de", "nadie", "antes de", "no necesitas", "sin perderte",
           "evita", "ojo", "plazo", "multa", "olvida", "cuidado", "ahorra", "ahorro")
DIRIGIDO = ("tu", "tus", "te", "ti", "si ", "usted")
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")


def _palabras(t):
    return re.findall(r"[\wáéíóúüñÁÉÍÓÚÜÑ]+", t.lower())


def evaluar(gancho):
    """Devuelve {'puntos': int, 'veredicto': str, 'avisos': [str], 'bloqueos': [str]}."""
    t = gancho.strip()
    low = t.lower()
    pal = _palabras(t)
    n = len(pal)
    avisos, bloqueos = [], []
    for p in PROHIBIDAS:
        if p in low:
            bloqueos.append("Palabra o promesa no permitida: «%s»" % p)
    for s in SALUDOS:
        if low.startswith(s):
            bloqueos.append("Empieza con saludo o preambulo: «%s»" % s)
    if "#" in t or EMOJI.search(t):
        bloqueos.append("El gancho no lleva hashtags ni emojis")
    if n == 0:
        return {"puntos": 0, "veredicto": "VACIO", "avisos": ["Gancho vacio"], "bloqueos": bloqueos}
    largo = 100 if 4 <= n <= 12 else max(0, 100 - 12 * (n - 12)) if n > 12 else 100 - 25 * (4 - n)
    if n > 12:
        avisos.append("Demasiado largo (%d palabras): cabe en 3 s con 12 o menos" % n)
    if n < 4:
        avisos.append("Demasiado corto (%d palabras)" % n)
    concreto = bool(re.search(r"\d", t)) or any(w in NUMEROS for w in pal)
    espec = 100 if concreto else 45
    if not concreto:
        avisos.append("Sin dato concreto (numero, plazo o paso)")
    tension = 100 if any(k in low for k in TENSION) else 50
    if tension == 50:
        avisos.append("Sin tension ni beneficio claro")
    dirigido = 100 if any((" " + w + " ") in (" " + low + " ") or low.startswith(w) for w in DIRIGIDO) else 50
    if dirigido == 50:
        avisos.append("No se dirige al espectador (tu, te, si...)")
    notas = [largo, espec, tension, dirigido]
    puntos = round(sum(notas) / len(notas) * 0.6 + min(notas) * 0.4) - 15 * len(bloqueos)
    puntos = max(0, min(100, puntos))
    if bloqueos:
        veredicto = "NO USAR"
    elif puntos >= 70:
        veredicto = "BUENO"
    elif puntos >= 50:
        veredicto = "MEJORABLE"
    else:
        veredicto = "FLOJO"
    return {"puntos": puntos, "veredicto": veredicto, "avisos": avisos, "bloqueos": bloqueos}


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    for g in argv:
        r = evaluar(g)
        print("%3d  %-10s %s" % (r["puntos"], r["veredicto"], g))
        for m in r["bloqueos"] + r["avisos"]:
            print("      - " + m)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
