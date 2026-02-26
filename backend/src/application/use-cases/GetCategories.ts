import { Category } from '@domain/entities/Category';
import { ICategoryRepository } from '@domain/repositories/ICategoryRepository';

export class GetCategories {
    constructor(private readonly categoryRepository: ICategoryRepository) { }

    async execute(): Promise<Category[]> {
        return this.categoryRepository.findAll();
    }
}
