import { render } from '@testing-library/react';
import { Icon } from '@shared/components/Icon';

describe('Icon', () => {
  it('draws a line icon of the set, hidden from screen readers', () => {
    const { container } = render(<Icon name="trash" size={24} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '24');
  });

  it('shows a name that is not in the set (a user-chosen emoji) as text', () => {
    const { container } = render(<Icon name="🏦" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container).toHaveTextContent('🏦');
  });
});
