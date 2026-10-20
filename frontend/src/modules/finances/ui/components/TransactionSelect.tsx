import type { MouseEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import {
  SelectCheckbox,
  handleRowGesture,
  preventShiftTextSelection,
} from '@shared/components/BulkSelection';
import type { RowSelection } from '@shared/hooks/useRowSelection';
import type { Transaction } from '@modules/finances/domain/types';

/** What a row needs of the selection: whether it is chosen and how to toggle it. */
export type RowChoice = Pick<RowSelection, 'isSelected' | 'toggle'>;

/** Checkbox of one movement. */
export function RowCheckbox({ tx, selection }: { tx: Transaction; selection: RowChoice }) {
  const { t } = useI18n();
  return (
    <SelectCheckbox
      state={selection.isSelected(tx.id) ? 'all' : 'none'}
      label={t('app.bulk.selectRow', { name: tx.description })}
      onToggle={(gesture) => selection.toggle(tx.id, gesture)}
    />
  );
}

/** Checkbox of a whole day. */
export function DayCheckbox({
  label,
  items,
  selection,
}: {
  label: string;
  items: Transaction[];
  selection: RowSelection;
}) {
  const { t } = useI18n();
  const ids = items.map((tx) => tx.id);
  const state = selection.stateOf(ids);
  return (
    <SelectCheckbox
      state={state}
      label={t('app.bulk.selectDay', { day: label })}
      onToggle={() => selection.setMany(ids, state !== 'all')}
    />
  );
}

/** Props of a selectable row: Shift/Ctrl/Cmd click selects, and it is marked when selected. */
export function selectableRow(tx: Transaction, selection: RowChoice, base = '') {
  return {
    className: `${base}${selection.isSelected(tx.id) ? ' is-selected' : ''}`.trim(),
    onMouseDown: preventShiftTextSelection,
    onClick: (e: MouseEvent<HTMLElement>) => handleRowGesture(e, tx.id, selection),
  };
}
