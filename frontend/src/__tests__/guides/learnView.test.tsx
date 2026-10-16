import { fireEvent, screen, within } from '@testing-library/react';
import { GUIDES, findGuide } from '@modules/guides/domain/guides';
import {
  GUIDE_CATEGORIES,
  categoryOf,
  readingMinutes,
} from '@modules/guides/domain/guideCategories';
import { GuideBody, highlight } from '@modules/guides/ui/GuideBody';
import { LearnView } from '@modules/finances/ui/views/LearnView';
import { literal, renderWithProviders, tr } from '@test-utils/render';

describe('Learn to save', () => {
  it('lists every guide and reads any of them', () => {
    renderWithProviders(<LearnView onOpenTab={jest.fn()} />);
    expect(screen.getByText(tr('app.learn.count', { total: GUIDES.length }))).toBeInTheDocument();
    const guide = GUIDES.find((g) => g.tool)!;
    fireEvent.click(screen.getByRole('button', { name: literal(guide.title) }));
    expect(document.querySelector('.guide-intro')?.textContent).toBe(guide.intro);
    expect(screen.getByRole('link')).toHaveAttribute('href', guide.tool!.to);
  });

  it('goes back to the list and opens a guide without a calculator', () => {
    renderWithProviders(<LearnView onOpenTab={jest.fn()} />);
    const plain = GUIDES.find((g) => !g.tool)!;
    fireEvent.click(screen.getByRole('button', { name: literal(plain.title) }));
    expect(screen.queryByRole('link')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: literal(`← ${tr('app.learn.back')}`) }));
    expect(screen.getByText(tr('app.learn.hint'))).toBeInTheDocument();
  });
});

describe('Guide catalogue', () => {
  it('groups the guides by topic and filters by topic and search', () => {
    renderWithProviders(<LearnView onOpenTab={jest.fn()} />);
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

describe('Links inside the guides of the app', () => {
  const open = (slug: string, onOpenTab = jest.fn()) => {
    renderWithProviders(<LearnView onOpenTab={onOpenTab} />);
    fireEvent.click(screen.getByRole('button', { name: literal(findGuide(slug)!.title) }));
    return onOpenTab;
  };

  it('opens the section of the app from the calculator button and from the text', () => {
    const slug = GUIDES.find((g) => g.tool?.to === '/calculadora-renta')!.slug;
    const onOpenTab = open(slug);
    fireEvent.click(screen.getByRole('button', { name: /Calculadora de la Renta/ }));
    expect(onOpenTab).toHaveBeenCalledWith('renta');
  });

  it('opens another guide in place and the sections from a link in the text', () => {
    const slug = GUIDES.find((g) =>
      g.sections.some((s) => s.paragraphs.some((p) => p.includes('(/calculadora-renta)')))
    )!.slug;
    const onOpenTab = open(slug);
    fireEvent.click(screen.getByRole('button', { name: 'calculadora de la Renta' }));
    expect(onOpenTab).toHaveBeenCalledWith('renta');
    fireEvent.click(screen.getByRole('button', { name: 'si te sale a pagar o a devolver' }));
    expect(document.querySelector('.guide-article h2')?.textContent).toBe(
      findGuide('renta-a-pagar-o-a-devolver')!.title
    );
  });

  it('leaves the public calculators as links', () => {
    const slug = GUIDES.find((g) => g.tool?.to === '/calculadora-iva')!.slug;
    open(slug);
    expect(screen.getByRole('link', { name: /Calculadora de IVA/ })).toHaveAttribute(
      'href',
      '/calculadora-iva'
    );
  });
});

describe('Guide body links', () => {
  it('links to the app with a router link when no custom link renderer is given', () => {
    renderWithProviders(
      <GuideBody
        guide={{
          ...GUIDES[0],
          sections: [{ heading: 'H', paragraphs: ['Mira [el simulador](/simulador-ahorro) hoy'] }],
        }}
      />
    );
    expect(screen.getByRole('link', { name: 'el simulador' })).toHaveAttribute(
      'href',
      '/simulador-ahorro'
    );
  });
});
