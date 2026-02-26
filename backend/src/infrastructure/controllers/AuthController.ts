import { Request, Response } from 'express';
import { RegisterUser, LoginUser, VerifyEmail } from '@application/use-cases/Auth';

export class AuthController {
    constructor(
        private readonly registerUser: RegisterUser,
        private readonly loginUser: LoginUser,
        private readonly verifyEmail: VerifyEmail,
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
}
