import { fireEvent, screen } from '@testing-library/react';
import {
  BIG_CLASS,
  CONTRAST_CLASS,
  applyReadability,
  loadReadability,
} from '@core/theme/readability';
import { SettingsView } from '@modules/finances/ui/views/SettingsView';
import { renderWithProviders, tr } from '@test-utils/render';

afterEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});

describe('readability for the whole app', () => {
  it('turns large text and contrast on and off from Settings, and remembers them', async () => {
    renderWithProviders(<SettingsView onOpenProfile={jest.fn()} onStartTour={jest.fn()} />);
    const big = await screen.findByRole('checkbox', {
      name: new RegExp(tr('app.settings.bigText')),
    });
    const contrast = screen.getByRole('checkbox', {
      name: new RegExp(`^${tr('app.settings.contrast')}`),
    });
    expect(big).not.toBeChecked();
    fireEvent.click(big);
    fireEvent.click(contrast);
    expect(document.documentElement).toHaveClass(BIG_CLASS, CONTRAST_CLASS);
    expect(loadReadability()).toEqual({ big: true, contrast: true });
    fireEvent.click(big);
    fireEvent.click(contrast);
    expect(document.documentElement).not.toHaveClass(BIG_CLASS);
    expect(document.documentElement).not.toHaveClass(CONTRAST_CLASS);
    // Both off: nothing is kept.
    expect(localStorage.getItem('mm_readability')).toBeNull();
  });

  it('applies what was saved when the app starts', () => {
    localStorage.setItem('mm_readability', JSON.stringify({ big: true }));
    applyReadability(loadReadability());
    expect(document.documentElement).toHaveClass(BIG_CLASS);
    expect(document.documentElement).not.toHaveClass(CONTRAST_CLASS);
  });
});
