/**
 * Files of the informative returns 190, 180 and 347, written from their record designs and read
 * back field by field. Every person, tax id, address and amount here is invented.
 */
import { recordId } from '@modules/finances/application/aeatFiles/annualFiles';
import { readText } from '@modules/finances/application/aeatFiles/fixedWidth';
import {
  euros,
  informativeId,
  readInformative,
} from '@modules/finances/application/aeatFiles/informative';
import {
  EMPTY_DECLARANT,
  buildSedeFile,
  needs,
  type Built,
  type Declarant,
  type SedeSource,
} from '@modules/finances/application/aeatFiles/models';
import {
  LA_PALMA,
  PROVINCES,
  provincesOf,
} from '@modules/finances/application/aeatFiles/provinces';
import type {
  PayeeRecord,
  Record347,
  Summary347,
  YearSummary,
} from '@modules/finances/domain/annualSummaries';

const codes = (b: Built) => b.checks.map((c) => c.code);
const errors = (b: Built) => b.checks.filter((c) => c.level === 'error').map((c) => c.code);
const at = (line: string, from: number, to: number) => line.slice(from - 1, to);

/** Invented: the NIF 12345678Z has a valid letter; B12345674 is a valid entity NIF. */
const base: Declarant = {
  ...EMPTY_DECLARANT,
  nif: '12345678Z',
  surname: 'Pérez Núñez',
  name: 'Lucía',
  phone: '600000000',
  contact: 'Lucía Pérez',
  email: 'lucia@example.test',
};

const payee = (over: Partial<PayeeRecord>): PayeeRecord => ({
  nif: '00000000T',
  name: 'Estudio Inventado',
  key: 'G',
  subkey: '01',
  paid: 2000,
  inKind: 0,
  withheld: 300,
  rate: null,
  typed: false,
  ...over,
});

describe('Provinces and ids', () => {
  it('lists the 52 provinces of the designs, and La Palma only for the 190 and the 180', () => {
    expect(PROVINCES).toHaveLength(52);
    expect(provincesOf('347')).toHaveLength(52);
    expect(provincesOf('190')).toContainEqual(LA_PALMA);
    expect(informativeId('190', 2025)).toBe('1902025000001');
    expect(recordId('347', { key: 'A', nif: null, name: 'X' })).toBe('347:A:X');
    expect(recordId('190', { nif: '1', name: 'X' })).toBe('190::1');
  });
});

describe('Modelo 190', () => {
  // Two professionals: 2,000.00 at 15 % (300.00) and 1,000.00 at 7 % (70.00).
  const records = [
    payee({}),
    payee({ nif: '00000001R', name: 'Ana Inventada', subkey: '03', paid: 1000, withheld: 70 }),
  ];
  const summary: YearSummary = { model: '190', records, boxes: [], warnings: [] };
  const source: SedeSource = { model: '190', year: 2025, summary };
  const d: Declarant = {
    ...base,
    records: {
      [recordId('190', records[0])]: { province: '28' },
      [recordId('190', records[1])]: { province: '53' },
    },
  };

  it('asks for the contact, the e-mail and the province of each payee', () => {
    const n = needs(source);
    expect([n.contact, n.email]).toEqual([true, true]);
    const built = buildSedeFile(source, { ...base, phone: '', email: '' });
    expect(codes(built)).toEqual(['phone', 'email190', 'province', 'province']);
    expect(built.file).toBeNull();
  });

  it('writes the type 1 summary and one type 2 record per professional, and reads them back', () => {
    const built = buildSedeFile(source, d);
    expect(built.checks).toEqual([]);
    const file = built.file!;
    expect(file.fileName).toBe('12345678Z2025.190');
    const read = readInformative(file.text);
    expect(read).toMatchObject({
      model: '190',
      year: 2025,
      nif: '12345678Z',
      name: 'PEREZ NUÑEZ LUCIA',
      id: '1902025000001',
      count: 2,
    });
    const [one] = file.text.split('\r\n');
    expect(one[57]).toBe('T');
    expect(at(one, 59, 67)).toBe('600000000');
    expect(euros(one, 145, 16, true)).toBe(3000);
    expect(euros(one, 161, 15)).toBe(370);
    expect(readText(one, 176, 50)).toBe('lucia@example.test');
    const [a, b] = read.details;
    expect(at(a, 18, 26)).toBe('00000000T');
    expect(at(a, 76, 80)).toBe('28G01');
    expect(euros(a, 82, 13)).toBe(2000);
    expect(euros(a, 95, 13)).toBe(300);
    // The rest of the numbers are zeros; the NIF of the spouse (158-166) stays blank.
    expect(at(a, 148, 157)).toBe('0'.repeat(10));
    expect(at(a, 158, 166)).toBe(' '.repeat(9));
    expect(at(a, 388, 394)).toBe('0000000');
    expect(at(a, 395, 500).trim()).toBe('');
    expect(at(b, 76, 80)).toBe('53G03');
    expect(euros(b, 95, 13)).toBe(70);
  });

  it('refuses typed totals, payees without a valid NIF or without a subkey, and warns of later years', () => {
    const bad: YearSummary = {
      ...summary,
      records: [
        payee({ nif: null, subkey: null, name: '' }),
        payee({ typed: true, key: 'A', nif: null }),
      ],
    };
    const built = buildSedeFile({ model: '190', year: 2026, summary: bad }, base);
    expect(codes(built)).toEqual(['design190', 'typed190', 'personNif', 'province', 'subkey190']);
    expect(built.checks[1].values).toEqual({ key: 'A' });
    expect(built.checks[2].values).toEqual({ who: '—' });
    const typedNoKey = buildSedeFile(
      {
        model: '190',
        year: 2025,
        summary: { ...summary, records: [payee({ typed: true, key: null })] },
      },
      d
    );
    expect(typedNoKey.checks[0].values).toEqual({ key: '' });
  });
});

describe('Modelo 180', () => {
  // A rent of 12,000.00 a year at 19 % = 2,280.00.
  const landlord = payee({
    nif: 'B12345674',
    name: 'Inmuebles Inventados SL',
    key: null,
    subkey: null,
    paid: 12000,
    withheld: 2280,
    rate: 19,
  });
  const summary: YearSummary = { model: '180', records: [landlord], boxes: [], warnings: [] };
  const source: SedeSource = { model: '180', year: 2025, summary };
  const premises = {
    province: '28',
    situation: '1' as const,
    cadastre: '0000000aa0000a0001aa',
    street: 'Calle Inventada',
    number: '1',
    floor: 'BJ',
    door: 'A',
    municipality: 'Madrid',
    municipalityCode: '28079',
    postcode: '28001',
  };

  it('writes the landlord with the rate, the cadastral reference and the address of the premises', () => {
    const d = { ...base, records: { [recordId('180', landlord)]: { province: '28', premises } } };
    const built = buildSedeFile(source, d);
    expect(codes(built)).toEqual(['design180']);
    const read = readInformative(built.file!.text);
    expect(read.count).toBe(1);
    const [one] = built.file!.text.split('\r\n');
    expect(euros(one, 145, 16, true)).toBe(12000);
    expect(euros(one, 161, 15)).toBe(2280);
    const [r] = read.details;
    expect(at(r, 18, 26)).toBe('B12345674');
    expect(at(r, 76, 79)).toBe('281 ');
    expect(euros(r, 80, 13)).toBe(12000);
    expect(at(r, 93, 96)).toBe('1900');
    expect(euros(r, 97, 13)).toBe(2280);
    expect(at(r, 110, 114)).toBe('00001');
    expect(at(r, 115, 134)).toBe('0000000AA0000A0001AA');
    expect(readText(r, 135, 5)).toBe('CL');
    expect(readText(r, 140, 50)).toBe('CALLE INVENTADA');
    expect(at(r, 190, 197)).toBe('NUM1    ');
    expect(at(r, 210, 215)).toBe('BJ A  ');
    expect(readText(r, 286, 30)).toBe('MADRID');
    expect(at(r, 316, 327)).toBe('280792828001');
  });

  it('takes a premises without cadastral reference (situation 4) and writes «S/N» without a number', () => {
    const d = {
      ...base,
      records: {
        [recordId('180', landlord)]: {
          province: '28',
          premises: { ...premises, situation: '4' as const, cadastre: '', number: '' },
        },
      },
    };
    const [r] = readInformative(buildSedeFile(source, d).file!.text).details;
    expect(at(r, 114, 134)).toBe('4' + ' '.repeat(20));
    expect(at(r, 190, 192)).toBe('S/N');
  });

  it('writes «CL» when the kind of street is left empty, and names a landlord without name «—»', () => {
    const nameless = { ...landlord, name: '' };
    const d = {
      ...base,
      records: {
        [recordId('180', nameless)]: {
          province: '28',
          premises: { ...premises, streetType: '', postcode: '' },
        },
      },
    };
    const built = buildSedeFile(
      { model: '180', year: 2025, summary: { ...summary, records: [nameless] } },
      d
    );
    expect(built.checks.at(-1)).toEqual({ level: 'error', code: 'address', values: { who: '—' } });
    const fixed = {
      ...d,
      records: {
        [recordId('180', nameless)]: { province: '28', premises: { ...premises, streetType: '' } },
      },
    };
    const [r] = readInformative(
      buildSedeFile(
        { model: '180', year: 2025, summary: { ...summary, records: [nameless] } },
        fixed
      ).file!.text
    ).details;
    expect(readText(r, 135, 5)).toBe('CL');
  });

  it('asks for the cadastral reference and the address, and refuses typed totals', () => {
    const typed = payee({ typed: true, key: null, nif: null });
    const built = buildSedeFile(
      { model: '180', year: 2025, summary: { ...summary, records: [landlord, typed] } },
      base
    );
    expect(codes(built)).toEqual(['design180', 'typed180', 'province', 'cadastre', 'address']);
    // A landlord without a rate writes 00,00 %.
    const noRate = { ...landlord, rate: null };
    const d = { ...base, records: { [recordId('180', noRate)]: { province: '28', premises } } };
    const [r] = readInformative(
      buildSedeFile({ model: '180', year: 2025, summary: { ...summary, records: [noRate] } }, d)
        .file!.text
    ).details;
    expect(at(r, 93, 96)).toBe('0000');
  });
});

const rec = (over: Partial<Record347>): Record347 => ({
  key: 'B',
  nif: '00000000T',
  name: 'Cliente Inventado',
  total: 6050,
  quarters: [1210, 2420, 0, 2420],
  premises: false,
  withheld: false,
  reverse: false,
  ...over,
});

describe('Modelo 347', () => {
  // A client with 6,050.00 (VAT included) in three quarters, and the rent of the premises (key A),
  // with a credit note that leaves the 4T negative.
  const records = [
    rec({}),
    rec({
      key: 'A',
      nif: 'B12345674',
      name: 'Locales Inventados SL',
      total: 4000,
      quarters: [1500, 1500, 1500, -500],
      premises: true,
      reverse: true,
    }),
  ];
  const summary: Summary347 = {
    known: true,
    threshold: 3005.06,
    records,
    boxes: [],
    warnings: [{ code: 'notSubject', who: 'Cliente Inventado' }],
    left: 0,
  };
  const source: SedeSource = { model: '347', year: 2025, summary };
  const d: Declarant = {
    ...base,
    records: {
      [recordId('347', records[0])]: { province: '08' },
      [recordId('347', records[1])]: { province: '46' },
    },
  };

  it('writes one «declarado» per person and key with the four quarters and its marks', () => {
    const built = buildSedeFile(source, d);
    expect(codes(built)).toEqual(['notSubject347']);
    const file = built.file!;
    expect(file.fileName).toBe('12345678Z2025.347');
    const read = readInformative(file.text);
    expect(read.count).toBe(2);
    const [one] = file.text.split('\r\n');
    expect(euros(one, 145, 16, true)).toBe(10050);
    expect(at(one, 161, 185)).toBe('000000000 000000000000000');
    const [b, a] = read.details;
    expect(at(b, 76, 82)).toBe('D08   B');
    expect(euros(b, 83, 16, true)).toBe(6050);
    expect([136, 168, 200, 232].map((p) => euros(b, p, 16, true))).toEqual([1210, 2420, 0, 2420]);
    expect(at(a, 76, 82)).toBe('D46   A');
    expect(a[99]).toBe('X');
    expect(a[281]).toBe('X');
    expect(at(a, 232, 247)).toBe('N000000000050000');
    expect(euros(a, 232, 16, true)).toBe(-500);
    expect(b[99]).toBe(' ');
  });

  it('writes a negative total with «N» in the summary', () => {
    const credit = rec({ total: -4000, quarters: [-4000, 0, 0, 0] });
    const dd = { ...base, records: { [recordId('347', credit)]: { province: '28' } } };
    const built = buildSedeFile(
      { model: '347', year: 2025, summary: { ...summary, records: [credit], warnings: [] } },
      dd
    );
    const [one] = built.file!.text.split('\r\n');
    expect(one[144]).toBe('N');
    expect(euros(one, 145, 16, true)).toBe(-4000);
  });

  it('asks for the NIF and province of each person and warns of withholdings and unknown figures', () => {
    const odd: Summary347 = {
      ...summary,
      known: false,
      records: [rec({ nif: null, withheld: true })],
      warnings: [{ code: 'nif', who: 'Cliente Inventado' }],
    };
    const built = buildSedeFile({ model: '347', year: 2028, summary: odd }, base);
    expect(codes(built)).toEqual(['figures347', 'personNif', 'province', 'withheld347']);
    const none = buildSedeFile(
      { model: '347', year: 2025, summary: { ...summary, records: [], warnings: [] } },
      base
    );
    expect(errors(none)).toEqual(['none347']);
  });
});

describe('The reader of the informative returns', () => {
  it('refuses records of a wrong length or type, and fields that are not numbers', () => {
    const d = { ...base, records: { [recordId('347', rec({}))]: { province: '08' } } };
    const text = buildSedeFile(
      {
        model: '347',
        year: 2025,
        summary: {
          known: true,
          threshold: 1,
          records: [rec({})],
          boxes: [],
          warnings: [],
          left: 0,
        },
      },
      d
    ).file!.text;
    const [one, two] = text.split('\r\n');
    expect(() => readInformative(`${one}X\r\n`)).toThrow('length');
    expect(() => readInformative(`2${one.slice(1)}\r\n`)).toThrow('type 1');
    expect(() => readInformative(`${one}\r\n1${two.slice(1)}\r\n`)).toThrow('type 2');
    expect(() => euros(`${one.slice(0, 160)}X${one.slice(161)}`, 161, 9)).toThrow('number at 161');
  });
});
