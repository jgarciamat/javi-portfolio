import { useState } from 'react';
import type { Transaction, UpdateTransactionDTO } from '@modules/finances/domain/types';

export type DashboardTab = 'monthly' | 'annual' | 'automations' | 'custom-alerts';

interface UseDashboardOptions {
    year: number;
    month: number;
    navigateTo: (year: number, month: number) => void;
    updateTransaction: (id: string, dto: UpdateTransactionDTO) => Promise<void>;
}

export interface UseDashboardReturn {
    tab: DashboardTab;
    setTab: (tab: DashboardTab) => void;
    showCategoryModal: boolean;
    openCategoryModal: () => void;
    closeCategoryModal: () => void;
    showProfile: boolean;
    openProfile: () => void;
    closeProfile: () => void;
    editingTransaction: Transaction | null;
    setEditingTransaction: (tx: Transaction | null) => void;
    isCurrentMonth: boolean;
    handleSaveEdit: (id: string, dto: UpdateTransactionDTO) => Promise<void>;
    handleMonthClick: (y: number, m: number) => void;
}

export function useDashboard({
    year,
    month,
    navigateTo,
    updateTransaction,
}: UseDashboardOptions): UseDashboardReturn {
    const now = new Date();

    const [tab, setTab] = useState<DashboardTab>('monthly');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

    const handleSaveEdit = async (id: string, dto: UpdateTransactionDTO) => {
        await updateTransaction(id, dto);
        setEditingTransaction(null);
    };

    const handleMonthClick = (y: number, m: number) => {
        navigateTo(y, m);
        setTab('monthly');
    };

    return {
        tab,
        setTab,
        showCategoryModal,
        openCategoryModal: () => setShowCategoryModal(true),
        closeCategoryModal: () => setShowCategoryModal(false),
        showProfile,
        openProfile: () => setShowProfile(true),
        closeProfile: () => setShowProfile(false),
        editingTransaction,
        setEditingTransaction,
        isCurrentMonth,
        handleSaveEdit,
        handleMonthClick,
    };
}
