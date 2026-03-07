import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import type { Category, CreateCategoryDTO } from '@modules/finances/domain/types';

interface CategoryApi {
    getAll: () => Promise<Category[]>;
    create: (dto: CreateCategoryDTO) => Promise<Category>;
    delete: (id: string) => Promise<void>;
}

export function useCategoryActions(categoryApi: CategoryApi) {
    const { token } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);

    const fetchCategories = useCallback(async () => {
        if (!token) return;
        categoryApi
            .getAll()
            .then((cats) => setCategories([...cats].sort((a, b) => a.name.localeCompare(b.name))))
            .catch(() => setCategories([]));
    }, [token, categoryApi]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const addCategory = useCallback(
        async (dto: CreateCategoryDTO) => {
            const cat = await categoryApi.create(dto);
            setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
            return cat;
        },
        [categoryApi]
    );

    const removeCategory = useCallback(
        async (id: string) => {
            await categoryApi.delete(id);
            setCategories((prev) => prev.filter((c) => c.id !== id));
        },
        [categoryApi]
    );

    return { categories, addCategory, removeCategory };
}
