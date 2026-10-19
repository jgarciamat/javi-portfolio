import { ASK, type RequirementOverlay } from './types';

/**
 * Región de Murcia, Renta 2025. Rule: Decreto Legislativo 1/2010, de 5 de noviembre, texto refundido
 * de las disposiciones legales vigentes en la Región de Murcia en materia de tributos cedidos. Boxes:
 * modelo 100 of 2025 (BOE-A-2026-7041), annex B. Requirements: AEAT «Guía de deducciones autonómicas
 * 2025, Región de Murcia». Checked 19-10-2026.
 */
const LAW =
  'Decreto Legislativo 1/2010 de la Región de Murcia (texto refundido de tributos cedidos)';
const INVOICE = { kind: 'ask', id: 'factura', q: '¿Tienes factura del gasto?' } as const;
const NO_CREDIT = {
  kind: 'ask',
  id: 'credito',
  q: '¿Tienes el certificado y no aplicas por esa donación el crédito fiscal de la ley de mecenazgo regional?',
} as const;

export const murciaRequirements: RequirementOverlay = {
  'murcia-gastos-guarderia': {
    box: '1054',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'centro',
        q: '¿Pagaste un centro autorizado de primer ciclo de educación infantil para un hijo que convive contigo a fin de año?',
      },
    ],
  },
  'murcia-nacimiento-adopcion': {
    box: '1073',
    norm: LAW,
    checks: [ASK.bornThisYear, ASK.minimum],
  },
  'murcia-contribuyentes-discapacidad': {
    box: '1157',
    norm: LAW,
    checks: [{ kind: 'disability', min: 33 }, ASK.certificate],
  },
  // Covers both boxes 1158 (children) and 2033 (parents over 65): box left out.
  'murcia-conciliacion': {
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'empleador',
        q: '¿Estás de alta como empleador de una persona empleada del hogar en la Seguridad Social?',
      },
      {
        kind: 'ask',
        id: 'rentas',
        q: '¿Tú y tu pareja tenéis rentas del trabajo o de una actividad económica?',
      },
    ],
  },
  'murcia-acogimiento-no-remunerado': {
    box: '1161',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'convivencia',
        q: '¿Convivió contigo más de 183 días, empadronado, con certificado oficial y sin ayudas regionales por el acogimiento?',
      },
      {
        kind: 'ask',
        id: 'parentesco',
        q: '¿Si es mayor de 65, no es pariente tuyo hasta el cuarto grado?',
      },
    ],
  },
  'murcia-familia-monoparental': {
    box: '2035',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'monoparental',
        q: '¿Vives solo con tus hijos menores (o mayores con discapacidad) y ganan menos de 8.000 € al año?',
      },
    ],
  },
  'murcia-enfermedades-raras': {
    box: '2151',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'gasto',
        q: '¿Es un gasto por una enfermedad rara tuya, de tu cónyuge o de alguien que te da derecho al mínimo familiar, con factura?',
      },
    ],
  },
  'murcia-material-escolar': {
    box: '1059',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'gasto',
        q: '¿Compraste material escolar o libros de texto para tus hijos?',
      },
    ],
  },
  'murcia-mujeres-trabajadoras': {
    box: '1171',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'alta',
        q: '¿Eres mujer y estuviste de alta en la Seguridad Social por trabajo propio o ajeno?',
      },
    ],
  },
  'murcia-idiomas': {
    box: '2036',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'estudios',
        q: '¿Son clases extraescolares de idiomas de hijos con derecho al mínimo que cursan infantil (2.º ciclo), primaria, ESO, bachillerato o FP?',
      },
    ],
  },
  'murcia-internet': {
    box: '2037',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'alta',
        q: '¿Vives en un municipio murciano de menos de 15.000 habitantes y contrataste la línea este año, sin uso profesional ni simple cambio de compañía?',
      },
    ],
  },
  'murcia-cristales-lentes': {
    box: '2149',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'menor',
        q: '¿Son gafas o lentillas de un hijo con derecho al mínimo que tenía menos de 12 años al pagarlas?',
      },
    ],
  },
  'murcia-deporte': {
    box: '2150',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'gasto',
        q: '¿Son gastos de deporte tuyos, de tu cónyuge o de familiares con derecho al mínimo, con factura y sin cuotas de clubes sociales?',
      },
    ],
  },
  'murcia-veterinarios': {
    box: '2153',
    norm: LAW,
    checks: [INVOICE],
  },
  'murcia-vehiculos-electricos': {
    box: '2155',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vehiculo',
        q: '¿Es el único vehículo eléctrico que compraste este año?',
      },
    ],
  },
  'murcia-recarga-vehiculos-electricos': {
    box: '2157',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'instalacion',
        q: '¿Es tu única instalación del año, en una finca tuya o garaje comunitario, para uso particular, con factura, y la mantendrás dos años?',
      },
    ],
  },
  'murcia-acciones-entidades-nuevas': {
    box: '1057',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'sociedad',
        q: '¿Tienes como mucho el 40 % (con familiares), la empresa tiene sede en Murcia y un empleado a jornada completa?',
      },
      {
        kind: 'ask',
        id: 'plazo',
        q: '¿Mantendrás las acciones diez años sin cargo ejecutivo ni relación laboral en la empresa?',
      },
    ],
  },
  'murcia-acciones-mab': {
    box: '1058',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'participacion',
        q: '¿No superas el 10 % del capital, mantendrás las acciones dos años y la empresa tiene domicilio en Murcia y no gestiona patrimonio?',
      },
    ],
  },
  'murcia-economia-social': {
    box: '2152',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'entidad',
        q: '¿Tienes como mucho el 40 % (con familiares), la entidad tiene sede en Murcia y un empleado a jornada completa, y mantendrás la aportación cinco años?',
      },
    ],
  },
  'murcia-vivienda-jovenes': {
    box: '1052',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 40 },
      {
        kind: 'ask',
        id: 'vivienda',
        q: '¿Es tu vivienda habitual en Murcia, de nueva construcción o con rehabilitación protegida?',
      },
    ],
  },
  'murcia-ahorro-agua': {
    box: '1056',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'reconocimiento',
        q: '¿Es en tu vivienda habitual y tienes el reconocimiento previo de la Administración regional?',
      },
    ],
  },
  'murcia-energias-renovables': {
    box: '1055',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'instalacion',
        q: '¿La vivienda está en Murcia, tienes factura del instalador y no pagaste en efectivo?',
      },
    ],
  },
  'murcia-arrendamiento-vivienda-habitual': {
    box: '0991',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'condicion',
        q: '¿Tienes 40 años o menos, eres familia numerosa o tienes una discapacidad del 65 % o más?',
      },
      {
        kind: 'ask',
        id: 'contrato',
        q: '¿Presentaste el ITP del contrato y pagaste el alquiler sin efectivo?',
      },
    ],
  },
  'murcia-vivienda-familias-numerosas': {
    box: '0847',
    norm: LAW,
    checks: [
      ASK.largeFamily,
      {
        kind: 'ask',
        id: 'vivienda',
        q: '¿La compraste en 5 años desde que sois numerosa o desde el nacimiento de un hijo, es un 10 % más grande y venderás la anterior en 5 años?',
      },
    ],
  },
  'murcia-regimen-transitorio-vivienda': {
    box: '1052',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'anterior',
        q: '¿Aplicaste la deducción por esta vivienda en 1998, 1999 o 2000?',
      },
    ],
  },
  'murcia-donativos-cultura-y-sociales': {
    box: '1053',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'proyecto',
        q: '¿Donaste a un proyecto de la ley de mecenazgo de la Región de Murcia?',
      },
      NO_CREDIT,
    ],
  },
  'murcia-donativos-investigacion-biosanitaria': {
    box: '1060',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'entidad',
        q: '¿Donaste por transferencia a la Comunidad, a una universidad pública o a una entidad sin lucro inscrita?',
      },
      NO_CREDIT,
    ],
  },
  'murcia-donaciones-bienes-patrimonio-cultural': {
    box: '0846',
    norm: LAW,
    checks: [NO_CREDIT],
  },
};
