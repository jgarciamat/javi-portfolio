#!/usr/bin/env python3
"""
Banco de casos prácticos de Finanverso, tercera tanda (prefijo «p3-»): 50 personas FICTICIAS más (59 a
108). El 70 % en la Comunitat Valenciana, Castilla y León y Andalucía (pueblos y costa, provincias
distintas) y el resto en las comunidades con menos casos. Temas: familias monoparentales, viudedad y
orfandad, permisos por nacimiento, subvenciones de todo tipo, el sector agrario y ganadero completo
(módulos agrarios, estimación directa, REAGP, PAC, seguros agrarios, cooperativas, retenciones del 2 % y
del 1 %, pagos fraccionados del 2 %), autónomos, pensionistas, alquileres, ganancias, hipotecas,
discapacidad, familia numerosa y deducciones autonómicas propias.

Escribe docs/casos-practicos/personas/p3-NN-<slug>/{persona.json, esperado.json, calculo.md} y
personas/p3-indice.json. Reutiliza el cálculo a mano de construir_personas2.py (renta2) y de
construir_casos.py. Los documentos los genera `node frontend/scripts/casos/run-personas3.mjs`.

    python3 -I frontend/scripts/casos/construir_personas3.py

Fuentes principales (comprobadas el 19-10-2026): Ley 35/2006 del IRPF (arts. 7.h, 7.k, 7.z, 14, 20, 30-32,
33, 45-49, 56-61, 64, 68, 81, 81 bis, 96 y DA 5.ª), Reglamento del IRPF (arts. 95.4, 109 y 110), Orden
HAC/1347/2024 de módulos para 2025 (BOE-A-2024-24949: índices del anexo I, amortizaciones, índices
correctores y reducción del 5 %), Ley 37/1992 del IVA (arts. 91, 124-134 REAGP), Manual práctico de Renta
2025 de la AEAT (casos renta-c09-01, renta-c15-02, renta-c18-01) y los catálogos autonómicos de
frontend/src/modules/tools/data/renta/ccaa/*.ts (cada deducción cita su página de la AEAT).
Todos los nombres, NIF, direcciones y cuentas son INVENTADOS.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import construir_casos as cc  # noqa: E402
import construir_personas2 as p2  # noqa: E402
from construir_casos import CHECKED, ENGINE_BOXES, BOX_LABELS, Steps, eur, nif, r2  # noqa: E402

OUT = cc.OUT
PREFIX = 'p3'
BOE_MODULOS = 'https://www.boe.es/buscar/act.php?id=BOE-A-2024-24949'
MANUAL_C09 = f'{cc.MANUAL}/c09-rendimientos-actividades-economicas-eo-fores/caso-practico.html'

CITIES = dict(p2.CITIES)
CITIES.update({'comunitat-valenciana': ('46001', 'València'), 'castilla-y-leon': ('47001', 'Valladolid'), 'andalucia': ('41001', 'Sevilla'),
               'aragon': ('50001', 'Zaragoza'), 'murcia': ('30001', 'Murcia'), 'madrid': ('28001', 'Madrid')})
p2.CITIES.update(CITIES)


def home(n, ccaa, town=None):
    cp, city = CITIES[ccaa]
    return f'Calle Ficticia {n}, {cp} {town or city} (dirección inventada)'


ss_of = p2.ss_of
payer = p2.payer
worker = p2.worker


# ─── Actividades agrarias y económicas (cálculo a mano) ─────────────────────

# Grupos de amortización en módulos agrarios (Orden HAC/1347/2024, anexo I, instrucción 2.2, y anexo II,
# instrucción 2.2.b; el caso oficial renta-c09-01 aplica 5 % a la nave y 25 % al tractor).
MOD_DEP = {'nave': 5, 'tractor': 25, 'ganado': 22, 'frutales': 10, 'citricos-vinedo': 5, 'olivar': 3}
# Tabla simplificada de la estimación directa (Orden de 27-3-1998, BOE-A-1998-7200).
ED_DEP = {'edificios': 3, 'instalaciones': 10, 'maquinaria': 12, 'transporte': 16, 'informatica': 26, 'utiles': 30, 'ganado': 16,
          'citricos': 4, 'olivar': 2}
INDEX_NAMES = {0.13: 'carne, remolacha', 0.2: 'bovino de leche', 0.26: 'cereales, cítricos, frutos secos, hortícolas, olivo, apicultura, ovino de leche, bovino de cría',
               0.32: 'uva para vino con denominación de origen, arroz, oleaginosas', 0.37: 'frutos no cítricos, forrajes, servicios de cría, guarda y engorde',
               0.42: 'actividades accesorias', 0.56: 'otros trabajos y servicios accesorios'}


def split(total, weights):
    """Reparte `total` en proporción a `weights`, con los céntimos que sobren en la última parte."""
    s = sum(weights)
    parts = [r2(total * w / s) for w in weights[:-1]]
    return parts + [r2(total - sum(parts))]


def farm_modules(f, lines_out):
    """
    Rendimiento neto en estimación objetiva agraria (Orden HAC/1347/2024, anexo I, instrucciones 2 y 3,
    y DA 1.ª: reducción del 5 %). `f`: productos con sus ingresos (ventas con la compensación del REAGP,
    ayudas acopladas e indemnizaciones de seguros), ayuda desacoplada de la PAC (se reparte por ingresos),
    ecorregímenes (exentos, DA 5.ª.1.a.8.ª LIRPF), amortizaciones, coste de personal e índices.
    """
    prods = f['products']
    incomes = [r2(x['sales'] + x.get('compensation', 0) + x.get('coupled', 0) + x.get('insurance', 0) + x.get('drought', 0)) for x in prods]
    pac = f.get('pac', 0)
    pac_parts = split(pac, incomes) if pac else [0.0] * len(prods)
    if f.get('eco'):
        lines_out.append(f'Ecorregímenes de la PAC {eur(f["eco"])}: no se integran en la base imponible (DA 5.ª.1.a.8.ª LIRPF) ni en el volumen')
    if pac:
        lines_out.append(f'Ayuda básica a la renta y demás pagos desacoplados de la PAC {eur(pac)}: se suman a cada producto en proporción a sus ingresos '
                         '(instrucción 2.1 del anexo I; caso oficial renta-c09-01)')
    bases = []
    for x, inc, pp in zip(prods, incomes, pac_parts):
        total = r2(inc + pp)
        base = r2(total * x['index'])
        bases.append(base)
        detail = f'ventas {eur(x["sales"])}' + (f' + compensación REAGP {eur(x["compensation"])}' if x.get('compensation') else '') \
            + (f' + ayuda acoplada {eur(x["coupled"])}' if x.get('coupled') else '') + (f' + indemnización del seguro agrario {eur(x["insurance"])}' if x.get('insurance') else '') \
            + (f' + ayuda por sequía {eur(x["drought"])}' if x.get('drought') else '') + (f' + PAC {eur(pp)}' if pp else '')
        lines_out.append(f'{x["name"]}: {detail} = {eur(total)} × índice {str(x["index"]).replace(".", ",")} ({INDEX_NAMES.get(x["index"], "")}) = {eur(base)}')
    previous = r2(sum(bases))
    deps = []
    for name, group, cost in f.get('assets', []):
        d = r2(cost * MOD_DEP[group] / 100)
        deps.append(d)
        lines_out.append(f'Amortización {name}: {eur(cost)} × {MOD_DEP[group]} % = {eur(d)}')
    dep = r2(sum(deps))
    reduced = r2(previous - dep)
    lines_out.append(f'Rendimiento neto previo {eur(previous)} − amortizaciones {eur(dep)} = rendimiento neto minorado **{eur(reduced)}**')
    volume = r2(sum(incomes) + pac)
    value = reduced
    factors = []
    if len(prods) == 1:
        x = prods[0]
        for key, idx, why in (('rented', 0.9, 'c) tierras arrendadas'), ('electric', 0.75, 'f) regadío con energía eléctrica'),
                              ('feed', 0.5, 'd) piensos comprados a terceros > 50 %'), ('organic', 0.95, 'e) agricultura ecológica')):
            if x.get(key):
                value = value * idx
                factors.append(f'{why} × {str(idx).replace(".", ",")}')
    staff = f.get('staffCost', 0)
    if f.get('forest'):
        # Forestry: only the index h) applies (instrucción 2.3 of annex I), and here there is no approved plan of 20 years.
        staff = 0
        factors.append('actividad forestal: solo el índice h), que no aplica (sin plan técnico de 20 años o más)')
    if staff:
        pct = staff / volume * 100
        idx = 0.75 if pct > 40 else 0.8 if pct > 30 else 0.85 if pct > 20 else 0.9 if pct > 10 else 1
        if idx < 1:
            value *= idx
            factors.append(f'b) personal asalariado {eur(staff)} / {eur(volume)} = {pct:.2f} % × {str(idx).replace(".", ",")}')
    if reduced <= 9447.91 and not f.get('forest'):
        value *= 0.9
        factors.append('g) rendimiento neto minorado ≤ 9.447,91 € × 0,90')
    modules = r2(value)
    lines_out.append('Índices correctores: ' + ('; '.join(factors) if factors else 'ninguno') + f' → rendimiento neto de módulos **{eur(modules)}**')
    general = r2(modules * 0.05)
    net = r2(modules - general)
    lines_out.append(f'Reducción general del 5 % (DA 1.ª de la Orden HAC/1347/2024) {eur(general)} → rendimiento neto de la actividad **{eur(net)}**')
    lines_out.append('Se supone que el término municipal no figura en la orden de reducción de índices de 2025 por circunstancias excepcionales (dato del caso).')
    proposal = dict(kind='agrarian', name=f['name'], withheld=f.get('withheld', 0), payments=f.get('payments', 0),
                    data=dict(lines=[dict(indexId=x['indexId'], income=r2(i + pp), transformed=False, rentedShare=1 if x.get('rented') else 0,
                                          electricShare=1 if x.get('electric') else 0, boughtFeed=bool(x.get('feed')), organic=bool(x.get('organic')))
                                     for x, i, pp in zip(prods, incomes, pac_parts)],
                              assets=[dict(group={'nave': 'buildings', 'tractor': 'transport', 'ganado': 'cattle', 'frutales': 'horses', 'citricos-vinedo': 'citrus',
                                                  'olivar': 'olive'}[g], cost=c) for _, g, c in f.get('assets', [])],
                              externalMeans=False, staffPercent=round(staff / volume * 100, 4) if staff else 0, forestPlan=False, young=False, extraordinary=0))
    return net, dict(volume=volume, previous=previous, depreciation=dep, reduced=reduced, modules=modules, general=general, net=net), proposal


def direct_activity(f, lines_out):
    """
    Estimación directa simplificada (o normal) de la Renta 2025: ingresos (ventas, compensación del REAGP,
    subvenciones corrientes, imputación de las de capital, indemnizaciones) − gastos − amortizaciones (tabla
    simplificada) − 5 % de difícil justificación con tope de 2.000 € (RIRPF art. 30.2.ª; 5 % en 2025).
    """
    inc = f['income']
    total_in = r2(sum(v for _, v in inc))
    for k, v in inc:
        lines_out.append(f'Ingreso: {k} {eur(v)}')
    exp = f['expenses']
    deps = []
    for name, group, cost in f.get('assets', []):
        d = r2(cost * ED_DEP[group] / 100)
        deps.append((name, d))
        lines_out.append(f'Amortización {name}: {eur(cost)} × {ED_DEP[group]} % (tabla simplificada, Orden de 27-3-1998) = {eur(d)}')
    total_exp = r2(sum(v for _, v in exp) + sum(d for _, d in deps))
    for k, v in exp:
        lines_out.append(f'Gasto: {k} {eur(v)}')
    diff = r2(total_in - total_exp)
    hard = r2(min(2000, max(0.0, diff) * 0.05)) if f.get('method', 'simplified') == 'simplified' else 0.0
    net = r2(diff - hard)
    lines_out.append(f'Ingresos {eur(total_in)} − gastos {eur(total_exp)} = {eur(diff)}' + (f' − 5 % de difícil justificación {eur(hard)}' if hard else '')
                     + f' = rendimiento neto **{eur(net)}**' + (f'; × {f["share"] * 100:.0f} % (titularidad compartida, Ley 35/2011)' if f.get('share') else ''))
    if f.get('share'):
        net = r2(net * f['share'])
    proposal = dict(kind='direct', name=f['name'], dependent=False, newActivity=False, withheld=f.get('withheld', 0), payments=f.get('payments', 0),
                    **({'share': f['share']} if f.get('share') else {}),
                    data=dict(method=f.get('method', 'simplified'), income=dict(sales=total_in, grants=0, ownUse=0, other=0),
                              expenses=dict(other=r2(sum(v for _, v in exp)), depreciation=r2(sum(d for _, d in deps))),
                              assets=[], lowValue=[], health=dict(premiums=0, people=0, withDisability=0), home=dict(supplies=0, usedPercent=0), provisions=0))
    return net, dict(income=total_in, expenses=total_exp, difference=diff, provisions=hard, net=net), proposal


def quarterly_2pct(n, label, quarters, method, exempt_share, figs):
    """
    Pagos fraccionados de una actividad agrícola o ganadera en 2026 (RIRPF art. 110.1.c): 2 % del volumen de
    ingresos del trimestre, excluidas las subvenciones de capital y las indemnizaciones, menos las retenciones del
    trimestre. Sin obligación si el año anterior al menos el 70 % de los ingresos de la explotación tuvo retención
    (art. 109.3). Estimación directa: modelo 130, sección II (casillas 08-11); módulos: modelo 131.
    """
    steps = []
    model = '130' if method == 'direct' else '131'
    if exempt_share >= 0.7:
        steps.append(f'{model} de 2026: NO lo presenta: en 2025 el {exempt_share * 100:.0f} % de los ingresos de la explotación (sin subvenciones) tuvo retención '
                     '(art. 109.3 RIRPF).')
        for q in range(1, 5):
            figs.append(dict(modelo=model, periodo=f'{q}T', casilla=None, concepto=f'Obligación de presentar el {model}', importe=None, valor='no (art. 109.3 RIRPF)',
                             origen='calculo-a-mano', ref='calculo.md#pagos-fraccionados-de-2026', campo=None))
        return steps, []
    rows_all = []
    for q, (vol, held) in enumerate(quarters, start=1):
        two = r2(vol * 0.02)
        res = r2(max(0.0, two - held))
        if model == '130':
            rows = [('08', 'Volumen de ingresos del trimestre (sin subvenciones de capital ni indemnizaciones)', vol), ('09', '2 % de la casilla 08', two),
                    ('10', 'Retenciones e ingresos a cuenta del trimestre', held), ('11', 'Pago fraccionado previo (09 − 10)', r2(two - held)),
                    ('12', 'Suma de pagos fraccionados previos (07 + 11), mínimo 0', res), ('14', 'Diferencia (12 − 13)', res), ('17', 'Total', res),
                    ('19', 'Resultado de la autoliquidación', res)]
        else:
            rows = [(None, 'Volumen de ingresos del trimestre (actividad agraria)', vol), (None, '2 % del volumen', two), (None, 'Retenciones del trimestre', held),
                    (None, 'Resultado de la autoliquidación', res)]
        rows_all.append(rows)
        for box, concept, amount in rows:
            figs.append(dict(modelo=model, periodo=f'{q}T', casilla=box, concepto=concept, importe=r2(amount), origen='calculo-a-mano',
                             ref='calculo.md#pagos-fraccionados-de-2026', campo=f'm130.{box}' if box else None))
        steps.append(f'{q}T: 2 % de {eur(vol)} = {eur(two)} − retenciones {eur(held)} → **{eur(res)}** ({model}{", sección II" if model == "130" else ", casillas NO CONFIRMADAS"})')
    return steps, rows_all


def vat303(quarters, figs):
    """
    303 de un agricultor en régimen general (renunció al REAGP): ventas al 4 % o 10 %, entregas a la UE
    (casilla 59) y compras. Un resultado negativo de los tres primeros trimestres se compensa en los
    siguientes (casillas 110, 78 y 87); el del cuarto se pide devolver (instrucciones del 303 de 2026).
    """
    steps = []
    rows_all = []
    BOX = {4: ('01', '03'), 10: ('04', '06'), 21: ('07', '09')}
    pending = 0.0
    for q, d in enumerate(quarters, start=1):
        rows = []
        dev = 0.0
        for rate, base in sorted(d['sales'].items()):
            if not base:
                continue
            cuota = r2(base * rate / 100)
            dev += cuota
            rows += [(BOX[rate][0], f'Régimen general {rate} %: base', base), (BOX[rate][1], f'Régimen general {rate} %: cuota', cuota)]
        sop_base = r2(sum(d['purchases'].values()))
        sop = r2(sum(r2(b * r / 100) for r, b in d['purchases'].items()))
        dev = r2(dev)
        res = r2(dev - sop)
        applied = r2(min(pending, res)) if res > 0 else 0.0
        result = r2(res - applied)
        rows += [('27', 'Total cuota devengada', dev), ('28', 'Base de cuotas soportadas en operaciones interiores corrientes', sop_base),
                 ('29', 'Cuotas soportadas en operaciones interiores corrientes', sop), ('45', 'Total a deducir', sop), ('46', 'Resultado régimen general', res)]
        if d.get('eu'):
            rows += [('59', 'Entregas intracomunitarias de bienes', d['eu'])]
        rows += [('64', 'Suma de resultados', res), ('66', 'Atribuible a la Administración del Estado', res)]
        if pending:
            rows += [('110', 'Cuotas a compensar de periodos anteriores', pending), ('78', 'Cuotas a compensar aplicadas en este periodo', applied),
                     ('87', 'Cuotas a compensar pendientes para periodos posteriores', r2(pending - applied))]
        rows += [('69', 'Resultado de la autoliquidación', result), ('71', 'Resultado de la liquidación', result)]
        if result < 0:
            rows += [('72' if q < 4 else '73', 'A compensar' if q < 4 else 'A devolver', -result)]
        rows_all.append(rows)
        for box, concept, amount in rows:
            figs.append(dict(modelo='303', periodo=f'{q}T', casilla=box, concepto=concept, importe=r2(amount), origen='calculo-a-mano',
                             ref='calculo.md#iva-de-2026', campo=f'm303.{box}'))
        steps.append(f'{q}T: devengado {eur(dev)} − soportado {eur(sop)} = {eur(res)}' + (f'; compensa {eur(applied)} de trimestres anteriores' if applied else '')
                     + f' → **{eur(result)}**' + (f'; entregas intracomunitarias exentas (59 y 349) {eur(d["eu"])}' if d.get('eu') else '')
                     + ((' (a compensar en los trimestres siguientes)' if q < 4 else ' (a devolver)') if result < 0 else ''))
        pending = r2(pending - applied + (-result if result < 0 and q < 4 else 0))
    return steps, rows_all


# ─── Personas ─────────────────────────────────────────────────────────────────

def P(n, slug, ccaa, title, story, tests, **kw):
    return dict(n=n, slug=f'{PREFIX}-{n:02d}-{slug}', ccaa=ccaa, title=title, story=story, tests=tests, **kw)


def A(n, slug, ccaa, title, story, tests, models, **kw):
    return dict(n=n, slug=f'{PREFIX}-{n:02d}-{slug}', ccaa=ccaa, title=title, story=story, tests=tests, models=models, **kw)

V = 'comunitat-valenciana'
CL = 'castilla-y-leon'
AN = 'andalucia'


def ded(id_, label, how, state=0.0, regional=0.0, refundable=False, amount=0.0, choice=None, units=None):
    d = dict(id=id_, label=label, how=how, state=state, regional=regional)
    if refundable:
        d.update(refundable=True, amount=amount)
    if choice is not None:
        d['choice_amount'] = str(choice)
    if units is not None:
        d['units'] = str(units)
    return d


MATERNIDAD = lambda months, extra=0: ded('estado-maternidad', 'Maternidad (art. 81 LIRPF)', f'100 € × {months} meses' + (f' + {extra} € del mes de los 30 días cotizados' if extra else '')  # noqa: E731
                                         + f' = {eur(100 * months + extra)} (desde 2023 sin tope de cotizaciones; caso oficial renta-c18-01)', refundable=True,
                                         amount=100 * months + extra, units=1) | {'months': str(months)}

RENTA = [
    # ── Comunitat Valenciana ──
    P(59, 'monoparental-alimentos-recibidos-valencia', V, 'Madre sola con dos hijos que cobra alimentos del padre: familia monoparental general',
      'Vive en València con sus hijos de 9 y 6 años (custodia exclusiva). El padre le paga 4.800 € al año de alimentos por sentencia: están exentos para los hijos (art. 7.k LIRPF) y no se declaran. Título de familia monoparental de categoría general. Individual frente a conjunta monoparental (2.150 €).',
      ['familia monoparental (CV, 330 €)', 'alimentos recibidos exentos (art. 7.k)', 'mínimo por dos descendientes completo', 'conjunta monoparental'],
      age=41, children=[dict(age=9), dict(age=6)], **worker(26000, 3100),
      deductions=[ded('comunitat-valenciana-familia-numerosa-monoparental', 'Familia monoparental de categoría general (Ley 13/1997 CV, art. 4.Uno.d)',
                      '330 € (base imponible < 27.000 €: importe completo)', regional=330, choice=330)],
      joint=dict(kind='single', partner=None)),
    P(60, 'viuda-77-viudedad-apartamento-costa-alicante', V, 'Viuda de 77 años con pensión de viudedad y un apartamento en la costa que alquila en verano',
      'Cobra pensión de viudedad (14.000 €) y de jubilación (9.000 €): dos pagadores, ambos pensiones. Alquila en julio, agosto y septiembre su apartamento de Torrevieja (no es vivienda habitual del inquilino: sin reducción) y el resto del año queda a su disposición: imputación por los días sin alquilar.',
      ['pensión de viudedad', 'mayor de 75', 'alquiler de temporada sin reducción', 'imputación de renta por días', 'dos pagadores de pensiones'],
      age=77, retired=True, nonSalary=23000,
      **worker(0, 0, payers=[payer('Instituto Ficticio de Pensiones (viudedad)', 'Q00000601', 14000, 900), payer('Instituto Ficticio de Pensiones (jubilación)', 'Q00000602', 9000, 400)]),
      rental=dict(income=4500, interest=0, repairs=200, other=290, construction=15123.29, reduction=0, reductionId='',
                  expenses={'reparacion-conservacion': '200', 'tributos-tasas': '120', 'comunidad-servicios-personales': '120', 'seguros': '50'},
                  why='Alquiler de temporada (92 días): no es vivienda habitual del inquilino, sin reducción del art. 23.2. Gastos y amortización en proporción a los días alquilados: el coste de construcción de 60.000 € × 92/365 = 15.123,29'),
      unrented=[dict(value=48000, revised=True, days=273)]),
    P(61, 'joven-alquiler-despoblamiento-castellon', V, 'Joven de 28 años de alquiler en un pueblo de Castellón en riesgo de despoblamiento',
      'Trabaja en una cooperativa y vive de alquiler (contrato de 2024, 400 €/mes) en un municipio de la lista de riesgo de despoblamiento. Deducciones valencianas por alquiler (25 % por tener 35 años o menos, hasta 950 €) y por despoblamiento (330 €).',
      ['alquiler de vivienda habitual (CV, 25 % ≤ 35 años)', 'despoblamiento (CV, 330 €)', 'sin deducción estatal de alquiler (contrato posterior a 2015)'],
      age=28, **worker(21000, 1900),
      deductions=[ded('comunitat-valenciana-arrendamiento-vivienda-habitual', 'Alquiler de vivienda habitual (Ley 13/1997 CV, art. 4.Uno.n)', '25 % de 4.800 = 1.200, tope 950 € (35 años o menos)', regional=950, choice=950),
                  ded('comunitat-valenciana-despoblamiento', 'Residencia en municipio en riesgo de despoblamiento (Ley 13/1997 CV)', '330 € (sin descendientes)', regional=330, choice=330)]),
    P(62, 'afectado-dana-ayudas-valencia', V, 'Vecino afectado por la DANA de octubre de 2024: ayudas públicas exentas y obras',
      'Su vivienda habitual sufrió daños. En 2025 cobra 6.000 € de ayuda pública para reparar elementos dañados (repara por 8.500 €: no se integra, DA 5.ª.1.c LIRPF) y 1.800 € de ayuda por desalojo temporal (no se integra, DA 5.ª.3). Los 2.500 € de reparación no cubiertos dan la deducción valenciana del 100 % con tope de 2.000 €.',
      ['ayudas por catástrofe no integradas (DA 5.ª LIRPF)', 'ayuda por desalojo exenta', 'deducción CV por daños de la DANA (tope 2.000 €)'],
      age=44, **worker(30000, 4300),
      deductions=[ded('comunitat-valenciana-dana-danos-vivienda', 'Daños de la DANA en la vivienda habitual (Ley 13/1997 CV)', '100 % de 2.500 € no subvencionados, tope 2.000 €',
                      regional=2000, choice=2500)],
      pending=[('Ayudas de la DANA (6.000 + 1.800 €)', 'No se integran en la base (DA 5.ª.1.c y 5.ª.3 LIRPF): se declaran solo como información.')]),
    P(65, 'nacimiento-2025-prestacion-exenta-valencia', V, 'Madre con un hijo nacido en marzo de 2025: prestación por nacimiento exenta',
      'Trabajadora por cuenta ajena; su hijo nace el 10-3-2025. La Seguridad Social le paga 7.200 € de prestación por nacimiento y cuidado de menor (exenta, art. 7.h): su empresa solo le paga 24.000 €. Deducción por maternidad de marzo a diciembre (10 meses; ya estaba de alta: sin los 150 €) y la valenciana por nacimiento (600 €, la mitad para cada progenitor en individual). El padre declara aparte.',
      ['prestación por nacimiento exenta (art. 7.h)', 'maternidad por meses (art. 81)', 'nacimiento CV (600 €, repartido)', 'hijo menor de 3 años (mínimo 2.800 €)'],
      age=33, children=[dict(age=0)], shared=True, **worker(24000, 3000),
      deductions=[MATERNIDAD(10), ded('comunitat-valenciana-nacimiento-adopcion-acogimiento', 'Nacimiento (Ley 13/1997 CV, art. 4.Uno.a)', '600 € por el primer hijo, la mitad para cada progenitor: 300 €',
                                      regional=300, units=1)],
      pending=[('Prestación por nacimiento de la Seguridad Social (7.200 €)', 'Exenta (art. 7.h LIRPF): no forma parte de los rendimientos del trabajo.')]),
    P(66, 'placas-solares-next-generation-hipoteca-castellon', V, 'Placas solares con ayuda Next Generation e hipoteca anterior a 2013',
      'Instala placas en su vivienda habitual de Castelló (7.000 €) con una ayuda del programa de autoconsumo de 2.000 € (RD 477/2021: no se integra en la base, DA 5.ª.4 LIRPF). Deducción valenciana del 40 % sobre lo no subvencionado (5.000 €). Además paga 8.000 € de su hipoteca de 2009 (régimen transitorio).',
      ['ayuda de autoconsumo no integrada (DA 5.ª.4)', 'deducción CV por autoconsumo (40 %)', 'vivienda habitual, régimen transitorio (DT 18.ª)'],
      age=47, **worker(40000, 7200),
      deductions=[ded('estado-vivienda-habitual-transitorio', 'Vivienda habitual, régimen transitorio (DT 18.ª LIRPF)', '8.000 € pagados: 7,5 % estatal 600 + 7,5 % autonómico 600',
                      state=600, regional=600, choice=8000),
                  ded('comunitat-valenciana-autoconsumo-energia-renovable', 'Autoconsumo con renovables en la vivienda habitual (Ley 13/1997 CV)', '40 % de (7.000 − 2.000 de ayuda) = 2.000 €',
                      regional=2000, choice=5000)]),
    P(68, 'pensionista-discapacidad-65-madre-95-alicante', V, 'Pensionista de 70 años con discapacidad del 65 % que cuida de su madre de 95',
      'Pensión de 21.000 €. Discapacidad del 65 % (mínimo de 9.000 + 3.000 de asistencia). Su madre de 95 años vive con él y solo cobra 6.500 €: mínimo por ascendiente mayor de 75. Deducciones valencianas de 197 € por ser mayor de 65 con discapacidad y por ascendiente mayor de 75.',
      ['pensionista con discapacidad 65 %', 'ascendiente mayor de 75 a cargo', 'deducciones CV de 197 €', 'sin incremento de gastos por discapacidad (pensionista)'],
      age=70, disability=65, retired=True, nonSalary=21000, ascendants=[dict(age=95)], **worker(0, 0, payers=[payer('Instituto Ficticio de Pensiones', 'Q00000681', 21000, 1500)]),
      deductions=[ded('comunitat-valenciana-contribuyentes-discapacidad-65', 'Contribuyente de 65 años o más con discapacidad (Ley 13/1997 CV)', '197 €', regional=197, units=1),
                  ded('comunitat-valenciana-ascendientes-mayores', 'Ascendiente mayor de 75 años (Ley 13/1997 CV)', '197 €', regional=197, units=1)]),
    P(69, 'fija-discontinua-almacen-citricos-paro-valencia', V, 'Fija discontinua en un almacén de naranjas que cobra el paro entre campañas',
      'Trabaja de octubre a mayo en un almacén de cítricos de La Ribera (11.000 €) y cobra 4.000 € de prestación por desempleo en verano: dos pagadores, 15.000 € en total (no llega a 15.876 €: no está obligada a declarar, pero le devuelven).',
      ['fija discontinua', 'prestación por desempleo (rendimiento del trabajo)', 'sin obligación de declarar', 'deducción de 340 € (DA 61.ª)'],
      age=36, nonSalary=4000, **worker(0, 0, payers=[payer('Almacén Ficticio de Cítricos, S.Coop.V.', 'F00000691'.replace('F', 'B'), 11000, 220, 712.8), payer('Servicio Ficticio de Empleo (paro)', 'Q00000692', 4000, 0, 0)])),
    P(70, 'venta-vivienda-reinversion-dividendos-valencia', V, 'Vende su vivienda habitual y reinvierte todo en otra',
      'Vende en mayo la vivienda habitual (comprada en 2012 por 150.000 € con gastos) por 220.000 € menos 8.000 de gastos: ganancia de 62.000 €, exenta porque reinvierte todo el importe obtenido en la nueva vivienda en seis meses (art. 38 LIRPF). Cobra 1.500 € de dividendos.',
      ['exención por reinversión en vivienda habitual (art. 38)', 'dividendos en la base del ahorro', 'retención del 19 %'],
      age=52, savings=1500, otherWithheld=285, **worker(45000, 8300),
      savings_steps=['Venta: 220.000 − 8.000 = 212.000; adquisición 150.000 → ganancia 62.000,00. Reinvierte los 212.000 en la nueva vivienda habitual: exenta entera (art. 38.1)',
                     'Dividendos 1.500,00 (retención 285,00) → base del ahorro **1.500,00**'],
      pending=[('Ganancia exenta por reinversión (62.000,00)', 'Se declara y queda exenta (art. 38.1): el motor recibe la base del ahorro ya neta.')]),
    # ── Castilla y León ──
    P(75, 'viudo-79-hijo-discapacidad-65-leon', CL, 'Viudo de 79 años que vive con su hijo de 45 con discapacidad del 65 %',
      'Pensión de viudedad (8.000 €) y de jubilación (16.000 €). Su hijo de 45 años, con discapacidad del 65 % y sin rentas, vive con él: da derecho al mínimo por descendientes (sin límite de edad con discapacidad) y al de discapacidad con asistencia. Deducción abonable por descendiente con discapacidad.',
      ['viudo mayor de 75', 'hijo mayor de edad con discapacidad 65 %', 'deducción por descendiente con discapacidad (art. 81 bis)', 'pensiones de viudedad y jubilación'],
      age=79, retired=True, nonSalary=24000, children=[dict(age=45, disability=65)],
      **worker(0, 0, payers=[payer('Instituto Ficticio de Pensiones (viudedad)', 'Q00000751', 8000, 300), payer('Instituto Ficticio de Pensiones (jubilación)', 'Q00000752', 16000, 1700)]),
      deductions=[ded('estado-descendiente-discapacidad', 'Descendiente con discapacidad (art. 81 bis.1.a)', '1.200 € (pensionista: no exige cotizaciones; tope: la propia deducción)', refundable=True, amount=1200, units=1)]),
    P(76, 'huerfana-19-orfandad-exenta-segovia', CL, 'Huérfana de 19 años con pensión de orfandad y un trabajo de verano',
      'Estudiante universitaria. Cobra 7.800 € de pensión de orfandad de la Seguridad Social (exenta: menor de 22 años, art. 7.h LIRPF) y 4.000 € de un trabajo de verano. No está obligada a declarar, pero le devuelven las retenciones.',
      ['pensión de orfandad exenta (art. 7.h)', 'base inferior al mínimo', 'devolución de retenciones'],
      age=19, **worker(0, 0, payers=[payer('Hostelería Ficticia Segoviana, S.L.', 'B00000761', 4000, 80, 259.2)]),
      pending=[('Pensión de orfandad (7.800 €)', 'Exenta (art. 7.h LIRPF, menor de 22 años): no se declara como rendimiento.')]),
    P(77, 'nacimiento-rural-alquiler-joven-soria', CL, 'Pareja joven en un pueblo de Soria: primer hijo y alquiler',
      'Viven de alquiler (350 €/mes) en un pueblo de 600 habitantes y tienen su primer hijo en junio de 2025. Solo trabaja él (24.000 €). Castilla y León: nacimiento en el medio rural (1.420 €) y alquiler para jóvenes en el medio rural (25 %, hasta 612 €), con el límite de 18.900 € de base menos mínimo en individual y 31.500 € en conjunta. La madre no trabaja ni cobra paro: sin deducción por maternidad.',
      ['nacimiento en el medio rural (CyL, 1.420 €)', 'alquiler joven rural (CyL, 25 %)', 'límite de renta después del mínimo', 'conjunta frente a individual'],
      age=31, children=[dict(age=0)], shared=True, **worker(24000, 2800),
      deductions=[ded('castilla-y-leon-nacimiento-adopcion-rural', 'Nacimiento en el medio rural (DLeg 1/2013 CyL, art. 4)', '1.420 € por el primer hijo; en individual, la mitad para cada progenitor: 710 €', regional=710, units=1),
                  ded('castilla-y-leon-alquiler-jovenes-rural', 'Alquiler de vivienda habitual de jóvenes en el medio rural (DLeg 1/2013 CyL, art. 7)', '25 % de 4.200 = 1.050, tope 612 €', regional=612, choice=4200)],
      joint=dict(kind='couple', partner=dict(age=29, gross=0, ss=0, withheld=0, disability=0))),
    P(78, 'familia-numerosa-hipoteca-2008-palencia', CL, 'Familia numerosa general en Palencia con hipoteca de 2008',
      'Matrimonio con tres hijos (12, 9 y 4 años); trabajan los dos. Él declara individual (la mitad del mínimo por los hijos). Paga 9.500 € de hipoteca de 2008 (base máxima 9.040 €, la mitad suya en gananciales: 4.750 €). Deducción estatal por familia numerosa (la cede entera él, 1.200 €) y castellanoleonesa (600 €, repartida a partes iguales: 300 €).',
      ['familia numerosa (estado y CyL)', 'vivienda habitual, régimen transitorio con base compartida', 'tres hijos al 50 %'],
      age=45, children=[dict(age=12), dict(age=9), dict(age=4)], shared=True, **worker(36000, 5800),
      deductions=[ded('estado-familia-numerosa', 'Familia numerosa general (art. 81 bis.1.c)', '1.200 € (12 meses; la madre cede su derecho)', refundable=True, amount=1200, units=1),
                  ded('castilla-y-leon-familia-numerosa', 'Familia numerosa (DLeg 1/2013 CyL, art. 3)', '600 € a repartir entre los dos declarantes: 300 €', regional=300, choice=300),
                  ded('estado-vivienda-habitual-transitorio', 'Vivienda habitual, régimen transitorio (DT 18.ª LIRPF)', 'su mitad, 4.750 €: 7,5 % estatal 356,25 + 7,5 % autonómico 356,25',
                      state=356.25, regional=356.25, choice=4750)]),
    P(81, 'acciones-traspaso-fondos-plan-burgos', CL, 'Venta de acciones, traspaso entre fondos sin tributar y plan de pensiones',
      'Vende acciones con 3.200 € de ganancia y traspasa 20.000 € de un fondo a otro (no tributa: art. 94.1.a LIRPF). Aporta 1.500 € a su plan de pensiones.',
      ['traspaso entre fondos sin tributación (art. 94)', 'ganancia de acciones', 'plan de pensiones (1.500 €)'],
      age=50, savings=3200, planOwn=1500, **worker(55000, 11800),
      savings_steps=['Acciones: transmisión 11.200 − adquisición 8.000 = ganancia **3.200,00** (base del ahorro)',
                     'Traspaso de 20.000 € entre fondos: no se computa ganancia (art. 94.1.a LIRPF); el nuevo fondo conserva el coste y la fecha del anterior']),
    # ── Andalucía ──
    P(84, 'jornalero-subsidio-agrario-jaen', AN, 'Jornalero eventual agrario en Jaén con el subsidio agrario',
      'Trabaja en la campaña de la aceituna para dos empresarios (6.500 € y 3.000 €, Sistema Especial Agrario) y cobra 2.600 € del subsidio por desempleo de los trabajadores eventuales agrarios (rendimiento del trabajo). 12.100 € en total: no está obligado a declarar; le devuelven las retenciones.',
      ['subsidio agrario (REASS)', 'jornales de varios pagadores', 'sin obligación de declarar', 'deducción de 340 €'],
      age=48, nonSalary=2600, **worker(0, 0, payers=[payer('Olivarero Ficticio Uno', nif(841), 6500, 130, 312), payer('Olivarero Ficticio Dos', nif(842), 3000, 60, 144),
                                                    payer('Servicio Ficticio de Empleo (subsidio agrario)', 'Q00000843', 2600, 0, 0)])),
    P(86, 'monoparental-especial-fresa-huelva', AN, 'Madre sola con tres hijos (uno con discapacidad) que trabaja en la fresa: monoparental especial',
      'Fija discontinua en una cooperativa de frutos rojos de Huelva (18.500 €). Tres hijos (14, 10 y 7 años; el de 7 con discapacidad del 33 %) y sin pensión de alimentos del padre. Deducción estatal por ascendiente con dos hijos sin alimentos y andaluza por familia monoparental (100 €).',
      ['monoparental sin alimentos (art. 81 bis.1.d)', 'hijo con discapacidad (art. 81 bis.1.a)', 'monoparental (Andalucía, 100 €)', 'mínimos andaluces'],
      age=38, children=[dict(age=14), dict(age=10), dict(age=7, disability=33)], **worker(18500, 1100),
      deductions=[ded('estado-ascendiente-separado-dos-hijos', 'Ascendiente sin anualidades por alimentos con dos o más hijos (art. 81 bis.1.d)', '1.200 €, con el tope de sus cotizaciones: 1.198,80 €', refundable=True, amount=1198.8, units=1),
                  ded('estado-descendiente-discapacidad', 'Descendiente con discapacidad (art. 81 bis.1.a)', '1.200 €, con el tope de sus cotizaciones: 1.198,80 € (art. 81 bis.2, tope propio de cada deducción)', refundable=True, amount=1198.8, units=1),
                  ded('andalucia-familia-monoparental', 'Familia monoparental (DLeg 1/2018 Andalucía)', '100 €', regional=100, units=1)],
      joint=dict(kind='single', partner=None)),
    P(88, 'familia-numerosa-especial-cinco-hijos-conjunta-sevilla', AN, 'Matrimonio con cinco hijos: familia numerosa especial en conjunta',
      'Cinco hijos (16, 13, 10, 7 y 2 años). Trabaja él (48.000 €); ella no tiene rentas. Conjunta. Deducción estatal por familia numerosa especial (2.400 €) y andaluza por familia numerosa especial (400 €; base de la conjunta por encima de 30.000 €: no se aplica).',
      ['familia numerosa especial (estado)', 'límite de renta de la deducción andaluza (30.000 € en conjunta)', 'cinco hijos con menor de 3', 'conjunta'],
      age=46, children=[dict(age=16), dict(age=13), dict(age=10), dict(age=7), dict(age=2)], shared=True, **worker(48000, 6500),
      deductions=[ded('estado-familia-numerosa-especial', 'Familia numerosa especial (art. 81 bis.1.c)', '2.400 € (tope de cotizaciones solo sobre los primeros 1.200)', refundable=True, amount=2400, units=1)],
      joint=dict(kind='couple', partner=dict(age=44, gross=0, ss=0, withheld=0, disability=0)), only_joint=True),
    P(89, 'bono-alquiler-joven-malaga', AN, 'Joven de 26 años en Málaga con el Bono Alquiler Joven',
      'Paga 650 €/mes de alquiler y cobra 2.400 € del Bono Alquiler Joven (ganancia patrimonial de la base general, art. 33 y 45 LIRPF; la DGT y el Manual la llevan a la casilla 0303). Deducción andaluza del 15 % del alquiler, hasta 1.200 €, con bases de hasta 25.000 €.',
      ['Bono Alquiler Joven (ganancia en la base general)', 'alquiler joven en Andalucía (15 %, 1.200 €)', 'límite de 25.000 € de bases', 'otras rentas en el art. 20'],
      age=26, gainsGeneral=2400, **worker(17500, 1200),
      gainsSteps=['Bono Alquiler Joven cobrado en 2025: 2.400,00 (12 × 200 €). No es transmisión: ganancia por el importe cobrado (Manual 2025, F1)'],
      deductions=[ded('andalucia-alquiler-vivienda-habitual', 'Alquiler de vivienda habitual (DLeg 1/2018 Andalucía)', '15 % de 7.800 = 1.170 € (tope 1.200; bases ≤ 25.000)', regional=1170, choice=7800)],
      pending=[('Base de la deducción andaluza con el Bono', 'La AEAT habla de «cantidades satisfechas» y no dice si se resta la ayuda: se toma el alquiler pagado entero (NO CONFIRMADO).')]),
    P(91, 'padre-permiso-nacimiento-pueblo-granada', AN, 'Padre que disfruta su permiso por nacimiento en un pueblo de Granada',
      'Hijo nacido en abril de 2025 en un municipio de 1.900 habitantes. El padre cobra 4.600 € de prestación por nacimiento (exenta, art. 7.h) y su empresa 27.000 €. Deducción andaluza por nacimiento de 400 € (municipio de menos de 3.000 habitantes), la mitad para cada progenitor: 200 €. El padre no tiene deducción por maternidad.',
      ['prestación por nacimiento del padre exenta', 'nacimiento en municipio pequeño (Andalucía, 400 €)', 'hijo menor de 3 años'],
      age=35, children=[dict(age=0), dict(age=4)], shared=True, **worker(27000, 3900),
      deductions=[ded('andalucia-nacimiento-adopcion-acogimiento', 'Nacimiento (DLeg 1/2018 Andalucía)', '400 € en municipio de menos de 3.000 habitantes, la mitad para cada progenitor: 200 €', regional=200, units=1)],
      pending=[('Prestación por nacimiento (4.600 €)', 'Exenta (art. 7.h LIRPF).')]),
    P(92, 'pensionista-discapacidad-65-almeria', AN, 'Pensionista con discapacidad del 65 % en Almería',
      'Pensión de incapacidad permanente total de 17.500 € (tributa: no es absoluta ni gran invalidez). 67 años, discapacidad del 65 %. Deducción andaluza de 150 € por discapacidad (bases ≤ 25.000 €).',
      ['pensión de incapacidad total (no exenta)', 'discapacidad 65 % con asistencia', 'mayor de 65', 'deducción andaluza por discapacidad'],
      age=67, disability=65, retired=True, nonSalary=17500, **worker(0, 0, payers=[payer('Instituto Ficticio de Pensiones (incapacidad)', 'Q00000921', 17500, 600)]),
      deductions=[ded('andalucia-contribuyente-discapacidad', 'Contribuyente con discapacidad (DLeg 1/2018 Andalucía)', '150 €', regional=150, units=1)]),
    P(93, 'rehabilitacion-energetica-next-generation-sevilla', AN, 'Rehabilitación energética de la vivienda con ayuda Next Generation',
      'Cambia ventanas y aislamiento de su vivienda habitual: 12.000 € con certificado energético de 2025 que baja un 35 % el consumo no renovable. Ayuda del programa de rehabilitación residencial (RD 853/2021) de 5.000 €: no se integra en la base (DA 5.ª.4) y se resta de la base de la deducción estatal del 40 % (base máxima 7.500 €).',
      ['ayuda Next Generation no integrada', 'deducción estatal por eficiencia energética (40 %)', 'base menos la subvención'],
      age=56, **worker(42000, 7600),
      deductions=[ded('estado-eficiencia-energia-primaria', 'Obras que reducen el consumo de energía primaria no renovable (DA 50.ª LIRPF)', '40 % de (12.000 − 5.000) = 2.800 €; solo cuota estatal',
                      state=2800, choice=7000)]),
    # ── Otras comunidades ──
    P(95, 'despido-indemnizacion-exenta-teruel', 'aragon', 'Despedido con indemnización exenta en parte y dos pagadores',
      'Le despiden de forma improcedente en junio: indemnización de 30.000 €, exenta hasta la cuantía obligatoria del Estatuto de los Trabajadores (22.000 €, art. 7.e); tributan 8.000 €. Encuentra otro empleo en septiembre.',
      ['indemnización por despido exenta en parte (art. 7.e)', 'dos pagadores', 'escala de Aragón'],
      age=49, **worker(0, 0, payers=[payer('Industria Ficticia Turolense, S.L. (sueldo e indemnización no exenta)', 'B00000951', 24000, 4200, 1036.8),
                                     payer('Logística Ficticia del Jiloca, S.L.', 'B00000952', 7000, 900, 453.6)]),
      pending=[('Indemnización exenta (22.000 €)', 'Exenta (art. 7.e LIRPF): no se suma a los rendimientos del trabajo; la parte que excede (8.000 €) va en el sueldo del primer pagador.')]),
    P(96, 'pareja-de-hecho-guarderia-zaragoza', 'aragon', 'Madre en pareja de hecho con un hijo de 2 años en la guardería',
      'Pareja de hecho (no forman unidad familiar: no hay conjunta con el padre). Hijo de 2 años en una guardería autorizada (3.000 € al año sin ayudas). Deducción por maternidad (1.200 €) e incremento por guardería (tope 1.000 €).',
      ['pareja de hecho (sin conjunta)', 'maternidad + guardería (art. 81.2)', 'hijo menor de 3 años al 50 %'],
      age=32, children=[dict(age=2)], shared=True, **worker(29000, 4200),
      deductions=[MATERNIDAD(12), ded('estado-guarderia', 'Incremento por gastos de guardería (art. 81.2)', '3.000 € pagados, tope 1.000 €', refundable=True, amount=1000, choice=1000)]),
    P(98, 'abuela-81-nieto-huerfano-murcia', 'murcia', 'Abuela viuda de 81 años con su nieto huérfano a cargo',
      'Pensión de viudedad (15.000 €). Su nieto de 12 años, huérfano, vive con ella y cobra una pensión de orfandad (exenta, y no cuenta para el límite de 8.000 €). El nieto da derecho al mínimo por descendientes (art. 58: descendientes, también nietos, que convivan).',
      ['viuda mayor de 75', 'nieto huérfano a cargo (mínimo por descendientes)', 'orfandad exenta del nieto'],
      age=81, retired=True, nonSalary=15000, children=[dict(age=12)], **worker(0, 0, payers=[payer('Instituto Ficticio de Pensiones (viudedad)', 'Q00000981', 15000, 500)])),
    P(101, 'trabajo-en-el-extranjero-7p-madrid', 'madrid', 'Asalariado desplazado tres meses a Marruecos: exención del art. 7.p',
      'Su empresa lo envía 92 días a una obra en Marruecos (sin impuesto similar a efectos de la exención: país con convenio). De los 54.000 € de sueldo, la parte de esos días (13.610,96 €) está exenta (art. 7.p LIRPF, tope 60.100 €); declara 40.389,04 €.',
      ['exención por trabajos en el extranjero (art. 7.p)', 'reparto por días', 'escala de Madrid'],
      age=39, **worker(40389.04, 8900, ss=3499.2),
      pending=[('Rendimientos exentos por trabajos en el extranjero (13.610,96 €)', '54.000 × 92/365 = 13.610,96 €, exentos (art. 7.p LIRPF; RIRPF art. 6). El motor recibe ya la parte no exenta.')]),
    P(102, 'pensionista-monte-vecinal-ourense', 'galicia', 'Pensionista comunero de un monte vecinal en mano común',
      'Pensión de 13.000 €. La comunidad de montes vecinales de su parroquia reparte 1.200 € a cada comunero (retención del 19 %): son rendimientos del capital mobiliario, como los dividendos (Ley 35/2006, DF 6.ª; art. 25.1.a).',
      ['reparto de un monte vecinal (capital mobiliario)', 'pensionista', 'mínimos de Galicia'],
      age=72, retired=True, nonSalary=13000, savings=1200, otherWithheld=228, **worker(0, 0, payers=[payer('Instituto Ficticio de Pensiones', 'Q00001021', 13000, 0)]),
      savings_steps=['Reparto de la comunidad de montes vecinales 1.200,00 (retención 228,00): rendimiento del capital mobiliario → base del ahorro **1.200,00**']),
    P(104, 'la-palma-volcan-ayuda-reconstruccion-canarias', 'canarias', 'Residente en La Palma con ayuda por la vivienda destruida por el volcán',
      'Su vivienda habitual quedó destruida en 2021. En 2025 cobra 30.000 € de ayuda pública para reconstruirla (no se integra, DA 5.ª.1.c LIRPF). Reside en La Palma: deducción del 60 % de la cuota por las rentas obtenidas en la isla (Real Decreto-ley 13/2025).',
      ['ayuda por erupción volcánica no integrada', 'deducción de La Palma (60 %)', 'escala de Canarias'],
      age=58, **worker(28000, 1800),
      deductions=[dict(id='estado-la-palma', ceuta=True, label='Rentas obtenidas en la isla de La Palma (art. 68.12 LIRPF, prorrogado por el RDL 13/2025)', how='')],
      pending=[('Ayuda pública por la vivienda destruida (30.000 €)', 'No se integra en la base (DA 5.ª.1.c LIRPF): se declara solo como información.')]),
    P(105, 'alquiler-turistico-asalariado-baleares', 'baleares', 'Asalariada que alquila una vivienda de uso turístico en Menorca',
      'Alquila por días, sin servicios hoteleros, un piso de Ciutadella (16.000 € al año): rendimiento del capital inmobiliario sin reducción (no es vivienda habitual del inquilino). Gastos de la plataforma y limpieza.',
      ['vivienda de uso turístico sin servicios (capital inmobiliario)', 'sin reducción del art. 23.2', 'otras rentas > 6.500'],
      age=43, **worker(31000, 4800),
      rental=dict(income=16000, interest=1500, repairs=600, other=3900, construction=110000, reduction=0, reductionId='',
                  expenses={'intereses-financiacion': '1500', 'reparacion-conservacion': '600', 'tributos-tasas': '500', 'comunidad-servicios-personales': '3100', 'seguros': '300'},
                  why='Alquiler turístico de temporada: no es vivienda habitual del inquilino; sin reducción. Comunidad y servicios incluye la limpieza y la comisión de la plataforma')),
]

# Personas con actividad agraria o económica en la Renta 2025 (el formulario aún no las recoge: propuestas al motor).
ACT_GAP = 'El formulario de la Renta aún no recoge actividades económicas (el motor las calcula en rentaActivity.ts): ver actividadPropuesta en persona.json.'

AGRO = [
    dict(base=P(63, 'almendro-olivar-modulos-reagp-alicante', V, 'Agricultor de almendro y olivo en módulos (REAGP) en el interior de Alicante',
                'Almendros y olivos de secano. Vende a una cooperativa que le paga la compensación del REAGP (12 %) y le retiene el 2 %. Cobra la ayuda básica de la PAC y un ecorregimen (exento). El granizo le dañó el almendro: indemnización del seguro agrario. Módulos agrarios: índice 0,26 para los dos cultivos; amortización del tractor.',
                ['módulos agrarios (índice 0,26)', 'REAGP: compensación del 12 %', 'PAC: pago básico repartido y ecorregimen exento', 'seguro agrario (indemnización en el volumen)', 'exención del 131 (≥ 70 % retenido)'],
                age=58, **worker(0, 0, payers=[])),
         farm=dict(name='Almendro y olivar', products=[dict(name='Almendra', indexId='crops', index=0.26, sales=14000, compensation=1680, insurance=2000),
                                                       dict(name='Aceituna de almazara', indexId='crops', index=0.26, sales=18000, compensation=2160)],
                   pac=4200, eco=900, assets=[('tractor', 'tractor', 24000)], withheld=640),
         quarters=None, retained_share=1.0, method='modules'),
    dict(base=P(64, 'citricultor-directa-iva-general-exporta-valencia', V, 'Citricultor en estimación directa y régimen general del IVA que vende a Francia',
                'Naranjas de La Ribera. Renunció al REAGP: repercute el 4 % y deduce el IVA de abonos (10 %) y gasóleo (21 %). Vende la mitad a un comprador francés (entrega intracomunitaria, casilla 59 y modelo 349) y la otra mitad a un almacén que le retiene el 2 %. Paga 1.400 € de seguro agrario. Pagos fraccionados del 2 % del volumen (130, sección II).',
                ['estimación directa simplificada agraria', '303 con ventas al 4 % y entrega intracomunitaria (59, 349)', '130 sección II (2 % del volumen)', 'seguro agrario como gasto', 'amortización de cítricos (4 %)'],
                age=51, **worker(0, 0, payers=[])),
         direct=dict(name='Cítricos', income=[('Ventas de naranja en España (almacén)', 30000), ('Entregas a Francia', 30000), ('Ayuda básica de la PAC', 2500)],
                     expenses=[('Abonos y fitosanitarios', 9000), ('Gasóleo agrícola', 3200), ('Seguro agrario', 1400), ('Comunidad de regantes', 1100), ('Mano de obra de la recolección (empresa de servicios)', 12000),
                               ('Cuota de autónomos (RETA agrario)', 3600)],
                     assets=[('árboles (plantación)', 'citricos', 40000), ('tractor y aperos', 'maquinaria', 30000)], withheld=600, payments=650),
         vat=[dict(sales={4: 15000}, eu=0, purchases={10: 2000, 21: 1200}), dict(sales={4: 0}, eu=15000, purchases={10: 3000, 21: 1000}),
              dict(sales={4: 0}, eu=15000, purchases={10: 2500, 21: 500}), dict(sales={4: 15000}, eu=0, purchases={10: 1500, 21: 500})],
         quarters=[(15000, 300), (15000, 0), (15000, 0), (17500, 300)], retained_share=0.5, method='direct'),
    dict(base=P(71, 'ovino-leche-modulos-piensos-zamora', CL, 'Ganadero de ovino de leche en Zamora: módulos con piensos comprados',
                'Rebaño de ovejas de leche en Tierra de Campos. Vende la leche a una quesería que le paga la compensación del REAGP (10,5 % en ganadería) y le retiene el 2 %. Más de la mitad del pienso es comprado: índice corrector 0,50. Cobra la ayuda básica de la PAC y la ayuda asociada al ovino (va con el producto).',
                ['módulos ganaderos (ovino de leche, índice 0,26)', 'piensos adquiridos > 50 % (índice 0,50)', 'REAGP: compensación del 10,5 %', 'ayuda asociada de la PAC', 'amortización del ganado reproductor (22 %)', 'exención del 131'],
                age=55, **worker(0, 0, payers=[])),
         farm=dict(name='Ovino de leche', products=[dict(name='Leche de oveja', indexId='crops', index=0.26, sales=62000, compensation=6510, coupled=3500, feed=True)],
                   pac=5000, assets=[('nave', 'nave', 60000), ('ovejas reproductoras', 'ganado', 30000), ('tractor', 'tractor', 20000)], withheld=1240),
         quarters=None, retained_share=1.0, method='modules'),
    dict(base=P(72, 'vacuno-cria-dehesa-derechos-pac-salamanca', CL, 'Ganadero de vacuno de cría en la dehesa salmantina que vende derechos de pago básico',
                'Vacas nodrizas en estimación directa y REAGP. Vende los terneros a un cebadero que le retiene el 2 % y le paga la compensación del 10,5 %. Cobra la ayuda básica de la PAC y la asociada a la vaca nodriza. Vende 20 derechos de pago básico que recibió gratis en la asignación inicial: ganancia patrimonial en la base del ahorro.',
                ['estimación directa ganadera', 'venta de derechos de pago básico (ganancia del ahorro)', 'ayuda asociada a la vaca nodriza', 'REAGP (10,5 %)', 'exención del 130'],
                age=60, savings=6000, **worker(0, 0, payers=[]),
                savings_steps=['Venta de 20 derechos de pago básico por 6.000 €; valor de adquisición 0 (asignación gratuita) → ganancia **6.000,00** (base del ahorro, art. 46.b)']),
         direct=dict(name='Vacuno de cría', income=[('Venta de terneros', 70000), ('Compensación REAGP 10,5 %', 7350), ('Ayuda básica de la PAC', 9000), ('Ayuda asociada vaca nodriza', 4000)],
                     expenses=[('Piensos y forrajes', 26000), ('Veterinario y medicamentos', 3500), ('Arrendamiento de pastos', 9000), ('Seguro de retirada de cadáveres', 900),
                               ('Cuota de autónomos (RETA agrario)', 3600), ('Gasóleo y reparaciones', 4200)],
                     assets=[('vacas reproductoras', 'ganado', 45000), ('manga y cercados', 'instalaciones', 12000)], withheld=1400),
         quarters=None, retained_share=1.0, method='direct'),
    dict(base=P(73, 'joven-cerealista-primera-instalacion-cooperativa-burgos', CL, 'Joven cerealista de Burgos con la ayuda de primera instalación',
                'Se instaló en 2024 con 32 años. Cobró 40.000 € de ayuda de primera instalación de jóvenes agricultores: la imputa por cuartas partes (art. 14.1.b LIRPF), 10.000 € en 2025. Socio de una cooperativa que le compra el cereal (REAGP 12 %, retención del 2 %) y le paga 400 € de retornos (capital mobiliario, retención del 19 %). Cobra la ayuda complementaria para jóvenes de la PAC.',
                ['ayuda a jóvenes agricultores imputada por cuartas partes (art. 14.1.b)', 'retornos cooperativos (capital mobiliario)', 'estimación directa', 'PAC con complemento para jóvenes'],
                age=33, savings=400, otherWithheld=76, **worker(0, 0, payers=[]),
                savings_steps=['Retornos de la cooperativa 400,00 (retención 76,00) → base del ahorro **400,00**']),
         direct=dict(name='Cereal de secano', income=[('Venta de cebada y trigo a la cooperativa', 52000), ('Compensación REAGP 12 %', 6240), ('Ayuda básica de la PAC', 7000),
                                                      ('Ayuda complementaria para jóvenes (PAC)', 2800), ('Ayuda de primera instalación: 1/4 de 40.000', 10000)],
                     expenses=[('Semillas, abonos y fitosanitarios', 21000), ('Gasóleo agrícola', 6000), ('Arrendamiento de fincas rústicas', 8000), ('Seguro agrario', 1800),
                               ('Cuota de autónomos (RETA agrario)', 3600), ('Intereses del préstamo del tractor', 1500)],
                     assets=[('tractor', 'maquinaria', 90000), ('sembradora', 'maquinaria', 25000)], withheld=1040),
         quarters=None, retained_share=1.0, method='direct'),
    dict(base=P(74, 'viticultor-denominacion-origen-modulos-valladolid', CL, 'Viticultor con uva de denominación de origen en módulos',
                'Viñedo en una denominación de origen de Valladolid. Vende la uva a una bodega (REAGP 12 %, retención del 2 %). Indemnización del seguro agrario por una helada. Índice 0,32 (uva para vino con denominación de origen) y amortización del viñedo al 5 %.',
                ['módulos agrarios (índice 0,32)', 'seguro agrario por helada', 'amortización del viñedo (5 %)', 'exención del 131'],
                age=62, **worker(0, 0, payers=[])),
         farm=dict(name='Viñedo D.O.', products=[dict(name='Uva para vino con D.O.', indexId='rice', index=0.32, sales=45000, compensation=5400, insurance=6000)],
                   pac=1500, assets=[('viñedo', 'citricos-vinedo', 80000), ('tractor', 'tractor', 18000)], withheld=900),
         quarters=None, retained_share=1.0, method='modules'),
    dict(base=P(79, 'apicultor-modulos-y-asalariado-avila', CL, 'Asalariado que además es apicultor en módulos (pluriactividad)',
                'Trabaja en una fábrica de Ávila (30.000 €) y tiene 300 colmenas: vende la miel en mercados y a particulares (sin retención). Módulos agrarios (apicultura, índice 0,26). Paga el 131 del 2 % de lo que vende cada trimestre.',
                ['apicultura en módulos (índice 0,26)', 'asalariado y actividad agraria a la vez', '131 del 2 % sin retenciones', 'otras rentas > 6.500 (sin reducción del art. 20)'],
                age=46, **worker(30000, 4700)),
         farm=dict(name='Apicultura', products=[dict(name='Miel y polen', indexId='crops', index=0.26, sales=16000)], assets=[('nave de extracción', 'nave', 15000)], payments=320),
         quarters=[(2000, 0), (6000, 0), (6000, 0), (2000, 0)], retained_share=0.0, method='modules'),
    dict(base=P(80, 'porcino-engorde-integrado-segovia', CL, 'Ganadero de porcino de engorde integrado (servicios de cría y engorde)',
                'Engorda cerdos de una empresa integradora que le paga por cerdo y le retiene el 1 % (engorde de porcino, art. 95.4.1.º RIRPF). Módulos: servicios de cría, guarda y engorde de ganado (índice 0,37). Paga a un trabajador (coste del 25 % del volumen: índice 0,85).',
                ['retención del 1 % del porcino de engorde', 'servicios de cría, guarda y engorde (índice 0,37)', 'índice corrector por personal asalariado', 'exención del 131'],
                age=50, **worker(0, 0, payers=[])),
         farm=dict(name='Engorde de porcino integrado', products=[dict(name='Servicios de engorde para la integradora', indexId='fodder', index=0.37, sales=80000)],
                   assets=[('nave de cebo', 'nave', 150000)], staffCost=20000, withheld=800),
         quarters=None, retained_share=1.0, method='modules'),
    dict(base=P(82, 'chopera-forestal-leon', CL, 'Propietario de una chopera en León: corta forestal en módulos',
                'Pensionista (16.000 €) que vende la corta de su chopera a un aserradero (retención del 2 %). Actividad forestal con período medio de corta de 30 años o menos (índice 0,26). En la actividad forestal no se deducen amortizaciones.',
                ['actividad forestal en módulos (índice 0,26)', 'retención del 2 % forestal (art. 95.5)', 'sin amortizaciones en forestal', 'pensionista con actividad'],
                age=68, retired=True, nonSalary=16000, **worker(0, 0, payers=[payer('Instituto Ficticio de Pensiones', 'Q00000821', 16000, 900)])),
         farm=dict(name='Chopera', products=[dict(name='Madera de chopo', indexId='forestShort', index=0.26, sales=24000, compensation=2880)], forest=True, withheld=480),
         quarters=None, retained_share=1.0, method='modules'),
    dict(base=P(83, 'olivarero-almazara-cooperativa-jaen', AN, 'Olivarero de Jaén socio de una almazara cooperativa',
                'Olivar tradicional. Entrega la aceituna a su cooperativa (REAGP 12 %, retención del 2 %). Contrata cuadrillas para la recolección (coste del 15 % del volumen: índice 0,90). Cobra la ayuda básica de la PAC y un ecorregimen (exento). Amortización del olivar al 3 %.',
                ['módulos agrarios del olivar (0,26)', 'personal asalariado (índice 0,90)', 'amortización del olivar (3 %)', 'ecorregimen exento', 'REAGP 12 %'],
                age=57, **worker(0, 0, payers=[])),
         farm=dict(name='Olivar', products=[dict(name='Aceituna de almazara', indexId='crops', index=0.26, sales=60000, compensation=7200)], pac=6000, eco=1500,
                   assets=[('olivar', 'olivar', 90000), ('tractor y vibrador', 'tractor', 30000)], staffCost=11000, withheld=1200),
         quarters=None, retained_share=1.0, method='modules'),
    dict(base=P(85, 'horticultor-invernadero-directa-exporta-almeria', AN, 'Horticultor de invernadero en Almería: directa, IVA general y exportación a Alemania',
                'Invernadero de pimiento. Régimen general del IVA (4 %). Vende el 60 % a un mayorista alemán (entrega intracomunitaria) y el 40 % a una alhóndiga que le retiene el 2 %. Contrata a dos trabajadores (modelo 111). Pagos fraccionados del 2 % (130, sección II).',
                ['estimación directa agraria', '303 al 4 % con entregas intracomunitarias', '130 sección II', '111 por sus trabajadores', 'amortización del invernadero'],
                age=42, **worker(0, 0, payers=[])),
         direct=dict(name='Hortalizas de invernadero', income=[('Ventas a la alhóndiga', 40000), ('Entregas a Alemania', 60000)],
                     expenses=[('Semillas, abonos y fitosanitarios', 16000), ('Sueldos de dos trabajadores', 30000), ('Seguridad Social de la empresa', 9500), ('Agua de riego y luz', 5000),
                               ('Seguro agrario', 1500), ('Cuota de autónomos (RETA)', 3600)],
                     assets=[('invernadero', 'instalaciones', 60000), ('sistema de riego por goteo', 'instalaciones', 15000)], withheld=800, payments=1200),
         vat=[dict(sales={4: 10000}, eu=15000, purchases={10: 3000, 21: 1500}), dict(sales={4: 10000}, eu=15000, purchases={10: 3000, 21: 1500}),
              dict(sales={4: 10000}, eu=15000, purchases={10: 3000, 21: 1500}), dict(sales={4: 10000}, eu=15000, purchases={10: 3000, 21: 1500})],
         quarters=[(25000, 200), (25000, 200), (25000, 200), (25000, 200)], retained_share=0.4, method='direct'),
    dict(base=P(87, 'viuda-derechos-pac-arrendamiento-rustico-cordoba', AN, 'Viuda que arrienda la finca de su marido y vende sus derechos de pago básico',
                'Pensión de viudedad de 12.500 €. Heredó la explotación: arrienda las tierras (rendimiento del capital inmobiliario de una finca rústica, sin reducción y sin retención) y vende los derechos de pago básico heredados (ganancia: valor de venta menos el de la herencia).',
                ['pensión de viudedad', 'arrendamiento de finca rústica', 'venta de derechos de pago básico heredados', 'mínimos andaluces'],
                age=69, retired=True, nonSalary=12500, savings=2500, **worker(0, 0, payers=[payer('Instituto Ficticio de Pensiones (viudedad)', 'Q00000871', 12500, 200)]),
                rental=dict(income=9000, interest=0, repairs=0, other=600, construction=0, reduction=0, reductionId='',
                            expenses={'tributos-tasas': '600'}, why='Finca rústica: sin reducción (art. 23.2 solo para viviendas); IBI rústico como gasto'),
                savings_steps=['Derechos de pago básico: venta 10.000 − valor en la herencia (Impuesto sobre Sucesiones) 7.500 = ganancia **2.500,00** (base del ahorro)']),
         quarters=None, retained_share=1.0, method='none'),
    dict(base=P(94, 'maiz-regadio-arrendado-modulos-huesca', 'aragon', 'Agricultor de maíz en regadío eléctrico y tierras arrendadas (Huesca)',
                'Cultiva maíz en tierras arrendadas regadas con bombeo eléctrico inscrito: índices correctores 0,90 (tierras arrendadas) y 0,75 (regadío con energía eléctrica). Vende a una cooperativa (REAGP 12 %, retención del 2 %).',
                ['índice corrector de tierras arrendadas (0,90)', 'índice corrector de regadío eléctrico (0,75)', 'módulos agrarios del cereal (0,26)', 'escala de Aragón'],
                age=53, **worker(0, 0, payers=[])),
         farm=dict(name='Maíz de regadío', products=[dict(name='Maíz', indexId='crops', index=0.26, sales=95000, compensation=11400, rented=True, electric=True)],
                   pac=8000, assets=[('tractor', 'tractor', 60000), ('cosechadora', 'tractor', 40000)], withheld=1900),
         quarters=None, retained_share=1.0, method='modules'),
    dict(base=P(97, 'lechuga-ecologica-regadio-modulos-murcia', 'murcia', 'Hortelano de lechuga ecológica en el Campo de Cartagena',
                'Lechuga ecológica certificada (índice corrector 0,95) en regadío eléctrico (0,75). Vende a una comercializadora (REAGP 12 %, retención del 2 %).',
                ['agricultura ecológica (0,95)', 'regadío eléctrico (0,75)', 'hortícolas (0,26)', 'escala de Murcia'],
                age=40, **worker(0, 0, payers=[])),
         farm=dict(name='Lechuga ecológica', products=[dict(name='Lechuga', indexId='crops', index=0.26, sales=70000, compensation=8400, organic=True, electric=True)],
                   assets=[('sistema de riego y nave', 'nave', 40000), ('tractor', 'tractor', 35000)], withheld=1400),
         quarters=None, retained_share=1.0, method='modules'),
    dict(base=P(103, 'vacuno-leche-titularidad-compartida-pontevedra', 'galicia', 'Ganadera de vacuno de leche en titularidad compartida',
                'Explotación de vacuno de leche inscrita en titularidad compartida con su marido (Ley 35/2011): cada uno declara el 50 % del rendimiento. Estimación directa y REAGP (10,5 %); la cooperativa retiene el 2 % (repartido al 50 %).',
                ['titularidad compartida (50 % cada cónyuge)', 'vacuno de leche en directa', 'REAGP 10,5 %', 'exención del 130'],
                age=45, **worker(0, 0, payers=[])),
         direct=dict(name='Vacuno de leche (50 %)', share=0.5, income=[('Venta de leche', 180000), ('Venta de terneros', 12000), ('Compensación REAGP 10,5 %', 20160), ('Ayuda básica de la PAC', 10000)],
                     expenses=[('Piensos', 90000), ('Veterinario', 8000), ('Seguros sociales de un trabajador y su sueldo', 30000), ('Luz y gasóleo', 12000), ('Cuotas de autónomos de los dos titulares', 7200),
                               ('Seguro agrario y de retirada', 2500)],
                     assets=[('vacas', 'ganado', 100000), ('robot de ordeño', 'maquinaria', 90000), ('establo', 'edificios', 200000)], withheld=1920),
         quarters=None, retained_share=1.0, method='direct'),
    dict(base=P(106, 'fruticultor-arranque-perales-modulos-lleida', 'cataluna', 'Fruticultor de Lleida que arranca perales con ayuda de la PAC',
                'Manzana y pera (frutos no cítricos, índice 0,37) en módulos y REAGP. Cobra 12.000 € de prima de arranque de perales: renta exenta (DA 5.ª.1.a.6.ª LIRPF), fuera del volumen. Amortización de los frutales al 10 %.',
                ['frutos no cítricos (índice 0,37)', 'prima de arranque exenta (DA 5.ª)', 'amortización de frutales (10 %)', 'escala de Cataluña'],
                age=61, **worker(0, 0, payers=[])),
         farm=dict(name='Fruta dulce', products=[dict(name='Manzana y pera', indexId='fodder', index=0.37, sales=75000, compensation=9000)], pac=3000,
                   assets=[('frutales', 'frutales', 60000), ('tractor y plataforma', 'tractor', 40000)], withheld=1500),
         quarters=None, retained_share=1.0, method='modules', exempt_note=('Prima de arranque de perales (12.000 €)', 'Exenta (DA 5.ª.1.a.6.ª LIRPF): no se integra.')),
    dict(base=P(107, 'viticultor-sin-do-sequia-modulos-ciudad-real', 'castilla-la-mancha', 'Viticultor manchego sin denominación de origen con ayuda por sequía',
                'Uva para vino sin denominación de origen (índice 0,26). Cobra 3.000 € de ayuda extraordinaria por la sequía: subvención corriente que entra en el volumen y en el índice del producto. Vende a una cooperativa (REAGP 12 %, retención del 2 %).',
                ['ayuda por sequía (subvención corriente en el volumen)', 'uva sin denominación de origen (0,26)', 'rendimiento minorado ≤ 9.447,91 € (índice 0,90)'],
                age=64, **worker(0, 0, payers=[])),
         farm=dict(name='Viñedo sin D.O.', products=[dict(name='Uva para vino sin D.O.', indexId='crops', index=0.26, sales=26000, compensation=3120, drought=3000)],
                   assets=[('viñedo', 'citricos-vinedo', 50000), ('tractor', 'tractor', 12000)], withheld=520),
         quarters=None, retained_share=1.0, method='modules'),
]

AUTONOMOS = [
    A(67, 'comercio-kit-digital-ayuda-contratacion-alicante', V, 'Tienda de Alicante con Kit Digital, ayuda a la contratación, empleada y local',
         'Comercio de electrodomésticos (estimación directa simplificada, IVA general). Cobra 3.000 € del Kit Digital y 4.500 € de ayuda autonómica por contratar a una trabajadora indefinida: subvenciones corrientes, ingreso de la actividad sin IVA. Local alquilado a un particular (115) y una empleada (111).',
         ['Kit Digital (subvención corriente)', 'ayuda a la contratación', '111 y 115', '303 general', '130 con subvenciones'],
         ['130', '303', '111', '115', '180', '190', '347', '390', 'RETA'],
         vat='general', method='simplificada',
         sales=[dict(client='Ventas a particulares (tiques del mes)', nif='', share=1.0)], income=[30000, 32000, 28000, 45000], rate=21,
         monthly=[dict(name='Arrendador Ficticio del local', nif=nif(671), kind='rent', base=1200, rate=21, ret=19),
                  dict(name='Eléctrica Ficticia, S.A.', nif='A00000672', kind='supplies', base=250, rate=21, ret=0)],
         quarterly=[dict(name='Distribuidor Ficticio de Electrodomésticos, S.A.', nif='A00000673', kind='material', base=[18000, 19000, 17000, 27000], rate=21)],
         staff=dict(people=1, monthly=1500, rate=4, employerSS=480), subsidies=[dict(q=2, name='Kit Digital', amount=3000), dict(q=3, name='Ayuda a la contratación indefinida', amount=4500)]),
    A(99, 'abogado-retenciones-130-exento-murcia', 'murcia', 'Abogado en Murcia con retención en casi todos sus ingresos',
         'Abogado que factura a empresas con retención del 15 % (más del 70 %): no presenta el 130. Le cobra 21 % de IVA. Una parte la factura a particulares sin retención.',
         ['exención del 130 por retenciones (art. 109.2)', '303 general', 'profesional con retención del 15 %'],
         ['303', '390', 'RETA'],
         vat='general', method='simplificada', exempt130=True,
         sales=[dict(client='Empresa Cliente Ficticia Murciana, S.L.', nif='B00000991', share=0.8, ret=15), dict(client='Cliente particular ficticio', nif=nif(992), share=0.2, ret=0)],
         income=[12000, 14000, 9000, 15000], rate=21,
         monthly=[dict(name='Despacho Compartido Ficticio, S.L.', nif='B00000993', kind='other', base=300, rate=21, ret=0),
                  dict(name='Base de Datos Jurídica Ficticia, S.L.', nif='B00000994', kind='software', base=90, rate=21, ret=0)]),
]

FUERA = [
    dict(n=90, slug=f'{PREFIX}-90-hostelera-cese-actividad-cadiz', ccaa=AN, title='Hostelera de Cádiz que cerró su bar y cobró la prestación por cese de actividad',
         story='Cerró su bar en estimación directa en junio de 2025 y cobró 3.600 € de prestación por cese de actividad (rendimiento del trabajo). Vendió la maquinaria con pérdida (base general). El bar estaba en directa simplificada: rendimiento de enero a junio.',
         tests=['prestación por cese de actividad (trabajo)', 'cese de la actividad a mitad de año', 'pérdida por venta de elementos afectos'], models=['100', '130'],
         reason='Falta el detalle de la actividad (libros) y el motor no recoge todavía actividades desde el formulario: se deja como caso de prueba de importación.'),
    dict(n=100, slug=f'{PREFIX}-100-autonoma-maternidad-madrid', ccaa='madrid', title='Autónoma de Madrid que tiene un hijo en 2025',
         story='Diseñadora autónoma (directa simplificada). Su hijo nace en febrero: la Seguridad Social le paga la prestación por nacimiento (exenta, art. 7.h) y durante el descanso no paga la cuota de autónomos (bonificación). Deducción por maternidad de febrero a diciembre.',
         tests=['prestación por nacimiento de una autónoma (exenta)', 'maternidad de una autónoma (alta en el RETA)', 'bonificación de la cuota durante el descanso'], models=['100', '130', '303'],
         reason='La bonificación de la cuota de autónomos durante el descanso por nacimiento (art. 38 bis Ley 20/2007) y su efecto en el 130 no están confirmados en fuente oficial en esta revisión.'),
    dict(n=108, slug=f'{PREFIX}-108-agricultor-navarra-foral-fuera-de-alcance', ccaa='navarra', title='Agricultor de la Ribera de Navarra (régimen foral)',
         story='Agricultor de espárrago y pimiento en Tudela: su IRPF (modelo F-90), sus módulos agrarios y sus pagos fraccionados van ante la Hacienda Foral de Navarra.',
         tests=['territorio foral: Navarra (agrario)'], models=['F-90 (Navarra)'], reason='Territorio foral de Navarra: normativa, módulos y modelos propios.'),
]


# ─── Construcción ─────────────────────────────────────────────────────────────

PROPOSALS_FILE = os.path.join(OUT, f'{PREFIX}-propuestas-motor.json')


def load_proposals():
    if not os.path.exists(PROPOSALS_FILE):
        return {}
    with open(PROPOSALS_FILE, encoding='utf-8') as fh:
        return {(r['caso'], r['declaracion'], r['campo']): r for r in json.load(fh)['renta']}


PROPOSALS = load_proposals()


def figures3(p, b, decl, ref):
    out = []
    for k in p2.BOXES:
        if k not in b or (k == '0155' and not b[k]):
            continue
        campo = f'boxes.{k}' if k in ENGINE_BOXES else None
        out.append(dict(modelo='100', declaracion=decl, casilla=k, concepto=BOX_LABELS[k], importe=b[k], origen='calculo-a-mano', ref=ref, campo=campo))
    for k in p2.CAMPOS:
        if b.get(k):
            out.append(dict(modelo='100', declaracion=decl, casilla=None, concepto=p2.LABELS[k], importe=b[k], origen='calculo-a-mano', ref=ref, campo=f'result.{k}'))
    if b.get('activityNet'):
        out.append(dict(modelo='100', declaracion=decl, casilla=None, concepto='Rendimiento neto de actividades económicas (base general)', importe=b['activityNet'],
                        origen='calculo-a-mano', ref=ref, campo='activities.total'))
    if b.get('gainsGeneral'):
        out.append(dict(modelo='100', declaracion=decl, casilla='0303', concepto='Ganancias patrimoniales de la base general (ayudas públicas)', importe=b['gainsGeneral'],
                        origen='calculo-a-mano', ref=ref, campo='savings.0420'))
    for f in out:
        k = PROPOSALS.get((p['slug'], decl, f['campo']))
        if k and abs(k['esperado'] - f['importe']) < 0.005:
            f.update(campo=None, motorPropuesto=dict(campo=k['campo'], obtenido=k['obtenido']),
                     motivo=f'Discrepancia propuesta: el motor da {eur(k["obtenido"])}. ' + k.get('motivo', 'Revisar con el agente del motor.'))
    return out


def form3(p):
    f = p2.form2(p)
    if p.get('gainsGeneral'):
        # The savings in detail carry the gains of the general base (rentaGains.ts SavingsDetail).
        f['savingsDetail'] = dict(capital=dict(interest=0, dividends=0, assets=0, insurance=0, expenses=0), assets=[], properties=[],
                                  otherGains=[p['savings']] if p.get('savings') else [], generalGains=[p['gainsGeneral']],
                                  pending=dict(gains=[], capital=[], general=[]))
        f['savings'] = ''
    if p.get('actividadPropuesta'):
        # The engine takes the activities (rentaActivity.ts) and adds their withholdings and
        # quarterly payments to box 0609 itself: they leave the plain withholdings of the form.
        f['activities'] = p['actividadPropuesta']
        own = sum(a.get('withheld', 0) + a.get('payments', 0) for a in p['actividadPropuesta'])
        f['withheld'] = str(r2(float(f['withheld'] or 0) - own))
    return f


def build_renta3(p):
    steps = Steps()
    decls, figures = [], []
    if not p.get('only_joint'):
        steps.lines.append('\n## Declaración individual del primer declarante\n')
    if p.get('savings_steps'):
        steps.h('0. Rentas del ahorro')
        for line in p['savings_steps']:
            steps.s(line)
    b = None
    if not p.get('only_joint'):
        b = p2.renta2(p, steps)
        figures += figures3(p, b, 'individual', 'calculo.md#declaración-individual-del-primer-declarante')
    else:
        b = p2.renta2(p, Steps())
    decls.append(dict(id='individual', form=form3(p)))
    if p.get('joint'):
        steps.lines.append('\n## Declaración conjunta\n')
        bj = p2.renta2(dict(p), steps, joint=p['joint'])
        figures += figures3(p, bj, 'conjunta', 'calculo.md#declaración-conjunta')
        if not p.get('only_joint'):
            steps.s(f'Comparación: individual {eur(b["0670"])} frente a conjunta {eur(bj["0670"])} → {"mejor la individual" if b["0670"] <= bj["0670"] else "mejor la conjunta"}')
    if len(p.get('payers', [])) > 1:
        others = sum(sorted(x['gross'] for x in p['payers'])[:-1])
        must = p['gross'] > 22000 or (p['gross'] > 15876 and others > 1500)
        figures.append(dict(modelo='100', declaracion='individual', casilla=None, concepto='Obligación de declarar (1 sí, 0 no; art. 96 LIRPF)', importe=1.0 if must else 0.0,
                            origen='calculo-a-mano', ref='calculo.md#declaración-individual-del-primer-declarante', campo='obligation.required'))
    for concept, why in p.get('pending', []):
        figures.append(dict(modelo='100', declaracion='individual', casilla=None, concepto=concept, importe=None, origen='pendiente', motivo=why, campo=None))
    return decls, figures, steps, b


def agro_person(item):
    """Una persona del sector agrario: su actividad de 2025 en la Renta y sus pagos fraccionados e IVA de 2026."""
    p = dict(item['base'])
    lines = []
    proposal = None
    figs_extra = []
    act_figs = []
    if item.get('farm'):
        net, det, proposal = farm_modules(item['farm'], lines)
        f = item['farm']
        for k, label in (('volume', 'Volumen de ingresos de la actividad agraria'), ('previous', 'Rendimiento neto previo'), ('depreciation', 'Amortizaciones'),
                         ('reduced', 'Rendimiento neto minorado'), ('modules', 'Rendimiento neto de módulos'), ('general', 'Reducción general del 5 %'), ('net', 'Rendimiento neto de la actividad')):
            act_figs.append(dict(modelo='100', declaracion='individual', casilla=None, concepto=f'Módulos agrarios: {label}', importe=det[k], origen='calculo-a-mano',
                                 ref='calculo.md#3-bis-rendimientos-de-actividades-económicas-lirpf-arts-27-32',
                                 campo=f'activity.0.{"income" if k == "volume" else k}'))
        withheld = f.get('withheld', 0)
        payments = f.get('payments', 0)
    elif item.get('direct'):
        net, det, proposal = direct_activity(item['direct'], lines)
        for k, label in (('income', 'Ingresos'), ('expenses', 'Gastos con amortizaciones'), ('provisions', 'Difícil justificación (5 %)'), ('net', 'Rendimiento neto')):
            act_figs.append(dict(modelo='100', declaracion='individual', casilla=None, concepto=f'Estimación directa: {label}', importe=det[k], origen='calculo-a-mano',
                                 ref='calculo.md#3-bis-rendimientos-de-actividades-económicas-lirpf-arts-27-32', campo=f'activity.0.{k}'))
        withheld = item['direct'].get('withheld', 0)
        payments = item['direct'].get('payments', 0)
    else:
        net = 0
        withheld = payments = 0
    data_lines = []
    if item.get('farm'):
        fm = item['farm']
        for x in fm['products']:
            data_lines.append(f'{x["name"]}: ventas {eur(x["sales"])}' + (f'; compensación del REAGP cobrada {eur(x["compensation"])}' if x.get('compensation') else '')
                              + (f'; ayuda acoplada {eur(x["coupled"])}' if x.get('coupled') else '') + (f'; indemnización del seguro agrario {eur(x["insurance"])}' if x.get('insurance') else '')
                              + (f'; ayuda por sequía {eur(x["drought"])}' if x.get('drought') else ''))
        if fm.get('pac'):
            data_lines.append(f'PAC: ayuda básica a la renta y pagos desacoplados {eur(fm["pac"])}')
        if fm.get('eco'):
            data_lines.append(f'PAC: ecorregímenes {eur(fm["eco"])}')
        for name, group, cost in fm.get('assets', []):
            data_lines.append(f'Inmovilizado: {name}, coste {eur(cost)}')
        if fm.get('staffCost'):
            data_lines.append(f'Coste del personal asalariado {eur(fm["staffCost"])}')
        data_lines.append(f'Retenciones practicadas por los compradores (certificado) {eur(fm.get("withheld", 0))}; pagos fraccionados ingresados {eur(fm.get("payments", 0))}')
    elif item.get('direct'):
        dm = item['direct']
        data_lines += [f'Ingreso: {k} {eur(v)}' for k, v in dm['income']] + [f'Gasto: {k} {eur(v)}' for k, v in dm['expenses']]
        data_lines += [f'Inmovilizado: {name}, coste {eur(cost)}' for name, group, cost in dm.get('assets', [])]
        data_lines.append(f'Retenciones practicadas por los compradores (certificado) {eur(dm.get("withheld", 0))}; pagos fraccionados ingresados {eur(dm.get("payments", 0))}')
    p['dataLines'] = data_lines
    if net:
        p['activityNet'] = net
        p['activitySteps'] = lines + [f'Retenciones de la actividad (cooperativa, almacén o integradora) {eur(withheld)} y pagos fraccionados {eur(payments)}: '
                                      'van a los pagos a cuenta (0599 y 0604)']
        p['otherWithheld'] = r2(p.get('otherWithheld', 0) + withheld + payments)
        p['actividadPropuesta'] = [proposal]
        p['gap_reason'] = ACT_GAP
    if item.get('exempt_note'):
        p.setdefault('pending', []).append(item['exempt_note'])
    if item['base'].get('rental'):
        p['rental'] = item['base']['rental']
    decls, figures, steps, b = build_renta3(p)
    figures += act_figs
    # 2026: pagos fraccionados e IVA.
    if item['method'] in ('direct', 'modules'):
        steps.lines.append('\n## Pagos fraccionados de 2026\n')
        qs = item.get('quarters') or [(0, 0)] * 4
        s, rows = quarterly_2pct(p['n'], p['title'], qs, item['method'], item['retained_share'], figs_extra)
        for line in s:
            steps.s(line)
        p['m130'] = rows if item['method'] == 'direct' else []
        p['m131'] = rows if item['method'] == 'modules' else []
    if item.get('vat'):
        steps.lines.append('\n## IVA de 2026\n')
        s, rows = vat303(item['vat'], figs_extra)
        for line in s:
            steps.s(line)
        eu = [d.get('eu', 0) for d in item['vat']]
        for q, v in enumerate(eu, start=1):
            if v:
                figs_extra.append(dict(modelo='349', periodo=f'{q}T', casilla=None, concepto='Clave E, entregas intracomunitarias de bienes', importe=float(v), origen='calculo-a-mano',
                                       ref='calculo.md#iva-de-2026', campo=None))
        p['m303'] = rows
    elif item['method'] in ('direct', 'modules') and item.get('farm', item.get('direct')):
        steps.lines.append('\n## IVA de 2026\n')
        steps.s('Régimen especial de la agricultura, ganadería y pesca (arts. 124-134 LIVA): no presenta 303; cobra la compensación a tanto alzado (12 % agrícola y forestal, '
                '10,5 % ganadero) de sus clientes empresarios, que forma parte de sus ingresos (Manual de Renta 2025, «IVA devengado»).')
    return p, decls, figures + figs_extra, steps


def main():
    index = []
    written = []
    for p in RENTA:
        decls, figures, steps, b = build_renta3(p)
        decls[0]['form'] = form3(p)
        written.append((p, decls, figures, steps, ['100'], 'dentro', 2025))
    for item in AGRO:
        p, decls, figures, steps = agro_person(item)
        decls[0]['form'] = form3(p)
        models = ['100'] + (['130'] if item['method'] == 'direct' else ['131'] if item['method'] == 'modules' else []) + (['303', '349'] if item.get('vat') else [])
        written.append((p, decls, figures, steps, models, 'parcial' if item['method'] != 'none' else 'dentro', 2025))
    for p, decls, figures, steps, models, alcance, year in written:
        persona = p2.base_persona(p['n'], p['slug'], p['ccaa'], p['title'], p['story'], p['tests'], models, alcance, year)
        persona['banco'] = PREFIX
        persona['renta'] = dict(declaraciones=decls, conjunta=dict(kind=p['joint']['kind'], livesWithOtherParent=False) if p.get('joint') else None)
        persona['documentos'] = dict(borrador=p2.borrador2(p, [f for f in figures if f['modelo'] == '100' and 'declaracion' in f]) if not p.get('only_joint') else None, pagadores=p['payers'], ahorro=p.get('savings_steps', []),
                                     alquiler=p.get('rental'), actividad=p.get('dataLines', []), m130=p.get('m130', []), m131=p.get('m131', []), m303=p.get('m303', []))
        if p.get('actividadPropuesta'):
            persona['actividadPropuesta'] = p['actividadPropuesta']
        if p.get('joint') and p['joint'].get('partner'):
            persona['conyuge'] = dict(nombre=f'Persona Ficticia {p["n"]:02d}-B', nif=nif(300 + p['n']))
        esperado = dict(slug=p['slug'], ejercicio=2025, comprobado=CHECKED, cifras=figures)
        p2.write(os.path.join(OUT, p['slug']), persona, esperado, p['title'], p['story'], steps,
                 extra_sources=f' Módulos agrarios: [Orden HAC/1347/2024]({BOE_MODULOS}) y [caso práctico oficial del Manual, cap. 9]({MANUAL_C09}).')
        index.append(dict(slug=p['slug'], titulo=p['title'], comunidad=p['ccaa'], modelos=models, prueba=p['tests'], alcance=alcance))
    for a in AUTONOMOS:
        figs, steps, data = p2.build_autonomo2(a)
        persona = p2.base_persona(a['n'], a['slug'], a['ccaa'], a['title'], a['story'], a['tests'], a['models'], 'parcial', 2026)
        persona['banco'] = PREFIX
        persona['autonomoPropuesto'] = dict(ejercicio=2026, regimenIva=a['vat'], estimacion=a['method'], movimientos=data['movements'], inputs=data['inputs'])
        persona['documentos'] = dict(emitidas=data['issued'], recibidas=data['received'], banco=data['bank'], m303=data['m303'], m130=data['m130'], m111=data['m111'], m115=data['m115'])
        esperado = dict(slug=a['slug'], ejercicio=2026, comprobado=CHECKED, cifras=figs)
        p2.write(os.path.join(OUT, a['slug']), persona, esperado, a['title'], a['story'], steps)
        index.append(dict(slug=a['slug'], titulo=a['title'], comunidad=a['ccaa'], modelos=a['models'], prueba=a['tests'], alcance='parcial'))
    for o in FUERA:
        persona = p2.base_persona(o['n'], o['slug'], o['ccaa'], o['title'], o['story'], o['tests'], o['models'], 'fuera', 2025)
        persona['banco'] = PREFIX
        persona['motivoFueraDeAlcance'] = o['reason']
        persona['documentos'] = {}
        steps = Steps()
        steps.s(f'Fuera de alcance: {o["reason"]}')
        figs = [dict(modelo=o['models'][0], casilla=None, concepto='Resultado del modelo', importe=None, origen='pendiente', motivo=o['reason'], campo=None)]
        p2.write(os.path.join(OUT, o['slug']), persona, dict(slug=o['slug'], ejercicio=2025, comprobado=CHECKED, cifras=figs), o['title'], o['story'], steps)
        index.append(dict(slug=o['slug'], titulo=o['title'], comunidad=o['ccaa'], modelos=o['models'], prueba=o['tests'], alcance='fuera'))
    index.sort(key=lambda x: x['slug'])
    with open(os.path.join(OUT, f'{PREFIX}-indice.json'), 'w', encoding='utf-8') as fh:
        json.dump(index, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    print(f'{len(index)} personas {PREFIX} en {OUT}')


if __name__ == '__main__':
    main()
