import type { LedgerResult } from './ledger';
import type { DeclarationRow } from './report';

/**
 * "Cómo declarar esto": the steps to copy what was imported into Renta WEB, in the order of the
 * program, only those that apply. The words are in the locales (tools.invest.guide.<id>); here, which
 * steps apply, their figures and their official sources (checked 19-10-2026).
 */

export interface Source {
  label: string;
  url: string;
}

export interface GuideStep {
  id: string;
  params?: Record<string, string | number>;
  sources: Source[];
  /** The step rests on something not confirmed in an official source. */
  unconfirmed?: boolean;
}

const MANUAL: Source = {
  label: 'AEAT, Manual práctico de Renta 2025',
  url: 'https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Manual/100.html',
};
const LAW: Source = {
  label: 'Ley 35/2006 del IRPF (texto consolidado, BOE)',
  url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764',
};
const MODEL: Source = {
  label: 'Orden HAC/277/2026: modelo 100 de 2025 (BOE-A-2026-7041)',
  url: 'https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf',
};
const CRYPTO_HELP: Source = {
  label: 'AEAT, ayuda de Renta 2025: ganancias y pérdidas por monedas virtuales',
  url: 'https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/7_6_6_2/ganancias_perdidas_monedas_virtuales.html',
};
const CRYPTO_MANUAL: Source = {
  label: 'AEAT, Manual de Renta 2025: compraventa de monedas virtuales',
  url: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales/monedas-virtuales/compra-venta-monedas-virtuales-tributacion-inversor.html',
};
const M721: Source = {
  label: 'Orden HFP/886/2023, modelo 721 (búsqueda en el BOE)',
  url: 'https://www.boe.es/buscar/boe.php?campo%5B0%5D=TIT&dato%5B0%5D=HFP%2F886%2F2023',
};
const M720: Source = {
  label: 'Orden HAP/72/2013, modelo 720 (búsqueda en el BOE)',
  url: 'https://www.boe.es/buscar/boe.php?campo%5B0%5D=TIT&dato%5B0%5D=HAP%2F72%2F2013',
};
const LGT: Source = {
  label: 'Ley 58/2003 General Tributaria, arts. 66 y 122 (BOE)',
  url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186',
};

const money = (n: number) => Math.round(n * 100) / 100;

/** The steps for what was imported (all the general ones when nothing was). */
export function guideSteps(ledger: LedgerResult | null, rows: DeclarationRow[]): GuideStep[] {
  const has = (section: DeclarationRow['section']) => rows.some((r) => r.section === section);
  const all = ledger === null;
  const warned = (code: string) => !!ledger?.warnings.some((w) => w.code === code);
  const amount = (code: string) => ledger?.warnings.find((w) => w.code === code)?.amount ?? 0;
  const c = ledger?.imported.capital;
  const imported = ledger?.imported ?? { generalGains: [], foreignTax: [] };
  const switchedOnly =
    !!ledger &&
    !has('iic') &&
    ledger.ops.some((o) => o.kind === 'switchOut' || o.kind === 'switchIn');
  const steps: (GuideStep | false)[] = [
    { id: 'before', sources: [MANUAL] },
    { id: 'draft', sources: [MANUAL] },
    (all || has('iic')) && { id: 'funds', sources: [MODEL, LAW, MANUAL] },
    (all || switchedOnly) && { id: 'onlySwitches', sources: [LAW] },
    (all || has('shares')) && { id: 'shares', sources: [MODEL, LAW] },
    (all || has('crypto')) && {
      id: 'crypto',
      sources: [CRYPTO_HELP, CRYPTO_MANUAL, MODEL],
      unconfirmed: true,
    },
    (all || has('other')) && { id: 'other', sources: [MODEL, LAW], unconfirmed: true },
    (all || !!(c && (c.interest || c.dividends || c.assets || c.expenses))) && {
      id: 'capital',
      sources: [MODEL, LAW],
      params: c
        ? { interest: money(c.interest), dividends: money(c.dividends), assets: money(c.assets) }
        : undefined,
    },
    (all || imported.generalGains.length > 0) && {
      id: 'general',
      sources: [LAW],
      unconfirmed: true,
    },
    (all || imported.foreignTax.length > 0) && {
      id: 'foreign',
      sources: [LAW, MODEL],
    },
    { id: 'losses', sources: [LAW, MODEL] },
    (all || warned('earlierYears')) && { id: 'earlier', sources: [LGT, MANUAL] },
    (all || warned('model721')) && {
      id: 'm721',
      sources: [M721],
      params: { amount: money(amount('model721')) },
    },
    (all || warned('model720')) && {
      id: 'm720',
      sources: [M720],
      params: { amount: money(amount('model720')) },
    },
    (all || warned('mining')) && { id: 'activity', sources: [LAW] },
    { id: 'deadline', sources: [MANUAL] },
    { id: 'rectify', sources: [LGT, MANUAL] },
    { id: 'keep', sources: [LGT] },
    { id: 'gestor', sources: [] },
  ];
  return steps.filter((s): s is GuideStep => s !== false);
}
