"""Limpieza de textos en espanol para Finanverso: caracteres invisibles, espacios raros y muletillas.
Sin red, sin ficheros propios, solo stdlib. Lee de la entrada estandar y escribe en la salida.

Uso: python3 -I limpiar.py < borrador.txt > limpio.txt   (el informe va a stderr)
No oculta que un texto lo haya redactado una IA: solo quita ruido y frases de relleno.
"""
import re
import sys
import unicodedata

# Se conservan U+200D (une emojis) y U+FE0F (selector de emoji, no es categoria Cf).
CONSERVAR = {"‍"}
ESPACIOS_RAROS = {" ", " ", " ", " ", " ", " ", " ", "　"}
MULETILLAS = {
    "sin más dilación": "",
    "en el mundo actual": "hoy",
    "en el mundo de hoy": "hoy",
    "cabe destacar que": "",
    "es importante destacar que": "",
    "en definitiva": "",
    "sumérgete en": "mira",
    "desbloquea": "consigue",
    "revoluciona": "mejora",
    "descubre cómo": "mira cómo",
    "no te lo vas a creer": "",
    "increíble": "",
}
REVISAR_A_MANO = [
    (r"no solo .{1,60}, sino (que )?también", "estructura «no solo..., sino también»: reescribe más directo"),
    (r"\b(perfecto|perfecta|exacto|exacta|garantizado|garantizada|gestor)\b", "palabra no permitida en Finanverso"),
    (r"—", "raya larga: úsala solo si es un diálogo"),
]


def limpiar(texto):
    """Devuelve (texto_limpio, informe: list[str])."""
    informe = []
    n_inv = 0
    n_esp = 0
    salida = []
    for c in texto:
        if c in ESPACIOS_RAROS:
            salida.append(" ")
            n_esp += 1
        elif unicodedata.category(c) == "Cf" and c not in CONSERVAR:
            n_inv += 1
        else:
            salida.append(c)
    t = "".join(salida)
    if n_esp:
        informe.append("%d espacios raros cambiados por espacio normal" % n_esp)
    if n_inv:
        informe.append("%d caracteres invisibles eliminados" % n_inv)
    for frase, sust in MULETILLAS.items():
        patron = re.compile(r"\b" + re.escape(frase) + r"\b[,]?", re.IGNORECASE)
        if patron.search(t):
            t = patron.sub(sust, t)
            informe.append("muletilla «%s» %s" % (frase, "quitada" if not sust else "cambiada por «%s»" % sust))
    t = re.sub(r"[ \t]{2,}", " ", t)
    t = re.sub(r" +([,.;:!?])", r"\1", t)
    t = re.sub(r"(?m)^[ ,]+", "", t)
    t = "\n".join(l.rstrip() for l in t.splitlines()).strip()
    for patron, aviso in REVISAR_A_MANO:
        if re.search(patron, t, re.IGNORECASE):
            informe.append("REVISAR A MANO: " + aviso)
    return t, informe


def main():
    t, informe = limpiar(sys.stdin.read())
    sys.stdout.write(t + "\n")
    for i in informe:
        sys.stderr.write(i + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
