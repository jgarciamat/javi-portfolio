import { Category } from '@domain/entities/Category';

export interface ICategoryRepository {
    save(category: Category): Promise<void>;
    findById(id: string): Promise<Category | null>;
    findByName(name: string): Promise<Category | null>;
    findAll(): Promise<Category[]>;
    delete(id: string): Promise<void>;
}
