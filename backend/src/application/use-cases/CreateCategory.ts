import { Category } from '@domain/entities/Category';
import { ICategoryRepository } from '@domain/repositories/ICategoryRepository';

export interface CreateCategoryDTO {
    name: string;
    color?: string;
    icon?: string;
}

export class CreateCategory {
    constructor(private readonly categoryRepository: ICategoryRepository) { }

    async execute(dto: CreateCategoryDTO): Promise<Category> {
        const existing = await this.categoryRepository.findByName(dto.name);
        if (existing) {
            throw new Error(`Category '${dto.name}' already exists`);
        }
        const category = Category.create(dto);
        await this.categoryRepository.save(category);
        return category;
    }
}
