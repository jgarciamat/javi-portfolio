import { CCAA_OPTIONS, loadCcaa } from '@modules/tools/data/renta';
import { rentaState } from '@modules/tools/data/renta/state';
import type { Deduction } from '@modules/tools/domain/rentaData';
import {
  CHILD_WORDS,
  SPECIAL_IDS,
  isRelevant,
  normalize,
  type DraftSituation,
} from '@modules/tools/domain/rentaRelevance';

const d = (id: string, title: string, group: Deduction['group'] = 'other'): Deduction => ({
  id,
  group,
  title,
  summary: 's',
  kind: 'fixed',
  amount: 100,
  requirements: 'r',
  url: 'u',
});

/** A person of 40 with a job, no family, renting nothing, no disability. */
const BASE: DraftSituation = {
  childAges: [],
  ascendants: 0,
  disability: false,
  rents: false,
  age: 40,
  ownDisability: 0,
  childDisability: false,
  ascendantDisability: false,
  ascendantOver75: false,
  spouseDisability: false,
  mortgage: false,
  landlord: false,
  works: true,
  gross: 30000,
  singleParent: false,
  benefits: false,
  ccaaId: 'madrid',
};
const at = (over: Partial<DraftSituation>): DraftSituation => ({ ...BASE, ...over });
const relevant = (
  title: string,
  s: Partial<DraftSituation>,
  id = 'x',
  group?: Deduction['group']
) => isRelevant(d(id, title, group), at(s));

describe('who a deduction is for', () => {
  it('asks about donations whatever the words (they are about who receives them)', () => {
    expect(relevant('Donativos a fundaciones de discapacidad', {}, 'x', 'donations')).toBe(true);
  });

  it('leaves out what the app does not ask: widows, fostering, rural towns, illnesses', () => {
    for (const title of [
      'Para contribuyentes viudos',
      'Por acogimiento familiar de menores',
      'Por residir en municipios en riesgo de despoblación',
      'Para familias con enfermedad celíaca',
      'Vivienda de víctimas del terrorismo',
      'Ayudas por la DANA',
    ]) {
      expect({ title, ok: relevant(title, { childAges: [1], disability: true }) }).toEqual({
        title,
        ok: false,
      });
    }
    // Birth, adoption or fostering of a child is about the child, not about fostering.
    expect(relevant('Por nacimiento, adopción o acogimiento de hijos', { childAges: [0] })).toBe(
      true
    );
  });

  it('asks about children by their age: under 3, born this year, up to 14, 25', () => {
    expect(relevant('Por maternidad (hijos menores de 3 años)', { childAges: [2] })).toBe(true);
    expect(relevant('Por maternidad (hijos menores de 3 años)', { childAges: [3] })).toBe(false);
    expect(relevant('Gastos de guardería', { childAges: [1] })).toBe(true);
    expect(relevant('Gastos de guardería', { childAges: [4] })).toBe(false);
    expect(relevant('Por nacimiento de hijos', { childAges: [1] })).toBe(true);
    expect(relevant('Por nacimiento de hijos', { childAges: [2] })).toBe(false);
    expect(relevant('Cuidado de hijos de hasta 14 años', { childAges: [14] })).toBe(true);
    expect(relevant('Cuidado de hijos de hasta 14 años', { childAges: [15] })).toBe(false);
    expect(relevant('Por hijos y descendientes hasta 25 años', { childAges: [25] })).toBe(true);
    expect(relevant('Libros de texto', { childAges: [12] })).toBe(true);
    expect(relevant('Libros de texto', {})).toBe(false);
  });

  it('asks about large families with two children or more, a third child, twins', () => {
    expect(relevant('Por familia numerosa', { childAges: [5, 7] })).toBe(true);
    expect(relevant('Por familia numerosa', { childAges: [5] })).toBe(false);
    expect(relevant('Por nacimiento del tercer hijo', { childAges: [0, 4, 6] })).toBe(true);
    expect(relevant('Por nacimiento del tercer hijo', { childAges: [0, 4] })).toBe(false);
    expect(relevant('Por partos múltiples', { childAges: [0, 0] })).toBe(true);
    expect(relevant('Por partos múltiples', { childAges: [0, 3] })).toBe(false);
  });

  it('asks about a single-parent family with a child, unless filing with a spouse', () => {
    expect(relevant('Familias monoparentales', { childAges: [3], singleParent: null })).toBe(true);
    expect(relevant('Familias monoparentales', { childAges: [3], singleParent: true })).toBe(true);
    expect(relevant('Familias monoparentales', { childAges: [3], singleParent: false })).toBe(
      false
    );
    expect(relevant('Familias monoparentales', { singleParent: true })).toBe(false);
    // Either part of «numerosa o monoparental».
    expect(relevant('Por familia numerosa o monoparental', { childAges: [3, 5] })).toBe(true);
    expect(
      relevant('Por familia numerosa o monoparental', { childAges: [3], singleParent: null })
    ).toBe(true);
    expect(relevant('Por familia numerosa o monoparental', { childAges: [3] })).toBe(false);
  });

  it('tells apart the disability of the person, a child, a parent and the spouse', () => {
    expect(relevant('Por hijo con discapacidad', { childAges: [8], childDisability: true })).toBe(
      true
    );
    expect(relevant('Por hijo con discapacidad', { childAges: [8], disability: true })).toBe(false);
    expect(
      relevant('Nacimiento de un hijo con discapacidad', { childAges: [0], childDisability: true })
    ).toBe(true);
    expect(
      relevant('Nacimiento de un hijo con discapacidad', { childAges: [5], childDisability: true })
    ).toBe(false);
    expect(relevant('Por ascendiente con discapacidad', { ascendantDisability: true })).toBe(true);
    expect(relevant('Por ascendiente con discapacidad', { disability: true })).toBe(false);
    expect(relevant('Contribuyentes con discapacidad', { ownDisability: 33 })).toBe(true);
    expect(relevant('Contribuyentes con discapacidad', { disability: true })).toBe(false);
    expect(relevant('Asistencia a personas con discapacidad', { disability: true })).toBe(true);
    expect(relevant('Por cónyuge con discapacidad', { spouseDisability: true })).toBe(true);
    expect(relevant('Por cónyuge con discapacidad', { spouseDisability: null })).toBe(true);
    expect(relevant('Por cónyuge con discapacidad', {})).toBe(false);
  });

  it('asks about parents, and about the ones over 75', () => {
    expect(relevant('Por cuidado de ascendientes', { ascendants: 1 })).toBe(true);
    expect(relevant('Por cuidado de ascendientes', {})).toBe(false);
    expect(
      relevant('Cuidado de ascendientes mayores de 75', { ascendants: 1, ascendantOver75: true })
    ).toBe(true);
    expect(relevant('Cuidado de ascendientes mayores de 75', { ascendants: 1 })).toBe(false);
  });

  it('asks about the person’s own age: over 70, under 36 or young', () => {
    expect(relevant('Para mayores de 70 años', { age: 70 })).toBe(true);
    expect(relevant('Para mayores de 70 años', { age: 69 })).toBe(false);
    expect(relevant('Alquiler para menores de 36 años', { age: 35, rents: true })).toBe(true);
    expect(relevant('Alquiler para menores de 36 años', { age: 36, rents: true })).toBe(false);
    expect(relevant('Alquiler para menores de 36 años', { age: 30, rents: false })).toBe(false);
    expect(relevant('Emancipación de jóvenes hasta 35 años', { age: 35 })).toBe(true);
    expect(relevant('Emancipación de jóvenes hasta 35 años', { age: 36 })).toBe(false);
    expect(relevant('Luz y gas para jóvenes', { age: 35 })).toBe(true);
    expect(relevant('Luz y gas para jóvenes', { age: 36 })).toBe(false);
    expect(relevant('x', { age: 31 }, 'intereses-vivienda-menores-30')).toBe(false);
    // Without an age (a draft may not have it), they are asked about.
    expect(relevant('Para mayores de 70 años', { age: null })).toBe(true);
    expect(relevant('Luz y gas para jóvenes', { age: undefined })).toBe(true);
  });

  it('asks about work, unemployment and everyday expenses', () => {
    expect(relevant('Defensa jurídica de la relación laboral', { works: true })).toBe(true);
    expect(relevant('Defensa jurídica de la relación laboral', { works: false })).toBe(false);
    expect(relevant('Defensa jurídica de la relación laboral', { works: null })).toBe(true);
    expect(relevant('Contribuyentes desempleados', { benefits: true })).toBe(true);
    expect(relevant('Contribuyentes desempleados', {})).toBe(false);
    expect(relevant('Por gastos veterinarios', {})).toBe(true);
    expect(relevant('Inversión en empresas nuevas', {})).toBe(false);
  });
});

describe('what a deduction asks of the home', () => {
  it('tells apart the landlord, the tenant and the owner', () => {
    expect(relevant('Arrendar viviendas vacías', { landlord: true }, 'x', 'housing')).toBe(true);
    expect(relevant('Arrendar viviendas vacías', {}, 'x', 'housing')).toBe(false);
    expect(relevant('Arrendar viviendas vacías', { landlord: undefined }, 'x', 'housing')).toBe(
      true
    );
    expect(relevant('Alquiler de la vivienda habitual', { rents: true }, 'x', 'housing')).toBe(
      true
    );
    expect(relevant('Alquiler de la vivienda habitual', { rents: null }, 'x', 'housing')).toBe(
      true
    );
    expect(relevant('Alquiler de la vivienda habitual', {}, 'x', 'housing')).toBe(false);
  });

  it('asks about the mortgage before 2013, and about any mortgage of an owner', () => {
    expect(relevant('Vivienda comprada antes de 2013', { mortgage: true }, 'x', 'housing')).toBe(
      true
    );
    expect(relevant('Vivienda comprada antes de 2013', {}, 'x', 'housing')).toBe(false);
    expect(relevant('Subida de intereses de la hipoteca', {}, 'x', 'housing')).toBe(true);
    expect(relevant('Subida de intereses de la hipoteca', { rents: true }, 'x', 'housing')).toBe(
      false
    );
    expect(relevant('Obras de mejora', { rents: true, mortgage: true }, 'x', 'housing')).toBe(true);
  });

  it('needs both the person and the home when a deduction names both', () => {
    const title = 'Alquiler de vivienda habitual para familias numerosas';
    expect(relevant(title, { rents: true, childAges: [1, 2] })).toBe(true);
    expect(relevant(title, { rents: false, childAges: [1, 2] })).toBe(false);
    expect(relevant(title, { rents: true, childAges: [1] })).toBe(false);
  });

  it('asks about a housing, health or education expense that names no profile', () => {
    expect(relevant('Dentista', {}, 'x', 'health')).toBe(true);
    expect(relevant('Formación musical', {}, 'x', 'education')).toBe(true);
    expect(relevant('Otra cosa', {}, 'x', 'family')).toBe(false);
  });
});

describe('a draft, which says less than the questions', () => {
  // Only what a draft gives: children, parents, any disability and the rent.
  const draft = (over: Partial<DraftSituation> = {}): DraftSituation => ({
    childAges: [],
    ascendants: 0,
    disability: false,
    rents: false,
    ...over,
  });

  it('uses the family’s disability for each person, and asks what it cannot tell', () => {
    const with_ = draft({ disability: true });
    expect(isRelevant(d('x', 'Contribuyentes con discapacidad'), with_)).toBe(true);
    expect(isRelevant(d('x', 'Contribuyentes con discapacidad'), draft())).toBe(false);
    expect(isRelevant(d('x', 'Por cónyuge con discapacidad'), with_)).toBe(true);
    expect(isRelevant(d('x', 'Por ascendiente con discapacidad'), with_)).toBe(true);
    expect(isRelevant(d('x', 'Ascendientes mayores de 75'), draft({ ascendants: 1 }))).toBe(true);
    expect(isRelevant(d('x', 'Arrendar viviendas vacías', 'housing'), draft())).toBe(true);
    expect(isRelevant(d('estado-ceuta-melilla', 'Ceuta o Melilla'), draft())).toBe(true);
    expect(isRelevant(d('extremadura-trabajo-dependiente', 'Sueldos bajos'), draft())).toBe(true);
  });
});

/** Every deduction of the State and of every community. */
async function everyDeduction(): Promise<{ ccaa: string; d: Deduction }[]> {
  const all = rentaState.deductions.map((d) => ({ ccaa: 'estado', d }));
  for (const option of CCAA_OPTIONS) {
    const ccaa = await loadCcaa(option.id);
    all.push(...ccaa.deductions.map((d) => ({ ccaa: option.id, d })));
  }
  return all;
}

/** Words that only fit a family with children. */
const CHILDREN =
  /hij|natalidad|nacimiento|adopci|guarder|maternidad|numerosa|monoparental|descendient|escolar|infantil|0-3|menores de [0-9] /;
const YOUNG = /jovenes|menores de 3[0-9]|menores-3[0-9]|hasta 35/;

describe('every deduction of every community, for four profiles', () => {
  let all: { ccaa: string; d: Deduction }[];
  beforeAll(async () => {
    all = await everyDeduction();
  });
  const suggested = (s: DraftSituation) =>
    all.filter(({ ccaa, d }) => isRelevant(d, { ...s, ccaaId: ccaa })).map(({ d }) => d);
  const text = (d: Deduction) => normalize(`${d.id} ${d.title}`);

  it('has a rule for each id with its own conditions', () => {
    const ids = new Set(all.map(({ d }) => d.id));
    expect(SPECIAL_IDS.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('suggests nothing about children to whom said they have none, but other things', () => {
    const none = suggested(BASE);
    expect(none.filter((d) => CHILDREN.test(text(d))).map((d) => d.id)).toEqual([]);
    expect(none.filter((d) => CHILD_WORDS.test(text(d)) && d.group !== 'donations')).toEqual([]);
    // Every community with deductions of its own still has something to ask about.
    for (const option of CCAA_OPTIONS) {
      const own = all.filter(({ ccaa }) => ccaa === option.id).map(({ d }) => d);
      if (own.length === 0) continue;
      expect({ ccaa: option.id, some: own.some((d) => none.includes(d)) }).toEqual({
        ccaa: option.id,
        some: true,
      });
    }
  });

  it('suggests the ones for children to a family with two, one under 3 (a birth of this year or the last one is not)', () => {
    const family = suggested(at({ childAges: [2, 6], singleParent: null }));
    const ids = family.map((d) => d.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'estado-maternidad',
        'estado-guarderia',
        'estado-familia-numerosa',
        'madrid-familias-dos-descendientes-ingresos-reducidos',
        'galicia-cuidado-hijos-menores',
        'aragon-libros-texto-material-escolar',
      ])
    );
    expect(ids).not.toContain('madrid-nacimiento-adopcion-hijos');
    expect(ids).not.toContain('aragon-nacimiento-tercer-hijo');
    // The child of 6 is not under 3.
    expect(family.filter((d) => /hasta 14/.test(text(d))).length).toBeGreaterThan(0);
  });

  it('suggests the ones for a disability only to whom has one', () => {
    const dis = suggested(at({ disability: true, ownDisability: 65 })).map((d) => d.id);
    const none = suggested(BASE).map((d) => d.id);
    for (const id of [
      'andalucia-contribuyente-discapacidad',
      'murcia-contribuyentes-discapacidad',
      'castilla-la-mancha-discapacidad-contribuyente',
    ]) {
      expect(dis).toContain(id);
      expect(none).not.toContain(id);
    }
    // A child's disability needs a child.
    expect(dis).not.toContain('estado-descendiente-discapacidad');
  });

  it('suggests the ones of their age to a retired person of 70, and none for the young or workers', () => {
    const retired = suggested(
      at({ age: 70, works: false, rents: false, mortgage: false, gross: 18000 })
    );
    const ids = retired.map((d) => d.id);
    expect(ids).toContain('aragon-mayores-70');
    expect(ids).not.toContain('castilla-la-mancha-mayores-75');
    expect(retired.filter((d) => YOUNG.test(text(d)))).toEqual([]);
    expect(ids).not.toContain('andalucia-defensa-juridica-laboral');
    expect(retired.filter((d) => CHILDREN.test(text(d)))).toEqual([]);
    // Not a tenant, no mortgage from before 2013: no rent and no transitional regime.
    expect(retired.filter((d) => /alquiler|transitori/.test(text(d)))).toEqual([]);
  });

  it('suggests the rent of the home to a young tenant, with the profiles of each community', () => {
    const young = suggested(at({ age: 30, rents: true })).map((d) => d.id);
    const older = suggested(at({ age: 50, rents: true })).map((d) => d.id);
    expect(young).toEqual(
      expect.arrayContaining([
        'madrid-arrendamiento-vivienda-habitual',
        'galicia-alquiler-vivienda-habitual',
        'cataluna-alquiler-vivienda-habitual',
        'estado-alquiler-transitorio',
      ])
    );
    expect(older).not.toContain('madrid-arrendamiento-vivienda-habitual');
    expect(older).toContain('canarias-alquiler-vivienda-habitual');
  });
});
