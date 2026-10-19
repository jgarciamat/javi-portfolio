import { ASK, type RequirementOverlay } from './types';

/**
 * Illes Balears, Renta 2025. Rule: Decreto Legislativo 1/2014 (texto refundido of ceded taxes).
 * Boxes: modelo 100 of 2025 (BOE-A-2026-7041), annex B. Requirements: AEAT «Guía de deducciones
 * autonómicas 2025, Illes Balears». Checked 19-10-2026.
 */
const LAW = 'Decreto Legislativo 1/2014 de las Illes Balears (texto refundido de tributos cedidos)';
const IBAVI = {
  kind: 'ask',
  id: 'contrato',
  q: '¿El contrato es de un año o más, con la fianza depositada en el IBAVI y las rentas declaradas como capital inmobiliario?',
} as const;

export const balearesRequirements: RequirementOverlay = {
  'baleares-nacimiento': {
    box: '1718',
    norm: LAW,
    checks: [
      { kind: 'ask', id: 'nacimiento', q: '¿El hijo nació en 2025?' },
      { kind: 'ask', id: 'residente', q: '¿Ya vivías en Baleares en 2024?' },
    ],
  },
  'baleares-adopcion': {
    box: '1721',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'adopcion',
        q: '¿Adoptaste en 2025 (inscrito en el Registro Civil) a un hijo que no es de tu cónyuge o pareja?',
      },
      {
        kind: 'ask',
        id: 'ayudas',
        q: '¿No cobraste ayudas autonómicas por nacimiento por ese hijo?',
      },
    ],
  },
  'baleares-discapacidad-contribuyente-descendientes': {
    box: '0906',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'discapacidad',
        q: '¿Tú o alguien de tu unidad familiar tiene una discapacidad reconocida del 33 % o más?',
      },
    ],
  },
  'baleares-gastos-mayores-discapacidad': {
    box: '1698',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'persona',
        q: '¿Pagaste residencia, centro de día o cuidador para alguien de tu familia mayor de 65 años o con discapacidad?',
      },
      {
        kind: 'ask',
        id: 'pago',
        q: '¿Pagaste por banco (no en efectivo) y, si es un cuidador, está de alta en la Seguridad Social?',
      },
    ],
  },
  'baleares-conciliacion-menores-seis': {
    box: '0914',
    norm: LAW,
    checks: [
      { kind: 'childUnder', age: 6 },
      {
        kind: 'ask',
        id: 'trabajo',
        q: '¿Trabajas por cuenta ajena o propia y pagaste por banco, no en efectivo?',
      },
    ],
  },
  'baleares-libros-texto': {
    box: '0899',
    norm: LAW,
    checks: [ASK.minimum],
  },
  'baleares-idiomas-extraescolar': {
    box: '0900',
    norm: LAW,
    checks: [
      ASK.minimum,
      {
        kind: 'ask',
        id: 'clases',
        q: '¿Son clases extraescolares de idiomas en España, no estancias en el extranjero ni campamentos?',
      },
    ],
  },
  'baleares-estudios-superiores-fuera-isla': {
    box: '0908',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'estudios',
        q: '¿Tu hijo, que te da derecho al mínimo y gana hasta 8.000 €, estudia fuera de tu isla un curso completo o al menos 30 créditos?',
      },
    ],
  },
  'baleares-ela': {
    box: '0770',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ela',
        q: '¿Son gastos por la ELA tuya o de un hijo o ascendiente que te da derecho al mínimo?',
      },
    ],
  },
  'baleares-alquiler-vivienda-habitual': {
    box: '0907',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'situacion',
        q: '¿Tienes menos de 36 años, más de 65 sin trabajar, una discapacidad o eres familia numerosa o monoparental?',
      },
      {
        kind: 'ask',
        id: 'contrato',
        q: '¿El contrato es de un año o más y ni tú ni tu familia tenéis otra vivienda a menos de 70 km en la misma isla?',
      },
    ],
  },
  'baleares-arrendador-primas-seguros': {
    box: '0909',
    norm: LAW,
    checks: [IBAVI],
  },
  'baleares-arrendador-otros-gastos': {
    box: '1720',
    norm: LAW,
    checks: [
      IBAVI,
      {
        kind: 'ask',
        id: 'primera',
        q: '¿La vivienda no se alquiló en los 2 años anteriores, la renta no pasa de 15 €/m² al mes y es la primera vez que aplicas esta deducción?',
      },
    ],
  },
  'baleares-alquiler-traslado-laboral': {
    box: '0910',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'traslado',
        q: '¿Tu empresa te trasladó a otra isla balear por un máximo de 3 años, con la fianza depositada en el IBAVI?',
      },
    ],
  },
  'baleares-sostenibilidad-vivienda': {
    box: '0898',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'certificados',
        q: '¿La obra sube al menos un nivel la calificación energética, con certificados registrados antes y después?',
      },
    ],
  },
  'baleares-vivienda-ocupada-ilegalmente': {
    box: '2237',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ocupada',
        q: '¿La vivienda es tuya y está ocupada ilegalmente o con el desahucio suspendido por vulnerabilidad del inquilino?',
      },
    ],
  },
  'baleares-plazas-dificil-cobertura': {
    box: '1763',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'plaza',
        q: '¿Cobraste más de medio año el complemento de plaza de difícil cobertura, o eres policía nacional o guardia civil destinado en Baleares?',
      },
    ],
  },
  'baleares-donaciones-cultural': {
    box: '0902',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'baleares-donaciones-deportivo': {
    box: '0904',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'baleares-donaciones-investigacion': {
    box: '0901',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'baleares-donaciones-lengua-catalana': {
    box: '0905',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'baleares-donaciones-tercer-sector': {
    box: '0913',
    norm: LAW,
    checks: [
      ASK.donationProof,
      {
        kind: 'ask',
        id: 'registro',
        q: '¿La entidad está inscrita en el registro de la Consejería de Familias de Baleares?',
      },
    ],
  },
  'baleares-autoocupacion': {
    box: '1716',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'alta',
        q: '¿Te diste de alta por primera vez en el censo de empresarios para una actividad en Baleares y la mantendrás un año?',
      },
    ],
  },
  'baleares-inversion-nuevas-empresas': {
    box: '0903',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'empresa',
        q: '¿La empresa tiene domicilio en Baleares, actividad, un empleado y factura menos de 2 M€, y tu familia no pasa del 40 %?',
      },
      {
        kind: 'ask',
        id: 'mantener',
        q: '¿La inversión consta en escritura pública y la mantendrás 4 años?',
      },
    ],
  },
  'baleares-ayudas-emergencia-proteccion-civil': {
    box: '0915',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ayuda',
        q: '¿Declaras ayudas del Govern por daños en una zona declarada gravemente afectada por una emergencia?',
      },
    ],
  },
};
