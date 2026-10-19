#!/usr/bin/env python3
"""Banco de casos, quinta tanda (p5): los riesgos P0 del informe del gestor real.

- Alquileres inmueble a inmueble (P0-2): titularidad, días, límites por inmueble, amortización del
  mayor entre coste y valor catastral sin suelo, reducción del art. 23.2 según el contrato, pérdidas e
  imputación de los días a disposición.
- Deducciones autonómicas con requisitos y donativos por lo donado (P0-4): Comunitat Valenciana,
  Castilla y León y Andalucía, con un requisito no cumplido.

Todos los datos son INVENTADOS. El cálculo a mano usa las fórmulas de construir_personas2.renta2
(LIRPF y Manual práctico de Renta 2025), con los alquileres de properties_calc. Comprobado el 19-10-2026.

    python3 -I frontend/scripts/casos/construir_personas5.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import construir_casos as cc  # noqa: E402
import construir_personas2 as p2  # noqa: E402
from construir_casos import CHECKED, nif  # noqa: E402

OUT = cc.OUT
PREFIX = 'p5'
CITIES = {'castilla-y-leon': ('47001', 'Valladolid'), 'andalucia': ('29001', 'Málaga'), 'cataluna': ('08001', 'Barcelona'),
          'comunitat-valenciana': ('46001', 'València'), 'madrid': ('28001', 'Madrid')}
C04 = f'{cc.MANUAL}/c04-rendimientos-capital-inmobiliario'
SOURCES = (f' Alquileres: [amortización]({C04}/gastos-deducibles/cantidades-destinadas-amortizacion.html), '
           f'[reducciones del art. 23.2]({C04}/reducciones-rendimiento-neto/arrendamiento-inmuebles-destinados-vivienda.html) y '
           'Orden HAC/277/2026 (BOE-A-2026-7041), modelo 100 págs. 6-7.')


def home(n, ccaa):
    cp, city = CITIES[ccaa]
    return f'Calle Ficticia {n}, {cp} {city} (dirección inventada)'


def P(n, slug, ccaa, title, story, tests, **kw):
    return dict(n=n, slug=f'{PREFIX}-{n:03d}-{slug}', ccaa=ccaa, title=title, story=story, tests=tests, **kw)


RENTA = [
    P(120, 'dos-pisos-uno-con-perdidas-valladolid', 'castilla-y-leon', 'Dos pisos alquilados: uno con beneficio y otro, a medias con su hermana, con pérdidas',
      'Asalariado en Valladolid. Piso 1 (suyo al 100 %) alquilado todo el año como vivienda con contrato de 2021: reducción del 60 %. '
      'Piso 2, heredado a medias con su hermana (50 %), alquilado 181 días con contrato de 2025 y el resto del año vacío a su disposición: '
      'da pérdidas, sin reducción, y imputa renta por 184 días. La pérdida de un piso no le quita la reducción al otro.',
      ['alquileres inmueble a inmueble', 'cotitularidad 50 %', 'gastos anuales por días', 'amortización del mayor entre coste y valor catastral',
       'reducción 60 % de contrato anterior al 26-5-2023', 'rendimiento negativo sin reducción', 'imputación por días a disposición'],
      age=46, **p2.worker(34000, 5200),
      properties=[
          dict(label='Piso Delicias', income=8400, expenses={'intereses-financiacion': 900, 'reparacion-conservacion': 350, 'tributos-tasas': 380,
                                                              'comunidad-servicios-personales': 600, 'seguros': 190},
               cost=95000, cadastral=60000, building=36000, use='home', contract='before'),
          dict(label='Piso heredado', share=50, rentedDays=181, income=3600,
               expenses={'intereses-financiacion': 0, 'reparacion-conservacion': 2400, 'tributos-tasas': 520, 'comunidad-servicios-personales': 720,
                         'seguros': 240},
               cost=70000, cadastral=80000, building=48000, use='home', contract='after'),
      ]),
    P(121, 'apartamento-temporada-y-garaje-malaga', 'andalucia', 'Apartamento de temporada y una plaza de garaje alquilada a una empresa vecina',
      'Pensionista de 67 años en Málaga. Alquila un apartamento por temporadas (sin reducción: no es la vivienda permanente del inquilino) '
      '120 días; el resto del año lo usa ella (a su disposición). La plaza de garaje la alquila todo el año a un particular. '
      'Le quedan 600 € de reparaciones de 2024 del apartamento sin deducir.',
      ['alquiler de temporada sin reducción', 'local/garaje sin reducción', 'pendiente de años anteriores (0103-0104)', 'imputación por días a disposición',
       'valor catastral revisado (1,1 %)'],
      age=67, retired=True, nonSalary=19000, **p2.worker(19000, 900),
      properties=[
          dict(label='Apartamento playa', rentedDays=120, income=6000, pending=600,
               expenses={'reparacion-conservacion': 300, 'tributos-tasas': 450, 'comunidad-servicios-personales': 480, 'seguros': 200,
                         'suministros': 350},
               cost=0, cadastral=70000, building=42000, revised=True, use='season'),
          dict(label='Plaza de garaje', income=900, expenses={'tributos-tasas': 60, 'comunidad-servicios-personales': 120},
               cost=12000, use='business'),
      ]),
    P(122, 'zona-tensionada-90-y-joven-70-barcelona', 'cataluna', 'Dos viviendas en zona tensionada: bajada de renta (90 %) y primer alquiler a un joven (70 %)',
      'Asalariada en Barcelona (municipio declarado zona de mercado residencial tensionado). Piso A: nuevo contrato de 2025 con la renta inicial '
      'un 8 % más baja que la del contrato anterior: reducción del 90 %. Piso B: lo alquila por primera vez en 2025 a un inquilino de 27 años: '
      '70 %. En el piso B, intereses y reparaciones pasan de lo cobrado: el exceso va a los 4 años siguientes.',
      ['reducción 90 % (zona tensionada, bajada > 5 %)', 'reducción 70 % (primer alquiler a joven de 18 a 35)', 'límite de intereses y reparaciones por inmueble',
       'exceso para 4 años (0108)'],
      age=52, **p2.worker(48000, 9800),
      properties=[
          dict(label='Piso A', income=13200, expenses={'intereses-financiacion': 1500, 'reparacion-conservacion': 400, 'tributos-tasas': 620,
                                                       'comunidad-servicios-personales': 900, 'seguros': 260},
               cost=210000, cadastral=110000, building=55000, use='home', contract='after', tensioned=True, rentDrop=True),
          dict(label='Piso B', rentedDays=214, otherDays=151, income=6300,
               expenses={'intereses-financiacion': 5400, 'reparacion-conservacion': 3900, 'tributos-tasas': 540, 'comunidad-servicios-personales': 840,
                         'seguros': 220},
               cost=180000, cadastral=90000, building=50000, use='home', contract='after', tensioned=True, young=True),
      ]),
]


DONATIONS_ID = 'estado-donativos-ley-49-2002'


def donation(given, recurrent=0.0):
    """Ley 49/2002 art. 19: 80 % de los primeros 250 € (primero lo no recurrente), 40 % del resto y 45 % lo recurrente."""
    once = given - recurrent
    first = min(once, 250)
    first_rec = min(recurrent, 250 - first)
    total = cc.r2(0.8 * (first + first_rec) + 0.4 * (once - first) + 0.45 * (recurrent - first_rec))
    half = cc.r2(total / 2)
    how = (f'Ley 49/2002 art. 19: 80 % de {cc.eur(first + first_rec)} + 40 % de {cc.eur(once - first)} + 45 % (misma entidad tres años) de '
           f'{cc.eur(recurrent - first_rec)} = {cc.eur(total)}; la mitad en cada cuota (art. 68.3 LIRPF); dentro del 10 % de la base liquidable (art. 69.1)')
    return dict(id=DONATIONS_ID, label='Donativos a entidades de la Ley 49/2002', how=how, state=cc.r2(total - half), regional=half,
                donations=dict(general=str(given), recurrent=str(recurrent) if recurrent else '', priority='', priorityRecurrent='', other=''))


def ded(id_, label, how, regional, choice=None, units=None, checks=None):
    d = dict(id=id_, label=label, how=how, state=0.0, regional=regional)
    if choice is not None:
        d['choice_amount'] = str(choice)
    if units is not None:
        d['units'] = str(units)
    if checks:
        d['checks'] = checks
    return d


RENTA += [
    P(123, 'familia-deporte-guarderia-donativos-valencia', 'comunitat-valenciana',
      'Familia en València con gimnasio, guardería y donativos a la misma ONG tres años',
      'Asalariada de 32 años con dos hijos (5 y 2 años). Paga 400 € de gimnasio y fisioterapia con tarjeta y 2.000 € de guardería del pequeño. '
      'Dona 300 € a una ONG a la que ya donó en 2023 y 2024 la misma cantidad: el 45 % por fidelidad. Responde «sí» a los requisitos de cada deducción.',
      ['requisitos de deducciones autonómicas (CV)', 'deporte y actividades saludables (CV, 30 %)', 'guardería de menor de 3 años (CV, 15 % con tope de 297 €)',
       'donativos por lo donado con recurrencia (45 %)', 'casillas 1960 y 1087 del anexo B'],
      age=32, children=[dict(age=5), dict(age=2)], **p2.worker(26000, 2900),
      deductions=[ded('comunitat-valenciana-practica-deporte', 'Deporte y actividades saludables (Ley 13/1997 CV, art. 4.Uno; casilla 1960)',
                      '30 % de 400 = 120 € (tope 150 €; base imponible por debajo de 54.000 €)', 120, choice=400),
                  ded('comunitat-valenciana-custodia-guarderias', 'Guardería de menores de 3 años (Ley 13/1997 CV, art. 4.Uno; casilla 1087)',
                      '15 % de 2.000 = 300, tope 297 € por menor (base imponible por debajo de 27.000 €: tope completo)', 297, choice=2000),
                  donation(300, 300)]),
    P(124, 'alquiler-joven-donacion-fundacion-valladolid', 'castilla-y-leon',
      'Joven de 29 años de alquiler en Valladolid que dona a una fundación de la región',
      'Trabaja en Valladolid (22.000 € brutos), vive de alquiler (500 € al mes, titular del contrato) y dona 200 € a una fundación de Castilla y León con certificado. '
      'Las dos deducciones de Castilla y León miden su tope de renta después del mínimo personal (18.900 €).',
      ['alquiler de vivienda para jóvenes (CyL, 20 % con tope de 459 €)', 'edad comprobada sola (menor de 36)', 'donación a fundaciones (CyL, 15 %)',
       'casillas 0975 y 0972 del anexo B'],
      age=29, **p2.worker(22000, 2300),
      deductions=[ded('castilla-y-leon-alquiler-jovenes', 'Alquiler de vivienda habitual para jóvenes (D. Leg. 1/2013 CyL; casilla 0975)',
                      '20 % de 6.000 = 1.200, tope 459 € (base menos mínimo por debajo de 18.900 €)', 459, choice=6000),
                  ded('castilla-y-leon-donaciones-fundaciones-patrimonio', 'Donaciones a fundaciones de Castilla y León (casilla 0972)',
                      '15 % de 200 = 30 €', 30, choice=200)]),
    P(125, 'alquiler-sin-perfil-deporte-malaga', 'andalucia',
      'Asalariado de 40 años en Málaga: la deducción de alquiler no le corresponde y la de deporte sí',
      'Vive de alquiler, pero tiene 40 años, sin discapacidad ni otro perfil de la deducción andaluza por alquiler: contesta «no» a su requisito '
      'y no se aplica. Paga 300 € de cuotas de su club deportivo: 15 % = 45 €.',
      ['requisito no cumplido: la deducción no se aplica', 'deporte (Andalucía, 15 % con tope de 100 €)', 'casillas 0853 y 0921 del anexo B'],
      age=40, **p2.worker(24000, 3000),
      deductions=[ded('andalucia-alquiler-vivienda-habitual', 'Alquiler de vivienda habitual (Ley 5/2021 de Andalucía; casilla 0853)',
                      'No se aplica: no tiene menos de 35 años, ni más de 65, ni discapacidad, ni es víctima de violencia o terrorismo', 0,
                      choice=7200, checks={'perfil': 'no'}),
                  ded('andalucia-ejercicio-fisico-deporte', 'Ejercicio físico y deporte (Ley 5/2021 de Andalucía; casilla 0921)',
                      '15 % de 300 = 45 € (tope 100 €)', 45, choice=300)]),
]


def excess_of(p):
    """Exceso de intereses y reparaciones de todos los inmuebles (0108), para la cifra rental.excess."""
    total = 0.0
    for pr in p['properties']:
        share = pr.get('share', 100) / 100
        days = pr.get('rentedDays', 365) / 365
        capped = cc.r2(sum(v * share * (days if k in p2.YEARLY else 1) for k, v in pr['expenses'].items() if k in p2.CAPPED))
        income = cc.r2(pr['income'] * share)
        left = income - min(pr.get('pending', 0), income)
        total += cc.r2(capped - min(capped, left))
    return cc.r2(total)


def main():
    index = []
    for p in RENTA:
        if p.get('properties'):
            p['excess'] = excess_of(p)
        decls, figures, steps, _b = p2.build_renta2(p)
        for d in p.get('deductions', []):
            if d.get('donations'):
                # What was given, not the deduction: the engine works it out (rentaDonations.ts).
                decls[0]['form']['choices'].pop(d['id'], None)
                decls[0]['form']['donations'] = d['donations']
        persona = dict(slug=p['slug'], banco=PREFIX, nombre=f'Persona Ficticia {p["n"]:03d}', nif=nif(p['n']), domicilio=home(p['n'], p['ccaa']),
                       iban='ES00 0000 0000 0000 0000 0000', ejercicio=2025, comunidad=p['ccaa'], titulo=p['title'], descripcion=p['story'],
                       prueba=p['tests'], modelos=['100'], alcance='dentro', datosFicticios=True)
        persona['renta'] = dict(declaraciones=decls, conjunta=None)
        persona['documentos'] = dict(pagadores=p['payers'], inmuebles=p.get('properties', []))
        esperado = dict(slug=p['slug'], ejercicio=2025, comprobado=CHECKED, cifras=figures)
        p2.write(os.path.join(OUT, p['slug']), persona, esperado, p['title'], p['story'], steps, SOURCES)
        index.append(dict(slug=p['slug'], titulo=p['title'], comunidad=p['ccaa'], modelos=['100'], prueba=p['tests'], alcance='dentro'))
    index.sort(key=lambda x: x['slug'])
    with open(os.path.join(OUT, f'{PREFIX}-indice.json'), 'w', encoding='utf-8') as fh:
        json.dump(index, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    print(f'{len(index)} personas {PREFIX} en {OUT}')


if __name__ == '__main__':
    main()
