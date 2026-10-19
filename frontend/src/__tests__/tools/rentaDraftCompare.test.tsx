import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

jest.setTimeout(60000);
// These suites drive the full form: the expert mode (the guided questions have their own).
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mm_renta_view', 'expert');
});

const premium = () => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(
    f.billing({
      plan: 'premium',
      renta: { draft: { allowed: true, reason: 'premium' }, eligibleOn: null, passUntil: null },
    })
  );
  return api;
};
const render = () =>
  renderWithProviders(<RentaPlanner mode="account" />, { api: premium(), plan: true });
const paste = async (text: string) => {
  fireEvent.click(await screen.findByText(tr('tools.renta.draft.paste')));
  fireEvent.change(screen.getByLabelText(tr('tools.renta.draft.paste'), { selector: 'textarea' }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.draft.read') }));
};
const table = () => screen.findByRole('region', { name: tr('tools.renta.compare.title') });
const row = (box: string) =>
  within(screen.getByRole('region', { name: tr('tools.renta.compare.title') }))
    .getByText(new RegExp(`\\(${box}\\)`), { selector: 'th' })
    .closest('tbody') as HTMLElement;

/**
 * The draft of a pensioner of 65 with a 33 % disability in Castilla y León (amounts of the
 * verification case, no personal data), line by line as the PDF prints it.
 */
const DRAFT = [
  'Modelo 100   Ejercicio 2025',
  'Fecha de nacimiento   15/03/1960   0010',
  'Grado de discapacidad   (1) Igual o superior al 33 % e inferior al 65 %   0011',
  '2025   CASTILLA Y LEÓN   0070',
  'Retribuciones dinerarias   18.379,04   0003',
  'Cotizac. Seguridad Social   1.235,98   0013',
  'Otros gastos deducibles   2.000,00   0019',
  'Rendimiento neto [(18)-(19)-(20)-(21)]   15.143,06   0022',
  'Reducción por obtención de rendimientos del trabajo   3.292,64   0023',
  'Rendimiento neto reducido [(22)-(23)]   11.850,42   0025',
  'Nº de días a disposición del contribuyente.   365   0085',
  'Valor catastral del inmueble   2.455,85   0083',
  'Renta inmobiliaria imputada.   49,12   0089',
  'Base imponible general   11.899,54   0435',
  'Base liquidable general   11.899,54   0500',
  'Mínimo contribuyente. Importe estatal   6.700,00   0511',
  'Mínimo por discapacidad. Importe estatal   3.000,00   0517',
  'Mínimo personal y familiar para calcular el gravamen estatal   9.700,00   0519',
  'Cuota íntegra estatal [(532)+(540)]   208,96   0545',
  'Cuota íntegra autonómica [(533)+(541)]   197,96   0546',
  'Por donativos, parte estatal   18,00   0552',
  'Deducción por obtención de rendimientos del trabajo   305,59   0414',
  'Cuota resultante de la autoliquidación   65,33   0595',
  'Total pagos a cuenta   1.182,42   0609',
  'Cuota diferencial [(595)-(609)]   -1.117,09   0610',
  'Resultado de la declaración   -1.117,09   0670',
].join('\n');

const why = (key: string, from?: string) =>
  tr(`tools.renta.compare.why.${key}`, {
    from: from ? `${tr(`tools.renta.compare.box.${from}`)} (${from})` : '',
  });

describe('Renta planner: the draft next to the planner', () => {
  it('fills in the planner and explains each difference until every box matches', async () => {
    render();
    await paste(DRAFT);
    await table();
    // Read from the draft: no need to type them.
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('18379.04');
    expect(screen.getByLabelText(tr('tools.renta.socialSecurity'))).toHaveValue('1235.98');
    expect(screen.getByLabelText(tr('tools.renta.withheld'))).toHaveValue('1182.42');
    expect(screen.getByLabelText(tr('tools.renta.age'))).toHaveValue('65');
    expect(screen.getByLabelText(tr('tools.renta.ccaa'))).toHaveValue('castilla-y-leon');
    await screen.findByText(/Deducciones de Castilla y León/);

    // Not a pensioner yet: 3,500 € more of expenses for a worker with a disability.
    expect(within(row('0019')).getByText(why('disabilityWorker'))).toBeInTheDocument();
    expect(within(row('0022')).getByText(why('carried', '0019'))).toBeInTheDocument();
    expect(within(row('0023')).getByText('=')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(tr('tools.renta.retired')));
    await waitFor(() => expect(within(row('0019')).getByText('=')).toBeInTheDocument());
    // The pensions count for the 340 € deduction until they are taken out.
    expect(within(row('0414')).getByText(why('lowPay'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr('tools.renta.nonSalary')), {
      target: { value: '1630,99' },
    });
    expect(within(row('0414')).getByText('=')).toBeInTheDocument();

    // The draft's donations (36 € in both halves) are filled in as what was given.
    expect(screen.getByLabelText(tr('tools.renta.donations.general'))).toHaveValue('45');
    // What was given (45 €), not the deduction: 80 % = 36 €, half of it in the State part (0552).
    fireEvent.change(screen.getByLabelText(tr('tools.renta.donations.general')), {
      target: { value: '45' },
    });
    expect(
      await screen.findByText(tr('tools.renta.compare.allMatch'), { exact: false })
    ).toBeInTheDocument();
    const same = document.querySelector('.renta-compare-summary') as HTMLElement;
    expect(same.textContent?.replace(/\s/g, ' ')).toBe(
      tr('tools.renta.compare.summarySame', {
        draft: tr('tools.renta.compare.refund', { amount: '1117,09 €' }),
      }).replace(/\s/g, ' ')
    );
    // A refund is green (the words say it too).
    expect(same.querySelector('.renta-amount--refund')).not.toBeNull();
  });

  it('sums up the whole difference in one line', async () => {
    render();
    await paste(DRAFT);
    await table();
    const summary = document.querySelector('.renta-compare-summary') as HTMLElement;
    expect(summary).toHaveTextContent(/Tu borrador da a devolver 1117,09/);
    expect(summary).toHaveTextContent(/diferencia de/);
    expect(screen.getByText(/Casillas que no coinciden/)).toBeInTheDocument();
  });

  it('says to pay when the draft and the planner give tax to pay', async () => {
    render();
    await paste('Retribuciones dinerarias 30.000,00 0003\nResultado de la declaración 500,00 0670');
    await table();
    expect(document.querySelector('.renta-compare-summary')).toHaveTextContent(
      /Tu borrador da a pagar 500,00.*nosotros damos a pagar/
    );
    // To pay is red: the draft's amount and ours.
    expect(document.querySelectorAll('.renta-compare-summary .renta-amount--pay')).toHaveLength(2);
  });

  it('warns about a draft of another year and shows no summary without the result', async () => {
    render();
    await paste('Modelo 100 Ejercicio 2024\nRetribuciones dinerarias 20.000,00 0003');
    await table();
    expect(screen.getByRole('alert')).toHaveTextContent(
      tr('tools.renta.compare.otherYear', { exercise: 2024, year: 2025 })
    );
    expect(document.querySelector('.renta-compare-summary')).toBeNull();
    expect(within(row('0003')).getByText('=')).toBeInTheDocument();
  });

  it('explains when a PDF has no boxes', async () => {
    render();
    await paste('Grado de discapacidad (3) Igual o superior al 65 % 0011');
    await table();
    expect(screen.getByText(tr('tools.renta.compare.noBoxes'))).toBeInTheDocument();
    // The disability is still read, and it was the only thing found.
    expect(screen.queryByText(tr('tools.renta.draft.nothing'))).toBeNull();
    expect(screen.getByLabelText(tr('tools.renta.ownDisability'))).toHaveValue('65');
  });

  it('fills in a property at the owner’s disposal for part of the year', async () => {
    render();
    await paste(
      'Nº de días a disposición del contribuyente. 183 0085\nValor catastral del inmueble 10.000,00 0083\nRenta inmobiliaria imputada. 55,00 0089'
    );
    await table();
    expect(screen.getByText(tr('tools.renta.unrented'), { selector: 'span' })).toBeInTheDocument();
    // The days of box 0085 as they are (they used to become 6 months).
    expect(screen.getByLabelText(tr('tools.renta.days', { n: 1 }))).toHaveValue('183');
  });

  it('leaves the days empty (the whole year) when the draft does not give them', async () => {
    render();
    await paste(
      'Valor catastral del inmueble 10.000,00 0083\nRenta inmobiliaria imputada. 110,00 0089'
    );
    await table();
    expect(screen.getByLabelText(tr('tools.renta.days', { n: 1 }))).toHaveValue('');
  });

  it('hides the comparison while trying next year with the same data', async () => {
    render();
    await paste(DRAFT);
    await table();
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.draft.tryNext', { year: 2027 }) })
    );
    expect(screen.queryByRole('region', { name: tr('tools.renta.compare.title') })).toBeNull();
  });
});

/**
 * The draft of persona p3-61 (a young tenant in a Castellón village at risk of depopulation; made-up
 * data): it already applies two Valencian deductions that the planner has not marked yet.
 */
const VALENCIAN = [
  'Modelo 100   Ejercicio 2025',
  'Fecha de nacimiento   01/01/1997   0010',
  '2025   COMUNITAT VALENCIANA   0070',
  'Retribuciones dinerarias   21.000,00   0003',
  'Cotizac. Seguridad Social   1.360,80   0013',
  'Cuota íntegra estatal   1.263,39   0545',
  'Cuota íntegra autonómica   1.192,44   0546',
  'Deducciones autonómicas de la Comunitat Valenciana',
  'Por alquiler de vivienda habitual   950,00   0961',
  'Por vivir en un municipio en riesgo de despoblamiento   330,00   0985',
  'Suma de deducciones autonómicas   1.280,00',
  'Total pagos a cuenta   1.900,00   0609',
  'Resultado de la declaración   -636,61   0670',
].join('\n');

describe('the verdict next to the draft', () => {
  const verdict = (key: string) => tr(`tools.renta.compare.verdict.${key}`);

  it('explains a difference made of the draft’s deductions and adds them until it matches', async () => {
    render();
    await paste(VALENCIAN);
    await table();
    // Not «you would pay more»: the draft already applies deductions that are not ticked here.
    expect(await screen.findByText(verdict('explained'))).toBeInTheDocument();
    expect(
      screen.getByText(
        verdict('explainedWhy').replace('{amount}', '1192,44 €').replace(/\s/g, ' '),
        {
          normalizer: (s) => s.replace(/\s/g, ' '),
        }
      )
    ).toBeInTheDocument();
    expect(screen.getByText(verdict('meaningTitle'))).toBeInTheDocument();
    const add = () => screen.getAllByRole('button', { name: tr('tools.renta.compare.gaps.add') });
    expect(add()).toHaveLength(2);
    fireEvent.click(add()[0]);
    fireEvent.click(add()[0]);
    expect(await screen.findByText(verdict('match'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: tr('tools.renta.compare.gaps.add') })).toBeNull();
  });

  it('says red when the draft’s deductions do not explain it, and copies an unknown one', async () => {
    render();
    await paste(
      VALENCIAN.replace('-636,61   0670', '-900,00   0670').replace(
        'Por vivir en un municipio en riesgo de despoblamiento',
        'Por una deducción que no tenemos en la lista'
      )
    );
    await table();
    expect(await screen.findByText(verdict('unexplained'))).toBeInTheDocument();
    expect(screen.getByText(tr('tools.renta.compare.gaps.copy'))).toBeInTheDocument();
    expect(screen.getByText(/aún no has marcado aquí/)).toBeInTheDocument();
  });
});
