import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { useRentaAccess } from '@modules/tools/application/useRentaAccess';
import { readPdfText } from '@modules/tools/application/readPdf';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import type { RentaAccess } from '@modules/billing/domain/types';

jest.mock('@modules/tools/application/readPdf', () => ({ readPdfText: jest.fn() }));
const read = readPdfText as jest.Mock;

jest.mock('@core/billing/playStore', () => ({
  ...jest.requireActual('@core/billing/playStore'),
  playBillingAvailable: jest.fn(() => false),
  purchasePremium: jest.fn(),
}));
const playStore = jest.requireMock('@core/billing/playStore') as {
  playBillingAvailable: jest.Mock;
  purchasePremium: jest.Mock;
};
jest.mock('@shared/utils/navigation', () => ({ redirectTo: jest.fn() }));
const { redirectTo } = jest.requireMock('@shared/utils/navigation') as { redirectTo: jest.Mock };

// Answering every question of a community is slow on a busy machine.
jest.setTimeout(60000);

beforeEach(() => {
  localStorage.clear();
  read.mockReset();
  playStore.playBillingAvailable.mockReturnValue(false);
  playStore.purchasePremium.mockReset();
  redirectTo.mockReset();
});

const INCLUDED: RentaAccess = {
  draft: { allowed: true, reason: 'premium' },
  eligibleOn: null,
  passUntil: null,
};
const withRenta = (renta: Partial<RentaAccess>) => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(
    f.billing({ plan: 'premium', renta: { ...INCLUDED, ...renta } })
  );
  return api;
};
const premium = () => withRenta({});
const render = () =>
  renderWithProviders(<RentaPlanner mode="account" />, { api: premium(), plan: true });
const paste = async (text: string) => {
  fireEvent.click(await screen.findByText(tr('tools.renta.draft.paste')));
  fireEvent.change(screen.getByLabelText(tr('tools.renta.draft.paste'), { selector: 'textarea' }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.draft.read') }));
};

const DRAFT = `Comunitat Valenciana Fecha de nacimiento 20/06/1994 0010
  Total ingresos íntegros computables 30.000,00 0012
  Total pagos a cuenta 4.100,00 0609 Fecha de nacimiento 12/03/2023 0077
  Deducciones autonómicas de la Comunitat Valenciana
  Por nacimiento, adopción o acogimiento 600,00 1961
  Suma de deducciones autonómicas 600,00 0564`;

describe('Renta planner: the draft', () => {
  it('is a Premium feature', () => {
    renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
    expect(screen.getByText(tr('tools.renta.draft.premium'))).toBeInTheDocument();
    expect(screen.queryByText(tr('tools.renta.draft.upload'))).toBeNull();
  });

  it('fills the form from the text, and asks about the deductions that are missing', async () => {
    render();
    await paste(DRAFT);
    expect(await screen.findByText(tr('tools.renta.draft.found'))).toBeInTheDocument();
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('30000');
    expect(screen.getByLabelText(tr('tools.renta.ccaa'))).toHaveValue('comunitat-valenciana');
    expect(screen.getByLabelText(tr('tools.renta.childAge', { n: 1 }))).toHaveValue('2');
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    const maternity = await screen.findByRole('button', {
      name: `${tr('tools.renta.draft.yes')}: Por maternidad (hijos menores de 3 años)`,
    });
    fireEvent.click(maternity);
    expect(
      screen.queryByRole('button', { name: maternity.getAttribute('aria-label') as string })
    ).toBeNull();
    const dentist = screen.getByRole('button', {
      name: new RegExp(`^${tr('tools.renta.draft.no')}: Dentista`),
    });
    fireEvent.click(dentist);
    expect(
      screen.queryByRole('button', { name: dentist.getAttribute('aria-label') as string })
    ).toBeNull();
    expect(screen.getAllByText(tr('tools.renta.hint.missing')).length).toBeGreaterThan(0);
  });

  it('assumes rent when the draft has no main home, and stops asking when it is unticked', async () => {
    render();
    await paste(DRAFT);
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    const before = screen.queryAllByRole('button', { name: /alquiler/i }).length;
    fireEvent.click(screen.getByLabelText(tr('tools.renta.draft.rents')));
    expect(before).toBeGreaterThan(0);
    expect(screen.queryAllByRole('button', { name: /alquiler/i }).length).toBe(0);
  });

  it('says so when nothing is recognised', async () => {
    render();
    await paste('texto cualquiera');
    expect(await screen.findByText(tr('tools.renta.draft.nothing'))).toBeInTheDocument();
  });

  it('reads a PDF file in the browser', async () => {
    read.mockResolvedValue(DRAFT);
    render();
    const input = await screen.findByLabelText(tr('tools.renta.draft.file'));
    fireEvent.change(input, { target: { files: [new File(['x'], 'borrador.pdf')] } });
    await waitFor(() =>
      expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('30000')
    );
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.draft.upload') }));
  });

  it('ignores an empty file choice and reports an unreadable file', async () => {
    read.mockRejectedValue(new Error('bad'));
    render();
    const input = await screen.findByLabelText(tr('tools.renta.draft.file'));
    fireEvent.change(input, { target: { files: [] } });
    expect(read).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { files: [new File(['x'], 'borrador.pdf')] } });
    expect(await screen.findByText(tr('tools.renta.draft.error'))).toBeInTheDocument();
  });

  it('marks what the draft already includes', async () => {
    render();
    await paste(DRAFT);
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    expect(await screen.findAllByText(tr('tools.renta.hint.inDraft'))).not.toHaveLength(0);
    expect(screen.getByText(tr('tools.renta.draft.alreadyApplied'))).toBeInTheDocument();
  });
});

describe('Renta planner: answering every question', () => {
  it('says there is nothing else to ask once every deduction is answered', async () => {
    render();
    await paste(DRAFT);
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    for (let i = 0; i < 200; i++) {
      const next = screen.queryAllByRole('button', { name: /^No me corresponde:/ })[0];
      if (!next) break;
      fireEvent.click(next);
    }
    expect(screen.getByText(tr('tools.renta.draft.noneMissing'))).toBeInTheDocument();
  });
});

describe('Renta planner: the family decides what is asked', () => {
  it('counts relatives with a disability', async () => {
    render();
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(tr('tools.renta.addAscendant')) })
    );
    fireEvent.change(screen.getByLabelText(tr('tools.renta.ascendantDisability', { n: 1 })), {
      target: { value: '65' },
    });
    await paste(DRAFT);
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    expect(
      screen.getAllByRole('button', { name: /^Me corresponde: .*discapacidad/i }).length
    ).toBeGreaterThan(0);
  });
});

describe('Renta planner: relatives in the draft', () => {
  it('copies the relatives of the draft, keeping the form when there are none', async () => {
    render();
    await paste(`${DRAFT} Fecha de nacimiento 01/01/1940 0092`);
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    expect(screen.getByLabelText(tr('tools.renta.over75', { n: 1 }))).toBeChecked();
    expect(screen.getByLabelText(tr('tools.renta.age'))).toHaveValue('31');
  });
});

describe('Renta planner: who can read a draft', () => {
  const locked: RentaAccess = {
    draft: { allowed: false, reason: null },
    eligibleOn: null,
    passUntil: null,
  };
  const open = (renta: Partial<RentaAccess>, api = withRenta(renta)) => {
    renderWithProviders(<RentaPlanner mode="account" />, { api, plan: true });
    return api;
  };

  it('keeps the trial out, says when it unlocks and sells the pass on the web', async () => {
    const api = open({ ...locked, eligibleOn: '2026-12-01T00:00:00Z' });
    expect(await screen.findByText(tr('tools.renta.draft.locked'))).toBeInTheDocument();
    expect(screen.getByText(/1 de diciembre de 2026/)).toBeInTheDocument();
    expect(screen.queryByText(tr('tools.renta.draft.upload'))).toBeNull();
    const buy = screen.getByRole('button', { name: /Comprar el pase por/ });
    expect(buy).toBeDisabled();
    fireEvent.click(screen.getByLabelText(new RegExp(tr('billing.acceptTerms'))));
    fireEvent.click(screen.getByLabelText(tr('tools.renta.draft.immediate')));
    fireEvent.click(buy);
    await waitFor(() =>
      expect(api.billingApi.checkout).toHaveBeenCalledWith('renta_pass', {
        acceptTerms: true,
        waiveWithdrawal: true,
      })
    );
  });

  it('reports a payment that fails to start', async () => {
    const api = withRenta(locked);
    api.billingApi.checkout.mockRejectedValue(new Error('boom'));
    open(locked, api);
    fireEvent.click(await screen.findByLabelText(new RegExp(tr('billing.acceptTerms'))));
    fireEvent.click(screen.getByLabelText(tr('tools.renta.draft.immediate')));
    fireEvent.click(screen.getByRole('button', { name: /Comprar el pase por/ }));
    expect(await screen.findByText(/boom|billing/i)).toBeInTheDocument();
  });

  it('buys with Google Play in the app, without asking for the terms', async () => {
    playStore.playBillingAvailable.mockReturnValue(true);
    playStore.purchasePremium.mockResolvedValue(true);
    open(locked);
    expect(screen.queryByLabelText(tr('tools.renta.draft.immediate'))).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: /Comprar el pase por/ }));
    await waitFor(() =>
      expect(playStore.purchasePremium).toHaveBeenCalledWith('renta_pass', expect.any(String))
    );
  });

  it('offers nothing to buy when payments are off', async () => {
    const api = createFakeApi();
    const overview = f.billing({ plan: 'premium', renta: locked });
    api.billingApi.get.mockResolvedValue({
      ...overview,
      catalog: { ...overview.catalog, rentaPass: { available: false } },
    });
    open(locked, api);
    expect(await screen.findByText(tr('tools.renta.draft.locked'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Comprar el pase por/ })).toBeNull();
  });

  it('shows how long the pass lasts, and unlimited results with it', async () => {
    open({
      draft: { allowed: true, reason: 'pass' },
      eligibleOn: null,
      passUntil: '2026-12-01T00:00:00Z',
    });
    expect(
      await screen.findByText(/pase de la Renta está activo hasta el 1 de diciembre/)
    ).toBeInTheDocument();
  });

  it('speaks English, dates included', async () => {
    renderWithProviders(<RentaPlanner mode="account" />, {
      api: withRenta({ ...locked, eligibleOn: '2026-12-01T00:00:00Z' }),
      plan: true,
      authenticated: false,
      locale: 'en',
    });
    expect(await screen.findByText(/1 December 2026/)).toBeInTheDocument();
  });

  it('has nothing to use or buy on the public page', async () => {
    let access!: ReturnType<typeof useRentaAccess>;
    const Probe = () => {
      access = useRentaAccess('local');
      return null;
    };
    renderWithProviders(<Probe />, { authenticated: false });
    expect(access.draft.allowed).toBe(false);
    await expect(access.draft.use()).resolves.toBe(false);
    await expect(
      access.draft.buy({ acceptTerms: true, waiveWithdrawal: true })
    ).resolves.toBeUndefined();
  });

  it('says so when the server refuses the use', async () => {
    const api = withRenta({});
    api.rentaApi.draft.mockRejectedValue(new Error('402'));
    open({}, api);
    await paste(DRAFT);
    expect(await screen.findByText(tr('tools.renta.draft.refused'))).toBeInTheDocument();
  });
});

describe('Renta planner: going through the marked deductions', () => {
  /** Answers every question: the first two apply, the rest do not. */
  const answerAll = async () => {
    await paste(DRAFT);
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    const yes = () => screen.queryAllByRole('button', { name: /^Me corresponde:/ });
    await screen.findAllByRole('button', { name: /^Me corresponde:/ });
    fireEvent.click(
      screen.getByRole('button', { name: /^Me corresponde: Dentista y salud bucodental/ })
    );
    fireEvent.click(screen.getByRole('button', { name: /^Me corresponde: Gafas y lentillas/ }));
    for (let i = 0; i < 300 && yes().length > 0; i++) {
      fireEvent.click(screen.getAllByRole('button', { name: /^No me corresponde:/ })[0]);
    }
  };
  const rowOf = (title: string) =>
    screen.getByText(title, { selector: 'strong' }).closest('.renta-deduction') as HTMLElement;

  it('takes the person to each marked deduction, one after another', async () => {
    render();
    await answerAll();
    fireEvent.click(
      await screen.findByRole('button', {
        name: tr('tools.renta.draft.goFirst', { count: 2 }),
      })
    );
    const first = rowOf('Dentista y salud bucodental');
    expect(first.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toHaveAttribute('inputmode', 'decimal');

    fireEvent.click(within(first).getByRole('button', { name: tr('tools.renta.nextDeduction') }));
    expect(rowOf('Gafas y lentillas').contains(document.activeElement)).toBe(true);

    // The last one leads to the result.
    fireEvent.click(
      within(rowOf('Gafas y lentillas')).getByRole('button', {
        name: tr('tools.renta.nextDeduction'),
      })
    );
    expect(document.activeElement).toBe(document.querySelector('.renta-result'));
  });

  it('lets a mistake be undone, and moves on to the next marked deduction', async () => {
    render();
    await answerAll();
    const first = rowOf('Dentista y salud bucodental');
    fireEvent.click(within(first).getByRole('button', { name: tr('tools.renta.draft.no') }));
    expect(first).not.toHaveClass('renta-deduction--on');
    expect(rowOf('Gafas y lentillas').contains(document.activeElement)).toBe(true);
    // Unmarking the last one has nowhere else to go but the result.
    fireEvent.click(
      within(rowOf('Gafas y lentillas')).getByRole('button', { name: tr('tools.renta.draft.no') })
    );
    expect(screen.queryByRole('button', { name: /Ir a la primera deducción/ })).toBeNull();
  });

  it('warns about the marked deductions that are missing an amount, and goes to them', async () => {
    render();
    await answerAll();
    // One single notice, above the result.
    expect(screen.getAllByText(/Te faltan datos en/)).toHaveLength(1);
    expect(screen.getByText(/Te faltan datos en/).closest('.renta-result')).not.toBeNull();
    const alert = screen
      .getAllByRole('alert')
      .find((a) => /Te faltan datos en 2/.test(a.textContent ?? ''));
    expect(alert).toBeDefined();
    fireEvent.click(
      within(alert as HTMLElement).getByRole('button', { name: tr('tools.renta.goToPending') })
    );
    expect(rowOf('Dentista y salud bucodental').contains(document.activeElement)).toBe(true);
    fireEvent.change(document.activeElement as HTMLElement, { target: { value: '100' } });
    expect(
      screen.getAllByRole('alert').some((a) => /Te faltan datos en 1/.test(a.textContent ?? ''))
    ).toBe(true);
  });
});

describe('Renta planner: the income limit', () => {
  it('does not ask about deductions the income rules out', async () => {
    render();
    await paste(DRAFT.replace('30.000,00', '120.000,00'));
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    await screen.findAllByRole('button', { name: /^Me corresponde:/ });
    expect(screen.queryByRole('button', { name: /^Me corresponde: Dentista/ })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /^Me corresponde: Por material escolar/ })
    ).toBeNull();
  });
});

describe('Renta planner: none of them interest me, and next year', () => {
  it('closes every question with a single button', async () => {
    render();
    await paste(DRAFT);
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    await screen.findAllByRole('button', { name: /^Me corresponde:/ });
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.draft.noneInterest') }));
    expect(screen.queryAllByRole('button', { name: /^Me corresponde:/ })).toHaveLength(0);
    expect(screen.getByText(tr('tools.renta.draft.noneMissing'))).toBeInTheDocument();
  });

  it('tries the next return with the same income, a year older, and goes back', async () => {
    render();
    await paste(DRAFT);
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    fireEvent.click(await screen.findByRole('button', { name: 'Probar la renta de 2027' }));
    expect(screen.getByText(/Estás probando la renta de 2027/)).toBeInTheDocument();
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('30000');
    expect(screen.getByLabelText(tr('tools.renta.age'))).toHaveValue('32');
    expect(screen.getByLabelText(tr('tools.renta.childAge', { n: 1 }))).toHaveValue('3');

    // A baby on the way: the deductions for a newborn are asked about.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('tools.renta.addChild')) }));
    fireEvent.change(screen.getByLabelText(tr('tools.renta.childAge', { n: 2 })), {
      target: { value: '0' },
    });
    expect(
      await screen.findAllByRole('button', { name: /^Me corresponde: .*nacimiento/i })
    ).not.toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.draft.scenarioBack') }));
    expect(screen.queryByText(/Estás probando la renta/)).toBeNull();
    expect(screen.getByLabelText(tr('tools.renta.age'))).toHaveValue('31');
    expect(screen.getByLabelText(tr('tools.renta.childAge', { n: 1 }))).toHaveValue('2');
    expect(screen.queryByLabelText(tr('tools.renta.childAge', { n: 2 }))).toBeNull();
  });
});
