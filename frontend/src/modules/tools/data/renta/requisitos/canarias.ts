import { ASK, type RequirementOverlay } from './types';

/**
 * Canarias, Renta 2025. Rule: Decreto Legislativo 1/2009 (texto refundido of ceded taxes). Boxes:
 * modelo 100 of 2025 (BOE-A-2026-7041), annex B. Requirements: AEAT «Guía de deducciones
 * autonómicas 2025, Canarias». Checked 19-10-2026.
 */
const LAW = 'Decreto Legislativo 1/2009 de Canarias (texto refundido de tributos cedidos)';
const RENT_CONTRACT = {
  kind: 'ask',
  id: 'contrato',
  q: '¿El contrato es de un año o más y tienes el NIF del arrendador y la referencia catastral?',
} as const;

export const canariasRequirements: RequirementOverlay = {
  'canarias-nacimiento-adopcion': {
    box: '0922',
    norm: LAW,
    checks: [ASK.bornThisYear, { kind: 'ask', id: 'convive', q: '¿El hijo convive contigo?' }],
  },
  'canarias-familia-numerosa': {
    box: '0925',
    norm: LAW,
    checks: [ASK.largeFamily],
  },
  'canarias-familias-monoparentales': {
    box: '0938',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'monoparental',
        q: '¿Vives solo con tus hijos menores (o mayores con discapacidad) que ganan hasta 8.000 €, sin otra persona salvo ascendientes a tu cargo?',
      },
    ],
  },
  'canarias-acogimiento-menores': {
    box: '0937',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'acogimiento',
        q: '¿Tienes un menor en acogimiento familiar que convive contigo y no lo adoptaste en 2025?',
      },
    ],
  },
  'canarias-discapacidad-mayores-65': {
    box: '0923',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'situacion',
        q: '¿A 31 de diciembre tenías una discapacidad del 33 % o más o más de 65 años?',
      },
    ],
  },
  'canarias-familiares-dependientes-discapacidad': {
    box: '0941',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'familiar',
        q: '¿Tienes un ascendiente o descendiente con discapacidad del 65 % o más que te da derecho al mínimo?',
      },
    ],
  },
  'canarias-desempleados': {
    box: '0933',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'paro',
        q: '¿Cobraste prestación por desempleo más de seis meses de 2025?',
      },
    ],
  },
  'canarias-empleados-hogar': {
    box: '2051',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'situacion',
        q: '¿Tienes hijos que te dan el mínimo y trabajas, o tienes 75 años o más, o más de 65 con discapacidad?',
      },
      {
        kind: 'ask',
        id: 'empleado',
        q: '¿Pagaste cuotas de un empleado del hogar dado de alta y tienes su NIF?',
      },
    ],
  },
  'canarias-gasto-enfermedad': {
    box: '0940',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'factura',
        q: '¿Tienes factura del médico o sanitario y no es un seguro médico?',
      },
    ],
  },
  'canarias-guarderias': {
    box: '0924',
    norm: LAW,
    checks: [
      { kind: 'childUnder', age: 3 },
      {
        kind: 'ask',
        id: 'guarderia',
        q: '¿El menor convive contigo y tienes factura de una guardería autorizada con su NIF?',
      },
    ],
  },
  'canarias-estudios-superiores': {
    box: '0919',
    norm: LAW,
    checks: [
      { kind: 'childUnder', age: 25 },
      {
        kind: 'ask',
        id: 'hijo',
        q: '¿Tu hijo, soltero, a tu cargo y con rentas hasta 8.000 €, estudia fuera de tu isla o de tu municipio?',
      },
    ],
  },
  'canarias-estudios-no-superiores': {
    box: '0936',
    norm: LAW,
    checks: [
      ASK.minimum,
      {
        kind: 'ask',
        id: 'factura',
        q: '¿Tienes factura de los gastos escolares (infantil, básica o secundaria postobligatoria)?',
      },
    ],
  },
  'canarias-alquiler-vivienda-habitual': {
    box: '0928',
    norm: LAW,
    checks: [
      RENT_CONTRACT,
      {
        kind: 'ask',
        id: 'diez',
        q: '¿El alquiler anual supera el 10 % de tu base imponible?',
      },
    ],
  },
  'canarias-alquiler-dacion-en-pago': {
    box: '0942',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'dacion',
        q: '¿Entregaste tu vivienda al banco y ahora la alquilas con opción de compra a esa entidad?',
      },
    ],
  },
  'canarias-inversion-vivienda-habitual': {
    box: '0926',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'transitorio',
        q: '¿Compraste tu vivienda habitual antes de 2013 (o caso equivalente) y aplicas el régimen transitorio?',
      },
    ],
  },
  'canarias-obras-adecuacion-discapacidad': {
    box: '0927',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'discapacidad',
        q: '¿Tú o un familiar conviviente tenéis discapacidad del 65 % o más y tienes el certificado de necesidad de la Consejería?',
      },
    ],
  },
  'canarias-rehabilitacion-energetica': {
    box: '0939',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'certificados',
        q: '¿Pagaste por banco y tienes los certificados energéticos registrados de antes y después?',
      },
    ],
  },
  'canarias-restauracion-bienes-interes-cultural': {
    box: '0918',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'autorizacion',
        q: '¿El inmueble es Bien de Interés Cultural y las obras están autorizadas por la administración?',
      },
    ],
  },
  'canarias-puesta-viviendas-alquiler': {
    box: '2050',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vivienda',
        q: '¿La vivienda está en Canarias, no se alquilaba en 2024 y el contrato es de 3 años o más?',
      },
      {
        kind: 'ask',
        id: 'familia',
        q: '¿El inquilino no es tu cónyuge ni pariente hasta el tercer grado?',
      },
    ],
  },
  'canarias-adecuacion-inmueble-arrendamiento': {
    box: '2049',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'factura',
        q: '¿Es un alquiler de vivienda de la LAU y tienes factura de los gastos?',
      },
    ],
  },
  'canarias-seguros-credito-impago': {
    box: '0944',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'contrato',
        q: '¿El contrato es de un año o más, con fianza depositada, renta de hasta 800 € al mes y rentas declaradas como capital inmobiliario?',
      },
    ],
  },
  'canarias-donaciones-entidades-sin-lucro': {
    box: '0935',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'canarias-donaciones-ecologicas': {
    box: '0916',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'canarias-donaciones-culturales-deportivas': {
    box: '0934',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'canarias-donaciones-patrimonio-historico': {
    box: '0917',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'canarias-inversion-nuevas-empresas': {
    box: '2246',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'empresa',
        q: '¿La empresa tiene domicilio en Canarias y actividad económica, la mantendrás 3 años y no tienes funciones ejecutivas?',
      },
    ],
  },
  'canarias-traslado-otra-isla': {
    box: '0920',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'traslado',
        q: '¿Te trasladaste a otra isla por trabajo y seguirás allí el año del traslado y los tres siguientes?',
      },
    ],
  },
};
