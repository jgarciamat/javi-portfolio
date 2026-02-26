import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@domain/entities/User';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { SqliteCategoryRepository } from '@infrastructure/persistence/SqliteCategoryRepository';
import { EmailService } from '@infrastructure/email/EmailService';

const JWT_SECRET = process.env.JWT_SECRET ?? 'money-manager-secret-change-in-prod';
const JWT_EXPIRES = '30d';

export interface RegisterDTO { email: string; password: string; name: string; }
export interface LoginDTO { email: string; password: string; }
export interface AuthResult { token: string; user: { id: string; email: string; name: string }; }
export interface RegisterResult { message: string; }

export class RegisterUser {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly categoryRepo: SqliteCategoryRepository,
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
    constructor(private readonly userRepo: IUserRepository) { }

    async execute(dto: LoginDTO): Promise<AuthResult> {
        const user = await this.userRepo.findByEmail(dto.email.toLowerCase());
        if (!user) throw new Error('Credenciales incorrectas');

        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid) throw new Error('Credenciales incorrectas');

        if (!user.emailVerified) {
            throw new Error('Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        return { token, user: user.toJSON() };
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

export function verifyToken(token: string): { userId: string } {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
}
