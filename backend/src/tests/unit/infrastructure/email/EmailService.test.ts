/**
 * Unit tests for EmailService.
 * We mock the Resend SDK so no real HTTP calls are made.
 */

// Mock the Resend module before importing EmailService
const mockSend = jest.fn();
jest.mock('resend', () => ({
    Resend: jest.fn().mockImplementation(() => ({
        emails: { send: mockSend },
    })),
}));

import { EmailService } from '@infrastructure/email/EmailService';

describe('EmailService', () => {
    let service: EmailService;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.RESEND_API_KEY = 'test-key';
        process.env.RESEND_FROM_EMAIL = 'noreply@test.com';
        process.env.SMTP_FROM_NAME = 'Test App';
        process.env.APP_URL = 'https://test.app';
        service = new EmailService();
    });

    // ── sendVerificationEmail ────────────────────────────────────────────────

    describe('sendVerificationEmail', () => {
        it('sends a verification email with the correct fields', async () => {
            mockSend.mockResolvedValueOnce({ data: { id: 'msg-1' }, error: null });

            await service.sendVerificationEmail('user@example.com', 'Alice', 'verify-token-abc');

            expect(mockSend).toHaveBeenCalledTimes(1);
            const [payload] = mockSend.mock.calls[0];
            expect(payload.to).toBe('user@example.com');
            expect(payload.subject).toContain('Verifica');
            expect(payload.html).toContain('https://test.app/verify-email?token=verify-token-abc');
            expect(payload.html).toContain('Alice');
            expect(payload.text).toContain('verify-token-abc');
        });

        it('throws when Resend returns an error', async () => {
            mockSend.mockResolvedValueOnce({ data: null, error: { message: 'Resend API error' } });

            await expect(service.sendVerificationEmail('u@e.com', 'Bob', 'tok'))
                .rejects.toThrow('Error al enviar email: Resend API error');
        });

        it('uses default values when env vars are not set', async () => {
            delete process.env.RESEND_API_KEY;
            delete process.env.RESEND_FROM_EMAIL;
            delete process.env.SMTP_FROM_NAME;
            delete process.env.APP_URL;
            mockSend.mockResolvedValueOnce({ data: {}, error: null });
            const defaultService = new EmailService();

            await defaultService.sendVerificationEmail('u@e.com', 'Carol', 'tok');
            const [payload] = mockSend.mock.calls[0];
            expect(payload.html).toContain('localhost:5173/verify-email?token=tok');
        });
    });

    // ── sendPasswordResetEmail ───────────────────────────────────────────────

    describe('sendPasswordResetEmail', () => {
        it('sends a reset email with the correct fields', async () => {
            mockSend.mockResolvedValueOnce({ data: { id: 'msg-2' }, error: null });

            await service.sendPasswordResetEmail('user@example.com', 'Alice', 'reset-token-xyz');

            expect(mockSend).toHaveBeenCalledTimes(1);
            const [payload] = mockSend.mock.calls[0];
            expect(payload.to).toBe('user@example.com');
            expect(payload.subject).toContain('Restablece');
            expect(payload.html).toContain('https://test.app/reset-password?token=reset-token-xyz');
            expect(payload.html).toContain('Alice');
            expect(payload.text).toContain('reset-token-xyz');
            expect(payload.text).toContain('1 hora');
        });

        it('builds reset URL with APP_URL env variable', async () => {
            mockSend.mockResolvedValueOnce({ data: {}, error: null });

            await service.sendPasswordResetEmail('u@e.com', 'Bob', 'tok-reset');
            const [payload] = mockSend.mock.calls[0];
            expect(payload.html).toContain('https://test.app/reset-password?token=tok-reset');
        });

        it('throws when Resend returns an error', async () => {
            mockSend.mockResolvedValueOnce({ data: null, error: { message: 'SMTP failure' } });

            await expect(service.sendPasswordResetEmail('u@e.com', 'Eve', 'tok'))
                .rejects.toThrow('Error al enviar email: SMTP failure');
        });

        it('uses default APP_URL when env var is not set', async () => {
            delete process.env.APP_URL;
            mockSend.mockResolvedValueOnce({ data: {}, error: null });
            const defaultService = new EmailService();

            await defaultService.sendPasswordResetEmail('u@e.com', 'Frank', 'tok-default');
            const [payload] = mockSend.mock.calls[0];
            expect(payload.html).toContain('localhost:5173/reset-password?token=tok-default');
        });

        it('sends from the configured address', async () => {
            mockSend.mockResolvedValueOnce({ data: {}, error: null });

            await service.sendPasswordResetEmail('u@e.com', 'Grace', 'tok-from');
            const [payload] = mockSend.mock.calls[0];
            expect(payload.from).toContain('noreply@test.com');
            expect(payload.from).toContain('Test App');
        });
    });
});
