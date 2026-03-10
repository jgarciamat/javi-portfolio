import { GetCategories } from '@application/use-cases/GetCategories';
import { ICategoryRepository } from '@domain/repositories/ICategoryRepository';
import { Category } from '@domain/entities/Category';

function makeRepo(overrides: Partial<ICategoryRepository> = {}): jest.Mocked<ICategoryRepository> {
    return {
        save: jest.fn(),
        findById: jest.fn(),
        findByName: jest.fn(),
        findAll: jest.fn().mockResolvedValue([]),
        findAllByUser: jest.fn(),
        delete: jest.fn(),
        deleteAllByUser: jest.fn(),
        seedForUser: jest.fn(),
        ...overrides,
    } as jest.Mocked<ICategoryRepository>;
}

describe('GetCategories', () => {
    it('returns all categories from the repository', async () => {
        const cats = [Category.create({ name: 'Ocio' }), Category.create({ name: 'Salud' })];
        const repo = makeRepo({ findAll: jest.fn().mockResolvedValue(cats) });
        const useCase = new GetCategories(repo);

        const result = await useCase.execute();

        expect(result).toHaveLength(2);
        expect(repo.findAll).toHaveBeenCalled();
    });

    it('returns empty array when repository is empty', async () => {
        const repo = makeRepo({ findAll: jest.fn().mockResolvedValue([]) });
        const useCase = new GetCategories(repo);

        const result = await useCase.execute();

        expect(result).toEqual([]);
    });
});
