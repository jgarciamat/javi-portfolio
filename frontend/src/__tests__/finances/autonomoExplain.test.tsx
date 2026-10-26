import { screen } from '@testing-library/react';
import { translate } from '@core/i18n/I18nContext';
import { formatMoney } from '@shared/utils/format';
import { explainDraft } from '@modules/finances/ui/components/AutonomoExplain';
import { DraftResult } from '@modules/finances/ui/components/AutonomoDraftResult';
import type { AutonomoDraft, TaxBox } from '@modules/finances/domain/types';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

const boxes = (pairs: Record<string, number>): TaxBox[] =>
  Object.entries(pairs).map(([box, amount]) => ({ box, label: box, amount }));

const explain = (draft: Pick<AutonomoDraft, 'vat' | 'irpf'>, locale: 'es' | 'en' = 'es') =>
  explainDraft(
    (key, vars) => translate(locale, key, vars),
    (n) => formatMoney(n, 'EUR', locale),
    draft
  );

// The third quarter of the example books (docs/ejemplos-importacion), as the server prepares it.
const vat = (over: Partial<AutonomoDraft['vat']> = {}): AutonomoDraft['vat'] => ({
  result: 'pay',
  amountDue: 918.6,
  accrued: boxes({ '27': 1116 }),
  deductible: boxes({ '45': 197.4 }),
  settlement: boxes({ '46': 918.6, '78': 0 }),
  ...over,
});
const irpf = (
  pairs: Record<string, number> = {},
  over: Partial<AutonomoDraft['irpf']> = {}
): AutonomoDraft['irpf'] => ({
  required: true,
  result: 'pay',
  amountDue: 15.6,
  boxes: boxes({
    '01': 17100,
    '02': 4770.25,
    '03': 12329.75,
    '04': 2465.95,
    '05': 245.35,
    '06': 2205,
    '13': 0,
    '15': 0,
    ...pairs,
  }),
  ...over,
});
const nb = (text: string) => text.replace(/\u00a0/g, ' ');

describe('The draft in plain words', () => {
  it('says the 8 % of Ceuta, Melilla and La Palma, and the 0,8 % of farming there', () => {
    const reduced = explain({ vat: vat(), irpf: irpf({}, { rate: 0.08 }) });
    expect(nb(reduced.irpf)).toContain('el 8 % de tus beneficios acumulados (12.329,75 €)');
    const zero = irpf(
      { '01': 1000, '02': 1500, '03': -500 },
      { result: 'zero', amountDue: 0, rate: 0.08 }
    );
    expect(nb(explain({ vat: vat(), irpf: zero }).irpf)).toContain('pagar el 8 %.');
    const covered = irpf(
      { '04': 986.38, '05': 1000 },
      { result: 'zero', amountDue: 0, rate: 0.08 }
    );
    expect(nb(explain({ vat: vat(), irpf: covered }).irpf)).toContain('El 8 % de tus beneficios');
    const farm = irpf({ '08': 10000, '09': 80, '10': 0 }, { amountDue: 80, rate: 0.008 });
    expect(nb(explain({ vat: vat(), irpf: farm }).irpf)).toContain('el 0,8 % de los ingresos');
    expect(nb(explain({ vat: vat(), irpf: farm }, 'en').irpf)).toContain('0.8 % of the income');
    // Without the rate (older servers): 2 % of farming.
    const oldFarm = irpf({ '08': 10000, '09': 200, '10': 0 }, { amountDue: 200 });
    expect(nb(explain({ vat: vat(), irpf: oldFarm }).irpf)).toContain('el 2 % de los ingresos');
  });

  it('explains a 303 and a 130 to pay with the figures of the draft', () => {
    const { vat: v, irpf: i } = explain({ vat: vat(), irpf: irpf() });
    expect(nb(v)).toBe(
      'IVA (303): a pagar 918,60 €. Cobraste 1.116,00 € de IVA en tus facturas y puedes restar 197,40 € de IVA de tus gastos.'
    );
    expect(nb(i)).toBe(
      'IRPF (130): a pagar 15,60 €: el 20 % de tus beneficios acumulados (12.329,75 €) menos lo ya pagado (245,35 €) y las retenciones de tus clientes (2.205,00 €).'
    );
  });

  it('says it in English too', () => {
    const { vat: v, irpf: i } = explain({ vat: vat(), irpf: irpf() }, 'en');
    expect(v).toBe(
      'VAT (303): €918.60 to pay. You charged €1,116.00 of VAT on your invoices and can subtract €197.40 of VAT from your expenses.'
    );
    expect(i).toBe(
      "Income tax (130): €15.60 to pay: 20 % of your profit so far this year (€12,329.75) minus what you already paid (€245.35) and your clients' withholdings (€2,205.00)."
    );
  });

  it('adds what was offset from earlier quarters', () => {
    const { vat: v } = explain({
      vat: vat({ amountDue: 818.6, settlement: boxes({ '46': 918.6, '78': 100 }) }),
      irpf: irpf(),
    });
    expect(nb(v)).toContain('De los 918,60 € que salían, se descuentan 100,00 €');
    const zero = explain({
      vat: vat({ result: 'zero', amountDue: 0, settlement: boxes({ '46': 50, '78': 50 }) }),
      irpf: irpf(),
    });
    expect(nb(zero.vat)).toBe(
      'IVA (303): resultado cero. Salían 50,00 € a pagar, pero los cubren los 50,00 € que tenías a compensar de trimestres anteriores.'
    );
  });

  it('covers a VAT to offset, a zero and no activity', () => {
    const offset = explain({
      vat: vat({
        result: 'offset',
        amountDue: -80,
        accrued: boxes({ '27': 20 }),
        deductible: boxes({ '45': 100 }),
        settlement: [],
      }),
      irpf: irpf(),
    });
    expect(nb(offset.vat)).toMatch(
      /^IVA \(303\): a compensar 80,00 €\. El IVA de tus gastos \(100,00 €\)/
    );
    const zero = explain({
      vat: vat({
        result: 'zero',
        amountDue: 0,
        accrued: boxes({ '27': 21 }),
        deductible: boxes({ '45': 21 }),
      }),
      irpf: irpf(),
    });
    expect(nb(zero.vat)).toContain('(21,00 €) es el mismo');
    const none = explain({ vat: vat({ result: 'noActivity', amountDue: 0 }), irpf: irpf() });
    expect(none.vat).toBe(tr('app.autonomo.explain.vat.noActivity'));
  });

  it('covers a 130 with nothing to take off, covered by payments, without profit or negative', () => {
    const bare = explain({ vat: vat(), irpf: irpf({ '05': 0, '06': 0 }) });
    expect(nb(bare.irpf)).toBe(
      'IRPF (130): a pagar 15,60 €: el 20 % de tus beneficios acumulados (12.329,75 €).'
    );
    const withheld = explain({ vat: vat(), irpf: irpf({ '05': 0 }) });
    expect(nb(withheld.irpf)).toContain(
      '(12.329,75 €) menos las retenciones de tus clientes (2.205,00 €).'
    );
    const covered = explain({
      vat: vat(),
      irpf: irpf({ '05': 1000, '06': 2000, '13': 50, '15': 10 }, { result: 'zero', amountDue: 0 }),
    });
    expect(nb(covered.irpf)).toBe(
      'IRPF (130): resultado cero. El 20 % de tus beneficios acumulados (12.329,75 €) son 2.465,95 €, y ya lo cubren lo ya pagado (1.000,00 €), las retenciones de tus clientes (2.000,00 €), la reducción por rentas bajas (50,00 €) y lo negativo de trimestres anteriores (10,00 €).'
    );
    const loss = explain({
      vat: vat(),
      irpf: irpf({ '01': 100, '02': 300, '03': -200, '04': 0 }, { result: 'zero', amountDue: 0 }),
    });
    expect(nb(loss.irpf)).toBe(
      'IRPF (130): resultado cero. En lo que va de año tus gastos (300,00 €) igualan o superan tus ingresos (100,00 €): no hay beneficio del que pagar el 20 %.'
    );
    const rounding = explain({
      vat: vat(),
      irpf: irpf({ '03': 0.01, '04': 0, '05': 0, '06': 0 }, { result: 'zero', amountDue: 0 }),
    });
    expect(rounding.irpf).toContain(tr('app.autonomo.explain.irpf.noProfit').slice(0, 25));
    const negative = explain({
      vat: vat(),
      irpf: irpf({ '05': 0, '06': 2465.95, '13': 100 }, { result: 'negative', amountDue: -100 }),
    });
    expect(nb(negative.irpf)).toMatch(
      /^IRPF \(130\): resultado negativo \(100,00 €\): la reducción por rentas bajas \(100,00 €\)/
    );
  });

  it('covers a 130 without activity and one the person does not file', () => {
    const none = explain({
      vat: vat(),
      irpf: irpf({ '01': 0, '02': 0, '03': 0 }, { result: 'zero', amountDue: 0 }),
    });
    expect(none.irpf).toBe(tr('app.autonomo.explain.irpf.noActivity'));
    const exempt = explain({
      vat: vat(),
      irpf: { required: false, result: 'notRequired', amountDue: 0, boxes: [] },
    });
    expect(exempt.irpf).toBe(tr('app.autonomo.explain.irpf.notRequired'));
    // Boxes the draft does not have count as zero.
    expect(explain({ vat: vat({ accrued: [] }), irpf: irpf() }).vat).toContain('0,00');
  });

  it('explains section II of a farming activity, quarter by quarter', () => {
    const farm = {
      required: true,
      result: 'pay' as const,
      amountDue: 310,
      boxes: boxes({ '08': 23000, '09': 460, '10': 150, '11': 310, '12': 310, '19': 310 }),
    };
    expect(nb(explain({ vat: vat(), irpf: farm }).irpf)).toBe(
      'IRPF (130, sección agraria): a pagar 310,00 €: el 2 % de los ingresos del trimestre (23.000,00 €) menos sus retenciones (150,00 €). Cada trimestre va solo, sin acumular.'
    );
    const nothing = { ...farm, result: 'zero' as const, amountDue: 0 };
    expect(nb(explain({ vat: vat(), irpf: nothing }, 'en').irpf)).toContain('€0.00 to pay');
  });

  it('is shown above the boxes of the result', () => {
    renderWithProviders(<DraftResult draft={f.autonomoDraft()} inputs={null} />);
    const title = screen.getByRole('heading', { name: tr('app.autonomo.explain.title') });
    const boxesTitle = screen.getByRole('heading', { name: tr('app.autonomo.accrued') });
    expect(
      title.compareDocumentPosition(boxesTitle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByText(/^IVA \(303\): a pagar 178,00/)).toBeInTheDocument();
  });
});
