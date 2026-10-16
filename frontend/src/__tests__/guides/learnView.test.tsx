import { fireEvent, screen, within } from '@testing-library/react';
import { GUIDES } from '@modules/guides/domain/guides';
import {
  GUIDE_CATEGORIES,
  categoryOf,
  readingMinutes,
} from '@modules/guides/domain/guideCategories';
import { highlight } from '@modules/guides/ui/GuideBody';
import { LearnView } from '@modules/finances/ui/views/LearnView';
import { literal, renderWithProviders, tr } from '@test-utils/render';

describe('Learn to save', () => {
  it('lists every guide and reads any of them', () => {
    renderWithProviders(<LearnView />);
    expect(screen.getByText(tr('app.learn.count', { total: GUIDES.length }))).toBeInTheDocument();
    const guide = GUIDES.find((g) => g.tool)!;
    fireEvent.click(screen.getByRole('button', { name: literal(guide.title) }));
    expect(document.querySelector('.guide-intro')?.textContent).toBe(guide.intro);
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

describe('Guide catalogue', () => {
  it('groups the guides by topic and filters by topic and search', () => {
    renderWithProviders(<LearnView />);
    const groups = document.querySelectorAll('.guide-group');
    expect(groups.length).toBe(GUIDE_CATEGORIES.length);
    fireEvent.click(screen.getByRole('button', { name: /Autónomos/ }));
    expect(document.querySelectorAll('.guide-group').length).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: /Autónomos/ }));
    expect(document.querySelectorAll('.guide-group').length).toBe(GUIDE_CATEGORIES.length);
    fireEvent.click(screen.getByRole('button', { name: /Autónomos/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    fireEvent.change(screen.getByLabelText('Buscar una guía'), { target: { value: 'modelo 130' } });
    const group = document.querySelector('.guide-group') as HTMLElement;
    expect(within(group).getAllByRole('button').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Buscar una guía'), { target: { value: 'zzzz' } });
    expect(screen.getByText('No hay guías con esa búsqueda.')).toBeInTheDocument();
  });

  it('puts every guide in a topic and estimates its reading time', () => {
    for (const g of GUIDES) {
      expect(categoryOf(g.slug).id).not.toBe('otras');
      expect(readingMinutes(g)).toBeGreaterThan(0);
    }
    expect(categoryOf('no-existe').id).toBe('otras');
    expect(readingMinutes({ ...GUIDES[0], intro: 'a', sections: [] })).toBe(1);
  });

  it('highlights amounts and percentages in the text', () => {
    const { container } = renderWithProviders(
      <div>{highlight('Ahorra el 20 % o 1.500 € al año')}</div>
    );
    expect([...container.querySelectorAll('.guide-num')].map((e) => e.textContent)).toEqual([
      '20 %',
      '1.500 €',
    ]);
  });
});
