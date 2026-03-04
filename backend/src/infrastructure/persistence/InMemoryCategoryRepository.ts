import { Category } from '@domain/entities/Category';
import { ICategoryRepository } from '@domain/repositories/ICategoryRepository';

const DEFAULT_CATEGORIES = [
    { name: 'Agua', color: '#38bdf8', icon: '💧' },
    { name: 'Alimentación', color: '#f97316', icon: '🍔' },
    { name: 'Transporte', color: '#3b82f6', icon: '🚗' },
    { name: 'Vivienda', color: '#8b5cf6', icon: '🏠' },
    { name: 'Salud', color: '#22c55e', icon: '💊' },
    { name: 'Gas', color: '#fb923c', icon: '🔥' },
    { name: 'Gastos casa', color: '#f43f5e', icon: '💸' },
    { name: 'Luz', color: '#facc15', icon: '💡' },
    { name: 'Niño', color: '#a78bfa', icon: '🧒' },
    { name: 'Ocio', color: '#ec4899', icon: '🎉' },
    { name: 'Ropa', color: '#f59e0b', icon: '👕' },
    { name: 'Tecnología', color: '#06b6d4', icon: '💻' },
    { name: 'Educación', color: '#84cc16', icon: '📚' },
    { name: 'Salario', color: '#10b981', icon: '💼' },
    { name: 'Freelance', color: '#6366f1', icon: '🖥️' },
    { name: 'Inversiones', color: '#eab308', icon: '📈' },
    { name: 'Otros', color: '#94a3b8', icon: '📦' },
];

export class InMemoryCategoryRepository implements ICategoryRepository {
    private categories: Map<string, Category> = new Map();

    constructor() {
        this.seedDefaults();
    }

    private seedDefaults(): void {
        DEFAULT_CATEGORIES.forEach((cat) => {
            const category = Category.create(cat);
            this.categories.set(category.id, category);
        });
    }

    async save(category: Category): Promise<void> {
        this.categories.set(category.id, category);
    }

    async findById(id: string): Promise<Category | null> {
        return this.categories.get(id) ?? null;
    }

    async findByName(name: string): Promise<Category | null> {
        return (
            Array.from(this.categories.values()).find(
                (c) => c.name.toLowerCase() === name.toLowerCase()
            ) ?? null
        );
    }

    async findAll(): Promise<Category[]> {
        return Array.from(this.categories.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    }

    async findAllByUser(_userId: string): Promise<Category[]> {
        // In-memory repo is not user-scoped; return all categories
        return this.findAll();
    }

    async delete(id: string): Promise<void> {
        this.categories.delete(id);
    }

    seedForUser(_userId: string): void {
        // In-memory repo seeds defaults in constructor; no-op per user
    }
}
