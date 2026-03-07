import { InMemoryCategoryRepository } from '@infrastructure/persistence/InMemoryCategoryRepository';
import { Category } from '@domain/entities/Category';

describe('InMemoryCategoryRepository', () => {
    let repo: InMemoryCategoryRepository;

    beforeEach(() => {
        repo = new InMemoryCategoryRepository();
    });

    it('seeds default categories on construction', async () => {
        const all = await repo.findAll();
        expect(all.length).toBeGreaterThan(0);
    });

    describe('save', () => {
        it('saves a new category', async () => {
            const cat = Category.create({ name: 'Viaje', color: '#3b82f6', icon: '✈️' });
            await repo.save(cat);
            const found = await repo.findById(cat.id);
            expect(found).not.toBeNull();
            expect(found!.name).toBe('Viaje');
        });
    });

    describe('findById', () => {
        it('returns null for unknown id', async () => {
            const result = await repo.findById('does-not-exist');
            expect(result).toBeNull();
        });

        it('returns the category when found', async () => {
            const cat = Category.create({ name: 'Test', color: '#aaa', icon: '⭐' });
            await repo.save(cat);
            const found = await repo.findById(cat.id);
            expect(found!.name).toBe('Test');
        });
    });

    describe('findByName', () => {
        it('returns null when name not found', async () => {
            const result = await repo.findByName('Not Existing');
            expect(result).toBeNull();
        });

        it('finds by name case-insensitively', async () => {
            const cat = Category.create({ name: 'Salario', color: '#10b981', icon: '💼' });
            await repo.save(cat);
            const found = await repo.findByName('SALARIO');
            expect(found).not.toBeNull();
        });
    });

    describe('findAll', () => {
        it('returns categories sorted by name', async () => {
            // Reset and add custom categories to check ordering
            const r = new InMemoryCategoryRepository();
            const cats = await r.findAll();
            const names = cats.map(c => c.name);
            expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
        });
    });

    describe('findAllByUser', () => {
        it('returns all categories (not user-scoped)', async () => {
            const all = await repo.findAllByUser('any-user-id');
            expect(all.length).toBeGreaterThan(0);
        });
    });

    describe('delete', () => {
        it('removes the category', async () => {
            const cat = Category.create({ name: 'ToDelete', color: '#000', icon: '🗑️' });
            await repo.save(cat);
            await repo.delete(cat.id);
            const found = await repo.findById(cat.id);
            expect(found).toBeNull();
        });

        it('is a no-op for non-existent id', async () => {
            await expect(repo.delete('non-existent')).resolves.not.toThrow();
        });
    });

    describe('seedForUser', () => {
        it('is a no-op and does not throw', () => {
            expect(() => repo.seedForUser('any-user')).not.toThrow();
        });
    });
});
