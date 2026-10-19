import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import type { ImportedInvoice, InvoicePatch } from '../../domain/invoiceLedger';
import { retentionOf, roleOf, type WithholdingRole } from '../../domain/withholdings';

const ROLES: WithholdingRole[] = ['none', 'professional', 'rent'];

/** An amount as the person reads it: a comma for the decimals. */
const shown = (n: number) => String(Math.abs(n)).replace('.', ',');

/**
 * The withholding of a received invoice in the review: its amount, which can be corrected, and the
 * form it goes to (none, the 111 for a professional, the 115 for the rent of premises).
 */
export function RetentionCell({
  invoice,
  name,
  label,
  onChange,
}: {
  invoice: ImportedInvoice;
  /** The invoice in words, for the names of the controls. */
  name: string;
  /** The heading of the column, shown on a phone. */
  label: string;
  onChange: (patch: InvoicePatch) => void;
}) {
  const { t } = useI18n();
  const held = retentionOf(invoice);
  const [text, setText] = useState(shown(held));
  const [invalid, setInvalid] = useState(false);
  // Imported again or corrected elsewhere: the field shows the new amount.
  const [last, setLast] = useState(held);
  if (held !== last) {
    setLast(held);
    setText(shown(held));
    setInvalid(false);
  }
  const errorId = `autonomo-retention-error-${invoice.id}`;

  // A number from 0 to the base, without sign: a credit note takes the sign of its base.
  const commit = () => {
    const value = text.trim() === '' ? 0 : parseDecimal(text);
    const ok = Number.isFinite(value) && value >= 0 && value <= Math.abs(invoice.base);
    setInvalid(!ok);
    if (!ok) return;
    const signed = invoice.base < 0 ? -value : value;
    if (signed !== held) onChange({ retentionFix: signed });
  };

  return (
    <td data-label={label} className="autonomo-review-retention">
      <input
        className="tx-input"
        inputMode="decimal"
        aria-label={t('app.autonomo.wh.retentionOf', { invoice: name })}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        value={text}
        disabled={invoice.excluded}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
      />
      <select
        className="tx-input"
        aria-label={t('app.autonomo.wh.roleOf', { invoice: name })}
        value={roleOf(invoice)}
        disabled={invoice.excluded}
        onChange={(e) => onChange({ withholding: e.target.value as WithholdingRole })}
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {t(`app.autonomo.wh.role.${role}`)}
          </option>
        ))}
      </select>
      {invalid && (
        <small id={errorId} className="inline-error" role="alert">
          {t('app.autonomo.wh.invalid')}
        </small>
      )}
    </td>
  );
}
