import { Response } from 'express';
import { CategoryController } from '@infrastructure/controllers/CategoryController';
import { SqliteCategoryRepository } from '@infrastructure/persistence/SqliteCategoryRepository';
import { AuthRequest } from '@infrastructure/express/authMiddleware';
import { Category } from '@domain/entities/Category';

function makeRes(): Partial<Response> & { send: jest.Mock } {
    const res: Partial<Response> & { send: jest.Mock } = { send: jest.fn() };
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function makeReq(
    params: Record<string, string> = {},
    body: Record<string, unknown> = {},
    userId = 'user-1'
): AuthRequest {
    return { params, body, userId } as unknown as AuthRequest;
}

describe('CategoryController', () => {
    let categoryRepo: jest.Mocked<SqliteCategoryRepository>;
    let controller: CategoryController;

    beforeEach(() => {
        categoryRepo = {
            findAllByUser: jest.fn(),
            save: jest.fn(),
            findById: jest.fn(),
            delete: jest.fn(),
        } as unknown as jest.Mocked<SqliteCategoryRepository>;
        controller = new CategoryController(categoryRepo);
    });

    describe('getAll', () => {
        it('returns mapped categories as JSON', async () => {
            const cats = [
                Category.create({ name: 'Alimentación', color: '#f97316', icon: '🍔' }),
                Category.create({ name: 'Salud', color: '#22c55e', icon: '💊' }),
            ];
            categoryRepo.findAllByUser.mockResolvedValue(cats);
            const res = makeRes();
            await controller.getAll(makeReq(), res as Response);
            expect(res.json).toHaveBeenCalledWith(cats.map(c => c.toJSON()));
        });

        it('returns 500 on error', async () => {
            categoryRepo.findAllByUser.mockRejectedValue(new Error('DB error'));
            const res = makeRes();
            await controller.getAll(makeReq(), res as Response);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
        });
    });

    describe('create', () => {
        it('creates a category and returns 201', async () => {
            categoryRepo.save.mockResolvedValue(undefined);
            const res = makeRes();
            await controller.create(
                makeReq({}, { name: 'Viaje', color: '#3b82f6', icon: '✈️' }),
                res as Response
            );
            expect(categoryRepo.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Viaje', color: '#3b82f6', icon: '✈️' })
            );
        });

        it('returns 400 on error', async () => {
            categoryRepo.save.mockRejectedValue(new Error('Duplicate'));
            const res = makeRes();
            await controller.create(makeReq({}, { name: 'X', color: '#000', icon: '💡' }), res as Response);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Duplicate' });
        });
    });

    describe('delete', () => {
        it('returns 204 when category found and deleted', async () => {
            const cat = Category.create({ name: 'Ocio', color: '#ec4899', icon: '🎉' });
            categoryRepo.findById.mockResolvedValue(cat);
            categoryRepo.delete.mockResolvedValue(undefined);
            const res = makeRes();
            await controller.delete(makeReq({ id: cat.id }), res as Response);
            expect(categoryRepo.delete).toHaveBeenCalledWith(cat.id);
            expect(res.status).toHaveBeenCalledWith(204);
        });

        it('returns 404 when category not found', async () => {
            categoryRepo.findById.mockResolvedValue(null);
            const res = makeRes();
            await controller.delete(makeReq({ id: 'missing-id' }), res as Response);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Categoría no encontrada' });
        });

        it('returns 500 on error', async () => {
            categoryRepo.findById.mockRejectedValue(new Error('DB crash'));
            const res = makeRes();
            await controller.delete(makeReq({ id: 'x' }), res as Response);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
