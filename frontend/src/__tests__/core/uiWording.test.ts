import es from '../../locales/es.json';
import en from '../../locales/en.json';
import { GUIDES } from '@modules/guides/domain/guides';

/**
 * The app sends people to «un profesional» (or the Tax Agency), never to «tu gestor»: a decision of
 * the owner (22 October 2026). The legal texts (terms, privacy, cookies) keep their own wording.
 * «gestora» (the company that runs a fund) is another word and stays.
 */
const LEGAL = /^(terms|app\.privacy|privacy|cookies|legal)\./;
const ADVISER = /\bgestor(?!a)|tax advis|accountant|\byour advis/i;

const offending = (texts: Record<string, string>) =>
  Object.entries(texts)
    .filter(([key, text]) => !LEGAL.test(key) && ADVISER.test(text))
    .map(([key]) => key);

describe('The words the app uses for the person who can help with taxes', () => {
  it('says «un profesional» in Spanish and English, outside the legal texts', () => {
    expect(offending(es)).toEqual([]);
    expect(offending(en)).toEqual([]);
  });

  it('says it in the guides too', () => {
    expect(JSON.stringify(GUIDES)).not.toMatch(ADVISER);
  });
});

/**
 * «Tu dinero perdido» and «La fecha de tu meta» never promise savings nor give orders, and never
 * call a charge «forgotten»: the app cannot know whether a service is used
 * (docs/disenos/dinero-perdido-y-fecha-meta.md, C.8).
 */
const SECTION = /^(app\.leaks|app\.goals\.date|app\.tour\.(leaks|goalDate))\./;
const PROMISES =
  /deberías|te recomendamos|ahorrarás|olvidad|gestor|garantizad|you should|we recommend|you will save|forgotten|guarantee/i;

describe('The words of «Tu dinero perdido» and the date of a goal', () => {
  it('ask and estimate, never promise or order', () => {
    const wrong = (texts: Record<string, string>) =>
      Object.entries(texts)
        .filter(([key, text]) => SECTION.test(key) && PROMISES.test(text))
        .map(([key]) => key);
    expect(wrong(es)).toEqual([]);
    expect(wrong(en)).toEqual([]);
    // The figures are always «about» and the saving a conditional.
    expect(es['app.leaks.headlineFigure']).toMatch(/^unos /);
    expect(es['app.leaks.ifCancel']).toMatch(/te ahorrarías aprox\./);
    expect(en['app.leaks.ifCancel']).toMatch(/you'd save about/);
  });
});
