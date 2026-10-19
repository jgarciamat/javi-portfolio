import { Route, Routes, useLocation } from 'react-router-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { RentaCalculatorPage } from '@modules/tools/ui/CalculatorPages';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

// These suites drive the full form: the expert mode (the guided questions have their own).
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mm_renta_view', 'expert');
});

const choose = async (id: string) => {
  fireEvent.change(screen.getByLabelText(tr('tools.renta.ccaa')), { target: { value: id } });
};
const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(tr(label)), { target: { value } });

const free = () => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(
    f.billing({
      plan: 'free',
      limits: f.catalog().limits.free,
      usage: { ...f.billing().usage, rentaCalculations: 0 },
    })
  );
  return api;
};

describe('Renta planner: the steps', () => {
  it('shows the four steps and the State deductions from the start', async () => {
    renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
    for (const key of ['step1', 'step2', 'step3', 'step4']) {
      expect(screen.getByText(tr(`tools.renta.${key}`))).toBeInTheDocument();
    }
    expect(screen.getByText(tr('tools.renta.stateDeductions'))).toBeInTheDocument();
    expect(screen.getByText(tr('tools.renta.pickCcaa'))).toBeInTheDocument();
    expect(await screen.findByText(/Por maternidad/)).toBeInTheDocument();
  });

  it('loads the deductions of the community that is chosen', async () => {
    renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
    await choose('madrid');
    expect(await screen.findByText(/Deducciones de Comunidad de Madrid/)).toBeInTheDocument();
    expect(screen.queryByText(tr('tools.renta.pickCcaa'))).toBeNull();
    await choose('');
    await waitFor(() => expect(screen.getByText(tr('tools.renta.pickCcaa'))).toBeInTheDocument());
  });

  it('explains that the foral communities file elsewhere', async () => {
    renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
    await choose('navarra');
    expect(
      await screen.findByText(/régimen foral/, { selector: '.renta-foral' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr('tools.renta.officialSite') })).toBeInTheDocument();
    expect(screen.queryByText(/Deducciones de Navarra/)).toBeNull();
  });

  it('says what to do when a community cannot be loaded', async () => {
    renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
    const select = screen.getByLabelText(tr('tools.renta.ccaa'));
    const option = document.createElement('option');
    option.value = 'atlantida';
    option.textContent = 'Atlántida';
    select.append(option);
    fireEvent.change(select, { target: { value: 'atlantida' } });
    expect(await screen.findByText(tr('tools.renta.loadError'))).toBeInTheDocument();
  });

  it('adds and removes children and relatives, and halves the children when shared', async () => {
    renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
    expect(screen.queryByLabelText(tr('tools.renta.shared'))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('tools.renta.addChild')) }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('tools.renta.addChild')) }));
    fireEvent.change(screen.getByLabelText(tr('tools.renta.childAge', { n: 1 })), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText(tr('tools.renta.childDisability', { n: 2 })), {
      target: { value: '33' },
    });
    fireEvent.click(screen.getByLabelText(tr('tools.renta.shared')));
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.removeChild', { n: 2 }) }));
    expect(screen.queryByLabelText(tr('tools.renta.childAge', { n: 2 }))).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('tools.renta.addAscendant')) })
    );
    fireEvent.click(screen.getByLabelText(tr('tools.renta.over75', { n: 1 })));
    fireEvent.change(screen.getByLabelText(tr('tools.renta.ascendantDisability', { n: 1 })), {
      target: { value: '65' },
    });
    fireEvent.change(screen.getByLabelText(tr('tools.renta.ownDisability')), {
      target: { value: '33' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.removeAscendant', { n: 1 }) })
    );
    expect(screen.queryByLabelText(tr('tools.renta.over75', { n: 1 }))).toBeNull();
  });

  it('shows whether the return is compulsory for the salary', () => {
    renderWithProviders(<RentaPlanner mode="local" initialIncome="30000" />, {
      authenticated: false,
    });
    expect(screen.getByText(tr('tools.renta.obligation.overLimit'))).toBeInTheDocument();
    fill('tools.renta.gross', '18000');
    expect(screen.getByText(tr('tools.renta.obligation.none'))).toBeInTheDocument();
    // 18,000 € with 2,000 € from a second payer: over 15,876 € (art. 96.3).
    fill('tools.renta.secondPayers', '2000');
    expect(screen.getByText(tr('tools.renta.obligation.twoPayers'))).toBeInTheDocument();
    fill('tools.renta.gross', '');
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('Renta planner: deductions', () => {
  const open = async () => {
    renderWithProviders(<RentaPlanner mode="local" initialIncome="30000" />, {
      authenticated: false,
    });
    await choose('madrid');
    await screen.findByText(/Deducciones de Comunidad de Madrid/);
  };

  it('searches among the deductions', async () => {
    await open();
    const [stateSearch] = screen.getAllByPlaceholderText(tr('tools.renta.search'));
    fireEvent.change(stateSearch, { target: { value: 'zzzz-nada' } });
    expect(screen.getByText(tr('tools.renta.noMatch'))).toBeInTheDocument();
    fireEvent.change(stateSearch, { target: { value: 'maternidad' } });
    expect(screen.getByText(/Por maternidad/)).toBeInTheDocument();
  });

  it('marks a deduction, asks for the amount and says what it gives', async () => {
    await open();
    const donations = screen.getByText(/Cuotas y aportaciones a partidos/);
    const row = donations.closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('checkbox'));
    expect(within(row).getByText(tr('tools.renta.gives'), { exact: false })).toBeInTheDocument();
    const input = within(row).getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: '100' } });
    expect(row).toHaveClass('renta-deduction--on');
    fireEvent.click(within(row).getByRole('checkbox'));
    expect(row).not.toHaveClass('renta-deduction--on');
  });

  it('suggests the maternity deduction when there is a child under three', async () => {
    renderWithProviders(<RentaPlanner mode="local" initialIncome="30000" />, {
      authenticated: false,
    });
    expect(screen.queryByText(tr('tools.renta.suggested'))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('tools.renta.addChild')) }));
    fireEvent.change(screen.getByLabelText(tr('tools.renta.childAge', { n: 1 })), {
      target: { value: '1' },
    });
    expect(await screen.findByText(tr('tools.renta.suggested'))).toBeInTheDocument();
    const row = screen.getByText(/Por maternidad/).closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('checkbox'));
    // The first field is the number of children; the second, what was collected with the modelo 140.
    fireEvent.change(within(row).getAllByRole('textbox')[0], { target: { value: '2' } });
    expect(
      within(row.querySelector('.renta-gives') as HTMLElement).getByText(/2\.400|2400/)
    ).toBeInTheDocument();
    fireEvent.change(within(row).getAllByRole('textbox')[1], { target: { value: '1200' } });
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.calculate') }));
    expect(await screen.findByText(tr('tools.renta.line.advanceReceived'))).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: tr('tools.renta.official') })).toHaveAttribute(
      'href',
      expect.stringContaining('agenciatributaria')
    );
  });
});

describe('Renta planner: fields', () => {
  it('lets you change the age, social security and pension plan and uses them', async () => {
    renderWithProviders(<RentaPlanner mode="local" initialIncome="30000" />, {
      authenticated: false,
    });
    fill('tools.renta.age', '70');
    fill('tools.renta.socialSecurity', '1500');
    fill('tools.renta.pension', '1000');
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.calculate') }));
    await screen.findByText(new RegExp(tr('tools.renta.toPay')));
    expect(screen.getByText(tr('tools.renta.minimum.age'))).toBeInTheDocument();
  });

  it('asks for the amount of a deduction with several cases and shows each child in the minimum', async () => {
    renderWithProviders(<RentaPlanner mode="local" initialIncome="30000" />, {
      authenticated: false,
    });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('tools.renta.addChild')) }));
    const row = (await screen.findByText(/Gastos de guardería/)).closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('checkbox'));
    fireEvent.change(within(row).getAllByRole('textbox')[0], { target: { value: '800' } });
    expect(
      within(row.querySelector('.renta-gives') as HTMLElement).getByText(/800/)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.calculate') }));
    await screen.findByText(new RegExp(tr('tools.renta.toPay')));
    expect(screen.getByText(tr('tools.renta.kidLine', { n: 1, age: 5 }))).toBeInTheDocument();
  });
});

describe('Renta planner: amounts by child, percentages and relatives', () => {
  it('multiplies an amount by child and a percentage by what was spent', async () => {
    renderWithProviders(<RentaPlanner mode="local" initialIncome="30000" />, {
      authenticated: false,
    });
    await choose('castilla-y-leon');
    const birth = (await screen.findByText('Por nacimiento o adopción de hijos')).closest(
      'li'
    ) as HTMLElement;
    fireEvent.click(within(birth).getByRole('checkbox'));
    fireEvent.change(within(birth).getByRole('textbox'), { target: { value: '2' } });
    expect(within(birth).getByText(/2485/)).toBeInTheDocument();

    const party = screen.getByText(/Cuotas y aportaciones a partidos/).closest('li') as HTMLElement;
    fireEvent.click(within(party).getByRole('checkbox'));
    fireEvent.change(within(party).getByRole('textbox'), { target: { value: '100' } });
    expect(
      within(party.querySelector('.renta-gives') as HTMLElement).getByText(/20,00/)
    ).toBeInTheDocument();
  });

  it('changes one of several relatives without touching the others', () => {
    renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
    const add = () =>
      fireEvent.click(
        screen.getByRole('button', { name: new RegExp(tr('tools.renta.addAscendant')) })
      );
    add();
    add();
    fireEvent.click(screen.getByLabelText(tr('tools.renta.over75', { n: 1 })));
    fireEvent.change(screen.getByLabelText(tr('tools.renta.ascendantDisability', { n: 1 })), {
      target: { value: '33' },
    });
    expect(screen.getByLabelText(tr('tools.renta.over75', { n: 1 }))).toBeChecked();
    expect(screen.getByLabelText(tr('tools.renta.over75', { n: 2 }))).not.toBeChecked();
  });

  it('speaks English', () => {
    renderWithProviders(<RentaPlanner mode="local" initialIncome="30000" />, {
      authenticated: false,
      locale: 'en',
    });
    expect(screen.getByText('Your situation')).toBeInTheDocument();
    expect(screen.getByLabelText('Region where you live')).toBeInTheDocument();
  });
});

describe('Renta planner: free calculations', () => {
  it('gives an anonymous visitor one calculation and then asks them to sign up', async () => {
    renderWithProviders(<RentaPlanner mode="local" initialIncome="30000" />, {
      authenticated: false,
    });
    expect(screen.getByText(tr('tools.renta.freeOne'))).toBeInTheDocument();
    expect(screen.queryByText(tr('tools.renta.toPay'))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.calculate') }));
    expect(await screen.findByText(new RegExp(tr('tools.renta.toPay')))).toBeInTheDocument();
    expect(screen.getByText(tr('tools.renta.usedFree'))).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: tr('tools.renta.createAccount') })[0]
    ).toHaveAttribute('href', '/login?mode=register');
    // The result stays frozen while the data change.
    const before = screen.getByText(new RegExp(tr('tools.renta.toPay'))).textContent;
    fill('tools.renta.gross', '90000');
    expect(screen.getByText(new RegExp(tr('tools.renta.toPay'))).textContent).toBe(before);
  });

  it('keeps the calculation after reloading, or says it was used when it is gone', async () => {
    const first = renderWithProviders(<RentaPlanner mode="local" initialIncome="30000" />, {
      authenticated: false,
    });
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.calculate') }));
    await screen.findByText(new RegExp(tr('tools.renta.toPay')));
    first.unmount();
    renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
    expect(screen.getByText(new RegExp(tr('tools.renta.toPay')))).toBeInTheDocument();

    localStorage.removeItem('mm_renta_snapshot_v2');
    renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
    expect(screen.getAllByText(tr('tools.renta.usedNoSnapshot')).length).toBeGreaterThan(0);
  });

  it('shows the result of a refund and the lines of the calculation', async () => {
    renderWithProviders(<RentaPlanner mode="local" initialIncome="40000" />, {
      authenticated: false,
    });
    fill('tools.renta.withheld', '9000');
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.calculate') }));
    expect(await screen.findByText(new RegExp(tr('tools.renta.refund')))).toBeInTheDocument();
    for (const key of ['netIncome', 'base', 'stateQuota', 'netQuota', 'withheld']) {
      expect(screen.getByText(tr(`tools.renta.line.${key}`))).toBeInTheDocument();
    }
    expect(screen.getByText(tr('tools.renta.minimum.personal'))).toBeInTheDocument();
  });

  it('shows the State and the regional half of the home bought before 2013 apart', async () => {
    renderWithProviders(<RentaPlanner mode="local" initialIncome="42000" />, {
      authenticated: false,
    });
    await choose('madrid');
    const home = (await screen.findByText(/Vivienda habitual comprada antes de 2013/)).closest(
      'li'
    ) as HTMLElement;
    fireEvent.click(within(home).getByRole('checkbox'));
    fireEvent.change(within(home).getByRole('textbox'), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.calculate') }));
    // 7.5 % + 7.5 % of 9,040 (DT 18.ª LIRPF): 678 € in each quota.
    for (const part of ['state', 'regional']) {
      const label = new RegExp(`\\(${tr(`tools.renta.part.${part}`)}\\)`);
      const line = (await screen.findByText(label)).closest('li') as HTMLElement;
      expect(within(line).getByText(/678,00/)).toBeInTheDocument();
    }
  });

  it('is live and unlimited with Premium', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    renderWithProviders(<RentaPlanner mode="account" initialIncome="30000" />, { api, plan: true });
    expect(await screen.findByText(new RegExp(tr('tools.renta.toPay')))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: tr('tools.renta.calculate') })).toBeNull();
    const before = screen.getByText(new RegExp(tr('tools.renta.toPay'))).textContent;
    fill('tools.renta.gross', '90000');
    expect(screen.getByText(new RegExp(tr('tools.renta.toPay'))).textContent).not.toBe(before);
    expect(api.rentaApi.register).not.toHaveBeenCalled();
  });

  it('gives an account 3 calculations per campaign, then opens the plans', async () => {
    const api = free();
    const used = (rentaCalculations: number) =>
      f.billing({
        plan: 'free',
        limits: f.catalog().limits.free,
        usage: { ...f.billing().usage, rentaCalculations },
      });
    renderWithProviders(<RentaPlanner mode="account" initialIncome="30000" />, { api, plan: true });
    expect(
      await screen.findByText(tr('tools.renta.freeCampaign', { count: 3 }))
    ).toBeInTheDocument();
    api.billingApi.get.mockResolvedValue(used(1));
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.calculate') }));
    await waitFor(() => expect(api.rentaApi.register).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(new RegExp(tr('tools.renta.toPay')))).toBeInTheDocument();
    // Still two left: the result can be worked out again with other data.
    expect(await screen.findByText(tr('tools.renta.recalcLeft', { count: 2 }))).toBeInTheDocument();
    const before = screen.getByText(new RegExp(tr('tools.renta.toPay'))).textContent;
    fill('tools.renta.gross', '90000');
    expect(screen.getByText(new RegExp(tr('tools.renta.toPay'))).textContent).toBe(before);
    api.billingApi.get.mockResolvedValue(used(3));
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.recalculate') }));
    await waitFor(() => expect(api.rentaApi.register).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(tr('tools.renta.usedFreeCampaign'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(tr('tools.renta.toPay'))).textContent).not.toBe(before);
    fireEvent.click(
      (await screen.findAllByRole('button', { name: tr('tools.renta.goPremium') }))[0]
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('does not show a result when the free calculation was refused', async () => {
    const api = free();
    api.rentaApi.register.mockRejectedValue(new Error('Premium'));
    renderWithProviders(<RentaPlanner mode="account" initialIncome="30000" />, { api, plan: true });
    fireEvent.click(await screen.findByRole('button', { name: tr('tools.renta.calculate') }));
    await waitFor(() => expect(api.rentaApi.register).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: tr('tools.renta.calculate') })).toBeEnabled()
    );
    expect(screen.queryByText(new RegExp(tr('tools.renta.toPay')))).toBeNull();
  });

  it('knows an account that already used the calculations of the campaign', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(
      f.billing({
        plan: 'free',
        limits: f.catalog().limits.free,
        usage: { ...f.billing().usage, rentaCalculations: 3 },
      })
    );
    renderWithProviders(<RentaPlanner mode="account" />, { api, plan: true });
    expect(await screen.findByText(tr('tools.renta.usedCampaign'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: tr('tools.renta.calculate') })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: tr('tools.renta.goPremium') })[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('waits for the plan before deciding', () => {
    const api = createFakeApi();
    api.billingApi.get.mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<RentaPlanner mode="account" />, { api, plan: true });
    expect(screen.getByText(tr('app.common.loading'))).toBeInTheDocument();
  });
});

const Where = () => {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
};

describe('Renta calculator page', () => {
  it('shows visitors what it does and the wall instead of the planner', () => {
    renderWithProviders(<RentaCalculatorPage />, {
      authenticated: false,
      route: '/calculadora-renta',
    });
    expect(document.title).toBe(tr('tools.renta.title'));
    expect(screen.getByText(tr('tools.renta.description'))).toBeInTheDocument();
    expect(screen.queryByText(tr('tools.renta.step1'))).toBeNull();
    expect(screen.getByRole('link', { name: tr('wall.register') })).toHaveAttribute(
      'href',
      '/login?mode=register&next=%2Fcalculadora-renta'
    );
    // The old "one free calculation per browser" is gone with it.
    expect(localStorage.getItem('mm_renta_uses')).toBeNull();
  });

  it('sends people who are signed in to the section of the app', () => {
    renderWithProviders(
      <Routes>
        <Route path="/calculadora-renta" element={<RentaCalculatorPage />} />
        <Route path="*" element={<Where />} />
      </Routes>,
      { route: '/calculadora-renta' }
    );
    expect(screen.getByTestId('where').textContent).toBe('/?tab=renta');
    expect(screen.queryByText(tr('tools.renta.step1'))).toBeNull();
  });
});
