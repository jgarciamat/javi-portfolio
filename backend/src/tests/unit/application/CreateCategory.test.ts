import { CreateCategory } from '@application/use-cases/CreateCategory';
import { ICategoryRepository } from '@domain/repositories/ICategoryRepository';
import { Category } from '@domain/entities/Category';

function makeRepo(overrides: Partial<ICategoryRepository> = {}): jest.Mocked<ICategoryRepository> {
    return {
        save: jest.fn(),
        findById: jest.fn(),
        findByName: jest.fn().mockResolvedValue(null),
        findAll: jest.fn(),
        findAllByUser: jest.fn(),
        delete: jest.fn(),
        seedForUser: jest.fn(),
        ...overrides,
    } as jest.Mocked<ICategoryRepository>;
}

describe('CreateCategory', () => {
    it('creates and saves a new category', async () => {
        const repo = makeRepo();
        const useCase = new CreateCategory(repo);

        const result = await useCase.execute({ name: 'Ocio', color: '#ec4899', icon: '🎉' });

        expect(result).toBeInstanceOf(Category);
        expect(result.name).toBe('Ocio');
        expect(repo.save).toHaveBeenCalledWith(result);
    });

    it('throws when a category with the same name already exists', async () => {
        const existing = Category.create({ name: 'Ocio' });
        const repo = makeRepo({ findByName: jest.fn().mockResolvedValue(existing) });
        const useCase = new CreateCategory(repo);

        await expect(useCase.execute({ name: 'Ocio' }))
            .rejects.toThrow("Category 'Ocio' already exists");
    });

    it('creates a category without optional fields', async () => {
        const repo = makeRepo();
        const useCase = new CreateCategory(repo);

        const result = await useCase.execute({ name: 'MinimalCat' });

        expect(result.name).toBe('MinimalCat');
    });
});
