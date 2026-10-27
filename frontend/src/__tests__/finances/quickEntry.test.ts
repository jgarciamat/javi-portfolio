import {
  parseQuickEntry,
  quickCategory,
  recentCategories,
} from '@modules/finances/domain/quickEntry';
import * as f from '@test-utils/fixtures';

describe('parseQuickEntry', () => {
  it.each([
    ['café 1,50', { description: 'Café', amount: 1.5, type: 'EXPENSE' }],
    ['1,50 café', { description: 'Café', amount: 1.5, type: 'EXPENSE' }],
    ['taxi 12 €', { description: 'Taxi', amount: 12, type: 'EXPENSE' }],
    ['Gasolina 45.30€', { description: 'Gasolina', amount: 45.3, type: 'EXPENSE' }],
    ['+1.200 nómina', { description: 'Nómina', amount: 1200, type: 'INCOME' }],
    ['2 cafés 3,00', { description: '2 cafés', amount: 3, type: 'EXPENSE' }],
    ['menú 12 euros', { description: 'Menú', amount: 12, type: 'EXPENSE' }],
    ['regalo -20', { description: 'Regalo', amount: 20, type: 'EXPENSE' }],
  ])('reads «%s»', (text, entry) => {
    expect(parseQuickEntry(text)).toEqual(entry);
  });

  it('needs a concept and an amount above zero', () => {
    expect(parseQuickEntry('café')).toBeNull();
    expect(parseQuickEntry('1,50')).toBeNull();
    expect(parseQuickEntry('café 0')).toBeNull();
    expect(parseQuickEntry('')).toBeNull();
  });
});

describe('the category of a quick movement', () => {
  const coffee = { description: 'Café', amount: 1.5, type: 'EXPENSE' as const };
  const history = [
    f.transaction({ description: 'Cafe', category: 'Bares', date: '2026-02-01' }),
    f.transaction({ description: 'Cafe', category: 'Ocio', date: '2026-03-01' }),
    f.transaction({ description: 'Super', category: 'Alimentación', date: '2026-03-05' }),
    f.transaction({
      description: 'Nómina',
      category: 'Salario',
      type: 'INCOME',
      date: '2026-03-06',
    }),
  ];

  it('a rule first, the longest one', () => {
    const rules = [
      { id: 'r1', pattern: 'caf', categoryId: 'c1', categoryName: 'Bares' },
      { id: 'r2', pattern: 'café', categoryId: 'c2', categoryName: 'Desayunos' },
    ];
    expect(quickCategory(coffee, rules, history)).toBe('Desayunos');
  });

  it('then the same concept, then the last category of the type, then «Otros»', () => {
    expect(quickCategory(coffee, [], history)).toBe('Ocio');
    expect(quickCategory({ ...coffee, description: 'Pan' }, [], history)).toBe('Alimentación');
    expect(quickCategory({ ...coffee, description: 'Pan', type: 'SAVING' }, [], history)).toBe(
      'Otros'
    );
  });

  it('lists the recent categories of a type, newest first and once each', () => {
    const list = [
      ...history,
      f.transaction({ category: 'Ocio', date: '2026-03-05', createdAt: '2026-03-05T10:00:00Z' }),
      f.transaction({ category: 'Ropa', date: '2026-03-05', createdAt: '2026-03-05T09:00:00Z' }),
    ];
    // «Super» was saved later the same day than the two below.
    expect(recentCategories(list, 'EXPENSE')).toEqual(['Alimentación', 'Ocio', 'Ropa', 'Bares']);
    expect(recentCategories(list, 'EXPENSE', 1)).toEqual(['Alimentación']);
  });
});
