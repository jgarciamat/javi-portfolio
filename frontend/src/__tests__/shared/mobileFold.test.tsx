import { fireEvent, screen } from '@testing-library/react';
import { MobileFold, PHONE } from '@shared/components/MobileFold';
import { RentaView } from '@modules/finances/ui/views/RentaView';
import { renderWithProviders, tr } from '@test-utils/render';

/** A screen of the given width for the media queries. */
const screenOf = (phone: boolean) =>
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: phone && query === PHONE,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });

afterEach(() => {
  delete (window as Partial<typeof window>).matchMedia;
  localStorage.clear();
});

describe('what comes before the task, folded on a phone', () => {
  it('shows it as it is on a wider screen', () => {
    screenOf(false);
    renderWithProviders(
      <MobileFold summary="More">
        <p>Dates</p>
      </MobileFold>,
      { authenticated: false }
    );
    expect(screen.getByText('Dates')).toBeVisible();
    expect(screen.queryByText('More')).toBeNull();
  });

  it('folds the dates and the help of the Renta so the question comes first', () => {
    screenOf(true);
    renderWithProviders(<RentaView />);
    const summary = screen.getByText(tr('app.renta.fold'));
    const fold = summary.closest('details') as HTMLDetailsElement;
    expect(fold.open).toBe(false);
    expect(fold).toHaveTextContent(tr('app.renta.hint'));
    fireEvent.click(summary);
    expect(fold.open).toBe(true);
  });
});
