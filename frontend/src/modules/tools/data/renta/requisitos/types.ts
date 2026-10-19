import type { Check } from '../../../domain/rentaRequirements';

/**
 * The requirements of each deduction of a community, by id: the box of annex B of the modelo 100
 * where it goes, the checks (rentaRequirements.ts) and the rule it comes from. Kept apart from the
 * catalogue so each community can be checked against its law on its own.
 */
export type RequirementOverlay = Record<string, { box?: string; checks?: Check[]; norm?: string }>;

/** Questions asked by many deductions, in the same words. */
export const ASK = {
  invoice: {
    kind: 'ask',
    id: 'factura',
    q: '¿Tienes factura a tu nombre (o de quien te da el mínimo) y pagaste con tarjeta, transferencia o bizum, no en efectivo?',
  },
  health: {
    kind: 'ask',
    id: 'sanitario',
    q: '¿Es un gasto en un centro sanitario registrado, con factura con el concepto, pagado sin efectivo y sin que lo cubra un seguro ni la Seguridad Social?',
  },
  minimum: {
    kind: 'ask',
    id: 'minimo',
    q: '¿Los hijos por los que la aplicas te dan derecho al mínimo por descendientes y conviven contigo?',
  },
  largeFamily: {
    kind: 'ask',
    id: 'titulo',
    q: '¿Tienes el título de familia numerosa en vigor a 31 de diciembre?',
  },
  certificate: {
    kind: 'ask',
    id: 'certificado',
    q: '¿Tienes el certificado oficial de la discapacidad?',
  },
  bornThisYear: {
    kind: 'ask',
    id: 'nacimiento',
    q: '¿El hijo nació o lo adoptaste en 2025 (o lo acogiste ese año)?',
  },
  donationProof: {
    kind: 'ask',
    id: 'certificado-donacion',
    q: '¿Tienes el certificado de la entidad y pagaste sin efectivo?',
  },
} as const satisfies Record<string, Check>;
