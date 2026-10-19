"""
Builds src/modules/finances/application/aeatFiles/designs.ts from the official record designs
(diseños de registro) of the AEAT, so that the file writer and its reader share one table.

The designs are not kept in the repository. Download them into a folder of your own (they are public):
  https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos/dr111e16v18.xls
  https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos/DR115e15v13.xls
  https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos/DR130e15v12.xls
  https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos_26/DR131_2026.xlsx
  https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_300_399/archivos_26/DR303e26v101.xlsx
  https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_300_399/archivos_25/dr390e2025.xlsx

Then (needs xlrd and openpyxl):
  python3 -I scripts/aeatfiles/extract-designs.py <folder> src/modules/finances/application/aeatFiles/designs.ts
  npx prettier --write src/modules/finances/application/aeatFiles/designs.ts
"""
import os
import re
import sys

SOURCES = {
    "111": ("dr111e16v18.xls", ["dr M11101"]),
    "115": ("DR115e15v13.xls", ["DR 11501"]),
    "130": ("DR130e15v12.xls", ["DR 13001"]),
    # Page 1, the page of each activity in modules (DPA) and the account (DID).
    "131": ("DR131_2026.xlsx", ["Pág. 1", "DPA", "DID"]),
    # Page 5 (prorratas, sectors) holds boxes the app does not work out; page 2 is the simplified
    # regime (módulos).
    "303": ("DR303e26v101.xlsx", ["DP30301", "DP30302", "DP30303", "DP30304", "DP303DID"]),
    # Page 5 (simplified regime) and 8 (differentiated sectors) are left out for the same reason.
    "390": ("dr390e2025.xlsx", ["Pág. 1", "Pág. 2", "Pág. 2 bis", "Pág. 3", "Pág. 4", "Pág. 6", "Pág. 7"]),
}


def rows_of(path):
    if path.endswith(".xls"):
        import xlrd

        wb = xlrd.open_workbook(path)
        for sh in wb.sheets():
            yield sh.name, [[sh.cell_value(r, c) for c in range(sh.ncols)] for r in range(sh.nrows)]
    else:
        import openpyxl

        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        for sh in wb.worksheets:
            yield sh.title, [list(r) for r in sh.iter_rows(values_only=True)]


def num(v):
    try:
        f = float(v)
        return int(f) if f.is_integer() else None
    except (TypeError, ValueError):
        return None


def text(v):
    return "" if v is None else str(v).replace("\n", " ").strip()


def fields_of(rows):
    header = None
    out = []
    for r in rows:
        cells = [text(c) for c in r]
        if header is None:
            if "Posic." in cells:
                header = cells
            continue
        ip = header.index("Posic.")
        idesc = header.index("Descripción")
        icont = header.index("Contenido") if "Contenido" in header else None
        if len(cells) <= idesc:
            continue
        n, pos, ln = num(r[0]), num(r[ip]), num(r[ip + 1])
        if n is None or pos is None or ln is None:
            continue
        desc = cells[idesc]
        cont = cells[icont] if icont is not None and icont < len(cells) else ""
        boxes = re.findall(r"\[\s*(\d+)\s*\]", desc)
        out.append(
            {"n": n, "pos": pos, "len": ln, "type": cells[ip + 2], "desc": desc, "content": cont,
             "box": boxes[-1] if boxes else None}
        )
    return out


def page_of(model, fields):
    consts = [re.search(r'"([^"]*)"', f["content"]) for f in fields[:4]]
    page = consts[2].group(1)
    tail = consts[3].group(1)
    tag = (page + tail).rstrip(">")
    if model == "130":
        # The 130 design writes the box first and its formula after: «[03 ]Rendimiento neto ([01] - [02])».
        for f in fields:
            first = re.search(r"\[\s*(\d+)\s*\]", f["desc"])
            f["box"] = first.group(1) if first else None
    if model == "115":
        # «Resultado a ingresar [03] - [04]» (position 175) is box 05 of the form.
        for f in fields:
            if f["pos"] == 175:
                f["box"] = "05"
    if model == "111":
        # The 111 design names its boxes only by text: fields 12-41 are boxes 01-30, in order.
        for f in fields:
            if 12 <= f["n"] <= 41:
                f["box"] = f"{f['n'] - 11:02d}"
    last = fields[-1]
    length = last["pos"] + last["len"] - 1
    kept = []
    for f in fields[4:-1]:
        if re.match(r"(?i)reservado", f["desc"]):
            continue
        constant = re.search(r'Constante\s+"(\d+)"', f["content"])
        kept.append((f["pos"], f["len"], f["type"], f["box"], constant.group(1) if constant else None))
    return tag, length, kept


def ts_value(v):
    if v is None:
        return "null"
    if isinstance(v, int):
        return str(v)
    return "'" + v + "'"


def main(folder, out):
    lines = [
        "// Generated by scripts/aeatfiles/extract-designs.py from the record designs of the AEAT.",
        "// Do not edit by hand: download the designs again and run the script.",
        "",
        "/** An = letters, digits and blanks; A = letters; Num = unsigned number; N = signed number. */",
        "export type FieldType = 'An' | 'A' | 'Num' | 'N';",
        "/** Position (from 1), length, type, box («casilla») and the constant the design fixes. */",
        "export type Field = readonly [number, number, FieldType, string | null, string | null];",
        "export interface PageDesign {",
        "  /** «01000», «DID00»…: the page goes between «<T» + model + tag + «>» and «</T» + model + tag + «>». */",
        "  tag: string;",
        "  length: number;",
        "  fields: readonly Field[];",
        "}",
        "",
        "export type DesignModel = " + " | ".join(f"'{m}'" for m in SOURCES) + ";",
        "",
        "export const DESIGNS: Record<DesignModel, readonly PageDesign[]> = {",
    ]
    for model, (name, sheets) in SOURCES.items():
        found = dict(rows_of(os.path.join(folder, name)))
        lines.append(f"  /** {name} */")
        lines.append(f"  '{model}': [")
        for sheet in sheets:
            tag, length, kept = page_of(model, fields_of(found[sheet]))
            lines.append(f"    {{ tag: '{tag}', length: {length}, fields: [")
            for f in kept:
                lines.append("      [" + ", ".join(ts_value(v) for v in f) + "],")
            lines.append("    ] },")
        lines.append("  ],")
    lines.append("};")
    lines.append("")
    with open(out, "w") as fh:
        fh.write("\n".join(lines))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
