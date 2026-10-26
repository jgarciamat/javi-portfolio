import { useCallback, useEffect, useState } from 'react';
import type { Transaction, UpdateTransactionDTO } from '@modules/finances/domain/types';
import { storage } from '@shared/utils/storage';
import { isDashboardTab, type DashboardTab } from '../../ui/navigation';
import type { ImportSource } from '../../ui/components/ImportSources';

const TAB_KEY = 'mm_last_tab';

/** The section in a link (`/?tab=renta`), if any. */
const linkedTab = (): DashboardTab | null => {
  const linked = new URLSearchParams(window.location.search).get('tab');
  return isDashboardTab(linked) ? linked : null;
};

/** A linked section wins over the remembered one. Pure: StrictMode may call it twice. */
const loadTab = (): DashboardTab => {
  const linked = linkedTab();
  if (linked) return linked;
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
  /** The tab the importer opens on (a file, pasted text or a screenshot). */
  const [importSource, setImportSource] = useState<ImportSource>('file');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editVersion, setEditVersion] = useState(0);

  // Once opened, the link's section is dropped from the address.
  useEffect(() => {
    if (linkedTab()) window.history.replaceState(null, '', window.location.pathname);
  }, []);

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
    importSource,
    /** Anything but a tab (a click event, nothing) opens it on the file. */
    openImport: (source?: unknown) => {
      setImportSource(source === 'paste' || source === 'screenshot' ? source : 'file');
      setShowImport(true);
    },
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
