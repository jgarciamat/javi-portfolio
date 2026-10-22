"""Esquema de tiempos de un guion de Reel de Finanverso. Sin red, sin ficheros, solo stdlib.

Uso: python3 -I tiempos.py < guion.txt   (una linea de locucion por cada bloque)
Ritmo por defecto 150 palabras/minuto (claro para personas mayores). Limite del video: 59 s.
"""
import re
import sys

WPM = 150.0
GANCHO_MAX = 3.0
BLOQUE_MAX = 6.0
TOTAL_MAX = 59.0
CIERRE = 4.2  # cierre fijo del render (logo y Google Play)


def _n(texto):
    return len(re.findall(r"[\wáéíóúüñÁÉÍÓÚÜÑ]+", texto))


def esquema(texto, wpm=WPM, cierre=CIERRE):
    """Devuelve (bloques, avisos). Cada bloque: dict(n, inicio, dur, texto, etiqueta)."""
    if wpm <= 0:
        raise ValueError("wpm debe ser positivo")
    lineas = [l.strip() for l in texto.splitlines() if l.strip()]
    bloques, t = [], 0.0
    for i, l in enumerate(lineas, 1):
        dur = _n(l) / (wpm / 60.0)
        etiqueta = "GANCHO" if i == 1 else ("REMATE" if i == len(lineas) else "")
        bloques.append({"n": i, "inicio": round(t, 1), "dur": round(dur, 1), "texto": l, "etiqueta": etiqueta})
        t += dur
    avisos = []
    if not bloques:
        return bloques, ["Guion vacio"]
    if bloques[0]["dur"] > GANCHO_MAX:
        avisos.append("El gancho dura %.1f s (maximo %.0f s)" % (bloques[0]["dur"], GANCHO_MAX))
    for b in bloques[1:]:
        if b["dur"] > BLOQUE_MAX:
            avisos.append("Bloque %d dura %.1f s: partelo" % (b["n"], b["dur"]))
    total = t + cierre
    if total > TOTAL_MAX:
        avisos.append("Total %.1f s con cierre: pasa de %.0f s" % (total, TOTAL_MAX))
    return bloques, avisos


def main():
    bloques, avisos = esquema(sys.stdin.read())
    for b in bloques:
        print("%5.1f s  %4.1f s  %-6s %s" % (b["inicio"], b["dur"], b["etiqueta"], b["texto"]))
    for a in avisos:
        print("AVISO: " + a)
    return 1 if avisos else 0


if __name__ == "__main__":
    sys.exit(main())
