/**
 * The communities of the common regime in the Renta 2024 (data/renta/ejercicios/2024-ccaa.ts). The
 * figures come from the Manual práctico de Renta 2024 of the AEAT (checked 22-10-2026): c15 for the
 * scales (the «cuota íntegra» column of each table and its worked example), c14 for the minimums
 * and tomo 2 for the deductions; or from a hand calculation with the rule in view.
 */
import {
  applyScale,
  deductionAmount,
  generalQuota,
  incomeFactor,
} from '@modules/tools/domain/rentaCalc';
import type { Deduction, RentaCcaa } from '@modules/tools/domain/rentaData';
import { CCAA_OPTIONS, loadCcaa } from '@modules/tools/data/renta';
import { loadCcaaFor, rentaRules } from '@modules/tools/data/renta/ejercicios';
import { regions2024 } from '@modules/tools/data/renta/ejercicios/2024-ccaa';
import { regionOfYear } from '@modules/tools/data/renta/ejercicios/regions';
import map2024 from '@modules/tools/data/renta/xml/casillas-2024.json';
import map2025 from '@modules/tools/data/renta/xml/casillas-2025.json';

const COMMON = Object.keys(regions2024);
const load = async (id: string) => (await loadCcaaFor(2024, id)) as RentaCcaa;
const find = (c: RentaCcaa, id: string) => c.deductions.find((d) => d.id === id) as Deduction;
const texts = (d: Deduction) =>
  [
    d.title,
    d.summary,
    d.requirements ?? '',
    d.incomeLimit?.note ?? '',
    ...(d.checks ?? []).map((c) => (c.kind === 'ask' ? c.q : '')),
  ].join('\n');

describe('Renta 2024: the 15 communities of the common regime', () => {
  it('are all of the drop-down but Ceuta, Melilla and the foral ones, and 2024 has them all', () => {
    const others = ['ceuta', 'melilla', 'navarra', 'pais-vasco'];
    expect(COMMON.sort()).toEqual(
      CCAA_OPTIONS.map((o) => o.id)
        .filter((id) => !others.includes(id))
        .sort()
    );
    expect(rentaRules(2024).regions).toBe('all');
    expect(rentaRules(2024).missing).toEqual(['modules']);
  });

  it.each(COMMON)('%s links only to the Manual of 2024', async (id) => {
    const c = await load(id);
    const json = JSON.stringify(c);
    expect(json).not.toContain('irpf-2025');
    expect(c.scaleSource).toMatch(/irpf-2024\/c15-.*\/gravamen-autonomico\//);
    expect(c.source).toContain('irpf-2024-deducciones-autonomicas');
  });
});

describe('the scales of 2024 (Manual 2024, c15)', () => {
  it('worked example of Aragón: 2,621.89 − 527.25 = 2,094.64 + 266 of savings = 2,360.64', async () => {
    const aragon = await load('aragon');
    const general = generalQuota(aragon.scale ?? [], 23900, 5550);
    const savings = applyScale(rentaRules(2024).extras.savingsScale.regional, 2800);
    expect(applyScale(aragon.scale ?? [], 23900)).toBe(2621.89);
    expect(general).toBe(2094.64);
    expect(general + savings).toBe(2360.64);
  });

  // The «cuota íntegra» column of the table of each community, at the start of some brackets. The
  // app rounds each bracket to the cent and the table does not: where a bracket leaves a fraction of
  // a cent (Asturias over 53,407.20 €, Canarias over 35,185 €) the two can differ by one cent.
  it.each([
    ['asturias', 33007.2, 4017.86],
    ['asturias', 53407.2, 7791.86],
    ['canarias', 19022, 1850.91],
    ['canarias', 35185, 4113.73],
    ['cataluna', 21000, 2399.1],
    ['cataluna', 175000, 36427.83],
  ])('%s: a base of %d € gives %d € (its own scale of 2024)', async (id, base, quota) => {
    expect(applyScale((await load(id)).scale ?? [], base)).toBe(quota);
  });

  it('Asturias, Canarias and Cataluña changed their scale in 2025; the other 12 did not', async () => {
    const changed: string[] = [];
    for (const id of COMMON) {
      const [y2024, y2025] = [await load(id), await loadCcaa(id)];
      if (JSON.stringify(y2024.scale) !== JSON.stringify(y2025.scale)) changed.push(id);
    }
    expect(changed.sort()).toEqual(['asturias', 'canarias', 'cataluna']);
  });

  it('Cataluña, 30,000 € of base: 3,749.10 − 582.75 = 3,166.35 in 2024 (3,127.75 in 2025)', async () => {
    // 2024: 2,399.10 up to 21,000 + 9,000 × 15 % = 3,749.10; minimum 5,550 × 10.5 % = 582.75.
    // 2025: 2,375 up to 22,000 + 8,000 × 16 % = 3,655; minimum 5,550 × 9.5 % = 527.25.
    expect(generalQuota((await load('cataluna')).scale ?? [], 30000, 5550)).toBe(3166.35);
    expect(generalQuota((await loadCcaa('cataluna')).scale ?? [], 30000, 5550)).toBe(3127.75);
  });
});

describe('the minimums of 2024 (Manual 2024, c14, cuadro comparativo)', () => {
  it('are those of 2025 but in Asturias, which had none of its own in 2024', async () => {
    for (const id of COMMON) {
      const [y2024, y2025] = [await load(id), await loadCcaa(id)];
      if (id === 'asturias') expect(y2024.minimums).toBeUndefined();
      else expect(y2024.minimums).toEqual(y2025.minimums);
    }
    expect((await loadCcaa('asturias')).minimums?.personal).toBe(6105);
  });
});

describe('the deductions of 2024 (Manual 2024, tomo 2)', () => {
  it('leave out those of 2025 with no page in 2024, and list those of 2024 not in the app', async () => {
    const counts: Record<string, number> = {};
    for (const id of COMMON) counts[id] = (await load(id)).deductions.length;
    expect(counts).toEqual({
      andalucia: 14,
      aragon: 19,
      asturias: 26,
      baleares: 23,
      canarias: 26,
      cantabria: 17,
      'castilla-la-mancha': 25,
      'castilla-y-leon': 25,
      cataluna: 11,
      'comunitat-valenciana': 43,
      extremadura: 13,
      galicia: 19,
      'la-rioja': 24,
      madrid: 23,
      murcia: 21,
    });
    expect((await load('aragon')).notInApp).toHaveLength(2);
    expect((await load('madrid')).notInApp).toBeUndefined();
  });

  it('every box of annex B is the same element of the XSD of 2024 as of 2025', async () => {
    const paths = (map: { casillas: Record<string, string[]> }, box: string) =>
      Object.entries(map.casillas)
        .filter(([, v]) => v[0] === box)
        .map(([p]) => p);
    for (const id of COMMON) {
      for (const d of (await load(id)).deductions) {
        if (!d.box) continue;
        const of2024 = paths(map2024, d.box);
        expect(of2024.length).toBeGreaterThan(0);
        expect(paths(map2025, d.box).some((p) => of2024.includes(p))).toBe(true);
      }
    }
  });

  it('every text change finds its words (none is lost when 2025 changes)', async () => {
    for (const [id, year] of Object.entries(regions2024)) {
      const c = await loadCcaa(id);
      const shifted = (d: Deduction) => {
        const t = texts(d);
        return year.changes[d.id]?.shiftYears
          ? t.replace(/\b(20[2-3]\d)\b/g, (y) => String(+y - 1))
          : t;
      };
      // Each community-wide change (but the birth question, the first, not asked in all) is used.
      let all = c.deductions.map(shifted);
      (year.replace ?? []).forEach(([from, to], i) => {
        if (i > 0) expect([id, all.some((t) => t.includes(from))]).toEqual([id, true]);
        all = all.map((t) => t.split(from).join(to));
      });
      for (const [did, change] of Object.entries(year.changes)) {
        let t = all[c.deductions.findIndex((d) => d.id === did)];
        for (const [from, to] of change.replace ?? []) {
          expect([did, t.includes(from)]).toEqual([did, true]);
          t = t.split(from).join(to);
        }
      }
    }
  });

  it('speak of 2024: only fixed dates of a rule mention 2025', async () => {
    const left: string[] = [];
    for (const id of COMMON)
      for (const d of (await load(id)).deductions) if (/2025|2026/.test(texts(d))) left.push(d.id);
    expect(left).toEqual([
      'asturias-vehiculos-electricos', // extended to 2024 and 2025
      'comunitat-valenciana-dana-aportaciones-fondos-propios', // from 13-11-2024 to 31-12-2025
      'comunitat-valenciana-dana-danos-vivienda', // only 2024 and 2025
    ]);
  });

  it('an unknown id in the changes is an error, not a change lost', async () => {
    const c = await loadCcaa('madrid');
    const year = { scaleSource: '', absent: ['madrid-x'], changes: {}, notInApp: [] };
    expect(() => regionOfYear(c, year)).toThrow('Unknown ids: madrid-x');
    // With nothing to change, the same deductions and minimums, and no list of missing ones.
    const same = regionOfYear(c, { ...year, absent: [] });
    expect(same.deductions).toEqual(c.deductions);
    expect(same.minimums).toEqual(c.minimums);
    expect(same.notInApp).toBeUndefined();
  });
});

describe('the figures that changed from 2024 to 2025', () => {
  const on = (amount: number, units?: number) => ({ on: true, amount, units });

  it('Andalucía, rent of 6,000 €: 15 % = 900, capped at 600 € in 2024 (1,200 € in 2025)', async () => {
    const d = find(await load('andalucia'), 'andalucia-alquiler-vivienda-habitual');
    expect(deductionAmount(d, on(6000))).toBe(600);
    const d25 = find(await loadCcaa('andalucia'), 'andalucia-alquiler-vivienda-habitual');
    expect(deductionAmount(d25, on(6000))).toBe(900);
  });

  it('Andalucía, birth: 200 € with a base up to 25,000 € (30,000 € joint), none above in 2024', async () => {
    const d = find(await load('andalucia'), 'andalucia-nacimiento-adopcion-acogimiento');
    expect([incomeFactor(d, 25000), incomeFactor(d, 25001), incomeFactor(d, 29000, true)]).toEqual([
      1, 0, 1,
    ]);
    const d25 = find(await loadCcaa('andalucia'), 'andalucia-nacimiento-adopcion-acogimiento');
    expect(incomeFactor(d25, 25001)).toBe(1);
  });

  it('Andalucía, protected home of 9,040 €: 5 % = 452 € in 2024 (6 % in 2025)', async () => {
    const d = find(await load('andalucia'), 'andalucia-vivienda-protegida-jovenes');
    expect(deductionAmount(d, on(10000))).toBe(452);
  });

  it('Asturias, three children up to 25: 500 + 600 + 600 = 1,700 € in 2024 (1,800 € in 2025)', async () => {
    const d = find(await load('asturias'), 'asturias-cuidado-descendientes-25');
    expect(deductionAmount(d, on(0, 3))).toBe(1700);
    const d25 = find(await loadCcaa('asturias'), 'asturias-cuidado-descendientes-25');
    expect(deductionAmount(d25, on(0, 3))).toBe(1800);
  });

  it('Castilla-La Mancha, rent of 4,000 €: 15 % = 600, capped at 450 € in 2024', async () => {
    const d = find(await load('castilla-la-mancha'), 'castilla-la-mancha-alquiler-menores-36');
    expect(deductionAmount(d, on(4000))).toBe(450);
    expect(d.requirements).toContain('12.500 euros');
  });

  it('Cataluña, rent of 5,000 €: 10 % = 500, capped at 300 € in 2024', async () => {
    const d = find(await load('cataluna'), 'cataluna-alquiler-vivienda-habitual');
    expect(deductionAmount(d, on(5000))).toBe(300);
    expect(find(await load('cataluna'), 'cataluna-nacimiento-adopcion-acogimiento').url).toContain(
      'nacimiento-adopcion-hijo-hija.html'
    );
  });

  it('Comunitat Valenciana, two children born in 2024: 300 + 300 = 600 € (2025: 600 + 750)', async () => {
    const d = find(
      await load('comunitat-valenciana'),
      'comunitat-valenciana-nacimiento-adopcion-acogimiento'
    );
    expect(deductionAmount(d, on(0, 2))).toBe(600);
    const id = 'comunitat-valenciana-nacimiento-adopcion-acogimiento';
    expect(deductionAmount(find(await loadCcaa('comunitat-valenciana'), id), on(0, 2))).toBe(1350);
  });

  it('Comunitat Valenciana, dentist with a base of 30,500 €: half the top in 2024, all of it in 2025', async () => {
    // 2024: (32,000 − 30,500) / (32,000 − 29,000) = 0.5; 2025: below 54,000 €, 1.
    const id = 'comunitat-valenciana-salud-bucodental';
    expect(incomeFactor(find(await load('comunitat-valenciana'), id), 30500)).toBe(0.5);
    expect(incomeFactor(find(await loadCcaa('comunitat-valenciana'), id), 30500)).toBe(1);
  });

  it('Murcia, disability of the taxpayer: 120 € in 2024 (150 € in 2025)', async () => {
    const d = find(await load('murcia'), 'murcia-contribuyentes-discapacidad');
    expect(deductionAmount(d, on(0, 1))).toBe(120);
  });

  it('Canarias: the income limits of 2024 (45,500 € and 60,500 €)', async () => {
    const d = find(await load('canarias'), 'canarias-guarderias');
    expect(d.requirements).toContain('45.500 € (individual) o 60.500 € (conjunta)');
    expect(find(await load('canarias'), 'canarias-desempleados').requirements).toContain(
      '11.200 €'
    );
  });
});
