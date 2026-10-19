import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import type { LedgerResult, ValuedOp } from '../../../domain/invest/ledger';
import { SECTION_BOXES, summaryOf, type DeclarationRow } from '../../../domain/invest/report';
import type { AssetClass, InvestWarning } from '../../../domain/invest/types';
import { useMoney } from '../shared';
import { CLASSES } from './InvestMapping';

/** What the person changed of a row: its class, its euros, or that it does not count. */
export interface OpEdit {
  assetClass?: AssetClass;
  eur?: number;
  removed?: boolean;
}

const date = (iso: string) => iso.split('-').reverse().join('/');
const units = (n: number) => (Math.round(n * 1e8) / 1e8).toLocaleString('es-ES');

/** The operations read, to check them and correct what the file did not say. */
export function OpsTable({
  ops,
  edits,
  onEdit,
}: {
  ops: ValuedOp[];
  edits: Record<string, OpEdit>;
  onEdit: (id: string, edit: OpEdit) => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const k = 'tools.invest.ops';
  return (
    <div className="renta-compare-scroll">
      <table className="renta-compare-table invest-ops">
        <caption>{t(`${k}.caption`, { count: ops.length })}</caption>
        <thead>
          <tr>
            <th scope="col">{t(`${k}.date`)}</th>
            <th scope="col">{t(`${k}.platform`)}</th>
            <th scope="col">{t(`${k}.kind`)}</th>
            <th scope="col">{t(`${k}.asset`)}</th>
            <th scope="col">{t(`${k}.units`)}</th>
            <th scope="col">{t(`${k}.value`)}</th>
            <th scope="col">{t(`${k}.class`)}</th>
            <th scope="col">{t(`${k}.counts`)}</th>
          </tr>
        </thead>
        <tbody>
          {ops.map((op) => {
            const edit = edits[op.id] ?? {};
            const label = `${op.asset} ${date(op.date)}`;
            return (
              <tr key={op.id} className={op.value === null ? 'renta-compare-differs' : undefined}>
                <td data-label={t(`${k}.date`)}>{date(op.date)}</td>
                <td data-label={t(`${k}.platform`)}>{op.account}</td>
                <td data-label={t(`${k}.kind`)}>
                  {t(`tools.invest.kind.${op.kind}`)}
                  {op.reward && ` (${t(`tools.invest.reward.${op.reward}`)})`}
                  {op.toAsset && ` → ${op.toAsset}`}
                </td>
                <td data-label={t(`${k}.asset`)}>{op.name ?? op.asset}</td>
                <td data-label={t(`${k}.units`)}>{units(op.units)}</td>
                <td data-label={t(`${k}.value`)}>
                  <input
                    className="tx-input"
                    inputMode="decimal"
                    aria-label={t(`${k}.valueOf`, { what: label })}
                    placeholder={op.value === null ? t(`${k}.missing`) : money(op.value)}
                    defaultValue={edit.eur === undefined ? '' : String(edit.eur).replace('.', ',')}
                    onBlur={(e) => {
                      const n = parseDecimal(e.target.value);
                      onEdit(op.id, { ...edit, eur: Number.isFinite(n) ? n : undefined });
                    }}
                  />
                </td>
                <td data-label={t(`${k}.class`)}>
                  <select
                    className="tx-input"
                    aria-label={t(`${k}.classOf`, { what: label })}
                    value={edit.assetClass ?? op.assetClass}
                    onChange={(e) =>
                      onEdit(op.id, { ...edit, assetClass: e.target.value as AssetClass })
                    }
                  >
                    {[...CLASSES, 'fiat' as const].map((c) => (
                      <option key={c} value={c}>
                        {t(`tools.invest.class.${c}`)}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label={t(`${k}.counts`)}>
                  <input
                    type="checkbox"
                    aria-label={t(`${k}.countsOf`, { what: label })}
                    checked={!edit.removed}
                    onChange={(e) => onEdit(op.id, { ...edit, removed: !e.target.checked })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** What to look at before taking it to the Renta, in plain words. */
export function WarningsList({ warnings }: { warnings: InvestWarning[] }) {
  const { t } = useI18n();
  const money = useMoney();
  if (warnings.length === 0) return <p className="section-hint">{t('tools.invest.warn.none')}</p>;
  return (
    <ul className="renta-notes" aria-label={t('tools.invest.warn.title')}>
      {warnings.map((w, i) => (
        <li key={i}>
          {t(`tools.invest.warn.${w.code}`, {
            asset: w.asset ?? '',
            amount: money(w.amount ?? 0),
          })}
        </li>
      ))}
    </ul>
  );
}

/** The figures to copy, as Renta WEB asks for them, with the number of each box. */
export function DeclarationTable({
  ledger,
  rows,
}: {
  ledger: LedgerResult;
  rows: DeclarationRow[];
}) {
  const { t } = useI18n();
  const money = useMoney();
  const k = 'tools.invest.decl';
  const sum = summaryOf(ledger, rows);
  const capital: [string, number][] = (
    [
      ['0027', sum.capital['0027']],
      ['0029', sum.capital['0029']],
      ['0031', sum.capital['0031']],
      ['0037', sum.capital['0037']],
      ['0597', sum.capital['0597']],
      ['0603', sum.capital['0603']],
      ['0588', sum.capital.foreignTax],
      ['0304', sum.general],
    ] as [string, number][]
  ).filter(([, v]) => v !== 0);
  return (
    <>
      {rows.length > 0 && (
        <div className="renta-compare-scroll">
          <table className="renta-compare-table">
            <caption>{t(`${k}.caption`)}</caption>
            <thead>
              <tr>
                <th scope="col">{t(`${k}.section`)}</th>
                <th scope="col">{t(`${k}.name`)}</th>
                <th scope="col">{t(`${k}.proceeds`)}</th>
                <th scope="col">{t(`${k}.cost`)}</th>
                <th scope="col">{t(`${k}.result`)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const boxes = SECTION_BOXES[r.section];
                const result = r.gain - r.lossCounted;
                return (
                  <tr key={i}>
                    <td data-label={t(`${k}.section`)}>{t(`tools.invest.section.${r.section}`)}</td>
                    <td data-label={t(`${k}.name`)}>
                      {r.name}
                      {r.counterpart && ` · ${t(`${k}.key`, { key: r.counterpart })}`}
                      {r.sales > 1 && ` · ${t(`${k}.sales`, { count: r.sales })}`}
                    </td>
                    <td data-label={t(`${k}.proceeds`)}>
                      [{boxes.proceeds}] {money(r.proceeds)}
                    </td>
                    <td data-label={t(`${k}.cost`)}>
                      [{boxes.cost}] {money(r.cost)}
                    </td>
                    <td data-label={t(`${k}.result`)}>
                      [{result >= 0 ? boxes.gain : boxes.counted}] {money(result)}
                      {r.loss > r.lossCounted && ` (${t(`${k}.deferred`)})`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {capital.length > 0 && (
        <ul className="renta-minimum" aria-label={t(`${k}.capital`)}>
          {capital.map(([box, v]) => (
            <li key={box}>
              <span>{t(`${k}.box.${box}`)}</span>
              <strong>
                [{box}] {money(v)}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
