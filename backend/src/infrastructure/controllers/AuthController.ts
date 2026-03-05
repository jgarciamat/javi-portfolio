import { Request, Response } from 'express';
import { RegisterUser, LoginUser, VerifyEmail, LogoutUser, RefreshAccessToken, RequestPasswordReset, ResetPassword } from '@application/use-cases/Auth';

export class AuthController {
    constructor(
        private readonly registerUser: RegisterUser,
        private readonly loginUser: LoginUser,
        private readonly verifyEmail: VerifyEmail,
        private readonly logoutUser: LogoutUser,
        private readonly refreshAccessToken: RefreshAccessToken,
        private readonly requestPasswordResetUC: RequestPasswordReset,
        private readonly resetPasswordUC: ResetPassword,
    ) { }

    async register(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.registerUser.execute(req.body);
            res.status(201).json(result);
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error al registrar' });
        }
    }

    async login(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.loginUser.execute(req.body);
            res.status(200).json(result);
        } catch (e) {
            res.status(401).json({ error: e instanceof Error ? e.message : 'Error al iniciar sesión' });
        }
    }

    async logout(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body as { refreshToken?: string };
            if (refreshToken) {
                await this.logoutUser.execute(refreshToken);
            }
            res.status(204).end();
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error al cerrar sesión' });
        }
    }

    async refresh(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body as { refreshToken?: string };
            if (!refreshToken) {
                res.status(400).json({ error: 'refreshToken requerido' });
                return;
            }
            const result = await this.refreshAccessToken.execute(refreshToken);
            res.status(200).json(result);
        } catch (e) {
            res.status(401).json({ error: e instanceof Error ? e.message : 'Error al refrescar sesión' });
        }
    }

    async verify(req: Request, res: Response): Promise<void> {
        try {
            const token = (req.query.token ?? req.body?.token) as string | undefined;
            if (!token) {
                res.status(400).json({ error: 'Token de verificación requerido' });
                return;
            }
            await this.verifyEmail.execute(token);
            res.status(200).json({ message: 'Email verificado correctamente. Ya puedes iniciar sesión.' });
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error al verificar email' });
        }
    }

    async requestPasswordReset(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body as { email?: string };
            if (!email) {
                res.status(400).json({ error: 'Email requerido' });
                return;
            }
            await this.requestPasswordResetUC.execute({ email });
            res.status(200).json({ message: 'Enlace de recuperación enviado.' });
        } catch (e) {
            if (e instanceof Error) {
                const code = (e as Error & { code?: string }).code;
                if (code === 'EMAIL_NOT_FOUND') {
                    res.status(404).json({ error: e.message, code });
                    return;
                }
                if (code === 'RESET_EMAIL_ALREADY_SENT') {
                    res.status(409).json({ error: e.message, code });
                    return;
                }
                res.status(400).json({ error: e.message });
            } else {
                res.status(400).json({ error: 'Error al procesar la solicitud' });
            }
        }
    }

    async resetPassword(req: Request, res: Response): Promise<void> {
        try {
            const { token, newPassword } = req.body as { token?: string; newPassword?: string };
            if (!token || !newPassword) {
                res.status(400).json({ error: 'Token y nueva contraseña requeridos' });
                return;
            }
            await this.resetPasswordUC.execute({ token, newPassword });
            res.status(200).json({ message: 'Contraseña restablecida correctamente.' });
        } catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : 'Error al restablecer contraseña' });
        }
    }
}
