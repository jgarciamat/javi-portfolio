import { ASK, type RequirementOverlay } from './types';

/**
 * Andalucía, Renta 2025. Rule: Ley 5/2021, de 20 de octubre, de Tributos Cedidos de la Comunidad
 * Autónoma de Andalucía. Boxes: modelo 100 of 2025 (BOE-A-2026-7041), annex B.1. Requirements: AEAT
 * «Guía de deducciones autonómicas 2025, Andalucía». Checked 19-10-2026.
 */
const LAW = 'Ley 5/2021 de Tributos Cedidos de Andalucía';

export const andaluciaRequirements: RequirementOverlay = {
  'andalucia-nacimiento-adopcion-acogimiento': {
    box: '0850',
    norm: LAW,
    checks: [ASK.bornThisYear, ASK.minimum],
  },
  'andalucia-adopcion-internacional': {
    box: '0855',
    norm: LAW,
    checks: [{ kind: 'ask', id: 'adopcion', q: '¿Adoptaste en el ámbito internacional en 2025?' }],
  },
  'andalucia-familia-monoparental': {
    box: '0857',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'monoparental',
        q: '¿Eres padre o madre de familia monoparental (vives solo con tus hijos a tu cargo)?',
      },
    ],
  },
  'andalucia-familia-numerosa': { box: '0816', norm: LAW, checks: [ASK.largeFamily] },
  'andalucia-gastos-educativos': {
    box: '0849',
    norm: LAW,
    checks: [
      { kind: 'children', min: 1 },
      {
        kind: 'ask',
        id: 'idiomas',
        q: '¿Son clases de idiomas o informática de tus hijos, con factura o recibo?',
      },
    ],
  },
  'andalucia-contribuyente-discapacidad': {
    box: '0856',
    norm: LAW,
    checks: [{ kind: 'disability', min: 33 }],
  },
  'andalucia-conyuge-discapacidad': {
    box: '0864',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'conyuge',
        q: '¿Tu cónyuge o pareja de hecho inscrita tiene una discapacidad del 65 % o más y no presenta declaración individual?',
      },
    ],
  },
  'andalucia-asistencia-discapacidad': {
    box: '0860',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'asistencia',
        q: '¿Te da derecho al mínimo por discapacidad un familiar con discapacidad que convive contigo?',
      },
    ],
  },
  'andalucia-ayuda-domestica': {
    box: '0862',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'hogar',
        q: '¿Eres titular del hogar en la Seguridad Social, con hijos que dan derecho al mínimo y trabajando los dos (o tienes 75 años o más)?',
      },
    ],
  },
  'andalucia-vivienda-protegida-jovenes': {
    box: '0852',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vivienda',
        q: '¿Es una vivienda protegida, o tenías menos de 35 años al comprarla, dentro del régimen transitorio de 2012?',
      },
    ],
  },
  'andalucia-alquiler-vivienda-habitual': {
    box: '0853',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'perfil',
        q: '¿Tienes menos de 35 años, más de 65, una discapacidad o eres víctima de violencia de género o de terrorismo, y eres titular del contrato?',
      },
    ],
  },
  'andalucia-donativos-ecologicos': { box: '0851', norm: LAW, checks: [ASK.donationProof] },
  'andalucia-acciones-participaciones': {
    box: '0854',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'sociedad',
        q: '¿Tienes menos del 40 % (con familiares), no eres directivo ni empleado, está en escritura pública con sede en Andalucía y la mantendrás 3 años?',
      },
    ],
  },
  'andalucia-defensa-juridica-laboral': {
    box: '0863',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'laboral',
        q: '¿Pagaste abogado por un procedimiento laboral (despido, extinción o reclamación de cantidades) y tienes los justificantes?',
      },
    ],
  },
  'andalucia-ejercicio-fisico-deporte': {
    box: '0921',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'cuotas',
        q: '¿Pagaste tú las cuotas (tuyas, de tu cónyuge o de quien te da el mínimo) y tienes los justificantes?',
      },
    ],
  },
  'andalucia-gastos-veterinarios': {
    box: '1476',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'mascota',
        q: '¿Son gastos veterinarios de una mascota del año siguiente a su compra (tres si es adoptada) o de un perro de asistencia?',
      },
    ],
  },
  'andalucia-enfermedad-celiaca': {
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'informe',
        q: '¿Tienes el informe médico oficial con el diagnóstico definitivo de enfermedad celíaca?',
      },
    ],
  },
};
