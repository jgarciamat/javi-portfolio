import { useMemo, useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import type { ImportedSavings } from '../../../domain/rentaGains';
import { FORMATS } from '../../../domain/invest/formats';
import { withTyped, type RateTable } from '../../../domain/invest/fx';
import { buildLedger, type ValuedOp } from '../../../domain/invest/ledger';
import { headerKey, readMapped, type Mapping } from '../../../domain/invest/mapping';
import type { CertificateLine } from '../../../domain/invest/pdfReports';
import { declarationRows, reportTables } from '../../../domain/invest/report';
import type { InvestOp } from '../../../domain/invest/types';
import {
  download,
  readEcbFile,
  readInvestFile,
  rememberMapping,
  reportPdf,
  saveRates,
  savedRates,
  xlsxBlob,
  xlsxOf,
  type FileReading,
} from '../../../application/investImport';
import { useMoney } from '../shared';
import { InvestGuide } from './InvestGuide';
import { InvestMapping } from './InvestMapping';
import { DeclarationTable, OpsTable, WarningsList, type OpEdit } from './InvestTables';

const WITHHELD_IN = Object.fromEntries(
  FORMATS.filter((f) => f.withheldIn).map((f) => [f.id, f.withheldIn as 'origin' | 'spain'])
);

/** The certificate lines the person ticked, added to what the files gave. */
function withCertificate(base: ImportedSavings, lines: CertificateLine[]): ImportedSavings {
  const out: ImportedSavings = {
    ...base,
    capital: { ...base.capital },
    otherGains: [...base.otherGains],
    withheld: { ...base.withheld },
  };
  for (const l of lines) {
    if (l.field === 'interest') out.capital.interest += l.amount;
    if (l.field === 'dividends') out.capital.dividends += l.amount;
    if (l.field === 'expenses') out.capital.expenses += l.amount;
    if (l.field === 'withheld') out.withheld.capital += l.amount;
    if (l.field === 'gains') out.otherGains.push(l.amount);
    if (l.field === 'losses') out.otherGains.push(-l.amount);
  }
  return out;
}

/** A purchase (or sale) the files do not have, typed by the person: an earlier year, another bank. */
function AddOperation({ onAdd }: { onAdd: (op: InvestOp) => void }) {
  const { t } = useI18n();
  const k = 'tools.invest.add';
  const [draft, setDraft] = useState({ date: '', kind: 'buy', asset: '', units: '', eur: '' });
  const ready = draft.date && draft.asset && parseDecimal(draft.units) > 0;
  return (
    <details className="renta-group">
      <summary>{t(`${k}.title`)}</summary>
      <p className="section-hint">{t(`${k}.hint`)}</p>
      <div className="tools-form">
        <label className="tools-field">
          <span>{t(`${k}.date`)}</span>
          <input
            className="tx-input"
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          />
        </label>
        <label className="tools-field">
          <span>{t(`${k}.kind`)}</span>
          <select
            className="tx-input"
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
          >
            <option value="buy">{t('tools.invest.kind.buy')}</option>
            <option value="sell">{t('tools.invest.kind.sell')}</option>
          </select>
        </label>
        {(['asset', 'units', 'eur'] as const).map((f) => (
          <label key={f} className="tools-field">
            <span>{t(`${k}.${f}`)}</span>
            <input
              className="tx-input"
              inputMode={f === 'asset' ? 'text' : 'decimal'}
              value={draft[f]}
              onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <button
        className="btn-secondary"
        disabled={!ready}
        onClick={() => {
          const eur = parseDecimal(draft.eur);
          onAdd({
            id: `manual:${Date.now()}`,
            format: 'manual',
            account: t(`${k}.account`),
            date: draft.date,
            at: `${draft.date}T00:00:00`,
            kind: draft.kind as 'buy' | 'sell',
            asset: draft.asset.trim().toUpperCase(),
            assetClass: 'crypto',
            units: parseDecimal(draft.units),
            amount: Number.isFinite(eur) ? eur : null,
            currency: 'EUR',
            eur: Number.isFinite(eur) ? eur : null,
            fee: 0,
            feeCurrency: null,
          });
          setDraft({ date: '', kind: 'buy', asset: '', units: '', eur: '' });
        }}
      >
        {t(`${k}.button`)}
      </button>
    </details>
  );
}

/** Exchange rates: the ECB file the person downloads, or a rate typed for a currency. */
function Rates({
  missing,
  rates,
  onChange,
}: {
  missing: string[];
  rates: RateTable;
  onChange: (rates: RateTable) => void;
}) {
  const { t } = useI18n();
  const k = 'tools.invest.rates';
  const input = useRef<HTMLInputElement>(null);
  const loaded = Object.keys(rates).length;
  return (
    <fieldset className="renta-block">
      <legend>{t(`${k}.title`)}</legend>
      <p className="section-hint">{t(`${k}.hint`)}</p>
      {loaded > 0 && <p className="section-hint">{t(`${k}.loaded`, { count: loaded })}</p>}
      <input
        ref={input}
        type="file"
        accept=".csv,.zip"
        hidden
        aria-label={t(`${k}.file`)}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) onChange({ ...rates, ...(await readEcbFile(file)) });
        }}
      />
      <button className="btn-secondary" onClick={() => input.current?.click()}>
        {t(`${k}.load`)}
      </button>
      {missing.map((currency) => (
        <label key={currency} className="tools-field">
          <span>{t(`${k}.typed`, { currency })}</span>
          <input
            className="tx-input"
            inputMode="decimal"
            onBlur={(e) => {
              const n = parseDecimal(e.target.value);
              if (n > 0) onChange(withTyped(rates, currency, n));
            }}
          />
        </label>
      ))}
    </fieldset>
  );
}

/**
 * «Importar mis inversiones»: drop the files of brokers, exchanges and fund managers; the app reads
 * them on the device, shows every operation, asks what is missing and takes the result to the Renta.
 */
export function InvestImport({
  year,
  onApply,
}: {
  year: number;
  onApply: (imported: ImportedSavings) => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const k = 'tools.invest';
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileReading[]>([]);
  const [mapped, setMapped] = useState<Record<string, InvestOp[]>>({});
  const [manual, setManual] = useState<InvestOp[]>([]);
  const [edits, setEdits] = useState<Record<string, OpEdit>>({});
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [rates, setRatesState] = useState<RateTable>(savedRates);
  const [professional, setProfessional] = useState(false);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  const [dragging, setDragging] = useState(false);

  const setRates = (next: RateTable) => {
    setRatesState(next);
    saveRates(next);
  };

  const add = async (list: File[]) => {
    setBusy(true);
    const read = await Promise.all(list.map(readInvestFile));
    setFiles((prev) => [...prev, ...read]);
    setBusy(false);
    setApplied(false);
  };

  const raw = useMemo(
    () => [
      ...files.flatMap((f) => f.readings.flatMap((r) => r.ops)),
      ...Object.values(mapped).flat(),
      ...manual,
    ],
    [files, mapped, manual]
  );
  const ops = useMemo(() => {
    return raw
      .filter((op) => !edits[op.id]?.removed)
      .map((op) => {
        const e = edits[op.id];
        if (!e) return op;
        return {
          ...op,
          assetClass: e.assetClass ?? op.assetClass,
          eur: e.eur ?? op.eur,
        };
      });
  }, [raw, edits]);

  const ledger = useMemo(
    () => buildLedger(ops, { year, rates, professional, withheldIn: WITHHELD_IN }),
    [ops, year, rates, professional]
  );
  const rows = useMemo(() => declarationRows(ledger), [ledger]);
  const certificate = files.flatMap((f) =>
    f.certificate.map((line, i) => ({ key: `${f.file}|${i}`, line }))
  );
  const imported = withCertificate(
    { ...ledger.imported, files: files.map((f) => f.file) },
    certificate.filter((c) => ticked[c.key]).map((c) => c.line)
  );
  const missingRates = ledger.warnings
    .filter((w) => w.code === 'missingRate')
    .map((w) => w.asset as string);
  // Every operation, also those the person took out, so they can be put back.
  const byId = new Map(ledger.ops.map((o) => [o.id, o]));
  const valued: ValuedOp[] = raw.map(
    (op) => byId.get(op.id) ?? { ...op, value: op.eur, feeEur: 0 }
  );

  const report = () => reportTables(ledger);
  const title = t(`${k}.reportTitle`, { year });

  return (
    <section className="renta-block invest-import" aria-labelledby="invest-title">
      <h3 id="invest-title">{t(`${k}.title`)}</h3>
      <p className="renta-privacy" role="note">
        {t(`${k}.privacy`)}
      </p>
      <div
        className={`invest-drop${dragging ? ' invest-drop-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void add(Array.from(e.dataTransfer.files));
        }}
      >
        <p>{t(`${k}.drop`)}</p>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept=".csv,.txt,.xlsx,.xlsm,.json,.pdf"
          aria-label={t(`${k}.file`)}
          onChange={(e) => void add(Array.from(e.target.files ?? []))}
        />
        <button className="btn-primary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? t(`${k}.reading`) : t(`${k}.choose`)}
        </button>
        <p className="section-hint">{t(`${k}.formats`)}</p>
      </div>

      {files.map((f) => (
        <div key={f.file} className="renta-block">
          <h4>{f.file}</h4>
          {f.error && <p className="form-error">{t(`${k}.error.${f.error}`)}</p>}
          {f.readings.map((r, i) =>
            r.format ? (
              <p key={i} className="section-hint">
                {t(`${k}.recognised`, {
                  platform: r.format.platform,
                  file: r.format.file,
                  count: r.ops.length,
                })}
                {r.skipped > 0 && ` ${t(`${k}.skipped`, { count: r.skipped })}`}
                {r.format.confirmed === null && ` ${t(`${k}.unconfirmedFormat`)}`}
              </p>
            ) : (
              <div key={i}>
                <p className="section-hint">{t(`${k}.unknown`, { table: r.table })}</p>
                {mapped[`${f.file}|${r.table}`] ? (
                  <p className="section-hint">
                    {t(`${k}.mapped`, { count: mapped[`${f.file}|${r.table}`].length })}
                  </p>
                ) : (
                  <InvestMapping
                    header={r.header}
                    onRead={(mapping: Mapping) => {
                      rememberMapping(headerKey(r.header), mapping);
                      const table = f.tables.find((tb) => tb.name === r.table) as NonNullable<
                        (typeof f.tables)[number]
                      >;
                      const { ops: read } = readMapped(table.rows, r.headerRow, mapping, f.file);
                      setMapped((m) => ({ ...m, [`${f.file}|${r.table}`]: read }));
                    }}
                  />
                )}
              </div>
            )
          )}
        </div>
      ))}

      {certificate.length > 0 && (
        <fieldset className="renta-block">
          <legend>{t(`${k}.cert.title`)}</legend>
          <p className="section-hint">{t(`${k}.cert.hint`)}</p>
          {certificate.map(({ key, line }) => (
            <label key={key} className="renta-check">
              <input
                type="checkbox"
                checked={!!ticked[key]}
                onChange={(e) => setTicked({ ...ticked, [key]: e.target.checked })}
              />
              <span>
                {t(`${k}.cert.${line.field}`)}: {money(line.amount)} — «{line.line}»
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {(ops.length > 0 || certificate.length > 0) && (
        <>
          {missingRates.length > 0 || Object.keys(rates).length > 0 ? (
            <Rates missing={missingRates} rates={rates} onChange={setRates} />
          ) : null}
          <OpsTable
            ops={valued}
            edits={edits}
            onEdit={(id, edit) => {
              setEdits({ ...edits, [id]: edit });
              setApplied(false);
            }}
          />
          <AddOperation onAdd={(op) => setManual([...manual, op])} />
          <label className="renta-check">
            <input
              type="checkbox"
              checked={professional}
              onChange={(e) => setProfessional(e.target.checked)}
            />
            <span>{t(`${k}.professional`)}</span>
          </label>
          <h4>{t(`${k}.warn.title`)}</h4>
          <WarningsList warnings={ledger.warnings} />
          <h4>{t(`${k}.decl.title`, { year })}</h4>
          <DeclarationTable ledger={ledger} rows={rows} />
          <div className="button-row">
            <button
              className="btn-secondary"
              onClick={() => download(`inversiones-${year}.xlsx`, xlsxBlob(xlsxOf(report())))}
            >
              {t(`${k}.xlsx`)}
            </button>
            <button
              className="btn-secondary"
              onClick={async () =>
                download(`inversiones-${year}.pdf`, await reportPdf(title, report()))
              }
            >
              {t(`${k}.pdf`)}
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                onApply(imported);
                setApplied(true);
              }}
            >
              {t(`${k}.apply`)}
            </button>
          </div>
          {applied && (
            <p className="section-hint" role="status">
              {t(`${k}.applied`)}
            </p>
          )}
          <InvestGuide ledger={ledger} rows={rows} open />
        </>
      )}
      {ops.length === 0 && certificate.length === 0 && <InvestGuide />}
    </section>
  );
}
