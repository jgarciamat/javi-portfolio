import { type RequirementOverlay } from './types';

/**
 * Extremadura, Renta 2025. Rule: Decreto Legislativo 1/2018, texto refundido de las disposiciones
 * legales de la Comunidad Autónoma de Extremadura en materia de tributos cedidos. Boxes: modelo 100
 * of 2025 (BOE-A-2026-7041), annex B. Requirements: AEAT «Guía de deducciones autonómicas 2025,
 * Extremadura». Checked 19-10-2026.
 */
const LAW = 'Decreto Legislativo 1/2018 de Extremadura (texto refundido de tributos cedidos)';

export const extremaduraRequirements: RequirementOverlay = {
  'extremadura-acogimiento-menores': {
    box: '1013',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'convivencia',
        q: '¿Convives con el menor acogido más de 90 días en el año?',
      },
    ],
  },
  'extremadura-partos-multiples': {
    box: '1014',
    norm: LAW,
    checks: [{ kind: 'ask', id: 'multiple', q: '¿Tuviste un parto múltiple en 2025?' }],
  },
  'extremadura-cuidado-familiares-discapacidad': {
    box: '1012',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'convivencia',
        q: '¿Convive contigo al menos medio año un familiar con discapacidad, acreditado por los servicios sociales?',
      },
      {
        kind: 'ask',
        id: 'rentas',
        q: '¿Las rentas de ese familiar no pasan de 16.800 €?',
      },
    ],
  },
  'extremadura-cuidado-hijos-hasta-14': {
    box: '1017',
    norm: LAW,
    checks: [
      { kind: 'childUnder', age: 15 },
      {
        kind: 'ask',
        id: 'trabajo',
        q: '¿Trabajáis los dos progenitores y estáis de alta en la Seguridad Social?',
      },
      {
        kind: 'ask',
        id: 'justificante',
        q: '¿Tienes factura del cuidado o una empleada del hogar dada de alta?',
      },
    ],
  },
  'extremadura-contribuyentes-viudos': {
    box: '1018',
    norm: LAW,
    checks: [{ kind: 'ask', id: 'viudo', q: '¿Eres viudo o viuda?' }],
  },
  'extremadura-ayudas-ela': {
    box: '2010',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ayuda',
        q: '¿Cobraste una ayuda de la Junta de Extremadura para personas con ELA que declaras en la base imponible general?',
      },
    ],
  },
  'extremadura-enfermos-ela-familiares': {
    box: '2011',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ela',
        q: '¿Tienes ELA, o eres el cónyuge, descendiente o ascendiente de un enfermo de ELA que convive contigo o te da derecho al mínimo?',
      },
    ],
  },
  'extremadura-vivienda-jovenes-victimas-terrorismo': {
    box: '1010',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'colectivo',
        q: '¿Tienes menos de 36 años, o eres víctima del terrorismo, y resides en Extremadura?',
      },
      {
        kind: 'ask',
        id: 'protegida',
        q: '¿Es una vivienda nueva protegida?',
      },
    ],
  },
  'extremadura-alquiler-vivienda-habitual': {
    box: '1019',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'colectivo',
        q: '¿Tienes menos de 36 años, familia numerosa, eres ascendiente con dos hijos sin pensión de alimentos o tienes una discapacidad del 65 % o más?',
      },
      {
        kind: 'ask',
        id: 'otra-vivienda',
        q: '¿No tienes otra vivienda a menos de 75 km de la alquilada?',
      },
    ],
  },
  'extremadura-vivienda-zonas-rurales': {
    box: '1091',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'rural',
        q: '¿Compraste o rehabilitaste desde el 1-1-2022 tu vivienda habitual en un municipio o entidad local menor de menos de 3.000 habitantes?',
      },
    ],
  },
  'extremadura-residir-municipios-pequenos': {
    box: '1105',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'municipio',
        q: '¿Vives habitualmente (tú o tu cónyuge) en un municipio o entidad local menor de Extremadura de menos de 3.000 habitantes?',
      },
    ],
  },
  'extremadura-intereses-vivienda-jovenes': {
    box: '1910',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      {
        kind: 'ask',
        id: 'primera',
        q: '¿Es tu primera vivienda habitual, en Extremadura, comprada con un préstamo?',
      },
    ],
  },
  'extremadura-traslado-residencia': {
    box: '2009',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'traslado',
        q: '¿Trasladaste tu residencia habitual a Extremadura desde el 1-1-2025 y la mantendrás al menos tres años seguidos?',
      },
    ],
  },
  'extremadura-donaciones-cultura-deportistas': {
    box: '2008',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'entidad',
        q: '¿La entidad o el deportista tiene domicilio fiscal en Extremadura y la actividad está en el listado de la norma?',
      },
    ],
  },
  // Only income conditions (work income up to 12.000 €, other income up to 300 €), handled elsewhere.
  'extremadura-trabajo-dependiente': {
    box: '1011',
    norm: LAW,
  },
  'extremadura-material-escolar': {
    box: '1015',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'hijos',
        q: '¿Tienes hijos de 6 a 15 años por los que te corresponde el mínimo por descendientes?',
      },
    ],
  },
  'extremadura-inversion-acciones-participaciones': {
    box: '1016',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'sociedad',
        q: '¿La empresa tiene sede social y fiscal en Extremadura y actividad económica?',
      },
      {
        kind: 'ask',
        id: 'participacion',
        q: '¿Tu participación, con la de tu familia, no pasa del 40 %, la mantendrás 3 años y no tienes funciones ejecutivas?',
      },
    ],
  },
  'extremadura-arrendadores-viviendas-vacias': {
    box: '2006',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vacia',
        q: '¿La vivienda está en Extremadura, estuvo vacía al menos un año y la alquilas como vivienda habitual con contrato de al menos 3 años?',
      },
    ],
  },
  'extremadura-rehabilitacion-rural-alquiler': {
    box: '2007',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'obras',
        q: '¿Rehabilitaste una vivienda en zona rural para alquilarla, con obras de rehabilitación según la ley del IVA?',
      },
    ],
  },
};
