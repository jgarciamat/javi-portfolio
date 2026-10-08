import { useEffect, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import type {
  Account,
  Category,
  Transaction,
  TransactionSearchFilters,
  TransactionSearchResult,
  TransactionSort,
  TransactionType,
} from '@modules/finances/domain/types';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import { useFinances } from '../../application/FinancesContext';
import { SignedAmount } from '../components/TransactionBits';
import '../css/Sections.css';

const PAGE = 50;

interface SearchViewProps {
  onEdit: (tx: Transaction) => void;
  /** Bumped by the parent after an edit so results are reloaded. */
  refreshKey?: number;
}

type SetFilter = <K extends keyof TransactionSearchFilters>(
  key: K,
  value: TransactionSearchFilters[K]
) => void;

const numberOrUndefined = (v: string) => (v === '' ? undefined : Number(v));

function SearchFilters({
  filters,
  set,
  text,
  setText,
  categories,
  accounts,
}: {
  filters: TransactionSearchFilters;
  set: SetFilter;
  text: string;
  setText: (v: string) => void;
  categories: Category[];
  accounts: Account[];
}) {
  const { t, tCategory } = useI18n();
  return (
    <div className="filters-grid">
      <input
        className="tx-input filters-text"
        type="search"
        placeholder={t('app.search.placeholder')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={t('app.search.placeholder')}
      />
      <select
        className="tx-input"
        value={filters.type ?? ''}
        onChange={(e) => set('type', e.target.value as TransactionType)}
        aria-label={t('app.search.type')}
      >
        <option value="">{t('app.search.allTypes')}</option>
        <option value="EXPENSE">{t('app.transaction.form.type.expense')}</option>
        <option value="INCOME">{t('app.transaction.form.type.income')}</option>
        <option value="SAVING">{t('app.transaction.form.type.saving')}</option>
      </select>
      <select
        className="tx-input"
        value={filters.categoryIds?.[0] ?? ''}
        onChange={(e) => set('categoryIds', e.target.value ? [e.target.value] : undefined)}
        aria-label={t('app.search.category')}
      >
        <option value="">{t('app.search.allCategories')}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon} {tCategory(c.name)}
          </option>
        ))}
      </select>
      {accounts.length > 1 && (
        <select
          className="tx-input"
          value={filters.accountId ?? ''}
          onChange={(e) => set('accountId', e.target.value)}
          aria-label={t('app.transaction.form.account')}
        >
          <option value="">{t('app.search.allAccounts')}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.icon} {a.name}
            </option>
          ))}
        </select>
      )}
      <label className="field">
        <span className="field-label">{t('app.search.from')}</span>
        <input
          className="tx-input"
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => set('from', e.target.value)}
        />
      </label>
      <label className="field">
        <span className="field-label">{t('app.search.to')}</span>
        <input
          className="tx-input"
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => set('to', e.target.value)}
        />
      </label>
      <input
        className="tx-input"
        type="number"
        min="0"
        step="0.01"
        placeholder={t('app.search.min')}
        value={filters.min ?? ''}
        onChange={(e) => set('min', numberOrUndefined(e.target.value))}
        aria-label={t('app.search.min')}
      />
      <input
        className="tx-input"
        type="number"
        min="0"
        step="0.01"
        placeholder={t('app.search.max')}
        value={filters.max ?? ''}
        onChange={(e) => set('max', numberOrUndefined(e.target.value))}
        aria-label={t('app.search.max')}
      />
      <select
        className="tx-input"
        value={filters.sort}
        onChange={(e) => set('sort', e.target.value as TransactionSort)}
        aria-label={t('app.search.sort')}
      >
        <option value="date_desc">{t('app.search.sort.dateDesc')}</option>
        <option value="date_asc">{t('app.search.sort.dateAsc')}</option>
        <option value="amount_desc">{t('app.search.sort.amountDesc')}</option>
        <option value="amount_asc">{t('app.search.sort.amountAsc')}</option>
      </select>
    </div>
  );
}

function SearchResults({
  result,
  loading,
  showAccount,
  onEdit,
  onMore,
}: {
  result: TransactionSearchResult;
  loading: boolean;
  showAccount: boolean;
  onEdit: (tx: Transaction) => void;
  onMore: () => void;
}) {
  const { t, tCategory } = useI18n();
  const { money, date } = useFormat();
  return (
    <div className="card">
      <div className="search-totals" aria-live="polite">
        <span>{t('app.search.results', { count: result.total })}</span>
        <span className="amount-pos">+{money(result.totals.income)}</span>
        <span className="amount-neg">−{money(result.totals.expenses)}</span>
        {result.totals.saving > 0 && (
          <span className="amount-saving">🐷 {money(result.totals.saving)}</span>
        )}
      </div>
      {result.items.length === 0 && <p className="empty-state">{t('app.search.empty')}</p>}
      <ul className="entity-list">
        {result.items.map((tx) => (
          <li key={tx.id}>
            <button
              type="button"
              className="entity-item entity-item--clickable"
              onClick={() => onEdit(tx)}
            >
              <span className="entity-icon">{tx.categoryIcon ?? '•'}</span>
              <span className="entity-main">
                <span className="entity-name">{tx.description}</span>
                <span className="entity-sub">
                  {date(tx.date)} · {tCategory(tx.category)}
                  {showAccount && tx.accountName ? ` · ${tx.accountName}` : ''}
                </span>
              </span>
              <SignedAmount className="entity-amount" type={tx.type} amount={tx.amount} />
            </button>
          </li>
        ))}
      </ul>
      {result.items.length < result.total && (
        <button className="btn-secondary btn-block" disabled={loading} onClick={onMore}>
          {loading ? t('app.common.loading') : t('app.search.more')}
        </button>
      )}
    </div>
  );
}

export function SearchView({ onEdit, refreshKey = 0 }: SearchViewProps) {
  const { transactionApi } = useApi();
  const { t } = useI18n();
  const { categories, accounts } = useFinances();
  const [filters, setFilters] = useState<TransactionSearchFilters>({ sort: 'date_desc' });
  const [text, setText] = useState('');
  const [more, setMore] = useState<{ for: TransactionSearchFilters; items: Transaction[] }>({
    for: filters,
    items: [],
  });
  const loadingMore = useAction();

  // Debounce free text so typing does not fire a request per key.
  useEffect(() => {
    const id = setTimeout(() => setFilters((f) => ({ ...f, q: text.trim() || undefined })), 300);
    return () => clearTimeout(id);
  }, [text]);

  const firstPage = useResource(
    () => transactionApi.search({ ...filters, limit: PAGE, offset: 0 }),
    [transactionApi, filters, refreshKey]
  );

  // Pages loaded with "more" only belong to the filters they were loaded for.
  const extra = more.for === filters ? more.items : [];
  const result: TransactionSearchResult | undefined = firstPage.data && {
    ...firstPage.data,
    items: [...firstPage.data.items, ...extra],
  };

  const loadMore = (offset: number) =>
    loadingMore.run(async () => {
      const page = await transactionApi.search({ ...filters, limit: PAGE, offset });
      setMore((prev) => ({
        for: filters,
        items: [...(prev.for === filters ? prev.items : []), ...page.items],
      }));
    });

  const set: SetFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value || undefined }));
  const error = firstPage.error ?? loadingMore.error;

  return (
    <div className="section-view">
      <div className="card">
        <h2 className="section-title">🔎 {t('app.search.title')}</h2>
        <SearchFilters
          filters={filters}
          set={set}
          text={text}
          setText={setText}
          categories={categories}
          accounts={accounts}
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      {result && (
        <SearchResults
          result={result}
          loading={firstPage.loading || loadingMore.pending}
          showAccount={accounts.length > 1}
          onEdit={onEdit}
          onMore={() => loadMore(result.items.length)}
        />
      )}
    </div>
  );
}
