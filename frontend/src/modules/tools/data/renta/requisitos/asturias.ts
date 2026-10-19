import { ASK, type RequirementOverlay } from './types';

/**
 * Principado de Asturias, Renta 2025. Rule: Decreto Legislativo 2/2014, texto refundido de las
 * disposiciones legales en materia de tributos cedidos. Boxes: modelo 100 of 2025 (BOE-A-2026-7041),
 * annex B. Requirements: AEAT «Guía de deducciones autonómicas 2025, Principado de Asturias».
 * Checked 19-10-2026.
 */
const LAW =
  'Decreto Legislativo 2/2014 del Principado de Asturias (texto refundido de tributos cedidos)';
const CONCEJO = {
  kind: 'ask',
  id: 'concejo',
  q: '¿Vives en un concejo en riesgo de despoblamiento o en crisis demográfica (Decreto 83/2025)?',
} as const;
const STAKE = {
  kind: 'ask',
  id: 'participacion',
  q: '¿Tu participación, con la de tu familia, no pasa del 40 % del capital y la mantendrás al menos 3 años?',
} as const;

export const asturiasRequirements: RequirementOverlay = {
  'asturias-acogimiento-mayores-65': {
    box: '0883',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'acogido',
        q: '¿Acoges sin cobrar a una persona de 65 años o más que no es familiar tuyo hasta el tercer grado?',
      },
      {
        kind: 'ask',
        id: 'documento',
        q: '¿Tienes el documento de la Consejería de servicios sociales y no recibes ayudas del Principado por ese acogimiento?',
      },
    ],
  },
  'asturias-adopcion-internacional': {
    box: '0889',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'registro',
        q: '¿Es una adopción internacional inscrita en el Registro Civil en 2025?',
      },
    ],
  },
  'asturias-partos-multiples': {
    box: '0890',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'multiple',
        q: '¿Fue un parto múltiple, o dos o más adopciones en la misma fecha, en 2025?',
      },
      {
        kind: 'ask',
        id: 'convivencia',
        q: '¿Los menores conviven contigo a 31 de diciembre?',
      },
    ],
  },
  'asturias-familia-numerosa': {
    box: '0891',
    norm: LAW,
    checks: [
      ASK.largeFamily,
      {
        kind: 'ask',
        id: 'convivencia',
        q: '¿Convives con la familia a 31 de diciembre?',
      },
    ],
  },
  'asturias-familia-monoparental': {
    box: '0892',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'monoparental',
        q: '¿Vives solo con tus hijos menores (o mayores con discapacidad) más de 183 días, sin custodia compartida?',
      },
      {
        kind: 'ask',
        id: 'rentas-hijos',
        q: '¿Cada uno de esos hijos gana menos de 8.000 € al año?',
      },
    ],
  },
  'asturias-acogimiento-familiar-menores': {
    box: '0893',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'acogimiento',
        q: '¿Tienes a un menor en acogimiento familiar de urgencia, temporal o permanente (no preadoptivo)?',
      },
    ],
  },
  'asturias-gastos-centros-0-3': {
    box: '0895',
    norm: LAW,
    // "0 to 3 years": a child who is 3 on 31 December still counts.
    checks: [
      { kind: 'childUnder', age: 4 },
      {
        kind: 'ask',
        id: 'centro',
        q: '¿Pagaste la guardería o el centro de 0 a 3 años de ese hijo?',
      },
    ],
  },
  'asturias-nacimiento-segundo-hijo-despoblamiento': {
    box: '0803',
    norm: LAW,
    checks: [
      ASK.bornThisYear,
      {
        kind: 'ask',
        id: 'segundo',
        q: '¿Es tu segundo hijo o siguiente y convive contigo a 31 de diciembre?',
      },
      CONCEJO,
    ],
  },
  'asturias-cuidado-descendientes-25': {
    box: '1848',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'convivencia',
        q: '¿Convives a 31 de diciembre con los hijos o descendientes de hasta 25 años por los que la aplicas?',
      },
    ],
  },
  'asturias-ayudas-ela': {
    box: '0819',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ayuda',
        q: '¿Cobraste una ayuda del Principado de Asturias para enfermos de ELA que declaras en la base imponible general?',
      },
    ],
  },
  'asturias-hijos-fallecimiento-accidente-laboral': {
    box: '1643',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'accidente',
        q: '¿El otro progenitor de tus hijos falleció en un accidente laboral?',
      },
      {
        kind: 'ask',
        id: 'minimo',
        q: '¿Los hijos comunes con el fallecido te dan derecho al mínimo por descendientes?',
      },
    ],
  },
  // Box omitted: the order of 2242 and 2245 in the annex is not clear.
  'asturias-enfermedad-celiaca': {
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'diagnostico',
        q: '¿La enfermedad celíaca está diagnosticada con un informe médico oficial y pagaste tú los gastos?',
      },
    ],
  },
  'asturias-vivienda-discapacidad': {
    box: '0884',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'discapacidad',
        q: '¿Tú, tu cónyuge o un familiar que convive contigo tiene discapacidad y la compra u obra es necesaria para su accesibilidad?',
      },
      {
        kind: 'ask',
        id: 'certificado',
        q: '¿Tienes el certificado de la Consejería que lo acredita?',
      },
    ],
  },
  'asturias-vivienda-protegida': {
    box: '0886',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'protegida',
        q: '¿Tu vivienda habitual es una vivienda protegida y tienes las facturas o el préstamo que lo justifican?',
      },
    ],
  },
  'asturias-alquiler-vivienda-habitual': {
    box: '0887',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'titular',
        q: '¿Eres titular del contrato de alquiler de tu vivienda habitual?',
      },
    ],
  },
  'asturias-vivienda-colectivos-despoblamiento': {
    box: '1556',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'concejo',
        q: '¿Compraste o rehabilitaste tu vivienda habitual en un concejo en riesgo de despoblamiento (Decreto 83/2025)?',
      },
      {
        kind: 'ask',
        id: 'permanencia',
        q: '¿Mantendrás tu domicilio fiscal en ese concejo al menos tres años?',
      },
    ],
  },
  'asturias-gastos-arrendamiento-viviendas': {
    box: '1628',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'alquiler',
        q: '¿Alquilas una vivienda que es la vivienda habitual del inquilino, con una renta que no pasa del índice estatal de referencia?',
      },
    ],
  },
  'asturias-gestion-forestal-sostenible': {
    box: '0894',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'certificacion',
        q: '¿Eres propietario de montes en Asturias y obtuviste en 2025 la certificación de gestión forestal sostenible?',
      },
    ],
  },
  'asturias-libros-texto-material-escolar': {
    box: '0896',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'hijos',
        q: '¿Compraste los libros o el material escolar para hijos por los que tienes el mínimo por descendientes?',
      },
    ],
  },
  'asturias-autonomos-despoblamiento': {
    box: '0812',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'alta',
        q: '¿Te diste de alta como autónomo en 2025 en un concejo en riesgo de despoblamiento y mantendrás el alta al menos un año?',
      },
      {
        kind: 'ask',
        id: 'actividad',
        q: '¿No cesaste en esa actividad en los 6 meses anteriores y no eres autónomo colaborador ni socio de una sociedad de capital?',
      },
    ],
  },
  'asturias-transporte-publico-despoblamiento': {
    box: '0813',
    norm: LAW,
    checks: [CONCEJO],
  },
  'asturias-formacion-id-cientifica': {
    box: '1557',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'puesto',
        q: '¿Trabajas en I+D en un puesto del grupo de cotización 1, con contrato o con un año de alta como autónomo?',
      },
      {
        kind: 'ask',
        id: 'plazo',
        q: '¿Acabaste la formación hace tres años o menos y residirás en Asturias al menos tres años?',
      },
    ],
  },
  'asturias-traslado-domicilio-laboral': {
    box: '0689',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'traslado',
        q: '¿Trasladaste tu domicilio fiscal a Asturias por un trabajo (contrato o alta como autónomo) sin haber vivido allí los 4 años anteriores?',
      },
      {
        kind: 'ask',
        id: 'permanencia',
        q: '¿Mantendrás la residencia en Asturias al menos 3 años?',
      },
    ],
  },
  'asturias-vehiculos-electricos': {
    box: '0811',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vehiculo',
        q: '¿Compraste a tu nombre un vehículo eléctrico de las categorías del programa MOVES III que no usas en una actividad económica?',
      },
    ],
  },
  'asturias-emancipacion-jovenes': {
    box: '1849',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      {
        kind: 'ask',
        id: 'emancipacion',
        q: '¿Dejaste de vivir con tus padres o abuelos y te fuiste a una vivienda habitual en Asturias?',
      },
    ],
  },
  'asturias-gastos-vitales-jovenes': {
    box: '1630',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      {
        kind: 'ask',
        id: 'factura',
        q: '¿Tienes factura de los gastos por los que la aplicas?',
      },
    ],
  },
  'asturias-acciones-entidades-nuevas': {
    box: '1683',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'sociedad',
        q: '¿Es una sociedad nueva o reciente con domicilio social y fiscal en Asturias, con actividad económica y que crea empleo?',
      },
      STAKE,
    ],
  },
};
