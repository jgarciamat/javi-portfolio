import { CategoryRule } from '@domain/ports/repositories';
import { cleanPattern, matchRule, suggestPattern } from '@domain/services/category-rules';

const rule = (pattern: string, categoryId: string): CategoryRule => ({
  id: pattern,
  userId: 'u',
  pattern,
  categoryId,
  createdAt: '2026-01-01T00:00:00Z',
});

describe('category rules', () => {
  it('cleans a text down to words', () => {
    expect(cleanPattern('  COMPRA  Tarj. MERCADONA-0231 Ñandú ')).toBe(
      'compra tarj. mercadona 0231 nandu'
    );
  });

  it('suggests the merchant: first words without numbers', () => {
    expect(suggestPattern('COMPRA TARJ. MERCADONA 0231 MADRID')).toBe('mercadona madrid');
    expect(suggestPattern('1234 5678')).toBe('');
  });

  it('matches by text inside the description and prefers the most specific rule', () => {
    const rules = [rule('uber', 'transport'), rule('uber eats', 'food')];
    expect(matchRule(rules, 'PAGO UBER EATS MADRID')?.categoryId).toBe('food');
    expect(matchRule(rules, 'Uber trip')?.categoryId).toBe('transport');
    expect(matchRule(rules, 'Mercadona')).toBeNull();
    expect(matchRule([], 'x')).toBeNull();
  });
});
