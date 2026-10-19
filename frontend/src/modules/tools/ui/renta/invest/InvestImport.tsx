import { FileDropZone } from '@shared/components/FileDropZone';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { parseDecimal } from '@shared/utils/numbers';
import type { ImportedSavings } from '../../../domain/rentaGains';
import { withheldInOf } from '../../../domain/invest/formats';
import { withTyped, type RateTable } from '../../../domain/invest/fx';
import { buildLedger, inEuros, type ValuedOp } from '../../../domain/invest/ledger';
import { headerKey, readMapped, type Mapping } from '../../../domain/invest/mapping';
import { declarationRows } from '../../../domain/invest/report';
import { importedFrom } from '../../../domain/invest/sources';
import {
  importSummary,
  type ImportSummary,
  type RentaEffect,
} from '../../../domain/invest/summary';
import type { RecoverYear } from '../../../domain/invest/recover';
import type { PendingBalance } from '../../../domain/rentaGains';
import type { InvestOp } from '../../../domain/invest/types';
import {
  loadBundledRates,
  readEcbFile,
  readInvestFile,
  rememberMapping,
  saveRates,
  savedRates,
  type BundledRates,
  type FileReading,
} from '../../../application/investImport';
import { useMoney } from '../shared';
import { InvestGuide } from './InvestGuide';
import { InvestMapping } from './InvestMapping';
import { InvestSummary } from './InvestSummary';
import { RentaWebPanel } from './RentaWebPanel';
import { DeclarationTable, OpsTable, WarningsList, type OpEdit } from './InvestTables';

const WITHHELD_IN = withheldInOf();

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

const INVEST_ACCEPT = '.csv,.txt,.xlsx,.xlsm,.json,.pdf';
const ECB_ACCEPT = '.csv,.zip';

/** Exchange rates: the ECB file the person downloads, or a rate typed for a currency. */
function Rates({
  missing,
  rates,
  until,
  onChange,
}: {
  missing: string[];
  rates: RateTable;
  until?: string;
  onChange: (rates: RateTable) => void;
}) {
  const { t } = useI18n();
  const k = 'tools.invest.rates';
  const input = useRef<HTMLInputElement>(null);
  const loaded = Object.keys(rates).length;
  const load = async (file: File) => onChange({ ...rates, ...(await readEcbFile(file)) });
  return (
    <FileDropZone accept={ECB_ACCEPT} onFiles={(list) => void load(list[0])}>
      <fieldset className="renta-block">
        <legend>{t(`${k}.title`)}</legend>
        <p className="section-hint">{t(`${k}.hint`)}</p>
        {until && <p className="section-hint">{t(`${k}.bundled`, { date: until })}</p>}
        {loaded > 0 && <p className="section-hint">{t(`${k}.loaded`, { count: loaded })}</p>}
        <input
          ref={input}
          type="file"
          accept={ECB_ACCEPT}
          hidden
          aria-label={t(`${k}.file`)}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void load(file);
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
    </FileDropZone>
  );
}

/**
 * «Importar mis inversiones»: drop the files of brokers, exchanges and fund managers; the app reads
 * them on the device, shows every operation, asks what is missing and takes the result to the Renta.
 */
export function InvestImport({
  year,
  onApply,
  effectOf,
  autoApply = false,
  recoverOf,
  onPending,
}: {
  year: number;
  /** null: every file was taken out after it had been taken to the Renta. */
  onApply: (imported: ImportedSavings | null) => void;
  /** What the import means for the Renta (the engine with and without it), when it can be known. */
  effectOf?: (imported: ImportedSavings) => RentaEffect;
  /** Takes every change to the Renta at once (the person does not have to press the button). */
  autoApply?: boolean;
  /** «¿Puedo recuperar ese dinero?» for the summary of the files. */
  recoverOf?: (summary: ImportSummary) => RecoverYear[];
  /** Takes the losses of earlier years to the pending balances of the planner. */
  onPending?: (losses: PendingBalance[]) => void;
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
  // A file taken out after «Llevar a mi Renta»: the Renta is worked out again with the rest.
  const [reapply, setReapply] = useState(false);
  const [removed, setRemoved] = useState<string | null>(null);

  const [bundled, setBundled] = useState<BundledRates | null>(null);
  useEffect(() => {
    let live = true;
    void loadBundledRates().then((b) => live && setBundled(b));
    return () => {
      live = false;
    };
  }, []);

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

  // What the person loaded or typed wins over the rates that come with the app.
  const allRates = useMemo(() => ({ ...bundled?.rates, ...rates }), [bundled, rates]);
  const ledger = useMemo(
    () => buildLedger(ops, { year, rates: allRates, professional, withheldIn: WITHHELD_IN }),
    [ops, year, allRates, professional]
  );
  const rows = useMemo(() => declarationRows(ledger), [ledger]);
  const summary = importSummary(ledger, year);
  const certificate = files.flatMap((f) =>
    f.certificate.map((line, i) => ({ key: `${f.file}|${i}`, line }))
  );
  // What goes to the Renta, kept file by file in euros so that one can be taken out later.
  const imported = useMemo(() => {
    const euros = new Map(inEuros(ops, allRates).map((o) => [o.id, o]));
    const own = (list: InvestOp[]) => list.flatMap((o) => euros.get(o.id) ?? []);
    const sources = [
      ...files.map((f) => ({
        file: f.file,
        ops: own([
          ...f.readings.flatMap((r) => r.ops),
          ...Object.entries(mapped)
            .filter(([key]) => key.startsWith(`${f.file}|`))
            .flatMap(([, list]) => list),
        ]),
        certificate: f.certificate.filter((_, i) => ticked[`${f.file}|${i}`]),
      })),
      { file: '', ops: own(manual), certificate: [] },
    ];
    return importedFrom(
      sources,
      { year, professional },
      files.map((f) => f.file)
    );
  }, [ops, allRates, files, mapped, manual, ticked, year, professional]);
  const hasData = files.length > 0 || manual.length > 0;
  const sent = useRef<ImportedSavings | null>(null);
  useEffect(() => {
    if (!autoApply || !hasData || sent.current === imported) return;
    sent.current = imported;
    onApply(imported);
    setApplied(true);
  }, [autoApply, hasData, imported, onApply]);
  useEffect(() => {
    if (!reapply) return;
    setReapply(false);
    onApply(files.length > 0 || manual.length > 0 ? imported : null);
  }, [reapply, imported, files, manual, onApply]);

  /** Takes a file out with all that came from it: its rows, mapping, edits and ticked lines. */
  const removeFile = (f: FileReading) => {
    const keys = Object.keys(mapped).filter((key) => key.startsWith(`${f.file}|`));
    const ids = new Set(
      [...f.readings.flatMap((r) => r.ops), ...keys.flatMap((key) => mapped[key])].map((o) => o.id)
    );
    const tickedHere = Object.keys(ticked).filter((key) => key.startsWith(`${f.file}|`));
    const touched =
      [...ids].some((id) => edits[id]) || tickedHere.some((key) => ticked[key]) || keys.length > 0;
    if (touched && !window.confirm(t(`${k}.removeConfirm`, { file: f.file }))) return;
    const drop = <T,>(record: Record<string, T>, gone: (key: string) => boolean) =>
      Object.fromEntries(Object.entries(record).filter(([key]) => !gone(key)));
    setFiles((list) => list.filter((x) => x !== f));
    setMapped((m) => drop(m, (key) => keys.includes(key)));
    setEdits((e) => drop(e, (id) => ids.has(id)));
    setTicked((tk) => drop(tk, (key) => tickedHere.includes(key)));
    setRemoved(f.file);
    if (applied) setReapply(true);
  };
  const missingRates = ledger.warnings
    .filter((w) => w.code === 'missingRate')
    .map((w) => w.asset as string);
  // Every operation, also those the person took out, so they can be put back.
  const byId = new Map(ledger.ops.map((o) => [o.id, o]));
  const valued: ValuedOp[] = raw.map(
    (op) => byId.get(op.id) ?? { ...op, value: op.eur, feeEur: 0 }
  );

  return (
    <section className="renta-block invest-import" aria-labelledby="invest-title">
      <h3 id="invest-title">{t(`${k}.title`)}</h3>
      <p className="renta-privacy" role="note">
        {t(`${k}.privacy`)}
      </p>
      <FileDropZone
        className="invest-drop"
        multiple
        accept={INVEST_ACCEPT}
        onFiles={(list) => void add(list)}
      >
        <p>{t(`${k}.drop`)}</p>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept={INVEST_ACCEPT}
          aria-label={t(`${k}.file`)}
          onChange={(e) => void add(Array.from(e.target.files ?? []))}
        />
        <button className="btn-primary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? t(`${k}.reading`) : t(`${k}.choose`)}
        </button>
        <p className="section-hint">{t(`${k}.formats`)}</p>
      </FileDropZone>

      {/* Right after reading the files: what to copy into Renta WEB, before any detail. */}
      {(ops.length > 0 || certificate.length > 0) && <RentaWebPanel ledger={ledger} />}

      {removed && (
        <p className="section-hint" role="status">
          {t(applied ? `${k}.removedApplied` : `${k}.removed`, { file: removed })}
        </p>
      )}
      {files.map((f) => (
        <div key={f.file} className="renta-block">
          <div className="invest-file">
            <h4>{f.file}</h4>
            <button
              type="button"
              className="btn-secondary"
              aria-label={t(`${k}.removeFileOf`, { file: f.file })}
              onClick={() => removeFile(f)}
            >
              <Icon name="trash" /> {t(`${k}.removeFile`)}
            </button>
          </div>
          {f.error && <p className="form-error">{t(`${k}.error.${f.error}`)}</p>}
          {f.readings.map((r, i) =>
            r.info ? (
              <p key={i} className="section-hint">
                {t(`${k}.info`, { table: r.table })}
              </p>
            ) : r.format ? (
              <p key={i} className="section-hint">
                {t(`${k}.recognised`, {
                  platform: r.format.platform,
                  file: r.format.file,
                  count: r.ops.length,
                })}
                {r.skipped > 0 && ` ${t(`${k}.skipped`, { count: r.skipped })}`}
                {r.format.confirmed === null && ` ${t(`${k}.formatCheck`)}`}
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
          {missingRates.length > 0 || Object.keys(rates).length > 0 || bundled ? (
            <Rates
              missing={missingRates}
              rates={rates}
              until={bundled?.until}
              onChange={setRates}
            />
          ) : null}
          <OpsTable
            ops={valued}
            resetKey={files.map((f) => f.file).join('|')}
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
          <InvestSummary
            summary={summary}
            year={year}
            effect={effectOf ? effectOf(imported) : null}
            recover={recoverOf ? recoverOf(summary) : []}
            onPending={onPending}
          />
        </>
      )}
      {ops.length === 0 && certificate.length === 0 && <InvestGuide />}
    </section>
  );
}
