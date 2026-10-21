import { useId, useState } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { typedAmount } from '@modules/finances/domain/closedQuarter';
import { activityOf, inModules } from './activityForm';
import type { ManualForm } from './AutonomoManual';

/** The guide on correcting a filed 130 or 303 (open to everybody). */
export const FIX_GUIDE_PATH = '/guias/corregir-modelo-130-303';

const k = (key: string) => `app.autonomo.closed.${key}`;

const replaced = <T,>(list: T[] | undefined, empty: T, i: number, value: T): T[] =>
  [0, 1, 2, 3].map((j) => (j === i ? value : (list?.[j] ?? empty)));

function Amount({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  // The hint stays out of the label, so the field is named by its label alone.
  return (
    <div className="field">
      <label className="field-label" htmlFor={`${id}-input`}>
        {label}
      </label>
      <input
        id={`${id}-input`}
        className="tx-input"
        inputMode="decimal"
        aria-describedby={`${id}-hint`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <small id={`${id}-hint`} className="autonomo-hint">
        {hint}
      </small>
    </div>
  );
}

/**
 * A quarter whose filing period is over was changed (docs/fiscalidad/corregir-un-modelo.md §11):
 * what was filed stays as it was, the error is corrected in that same quarter, and what was filed
 * can be typed so the next 130 takes off what was really paid (box 05). Nothing is filed from here.
 */
export function ClosedQuarterNotice({
  q,
  form,
  onChange,
}: {
  /** The quarter, from 0. */
  q: number;
  form: ManualForm;
  onChange: (form: ManualForm) => void;
}) {
  const { t } = useI18n();
  // Outside the app's router (a screen shown on its own) the guide opens as a plain link.
  const router = useInRouterContext();
  const fieldsId = useId();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  // The 303 result is kept as a number (the 390 reconciles with it): its text lives here.
  const [vat, setVat] = useState(() => {
    const filed = form.filed303?.[q];
    return filed === null || filed === undefined ? '' : String(filed);
  });
  const activity = activityOf(form.activity);
  const modules = inModules(form);
  const box07 = form.filed130?.[q] ?? '';
  const typed = typedAmount(box07) !== null;
  const setVatText = (text: string) => {
    setVat(text);
    const filed = typedAmount(text);
    if (text.trim() === '' || filed !== null) {
      onChange({ ...form, filed303: replaced(form.filed303, null, q, filed) });
    }
  };
  return (
    <section className="autonomo-closed" aria-labelledby={titleId}>
      <div role="status">
        <h4 id={titleId}>{t(k('title'))}</h4>
        <p>{t(k('body'))}</p>
        <p>{t(k('less'))}</p>
      </div>
      <div className="autonomo-closed-actions">
        {router ? (
          <Link className="btn-secondary" to={FIX_GUIDE_PATH}>
            {t(k('guide'))}
          </Link>
        ) : (
          <a className="btn-secondary" href={FIX_GUIDE_PATH}>
            {t(k('guide'))}
          </a>
        )}
        <button
          type="button"
          className="btn-secondary"
          aria-expanded={open}
          aria-controls={fieldsId}
          onClick={() => setOpen(!open)}
        >
          {t(k('write'))}
        </button>
      </div>
      {open && (
        <div id={fieldsId} className="autonomo-closed-fields">
          <p className="section-hint">{t(k('fieldsHint'))}</p>
          <div className="autonomo-grid">
            {!modules && (
              <>
                <Amount
                  label={t(k('box07'), { n: q + 1 })}
                  hint={t(k('box07Hint'))}
                  value={box07}
                  onChange={(text) =>
                    onChange({ ...form, filed130: replaced(form.filed130, '', q, text) })
                  }
                />
                <Amount
                  label={t(k('box19'), { n: q + 1 })}
                  hint={t(k('box19Hint'))}
                  value={activity.paid130[q]}
                  onChange={(text) =>
                    onChange({
                      ...form,
                      activity: { ...activity, paid130: replaced(activity.paid130, '', q, text) },
                    })
                  }
                />
              </>
            )}
            <Amount
              label={t(k('box71'), { n: q + 1 })}
              hint={t(k('box71Hint'))}
              value={vat}
              onChange={setVatText}
            />
          </div>
        </div>
      )}
      {typed && !modules && <p className="autonomo-closed-saved">{t(k('saved'))}</p>}
    </section>
  );
}
