import { ASK, type RequirementOverlay } from './types';

/**
 * Cataluña, Renta 2025. Rule: Ley 31/2002 and later Catalan laws on the regional part of the IRPF.
 * Boxes: modelo 100 of 2025 (BOE-A-2026-7041), annex B. Requirements: AEAT «Guía de deducciones
 * autonómicas 2025, Cataluña». Checked 19-10-2026. Viudedad (only the year box 1936) and the old
 * housing regional tranche (main form, not annex B) have no box.
 */
const LAW = 'Ley 31/2002 y normas posteriores de Cataluña sobre el tramo autonómico del IRPF';

export const catalunaRequirements: RequirementOverlay = {
  'cataluna-nacimiento-adopcion-acogimiento': {
    box: '1000',
    norm: LAW,
    checks: [ASK.bornThisYear],
  },
  'cataluna-viudedad': {
    norm: LAW,
    checks: [
      { kind: 'ask', id: 'viudedad', q: '¿Te quedaste viudo o viuda en 2023, 2024 o 2025?' },
    ],
  },
  'cataluna-alquiler-vivienda-habitual': {
    box: '1003',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'situacion',
        q: '¿Tienes 35 años o menos, estuviste 183 días o más en paro, tienes discapacidad del 65 % o más, eres viudo/a de 65 o más o eres familia numerosa o monoparental?',
      },
      {
        kind: 'ask',
        id: 'arrendador',
        q: '¿Conoces el NIF del arrendador para ponerlo en la declaración?',
      },
    ],
  },
  'cataluna-rehabilitacion-vivienda-habitual': {
    box: '1006',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'rehabilitacion',
        q: '¿La obra es una rehabilitación (según el IRPF) de tu vivienda habitual o de la que va a serlo?',
      },
    ],
  },
  'cataluna-intereses-prestamos-master-doctorado': {
    box: '1005',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'agaur',
        q: '¿El préstamo te lo concedió la AGAUR y tienes su número de identificación?',
      },
    ],
  },
  'cataluna-donativos-lengua-catalana-occitana': {
    box: '1001',
    norm: LAW,
    checks: [
      ASK.donationProof,
      {
        kind: 'ask',
        id: 'censo',
        q: '¿La entidad figura en el censo de entidades de política lingüística de la Generalitat?',
      },
    ],
  },
  'cataluna-donativos-investigacion-innovacion': {
    box: '1002',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'cataluna-donaciones-medio-ambiente': {
    box: '1007',
    norm: LAW,
    checks: [
      ASK.donationProof,
      {
        kind: 'ask',
        id: 'censo',
        q: '¿La entidad figura en el censo de entidades ambientales de la Generalitat?',
      },
    ],
  },
  'cataluna-angel-inversor': {
    box: '1008',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'sociedad',
        q: '¿La sociedad tiene sede en Cataluña, factura hasta 1 millón de euros y tiene al menos un empleado a jornada completa?',
      },
      {
        kind: 'ask',
        id: 'participacion',
        q: '¿Tu participación no pasa del 35 %, la mantendrás 3 años y no tienes funciones directivas en ella?',
      },
    ],
  },
  'cataluna-mas-de-un-pagador': {
    box: '0824',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'pagadores',
        q: '¿Declaras solo por tener más de un pagador (el segundo y siguientes, más de 1.500 €) con un sueldo total de 15.876 € a 22.000 €?',
      },
    ],
  },
  'cataluna-alquiler-victimas-violencia-machista': {
    box: '2002',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'victima',
        q: '¿Tienes acreditada la condición de víctima de violencia machista y eres titular del contrato de alquiler?',
      },
      {
        kind: 'ask',
        id: 'anos',
        q: '¿Es como mucho el tercer año seguido que aplicas esta deducción?',
      },
    ],
  },
  'cataluna-cooperativas-agrarias-vivienda': {
    box: '2003',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'socio',
        q: '¿Eres socio no temporal, con hasta el 25 % de los votos, de una cooperativa agraria o de vivienda (no turística) inscrita en Cataluña, con su certificado?',
      },
      { kind: 'ask', id: 'mantener', q: '¿Mantendrás la aportación al menos 5 años?' },
    ],
  },
  'cataluna-tramo-autonomico-vivienda-habitual': {
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'transitorio',
        q: '¿Compraste tu vivienda habitual antes de 2013 y ya aplicabas la deducción por ella?',
      },
    ],
  },
};
