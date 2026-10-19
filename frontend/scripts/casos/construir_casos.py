#!/usr/bin/env python3
"""
Banco de casos prácticos de Finanverso: personas FICTICIAS con sus datos de entrada, el cálculo a mano
de cada cifra (independiente del motor de la app) y los datos de los documentos sintéticos.

Escribe, para cada persona, docs/casos-practicos/personas/<slug>/{persona.json, esperado.json, calculo.md}.
Los documentos (PDF y Excel) los genera después `npm run casos` (frontend/scripts/casos/generar.ts).

    python3 -I frontend/scripts/casos/construir_casos.py

Reglas (Renta 2025) tomadas de la Ley 35/2006 del IRPF y del Manual práctico de Renta 2025 de la AEAT
(https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025.html,
comprobado el 19-10-2026). Autónomos (2026): modelos 130, 303, 111, 115 y Orden PJC/297/2026 (RETA).
Las escalas y los mínimos AUTONÓMICOS se copian de frontend/src/modules/tools/data/renta/ccaa/*.ts (cada
archivo cita su fuente): el cálculo a mano comprueba el procedimiento, no esos datos.
Todos los nombres, NIF, direcciones y cuentas son INVENTADOS.
"""
import json
import os
from decimal import ROUND_HALF_UP, Decimal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'casos-practicos', 'personas')
CHECKED = '2026-10-19'
MANUAL = 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025'


def r2(x):
    return float(Decimal(repr(x)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


def eur(x):
    s = f'{abs(x):,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return ('-' if x < 0 else '') + s


def nif(n):
    return f'{n:08d}' + 'TRWAGMYFPDXBNJZSQVHLCKE'[n % 23]


# ─── Reglas estatales Renta 2025 ──────────────────────────────────────────────
STATE_SCALE = [(0, 9.5), (12450, 12), (20200, 15), (35200, 18.5), (60000, 22.5), (300000, 24.5)]
SAVINGS_HALF = [(0, 9.5), (6000, 10.5), (50000, 11.5), (200000, 13.5), (300000, 15)]
STATE_MIN = dict(personal=5550, over65=1150, over75=1400, descendants=[2400, 2700, 4000, 4500], under3=2800,
                 ascendants=1150, ascendantsOver75=1400, disability33=3000, disability65=9000, assistance=3000)

# Escalas y mínimos autonómicos 2025 (copiados de data/renta/ccaa/*.ts; None = los del Estado).
CCAA = {
    'madrid': dict(name='Comunidad de Madrid', scale=[(0, 8.5), (13362.22, 10.7), (19004.63, 12.8), (35425.68, 17.4), (57320.4, 20.5)],
                   min=dict(personal=5956.65, over65=1234.26, over75=1502.58, descendants=[2575.85, 2897.83, 4400, 4950], under3=3005.16,
                            ascendants=1234.26, ascendantsOver75=1502.58, disability33=3219.81, disability65=9659.44, assistance=3219.81)),
    'cataluna': dict(name='Cataluña', scale=[(0, 9.5), (12500, 12.5), (22000, 16), (33000, 19), (53000, 21.5), (90000, 23.5), (120000, 24.5), (175000, 25.5)], min=None),
    'andalucia': dict(name='Andalucía', scale=[(0, 9.5), (13000, 12), (21100, 15), (35200, 18.5), (60000, 22.5)],
                      min=dict(personal=5790, descendants=[2510, 2820, 4170, 4700], under3=2920, ascendants=1200, ascendantsOver75=1460,
                               over65=1200, over75=1460, disability33=3130, disability65=9390, assistance=3130)),
    'comunitat-valenciana': dict(name='Comunitat Valenciana', scale=[(0, 9), (12000, 12), (22000, 15), (32000, 17.5), (42000, 20), (52000, 22.5), (62000, 25), (72000, 26.5), (100000, 27.5), (150000, 28.5), (200000, 29.5)],
                                 min=dict(personal=6105, over65=1265, over75=1540, descendants=[2640, 2970, 4400, 4950], under3=3080, ascendants=1265,
                                          ascendantsOver75=1540, disability33=3300, disability65=9900, assistance=3300)),
    'castilla-y-leon': dict(name='Castilla y León', scale=[(0, 9), (12450, 12), (20200, 14), (35200, 18.5), (53407.2, 21.5)], min=None),
    'galicia': dict(name='Galicia', scale=[(0, 9), (12985.35, 11.65), (21068.6, 14.9), (35200, 18.4), (60000, 22.5)],
                    min=dict(personal=5789, over65=1199, over75=1460, descendants=[2503, 2816, 4172, 4694], under3=2920, ascendants=1199,
                             ascendantsOver75=1460, disability33=3129, disability65=9387, assistance=3129)),
    'canarias': dict(name='Canarias', scale=[(0, 9), (13748, 11.5), (19422, 14), (35924, 18.5), (57566, 23.5), (93268, 25), (123745, 26)],
                     min=dict(personal=5606, descendants=[2424, 2727, 4040, 4545], under3=2828, ascendants=1162, ascendantsOver75=1414,
                              over65=1162, over75=1414, disability33=3030, disability65=9090, assistance=3030)),
    'baleares': dict(name='Illes Balears', scale=[(0, 9), (10000, 11.25), (18000, 14.25), (30000, 17.5), (48000, 19), (70000, 21.75), (90000, 22.75), (120000, 23.75), (175000, 24.75)],
                     # Manual práctico de Renta 2025, c14, «Mínimo autonómico ... Illes Balears»: el del contribuyente mayor de 65
                     # años es «6.105 euros anuales por importe del mínimo por contribuyente general» más 1.265 (y 1.540 desde 75).
                     min=dict(personal=5550, personalOver65=6105, descendants=[2400, 2970, 4400, 4950], under3=2800, ascendants=1265, ascendantsOver75=1540,
                              over65=1265, over75=1540, disability33=3300, disability65=9900, assistance=3300)),
    'aragon': dict(name='Aragón', scale=[(0, 9.5), (13072.5, 12), (21210, 15), (36960, 18.5), (52500, 20.5), (60000, 23), (80000, 24), (90000, 25), (130000, 25.5)], min=None),
    'murcia': dict(name='Región de Murcia', scale=[(0, 9.5), (12450, 11.2), (20200, 13.3), (34000, 17.9), (60000, 22.5)], min=None),
}

SRC = {
    'trabajo': f'{MANUAL}/c03-rendimientos-trabajo.html',
    'reduccion': f'{MANUAL}/c03-rendimientos-trabajo/rendimiento-neto-trabajo-integrar-base-imponible/fase-3-determinacion-rendimiento-neto-reducido.html',
    'inmuebles': f'{MANUAL}/c05-rendimientos-capital-inmobiliario.html',
    'imputacion': f'{MANUAL}/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html',
    'ganancias': f'{MANUAL}/c11-ganancias-perdidas-patrimoniales.html',
    'integracion': f'{MANUAL}/c12-integracion-compensacion-rentas.html',
    'reducciones': f'{MANUAL}/c13-determinacion-renta-contribuyente-sujeta-gravamen.html',
    'minimo': f'{MANUAL}/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html',
    'cuotas': f'{MANUAL}/c15-calculo-impuesto-determinacion-cuotas-integras.html',
    'deducciones': f'{MANUAL}/c16-deducciones-generales-cuota.html',
    'cuota-diferencial': f'{MANUAL}/c18-cuota-liquida-resultante-autoliquidacion.html',
}


def scale_tax(scale, base):
    tax = 0.0
    base = max(0.0, base)
    for i, (frm, rate) in enumerate(scale):
        to = scale[i + 1][0] if i + 1 < len(scale) else float('inf')
        if base <= frm:
            break
        # Each bracket rounded to the cent, as the AEAT draft does (see frontend round.ts).
        tax += r2((min(base, to) - frm) * rate / 100)
    return r2(tax)


def work_reduction(rn):
    """Art. 20 LIRPF (Renta 2025), sobre íntegros menos gastos de las letras a) a e) del art. 19.2."""
    if rn <= 14852:
        return 7302.0
    if rn <= 17673.52:
        # The product is rounded before it is taken off, as in a real draft (box 0023 3.292,64).
        return r2(7302 - r2(1.75 * (rn - 14852)))
    if rn < 19747.5:
        return r2(2364.34 - r2(1.14 * (rn - 17673.52)))
    return 0.0


def low_pay(gross_work, other_income):
    """Deducción por obtención de rendimientos del trabajo (casilla 0414), Renta 2025."""
    if other_income > 6500 or gross_work <= 0 or gross_work >= 18276:
        return 0.0
    if gross_work <= 16576:
        return 340.0
    return r2(340 - 0.2 * (gross_work - 16576))


class Steps:
    def __init__(self):
        self.lines = []

    def h(self, text):
        self.lines.append(f'\n### {text}\n')

    def s(self, text):
        self.lines.append(f'- {text}')


def minimum_of(m, fam, steps, label, joint_partner=None):
    """Mínimo personal y familiar (arts. 56-61 LIRPF) con los importes `m`."""
    items = {}
    items['personal'] = m.get('personalOver65', m['personal']) if fam['age'] >= 65 else m['personal']
    age_extra = (m['over65'] if fam['age'] >= 65 else 0) + (m['over75'] if fam['age'] >= 75 else 0)
    if joint_partner:
        age_extra += (m['over65'] if joint_partner['age'] >= 65 else 0) + (m['over75'] if joint_partner['age'] >= 75 else 0)
    items['edad'] = age_extra
    share = 0.5 if fam.get('shared') else 1
    kids = sorted([c for c in fam.get('children', []) if c['age'] < 25 or c.get('disability', 0) >= 33], key=lambda c: -c['age'])
    desc = 0.0
    dis_kids = 0.0
    for i, c in enumerate(kids):
        base = m['descendants'][min(i, len(m['descendants']) - 1)] + (m['under3'] if c['age'] < 3 else 0)
        desc += base * share
        dis_kids += disability_min(c.get('disability', 0), c.get('assistance', False), m) * share
    items['descendientes'] = r2(desc)
    asc = sum(m['ascendants'] + (m['ascendantsOver75'] if a['age'] >= 75 else 0) for a in fam.get('ascendants', []))
    items['ascendientes'] = asc
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


def disability_min(level, assistance, m):
    """Art. 60 LIRPF: 3.000 (33-65 %) o 9.000 (65 % o más) y 3.000 más de gastos de asistencia con 65 % o más."""
    if level >= 65:
        return m['disability65'] + m['assistance']
    if level >= 33:
        return m['disability33'] + (m['assistance'] if assistance else 0)
    return 0


def renta(p, steps, joint=None):
    """
    Cálculo a mano del modelo 100 de una declaración. `joint`: None, o {'kind': 'couple'|'single', 'partner': {...}}.
    Devuelve las casillas.
    """
    c = CCAA[p['ccaa']]
    reg_min = dict(STATE_MIN)
    if c['min']:
        reg_min.update(c['min'])
    b = {}
    earners = [p] + ([joint['partner']] if joint and joint.get('partner') and joint['partner'].get('gross', 0) > 0 else [])
    steps.h('1. Rendimientos del trabajo (LIRPF arts. 17-20)')
    gross = sum(e.get('gross', 0) for e in earners)
    ss = sum(e.get('ss', 0) for e in earners)
    extra = sum(e.get('union', 0) + min(e.get('college', 0), 500) + min(e.get('legal', 0), 300) for e in earners)
    b['0003'] = r2(gross)
    b['0012'] = r2(gross)
    b['0013'] = r2(ss)
    prev = r2(gross - ss - extra)
    steps.s(f'Íntegros (0012) = {eur(gross)}' + (f' (de ellos {eur(p.get("nonSalary", 0))} de pensión o prestación)' if p.get('nonSalary') else ''))
    steps.s(f'Gastos art. 19.2 a) a e): Seguridad Social (0013) {eur(ss)}' + (f' + sindicato/colegio/defensa {eur(extra)}' if extra else ''))
    steps.s(f'Rendimiento neto previo (0017) = {eur(gross)} − {eur(ss + extra)} = **{eur(prev)}**')
    b['0017'] = prev
    # Otros gastos art. 19.2.f: 2.000 por perceptor; incremento por discapacidad solo de trabajadores activos.
    other = 0.0
    for e in earners:
        prev_e = r2(e.get('gross', 0) - e.get('ss', 0) - e.get('union', 0) - min(e.get('college', 0), 500) - min(e.get('legal', 0), 300))
        g = 2000.0
        if not e.get('retired'):
            g += 7750 if e.get('disability', 0) >= 65 else 3500 if e.get('disability', 0) >= 33 else 0
        if e.get('mobility'):
            g += 2000
        other += min(g, max(0.0, prev_e))
    b['0019'] = r2(other)
    steps.s(f'Otros gastos art. 19.2.f) (0019) = **{eur(other)}** (2.000 general' +
            (', + 2.000 por movilidad geográfica' if p.get('mobility') else '') +
            (', + 3.500 por discapacidad de trabajador activo' if (not p.get('retired') and 33 <= p.get('disability', 0) < 65) else '') +
            (', sin incremento por discapacidad: es pensionista' if p.get('retired') and p.get('disability', 0) >= 33 else '') + ')')
    b['0022'] = r2(max(0.0, prev - other))
    steps.s(f'Rendimiento neto (0022) = {eur(prev)} − {eur(other)} = **{eur(b["0022"])}**')

    # Capital inmobiliario e imputaciones.
    rental_net = 0.0
    if p.get('rental'):
        rt = p['rental']
        steps.h('2. Inmueble alquilado (LIRPF arts. 22-23)')
        capped = min(rt['interest'] + rt['repairs'], rt['income'])
        amort = r2(rt['construction'] * 0.03)
        net = r2(rt['income'] - capped - rt['other'] - amort)
        steps.s(f'Ingresos {eur(rt["income"])} − intereses y reparaciones {eur(capped)} (límite: los ingresos) − otros gastos '
                f'(IBI, comunidad, seguro) {eur(rt["other"])} − amortización 3 % de {eur(rt["construction"])} = {eur(amort)} → '
                f'rendimiento neto **{eur(net)}**')
        red = r2(net * rt['reduction'] / 100) if net > 0 else 0.0
        rental_net = r2(net - red)
        steps.s(f'Reducción del {rt["reduction"]} % (art. 23.2: contrato anterior al 26-05-2023) = {eur(red)} → rendimiento neto reducido **{eur(rental_net)}**')
        b['rentalNet'] = rental_net
    imputed = 0.0
    if p.get('unrented'):
        steps.h('3. Imputación de rentas inmobiliarias (LIRPF art. 85)')
        for u in p['unrented']:
            rate = 1.1 if u['revised'] else 2
            v = r2(u['value'] * rate / 100 * u['days'] / 365)
            imputed += v
            steps.s(f'Valor catastral {eur(u["value"])} × {str(rate).replace(".", ",")} % × {u["days"]}/365 días = **{eur(v)}** (0089)')
        imputed = r2(imputed)
        b['0155'] = imputed
        b['imputedIncome'] = imputed
    savings = r2(p.get('savings', 0) + (joint['partner'].get('savings', 0) if joint and joint.get('partner') else 0))
    other_income = max(0.0, rental_net) + imputed + savings

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
    steps.s(f'Rendimiento neto reducido (0025) = **{eur(b["0025"])}**')

    steps.h('5. Bases imponibles (LIRPF arts. 45-49)')
    big = r2(b['0025'] + rental_net + imputed)
    b['0435'] = big
    steps.s(f'Base imponible general (0435) = {eur(b["0025"])}' + (f' + {eur(rental_net)} (alquiler)' if rental_net else '') +
            (f' + {eur(imputed)} (imputación)' if imputed else '') + f' = **{eur(big)}**')
    b['0460'] = savings
    if savings:
        steps.s(f'Base imponible del ahorro (0460) = **{eur(savings)}** (detalle en el apartado del ahorro)')

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
        emp = min(e.get('planEmployer', 0), 8500)
        net_e = r2(max(0.0, e.get('gross', 0) - e.get('ss', 0) - 2000))
        allowed = min(own + emp, 10000, r2(net_e * 0.3))
        pension += allowed
        if e.get('planOwn') or e.get('planEmployer'):
            steps.s(f'Planes de pensiones: propias {eur(e.get("planOwn", 0))} a un plan individual (límite 1.500 → {eur(own)}) + contribución de la empresa '
                    f'{eur(e.get("planEmployer", 0))} (incremento de hasta 8.500 → {eur(emp)}); límite del 30 % de los rendimientos netos '
                    f'({eur(r2(net_e * 0.3))}) → **{eur(allowed)}** (art. 51 y 52 LIRPF)')
    pension = r2(min(pension, max(0.0, big - jg)))
    b['pensionReduction'] = pension
    b['jointReduction'] = r2(jg + js)
    blg = r2(max(0.0, big - jg - pension))
    bla = r2(savings - js)
    b['0500'] = blg
    b['0505'] = blg
    b['0510'] = bla
    steps.s(f'Base liquidable general (0500) = {eur(big)}' + (f' − {eur(jg)}' if jg else '') + (f' − {eur(pension)}' if pension else '') + f' = **{eur(blg)}**')
    steps.s(f'Base liquidable del ahorro (0510) = **{eur(bla)}**')

    steps.h('7. Mínimo personal y familiar (arts. 56-61)')
    fam = dict(age=p['age'], disability=p.get('disability', 0), assistance=p.get('assistance', False), children=p.get('children', []),
               ascendants=p.get('ascendants', []), shared=p.get('shared', False) and not (joint and joint['kind'] == 'couple'))
    partner = joint['partner'] if joint and joint.get('partner') else None
    smin, sitems = minimum_of(STATE_MIN, fam, steps, 'Estatal (0519)', partner)
    rmin, ritems = minimum_of(reg_min, fam, steps, f'Autonómico de {c["name"]} (0520)', partner)
    b['0511'] = r2(sitems['personal'] + sitems['edad'])
    b['0512'] = r2(ritems['personal'] + ritems['edad'])
    b['0517'] = sitems['discapacidad']
    b['0518'] = ritems['discapacidad']
    b['0519'] = smin
    b['0520'] = rmin

    steps.h('8. Cuotas íntegras (arts. 63-66 y 74-76)')
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
        if d.get('refundable'):
            refundable += d['amount']
        else:
            ded_s += d.get('state', 0)
            ded_r += d.get('regional', 0)
        steps.s(f'{d["label"]}: {d["how"]}')
    if joint and joint.get('partnerDeductions'):
        for d in joint['partnerDeductions']:
            refundable += d['amount']
    applied_s = min(b['0545'], ded_s)
    applied_r = min(b['0546'], ded_r)
    liq = r2(b['0545'] - applied_s + b['0546'] - applied_r)
    b['0570'] = r2(b['0545'] - applied_s)
    b['0571'] = r2(b['0546'] - applied_r)
    b['0587'] = liq
    b['stateDeductions'] = r2(applied_s)
    b['regionalDeductions'] = r2(applied_r)
    pay_work = sum(max(0.0, e.get('gross', 0) - e.get('nonSalary', 0)) for e in earners)
    all_work = sum(e.get('gross', 0) for e in earners)
    lp_candidates = {min(low_pay(pay_work, other_income), liq), min(low_pay(all_work, other_income), liq)}
    if len(lp_candidates) > 1:
        raise SystemExit(f'{p["slug"]}: la deducción 0414 depende de si cuentan las pensiones; elige otros datos')
    lp = min(lp_candidates.pop(), liq)
    b['0414'] = r2(lp)
    b['0595'] = r2(liq - lp)
    withheld = r2(sum(e.get('withheld', 0) for e in earners) + (joint['partner'].get('withheld', 0) if joint and joint.get('partner') and joint['partner'].get('gross', 0) == 0 else 0))
    b['0609'] = withheld
    b['0610'] = r2(b['0595'] - withheld)
    b['refundable'] = r2(refundable)
    b['0670'] = r2(b['0610'] - refundable)
    steps.s(f'Cuota líquida (0587) = {eur(b["0545"])} − {eur(applied_s)} + {eur(b["0546"])} − {eur(applied_r)} = {eur(liq)}')
    steps.s(f'Deducción por rendimientos del trabajo (0414) = {eur(lp)} (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; '
            f'otras rentas ≤ 6.500; límite: la cuota)')
    steps.s(f'Cuota resultante (0595) = **{eur(b["0595"])}**; retenciones (0609) = {eur(withheld)}; cuota diferencial (0610) = **{eur(b["0610"])}**')
    if refundable:
        steps.s(f'Deducciones que se cobran aunque no haya cuota (maternidad, familia numerosa…) = {eur(refundable)}')
    steps.s(f'Resultado (0670) = **{eur(b["0670"])}** ({"a devolver" if b["0670"] < 0 else "a ingresar"})')
    return b


# ─── Personas ─────────────────────────────────────────────────────────────────

def person(n, slug, ccaa, title, story, **kw):
    return dict(n=n, slug=f'{n:02d}-{slug}', ccaa=ccaa, title=title, story=story, **kw)


def home(n, ccaa):
    cities = {'madrid': ('28001', 'Madrid'), 'cataluna': ('08001', 'Barcelona'), 'andalucia': ('41001', 'Sevilla'),
              'comunitat-valenciana': ('46001', 'València'), 'castilla-y-leon': ('47001', 'Valladolid'), 'galicia': ('15001', 'A Coruña'),
              'canarias': ('35001', 'Las Palmas de Gran Canaria'), 'baleares': ('07001', 'Palma'), 'aragon': ('50001', 'Zaragoza'),
              'murcia': ('30001', 'Murcia'), 'navarra': ('31001', 'Pamplona'), 'pais-vasco': ('48001', 'Bilbao'), 'extranjero': ('00000', 'Lyon (Francia)')}
    cp, city = cities[ccaa]
    return f'Calle Ficticia {n}, {cp} {city} (dirección inventada)'


PEOPLE = [
    person(1, 'asalariado-soltero-madrid', 'madrid', 'Asalariado soltero, sin hijos',
           'Trabaja por cuenta ajena todo el año con un solo pagador. Vive de alquiler (contrato de 2023: sin deducción estatal). Caso base.',
           age=34, gross=28000, ss=1778, withheld=4200),
    person(2, 'pareja-un-sueldo-conjunta-andalucia', 'andalucia', 'Matrimonio con un solo sueldo y dos hijos: individual frente a conjunta',
           'Solo trabaja el primer declarante; el cónyuge no tiene rentas. Dos hijos de 6 y 9 años. La conjunta debería salir mejor.',
           age=45, gross=32000, ss=2032, withheld=4600, children=[dict(age=9), dict(age=6)], shared=True,
           joint=dict(kind='couple', partner=dict(age=43, gross=0, ss=0, withheld=0))),
    person(3, 'pareja-dos-sueldos-individual-cataluna', 'cataluna', 'Matrimonio con dos sueldos: dos declaraciones individuales',
           'Los dos trabajan; un hijo de 4 años que se reparten al 50 %. Se presentan dos individuales (la conjunta sale peor).',
           age=38, gross=30000, ss=1905, withheld=4800, children=[dict(age=4)], shared=True,
           spouse=dict(age=36, gross=24000, ss=1524, withheld=3300),
           joint=dict(kind='couple', partner=dict(age=36, gross=24000, ss=1524, withheld=3300))),
    person(4, 'familia-numerosa-general-viudo-castilla-y-leon', 'castilla-y-leon', 'Viudo con tres hijos: familia numerosa general',
           'Tres hijos de 10, 13 y 16 años que viven solo con él; título de familia numerosa general todo el año.',
           age=50, gross=40000, ss=2540, withheld=6800, children=[dict(age=16), dict(age=13), dict(age=10)],
           deductions=[dict(id='estado-familia-numerosa', units='1', refundable=True, amount=1200, label='Familia numerosa general (art. 81 bis)',
                            how='1.200 € (12 meses × 100); tope de cotizaciones 2.540 ≥ 1.200; se cobra aunque no haya cuota')]),
    person(5, 'familia-numerosa-especial-conjunta-galicia', 'galicia', 'Matrimonio con cinco hijos en conjunta: familia numerosa especial',
           'Cinco hijos (2, 5, 8, 11 y 14 años); solo trabaja el primer declarante. Declaración conjunta.',
           age=42, gross=45000, ss=2858, withheld=7500, children=[dict(age=14), dict(age=11), dict(age=8), dict(age=5), dict(age=2)], shared=True,
           deductions=[dict(id='estado-familia-numerosa-especial', units='1', refundable=True, amount=2400, label='Familia numerosa especial (art. 81 bis)',
                            how='2.400 € (el doble de la general); el tope de cotizaciones solo afecta a los primeros 1.200 €')],
           joint=dict(kind='couple', partner=dict(age=40, gross=0, ss=0, withheld=0)), only_joint=True),
    person(6, 'monoparental-comunitat-valenciana', 'comunitat-valenciana', 'Madre sola con un hijo: individual frente a conjunta monoparental',
           'Custodia exclusiva de un hijo de 7 años, sin convivir con el otro progenitor. La conjunta resta 2.150 €.',
           age=35, gross=22000, ss=1397, withheld=2500, children=[dict(age=7)],
           joint=dict(kind='single', partner=None)),
    person(7, 'hijo-menor-3-guarderia-murcia', 'murcia', 'Madre trabajadora con un hijo de 1 año y guardería',
           'Hijo nacido en 2024 que va a una guardería autorizada todo 2025 (paga 300 € al mes). Declaración individual; el mínimo del hijo se reparte con el padre.',
           age=32, gross=36000, ss=2286, withheld=6100, children=[dict(age=1)], shared=True,
           deductions=[dict(id='estado-maternidad', units='1', refundable=True, amount=1200, label='Maternidad (art. 81)',
                            how='100 € × 12 meses = 1.200 €'),
                       dict(id='estado-guarderia', choice_amount='1000', refundable=True, amount=1000, label='Incremento por guardería (art. 81.2)',
                            how='3.600 € pagados sin subvención; tope 1.000 € al año')]),
    person(8, 'jubilado-discapacidad-65-aragon', 'aragon', 'Jubilado de 72 años con discapacidad del 65 %',
           'Cobra una pensión de jubilación de 18.000 €; discapacidad reconocida del 65 % (mínimo de 9.000 + 3.000 de gastos de asistencia).',
           age=72, gross=18000, nonSalary=18000, ss=0, withheld=1700, disability=65, retired=True),
    person(9, 'pensionista-y-trabajo-canarias', 'canarias', 'Pensionista de 66 años que además trabaja a tiempo parcial',
           'Pensión de 11.000 € y un trabajo de 5.500 €: dos pagadores. Íntegros por debajo de 16.576 €: la deducción de la casilla 0414 sale igual cuenten o no las pensiones.',
           age=66, gross=16500, nonSalary=11000, ss=357.5, withheld=600),
    person(10, 'dos-pagadores-baleares', 'baleares', 'Joven con dos pagadores en el año',
           'Dos empleos seguidos (15.000 € y 8.000 €). El segundo pagador supera 1.500 €: está obligado a declarar.',
           age=29, gross=23000, ss=1495, withheld=1970, secondPayers=8000),
    person(11, 'paro-y-trabajo-andalucia', 'andalucia', 'Medio año en paro y medio año trabajando',
           'Prestación por desempleo de 7.200 € y un sueldo de 8.400 €. La prestación es rendimiento del trabajo.',
           age=41, gross=15600, nonSalary=7200, ss=872, withheld=250),
    person(12, 'alquiler-de-piso-propio-madrid', 'madrid', 'Asalariada que alquila un piso y tiene otro vacío',
           'Alquila un piso como vivienda (contrato de 2021: reducción del 60 %) y tiene otro piso vacío todo el año (valor catastral no revisado).',
           age=45, gross=38000, ss=2413, withheld=6500,
           rental=dict(income=10800, interest=1800, repairs=400, other=1250, construction=90000, reduction=60,
                       expenses={'intereses-financiacion': '1800', 'reparacion-conservacion': '400', 'tributos-tasas': '450', 'comunidad-servicios-personales': '600', 'seguros': '200'},
                       reductionId='contratos-anteriores-60'),
           unrented=[dict(value=60000, revised=False, days=365)]),
    person(13, 'hipoteca-anterior-2013-madrid', 'madrid', 'Hipoteca de la vivienda habitual comprada en 2010',
           'Paga 10.000 € al año de hipoteca (capital e intereses) de la vivienda que compró en 2010 y por la que ya dedujo: régimen transitorio, 15 % de hasta 9.040 €.',
           age=48, gross=42000, ss=2667, withheld=7600,
           deductions=[dict(id='estado-vivienda-habitual-transitorio', choice_amount='10000', state=678, regional=678,
                            label='Vivienda habitual, régimen transitorio (DT 18.ª LIRPF)',
                            how='base máxima 9.040 € × 7,5 % tramo estatal = 678 € + 9.040 × 7,5 % tramo autonómico (Madrid no tiene porcentaje propio) = 678 €')]),
    person(14, 'plan-pensiones-empresa-cataluna', 'cataluna', 'Aportaciones propias a un plan individual y de la empresa a un plan de empleo',
           'Aporta 2.000 € a un plan de pensiones individual y su empresa 1.500 € a un plan de empleo (incluidos en los 52.000 € íntegros, como retribución en especie).',
           age=52, gross=52000, ss=3302, withheld=10900, planOwn=2000, planEmployer=1500),
    person(15, 'donativos-castilla-y-leon', 'castilla-y-leon', 'Donativo de 500 € a una ONG de la Ley 49/2002',
           'Dona 500 € a una fundación acogida a la Ley 49/2002 (primer año, sin recurrencia).',
           age=39, gross=30000, ss=1905, withheld=4300,
           deductions=[dict(id='estado-donativos-ley-49-2002', choice_amount='300', state=150, regional=150,
                            label='Donativos Ley 49/2002 (art. 68.3 LIRPF y art. 19 Ley 49/2002)',
                            how='250 × 80 % + 250 × 40 % = 300 €; mitad en la cuota estatal y mitad en la autonómica; límite del 10 % de la base liquidable')]),
    person(16, 'intereses-dividendos-comunitat-valenciana', 'comunitat-valenciana', 'Asalariado con intereses y dividendos',
           'Intereses de una cuenta de 700 € y dividendos de 1.300 €, con retención del 19 %.',
           age=31, gross=26000, ss=1651, withheld=3980, savings=2000,
           savings_steps=['Intereses 700,00 + dividendos 1.300,00 = rendimientos del capital mobiliario **2.000,00** (base del ahorro)',
                          'Retenciones del capital: 133,00 + 247,00 = 380,00 (se suman a las del trabajo, 3.600,00 → 3.980,00)']),
    person(17, 'venta-acciones-fondos-720-aragon', 'aragon', 'Venta de acciones (FIFO), reembolso de un fondo con pérdida y cuenta en el extranjero',
           'Vende 150 de 200 acciones compradas en dos lotes; reembolsa un fondo con pérdidas; tiene 62.000 € en un bróker extranjero (modelo 720 informativo).',
           age=47, gross=45000, ss=2858, withheld=8257, savings=1770,
           detail=dict(capital=dict(interest=300), assets=[
               dict(name='Acciones Ficticias SA', kind='listed', buys=[dict(date='2019-03-01', units=100, cost=2010), dict(date='2021-05-04', units=100, cost=3010)],
                    sells=[dict(date='2025-06-10', units=150, proceeds=5985)]),
               dict(name='Fondo Ficticio FI', kind='fund', buys=[dict(date='2020-01-15', units=50, cost=9000)], sells=[dict(date='2025-09-01', units=50, proceeds=8000)])],
               figures=[('0422', 'Suma de ganancias patrimoniales del ahorro (acciones por FIFO)', 2470), ('0423', 'Suma de pérdidas patrimoniales del ahorro (fondo)', 1000),
                        ('0424', 'Saldo neto positivo de ganancias y pérdidas del ahorro', 1470), ('0429', 'Saldo neto positivo del capital mobiliario', 300)]),
           savings_steps=['Acciones (FIFO, art. 37.2 LIRPF): vende 150 a 40 € = 6.000 − 15 de gastos = 5.985,00. Coste: 100 del lote de 2019 (2.010,00 con gastos) + 50 del lote de 2021 (3.010 × 50/100 = 1.505,00) = 3.515,00 → ganancia **2.470,00**',
                          'Fondo: reembolso 8.000,00 − coste 9.000,00 → pérdida **−1.000,00**',
                          'Integración (art. 49): ganancias y pérdidas entre sí: 2.470 − 1.000 = 1.470,00; intereses 300,00 → base del ahorro **1.770,00**',
                          'Retención de los intereses 57,00 sumada a las del trabajo (8.200,00 → 8.257,00)',
                          'Modelo 720: saldo de valores en el extranjero de 62.000 € a 31-12 > 50.000 € → obligación de informar (sin cuota)']),
    person(18, 'criptomonedas-fifo-compensacion-murcia', 'murcia', 'Criptomonedas: ganancia FIFO en una, pérdida en otra y compensación del 25 %',
           'Vende 0,6 BTC de dos compras (FIFO) con ganancia y todo su ETH con pérdida; la pérdida neta se compensa con el 25 % de los intereses.',
           age=36, gross=33000, ss=2096, withheld=5490, savings=750,
           detail=dict(capital=dict(interest=1000), assets=[
               dict(name='BTC', kind='crypto', buys=[dict(date='2023-01-01', units=0.5, cost=10000), dict(date='2024-01-01', units=0.5, cost=20000)],
                    sells=[dict(date='2025-04-01', units=0.6, proceeds=17950)]),
               dict(name='ETH', kind='crypto', buys=[dict(date='2024-02-01', units=3, cost=9000)], sells=[dict(date='2025-05-01', units=3, proceeds=4000)])],
               figures=[('0422', 'Suma de ganancias patrimoniales del ahorro (BTC por FIFO)', 3950), ('0423', 'Suma de pérdidas patrimoniales del ahorro (ETH)', 5000),
                        ('0425', 'Saldo neto negativo de ganancias y pérdidas del ahorro', 1050), ('0429', 'Saldo neto positivo del capital mobiliario', 1000),
                        ('0446', 'Pérdidas del año compensadas con el 25 % del capital mobiliario', 250),
                        ('carry.gains', 'Pérdidas pendientes para los 4 años siguientes', 800)]),
           savings_steps=['BTC (FIFO): compras 0,5 a 20.000 € (10.000) y 0,5 a 40.000 € (20.000); vende 0,6 a 30.000 € = 18.000 − 50 de comisión = 17.950,00. Coste 10.000 + 0,1 × 40.000 = 14.000,00 → ganancia **3.950,00**',
                          'ETH: compra 3 a 3.000 € (9.000) y vende las 3 a 1.000 € (3.000) − 50 de comisión = 2.950,00 → pérdida **−6.050,00** (redondeo de ejemplo)'.replace('−6.050,00', '−5.000,00').replace('3 a 1.000 € (3.000) − 50 de comisión = 2.950,00', '3 por 4.000,00 (comisión incluida)'),
                          'Saldo de ganancias y pérdidas: 3.950 − 5.000 = −1.050,00 (art. 49.1.b)',
                          'Se compensa con los rendimientos del capital (intereses 1.000,00) hasta el 25 %: 250,00 → intereses 750,00; quedan −800,00 para los 4 años siguientes',
                          'Base del ahorro **750,00**; retención de los intereses 190,00 (5.300,00 + 190,00 = 5.490,00)']),
    person(19, 'venta-vivienda-habitual-mayor-65-baleares', 'baleares', 'Jubilada de 68 años que vende su vivienda habitual',
           'Vende su vivienda habitual con una ganancia de 80.000 €: exenta por ser mayor de 65 años (art. 33.4.b). Tiene 400 € de intereses.',
           age=68, gross=22000, nonSalary=22000, ss=0, withheld=2976, retired=True, savings=400,
           detail=dict(capital=dict(interest=400), properties=[dict(name='Vivienda habitual', proceeds=180000, cost=100000, amortization=0, exemption='homeOver65')],
                       figures=[('exempt', 'Ganancia exenta de la vivienda habitual por mayor de 65 años (art. 33.4.b)', 80000),
                                ('0424', 'Saldo neto positivo de ganancias y pérdidas del ahorro', 0), ('0429', 'Saldo neto positivo del capital mobiliario', 400)]),
           savings_steps=['Ganancia de la vivienda habitual 80.000,00: exenta (art. 33.4.b, mayor de 65); se declara pero no se integra',
                          'Intereses 400,00 (retención 76,00; 2.900,00 + 76,00 = 2.976,00) → base del ahorro **400,00**']),
    person(20, 'herencia-venta-segunda-vivienda-galicia', 'galicia', 'Hereda un piso en 2020 y lo vende en 2025',
           'Piso heredado (valor en el Impuesto sobre Sucesiones 100.000 € + 1.500 € de impuesto y gastos) que vende el 30 de junio por 130.000 € con 4.000 € de gastos. Hasta la venta estuvo vacío (181 días).',
           age=44, gross=33000, ss=2096, withheld=5200, savings=24500,
           detail=dict(properties=[dict(name='Piso heredado', proceeds=126000, cost=101500, amortization=0, exemption='none')],
                       figures=[('0422', 'Suma de ganancias patrimoniales del ahorro (piso heredado)', 24500), ('0424', 'Saldo neto positivo de ganancias y pérdidas del ahorro', 24500)]),
           unrented=[dict(value=50000, revised=False, days=181)],
           savings_steps=['Valor de adquisición (art. 36: el del Impuesto sobre Sucesiones + gastos y tributos) = 100.000 + 1.500 = 101.500,00',
                          'Valor de transmisión = 130.000 − 4.000 = 126.000,00 → ganancia **24.500,00** (base del ahorro)',
                          'La herencia no tributa en el IRPF (sí en Sucesiones); la plusvalía del fallecido no se grava ("plusvalía del muerto")']),
    person(21, 'movilidad-sindicato-discapacidad-canarias', 'canarias', 'Trabajadora con discapacidad del 33 % que se muda por un nuevo empleo',
           'Acepta en 2025 un empleo en otro municipio y traslada su residencia (movilidad geográfica); paga 180 € de cuota sindical; discapacidad del 33 %.',
           age=37, gross=27000, ss=1715, withheld=3100, union=180, mobility=True, disability=33),
    person(28, 'inquilino-alquiler-anterior-2015-castilla-y-leon', 'castilla-y-leon', 'Inquilino con contrato de 2014: deducción estatal transitoria',
           'Paga 7.200 € de alquiler de su vivienda habitual con contrato de 2014 y base imponible de 20.476 €: la base máxima de 9.040 € baja por tramo.',
           age=29, gross=24000, ss=1524, withheld=2900,
           deductions=[dict(id='estado-alquiler-transitorio', choice_amount='7200', state=None, regional=0,
                            label='Alquiler de vivienda habitual, régimen transitorio (DT 15.ª LIRPF, art. 68.7 en su redacción de 2014)', how='')]),
]


AUTONOMOS = [
    dict(n=22, slug='22-autonomo-ed-empleado-local-madrid', ccaa='madrid', title='Autónomo en estimación directa simplificada con empleado, gestor y local alquilado',
         story='Taller (actividad empresarial, sin retenciones en sus ventas) en un local alquilado. Un empleado (1.800 €/mes, retención del 10 %, 566,67 €/mes de Seguridad Social a cargo de la empresa), gestoría con retención del 15 %, suministros. Modelos 130, 303, 111, 115, 180, 190, 390, 347 y RETA en 2026.',
         models=['130', '303', '111', '115', '180', '190', '390', '347', 'RETA'],
         income=[21000, 21000, 18000, 24000], incomeRate=21, clients=[('Cliente Ficticio A, S.L.', 'B00000011', 0.6), ('Cliente Ficticio B, S.L.', 'B00000022', 0.4)],
         monthly=[('Arrendador Ficticio (alquiler del local)', 'rent', 1500, 21, 19, '00000501W'),
                  ('Gestoría Ficticia (asesoría)', 'management', 100, 21, 15, '00000502A'),
                  ('Suministros Ficticios (luz e internet)', 'supplies', 200, 21, 0, 'A00000033')],
         staff=dict(monthly=1800, rate=10, employerSS=566.67),
         reta=None),
    dict(n=23, slug='23-autonomo-intracomunitario-exportador-cataluna', ccaa='cataluna', title='Autónomo que vende en España, a la UE y fuera de la UE',
         story='Comercio de productos: ventas en España al 21 %, entregas intracomunitarias a un cliente francés (exentas, casilla 59 y modelo 349) y exportaciones (casilla 60). Compra mercancía en España y a un proveedor alemán (adquisición intracomunitaria, casillas 10-11 y 36-37).',
         models=['130', '303', '349', '390', 'RETA'],
         income=[9000, 12000, 9000, 12000], incomeRate=21, eu=[8100, 6000, 7200, 9000], exports=[5100, 5100, 3900, 6000],
         purchases=9000, euPurchases=3000, reta=None),
    dict(n=24, slug='24-autonomo-tarifa-plana-comunitat-valenciana', ccaa='comunitat-valenciana', title='Profesional que empezó en julio de 2025 con la tarifa plana',
         story='Programadora (actividad profesional) dada de alta el 1-7-2025: cuota reducida de 80 € hasta junio de 2026; retención del 7 % a sus clientes empresa (inicio de actividad). En 2025 ganó 8.500 € netos: minoración de 100 € por trimestre en el 130.',
         models=['130', '303', '390', 'RETA'],
         income=[6000, 7200, 6600, 8400], incomeRate=21, withheldShare=0.5, withheldRate=7,
         monthly=[('Coworking Ficticio', 'other', 150, 21, 0, 'B00000044'), ('Software Ficticio (suscripción)', 'software', 50, 21, 0, 'B00000055')],
         priorYearNet=8500, reta=dict(flat=[True, True, False, False])),
]

OUT_OF_SCOPE = [
    dict(n=25, slug='25-autonomo-modulos-andalucia', ccaa='andalucia', title='Taxista en estimación objetiva (módulos)',
         story='Taxista en módulos (epígrafe 721.2) con IVA en régimen simplificado: modelos 131 y 303 simplificado, y la Renta con rendimiento por módulos. Finanverso no calcula módulos todavía.',
         models=['131', '303 (simplificado)', '390', '100'], reason='El motor no calcula la estimación objetiva (módulos) ni el IVA simplificado: los signos y módulos de la Orden de módulos de cada año no están en la app.'),
    dict(n=26, slug='26-no-residente-fuera-de-alcance', ccaa='extranjero', title='Residente en Francia con un piso alquilado en España',
         story='No residente fiscal en España: tributa por el Impuesto sobre la Renta de no Residentes (modelo 210), no por el IRPF. Fuera del alcance de Finanverso.',
         models=['210'], reason='No residentes: IRNR (modelo 210), otro impuesto; Finanverso solo cubre el IRPF de residentes.'),
    dict(n=27, slug='27-foral-bizkaia-fuera-de-alcance', ccaa='pais-vasco', title='Asalariada residente en Bizkaia (régimen foral)',
         story='Reside en Bizkaia: presenta la Renta ante la Hacienda Foral de Bizkaia con su normativa propia. Fuera del alcance del motor (solo régimen común).',
         models=['100 foral (Bizkaia)'], reason='Territorios forales (País Vasco y Navarra): normativa y escalas propias, no las del régimen común.'),
]


# ─── Renta: persona → form, cálculo y esperado ────────────────────────────────

def savings_detail_of(d):
    """The savings in detail as the engine takes them (rentaGains.ts SavingsDetail)."""
    cap = dict(interest=0, dividends=0, assets=0, insurance=0, expenses=0)
    cap.update(d.get('capital', {}))
    return dict(capital=cap, assets=d.get('assets', []), properties=d.get('properties', []), otherGains=[], generalGains=[],
                pending=dict(gains=d.get('pendingGains', []), capital=[], general=[]))


def form_of(p, spouse=None):
    q = spouse or p
    f = {
        'ccaaId': p['ccaa'], 'age': str(q['age']), 'disability': q.get('disability', 0),
        'children': [dict(age=str(c['age']), disability=c.get('disability', 0)) for c in p.get('children', [])],
        'ascendants': [], 'shared': bool(p.get('shared')),
        'gross': str(q['gross']), 'socialSecurity': str(q['ss']), 'withheld': str(q['withheld']),
        'nonSalary': str(q.get('nonSalary', '')) if q.get('nonSalary') else '', 'retired': bool(q.get('retired')),
        'workExpenses': {'cuotas-sindicales': str(q['union'])} if q.get('union') else {},
        'mobility': bool(q.get('mobility')),
        'pension': str(q.get('planOwn', '')) if q.get('planOwn') else '',
        'pensionEmployer': str(q.get('planEmployer', '')) if q.get('planEmployer') else '',
        'savings': str(q.get('savings', '')) if q.get('savings') else '',
        'choices': {},
    }
    if q.get('secondPayers'):
        f['secondPayers'] = str(q['secondPayers'])
    if spouse is None and p.get('detail'):
        f['savingsDetail'] = savings_detail_of(p['detail'])
        f['savings'] = ''
    if spouse is None:
        if p.get('rental'):
            rt = p['rental']
            f.update(rentalOn=True, rentalIncome=str(rt['income']), rentalExpenses=rt['expenses'], construction=str(rt['construction']), rentalReduction=rt['reductionId'])
        if p.get('unrented'):
            # The planner asks the days of box 0085 (empty: the whole year).
            f['unrented'] = [dict(value=str(u['value']), revised=u['revised'], days='' if u['days'] == 365 else str(u['days'])) for u in p['unrented']]
        for d in p.get('deductions', []):
            f['choices'][d['id']] = dict(on=True, amount=d.get('choice_amount', ''), units=d.get('units', ''))
        j = p.get('joint')
        if j:
            f['joint'] = j['kind']
            if j.get('partner'):
                pt = j['partner']
                f['partner'] = dict(gross=str(pt['gross']) if pt['gross'] else '', socialSecurity=str(pt['ss']) if pt['gross'] else '0',
                                    withheld=str(pt['withheld']) if pt['withheld'] else '', nonSalary='', age=str(pt['age']), disability=0,
                                    retired=False, savings='', pension='')
    return f


BOX_LABELS = {
    '0003': 'Retribuciones dinerarias', '0012': 'Total ingresos íntegros computables del trabajo', '0013': 'Cotizaciones a la Seguridad Social',
    '0017': 'Rendimiento neto previo', '0019': 'Otros gastos deducibles', '0022': 'Rendimiento neto del trabajo',
    '0023': 'Reducción por obtención de rendimientos del trabajo', '0025': 'Rendimiento neto reducido del trabajo',
    '0155': 'Suma de imputaciones de rentas inmobiliarias', '0435': 'Base imponible general', '0460': 'Base imponible del ahorro',
    '0500': 'Base liquidable general', '0505': 'Base liquidable general sometida a gravamen', '0510': 'Base liquidable del ahorro',
    '0511': 'Mínimo contribuyente, importe estatal', '0512': 'Mínimo contribuyente, importe autonómico',
    '0517': 'Mínimo por discapacidad, importe estatal', '0518': 'Mínimo por discapacidad, importe autonómico',
    '0519': 'Mínimo personal y familiar, gravamen estatal', '0520': 'Mínimo personal y familiar, gravamen autonómico',
    '0545': 'Cuota íntegra estatal', '0546': 'Cuota íntegra autonómica', '0570': 'Cuota líquida estatal', '0571': 'Cuota líquida autonómica',
    '0587': 'Cuota líquida incrementada total', '0414': 'Deducción por obtención de rendimientos del trabajo',
    '0595': 'Cuota resultante de la autoliquidación', '0609': 'Total pagos a cuenta', '0610': 'Cuota diferencial', '0670': 'Resultado de la declaración',
}
CAMPO_LABELS = {
    'rentalNet': 'Rendimiento neto reducido del inmueble alquilado', 'imputedIncome': 'Imputación de rentas inmobiliarias',
    'pensionReduction': 'Reducción por aportaciones a planes de pensiones', 'jointReduction': 'Reducción por tributación conjunta',
    'refundable': 'Deducciones abonables (maternidad, familia numerosa…)', 'stateDeductions': 'Deducciones aplicadas en la cuota estatal (incluye la 0414)',
    'regionalDeductions': 'Deducciones aplicadas en la cuota autonómica',
}
# Casillas que el motor de la app devuelve (rentaCompare.ourBoxes y campos de RentaResult).
ENGINE_BOXES = {'0003', '0012', '0013', '0017', '0019', '0022', '0023', '0025', '0155', '0435', '0460', '0500', '0510', '0511', '0512', '0517', '0518',
                '0519', '0520', '0545', '0546', '0570', '0571', '0587', '0414', '0595', '0609', '0610', '0670'}


def figures_of(boxes, decl, ref):
    out = []
    for k in ['0003', '0012', '0013', '0017', '0019', '0022', '0023', '0025', '0155', '0435', '0460', '0500', '0510', '0511', '0512', '0517', '0518', '0519', '0520',
              '0545', '0546', '0570', '0571', '0587', '0414', '0595', '0609', '0610', '0670']:
        if k not in boxes:
            continue
        if k in ('0155',) and not boxes[k]:
            continue
        out.append(dict(modelo='100', declaracion=decl, casilla=k, concepto=BOX_LABELS[k], importe=boxes[k], origen='calculo-a-mano', ref=ref,
                        campo=f'boxes.{k}' if k in ENGINE_BOXES else None))
    for k in ['rentalNet', 'imputedIncome', 'pensionReduction', 'jointReduction', 'refundable', 'stateDeductions', 'regionalDeductions']:
        if k in boxes and (boxes[k] or k in ('refundable',) and boxes[k]):
            out.append(dict(modelo='100', declaracion=decl, casilla=None, concepto=CAMPO_LABELS[k], importe=boxes[k], origen='calculo-a-mano', ref=ref,
                            campo=f'result.{k}'))
    return out


def rent_deduction(p, big):
    """Deducción estatal transitoria por alquiler: base máxima 9.040 que baja 1,4125 por euro desde 17.707,20."""
    d = p['deductions'][0]
    paid = float(d['choice_amount'])
    if big <= 17707.2:
        base_max = 9040.0
    elif big < 24107.2:
        base_max = r2(9040 - 1.4125 * (big - 17707.2))
    else:
        base_max = 0.0
    # Manual práctico 2025, c16 (renta-c16-03): 10,05 % of the base, then "el 50 por 100 del total
    # de la deducción" in each box (the regional half rounded, the State's the rest).
    total = r2(min(paid, base_max) * 10.05 / 100)
    regional = r2(total / 2)
    d['state'] = r2(total - regional)
    d['regional'] = regional
    d['how'] = (f'base imponible {eur(big)}: base máxima 9.040 − 1,4125 × ({eur(big)} − 17.707,20) = {eur(base_max)}; '
                f'10,05 % × min({eur(paid)}, {eur(base_max)}) = {eur(total)}, el 50 % en cada cuota: {eur(d["state"])} en la estatal (0562) '
                f'y {eur(regional)} en la autonómica (0563). Se rebaja la BASE máxima, no el importe de la deducción (caso oficial renta-c16-03)')


def build_renta(p):
    steps = Steps()
    decls = []
    figures = []
    if p['n'] == 28:
        tmp = Steps()
        dummy = dict(p, deductions=[])
        rent_deduction(p, renta(dummy, tmp)['0435'])
    if not p.get('only_joint'):
        steps.lines.append('\n## Declaración individual del primer declarante\n')
        if p.get('savings_steps'):
            steps.h('0. Rentas del ahorro')
            for line in p['savings_steps']:
                steps.s(line)
        b = renta(p, steps)
        decls.append(dict(id='individual', form=form_of(p)))
        figures += figures_of(b, 'individual', 'calculo.md#declaración-individual-del-primer-declarante')
    if p.get('spouse'):
        steps.lines.append('\n## Declaración individual del cónyuge\n')
        sp = dict(p['spouse'], ccaa=p['ccaa'], children=p.get('children', []), shared=True, slug=p['slug'])
        b2 = renta(sp, steps)
        decls.append(dict(id='conyuge', form=form_of(p, spouse=dict(p['spouse']))))
        figures += figures_of(b2, 'conyuge', 'calculo.md#declaración-individual-del-cónyuge')
    if p.get('joint'):
        steps.lines.append('\n## Declaración conjunta\n')
        j = p['joint']
        pj = dict(p)
        bj = renta(pj, steps, joint=j)
        if p.get('only_joint'):
            decls.append(dict(id='individual', form=form_of(p)))
        figures += figures_of(bj, 'conjunta', 'calculo.md#declaración-conjunta')
        if p.get('spouse'):
            ind = r2(b['0670'] + b2['0670'])
            steps.s(f'Comparación: dos individuales {eur(b["0670"])} + {eur(b2["0670"])} = {eur(ind)} frente a conjunta {eur(bj["0670"])} → '
                    f'{"mejor la individual" if ind < bj["0670"] else "mejor la conjunta"}')
    return decls, figures, steps


# ─── Autónomos 2026 ───────────────────────────────────────────────────────────

def q_dates(q):
    return [f'2026-{3 * (q - 1) + m:02d}-15' for m in (1, 2, 3)]


def build_autonomo(a):
    steps = Steps()
    figs = []
    movements = []
    issued = []
    received = []
    bank = []
    quarters_extra = []
    rows303 = []
    cum_income = 0.0
    cum_exp = 0.0
    paid130 = 0.0
    cum_withheld = 0.0
    annual = dict(income=0.0, vat=0.0, ded=0.0, ded_base=0.0)
    m111 = []
    m115 = []
    inv_no = 0
    reta_month = []
    zero = dict(people=0, paid=0, withheld=0)
    withholding_inputs = [dict(staff=dict(zero), pros=dict(zero), rent=dict(zero), income=0) for _ in range(4)]
    for qi in range(4):
        q = qi + 1
        dates = q_dates(q)
        base = a['income'][qi]
        vat = r2(base * a['incomeRate'] / 100)
        # Ventas: una factura al mes por cliente.
        withheld_q = 0.0
        if a.get('clients'):
            for d in dates:
                for name, cif, share in a['clients']:
                    inv_no += 1
                    bse = r2(base * share / 3)
                    issued.append(dict(date=d, number=f'2026-{inv_no:03d}', client=name, nif=cif, base=bse, rate=a['incomeRate'], withheldRate=0))
        elif a.get('withheldShare'):
            for d in dates:
                inv_no += 1
                bse = r2(base * a['withheldShare'] / 3)
                issued.append(dict(date=d, number=f'2026-{inv_no:03d}', client='Empresa Cliente Ficticia, S.L.', nif='B00000066', base=bse, rate=21, withheldRate=a['withheldRate']))
                inv_no += 1
                issued.append(dict(date=d, number=f'2026-{inv_no:03d}', client='Particular Ficticio', nif='00000601G', base=r2(base * (1 - a['withheldShare']) / 3), rate=21, withheldRate=0))
            withheld_q = r2(base * a['withheldShare'] * a['withheldRate'] / 100)
        else:
            for d in dates:
                inv_no += 1
                issued.append(dict(date=d, number=f'2026-{inv_no:03d}', client='Cliente Nacional Ficticio, S.L.', nif='B00000077', base=r2(base / 3), rate=21, withheldRate=0))
        if a.get('eu'):
            for d in dates:
                inv_no += 1
                issued.append(dict(date=d, number=f'2026-{inv_no:03d}', client='Client Fictif SARL (Francia)', nif='FR00000000001', base=r2(a['eu'][qi] / 3), rate=0, withheldRate=0, kind='eu'))
                inv_no += 1
                issued.append(dict(date=d, number=f'2026-{inv_no:03d}', client='Fictional Customer Ltd (fuera de la UE)', nif='', base=r2(a['exports'][qi] / 3), rate=0, withheldRate=0, kind='export'))
        # Gastos
        exp_base = 0.0
        exp_vat = 0.0
        rent_q = dict(base=0.0, ret=0.0)
        pro_q = dict(base=0.0, ret=0.0)
        for d in dates:
            for name, kind, mb, rate, ret, nid in a.get('monthly', []):
                received.append(dict(date=d, number=f'F-{d[5:7]}-{kind[:3].upper()}', supplier=name, nif=nid, base=mb, rate=rate, retention=r2(mb * ret / 100), kind=kind))
                exp_base += mb
                exp_vat += r2(mb * rate / 100)
                if kind == 'rent':
                    rent_q['base'] += mb
                    rent_q['ret'] += r2(mb * ret / 100)
                elif ret:
                    pro_q['base'] += mb
                    pro_q['ret'] += r2(mb * ret / 100)
            if a.get('purchases'):
                received.append(dict(date=d, number=f'C-{d[5:7]}', supplier='Mayorista Ficticio, S.A.', nif='A00000088', base=r2(a['purchases'] / 3), rate=21, retention=0, kind='material'))
                received.append(dict(date=d, number=f'DE-{d[5:7]}', supplier='Fiktiver Lieferant GmbH (Alemania)', nif='DE000000001', base=r2(a['euPurchases'] / 3), rate=0, retention=0, kind='material', eu=True))
        if a.get('purchases'):
            exp_base += a['purchases'] + a['euPurchases']
            exp_vat += r2(a['purchases'] * 0.21)
        staff = a.get('staff')
        staff_q = None
        if staff:
            staff_q = dict(paid=staff['monthly'] * 3, ret=r2(staff['monthly'] * 3 * staff['rate'] / 100), ss=r2(staff['employerSS'] * 3))
            exp_base += staff_q['paid'] + staff_q['ss']
        # RETA del trimestre
        income_year = sum(a['income']) + sum(a.get('eu', [0])) + sum(a.get('exports', [0]))
        year_exp = 0.0
        for name, kind, mb, rate, ret, nid in a.get('monthly', []):
            year_exp += mb * 12
        if a.get('purchases'):
            year_exp += (a['purchases'] + a['euPurchases']) * 4
        if staff:
            year_exp += staff['monthly'] * 12 + staff['employerSS'] * 12
        monthly_net = r2((income_year - year_exp) / 12)
        computable = r2(monthly_net - r2(monthly_net * 0.07))
        bracket = next(bk for bk in RETA_BRACKETS if bk[2] is None or (computable < bk[2] if bk[3] else computable <= bk[2]))
        reta_fee = r2(bracket[4] * 0.315)
        flat = a.get('reta') and a['reta']['flat'][qi]
        month_fee = 80.0 if flat else reta_fee
        reta_q = r2(month_fee * 3)
        reta_month.append(month_fee)
        quarters_extra.append(dict(withheld=withheld_q, socialSecurity=reta_q, vatNotDeductible=0))
        # 303
        q_income_total = base + (a['eu'][qi] if a.get('eu') else 0) + (a['exports'][qi] if a.get('exports') else 0)
        withholding_inputs[qi]['income'] = q_income_total
        ded_vat = r2(exp_vat)
        ded_base = r2(exp_base - (staff_q['paid'] + staff_q['ss'] if staff_q else 0) - (a['euPurchases'] if a.get('euPurchases') else 0))
        res46 = r2(vat + (r2(a['euPurchases'] * 0.21) if a.get('euPurchases') else 0) - ded_vat - (r2(a['euPurchases'] * 0.21) if a.get('euPurchases') else 0))
        f303 = [('07', 'Base imponible al 21 %', base), ('09', 'Cuota al 21 %', vat)]
        if a.get('euPurchases'):
            f303 += [('10', 'Adquisiciones intracomunitarias: base', a['euPurchases']), ('11', 'Adquisiciones intracomunitarias: cuota', r2(a['euPurchases'] * 0.21))]
        f303 += [('27', 'Total cuota devengada', r2(vat + (r2(a['euPurchases'] * 0.21) if a.get('euPurchases') else 0))),
                 ('28', 'Base de cuotas soportadas en operaciones interiores corrientes', ded_base), ('29', 'Cuotas soportadas en operaciones interiores corrientes', ded_vat)]
        if a.get('euPurchases'):
            f303 += [('36', 'Adquisiciones intracomunitarias de bienes corrientes: base', a['euPurchases']), ('37', 'Adquisiciones intracomunitarias de bienes corrientes: cuota', r2(a['euPurchases'] * 0.21))]
        f303 += [('45', 'Total a deducir', r2(ded_vat + (r2(a['euPurchases'] * 0.21) if a.get('euPurchases') else 0))), ('46', 'Resultado régimen general (27 − 45)', res46)]
        if a.get('eu'):
            f303 += [('59', 'Entregas intracomunitarias de bienes', a['eu'][qi]), ('60', 'Exportaciones y operaciones asimiladas', a['exports'][qi])]
        f303 += [('64', 'Suma de resultados', res46), ('66', 'Atribuible a la Administración del Estado (100 %)', res46),
                 ('69', 'Resultado de la autoliquidación', res46), ('71', 'Resultado de la liquidación', res46)]
        rows303.append(f303)
        annual['income'] += base
        annual['vat'] += vat
        annual['ded'] += ded_vat
        annual['ded_base'] += ded_base
        steps.h(f'{q}.º trimestre de 2026')
        steps.s(f'303: cuota devengada 21 % de {eur(base)} = {eur(vat)}; IVA soportado deducible {eur(ded_vat)} (base {eur(ded_base)}'
                + ('; las nóminas y la Seguridad Social de la empresa no llevan IVA y no entran en la casilla 28' if staff else '')
                + ('; la adquisición intracomunitaria se autorrepercute (10-11) y se deduce (36-37): efecto cero' if a.get('euPurchases') else '')
                + f') → resultado (71) **{eur(res46)}**')
        if a.get('eu'):
            steps.s(f'Entregas intracomunitarias exentas (59) {eur(a["eu"][qi])}; exportaciones (60) {eur(a["exports"][qi])}: sin IVA, pero se declaran en su casilla (no en la 150, que es para el tipo 0 %)')
        # 130 (acumulado)
        cum_income += q_income_total
        q_exp = exp_base + reta_q
        cum_exp += q_exp
        prenet = cum_income - cum_exp
        hard = r2(min(max(0.0, prenet) * 0.05, 2000))
        exp02 = r2(cum_exp + hard)
        net03 = r2(cum_income - exp02)
        b04 = r2(max(0.0, net03) * 0.2)
        cum_withheld = r2(cum_withheld + withheld_q)
        b07 = r2(b04 - paid130 - cum_withheld)
        minor = 0.0
        pn = a.get('priorYearNet')
        if pn is not None:
            minor = 100 if pn <= 9000 else 75 if pn <= 10000 else 50 if pn <= 11000 else 25 if pn <= 12000 else 0
        b12 = max(0.0, b07)
        b14 = r2(b12 - minor)
        f130 = [('01', 'Ingresos computables acumulados', r2(cum_income)), ('02', 'Gastos fiscalmente deducibles acumulados (con el 5 % de difícil justificación)', exp02),
                ('03', 'Rendimiento neto (01 − 02)', net03), ('04', '20 % de la casilla 03', b04), ('05', 'Pagos fraccionados de trimestres anteriores', r2(paid130)),
                ('06', 'Retenciones soportadas acumuladas', cum_withheld), ('07', 'Pago fraccionado previo (04 − 05 − 06)', b07), ('12', 'Suma (07 + 11), mínimo 0', r2(b12)),
                ('13', 'Minoración por rentas bajas del año anterior (art. 110.3.c RIRPF)', minor), ('14', 'Diferencia (12 − 13)', b14),
                ('15', 'Resultados negativos de trimestres anteriores', 0.0), ('17', 'Total (14 − 15 − 16)', b14), ('19', 'Resultado de la autoliquidación', b14)]
        steps.s(f'130 (acumulado): ingresos {eur(cum_income)} − gastos {eur(cum_exp)} (incluye la cuota de autónomo {eur(reta_q)} del trimestre) − 5 % de difícil justificación '
                f'{eur(hard)} = {eur(net03)}; 20 % = {eur(b04)} − pagos anteriores {eur(paid130)} − retenciones {eur(cum_withheld)}'
                + (f' − minoración {eur(minor)}' if minor else '') + f' → **{eur(b14)}**')
        paid130 = r2(paid130 + max(0.0, b07))
        for box, label, amount in f303:
            figs.append(dict(modelo='303', periodo=f'{q}T', casilla=box, concepto=label, importe=r2(amount), origen='calculo-a-mano', ref=f'calculo.md#{q}º-trimestre-de-2026',
                             campo=f'm303.{box}'))
        for box, label, amount in f130:
            figs.append(dict(modelo='130', periodo=f'{q}T', casilla=box, concepto=label, importe=r2(amount), origen='calculo-a-mano', ref=f'calculo.md#{q}º-trimestre-de-2026',
                             campo=f'm130.{box}'))
        if staff_q or pro_q['base']:
            ppl = 1 if staff_q else 0
            r111 = [('01', 'Perceptores, trabajo dinerario', ppl), ('02', 'Percepciones, trabajo dinerario', staff_q['paid'] if staff_q else 0),
                    ('03', 'Retenciones, trabajo dinerario', staff_q['ret'] if staff_q else 0), ('07', 'Perceptores, actividades económicas', 1 if pro_q['base'] else 0),
                    ('08', 'Percepciones, actividades económicas', r2(pro_q['base'])), ('09', 'Retenciones, actividades económicas', r2(pro_q['ret'])),
                    ('28', 'Suma de retenciones', r2((staff_q['ret'] if staff_q else 0) + pro_q['ret'])), ('30', 'Resultado a ingresar', r2((staff_q['ret'] if staff_q else 0) + pro_q['ret']))]
            m111.append(r111)
            withholding_inputs[qi]['staff'] = dict(people=ppl, paid=staff_q['paid'] if staff_q else 0, withheld=staff_q['ret'] if staff_q else 0)
            withholding_inputs[qi]['pros'] = dict(people=1 if pro_q['base'] else 0, paid=r2(pro_q['base']), withheld=r2(pro_q['ret']))
            steps.s(f'111: nómina {eur(staff_q["paid"] if staff_q else 0)} con retención {eur(staff_q["ret"] if staff_q else 0)} + gestoría {eur(pro_q["base"])} al 15 % = {eur(pro_q["ret"])} → **{eur(r111[-1][2])}**')
            for box, label, amount in r111:
                figs.append(dict(modelo='111', periodo=f'{q}T', casilla=box, concepto=label, importe=r2(amount), origen='calculo-a-mano', ref=f'calculo.md#{q}º-trimestre-de-2026', campo=f'm111.{box}'))
        if rent_q['base']:
            r115 = [('01', 'Nº de perceptores', 1), ('02', 'Base de las retenciones', r2(rent_q['base'])), ('03', 'Retenciones', r2(rent_q['ret'])), ('05', 'Resultado a ingresar', r2(rent_q['ret']))]
            m115.append(r115)
            withholding_inputs[qi]['rent'] = dict(people=1, paid=r2(rent_q['base']), withheld=r2(rent_q['ret']))
            steps.s(f'115: alquiler del local {eur(rent_q["base"])} × 19 % = **{eur(rent_q["ret"])}**')
            for box, label, amount in r115:
                figs.append(dict(modelo='115', periodo=f'{q}T', casilla=box, concepto=label, importe=r2(amount), origen='calculo-a-mano', ref=f'calculo.md#{q}º-trimestre-de-2026', campo=f'm115.{box}'))
        # Movimientos para el motor (IVA incluido, en céntimos)
        for e in issued:
            if e['date'] in dates:
                if e.get('kind') in ('eu', 'export'):
                    # Sin IVA español: el importe es la base y la operación dice su casilla (59 o 60 y el 349).
                    m = dict(date=e['date'], type='INCOME', amountCents=round(e['base'] * 100), vatRate=0, op='intraEU' if e['kind'] == 'eu' else 'export')
                    if e['kind'] == 'eu':
                        m['intra'] = dict(key='E', vatId=e['nif'], name=e['client'])
                    movements.append(m)
                else:
                    movements.append(dict(date=e['date'], type='INCOME', amountCents=round(e['base'] * (100 + e['rate'])), vatRate=e['rate']))
        for e in received:
            if e['date'] in dates:
                if e.get('eu'):
                    # Adquisición intracomunitaria: se autorrepercute al 21 % (10-11) y se deduce (36-37).
                    movements.append(dict(date=e['date'], type='EXPENSE', amountCents=round(e['base'] * 100), vatRate=21, op='intraGoods', intra=dict(key='A', vatId=e['nif'], name=e['supplier'])))
                else:
                    movements.append(dict(date=e['date'], type='EXPENSE', amountCents=round(e['base'] * (100 + e['rate'])), vatRate=e['rate']))
        if staff_q:
            for d in dates:
                movements.append(dict(date=d, type='EXPENSE', amountCents=round(staff['monthly'] * 100), vatRate=0))
                movements.append(dict(date=d, type='EXPENSE', amountCents=round(staff['employerSS'] * 100), vatRate=0))
        # Extracto bancario (cobros y pagos del trimestre)
        for e in issued:
            if e['date'] in dates:
                bank.append(dict(date=e['date'][:8] + '25', concept=f'Cobro factura {e["number"]} {e["client"]}', amount=r2(e['base'] * (100 + e['rate']) / 100 - e['base'] * e['withheldRate'] / 100)))
        for e in received:
            if e['date'] in dates:
                bank.append(dict(date=e['date'][:8] + '20', concept=f'Pago {e["supplier"]}', amount=-r2(e['base'] * (100 + e['rate']) / 100 - e['retention'])))
        for d in dates:
            bank.append(dict(date=d[:8] + '28', concept='Cuota de autónomos (RETA)', amount=-month_fee))
            if staff:
                bank.append(dict(date=d[:8] + '30', concept='Nómina del empleado', amount=-r2(staff['monthly'] - staff['monthly'] * staff['rate'] / 100)))
        if flat:
            figs.append(dict(modelo='RETA', periodo=f'{q}T', casilla=None, concepto='Cuota mensual reducida (tarifa plana)', importe=None, valorProbable=80.0, origen='pendiente',
                             motivo='Los 80 €/mes de la cuota reducida están confirmados para 2023-2025 (Seguridad Social); para 2026 no se ha encontrado la cifra en fuente oficial (art. 38 ter Ley 20/2007 remite a los Presupuestos, prorrogados).',
                             campo='reta.flatFee', retaInput=dict(monthlyNet=monthly_net, person='individual', flatRate=True)))
        else:
            figs.append(dict(modelo='RETA', periodo=f'{q}T', casilla=None, concepto='Cuota mensual de autónomo (base mínima del tramo)', importe=month_fee, origen='calculo-a-mano',
                             ref=f'calculo.md#{q}º-trimestre-de-2026', campo='reta.feeMin', retaInput=dict(monthlyNet=monthly_net, person='individual', flatRate=False)))
        if qi == 0:
            figs.append(dict(modelo='RETA', periodo='2026', casilla=None, concepto=f'Tramo de cotización (rendimiento computable {eur(computable)} €/mes)', importe=None,
                             valor=bracket[0], origen='calculo-a-mano', ref='calculo.md#reta', campo='reta.bracket',
                             retaInput=dict(monthlyNet=monthly_net, person='individual', flatRate=False)))
    steps.h('RETA')
    steps.s(f'Rendimiento neto anual previsto (sin la propia cuota) {eur(r2(monthly_net * 12))} → {eur(monthly_net)} al mes; menos el 7 % de gastos genéricos = '
            f'{eur(computable)} → tramo **{bracket[0]}**, base mínima {eur(bracket[4])} × 31,5 % = **{eur(reta_fee)} €/mes** (Orden PJC/297/2026)')
    if a.get('reta'):
        steps.s('Tarifa plana: 80 €/mes durante los 12 primeros meses (julio de 2025 a junio de 2026); no se prorroga porque el rendimiento previsto supera el SMI (17.094 €)')
    # Anuales
    steps.h('Resúmenes anuales')
    figs.append(dict(modelo='390', periodo='2026', casilla=None, concepto='Total bases imponibles al 21 % del año', importe=r2(annual['income']), origen='calculo-a-mano', ref='calculo.md#resúmenes-anuales', campo=None))
    figs.append(dict(modelo='390', periodo='2026', casilla=None, concepto='Total cuotas devengadas al 21 % del año', importe=r2(annual['vat']), origen='calculo-a-mano', ref='calculo.md#resúmenes-anuales', campo=None))
    figs.append(dict(modelo='390', periodo='2026', casilla=None, concepto='Total cuotas soportadas deducibles en operaciones interiores', importe=r2(annual['ded']), origen='calculo-a-mano', ref='calculo.md#resúmenes-anuales', campo=None))
    steps.s(f'390: suma de los cuatro 303 → bases 21 % {eur(annual["income"])}, cuotas {eur(annual["vat"])}, IVA deducible {eur(annual["ded"])}. Las casillas del 390 no se han confirmado (pendiente de la ayuda técnica del modelo): se dan los totales.')
    if a.get('staff'):
        figs.append(dict(modelo='190', periodo='2026', casilla=None, concepto='Perceptor clave A (trabajo): percepciones', importe=r2(a['staff']['monthly'] * 12), origen='calculo-a-mano', ref='calculo.md#resúmenes-anuales', campo=None))
        figs.append(dict(modelo='190', periodo='2026', casilla=None, concepto='Perceptor clave A (trabajo): retenciones', importe=r2(a['staff']['monthly'] * 12 * a['staff']['rate'] / 100), origen='calculo-a-mano', ref='calculo.md#resúmenes-anuales', campo=None))
        figs.append(dict(modelo='190', periodo='2026', casilla=None, concepto='Perceptor clave G (profesional): percepciones', importe=1200.0, origen='calculo-a-mano', ref='calculo.md#resúmenes-anuales', campo=None))
        figs.append(dict(modelo='190', periodo='2026', casilla=None, concepto='Perceptor clave G (profesional): retenciones', importe=180.0, origen='calculo-a-mano', ref='calculo.md#resúmenes-anuales', campo=None))
        figs.append(dict(modelo='180', periodo='2026', casilla=None, concepto='Arrendador del local: base anual', importe=18000.0, origen='calculo-a-mano', ref='calculo.md#resúmenes-anuales', campo=None))
        figs.append(dict(modelo='180', periodo='2026', casilla=None, concepto='Arrendador del local: retenciones anuales', importe=3420.0, origen='calculo-a-mano', ref='calculo.md#resúmenes-anuales', campo=None))
        steps.s('190: el empleado (clave A) 21.600,00 / 2.160,00 y la gestoría (clave G) 1.200,00 / 180,00. Las retenciones del alquiler NO van al 190 sino al 180: 18.000,00 / 3.420,00.')
        for name, cif, share in a['clients']:
            tot = r2(sum(a['income']) * share * 1.21)
            figs.append(dict(modelo='347', periodo='2026', casilla=None, concepto=f'{name} ({cif}): importe anual con IVA (clave B, ventas)', importe=tot, origen='calculo-a-mano', ref='calculo.md#resúmenes-anuales', campo=None))
        figs.append(dict(modelo='347', periodo='2026', casilla=None, concepto='Arrendador Ficticio (00000501W): alquiler del local con IVA (clave A, marca de arrendamiento)', importe=21780.0, origen='calculo-a-mano', ref='calculo.md#resúmenes-anuales', campo=None))
        steps.s('347: los dos clientes superan 3.005,06 € (IVA incluido). También el arrendador del local (18.000 + 21 % = 21.780,00, clave A con la marca de arrendamiento: los alquileres de local con retención van al 347 además del 180, según las preguntas frecuentes del 347 de la AEAT, caso 347-03). Quedan fuera la gestoría (1.452,00) y el proveedor de suministros (2.904,00): no llegan al umbral.')
    if a.get('eu'):
        for qi in range(4):
            figs.append(dict(modelo='349', periodo=f'{qi + 1}T', casilla=None, concepto='Clave E, entregas intracomunitarias (FR00000000001)', importe=float(a['eu'][qi]), origen='calculo-a-mano', ref='calculo.md#resúmenes-anuales', campo=None))
            figs.append(dict(modelo='349', periodo=f'{qi + 1}T', casilla=None, concepto='Clave A, adquisiciones intracomunitarias (DE000000001)', importe=float(a['euPurchases']), origen='calculo-a-mano', ref='calculo.md#resúmenes-anuales', campo=None))
        steps.s('349 trimestral: clave E con las entregas al cliente francés y clave A con las compras al proveedor alemán (los dos con NIF-IVA válido en VIES, inventados aquí).')
    # Renta del autónomo: fuera del motor.
    figs.append(dict(modelo='100', declaracion='individual', casilla=None, concepto='Rendimiento neto de actividades económicas en la Renta 2026', importe=None, origen='pendiente',
                     motivo='El motor de la Renta de Finanverso no calcula todavía los rendimientos de actividades económicas (estimación directa) en el modelo 100.', campo=None))
    inputs = dict(quarters=quarters_extra, hardToJustify=True, priorYearNet=a.get('priorYearNet'), exempt130=False, vatToOffset=0)
    return figs, steps, dict(movements=movements, inputs=inputs, issued=issued, received=received, bank=bank, m303=rows303, m111=m111, m115=m115, retaMonthly=reta_month, withholdings=withholding_inputs)


# Tramos RETA 2026 (Orden PJC/297/2026): id, desde, hasta, hasta-exclusivo, base mínima.
RETA_BRACKETS = [('R1', 0, 670, False, 653.59), ('R2', 670, 900, False, 718.95), ('R3', 900, 1166.7, True, 849.67), ('G1', 1166.7, 1300, False, 950.98),
                 ('G2', 1300, 1500, False, 960.78), ('G3', 1500, 1700, False, 960.78), ('G4', 1700, 1850, False, 1143.79), ('G5', 1850, 2030, False, 1209.15),
                 ('G6', 2030, 2330, False, 1274.51), ('G7', 2330, 2760, False, 1356.21), ('G8', 2760, 3190, False, 1437.91), ('G9', 3190, 3620, False, 1519.61),
                 ('G10', 3620, 4050, False, 1601.31), ('G11', 4050, 6000, False, 1732.03), ('G12', 6000, None, False, 1928.1)]


def borrador_of(p, figures):
    """Las líneas del borrador sintético: «Descripción  importe  casilla», con la estructura del borrador real de la AEAT."""
    ind = {f['casilla']: f['importe'] for f in figures if f['declaracion'] == 'individual' and f['casilla']}
    if not ind:
        return None
    c = CCAA[p['ccaa']]
    birth = f'15/06/{2025 - p["age"]}'
    sections = [
        dict(title='Primer declarante', lines=[
            dict(label='NIF', text=nif(p['n']), box='0001'), dict(label='Apellidos y nombre', text=f'FICTICIA {p["n"]:02d} PERSONA', box='0002'),
            dict(label='Fecha de nacimiento', text=birth, box='0010'),
            dict(label='Grado de discapacidad', text={0: '(0) Sin discapacidad', 33: '(1) Igual o superior al 33 % e inferior al 65 %', 65: '(3) Igual o superior al 65 %'}[p.get('disability', 0)], box='0011')]),
        dict(title='Comunidad o Ciudad Autónoma de residencia en el ejercicio 2025', lines=[dict(label='Comunidad Autónoma de residencia habitual en 2025', text=c['name'].upper(), box='0070')]),
    ]
    if p.get('children'):
        sections.append(dict(title='Descendientes', lines=[dict(label=f'Fecha de nacimiento del descendiente {i + 1}', text=f'01/03/{2025 - ch["age"]}', box='0077') for i, ch in enumerate(p['children'])]))
    work = [dict(label='Retribuciones dinerarias', amount=ind['0003'], box='0003'),
            dict(label='Total ingresos íntegros computables [(03)+(07)+(08)+(24)+(09)+(10)-(11)-(58)]', amount=ind['0012'], box='0012'),
            dict(label='Cotizac. Seguridad Social, Mutualidad Funcionarios, detracciones derechos pasivos y Coleg. Huérfanos', amount=ind['0013'], box='0013'),
            dict(label='Rendimiento neto previo [(12)-(13)-(14)-(15)-(16)]', amount=ind['0017'], box='0017'),
            dict(label='Otros gastos deducibles', amount=ind['0019'], box='0019'), dict(label='Rendimiento neto [(18)-(19)-(20)-(21)]', amount=ind['0022'], box='0022'),
            dict(label='Reducción por obtención de rendimientos del trabajo', amount=ind['0023'], box='0023'),
            dict(label='Rendimiento neto reducido [(22)-(23)]', amount=ind['0025'], box='0025')]
    sections.append(dict(title='Rendimientos del trabajo', lines=work))
    if p.get('unrented'):
        u = p['unrented'][0]
        sections.append(dict(title='Bienes inmuebles', lines=[
            dict(label='A disposición de sus titulares.', text='X', box='0073'), dict(label='Valor catastral del inmueble', amount=float(u['value']), box='0083'),
            dict(label='Valor catastral revisado (Si/No)', text='SI' if u['revised'] else 'NO', box='0084'),
            dict(label='Nº de días a disposición del contribuyente.', text=str(u['days']), box='0085'),
            dict(label='Renta inmobiliaria imputada.', amount=ind.get('0155', 0), box='0089'),
            dict(label='Suma de imputaciones de rentas inmobiliarias', amount=ind.get('0155', 0), box='0155')]))
    bases = [dict(label='Base imponible general [(420)-(431)+(432)-(433)-(434)]', amount=ind['0435'], box='0435')]
    if ind.get('0460'):
        bases.append(dict(label='Base imponible del ahorro', amount=ind['0460'], box='0460'))
    bases += [dict(label='Base liquidable general [(435)-(491)-(492)-(493)-(494)-(495)-(496)-(497)]', amount=ind['0500'], box='0500'),
              dict(label='Base liquidable del ahorro [(460)-(506)-(507)]', amount=ind['0510'], box='0510')]
    sections.append(dict(title='Base imponible general y base imponible del ahorro', lines=bases))
    mins = [dict(label='Mínimo contribuyente. Importe estatal', amount=ind['0511'], box='0511'), dict(label='Mínimo contribuyente. Importe autonómico', amount=ind['0512'], box='0512')]
    if ind.get('0517'):
        mins += [dict(label='Mínimo por discapacidad. Importe estatal', amount=ind['0517'], box='0517'), dict(label='Mínimo por discapacidad. Importe autonómico', amount=ind['0518'], box='0518')]
    mins += [dict(label='Mínimo personal y familiar para calcular el gravamen estatal', amount=ind['0519'], box='0519'),
             dict(label='Mínimo personal y familiar para calcular el gravamen autonómico', amount=ind['0520'], box='0520')]
    sections.append(dict(title='Adecuación del impuesto a las circunstancias personales y familiares', lines=mins))
    sections.append(dict(title='Cálculo del impuesto y resultado de la declaración', lines=[
        dict(label='Cuota íntegra estatal [(532)+(540)]', amount=ind['0545'], box='0545'), dict(label='Cuota íntegra autonómica [(533)+(541)]', amount=ind['0546'], box='0546'),
        dict(label='Cuota líquida estatal', amount=ind['0570'], box='0570'), dict(label='Cuota líquida autonómica', amount=ind['0571'], box='0571'),
        dict(label='Cuota líquida incrementada total [(585)+(586)]', amount=ind['0587'], box='0587'),
        dict(label='Deducción por obtención de rendimientos del trabajo', amount=ind['0414'], box='0414'),
        dict(label='Cuota resultante de la autoliquidación [(587)-(588)-(414)-(589)-(590)-(591)]', amount=ind['0595'], box='0595'),
        dict(label='Por rendimientos del trabajo', amount=ind['0609'], box='0596'),
        dict(label='Total pagos a cuenta [suma de (592) + (593)+ (594) + (596) a (606)]', amount=ind['0609'], box='0609'),
        dict(label='Cuota diferencial [(595)-(609)]', amount=ind['0610'], box='0610'),
        dict(label='Resultado de la declaración', amount=ind['0670'], box='0670')]))
    return dict(exercise=2025, sections=sections)


def main():
    os.makedirs(OUT, exist_ok=True)
    index = []
    for p in PEOPLE:
        decls, figures, steps = build_renta(p)
        slug = p['slug']
        d = os.path.join(OUT, slug)
        os.makedirs(d, exist_ok=True)
        joint = p.get('joint')
        persona = dict(slug=slug, nombre=f'Persona Ficticia {p["n"]:02d}', nif=nif(p['n']), domicilio=home(p['n'], p['ccaa']), ejercicio=2025,
                       comunidad=p['ccaa'], titulo=p['title'], descripcion=p['story'], modelos=['100'], alcance='dentro',
                       datosFicticios=True,
                       renta=dict(declaraciones=decls, conjunta=dict(kind=joint['kind'], livesWithOtherParent=False) if joint else None),
                       documentos=dict(borrador=borrador_of(p, figures)))
        if p.get('spouse'):
            persona['conyuge'] = dict(nombre=f'Persona Ficticia {p["n"]:02d}-B', nif=nif(100 + p['n']))
        esperado = dict(slug=slug, ejercicio=2025, comprobado=CHECKED, cifras=add_pending(p, figures))
        write(d, persona, esperado, p, steps)
        index.append(dict(slug=slug, titulo=p['title'], comunidad=p['ccaa'], modelos=['100']))
    for a in AUTONOMOS:
        figs, steps, data = build_autonomo(a)
        d = os.path.join(OUT, a['slug'])
        os.makedirs(d, exist_ok=True)
        persona = dict(slug=a['slug'], nombre=f'Persona Ficticia {a["n"]:02d}', nif=nif(a['n']), domicilio=home(a['n'], a['ccaa']), ejercicio=2026,
                       comunidad=a['ccaa'], titulo=a['title'], descripcion=a['story'], modelos=a['models'], alcance='parcial', datosFicticios=True,
                       autonomo=dict(ejercicio=2026, movimientos=data['movements'], inputs=data['inputs'], retenciones=data['withholdings']),
                       documentos=dict(emitidas=data['issued'], recibidas=data['received'], banco=data['bank'], m303=data['m303'], m111=data['m111'], m115=data['m115']))
        esperado = dict(slug=a['slug'], ejercicio=2026, comprobado=CHECKED, cifras=figs)
        write(d, persona, esperado, a, steps)
        index.append(dict(slug=a['slug'], titulo=a['title'], comunidad=a['ccaa'], modelos=a['models']))
    for o in OUT_OF_SCOPE:
        d = os.path.join(OUT, o['slug'])
        os.makedirs(d, exist_ok=True)
        persona = dict(slug=o['slug'], nombre=f'Persona Ficticia {o["n"]:02d}', nif=nif(o['n']), domicilio=home(o['n'], o['ccaa']), ejercicio=2025,
                       comunidad=o['ccaa'], titulo=o['title'], descripcion=o['story'], modelos=o['models'], alcance='fuera', motivoFueraDeAlcance=o['reason'],
                       datosFicticios=True, documentos={})
        esperado = dict(slug=o['slug'], ejercicio=2025, comprobado=CHECKED, cifras=[
            dict(modelo=o['models'][0], casilla=None, concepto='Resultado del modelo', importe=None, origen='pendiente', motivo=o['reason'], campo=None)])
        steps = Steps()
        steps.s(f'Fuera de alcance: {o["reason"]}')
        write(d, persona, esperado, o, steps)
        index.append(dict(slug=o['slug'], titulo=o['title'], comunidad=o['ccaa'], modelos=o['models']))
    index.sort(key=lambda x: x['slug'])
    with open(os.path.join(OUT, 'indice.json'), 'w', encoding='utf-8') as fh:
        json.dump(index, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    print(f'{len(index)} personas en {OUT}')


PENDING_100 = {
    4: [('Deducción autonómica de Castilla y León por familia numerosa', 'Sus importes dependen del número de hijos y de la renta: no se ha confirmado la regla 2025 con un caso oficial.')],
    7: [('Deducción autonómica de Murcia por gastos de guardería', 'Límites de renta y requisitos 2025 no confirmados con un caso oficial.')],
    17: [('Modelo 720 (bienes en el extranjero)', 'Declaración informativa, sin cuota: fuera del motor.')],
    21: [('Deducción de Canarias por discapacidad', 'Requisitos 2025 no confirmados con un caso oficial.')],
}


def add_pending(p, figures):
    out = list(figures)
    if p.get('secondPayers'):
        # Art. 96.3: more than 15,876 € with more than 1,500 € from the second and following payers.
        must = p['gross'] > 22000 or (p['gross'] > 15876 and p['secondPayers'] > 1500)
        out.append(dict(modelo='100', declaracion='individual', casilla=None, concepto='Obligación de declarar (1 sí, 0 no; art. 96 LIRPF)',
                        importe=1.0 if must else 0.0, origen='calculo-a-mano', ref='calculo.md#declaración-individual-del-primer-declarante', campo='obligation.required'))
    # The savings in detail (FIFO, exemptions, art. 49): the hand figures of the savings steps above.
    for key, concept, amount in p.get('detail', {}).get('figures', []):
        out.append(dict(modelo='100', declaracion='individual', casilla=None if '.' in key or not key[0].isdigit() else key, concepto=concept,
                        importe=float(amount), origen='calculo-a-mano', ref='calculo.md#0-rentas-del-ahorro', campo=f'savings.{key}'))
    for concept, why in PENDING_100.get(p['n'], []):
        out.append(dict(modelo='100', declaracion='individual', casilla=None, concepto=concept, importe=None, origen='pendiente', motivo=why, campo=None))
    return out


def write(d, persona, esperado, p, steps):
    with open(os.path.join(d, 'persona.json'), 'w', encoding='utf-8') as fh:
        json.dump(persona, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    with open(os.path.join(d, 'esperado.json'), 'w', encoding='utf-8') as fh:
        json.dump(esperado, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    head = [f'# {persona["nombre"]}: {p["title"]}', '', f'> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el {CHECKED}.', '',
            p['story'], '', f'NIF ficticio {persona["nif"]} · {persona["domicilio"]} · comunidad: {persona["comunidad"]}', '',
            'Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: '
            f'[trabajo]({SRC["trabajo"]}), [inmuebles]({SRC["inmuebles"]}), [imputación]({SRC["imputacion"]}), [ganancias]({SRC["ganancias"]}), '
            f'[integración]({SRC["integracion"]}), [reducciones]({SRC["reducciones"]}), [mínimo]({SRC["minimo"]}), [cuotas]({SRC["cuotas"]}), '
            f'[deducciones]({SRC["deducciones"]}), [cuota diferencial]({SRC["cuota-diferencial"]}). Las escalas y mínimos autonómicos se toman de '
            '`frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 '
            '(sede de la AEAT) y Orden PJC/297/2026 (RETA).', '']
    with open(os.path.join(d, 'calculo.md'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(head + steps.lines) + '\n')


if __name__ == '__main__':
    main()
