import { ASK, type RequirementOverlay } from './types';

/**
 * Castilla-La Mancha, Renta 2025. Rule: Ley 8/2013 (regional rules on ceded taxes). Boxes: modelo
 * 100 of 2025 (BOE-A-2026-7041), annex B. Requirements: AEAT «Guía de deducciones autonómicas
 * 2025, Castilla-La Mancha». Checked 19-10-2026. No clear amount box for rural home purchase
 * (1946 is the municipality code), the first-home savings account or assistance dogs.
 */
const LAW = 'Ley 8/2013 de Castilla-La Mancha (tributos cedidos)';
const NO_AID = {
  kind: 'ask',
  id: 'ayudas',
  q: '¿No cobras ayudas de la Junta por ese acogimiento?',
} as const;
const MONO = {
  kind: 'ask',
  id: 'monoparental',
  q: '¿Eres padre o madre separado o sin pareja, tus hijos dependen solo de ti y no recibes pensión de alimentos por ellos?',
} as const;
const DONATION_REG = {
  kind: 'ask',
  id: 'registro',
  q: '¿La entidad está inscrita en los registros de Castilla-La Mancha?',
} as const;
const NO_RESIDENCE = {
  kind: 'ask',
  id: 'residencia',
  q: '¿No pasó más de 30 días en residencias de la Junta ni en plazas concertadas?',
} as const;

export const castillaLaManchaRequirements: RequirementOverlay = {
  'castilla-la-mancha-nacimiento-adopcion-hijos': {
    box: '0957',
    norm: LAW,
    checks: [ASK.bornThisYear, ASK.minimum],
  },
  'castilla-la-mancha-familia-numerosa': {
    box: '0963',
    norm: LAW,
    checks: [ASK.largeFamily],
  },
  'castilla-la-mancha-familia-monoparental': {
    box: '0209',
    norm: LAW,
    checks: [MONO],
  },
  'castilla-la-mancha-libros-texto-idiomas-educacion': {
    box: '0965',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'escolarizados',
        q: '¿Los gastos son de hijos escolarizados que te dan derecho al mínimo por descendientes?',
      },
    ],
  },
  'castilla-la-mancha-guarderia': {
    box: '0211',
    norm: LAW,
    checks: [
      { kind: 'childUnder', age: 4 },
      {
        kind: 'ask',
        id: 'centro',
        q: '¿Es un centro autorizado y pagaste meses completos?',
      },
    ],
  },
  'castilla-la-mancha-discapacidad-contribuyente': {
    box: '0958',
    norm: LAW,
    checks: [{ kind: 'disability', min: 65 }],
  },
  'castilla-la-mancha-discapacidad-ascendientes-descendientes': {
    box: '0959',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'familiar',
        q: '¿Tienes a tu cargo un ascendiente o descendiente con discapacidad que te da derecho al mínimo por discapacidad?',
      },
    ],
  },
  'castilla-la-mancha-mayores-75': {
    box: '0960',
    norm: LAW,
    checks: [{ kind: 'minAge', age: 75 }, NO_RESIDENCE],
  },
  'castilla-la-mancha-cuidado-ascendientes-75': {
    box: '0961',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ascendiente',
        q: '¿Cuidas a un ascendiente mayor de 75 años que te da derecho al mínimo por ascendientes?',
      },
      NO_RESIDENCE,
    ],
  },
  'castilla-la-mancha-acogimiento-menores': {
    box: '0966',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'acogimiento',
        q: '¿Tienes un menor en acogimiento familiar no remunerado, acreditado por la Consejería, más de 183 días?',
      },
      NO_AID,
    ],
  },
  'castilla-la-mancha-acogimiento-mayores-discapacidad': {
    box: '0967',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'acogimiento',
        q: '¿Acoges sin cobrar más de 183 días a una persona mayor de 65 (no familiar hasta 4.º grado) o con discapacidad?',
      },
      NO_AID,
    ],
  },
  'castilla-la-mancha-alquiler-menores-36': {
    box: '0968',
    norm: LAW,
    checks: [{ kind: 'maxAge', age: 35 }],
  },
  'castilla-la-mancha-alquiler-dacion-en-pago': {
    box: '0212',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'dacion',
        q: '¿El alquiler va ligado a la entrega de tu vivienda habitual al banco por toda la deuda hipotecaria?',
      },
    ],
  },
  'castilla-la-mancha-alquiler-familias-numerosas': {
    box: '0213',
    norm: LAW,
    checks: [ASK.largeFamily],
  },
  'castilla-la-mancha-alquiler-familias-monoparentales': {
    box: '0228',
    norm: LAW,
    checks: [MONO],
  },
  'castilla-la-mancha-alquiler-discapacidad': {
    box: '0229',
    norm: LAW,
    checks: [{ kind: 'disability', min: 65 }],
  },
  'castilla-la-mancha-donaciones-cooperacion-pobreza': {
    box: '0962',
    norm: LAW,
    checks: [ASK.donationProof, DONATION_REG],
  },
  'castilla-la-mancha-donaciones-investigacion': {
    box: '0964',
    norm: LAW,
    checks: [ASK.donationProof, DONATION_REG],
  },
  'castilla-la-mancha-donaciones-patrimonio-cultural': {
    box: '0201',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'inventario',
        q: '¿Son bienes del Inventario del Patrimonio Cultural de Castilla-La Mancha o donas a entidades de la región?',
      },
    ],
  },
  'castilla-la-mancha-intereses-primera-vivienda-menores-40': {
    box: '1906',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 39 },
      {
        kind: 'ask',
        id: 'prestamo',
        q: '¿Es el préstamo a interés variable de tu primera vivienda habitual?',
      },
    ],
  },
  'castilla-la-mancha-residencia-zonas-rurales': {
    box: '0204',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'municipio',
        q: '¿Vives de verdad en un municipio de las zonas rurales despobladas de la Ley 2/2021?',
      },
    ],
  },
  'castilla-la-mancha-compra-rehabilitacion-vivienda-rural': {
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'municipio',
        q: '¿Compraste o rehabilitaste desde 2021 tu vivienda habitual en un municipio de menos de 5.000 habitantes de zona despoblada?',
      },
    ],
  },
  'castilla-la-mancha-traslado-vivienda-habitual': {
    box: '0207',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'traslado',
        q: '¿Te trasladaste por trabajo a una zona despoblada y seguirás allí el año del traslado y los tres siguientes?',
      },
    ],
  },
  'castilla-la-mancha-inversion-acciones-nuevas-sociedades': {
    box: '1908',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'sociedad',
        q: '¿La sociedad tiene domicilio en Castilla-La Mancha y actividad económica, tienes hasta el 40 %, la mantendrás 3 años y no la diriges?',
      },
    ],
  },
  'castilla-la-mancha-inversion-economia-social': {
    box: '1909',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'entidad',
        q: '¿La entidad tiene domicilio en la región y un empleado a jornada completa, tienes hasta el 40 % y la mantendrás 5 años?',
      },
    ],
  },
  'castilla-la-mancha-ahorro-primera-vivienda': {
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      {
        kind: 'ask',
        id: 'cuenta',
        q: '¿Es tu única cuenta vivienda y usarás el dinero en tu primera vivienda antes de 6 años?',
      },
    ],
  },
  'castilla-la-mancha-perros-asistencia': {
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'perro',
        q: '¿La Consejería reconoce tu vínculo con el perro de asistencia y tienes facturas del veterinario sin subvención?',
      },
    ],
  },
};
