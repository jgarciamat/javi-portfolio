import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  PROGRESS_KEY,
  PROGRESS_VERSION,
  clearProgress,
  loadProgress,
  reviveForm,
  saveProgress,
} from '@modules/tools/application/rentaProgress';
import { NO_DRAFT, readDraft } from '@modules/tools/domain/rentaDraft';
import { emptyForm } from '@modules/tools/domain/rentaForm';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { RentaView } from '@modules/finances/ui/views/RentaView';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

// These suites drive the full form: the expert mode (the guided questions have their own).
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mm_renta_view', 'expert');
});

const reading = readDraft('Retribuciones dinerarias 1.000,00 0003', {
  year: 2025,
  communities: [],
});
const raw = (value: unknown) => localStorage.setItem(PROGRESS_KEY, JSON.stringify(value));
const stored = () => JSON.parse(localStorage.getItem(PROGRESS_KEY) as string);

describe('saving the planner on the device', () => {
  it('saves and loads the form, the year and the draft read, with its version', () => {
    const form = { ...emptyForm('20000'), ccaaId: 'madrid' };
    const draft = { ...NO_DRAFT, reading, rents: true, dismissed: ['a'] };
    saveProgress({ year: 2025, form, draft });
    expect(stored().version).toBe(PROGRESS_VERSION);
    expect(loadProgress()).toEqual({ year: 2025, form, draft });
    clearProgress();
    expect(loadProgress()).toBeNull();
  });

  it('ignores what is broken, of another version or without a year', () => {
    localStorage.setItem(PROGRESS_KEY, '{not json');
    expect(loadProgress()).toBeNull();
    raw('text');
    expect(loadProgress()).toBeNull();
    raw({ version: 0, year: 2025, form: {} });
    expect(loadProgress()).toBeNull();
    raw({ version: PROGRESS_VERSION, form: {} });
    expect(loadProgress()).toBeNull();
  });

  it('keeps the readable fields of an old or broken form and empties the rest', () => {
    const form = reviveForm({
      gross: '30000',
      age: 50,
      children: [{ age: '3', disability: 0 }, 'x', null],
      ascendants: 'none',
      unrented: [{ value: '100' }],
      choices: [],
      retired: true,
      unknown: 'kept out',
    });
    expect(form).toEqual({
      ...emptyForm(''),
      gross: '30000',
      children: [{ age: '3', disability: 0 }],
      unrented: [{ value: '100' }],
      retired: true,
    });
    expect(reviveForm(null)).toEqual(emptyForm(''));
  });

  it('keeps the spouse and the guided answers field by field', () => {
    const form = reviveForm({
      joint: 'couple',
      partner: { gross: '9000', age: 70, retired: 'yes' },
      answers: { ccaa: 'madrid', age: 40 },
    });
    expect(form.joint).toBe('couple');
    expect(form.partner).toEqual({ ...emptyForm('').partner, gross: '9000' });
    expect(form.answers).toEqual({ ccaa: 'madrid' });
    expect(reviveForm({ partner: 'none' }).partner).toEqual(emptyForm('').partner);
  });

  it('drops a draft that does not have the shape of this version', () => {
    const base = { version: PROGRESS_VERSION, year: 2025, form: {} };
    raw({ ...base, draft: { reading: { boxes: {} } } });
    expect(loadProgress()?.draft).toEqual(NO_DRAFT);
    raw({ ...base, draft: null });
    expect(loadProgress()?.draft).toEqual(NO_DRAFT);
    raw({
      ...base,
      draft: {
        reading,
        rents: 'yes',
        dismissed: ['a', 3],
        scenario: { form: { age: '41' }, reading },
      },
    });
    expect(loadProgress()?.draft).toEqual({
      reading,
      rents: false,
      dismissed: ['a'],
      scenario: { form: { ...emptyForm(''), age: '41' }, reading },
    });
    raw({ ...base, draft: { reading, dismissed: 'a', scenario: { reading: {} } } });
    expect(loadProgress()?.draft).toEqual({ reading, rents: false, dismissed: [], scenario: null });
  });
});

describe('the planner picks up where it was left', () => {
  it('saves only what the person changes, and recovers it with a notice', () => {
    const { unmount } = renderWithProviders(<RentaPlanner mode="local" initialIncome="25000" />, {
      authenticated: false,
    });
    // Untouched: nothing saved, the income of the year is kept for next time.
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
    expect(screen.queryByText(tr('tools.renta.recovered'))).toBeNull();
    fireEvent.change(screen.getByLabelText(tr('tools.renta.gross')), {
      target: { value: '31000' },
    });
    expect(stored()).toMatchObject({ year: 2025, form: { gross: '31000' } });
    unmount();

    renderWithProviders(<RentaPlanner mode="local" initialIncome="25000" />, {
      authenticated: false,
    });
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('31000');
    expect(screen.getByText(tr('tools.renta.recovered'))).toBeInTheDocument();
  });

  it('does not mix the data of another year', () => {
    saveProgress({ year: 2026, form: { ...emptyForm(''), gross: '1' }, draft: NO_DRAFT });
    renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('');
  });

  it('deletes what was saved with the data', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    saveProgress({ year: 2025, form: { ...emptyForm(''), gross: '1' }, draft: NO_DRAFT });
    renderWithProviders(<RentaPlanner mode="local" initialIncome="5" />, { authenticated: false });
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.wipe') }));
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('');
    expect(screen.queryByText(tr('tools.renta.recovered'))).toBeNull();
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
  });
});

describe('the Renta section picks up the year that was left half done', () => {
  beforeEach(() => freezeTime('2026-03-15T12:00:00'));
  afterEach(restoreTime);

  it('opens the year of the saved data, when it is one of the years offered', async () => {
    saveProgress({ year: 2026, form: { ...emptyForm(''), gross: '7' }, draft: NO_DRAFT });
    renderWithProviders(<RentaView />);
    await waitFor(() => expect(screen.getByLabelText(tr('app.renta.year'))).toHaveValue('2026'));
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('7');
  });

  it('opens the last return otherwise', async () => {
    saveProgress({ year: 2019, form: emptyForm(''), draft: NO_DRAFT });
    renderWithProviders(<RentaView />);
    expect(await screen.findByLabelText(tr('app.renta.year'))).toHaveValue('2025');
  });
});
