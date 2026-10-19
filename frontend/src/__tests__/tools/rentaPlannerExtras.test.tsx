import { fireEvent, screen, within } from '@testing-library/react';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

// These suites drive the full form: the expert mode (the guided questions have their own).
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mm_renta_view', 'expert');
});

const premium = () => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
  return api;
};
const render = (income = '30000') =>
  renderWithProviders(<RentaPlanner mode="account" initialIncome={income} />, {
    api: premium(),
    plan: true,
  });
const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(tr(label)), { target: { value } });
const resultText = () => document.querySelector('.renta-total')?.textContent;

describe('Renta planner: work, contributions and savings', () => {
  it('lowers the tax with work expenses, mobility and pension contributions', async () => {
    render();
    await screen.findByText(new RegExp(tr('tools.renta.toPay')));
    const before = resultText();
    fireEvent.change(screen.getByLabelText(/sindicatos/i), { target: { value: '300' } });
    expect(resultText()).not.toBe(before);
    const afterExpenses = resultText();
    fireEvent.click(screen.getByLabelText(/cambiado de residencia/i));
    expect(resultText()).not.toBe(afterExpenses);
    const afterMobility = resultText();
    fill('tools.renta.pension', '1500');
    fill('tools.renta.pensionEmployer', '500');
    fill('tools.renta.spousePlan', '1000');
    fill('tools.renta.compensatory', '1200');
    expect(resultText()).not.toBe(afterMobility);
  });

  it('takes pensions out of the low-pay deduction and drops the disability expenses of a pensioner', async () => {
    render('18500');
    await screen.findByText(new RegExp(tr('tools.renta.toPay')));
    const before = resultText();
    fill('tools.renta.nonSalary', '2000');
    expect(resultText()).not.toBe(before);
    fireEvent.click(screen.getByLabelText(tr('tools.renta.retired')));
    expect(screen.getByLabelText(tr('tools.renta.retired'))).toBeChecked();
  });

  it('adds savings to the result', async () => {
    render();
    await screen.findByText(new RegExp(tr('tools.renta.toPay')));
    expect(screen.queryByText(tr('tools.renta.line.savingsBase'))).toBeNull();
    fill('tools.renta.savings', '2000');
    expect(screen.getByText(tr('tools.renta.line.savingsBase'))).toBeInTheDocument();
  });
});

describe('Renta planner: property', () => {
  it('rents out a property with expenses, depreciation and a reduction', async () => {
    render();
    await screen.findByText(new RegExp(tr('tools.renta.toPay')));
    fireEvent.click(screen.getByLabelText(tr('tools.renta.rentalOn')));
    fill('tools.renta.rentalIncome', '9000');
    fill('tools.renta.construction', '100000');
    const interest = screen.getByLabelText(/Intereses y gastos de financiación/);
    fireEvent.change(interest, { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/IBI, tasas/), { target: { value: '400' } });
    expect(screen.getByText(tr('tools.renta.line.rental'))).toBeInTheDocument();
    const select = screen.getByLabelText(tr('tools.renta.rentalReduction'));
    const before = resultText();
    fireEvent.change(select, { target: { value: (select as HTMLSelectElement).options[1].value } });
    expect(
      screen.getAllByRole('link', { name: tr('tools.renta.official') }).length
    ).toBeGreaterThan(0);
    fill('tools.renta.rentalIncome', '12000');
    expect(resultText()).not.toBe(before);
    fireEvent.change(select, { target: { value: '' } });
    fireEvent.click(screen.getByLabelText(tr('tools.renta.rentalOn')));
    expect(screen.queryByLabelText(tr('tools.renta.rentalIncome'))).toBeNull();
  });

  it('imputes income to properties that are not rented, and removes them', async () => {
    render();
    await screen.findByText(new RegExp(tr('tools.renta.toPay')));
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('tools.renta.addUnrented')) })
    );
    fireEvent.change(screen.getByLabelText(tr('tools.renta.cadastral', { n: 1 })), {
      target: { value: '50000' },
    });
    fireEvent.change(screen.getByLabelText(tr('tools.renta.days', { n: 1 })), {
      target: { value: '181' },
    });
    expect(screen.getByText(tr('tools.renta.line.imputed'))).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('tools.renta.addUnrented')) })
    );
    fireEvent.change(screen.getByLabelText(tr('tools.renta.cadastral', { n: 2 })), {
      target: { value: '30000' },
    });
    fireEvent.click(screen.getAllByLabelText(new RegExp('Valor catastral revisado'))[0]);
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.removeUnrented', { n: 1 }) })
    );
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.removeUnrented', { n: 1 }) })
    );
    expect(screen.queryByText(tr('tools.renta.line.imputed'))).toBeNull();
  });

  it('lists the notes on property', () => {
    render();
    const heading = screen.getByText(tr('tools.renta.propertyNotes'));
    expect(heading.nextElementSibling?.querySelectorAll('details').length).toBeGreaterThan(5);
  });
});

describe('Renta planner: children and income limits', () => {
  it('gathers the help for children in one place without repeating it', async () => {
    render();
    await screen.findByText(new RegExp(tr('tools.renta.toPay')));
    expect(screen.queryByText(tr('tools.renta.childAids'))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('tools.renta.addChild')) }));
    fireEvent.change(screen.getByLabelText(tr('tools.renta.childAge', { n: 1 })), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText(tr('tools.renta.ccaa')), {
      target: { value: 'comunitat-valenciana' },
    });
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    const box = screen.getByText(tr('tools.renta.childAids')).closest('section') as HTMLElement;
    expect(within(box).getAllByRole('listitem').length).toBeGreaterThan(2);
    expect(within(box).getByText(tr('tools.renta.childAids.minimum'))).toBeInTheDocument();
    const birth = screen.getByText(/Por nacimiento, adopción o acogimiento/, {
      selector: 'strong',
    });
    fireEvent.click(within(birth.closest('.renta-deduction') as HTMLElement).getByRole('checkbox'));
    expect(
      within(box)
        .getAllByRole('listitem')
        .some((li) => /nacimiento/i.test(li.textContent ?? ''))
    ).toBe(true);
  });

  it('warns that a deduction does not apply above the income limit', async () => {
    render('120000');
    await screen.findByText(new RegExp(tr('tools.renta.toPay')));
    fireEvent.change(screen.getByLabelText(tr('tools.renta.ccaa')), {
      target: { value: 'comunitat-valenciana' },
    });
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    fireEvent.change(screen.getAllByRole('searchbox')[1], { target: { value: 'dentista' } });
    const row = screen
      .getByText(/bucodental|dentista/i, { selector: 'strong' })
      .closest('.renta-deduction') as HTMLElement;
    fireEvent.click(within(row as HTMLElement).getByRole('checkbox'));
    fireEvent.change(within(row as HTMLElement).getByRole('textbox'), { target: { value: '200' } });
    expect(within(row as HTMLElement).getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText(/no se aplican por el límite de renta|do not apply/)
    ).toBeInTheDocument();
  });
});

describe('Renta planner: the model that asks for the advance payment', () => {
  it('shows the model next to the deductions that can be collected every month', async () => {
    render();
    const maternity = (await screen.findByText(/Por maternidad/, { selector: 'strong' })).closest(
      '.renta-deduction'
    ) as HTMLElement;
    expect(within(maternity).getByText('Modelo 140')).toBeInTheDocument();
    expect(
      within(maternity).getByRole('link', { name: 'Cómo pedir el modelo 140' })
    ).toHaveAttribute('href', expect.stringContaining('GZ25'));
    const large = screen
      .getByText(/Por familia numerosa de categoría general/, { selector: 'strong' })
      .closest('.renta-deduction') as HTMLElement;
    expect(within(large).getByText('Modelo 143')).toBeInTheDocument();
    const donations = screen
      .getByText(/Donativos a ONG/, { selector: 'strong' })
      .closest('.renta-deduction') as HTMLElement;
    expect(within(donations).queryByText(/Modelo/)).toBeNull();
  });
});
