import { type FormEvent, type RefObject, useEffect, useId, useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { useResource } from '@shared/hooks/useResource';
import { errorMessage } from '@shared/utils/errors';
import {
  parseQuickEntry,
  quickCategory,
  recentCategories,
} from '@modules/finances/domain/quickEntry';
import type { ScannedReceipt } from '@modules/finances/domain/receiptParser';
import type { CreateTransactionDTO, Transaction } from '@modules/finances/domain/types';
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
      if (document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [input]);
}

interface QuickAddProps {
  transactions: Transaction[];
  defaultDate: string;
  onAdd: (dto: CreateTransactionDTO) => Promise<unknown>;
}

/** What is typed, the category it would get (or the one chosen) and the saving of it. */
function useQuickAdd({ transactions, defaultDate, onAdd }: QuickAddProps) {
  const { t } = useI18n();
  const { money } = useFormat();
  const { categoryRuleApi } = useApi();
  const rules = useResource(() => categoryRuleApi.getAll(), [categoryRuleApi], { initial: [] });
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [scannedDate, setScannedDate] = useState<string | null>(null);

  const entry = parseQuickEntry(text);
  const category = entry ? (chosen ?? quickCategory(entry, rules.data, transactions)) : chosen;
  const recent = recentCategories(transactions, entry?.type ?? 'EXPENSE');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setAdded(null);
    if (!entry) return setError(t('app.quickAdd.invalid'));
    const dto = { ...entry, category: category as string, date: scannedDate ?? defaultDate };
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
    chips: category && !recent.includes(category) ? [category, ...recent] : recent,
    choose: setChosen,
    busy,
    error,
    added,
    submit,
  };
}

/** The categories last used, to pick another one with a tap; the one that will be used is pressed. */
function CategoryChips({
  chips,
  category,
  onChoose,
}: {
  chips: string[];
  category: string | null;
  onChoose: (name: string) => void;
}) {
  const { t } = useI18n();
  if (chips.length === 0) return null;
  return (
    <div className="quick-add-chips" role="group" aria-label={t('app.quickAdd.categories')}>
      {chips.map((name) => (
        <button
          key={name}
          type="button"
          className="quick-add-chip"
          aria-pressed={name === category}
          onClick={() => onChoose(name)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

/**
 * «Alta rápida»: «café 1,50» and Enter. The category comes from the person's rules, the last
 * movement with the same concept or the last one used, and can be changed with the recent chips.
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
      <CategoryChips chips={quick.chips} category={category} onChoose={quick.choose} />
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
