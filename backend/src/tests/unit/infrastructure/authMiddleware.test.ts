import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '@infrastructure/express/authMiddleware';
import * as Auth from '@application/use-cases/Auth';

jest.mock('@application/use-cases/Auth', () => ({
    ...jest.requireActual('@application/use-cases/Auth'),
    verifyToken: jest.fn(),
}));

const verifyToken = Auth.verifyToken as jest.Mock;

function makeRes(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe('authMiddleware', () => {
    let next: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        next = jest.fn();
        verifyToken.mockReset();
    });

    it('returns 401 when no Authorization header', () => {
        const req = { headers: {} } as Request;
        const res = makeRes();
        authMiddleware(req as never, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token requerido' });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization header does not start with Bearer', () => {
        const req = { headers: { authorization: 'Basic abc123' } } as Request;
        const res = makeRes();
        authMiddleware(req as never, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token requerido' });
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next and sets userId when token is valid', () => {
        verifyToken.mockReturnValue({ userId: 'user-123' });
        const req = { headers: { authorization: 'Bearer valid.jwt.token' } } as Request;
        const res = makeRes();
        authMiddleware(req as never, res as Response, next);
        expect(verifyToken).toHaveBeenCalledWith('valid.jwt.token');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((req as any).userId).toBe('user-123');
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 401 when token is invalid', () => {
        verifyToken.mockImplementation(() => { throw new Error('jwt expired'); });
        const req = { headers: { authorization: 'Bearer bad.token' } } as Request;
        const res = makeRes();
        authMiddleware(req as never, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
        expect(next).not.toHaveBeenCalled();
    });
});
