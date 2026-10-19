import { ASK, type RequirementOverlay } from './types';

/**
 * La Rioja, Renta 2025. Rule: Ley 10/2017, de 27 de octubre, por la que se consolidan las
 * disposiciones legales de La Rioja en materia de impuestos propios y tributos cedidos. Boxes:
 * modelo 100 of 2025 (BOE-A-2026-7041), annex B. Requirements: AEAT «Guía de deducciones
 * autonómicas 2025, La Rioja». Checked 19-10-2026.
 */
const LAW = 'Ley 10/2017 de La Rioja (disposiciones legales en materia de tributos cedidos)';
const SMALL_TOWN = {
  kind: 'ask',
  id: 'municipio',
  q: '¿Vives a 31 de diciembre en un pequeño municipio de la lista oficial de La Rioja?',
} as const;
const FULL_INVOICE = {
  kind: 'ask',
  id: 'factura',
  q: '¿Es para ti, tu cónyuge o alguien que te da derecho a un mínimo, con factura completa (no simplificada)?',
} as const;
const OLD_REGIME = {
  kind: 'ask',
  id: 'transitorio',
  q: '¿Pagaste las obras antes del 1-1-2013, las terminaste antes de 2017 y ya aplicabas la deducción de vivienda antes de 2013?',
} as const;

export const laRiojaRequirements: RequirementOverlay = {
  'la-rioja-nacimiento-adopcion': {
    box: '1061',
    norm: LAW,
    checks: [
      ASK.bornThisYear,
      {
        kind: 'ask',
        id: 'convivencia',
        q: '¿El hijo convive contigo a 31 de diciembre?',
      },
    ],
  },
  'la-rioja-gastos-escuelas-infantiles-pequenos-municipios': {
    box: '1069',
    norm: LAW,
    // "0 to 3 years": a child who is 3 on 31 December still counts.
    checks: [{ kind: 'childUnder', age: 4 }, SMALL_TOWN, ASK.minimum],
  },
  'la-rioja-acogimiento-menores': {
    box: '1072',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'acogimiento',
        q: '¿Tienes un menor en acogimiento familiar (o guarda con fines de adopción) formalizado por el órgano competente de La Rioja?',
      },
    ],
  },
  'la-rioja-hijo-0-3-residentes-pequenos-municipios': {
    box: '1163',
    norm: LAW,
    checks: [
      { kind: 'childUnder', age: 4 },
      SMALL_TOWN,
      {
        kind: 'ask',
        id: 'permanencia',
        q: '¿El hijo te da derecho al mínimo por descendientes y mantendrás la residencia en el municipio al menos 3 años?',
      },
    ],
  },
  'la-rioja-hijo-0-3-escuelas-infantiles': {
    box: '1075',
    norm: LAW,
    checks: [
      { kind: 'childUnder', age: 4 },
      {
        kind: 'ask',
        id: 'matricula',
        q: '¿Tu hijo está matriculado en una escuela infantil de La Rioja?',
      },
      ASK.minimum,
    ],
  },
  'la-rioja-enfermos-ela': {
    box: '1785',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ela',
        q: '¿Son servicios o tratamientos por ELA prestados por profesionales sanitarios o para paliar sus síntomas?',
      },
      FULL_INVOICE,
    ],
  },
  'la-rioja-enfermedad-celiaca': {
    box: '2248',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'certificado',
        q: '¿Tienes un certificado con el diagnóstico definitivo de enfermedad celíaca, de un médico en activo con número de colegiado?',
      },
    ],
  },
  'la-rioja-fomento-ejercicio-fisico': {
    box: '1168',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'rioja',
        q: '¿Son servicios deportivos prestados en La Rioja?',
      },
      FULL_INVOICE,
    ],
  },
  'la-rioja-acceso-internet-jovenes': {
    box: '1080',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      {
        kind: 'ask',
        id: 'contrato',
        q: '¿Diste de alta a tu nombre un contrato nuevo de internet en tu vivienda habitual hace al menos 6 meses y lo mantienes?',
      },
    ],
  },
  'la-rioja-suministro-luz-gas-jovenes': {
    box: '1205',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      {
        kind: 'ask',
        id: 'contrato',
        q: '¿Tienes a tu nombre el contrato de luz o gas de tu vivienda habitual?',
      },
    ],
  },
  'la-rioja-fijacion-poblacion-medio-rural': {
    box: '2057',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'alta',
        q: '¿Te diste de alta como autónomo agrario en 2025 y mantienes la residencia y la actividad?',
      },
      {
        kind: 'ask',
        id: 'excluidos',
        q: '¿No eres autónomo colaborador ni socio de una sociedad de capital, ni cesaste otra actividad agraria en los 2 años anteriores?',
      },
    ],
  },
  'la-rioja-cuotas-organizaciones-agrarias': {
    box: '2056',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'certificado',
        q: '¿Tienes el certificado de la organización profesional agraria con las cuotas pagadas en 2025?',
      },
    ],
  },
  'la-rioja-vehiculos-electricos-nuevos': {
    box: '1079',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vehiculo',
        q: '¿Es un vehículo eléctrico nuevo de hasta 50.000 €, matriculado en 2025, con la factura a tu nombre y sin uso profesional?',
      },
    ],
  },
  'la-rioja-bicicletas-pedaleo-no-asistido': {
    box: '1166',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'factura',
        q: '¿La factura de la bicicleta está a tu nombre?',
      },
    ],
  },
  'la-rioja-inversion-vivienda-jovenes': {
    box: '1165',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      {
        kind: 'ask',
        id: 'fecha',
        q: '¿Compraste tu vivienda habitual, o empezaste a rehabilitarla, desde el 1-1-2013?',
      },
    ],
  },
  'la-rioja-arrendamiento-menores-36': {
    box: '1164',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      {
        kind: 'ask',
        id: 'contrato',
        q: '¿Alquilas tu vivienda habitual en La Rioja y se presentó el impuesto de transmisiones del contrato?',
      },
      {
        kind: 'ask',
        id: 'sin-inversion',
        q: '¿No aplicas ninguna deducción por inversión en vivienda?',
      },
    ],
  },
  'la-rioja-vivienda-pequenos-municipios': {
    box: '1068',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vivienda',
        q: '¿Compraste, rehabilitaste o empezaste a construir desde el 1-1-2017 tu vivienda habitual en un pequeño municipio de la lista oficial?',
      },
      {
        kind: 'ask',
        id: 'patrimonio',
        q: '¿Tu patrimonio aumentó en 2025 al menos lo que invertiste?',
      },
    ],
  },
  'la-rioja-segunda-vivienda-medio-rural': {
    box: '1065',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'transitorio',
        q: '¿Compraste la segunda vivienda en un municipio rural de la lista antes del 1-1-2013 (o pagaste antes las obras y terminaron antes de 2017)?',
      },
    ],
  },
  'la-rioja-intereses-prestamos-vivienda': {
    box: '1167',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vivienda',
        q: '¿Tu vivienda habitual está en La Rioja y la compraste con hipoteca desde el 1-1-2013?',
      },
      {
        kind: 'ask',
        id: 'incompatible',
        q: '¿No aplicas la deducción estatal por vivienda ni las riojanas de vivienda para jóvenes o en pequeños municipios?',
      },
    ],
  },
  'la-rioja-adquisicion-vivienda-jovenes': {
    box: '1063',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      {
        kind: 'ask',
        id: 'transitorio',
        q: '¿Compraste la vivienda (o pagaste su construcción) antes del 1-1-2013?',
      },
    ],
  },
  'la-rioja-obras-rehabilitacion-vivienda': {
    box: '1062',
    norm: LAW,
    checks: [OLD_REGIME],
  },
  'la-rioja-obras-adecuacion-discapacidad': {
    box: '1066',
    norm: LAW,
    checks: [
      OLD_REGIME,
      {
        kind: 'ask',
        id: 'informe',
        q: '¿Tienes el informe técnico que certifica las obras en tu vivienda de La Rioja?',
      },
    ],
  },
  // The guide gives only limits and incompatibilities, no requirement to ask.
  'la-rioja-donaciones-fomento-mecenazgo': {
    box: '0250',
    norm: LAW,
  },
  'la-rioja-donaciones-bienes-interes-cultural': {
    box: '0251',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'bien',
        q: '¿Son bienes en La Rioja de la Administración regional o declarados de interés cultural?',
      },
    ],
  },
  'la-rioja-donaciones-empresas-culturales': {
    box: '0252',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'empresa',
        q: '¿La empresa cultural tiene domicilio fiscal en La Rioja y fondos propios de menos de 300.000 €?',
      },
    ],
  },
  'la-rioja-donacion-bienes-culturales-autores': {
    box: '0253',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'aceptacion',
        q: '¿Eres el autor (o su heredero) y la Consejería de Cultura aceptó la donación del bien?',
      },
    ],
  },
  'la-rioja-patrimonio-historico-titulares': {
    box: '0254',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'registro',
        q: '¿Los bienes son tuyos (o en usufructo), están en el Registro del Patrimonio Cultural de La Rioja y no son una inversión empresarial?',
      },
    ],
  },
};
