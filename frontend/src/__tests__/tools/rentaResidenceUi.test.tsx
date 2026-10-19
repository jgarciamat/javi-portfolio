import { fireEvent, screen } from '@testing-library/react';
import { saveProgress } from '@modules/tools/application/rentaProgress';
import { rentaState } from '@modules/tools/data/renta/state';
import { NO_DRAFT } from '@modules/tools/domain/rentaDraft';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import { NO_REVIEW } from '@modules/tools/domain/rentaReview';
import { emptyResidence } from '@modules/tools/domain/rentaResidence';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { RentaAssistant, wizardKey } from '@modules/tools/ui/renta/RentaWizard';
import { renderWithProviders, tr } from '@test-utils/render';

const k = (key: string) => tr(`tools.renta.residence.${key}`);
const pick = (key: string) => fireEvent.click(screen.getByRole('radio', { name: k(key) }));
const saved = (form: Partial<RentaForm>) =>
  saveProgress({
    year: rentaState.year,
    form: { ...emptyForm(''), gross: '30000', ...form },
    draft: NO_DRAFT,
    review: NO_REVIEW,
  });
const nonResident = {
  ...emptyResidence(),
  days: 'less' as const,
  interests: 'no' as const,
  family: 'no' as const,
  special: 'none' as const,
};

beforeEach(() => localStorage.clear());

describe('the residence in the expert mode', () => {
  beforeEach(() => localStorage.setItem('mm_renta_view', 'expert'));
  const render = () => renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });

  it('asks step by step and says where a non-resident files, with no result nor form', async () => {
    saved({ ccaaId: 'madrid' });
    render();
    expect(await screen.findByText(k('pendingNote'))).toBeInTheDocument();
    pick('opt.days.less');
    pick('opt.interests.no');
    pick('opt.family.yes');
    pick('opt.special.none');
    expect(screen.getByText(k('note.familyPresumption'))).toBeInTheDocument();
    pick('opt.family.no');
    expect(screen.getAllByText(k('out.nonResident.title')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: k('out.nonResident.link1') })[0]).toHaveAttribute(
      'href',
      expect.stringContaining('GF00')
    );
    expect(screen.queryByText(new RegExp(tr('tools.renta.toPay')))).toBeNull();
  });

  it('asks the Basque territory and gives its Treasury', async () => {
    saved({ ccaaId: 'pais-vasco' });
    render();
    expect((await screen.findAllByText(k('out.basque.title'))).length).toBeGreaterThan(0);
    pick('opt.territory.gipuzkoa');
    expect(screen.getAllByText(k('out.gipuzkoa.title')).length).toBeGreaterThan(0);
  });
});

describe('the residence in the assistant', () => {
  it('a non-resident gets the official links instead of the result and the boxes', () => {
    saved({ ccaaId: 'madrid', residence: nonResident });
    localStorage.setItem(
      wizardKey(rentaState.year),
      JSON.stringify({
        at: 8,
        screen: 0,
        done: ['you', 'family', 'work', 'home', 'invest', 'activity', 'deductions', 'review'],
        answers: {},
        streak: 1,
        lastDay: '2026-01-01',
      })
    );
    renderWithProviders(<RentaAssistant mode="local" />, { authenticated: false });
    expect(screen.getByText(k('out.nonResident.body'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `${tr('wizard.next')} →` }));
    expect(screen.getByText(tr('wizard.renta.boxesOut'))).toBeInTheDocument();
  });

  it('the end does not give an amount to a non-resident', () => {
    saved({ ccaaId: 'madrid', residence: nonResident });
    localStorage.setItem(
      wizardKey(rentaState.year),
      JSON.stringify({
        at: 8,
        screen: 0,
        done: [
          'you',
          'family',
          'work',
          'home',
          'invest',
          'activity',
          'deductions',
          'review',
          'result',
        ],
        answers: {},
        streak: 1,
        lastDay: '2026-01-01',
      })
    );
    localStorage.setItem('mm_renta_snapshot_v2', 'null');
    renderWithProviders(<RentaAssistant mode="local" />, { authenticated: false });
    expect(screen.getByText(tr('wizard.renta.finale'))).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(tr('tools.renta.refund')))).toBeNull();
  });
});
