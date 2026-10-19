import { ASK, type RequirementOverlay } from './types';

/**
 * Aragón, Renta 2025. Rule: Decreto Legislativo 1/2005, de 26 de septiembre, texto refundido de las
 * disposiciones dictadas por la Comunidad Autónoma de Aragón en materia de tributos cedidos. Boxes:
 * modelo 100 of 2025 (BOE-A-2026-7041), annex B. Requirements: AEAT «Guía de deducciones autonómicas
 * 2025, Aragón». Checked 19-10-2026.
 */
const LAW = 'Decreto Legislativo 1/2005 de Aragón (texto refundido de tributos cedidos)';
const PAYMENT = {
  kind: 'ask',
  id: 'pago',
  q: '¿Tienes factura y pagaste por banco o con tarjeta?',
} as const;

export const aragonRequirements: RequirementOverlay = {
  'aragon-nacimiento-tercer-hijo': {
    box: '0866',
    norm: LAW,
    checks: [
      ASK.bornThisYear,
      {
        kind: 'ask',
        id: 'tercero',
        q: '¿Es tu tercer hijo o siguiente y convives con él?',
      },
    ],
  },
  'aragon-nacimiento-hijo-discapacidad': {
    box: '0867',
    norm: LAW,
    checks: [
      ASK.bornThisYear,
      {
        kind: 'ask',
        id: 'discapacidad',
        q: '¿Los servicios sociales le reconocieron la discapacidad antes de fin de año?',
      },
    ],
  },
  'aragon-adopcion-internacional': {
    box: '0868',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'adopcion',
        q: '¿La resolución judicial de la adopción internacional es de 2025?',
      },
    ],
  },
  'aragon-cuidado-dependientes': {
    box: '0869',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'convivencia',
        q: '¿La persona dependiente convive contigo al menos medio año y gana menos de 8.000 €?',
      },
    ],
  },
  'aragon-mayores-70': {
    box: '0878',
    norm: LAW,
    checks: [
      { kind: 'minAge', age: 70 },
      {
        kind: 'ask',
        id: 'rendimientos',
        q: '¿Tuviste algún rendimiento del trabajo o de una actividad económica?',
      },
    ],
  },
  'aragon-nacimiento-primer-segundo-hijo-pueblos': {
    box: '0880',
    norm: LAW,
    checks: [
      ASK.bornThisYear,
      {
        kind: 'ask',
        id: 'municipio',
        q: '¿Viviste este año y el anterior en un municipio aragonés de menos de 10.000 habitantes?',
      },
    ],
  },
  'aragon-guarderia-menores-3': {
    box: '0881',
    norm: LAW,
    checks: [{ kind: 'childUnder', age: 3 }, ASK.minimum, PAYMENT],
  },
  'aragon-libros-texto-material-escolar': {
    box: '0875',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'gasto',
        q: '¿Son libros de texto o material escolar de tus hijos (no equipos informáticos)?',
      },
    ],
  },
  'aragon-clases-apoyo-refuerzo': {
    box: '0885',
    norm: LAW,
    checks: [PAYMENT],
  },
  'aragon-formacion-autonomia-discapacidad': {
    box: '0888',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'menor',
        q: '¿Es formación para la autonomía de un hijo menor con discapacidad?',
      },
      PAYMENT,
    ],
  },
  'aragon-vivienda-victimas-terrorismo': {
    box: '0871',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vivienda',
        q: '¿Eres víctima del terrorismo y es tu primera vivienda habitual, nueva, protegida y en Aragón?',
      },
    ],
  },
  'aragon-vivienda-nucleos-rurales': {
    box: '0874',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      {
        kind: 'ask',
        id: 'vivienda',
        q: '¿Es tu primera vivienda, comprada o rehabilitada desde 2012 en un municipio de menos de 3.000 habitantes o entidad local menor?',
      },
    ],
  },
  'aragon-alquiler-dacion-en-pago': {
    box: '0876',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'dacion',
        q: '¿Entregaste tu vivienda en dación en pago de toda la hipoteca y la alquilas con opción de compra?',
      },
      {
        kind: 'ask',
        id: 'fianza',
        q: '¿La fianza está depositada en el órgano de vivienda de Aragón?',
      },
    ],
  },
  'aragon-residencia-municipios': {
    box: '1850',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'residencia',
        q: '¿Vives en un asentamiento de rango X y seguirás allí los cuatro años siguientes?',
      },
    ],
  },
  'aragon-donaciones-ecologicas-id': {
    box: '0870',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'entidad',
        q: '¿Donaste dinero a una entidad inscrita en los registros de Aragón con fines ecológicos o de investigación?',
      },
    ],
  },
  'aragon-arrendamiento-vivienda-social': {
    box: '0877',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vivienda',
        q: '¿Pusiste la vivienda a disposición del Gobierno de Aragón o de la gestora del Plan de Vivienda Social?',
      },
    ],
  },
  'aragon-acciones-mab': {
    box: '0872',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'participacion',
        q: '¿No superas el 10 % del capital, mantendrás las acciones dos años y la sociedad tiene domicilio en Aragón?',
      },
    ],
  },
  'aragon-acciones-entidades-nuevas': {
    box: '0873',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'sociedad',
        q: '¿La sociedad tiene domicilio en Aragón, cumple los requisitos de la deducción estatal y no tienes en ella funciones ejecutivas ni relación laboral?',
      },
    ],
  },
  'aragon-entidades-economia-social': {
    box: '0879',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'entidad',
        q: '¿Tienes como mucho el 40 % (con familiares), la entidad tiene un empleado a jornada completa y mantendrás la aportación cinco años?',
      },
    ],
  },
};
