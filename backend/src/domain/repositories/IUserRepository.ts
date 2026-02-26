import { User } from '@domain/entities/User';

export interface IUserRepository {
    save(user: User): Promise<void>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByVerificationToken(token: string): Promise<User | null>;
}
