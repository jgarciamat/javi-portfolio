import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useEscapeKey } from '@shared/hooks/useEscapeKey';
import type { HeaderState, RowSelection, SelectGesture } from '@shared/hooks/useRowSelection';
import { Icon } from './Icon';
import './css/BulkSelection.css';

interface SelectCheckboxProps {
  state: HeaderState;
  label: string;
  onToggle: (gesture: SelectGesture) => void;
  className?: string;
}

/** Checkbox of a row, a group or the whole list; a partial group shows as indeterminate. */
export function SelectCheckbox({ state, label, onToggle, className = '' }: SelectCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current!.indeterminate = state === 'some';
  }, [state]);
  return (
    <label className={`select-check ${className}`.trim()}>
      <input
        ref={ref}
        type="checkbox"
        checked={state === 'all'}
        aria-checked={state === 'some' ? 'mixed' : state === 'all'}
        aria-label={label}
        onChange={(e) => onToggle({ shiftKey: (e.nativeEvent as unknown as MouseEvent).shiftKey })}
        onKeyDown={(e) => {
          // Shift+Space extends the range like Shift+click (the browser click has no shiftKey).
          if (e.key === ' ' && e.shiftKey) {
            e.preventDefault();
            onToggle({ shiftKey: true });
          }
        }}
      />
    </label>
  );
}

/**
 * Shift or Ctrl/Cmd click on a row (not on its buttons or fields) selects it instead of
 * doing what the row normally does. Returns true when the click was taken.
 */
export function handleRowGesture(
  e: MouseEvent<HTMLElement>,
  id: string,
  selection: RowSelection
): boolean {
  const target = e.target as HTMLElement;
  const own = target.closest('input, select, textarea, a, button') ?? e.currentTarget;
  if (!(e.shiftKey || e.metaKey || e.ctrlKey) || own !== e.currentTarget) return false;
  e.preventDefault();
  selection.toggle(id, { shiftKey: e.shiftKey });
  return true;
}

/** Shift+mouse down would select page text on the way: keep it for the range instead. */
export const preventShiftTextSelection = (e: MouseEvent) => {
  if (e.shiftKey) e.preventDefault();
};

/** "Select all" line for lists without a table header (cards, week view, search). */
export function SelectAllBar({ selection }: { selection: RowSelection }) {
  const { t } = useI18n();
  return (
    <div className="select-all-bar">
      <SelectCheckbox
        state={selection.header}
        label={t('app.bulk.selectAll')}
        onToggle={selection.toggleAll}
      />
      <span aria-hidden="true">{t('app.bulk.selectAllCount', { count: selection.total })}</span>
    </div>
  );
}

interface BulkActionBarProps {
  selection: RowSelection;
  /** Paged lists: how many rows match the filters in all, and how to select every one. */
  matching?: { total: number; onSelect: () => void };
  /** Escape clears the selection (off while a dialog of the bar is open). */
  escapeEnabled: boolean;
  summary?: ReactNode;
  children: ReactNode;
}

/** Sticky bar shown while rows are selected: count, scope, totals and the joint actions. */
export function BulkActionBar({
  selection,
  matching,
  escapeEnabled,
  summary,
  children,
}: BulkActionBarProps) {
  const { t } = useI18n();
  useEscapeKey(selection.clear, escapeEnabled && selection.count > 0);
  if (selection.count === 0) return null;
  const total = Math.max(matching?.total ?? 0, selection.total);
  return (
    <div className="bulk-bar" role="region" aria-label={t('app.bulk.region')}>
      <div className="bulk-bar-head">
        <strong className="bulk-bar-count" aria-live="polite">
          {t('app.bulk.selected', { count: selection.count, total })}
        </strong>
        {matching && total > selection.total && selection.header === 'all' && (
          <button type="button" className="bulk-bar-link" onClick={matching.onSelect}>
            {t('app.bulk.selectMatching', { count: matching.total })}
          </button>
        )}
        <button
          type="button"
          className="bulk-bar-clear"
          onClick={selection.clear}
          aria-label={t('app.bulk.clear')}
          title={t('app.bulk.clear')}
        >
          <Icon name="close" />
          <span className="bulk-bar-clear-text">{t('app.bulk.clear')}</span>
        </button>
      </div>
      {summary}
      <div className="bulk-bar-actions">{children}</div>
    </div>
  );
}
