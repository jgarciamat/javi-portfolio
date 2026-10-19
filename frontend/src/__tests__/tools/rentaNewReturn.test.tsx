import { fireEvent, screen } from '@testing-library/react';
import {
  PROGRESS_KEY,
  loadProgress,
  reviveForm,
  saveProgress,
} from '@modules/tools/application/rentaProgress';
import { emptyForm } from '@modules/tools/domain/rentaForm';
import { emptyProperty } from '@modules/tools/domain/rentaRentals';
import { NO_DRAFT } from '@modules/tools/domain/rentaDraft';
import { NO_REVIEW } from '@modules/tools/domain/rentaReview';
import type { ActivityInput } from '@modules/tools/domain/rentaActivity';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { renderWithProviders, tr } from '@test-utils/render';

const activity = {
  kind: 'given',
  name: 'Tienda',
  withheld: 0,
  payments: 0,
  data: { area: 'direct', net: 1000 },
} as unknown as ActivityInput;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mm_renta_view', 'expert');
});

const k = (key: string) => tr(`tools.renta.newReturn.${key}`);
const start = (year = 2025) => {
  saveProgress({
    year,
    form: {
      ...emptyForm(''),
      gross: '1',
      activities: [activity],
      rentalOn: true,
      properties: [emptyProperty(1)],
    },
    draft: NO_DRAFT,
    review: NO_REVIEW,
  });
  localStorage.setItem('renta.invest.mappings', '{"a":{}}');
  renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
  fireEvent.click(screen.getByRole('button', { name: k('button') }));
};

describe('«Start a new return»', () => {
  it('says what is wiped and that it cannot be undone, and keeps everything on cancel', () => {
    start();
    expect(screen.getByText(k('wiped.invest'))).toBeInTheDocument();
    // Red like the app's other deletes: the button, and the confirm next to a neutral «Cancel».
    expect(screen.getByRole('button', { name: k('button') })).toHaveClass('btn-danger');
    expect(screen.getByRole('button', { name: k('confirm') })).toHaveClass('btn-danger');
    expect(screen.getByRole('button', { name: k('cancel') })).toHaveClass('btn-cancel');
    expect(screen.getByText(k('undo'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: k('cancel') }));
    expect(screen.queryByText(k('undo'))).toBeNull();
    expect(loadProgress()?.form.gross).toBe('1');
  });

  it('wipes the year but keeps the activity brought from Autónomos', () => {
    start();
    fireEvent.click(screen.getByRole('button', { name: k('confirm') }));
    const saved = loadProgress();
    expect(saved?.form.gross).toBe('');
    expect(saved?.form.activities).toEqual([activity]);
    expect(saved?.form.properties).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('mm_renta_snapshot_v2') ?? 'null')).toBeNull();
    expect(JSON.parse(localStorage.getItem('renta.invest.mappings') ?? 'null')).toBeNull();
  });

  it('wipes the activity too when it is ticked', () => {
    start();
    fireEvent.click(screen.getByLabelText(k('alsoActivity')));
    fireEvent.click(screen.getByRole('button', { name: k('confirm') }));
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
  });

  it('leaves another year’s saved data alone', () => {
    start(2024);
    fireEvent.click(screen.getByRole('button', { name: k('confirm') }));
    expect(loadProgress()?.year).toBe(2024);
  });
});

describe('the properties saved on the device', () => {
  it('are read back over an empty one, with their expenses as texts only', () => {
    const form = reviveForm({
      properties: [
        { label: 'Piso', income: '900', share: 5, expenses: { seguros: '10', x: 3 } },
        'no',
      ],
    });
    expect(form.properties).toEqual([
      { ...emptyProperty(1), label: 'Piso', income: '900', expenses: { seguros: '10' } },
    ]);
    expect(reviveForm({ properties: [{ expenses: 'x' }] }).properties?.[0].expenses).toEqual({});
  });
});
