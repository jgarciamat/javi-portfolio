import { ASK, type RequirementOverlay } from './types';

/**
 * Cantabria, Renta 2025. Rule: Decreto Legislativo 62/2008, texto refundido de la Ley de medidas
 * fiscales en materia de tributos cedidos. Boxes: modelo 100 of 2025 (BOE-A-2026-7041), annex B.
 * Requirements: AEAT «Guía de deducciones autonómicas 2025, Cantabria». Checked 19-10-2026.
 */
const LAW = 'Decreto Legislativo 62/2008 de Cantabria (texto refundido de tributos cedidos)';
const RURAL = {
  kind: 'ask',
  id: 'municipio',
  q: '¿Tu residencia habitual está en un municipio en riesgo de despoblamiento de la Orden PRE/1/2025?',
} as const;
const BANK = {
  kind: 'ask',
  id: 'pago',
  q: '¿Lo pagaste con tarjeta, transferencia o cheque, no en efectivo?',
} as const;
const NURSERY = {
  kind: 'ask',
  id: 'factura',
  q: '¿La factura de la guardería está a tu nombre y la pagaste con tarjeta, transferencia o cheque?',
} as const;
const STAKE = {
  kind: 'ask',
  id: 'participacion',
  q: '¿Tu participación, con la de tu familia, no pasa del 40 % y la mantendrás el plazo exigido (3 años)?',
} as const;

export const cantabriaRequirements: RequirementOverlay = {
  'cantabria-nacimiento-adopcion': {
    box: '0774',
    norm: LAW,
    checks: [ASK.bornThisYear],
  },
  'cantabria-cuidado-familiares': {
    box: '0947',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'familiar',
        q: '¿Cuidas de un hijo menor de 3 años, un ascendiente mayor de 70 o un familiar con discapacidad del 65 % o más que convive contigo más de 183 días?',
      },
      {
        kind: 'ask',
        id: 'rentas',
        q: '¿Ese familiar tiene rentas de hasta 6.000 € (12.600 € si tiene discapacidad)?',
      },
    ],
  },
  'cantabria-acogimiento-familiar': {
    box: '0952',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'acogimiento',
        q: '¿Tienes un menor en acogimiento familiar como acogedor seleccionado por una entidad pública, sin ser familiar suyo ni haberlo adoptado en 2025?',
      },
    ],
  },
  'cantabria-familias-monoparentales': {
    box: '0775',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'monoparental',
        q: '¿Vives solo con tus hijos menores (o mayores incapacitados o con curatela representativa)?',
      },
    ],
  },
  'cantabria-gastos-guarderia': {
    box: '0772',
    norm: LAW,
    checks: [{ kind: 'childUnder', age: 3 }, NURSERY],
  },
  'cantabria-gastos-guarderia-despoblamiento': {
    box: '0820',
    norm: LAW,
    checks: [{ kind: 'childUnder', age: 3 }, RURAL, NURSERY],
  },
  'cantabria-ayuda-domestica': {
    box: '1711',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'empleador',
        q: '¿Eres el empleador de una persona que trabaja en tu vivienda habitual y está afiliada en Cantabria?',
      },
      {
        kind: 'ask',
        id: 'situacion',
        q: '¿Tienes hijos menores y trabajáis los dos progenitores, eres familia monoparental con ingresos del trabajo o tienes 75 años o más?',
      },
    ],
  },
  'cantabria-gastos-educacion': {
    box: '1710',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'factura',
        q: '¿Tienes factura de los gastos de educación y la pagaste con tarjeta, transferencia o cheque?',
      },
    ],
  },
  'cantabria-gastos-enfermedad': {
    box: '0954',
    norm: LAW,
    checks: [BANK],
  },
  'cantabria-gastos-traslado-estudios-despoblamiento': {
    box: '1707',
    norm: LAW,
    checks: [
      RURAL,
      {
        kind: 'ask',
        id: 'hijo',
        q: '¿Tu hijo se traslada a estudiar fuera del municipio y tiene rentas de hasta 8.000 €?',
      },
    ],
  },
  'cantabria-alquiler-vivienda-habitual': {
    box: '0946',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'colectivo',
        q: '¿Tienes menos de 36 años, 65 o más, o una discapacidad del 65 % o más?',
      },
      {
        kind: 'ask',
        id: 'alquiler',
        q: '¿Firmaste tú el contrato, el alquiler supera el 10 % de tu renta y lo pagas por banco, no en efectivo?',
      },
    ],
  },
  'cantabria-alquiler-despoblamiento-arrendatario': {
    box: '0818',
    norm: LAW,
    checks: [
      RURAL,
      {
        kind: 'ask',
        id: 'alquiler',
        q: '¿Es tu vivienda habitual alquilada y pagas el alquiler por banco, no en efectivo?',
      },
    ],
  },
  'cantabria-obras-mejora-vivienda': {
    box: '0948',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'obras',
        q: '¿Las obras son en una vivienda no afecta a una actividad (ni garaje ni piscina) y las pagaste por banco, no en efectivo?',
      },
    ],
  },
  'cantabria-arrendamiento-viviendas-vacias': {
    box: '1706',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vacia',
        q: '¿La vivienda estuvo vacía al menos un año y la alquilas 3 años o más por hasta 1.000 € al mes a quien no es familiar tuyo hasta el tercer grado?',
      },
      {
        kind: 'ask',
        id: 'viviendas',
        q: '¿Eres titular de 3 viviendas como mucho?',
      },
    ],
  },
  'cantabria-residencia-despoblamiento': {
    box: '1701',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 39 },
      {
        kind: 'ask',
        id: 'municipio',
        q: '¿Viviste todo 2025 en un municipio en riesgo de despoblamiento de la Orden PRE/1/2025?',
      },
    ],
  },
  'cantabria-traslado-municipio-despoblamiento': {
    box: '0821',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'traslado',
        q: '¿Trasladaste en 2025 tu residencia a un municipio en riesgo de despoblamiento por un trabajo por cuenta ajena?',
      },
      {
        kind: 'ask',
        id: 'permanencia',
        q: '¿Seguirás viviendo allí los tres años siguientes?',
      },
    ],
  },
  'cantabria-donativos-fundaciones-discapacidad': {
    box: '0951',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'entidad',
        q: '¿Donaste a una fundación inscrita que rinde cuentas, al Fondo Cantabria Coopera o a una asociación de apoyo a personas con discapacidad?',
      },
    ],
  },
  'cantabria-economia-social': {
    box: '0823',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'entidad',
        q: '¿Es una entidad de economía social establecida en Cantabria?',
      },
      {
        kind: 'ask',
        id: 'participacion',
        q: '¿Tu participación, con la de tu familia, no pasa del 40 % y la mantendrás el plazo exigido (5 años como socio)?',
      },
    ],
  },
  'cantabria-inversion-empresas-nuevas': {
    box: '0953',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'sociedad',
        q: '¿Es una pyme (SA, SL o laboral) con domicilio en Cantabria, con actividad económica y al menos un empleado a jornada completa?',
      },
      STAKE,
    ],
  },
  'cantabria-inversiones-nuevos-contribuyentes-extranjero': {
    box: '1708',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'residencia',
        q: '¿Te mudaste a Cantabria desde el extranjero y eres contribuyente aquí desde el 1-1-2025?',
      },
      {
        kind: 'ask',
        id: 'inversion',
        q: '¿Invertiste en inmuebles no residenciales (ni afectos a una actividad), deuda o participaciones, y los mantendrás 6 años?',
      },
    ],
  },
  'cantabria-nuevos-residentes-desplazamiento': {
    box: '0773',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'traslado',
        q: '¿Llegaste a Cantabria desde otra comunidad (o Ceuta o Melilla) sin haber vivido aquí los 4 años anteriores?',
      },
      {
        kind: 'ask',
        id: 'permanencia',
        q: '¿Mantendrás la residencia en Cantabria al menos 3 años?',
      },
    ],
  },
};
