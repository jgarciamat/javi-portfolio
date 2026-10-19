import { fireEvent, render, screen } from '@testing-library/react';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';

jest.mock('@modules/finances/ui/components/AutonomoWizard', () => ({
  AutonomoAssistant: ({ onOpenRenta }: { onOpenRenta?: () => void }) => (
    <button onClick={onOpenRenta}>renta</button>
  ),
}));

describe('the self-employed screen', () => {
  it('opens the Renta once the year is taken there', () => {
    const open = jest.fn();
    render(<BusinessView onOpenTab={open} />);
    fireEvent.click(screen.getByRole('button', { name: 'renta' }));
    expect(open).toHaveBeenCalledWith('renta');
  });
});
