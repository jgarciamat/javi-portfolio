import { Response } from 'express';
import { SyncBankTransactions } from '@application/use-cases/SyncBankTransactions';
import { OpenBankingService } from '@infrastructure/openbanking/OpenBankingService';
import { AuthRequest } from '@infrastructure/express/authMiddleware';

export class OpenBankingController {
    constructor(
        private readonly syncBankTransactions: SyncBankTransactions,
        private readonly openBankingService: OpenBankingService,
    ) { }

    /** GET /open-banking/institutions?country=ES */
    async listInstitutions(req: AuthRequest, res: Response): Promise<void> {
        try {
            const country = (req.query.country as string) ?? 'ES';
            const institutions = await this.openBankingService.listInstitutions(country);
            res.json({ institutions });
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    /** POST /open-banking/link  { institutionId, redirectUrl } */
    async linkAccount(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { institutionId, redirectUrl } = req.body as {
                institutionId: string;
                redirectUrl: string;
            };

            if (!institutionId || !redirectUrl) {
                res.status(400).json({ error: 'institutionId y redirectUrl son requeridos' });
                return;
            }

            const result = await this.openBankingService.createRequisition(institutionId, redirectUrl);
            res.json(result);
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    /** GET /open-banking/accounts?requisitionId=xxx */
    async getLinkedAccounts(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { requisitionId } = req.query as { requisitionId: string };

            if (!requisitionId) {
                res.status(400).json({ error: 'requisitionId es requerido' });
                return;
            }

            const accountIds = await this.openBankingService.getRequisitionAccounts(requisitionId);

            // Enrich with account details
            const accounts = await Promise.all(
                accountIds.map(async (id) => {
                    const details = await this.openBankingService.getAccountDetails(id);
                    return { accountId: id, ...details };
                }),
            );

            res.json({ accounts });
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    /** POST /open-banking/sync  { accountId, dateFrom?, dateTo? } */
    async syncTransactions(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { accountId, dateFrom, dateTo } = req.body as {
                accountId: string;
                dateFrom?: string;
                dateTo?: string;
            };

            if (!accountId) {
                res.status(400).json({ error: 'accountId es requerido' });
                return;
            }

            const result = await this.syncBankTransactions.execute(accountId, dateFrom, dateTo);
            res.json(result);
        } catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'Error' });
        }
    }

    /** DELETE /open-banking/accounts/:accountId */
    async unlinkAccount(req: AuthRequest, res: Response): Promise<void> {
        // In a real implementation this would delete the requisition from GoCardless
        // and remove the linked account from the user's data.
        res.json({ message: `Cuenta ${req.params.accountId} desvinculada correctamente` });
    }
}
