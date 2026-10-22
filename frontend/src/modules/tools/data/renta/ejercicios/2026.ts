import type { Deduction, LowPayRule, RentaState } from '../../../domain/rentaData';
import type { PropertyNote, RentaProperty, RentaWorkExtras } from '../../../domain/rentaExtras';
import type { RentaRules } from '../../../domain/rentaRules';
import { farm2025 } from '../agrario-2025';
import { rentaJoint } from '../conjunta';
import { rentaWorkExtras } from '../estado-extra';
import { rentaProperty } from '../inmuebles';
import { modules2025 } from '../modulos-2025';
import { rentaState } from '../state';
import { patched } from './shared';

/**
 * Renta 2026 (to be filed in 2027): provisional. There is no Manual práctico of 2026 yet, so only
 * what the BOE has published is here, with the norm that sets it (checked on 22-10-2026 against the
 * versions of the Ley 35/2006 in the API of legislación consolidada):
 *
 * - Deducción por rendimientos del trabajo (DA 61.ª): 590.89 € up to 17,094 €, down by 0.2 to nothing
 *   at 20,048.45 €, "con efectos desde 1 de enero de 2026" (Real Decreto-ley 5/2026, art. 28,
 *   BOE-A-2026-3810; convalidated, BOE-A-2026-6483).
 * - Energy efficiency works paid up to 31-12-2026 (rehabilitation of buildings, up to 31-12-2027),
 *   electric cars and charging points up to 31-12-2026, and the new deduction for renewable
 *   self-consumption (DA 62.ª: 10 % or 20 %, base up to 5,000 €): Real Decreto-ley 7/2026
 *   (BOE-A-2026-6544; convalidated, BOE-A-2026-7125).
 * - La Palma, also in 2026: Real Decreto-ley 23/2026 (BOE-A-2026-18828; convalidated, BOE-A-2026-19845).
 * - Activities carried out in Ceuta with the deduction of art. 68.4: 10 % of hard-to-justify expenses
 *   and 10 % off the módulos instead of 5 % (DA 64.ª, Real Decreto-ley 22/2026, BOE-A-2026-18429;
 *   convalidated, BOE-A-2026-19420).
 * - Unchanged since before 2025: the scales (arts. 63, 65, 66 and 76), the minimums (arts. 57-61),
 *   art. 19, art. 20 and the joint return (art. 84).
 *
 * Pending: the Real Decreto-ley 29/2026 (BOE-A-2026-20823) changes art. 23.2 (rented homes), adds a
 * State deduction for rent (art. 68.6), keeps the 1.1 % of the imputed income in 2026 (DA 55.ª) and
 * adds the DA 65.ª and 66.ª; on 22-10-2026 the Congress had not convalidated it (its RDL 26/2026, the
 * same text, was repealed on 2-10-2026). Those parts are listed as missing, not applied.
 */
const BOE = 'https://www.boe.es/buscar/act.php?id=';

/** LIRPF DA 61.ª as worded by the Real Decreto-ley 5/2026 (BOE-A-2026-3810), for 2026. */
export const LOW_PAY_2026: LowPayRule = {
  amount: 590.89,
  fullUntil: 17094,
  end: 20048.45,
  slope: 0.2,
  otherIncomeLimit: 6500,
};

/** DA 62.ª LIRPF (Real Decreto-ley 7/2026): one installation gives only one of the two. */
const SELF_CONSUMPTION_RULES =
  'Pagos del 1-1-2026 al 31-12-2026 sin dinero en efectivo, por una instalación terminada en 2026 con su certificado de instalación eléctrica. Se restan las ayudas. No vale si está afecta a una actividad ni junto con la deducción de eficiencia por la misma obra.';
const selfConsumption: Deduction[] = [
  {
    id: 'estado-autoconsumo-renovable',
    group: 'housing',
    title: 'Autoconsumo con energía renovable en un inmueble tuyo',
    summary:
      'Recuperas el 10 % de lo pagado en 2026 por instalar en un inmueble tuyo placas solares u otro sistema de autoconsumo renovable, con o sin baterías. Base máxima de 5.000 euros (hasta 500 euros).',
    kind: 'percent',
    percent: 10,
    baseLimit: 5000,
    requirements: SELF_CONSUMPTION_RULES,
    norm: 'Ley 35/2006, disposición adicional 62.ª.1 (Real Decreto-ley 7/2026)',
    url: `${BOE}BOE-A-2026-6544`,
  },
  {
    id: 'estado-autoconsumo-renovable-edificio',
    group: 'housing',
    title: 'Autoconsumo con energía renovable en tu edificio de viviendas',
    summary:
      'Recuperas el 20 % de lo que pagas en 2026 por la instalación de autoconsumo renovable de tu edificio de viviendas. Base máxima de 5.000 euros (hasta 1.000 euros).',
    kind: 'percent',
    percent: 20,
    baseLimit: 5000,
    requirements: SELF_CONSUMPTION_RULES,
    norm: 'Ley 35/2006, disposición adicional 62.ª.2 (Real Decreto-ley 7/2026)',
    url: `${BOE}BOE-A-2026-6544`,
  },
];

const deductions: Deduction[] = [
  ...patched(rentaState.deductions, {
    'estado-donativos-actividades-prioritarias': {
      requirements:
        'El dinero debe ir a programas declarados prioritarios de mecenazgo en la Ley de Presupuestos que rija en 2026. Lo donado no puede pasar del 15 % de tu base liquidable. Necesitas certificado de la entidad.',
    },
    'estado-eficiencia-calefaccion-refrigeracion': {
      requirements:
        'Obras pagadas del 6-10-2021 al 31-12-2026, con certificado energético posterior emitido en 2026 (se deduce en el año del certificado, con todo lo pagado desde 2021). Vivienda habitual o alquilada. Se restan subvenciones. Hace falta cuota estatal: no se arrastra.',
    },
    'estado-eficiencia-energia-primaria': {
      requirements:
        'Obras pagadas del 6-10-2021 al 31-12-2026, con certificado energético posterior emitido en 2026. Vivienda habitual o alquilada (o a alquilar antes de 2028). Se restan subvenciones y no cuentan calderas de combustible fósil. Hace falta cuota estatal.',
    },
    'estado-eficiencia-rehabilitacion-edificios': {
      requirements:
        'Obras pagadas del 6-10-2021 al 31-12-2027 con certificado que mejore un 30 % o dé letra A o B. Lo no deducido por pasar de 5.000 euros se aplaza hasta 4 años, con 15.000 euros de base en total. Se resta lo subvencionado.',
    },
    'estado-vehiculo-electrico': {
      requirements:
        'Un solo vehículo nuevo, sin uso profesional, comprado entre el 30-6-2023 y el 31-12-2026 (o con un primer pago de al menos el 25 %), matriculado a tu nombre y dentro de los precios máximos MOVES III. Se descuentan las ayudas.',
    },
    'estado-punto-recarga': {
      requirements:
        'Instalación en un inmueble tuyo, sin uso profesional, terminada antes del 31-12-2026 y pagada sin dinero en efectivo. Se aplica el año en que acaba la instalación, con lo pagado desde 30-6-2023. Se descuentan las ayudas.',
    },
    'estado-la-palma': {
      summary:
        'Descuentas el 60 % de la cuota (estatal más autonómica) que corresponda a las rentas obtenidas en La Palma. Prorrogada para 2026 por el Real Decreto-ley 23/2026.',
    },
    'estado-actividades-economicas': {
      summary:
        'Autónomos en estimación directa pueden aplicar las deducciones del Impuesto de Sociedades (I+D+i, cine, etc.) con los mismos porcentajes y límites.',
    },
  }),
  ...selfConsumption,
];

const state: RentaState = {
  ...rentaState,
  year: 2026,
  deductions,
  lowPay: LOW_PAY_2026,
  // DA 64.ª LIRPF, added by the Real Decreto-ley 22/2026, art. 2 (BOE-A-2026-18429; convalidated,
  // BOE-A-2026-19420): 10 % in 2026 for the activities carried out in Ceuta.
  ceutaActivities: { hardPercent: 10, modulesPercent: 10 },
  source: `${BOE}BOE-A-2006-20764`,
};

const extras: RentaWorkExtras = {
  ...rentaWorkExtras,
  savingsScale: {
    ...rentaWorkExtras.savingsScale,
    notes:
      'Escala de la base liquidable del ahorro (intereses, dividendos y ganancias de transmisiones), la misma que en 2025: 9,5 % hasta 6.000 euros, 10,5 % de 6.000 a 50.000, 11,5 % de 50.000 a 200.000, 13,5 % de 200.000 a 300.000 y 15 % desde 300.000 en cada mitad. Sumando Estado y comunidad salen 19, 21, 23, 27 y 30 %.',
  },
  notes: rentaWorkExtras.notes
    .map((n) => n.replace('La deducción de 340 euros', 'La deducción de hasta 590,89 euros'))
    .map((n) => n.replace('la deducción nueva de 340 euros', 'la deducción de hasta 590,89 euros'))
    .map((n) => n.replace('no se puede empezar en 2025', 'no se puede empezar en 2026')),
  source: state.source,
};

const notes: PropertyNote[] = patched(rentaProperty.notes, {
  'eficiencia-energetica': {
    summary:
      'Deducción del 20 %, 40 % o 60 % según la obra, con certificado energético. Obras pagadas del 6-10-2021 al 31-12-2026 (las del edificio, hasta el 31-12-2027) en tu vivienda habitual o alquilada (o a alquilar antes de 2028).',
    requirements:
      '20 %: bajar un 7 % la demanda (base máx. 5.000 euros). 40 %: bajar un 30 % la energía primaria o subir a A o B (7.500). 60 %: edificios (5.000 al año, 15.000 en total). Pago no en efectivo. Se descuentan ayudas. Certificado posterior a las obras antes de 2027 (del edificio, antes de 2028).',
  },
  'vehiculo-recarga': {
    summary:
      'Deducción del 15 % por comprar un coche eléctrico nuevo (base máx. 20.000 euros) y del 15 % por instalar un punto de recarga (base máx. 4.000 euros). Solo para compras e instalaciones del 30-6-2023 al 31-12-2026.',
    requirements:
      'Coche nuevo, enchufable o de pila, matriculado antes del 31-12-2026, con precio dentro del límite MOVES III. Recarga: en inmueble tuyo, terminada antes del 31-12-2026. Pago no en efectivo. Se descuentan ayudas.',
  },
});

const property: RentaProperty = {
  ...rentaProperty,
  imputation: {
    ...rentaProperty.imputation,
    requirements: rentaProperty.imputation.requirements.replace('IBI 2025', 'IBI 2026'),
  },
  notes,
  source:
    'Ley 35/2006 del IRPF consolidada en el BOE (arts. 22, 23, 85, 68 y 33-38) para 2026; las explicaciones son las del Manual práctico de Renta 2025 hasta que se publique el de 2026.',
};

export const rules2026: RentaRules = {
  year: 2026,
  status: 'provisional',
  state,
  extras,
  property,
  joint: { ...rentaJoint, year: 2026 },
  // Orden HAC/1425/2025 (BOE-A-2025-25272): its annex II (módulos) and annex I (farming indexes)
  // are those of 2025 figure by figure (compared on 19-10-2026, see objectiveModules.ts).
  activityTables: { modules: modules2025, farm: farm2025 },
  regions: ['ceuta', 'melilla', 'navarra', 'pais-vasco'],
  missing: ['manual', 'regions', 'rentals', 'imputation'],
  sources: [
    {
      what: 'Ley 35/2006 del IRPF, texto consolidado y versiones de cada artículo',
      url: `${BOE}BOE-A-2006-20764`,
      checkedOn: '2026-10-22',
    },
    {
      what: 'Deducción por rendimientos del trabajo de hasta 590,89 € (DA 61.ª, Real Decreto-ley 5/2026, art. 28)',
      url: `${BOE}BOE-A-2026-3810`,
      checkedOn: '2026-10-22',
    },
    {
      what: 'Eficiencia energética, vehículos eléctricos y autoconsumo renovable (DA 50.ª, 58.ª y 62.ª, Real Decreto-ley 7/2026)',
      url: `${BOE}BOE-A-2026-6544`,
      checkedOn: '2026-10-22',
    },
    {
      what: 'Módulos e índices agrarios de 2026 (Orden HAC/1425/2025), iguales a los de 2025',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2025-25272',
      checkedOn: '2026-10-19',
    },
    {
      what: 'La Palma en 2026 (DA 57.ª, Real Decreto-ley 23/2026)',
      url: `${BOE}BOE-A-2026-18828`,
      checkedOn: '2026-10-22',
    },
    {
      what: 'Actividades en Ceuta: 10 % de gastos de difícil justificación y de reducción de módulos (DA 64.ª, Real Decreto-ley 22/2026)',
      url: `${BOE}BOE-A-2026-18429`,
      checkedOn: '2026-10-22',
    },
    {
      what: 'Pendiente de convalidación: Real Decreto-ley 29/2026 (art. 23.2, art. 68.6, DA 55.ª, 65.ª y 66.ª)',
      url: `${BOE}BOE-A-2026-20823`,
      checkedOn: '2026-10-22',
    },
  ],
};
