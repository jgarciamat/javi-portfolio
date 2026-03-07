import { Response } from 'express';
import { ProfileController } from '@infrastructure/controllers/ProfileController';
import { UpdateName, UpdatePassword, UpdateAvatar } from '@application/use-cases/UpdateProfile';
import { AuthRequest } from '@infrastructure/express/authMiddleware';

function makeRes(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function makeReq(body: Record<string, unknown> = {}, userId = 'user-1'): AuthRequest {
    return { body, userId } as unknown as AuthRequest;
}

describe('ProfileController', () => {
    let updateName: jest.Mocked<UpdateName>;
    let updatePassword: jest.Mocked<UpdatePassword>;
    let updateAvatar: jest.Mocked<UpdateAvatar>;
    let controller: ProfileController;

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateName = { execute: jest.fn() } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updatePassword = { execute: jest.fn() } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateAvatar = { execute: jest.fn() } as any;
        controller = new ProfileController(updateName, updatePassword, updateAvatar);
    });

    describe('patchName', () => {
        it('returns 200 with updated profile', async () => {
            updateName.execute.mockResolvedValue({ name: 'New Name' });
            const res = makeRes();
            await controller.patchName(makeReq({ name: 'New Name' }), res as Response);
            expect(updateName.execute).toHaveBeenCalledWith({ userId: 'user-1', name: 'New Name' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ name: 'New Name' });
        });

        it('returns 400 on error', async () => {
            updateName.execute.mockRejectedValue(new Error('Name too short'));
            const res = makeRes();
            await controller.patchName(makeReq({ name: '' }), res as Response);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Name too short' });
        });
    });

    describe('patchPassword', () => {
        it('returns 200 with success message', async () => {
            updatePassword.execute.mockResolvedValue(undefined);
            const res = makeRes();
            await controller.patchPassword(
                makeReq({ currentPassword: 'old123', newPassword: 'new456' }),
                res as Response
            );
            expect(updatePassword.execute).toHaveBeenCalledWith({
                userId: 'user-1',
                currentPassword: 'old123',
                newPassword: 'new456',
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Contraseña actualizada correctamente' });
        });

        it('returns 400 on error', async () => {
            updatePassword.execute.mockRejectedValue(new Error('Wrong current password'));
            const res = makeRes();
            await controller.patchPassword(makeReq({ currentPassword: 'bad', newPassword: 'x' }), res as Response);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Wrong current password' });
        });
    });

    describe('patchAvatar', () => {
        it('returns 200 with updated avatar result', async () => {
            updateAvatar.execute.mockResolvedValue({ avatarUrl: 'data:image/png;base64,...' });
            const res = makeRes();
            await controller.patchAvatar(makeReq({ avatarDataUrl: 'data:image/png;base64,...' }), res as Response);
            expect(updateAvatar.execute).toHaveBeenCalledWith({ userId: 'user-1', avatarDataUrl: 'data:image/png;base64,...' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ avatarUrl: 'data:image/png;base64,...' });
        });

        it('returns 400 on error', async () => {
            updateAvatar.execute.mockRejectedValue(new Error('Invalid image'));
            const res = makeRes();
            await controller.patchAvatar(makeReq({ avatarDataUrl: 'bad' }), res as Response);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid image' });
        });
    });

    describe('getProfile', () => {
        it('returns 200 with userId', async () => {
            const res = makeRes();
            await controller.getProfile(makeReq({}, 'user-42'), res as Response);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ userId: 'user-42' });
        });
    });
});
