import { renderHook, act } from '@testing-library/react';
import { useCategoryManager } from '../../modules/finances/application/hooks/useCategoryManager';

const mockOnClose = jest.fn();
const mockOnAdd = jest.fn().mockResolvedValue(undefined);
const mockOnDelete = jest.fn().mockResolvedValue(undefined);

const defaultOpts = {
    open: true,
    onClose: mockOnClose,
    onAdd: mockOnAdd,
    onDelete: mockOnDelete,
};

describe('useCategoryManager', () => {
    beforeEach(() => jest.clearAllMocks());

    test('initialises default field values', () => {
        const { result } = renderHook(() => useCategoryManager(defaultOpts));
        expect(result.current.fields.name).toBe('');
        expect(result.current.fields.icon).toBe('💰');
        expect(result.current.fields.color).toBe('#6366f1');
        expect(result.current.showEmojiPicker).toBe(false);
        expect(result.current.saving).toBe(false);
    });

    test('canCreate is false when name is empty', () => {
        const { result } = renderHook(() => useCategoryManager(defaultOpts));
        expect(result.current.canCreate).toBe(false);
    });

    test('canCreate is true when name has content', () => {
        const { result } = renderHook(() => useCategoryManager(defaultOpts));
        act(() => result.current.setName('Food'));
        expect(result.current.canCreate).toBe(true);
    });

    test('handleCreate shows error when name is empty', async () => {
        const { result } = renderHook(() => useCategoryManager(defaultOpts));
        const fakeEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
        await act(async () => { result.current.handleCreate(fakeEvent); });
        expect(result.current.error).toBe('El nombre es obligatorio');
        expect(mockOnAdd).not.toHaveBeenCalled();
    });

    test('handleCreate calls onAdd with trimmed name', async () => {
        const { result } = renderHook(() => useCategoryManager(defaultOpts));
        act(() => result.current.setName('  Food  '));
        const fakeEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
        await act(async () => { result.current.handleCreate(fakeEvent); });
        expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Food' }));
        // Fields reset after success
        expect(result.current.fields.name).toBe('');
        expect(result.current.fields.icon).toBe('💰');
    });

    test('handleCreate shows error when onAdd throws', async () => {
        mockOnAdd.mockRejectedValueOnce(new Error('Category error'));
        const { result } = renderHook(() => useCategoryManager(defaultOpts));
        act(() => result.current.setName('Food'));
        const fakeEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
        await act(async () => { result.current.handleCreate(fakeEvent); });
        expect(result.current.error).toBe('Category error');
    });

    test('handleCreate shows generic error for non-Error rejection', async () => {
        mockOnAdd.mockRejectedValueOnce('boom');
        const { result } = renderHook(() => useCategoryManager(defaultOpts));
        act(() => result.current.setName('Food'));
        const fakeEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
        await act(async () => { result.current.handleCreate(fakeEvent); });
        expect(result.current.error).toBe('Error al crear la categoría');
    });

    test('handleDelete calls onDelete and clears deletingId', async () => {
        const { result } = renderHook(() => useCategoryManager(defaultOpts));
        await act(async () => { await result.current.handleDelete('c1'); });
        expect(mockOnDelete).toHaveBeenCalledWith('c1');
        expect(result.current.deletingId).toBeNull();
    });

    test('handleDelete clears deletingId even on error', async () => {
        mockOnDelete.mockRejectedValueOnce(new Error('delete fail'));
        const { result } = renderHook(() => useCategoryManager(defaultOpts));
        await act(async () => { await result.current.handleDelete('c1'); });
        expect(result.current.deletingId).toBeNull();
    });

    test('selectEmoji sets icon and hides emoji picker', () => {
        const { result } = renderHook(() => useCategoryManager(defaultOpts));
        act(() => result.current.setShowEmojiPicker(true));
        act(() => result.current.selectEmoji('🍔'));
        expect(result.current.fields.icon).toBe('🍔');
        expect(result.current.showEmojiPicker).toBe(false);
        expect(result.current.fields.search).toBe('');
    });

    test('resets form fields when open changes to false', () => {
        const { result, rerender } = renderHook((props) => useCategoryManager(props), {
            initialProps: { ...defaultOpts, open: true },
        });
        act(() => {
            result.current.setName('Transport');
            result.current.setSearch('bus');
        });
        expect(result.current.fields.name).toBe('Transport');
        // Close the modal
        rerender({ ...defaultOpts, open: false });
        expect(result.current.fields.name).toBe('');
        expect(result.current.fields.search).toBe('');
    });

    test('Escape key triggers onClose when open', () => {
        renderHook(() => useCategoryManager({ ...defaultOpts, open: true }));
        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });
        expect(mockOnClose).toHaveBeenCalled();
    });

    test('Escape key does not trigger onClose when closed', () => {
        renderHook(() => useCategoryManager({ ...defaultOpts, open: false }));
        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });
        expect(mockOnClose).not.toHaveBeenCalled();
    });
});
