#!/usr/bin/env python3
"""
Escribe docs/casos-practicos/oficiales.md (catálogo legible de oficiales.json) y resultados.md (tabla del
banco de pruebas a partir de resultados-renta.json, resultados-autonomos.json y discrepancias.json).

    cd frontend && CASOS_INFORME=1 npx jest src/__tests__/casos && npm run casos && python3 -I scripts/casos/informe.py
"""
import collections
import json
import os

BANK = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'docs', 'casos-practicos'))


def load(name):
    with open(os.path.join(BANK, name), encoding='utf-8') as fh:
        return json.load(fh)


def eur(x):
    if x is None:
        return '—'
    s = f'{abs(x):,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return ('-' if x < 0 else '') + s


def catalog():
    data = load('oficiales.json')
    cases = data['casos']
    by_model = collections.Counter(c['modelo'] for c in cases)
    by_source = collections.Counter(c['fuente']['titulo'].split(',')[0].split(' – ')[0] for c in cases)
    out = ['# Casos prácticos resueltos: catálogo', '',
           f'{len(cases)} casos con importes, comprobados el {data["comprobado"]}. Los enunciados están resumidos con palabras propias; '
           'los importes son los de la fuente. Los no oficiales van marcados y solo sirven de apoyo. JSON: `oficiales.json`.', '',
           '## Por modelo', '', '| Modelo | Casos | Oficiales |', '|---|---:|---:|']
    for m, n in sorted(by_model.items(), key=lambda x: (-x[1], x[0])):
        off = sum(1 for c in cases if c['modelo'] == m and c['fuente']['oficial'])
        out.append(f'| {m} | {n} | {off} |')
    out += ['', '## Por fuente', '', '| Fuente | Casos |', '|---|---:|']
    for s, n in by_source.most_common():
        out.append(f'| {s} | {n} |')
    out += ['', '## Casos', '']
    for c in cases:
        f = c['fuente']
        out.append(f'### {c["id"]} · modelo {c["modelo"]} · {c["apartado"]} ({c["ejercicio"]})')
        out.append('')
        out.append(f'{"Oficial" if f["oficial"] else "**No oficial (solo apoyo)**"}: [{f["titulo"]}]({f["url"]}), {f.get("seccion", "")}. '
                   f'Comprobado el {f["comprobado"]}. Reutilizable: {c["reutilizable"]}.')
        out.append('')
        out.append(c['enunciado'])
        out.append('')
        out.append('| Casilla | Concepto | Importe |')
        out.append('|---|---|---:|')
        for r in c['resultados']:
            out.append(f'| {r["casilla"] or "—"} | {r["concepto"]} | {eur(r["importe"]) if isinstance(r["importe"], (int, float)) else r["importe"]} |')
        if c.get('notas'):
            out += ['', f'Notas: {c["notas"]}']
        out.append('')
    with open(os.path.join(BANK, 'oficiales.md'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(out))


def results():
    renta = load('resultados-renta.json')['filas']
    auto = load('resultados-autonomos.json')
    disc = load('discrepancias.json')
    ok = sum(1 for r in renta if r['estado'] in ('coincide', 'corregida'))
    known = [r for r in renta if r['estado'] == 'discrepancia-conocida']
    pending = [r for r in renta if r['estado'] == 'pendiente']
    a = auto['resumen']
    out = ['# Resultados del banco de pruebas', '',
           'Cada cifra de `personas/*/esperado.json` contra el motor ACTUAL de la app. «Pendiente»: el motor no da esa cifra o la regla no se ha '
           'podido confirmar. Las discrepancias están en `discrepancias.json` con su causa probable.', '',
           '| Parte | Coinciden | Discrepancias | Pendientes o no soportadas |', '|---|---:|---:|---:|',
           f'| Renta (modelo 100, motor del frontend) | {ok} | {len(known)} | {len(pending)} |',
           f'| Autónomos 130 y 303 (motor del backend, `npm run casos`) | {a["coincide"]} | {a["discrepancia"]} | {a["noSoportado"]} |',
           f'| Casos oficiales reproducidos por el motor (`casosOficiales.test.ts`) | 9 | {len(disc["oficiales"])} | resto del catálogo |', '',
           '## Discrepancias', '', '| Severidad | Caso | Casilla | Esperado | Motor | Causa probable | Fuente |', '|---|---|---|---:|---:|---|---|']
    order = {'alta': 0, 'media': 1, 'baja': 2}
    rows = [dict(d, modelo='100') for d in disc['renta']] + disc['autonomos'] + [dict(d, caso=d['id']) for d in disc['oficiales']]
    for d in sorted(rows, key=lambda d: (order[d['severidad']], d['caso'])):
        box = d.get('casilla') or d.get('campo')
        per = f' {d["periodo"]}' if d.get('periodo') else ''
        out.append(f'| {d["severidad"]} | {d["caso"]} | {d.get("modelo", "100")}{per} {box} | {eur(d["esperado"])} | {eur(d["obtenido"])} | {d["causa"]} | {d["fuente"]} |')
    out += ['', '## Pendientes por motivo', '']
    for why, n in collections.Counter(r['motivo'] for r in pending).most_common():
        out.append(f'- {n} × {why}')
    with open(os.path.join(BANK, 'resultados.md'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(out) + '\n')


if __name__ == '__main__':
    catalog()
    results()
    print('oficiales.md y resultados.md escritos')
