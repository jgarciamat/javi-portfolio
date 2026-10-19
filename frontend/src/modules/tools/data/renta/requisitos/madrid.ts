import { ASK, type RequirementOverlay } from './types';

/**
 * Comunidad de Madrid, Renta 2025. Rule: Decreto Legislativo 1/2010, de 21 de octubre, texto
 * refundido de las disposiciones legales en materia de tributos cedidos. Boxes: modelo 100 of 2025
 * (BOE-A-2026-7041), annex B. Requirements: AEAT «Guía de deducciones autonómicas 2025, Comunidad de
 * Madrid». Checked 19-10-2026.
 */
const LAW =
  'Decreto Legislativo 1/2010 de la Comunidad de Madrid (texto refundido de tributos cedidos)';

export const madridRequirements: RequirementOverlay = {
  'madrid-nacimiento-adopcion-hijos': {
    box: '1039',
    norm: LAW,
    checks: [ASK.bornThisYear],
  },
  'madrid-adopcion-internacional': {
    box: '1040',
    norm: LAW,
    checks: [{ kind: 'ask', id: 'adopcion', q: '¿Adoptaste en el ámbito internacional en 2025?' }],
  },
  'madrid-acogimiento-familiar-menores': {
    box: '1041',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'acogimiento',
        q: '¿Tuviste acogido a un menor más de 183 días del año?',
      },
    ],
  },
  'madrid-acogimiento-no-remunerado-mayores': {
    box: '1042',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ayudas',
        q: '¿Acogiste sin cobrar a un mayor de 65 o a una persona con discapacidad, sin ayudas de la Comunidad de Madrid por ello?',
      },
      {
        kind: 'ask',
        id: 'parentesco',
        q: '¿Si es mayor de 65, no es pariente tuyo hasta el cuarto grado?',
      },
    ],
  },
  'madrid-cuidado-ascendientes': {
    box: '1115',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ascendiente',
        q: '¿Tienes un ascendiente que te da derecho al mínimo por ascendientes?',
      },
    ],
  },
  'madrid-cuidado-hijos-dependientes-discapacidad': {
    box: '1050',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'convivencia',
        q: '¿Convives con un hijo menor de 3 años o con un familiar mayor de 65 con dependencia o discapacidad del 33 % o más?',
      },
      {
        kind: 'ask',
        id: 'empleador',
        q: '¿Estás de alta como empleador de una persona empleada del hogar en la Seguridad Social?',
      },
    ],
  },
  'madrid-familias-dos-descendientes-ingresos-reducidos': {
    box: '1045',
    norm: LAW,
    checks: [{ kind: 'children', min: 2 }],
  },
  'madrid-obtencion-familia-numerosa': {
    box: '1120',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'titulo',
        q: '¿Obtuviste la condición de titular de familia numerosa en 2025 (o en 2023-2024 si es de categoría especial)?',
      },
    ],
  },
  'madrid-arrendamiento-vivienda-habitual': {
    box: '1043',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 39 },
      {
        kind: 'ask',
        id: 'titular',
        q: '¿Eres titular del contrato de alquiler de tu vivienda habitual?',
      },
    ],
  },
  'madrid-gastos-arrendamiento-viviendas': {
    box: '1116',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'gastos',
        q: '¿Pagaste gastos de viviendas que tienes alquiladas, como seguros de daños o de impago?',
      },
    ],
  },
  'madrid-arrendamiento-viviendas-vacias': {
    box: '2021',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vacia',
        q: '¿La vivienda estuvo vacía al menos un año, el contrato es de tres años o más y la fianza está depositada?',
      },
      {
        kind: 'ask',
        id: 'inquilino',
        q: '¿El inquilino no es tu cónyuge ni pariente hasta el tercer grado y tienes como mucho cinco viviendas?',
      },
    ],
  },
  'madrid-donativos-fundaciones-clubes': {
    box: '1049',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'entidad',
        q: '¿Donaste a una fundación de la Ley 1/1998 de Fundaciones de Madrid o a un club deportivo?',
      },
    ],
  },
  'madrid-incremento-costes-financiacion': {
    box: '2020',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vivienda',
        q: '¿Tu vivienda habitual costó 390.000 € o menos y no aplicas la deducción de intereses de menores de 30 años?',
      },
    ],
  },
  'madrid-cambio-residencia-despoblacion': {
    box: '2026',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 34 },
      {
        kind: 'ask',
        id: 'traslado',
        q: '¿Te mudaste a un municipio en riesgo de despoblación, comprando o alquilando allí tu vivienda habitual, y vivirás en él tres años más?',
      },
    ],
  },
  'madrid-adquisicion-vivienda-despoblacion': {
    box: '2027',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'compra',
        q: '¿Compraste desde 2024 tu vivienda habitual en un municipio en riesgo de despoblación teniendo menos de 35 años?',
      },
    ],
  },
  'madrid-vivienda-nacimiento-adopcion': {
    box: '1119',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'compra',
        q: '¿Compraste tu vivienda habitual desde 2023 por el nacimiento o la adopción de un hijo?',
      },
    ],
  },
  'madrid-intereses-vivienda-jovenes': {
    box: '1117',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 30 },
      {
        kind: 'ask',
        id: 'intereses',
        q: '¿Pagaste intereses del préstamo de tu vivienda habitual antes de cumplir 30 años?',
      },
    ],
  },
  'madrid-gastos-educativos': {
    box: '1044',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'estudios',
        q: '¿Tus hijos cursan 2.º ciclo de Infantil, enseñanza obligatoria o FP Básica en España?',
      },
    ],
  },
  'madrid-intereses-prestamos-estudios': {
    box: '1118',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'prestamo',
        q: '¿Es un préstamo de un banco para estudios de Grado, Máster o Doctorado tuyos, de tu cónyuge o de tus hijos con derecho al mínimo?',
      },
    ],
  },
  'madrid-inversion-acciones-nuevas-entidades': {
    box: '1046',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'participacion',
        q: '¿Mantendrás la participación al menos tres años y la empresa cumple los requisitos de sede, actividad y empleo?',
      },
    ],
  },
  'madrid-fomento-autoempleo-jovenes': {
    box: '1047',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'alta',
        q: '¿Te diste de alta en el censo de autónomos con menos de 35 años, trabajas sobre todo en Madrid y seguirás de alta al menos un año?',
      },
    ],
  },
  'madrid-inversion-mercado-alternativo-bursatil': {
    box: '1048',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'participacion',
        q: '¿Mantendrás las acciones dos años, no superas el 10 % del capital y la sociedad tiene domicilio en Madrid?',
      },
    ],
  },
  'madrid-inversion-nuevos-contribuyentes-extranjero': {
    box: '2030',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'residencia',
        q: '¿No fuiste residente en España en los cinco años anteriores y pasaste a serlo desde 2024?',
      },
      {
        kind: 'ask',
        id: 'inversion',
        q: '¿Mantendrás la inversión al menos seis años?',
      },
    ],
  },
};
