import { type KeyboardEvent, type ReactNode, useId, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { ScrollRegion } from '@shared/components/ScrollRegion';
import type { ImportRowDTO, TransactionType } from '@modules/finances/domain/types';
import { parseAmount, rowType } from '@modules/finances/domain/importParsers';
import { TRANSACTION_TYPES, TYPE_LABEL_KEYS } from '@modules/finances/domain/transactionTypes';
import type { RowChanges } from '../../application/hooks/useImport';

/** Where the movements come from: a statement file, pasted text or a screenshot. */
export type ImportSource = 'file' | 'paste' | 'screenshot';

const SOURCES: { id: ImportSource; icon: 'file' | 'clipboard' | 'image' }[] = [
  { id: 'file', icon: 'file' },
  { id: 'paste', icon: 'clipboard' },
  { id: 'screenshot', icon: 'image' },
];

/** The ways in, as tabs (arrows, Home and End move between them). */
export function ImportSourceTabs({
  source,
  onSource,
  children,
}: {
  source: ImportSource;
  onSource: (source: ImportSource) => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const base = useId();
  const tabId = (id: ImportSource) => `${base}-tab-${id}`;
  const panelId = `${base}-panel`;
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = SOURCES.findIndex((s) => s.id === source);
    const last = SOURCES.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = SOURCES[moves[event.key]].id;
    onSource(next);
    document.getElementById(tabId(next))!.focus();
  };
  return (
    <>
      <div
        className="import-tabs"
        role="tablist"
        aria-label={t('app.import.sources')}
        onKeyDown={onKeyDown}
      >
        {SOURCES.map(({ id, icon }) => (
          <button
            key={id}
            id={tabId(id)}
            type="button"
            role="tab"
            className={`tab-btn${id === source ? ' active' : ''}`}
            aria-selected={id === source}
            aria-controls={panelId}
            tabIndex={id === source ? 0 : -1}
            onClick={() => onSource(id)}
          >
            <Icon name={icon} /> {t(`app.import.source.${id}`)}
          </button>
        ))}
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(source)}>
        {children}
      </div>
    </>
  );
}

/** «Pega aquí tus movimientos»: what was copied from the bank's app or web. */
export function PastePanel({
  onRead,
  initialText,
}: {
  onRead: (text: string) => void;
  /** Text shared from another app: shown here to correct if nothing could be read from it. */
  initialText: string;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(initialText);
  const fieldId = useId();
  return (
    <div className="import-paste">
      <label className="field-label" htmlFor={fieldId}>
        {t('app.import.paste.label')}
      </label>
      <textarea
        id={fieldId}
        className="tx-input import-paste-text"
        rows={8}
        value={text}
        placeholder={t('app.import.paste.placeholder')}
        aria-describedby={`${fieldId}-hint`}
        onChange={(e) => setText(e.target.value)}
      />
      <p id={`${fieldId}-hint`} className="section-hint">
        {t('app.import.paste.hint')}
      </p>
      <button
        type="button"
        className="btn-primary"
        disabled={!text.trim()}
        onClick={() => onRead(text)}
      >
        <Icon name="sparkles" /> {t('app.import.paste.read')}
      </button>
    </div>
  );
}

/**
 * A screenshot of the bank's list of movements, read on the device. On a computer it can also be
 * dropped on the importer or pasted with Ctrl/Cmd+V.
 */
export function ScreenshotPanel({
  reading,
  onImage,
}: {
  reading: boolean;
  onImage: (image: File) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="import-paste">
      <p className="section-hint">{t('app.import.screenshot.hint')}</p>
      <p className="import-private">
        <Icon name="shield" /> {t('app.import.screenshot.private')}
      </p>
      <label className="file-drop">
        <input
          type="file"
          accept="image/*"
          disabled={reading}
          aria-label={t('app.import.screenshot.choose')}
          onChange={(e) => {
            const image = e.target.files?.[0];
            if (image) onImage(image);
            e.target.value = '';
          }}
        />
        <span>{t('app.import.screenshot.choose')}</span>
      </label>
      {reading && (
        <p className="section-hint" role="status">
          {t('app.import.screenshot.reading')}
        </p>
      )}
    </div>
  );
}

const typeName = (t: (key: string) => string, type: TransactionType): string =>
  t(TYPE_LABEL_KEYS[type]).replace(/^[↑↓]\s*/, '');

/** One movement read from text or an image: every field can be corrected, or the row removed. */
function EditableRow({
  row,
  index,
  review,
  onEdit,
  onType,
  onRemove,
}: {
  row: ImportRowDTO;
  index: number;
  review: boolean;
  onEdit: (index: number, changes: RowChanges) => void;
  onType: (index: number, type: TransactionType) => void;
  onRemove: (index: number) => void;
}) {
  const { t, locale } = useI18n();
  const type = rowType(row);
  const shown = Math.abs(row.amount).toFixed(2);
  const name = row.description;
  return (
    <li className="import-edit-row">
      <input
        type="date"
        className="tx-input import-edit-date"
        aria-label={`${t('app.import.col.date')} ${name}`}
        value={row.date}
        onChange={(e) => e.target.value && onEdit(index, { date: e.target.value })}
      />
      <input
        type="text"
        className="tx-input import-edit-description"
        aria-label={`${t('app.import.col.description')} ${index + 1}`}
        defaultValue={row.description}
        maxLength={200}
        onBlur={(e) => {
          const description = e.target.value.trim();
          if (description && description !== row.description) onEdit(index, { description });
        }}
      />
      <select
        className="tx-input import-type-select"
        aria-label={`${t('app.import.col.type')} ${name}`}
        value={type}
        onChange={(e) => onType(index, e.target.value as TransactionType)}
      >
        {TRANSACTION_TYPES.map((ty) => (
          <option key={ty} value={ty}>
            {typeName(t, ty)}
          </option>
        ))}
      </select>
      <input
        type="text"
        inputMode="decimal"
        className="tx-input import-edit-amount"
        aria-label={`${t('app.import.col.amount')} ${name}`}
        defaultValue={locale === 'es' ? shown.replace('.', ',') : shown}
        onBlur={(e) => {
          const value = Math.abs(parseAmount(e.target.value) ?? 0);
          if (!value) return;
          onEdit(index, { amount: type === 'EXPENSE' ? -value : value });
        }}
      />
      <button
        type="button"
        className="icon-btn import-edit-remove"
        aria-label={t('app.import.removeRow', { name })}
        onClick={() => onRemove(index)}
      >
        <Icon name="trash" />
      </button>
      {review && <small className="import-review">{t('app.import.typeReview')}</small>}
    </li>
  );
}

/** The movements read from pasted text or a screenshot, to correct before the preview. */
export function EditableRows({
  rows,
  review,
  onEdit,
  onType,
  onRemove,
}: {
  rows: ImportRowDTO[];
  review: number[];
  onEdit: (index: number, changes: RowChanges) => void;
  onType: (index: number, type: TransactionType) => void;
  onRemove: (index: number) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <p className="section-hint">{t('app.import.editHint')}</p>
      <ScrollRegion className="import-rows-scroll" label={t('app.import.rowsList')}>
        <ul className="import-edit-list">
          {rows.map((r, i) => (
            // The key changes with the row, so the fields show what was saved after a removal.
            <EditableRow
              key={`${i}|${r.date}|${r.description}|${r.amount}`}
              row={r}
              index={i}
              review={review.includes(i)}
              onEdit={onEdit}
              onType={onType}
              onRemove={onRemove}
            />
          ))}
        </ul>
      </ScrollRegion>
    </>
  );
}
