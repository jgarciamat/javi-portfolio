import { ASK, type RequirementOverlay } from './types';

/**
 * Castilla y León, Renta 2025. Rule: Decreto Legislativo 1/2013, de 12 de septiembre, texto refundido
 * de tributos propios y cedidos (arts. 3 a 10). Boxes: modelo 100 of 2025 (BOE-A-2026-7041), annex
 * B.4-B.5. Requirements: AEAT «Guía de deducciones autonómicas 2025, Castilla y León». Checked
 * 19-10-2026.
 */
const LAW = 'Decreto Legislativo 1/2013 de Castilla y León';
const BONO = {
  kind: 'ask',
  id: 'bono',
  q: '¿No cobraste el Bono Nacimiento de la Junta por ese hijo?',
} as const;
const RURAL = {
  kind: 'ask',
  id: 'rural',
  q: '¿La vivienda está en un pueblo de hasta 10.000 habitantes (3.000 si está a menos de 30 km de la capital de provincia)?',
} as const;
const BOTH_WORK = {
  kind: 'ask',
  id: 'trabajo',
  q: '¿Los dos progenitores (o tú, si vives solo con tus hijos) estáis de alta en la Seguridad Social por trabajar?',
} as const;
const NO_RESIDENCE = {
  kind: 'ask',
  id: 'residencia',
  q: '¿Tienes el certificado de discapacidad y no vives en una residencia pública o concertada de Castilla y León?',
} as const;

export const castillaYLeonRequirements: RequirementOverlay = {
  'castilla-y-leon-familia-numerosa': {
    box: '0985',
    norm: LAW,
    checks: [ASK.largeFamily, ASK.minimum],
  },
  'castilla-y-leon-familia-numerosa-discapacidad': {
    box: '0985',
    norm: LAW,
    checks: [
      ASK.largeFamily,
      {
        kind: 'ask',
        id: 'discapacidad',
        q: '¿Algún miembro de la familia numerosa tiene una discapacidad del 65 % o más con certificado?',
      },
    ],
  },
  'castilla-y-leon-nacimiento-adopcion': {
    box: '0986',
    norm: LAW,
    checks: [ASK.bornThisYear, ASK.minimum, BONO],
  },
  'castilla-y-leon-nacimiento-adopcion-rural': {
    box: '0986',
    norm: LAW,
    checks: [
      ASK.bornThisYear,
      ASK.minimum,
      BONO,
      {
        kind: 'ask',
        id: 'municipio',
        q: '¿Vives en un municipio o entidad local menor de hasta 5.000 habitantes?',
      },
    ],
  },
  'castilla-y-leon-nacimiento-adopcion-discapacidad': {
    box: '0986',
    norm: LAW,
    checks: [ASK.bornThisYear, ASK.certificate, BONO],
  },
  'castilla-y-leon-partos-adopciones-multiples': {
    box: '0987',
    norm: LAW,
    checks: [
      { kind: 'ask', id: 'multiple', q: '¿Fue un parto o una adopción múltiple en 2025?' },
      ASK.minimum,
      BONO,
    ],
  },
  'castilla-y-leon-partos-multiples-adicional': {
    box: '0988',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'anterior',
        q: '¿Tuviste un parto múltiple o una adopción simultánea en 2023 o en 2024?',
      },
    ],
  },
  'castilla-y-leon-gastos-adopcion': {
    box: '0992',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'registro',
        q: '¿La adopción se inscribió en el Registro Civil en 2025?',
      },
      ASK.minimum,
    ],
  },
  'castilla-y-leon-gastos-adopcion-internacional': {
    box: '0992',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'registro',
        q: '¿Es una adopción internacional inscrita en el Registro Civil en 2025?',
      },
      ASK.minimum,
    ],
  },
  'castilla-y-leon-cuidado-hijos-menores': {
    box: '0990',
    norm: LAW,
    checks: [
      { kind: 'childUnder', age: 4 },
      BOTH_WORK,
      {
        kind: 'ask',
        id: 'empleada',
        q: '¿La persona empleada del hogar está de alta en el Sistema Especial de Empleados de Hogar?',
      },
    ],
  },
  'castilla-y-leon-cuidado-hijos-guarderia': {
    box: '0990',
    norm: LAW,
    checks: [
      { kind: 'childUnder', age: 4 },
      BOTH_WORK,
      {
        kind: 'ask',
        id: 'centro',
        q: '¿El centro está en Castilla y León e inscrito en el registro de centros de conciliación?',
      },
    ],
  },
  'castilla-y-leon-cuotas-seguridad-social-hogar': {
    box: '0994',
    norm: LAW,
    checks: [
      { kind: 'childUnder', age: 4 },
      {
        kind: 'ask',
        id: 'empleada',
        q: '¿Pagaste cuotas de una persona empleada en el Sistema Especial de Empleados de Hogar?',
      },
    ],
  },
  'castilla-y-leon-discapacidad-contribuyente': {
    box: '0970',
    norm: LAW,
    checks: [{ kind: 'disability', min: 33 }, NO_RESIDENCE],
  },
  'castilla-y-leon-discapacidad-contribuyente-mayor-65': {
    box: '0970',
    norm: LAW,
    checks: [{ kind: 'minAge', age: 65 }, { kind: 'disability', min: 65 }, NO_RESIDENCE],
  },
  'castilla-y-leon-vivienda-jovenes-rural': {
    box: '0971',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      RURAL,
      {
        kind: 'ask',
        id: 'vivienda',
        q: '¿Es tu primera vivienda, nueva o rehabilitada desde 2023, de menos de 150.000 €?',
      },
    ],
  },
  'castilla-y-leon-rehabilitacion-subvencionada': {
    box: '0978',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'subvencion',
        q: '¿Cobraste en 2025 la subvención de los planes de vivienda de la Junta para esas obras?',
      },
    ],
  },
  'castilla-y-leon-rehabilitacion-rural-alquiler': {
    box: '0980',
    norm: LAW,
    checks: [
      RURAL,
      {
        kind: 'ask',
        id: 'alquiler',
        q: '¿La alquilas (o la ofreces) 5 años por hasta 300 € al mes a quien no es familiar, con la fianza depositada?',
      },
    ],
  },
  'castilla-y-leon-alquiler-jovenes': {
    box: '0975',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      {
        kind: 'ask',
        id: 'titular',
        q: '¿Eres titular del contrato de alquiler de tu vivienda habitual?',
      },
    ],
  },
  'castilla-y-leon-alquiler-jovenes-rural': {
    box: '0975',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      RURAL,
      {
        kind: 'ask',
        id: 'titular',
        q: '¿Eres titular del contrato de alquiler de tu vivienda habitual?',
      },
    ],
  },
  'castilla-y-leon-vivienda-nueva-construccion': {
    box: '0977',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'visado',
        q: '¿Es tu primera vivienda, con el visado del proyecto entre el 1-9-2011 y el 31-12-2012?',
      },
    ],
  },
  'castilla-y-leon-donaciones-fundaciones-patrimonio': {
    // With the other two of heritage, foundations and R&D, up to 10 % of the tax base.
    baseCap: { group: 'cyl-donaciones', share: 0.1 },
    box: '0972',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'castilla-y-leon-donaciones-investigacion': {
    // With the other two of heritage, foundations and R&D, up to 10 % of the tax base.
    baseCap: { group: 'cyl-donaciones', share: 0.1 },
    box: '0973',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'castilla-y-leon-inversion-patrimonio-historico-natural': {
    // With the other two of heritage, foundations and R&D, up to 10 % of the tax base.
    baseCap: { group: 'cyl-donaciones', share: 0.1 },
    box: '0974',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'autorizacion',
        q: '¿Las obras están autorizadas por la administración competente?',
      },
    ],
  },
  'castilla-y-leon-movilidad-sostenible': {
    box: '0799',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vehiculo',
        q: '¿Es un coche eléctrico o híbrido enchufable matriculado en 2025, de hasta 40.000 €, a tu nombre y no afecto a una actividad?',
      },
    ],
  },
  'castilla-y-leon-fomento-emprendimiento': {
    box: '0979',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'sociedad',
        q: '¿Es una sociedad con domicilio en Castilla y León que crea empleo, tienes entre el 0,5 % y el 45 % y la mantendrás 3 años, con certificado?',
      },
    ],
  },
};
