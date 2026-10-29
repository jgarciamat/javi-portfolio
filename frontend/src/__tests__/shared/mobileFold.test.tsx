import { fireEvent, screen } from '@testing-library/react';
import { MobileFold, PHONE } from '@shared/components/MobileFold';
import { renderWithProviders } from '@test-utils/render';

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

  it('folds it under its line on a phone, closed until opened', () => {
    screenOf(true);
    renderWithProviders(
      <MobileFold summary="More">
        <p>Dates</p>
      </MobileFold>,
      { authenticated: false }
    );
    const summary = screen.getByText('More');
    const fold = summary.closest('details') as HTMLDetailsElement;
    expect(fold.open).toBe(false);
    expect(fold).toHaveTextContent('Dates');
    fireEvent.click(summary);
    expect(fold.open).toBe(true);
  });
});
