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
