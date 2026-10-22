import es from '../../locales/es.json';
import en from '../../locales/en.json';

/**
 * The crypto console is an educational simulator with play money: its texts never promise
 * gains, give signals, recommend buying or selling or send people to an exchange.
 */
const crypto = (texts: Record<string, string>) =>
  Object.entries(texts).filter(
    ([key]) => key.startsWith('app.crypto.') || key === 'app.tabs.crypto'
  );

const FORBIDDEN_ES =
  /\bgestor\b|perfect|exact|garantizad|gana(r)? dinero|se[ñn]al|predic|recomendamos|te aconsejamos|afiliad|https?:|binance\.com|compra ya|oportunidad/i;
const FORBIDDEN_EN =
  /tax advis|perfect|exact|guaranteed|make money|signal|predict|we recommend|affiliate|https?:|binance\.com|buy now|opportunit/i;

describe('Crypto console wording', () => {
  it('keeps the texts neutral and educational in Spanish and English', () => {
    expect(crypto(es).filter(([, text]) => FORBIDDEN_ES.test(text))).toEqual([]);
    expect(crypto(en).filter(([, text]) => FORBIDDEN_EN.test(text))).toEqual([]);
  });

  it('has every text in both languages', () => {
    const keys = (texts: Record<string, string>) =>
      crypto(texts)
        .map(([key]) => key)
        .sort();
    expect(keys(en)).toEqual(keys(es));
  });

  it('carries the full risk notice', () => {
    const notice = (es as Record<string, string>)['app.crypto.risk.body'];
    for (const part of [
      'Simulador educativo con dinero ficticio.',
      'No es asesoramiento financiero ni una recomendación de inversión.',
      'Rentabilidades pasadas no garantizan rentabilidades futuras.',
      'Invertir en criptoactivos conlleva riesgo de perder todo lo invertido.',
    ]) {
      expect(notice).toContain(part);
    }
  });
});
