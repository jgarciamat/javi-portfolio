import { readFileSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';
import { emptyManual } from '@modules/finances/ui/components/AutonomoManual';
import { toInvoices } from '@modules/finances/domain/invoiceLedger';
import { toSaved } from '@modules/finances/ui/components/autonomoSync';
import { AUTONOMO_STEPS, AUTONOMO_WIZARD_KEY } from '@modules/finances/domain/autonomoWizard';
import { NEW_PROGRESS } from '@modules/wizard/domain/wizard';
import { ApiError } from '@core/api/http';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

/** Persona 24 of the case bank (invented data): self-employed with VAT, in Valencia. */
const PERSONA = join(
  __dirname,
  '../../../../docs/casos-practicos/personas/24-autonomo-tarifa-plana-comunitat-valenciana/documentos'
);
const fileOf = (name: string): File => {
  const bytes = readFileSync(join(PERSONA, name));
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return Object.assign(new File([data], name), { arrayBuffer: async () => data });
};

const w = (key: string) => `wizard.autonomo.${key}`;
const heading = (name: string) => screen.getByRole('heading', { level: 2, name });
const next = () => fireEvent.click(screen.getByRole('button', { name: `${tr('wizard.next')} →` }));
const finish = (n: number) =>
  fireEvent.click(screen.getByRole('button', { name: tr('wizard.finishStep', { n }) }));
const pick = (q: string, option: string) =>
  fireEvent.click(screen.getByRole('radio', { name: tr(w(`opt.${q}.${option}`)) }));
const at = (step: number, answers: Record<string, string> = {}) =>
  localStorage.setItem(
    AUTONOMO_WIZARD_KEY,
    JSON.stringify({
      ...NEW_PROGRESS,
      at: step,
      done: AUTONOMO_STEPS.slice(0, step).map((s) => s.id),
      answers,
    })
  );
const stored = (over: object) =>
  localStorage.setItem('mm_autonomo_manual2', JSON.stringify({ ...emptyManual(), ...over }));

const open = (onOpenTab?: jest.Mock) => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
  api.businessApi.draft.mockResolvedValue(f.autonomoDraft({ year: 2026, quarter: 1 }));
  return renderWithProviders(<BusinessView onOpenTab={onOpenTab} />, { api, plan: true });
};

beforeEach(() => {
  localStorage.clear();
  freezeTime('2026-07-05T12:00:00');
});
afterEach(() => {
  restoreTime();
  jest.restoreAllMocks();
});

describe('the self-employed screen step by step: persona 24 (VAT, first quarter)', () => {
  it('goes through the eight steps with the files of the persona and prepares the quarter', async () => {
    const onOpenTab = jest.fn();
    const { api } = open(onOpenTab);
    // 1. Activity and regime.
    expect(heading(tr(w('q.period')))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.quarter')), { target: { value: '1' } });
    next();
    expect(screen.getByRole('button', { name: `${tr('wizard.next')} →` })).toBeDisabled();
    pick('method', 'simplified');
    next();
    pick('regime', 'general');
    next();
    // Ceuta: the 130 at 8 % (art. 110.2 RIRPF); the persona goes back to the general territory.
    pick('territory', 'ceuta');
    expect(JSON.parse(localStorage.getItem('mm_autonomo_extras') as string).territory).toBe(
      'ceuta'
    );
    pick('territory', 'general');
    next();
    pick('retained', 'no');
    next();
    pick('simplified', 'yes');
    next();
    pick('home', 'yes');
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.workArea')), {
      target: { value: '10' },
    });
    expect(JSON.parse(localStorage.getItem('mm_autonomo_manual2') as string).profile.workArea).toBe(
      '10'
    );
    pick('home', 'no');
    finish(1);
    expect(
      screen.getByText(tr('wizard.badgeWon', { badge: tr(w('badge.activity')) }))
    ).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem('mm_autonomo_extras') as string);
    expect(saved).toMatchObject({ exempt: false, hardToJustify: true });

    // 2. The invoices: the books of the persona.
    expect(screen.getByText(tr(w('missing.files')))).toBeInTheDocument();
    pick('files', 'files');
    await act(async () => {
      fireEvent.change(screen.getByLabelText(tr('app.autonomo.import.files')), {
        target: {
          files: [fileOf('facturas-emitidas-2026.xlsx'), fileOf('facturas-recibidas-2026.xlsx')],
        },
      });
    });
    await waitFor(() =>
      expect(screen.getByText(/^Llevas \d+ facturas importadas/)).toBeInTheDocument()
    );
    // The first quarter: nothing filed before it to ask about.
    finish(2);

    // 3. The review of what was read.
    expect(heading(tr(w('q.invoices')))).toBeInTheDocument();
    pick('invoices', 'yes');
    finish(3);

    // 4. The quarter: six invoices of 1,000 € at 21 % (box 07 of the persona: 6,000 €).
    expect(screen.getByLabelText(`${tr('app.autonomo.income.r21')} 1`)).toHaveValue('6000');
    next();
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.prepare') }))
    );
    expect(api.businessApi.draft).toHaveBeenCalledWith(2026, 1, expect.any(Object));
    finish(4);

    // 5. No employees nor premises.
    pick('withholdings', 'no');
    finish(5);

    // 6. Assets and warnings.
    pick('assets', 'no');
    next();
    const read = screen.queryByRole('radio', { name: tr(w('opt.warnings.yes')) });
    if (read) fireEvent.click(read);
    finish(6);

    // 7. The files: the PDF and the files for the website.
    expect(
      screen.getByRole('button', { name: tr('app.autonomo.pdf.download') })
    ).toBeInTheDocument();
    finish(7);

    // 8. The Renta.
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.prepare.button', { year: 2026 }) })
    );
    // What it brings first, then one tap takes it to the Renta 2026 and opens it.
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.prepare.take', { year: 2026 }) })
    );
    expect(onOpenTab).toHaveBeenCalledWith('renta');
    fireEvent.click(screen.getByRole('button', { name: tr('wizard.finishAll') }));
    expect(heading(tr('wizard.finaleTitle'))).toHaveFocus();
    expect(screen.getByText(tr(w('notFiled')))).toBeInTheDocument();
  });
});

describe('the other paths of the self-employed assistant', () => {
  it('types the totals by hand and asks about the 130 filed before the quarter', async () => {
    at(1);
    const { api } = open();
    api.businessApi.draft.mockRejectedValue(new ApiError('El servidor no responde', 500));
    pick('files', 'manual');
    expect(screen.getByText(tr(w('manualLater')))).toBeInTheDocument();
    next();
    expect(heading(tr(w('q.prior')))).toBeInTheDocument();
    pick('prior', 'yes');
    expect(JSON.parse(localStorage.getItem('mm_autonomo_manual2') as string).prior.on).toBe(true);
    pick('prior', 'no');
    finish(2);
    // Nothing imported: nothing to review.
    expect(screen.getByText(tr(w('hint.noInvoices')))).toBeInTheDocument();
    finish(3);
    // One quarter per screen, with what was typed kept on the way.
    expect(heading(tr(w('q.amounts'), { n: 1 }))).toBeInTheDocument();
    expect(screen.queryByText(tr(w('advanced')))).toBeNull();
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.income.r21')} 1`), {
      target: { value: '3000' },
    });
    expect(screen.queryByLabelText(`${tr('app.autonomo.income.r21')} 2`)).toBeNull();
    next();
    expect(heading(tr(w('q.amounts'), { n: 2 }))).toBeInTheDocument();
    expect(screen.getByText(tr(w('hint.amountsNext'), { n: 2, prev: 1 }))).toBeInTheDocument();
    expect(screen.queryByLabelText(`${tr('app.autonomo.income.r21')} 1`)).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.autonomo.copyPrevious', { n: 1 }) })
    );
    expect(screen.getByLabelText(`${tr('app.autonomo.income.r21')} 2`)).toHaveValue('3000');
    fireEvent.click(screen.getByRole('button', { name: `← ${tr('wizard.back')}` }));
    expect(screen.getByLabelText(`${tr('app.autonomo.income.r21')} 1`)).toHaveValue('3000');
    next();
    fireEvent.click(screen.getByText(tr(w('advanced'))));
    fireEvent.click(screen.getByLabelText(tr('app.autonomo.exempt')));
    expect(JSON.parse(localStorage.getItem('mm_autonomo_extras') as string).exempt).toBe(true);
    next();
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.prepare') }))
    );
    expect(screen.getByText('El servidor no responde')).toBeInTheDocument();
    // Not prepared: «not now» goes on.
    fireEvent.click(screen.getByRole('button', { name: tr(w('skip.prepare')) }));
    expect(heading(tr(w('q.withholdings')))).toBeInTheDocument();
  });

  it('asks the withholdings, the assets and the warnings when there are some', () => {
    // The same invoice twice: a warning.
    const entry = {
      date: '2026-04-01',
      quarter: 2 as const,
      base: 400,
      vatRate: 21 as const,
      vat: 84,
      total: 484,
      withheld: 0,
      concept: 'Alquiler oficina',
    };
    stored({ invoices: toInvoices('received', [entry, entry], {}, []) });
    at(4, { invoices: 'yes' });
    open();
    pick('withholdings', 'yes');
    expect(heading(tr(w('q.withholdings')))).toBeInTheDocument();
    expect(screen.getAllByRole('region', { name: /111/ }).length).toBeGreaterThan(0);
    finish(5);
    pick('assets', 'yes');
    pick('assets', 'no');
    next();
    expect(screen.getByText(tr(w('hint.warnings')))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: tr('wizard.finishStep', { n: 6 }) })).toBeDisabled();
    pick('warnings', 'yes');
    expect(screen.getByRole('button', { name: tr('wizard.finishStep', { n: 6 }) })).toBeEnabled();
    // The summary takes to the warnings, to the period and to a quarter without invoices.
    const box = screen.getByRole('complementary', { name: tr('app.autonomo.summary.label') });
    fireEvent.click(
      within(box).getByRole('button', { name: tr('app.autonomo.summary.warnings', { n: 1 }) })
    );
    expect(screen.getByRole('heading', { name: tr('app.autonomo.checks.title') })).toHaveFocus();
    fireEvent.click(
      within(box).getByRole('button', {
        name: tr('app.autonomo.summary.missing.expenses', { n: 1 }),
      })
    );
    expect(heading(tr(w('q.amounts'), { n: 1 }))).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(`${tr('wizard.stepN', { n: 6 })}`) })
    );
    pick('assets', 'no');
    next();
    fireEvent.click(
      within(
        screen.getByRole('complementary', { name: tr('app.autonomo.summary.label') })
      ).getAllByRole('button')[0]
    );
    expect(heading(tr(w('q.period')))).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(`${tr('wizard.stepN', { n: 6 })}`) })
    );
    pick('assets', 'no');
    next();
    // A warning takes to its invoice in the review.
    const checks = screen.getByRole('region', { name: tr('app.autonomo.checks.title') });
    fireEvent.click(within(checks).getAllByRole('button')[0]);
    expect(heading(tr(w('q.invoices')))).toBeInTheDocument();
  });

  it('asks only the quarter of the draft when the earlier 130 were filed', () => {
    stored({
      prior: { on: true, income: '9000', expenses: '1000', payments: '1600', withheld: '' },
    });
    at(3);
    open();
    expect(heading(tr(w('q.amounts'), { n: 2 }))).toBeInTheDocument();
    expect(screen.queryByLabelText(`${tr('app.autonomo.income.r21')} 1`)).toBeNull();
  });

  it('is always step by step: no «see it all together» in the toolbar', () => {
    open();
    expect(screen.queryByRole('button', { name: /todo junto/i })).toBeNull();
    expect(heading(tr(w('q.period')))).toBeInTheDocument();
  });

  it('starts again: the data and the progress go, once confirmed', () => {
    stored({ prior: { on: true, income: '1', expenses: '', payments: '', withheld: '' } });
    at(2);
    open();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('wizard.restart')) }));
    expect(heading(tr(w('q.period')))).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('mm_autonomo_manual2') as string).prior.on).toBe(false);
  });

  it('says there is nothing for the Renta yet without data', () => {
    at(7);
    open();
    expect(screen.getByText(tr(w('nothingYet')))).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: tr('tools.renta.prepare.button', { year: 2026 }) })
    ).toBeNull();
  });
});

describe('the progress in the account copy', () => {
  it('goes with the form once the person moved, checked field by field', () => {
    expect(toSaved(emptyManual(), {}, {}, NEW_PROGRESS).wizard).toBeUndefined();
    const wizard = { ...NEW_PROGRESS, at: 2, done: ['activity', 'import', 'gone'], streak: 1 };
    expect(toSaved(emptyManual(), {}, {}, wizard).wizard).toEqual({
      ...NEW_PROGRESS,
      at: 2,
      done: ['activity', 'import'],
      streak: 1,
    });
  });
});
