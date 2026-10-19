import { ASK, type RequirementOverlay } from './types';

/**
 * Comunitat Valenciana, Renta 2025. Rule: Ley 13/1997, de 23 de diciembre, art. 4.Uno (as of 2025,
 * with Ley 5/2025 and Decreto-ley 1/2026). Boxes: modelo 100 of 2025 (Orden HAC/277/2026,
 * BOE-A-2026-7041), annex B.9-B.10. Requirements: AEAT «Guía de deducciones autonómicas 2025,
 * Comunitat Valenciana» (the url of each deduction). Checked 19-10-2026.
 */
const LAW = 'Ley 13/1997 de la Comunitat Valenciana, art. 4.Uno';

export const comunitatValencianaRequirements: RequirementOverlay = {
  'comunitat-valenciana-nacimiento-adopcion-acogimiento': {
    box: '1083',
    norm: LAW,
    checks: [ASK.bornThisYear, ASK.minimum],
  },
  'comunitat-valenciana-nacimiento-adopcion-multiples': {
    box: '1084',
    norm: LAW,
    checks: [
      { kind: 'ask', id: 'multiple', q: '¿Fue un parto o una adopción múltiple en 2025?' },
      ASK.minimum,
    ],
  },
  'comunitat-valenciana-nacimiento-hijo-discapacidad': {
    box: '1085',
    norm: LAW,
    checks: [ASK.bornThisYear, ASK.certificate, ASK.minimum],
  },
  'comunitat-valenciana-familia-numerosa-monoparental': {
    box: '1086',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'titulo',
        q: '¿Tienes el título de familia numerosa o de familia monoparental en vigor a 31 de diciembre y convives con la familia?',
      },
    ],
  },
  'comunitat-valenciana-custodia-guarderias': {
    box: '1087',
    norm: LAW,
    checks: [
      { kind: 'childUnder', age: 3 },
      {
        kind: 'ask',
        id: 'trabajo',
        q: '¿Los progenitores que conviven con el menor trabajan por cuenta propia o ajena?',
      },
      ASK.invoice,
    ],
  },
  'comunitat-valenciana-conciliacion': {
    box: '1088',
    norm: LAW,
    checks: [
      { kind: 'childUnder', age: 6 },
      {
        kind: 'ask',
        id: 'alta',
        q: '¿Eres la madre (o el padre, si ella falleció) y estuviste de alta en la Seguridad Social por tu trabajo con un hijo de 3 a 5 años?',
      },
    ],
  },
  'comunitat-valenciana-contribuyentes-discapacidad-65': {
    box: '1089',
    norm: LAW,
    checks: [
      { kind: 'minAge', age: 65 },
      { kind: 'disability', min: 33 },
      {
        kind: 'ask',
        id: 'prestacion',
        q: '¿Tu discapacidad no te da derecho a una prestación exenta del IRPF?',
      },
    ],
  },
  'comunitat-valenciana-ascendientes-mayores': {
    box: '1090',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'convivencia',
        q: '¿Conviviste al menos medio año con tu ascendiente de más de 75 años (o de más de 65 con discapacidad) y sus rentas no pasan de 8.000 €?',
      },
    ],
  },
  'comunitat-valenciana-empleados-hogar-indefinido': {
    box: '0801',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'contrato',
        q: '¿Contrataste de forma indefinida a una persona empleada de hogar dada de alta en la Seguridad Social, y tienes rentas del trabajo o de una actividad?',
      },
    ],
  },
  'comunitat-valenciana-dos-o-mas-descendientes': {
    box: '1104',
    norm: LAW,
    checks: [{ kind: 'children', min: 2 }, ASK.minimum],
  },
  'comunitat-valenciana-material-escolar': {
    box: '1106',
    norm: LAW,
    checks: [
      { kind: 'children', min: 1 },
      {
        kind: 'ask',
        id: 'paro',
        q: '¿Estuviste en paro e inscrito como demandante de empleo en 2025 (tú o tu pareja, si convivís)?',
      },
      ASK.invoice,
    ],
  },
  'comunitat-valenciana-fomento-formacion-musical': {
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'escuela',
        q: '¿Es una escuela inscrita en el registro valenciano, una sociedad de la Federación de Sociedades Musicales o un curso oficial?',
      },
      ASK.invoice,
    ],
  },
  'comunitat-valenciana-salud-bucodental': { box: '1959', norm: LAW, checks: [ASK.health] },
  'comunitat-valenciana-salud-optica': { box: '1959', norm: LAW, checks: [ASK.health] },
  'comunitat-valenciana-salud-mental': { box: '1959', norm: LAW, checks: [ASK.health] },
  'comunitat-valenciana-salud-cronicas-raras': { box: '1959', norm: LAW, checks: [ASK.health] },
  'comunitat-valenciana-salud-dano-cerebral-alzheimer': {
    box: '1959',
    norm: LAW,
    checks: [ASK.health],
  },
  'comunitat-valenciana-tratamientos-fertilidad': {
    box: '0806',
    norm: LAW,
    checks: [
      { kind: 'minAge', age: 40 },
      { kind: 'maxAge', age: 45 },
      {
        kind: 'ask',
        id: 'tratamiento',
        q: '¿Recibiste tú el tratamiento de fertilidad en un centro autorizado y lo pagaste en 2025?',
      },
    ],
  },
  'comunitat-valenciana-practica-deporte': {
    box: '1960',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'deporte',
        q: '¿Son cuotas de gimnasio o club, equipamiento de deporte federado, entrenador, fisioterapeuta, dietista o podólogo, tuyas, de tu cónyuge o de quien te da el mínimo?',
      },
      ASK.invoice,
    ],
  },
  'comunitat-valenciana-ayudas-erte-covid': {
    box: '1169',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ayuda',
        q: '¿Cobraste las ayudas de la Generalitat del Decreto ley 3/2020 y están dentro de tu base imponible?',
      },
    ],
  },
  'comunitat-valenciana-abonos-culturales': {
    box: '1113',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'abono',
        q: '¿Son abonos de entidades adheridas al convenio con Culturarts Generalitat, pagados sin efectivo?',
      },
    ],
  },
  'comunitat-valenciana-vehiculos-movilidad-personal': {
    box: '1180',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'vehiculo',
        q: '¿Compraste una bici, un kit eléctrico o un patinete nuevo, uno solo en el año, con factura a tu nombre y pagado sin efectivo?',
      },
    ],
  },
  'comunitat-valenciana-acciones-entidades-nuevas': {
    box: '1183',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'empresa',
        q: '¿Es una empresa nueva con sede social y fiscal en la Comunitat, con actividad y un empleado a jornada completa, en escritura pública, y mantendrás la inversión 3 años?',
      },
    ],
  },
  'comunitat-valenciana-dana-aportaciones-fondos-propios': {
    box: '1704',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'dana',
        q: '¿Aportaste fondos entre el 13-11-2024 y el 31-12-2025 a una empresa de la zona afectada por la DANA, con sede allí, actividad y un empleado?',
      },
    ],
  },
  'comunitat-valenciana-despoblamiento': {
    box: '1181',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'municipio',
        q: '¿Vives habitualmente en un municipio de la lista oficial de riesgo de despoblamiento?',
      },
    ],
  },
  'comunitat-valenciana-primera-vivienda-menores-35': {
    box: '1092',
    norm: LAW,
    checks: [
      { kind: 'maxAge', age: 35 },
      {
        kind: 'ask',
        id: 'primera',
        q: '¿Es tu primera vivienda habitual, la pagaste sin efectivo y tu patrimonio aumentó al menos lo invertido?',
      },
    ],
  },
  'comunitat-valenciana-vivienda-habitual-discapacidad': {
    box: '1093',
    norm: LAW,
    checks: [
      ASK.certificate,
      {
        kind: 'ask',
        id: 'compra',
        q: '¿Pagaste la compra de tu vivienda habitual sin efectivo y tu patrimonio aumentó al menos lo invertido?',
      },
    ],
  },
  'comunitat-valenciana-vivienda-ayudas-publicas': {
    box: '1094',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'ayuda',
        q: '¿Destinaste en 2025 una ayuda pública a comprar o rehabilitar tu vivienda habitual, pagando sin efectivo?',
      },
    ],
  },
  'comunitat-valenciana-arrendamiento-vivienda-habitual': {
    box: '1095',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'contrato',
        q: '¿Tu contrato de alquiler es de al menos un año, pagas sin efectivo, no tienes otra vivienda a menos de 50 km y no aplicas la deducción estatal por vivienda?',
      },
    ],
  },
  'comunitat-valenciana-arrendamiento-distinto-municipio': {
    box: '1097',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'traslado',
        q: '¿Alquilas en la Comunitat por tu trabajo a más de 50 km de tu vivienda anterior, eres titular del contrato y tu empleador no lo paga?',
      },
    ],
  },
  'comunitat-valenciana-arrendador-alquiler-asequible': {
    box: '1111',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'asequible',
        q: '¿El contrato empezó en 2025 como vivienda habitual del inquilino, con renta dentro del precio de referencia y la fianza depositada en la Generalitat?',
      },
    ],
  },
  'comunitat-valenciana-autoconsumo-energia-renovable': {
    box: '1962',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'registro',
        q: '¿La instalación está en una vivienda de la Comunitat y está inscrita en el registro correspondiente?',
      },
    ],
  },
  'comunitat-valenciana-obras-mejora-vivienda': {
    box: '1110',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'obras',
        q: '¿Son obras en tu vivienda habitual subvencionables por los planes de vivienda, con el NIF de quien las hizo y pagadas sin efectivo?',
      },
    ],
  },
  'comunitat-valenciana-obras-mejora-vivienda-2014-2015': {
    box: '1108',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'obras',
        q: '¿Hiciste las obras en 2014 o 2015 en tu vivienda habitual, con el NIF de quien las hizo y pagadas sin efectivo?',
      },
    ],
  },
  'comunitat-valenciana-incremento-costes-financiacion': {
    box: '0805',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'prestamo',
        q: '¿Tu préstamo es para comprar, rehabilitar o adaptar tu vivienda habitual y no aplicas la deducción estatal por vivienda?',
      },
    ],
  },
  'comunitat-valenciana-dana-danos-vivienda': {
    box: '1702',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'dana',
        q: '¿Tu vivienda habitual está en un municipio afectado por la DANA y pagaste las reparaciones sin efectivo?',
      },
    ],
  },
  'comunitat-valenciana-donaciones-finalidad-ecologica': {
    box: '1099',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'comunitat-valenciana-donaciones-patrimonio-cultural': {
    box: '1100',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'comunitat-valenciana-donativos-conservacion-bienes': {
    box: '1101',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'comunitat-valenciana-titulares-conservacion-bienes': {
    box: '1102',
    norm: LAW,
    checks: [
      {
        kind: 'ask',
        id: 'inventario',
        q: '¿El bien está inscrito en el Inventario General del Patrimonio Cultural Valenciano y pagaste sin efectivo?',
      },
    ],
  },
  'comunitat-valenciana-donaciones-lengua-valenciana': {
    box: '1103',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'comunitat-valenciana-donaciones-otros-fines-culturales': {
    box: '1112',
    norm: LAW,
    // With the other cultural and Valencian-language donations, up to 30 % of the tax base.
    baseCap: { group: 'cv-mecenazgo', share: 0.3 },
    checks: [ASK.donationProof],
  },
  'comunitat-valenciana-donaciones-investigacion-covid': {
    box: '1172',
    norm: LAW,
    checks: [ASK.donationProof],
  },
  'comunitat-valenciana-donaciones-gastos-covid': {
    box: '1173',
    norm: LAW,
    checks: [ASK.donationProof],
  },
};
