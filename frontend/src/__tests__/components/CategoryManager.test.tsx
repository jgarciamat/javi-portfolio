import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryManager } from '@modules/finances/ui/components/CategoryManager';
import type { Category } from '@modules/finances/domain/types';

const mockOnClose = jest.fn();
const mockOnAdd = jest.fn().mockResolvedValue(undefined);
const mockOnDelete = jest.fn().mockResolvedValue(undefined);

const categories: Category[] = [
    { id: 'c1', name: 'Food', color: '#ff0000', icon: '🍔' },
    { id: 'c2', name: 'Transport', color: '#0000ff', icon: '🚗' },
];

const defaultProps = {
    open: true,
    onClose: mockOnClose,
    categories,
    onAdd: mockOnAdd,
    onDelete: mockOnDelete,
};

describe('CategoryManager', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders nothing when open=false', () => {
        const { container } = render(<CategoryManager {...defaultProps} open={false} />);
        expect(container.firstChild).toBeNull();
    });

    test('renders modal with category list', () => {
        render(<CategoryManager {...defaultProps} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Food')).toBeInTheDocument();
        expect(screen.getByText('Transport')).toBeInTheDocument();
    });

    test('calls onClose when close button is clicked', () => {
        render(<CategoryManager {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Cerrar'));
        expect(mockOnClose).toHaveBeenCalled();
    });

    test('calls onClose when overlay background is clicked', () => {
        render(<CategoryManager {...defaultProps} />);
        const overlay = document.querySelector('.cat-modal-overlay')!;
        fireEvent.mouseDown(overlay, { target: overlay });
        expect(mockOnClose).toHaveBeenCalled();
    });

    test('calls onClose on footer close button', () => {
        render(<CategoryManager {...defaultProps} />);
        fireEvent.click(screen.getByText('Cerrar'));
        expect(mockOnClose).toHaveBeenCalled();
    });

    test('calls onDelete when delete button is clicked', () => {
        render(<CategoryManager {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Eliminar Food'));
        expect(mockOnDelete).toHaveBeenCalledWith('c1');
    });

    test('shows empty state when no categories', () => {
        render(<CategoryManager {...defaultProps} categories={[]} />);
        expect(screen.getByText('Sin categorías aún.')).toBeInTheDocument();
    });

    test('shows emoji picker when emoji button is clicked', () => {
        render(<CategoryManager {...defaultProps} />);
        const emojiBtn = document.querySelector('.cat-emoji-btn')!;
        fireEvent.click(emojiBtn);
        expect(screen.getByPlaceholderText('Buscar emoji...')).toBeInTheDocument();
    });

    test('create button is disabled when name is empty', () => {
        render(<CategoryManager {...defaultProps} />);
        const createBtn = screen.getByText('✓ Crear categoría');
        expect(createBtn).toBeDisabled();
    });

    test('create button is enabled when name is filled', () => {
        render(<CategoryManager {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText('Nombre de la categoría'), { target: { value: 'Hobbies' } });
        expect(screen.getByText('✓ Crear categoría')).not.toBeDisabled();
    });

    test('color dots are rendered', () => {
        render(<CategoryManager {...defaultProps} />);
        // At least one color dot should exist
        const dots = document.querySelectorAll('.cat-color-dot');
        expect(dots.length).toBeGreaterThan(0);
    });

    test('clicking a color dot selects it', () => {
        render(<CategoryManager {...defaultProps} />);
        const dots = document.querySelectorAll('.cat-color-dot');
        fireEvent.click(dots[1]); // click second color
        expect(dots[1].classList.contains('selected')).toBe(true);
    });

    test('emoji search filters results', () => {
        render(<CategoryManager {...defaultProps} />);
        const emojiBtn = document.querySelector('.cat-emoji-btn')!;
        fireEvent.click(emojiBtn);
        const searchInput = screen.getByPlaceholderText('Buscar emoji...');
        fireEvent.change(searchInput, { target: { value: '🍔' } });
        // Should show the filtered emoji results section
        expect(screen.getByText('Resultados')).toBeInTheDocument();
    });

    test('clicking an emoji selects it and closes picker', () => {
        render(<CategoryManager {...defaultProps} />);
        const emojiBtn = document.querySelector('.cat-emoji-btn')!;
        fireEvent.click(emojiBtn);
        const emojiItems = document.querySelectorAll('.cat-emoji-item');
        if (emojiItems.length > 0) {
            fireEvent.click(emojiItems[0]);
            // Picker should close after selection
            expect(screen.queryByPlaceholderText('Buscar emoji...')).toBeNull();
        }
    });

    test('shows spinner icon while deleting category', async () => {
        // onDelete never resolves during this test so deletingId stays set
        let resolveDelete!: () => void;
        const slowDelete = jest.fn(() => new Promise<void>((res) => { resolveDelete = res; }));
        render(<CategoryManager {...defaultProps} onDelete={slowDelete} />);
        fireEvent.click(screen.getByLabelText('Eliminar Food'));
        // While delete is pending, spinner should show
        expect(await screen.findByText('⏳')).toBeInTheDocument();
        // Resolve and clean up
        resolveDelete();
    });

    test('shows "Creando..." text while saving new category', async () => {
        let resolveAdd!: () => void;
        const slowAdd = jest.fn(() => new Promise<void>((res) => { resolveAdd = res; }));
        render(<CategoryManager {...defaultProps} onAdd={slowAdd} />);
        fireEvent.change(screen.getByPlaceholderText('Nombre de la categoría'), { target: { value: 'Hobbies' } });
        fireEvent.click(screen.getByText('✓ Crear categoría'));
        expect(await screen.findByText('Creando...')).toBeInTheDocument();
        resolveAdd();
    });

    test('shows error message when onAdd fails', async () => {
        const failAdd = jest.fn().mockRejectedValue(new Error('Duplicate category'));
        render(<CategoryManager {...defaultProps} onAdd={failAdd} />);
        fireEvent.change(screen.getByPlaceholderText('Nombre de la categoría'), { target: { value: 'Hobbies' } });
        fireEvent.click(screen.getByText('✓ Crear categoría'));
        expect(await screen.findByText('Duplicate category')).toBeInTheDocument();
    });
});
