import { fireEvent, screen } from '@testing-library/react';
import type { Deduction } from '@modules/tools/domain/rentaData';
import { NO_REVIEW } from '@modules/tools/domain/rentaReview';
import { DeductionReview, type ReviewProps } from '@modules/tools/ui/renta/DeductionReview';
import { renderWithProviders, tr } from '@test-utils/render';

const ded = (id: string, over: Partial<Deduction> = {}): Deduction => ({
  id,
  group: 'health',
  title: `Título ${id}`,
  summary: 'Resumen',
  kind: 'fixed',
  amount: 100,
  requirements: 'Requisitos',
  url: 'https://example.test',
  ...over,
});
const A = ded('estado-a');
const LIMITED = ded('estado-b', { incomeLimit: { individual: 20000 } });

const props = (over: Partial<ReviewProps> = {}): ReviewProps => ({
  n: 2,
  ccaa: null,
  deductions: [A, LIMITED],
  candidates: [A],
  outOfReach: [LIMITED],
  dismissed: [],
  review: NO_REVIEW,
  choices: {},
  savings: { 'estado-a': { saving: 0, blocked: false, example: null } },
  markedSaving: 0,
  onDecide: jest.fn(),
  startSignal: 0,
  ...over,
});
const render = (p: ReviewProps) =>
  renderWithProviders(<DeductionReview {...p} />, { authenticated: false });

describe('the review, on its own', () => {
  it('says when a marked deduction saves nothing, and the limit of one without a note', () => {
    const { unmount } = render(
      props({ savings: { 'estado-a': { saving: 9, blocked: false, example: null } } })
    );
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.review.start') }));
    // Not marked yet: a question, without what it would save.
    expect(screen.queryByText(tr('tools.renta.review.saving'), { exact: false })).toBeNull();
    unmount();
    render(props({ choices: { 'estado-a': { on: true, amount: '', units: '' } }, dismissed: [] }));
    expect(screen.getByText(/Tu base supera el límite de 20.000/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.review.start') }));
    expect(screen.getByText(tr('tools.renta.saving.none'))).toBeInTheDocument();
    // While going through them, the ones out of reach are not in the way.
    expect(screen.queryByText(/Tu base supera/)).toBeNull();
  });

  it('with everything dismissed, offers to review them all again', () => {
    render(props({ dismissed: ['estado-a'] }));
    expect(screen.getByText(tr('tools.renta.review.none'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.review.again') }));
    expect(screen.getByText(tr('tools.renta.review.status.dismissed'))).toBeInTheDocument();
  });

  it('with nothing to review, says so; a signal goes straight to the summary', () => {
    const { rerender } = render(props({ candidates: [], outOfReach: [] }));
    expect(screen.getByText(tr('tools.renta.review.none'))).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<DeductionReview {...props({ candidates: [], outOfReach: [], startSignal: 1 })} />);
    expect(screen.getByText(tr('tools.renta.review.doneTitle'))).toHaveFocus();
    expect(screen.getByText(tr('tools.renta.review.pending', { count: 0 }))).toBeInTheDocument();
  });
});
