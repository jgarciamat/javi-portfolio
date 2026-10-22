"""Revisor de pies (captions) de Instagram para Finanverso. Sin red, sin ficheros, solo stdlib.

Uso: python3 -I pie.py < pie.txt
Comprueba el trozo visible (~125 caracteres antes de «mas»), hashtags, cierre y avisos legales.
"""
import re
import sys

VISIBLE = 125
LIMITE = 2200
MAX_HASHTAGS = 5
CIERRE = "Disponible en Google Play y en finanverso.app"
PROHIBIDAS = ("perfecto", "perfecta", "exacto", "exacta", "garantizado", "garantizada", "gestor", "no confirmado")
FISCAL = ("renta", "irpf", "hacienda", "modelo 303", "modelo 130", "autonomo", "autónomo", "iva")


def visible(pie, corte=VISIBLE):
    """Texto que se ve antes de «mas», cortado en palabra entera."""
    t = " ".join(pie.split())
    if len(t) <= corte:
        return t
    cortado = t[:corte]
    if t[corte] != " ":
        cortado = cortado.rsplit(" ", 1)[0] if " " in cortado else cortado
    return cortado.rstrip()


def revisar(pie, corte=VISIBLE):
    """Devuelve {'visible': str, 'fallos': [str], 'avisos': [str], 'veredicto': str}."""
    fallos, avisos = [], []
    low = pie.lower()
    if len(pie) > LIMITE:
        fallos.append("Supera %d caracteres (%d)" % (LIMITE, len(pie)))
    primera = pie.strip().splitlines()[0] if pie.strip() else ""
    if not primera:
        fallos.append("Pie vacio")
    elif primera[0] in "#@":
        fallos.append("La primera linea no puede empezar por # o @")
    tags = re.findall(r"#\w+", pie)
    if len(tags) > MAX_HASHTAGS:
        fallos.append("%d hashtags (maximo %d)" % (len(tags), MAX_HASHTAGS))
    if "#finanverso" not in [t.lower() for t in tags]:
        fallos.append("Falta #finanverso")
    for p in PROHIBIDAS:
        if p in low:
            fallos.append("Palabra no permitida: «%s»" % p)
    if CIERRE.lower() not in low:
        fallos.append("Falta el cierre «%s»" % CIERRE)
    if "demostración" not in low and "demostracion" not in low:
        fallos.append("Falta el aviso «Datos de demostración»")
    if any(f in low for f in FISCAL):
        if "agencia tributaria" not in low:
            avisos.append("Tema fiscal sin «presentas tú en la Agencia Tributaria»")
        if "no es asesoramiento" not in low and "orientativo" not in low:
            avisos.append("Tema fiscal sin aviso «orientativo, no es asesoramiento»")
    vis = visible(pie, corte)
    if any(c in vis for c in "#@"):
        avisos.append("Hashtag o mencion dentro del trozo visible")
    if not re.search(r"\d", vis):
        avisos.append("El trozo visible no tiene dato concreto (numero o paso)")
    if re.search(r"https?://|www\.", pie):
        avisos.append("Los enlaces no son pulsables en pies: usa «enlace en el perfil»")
    if len(re.findall("[\U0001F300-\U0001FAFF☀-➿]", pie)) > 12:
        avisos.append("Demasiados emojis")
    veredicto = "CORREGIR" if fallos else ("REVISAR" if avisos else "LISTO")
    return {"visible": vis, "fallos": fallos, "avisos": avisos, "veredicto": veredicto}


def main():
    r = revisar(sys.stdin.read())
    print("VISIBLE (%d car.): %s" % (len(r["visible"]), r["visible"]))
    for f in r["fallos"]:
        print("FALLO: " + f)
    for a in r["avisos"]:
        print("AVISO: " + a)
    print("VEREDICTO: " + r["veredicto"])
    return 0 if r["veredicto"] == "LISTO" else 1


if __name__ == "__main__":
    sys.exit(main())
