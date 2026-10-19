"""
Builds src/modules/tools/data/renta/xml/casillas-<year>.json: the map from each element of the XML of
the modelo 100 (the «.txt» that Renta WEB downloads, root <Declaracion modelo="100">) to its box
(casilla) of the return, with its data type and description, from the AEAT's public data dictionary.

The dictionaries are not kept in the repository. Download them into an empty folder of your own:
  https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/diccionarioXSD_2025.properties
  https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/diccionarioDlgXSD_2025.properties
  https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos_24/diccionarioXSD_2024.properties
  https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos_24/diccionarioDlgXSD_2024.properties
  (and archivos_23 for 2023; the schema Renta<year>.xsd sits next to each one)

Then:
  python3 -I scripts/renta-xml/extract-map.py <folder> src/modules/tools/data/renta/xml
  npx prettier --write src/modules/tools/data/renta/xml

Each line of a dictionary is `KEY=[/xpath][type][box][description]` (ISO-8859-1). The box is a
four-digit number, `*NN` for the boxes of the personal data page, or `###` when the element has no
box (the detail windows: one line per payer, fund, property...). Of those detail elements only the
amounts of the regional deductions are kept (their bases, to mark them with what was spent).
"""
import json
import os
import re
import sys

LINE = re.compile(r"^(\w+)=\[(/[^\]]*)\]\[([^\]]*)\]\[([^\]]*)\](?:\{([^}]*)\})?\[(.*)\]\s*$")
AMOUNT = re.compile(r"^[PN]\d{3}$")
BASE = "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/"


def entries(path):
    with open(path, encoding="latin-1") as f:
        for line in f:
            m = LINE.match(line.rstrip("\r\n"))
            if m:
                yield m.group(2).lstrip("/"), m.group(3), m.group(4), m.group(5), m.group(6).strip()


def build(folder, year):
    main = os.path.join(folder, f"diccionarioXSD_{year}.properties")
    detail = os.path.join(folder, f"diccionarioDlgXSD_{year}.properties")
    boxes = {}
    for xpath, kind, box, _, label in entries(main):
        # The first line of a path wins: a few paths are listed twice (the sum and its parts).
        boxes.setdefault(xpath, [box if re.fullmatch(r"\d{4}", box) else "", kind, label])
    if os.path.exists(detail):
        for xpath, kind, box, group, label in entries(detail):
            if "/DeduccionAutonomica/" in xpath and AMOUNT.match(kind) and xpath not in boxes:
                boxes[xpath] = ["", kind, f"{group}: {label}" if group else label]
    folder_of = "" if year == 2025 else f"archivos_{str(year)[2:]}/"
    return {
        "ejercicio": year,
        "fuente": f"{BASE}{folder_of}diccionarioXSD_{year}.properties",
        "esquema": f"{BASE}{folder_of}Renta{year}.xsd",
        "comprobado": "2026-10-19",
        "nota": "Derivado del diccionario de datos público de la Agencia Tributaria (modelo 100). Ruta del elemento → [casilla, tipo, descripción].",
        "casillas": dict(sorted(boxes.items())),
    }


def main():
    folder, out = sys.argv[1], sys.argv[2]
    for name in sorted(os.listdir(folder)):
        m = re.fullmatch(r"diccionarioXSD_(\d{4})\.properties", name)
        if not m:
            continue
        year = int(m.group(1))
        data = build(folder, year)
        with open(os.path.join(out, f"casillas-{year}.json"), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=0)
        print(year, len(data["casillas"]), "elements")


main()
