import { useCallback, useState } from 'react';
import type { Transaction, UpdateTransactionDTO } from '@modules/finances/domain/types';
import { storage } from '@shared/utils/storage';
import { isDashboardTab, type DashboardTab } from '../../ui/navigation';

const TAB_KEY = 'mm_last_tab';

const loadTab = (): DashboardTab => {
  const stored = storage.get(TAB_KEY);
  return isDashboardTab(stored) ? stored : 'monthly';
};

interface Options {
  navigateTo: (year: number, month: number) => void;
  updateTransaction: (id: string, dto: UpdateTransactionDTO) => Promise<void>;
}

/** Which section, menu and dialogs of the dashboard are open. */
export function useDashboard({ navigateTo, updateTransaction }: Options) {
  const [tab, setTabState] = useState<DashboardTab>(loadTab);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editVersion, setEditVersion] = useState(0);

  /** The last section is remembered on this device. */
  const setTab = useCallback((next: DashboardTab) => {
    setTabState(next);
    storage.set(TAB_KEY, next);
  }, []);

  const handleSaveEdit = async (id: string, dto: UpdateTransactionDTO) => {
    await updateTransaction(id, dto);
    setEditingTransaction(null);
    setEditVersion((v) => v + 1);
  };

  const handleMonthClick = (year: number, month: number) => {
    navigateTo(year, month);
    setTab('monthly');
  };

  return {
    tab,
    setTab,
    menuOpen,
    setMenuOpen,
    showCategoryModal,
    openCategoryModal: () => setShowCategoryModal(true),
    closeCategoryModal: () => setShowCategoryModal(false),
    showProfile,
    openProfile: () => setShowProfile(true),
    closeProfile: () => setShowProfile(false),
    showImport,
    openImport: () => setShowImport(true),
    closeImport: () => setShowImport(false),
    editingTransaction,
    setEditingTransaction,
    /** Incremented after an edit so lists outside the month view can reload. */
    editVersion,
    handleSaveEdit,
    handleMonthClick,
  };
}

export type UseDashboardReturn = ReturnType<typeof useDashboard>;
