import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';

describe('CollapsiblePanel', () => {
    test('renders title and children when defaultOpen=true', () => {
        render(
            <CollapsiblePanel title="My Panel">
                <p>Panel content</p>
            </CollapsiblePanel>
        );
        expect(screen.getByText('My Panel')).toBeInTheDocument();
        expect(screen.getByText('Panel content')).toBeInTheDocument();
    });

    test('toggles open/closed on button click', () => {
        render(
            <CollapsiblePanel title="Toggle Panel">
                <span>Content</span>
            </CollapsiblePanel>
        );
        const btn = screen.getByRole('button');
        expect(btn).toHaveAttribute('aria-expanded', 'true');
        fireEvent.click(btn);
        expect(btn).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(btn);
        expect(btn).toHaveAttribute('aria-expanded', 'true');
    });

    test('renders as closed when defaultOpen=false', () => {
        render(
            <CollapsiblePanel title="Closed Panel" defaultOpen={false}>
                <span>Hidden</span>
            </CollapsiblePanel>
        );
        const btn = screen.getByRole('button');
        expect(btn).toHaveAttribute('aria-expanded', 'false');
    });

    test('accepts optional className and style props', () => {
        const { container } = render(
            <CollapsiblePanel title="Styled" className="my-class" style={{ marginTop: '10px' }}>
                <span>test</span>
            </CollapsiblePanel>
        );
        const card = container.firstChild as HTMLElement;
        expect(card.className).toContain('my-class');
    });

    test('renders ReactNode title (JSX)', () => {
        render(
            <CollapsiblePanel title={<><b>Bold</b> title</>}>
                <span>child</span>
            </CollapsiblePanel>
        );
        expect(screen.getByText('Bold')).toBeInTheDocument();
    });
});
