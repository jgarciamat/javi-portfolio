import { MAX_TITLE, brandTitle } from '@shared/utils/pageTitle';

describe('brandTitle', () => {
  it('adds the brand when the title fits in a search result', () => {
    expect(brandTitle('Modelo 303 paso a paso')).toBe('Modelo 303 paso a paso | Finanverso');
  });

  it('leaves the brand out of long titles', () => {
    const long = 'x'.repeat(MAX_TITLE - 5);
    expect(brandTitle(long)).toBe(long);
  });
});
