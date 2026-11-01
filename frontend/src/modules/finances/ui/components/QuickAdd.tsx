import { type FormEvent, type RefObject, useEffect, useId, useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { useResource } from '@shared/hooks/useResource';
import { errorMessage } from '@shared/utils/errors';
import { parseQuickEntry, quickCategory } from '@modules/finances/domain/quickEntry';
import type { ScannedReceipt } from '@modules/finances/domain/receiptParser';
import type {
  Account,
  Category,
  CreateTransactionDTO,
  Transaction,
} from '@modules/finances/domain/types';
import { ReceiptScanner } from './ReceiptScanner';
import '../css/QuickAdd.css';

/** Keys that jump to the quick entry on a computer (not while typing somewhere else). */
const SHORTCUT_KEYS = ['n', 'N', '+'];

const typingIn = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** N or + anywhere on the page puts the cursor in the quick entry. */
function useShortcut(input: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (!SHORTCUT_KEYS.includes(event.key) || typingIn(event.target)) return;
      // The closed menu stays in the page as a hidden dialog: only an open one blocks the key.
      if (document.querySelector('[role="dialog"]:not([aria-hidden="true"])')) return;
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [input]);
}

interface QuickAddProps {
  transactions: Transaction[];
  /** The person's categories, to choose one in the list. */
  categories?: Category[];
  /** Their accounts: the selector is shown only with more than one active account. */
  accounts?: Account[];
  defaultDate: string;
  onAdd: (dto: CreateTransactionDTO) => Promise<unknown>;
}

/** What is typed, the category it would get (or the one chosen) and the saving of it. */
function useQuickAdd({ transactions, defaultDate, onAdd, accounts = [] }: QuickAddProps) {
  const { t } = useI18n();
  const { money } = useFormat();
  const { categoryRuleApi } = useApi();
  const rules = useResource(() => categoryRuleApi.getAll(), [categoryRuleApi], { initial: [] });
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [chosenAccount, setChosenAccount] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [scannedDate, setScannedDate] = useState<string | null>(null);

  const entry = parseQuickEntry(text);
  const category = entry ? (chosen ?? quickCategory(entry, rules.data, transactions)) : chosen;
  // Same rule as the full form: the active accounts, the default one first chosen.
  const selectable = accounts.filter((a) => !a.archived);
  const accountId =
    selectable.length > 1
      ? (
          selectable.find((a) => a.id === chosenAccount) ??
          selectable.find((a) => a.isDefault) ??
          selectable[0]
        ).id
      : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setAdded(null);
    if (!entry) return setError(t('app.quickAdd.invalid'));
    const dto = {
      ...entry,
      category: category as string,
      date: scannedDate ?? defaultDate,
      ...(accountId ? { accountId } : {}),
    };
    setBusy(true);
    setError(null);
    try {
      await onAdd(dto);
      const amount = money(entry.amount);
      setAdded(
        t('app.quickAdd.added', { description: entry.description, amount, category: dto.category })
      );
      setText('');
      setChosen(null);
      setScannedDate(null);
      input.current?.focus();
    } catch (e) {
      setError(errorMessage(e, t('app.quickAdd.error')));
    } finally {
      setBusy(false);
    }
  };

  /** A ticket photo fills the concept and the amount (and the day) of the entry to confirm. */
  const scanned = (receipt: ScannedReceipt) => {
    const amount = receipt.total === null ? '' : String(receipt.total).replace('.', ',');
    setText(`${receipt.merchant ?? t('app.quickAdd.ticket')} ${amount}`.trim());
    setScannedDate(receipt.date);
    setError(null);
    setAdded(null);
    input.current?.focus();
  };

  return {
    input,
    text,
    scanned,
    setText: (value: string) => {
      setText(value);
      setError(null);
    },
    entry,
    category,
    selectable,
    accountId,
    chooseAccount: setChosenAccount,
    choose: setChosen,
    busy,
    error,
    added,
    submit,
  };
}

/** The category that will be used (the suggested one, editable) and, with several accounts, the account. */
function QuickSelects({
  quick,
  categories,
  idBase,
}: {
  quick: ReturnType<typeof useQuickAdd>;
  categories: Category[];
  idBase: string;
}) {
  const { t, tCategory } = useI18n();
  const { category } = quick;
  // A suggested category the person no longer has still shows, so it is never silently changed.
  const known = categories.some((c) => c.name === category);
  return (
    <div className="quick-add-selects">
      <div className="quick-add-field">
        <label className="tx-field-label" htmlFor={`${idBase}-category`}>
          {t('app.quickAdd.categories')}
        </label>
        <select
          id={`${idBase}-category`}
          className="tx-input"
          value={category ?? ''}
          onChange={(e) => quick.choose(e.target.value || null)}
        >
          <option value="">{t('app.transaction.form.category.placeholder')}</option>
          {category && !known && <option value={category}>{tCategory(category)}</option>}
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.icon} {tCategory(c.name)}
            </option>
          ))}
        </select>
      </div>
      {quick.accountId && (
        <div className="quick-add-field">
          <label className="tx-field-label" htmlFor={`${idBase}-account`}>
            {t('app.quickAdd.account')}
          </label>
          <select
            id={`${idBase}-account`}
            className="tx-input"
            value={quick.accountId}
            onChange={(e) => quick.chooseAccount(e.target.value)}
          >
            {quick.selectable.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/**
 * «Alta rápida»: «café 1,50» and Enter. The category comes from the person's rules, the last
 * movement with the same concept or the last one used, and can be changed in the list.
 */
export function QuickAdd(props: QuickAddProps) {
  const { t } = useI18n();
  const { money } = useFormat();
  const id = useId();
  const quick = useQuickAdd(props);
  const { entry, category } = quick;
  useShortcut(quick.input);

  return (
    <form className="card quick-add" onSubmit={(e) => void quick.submit(e)} noValidate>
      <label className="quick-add-label" htmlFor={id}>
        <Icon name="plus" /> {t('app.quickAdd.label')}
      </label>
      <div className="quick-add-row">
        <input
          ref={quick.input}
          id={id}
          className="tx-input"
          value={quick.text}
          placeholder={t('app.quickAdd.placeholder')}
          autoComplete="off"
          enterKeyHint="done"
          aria-describedby={`${id}-hint`}
          aria-invalid={!!quick.error}
          onChange={(e) => quick.setText(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={quick.busy}>
          {quick.busy ? t('app.transaction.form.saving') : t('app.quickAdd.add')}
        </button>
      </div>
      <ReceiptScanner onScanned={quick.scanned} />
      <QuickSelects quick={quick} categories={props.categories ?? []} idBase={id} />
      <p id={`${id}-hint`} className="section-hint">
        {entry
          ? t('app.quickAdd.preview', {
              type: t(entry.type === 'INCOME' ? 'app.quickAdd.income' : 'app.quickAdd.expense'),
              description: entry.description,
              amount: money(entry.amount),
              category: category as string,
            })
          : t('app.quickAdd.hint')}
      </p>
      {quick.error && (
        <p className="inline-error" role="alert">
          {quick.error}
        </p>
      )}
      {quick.added && (
        <p className="section-success" role="status">
          <Icon name="checkCircle" /> {quick.added}
        </p>
      )}
    </form>
  );
}
