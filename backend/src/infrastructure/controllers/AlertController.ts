import { Response } from 'express';
import { CheckBudgetAlerts } from '@application/use-cases/CheckBudgetAlerts';
import { AuthRequest } from '@infrastructure/express/authMiddleware';

export class AlertController {
    constructor(private readonly checkBudgetAlerts: CheckBudgetAlerts) { }

    async budgetAlerts(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const year = parseInt(req.params.year);
            const month = parseInt(req.params.month);

            if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
                res.status(400).json({ error: 'Año o mes inválidos' });
                return;
            }

            const alerts = await this.checkBudgetAlerts.execute(userId, year, month);
            res.json({ alerts, year, month });
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }
}
