import { Response } from 'express';
import { AuthRequest } from '@infrastructure/express/authMiddleware';
import {
    CreateRecurringRule,
    GetRecurringRules,
    UpdateRecurringRule,
    DeleteRecurringRule,
} from '@application/use-cases/RecurringRules';

export class RecurringRuleController {
    constructor(
        private readonly createUseCase: CreateRecurringRule,
        private readonly getUseCase: GetRecurringRules,
        private readonly updateUseCase: UpdateRecurringRule,
        private readonly deleteUseCase: DeleteRecurringRule,
    ) { }

    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const rules = await this.getUseCase.execute(userId);
            res.json(rules.map((r) => r.toJSON()));
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const rule = await this.createUseCase.execute({ ...req.body, userId });
            res.status(201).json(rule.toJSON());
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const { id } = req.params;
            const rule = await this.updateUseCase.execute(id, userId, req.body);
            res.json(rule.toJSON());
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error';
            const status = msg === 'Forbidden' ? 403 : msg.includes('not found') ? 404 : 400;
            res.status(status).json({ error: msg });
        }
    }

    delete(req: AuthRequest, res: Response): void {
        try {
            const userId = req.userId!;
            const { id } = req.params;
            this.deleteUseCase.execute(id, userId);
            res.status(204).send();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error';
            const status = msg === 'Forbidden' ? 403 : msg.includes('not found') ? 404 : 400;
            res.status(status).json({ error: msg });
        }
    }
}
