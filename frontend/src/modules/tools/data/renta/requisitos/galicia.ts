import { ASK, type RequirementOverlay } from './types';

/**
 * Galicia, Renta 2025. Rule: Decreto Legislativo 1/2011, de 28 de julio, texto refundido de las
 * disposiciones legales de la Comunidad Autónoma de Galicia en materia de tributos cedidos. Boxes:
 * modelo 100 of 2025 (BOE-A-2026-7041), annex B. Requirements: AEAT «Guía de deducciones autonómicas
 * 2025, Galicia». Checked 19-10-2026.
 */
const LAW = 'Decreto Legislativo 1/2011 de Galicia (texto refundido de tributos cedidos)';
const COMPANY = {
  kind: 'ask',
  id: 'sociedad',
  q: '¿La sociedad tiene domicilio en Galicia, actividad económica y al menos un empleado a jornada completa, y tu participación (con familiares) está entre el 1 % y el 40 %?',
} as const;
const AID = {
  kind: 'ask',
  id: 'ayuda',
  q: '¿Incluiste esa ayuda en tu base imponible general de este año?',
} as const;

export const galiciaRequirements: RequirementOverlay = {
  'galicia-nacimiento-adopcion': {
    box: '1021',
    norm: LAW,
    checks: [ASK.bornThisYear, ASK.minimum],
  },
  'galicia-familias-dos-hijos': {
    box: '0822',
    norm: LAW,
    checks: [
      { kind: 'children', min: 2 },
      {
        kind: 'ask',
        id: 'incompatible',
        q: '¿No aplicas la deducción por familia numerosa?',
      },
    ],
  },
  'galicia-familia-numerosa': {
    box: '1022',
    norm: LAW,
    checks: [ASK.largeFamily],
  },
  'galicia-acogimiento-menores': {
    box: '1027',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'acogimiento',
        q: '¿El acogimiento lo formalizó la Xunta y no adoptaste al menor este año?',
      },
    ],
  },
  'galicia-cuidado-hijos-menores': {
    box: '1023',
    norm: LAW,
    checks: [
      { kind: 'childUnder', age: 4 },
      {
        kind: 'ask',
        id: 'trabajo',
        q: '¿Los dos progenitores trabajáis y estáis de alta en la Seguridad Social?',
      },
    ],
  },
  'galicia-discapacidad-65-ayuda-terceros': {
    box: '1024',
    norm: LAW,
    checks: [
      { kind: 'minAge', age: 65 },
      // The catalogue: «una discapacidad del 65 % o más».
      { kind: 'disability', min: 65 },
      {
        kind: 'ask',
        id: 'terceros',
        q: '¿Puedes acreditar que necesitas la ayuda de otra persona?',
      },
    ],
  },
  'galicia-ayudas-ela': {
    box: '2239',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ayuda',
        q: '¿Incluiste en tu base imponible general una ayuda pública para personas con ELA o sus fenotipos?',
      },
    ],
  },
  'galicia-ayudas-talidomida': {
    box: '2241',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ayuda',
        q: '¿Incluiste en tu base imponible general una ayuda por estar afectado por la talidomida?',
      },
    ],
  },
  'galicia-alquiler-vivienda-habitual': {
    box: '1026',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'edad',
        q: '¿Tienes 35 años o menos (en conjunta, basta con uno de los cónyuges)?',
      },
      {
        kind: 'ask',
        id: 'contrato',
        q: '¿El contrato es posterior a 2003 y la fianza está depositada en el Instituto Galego da Vivenda e Solo?',
      },
    ],
  },
  'galicia-climatizacion-renovables': {
    box: '1032',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'instalacion',
        q: '¿La instalación con energías renovables está en tu vivienda habitual y es solo para autoconsumo?',
      },
    ],
  },
  'galicia-eficiencia-energetica': {
    box: '0825',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'certificado',
        q: '¿Las obras mejoran al menos una letra el certificado energético inscrito en el registro gallego?',
      },
    ],
  },
  'galicia-aldeas-modelo': {
    box: '0230',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'aldea',
        q: '¿Compraste o empezaste a rehabilitar desde 2021 una vivienda de un proyecto de aldeas modelo para vivir en ella?',
      },
    ],
  },
  'galicia-rehabilitacion-centros-historicos': {
    box: '1034',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'obras',
        q: '¿Son obras de reconstrucción en un centro histórico que cuestan más del 25 % del valor del inmueble?',
      },
    ],
  },
  'galicia-adecuacion-inmueble-vacio': {
    box: '1078',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'alquiler',
        q: '¿El inmueble vale hasta 250.000 €, las obras acaban en dos años y lo alquilarás al menos tres años?',
      },
    ],
  },
  'galicia-arrendamiento-viviendas-vacias': {
    box: '1036',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vacia',
        q: '¿La vivienda en Galicia estuvo vacía al menos un año y el contrato es de tres años o más por hasta 700 € al mes?',
      },
      {
        kind: 'ask',
        id: 'inquilino',
        q: '¿El inquilino no es tu cónyuge ni pariente hasta el tercer grado?',
      },
    ],
  },
  'galicia-donaciones-investigacion': {
    box: '1031',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'entidad',
        q: '¿Donaste dinero a un centro de investigación gallego o a una entidad de la Ley 49/2002 y tienes el justificante?',
      },
    ],
  },
  'galicia-nuevas-tecnologias-hogares': {
    box: '1025',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'internet',
        q: '¿Pagaste una conexión a internet de alta velocidad en tu casa?',
      },
    ],
  },
  'galicia-inversion-entidades-nuevas': {
    box: '1028',
    norm: LAW,
    checks: [
      COMPANY,
      { kind: 'ask', id: 'plazo', q: '¿Mantendrás la participación al menos tres años?' },
    ],
  },
  'galicia-inversion-entidades-nuevas-financiacion': {
    box: '1029',
    norm: LAW,
    checks: [COMPANY],
  },
  'galicia-inversion-mercado-alternativo': {
    box: '1030',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'participacion',
        q: '¿No superas el 10 % del capital y mantendrás las acciones al menos tres años?',
      },
    ],
  },
  'galicia-inversion-actividades-agrarias': {
    box: '1035',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'inversion',
        q: '¿Mantendrás la inversión cinco años sin funciones ejecutivas ni relación laboral con la empresa durante diez?',
      },
    ],
  },
  'galicia-ayudas-deportistas-alto-nivel': {
    box: '0828',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'deportista',
        q: '¿Eres deportista de alto nivel reconocido por la Xunta y tu deporte no te da rendimientos de actividad económica?',
      },
      AID,
    ],
  },
  'galicia-inversion-proyectos-interes-publico': {
    box: '1077',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'entidad',
        q: '¿La entidad se dedica solo a proyectos declarados de especial interés público, social o económico?',
      },
    ],
  },
  'galicia-incendios-forestales-2025': {
    box: '2238',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ayuda',
        q: '¿Incluiste en tu base imponible general una ayuda de la Xunta del Decreto 76/2025 por los incendios de 2025?',
      },
    ],
  },
  'galicia-libros-texto-material-escolar': {
    box: '2240',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'factura',
        q: '¿Tienes facturas de libros de texto o material escolar emitidas entre el 1 de julio y el 31 de diciembre de 2025?',
      },
    ],
  },
};
