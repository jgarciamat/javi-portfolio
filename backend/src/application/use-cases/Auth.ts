import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@domain/entities/User';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { ICategoryRepository } from '@domain/repositories/ICategoryRepository';
import { IRefreshTokenRepository } from '@domain/repositories/IRefreshTokenRepository';
import { EmailService } from '@infrastructure/email/EmailService';

const JWT_SECRET = process.env.JWT_SECRET ?? 'money-manager-secret-change-in-prod';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'money-manager-refresh-secret-change-in-prod';
const JWT_ACCESS_EXPIRES = '15m';
const JWT_REFRESH_EXPIRES = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export interface RegisterDTO { email: string; password: string; name: string; }
export interface LoginDTO { email: string; password: string; }
export interface AuthResult { accessToken: string; refreshToken: string; user: { id: string; email: string; name: string }; }
export interface RegisterResult { message: string; }
export interface RefreshResult { accessToken: string; }

export class RegisterUser {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly categoryRepo: ICategoryRepository,
        private readonly emailService: EmailService,
    ) { }

    async execute(dto: RegisterDTO): Promise<RegisterResult> {
        const existing = await this.userRepo.findByEmail(dto.email.toLowerCase());
        if (existing) throw new Error('El email ya está registrado');

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const verificationToken = uuidv4();

        const user = User.create({
            id: uuidv4(),
            email: dto.email.toLowerCase().trim(),
            name: dto.name.trim(),
            passwordHash,
            createdAt: new Date(),
            emailVerified: false,
            verificationToken,
        });
        await this.userRepo.save(user);
        // Seed default categories for the new user
        this.categoryRepo.seedForUser(user.id);

        // Send verification email (non-blocking — don't fail registration if email fails)
        this.emailService.sendVerificationEmail(user.email, user.name, verificationToken)
            .catch((err) => console.error('Email send error:', err));

        return { message: 'Registro exitoso. Revisa tu email para verificar tu cuenta.' };
    }
}

export class LoginUser {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly refreshTokenRepo: IRefreshTokenRepository,
    ) { }

    async execute(dto: LoginDTO): Promise<AuthResult> {
        const user = await this.userRepo.findByEmail(dto.email.toLowerCase());
        if (!user) throw new Error('Credenciales incorrectas');

        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid) throw new Error('Credenciales incorrectas');

        if (!user.emailVerified) {
            throw new Error('Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
        }

        const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES });
        const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });

        // Persist refresh token
        await this.refreshTokenRepo.save({
            id: uuidv4(),
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
            createdAt: new Date(),
        });

        return { accessToken, refreshToken, user: user.toJSON() };
    }
}

export class LogoutUser {
    constructor(private readonly refreshTokenRepo: IRefreshTokenRepository) { }

    async execute(refreshToken: string): Promise<void> {
        await this.refreshTokenRepo.deleteByToken(refreshToken);
    }
}

export class RefreshAccessToken {
    constructor(private readonly refreshTokenRepo: IRefreshTokenRepository) { }

    async execute(refreshToken: string): Promise<RefreshResult> {
        // Verify signature & expiry
        let payload: { userId: string };
        try {
            payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
        } catch {
            throw new Error('Refresh token inválido o expirado');
        }

        // Verify it's still in DB (not revoked)
        const record = await this.refreshTokenRepo.findByToken(refreshToken);
        if (!record) throw new Error('Refresh token revocado');

        // Check DB-level expiry
        if (record.expiresAt < new Date()) {
            await this.refreshTokenRepo.deleteByToken(refreshToken);
            throw new Error('Refresh token expirado');
        }

        const accessToken = jwt.sign({ userId: payload.userId }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES });
        return { accessToken };
    }
}

export class VerifyEmail {
    constructor(private readonly userRepo: IUserRepository) { }

    async execute(token: string): Promise<void> {
        const user = await this.userRepo.findByVerificationToken(token);
        if (!user) throw new Error('El enlace de verificación no es válido o ya fue usado.');

        const verified = user.verify();
        await this.userRepo.save(verified);
    }
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export class RequestPasswordReset {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly emailService: EmailService,
    ) { }

    async execute(dto: { email: string }): Promise<void> {
        const user = await this.userRepo.findByEmail(dto.email.toLowerCase());
        if (!user) {
            const err = Object.assign(new Error('El email no está registrado.'), { code: 'EMAIL_NOT_FOUND' as const });
            throw err;
        }

        if (user.resetEmailSent) {
            const err = Object.assign(new Error('Ya se ha enviado un enlace de recuperación a este email. Cambia tu contraseña o espera a que expire.'), { code: 'RESET_EMAIL_ALREADY_SENT' as const });
            throw err;
        }

        const token = uuidv4();
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
        const updated = user.withResetToken(token, expiresAt).withResetEmailSent(true);
        await this.userRepo.save(updated);

        this.emailService.sendPasswordResetEmail(user.email, user.name, token)
            .catch((err) => console.error('Reset email error:', err));
    }
}

export class ResetPassword {
    constructor(private readonly userRepo: IUserRepository) { }

    async execute(dto: { token: string; newPassword: string }): Promise<void> {
        const user = await this.userRepo.findByResetToken(dto.token);
        if (!user || !user.resetTokenExpiresAt) throw new Error('El enlace no es válido o ya fue usado.');
        if (user.resetTokenExpiresAt < new Date()) throw new Error('El enlace ha expirado. Solicita uno nuevo.');

        const passwordHash = await bcrypt.hash(dto.newPassword, 10);
        const updated = user.withPasswordHash(passwordHash).withResetToken(null, null).withResetEmailSent(false);
        await this.userRepo.save(updated);
    }
}

export function verifyToken(token: string): { userId: string } {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
}
