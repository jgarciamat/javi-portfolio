import { Response } from 'express';
import { AuthRequest } from '@infrastructure/express/authMiddleware';
import { UpdateName, UpdatePassword, UpdateAvatar } from '@application/use-cases/UpdateProfile';

export class ProfileController {
    constructor(
        private readonly updateName: UpdateName,
        private readonly updatePassword: UpdatePassword,
        private readonly updateAvatar: UpdateAvatar,
    ) { }

    async patchName(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const result = await this.updateName.execute({ userId, name: req.body.name });
            res.status(200).json(result);
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error al actualizar nombre' });
        }
    }

    async patchPassword(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            await this.updatePassword.execute({
                userId,
                currentPassword: req.body.currentPassword,
                newPassword: req.body.newPassword,
            });
            res.status(200).json({ message: 'Contraseña actualizada correctamente' });
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error al actualizar contraseña' });
        }
    }

    async patchAvatar(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.userId!;
            const result = await this.updateAvatar.execute({ userId, avatarDataUrl: req.body.avatarDataUrl });
            res.status(200).json(result);
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error al actualizar avatar' });
        }
    }

    async getProfile(req: AuthRequest, res: Response): Promise<void> {
        res.status(200).json({ userId: req.userId });
    }
}
