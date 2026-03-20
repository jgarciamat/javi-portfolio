import { Response } from 'express';
import { AuthRequest } from '@infrastructure/express/authMiddleware';
import {
    CreateCustomAlert,
    GetCustomAlerts,
    UpdateCustomAlert,
    DeleteCustomAlert,
} from '@application/use-cases/CustomAlerts';

export class CustomAlertController {
    constructor(
        private readonly createUseCase: CreateCustomAlert,
        private readonly getUseCase: GetCustomAlerts,
        private readonly updateUseCase: UpdateCustomAlert,
        private readonly deleteUseCase: DeleteCustomAlert,
    ) { }

    async getAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const alerts = await this.getUseCase.execute(userId);
            res.json(alerts.map((a) => a.toJSON()));
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const alert = await this.createUseCase.execute({ ...req.body, userId });
            res.status(201).json(alert.toJSON());
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const alert = await this.updateUseCase.execute(id, req.body);
            if (!alert) {
                res.status(404).json({ error: 'Custom alert not found' });
                return;
            }
            res.json(alert.toJSON());
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await this.deleteUseCase.execute(id);
            res.status(204).send();
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }
}
