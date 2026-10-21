import type { Deduction, RentaState, TaxBracket } from '../../../domain/rentaData';
import type { PropertyNote, RentaProperty, RentaWorkExtras } from '../../../domain/rentaExtras';
import type { RentaRules } from '../../../domain/rentaRules';
import { rentaJoint } from '../conjunta';
import { rentaWorkExtras } from '../estado-extra';
import { rentaProperty } from '../inmuebles';
import { rentaState } from '../state';
import { patched, withManualOf } from './shared';

/**
 * Renta 2024 (filed in 2025). The State's rules of 2025 where the law was the same in 2024, and only
 * what changed between the two years, each change with its source (checked on 22-10-2026):
 *
 * - BOE, Ley 35/2006 consolidated, versions of each article (API of legislación consolidada):
 *   arts. 19, 57-61, 63 and 65 were not changed after 2021; art. 20 has its wording of 2024 and 2025
 *   since the Real Decreto-ley 4/2024 (BOE-A-2024-12944, "con efectos desde el 1 de enero de 2024");
 *   art. 66 and 76: 14 % (28 % in all) over 300,000 € until the Ley 7/2024 (BOE-A-2024-26694) raised it
 *   to 15 % from 2025; DA 61.ª (deduction for low pay) added by the Ley 5/2025 "con efectos desde 1
 *   de enero de 2025": none in 2024; art. 19 of the Ley 49/2002 (donations) last changed by the Real
 *   Decreto-ley 6/2023, in force from 2024; art. 96 (15,876 €) by the Real Decreto-ley 4/2024.
 * - AEAT, Manual práctico de Renta 2024, the same pages as the data of 2025, compared one by one with
 *   those of 2025: only the dates of the energy efficiency works (paid up to 31-12-2024, certificate
 *   before 1-1-2025, a home to rent before 31-12-2025), of the electric car and its charging point
 *   (up to 31-12-2024) and the top rate of the savings scale change. The rest only changes the year.
 */
const MANUAL =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2024';

const deductions: Deduction[] = patched(withManualOf(rentaState.deductions, 2025, 2024), {
  'estado-donativos-actividades-prioritarias': {
    requirements:
      'El dinero debe ir a programas declarados prioritarios de mecenazgo (en 2024 siguen los de 2023 por prórroga presupuestaria). Lo donado no puede pasar del 15 % de tu base liquidable. Necesitas certificado de la entidad.',
  },
  'estado-eficiencia-calefaccion-refrigeracion': {
    requirements:
      'Obras pagadas del 6-10-2021 al 31-12-2024, con certificado energético posterior emitido en 2024 (se deduce en el año del certificado, con todo lo pagado desde 2021). Vivienda habitual o alquilada. Se restan subvenciones. Hace falta cuota estatal: no se arrastra.',
  },
  'estado-eficiencia-energia-primaria': {
    requirements:
      'Obras pagadas del 6-10-2021 al 31-12-2024, con certificado energético posterior emitido en 2024. Vivienda habitual o alquilada (o a alquilar antes de 2026). Se restan subvenciones y no cuentan calderas de combustible fósil. Hace falta cuota estatal.',
  },
  'estado-eficiencia-rehabilitacion-edificios': {
    requirements:
      'Obras pagadas del 6-10-2021 al 31-12-2024 con certificado que mejore un 30 % o dé letra A o B. Lo no deducido por pasar de 5.000 euros se aplaza hasta 4 años, con 15.000 euros de base en total. Se resta lo subvencionado.',
  },
  'estado-vehiculo-electrico': {
    requirements:
      'Un solo vehículo nuevo, sin uso profesional, comprado entre el 30-6-2023 y el 31-12-2024 (o con un primer pago de al menos el 25 %), matriculado a tu nombre y dentro de los precios máximos MOVES III. Se descuentan las ayudas.',
  },
  'estado-punto-recarga': {
    requirements:
      'Instalación en un inmueble tuyo, sin uso profesional, terminada antes del 31-12-2024 y pagada sin dinero en efectivo. Se aplica el año en que acaba la instalación, con lo pagado desde 30-6-2023. Se descuentan las ayudas.',
  },
  'estado-la-palma': {
    // LIRPF DA 57.ª as worded by the Real Decreto-ley 4/2024 (BOE-A-2024-12944): 2022, 2023 and 2024.
    summary:
      'Descuentas el 60 % de la cuota (estatal más autonómica) que corresponda a las rentas obtenidas en La Palma. Prorrogada para 2024 por el Real Decreto-ley 4/2024.',
  },
  'estado-actividades-economicas': {
    summary:
      'Autónomos en estimación directa pueden aplicar las deducciones del Impuesto de Sociedades (I+D+i, cine, etc.) con los mismos porcentajes y límites. En estimación objetiva (módulos) no hay ninguna en 2024.',
  },
});

const state: RentaState = {
  ...rentaState,
  year: 2024,
  deductions,
  // LIRPF DA 61.ª starts in 2025 (Ley 5/2025).
  lowPay: null,
  source: 'https://sede.agenciatributaria.gob.es/Sede/Ayuda/24Manual/100.html',
};

/** Arts. 66.1 and 76 LIRPF as worded by the Ley 31/2022 (BOE-A-2022-22128), in force until 2024. */
const savingsHalfScale: TaxBracket[] = [
  { from: 0, rate: 9.5 },
  { from: 6000, rate: 10.5 },
  { from: 50000, rate: 11.5 },
  { from: 200000, rate: 13.5 },
  { from: 300000, rate: 14 },
];

const LOW_PAY_NOTE = '340 euros';
const extras: RentaWorkExtras = {
  ...withManualOf(rentaWorkExtras, 2025, 2024),
  savingsScale: {
    state: savingsHalfScale,
    regional: savingsHalfScale,
    notes:
      'Escala 2024 de la base liquidable del ahorro (intereses, dividendos y ganancias de transmisiones). Cada mitad es la misma: 9,5 % hasta 6.000 euros, 10,5 % de 6.000 a 50.000, 11,5 % de 50.000 a 200.000, 13,5 % de 200.000 a 300.000 y 14 % desde 300.000. Sumando Estado y comunidad salen 19, 21, 23, 27 y 28 %.',
    url: `${MANUAL}/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-ahorro/gravamen-estatal.html`,
  },
  // The notes of the deduction for low pay are of 2025 only.
  notes: rentaWorkExtras.notes
    .filter((n) => !n.includes(LOW_PAY_NOTE))
    .map((n) => n.replace('no se puede empezar en 2025', 'no se puede empezar en 2024')),
  source: state.source,
};

const notes: PropertyNote[] = patched(withManualOf(rentaProperty.notes, 2025, 2024), {
  'eficiencia-energetica': {
    summary:
      'Deducción del 20 %, 40 % o 60 % según la obra, con certificado energético. Obras pagadas del 6-10-2021 al 31-12-2024 en tu vivienda habitual o alquilada (o a alquilar antes de 2026).',
    requirements:
      '20 %: bajar un 7 % la demanda (base máx. 5.000 euros). 40 %: bajar un 30 % la energía primaria o subir a A o B (7.500). 60 %: edificios (5.000 al año, 15.000 en total). Pago no en efectivo. Se descuentan ayudas. Certificado posterior a las obras antes de 2025.',
  },
  'vehiculo-recarga': {
    summary:
      'Deducción del 15 % por comprar un coche eléctrico nuevo (base máx. 20.000 euros) y del 15 % por instalar un punto de recarga (base máx. 4.000 euros). Solo para compras e instalaciones del 30-6-2023 al 31-12-2024.',
    requirements:
      'Coche nuevo, enchufable o de pila, matriculado antes de 2025, con precio dentro del límite MOVES III. Recarga: en inmueble tuyo, terminada antes del 31-12-2024. Pago no en efectivo. Se descuentan ayudas.',
  },
});

const base = withManualOf(rentaProperty, 2025, 2024);
const property: RentaProperty = {
  ...base,
  imputation: {
    ...base.imputation,
    requirements: base.imputation.requirements.replace('IBI 2025', 'IBI 2024'),
  },
  notes,
  source: base.source.replace('Renta 2025', 'Renta 2024'),
};

export const rules2024: RentaRules = {
  year: 2024,
  status: 'confirmed',
  state,
  extras,
  property,
  joint: { ...withManualOf(rentaJoint, 2025, 2024), year: 2024 },
  // The tables of the módulos of 2024 (Orden HFP/1359/2023) are not in the app.
  activityTables: null,
  // The regional data of 2024 is not checked yet: only Ceuta and Melilla, whose part is the State's
  // scale of art. 65 LIRPF (DA 32.ª), not changed since 2015, and the foral ones (they file apart).
  regions: ['ceuta', 'melilla', 'navarra', 'pais-vasco'],
  missing: ['regions', 'modules'],
  sources: [
    {
      what: 'Manual práctico de Renta 2024 (parte 1)',
      url: `${MANUAL}/presentacion.html`,
      checkedOn: '2026-10-22',
    },
    {
      what: 'Ley 35/2006 del IRPF, texto consolidado y versiones de cada artículo',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764',
      checkedOn: '2026-10-22',
    },
    {
      what: 'Escala del ahorro de 2024: 28 % desde 300.000 € (arts. 66 y 76, Ley 31/2022)',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2022-22128',
      checkedOn: '2026-10-22',
    },
    {
      what: 'Reducción del art. 20 de 2024 (Real Decreto-ley 4/2024, con efectos desde el 1-1-2024)',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2024-12944',
      checkedOn: '2026-10-22',
    },
  ],
};
