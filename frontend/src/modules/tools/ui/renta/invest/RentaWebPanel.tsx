import { useMemo, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { storage } from '@shared/utils/storage';
import type { LedgerResult } from '../../../domain/invest/ledger';
import { copyFileName, reportTables } from '../../../domain/invest/report';
import {
  APARTADO,
  rentaWebKit,
  type Alta,
  type KitWarning,
  type RentaWebKit,
} from '../../../domain/invest/rentaWeb';
import { download, reportPdf, xlsxBlob, xlsxOf } from '../../../application/investImport';
import { useMoney } from '../shared';

/** What is copied into Renta WEB: an amount with a decimal comma and no thousands separator. */
export const forRentaWeb = (value: string | number) =>
  typeof value === 'number' ? value.toFixed(2).replace('.', ',') : value;

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
export function CopyMode({ kit }: { kit: RentaWebKit }) {
  const { t } = useI18n();
  const money = useMoney();
  const k = 'tools.invest.web';
  const steps = stepsOf(kit);
  const doneKey = `renta.invest.copied.${kit.year}`;
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

/** The file to copy into Renta WEB (Excel and PDF) and the step by step mode, for a ledger. */
export function RentaWebPanel({ ledger }: { ledger: LedgerResult }) {
  const { t } = useI18n();
  const k = 'tools.invest.web';
  const kit = useMemo(() => rentaWebKit(ledger), [ledger]);
  const [copying, setCopying] = useState(false);
  if (kit.windows.length === 0 && kit.totals.length === 0) return null;
  const tables = () => reportTables(ledger, kit);
  return (
    <section className="renta-block invest-web" aria-labelledby="invest-web-title">
      <h4 id="invest-web-title">{t(`${k}.title`)}</h4>
      <p className="section-hint">{t(`${k}.intro`)}</p>
      <KitWarnings warnings={kit.warnings} />
      <div className="button-row">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => download(copyFileName(ledger.year, 'xlsx'), xlsxBlob(xlsxOf(tables())))}
        >
          {t(`${k}.xlsx`)}
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
          {t(`${k}.pdf`)}
        </button>
        {kit.windows.length > 0 && (
          <button
            type="button"
            className="btn-primary"
            aria-expanded={copying}
            onClick={() => setCopying(!copying)}
          >
            {t(`${k}.start`)}
          </button>
        )}
      </div>
      {copying && <CopyMode kit={kit} />}
    </section>
  );
}
