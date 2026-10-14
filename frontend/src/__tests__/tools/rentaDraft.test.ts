import {
  childAgesOf,
  isRelevant,
  mentionedIn,
  missingDeductions,
  parseAmount,
  readDraft,
} from '@modules/tools/domain/rentaDraft';
import type { Deduction } from '@modules/tools/domain/rentaData';

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
const situation = { childAges: [], ascendants: 0, disability: false, rents: false };

describe('reading a draft', () => {
  it('reads Spanish amounts', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('x')).toBeNull();
  });

  it('finds the figures, the community and the children', () => {
    const text = `Comunitat Valenciana
      Retribuciones dinerarias 0003 30.000,00
      Cotizaciones a la Seguridad Social 0012 1.950,50
      Total retenciones 0596 4.100,00
      Aportaciones a planes de pensiones 500,00
      Ingresos íntegros computables 6.000,00
      Intereses de cuentas, depósitos 120,00
      Descendientes 1 12/03/2023 2 05/01/2015 Ascendientes`;
    const r = readDraft(text, {
      year: 2025,
      communities: [{ id: 'comunitat-valenciana', name: 'Comunitat Valenciana' }],
    });
    expect(r).toMatchObject({
      ccaaId: 'comunitat-valenciana',
      gross: 30000,
      socialSecurity: 1950.5,
      withheld: 4100,
      pension: 500,
      rentalIncome: 6000,
      savings: 120,
      childAges: [2, 10],
    });
  });

  it('ignores a label without a figure', () => {
    expect(readDraft('retribuciones dinerarias', { year: 2025, communities: [] }).gross).toBeNull();
  });

  it('leaves unknown things empty', () => {
    const r = readDraft('nada de nada', { year: 2025, communities: [] });
    expect(r.gross).toBeNull();
    expect(r.ccaaId).toBeNull();
    expect(r.childAges).toEqual([]);
    expect(childAgesOf('sin hijos', 2025)).toEqual([]);
    expect(childAgesOf('descendientes 01/01/1900', 2025)).toEqual([]);
  });

  it('knows which deductions the draft mentions', () => {
    const list = [d('a', 'Por maternidad con hijos menores'), d('b', 'Cuidado de ascendientes')];
    expect(mentionedIn('deduccion por maternidad con hijos menores de tres años', list)).toEqual([
      'a',
    ]);
    expect(mentionedIn('nada', [d('c', 'Corto')])).toEqual([]);
  });
});

describe('what to ask', () => {
  it('asks about the deductions that fit the situation', () => {
    const kids = { ...situation, childAges: [1, 8] };
    expect(isRelevant(d('x', 'Familia numerosa'), kids)).toBe(true);
    expect(isRelevant(d('x', 'Familia numerosa'), situation)).toBe(false);
    expect(isRelevant(d('x', 'Por maternidad'), kids)).toBe(true);
    expect(isRelevant(d('x', 'Por maternidad'), { ...situation, childAges: [9] })).toBe(false);
    expect(isRelevant(d('x', 'Por nacimiento o adopción'), kids)).toBe(true);
    expect(isRelevant(d('x', 'Por nacimiento o adopción'), { ...situation, childAges: [5] })).toBe(
      false
    );
    expect(isRelevant(d('x', 'Gastos de hijos'), kids)).toBe(true);
    expect(isRelevant(d('x', 'Gastos de hijos'), situation)).toBe(false);
    expect(isRelevant(d('x', 'Ascendientes mayores'), { ...situation, ascendants: 1 })).toBe(true);
    expect(isRelevant(d('x', 'Ascendientes mayores'), situation)).toBe(false);
    expect(isRelevant(d('x', 'Con discapacidad'), { ...situation, disability: true })).toBe(true);
    expect(isRelevant(d('x', 'Con discapacidad'), situation)).toBe(false);
    expect(isRelevant(d('x', 'Alquiler de vivienda'), { ...situation, rents: true })).toBe(true);
    expect(isRelevant(d('x', 'Alquiler de vivienda'), situation)).toBe(false);
    expect(isRelevant(d('x', 'Dentista', 'health'), situation)).toBe(true);
    expect(isRelevant(d('x', 'Otra cosa', 'other'), situation)).toBe(false);
  });

  it('leaves out the ones the draft already has', () => {
    const list = [d('a', 'Dentista', 'health'), d('b', 'Gafas', 'health')];
    expect(missingDeductions(list, ['a'], situation).map((x) => x.id)).toEqual(['b']);
  });
});
