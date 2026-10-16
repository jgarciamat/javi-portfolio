import {
  ASSET_CLASSES,
  CHAPTERS,
  TOPICS,
  allGlossaryTerms,
  assetSearchText,
  chapterMinutes,
  findChapter,
  matchesQuery,
  riskBand,
} from '@modules/invest/domain/content';
import { IRPF_GLANCE, IVA_GLANCE } from '@modules/invest/domain/taxGlance';
import { CALC_IDS } from '@modules/invest/ui/calculators/Calculators';
import { CHART_IDS } from '@modules/invest/ui/charts/Charts';
import { linearTicks, logTicks } from '@modules/invest/ui/charts/Charts';

describe('asset classes', () => {
  it('has the 9 classes in order, each one complete', () => {
    expect(ASSET_CLASSES.map((a) => a.num)).toEqual(
      Array.from({ length: 9 }, (_, i) => String(i + 1).padStart(2, '0'))
    );
    expect(new Set(ASSET_CLASSES.map((a) => a.id)).size).toBe(9);
    for (const a of ASSET_CLASSES) {
      expect(a.what.length).toBeGreaterThan(40);
      expect(a.earns.length).toBeGreaterThan(40);
      expect(a.risk).toBeGreaterThanOrEqual(1);
      expect(a.risk).toBeLessThanOrEqual(7);
      expect(a.liquidity).toBeGreaterThanOrEqual(1);
      expect(a.liquidity).toBeLessThanOrEqual(5);
      expect(a.pros.length).toBeGreaterThan(1);
      expect(a.cons.length).toBeGreaterThan(1);
      expect(a.example.length).toBeGreaterThan(40);
      expect(a.tax.length).toBeGreaterThanOrEqual(4);
      expect(a.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('has no alternatives, collective lending or currencies class', () => {
    const ids = ASSET_CLASSES.map((a) => a.id);
    for (const gone of ['alternativas', 'prestamos', 'divisas']) expect(ids).not.toContain(gone);
    expect(ASSET_CLASSES[0].name).toBe('Renta variable / acciones');
    expect(ASSET_CLASSES[0].nameEn).toBe('Equities / stocks');
  });

  it('links classes to chapters that exist', () => {
    const linked = ASSET_CLASSES.filter((a) => a.chapterId);
    expect(linked.length).toBeGreaterThanOrEqual(4);
    for (const a of linked) expect(findChapter(a.chapterId as string)).toBeDefined();
    expect(CHAPTERS[0].id).toBe('acciones');
  });

  it('mentions the key tax rules of every class', () => {
    const text = (id: string) => ASSET_CLASSES.find((a) => a.id === id)?.tax.join(' ') ?? '';
    expect(text('renta-variable')).toMatch(/0029/);
    expect(text('cripto')).toMatch(/721/);
    expect(text('inmuebles')).toMatch(/IVA/);
    expect(text('inmuebles')).toMatch(/ITP/);
    expect(text('inmuebles')).toMatch(/AJD/);
    expect(text('materias-primas')).toMatch(/exentos de IVA/);
    expect(text('fondos-etf')).toMatch(/traspaso/i);
    expect(text('ahorro')).toMatch(/0027/);
  });

  it('classes risk in three bands and builds search text', () => {
    expect(riskBand(1)).toBe('low');
    expect(riskBand(2)).toBe('low');
    expect(riskBand(3)).toBe('mid');
    expect(riskBand(4)).toBe('mid');
    expect(riskBand(5)).toBe('high');
    expect(riskBand(7)).toBe('high');
    expect(assetSearchText(ASSET_CLASSES[0])).toContain('Renta variable');
    expect(matchesQuery('Fondos y ETF', ' etf ')).toBe(true);
    expect(matchesQuery('Fondos', 'xyz')).toBe(false);
  });
});

describe('chapters', () => {
  it('has unique chapters, in English and Spanish, with a glossary', () => {
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(CHAPTERS.length);
    expect(CHAPTERS.length).toBeGreaterThanOrEqual(11);
    const topics = new Set(TOPICS.map((t) => t.id));
    for (const c of CHAPTERS) {
      expect(c.title.length).toBeGreaterThan(10);
      expect(c.titleEn.length).toBeGreaterThan(10);
      expect(c.summaryEn.length).toBeGreaterThan(10);
      expect(topics.has(c.topic)).toBe(true);
      expect(c.glossary.length).toBeGreaterThanOrEqual(4);
      expect(c.blocks.filter((b) => b.k === 'key').length).toBeGreaterThan(0);
      expect(chapterMinutes(c)).toBeGreaterThanOrEqual(1);
    }
  });

  it('covers every topic asked for and uses every chart and calculator', () => {
    const titles = CHAPTERS.map((c) => c.title).join(' | ');
    for (const word of [
      'indexados',
      'ETF',
      'Interés compuesto',
      'acciones',
      'bonos',
      'blockchain',
      'apalancamiento',
      'monedas',
      'MiCA',
    ]) {
      expect(titles.toLowerCase()).toContain(word.toLowerCase());
    }
    const blocks = CHAPTERS.flatMap((c) => c.blocks);
    for (const id of CHART_IDS)
      expect(blocks.some((b) => b.k === 'chart' && b.id === id)).toBe(true);
    for (const id of CALC_IDS) expect(blocks.some((b) => b.k === 'calc' && b.id === id)).toBe(true);
    expect(blocks.some((b) => b.k === 'markets')).toBe(true);
  });

  it('describes every project asked for', () => {
    const text = JSON.stringify(CHAPTERS.find((c) => c.id === 'cripto-monedas-y-proyectos'));
    for (const name of ['Bitcoin', 'Ethereum', 'BNB', 'Solana', 'XRP', 'Cardano', 'USDT', 'USDC']) {
      expect(text).toContain(name);
    }
    expect(text).toContain('a fecha de redacción');
  });

  it('finds a chapter by id and lists glossary terms once, alphabetically', () => {
    expect(findChapter(CHAPTERS[0].id)).toBe(CHAPTERS[0]);
    expect(findChapter('nope')).toBeUndefined();
    const terms = allGlossaryTerms();
    const keys = terms.map((t) => t.term.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThan(40);
    expect(terms.map((t) => t.term)).toEqual(
      [...terms.map((t) => t.term)].sort((a, b) => a.localeCompare(b, 'es'))
    );
    expect(CHAPTERS.map((c) => c.id)).toContain(terms[0].chapterId);
  });

  it('estimates reading time from the words of a chapter', () => {
    const base = CHAPTERS[0];
    expect(chapterMinutes({ ...base, blocks: [{ k: 'p', t: 'hola' }] })).toBe(1);
    const words = Array.from({ length: 800 }, () => 'palabra').join(' ');
    expect(chapterMinutes({ ...base, blocks: [{ k: 'p', t: words }] })).toBe(4);
    expect(
      chapterMinutes({
        ...base,
        blocks: [
          { k: 'ul', items: [words] },
          { k: 'table', head: ['a'], rows: [[words]] },
          { k: 'chart', id: 'volatility' },
        ],
      })
    ).toBe(8);
  });
});

describe('tax tables at a glance', () => {
  it('has IRPF and IVA rows with their rule and where to look', () => {
    expect(IRPF_GLANCE.length).toBeGreaterThanOrEqual(8);
    expect(IVA_GLANCE.length).toBeGreaterThanOrEqual(6);
    for (const row of [...IRPF_GLANCE, ...IVA_GLANCE]) {
      expect(row.concept && row.rule && row.where).toBeTruthy();
    }
    expect(JSON.stringify(IRPF_GLANCE)).toMatch(/modelo 100/i);
    expect(JSON.stringify(IVA_GLANCE)).toMatch(/exent/i);
  });
});

describe('chart ticks', () => {
  it('gives round linear ticks', () => {
    expect(linearTicks(0, 100, 4)).toEqual([0, 25, 50, 75, 100]);
    expect(linearTicks(0, 1500)).toEqual([0, 500, 1000, 1500]);
    expect(linearTicks(-100, 0)).toEqual([-100, -75, -50, -25, 0]);
  });

  it('copes with a flat range', () => {
    expect(linearTicks(5, 5)).toEqual([5, 6]);
    expect(linearTicks(6, 3)).toEqual([6, 7]);
  });

  it('gives 1-2-5 ticks for a log axis', () => {
    expect(logTicks(90, 900)).toEqual([100, 200, 500]);
    expect(logTicks(20, 300).slice(0, 3)).toEqual([20, 50, 100]);
  });
});
