/**
 * Files for the sede of the AEAT, written from the record designs and read back with a reader built
 * on the same tables. Every person, NIF, IBAN and figure here is invented; the amounts are worked
 * out by hand next to each case.
 */
import { DESIGNS } from '@modules/finances/application/aeatFiles/designs';
import {
  FieldError,
  Line,
  cleanText,
  fromLatin1,
  latin1,
  numberField,
  readNumber,
  textField,
} from '@modules/finances/application/aeatFiles/fixedWidth';
import {
  nifKind,
  normalNif,
  splitVatId,
  validIban,
  vatIdShapeOk,
} from '@modules/finances/application/aeatFiles/ids';
import * as m349Module from '@modules/finances/application/aeatFiles/m349';
import {
  EMPTY_DECLARANT,
  buildSedeFile,
  needs,
  type Built,
  type Declarant,
  type SedeSource,
} from '@modules/finances/application/aeatFiles/models';
import {
  ReadError,
  readSelfAssessment,
  writeSelfAssessment,
} from '@modules/finances/application/aeatFiles/selfAssessment';
import type { AutonomoDraft, Draft349, Draft390, TaxBox } from '@modules/finances/domain/types';
import type { Result111, Result115 } from '@modules/finances/domain/withholdings';

const { declarationId, read349, write349 } = m349Module;
import { autonomoDraft } from '@test-utils/fixtures';

const b = (box: string, amount: number): TaxBox => ({ box, label: `Casilla ${box}`, amount });

/** An invented person: the NIF 12345678Z has a valid letter (12345678 mod 23 = 14 → Z). */
const person: Declarant = {
  ...EMPTY_DECLARANT,
  nif: '12345678z',
  surname: 'Pérez Núñez',
  name: 'Lucía',
  phone: '600 000 000',
  contact: 'Lucía Pérez',
  activity: 'Diseño gráfico',
  activityCode: 'a03',
  iae: '844',
};
/** The example IBAN of the Spanish banking documentation (not an account of anyone here). */
const IBAN = 'ES91 2100 0418 4502 0005 1332';

const codes = (built: Built) => built.checks.map((c) => c.code);
const errors = (built: Built) => built.checks.filter((c) => c.level === 'error').map((c) => c.code);
const pageOf = (text: string, model: string, tag: string) =>
  text.slice(text.indexOf(`<T${model}${tag}>`));

describe('Fixed-width fields', () => {
  it('cleans texts as the designs ask: capitals, no accents, Ñ and Ç kept, no signs', () => {
    expect(cleanText('  Peña-Ibáñez, Çà & Cía. ')).toBe('PEÑA IBAÑEZ ÇA CIA');
    expect(textField('ab', 4)).toBe('AB  ');
    expect(textField('abcdef', 3)).toBe('ABC');
  });

  it('writes numbers right aligned with zeros, «N» first when negative, and refuses what does not fit', () => {
    expect(numberField(1234, 6, 'Num', 1)).toBe('001234');
    expect(numberField(-1234, 6, 'N', 1)).toBe('N01234');
    expect(() => numberField(-1, 6, 'Num', 7)).toThrow(FieldError);
    expect(() => numberField(1234567, 6, 'Num', 7)).toThrow('overflow at 7');
    expect(() => numberField(-123456, 6, 'N', 7)).toThrow('overflow at 7');
  });

  it('reads numbers back, and nothing from a field that is not a number', () => {
    expect(readNumber('N01234', 1, 6)).toBe(-1234);
    expect(readNumber('001234', 1, 6)).toBe(1234);
    expect(readNumber('00 234', 1, 6)).toBeNull();
    expect(readNumber('0012', 1, 6)).toBeNull();
  });

  it('builds a line field by field and turns it into ISO-8859-1 bytes and back', () => {
    const line = new Line(8).text(1, 4, 'ñu').number(5, 4, 7).toString();
    expect(line).toBe('ÑU  0007');
    const bytes = latin1(line);
    expect(bytes[0]).toBe(0xd1);
    expect(bytes).toHaveLength(8);
    expect(fromLatin1(bytes)).toBe(line);
  });
});

describe('Identifiers', () => {
  it('checks the control letter of the DNI, the NIE and the K/L/M NIF', () => {
    expect(nifKind('12345678Z')).toBe('person');
    expect(nifKind('12.345.678-z')).toBe('person');
    expect(nifKind('12345678A')).toBeNull();
    // X1234567: 01234567 mod 23 = 19 → L.
    expect(nifKind('X1234567L')).toBe('person');
    expect(nifKind('X1234567A')).toBeNull();
    expect(nifKind('K1234567L')).toBe('person');
    expect(nifKind('K1234567A')).toBeNull();
    expect(normalNif('1234567l')).toBe('01234567L');
    expect(nifKind('01234567L')).toBe('person');
  });

  it('checks the control character of the NIF of an entity', () => {
    // 1234567: odd places 1, 3, 5, 7 doubled = 2, 6, 10, 14 → 2 + 6 + 1 + 5 = 14; even 2 + 4 + 6 = 12;
    // 26 → control 10 − 6 = 4 (letter D).
    expect(nifKind('B12345674')).toBe('entity');
    expect(nifKind('B1234567D')).toBeNull();
    expect(nifKind('Q1234567D')).toBe('entity');
    expect(nifKind('Q12345674')).toBeNull();
    expect(nifKind('G12345674')).toBe('entity');
    expect(nifKind('G1234567D')).toBe('entity');
    expect(nifKind('G1234567A')).toBeNull();
    expect(nifKind('B00000000')).toBe('entity');
    expect(nifKind('hola')).toBeNull();
  });

  it('checks an IBAN by its mod 97 and the length of a Spanish one', () => {
    expect(validIban(IBAN)).toBe(true);
    expect(validIban('ES9121000418450200051331')).toBe(false);
    expect(validIban('ES912100041845020005133')).toBe(false);
    expect(validIban('DE89370400440532013000')).toBe(true);
    expect(validIban('nada')).toBe(false);
  });

  it('splits an EU VAT number and checks its shape by State', () => {
    expect(splitVatId('fr 123.456.789-01')).toEqual({ country: 'FR', number: '12345678901' });
    expect(splitVatId('US123')).toBeNull();
    expect(vatIdShapeOk('FR12345678901')).toBe(true);
    expect(vatIdShapeOk('DE12345678')).toBe(false);
    expect(vatIdShapeOk('US123')).toBe(false);
  });
});

describe('The designs as read from the AEAT spreadsheets', () => {
  it('keeps the page lengths of each design', () => {
    const lengths = Object.fromEntries(
      Object.entries(DESIGNS).map(([m, pages]) => [m, pages.map((p) => `${p.tag}:${p.length}`)])
    );
    expect(lengths).toEqual({
      '111': ['01000:1000'],
      '115': ['01000:500'],
      '130': ['01000:600'],
      '303': ['01000:1581', '03000:1017', '04000:998', 'DID00:823'],
      '390': [
        '01000:1187',
        '02000:1806',
        '02B00:531',
        '03000:1840',
        '04000:854',
        '06000:828',
        '07000:776',
      ],
    });
  });

  it('has no overlapping fields and every field inside its page', () => {
    for (const pages of Object.values(DESIGNS))
      for (const page of pages) {
        let end = 12;
        for (const [pos, len] of page.fields) {
          expect(pos).toBeGreaterThan(end - 1);
          end = pos + len;
        }
        expect(end).toBeLessThanOrEqual(page.length - 11);
      }
  });
});

describe('The boxes the backend works out', () => {
  // Every box id written by backend autonomo-vat.ts (303) and autonomo-390.ts (390), but the 72 and
  // 73 that the 2026 303 does not have: each one has its field in the pages the files carry.
  const placed = (model: '303' | '390', tags: string[]) =>
    new Set(
      DESIGNS[model].filter((p) => tags.includes(p.tag)).flatMap((p) => p.fields.map((f) => f[3]))
    );

  it('fits the 303 in pages 01 and 03', () => {
    const boxes = placed('303', ['01000', '03000']);
    expect(
      [
        '01',
        '02',
        '03',
        '04',
        '05',
        '06',
        '07',
        '08',
        '09',
        '10',
        '11',
        '12',
        '13',
        '14',
        '15',
        '19',
        '20',
        '21',
        '22',
        '23',
        '24',
        '25',
        '26',
        '27',
        '28',
        '29',
        '30',
        '31',
        '32',
        '33',
        '34',
        '35',
        '36',
        '37',
        '38',
        '39',
        '40',
        '41',
        '42',
        '43',
        '44',
        '45',
        '46',
        '59',
        '60',
        '62',
        '63',
        '64',
        '65',
        '66',
        '69',
        '71',
        '74',
        '75',
        '76',
        '77',
        '78',
        '87',
        '110',
        '120',
        '122',
        '123',
        '124',
        '150',
        '151',
        '152',
        '156',
        '157',
        '158',
        '168',
        '169',
        '170',
      ].filter((b) => !boxes.has(b))
    ).toEqual([]);
  });

  it('fits the 390 in pages 1 to 7 (5 left out)', () => {
    const boxes = placed('390', ['02000', '02B00', '03000', '04000', '06000', '07000']);
    expect(
      [
        '01',
        '02',
        '03',
        '04',
        '05',
        '06',
        '21',
        '22',
        '23',
        '24',
        '25',
        '26',
        '27',
        '28',
        '29',
        '30',
        '33',
        '34',
        '35',
        '36',
        '41',
        '42',
        '43',
        '44',
        '47',
        '48',
        '49',
        '50',
        '51',
        '52',
        '53',
        '54',
        '55',
        '56',
        '57',
        '58',
        '59',
        '61',
        '62',
        '63',
        '64',
        '65',
        '84',
        '85',
        '86',
        '95',
        '97',
        '98',
        '99',
        '101',
        '103',
        '104',
        '105',
        '106',
        '108',
        '110',
        '115',
        '116',
        '118',
        '125',
        '126',
        '127',
        '190',
        '191',
        '196',
        '197',
        '202',
        '203',
        '208',
        '209',
        '214',
        '215',
        '220',
        '221',
        '232',
        '522',
        '523',
        '545',
        '546',
        '547',
        '548',
        '551',
        '552',
        '587',
        '588',
        '597',
        '598',
        '599',
        '600',
        '601',
        '602',
        '603',
        '604',
        '605',
        '606',
        '611',
        '612',
        '613',
        '614',
        '619',
        '620',
        '621',
        '622',
        '623',
        '624',
        '625',
        '626',
        '627',
        '628',
        '629',
        '630',
        '631',
        '632',
        '633',
        '634',
        '635',
        '636',
        '637',
        '638',
        '639',
        '643',
        '644',
        '645',
        '646',
        '647',
        '648',
        '653',
        '654',
        '655',
        '658',
        '659',
        '662',
        '700',
        '701',
        '716',
        '717',
        '720',
        '721',
      ].filter((b) => !boxes.has(b))
    ).toEqual([]);
  });
});

describe('The envelope of a self-assessment file', () => {
  const env = { model: '115' as const, year: 2026, period: '3T' };

  it('opens with «<T1150…0000><AUX>», keeps the AUX block and closes with «</T1150…0000>»', () => {
    const { text, unplaced } = writeSelfAssessment(env, ['01000'], { '02': 10, XX: 1 }, []);
    expect(text.slice(0, 22)).toBe('<T11502026' + '3T0000><AUX>');
    expect(text.slice(322, 328)).toBe('</AUX>');
    expect(text.length).toBe(328 + 500 + 18);
    expect(text.endsWith('</T115020263T0000>')).toBe(true);
    expect(unplaced).toEqual(['XX']);
    expect(readSelfAssessment('115', text).values['02']).toBe(10);
  });

  it('refuses a file that is not of the model or is cut', () => {
    const { text } = writeSelfAssessment(env, ['01000'], {}, []);
    expect(() => readSelfAssessment('111', text)).toThrow(ReadError);
    expect(() => readSelfAssessment('115', text.replace('</AUX>', '<AUX>X'))).toThrow('aux');
    expect(() => readSelfAssessment('115', text.slice(0, -1))).toThrow('closing');
    const cut = text.replace('</T11501000>', '</T11501000');
    expect(() => readSelfAssessment('115', cut)).toThrow('page 01000');
    const bad = text.slice(0, 328 + 123) + 'X' + text.slice(328 + 124);
    expect(() => readSelfAssessment('115', bad)).toThrow('box 02');
  });

  it('says which box does not fit its field', () => {
    try {
      writeSelfAssessment(env, ['01000'], { '02': -5 }, []);
      throw new Error('no error');
    } catch (e) {
      expect((e as FieldError).box).toBe('02');
    }
  });
});

const result111: Result111 = {
  // 1 employee: 6,000.00 paid, 900.00 withheld; 2 professionals: 2,000.00 at 15 % = 300.00.
  boxes: [
    b('01', 1),
    b('02', 6000),
    b('03', 900),
    b('07', 2),
    b('08', 2000),
    b('09', 300),
    b('28', 1200),
    b('29', 0),
    b('30', 1200),
  ],
  due: 1200,
  result: 'pay',
  staff: { people: 1, withheld: 900 },
  pros: { people: 2, withheld: 300, base: 2000 },
};

const result115: Result115 = {
  // A rent of 1,500.00 with 19 % = 285.00 withheld.
  boxes: [b('01', 1), b('02', 1500), b('03', 285), b('04', 0), b('05', 285)],
  due: 285,
  result: 'pay',
  people: 1,
  base: 1500,
};

describe('Modelo 111', () => {
  const source: SedeSource = { model: '111', year: 2026, quarter: 3, result: result111 };

  it('writes page 01 of dr111e16v18 and reads back every box', () => {
    const built = buildSedeFile(source, person);
    expect(built.checks).toEqual([]);
    expect(built.kind).toBe('I');
    const file = built.file!;
    expect(file.fileName).toBe('12345678Z20263T.111');
    expect(file.text.length).toBe(328 + 1000 + 18);
    const page = pageOf(file.text, '111', '01000');
    expect(page.slice(0, 11)).toBe('<T11101000>');
    expect(page[12]).toBe('I');
    expect(page.slice(13, 22)).toBe('12345678Z');
    expect(page.slice(22, 34)).toBe('PEREZ NUÑEZ ');
    expect(page.slice(82, 87)).toBe('LUCIA');
    expect(page.slice(102, 108)).toBe('20263T');
    // Box 02: 6,000.00 → 600000 cents in 17 digits at 117.
    expect(page.slice(116, 133)).toBe('00000000000600000');
    const read = readSelfAssessment('111', file.text);
    expect(read).toMatchObject({ year: 2026, period: '3T' });
    for (const box of result111.boxes) expect(read.values[box.box]).toBe(box.amount);
    expect(read.values['04']).toBe(0);
  });

  it('pays by direct debit when an IBAN is given (kind U, IBAN at 553)', () => {
    const built = buildSedeFile(source, { ...person, iban: IBAN });
    expect(built.kind).toBe('U');
    const page = pageOf(built.file!.text, '111', '01000');
    expect(page.slice(552, 576)).toBe('ES9121000418450200051332');
  });

  it('is «negativa» (N) without withholdings and warns about odd rates and sums', () => {
    const zero = buildSedeFile(
      { ...source, result: { ...result111, result: 'zero', boxes: [b('08', 1000), b('09', 300)] } },
      person
    );
    expect(zero.kind).toBe('N');
    expect(codes(zero)).toEqual(['sum', 'rate111']);
    expect(zero.checks[1].values).toEqual({ rate: 30 });
  });
});

describe('The rate checks', () => {
  it('say nothing without a base (no professionals in the 111, no rent in the 115)', () => {
    const none = { ...result111, result: 'zero' as const, boxes: [] };
    expect(
      buildSedeFile({ model: '111', year: 2026, quarter: 1, result: none }, person).checks
    ).toEqual([]);
    const free = { ...result115, result: 'zero' as const, boxes: [] };
    expect(
      buildSedeFile({ model: '115', year: 2026, quarter: 1, result: free }, person).checks
    ).toEqual([]);
  });
});

describe('Modelo 115', () => {
  const source: SedeSource = { model: '115', year: 2026, quarter: 2, result: result115 };

  it('writes page 01 of DR115e15v13 and reads back the five boxes', () => {
    const built = buildSedeFile(source, { ...person, iban: IBAN });
    expect(built.checks).toEqual([]);
    expect(built.kind).toBe('U');
    const page = pageOf(built.file!.text, '115', '01000');
    expect(page.slice(108, 123)).toBe('000000000000001');
    expect(page.slice(205, 229)).toBe('ES9121000418450200051332');
    const read = readSelfAssessment('115', built.file!.text);
    for (const box of result115.boxes) expect(read.values[box.box]).toBe(box.amount);
  });

  it('warns when the withholding is not 19 % of the rent', () => {
    const built = buildSedeFile(
      { ...source, result: { ...result115, boxes: [b('02', 1000), b('03', 100), b('05', 100)] } },
      person
    );
    expect(codes(built)).toEqual(['rate115']);
    expect(built.checks[0].values).toEqual({ rate: 10 });
  });
});

/** A 130 of the 3T: 30,000.00 income and 10,000.00 expenses so far → 20 % of 20,000.00 = 4,000.00;
 * 2,000.00 paid in the 1T-2T and 300.00 withheld → 1,700.00 to pay. */
const boxes130 = [
  b('01', 30000),
  b('02', 10000),
  b('03', 20000),
  b('04', 4000),
  b('05', 2000),
  b('06', 300),
  b('07', 1700),
  b('12', 1700),
  b('13', 0),
  b('14', 1700),
  b('15', 0),
  b('17', 1700),
  b('19', 1700),
];
const irpf = (over: Partial<AutonomoDraft['irpf']> = {}): AutonomoDraft['irpf'] => ({
  required: true,
  result: 'pay',
  amountDue: 1700,
  boxes: boxes130,
  ...over,
});

describe('Modelo 130', () => {
  it('writes page 01 of DR130e15v12 and reads back the 19 boxes', () => {
    const draft = autonomoDraft({ quarter: 3, irpf: irpf() });
    const built = buildSedeFile({ model: '130', draft }, person);
    expect(built.checks).toEqual([]);
    expect(built.kind).toBe('I');
    const read = readSelfAssessment('130', built.file!.text);
    for (const box of boxes130) expect(read.values[box.box]).toBe(box.amount);
    expect(read.values['08']).toBe(0);
    expect(built.file!.text.length).toBe(328 + 600 + 18);
  });

  it('writes a negative 03 with «N», and is «A deducir» (B) before the 4T and «Negativa» (N) in it', () => {
    const negative = [b('01', 1000), b('02', 3000), b('03', -2000), b('19', -50), b('17', -50)];
    const q2 = autonomoDraft({ quarter: 2, irpf: irpf({ result: 'negative', boxes: negative }) });
    const built = buildSedeFile({ model: '130', draft: q2 }, { ...person, iban: IBAN });
    expect(built.kind).toBe('B');
    expect(codes(built)).toContain('ibanUnused');
    const page = pageOf(built.file!.text, '130', '01000');
    expect(page.slice(142, 159)).toBe('N0000000000200000');
    expect(readSelfAssessment('130', built.file!.text).values['03']).toBe(-2000);
    const q4 = autonomoDraft({ quarter: 4, irpf: irpf({ result: 'negative', boxes: negative }) });
    expect(buildSedeFile({ model: '130', draft: q4 }, person).kind).toBe('N');
    const zero = autonomoDraft({ quarter: 1, irpf: irpf({ result: 'zero', boxes: [] }) });
    expect(buildSedeFile({ model: '130', draft: zero }, person).kind).toBe('N');
  });

  it('domiciles a payment (IBAN at 446) and refuses a 130 the person does not file', () => {
    const draft = autonomoDraft({ quarter: 3, irpf: irpf() });
    const built = buildSedeFile({ model: '130', draft }, { ...person, iban: IBAN });
    expect(built.kind).toBe('U');
    expect(pageOf(built.file!.text, '130', '01000').slice(445, 469)).toBe(
      'ES9121000418450200051332'
    );
    const exempt = autonomoDraft({ irpf: irpf({ required: false, result: 'notRequired' }) });
    const no = buildSedeFile({ model: '130', draft: exempt }, person);
    expect(no.file).toBeNull();
    expect(errors(no)).toEqual(['not130']);
  });
});

/** A 303 of the 3T of 2026: 10,000.00 at 21 % = 2,100.00; 3,000.00 of expenses with 630.00;
 * 500.00 of intra-EU services (box 59) → 1,470.00 to pay. */
const vat303 = (over: Partial<AutonomoDraft['vat']> = {}): AutonomoDraft['vat'] => ({
  result: 'pay',
  amountDue: 1470,
  accrued: [b('07', 10000), b('08', 21), b('09', 2100), b('27', 2100)],
  deductible: [b('28', 3000), b('29', 630), b('45', 630), b('46', 1470)],
  info: [b('59', 500)],
  settlement: [
    b('64', 1470),
    b('65', 100),
    b('66', 1470),
    b('69', 1470),
    b('71', 1470),
    b('72', 0),
    b('73', 0),
  ],
  ...over,
});

const m349: Draft349 = {
  required: true,
  monthly: false,
  operators: [{ key: 'S', vatId: 'FR12345678901', name: 'Atelier Inventé SARL', base: 500 }],
  rectifications: [
    {
      key: 'S',
      vatId: 'FR12345678901',
      name: 'Atelier Inventé SARL',
      base: 400,
      year: 2026,
      quarter: 1,
      previous: 450,
    },
  ],
  boxes: [],
  warnings: [],
};

describe('Modelo 303', () => {
  const draft = autonomoDraft({ year: 2026, quarter: 3, vat: vat303(), m349 });

  it('writes pages 01 and 03 of DR303e26v101 and reads back every box but the app-only 72 and 73', () => {
    const built = buildSedeFile({ model: '303', draft }, person);
    expect(built.checks).toEqual([]);
    expect(built.kind).toBe('I');
    const { text } = built.file!;
    expect(text.length).toBe(328 + 1581 + 1017 + 18);
    const page1 = pageOf(text, '303', '01000');
    expect(page1.slice(22, 41)).toBe('PEREZ NUÑEZ LUCIA  ');
    // 109-130: foral no, REDEME no, only the general regime, … exonerated «0» before the 4T.
    expect(page1.slice(108, 117)).toBe('223222222');
    expect(page1.slice(126, 130)).toBe('2000');
    // The rates are the constants of the design: 4 % «00400», 21 % «02100».
    expect(page1.slice(225, 230)).toBe('00400');
    expect(page1.slice(342, 347)).toBe('02100');
    const read = readSelfAssessment('303', text);
    for (const box of [...vat303().accrued, ...vat303().deductible, ...vat303().settlement])
      if (!['72', '73'].includes(box.box)) expect(read.values[box.box]).toBe(box.amount);
    expect(read.values['59']).toBe(500);
    expect(read.values['72']).toBeUndefined();
    expect(Object.keys(read.pages)).toEqual(['01000', '03000']);
  });

  it('adds page DID with the IBAN to domicile the payment, and marks the 4T as not exonerated', () => {
    const q4 = autonomoDraft({ year: 2026, quarter: 4, vat: vat303(), m349 });
    const built = buildSedeFile({ model: '303', draft: q4 }, { ...person, iban: IBAN });
    expect(built.kind).toBe('U');
    const did = pageOf(built.file!.text, '303', 'DID00');
    expect(did.slice(22, 46)).toBe('ES9121000418450200051332');
    expect(did[193]).toBe('1');
    expect(pageOf(built.file!.text, '303', '01000')[127]).toBe('2');
  });

  it('asks for the account of a refund, and writes it on page DID', () => {
    const refund = autonomoDraft({
      year: 2026,
      quarter: 4,
      vat: vat303({ result: 'refund', settlement: [b('71', -300)], info: [] }),
    });
    const without = buildSedeFile({ model: '303', draft: refund }, person);
    expect(without.file).toBeNull();
    expect(errors(without)).toEqual(['ibanRequired']);
    const built = buildSedeFile({ model: '303', draft: refund }, { ...person, iban: IBAN });
    expect(built.kind).toBe('D');
    expect(readSelfAssessment('303', built.file!.text).values['71']).toBe(-300);
    expect(Object.keys(readSelfAssessment('303', built.file!.text).pages)).toContain('DID00');
  });

  it('marks «sin actividad» with an X and kind N; «a compensar» is C', () => {
    const none = autonomoDraft({
      year: 2026,
      vat: vat303({ result: 'noActivity', accrued: [], deductible: [], info: [], settlement: [] }),
    });
    const built = buildSedeFile({ model: '303', draft: none }, person);
    expect(built.kind).toBe('N');
    expect(pageOf(built.file!.text, '303', '03000')[424]).toBe('X');
    const offset = autonomoDraft({
      year: 2026,
      vat: vat303({ result: 'offset', accrued: [], deductible: [], info: [], settlement: [] }),
    });
    expect(buildSedeFile({ model: '303', draft: offset }, person).kind).toBe('C');
    const zero = autonomoDraft({ year: 2026, vat: vat303({ result: 'zero' }), m349 });
    expect(buildSedeFile({ model: '303', draft: zero }, person).kind).toBe('N');
  });

  it('flags cash accounting on page 1 when the draft has its boxes', () => {
    const cash = autonomoDraft({
      year: 2026,
      vat: vat303({ info: [b('62', 100), b('63', 21), b('74', 50), b('75', 0)] }),
    });
    const page = pageOf(
      buildSedeFile({ model: '303', draft: cash }, person).file!.text,
      '303',
      '01000'
    );
    expect(page.slice(112, 114)).toBe('11');
    const buyer = autonomoDraft({ year: 2026, vat: vat303({ info: [b('63', 21), b('75', 5)] }) });
    const page2 = pageOf(
      buildSedeFile({ model: '303', draft: buyer }, person).file!.text,
      '303',
      '01000'
    );
    expect(page2.slice(112, 114)).toBe('11');
  });

  it('warns when 59 or 10 have intra-EU operations and there is no 349', () => {
    const lone = autonomoDraft({ year: 2026, vat: vat303() });
    expect(codes(buildSedeFile({ model: '303', draft: lone }, person))).toEqual(['no349']);
    const acquisitions = autonomoDraft({
      year: 2026,
      vat: vat303({ info: [], accrued: [...vat303().accrued, b('10', 100)] }),
      m349: { ...m349, required: false },
    });
    expect(codes(buildSedeFile({ model: '303', draft: acquisitions }, person))).toEqual(['no349']);
  });

  it('refuses a year before 2026 (the design is for 2026 and later) and a box that does not fit', () => {
    const old = buildSedeFile({ model: '303', draft: autonomoDraft({ year: 2025 }) }, person);
    expect(errors(old)).toEqual(['design303']);
    const huge = autonomoDraft({
      year: 2026,
      vat: vat303({ accrued: [b('07', 1e16)], deductible: [], settlement: [], info: [] }),
    });
    const built = buildSedeFile({ model: '303', draft: huge }, person);
    expect(built.file).toBeNull();
    expect(built.checks.at(-1)).toEqual({
      level: 'error',
      code: 'overflow',
      values: { pos: 326, box: '07' },
    });
  });

  it('warns about a box of the draft that the design does not have', () => {
    const odd = autonomoDraft({
      year: 2026,
      vat: vat303({ info: [b('59', 500), b('999', 1)] }),
      m349,
    });
    expect(buildSedeFile({ model: '303', draft: odd }, person).checks).toEqual([
      { level: 'warn', code: 'unplaced', values: { box: '999' } },
    ]);
  });
});

describe('Modelo 349', () => {
  const draft = autonomoDraft({ year: 2026, quarter: 3, vat: vat303(), m349 });
  const source: SedeSource = { model: '349', draft, m349 };

  it('writes the type 1 and type 2 records of 500 characters and reads them back', () => {
    const built = buildSedeFile(source, person);
    expect(built.checks).toEqual([]);
    expect(built.kind).toBeNull();
    const file = built.file!;
    expect(file.fileName).toBe('12345678Z20263T.349');
    const lines = file.text.split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[3]).toBe('');
    expect(lines.slice(0, 3).every((l) => l.length === 500)).toBe(true);
    expect(lines[0].slice(0, 17)).toBe('1349202612345678Z');
    expect(lines[0].slice(58, 67)).toBe('600000000');
    expect(lines[0].slice(107, 120)).toBe('3492026030001');
    expect(lines[1].slice(75, 92)).toBe('FR12345678901    ');
    expect(lines[1][132]).toBe('S');
    expect(read349(file.text)).toEqual({
      year: 2026,
      period: '3T',
      nif: '12345678Z',
      name: 'PEREZ NUÑEZ LUCIA',
      operatorCount: 1,
      amount: 500,
      correctionCount: 1,
      correctionAmount: 400,
      operators: [{ key: 'S', vatId: 'FR12345678901', name: 'ATELIER INVENTE SARL', base: 500 }],
      rectifications: [
        {
          key: 'S',
          vatId: 'FR12345678901',
          name: 'ATELIER INVENTE SARL',
          base: 400,
          year: 2026,
          quarter: 1,
          previous: 450,
        },
      ],
    });
  });

  it('refuses a monthly 349, a missing phone or contact and an operator without a valid VAT number or name', () => {
    const bad: Draft349 = {
      ...m349,
      monthly: true,
      operators: [
        { key: 'E', vatId: 'US1', name: '', base: -1 },
        { key: 'A', vatId: '', name: 'Sin número', base: 10 },
      ],
      warnings: [
        { code: 'vs59', expected: 500, got: 0 },
        { code: 'vs10', expected: 0, got: 10 },
        { code: 'noVatId', name: 'Sin número' },
        { code: 'vs10' },
      ],
    };
    const built = buildSedeFile(
      { model: '349', draft, m349: bad },
      { ...person, phone: '12', contact: ' ' }
    );
    expect(built.file).toBeNull();
    expect(codes(built)).toEqual([
      'monthly349',
      'phone',
      'contactMissing',
      'vatId',
      'operatorName',
      'negative349',
      'vatId',
      'vs59',
      'vs10',
      'vs10',
    ]);
    expect(built.checks[9].values).toEqual({ expected: 0, got: 0 });
    expect(built.checks[3].values).toEqual({ name: '—', vatId: 'US1' });
    expect(built.checks[6].values).toEqual({ name: 'Sin número', vatId: '—' });
  });

  it('lets an unexpected failure of the writer through (it is a bug, not a check)', () => {
    const spy = jest.spyOn(m349Module, 'write349').mockImplementation(() => {
      throw new Error('bug');
    });
    expect(() => buildSedeFile(source, person)).toThrow('bug');
    spy.mockRestore();
  });

  it('numbers the declaration with 349, the year and the period', () => {
    expect(declarationId(2026, 4)).toBe('3492026040001');
  });

  it('turns an amount that does not fit into an error', () => {
    const huge: Draft349 = {
      ...m349,
      operators: [{ key: 'S', vatId: 'FR12345678901', name: 'X', base: 1e12 }],
    };
    const built = buildSedeFile({ model: '349', draft, m349: huge }, person);
    expect(built.file).toBeNull();
    expect(errors(built)).toEqual(['overflow']);
  });

  it('writes an unknown State as typed and refuses broken files when reading', () => {
    const text = write349(
      {
        year: 2026,
        period: '1T',
        nif: '12345678Z',
        name: 'X',
        phone: '',
        contact: 'X',
        id: '3492026010001',
      },
      { ...m349, operators: [{ key: 'E', vatId: 'XX123', name: 'Y', base: 1 }], rectifications: [] }
    );
    expect(read349(text).operators[0].vatId).toBe('XX123');
    expect(() => read349(text.replace('\r\n', 'X\r\n'))).toThrow('length');
    expect(() => read349(text.replace('1349', '9349'))).toThrow('type 1');
    const [head, op] = text.split('\r\n');
    expect(() => read349(`${head}\r\n${'9' + op.slice(1)}\r\n`)).toThrow('type 2');
    expect(() => read349(`${head}\r\n${op.slice(0, 133) + 'X' + op.slice(134)}\r\n`)).toThrow(
      'number at 134'
    );
  });
});

const m390: Draft390 = {
  // A year of 40,000.00 at 21 % (8,400.00) and 12,000.00 of expenses (2,520.00): 5,880.00 paid.
  sections: [
    {
      id: 'accrued',
      boxes: [b('05', 40000), b('06', 8400), b('33', 40000), b('34', 8400), b('47', 8400)],
    },
    {
      id: 'deductible',
      boxes: [
        b('605', 12000),
        b('606', 2520),
        b('48', 12000),
        b('49', 2520),
        b('64', 2520),
        b('65', 5880),
      ],
    },
    { id: 'result', boxes: [b('658', 0), b('84', 5880), b('86', 5880)] },
    { id: 'liquidations', boxes: [b('95', 5880)] },
    { id: 'volume', boxes: [b('99', 40000), b('108', 40000)] },
    { id: 'specific', boxes: [b('232', 0)] },
    { id: 'prorrata', boxes: [] },
  ],
  prorrata: 100,
  reconciliation: [],
  warnings: [],
};

describe('Modelo 390', () => {
  const draft = autonomoDraft({ year: 2025, quarter: 4, m390 });
  const source: SedeSource = { model: '390', draft, m390 };

  it('writes pages 1, 2, 2 bis, 3, 4 and 6 of dr390e2025 with the activity and reads back every box', () => {
    const built = buildSedeFile(source, { ...person, thirdParties: true });
    expect(built.checks).toEqual([]);
    const file = built.file!;
    expect(file.fileName).toBe('12345678Z20250A.390');
    expect(file.text.slice(0, 17)).toBe('<T390020250A0000>');
    const page1 = pageOf(file.text, '390', '01000');
    expect(page1.slice(147, 165)).toBe('DISEÑO GRAFICO    ');
    expect(page1.slice(187, 194)).toBe('A03844 ');
    expect(page1[429]).toBe('1');
    expect(page1.slice(129, 132)).toBe('222');
    const read = readSelfAssessment('390', file.text);
    expect(read.period).toBe('0A');
    expect(Object.keys(read.pages)).toEqual(['01000', '02000', '02B00', '03000', '04000', '06000']);
    for (const box of m390.sections.flatMap((s) => s.boxes))
      if (box.box !== '232') expect(read.values[box.box]).toBe(box.amount);
    // 658 and 84 repeat in section 8 (territories): only their first field is written.
    const page6 = pageOf(file.text, '390', '06000');
    expect(page6.slice(139, 156)).toBe('0'.repeat(17));
  });

  it('adds page 7 with the prorrata, its CNAE and kind G', () => {
    const withProrrata: Draft390 = {
      ...m390,
      sections: [
        ...m390.sections,
        { id: 'prorrata', boxes: [b('115', 1000), b('116', 800), b('118', 80)] },
        { id: 'accrued', boxes: [b('36', 5)] },
        { id: 'specific', boxes: [b('654', 10), b('656', 1)] },
      ],
    };
    const src: SedeSource = { model: '390', draft, m390: withProrrata };
    expect(needs(src).cnae).toBe(true);
    const missing = buildSedeFile(src, person);
    expect(errors(missing)).toEqual(['cnae']);
    const built = buildSedeFile(src, { ...person, cnae: '741' });
    const read = readSelfAssessment('390', built.file!.text);
    expect(Object.keys(read.pages)).toEqual([
      '01000',
      '02000',
      '02B00',
      '03000',
      '04000',
      '06000',
      '07000',
    ]);
    expect(read.values).toMatchObject({
      '114': '741',
      '115': 1000,
      '116': 800,
      '117': 'G',
      '118': 80,
    });
    expect(pageOf(built.file!.text, '390', '01000').slice(130, 132)).toBe('11');
  });

  it('asks for the activity, its key and IAE heading, and passes on the warnings of the draft', () => {
    const warned: Draft390 = {
      ...m390,
      warnings: [
        { code: 'filedDiffers', quarter: 2, difference: 72 },
        { code: 'identity', expected: 1622, got: 1600 },
        { code: 'exonerated' },
        { code: 'filedDiffers' },
        { code: 'identity' },
      ],
    };
    const later = autonomoDraft({ year: 2026, quarter: 4, m390: warned });
    const built = buildSedeFile(
      { model: '390', draft: later, m390: warned },
      { ...person, activity: '', activityCode: '3', iae: 'x' }
    );
    expect(codes(built)).toEqual([
      'design390',
      'activityMissing',
      'activityCode',
      'iae',
      'filed390',
      'identity390',
      'exonerated390',
      'filed390',
      'identity390',
    ]);
    expect(built.checks[4].values).toEqual({ quarter: 2, difference: 72 });
    expect(built.checks[7].values).toEqual({ quarter: 0, difference: 0 });
    expect(built.checks[8].values).toEqual({ expected: 0, got: 0 });
  });
});

describe('The checks of the person', () => {
  const source: SedeSource = { model: '115', year: 2026, quarter: 1, result: result115 };

  it('asks for a valid NIF, the surname and, for a person, the name', () => {
    expect(errors(buildSedeFile(source, EMPTY_DECLARANT))).toEqual([
      'nifMissing',
      'surnameMissing',
    ]);
    expect(errors(buildSedeFile(source, { ...person, nif: '12345678A', name: '' }))).toEqual([
      'nifInvalid',
    ]);
    expect(errors(buildSedeFile(source, { ...person, name: ' ' }))).toEqual(['nameMissing']);
    // An entity has no first name.
    expect(errors(buildSedeFile(source, { ...person, nif: 'B12345674', name: '' }))).toEqual([]);
  });

  it('refuses a wrong IBAN or one from outside Spain', () => {
    expect(errors(buildSedeFile(source, { ...person, iban: 'ES00 1234' }))).toEqual([
      'ibanInvalid',
    ]);
    expect(errors(buildSedeFile(source, { ...person, iban: 'DE89370400440532013000' }))).toEqual([
      'ibanNotEs',
    ]);
  });

  it('says what each form needs', () => {
    expect(needs(source)).toEqual({ iban: true, contact: false, activity: false, cnae: false });
    const zero: SedeSource = { ...source, result: { ...result115, result: 'zero' } };
    expect(needs(zero).iban).toBe(false);
    const draft = autonomoDraft();
    expect(needs({ model: '349', draft, m349 })).toEqual({
      iban: false,
      contact: true,
      activity: false,
      cnae: false,
    });
    expect(needs({ model: '390', draft, m390 }).activity).toBe(true);
    expect(
      needs({ model: '303', draft: autonomoDraft({ vat: vat303({ result: 'refund' }) }) }).iban
    ).toBe(true);
  });
});
