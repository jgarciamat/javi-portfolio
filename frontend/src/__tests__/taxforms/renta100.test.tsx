import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@test-utils/render';
import { computeRenta, type RentaResult } from '@modules/tools/domain/rentaCalc';
import { emptyForm, toInput, type RentaForm } from '@modules/tools/domain/rentaForm';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { loadCcaa } from '@modules/tools/data/renta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';
import { RENTA_PENDING, form100 } from '@modules/taxforms/domain/values';
import { RentaFormPreview } from '@modules/taxforms/ui/FormPreviews';
import { previewText } from '@modules/taxforms/ui/FormPreview';

/** A made-up return in Castilla y León; tests change what they need. */
async function renta(patch: Partial<RentaForm> = {}) {
  const form: RentaForm = { ...emptyForm('30000'), ccaaId: 'castilla-y-leon', ...patch };
  const input = toInput(form, {
    state: rentaState,
    ccaa: await loadCcaa('castilla-y-leon'),
    extras: rentaWorkExtras,
    property: rentaProperty,
    workReduction: workReductionOf(rentaState),
  });
  return { input, result: computeRenta(input) };
}

/** The savings worked out in detail, as rentaGains gives them (only what the form takes). */
const savingsDetail = (over: Partial<Record<string, number>> = {}) =>
  ({
    withheld: { capital: 38, gains: 19 },
    boxes: {
      '0027': 120,
      '0029': 80,
      '0036': 200,
      '0041': 190,
      '0424': 1000,
      '0460': 999999,
      pendingGainsOnGains: 5,
      ...over,
    },
  }) as unknown as RentaResult['savingsDetail'];

const direct = { income: 30000, expenses: 8000, difference: 22000, net: 21000 };

const activities = (each: unknown[]) =>
  ({
    direct: 21000,
    dependentReduction: 0,
    smallIncomeReduction: 0,
    startReduction: 4200,
    directTotal: 16800,
    modules: 0,
    agrarian: 0,
    total: 16800,
    withheld: 1500,
    payments: 2000,
    each,
  }) as unknown as RentaResult['activities'];

describe('The Renta (modelo 100) with the figures of the planner', () => {
  it('fills the boxes compared with the draft and marks the main ones it does not give', async () => {
    const { input, result } = await renta({ socialSecurity: '1950', withheld: '4200' });
    const form = form100(result, input, 2025);
    expect(form).toMatchObject({ model: '100', year: 2025, period: null });
    expect(form.values['0003']).toBe(30000);
    expect(form.values['0013']).toBe(1950);
    // The pay is the only income: its withholdings are those of work.
    expect(form.values['0596']).toBe(4200);
    expect(form.values['0609']).toBe(4200);
    // Nothing of rents, savings or activities: their boxes stay empty, not at zero.
    for (const box of ['0156', '0027', '0231', '0588', '0597']) {
      expect(form.values).not.toHaveProperty(box);
    }
    expect(form.pending).toEqual(expect.arrayContaining(['0027', '0235', '0597', '0611']));
    expect(form.pending.every((b) => RENTA_PENDING.includes(b) && !(b in form.values))).toBe(true);
  });

  it('adds the rents, the pension plan and the family minimums', async () => {
    const { input, result } = await renta({
      rentalOn: true,
      rentalIncome: '6000',
      pension: '1500',
      children: [{ age: '8', disability: 0 }],
      ascendants: [{ over75: true, disability: 0 }],
    });
    const form = form100(result, input, 2025);
    expect(form.values['0156']).toBe(result.rentalNet);
    expect(form.values['0492']).toBe(result.pensionReduction);
    expect(form.values['0513']).toBeGreaterThan(0);
    expect(form.values['0515']).toBeGreaterThan(0);
  });

  it('puts the plan and the patrimony of a relative with a disability in 0494 and 0495', async () => {
    const { input, result } = await renta({
      relativePlan: { mine: '1000' },
      patrimony: { mine: '2000', others: '' },
    });
    const form = form100(result, input, 2025);
    expect(form.values['0494']).toBe(1000);
    expect(form.values['0495']).toBe(2000);
  });

  it('takes the savings, the activities, the gains and the double taxation from the result', async () => {
    const { input, result } = await renta({ withheld: '4200' });
    const full: RentaResult = {
      ...result,
      workReductions: 400,
      savingsDetail: savingsDetail(),
      activities: activities([{ name: 'Diseño', net: 21000, detail: direct }]),
      generalGains: { base: 0, '0431': 0, '0433': 150, '0434': 0, carry: [] },
      savingsReduction: 300,
      doubleTaxation: 12.5,
      withheld: result.withheld + 38 + 19 + 1500 + 2000,
    };
    const form = form100(full, input, 2025);
    expect(form.values).toMatchObject({
      '0011': 400,
      '0027': 120,
      '0029': 80,
      '0041': 190,
      '0424': 1000,
      '0597': 38,
      '0603': 19,
      '0588': 12.5,
      '0180': 30000,
      '0218': 8000,
      '0224': 21000,
      '0231': 21000,
      '0234': 4200,
      '0235': 16800,
      '0599': 1500,
      '0604': 2000,
      '0433': 150,
      '0507': 300,
    });
    // The planner's own savings base stands; the rest of the keys of the detail are not boxes.
    expect(form.values['0460']).toBe(result.savingsIncome);
    expect(form.values).not.toHaveProperty('pendingGainsOnGains');
    // The withholdings of work are the total less those of the savings and the activities.
    expect(form.values['0596']).toBe(4200);
    expect(form.pending).not.toContain('0235');
  });

  it('leaves the detail of an activity out when there are several or it is not direct', async () => {
    const { input, result } = await renta();
    const two = form100(
      { ...result, activities: activities([{ detail: direct }, { detail: direct }]) },
      input,
      2025
    );
    expect(two.values).not.toHaveProperty('0180');
    const modules = form100(
      { ...result, activities: activities([{ detail: { net: 9000 } }]) },
      input,
      2025
    );
    expect(modules.values).not.toHaveProperty('0224');
  });
});

describe('The preview of the Renta on the screen', () => {
  it('is titled as the official form and explains the boxes left for the draft', async () => {
    const { input, result } = await renta();
    renderWithI18n(<RentaFormPreview result={result} input={input} year={2025} />);
    expect(
      screen.getByRole('heading', { name: 'Tu declaración en el modelo oficial (vista previa)' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver vista previa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar imagen (PNG)' })).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Casillas rellenadas/));
    expect(screen.getByText(/No calculadas \(cópialas de tu borrador\)/)).toBeInTheDocument();
    const t = (key: string) => key;
    const form = form100(result, input, 2025);
    expect(previewText(t, form).legend).toBe('taxforms.mark.legend100');
  });

  it('shows nothing for a result saved by an older version', () => {
    const broken = { minimum: {} } as unknown as RentaResult;
    const { container } = renderWithI18n(
      <RentaFormPreview result={broken} input={{} as never} year={2025} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
