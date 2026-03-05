import { Request, Response } from 'express';
import { AuthController } from '@infrastructure/controllers/AuthController';
import { RegisterUser, LoginUser, VerifyEmail, LogoutUser, RefreshAccessToken, RequestPasswordReset, ResetPassword } from '@application/use-cases/Auth';

function makeRes(): Partial<Response> & { end: jest.Mock } {
    const res: Partial<Response> & { end: jest.Mock } = { end: jest.fn() };
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
    let logoutUseCase: jest.Mocked<LogoutUser>;
    let refreshUseCase: jest.Mocked<RefreshAccessToken>;
    let requestPasswordResetUseCase: jest.Mocked<RequestPasswordReset>;
    let resetPasswordUseCase: jest.Mocked<ResetPassword>;
    let controller: AuthController;

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        registerUseCase = { execute: jest.fn() } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        loginUseCase = { execute: jest.fn() } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        verifyUseCase = { execute: jest.fn() } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logoutUseCase = { execute: jest.fn() } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        refreshUseCase = { execute: jest.fn() } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requestPasswordResetUseCase = { execute: jest.fn() } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resetPasswordUseCase = { execute: jest.fn() } as any;
        controller = new AuthController(registerUseCase, loginUseCase, verifyUseCase, logoutUseCase, refreshUseCase, requestPasswordResetUseCase, resetPasswordUseCase);
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
        it('should return 200 with accessToken and refreshToken on success', async () => {
            const payload = {
                accessToken: 'jwt-access',
                refreshToken: 'jwt-refresh',
                user: { id: '1', email: 'a@b.com', name: 'Alice' },
            };
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

    describe('logout', () => {
        it('should return 204 on successful logout', async () => {
            logoutUseCase.execute.mockResolvedValue(undefined);
            const req = makeReq({ refreshToken: 'my-refresh' });
            const res = makeRes();

            await controller.logout(req as Request, res as Response);

            expect(logoutUseCase.execute).toHaveBeenCalledWith('my-refresh');
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.end).toHaveBeenCalled();
        });

        it('should return 204 even when no refreshToken in body', async () => {
            const res = makeRes();
            await controller.logout(makeReq({}) as Request, res as Response);
            expect(logoutUseCase.execute).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(204);
        });

        it('should return 400 on error', async () => {
            logoutUseCase.execute.mockRejectedValue(new Error('Something went wrong'));
            const req = makeReq({ refreshToken: 'bad' });
            const res = makeRes();

            await controller.logout(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong' });
        });
    });

    describe('refresh', () => {
        it('should return 200 with new accessToken', async () => {
            refreshUseCase.execute.mockResolvedValue({ accessToken: 'new-access' });
            const req = makeReq({ refreshToken: 'valid-refresh' });
            const res = makeRes();

            await controller.refresh(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ accessToken: 'new-access' });
        });

        it('should return 400 when no refreshToken provided', async () => {
            const res = makeRes();
            await controller.refresh(makeReq({}) as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'refreshToken requerido' });
        });

        it('should return 401 when refresh token is invalid', async () => {
            refreshUseCase.execute.mockRejectedValue(new Error('Refresh token inválido o expirado'));
            const req = makeReq({ refreshToken: 'expired' });
            const res = makeRes();

            await controller.refresh(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Refresh token inválido o expirado' });
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

    describe('requestPasswordReset', () => {
        it('should return 200 with message on success', async () => {
            requestPasswordResetUseCase.execute.mockResolvedValue(undefined);
            const req = makeReq({ email: 'user@example.com' });
            const res = makeRes();

            await controller.requestPasswordReset(req as Request, res as Response);

            expect(requestPasswordResetUseCase.execute).toHaveBeenCalledWith({ email: 'user@example.com' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        it('should return 400 when email is missing from body', async () => {
            const res = makeRes();

            await controller.requestPasswordReset(makeReq({}) as Request, res as Response);

            expect(requestPasswordResetUseCase.execute).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Email requerido' });
        });

        it('should return 404 when use case throws EMAIL_NOT_FOUND', async () => {
            const err = Object.assign(new Error('El email no está registrado.'), { code: 'EMAIL_NOT_FOUND' });
            requestPasswordResetUseCase.execute.mockRejectedValue(err);
            const req = makeReq({ email: 'nobody@example.com' });
            const res = makeRes();

            await controller.requestPasswordReset(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'El email no está registrado.', code: 'EMAIL_NOT_FOUND' });
        });

        it('should return 409 when use case throws RESET_EMAIL_ALREADY_SENT', async () => {
            const err = Object.assign(new Error('Ya se ha enviado un enlace.'), { code: 'RESET_EMAIL_ALREADY_SENT' });
            requestPasswordResetUseCase.execute.mockRejectedValue(err);
            const req = makeReq({ email: 'u@e.com' });
            const res = makeRes();

            await controller.requestPasswordReset(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({ error: 'Ya se ha enviado un enlace.', code: 'RESET_EMAIL_ALREADY_SENT' });
        });

        it('should return 400 when use case throws a generic error', async () => {
            requestPasswordResetUseCase.execute.mockRejectedValue(new Error('Unexpected error'));
            const req = makeReq({ email: 'u@e.com' });
            const res = makeRes();

            await controller.requestPasswordReset(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Unexpected error' });
        });

        it('should return 400 with generic message when non-Error is thrown', async () => {
            requestPasswordResetUseCase.execute.mockRejectedValue('boom');
            const req = makeReq({ email: 'u@e.com' });
            const res = makeRes();

            await controller.requestPasswordReset(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Error al procesar la solicitud' });
        });
    });

    describe('resetPassword', () => {
        it('should return 200 with success message on valid token + password', async () => {
            resetPasswordUseCase.execute.mockResolvedValue(undefined);
            const req = makeReq({ token: 'valid-token', newPassword: 'newpass123' });
            const res = makeRes();

            await controller.resetPassword(req as Request, res as Response);

            expect(resetPasswordUseCase.execute).toHaveBeenCalledWith({ token: 'valid-token', newPassword: 'newpass123' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        it('should return 400 when token is missing', async () => {
            const req = makeReq({ newPassword: 'newpass123' });
            const res = makeRes();

            await controller.resetPassword(req as Request, res as Response);

            expect(resetPasswordUseCase.execute).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token y nueva contraseña requeridos' });
        });

        it('should return 400 when newPassword is missing', async () => {
            const req = makeReq({ token: 'some-token' });
            const res = makeRes();

            await controller.resetPassword(req as Request, res as Response);

            expect(resetPasswordUseCase.execute).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token y nueva contraseña requeridos' });
        });

        it('should return 400 when use case throws (invalid/expired token)', async () => {
            resetPasswordUseCase.execute.mockRejectedValue(new Error('El enlace ha expirado. Solicita uno nuevo.'));
            const req = makeReq({ token: 'expired-token', newPassword: 'newpass123' });
            const res = makeRes();

            await controller.resetPassword(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'El enlace ha expirado. Solicita uno nuevo.' });
        });

        it('should return 400 with generic message when non-Error is thrown', async () => {
            resetPasswordUseCase.execute.mockRejectedValue('boom');
            const req = makeReq({ token: 't', newPassword: 'p' });
            const res = makeRes();

            await controller.resetPassword(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Error al restablecer contraseña' });
        });
    });
});
