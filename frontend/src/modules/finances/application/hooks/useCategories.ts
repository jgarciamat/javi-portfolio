import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useAuth } from '@shared/hooks/useAuth';
import type { Category, CreateCategoryDTO } from '@modules/finances/domain/types';

export function useCategories() {
    const { categoryApi } = useApi();
    const { token } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAll = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        categoryApi
            .getAll()
            .then(setCategories)
            .catch(() => setCategories([]))
            .finally(() => setLoading(false));
    }, [token, categoryApi]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

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

    return { categories, loading, addCategory, removeCategory, refresh: fetchAll };
}
