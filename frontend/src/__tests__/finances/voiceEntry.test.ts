import { parseVoiceEntry, quickEntryText } from '@modules/finances/domain/voiceEntry';

const e = (description: string, amount: number, type: 'EXPENSE' | 'INCOME' = 'EXPENSE') => ({
  description,
  amount,
  type,
});

describe('parseVoiceEntry (español)', () => {
  it.each([
    ['he pagado por un café 50 céntimos', e('Café', 0.5)],
    ['me he comido un bocadillo por 9,80 €', e('Bocadillo', 9.8)],
    ['Me he comido un bocadillo por 9,80 euros.', e('Bocadillo', 9.8)],
    ['un bocadillo 9 con 80', e('Bocadillo', 9.8)],
    ['bocadillo nueve con ochenta', e('Bocadillo', 9.8)],
    ['bocadillo nueve euros con ochenta', e('Bocadillo', 9.8)],
    ['bocadillo nueve euros con ochenta céntimos', e('Bocadillo', 9.8)],
    ['bocadillo nueve con ochenta euros', e('Bocadillo', 9.8)],
    ['he comprado pan por dos euros', e('Pan', 2)],
    ['café un euro cincuenta', e('Café', 1.5)],
    ['he pagado un euro cincuenta por un café', e('Café', 1.5)],
    ['me he gastado treinta y cinco euros en gasolina', e('Gasolina', 35)],
    ['gasolina treinta y cinco euros', e('Gasolina', 35)],
    ['he pagado el alquiler cinco mil', e('Alquiler', 5000)],
    ['alquiler mil doscientos cincuenta euros', e('Alquiler', 1250)],
    ['regalo doscientos cinco euros', e('Regalo', 205)],
    ['regalo veintiún euros', e('Regalo', 21)],
    ['regalo veintidós euros', e('Regalo', 22)],
    ['regalo quinientos euros', e('Regalo', 500)],
    ['regalo cien euros', e('Regalo', 100)],
    ['regalo ciento diez euros', e('Regalo', 110)],
    ['regalo dos mil quinientos euros', e('Regalo', 2500)],
    ['regalo 5 mil euros', e('Regalo', 5000)],
    ['regalo mil euros', e('Regalo', 1000)],
    ['regalo treinta y un euros', e('Regalo', 31)],
    ['regalo diecisiete euros', e('Regalo', 17)],
    ['regalo cuarenta y cinco céntimos', e('Regalo', 0.45)],
    ['taxi 12,50', e('Taxi', 12.5)],
    ['taxi 12.50 €', e('Taxi', 12.5)],
    ['taxi 12€', e('Taxi', 12)],
    ['taxi 1.200 euros', e('Taxi', 1200)],
    ['café con leche 1 euro 20', e('Café con leche', 1.2)],
    ['café con leche dos euros', e('Café con leche', 2)],
    ['dos cafés tres euros', e('Dos cafés', 3)],
    ['tres euros dos cafés', e('Dos cafés', 3)],
    ['dos cafés', e('Cafés', 2)],
    ['9,80 bocadillo', e('Bocadillo', 9.8)],
    ['por 9,80 €', e('Gasto', 9.8)],
    ['he pagado 5 euros', e('Gasto', 5)],
    ['acabo de pagar tres euros por el parking', e('Parking', 3)],
    ['apunta un gasto de 4 euros en pan', e('Pan', 4)],
    ['gasto de siete euros en cine', e('Cine', 7)],
    ['compré una cerveza por dos con cincuenta', e('Cerveza', 2.5)],
    ['me gasté ocho euros en el taxi', e('Taxi', 8)],
    ['nueve con cinco euros pan', e('Pan', 9.05)],
    ['café 50 céntimos', e('Café', 0.5)],
    ['café, cincuenta céntimos', e('Café', 0.5)],
  ])('«%s»', (said, expected) => {
    expect(parseVoiceEntry(said, 'es')).toEqual(expected);
  });

  it.each([
    ['he cobrado 50 euros', e('Ingreso', 50, 'INCOME')],
    ['he cobrado la nómina 1.200 euros', e('Nómina', 1200, 'INCOME')],
    ['me han ingresado mil doscientos euros', e('Ingreso', 1200, 'INCOME')],
    ['me han pagado 50 euros por la tutoría', e('Tutoría', 50, 'INCOME')],
    ['ingreso de 300 euros', e('Ingreso', 300, 'INCOME')],
    ['cobré cien euros de un cliente', e('Cliente', 100, 'INCOME')],
    ['+1.200 nómina', e('Nómina', 1200, 'INCOME')],
  ])('ingreso «%s»', (said, expected) => {
    expect(parseVoiceEntry(said, 'es')).toEqual(expected);
  });

  it.each([[''], ['hola'], ['he pagado por un café'], ['un café'], ['cero euros café']])(
    'sin importe: «%s»',
    (said) => {
      expect(parseVoiceEntry(said, 'es')).toBeNull();
    }
  );
});

describe('parseVoiceEntry (english)', () => {
  it.each([
    ['I paid 50 cents for a coffee', e('Coffee', 0.5)],
    ['I bought a sandwich for nine dollars and eighty cents', e('Sandwich', 9.8)],
    ['I spent twenty five euros on petrol', e('Petrol', 25)],
    ['coffee a dollar fifty', e('Coffee', 1.5)],
    ['lunch twelve euros', e('Lunch', 12)],
    ['rent one thousand two hundred and fifty euros', e('Rent', 1250)],
    ['rent two hundred fifty', e('Rent', 250)],
    ['taxi twenty-five euros', e('Taxi', 25)],
    ['book 12.50', e('Book', 12.5)],
    ['I had a beer for five dollars', e('Beer', 5)],
    ['gift five thousand dollars', e('Gift', 5000)],
    ['gift 5 thousand dollars', e('Gift', 5000)],
    ['gift ninety nine cents', e('Gift', 0.99)],
    ['gift thirteen', e('Gift', 13)],
    ['gift nine euros eighty', e('Gift', 9.8)],
  ])('«%s»', (said, expected) => {
    expect(parseVoiceEntry(said, 'en')).toEqual(expected);
  });

  it.each([
    ['I got paid 1200 euros', e('Income', 1200, 'INCOME')],
    ['my boss paid me fifty dollars for the job', e('Job', 50, 'INCOME')],
    ['I received 20 euros from Ana', e('From ana', 20, 'INCOME')],
    ['income of 300 euros', e('Income', 300, 'INCOME')],
  ])('income «%s»', (said, expected) => {
    expect(parseVoiceEntry(said, 'en')).toEqual(expected);
  });

  it('no amount', () => {
    expect(parseVoiceEntry('I bought a coffee', 'en')).toBeNull();
  });
});

describe('límites', () => {
  it.each([
    ['es', 'pan treinta y', e('Pan y', 30)],
    ['es', 'pan treinta y mil euros', e('Pan treinta y', 1000)],
    ['es', 'pan dos mil mil euros', e('Pan dos mil', 1000)],
    ['en', 'gift hundred euros', null],
    ['en', 'gift ten hundred euros', e('Gift hundred euros', 10)],
    ['en', 'gift twenty and five euros', e('Gift twenty and', 5)],
  ] as const)('%s «%s»', (lang, said, expected) => {
    const got = parseVoiceEntry(said, lang);
    expect(got).toEqual(expected);
  });
});

describe('quickEntryText', () => {
  it.each([
    [e('Café', 0.5), 'Café 0,50'],
    [e('Taxi', 12), 'Taxi 12'],
    [e('Nómina', 1200.5, 'INCOME'), 'Nómina +1200,50'],
  ])('writes %j', (entry, text) => {
    expect(quickEntryText(entry)).toBe(text);
  });
});
