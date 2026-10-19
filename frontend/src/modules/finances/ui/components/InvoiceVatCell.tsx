import { useI18n } from '@core/i18n/I18nContext';
import { PURCHASE_OPS, SALE_OPS, type Key349 } from '@modules/finances/domain/types';
import type { ImportedInvoice, InvoicePatch } from '../../domain/invoiceLedger';
import { intraKeyOf, isEuVatId } from '../../domain/vatBook';

/** Keys of the 349 an issued intra-EU invoice can have (supplies, services, triangular…). */
const SUPPLY_KEYS: Key349[] = ['E', 'S', 'T', 'M', 'H', 'R', 'D', 'C'];

const INTRA = ['intraEU', 'intraGoods', 'intraServices'];

/**
 * What an imported invoice is for VAT, to correct it: a domestic sale or purchase, intra-EU, an
 * export, a reverse charge… An intra-EU one asks for the VAT number of the other party (the 349).
 */
export function VatOpCell({
  invoice,
  name,
  onChange,
}: {
  invoice: ImportedInvoice;
  name: string;
  onChange: (invoice: ImportedInvoice, patch: InvoicePatch) => void;
}) {
  const { t } = useI18n();
  const issued = invoice.book === 'issued';
  const ops: readonly string[] = issued ? SALE_OPS : PURCHASE_OPS;
  const op = invoice.op ?? 'domestic';
  const intra = INTRA.includes(op);
  return (
    <td data-label={t('app.autonomo.review.col.op')} className="autonomo-review-op">
      <select
        className="tx-input"
        aria-label={t('app.autonomo.review.opOf', { invoice: name })}
        value={op}
        disabled={invoice.excluded}
        onChange={(e) =>
          onChange(invoice, { op: e.target.value as InvoicePatch['op'], opFix: true })
        }
      >
        {ops.map((o) => (
          <option key={o} value={o}>
            {t(`app.autonomo.vatOp.${issued ? 'sale' : 'purchase'}.${o}`)}
          </option>
        ))}
      </select>
      {intra && issued && (
        <select
          className="tx-input"
          aria-label={t('app.autonomo.review.keyOf', { invoice: name })}
          value={intraKeyOf(invoice) as Key349}
          disabled={invoice.excluded}
          onChange={(e) => onChange(invoice, { key349: e.target.value as Key349, opFix: true })}
        >
          {SUPPLY_KEYS.map((k) => (
            <option key={k} value={k}>
              {k} · {t(`app.autonomo.vatq.intra.keys.${k}`)}
            </option>
          ))}
        </select>
      )}
      {intra && (
        <input
          className={`tx-input${isEuVatId(invoice.vatId) ? '' : ' is-invalid'}`}
          aria-label={t('app.autonomo.review.vatIdOf', { invoice: name })}
          placeholder={t('app.autonomo.review.vatIdPlaceholder')}
          value={invoice.vatId ?? ''}
          disabled={invoice.excluded}
          onChange={(e) => onChange(invoice, { vatId: e.target.value.trim(), opFix: true })}
        />
      )}
    </td>
  );
}
