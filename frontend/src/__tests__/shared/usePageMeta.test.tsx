import { render } from '@testing-library/react';
import { usePageMeta } from '@shared/hooks/usePageMeta';

function Page({ title }: { title: string }) {
  usePageMeta(title, 'Descripción', '/ruta');
  return null;
}

const meta = () => document.head.querySelector('meta[name="description"]');
const canonical = () => document.head.querySelector('link[rel="canonical"]');

afterEach(() => {
  meta()?.remove();
  canonical()?.remove();
});

describe('usePageMeta', () => {
  it('creates the tags, updates them and leaves nothing behind', () => {
    document.title = 'Antes';
    const { rerender, unmount } = render(<Page title="Uno" />);
    expect(document.title).toBe('Uno');
    expect(meta()).toHaveAttribute('content', 'Descripción');
    rerender(<Page title="Dos" />);
    expect(document.title).toBe('Dos');
    unmount();
    expect(document.title).toBe('Antes');
    expect(meta()).not.toHaveAttribute('content');
    expect(canonical()).not.toHaveAttribute('href');
  });

  it('puts back the description and canonical link that were already there', () => {
    document.head.insertAdjacentHTML(
      'beforeend',
      '<meta name="description" content="Original"><link rel="canonical" href="https://x.test/">'
    );
    const { unmount } = render(<Page title="Uno" />);
    expect(canonical()).toHaveAttribute('href', `${window.location.origin}/ruta`);
    unmount();
    expect(meta()).toHaveAttribute('content', 'Original');
    expect(canonical()).toHaveAttribute('href', 'https://x.test/');
  });
});
