import { fireEvent, screen } from '@testing-library/react';
import { GUIDES } from '@modules/guides/domain/guides';
import { LearnView } from '@modules/finances/ui/views/LearnView';
import { literal, renderWithProviders, tr } from '@test-utils/render';

describe('Learn to save', () => {
  it('lists every guide and reads any of them', () => {
    renderWithProviders(<LearnView />);
    expect(screen.getByText(tr('app.learn.count', { total: GUIDES.length }))).toBeInTheDocument();
    const guide = GUIDES.find((g) => g.tool)!;
    fireEvent.click(screen.getByRole('button', { name: literal(guide.title) }));
    expect(screen.getByText(guide.intro)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', guide.tool!.to);
  });

  it('goes back to the list and opens a guide without a calculator', () => {
    renderWithProviders(<LearnView />);
    const plain = GUIDES.find((g) => !g.tool)!;
    fireEvent.click(screen.getByRole('button', { name: literal(plain.title) }));
    expect(screen.queryByRole('link')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: literal(`← ${tr('app.learn.back')}`) }));
    expect(screen.getByText(tr('app.learn.hint'))).toBeInTheDocument();
  });
});
