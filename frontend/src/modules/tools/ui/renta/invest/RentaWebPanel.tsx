import { useId, useMemo, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { storage } from '@shared/utils/storage';
import type { LedgerResult } from '../../../domain/invest/ledger';
import { copyFileName, copyPlan, reportTables, type CopyPlan } from '../../../domain/invest/report';
import {
  APARTADO,
  OTHER_GROUPINGS,
  rentaWebKit,
  webValue,
  WINDOWS,
  type Alta,
  type KitWarning,
  type OtherGrouping,
  type RentaWebKit,
} from '../../../domain/invest/rentaWeb';
import { download, reportPdf, xlsxBlob, xlsxOf } from '../../../application/investImport';
import { useMoney } from '../shared';

/** What is copied into Renta WEB: an amount with a decimal comma and no thousands separator. */
export const forRentaWeb = webValue;

/** The id of the panel in the result, for the link under the amount. */
export const RENTA_WEB_RESULT_ID = 'invest-web-result';

const GROUPING_KEY = 'renta.invest.otherGrouping';

/** Whether the panel has anything to show for a ledger (sales to copy or amounts for boxes). */
export function hasRentaWebCopy(ledger: LedgerResult | null): boolean {
  if (!ledger) return false;
  const kit = rentaWebKit(ledger);
  return kit.windows.length > 0 || kit.totals.length > 0;
}

interface Step {
  window: RentaWebKit['windows'][number];
  alta: Alta;
  key: string;
}

const stepsOf = (kit: RentaWebKit): Step[] =>
  kit.windows.flatMap((window) =>
    window.altas.map((alta) => ({ window, alta, key: `${window.section}:${alta.n}` }))
  );

/** One field of the window: its official label, the value and a button to copy it. */
function Field({
  label,
  value,
  onCopied,
}: {
  label: string;
  value: string | number;
  onCopied: () => void;
}) {
  const { t } = useI18n();
  const text = forRentaWeb(value);
  return (
    <div className="invest-copy-field">
      <span className="invest-copy-label">{label}</span>
      <strong className="invest-copy-value">{text === '' ? '—' : text}</strong>
      <button
        type="button"
        className="btn-secondary"
        aria-label={t('tools.invest.web.copyOf', { label })}
        onClick={async () => {
          await navigator.clipboard?.writeText(String(text));
          onCopied();
        }}
      >
        {t('tools.invest.web.copy')}
      </button>
    </div>
  );
}

/**
 * «Copiar a Renta WEB»: window by window and alta by alta, each field with its label and a copy
 * button; the person marks each alta as done and sees how many are left.
 */
export function CopyMode({ kit, grouping }: { kit: RentaWebKit; grouping: OtherGrouping }) {
  const { t } = useI18n();
  const money = useMoney();
  const k = 'tools.invest.web';
  const steps = stepsOf(kit);
  // Another grouping gives other altas: what was marked with one is not done with the other.
  const doneKey = `renta.invest.copied.${kit.year}${grouping === 'position' ? '' : `.${grouping}`}`;
  const [done, setDone] = useState<string[]>(() => storage.getJSON<string[]>(doneKey, []));
  const [at, setAt] = useState(0);
  const [copied, setCopied] = useState('');
  const finished = at >= steps.length;
  const mark = (key: string) => {
    const next = done.includes(key) ? done : [...done, key];
    setDone(next);
    storage.setJSON(doneKey, next);
  };
  const step = steps[Math.min(at, steps.length - 1)];
  const firstOfWindow = !finished && (at === 0 || steps[at - 1].window !== step.window);
  const fields = step.window.def.fields;
  return (
    <section className="renta-block invest-copy" aria-labelledby="invest-copy-title">
      <h4 id="invest-copy-title">{t(`${k}.modeTitle`)}</h4>
      <progress max={steps.length} value={done.length} aria-label={t(`${k}.progress`)} />
      <p aria-live="polite">
        {finished
          ? t(`${k}.finished`)
          : t(`${k}.position`, {
              n: at + 1,
              total: steps.length,
              done: done.length,
            })}
      </p>
      {!finished && (
        <>
          <h5>{step.window.def.title}</h5>
          {firstOfWindow && (
            <p className="section-hint">
              {t(`${k}.open`, { apartado: APARTADO, window: step.window.def.title })}{' '}
              <a href={step.window.def.help} target="_blank" rel="noopener noreferrer">
                {t(`${k}.help`)}
              </a>
            </p>
          )}
          <p>
            <strong>{t(`${k}.alta`, { n: step.alta.n, of: step.window.altas.length })}</strong> ·{' '}
            {step.alta.name}
            {done.includes(step.key) && ` · ${t(`${k}.doneMark`)}`}
          </p>
          {step.alta.fiscalData && <p className="section-hint">{t(`${k}.maybeFiscal`)}</p>}
          {(step.alta.transactions ?? [step.alta]).map((line, i) => (
            <div key={i} className="invest-copy-alta">
              {step.alta.transactions && i === 0 && (
                <Field
                  label={fields[0].label}
                  value={step.alta.values.entity}
                  onCopied={() => setCopied(fields[0].label)}
                />
              )}
              {fields
                .filter((f) => !(step.alta.transactions && f.key === 'entity'))
                .map((f) => (
                  <Field
                    key={f.key}
                    label={f.label}
                    value={line.values[f.key]}
                    onCopied={() => setCopied(f.label)}
                  />
                ))}
              <p className="section-hint">
                {t(`${k}.expect`, { gain: money(line.gain), loss: money(line.counted) })}
              </p>
            </div>
          ))}
          {copied && (
            <p className="section-hint" role="status">
              {t(`${k}.copied`, { label: copied })}
            </p>
          )}
        </>
      )}
      <div className="button-row">
        <button
          type="button"
          className="btn-secondary"
          disabled={at === 0}
          onClick={() => setAt(at - 1)}
        >
          {t(`${k}.back`)}
        </button>
        {!finished && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              mark(step.key);
              setCopied('');
              setAt(at + 1);
            }}
          >
            {t(`${k}.next`)}
          </button>
        )}
      </div>
      {finished && (
        <ul className="renta-minimum" aria-label={t(`${k}.totals`)}>
          {kit.totals.map((tl) => (
            <li key={tl.box}>
              <span>
                [{tl.box}] {tl.label}
              </span>
              <strong>{money(tl.amount)}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The notes that go with the file, in plain words. */
function KitWarnings({ warnings }: { warnings: KitWarning[] }) {
  const { t } = useI18n();
  if (warnings.length === 0) return null;
  return (
    <ul className="renta-notes">
      {warnings.map((w, i) => (
        <li key={i}>
          {t(`tools.invest.web.warn.${w.code}`, {
            section: 'section' in w ? t(`tools.invest.section.${w.section}`) : '',
            sales: 'sales' in w ? w.sales : 0,
            altas: 'altas' in w ? w.altas : 0,
            limit: 'limit' in w ? w.limit : 0,
          })}
        </li>
      ))}
    </ul>
  );
}

/** How many rows and where, and the totals Renta WEB must show at the end of each window. */
function PlanWindows({ plan }: { plan: CopyPlan }) {
  const { t } = useI18n();
  const money = useMoney();
  const k = 'tools.invest.web';
  return (
    <ul className="invest-web-windows">
      {plan.windows.map((w) => (
        <li key={w.section}>
          <strong>
            {t(`${k}.window${w.rows === 1 ? 'One' : ''}`, { title: w.title, rows: w.rows })}
          </strong>
          <span>
            {t(`${k}.windowTotals`, {
              gainsBox: w.gains.box,
              gains: money(w.gains.amount),
              lossesBox: w.losses.box,
              losses: money(w.losses.amount),
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The way to the window in Renta WEB, drawn as boxes with arrows, ending in its fields. */
function RouteMap({ kit }: { kit: RentaWebKit }) {
  const { t } = useI18n();
  const k = 'tools.invest.web.route';
  const first = kit.windows[0];
  return (
    <figure className="invest-route">
      <figcaption>{t(`${k}.title`)}</figcaption>
      <ol>
        <li>{t(`${k}.web`)}</li>
        <li>{t(`${k}.declaration`)}</li>
        <li>{APARTADO}</li>
        <li>
          {t(`${k}.window`, {
            window: kit.windows.map((w) => `«${w.def.title}»`).join(t(`${k}.or`)),
          })}
        </li>
        <li>{t(`${k}.alta`)}</li>
        <li className="invest-route-fields">
          {t(`${k}.fields`, { window: first.def.title })}
          <span>
            {first.def.fields.map((f) => (
              <span key={f.key} className="invest-route-field">
                {f.label}
              </span>
            ))}
          </span>
        </li>
      </ol>
    </figure>
  );
}

/** One row worked out: each field of the window with what to write in it. */
function Example({ plan }: { plan: CopyPlan }) {
  const { t } = useI18n();
  const k = 'tools.invest.web.example';
  const example = plan.example as NonNullable<CopyPlan['example']>;
  return (
    <div className="invest-web-example">
      <h5>{t(`${k}.title`, { n: example.alta, window: example.title })}</h5>
      <p className="section-hint">{t(`${k}.hint`, { tab: example.tab })}</p>
      <table className="renta-compare-table">
        <thead>
          <tr>
            <th scope="col">{t(`${k}.field`)}</th>
            <th scope="col">{t(`${k}.value`)}</th>
          </tr>
        </thead>
        <tbody>
          {example.fields.map((f) => (
            <tr key={f.label}>
              <th scope="row">{f.label}</th>
              <td>
                <strong>{f.value}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** «Otros elementos»: one row per position, per month or two per instrument, as the person picks. */
function Grouping({
  ledger,
  value,
  onChange,
}: {
  ledger: LedgerResult;
  value: OtherGrouping;
  onChange: (g: OtherGrouping) => void;
}) {
  const { t } = useI18n();
  const k = 'tools.invest.web.group';
  const rowsOf = (g: OtherGrouping) =>
    rentaWebKit(ledger, { other: g }).windows.find((w) => w.section === 'other')?.altas.length ?? 0;
  const rows = OTHER_GROUPINGS.map(rowsOf);
  // Only when grouping saves rows.
  if (rows[0] <= rows[2]) return null;
  const totals = WINDOWS.other.totals;
  return (
    <fieldset className="renta-block invest-web-group">
      <legend>{t(`${k}.title`)}</legend>
      {OTHER_GROUPINGS.map((g, i) => (
        <label key={g} className="renta-check">
          <input
            type="radio"
            name="invest-web-group"
            checked={value === g}
            onChange={() => onChange(g)}
          />
          <span>{t(`${k}.${g}`, { rows: rows[i] })}</span>
        </label>
      ))}
      <p className="section-hint">
        {t(`${k}.hint`, { gainsBox: totals.gains, lossesBox: totals.losses })}
      </p>
    </fieldset>
  );
}

/**
 * «Qué tienes que copiar en Renta WEB»: how many rows go in each window and the totals to see, the
 * step by step mode first (the big button), the three steps, the way to the window drawn, one row
 * worked out, and the Excel and the PDF. `compact` (the end of the assistant) keeps the numbers and
 * the buttons.
 */
export function RentaWebPanel({
  ledger,
  compact = false,
  id,
}: {
  ledger: LedgerResult;
  compact?: boolean;
  id?: string;
}) {
  const { t } = useI18n();
  const k = 'tools.invest.web';
  const titleId = useId();
  const [grouping, setGrouping] = useState<OtherGrouping>(() =>
    storage.getJSON<OtherGrouping>(GROUPING_KEY, 'position')
  );
  const kit = useMemo(() => rentaWebKit(ledger, { other: grouping }), [ledger, grouping]);
  const [copying, setCopying] = useState(false);
  if (!hasRentaWebCopy(ledger)) return null;
  const plan = copyPlan(kit);
  const tables = () => reportTables(ledger, kit);
  const group = (g: OtherGrouping) => {
    setGrouping(g);
    storage.setJSON(GROUPING_KEY, g);
  };
  const start = kit.windows.length > 0 && (
    <button
      type="button"
      className="btn-primary invest-web-start"
      aria-expanded={copying}
      onClick={() => setCopying(!copying)}
    >
      <Icon name="clipboard" /> {t(`${k}.start`)}
    </button>
  );
  const files = (
    <div className="button-row">
      <button
        type="button"
        className={compact ? 'btn-primary' : 'btn-secondary'}
        onClick={() => download(copyFileName(ledger.year, 'xlsx'), xlsxBlob(xlsxOf(tables())))}
      >
        <Icon name="download" /> {t(`${k}.xlsx`)}
      </button>
      <button
        type="button"
        className="btn-secondary"
        onClick={async () =>
          download(
            copyFileName(ledger.year, 'pdf'),
            await reportPdf(t(`${k}.pdfTitle`, { year: ledger.year }), tables())
          )
        }
      >
        <Icon name="file" /> {t(`${k}.pdf`)}
      </button>
    </div>
  );
  return (
    <section id={id} className="renta-block invest-web" aria-labelledby={titleId} tabIndex={-1}>
      <h4 id={titleId} className="invest-web-title">
        <Icon name="clipboard" /> {t(`${k}.title`)}
      </h4>
      {plan.rows > 0 ? (
        <p className="invest-web-lead">
          {t(`${k}.lead${plan.rows === 1 ? 'One' : ''}`, {
            rows: plan.rows,
            minutes: plan.minutes,
          })}
        </p>
      ) : (
        <p className="invest-web-lead">{t(`${k}.onlyBoxes`)}</p>
      )}
      {start}
      {copying && <CopyMode kit={kit} grouping={grouping} />}
      <PlanWindows plan={plan} />
      {!compact && <Grouping ledger={ledger} value={grouping} onChange={group} />}
      {!compact && plan.example && (
        <>
          <h5>{t(`${k}.stepsTitle`)}</h5>
          <ol className="invest-web-steps">
            <li>{t(`${k}.step1`, { apartado: APARTADO })}</li>
            <li>{t(`${k}.step2`)}</li>
            <li>{t(`${k}.step3`)}</li>
          </ol>
          <RouteMap kit={kit} />
          <Example plan={plan} />
          <p className="section-hint">{t(`${k}.intro`)}</p>
        </>
      )}
      {!compact && <KitWarnings warnings={kit.warnings} />}
      {files}
      {!compact && <p className="section-hint">{t(`${k}.filesHint`)}</p>}
    </section>
  );
}
