import type { Result111, Result115 } from '@modules/finances/domain/withholdings';
import { autonomoDraft } from '@test-utils/fixtures';
import {
  form130,
  form303,
  formWithholding,
  formatBox,
  kindOf,
  valuesOf,
} from '@modules/taxforms/domain/values';

describe('Writing a box as the form expects it', () => {
  it('always gives the cents and the thousands dot, also below 10,000', () => {
    expect(formatBox(1234.5, 'amount')).toBe('1.234,50');
    expect(formatBox(1234567.891, 'amount')).toBe('1.234.567,89');
    expect(formatBox(0, 'amount')).toBe('0,00');
    expect(formatBox(-17283.98, 'amount')).toBe('-17.283,98');
  });

  it('writes no minus sign for a negative that rounds to zero', () => {
    expect(formatBox(-0.001, 'amount')).toBe('0,00');
  });

  it('writes rates with cents and people as whole numbers', () => {
    expect(formatBox(21, 'percent')).toBe('21,00');
    expect(formatBox(2.6, 'count')).toBe('3');
  });

  it('knows which boxes count people or hold a rate', () => {
    expect(kindOf('111', '07')).toBe('count');
    expect(kindOf('115', '01')).toBe('count');
    expect(kindOf('303', '08')).toBe('percent');
    expect(kindOf('303', '65')).toBe('percent');
    expect(kindOf('130', '01')).toBe('amount');
  });

  it('keeps the first value of a box', () => {
    expect(
      valuesOf([
        { box: '01', label: 'a', amount: 1 },
        { box: '01', label: 'b', amount: 2 },
      ])
    ).toEqual({ '01': 1 });
  });
});

describe('The self-employed forms of a quarter', () => {
  it('takes every box of the 303 of the draft, with its quarter', () => {
    const form = form303(autonomoDraft({ quarter: 3 }));
    expect(form).toEqual({
      model: '303',
      year: 2026,
      period: '3T',
      values: { '07': 1000, '08': 21, '27': 220, '29': 42, '71': 178 },
      pending: [],
    });
  });

  it('adds the «información adicional» of the drafts that have it', () => {
    const draft = autonomoDraft();
    draft.vat = { ...draft.vat, info: [{ box: '59', label: 'Entregas UE', amount: 500 }] };
    expect(form303(draft).values['59']).toBe(500);
  });

  it('gives the 130 only when it is filed', () => {
    expect(form130(autonomoDraft())?.values).toEqual({ '04': 180 });
    const exempt = autonomoDraft();
    exempt.irpf = { ...exempt.irpf, required: false };
    expect(form130(exempt)).toBeNull();
  });

  it('gives the 111 and the 115 from the withholdings of the device', () => {
    const m115 = {
      boxes: [
        { box: '01', label: 'Número perceptores', amount: 1 },
        { box: '02', label: 'Base', amount: 3000 },
        { box: '03', label: 'Retenciones', amount: 570 },
      ],
    } as Result115;
    expect(formWithholding('115', m115, 2026, 2)).toEqual({
      model: '115',
      year: 2026,
      period: '2T',
      values: { '01': 1, '02': 3000, '03': 570 },
      pending: [],
    });
    const m111 = { boxes: [{ box: '28', label: 'Suma', amount: 150 }] } as Result111;
    expect(formWithholding('111', m111, 2026, 4).values).toEqual({ '28': 150 });
  });

  it('marks a complementaria of the 111 and the 115 with the number of the form it completes', () => {
    const previous = { result: 100, receipt: ' 1110000000123 ' };
    const m111 = { boxes: [{ box: '30', label: 'Resultado', amount: 50 }], previous } as Result111;
    expect(formWithholding('111', m111, 2026, 1).texts).toEqual({
      complementaria: 'X',
      justificante: '1110000000123',
    });
    const m115 = { boxes: [], previous: { result: 80, receipt: '' } } as unknown as Result115;
    expect(formWithholding('115', m115, 2026, 1).texts).toEqual({ complementaria: 'X' });
    expect(formWithholding('115', { ...m115, previous: null }, 2026, 1).texts).toBeUndefined();
  });
});
