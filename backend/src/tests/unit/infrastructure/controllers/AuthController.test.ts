import { Request, Response } from 'express';
import { AuthController } from '@infrastructure/controllers/AuthController';
import { RegisterUser, LoginUser, VerifyEmail } from '@application/use-cases/Auth';

function makeRes(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function makeReq(body: Record<string, unknown> = {}, query: Record<string, unknown> = {}): Partial<Request> {
    return { body, query } as Partial<Request>;
}

describe('AuthController', () => {
    let registerUseCase: jest.Mocked<RegisterUser>;
    let loginUseCase: jest.Mocked<LoginUser>;
    let verifyUseCase: jest.Mocked<VerifyEmail>;
    let controller: AuthController;

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        registerUseCase = { execute: jest.fn() } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        loginUseCase = { execute: jest.fn() } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        verifyUseCase = { execute: jest.fn() } as any;
        controller = new AuthController(registerUseCase, loginUseCase, verifyUseCase);
    });

    describe('register', () => {
        it('should return 201 on successful registration', async () => {
            registerUseCase.execute.mockResolvedValue({ message: 'Registro exitoso.' });
            const req = makeReq({ email: 'a@b.com', password: 'pass', name: 'Alice' });
            const res = makeRes();

            await controller.register(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: 'Registro exitoso.' });
        });

        it('should return 400 when use case throws', async () => {
            registerUseCase.execute.mockRejectedValue(new Error('El email ya está registrado'));
            const res = makeRes();

            await controller.register(makeReq() as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'El email ya está registrado' });
        });
    });

    describe('login', () => {
        it('should return 200 with token on success', async () => {
            const payload = { token: 'jwt-token', user: { id: '1', email: 'a@b.com', name: 'Alice' } };
            loginUseCase.execute.mockResolvedValue(payload);
            const res = makeRes();

            await controller.login(makeReq({ email: 'a@b.com', password: 'pass' }) as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(payload);
        });

        it('should return 401 when credentials are wrong', async () => {
            loginUseCase.execute.mockRejectedValue(new Error('Credenciales incorrectas'));
            const res = makeRes();

            await controller.login(makeReq() as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Credenciales incorrectas' });
        });
    });

    describe('verify', () => {
        it('should return 200 with message on valid token', async () => {
            verifyUseCase.execute.mockResolvedValue(undefined);
            const req = makeReq({}, { token: 'valid-token' });
            const res = makeRes();

            await controller.verify(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Email verificado correctamente. Ya puedes iniciar sesión.' });
        });

        it('should return 400 when no token provided', async () => {
            const res = makeRes();

            await controller.verify(makeReq() as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token de verificación requerido' });
        });

        it('should return 400 when token is invalid', async () => {
            verifyUseCase.execute.mockRejectedValue(new Error('El enlace de verificación no es válido o ya fue usado.'));
            const req = makeReq({}, { token: 'bad-token' });
            const res = makeRes();

            await controller.verify(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'El enlace de verificación no es válido o ya fue usado.' });
        });
    });
});
