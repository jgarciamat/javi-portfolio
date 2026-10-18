import es from '../../locales/es.json';
import en from '../../locales/en.json';
import { GUIDES } from '@modules/guides/domain/guides';
import { MAX_TITLE } from '@shared/utils/pageTitle';

const MAX_DESCRIPTION = 155;
const TITLE_KEY =
  /^(tools\.[a-z0-9]+\.title|hacienda\.[a-z0-9]+\.title|hacienda\.metaTitle|videos\.metaTitle|landing\.meta\.title)$/;
const DESCRIPTION_KEY =
  /^(tools\.[a-z0-9]+\.description|hacienda\.[a-z0-9]+\.description|hacienda\.metaDescription|videos\.metaDescription|landing\.meta\.description)$/;

describe('titles and descriptions that search engines show', () => {
  it('keeps the guides within the limits', () => {
    for (const g of GUIDES) {
      expect([g.slug, g.title.length <= MAX_TITLE]).toEqual([g.slug, true]);
      expect([g.slug, g.description.length <= MAX_DESCRIPTION]).toEqual([g.slug, true]);
    }
  });

  it.each([
    ['es', es],
    ['en', en],
  ] as const)('keeps the %s page texts within the limits', (_lang, messages) => {
    const texts = messages as Record<string, string>;
    const keys = Object.keys(texts);
    expect(keys.filter((k) => TITLE_KEY.test(k)).length).toBeGreaterThan(8);
    for (const key of keys) {
      if (TITLE_KEY.test(key)) expect([key, texts[key].length <= MAX_TITLE]).toEqual([key, true]);
      if (DESCRIPTION_KEY.test(key)) {
        expect([key, texts[key].length <= MAX_DESCRIPTION]).toEqual([key, true]);
      }
    }
  });
});
