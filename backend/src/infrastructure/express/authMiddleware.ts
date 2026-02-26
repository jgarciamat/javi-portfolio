import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@application/use-cases/Auth';

export interface AuthRequest extends Request {
    userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token requerido' });
        return;
    }
    try {
        const token = header.slice(7);
        const payload = verifyToken(token);
        req.userId = payload.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
}
