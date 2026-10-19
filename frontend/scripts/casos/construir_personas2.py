#!/usr/bin/env python3
"""
Banco de casos prácticos de Finanverso, segunda tanda (prefijo «p2-»): 30 personas FICTICIAS más, en
comunidades y supuestos que la primera tanda no cubre (Asturias, Cantabria, Castilla-La Mancha,
Extremadura, La Rioja, Ceuta, Melilla y, con otros perfiles, Canarias, Baleares, Cataluña, Galicia,
Comunitat Valenciana, Navarra y Gipuzkoa).

Escribe, para cada persona, docs/casos-practicos/personas/p2-NN-<slug>/{persona.json, esperado.json,
calculo.md} y el índice personas/p2-indice.json. NO toca las personas 01-28 ni su indice.json.
Los documentos (PDF y Excel) los genera después `node frontend/scripts/casos/run-personas2.mjs`.

    python3 -I frontend/scripts/casos/construir_personas2.py

Reutiliza las reglas y el cálculo a mano de construir_casos.py (se importa, no se modifica) y añade:
pensión compensatoria (art. 55), anualidades por alimentos a los hijos (arts. 64 y 75), plan del
cónyuge (art. 51.7), reducción de la DT 12.ª por rescate de un plan en forma de capital, mínimo por
discapacidad de descendientes propio de La Rioja, deducción del 60 % de Ceuta y Melilla (art. 68.4),
gastos de asistencia con un 33 % (art. 60.3) y un modelo de autónomo más general (estimación directa
normal y simplificada, prorrata, recargo de equivalencia, inversión del sujeto pasivo, IGIC, Ceuta al
8 %, exención del 130 por retenciones, tarifa plana y pluriactividad).

Lo que el motor de la app aún no calcula se marca en esperado.json con `campo: null` y un `motivo`; las
diferencias entre el motor y el cálculo a mano que hay que revisar van en `motorPropuesto` (campo que
debería compararse y valor que da hoy el motor) para que el agente del motor las pase a
discrepancias.json. Todos los nombres, NIF, direcciones y cuentas son INVENTADOS.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import construir_casos as cc  # noqa: E402
from construir_casos import (  # noqa: E402
    BOX_LABELS, CAMPO_LABELS, CHECKED, ENGINE_BOXES, MANUAL, RETA_BRACKETS, SAVINGS_HALF, SRC, STATE_MIN, STATE_SCALE, Steps, eur,
    low_pay, nif, r2, scale_tax, work_reduction)

OUT = cc.OUT
PREFIX = 'p2'
SEDE = 'https://sede.agenciatributaria.gob.es/Sede'
BOE_LIRPF = 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764'
BOE_RIRPF = 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820'
BOE_LIVA = 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740'
I303 = f'{SEDE}/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html'
IVA_DEVENGADO = f'{MANUAL}/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html'
ALIMENTOS = f'{MANUAL}/c15-calculo-impuesto-determinacion-cuotas-integras/especialidades-determinacion-cuota-integra-estatal-autonomica/anualidades-alimentos-favor-hijos/ejemplo-anualidades-alimentos-favor-hijos.html'
DONATIVOS = f'{MANUAL}/c16-deducciones-generales-cuota/deducciones-donativos-otras-aportaciones/donativos-realizados-entidades-incluidas/ejemplo-deduccion-donativos.html'

DEFAULT_REGIONAL = [(0, 9.5), (12450, 12), (20200, 15), (35200, 18.5), (60000, 22.5)]
# Escalas y mínimos autonómicos 2025 copiados de frontend/src/modules/tools/data/renta/ccaa/*.ts (cada
# archivo cita su fuente; None = los del Estado). Ceuta y Melilla: la escala autonómica supletoria.
NEW_CCAA = {
    'asturias': dict(name='Principado de Asturias', scale=[(0, 9), (12450, 12), (17707.2, 14), (33007.2, 19.2), (53407.2, 21.5), (70000, 22.5), (90000, 25), (175000, 26)],
                     min=dict(personal=6105, descendants=[2640, 2970, 4400, 4950], under3=3080, ascendants=1265, ascendantsOver75=1540,
                              over65=1265, over75=1540, disability33=3300, disability65=9900, assistance=3300)),
    'cantabria': dict(name='Cantabria', scale=[(0, 8.5), (13000, 11), (21000, 14.5), (35200, 18), (60000, 22.5), (90000, 24.5)], min=None),
    'castilla-la-mancha': dict(name='Castilla-La Mancha', scale=[(0, 9.5), (12450, 12), (20200, 15), (35200, 18.5), (60000, 22.5)], min=None),
    'extremadura': dict(name='Extremadura', scale=[(0, 8), (12450, 10), (20200, 16), (24200, 17.5), (35200, 21), (60000, 23.5), (80200, 24), (99200, 24.5), (120200, 25)], min=None),
    # La Rioja solo fija el mínimo por discapacidad de los DESCENDIENTES (3.300 / 9.900); la asistencia sigue en 3.000.
    'la-rioja': dict(name='La Rioja', scale=[(0, 8), (12450, 10.6), (20200, 13.6), (35200, 17.8), (40000, 18.3), (50000, 19), (60000, 24.5), (120000, 27)], min=None,
                     descDisability=dict(d33=3300, d65=9900)),
    'ceuta': dict(name='Ceuta', scale=DEFAULT_REGIONAL, min=None),
    'melilla': dict(name='Melilla', scale=DEFAULT_REGIONAL, min=None),
}
cc.CCAA.update(NEW_CCAA)
CCAA = cc.CCAA

CITIES = {'asturias': ('33001', 'Oviedo'), 'cantabria': ('39001', 'Santander'), 'castilla-la-mancha': ('45001', 'Toledo'),
          'extremadura': ('06800', 'Mérida'), 'la-rioja': ('26001', 'Logroño'), 'ceuta': ('51001', 'Ceuta'), 'melilla': ('52001', 'Melilla'),
          'canarias': ('38001', 'Santa Cruz de Tenerife'), 'baleares': ('07701', 'Maó'), 'cataluna': ('17001', 'Girona'),
          'galicia': ('27001', 'Lugo'), 'comunitat-valenciana': ('03001', 'Alacant'), 'navarra': ('31001', 'Pamplona'),
          'pais-vasco': ('20001', 'Donostia / San Sebastián')}


def home(n, ccaa):
    cp, city = CITIES[ccaa]
    return f'Calle Ficticia {n}, {cp} {city} (dirección inventada)'


def ss_of(gross):
    """Cotización del trabajador 2025: 4,70 + 1,55 + 0,10 + 0,13 (MEI) = 6,48 % (Orden PJC/178/2025)."""
    return r2(gross * 0.0648)


# ─── Renta 2025: cálculo a mano (construir_casos.renta ampliado) ──────────────

def disability_min(level, assistance, m):
    if level >= 65:
        return m['disability65'] + m['assistance']
    if level >= 33:
        return m['disability33'] + (m['assistance'] if assistance else 0)
    return 0


def minimum_of(m, fam, steps, label, joint_partner=None, desc_dis=None):
    items = {'personal': m['personal']}
    age_extra = (m['over65'] if fam['age'] >= 65 else 0) + (m['over75'] if fam['age'] >= 75 else 0)
    if joint_partner:
        age_extra += (m['over65'] if joint_partner['age'] >= 65 else 0) + (m['over75'] if joint_partner['age'] >= 75 else 0)
    items['edad'] = age_extra
    share = 0.5 if fam.get('shared') else 1
    kids = sorted([c for c in fam.get('children', []) if c['age'] < 25 or c.get('disability', 0) >= 33], key=lambda c: -c['age'])
    desc = 0.0
    dis_kids = 0.0
    for i, c in enumerate(kids):
        desc += (m['descendants'][min(i, 3)] + (m['under3'] if c['age'] < 3 else 0)) * share
        lvl = c.get('disability', 0)
        if desc_dis and lvl >= 33:
            # La Rioja: 3.300 o 9.900 por el descendiente, más los 3.000 de asistencia del Estado con un 65 %.
            dis_kids += ((desc_dis['d65'] + m['assistance']) if lvl >= 65 else (desc_dis['d33'] + (m['assistance'] if c.get('assistance') else 0))) * share
        else:
            dis_kids += disability_min(lvl, c.get('assistance', False), m) * share
    items['descendientes'] = r2(desc)
    items['ascendientes'] = sum(m['ascendants'] + (m['ascendantsOver75'] if a['age'] >= 75 else 0) for a in fam.get('ascendants', []))
    dis = disability_min(fam.get('disability', 0), fam.get('assistance', False), m) + dis_kids
    if joint_partner:
        dis += disability_min(joint_partner.get('disability', 0), joint_partner.get('assistance', False), m)
    dis += sum(disability_min(a.get('disability', 0), a.get('assistance', False), m) for a in fam.get('ascendants', []))
    items['discapacidad'] = r2(dis)
    total = r2(sum(items.values()))
    steps.s(f'{label}: contribuyente {eur(items["personal"])} + edad {eur(items["edad"])} + descendientes {eur(items["descendientes"])}'
            f'{" (50 % por convivir con el otro progenitor)" if share < 1 and kids else ""} + ascendientes {eur(items["ascendientes"])}'
            f' + discapacidad {eur(items["discapacidad"])} = **{eur(total)}**')
    return total, items


YEARLY = ('intereses-financiacion', 'tributos-tasas', 'comunidad-servicios-personales', 'seguros')
CAPPED = ('intereses-financiacion', 'reparacion-conservacion')


def reduction_of(pr):
    """Reducción del art. 23.2 LIRPF (redacción de la Ley 12/2023; DT 31.ª para contratos anteriores)."""
    if pr.get('use', 'home') != 'home' or not pr.get('contract'):
        return 0, 'sin reducción (no es vivienda permanente del inquilino o falta el contrato)'
    if pr['contract'] == 'before':
        return 60, '60 % (contrato anterior al 26-5-2023, DT 31.ª LIRPF)'
    if pr.get('tensioned') and pr.get('rentDrop'):
        return 90, '90 % (zona tensionada y bajada de más del 5 %, art. 23.2.a)'
    if pr.get('tensioned') and pr.get('young'):
        return 70, '70 % (zona tensionada, primer alquiler a joven de 18 a 35, art. 23.2.b)'
    if pr.get('social'):
        return 70, '70 % (Administración o entidad sin ánimo de lucro, art. 23.2.b)'
    if pr.get('rehabilitated'):
        return 60, '60 % (rehabilitación en los 2 años anteriores, art. 23.2.c)'
    return 50, '50 % (general, art. 23.2.d)'


def properties_calc(p, steps):
    """Alquileres inmueble a inmueble (LIRPF arts. 23, 24 y 85; Manual 2025, c04). Añade a
    p['unrented'] la imputación de los días a disposición de cada inmueble. Devuelve la suma de 0154."""
    steps.h('2. Inmuebles alquilados, uno a uno (LIRPF arts. 22-24 y 85; Manual práctico 2025, c04)')
    total = 0.0
    for pr in p['properties']:
        share = pr.get('share', 100) / 100
        rented = pr.get('rentedDays', 365)
        other = pr.get('otherDays', 0)
        disposal = 365 - rented - other
        days = rented / 365
        income = r2(pr['income'] * share)
        capped = r2(sum(v * share * (days if k in YEARLY else 1) for k, v in pr['expenses'].items() if k in CAPPED))
        others = r2(sum(v * share * (days if k in YEARLY else 1) for k, v in pr['expenses'].items() if k not in CAPPED))
        pending = pr.get('pending', 0)
        pending_applied = min(pending, income)
        applied = r2(min(capped, income - pending_applied))
        excess = r2(capped - applied)
        cad, bld = pr.get('cadastral', 0), pr.get('building', 0)
        ratio = bld / cad if cad and bld else 1
        base = r2(max(pr.get('cost', 0) * ratio, bld) * share)
        amort = r2(base * 3 * days / 100)
        net = r2(income - pending_applied - applied - others - amort)
        pct, why = reduction_of(pr)
        red = r2(net * pct / 100) if net > 0 else 0.0
        reduced = r2(net - red)
        steps.s(f'**{pr["label"]}** ({pr.get("share", 100)} % tuyo, {rented} días alquilado'
                + (f', {disposal} a tu disposición' if disposal else '') + ')')
        steps.s(f'Ingresos íntegros (0102) = {eur(pr["income"])} × {pr.get("share", 100)} % = {eur(income)}')
        steps.s(f'Intereses y reparaciones (0105+0106) = {eur(capped)}'
                + (f'; pendiente de años anteriores aplicado (0104) {eur(pending_applied)}' if pending else '')
                + f'; aplicado (0107) {eur(applied)} (límite: los ingresos de este inmueble)'
                + (f'; exceso para 4 años (0108) **{eur(excess)}**' if excess else ''))
        steps.s(f'Otros gastos (0109-0117, los anuales por {rented}/365 días) = {eur(others)}')
        steps.s(f'Amortización (0131): base = mayor de coste × construcción/catastral ({eur(pr.get("cost", 0))} × {round(ratio, 4)}) '
                f'y valor catastral de la construcción ({eur(bld)}), × {pr.get("share", 100)} % = {eur(base)}; 3 % × {rented}/365 = {eur(amort)}')
        steps.s(f'Rendimiento neto (0149) = **{eur(net)}**; reducción {why} = {eur(red)} → neto reducido (0154) **{eur(reduced)}**')
        total = r2(total + reduced)
        if disposal > 0 and cad:
            p.setdefault('unrented', []).append(dict(value=r2(cad * share), revised=pr.get('revised', False), days=disposal, fromProperty=True))
    steps.s(f'Suma de rendimientos netos reducidos (0156) = **{eur(total)}**')
    return total


def renta2(p, steps, joint=None):
    """Modelo 100 de una declaración (Renta 2025). Devuelve las casillas y los campos del resultado."""
    c = CCAA[p['ccaa']]
    reg_min = dict(STATE_MIN)
    if c['min']:
        reg_min.update(c['min'])
    b = {}
    partner = joint['partner'] if joint and joint.get('partner') else None
    earners = [p] + ([partner] if partner and partner.get('gross', 0) > 0 else [])

    steps.h('1. Rendimientos del trabajo (LIRPF arts. 17-20)')
    gross = sum(e.get('gross', 0) for e in earners)
    dt12 = sum(e.get('dt12', 0) for e in earners)
    ss = sum(e.get('ss', 0) for e in earners)
    extra = sum(e.get('union', 0) for e in earners)
    b['0003'] = r2(gross)
    b['0012'] = r2(gross - dt12)
    b['0013'] = r2(ss)
    for e in earners:
        for pay in e.get('payers', []):
            steps.s(f'Pagador {pay["name"]} ({pay["nif"]}): íntegros {eur(pay["gross"])}, retenciones {eur(pay["withheld"])}'
                    + (f', Seguridad Social {eur(pay["ss"])}' if pay.get('ss') else ''))
    steps.s(f'Íntegros (0003) = {eur(gross)}' + (f' (de ellos {eur(p.get("nonSalary", 0))} de pensión o prestación)' if p.get('nonSalary') else ''))
    if dt12:
        steps.s(f'Reducción de la DT 12.ª LIRPF por la parte del plan aportada hasta el 31-12-2006 rescatada en forma de capital: 40 % de '
                f'{eur(dt12 / 0.4)} = **{eur(dt12)}** → íntegros computables (0012) = {eur(b["0012"])} (la casilla exacta de la reducción: NO CONFIRMADA)')
    prev = r2(gross - dt12 - ss - extra)
    steps.s(f'Gastos art. 19.2 a) a e): Seguridad Social (0013) {eur(ss)}' + (f' + cuotas sindicales {eur(extra)}' if extra else ''))
    steps.s(f'Rendimiento neto previo (0017) = **{eur(prev)}**')
    b['0017'] = prev
    other = 0.0
    for e in earners:
        prev_e = r2(e.get('gross', 0) - e.get('dt12', 0) - e.get('ss', 0) - e.get('union', 0))
        g = 2000.0
        if not e.get('retired'):
            g += 7750 if e.get('disability', 0) >= 65 else 3500 if e.get('disability', 0) >= 33 else 0
        if e.get('mobility'):
            g += 2000
        other += min(g, max(0.0, prev_e))
    b['0019'] = r2(other)
    steps.s(f'Otros gastos art. 19.2.f) (0019) = **{eur(other)}**' + (' (pensionista: sin incremento por discapacidad)' if p.get('retired') and p.get('disability') else ''))
    b['0022'] = r2(max(0.0, prev - other))
    steps.s(f'Rendimiento neto (0022) = **{eur(b["0022"])}**')

    rental_net = 0.0
    if p.get('rental'):
        rt = p['rental']
        steps.h('2. Inmueble alquilado (LIRPF arts. 22-23)')
        capped = min(rt['interest'] + rt['repairs'], rt['income'])
        amort = r2(rt['construction'] * 0.03)
        net = r2(rt['income'] - capped - rt['other'] - amort)
        steps.s(f'Ingresos {eur(rt["income"])} − intereses y reparaciones {eur(capped)}'
                + (f' (de {eur(rt["interest"] + rt["repairs"])}: el exceso de {eur(rt["interest"] + rt["repairs"] - capped)} se deduce en los 4 años siguientes)'
                   if rt['interest'] + rt['repairs'] > capped else ' (límite: los ingresos)')
                + f' − otros gastos {eur(rt["other"])} − amortización 3 % de {eur(rt["construction"])} = {eur(amort)} → rendimiento neto **{eur(net)}**')
        red = r2(net * rt['reduction'] / 100) if net > 0 else 0.0
        rental_net = r2(net - red)
        steps.s(rt['why'] + f' → reducción {eur(red)} → rendimiento neto reducido **{eur(rental_net)}**')
        b['rentalNet'] = rental_net
    if p.get('properties'):
        rental_net = properties_calc(p, steps)
        b['rentalNet'] = rental_net
    imputed = 0.0
    if p.get('unrented'):
        steps.h('3. Imputación de rentas inmobiliarias (LIRPF art. 85)')
        for u in p['unrented']:
            rate = 1.1 if u['revised'] else 2
            v = r2(u['value'] * rate / 100 * u['days'] / 365)
            imputed += v
            steps.s(f'Valor catastral {eur(u["value"])} × {str(rate).replace(".", ",")} % × {u["days"]}/365 días = **{eur(v)}**')
        imputed = r2(imputed)
        b['0155'] = imputed
        b['imputedIncome'] = imputed
    savings = r2(p.get('savings', 0))
    # Third batch (p3): net income of economic activities (already reduced) and gains of the general base.
    activity = r2(p.get('activityNet', 0))
    gains_general = r2(p.get('gainsGeneral', 0))
    if activity:
        steps.h('3 bis. Rendimientos de actividades económicas (LIRPF arts. 27-32)')
        for line in p.get('activitySteps', []):
            steps.s(line)
        steps.s(f'Rendimiento neto de actividades que va a la base general = **{eur(activity)}**')
        b['activityNet'] = activity
    if gains_general:
        steps.h('3 ter. Ganancias patrimoniales de la base general (arts. 33, 45 y 48)')
        for line in p.get('gainsSteps', []):
            steps.s(line)
        steps.s(f'Ganancias que no derivan de una transmisión (base general) = **{eur(gains_general)}**')
        b['gainsGeneral'] = gains_general
    other_income = max(0.0, rental_net) + imputed + savings + activity + gains_general

    steps.h('4. Reducción por obtención de rendimientos del trabajo (art. 20)')
    if other_income > 6500:
        red = 0.0
        steps.s(f'Otras rentas {eur(other_income)} > 6.500: no hay reducción.')
    else:
        red = min(work_reduction(prev), b['0022'])
        steps.s(f'Sobre el rendimiento neto previo {eur(prev)}: ' + (
            'hasta 14.852 → 7.302' if prev <= 14852 else
            f'7.302 − 1,75 × ({eur(prev)} − 14.852)' if prev <= 17673.52 else
            f'2.364,34 − 1,14 × ({eur(prev)} − 17.673,52)' if prev < 19747.5 else 'desde 19.747,50 → 0') +
            f'; con el límite del rendimiento neto → **{eur(red)}** (0023)')
    b['0023'] = r2(red)
    b['0025'] = r2(b['0022'] - red)
    if activity > 0:
        # Art. 32.2.3.º LIRPF: rentas no exentas (la actividad incluida) < 12.000 € → 1.620 € o 1.620 − 0,405 × (rentas − 8.000),
        # y junto con la del art. 20 como máximo 3.700 €.
        rentas = r2(b['0022'] + max(0.0, rental_net) + imputed + savings + activity + gains_general)
        if rentas < 12000:
            small = 1620.0 if rentas <= 8000 else r2(1620 - 0.405 * (rentas - 8000))
            small = r2(max(0.0, min(small, 3700 - b['0023'], activity)))
            steps.s(f'Reducción del art. 32.2.3.º LIRPF: rentas no exentas {eur(rentas)} < 12.000 € → **{eur(small)}** (con la del art. 20, máximo 3.700 €)')
            activity = r2(activity - small)
            b['activityNet'] = activity
            b['smallReduction'] = small
    steps.s(f'Rendimiento neto reducido (0025) = **{eur(b["0025"])}**')

    steps.h('5. Bases imponibles (LIRPF arts. 45-49)')
    big = r2(b['0025'] + rental_net + imputed + activity + gains_general)
    b['0435'] = big
    steps.s(f'Base imponible general (0435) = {eur(b["0025"])}' + (f' + {eur(rental_net)} (alquiler)' if rental_net else '') +
            (f' + {eur(imputed)} (imputación)' if imputed else '') + (f' + {eur(activity)} (actividades)' if activity else '')
            + (f' + {eur(gains_general)} (ganancias de la base general)' if gains_general else '') + f' = **{eur(big)}**')
    b['0460'] = savings
    if savings:
        steps.s(f'Base imponible del ahorro (0460) = **{eur(savings)}** (detalle en el apartado 0)')

    steps.h('6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)')
    joint_red = 0.0
    if joint:
        joint_red = 3400 if joint['kind'] == 'couple' else 2150
        steps.s(f'Reducción por tributación conjunta: {eur(joint_red)} ({"matrimonio" if joint["kind"] == "couple" else "familia monoparental"}, art. 84.2.4.º)')
    jg = min(joint_red, max(0.0, big))
    js = min(joint_red - jg, savings)
    pension = 0.0
    for e in earners:
        own = min(e.get('planOwn', 0), 1500)
        net_e = r2(max(0.0, e.get('gross', 0) - e.get('dt12', 0) - e.get('ss', 0) - 2000))
        allowed = min(own, r2(net_e * 0.3))
        pension += allowed
        if e.get('planOwn'):
            steps.s(f'Plan de pensiones propio: {eur(e["planOwn"])} (límite 1.500 y 30 % de los rendimientos netos del trabajo) → **{eur(allowed)}** (art. 52)')
    pension = r2(min(pension, max(0.0, big - jg)))
    others = r2(min(min(p.get('spousePlan', 0), 1000) + p.get('compensatory', 0), max(0.0, big - jg - pension)))
    if p.get('spousePlan'):
        steps.s(f'Plan de pensiones del cónyuge sin rentas (art. 51.7: rendimientos del cónyuge < 8.000): {eur(p["spousePlan"])}, límite 1.000 → {eur(min(p["spousePlan"], 1000))}')
    if p.get('compensatory'):
        steps.s(f'Pensión compensatoria al excónyuge por decisión judicial (art. 55): **{eur(p["compensatory"])}**. Las anualidades por alimentos a los hijos NO reducen la base: van por el art. 64')
    b['pensionReduction'] = pension
    b['otherReductions'] = others
    b['jointReduction'] = r2(jg + js)
    blg = r2(max(0.0, big - jg - pension - others))
    bla = r2(savings - js)
    b['0500'] = blg
    b['0505'] = blg
    b['0510'] = bla
    steps.s(f'Base liquidable general (0500) = {eur(big)}' + (f' − {eur(jg)}' if jg else '') + (f' − {eur(pension)}' if pension else '')
            + (f' − {eur(others)}' if others else '') + f' = **{eur(blg)}**')
    steps.s(f'Base liquidable del ahorro (0510) = **{eur(bla)}**')

    steps.h('7. Mínimo personal y familiar (arts. 56-61)')
    fam = dict(age=p['age'], disability=p.get('disability', 0), assistance=p.get('assistance', False), children=p.get('children', []),
               ascendants=p.get('ascendants', []), shared=p.get('shared', False) and not (joint and joint['kind'] == 'couple'))
    if p.get('assistance') and p.get('disability', 0) < 65:
        steps.s('Gastos de asistencia (art. 60.3): con un 33 % y movilidad reducida acreditada se suman 3.000 € al mínimo por discapacidad')
    smin, sitems = minimum_of(STATE_MIN, fam, steps, 'Estatal (0519)', partner)
    rmin, ritems = minimum_of(reg_min, fam, steps, f'Autonómico de {c["name"]} (0520)', partner, c.get('descDisability'))
    b['0511'] = r2(sitems['personal'] + sitems['edad'])
    b['0512'] = r2(ritems['personal'] + ritems['edad'])
    b['0517'] = sitems['discapacidad']
    b['0518'] = ritems['discapacidad']
    b['0519'] = smin
    b['0520'] = rmin

    steps.h('8. Cuotas íntegras (arts. 63-66 y 74-76)')
    A = p.get('alimentos', 0)
    if A and A < blg:
        def gen(scale, mn, who):
            parts = (scale_tax(scale, A), scale_tax(scale, r2(blg - A)), scale_tax(scale, min(blg, mn + 1980)))
            v = r2(max(0.0, parts[0] + parts[1] - parts[2]))
            steps.s(f'{who} (art. {"64" if who.startswith("Estatal") else "75"}): escala(anualidades {eur(A)}) {eur(parts[0])} + escala(resto {eur(r2(blg - A))}) '
                    f'{eur(parts[1])} − escala(mínimo {eur(mn)} + 1.980) {eur(parts[2])} = {eur(v)}')
            return v
        steps.s(f'Anualidades por alimentos a los hijos por decisión judicial: {eur(A)} < base liquidable general → la escala se aplica por separado '
                f'(caso oficial renta-c15-02, [Manual]({ALIMENTOS}))')
        s_gen = gen(STATE_SCALE, smin, 'Estatal')
        r_gen = gen(c['scale'], rmin, f'Autonómica ({c["name"]})')
    else:
        sg_min = min(smin, blg)
        rg_min = min(rmin, blg)
        s_gen = r2(max(0.0, scale_tax(STATE_SCALE, blg) - scale_tax(STATE_SCALE, sg_min)))
        r_gen = r2(max(0.0, scale_tax(c['scale'], blg) - scale_tax(c['scale'], rg_min)))
        steps.s(f'General estatal: escala({eur(blg)}) {eur(scale_tax(STATE_SCALE, blg))} − escala(mínimo {eur(sg_min)}) {eur(scale_tax(STATE_SCALE, sg_min))} = {eur(s_gen)}')
        steps.s(f'General autonómica ({c["name"]}): escala({eur(blg)}) {eur(scale_tax(c["scale"], blg))} − escala(mínimo {eur(rg_min)}) {eur(scale_tax(c["scale"], rg_min))} = {eur(r_gen)}')
    s_sav_base = max(0.0, bla - max(0.0, smin - blg))
    r_sav_base = max(0.0, bla - max(0.0, rmin - blg))
    s_sav = scale_tax(SAVINGS_HALF, s_sav_base)
    r_sav = scale_tax(SAVINGS_HALF, r_sav_base)
    if bla:
        steps.s(f'Ahorro: escala de 9,5 / 10,5 / 11,5 / 13,5 / 15 % en cada mitad sobre {eur(s_sav_base)} → estatal {eur(s_sav)} y autonómica {eur(r_sav)}')
    b['0545'] = r2(s_gen + s_sav)
    b['0546'] = r2(r_gen + r_sav)
    steps.s(f'Cuota íntegra estatal (0545) = **{eur(b["0545"])}**; autonómica (0546) = **{eur(b["0546"])}**')

    steps.h('9. Deducciones, cuota resultante y resultado')
    ded_s = 0.0
    ded_r = 0.0
    refundable = 0.0
    for d in p.get('deductions', []):
        if d.get('ceuta'):
            total = r2(0.6 * (b['0545'] + b['0546']) * d.get('share', 1))
            d['regional'] = r2(total / 2)
            d['state'] = r2(total - d['regional'])
            d['choice_amount'] = f'{total:.2f}'
            d['how'] = (f'60 % de la suma de las cuotas íntegras ({eur(b["0545"])} + {eur(b["0546"])})' + (f' × {d["share"]:.4f} (parte de las rentas obtenidas allí)' if d.get('share', 1) != 1 else ' (todas las rentas se obtienen allí, art. 68.4.3.º)')
                        + f' = {eur(total)}: la mitad en cada cuota ({eur(d["state"])} estatal y {eur(d["regional"])} autonómica)')
        if d.get('refundable'):
            refundable += d['amount']
        else:
            ded_s += d.get('state', 0)
            ded_r += d.get('regional', 0)
        steps.s(f'{d["label"]}: {d["how"]}')
    applied_s = min(b['0545'], ded_s)
    applied_r = min(b['0546'], ded_r)
    liq = r2(b['0545'] - applied_s + b['0546'] - applied_r)
    b['0570'] = r2(b['0545'] - applied_s)
    b['0571'] = r2(b['0546'] - applied_r)
    b['0587'] = liq
    pay_work = sum(max(0.0, e.get('gross', 0) - e.get('nonSalary', 0)) for e in earners)
    all_work = sum(e.get('gross', 0) for e in earners)
    cands = {min(low_pay(pay_work, other_income), liq), min(low_pay(all_work, other_income), liq)}
    if len(cands) > 1:
        raise SystemExit(f'{p["slug"]}: la deducción 0414 depende de si cuentan las pensiones; elige otros datos')
    lp = cands.pop()
    b['0414'] = r2(lp)
    b['stateDeductions'] = r2(applied_s + lp)
    b['regionalDeductions'] = r2(applied_r)
    b['0595'] = r2(liq - lp)
    withheld = r2(sum(e.get('withheld', 0) for e in earners) + p.get('otherWithheld', 0))
    b['0609'] = withheld
    b['0610'] = r2(b['0595'] - withheld)
    b['refundable'] = r2(refundable)
    b['0670'] = r2(b['0610'] - refundable)
    steps.s(f'Cuota líquida (0587) = {eur(b["0545"])} − {eur(applied_s)} + {eur(b["0546"])} − {eur(applied_r)} = {eur(liq)}')
    steps.s(f'Deducción por rendimientos del trabajo (0414) = {eur(lp)} (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)')
    steps.s(f'Cuota resultante (0595) = **{eur(b["0595"])}**; pagos a cuenta (0609) = {eur(withheld)}'
            + (f' (incluye {eur(p["otherWithheld"])} de otros pagos a cuenta: capital, alquiler o actividades)' if p.get('otherWithheld') else '')
            + f'; cuota diferencial (0610) = **{eur(b["0610"])}**')
    if refundable:
        steps.s(f'Deducciones abonables (art. 81 y 81 bis, sin abono anticipado) = {eur(refundable)}')
    steps.s(f'Resultado (0670) = **{eur(b["0670"])}** ({"a devolver" if b["0670"] < 0 else "a ingresar"})')
    return b


# ─── Personas de Renta 2025 ───────────────────────────────────────────────────

def payer(name, cid, gross, withheld, ss=0.0):
    return dict(name=name, nif=cid, gross=gross, withheld=withheld, ss=ss)


def worker(gross, withheld, payers=None, **kw):
    """Datos del trabajo a partir de los pagadores (o de un único pagador ficticio)."""
    ss = kw.pop('ss', None)
    if payers is None:
        s = ss_of(gross) if ss is None else ss
        payers = [payer('Empresa Ficticia Empleadora, S.L.', 'B00000901', gross, withheld, s)]
    return dict(gross=r2(sum(x['gross'] for x in payers)), withheld=r2(sum(x['withheld'] for x in payers)),
                ss=r2(sum(x.get('ss', 0) for x in payers)), payers=payers, **kw)


def P(n, slug, ccaa, title, story, tests, **kw):
    return dict(n=n, slug=f'{PREFIX}-{n:02d}-{slug}', ccaa=ccaa, title=title, story=story, tests=tests, **kw)


RENTA = [
    P(29, 'tres-pagadores-asturias', 'asturias', 'Joven con tres pagadores en el año',
      'Tres contratos seguidos (12.000, 6.000 y 3.000 €). Los pagadores segundo y tercero suman más de 1.500 € y el total pasa de 15.876 €: obligada a declarar. El rendimiento neto previo cae en el tercer tramo de la reducción del art. 20.',
      ['varios pagadores', 'obligación de declarar (15.876 €)', 'reducción art. 20, tramo 17.673,52-19.747,50', 'mínimos de Asturias'],
      age=27, **worker(0, 0, payers=[payer('Hostelería Ficticia Astur, S.L.', 'B00000291', 12000, 1100, 777.6),
                                      payer('Comercio Ficticio del Nalón, S.L.', 'B00000292', 6000, 120, 388.8),
                                      payer('Eventos Ficticios Gijón, S.L.', 'B00000293', 3000, 60, 194.4)]),
      ),
    P(30, 'pensionista-78-discapacidad-33-asistencia-asturias', 'asturias', 'Pensionista de 78 años con discapacidad del 33 % y movilidad reducida',
      'Pensión de jubilación de 24.000 € e intereses de 600 €. Discapacidad del 33 % con movilidad reducida acreditada: suma 3.000 € de gastos de asistencia (art. 60.3) aunque no llegue al 65 %.',
      ['pensionista', 'mayor de 75', 'discapacidad 33 % + asistencia (art. 60.3)', 'mínimos de Asturias', 'sin incremento de gastos del trabajo por discapacidad (pensionista)'],
      age=78, disability=33, assistance=True, retired=True, nonSalary=24000, savings=600, otherWithheld=114,
      **worker(0, 0, payers=[payer('Instituto Ficticio de Pensiones', 'Q00000301', 24000, 2600, 0)]),
      savings_steps=['Intereses de una cuenta 600,00 (retención 19 % = 114,00) → base del ahorro **600,00**']),
    P(31, 'madre-conyuge-discapacidad-65-hijo-2-asturias', 'asturias', 'Madre trabajadora, marido sin rentas con discapacidad del 65 % y un hijo de 2 años',
      'Ella trabaja (30.000 €); su marido no tiene rentas y tiene reconocida una discapacidad del 65 %. Hijo nacido en 2023. Individual frente a conjunta: en la conjunta cuenta el mínimo por discapacidad del marido.',
      ['conjunta frente a individual', 'discapacidad del cónyuge en la conjunta', 'deducción por maternidad', 'deducción por cónyuge con discapacidad (art. 81 bis)', 'hijo menor de 3 años'],
      age=34, children=[dict(age=2)], shared=True, **worker(30000, 3900),
      deductions=[dict(id='estado-maternidad', units='1', refundable=True, amount=1200, label='Maternidad (art. 81)', how='100 € × 12 meses = 1.200 € (hijo menor de 3 años todo el año)'),
                  dict(id='estado-conyuge-discapacidad', units='1', refundable=True, amount=1200, label='Cónyuge no separado con discapacidad (art. 81 bis.1.d)',
                       how='1.200 €: cónyuge con discapacidad ≥ 33 % y rentas < 8.000 €; tope de cotizaciones 1.944 ≥ 1.200')],
      joint=dict(kind='couple', partner=dict(age=36, gross=0, ss=0, withheld=0, disability=65))),
    P(33, 'arrendador-contrato-2024-reduccion-50-cantabria', 'cantabria', 'Asalariado que alquila un piso con contrato de 2024 (reducción del 50 %)',
      'Alquila una vivienda con contrato firmado el 1-3-2024: reducción general del 50 % (art. 23.2 LIRPF tras la Ley 12/2023), no la del 60 % de los contratos anteriores al 26-5-2023.',
      ['alquiler de vivienda contrato posterior al 26-05-2023 (50 %)', 'gastos del inmueble', 'amortización 3 %', 'escala de Cantabria'],
      age=45, **worker(34000, 5300),
      rental=dict(income=9000, interest=1200, repairs=300, other=1100, construction=75000, reduction=50, reductionId='general-50',
                  expenses={'intereses-financiacion': '1200', 'reparacion-conservacion': '300', 'tributos-tasas': '380', 'comunidad-servicios-personales': '540', 'seguros': '180'},
                  why='Reducción del 50 % (art. 23.2.a LIRPF: contrato de vivienda del 1-3-2024, sin rebaja de renta en zona tensionada, inquilino joven ni rehabilitación)')),
    P(34, 'separado-compensatoria-alimentos-cantabria', 'cantabria', 'Separado que paga pensión compensatoria y alimentos a sus hijos',
      'Por sentencia paga 6.000 € de pensión compensatoria a su excónyuge (reduce la base, art. 55) y 4.800 € de alimentos a sus dos hijos, que viven con la madre: no aplica el mínimo por descendientes y la escala se aplica por separado a las anualidades (arts. 64 y 75).',
      ['pensión compensatoria (art. 55)', 'anualidades por alimentos a hijos (arts. 64 y 75)', 'sin mínimo por descendientes', 'escala de Cantabria'],
      age=46, compensatory=6000, alimentos=4800, **worker(42000, 7900),
      gap_reason='El motor no aplica las anualidades por alimentos a los hijos (arts. 64 y 75 LIRPF): escala por separado y mínimo incrementado en 1.980 €.'),
    P(35, 'familia-numerosa-hijo-discapacidad-conjunta-cantabria', 'cantabria', 'Familia numerosa general con un hijo con discapacidad del 33 %: individual frente a conjunta',
      'Tres hijos (15, 11 y 6 años; el pequeño con discapacidad del 33 %). Solo trabaja el padre. Deducciones abonables por familia numerosa y por descendiente con discapacidad, cada una con su propio tope de cotizaciones.',
      ['familia numerosa general (art. 81 bis)', 'descendiente con discapacidad (art. 81 bis)', 'mínimo por discapacidad de un hijo', 'conjunta frente a individual'],
      age=44, children=[dict(age=15), dict(age=11), dict(age=6, disability=33)], shared=True, **worker(38000, 5600),
      deductions=[dict(id='estado-familia-numerosa', units='1', refundable=True, amount=1200, label='Familia numerosa general (art. 81 bis.1.c)', how='1.200 € (12 meses × 100); tope de cotizaciones 2.462,40'),
                  dict(id='estado-descendiente-discapacidad', units='1', refundable=True, amount=1200, label='Descendiente con discapacidad (art. 81 bis.1.a)', how='1.200 € por el hijo con un 33 %; tope propio de cotizaciones 2.462,40')],
      joint=dict(kind='couple', partner=dict(age=42, gross=0, ss=0, withheld=0, disability=0))),
    P(37, 'hipoteca-2011-castilla-la-mancha', 'castilla-la-mancha', 'Hipoteca de la vivienda habitual comprada en 2011 (7.000 € al año)',
      'Compró su vivienda en 2011 y ya dedujo por ella antes de 2013: régimen transitorio. Paga 7.000 € al año (capital e intereses), por debajo de la base máxima de 9.040 €.',
      ['deducción por vivienda habitual (DT 18.ª)', 'base por debajo de 9.040 €', 'tramo autonómico al 7,5 % (Castilla-La Mancha no tiene porcentaje propio)'],
      age=51, **worker(46000, 8400),
      deductions=[dict(id='estado-vivienda-habitual-transitorio', choice_amount='7000', state=525, regional=525, label='Vivienda habitual, régimen transitorio (DT 18.ª LIRPF)',
                       how='7.000 € pagados (< 9.040): 7,5 % estatal = 525,00 + 7,5 % autonómico = 525,00')]),
    P(38, 'venta-segunda-vivienda-donacion-castilla-la-mancha', 'castilla-la-mancha', 'Vende un piso comprado en 2008 y recibe una donación de su madre',
      'Vende el 30-9-2025 un piso vacío comprado en 2008 (con una mejora en 2015): ganancia en la base del ahorro e imputación de renta hasta la venta. Su madre le dona 20.000 € en dinero: no tributa en el IRPF (Impuesto sobre Donaciones de Castilla-La Mancha).',
      ['ganancia por venta de inmueble (art. 34-35)', 'mejoras en el valor de adquisición', 'plusvalía municipal como gasto de venta', 'imputación de renta por días', 'donación recibida (ISD, no IRPF)', 'tramos altos de la base del ahorro'],
      age=55, savings=40300, unrented=[dict(value=70000, revised=True, days=273)], **worker(39000, 6900),
      detail=dict(properties=[dict(name='Piso comprado en 2008', proceeds=177900, cost=137600, amortization=0, exemption='none')],
                  figures=[('0422', 'Suma de ganancias patrimoniales del ahorro (piso)', 40300), ('0424', 'Saldo neto positivo de ganancias y pérdidas del ahorro', 40300)]),
      savings_steps=['Valor de adquisición (art. 35.1): precio 120.000 + gastos e impuestos de la compra 9.600 + mejora de 2015 8.000 = 137.600,00',
                     'Valor de transmisión (art. 35.2): 185.000 − plusvalía municipal 2.100 − agencia 5.000 = 177.900,00',
                     'Ganancia = 177.900 − 137.600 = **40.300,00** (base del ahorro). Comprado en 2008: no hay coeficientes de abatimiento (DT 9.ª, solo antes de 1995)',
                     'Donación de 20.000 € de su madre: no es renta del IRPF para quien la recibe (art. 6.4 LIRPF); tributa en el Impuesto sobre Sucesiones y Donaciones'],
      pending=[('Donación recibida (20.000 €)', 'No tributa en el IRPF del donatario (art. 6.4 LIRPF): se declara en el Impuesto sobre Donaciones de Castilla-La Mancha, fuera de Finanverso.'),
               ]),
    P(39, 'dos-pagadores-no-obligado-devolucion-castilla-la-mancha', 'castilla-la-mancha', 'Dos pagadores por debajo de 15.876 €: no está obligado, pero le devuelven',
      'Dos empleos (10.000 y 5.000 €), 15.000 € en total: no llega a 15.876 €, así que no está obligado a declarar; aun así declara para recuperar los 100 € retenidos. Base liquidable por debajo del mínimo: cuota cero.',
      ['varios pagadores sin obligación de declarar', 'reducción art. 20 máxima (7.302)', 'base inferior al mínimo', 'devolución de retenciones'],
      age=24, **worker(0, 0, payers=[payer('Logística Ficticia Talavera, S.L.', 'B00000391', 10000, 0, 648), payer('Almacenes Ficticios Toledo, S.L.', 'B00000392', 5000, 100, 324)]),
      ),
    P(40, 'rescate-plan-pensiones-capital-dt12-castilla-la-mancha', 'castilla-la-mancha', 'Jubilado que rescata su plan de pensiones en forma de capital (reducción del 40 %)',
      'Se jubiló en 2024 y en 2025 rescata de una vez 30.000 € de su plan de pensiones; 12.000 € corresponden a aportaciones hasta el 31-12-2006 (certificado de la gestora): reducción del 40 % de la DT 12.ª LIRPF, en plazo (año de la contingencia y dos siguientes). Además cobra 16.000 € de pensión.',
      ['rescate de plan de pensiones en capital', 'reducción del 40 % (DT 12.ª)', 'dos pagadores (pensión y gestora)', 'tipo marginal alto en un año'],
      age=66, retired=True, nonSalary=46000, dt12=4800,
      **worker(0, 0, payers=[payer('Instituto Ficticio de Pensiones', 'Q00000401', 16000, 1600, 0), payer('Gestora Ficticia de Pensiones, S.A.', 'A00000402', 30000, 6800, 0)]),
      gap_reason='El motor no aplica la reducción del 40 % de la DT 12.ª LIRPF a la parte del rescate del plan de pensiones aportada hasta 2006.'),
    P(41, 'ascendiente-80-discapacidad-65-extremadura', 'extremadura', 'Asalariada que vive con su madre de 80 años con discapacidad del 65 %',
      'Su madre (80 años, pensión de 7.000 €, discapacidad del 65 %) convive con ella todo el año: mínimo por ascendiente mayor de 75, mínimo por discapacidad con asistencia y deducción abonable por ascendiente con discapacidad.',
      ['mínimo por ascendientes (mayor de 75)', 'discapacidad de ascendiente 65 % + asistencia', 'deducción por ascendiente con discapacidad (art. 81 bis)', 'escala de Extremadura'],
      age=52, ascendants=[dict(age=80, disability=65)], **worker(31000, 4500),
      deductions=[dict(id='estado-ascendiente-discapacidad', units='1', refundable=True, amount=1200, label='Ascendiente con discapacidad (art. 81 bis.1.b)', how='1.200 €: ascendiente con un 65 % que da derecho al mínimo; tope de cotizaciones 2.008,80')]),
    P(42, 'inversor-fondo-heredado-perdidas-anteriores-extremadura', 'extremadura', 'Inversor con dividendos, un fondo heredado y pérdidas de 2022 por compensar',
      'Intereses, dividendos y gastos de custodia; reembolsa un fondo heredado en 2023 (valor de adquisición: el del Impuesto sobre Sucesiones) con ganancia y vende acciones con pérdida; compensa 2.000 € de pérdidas patrimoniales de 2022.',
      ['rendimientos del capital mobiliario y gastos de custodia', 'fondo heredado: valor del ISD', 'integración y compensación de ganancias y pérdidas (art. 49)', 'pérdidas de años anteriores (4 años)', 'retenciones del capital'],
      age=60, savings=6640, otherWithheld=1938, **worker(52000, 10200),
      detail=dict(capital=dict(interest=1200, dividends=2500, expenses=60), pendingGains=[dict(year=2022, amount=2000)], assets=[
          dict(name='Fondo heredado', kind='fund', buys=[dict(date='2023-04-12', units=1000, cost=30000)], sells=[dict(date='2025-05-20', units=1000, proceeds=36500)]),
          dict(name='Acciones Ficticias', kind='listed', buys=[dict(date='2021-02-01', units=300, cost=9000)], sells=[dict(date='2025-10-15', units=300, proceeds=7500)])],
          figures=[('0041', 'Rendimiento neto del capital mobiliario (con gastos de custodia)', 3640), ('0422', 'Suma de ganancias patrimoniales del ahorro (fondo)', 6500),
                   ('0423', 'Suma de pérdidas patrimoniales del ahorro (acciones)', 1500), ('0424', 'Saldo neto positivo de ganancias y pérdidas del ahorro', 5000),
                   ('pendingGainsOnGains', 'Pérdidas de 2022 compensadas (casilla 0440)', 2000)]),
      savings_steps=['Capital mobiliario: intereses 1.200 + dividendos 2.500 − custodia y administración 60 (art. 26.1.a) = **3.640,00**',
                     'Fondo heredado en 2023: valor de adquisición el declarado en Sucesiones, 30.000; reembolso 36.500 → ganancia **6.500,00**',
                     'Acciones compradas en 2021 por 9.000 y vendidas por 7.500 → pérdida **−1.500,00**',
                     'Ganancias y pérdidas entre sí: 6.500 − 1.500 = 5.000; menos pérdidas pendientes de 2022 (−2.000, art. 49.1.b, dentro de los 4 años) = **3.000,00**',
                     'Base del ahorro = 3.640 + 3.000 = **6.640,00**; retenciones del capital 228 (intereses) + 475 (dividendos) + 1.235 (fondo) = 1.938,00'],
      ),
    P(43, 'cripto-permuta-extremadura', 'extremadura', 'Criptomonedas: permuta de BTC por ETH y venta con pérdida',
      'Cambia 0,2 BTC (comprados en 2022 por 4.000 €) por ETH valorado en 12.000 € con 20 € de comisión: la permuta es una transmisión (ganancia). Después vende la mitad del ETH por 5.000 € (pérdida).',
      ['permuta entre criptomonedas (art. 37.1.h)', 'valor de adquisición del ETH recibido', 'ganancia y pérdida en el mismo año', 'modelo 721 (no obligado)'],
      age=33, savings=6980, **worker(29000, 4100),
      detail=dict(assets=[
          dict(name='BTC', kind='crypto', buys=[dict(date='2022-06-01', units=0.2, cost=4000)], sells=[dict(date='2025-03-10', units=0.2, proceeds=11980)]),
          dict(name='ETH', kind='crypto', buys=[dict(date='2025-03-10', units=4, cost=12000)], sells=[dict(date='2025-08-01', units=2, proceeds=5000)])],
          figures=[('0422', 'Suma de ganancias patrimoniales del ahorro (permuta de BTC)', 7980), ('0423', 'Suma de pérdidas patrimoniales del ahorro (venta de ETH)', 1000),
                   ('0424', 'Saldo neto positivo de ganancias y pérdidas del ahorro', 6980)]),
      savings_steps=['Permuta (art. 37.1.h): valor de transmisión el mayor de lo entregado o lo recibido, 12.000 − comisión 20 = 11.980; coste 4.000 → ganancia **7.980,00**',
                     'El ETH recibido entra con un valor de adquisición de 12.000 (el de mercado del BTC entregado)',
                     'Vende la mitad del ETH por 5.000; coste 6.000 → pérdida **−1.000,00**',
                     'Saldo: 7.980 − 1.000 = **6.980,00** (base del ahorro). El 721 solo obliga con más de 50.000 € en el extranjero a 31-12'],
      ),
    P(45, 'padre-solo-hijo-discapacidad-65-la-rioja', 'la-rioja', 'Padre solo con un hijo con discapacidad del 65 %: mínimo propio de La Rioja',
      'Custodia exclusiva de un hijo de 10 años con discapacidad del 65 %, sin convivir con la madre. La Rioja eleva el mínimo por discapacidad de los descendientes (9.900 €) pero no el resto. Individual frente a conjunta monoparental.',
      ['mínimo autonómico por discapacidad de descendientes (La Rioja)', 'asistencia por discapacidad ≥ 65 %', 'monoparental conjunta (2.150)', 'deducción por descendiente con discapacidad'],
      age=40, children=[dict(age=10, disability=65)], **worker(33000, 4700),
      deductions=[dict(id='estado-descendiente-discapacidad', units='1', refundable=True, amount=1200, label='Descendiente con discapacidad (art. 81 bis.1.a)', how='1.200 €; tope de cotizaciones 2.138,40')],
      joint=dict(kind='single', partner=None)),
    P(46, 'alquiler-rendimiento-negativo-la-rioja', 'la-rioja', 'Piso alquilado con rendimiento negativo (contrato de 2020)',
      'Alquila un piso por 500 €/mes con contrato de 2020; este año hizo una reparación grande. Intereses y reparaciones superan los ingresos (el exceso pasa a los 4 años siguientes) y la amortización deja el rendimiento en negativo: sin reducción y restando de la base general.',
      ['rendimiento de capital inmobiliario negativo', 'límite de intereses y reparaciones (art. 23.1.a)', 'exceso a 4 años', 'sin reducción con rendimiento negativo'],
      age=38, **worker(36000, 6000),
      rental=dict(income=6000, interest=4200, repairs=2500, other=1370, construction=110000, reduction=60, reductionId='contratos-anteriores-60',
                  expenses={'intereses-financiacion': '4200', 'reparacion-conservacion': '2500', 'tributos-tasas': '450', 'comunidad-servicios-personales': '720', 'seguros': '200'},
                  why='Contrato de 2020 (anterior al 26-05-2023): reducción del 60 %, pero solo sobre rendimientos positivos (art. 23.2)'),
      excess=700),
    P(47, 'planes-conyuge-donativo-recurrente-la-rioja', 'la-rioja', 'Plan propio, plan del cónyuge sin rentas y donativo recurrente',
      'Aporta 1.500 € a su plan de pensiones y 1.000 € al de su mujer, que no tiene rentas. Dona 1.000 € a la misma ONG por tercer año (1.000 en 2023 y 2024): el resto pasa del 40 al 45 %.',
      ['plan de pensiones propio (1.500)', 'plan del cónyuge (art. 51.7, 1.000)', 'donativo con fidelidad (45 %)', 'reparto 50/50 de la deducción'],
      age=49, planOwn=1500, spousePlan=1000, **worker(48000, 9300),
      deductions=[dict(id='estado-donativos-ley-49-2002', choice_amount='537.5', state=268.75, regional=268.75, label='Donativos Ley 49/2002 con fidelidad (art. 19 Ley 49/2002)',
                       how=f'250 × 80 % + 750 × 45 % (tercer año seguido con 1.000 € a la misma entidad) = 537,50; la mitad en cada cuota (caso oficial renta-c16-01, [Manual]({DONATIVOS}))')]),
    P(48, 'asalariado-residente-ceuta', 'ceuta', 'Asalariado que vive y trabaja en Ceuta: deducción del 60 %',
      'Trabaja en Ceuta y reside allí todo el año: se deduce el 60 % de la suma de sus cuotas íntegras (art. 68.4.1.º y 3.º.a LIRPF), la mitad en cada cuota. La escala autonómica es la supletoria del Estado.',
      ['deducción por rentas obtenidas en Ceuta (60 %)', 'escala autonómica supletoria', 'retenciones bonificadas'],
      age=30, **worker(36000, 2300),
      deductions=[dict(id='estado-ceuta-melilla', ceuta=True, label='Rentas obtenidas en Ceuta o Melilla (art. 68.4 LIRPF)', how='')]),
    P(50, 'asalariada-local-alquilado-melilla', 'melilla', 'Asalariada en Melilla que alquila un local en la ciudad',
      'Trabaja en Melilla y alquila un local comercial situado allí (sin reducción: no es vivienda); el inquilino le retiene el 19 %. Las dos rentas se obtienen en Melilla: deducción del 60 % sobre toda la cuota.',
      ['deducción por rentas obtenidas en Melilla (60 %)', 'alquiler de local sin reducción', 'retención del alquiler en los pagos a cuenta', 'otras rentas ≤ 6.500'],
      age=45, otherWithheld=1824, **worker(28000, 1600),
      rental=dict(income=9600, interest=0, repairs=600, other=850, construction=80000, reduction=0, reductionId='',
                  expenses={'reparacion-conservacion': '600', 'tributos-tasas': '400', 'comunidad-servicios-personales': '300', 'seguros': '150'},
                  why='Local comercial: la reducción del art. 23.2 es solo para viviendas'),
      deductions=[dict(id='estado-ceuta-melilla', ceuta=True, label='Rentas obtenidas en Ceuta o Melilla (art. 68.4 LIRPF)', how='')]),
    P(51, 'madre-separada-dos-hijos-melilla', 'melilla', 'Madre separada con dos hijos que no recibe alimentos',
      'Separada, vive con sus dos hijos (8 y 5 años) y no cobra anualidades por alimentos: mínimo completo por los dos hijos y deducción abonable del art. 81 bis.1.d. Reside y trabaja en Melilla: deducción del 60 %. (La conjunta monoparental no se calcula aquí.)',
      ['ascendiente separado con dos hijos sin alimentos (art. 81 bis)', 'mínimo por descendientes completo', 'deducción del 60 % de Melilla'],
      age=39, children=[dict(age=8), dict(age=5)], **worker(26000, 1500),
      deductions=[dict(id='estado-ascendiente-separado-dos-hijos', units='1', refundable=True, amount=1200, label='Ascendiente separado con dos hijos sin anualidades por alimentos (art. 81 bis.1.d)', how='1.200 €; tope de cotizaciones 1.684,80'),
                  dict(id='estado-ceuta-melilla', ceuta=True, label='Rentas obtenidas en Ceuta o Melilla (art. 68.4 LIRPF)', how='')],
      pending=[('Conjunta monoparental', 'No se compara aquí: la deducción del 60 % cambia con la cuota de la conjunta y el formulario solo guarda un importe.')]),
]


# ─── Autónomos 2026 ───────────────────────────────────────────────────────────

def A(n, slug, ccaa, title, story, tests, models, **kw):
    return dict(n=n, slug=f'{PREFIX}-{n:02d}-{slug}', ccaa=ccaa, title=title, story=story, tests=tests, models=models, **kw)


AUTONOMOS = [
    A(32, 'autonomo-directa-normal-empleados-local-asturias', 'asturias', 'Carpintería en estimación directa NORMAL con dos empleados, profesionales y local',
      'Renunció a la simplificada: estimación directa normal (sin el 5 % de difícil justificación; amortización según tablas). Dos empleados, asesor fiscal y abogada (personas físicas, retención del 15 %), local alquilado a un particular (19 %, modelo 115) y compras de madera.',
      ['estimación directa normal (sin 5 %)', 'amortización como gasto', '111 con trabajo y profesionales', '115 del local', '303 régimen general', '190, 180 y 347'],
      ['130', '303', '111', '115', '180', '190', '347', '390', 'RETA'],
      vat='general', method='normal',
      sales=[dict(client='Constructora Ficticia del Norte, S.L.', nif='B00000321', share=0.6), dict(client='Promociones Ficticias Astur, S.L.', nif='B00000322', share=0.4)],
      income=[52000, 58000, 47000, 63000], rate=21,
      monthly=[dict(name='Arrendador Ficticio del local', nif=nif(321), kind='rent', base=1800, rate=21, ret=19),
               dict(name='Asesor Fiscal Ficticio', nif=nif(322), kind='pro', base=250, rate=21, ret=15),
               dict(name='Abogada Ficticia', nif=nif(324), kind='pro', base=150, rate=21, ret=15),
               dict(name='Eléctrica Ficticia, S.A. (luz)', nif='A00000326', kind='supplies', base=400, rate=21, ret=0),
               dict(name='Aseguradora Ficticia, S.A. (seguro, exento de IVA)', nif='A00000327', kind='insurance', base=90, rate=0, ret=0)],
      quarterly=[dict(name='Maderas Ficticias, S.A.', nif='A00000325', kind='material', base=[18000, 20000, 16000, 22000], rate=21)],
      amortization=750, staff=dict(people=2, monthly=3800, rate=12, employerSS=1200)),
    A(36, 'autonoma-tarifa-plana-2026-isp-ue-cantabria', 'cantabria', 'Diseñadora que se da de alta el 1-2-2026 con tarifa plana y software de Irlanda',
      'Profesional (diseño gráfico) desde el 1-2-2026: tarifa plana, retención del 7 % a sus clientes empresa (año de inicio y dos siguientes) y una suscripción de software de un proveedor irlandés: inversión del sujeto pasivo (303, casillas 10-11 y 36-37; 349 clave I).',
      ['alta a mitad de trimestre', 'tarifa plana 2026', 'retención del 7 % de inicio', 'adquisición intracomunitaria de servicios (10-11 y 36-37)', '349 clave I'],
      ['130', '303', '349', '390', 'RETA'],
      vat='general', method='simplificada', start=2,
      sales=[dict(client='Agencia Ficticia Cántabra, S.L.', nif='B00000361', share=0.7, ret=7), dict(client='Cliente particular ficticio', nif=nif(362), share=0.3, ret=0)],
      income=[3000, 6500, 5500, 7500], rate=21,
      monthly=[dict(name='Software Ficticio Ltd (Irlanda)', nif='IE0000000AB', kind='software', base=60, rate=21, ret=0, isp='eu'),
               dict(name='Coworking Ficticio Santander, S.L.', nif='B00000363', kind='other', base=120, rate=21, ret=0),
               dict(name='Teléfono Ficticio, S.A.', nif='A00000364', kind='supplies', base=40, rate=21, ret=0)],
      reta=dict(flat=True)),
    A(49, 'abogada-ceuta-130-al-8-sin-iva', 'ceuta', 'Abogada en Ceuta: sin IVA (IPSI) y pago fraccionado al 8 %',
      'Despacho en Ceuta con clientes particulares. En Ceuta no se aplica el IVA (allí rige el IPSI, impuesto local que Finanverso no cubre): no presenta 303. Con derecho a la deducción del art. 68.4, el pago fraccionado del 130 es el 8 % en lugar del 20 % (art. 110.1 RIRPF).',
      ['sin 303 en Ceuta (IPSI)', '130 al 8 %', 'estimación directa simplificada', 'sin retenciones'],
      ['130', 'RETA'],
      vat='none-ipsi', method='simplificada', irpfRate=8,
      sales=[dict(client='Clientes particulares (minutas, sin NIF)', nif='', share=1.0)],
      income=[9000, 11000, 8000, 12000], rate=0,
      monthly=[dict(name='Centro de Negocios Ficticio, S.L. (despacho)', nif='B00000492', kind='other', base=250, rate=0, ret=0),
               dict(name='Colegio de Abogados Ficticio (cuota)', nif='Q00000493', kind='other', base=60, rate=0, ret=0),
               dict(name='Base de Datos Jurídica Ficticia, S.L.', nif='B00000494', kind='software', base=80, rate=0, ret=0)]),
    A(52, 'disenador-canarias-igic-130-exento', 'canarias', 'Diseñador web en Canarias: IGIC y sin modelo 130 por retenciones',
      'En Canarias no hay IVA sino IGIC (7 %, modelo 420 ante la Agencia Tributaria Canaria, fuera de Finanverso). Más del 70 % de sus ingresos del año anterior tuvo retención del 15 %: no está obligado al 130 (art. 109.1 RIRPF). Su gestor es una persona física: modelo 111.',
      ['IGIC en lugar de IVA (sin 303)', 'exención del 130 por retenciones ≥ 70 %', '111 por el gestor', 'IGIC fuera de ingresos y gastos'],
      ['111', '190', 'RETA'],
      vat='none-igic', method='simplificada', exempt130=True, igic=7,
      sales=[dict(client='Hoteles Ficticios Tinerfeños, S.L.', nif='B00000521', share=0.85, ret=15), dict(client='Cliente particular ficticio', nif=nif(522), share=0.15, ret=0)],
      income=[10000, 12000, 9000, 14000], rate=7,
      monthly=[dict(name='Coworking Ficticio Santa Cruz, S.L.', nif='B00000523', kind='other', base=150, rate=7, ret=0),
               dict(name='Teléfono Ficticio Canarias, S.A.', nif='A00000524', kind='supplies', base=45, rate=7, ret=0),
               dict(name='Gestor Ficticio Tinerfeño', nif=nif(525), kind='pro', base=80, rate=7, ret=15)]),
    A(53, 'tienda-recargo-equivalencia-local-baleares', 'baleares', 'Tienda de ropa en recargo de equivalencia con local alquilado',
      'Comerciante minorista (epígrafe 651.2): su proveedor le cobra IVA y recargo de equivalencia (5,2 %), no presenta 303 y no deduce IVA. En el IRPF el IVA que cobra a sus clientes es ingreso y el IVA y el recargo que paga son gasto (Manual de Renta 2025, «IVA devengado»). Local alquilado a un particular: 115.',
      ['recargo de equivalencia (sin 303)', 'IVA repercutido como ingreso del IRPF', 'IVA y recargo soportados como gasto', '115 del local', '347 del proveedor y del arrendador'],
      ['130', '115', '180', '347', 'RETA'],
      vat='recargo', method='simplificada',
      sales=[dict(client='Ventas a particulares (tiques del mes)', nif='', share=1.0)],
      income=[20000, 25000, 18000, 30000], rate=21,
      monthly=[dict(name='Arrendadora Ficticia del local', nif=nif(531), kind='rent', base=1500, rate=21, ret=19),
               dict(name='Eléctrica Ficticia Balear, S.A.', nif='A00000532', kind='supplies', base=180, rate=21, ret=0)],
      quarterly=[dict(name='Mayorista Textil Ficticio, S.A.', nif='A00000533', kind='material', base=[9000, 12000, 8000, 15000], rate=21, re=5.2)]),
    A(54, 'psicologa-prorrata-cataluna', 'cataluna', 'Psicóloga con terapia exenta y peritajes con IVA: prorrata',
      'La psicoterapia es asistencia sanitaria exenta (art. 20.Uno.3.º LIVA) y los informes periciales para juzgados y abogados llevan IVA y retención del 15 %. Deduce el IVA soportado con la prorrata provisional del 25 % (la definitiva de 2025) y regulariza en el 4T con la definitiva de 2026 (casilla 44).',
      ['prorrata general (arts. 102-106 LIVA)', 'regularización de la prorrata en el 4T (casilla 44)', 'IVA no deducible como gasto del IRPF', 'operaciones exentas sin casilla en el 303', 'retención del 15 % en parte de los ingresos'],
      ['130', '303', '390', 'RETA'],
      vat='prorrata', method='simplificada', prorrata=25,
      sales=[dict(client='Pacientes (terapia, exenta)', nif='', share=None, exempt=True, amounts=[9000, 9000, 7000, 9600]),
             dict(client='Despacho de Abogados Ficticio, S.L.P. (peritajes)', nif='B00000541', share=None, ret=15, amounts=[3000, 3500, 2500, 4000])],
      income=None, rate=21,
      monthly=[dict(name='Consulta Ficticia Girona, S.L. (alquiler de despacho por horas)', nif='B00000542', kind='other', base=400, rate=21, ret=0),
               dict(name='Software Clínico Ficticio, S.L.', nif='B00000543', kind='software', base=50, rate=21, ret=0),
               dict(name='Teléfono Ficticio, S.A.', nif='A00000544', kind='supplies', base=40, rate=21, ret=0)]),
    A(56, 'pluriactividad-tienda-online-isp-comunitat-valenciana', 'comunitat-valenciana', 'Asalariado con una tienda online: pluriactividad y servicios de fuera',
      'Trabaja por cuenta ajena y además vende por internet a particulares de España (estimación directa simplificada). Paga publicidad a una empresa irlandesa (adquisición intracomunitaria de servicios: 10-11 y 36-37) y una plataforma de comercio de EE. UU. (inversión del sujeto pasivo: 12-13 y 28-29). Cotiza en pluriactividad.',
      ['pluriactividad (RETA + Régimen General)', 'servicios de un proveedor UE (10-11, 36-37) y 349 clave I', 'servicios de fuera de la UE (12-13 y 28-29)', '130 sin retenciones'],
      ['130', '303', '349', '390', 'RETA', '100'],
      vat='general', method='simplificada', pluri=True,
      sales=[dict(client='Ventas online a particulares (resumen mensual)', nif='', share=1.0)],
      income=[6000, 7000, 6500, 10000], rate=21,
      monthly=[dict(name='Publicidad Ficticia Ltd (Irlanda)', nif='IE0000000CD', kind='advertising', base=300, rate=21, ret=0, isp='eu'),
               dict(name='Fictitious Commerce Platform Inc. (EE. UU.)', nif='', kind='software', base=80, rate=21, ret=0, isp='noneu'),
               dict(name='Mensajería Ficticia, S.L.', nif='B00000561', kind='other', base=250, rate=21, ret=0)],
      quarterly=[dict(name='Proveedor Ficticio de Género, S.L.', nif='B00000562', kind='material', base=[2400, 2800, 2600, 4000], rate=21)]),
]

FUERA = [
    dict(n=44, slug=f'{PREFIX}-44-taxista-modulos-extremadura', ccaa='extremadura', title='Taxista en estimación objetiva (módulos) en Mérida',
         story='Taxista (epígrafe 721.2) en módulos con IVA simplificado: modelos 131 y 303 simplificado, sin libro de facturas de ventas. Segundo caso de módulos del banco (el 25 es de Andalucía) con otros signos: un conductor asalariado a media jornada y 45.000 km al año.',
         tests=['estimación objetiva', 'IVA simplificado', 'personal asalariado en módulos'], models=['131', '303 (simplificado)', '390', '100'],
         reason='El modelo 390 (exonerado en régimen simplificado) y el resto de la Renta (mínimos, cuota) no se comparan aquí: solo el 131, el 303 simplificado y la actividad.',
         datos=dict(epigrafe='721.2', personalNoAsalariado=1, personalAsalariadoHoras=900, distanciaKm=45000, asientos=5,
                    personalAsalariadoAnterior=0.5, poblacion='De 50.001 a 100.000 habitantes (Mérida)', rendimientoAnterior=8799.08,
                    ivaSoportadoAnual=1100)),
    dict(n=55, slug=f'{PREFIX}-55-ganadero-leche-modulos-reagp-galicia', ccaa='galicia', title='Ganadero de vacuno de leche en módulos y en el REAGP',
         story='Vende toda la leche a una cooperativa que le retiene el 2 % y le paga la compensación del REAGP (10,5 % en ganadería, art. 130 LIVA). Más del 70 % de sus ingresos tiene retención: no presenta el 131. No presenta 303 (REAGP). La Renta va por módulos agrarios (índice de rendimiento de la Orden del año).',
         tests=['estimación objetiva agraria', 'REAGP: compensación del 10,5 %', 'exención del 131 por retenciones ≥ 70 %', 'retención del 2 % a actividades agrícolas y ganaderas'], models=['100 (módulos agrarios)'],
         reason='La app ya calcula los módulos agrarios (agrarianModules.ts) y el REAGP, pero no se ha confirmado en fuente oficial si la compensación del REAGP entra en el volumen de ingresos al que se aplica el índice de rendimiento (0,20 del vacuno de leche): sin eso el rendimiento no se puede fijar a mano. Calculado solo lo que fija la ley: compensación del 10,5 % y retención del 2 %.',
         datos=dict(ventasLeche=[18000, 17500, 16800, 18200], compensacion=10.5, retencion=2)),
    dict(n=57, slug=f'{PREFIX}-57-foral-navarra-fuera-de-alcance', ccaa='navarra', title='Asalariado residente en Navarra (régimen foral)',
         story='Reside en Pamplona: presenta la Renta (modelo F-90) ante la Hacienda Foral de Navarra con su propia ley del IRPF y sus escalas. Fuera del alcance del motor (solo régimen común).',
         tests=['territorio foral: Navarra'], models=['F-90 (Navarra)'], reason='Territorio foral de Navarra: normativa, escalas y modelos propios (F-90), no los del régimen común.'),
    dict(n=58, slug=f'{PREFIX}-58-foral-gipuzkoa-autonomo-fuera-de-alcance', ccaa='pais-vasco', title='Autónomo residente en Gipuzkoa (régimen foral, TicketBAI)',
         story='Fontanero autónomo en Donostia: IRPF, pagos fraccionados e IVA ante la Diputación Foral de Gipuzkoa (TicketBAI, modelo 130 foral y 303 foral). Fuera del alcance de Finanverso.',
         tests=['territorio foral: Gipuzkoa', 'autónomo foral'], models=['109 foral', '130 foral', '303 foral'],
         reason='Territorio foral de Gipuzkoa: normativa, escalas y modelos propios (TicketBAI y modelos forales), no los de la AEAT.'),
]


# Orden HAC/1425/2025 (BOE-A-2025-25272), anexo II, 721.2 (los mismos importes que la HAC/1347/2024).
TAXI = dict(irpf=[('Personal asalariado', 1346.27), ('Personal no asalariado', 7656.89), ('Distancia recorrida (1.000 km)', 45.08)],
            iva=[('Personal empleado', 903.46), ('Distancia recorrida (1.000 km)', 8.78)], minimum=10, quarterly=5)
ORDEN_2026 = 'https://www.boe.es/boe/dias/2025/12/11/pdfs/BOE-A-2025-25272.pdf'
I131 = f'{SEDE}/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-131-irpf______sionales-estimacion-objetiva-fraccionado_/instrucciones.html'


def build_taxi44(d):
    """131, 303 simplificado y casillas de la actividad del taxista 44, a mano con la orden de 2026."""
    steps = Steps()
    dec = lambda x: f'{x:g}'.replace('.', ',')  # noqa: E731
    figs = []
    staff = r2(d['personalAsalariadoHoras'] / 1800)
    units = [staff, d['personalNoAsalariado'], d['distanciaKm'] / 1000]
    steps.h('IRPF: rendimiento neto por módulos')
    steps.s(f'Unidades (instrucción 2.1 del anexo II, [Orden HAC/1425/2025]({ORDEN_2026})): personal asalariado {d["personalAsalariadoHoras"]} h / 1.800 = '
            f'**{dec(staff)}**; personal no asalariado (el titular) **1**; distancia **{dec(units[2])}** miles de km. Los asientos no son módulo del taxi.')
    previous = r2(sum(a * u for (_, a), u in zip(TAXI['irpf'], units)))
    steps.s(f'Rendimiento neto previo (1465) = {dec(staff)} × 1.346,27 + 1 × 7.656,89 + {dec(units[2])} × 45,08 = **{eur(previous)}**')
    employment = r2(0.10 * staff * 1346.27)
    steps.s(f'Minoración por empleo (1466): sin aumento de plantilla ({dec(d["personalAsalariadoAnterior"])} el año pasado), tramo hasta 1,00 → 0,10 × {dec(staff)} × 1.346,27 = **{eur(employment)}**')
    reduced = r2(previous - employment)
    modules = r2(reduced * 0.90)
    general = r2(modules * 0.05)
    net = r2(modules - general)
    steps.s(f'Rendimiento minorado (1468) = **{eur(reduced)}**; índice del taxi en un municipio de 50.001 a 100.000 habitantes (2.3.a.2) 0,90: '
            f'rendimiento neto de módulos (1474) = **{eur(modules)}**; reducción general del 5 % (DA 1.ª, 1475) = **{eur(general)}**; '
            f'rendimiento neto de la actividad (1479) = **{eur(net)}**')
    for box, concept, amount in [('1465', 'Rendimiento neto previo', previous), ('1466', 'Minoración por incentivos al empleo', employment),
                                 ('1468', 'Rendimiento neto minorado', reduced), ('1474', 'Rendimiento neto de módulos', modules),
                                 ('1475', 'Reducción de carácter general', general), ('1479', 'Rendimiento neto de la actividad', net)]:
        figs.append(dict(modelo='100', casilla=box, concepto=concept, importe=amount, origen='calculo-a-mano',
                         ref='calculo.md#irpf-rendimiento-neto-por-modulos', campo=f'renta.{box}'))
    steps.h('Modelo 131')
    pay = r2(net * 3 / 100)
    cut = 100 if d['rendimientoAnterior'] <= 9000 else 0
    due = r2(pay - cut)
    steps.s(f'Con los mismos datos a 1 de enero (instrucción 3), casilla 01 = **{eur(net)}**; con {dec(staff)} personas asalariadas (no más de una) el 3 % '
            f'(instrucción 4): casilla 02 = **{eur(pay)}**. Sin retenciones (08). Rendimiento de 2025 {eur(d["rendimientoAnterior"])} ≤ 9.000 €: '
            f'minoración de 100 € (casilla 09, art. 110.3.c RIRPF). Resultado (15) = **{eur(due)}** cada trimestre ([instrucciones del 131]({I131})).')
    for q in range(1, 5):
        for box, concept, amount in [('01', 'Rendimiento neto', net), ('02', 'Pago fraccionado previo', pay), ('09', 'Minoración', cut),
                                     ('15', 'Resultado de la autoliquidación', due)]:
            figs.append(dict(modelo='131', periodo=f'{q}T', casilla=box, concepto=concept, importe=amount, origen='calculo-a-mano',
                             ref='calculo.md#modelo-131', campo=f'm131.{box}'))
    figs.append(dict(modelo='100', casilla='0604', concepto='Pagos fraccionados ingresados', importe=r2(4 * due), origen='calculo-a-mano',
                     ref='calculo.md#modelo-131', campo='renta.0604'))
    steps.h('Modelo 303 en régimen simplificado')
    vat_units = [r2(staff + 1), units[2]]
    c = r2(sum(a * u for (_, a), u in zip(TAXI['iva'], vat_units)))
    f = r2(c * TAXI['quarterly'] / 100)
    steps.s(f'Personal empleado = asalariados + no asalariados = **{dec(vat_units[0])}** (instrucción 2.1 del IVA); cuota devengada C = {dec(vat_units[0])} × 903,46 + '
            f'{dec(units[2])} × 8,78 = **{eur(c)}**; 1T-3T: ingreso a cuenta del {TAXI["quarterly"]} % (instrucción 3) = **{eur(f)}** (casillas 47 y 71).')
    hard = r2(c * 0.01)
    g = r2(d['ivaSoportadoAnual'] + hard)
    i = r2(c - g)
    lmin = r2(c * TAXI['minimum'] / 100)
    m = max(i, lmin)
    paid = r2(3 * f)
    q4 = r2(m - paid)
    steps.s(f'4T: IVA soportado del año {eur(d["ivaSoportadoAnual"])} + 1 % de difícil justificación {eur(hard)} = G **{eur(g)}**; I = C − G = **{eur(i)}**; '
            f'cuota mínima del {TAXI["minimum"]} % = **{eur(lmin)}**; M = **{eur(m)}** (casilla 48); ingresos a cuenta del año (49) **{eur(paid)}**; '
            f'resultado (50 y 71) = **{eur(q4)}**.')
    for q in range(1, 4):
        for box in ('47', '71'):
            figs.append(dict(modelo='303', periodo=f'{q}T', casilla=box, concepto='Ingreso a cuenta' if box == '47' else 'Resultado de la liquidación',
                             importe=f, origen='calculo-a-mano', ref='calculo.md#modelo-303-en-regimen-simplificado', campo=f'm303s.{box}'))
    for box, concept, amount in [('48', 'Cuota anual derivada del régimen simplificado', m), ('49', 'Ingresos a cuenta del ejercicio', paid),
                                 ('50', 'Resultado', q4), ('71', 'Resultado de la liquidación', q4)]:
        figs.append(dict(modelo='303', periodo='4T', casilla=box, concepto=concept, importe=amount, origen='calculo-a-mano',
                         ref='calculo.md#modelo-303-en-regimen-simplificado', campo=f'm303s.{box}'))
    modulos = dict(ejercicio=2026, actividad='m59',
                   form=dict(activityId='m59', unitsStart=[dec(u) for u in units], staffLastYear=dec(d['personalAsalariadoAnterior']),
                             special='upTo100000', vatSupported=str(d['ivaSoportadoAnual'])),
                   rendimientoAnterior=d['rendimientoAnterior'], regimenIva='simplified')
    return figs, steps, modulos


def months_of(q, start=1):
    return [m for m in range(3 * q - 2, 3 * q + 1) if m >= start]


def date_of(m, day=15):
    return f'2026-{m:02d}-{day:02d}'


def build_autonomo2(a):
    """130, 303, 111, 115, RETA y resúmenes de 2026 de un autónomo, calculados a mano."""
    steps = Steps()
    figs = []
    issued, received, bank, movements = [], [], [], []
    m303s, m130s, m111s, m115s = [], [], [], []
    start = a.get('start', 1)
    vat = a['vat']
    rate130 = a.get('irpfRate', 20)
    ref = lambda q: f'calculo.md#{q}º-trimestre-de-2026'  # noqa: E731
    fig = lambda modelo, periodo, casilla, concepto, importe, campo=None, **kw: figs.append(  # noqa: E731
        dict(modelo=modelo, periodo=periodo, casilla=casilla, concepto=concepto, importe=r2(importe) if importe is not None else None, origen=kw.pop('origen', 'calculo-a-mano'),
             ref=kw.pop('ref', ref(periodo[0]) if periodo[0].isdigit() and periodo.endswith('T') else 'calculo.md#resúmenes-anuales'), campo=campo, **kw))
    inv = 0
    staff = a.get('staff')
    year = dict(income=0.0, vatOut=0.0, base21=0.0, ded=0.0, isp_eu=0.0, isp_non=0.0, soportado=0.0, taxable=0.0, exempt=0.0, provisional_ded=0.0)
    pct = a.get('prorrata', 100) if vat == 'prorrata' else 100
    per_client = {}
    per_supplier = {}

    # The year first, without the RETA fee, for the RETA bracket (net/month − 7 %).
    def quarter_lines(q):
        ms = months_of(q, start)
        lines_in, lines_out = [], []
        for s in a['sales']:
            amount = s['amounts'][q - 1] if s.get('amounts') else a['income'][q - 1] * s['share']
            each = r2(amount / len(ms))
            for i, m in enumerate(ms):
                # The last month takes the cents left, so the quarter adds up exactly.
                base = each if i < len(ms) - 1 else r2(amount - each * (len(ms) - 1))
                lines_in.append(dict(s, base=base, date=date_of(m), rate=0 if s.get('exempt') else a['rate']))
        for e in a.get('monthly', []):
            for m in ms:
                lines_out.append(dict(e, date=date_of(m, 10)))
        for e in a.get('quarterly', []):
            lines_out.append(dict(e, base=e['base'][q - 1], date=date_of(ms[-1], 5)))
        return ms, lines_in, lines_out

    def cost_of(e, ded_pct):
        """What an expense costs in the IRPF: the base plus the VAT (or IGIC, or RE) that is not deducted."""
        tax = r2(e['base'] * e['rate'] / 100)
        if vat in ('general', 'prorrata'):
            nd = r2(tax - r2(tax * ded_pct / 100)) if e['rate'] else 0.0
            return r2(e['base'] + nd)
        if vat == 'recargo':
            return r2(e['base'] + tax + r2(e['base'] * e.get('re', 0) / 100))
        return e['base']  # IGIC is deducted in the 420; Ceuta has no VAT.

    def sale_income(line):
        if vat == 'recargo':
            return r2(line['base'] * (100 + line['rate']) / 100)
        return line['base']

    annual_net = 0.0
    active_months = 13 - start
    for q in range(1, 5):
        ms, li, lo = quarter_lines(q)
        annual_net += sum(sale_income(x) for x in li) - sum(cost_of(e, pct) for e in lo) - (a.get('amortization', 0))
        annual_net += sum(x['amount'] for x in a.get('subsidies', []) if x['q'] == q)
        if staff:
            annual_net -= (staff['monthly'] + staff['employerSS']) * len(ms)
    monthly_net = r2(annual_net / active_months)
    computable = r2(monthly_net - r2(monthly_net * 0.07))
    bracket = next(bk for bk in RETA_BRACKETS if bk[2] is None or (computable < bk[2] if bk[3] else computable <= bk[2]))
    reta_fee = r2(bracket[4] * 0.315)
    month_fee = 80.0 if a.get('reta', {}).get('flat') else reta_fee

    cum_income = cum_exp = paid130 = cum_withheld = 0.0
    neg_prev = 0.0
    for q in range(1, 5):
        ms, li, lo = quarter_lines(q)
        steps.h(f'{q}.º trimestre de 2026')
        withheld_q = 0.0
        out = dict(base=0.0, vat=0.0)
        exempt_q = 0.0
        for x in li:
            inv += 1
            num = f'2026-{inv:03d}'
            v = r2(x['base'] * x['rate'] / 100)
            held = r2(x['base'] * x.get('ret', 0) / 100)
            withheld_q += held
            issued.append(dict(date=x['date'], number=num, client=x['client'], nif=x['nif'], base=x['base'], rate=x['rate'], withheldRate=x.get('ret', 0),
                               **({'kind': 'exempt'} if x.get('exempt') else {}), **({'tax': 'IGIC'} if vat == 'none-igic' else {})))
            bank.append(dict(date=x['date'][:8] + '25', concept=f'Cobro {num} {x["client"]}', amount=r2(x['base'] + v - held)))
            if x.get('exempt'):
                exempt_q += x['base']
            else:
                out['base'] += x['base']
                out['vat'] += v
            if x['nif'] and not x.get('ret'):
                per_client[(x['client'], x['nif'])] = per_client.get((x['client'], x['nif']), 0) + x['base'] + v
            movements.append(dict(date=x['date'], type='INCOME', amountCents=round(x['base'] * (100 + x['rate'])), vatRate=x['rate']))
        out = dict(base=r2(out['base']), vat=r2(out['vat']))
        withheld_q = r2(withheld_q)
        sop = dict(base=0.0, vat=0.0)
        eu = dict(base=0.0)
        non = dict(base=0.0)
        rent = dict(base=0.0, ret=0.0)
        pro = dict(base=0.0, ret=0.0, people=set())
        cost = 0.0
        for e in lo:
            tax = r2(e['base'] * e['rate'] / 100)
            re_ = r2(e['base'] * e.get('re', 0) / 100)
            ret = r2(e['base'] * e.get('ret', 0) / 100)
            received.append(dict(date=e['date'], number=f'F-{e["date"][5:7]}-{e["kind"][:3].upper()}', supplier=e['name'], nif=e['nif'], base=e['base'],
                                 rate=0 if e.get('isp') else e['rate'], retention=ret, kind=e['kind'],
                                 **({'isp': e['isp']} if e.get('isp') else {}), **({'re': e['re'], 'reAmount': re_} if e.get('re') else {}),
                                 **({'tax': 'IGIC'} if vat == 'none-igic' else {})))
            paid = r2(e['base'] + (0 if e.get('isp') else tax) + re_ - ret)
            bank.append(dict(date=e['date'][:8] + '20', concept=f'Pago {e["name"]}', amount=-paid))
            movements.append(dict(date=e['date'], type='EXPENSE', amountCents=round((e['base'] + (0 if e.get('isp') else tax + re_)) * 100), vatRate=0 if e.get('isp') else e['rate']))
            if e.get('isp') == 'eu':
                eu['base'] += e['base']
            elif e.get('isp') == 'noneu':
                non['base'] += e['base']
            elif e['rate'] and vat in ('general', 'prorrata'):
                sop['base'] += e['base']
                sop['vat'] += tax
            if e['kind'] == 'rent':
                rent['base'] += e['base']
                rent['ret'] += ret
            elif e.get('ret'):
                pro['base'] += e['base']
                pro['ret'] += ret
                pro['people'].add(e['nif'])
            if e['nif'] and not e.get('isp') and not (e.get('ret') and e['kind'] != 'rent'):
                per_supplier[(e['name'], e['nif'])] = per_supplier.get((e['name'], e['nif']), 0) + e['base'] + tax + re_
            cost += cost_of(e, pct)
        if staff:
            st = dict(paid=staff['monthly'] * len(ms), ret=r2(staff['monthly'] * len(ms) * staff['rate'] / 100), ss=r2(staff['employerSS'] * len(ms)))
            cost += st['paid'] + st['ss']
            for m in ms:
                bank.append(dict(date=date_of(m, 30), concept='Nóminas de los empleados (líquido)', amount=-r2(staff['monthly'] - staff['monthly'] * staff['rate'] / 100)))
                bank.append(dict(date=date_of(m, 30), concept='Seguros sociales de la empresa', amount=-staff['employerSS']))
        cost += a.get('amortization', 0)
        reta_q = r2(month_fee * len(ms))
        cost = r2(cost + reta_q)
        for m in ms:
            bank.append(dict(date=date_of(m, 28), concept='Cuota de autónomos (RETA)', amount=-month_fee))
        eu_vat = r2(eu['base'] * 0.21)
        non_vat = r2(non['base'] * 0.21)
        sop = dict(base=r2(sop['base']), vat=r2(sop['vat']))

        # 303
        if vat in ('general', 'prorrata'):
            ded29 = r2((sop['vat'] + non_vat) * pct / 100)
            ded37 = r2(eu_vat * pct / 100)
            # The ISP VAT that is not deducted is a cost too.
            cost = r2(cost + (eu_vat - ded37) + (non_vat - r2(non_vat * pct / 100)))
            reg44 = 0.0
            year['soportado'] += sop['vat'] + non_vat + eu_vat
            year['provisional_ded'] += ded29 + ded37
            year['taxable'] += out['base']
            year['exempt'] += exempt_q
            if q == 4 and vat == 'prorrata':
                definitive = math.ceil(100 * year['taxable'] / (year['taxable'] + year['exempt']))
                reg44 = r2(r2(year['soportado'] * definitive / 100) - year['provisional_ded'])
                cost = r2(cost - reg44)
                steps.s(f'Prorrata definitiva de 2026 (art. 104 LIVA, redondeada a la unidad superior): {eur(year["taxable"])} / ({eur(year["taxable"])} + exentas '
                        f'{eur(year["exempt"])}) = **{definitive} %**. Regularización (casilla 44) = {definitive} % de {eur(r2(year["soportado"]))} − deducido en el año '
                        f'{eur(r2(year["provisional_ded"]))} = **{eur(reg44)}** (también ajusta el gasto del IRPF)')
            dev27 = r2(out['vat'] + eu_vat + non_vat)
            tot45 = r2(ded29 + ded37 + reg44)
            res = r2(dev27 - tot45)
            rows = []
            if out['base']:
                rows += [('07', 'Régimen general 21 %: base imponible', out['base']), ('09', 'Régimen general 21 %: cuota', out['vat'])]
            if eu['base']:
                rows += [('10', 'Adquisiciones intracomunitarias de bienes y servicios: base', r2(eu['base'])), ('11', 'Adquisiciones intracomunitarias de bienes y servicios: cuota', eu_vat)]
            if non['base']:
                rows += [('12', 'Otras operaciones con inversión del sujeto pasivo: base', r2(non['base'])), ('13', 'Otras operaciones con inversión del sujeto pasivo: cuota', non_vat)]
            rows += [('27', 'Total cuota devengada', dev27),
                     ('28', 'Cuotas soportadas en operaciones interiores corrientes: base (sin prorratear)', r2(sop['base'] + non['base'])),
                     ('29', 'Cuotas soportadas en operaciones interiores corrientes: cuota deducible', ded29)]
            if eu['base']:
                rows += [('36', 'Adquisiciones intracomunitarias de bienes y servicios corrientes: base', r2(eu['base'])), ('37', 'Adquisiciones intracomunitarias corrientes: cuota deducible', ded37)]
            if reg44:
                rows += [('44', 'Regularización por aplicación del porcentaje definitivo de prorrata', reg44)]
            rows += [('45', 'Total a deducir', tot45), ('46', 'Resultado régimen general (27 − 45)', res), ('64', 'Suma de resultados', res),
                     ('66', 'Atribuible a la Administración del Estado (100 %)', res), ('69', 'Resultado de la autoliquidación', res), ('71', 'Resultado de la liquidación', res)]
            m303s.append(rows)
            for box, label, amount in rows:
                fig('303', f'{q}T', box, label, amount, campo=f'm303.{box}')
            year['base21'] += out['base']
            year['vatOut'] += out['vat']
            year['ded'] += tot45
            year['isp_eu'] += eu['base']
            year['isp_non'] += non['base']
            steps.s(f'303: devengado 21 % de {eur(out["base"])} = {eur(out["vat"])}'
                    + (f' + autorrepercusión UE {eur(eu_vat)} (10-11)' if eu['base'] else '') + (f' + inversión del sujeto pasivo de fuera de la UE {eur(non_vat)} (12-13)' if non['base'] else '')
                    + (f' = {eur(dev27)}' if eu['base'] or non['base'] else '') + f'; deducible {eur(tot45)}'
                    + (f' (IVA soportado {eur(r2(sop["vat"] + non_vat + eu_vat))} × prorrata provisional {pct} %' + (f' + regularización {eur(reg44)}' if reg44 else '') + ')' if vat == 'prorrata' else '')
                    + (f'; operaciones exentas del art. 20 ({eur(exempt_q)}) sin casilla en el 303 trimestral' if exempt_q else '')
                    + f' → resultado (71) **{eur(res)}**')
            if res < 0:
                raise SystemExit(f'{a["slug"]}: 303 negativo en el {q}T; elige otros datos')
        elif vat == 'recargo':
            steps.s('303: no presenta. Recargo de equivalencia (arts. 148-163 LIVA): el proveedor le cobra IVA + 5,2 % y él no liquida ni deduce IVA.')
        elif vat == 'none-ipsi':
            steps.s('303: no presenta. En Ceuta no se aplica el IVA (art. 3 LIVA); el IPSI es un impuesto local fuera de Finanverso.')
        else:
            steps.s(f'IGIC: repercute el {a["igic"]} % ({eur(r2(out["base"] * a["igic"] / 100))}) y lo declara en el modelo 420 ante la Agencia Tributaria Canaria (fuera de Finanverso). '
                    'El IGIC no es ingreso ni gasto del IRPF.')

        # 130
        q_income = r2(sum(sale_income(x) for x in li))
        for sub in a.get('subsidies', []):
            # Third batch: current grants (Kit Digital, hiring aid) are income of the activity, outside the VAT.
            if sub['q'] == q:
                q_income = r2(q_income + sub['amount'])
                bank.append(dict(date=date_of(3 * q, 22), concept=f'Cobro de la subvención: {sub["name"]}', amount=sub['amount']))
                steps.s(f'Subvención corriente «{sub["name"]}» {eur(sub["amount"])}: ingreso de la actividad en el 130 (art. 14.1.b LIRPF y su imputación '
                        f'según el Impuesto sobre Sociedades); no es contraprestación de una operación, no lleva IVA (art. 78.Dos.3.º LIVA)')
        cum_income = r2(cum_income + q_income)
        cum_exp = r2(cum_exp + cost)
        prenet = r2(cum_income - cum_exp)
        hard = r2(min(max(0.0, prenet) * 0.05, 2000)) if a['method'] == 'simplificada' else 0.0
        exp02 = r2(cum_exp + hard)
        net03 = r2(cum_income - exp02)
        cum_withheld = r2(cum_withheld + withheld_q)
        if a.get('exempt130'):
            steps.s(f'130: NO lo presenta (art. 109.1 RIRPF: más del 70 % de los ingresos del año anterior con retención). Retenciones del trimestre {eur(withheld_q)}; '
                    f'rendimiento acumulado {eur(net03)}')
            fig('130', f'{q}T', None, 'Obligación de presentar el 130', None, valor='no (art. 109.1 RIRPF)')
        else:
            b04 = r2(max(0.0, net03) * rate130 / 100)
            b07 = r2(b04 - paid130 - cum_withheld)
            b12 = max(0.0, b07)
            rows = [('01', 'Ingresos computables acumulados', cum_income),
                    ('02', 'Gastos fiscalmente deducibles acumulados' + (' (con el 5 % de difícil justificación)' if hard else ''), exp02),
                    ('03', 'Rendimiento neto (01 − 02)', net03), ('04', f'{rate130} % de la casilla 03', b04), ('05', 'Pagos fraccionados de trimestres anteriores', paid130),
                    ('06', 'Retenciones soportadas acumuladas', cum_withheld), ('07', 'Pago fraccionado previo (04 − 05 − 06)', b07), ('12', 'Suma (07 + 11), mínimo 0', b12),
                    ('13', 'Minoración (art. 110.3.c RIRPF)', 0.0), ('14', 'Diferencia (12 − 13)', b12), ('15', 'Resultados negativos de trimestres anteriores', 0.0),
                    ('17', 'Total (14 − 15 − 16)', b12), ('19', 'Resultado de la autoliquidación', b12)]
            m130s.append(rows)
            for box, label, amount in rows:
                fig('130', f'{q}T', box, label, amount, campo=f'm130.{box}')
            steps.s(f'130 (acumulado): ingresos {eur(cum_income)}' + (' (con el IVA que cobra: recargo de equivalencia)' if vat == 'recargo' else '')
                    + f' − gastos {eur(cum_exp)} (incluye la cuota de autónomo {eur(reta_q)} del trimestre'
                    + (f', la amortización {eur(a["amortization"])}' if a.get('amortization') else '') + (', el IVA y el recargo soportados' if vat == 'recargo' else '')
                    + (', el IVA no deducible por la prorrata' if vat == 'prorrata' else '') + ')'
                    + (f' − 5 % de difícil justificación {eur(hard)}' if hard else (' (estimación directa normal: sin el 5 %)' if a['method'] == 'normal' else ''))
                    + f' = {eur(net03)}; {rate130} % = {eur(b04)} − pagos anteriores {eur(paid130)} − retenciones {eur(cum_withheld)} → **{eur(b12)}**'
                    + (' (art. 110.1 RIRPF: 8 % con derecho a la deducción de Ceuta y Melilla)' if rate130 == 8 else ''))
            paid130 = r2(paid130 + max(0.0, b07))
        # 111 y 115
        if staff or pro['base']:
            st_paid = staff['monthly'] * len(ms) if staff else 0
            st_ret = r2(st_paid * staff['rate'] / 100) if staff else 0
            rows = [('01', 'Perceptores, trabajo dinerario', staff['people'] if staff else 0), ('02', 'Percepciones, trabajo dinerario', st_paid),
                    ('03', 'Retenciones, trabajo dinerario', st_ret), ('07', 'Perceptores, actividades económicas', len(pro['people'])),
                    ('08', 'Percepciones, actividades económicas', r2(pro['base'])), ('09', 'Retenciones, actividades económicas', r2(pro['ret'])),
                    ('28', 'Suma de retenciones', r2(st_ret + pro['ret'])), ('30', 'Resultado a ingresar', r2(st_ret + pro['ret']))]
            m111s.append(rows)
            for box, label, amount in rows:
                fig('111', f'{q}T', box, label, amount, campo=f'm111.{box}')
            steps.s(f'111: nóminas {eur(st_paid)} con retención {eur(st_ret)} + profesionales {eur(r2(pro["base"]))} al 15 % = {eur(r2(pro["ret"]))} → **{eur(r2(st_ret + pro["ret"]))}**')
        else:
            m111s.append([])
        if rent['base']:
            rows = [('01', 'Nº de perceptores', 1), ('02', 'Base de las retenciones', r2(rent['base'])), ('03', 'Retenciones', r2(rent['ret'])), ('05', 'Resultado a ingresar', r2(rent['ret']))]
            m115s.append(rows)
            for box, label, amount in rows:
                fig('115', f'{q}T', box, label, amount, campo=f'm115.{box}')
            steps.s(f'115: alquiler del local {eur(r2(rent["base"]))} × 19 % = **{eur(r2(rent["ret"]))}**')
        else:
            m115s.append([])
        # RETA
        if a.get('reta', {}).get('flat'):
            fig('RETA', f'{q}T', None, 'Cuota mensual reducida (tarifa plana)', None, origen='pendiente', valorProbable=80.0,
                motivo='Los 80 €/mes de la cuota reducida están confirmados para 2023-2025; para 2026 no se ha encontrado la cifra en fuente oficial (art. 38 ter Ley 20/2007). Se usan 80 € en el 130.',
                retaInput=dict(monthlyNet=monthly_net, person='individual', flatRate=True), campo='reta.flatFee')
        else:
            fig('RETA', f'{q}T', None, 'Cuota mensual de autónomo (base mínima del tramo)', month_fee, campo='reta.feeMin',
                retaInput=dict(monthlyNet=monthly_net, person='individual', flatRate=False))
        if q == 1:
            fig('RETA', '2026', None, f'Tramo de cotización (rendimiento computable {eur(computable)} €/mes)', None, valor=bracket[0], campo='reta.bracket',
                ref='calculo.md#reta', retaInput=dict(monthlyNet=monthly_net, person='individual', flatRate=False))

    steps.h('RETA')
    steps.s(f'Rendimiento neto previsto del año (sin la propia cuota) {eur(r2(annual_net))} en {active_months} meses → {eur(monthly_net)} al mes; menos el 7 % de gastos genéricos = '
            f'{eur(computable)} → tramo **{bracket[0]}**, base mínima {eur(bracket[4])} × 31,5 % = **{eur(reta_fee)} €/mes** (Orden PJC/297/2026)')
    if a.get('reta', {}).get('flat'):
        steps.s('Tarifa plana (art. 38 ter Ley 20/2007): cuota reducida los 12 primeros meses (febrero de 2026 a enero de 2027). Importe de 2026 pendiente de confirmar (80 € usados).')
    if a.get('pluri'):
        steps.s('Pluriactividad: cotiza a la vez en el Régimen General (por su nómina) y en el RETA. Si la suma de cotizaciones supera el tope del año, la Seguridad Social '
                'devuelve el 50 % del exceso del RETA (art. 313 LGSS): importe del tope 2026 NO CONFIRMADO, queda pendiente.')
        fig('RETA', '2026', None, 'Devolución por pluriactividad (50 % del exceso, art. 313 LGSS)', None, origen='pendiente',
            motivo='Depende del tope de cotización de 2026 y de las cotizaciones de su nómina: no confirmado.')

    steps.h('Resúmenes anuales')
    if vat in ('general', 'prorrata'):
        fig('390', '2026', None, 'Total bases imponibles al 21 % del año', year['base21'])
        fig('390', '2026', None, 'Total cuotas devengadas al 21 % del año', year['vatOut'])
        fig('390', '2026', None, 'Total IVA deducible del año (incluida la regularización de la prorrata)', year['ded'])
        if year['exempt']:
            fig('390', '2026', None, 'Operaciones exentas sin derecho a deducción (art. 20 LIVA)', year['exempt'])
        steps.s(f'390: suma de los 303 → bases 21 % {eur(r2(year["base21"]))}, cuotas {eur(r2(year["vatOut"]))}, deducible {eur(r2(year["ded"]))}'
                + (f'; exentas {eur(r2(year["exempt"]))} y prorrata definitiva' if year['exempt'] else '') + '. Casillas del 390 no confirmadas: se dan los totales.')
    if year['isp_eu']:
        for q in range(1, 5):
            base = sum(e['base'] for e in received if e.get('isp') == 'eu' and int(e['date'][5:7]) in months_of(q, start))
            if base:
                fig('349', f'{q}T', None, 'Clave I, adquisiciones intracomunitarias de servicios', base)
        steps.s('349: clave I (adquisiciones intracomunitarias de servicios) con el proveedor de la UE, cada trimestre (NIF-IVA inventado).')
    if staff or any(e.get('ret') for e in received):
        if staff:
            fig('190', '2026', None, 'Perceptores clave A (trabajo): percepciones', staff['monthly'] * 12)
            fig('190', '2026', None, 'Perceptores clave A (trabajo): retenciones', r2(staff['monthly'] * 12 * staff['rate'] / 100))
        pros = [e for e in received if e.get('retention') and e['kind'] != 'rent']
        if pros:
            fig('190', '2026', None, 'Perceptores clave G (profesionales): percepciones', sum(e['base'] for e in pros))
            fig('190', '2026', None, 'Perceptores clave G (profesionales): retenciones', sum(e['retention'] for e in pros))
        rents = [e for e in received if e['kind'] == 'rent']
        if rents:
            fig('180', '2026', None, 'Arrendador del local: base anual', sum(e['base'] for e in rents))
            fig('180', '2026', None, 'Arrendador del local: retenciones anuales', sum(e['retention'] for e in rents))
        steps.s('190 y 180: suma de los 111 (trabajo y profesionales) y de los 115 (arrendador) del año.')
    big347 = [(k, v) for k, v in list(per_client.items()) + list(per_supplier.items()) if r2(v) > 3005.06]
    for (name, cid), v in big347:
        fig('347', '2026', None, f'{name} ({cid}): importe anual con impuestos', v)
    if big347:
        steps.s('347: clientes y proveedores de más de 3.005,06 € al año (impuestos incluidos); fuera las operaciones con retención (salvo el alquiler del local) '
                'y las intracomunitarias (van al 349).')
    # Renta 2026 (campaña de 2027): solo el rendimiento de la actividad.
    if a.get('exempt130'):
        net = net03
    else:
        net = net03
    fig('100', '2026', None, 'Rendimiento neto de la actividad para la Renta 2026 (estimación directa' + (' normal)' if a['method'] == 'normal' else ' simplificada, con el 5 %)'), net,
        motivo='Cifra de la Renta 2026: el motor de la Renta no calcula actividades económicas.')
    figs.append(dict(modelo='100', declaracion='individual', casilla=None, concepto='Renta 2026 completa del autónomo', importe=None, origen='pendiente',
                     motivo='El motor de la Renta no calcula los rendimientos de actividades económicas en el modelo 100.', campo=None))
    if a.get('pluri'):
        figs.append(dict(modelo='100', declaracion='individual', casilla=None, concepto='Renta 2026 con nómina y actividad (pluriactividad)', importe=None, origen='pendiente',
                         motivo='Falta su nómina de 2026 y el motor no suma actividades: la reducción del art. 20 no se aplica si las otras rentas pasan de 6.500 €.', campo=None))
    inputs = dict(quarters=[], hardToJustify=a['method'] == 'simplificada', priorYearNet=None, exempt130=bool(a.get('exempt130')), vatToOffset=0)
    data = dict(movements=movements, inputs=inputs, issued=issued, received=received, bank=bank, m303=m303s, m130=m130s, m111=m111s, m115=m115s)
    return figs, steps, data


# ─── Formularios, cifras y escritura ──────────────────────────────────────────

def property_form(pr):
    """Un inmueble como lo escribe la persona (PropertyForm de rentaRentals.ts): importes del inmueble entero."""
    t = lambda v: '' if v is None else str(v)  # noqa: E731
    return dict(label=pr['label'], share=t(pr.get('share')), rentedDays='' if pr.get('rentedDays', 365) == 365 else str(pr['rentedDays']),
                otherDays=t(pr.get('otherDays') or None), cadastral=t(pr.get('cadastral')), cadastralBuilding=t(pr.get('building')),
                revised=bool(pr.get('revised')), cost=t(pr.get('cost')), income=str(pr['income']),
                expenses={k: str(v) for k, v in pr['expenses'].items()}, pendingExcess=t(pr.get('pending') or None), withheld='',
                use=pr.get('use', 'home'), contract=pr.get('contract', ''), tensioned=bool(pr.get('tensioned')), rentDrop=bool(pr.get('rentDrop')),
                young=bool(pr.get('young')), social=bool(pr.get('social')), rehabilitated=bool(pr.get('rehabilitated')),
                irregular=False, relative=False)


def form2(p):
    f = {
        'ccaaId': p['ccaa'], 'age': str(p['age']), 'disability': p.get('disability', 0),
        'children': [dict(age=str(c['age']), disability=c.get('disability', 0)) for c in p.get('children', [])],
        'ascendants': [dict(over75=a['age'] >= 75, disability=a.get('disability', 0)) for a in p.get('ascendants', [])],
        'shared': bool(p.get('shared')), 'gross': str(p['gross']), 'socialSecurity': str(p['ss']), 'withheld': str(r2(p['withheld'] + p.get('otherWithheld', 0))),
        'nonSalary': str(p['nonSalary']) if p.get('nonSalary') else '', 'retired': bool(p.get('retired')),
        'workExpenses': {'cuotas-sindicales': str(p['union'])} if p.get('union') else {}, 'mobility': bool(p.get('mobility')),
        'pension': str(p['planOwn']) if p.get('planOwn') else '', 'pensionEmployer': '', 'spousePlan': str(p['spousePlan']) if p.get('spousePlan') else '',
        'compensatory': str(p['compensatory']) if p.get('compensatory') else '', 'savings': str(p['savings']) if p.get('savings') else '', 'choices': {},
    }
    # Fields the engine took later: assistance (art. 60.1), maintenance to the children (arts. 64 and 75)
    # and the part of a plan collected as capital from contributions up to 2006 (DT 12.ª, 40 %).
    if p.get('assistance'):
        f['assistance'] = True
    if p.get('alimentos'):
        f['childSupport'] = str(p['alimentos'])
    if p.get('dt12'):
        f['pensionCapital2006'] = str(r2(p['dt12'] / 0.4))
    if len(p.get('payers', [])) > 1:
        # Art. 96.3: the second and following payers "por orden de cuantía".
        f['secondPayers'] = str(r2(sum(sorted(x['gross'] for x in p['payers'])[:-1])))
    if p.get('detail'):
        f['savingsDetail'] = cc.savings_detail_of(p['detail'])
        f['savings'] = ''
    if p.get('rental'):
        rt = p['rental']
        f.update(rentalOn=True, rentalIncome=str(rt['income']), rentalExpenses=rt['expenses'], construction=str(rt['construction']), rentalReduction=rt['reductionId'])
    if p.get('properties'):
        f['rentalOn'] = True
        f['properties'] = [property_form(pr) for pr in p['properties']]
    if p.get('unrented'):
        f['unrented'] = [dict(value=str(u['value']), revised=u['revised'], days='' if u['days'] == 365 else str(u['days']))
                         for u in p['unrented'] if not u.get('fromProperty')]
    for d in p.get('deductions', []):
        f['choices'][d['id']] = dict(on=True, amount=d.get('choice_amount', ''), units=d.get('units', ''))
        if cc.checks_for(d['id']):
            f['choices'][d['id']]['checks'] = cc.checks_for(d['id'])
        if d.get('months'):
            f['choices'][d['id']]['months'] = d['months']
    j = p.get('joint')
    if j:
        f['joint'] = j['kind']
        if j.get('partner'):
            pt = j['partner']
            f['partner'] = dict(gross=str(pt['gross']) if pt['gross'] else '', socialSecurity=str(pt['ss']) if pt['gross'] else '0',
                                withheld=str(pt['withheld']) if pt['withheld'] else '', nonSalary='', age=str(pt['age']), disability=pt.get('disability', 0),
                                retired=False, savings='', pension='')
    return f


BOXES = ['0003', '0012', '0013', '0017', '0019', '0022', '0023', '0025', '0155', '0435', '0460', '0500', '0510', '0511', '0512', '0517', '0518', '0519', '0520',
         '0545', '0546', '0570', '0571', '0587', '0414', '0595', '0609', '0610', '0670']
CAMPOS = ['rentalNet', 'imputedIncome', 'pensionReduction', 'otherReductions', 'jointReduction', 'refundable', 'stateDeductions', 'regionalDeductions']
LABELS = dict(CAMPO_LABELS, otherReductions='Otras reducciones de la base (plan del cónyuge y pensión compensatoria)')


PROPOSALS_FILE = os.path.join(OUT, f'{PREFIX}-propuestas-motor.json')


def load_proposals():
    """Figures where the engine gives something else today (written by comparar-personas2: see the README)."""
    if not os.path.exists(PROPOSALS_FILE):
        return {}
    with open(PROPOSALS_FILE, encoding='utf-8') as fh:
        rows = json.load(fh)['renta']
    return {(r['caso'], r['declaracion'], r['campo']): r for r in rows}


PROPOSALS = load_proposals()


def figures2(p, b, decl, ref):
    out = []
    for k in BOXES:
        if k not in b or (k == '0155' and not b[k]):
            continue
        campo = f'boxes.{k}' if k in ENGINE_BOXES else None
        f = dict(modelo='100', declaracion=decl, casilla=k, concepto=BOX_LABELS[k], importe=b[k], origen='calculo-a-mano', ref=ref, campo=campo)
        out.append(f)
    for k in CAMPOS:
        if b.get(k):
            out.append(dict(modelo='100', declaracion=decl, casilla=None, concepto=LABELS[k], importe=b[k], origen='calculo-a-mano', ref=ref, campo=f'result.{k}'))
    for f in out:
        k = PROPOSALS.get((p['slug'], decl, f['campo']))
        if k and abs(k['esperado'] - f['importe']) < 0.005:
            # The engine gives another figure: kept out of the regression until the engine agent reviews it.
            f.update(campo=None, motorPropuesto=dict(campo=k['campo'], obtenido=k['obtenido']),
                     motivo=f'Discrepancia propuesta: el motor da {eur(k["obtenido"])}. ' + p.get('gap_reason', k.get('motivo', 'Revisar con el agente del motor.')))
    return out


def build_renta2(p):
    steps = Steps()
    decls, figures = [], []
    steps.lines.append('\n## Declaración individual del primer declarante\n')
    if p.get('savings_steps'):
        steps.h('0. Rentas del ahorro')
        for line in p['savings_steps']:
            steps.s(line)
    b = renta2(p, steps)
    decls.append(dict(id='individual', form=form2(p)))
    figures += figures2(p, b, 'individual', 'calculo.md#declaración-individual-del-primer-declarante')
    if p.get('joint'):
        steps.lines.append('\n## Declaración conjunta\n')
        bj = renta2(dict(p), steps, joint=p['joint'])
        figures += figures2(p, bj, 'conjunta', 'calculo.md#declaración-conjunta')
        steps.s(f'Comparación: individual {eur(b["0670"])} frente a conjunta {eur(bj["0670"])} → {"mejor la individual" if b["0670"] <= bj["0670"] else "mejor la conjunta"}')
    if len(p.get('payers', [])) > 1 and not p.get('retired'):
        others = sum(sorted(x['gross'] for x in p['payers'])[:-1])
        must = p['gross'] > 22000 or (p['gross'] > 15876 and others > 1500)
        figures.append(dict(modelo='100', declaracion='individual', casilla=None, concepto='Obligación de declarar (1 sí, 0 no; art. 96 LIRPF)',
                            importe=1.0 if must else 0.0, origen='calculo-a-mano', ref='calculo.md#declaración-individual-del-primer-declarante', campo='obligation.required'))
    if p.get('excess') is not None:
        # Art. 23.1.a.1.º: interest and repairs over the rent, for the next four years (box 0108).
        figures.append(dict(modelo='100', declaracion='individual', casilla='0108', concepto='Exceso de intereses y reparaciones para los 4 años siguientes',
                            importe=float(p['excess']), origen='calculo-a-mano', ref='calculo.md#declaración-individual-del-primer-declarante', campo='rental.excess'))
    for key, concept, amount in p.get('detail', {}).get('figures', []):
        figures.append(dict(modelo='100', declaracion='individual', casilla=key if key[0].isdigit() else None, concepto=concept, importe=float(amount),
                            origen='calculo-a-mano', ref='calculo.md#0-rentas-del-ahorro', campo=f'savings.{key}'))
    for concept, why in p.get('pending', []):
        figures.append(dict(modelo='100', declaracion='individual', casilla=None, concepto=concept, importe=None, origen='pendiente', motivo=why, campo=None))
    return decls, figures, steps, b


def borrador2(p, figures):
    d = cc.borrador_of(dict(p, disability=p.get('disability', 0)), figures)
    if d and (p.get('otherWithheld')):
        # The withholdings are not all from work: only the total is printed.
        for s in d['sections']:
            s['lines'] = [ln for ln in s['lines'] if ln['box'] != '0596']
    return d


def write(d, persona, esperado, title, story, steps, extra_sources=''):
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'persona.json'), 'w', encoding='utf-8') as fh:
        json.dump(persona, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    with open(os.path.join(d, 'esperado.json'), 'w', encoding='utf-8') as fh:
        json.dump(esperado, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    head = [f'# {persona["nombre"]}: {title}', '', f'> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el {CHECKED}.', '',
            story, '', f'NIF ficticio {persona["nif"]} · {persona["domicilio"]} · comunidad: {persona["comunidad"]}', '',
            'Qué prueba: ' + '; '.join(persona.get('prueba', [])) + '.', '',
            f'Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764]({BOE_LIRPF})), Reglamento del IRPF ([BOE-A-2007-6820]({BOE_RIRPF})), Ley 37/1992 del IVA '
            f'([BOE-A-1992-28740]({BOE_LIVA})) y Manual práctico de Renta 2025 de la AEAT: [trabajo]({SRC["trabajo"]}), [inmuebles]({SRC["inmuebles"]}), '
            f'[imputación]({SRC["imputacion"]}), [ganancias]({SRC["ganancias"]}), [integración]({SRC["integracion"]}), [reducciones]({SRC["reducciones"]}), '
            f'[mínimo]({SRC["minimo"]}), [cuotas]({SRC["cuotas"]}), [deducciones]({SRC["deducciones"]}), [cuota diferencial]({SRC["cuota-diferencial"]}). '
            f'Autónomos: [instrucciones del 303 de 2026]({I303}), [IVA devengado como ingreso en estimación directa]({IVA_DEVENGADO}), modelos 130, 111 y 115 '
            '(sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`.'
            + extra_sources, '']
    with open(os.path.join(d, 'calculo.md'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(head + steps.lines) + '\n')


def base_persona(n, slug, ccaa, title, story, tests, models, alcance, ejercicio):
    return dict(slug=slug, banco='p2', nombre=f'Persona Ficticia {n:02d}', nif=nif(n), domicilio=home(n, ccaa), iban='ES00 0000 0000 0000 0000 0000',
                ejercicio=ejercicio, comunidad=ccaa, titulo=title, descripcion=story, prueba=tests, modelos=models, alcance=alcance, datosFicticios=True)


def main():
    index = []
    proposals = []
    for p in RENTA:
        decls, figures, steps, b = build_renta2(p)
        # The Ceuta deduction amount is known only after the quotas: refresh the form.
        decls[0]['form'] = form2(p)
        persona = base_persona(p['n'], p['slug'], p['ccaa'], p['title'], p['story'], p['tests'], ['100'], 'dentro', 2025)
        persona['renta'] = dict(declaraciones=decls, conjunta=dict(kind=p['joint']['kind'], livesWithOtherParent=False) if p.get('joint') else None)
        persona['documentos'] = dict(borrador=borrador2(p, figures),
                                     pagadores=p['payers'],
                                     ahorro=p.get('savings_steps', []),
                                     alquiler=p.get('rental'))
        if p.get('joint') and p['joint'].get('partner'):
            persona['conyuge'] = dict(nombre=f'Persona Ficticia {p["n"]:02d}-B', nif=nif(200 + p['n']))
        esperado = dict(slug=p['slug'], ejercicio=2025, comprobado=CHECKED, cifras=figures)
        write(os.path.join(OUT, p['slug']), persona, esperado, p['title'], p['story'], steps)
        index.append(dict(slug=p['slug'], titulo=p['title'], comunidad=p['ccaa'], modelos=['100'], prueba=p['tests'], alcance='dentro'))
    for a in AUTONOMOS:
        figs, steps, data = build_autonomo2(a)
        persona = base_persona(a['n'], a['slug'], a['ccaa'], a['title'], a['story'], a['tests'], a['models'], 'parcial', 2026)
        # `autonomoPropuesto`, not `autonomo`: the backend check (comprobar-autonomos.ts) and casosAutonomos.test.ts
        # would take them in before their discrepancies are reviewed; the engine agent renames the key.
        persona['autonomoPropuesto'] = dict(ejercicio=2026, regimenIva=a['vat'], estimacion=a['method'], movimientos=data['movements'], inputs=data['inputs'])
        persona['documentos'] = dict(emitidas=data['issued'], recibidas=data['received'], banco=data['bank'], m303=data['m303'], m130=data['m130'],
                                     m111=data['m111'], m115=data['m115'])
        esperado = dict(slug=a['slug'], ejercicio=2026, comprobado=CHECKED, cifras=figs)
        write(os.path.join(OUT, a['slug']), persona, esperado, a['title'], a['story'], steps)
        index.append(dict(slug=a['slug'], titulo=a['title'], comunidad=a['ccaa'], modelos=a['models'], prueba=a['tests'], alcance='parcial'))
    for o in FUERA:
        persona = base_persona(o['n'], o['slug'], o['ccaa'], o['title'], o['story'], o['tests'], o['models'], 'fuera', 2026 if o['n'] in (44, 55, 58) else 2025)
        persona['motivoFueraDeAlcance'] = o['reason']
        persona['documentos'] = dict(datos=o.get('datos'))
        steps = Steps()
        steps.s(f'Fuera de alcance: {o["reason"]}')
        figs = [dict(modelo=o['models'][0], casilla=None, concepto='Resultado del modelo', importe=None, origen='pendiente', motivo=o['reason'], campo=None)]
        if o['n'] == 44:
            figs, steps, modulos = build_taxi44(o['datos'])
            persona['alcance'] = 'parcial'
            persona['modulos'] = modulos
            persona.pop('motivoFueraDeAlcance')
            figs.insert(0, dict(modelo='390', casilla=None, concepto='Resumen anual', importe=None, origen='pendiente', motivo=o['reason'], campo=None))
        if o['n'] == 55:
            steps.h('Lo que fija la ley')
            for q, v in enumerate(o['datos']['ventasLeche'], start=1):
                comp = r2(v * 10.5 / 100)
                ret = r2((v + comp) * 2 / 100)
                steps.s(f'{q}T: leche {eur(v)}; compensación REAGP 10,5 % (art. 130.Tres LIVA) = **{eur(comp)}**; retención del 2 % (art. 95.4.2.º RIRPF) sobre '
                        f'{eur(r2(v + comp))} = **{eur(ret)}**')
                figs.append(dict(modelo='REAGP', periodo=f'{q}T', casilla=None, concepto='Compensación a tanto alzado (10,5 %)', importe=comp, origen='calculo-a-mano',
                                 ref='calculo.md#lo-que-fija-la-ley', campo=None))
                figs.append(dict(modelo='100', periodo=f'{q}T', casilla=None, concepto='Retención del 2 % de la cooperativa', importe=ret, origen='pendiente',
                                 valorProbable=ret, motivo='Base de la retención (con o sin la compensación del REAGP) NO CONFIRMADA en fuente oficial en esta revisión.', campo=None))
            steps.s('Modelo 131: no lo presenta si más del 70 % de los ingresos del año anterior tuvo retención (art. 109.1 RIRPF). Renta: rendimiento por módulos agrarios con el índice '
                    'de la Orden de módulos (NO CONFIRMADO aquí); la compensación del REAGP es ingreso en directa (Manual 2025, «IVA devengado») y queda fuera del volumen de ingresos en módulos.')
        esperado = dict(slug=o['slug'], ejercicio=persona['ejercicio'], comprobado=CHECKED, cifras=figs)
        write(os.path.join(OUT, o['slug']), persona, esperado, o['title'], o['story'], steps)
        index.append(dict(slug=o['slug'], titulo=o['title'], comunidad=o['ccaa'], modelos=o['models'], prueba=o['tests'], alcance=persona['alcance']))
    index.sort(key=lambda x: x['slug'])
    with open(os.path.join(OUT, f'{PREFIX}-indice.json'), 'w', encoding='utf-8') as fh:
        json.dump(index, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    print(f'{len(index)} personas {PREFIX} en {OUT}')
    return proposals


if __name__ == '__main__':
    main()
