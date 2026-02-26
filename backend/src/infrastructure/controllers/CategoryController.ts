import { Response } from 'express';
import { AuthRequest } from '@infrastructure/express/authMiddleware';
import { SqliteCategoryRepository } from '@infrastructure/persistence/SqliteCategoryRepository';
import { Category } from '@domain/entities/Category';

export class CategoryController {
    constructor(private readonly categoryRepo: SqliteCategoryRepository) { }

    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const categories = await this.categoryRepo.findAllByUser(req.userId!);
            res.json(categories.map((c) => c.toJSON()));
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const category = Category.create(req.body);
            await this.categoryRepo.save(category, req.userId!);
            res.status(201).json(category.toJSON());
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const cat = await this.categoryRepo.findById(req.params.id);
            if (!cat) { res.status(404).json({ error: 'Categoría no encontrada' }); return; }
            await this.categoryRepo.delete(req.params.id);
            res.status(204).send();
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }
}
