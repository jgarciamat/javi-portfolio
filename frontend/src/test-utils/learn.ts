import type { ChapterContent, ChapterTerm } from '@modules/invest/domain/types';

/**
 * Stand-ins for the text of the Premium chapters, which the app gets from the API: the same
 * charts and calculators as the real ones, so every embed can be drawn in the tests.
 */
const CONTENT: Record<string, Omit<ChapterContent, 'id'>> = {
  'fondos-indexados': {
    blocks: [
      { k: 'h', t: '1. Qué es un fondo indexado' },
      { k: 'key', t: 'Copia un índice entero con comisiones bajas.' },
      { k: 'chart', id: 'horizon' },
      { k: 'calc', id: 'compound' },
    ],
    glossary: [{ term: 'Tracking difference', def: 'Lo que el fondo se separa de su índice.' }],
  },
  'renta-fija-bonos': {
    blocks: [
      { k: 'key', t: 'Cuando suben los tipos, baja el precio de los bonos.' },
      { k: 'chart', id: 'bondCurve' },
      { k: 'calc', id: 'bond' },
    ],
    glossary: [{ term: 'Cupón', def: 'El interés que paga un bono.' }],
  },
  'cuanto-tributa': {
    blocks: [{ k: 'calc', id: 'tax' }],
    glossary: [],
  },
  'cripto-volatilidad-apalancamiento': {
    blocks: [
      { k: 'chart', id: 'volatility' },
      { k: 'chart', id: 'leverage' },
      { k: 'calc', id: 'crypto' },
    ],
    glossary: [],
  },
  'cripto-monedas-y-proyectos': {
    blocks: [{ k: 'sh', t: 'Bitcoin (BTC): la primera' }],
    glossary: [],
  },
};

/** The text the fake API answers for a Premium chapter. */
export function premiumContent(id: string): ChapterContent {
  return {
    id,
    ...(CONTENT[id] ?? { blocks: [{ k: 'p', t: `Texto del capítulo ${id}` }], glossary: [] }),
  };
}

/** The glossary terms of the Premium chapters the fake API answers. */
export const PREMIUM_TERMS: ChapterTerm[] = Object.entries(CONTENT).flatMap(([chapterId, c]) =>
  c.glossary.map((g) => ({ ...g, chapterId }))
);

/** The charts each chapter embeds (the free ones from the app, the rest as above). */
export const chartsOf = (blocks: ChapterContent['blocks']): string[] =>
  blocks.flatMap((b) => (b.k === 'chart' ? [b.id] : []));
