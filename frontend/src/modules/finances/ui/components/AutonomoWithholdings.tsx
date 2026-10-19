import { useState, type Dispatch, type SetStateAction } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import {
  withholdingDeadline,
  type WithholdingResult,
  type WithholdingWarning,
} from '../../domain/withholdings';
import { Boxes } from './AutonomoDraftResult';
import {
  emptyWithholding,
  withWithholding,
  withholdingsOf,
  withholdingsOfForm,
  type WithholdingForm,
} from './withholdingForm';
import type { ManualForm } from './AutonomoManual';
import type { ReviewFocus } from './InvoiceReview';

type Translate = ReturnType<typeof useI18n>['t'];
type Money = ReturnType<typeof useFormat>['money'];
type Quarter = 1 | 2 | 3 | 4;
type Part = 'staff' | 'pros' | 'rent';

const key = (k: string) => `app.autonomo.wh.${k}`;

/** "a", "a y b" in the language of the app. */
const both = (t: Translate, parts: string[]) => parts.join(t('app.autonomo.explain.and'));

/** «2 profesionales», «1 empleado»: the count with its noun. */
const people = (t: Translate, what: 'pros' | 'staff' | 'landlords', n: number) =>
  t(key(`people.${what}.${n === 1 ? 'one' : 'many'}`), { n });

/** Both forms in one sentence each, with the figures of the quarter. */
export function explainWithholdings(
  t: Translate,
  money: Money,
  { m111, m115 }: WithholdingResult
): { m111: string; m115: string } {
  const parts = [
    ...(m111.pros.withheld !== 0
      ? [
          t(key('explain.to'), {
            amount: money(m111.pros.withheld),
            who: people(t, 'pros', m111.pros.people),
          }),
        ]
      : []),
    ...(m111.staff.withheld !== 0
      ? [
          t(key('explain.to'), {
            amount: money(m111.staff.withheld),
            who: people(t, 'staff', m111.staff.people),
          }),
        ]
      : []),
  ];
  return {
    m111:
      m111.result === 'pay'
        ? t(key('explain.111.pay'), { due: money(m111.due), parts: both(t, parts) })
        : t(key(`explain.111.${m111.result}`)),
    m115:
      m115.result === 'pay'
        ? t(key('explain.115.pay'), {
            due: money(m115.due),
            base: money(m115.base),
            who: people(t, 'landlords', m115.people),
          })
        : t(key(`explain.115.${m115.result}`)),
  };
}

/** A warning in words. */
function warningText(t: Translate, w: WithholdingWarning): string {
  return t(key(`warn.${w.code}`), {
    ...('who' in w ? { who: w.who || t('app.autonomo.review.noName') } : {}),
    ...(w.code === 'rate'
      ? {
          rate: String(w.rate).replace('.', ','),
          expected: w.expected.map((r) => `${r} %`).join(t(key('or'))),
        }
      : {}),
    ...(w.code === 'rentNoRetention' ? { year: w.year } : {}),
    ...('part' in w ? { part: t(key(`part.${w.part}`)) } : {}),
  });
}

/** One amount of the form; `label` is also its name for screen readers, with the quarter. */
function Amount({
  label,
  q,
  value,
  numeric = false,
  onChange,
}: {
  label: string;
  q: number;
  value: string;
  numeric?: boolean;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="tx-input"
        inputMode={numeric ? 'numeric' : 'decimal'}
        aria-label={t(key('fieldOf'), { field: label, n: q })}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** People, paid and withheld of a part of the quarter. */
function PartFields({
  part,
  q,
  values,
  onChange,
}: {
  part: Part;
  q: number;
  values: WithholdingForm['pros'];
  onChange: (patch: Partial<WithholdingForm['pros']>) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="autonomo-grid">
      <Amount
        label={t(key(`field.${part}.people`))}
        q={q}
        numeric
        value={values.people}
        onChange={(people) => onChange({ people })}
      />
      <Amount
        label={t(key(`field.${part}.paid`))}
        q={q}
        value={values.paid}
        onChange={(paid) => onChange({ paid })}
      />
      <Amount
        label={t(key(`field.${part}.withheld`))}
        q={q}
        value={values.withheld}
        onChange={(withheld) => onChange({ withheld })}
      />
    </div>
  );
}

/** The note of a quarter taken from a filed form, with the way back to the invoices. */
function FiledNote({ model, onUndo }: { model: '111' | '115'; onUndo: () => void }) {
  const { t } = useI18n();
  return (
    <p className="autonomo-wh-filed">
      <span>{t(key(`filed.${model}`))}</span>{' '}
      <button type="button" className="btn-secondary" onClick={onUndo}>
        {t(key(`undo.${model}`))}
      </button>
    </p>
  );
}

/** Employees, professionals and landlords of one quarter. */
function QuarterWithholdings({
  q,
  value,
  open,
  totals,
  onChange,
}: {
  q: Quarter;
  value: WithholdingForm;
  open: boolean;
  totals: { m111: number; m115: number };
  onChange: (patch: Partial<WithholdingForm>) => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const { staff } = value;
  const [kind, setKind] = useState(
    staff.kindPeople !== '' || staff.kindPaid !== '' || staff.kindWithheld !== ''
  );
  const [shown, setShown] = useState(open);
  const empty = emptyWithholding();
  return (
    <div className="autonomo-wh-quarter">
      <button
        type="button"
        className="autonomo-wh-toggle"
        aria-expanded={shown}
        onClick={() => setShown(!shown)}
      >
        <span>{t('app.autonomo.quarterN', { n: q })}</span>
        <span className="autonomo-wh-totals">
          {t(key('totals'), { m111: money(totals.m111), m115: money(totals.m115) })}
        </span>
      </button>
      {shown && (
        <>
          <h4>{t(key('staffTitle'))}</h4>
          {value.filed111 && (
            <FiledNote
              model="111"
              onUndo={() => onChange({ staff: empty.staff, pros: empty.pros, filed111: false })}
            />
          )}
          <PartFields
            part="staff"
            q={q}
            values={staff}
            onChange={(patch) => onChange({ staff: { ...staff, ...patch } })}
          />
          <label className="renta-check">
            <input type="checkbox" checked={kind} onChange={(e) => setKind(e.target.checked)} />
            <span>{t(key('kindOn'))}</span>
          </label>
          {kind && (
            <div className="autonomo-grid">
              <Amount
                label={t(key('field.kind.people'))}
                q={q}
                numeric
                value={staff.kindPeople}
                onChange={(kindPeople) => onChange({ staff: { ...staff, kindPeople } })}
              />
              <Amount
                label={t(key('field.kind.paid'))}
                q={q}
                value={staff.kindPaid}
                onChange={(kindPaid) => onChange({ staff: { ...staff, kindPaid } })}
              />
              <Amount
                label={t(key('field.kind.withheld'))}
                q={q}
                value={staff.kindWithheld}
                onChange={(kindWithheld) => onChange({ staff: { ...staff, kindWithheld } })}
              />
            </div>
          )}

          <h4>{t(key('prosTitle'))}</h4>
          <PartFields
            part="pros"
            q={q}
            values={value.pros}
            onChange={(patch) => onChange({ pros: { ...value.pros, ...patch } })}
          />

          <h4>{t(key('rentTitle'))}</h4>
          {value.filed115 && (
            <FiledNote model="115" onUndo={() => onChange({ rent: empty.rent, filed115: false })} />
          )}
          <PartFields
            part="rent"
            q={q}
            values={value.rent}
            onChange={(patch) => onChange({ rent: { ...value.rent, ...patch } })}
          />
        </>
      )}
    </div>
  );
}

/**
 * Step 2: what the person withheld as a payer, quarter by quarter. Employees come from the payslips;
 * professionals and landlords whose invoices were imported are already counted, the fields are for
 * the rest.
 */
export function WithholdingsForm({
  form,
  onChange,
  year,
  upTo,
}: {
  form: ManualForm;
  onChange: (form: ManualForm) => void;
  year: number;
  /** The quarter of the draft: the ones before it are there too, folded. */
  upTo: number;
}) {
  const { t } = useI18n();
  const quarters = withholdingsOf(form);
  return (
    <section
      className="autonomo-panel autonomo-wh-form"
      id="autonomo-wh-form"
      aria-labelledby="autonomo-wh-form-title"
    >
      <h3 id="autonomo-wh-form-title">{t(key('formTitle'))}</h3>
      <p className="section-hint">{t(key('formHint'))}</p>
      {quarters.slice(0, upTo).map((value, i) => {
        const q = (i + 1) as Quarter;
        const result = withholdingsOfForm(form, year, q);
        return (
          <QuarterWithholdings
            key={q}
            q={q}
            value={value}
            open={q === upTo}
            totals={{ m111: result.m111.due, m115: result.m115.due }}
            onChange={(patch) => onChange(withWithholding(form, q, patch))}
          />
        );
      })}
    </section>
  );
}

/**
 * Step 3: the modelos 111 and 115 of the quarter of the draft, worked out on the device: the
 * deadline, each form in one sentence, what to look at and the boxes.
 */
export function WithholdingsPanel({
  form,
  year,
  quarter,
  onFocus,
}: {
  form: ManualForm;
  year: number;
  quarter: Quarter;
  /** Shows an invoice in the review (as the warnings of the import do). */
  onFocus: Dispatch<SetStateAction<ReviewFocus | null>>;
}) {
  const { t } = useI18n();
  const { money, date } = useFormat();
  const result = withholdingsOfForm(form, year, quarter);
  const sentences = explainWithholdings(t, money, result);
  return (
    <section
      className="autonomo-panel autonomo-wh"
      id="autonomo-withholdings"
      aria-labelledby="autonomo-withholdings-title"
    >
      <h3 id="autonomo-withholdings-title" tabIndex={-1}>
        {t(key('title'))}
      </h3>
      <p className="autonomo-wh-deadline">
        {t(key('deadline'), { n: quarter, date: date(withholdingDeadline(year, quarter)) })}
      </p>
      <div className="autonomo-explain">
        <p>{sentences.m111}</p>
        <p>{sentences.m115}</p>
      </div>
      {result.warnings.length > 0 && (
        <ul className="autonomo-checks-list">
          {result.warnings.map((w, n) => (
            <li key={`${w.code}-${n}`} className="autonomo-check autonomo-check--warn">
              <p>
                <strong className="autonomo-check-level">
                  {t('app.autonomo.checks.level.warn')}
                </strong>{' '}
                {warningText(t, w)}
              </p>
              {'invoice' in w && (
                <div className="autonomo-check-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onFocus((f) => ({ id: w.invoice, n: (f?.n ?? 0) + 1 }))}
                  >
                    {t(key('openInvoice'))}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {result.m111.result !== 'none' && (
        <Boxes title={t('app.autonomo.model', { model: '111' })} boxes={result.m111.boxes} />
      )}
      {result.m115.result !== 'none' && (
        <Boxes title={t('app.autonomo.model', { model: '115' })} boxes={result.m115.boxes} />
      )}
      <p className="section-hint">{t(key('note'))}</p>
    </section>
  );
}
