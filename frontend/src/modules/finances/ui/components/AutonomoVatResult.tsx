import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import type { AutonomoDraft, Draft349, Draft390, TaxBox } from '@modules/finances/domain/types';

type Translate = ReturnType<typeof useI18n>['t'];
type Money = ReturnType<typeof useFormat>['money'];

type Model = '303' | '349' | '390';
/** Boxes that hold a percentage, not money: the rates of the 303, the prorrata of the 390. */
const PERCENT: Record<Model, Set<string>> = {
  '303': new Set(['02', '05', '08', '151', '157', '169', '17', '20', '23', '65']),
  '349': new Set(),
  '390': new Set(['118']),
};
/** Boxes of the 349 that count operators. */
const COUNTS = new Set(['operadores', 'operadoresRect']);
/** The rate boxes of the 303 and the base box they go with. */
const RATE_OF: Record<string, string> = {
  '02': '01',
  '05': '04',
  '08': '07',
  '151': '150',
  '157': '156',
  '169': '168',
  // Up to 3T 2024 the 0.5 % surcharge goes in 16-18 (with the 0 % and the 0.62 % ones).
  '17': '16',
  '20': '19',
  '23': '22',
};

const value = (b: TaxBox, money: Money, model: Model): string =>
  PERCENT[model].has(b.box)
    ? `${b.amount} %`
    : COUNTS.has(b.box)
      ? String(b.amount)
      : money(b.amount);

/**
 * The boxes worth showing first (with an amount) and the ones that are zero, folded. A rate shows
 * when its base has an amount; box 65 (100 %) only with the result around it.
 */
export function splitBoxes(
  boxes: TaxBox[],
  model: Model = '303'
): { shown: TaxBox[]; zero: TaxBox[] } {
  const amounts = new Map(boxes.map((b) => [b.box, b.amount]));
  const isShown = (b: TaxBox) => {
    if (model !== '303') return b.amount !== 0;
    const base = RATE_OF[b.box];
    if (base) return (amounts.get(base) ?? 0) !== 0;
    if (b.box === '65') return (amounts.get('66') ?? 0) !== 0;
    return b.amount !== 0;
  };
  return { shown: boxes.filter(isShown), zero: boxes.filter((b) => !isShown(b)) };
}

function Table({ boxes, model }: { boxes: TaxBox[]; model: Model }) {
  const { t } = useI18n();
  const { money } = useFormat();
  return (
    <table>
      <thead>
        <tr>
          <th>{t('app.autonomo.box')}</th>
          <th>{t('app.autonomo.concept')}</th>
          <th>{t('app.autonomo.amount')}</th>
        </tr>
      </thead>
      <tbody>
        {boxes.map((b) => (
          <tr key={`${b.box}-${b.label}`}>
            <td>{b.box}</td>
            <td>{b.label}</td>
            <td>{value(b, money, model)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A group of boxes as the form prints them, the ones at zero folded underneath. */
export function BoxGroup({
  title,
  boxes,
  model,
}: {
  title: string;
  boxes: TaxBox[];
  model: Model;
}) {
  const { t } = useI18n();
  const { shown, zero } = splitBoxes(boxes, model);
  return (
    <div className="autonomo-boxes">
      <h5>{title}</h5>
      {shown.length > 0 ? (
        <Table boxes={shown} model={model} />
      ) : (
        <p className="section-hint">{t('app.autonomo.vatr.allZero')}</p>
      )}
      {zero.length > 0 && (
        <details className="autonomo-zero">
          <summary>{t('app.autonomo.vatr.zero', { n: zero.length })}</summary>
          <Table boxes={zero} model={model} />
        </details>
      )}
    </div>
  );
}

const box = (boxes: TaxBox[] | undefined, id: string): number =>
  boxes?.find((b) => b.box === id)?.amount ?? 0;

/** The deadline of a model, from the list of the draft. */
function Deadline({ draft, model }: { draft: AutonomoDraft; model: string }) {
  const { t } = useI18n();
  const { date } = useFormat();
  const found = draft.deadlines.find((d) => d.model === model);
  if (!found) return null;
  return (
    <p className="autonomo-deadline">
      {t('app.autonomo.vatr.deadline', { model, date: date(found.date) })}
    </p>
  );
}

/** The additional information of the 303 in plain words: what went where, and what it brings. */
function infoSentences(t: Translate, money: Money, info: TaxBox[]): string[] {
  return ['59', '60', '120', '122', '123', '124', '62']
    .filter((id) => box(info, id) !== 0)
    .map((id) => t(`app.autonomo.vatr.info.${id}`, { amount: money(box(info, id)) }));
}

/** The modelo 303 with all its boxes, grouped as the form, with its warnings and its deadline. */
export function Vat303Panel({ draft }: { draft: AutonomoDraft }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const { vat } = draft;
  const info = vat.info ?? [];
  const warnings = vat.warnings ?? [];
  const sentences = infoSentences(t, money, info);
  return (
    <section className="autonomo-panel autonomo-model">
      <h4>{t('app.autonomo.vatr.title303')}</h4>
      {sentences.length > 0 && (
        <ul className="autonomo-plain">
          {sentences.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
      {vat.prorrata !== undefined && vat.prorrata < 100 && (
        <p className="section-hint">{t('app.autonomo.vatr.prorrata', { pct: vat.prorrata })}</p>
      )}
      {warnings.length > 0 && (
        <ul className="autonomo-warnings">
          {warnings.map((w) => (
            <li key={w}>{t(`app.autonomo.vatr.warn.${w}`)}</li>
          ))}
        </ul>
      )}
      <BoxGroup model="303" title={t('app.autonomo.accrued')} boxes={vat.accrued} />
      <BoxGroup model="303" title={t('app.autonomo.deductible')} boxes={vat.deductible} />
      {info.length > 0 && (
        <BoxGroup model="303" title={t('app.autonomo.vatr.info.title')} boxes={info} />
      )}
      <BoxGroup model="303" title={t('app.autonomo.settlement')} boxes={vat.settlement} />
      <Deadline draft={draft} model="303" />
    </section>
  );
}

/** One line of a warning of the 349 or the 390, with its figures. */
function warningText(
  t: Translate,
  money: Money,
  model: '349' | '390',
  w: Draft349['warnings'][number] | Draft390['warnings'][number]
): string {
  const values: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(w)) {
    if (k === 'code') continue;
    values[k] = typeof v === 'number' && k !== 'quarter' ? money(v) : String(v);
  }
  return t(`app.autonomo.vatr.warn${model}.${w.code}`, values);
}

/** The modelo 349: one line per operator and key, the corrections apart, and the summary. */
export function M349Panel({ draft, m349 }: { draft: AutonomoDraft; m349: Draft349 }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const k = (key: string, values?: Record<string, string | number>) =>
    t(`app.autonomo.vatr.m349.${key}`, values);
  return (
    <section className="autonomo-panel autonomo-model">
      <h4>{k('title')}</h4>
      <p>
        {k('plain', {
          n: m349.operators.length,
          amount: money(box(m349.boxes, 'importe')),
        })}
      </p>
      {m349.warnings.length > 0 && (
        <ul className="autonomo-warnings">
          {m349.warnings.map((w, i) => (
            <li key={i}>{warningText(t, money, '349', w)}</li>
          ))}
        </ul>
      )}
      {m349.operators.length > 0 && (
        <div className="autonomo-boxes">
          <table>
            <thead>
              <tr>
                <th>{k('key')}</th>
                <th>{k('vatId')}</th>
                <th>{k('name')}</th>
                <th>{k('base')}</th>
              </tr>
            </thead>
            <tbody>
              {m349.operators.map((o) => (
                <tr key={`${o.vatId}-${o.key}`}>
                  <td>{o.key}</td>
                  <td>{o.vatId || '—'}</td>
                  <td>{o.name || '—'}</td>
                  <td>{money(o.base)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {m349.rectifications.length > 0 && (
        <div className="autonomo-boxes">
          <h5>{k('rectTitle')}</h5>
          <table>
            <thead>
              <tr>
                <th>{k('key')}</th>
                <th>{k('vatId')}</th>
                <th>{k('period')}</th>
                <th>{k('base')}</th>
                <th>{k('previous')}</th>
              </tr>
            </thead>
            <tbody>
              {m349.rectifications.map((r) => (
                <tr key={`${r.vatId}-${r.key}-${r.year}-${r.quarter}`}>
                  <td>{r.key}</td>
                  <td>{r.vatId || '—'}</td>
                  <td>
                    {r.year} · {r.quarter}T
                  </td>
                  <td>{money(r.base)}</td>
                  <td>{money(r.previous)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <BoxGroup model="349" title={k('summary')} boxes={m349.boxes} />
      <Deadline draft={draft} model="349" />
    </section>
  );
}

/** The modelo 390: the year from the four 303, reconciled with what was filed. */
export function M390Panel({ draft, m390 }: { draft: AutonomoDraft; m390: Draft390 }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const k = (key: string, values?: Record<string, string | number>) =>
    t(`app.autonomo.vatr.m390.${key}`, values);
  const all = m390.sections.flatMap((s) => s.boxes);
  const filed = m390.reconciliation.some((r) => r.filed !== null);
  return (
    <section className="autonomo-panel autonomo-model">
      <h4>{k('title')}</h4>
      <p>
        {k('plain', {
          result: money(box(all, '86')),
          paid: money(box(all, '95')),
          volume: money(box(all, '108')),
        })}
      </p>
      {m390.prorrata < 100 && (
        <p className="section-hint">{k('prorrata', { pct: m390.prorrata })}</p>
      )}
      {m390.warnings.length > 0 && (
        <ul className="autonomo-warnings">
          {m390.warnings.map((w, i) => (
            <li key={i}>{warningText(t, money, '390', w)}</li>
          ))}
        </ul>
      )}
      {m390.sections
        .filter((s) => s.boxes.length > 0)
        .map((s) => (
          <BoxGroup model="390" key={s.id} title={k(`section.${s.id}`)} boxes={s.boxes} />
        ))}
      <div className="autonomo-boxes">
        <h5>{k('reconciliation')}</h5>
        <table>
          <thead>
            <tr>
              <th>{t('app.autonomo.quarter')}</th>
              <th>{k('computed')}</th>
              <th>{k('filed')}</th>
              <th>{k('difference')}</th>
            </tr>
          </thead>
          <tbody>
            {m390.reconciliation.map((r) => (
              <tr key={r.quarter}>
                <td>{r.quarter}T</td>
                <td>{money(r.computed)}</td>
                <td>{r.filed === null ? '—' : money(r.filed)}</td>
                <td>{r.filed === null ? '—' : money(r.difference)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filed && <p className="section-hint">{k('noFiled')}</p>}
      </div>
      <Deadline draft={draft} model="390" />
    </section>
  );
}

/** The VAT family of the draft: the full 303 and, when they apply, the 349 and the 390. */
export function VatFamily({ draft }: { draft: AutonomoDraft }) {
  return (
    <>
      <Vat303Panel draft={draft} />
      {draft.m349 && <M349Panel draft={draft} m349={draft.m349} />}
      {draft.m390 && <M390Panel draft={draft} m390={draft.m390} />}
    </>
  );
}
