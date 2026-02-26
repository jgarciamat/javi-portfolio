import bcrypt from 'bcryptjs';
import { IUserRepository } from '@domain/repositories/IUserRepository';

export interface UpdateNameDTO {
    userId: string;
    name: string;
}

export interface UpdatePasswordDTO {
    userId: string;
    currentPassword: string;
    newPassword: string;
}

export interface UpdateAvatarDTO {
    userId: string;
    /** Base64-encoded data URL (e.g. "data:image/png;base64,…") */
    avatarDataUrl: string;
}

export class UpdateName {
    constructor(private readonly userRepo: IUserRepository) { }

    async execute({ userId, name }: UpdateNameDTO): Promise<{ name: string }> {
        const user = await this.userRepo.findById(userId);
        if (!user) throw new Error('Usuario no encontrado');

        const trimmed = name.trim();
        if (!trimmed) throw new Error('El nombre no puede estar vacío');

        const updated = user.withName(trimmed);
        await this.userRepo.save(updated);
        return { name: trimmed };
    }
}

export class UpdatePassword {
    constructor(private readonly userRepo: IUserRepository) { }

    async execute({ userId, currentPassword, newPassword }: UpdatePasswordDTO): Promise<void> {
        const user = await this.userRepo.findById(userId);
        if (!user) throw new Error('Usuario no encontrado');

        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) throw new Error('La contraseña actual es incorrecta');

        if (newPassword.length < 8) throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
        if (!/[A-Z]/.test(newPassword)) throw new Error('Debe contener al menos una mayúscula');
        if (!/[0-9]/.test(newPassword)) throw new Error('Debe contener al menos un número');
        if (!/[^A-Za-z0-9]/.test(newPassword)) throw new Error('Debe contener al menos un símbolo');

        const newHash = await bcrypt.hash(newPassword, 10);
        const updated = user.withPasswordHash(newHash);
        await this.userRepo.save(updated);
    }
}

export class UpdateAvatar {
    constructor(private readonly userRepo: IUserRepository) { }

    async execute({ userId, avatarDataUrl }: UpdateAvatarDTO): Promise<{ avatarUrl: string }> {
        const user = await this.userRepo.findById(userId);
        if (!user) throw new Error('Usuario no encontrado');

        if (!avatarDataUrl.startsWith('data:image/')) {
            throw new Error('Formato de imagen no válido');
        }
        // Limit size to ~200 KB (base64 ratio ~1.33)
        if (avatarDataUrl.length > 270_000) {
            throw new Error('La imagen es demasiado grande (máx. 200 KB)');
        }

        const updated = user.withAvatar(avatarDataUrl);
        await this.userRepo.save(updated);
        return { avatarUrl: avatarDataUrl };
    }
}
