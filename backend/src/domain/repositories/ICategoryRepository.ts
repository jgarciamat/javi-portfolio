import { Category } from '@domain/entities/Category';

export interface ICategoryRepository {
    save(category: Category, userId?: string): Promise<void>;
    findById(id: string): Promise<Category | null>;
    findByName(name: string): Promise<Category | null>;
    findAll(): Promise<Category[]>;
    findAllByUser(userId: string): Promise<Category[]>;
    delete(id: string): Promise<void>;
    seedForUser(userId: string): void;
}
