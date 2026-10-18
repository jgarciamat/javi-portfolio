import { useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { readTaxModelPdf } from '../../application/taxModelPdf';
import {
  priorFrom130,
  quarterFrom303,
  type TaxModel,
  type TaxModelPdf,
} from '../../domain/taxModelPdf';
import type { ManualForm } from './AutonomoManual';

type Quarter = 1 | 2 | 3 | 4;

/** Money as the form's text fields take it: no zeros left over, a dot for the decimals. */
const text = (n: number): string => (n === 0 ? '' : String(n));

/** What an import did, as numbers and codes; the sentences are put together when they are shown. */
interface Outcome {
  model: TaxModel;
  year: number;
  quarter: Quarter;
  /** The quarter the draft moves to (130: the one after the filed one). */
  goesTo: Quarter;
  notes: ('ignored' | 'rate' | 'expense')[];
  ignored: string[];
}

/** The modelo 130 of a quarter hands its totals to the next one: they become the «already filed» totals. */
function applyModel130(form: ManualForm, data: TaxModelPdf): ManualForm {
  const prior = priorFrom130(data.boxes);
  return {
    ...form,
    prior: {
      on: true,
      income: text(prior.income),
      expenses: text(prior.expenses),
      payments: text(prior.payments),
      withheld: text(prior.withheld),
    },
  };
}

/** The modelo 303 of a quarter gives its income by rate and its expenses of current operations. */
function applyModel303(form: ManualForm, data: TaxModelPdf, quarter: Quarter) {
  const found = quarterFrom303(data.boxes);
  const quarters = form.quarters.map((q, i) =>
    i !== quarter - 1
      ? q
      : {
          ...q,
          income: {
            r21: text(found.income.r21),
            r10: text(found.income.r10),
            r4: text(found.income.r4),
            r0: text(found.income.r0),
          },
          expenses: found.expense
            ? [
                {
                  kind: 'other' as const,
                  amount: text(found.expense.amount),
                  vatRate: found.expense.vatRate,
                  days: '',
                },
              ]
            : [],
        }
  );
  return { form: { ...form, quarters }, found };
}

const MODELS: TaxModel[] = ['130', '303'];

/** The two forms of the quarter, filed or filled in from the template, each with its button and its template. */
export function ModelImport({
  form,
  year,
  years,
  onChange,
  onPeriod,
}: {
  form: ManualForm;
  year: number;
  /** The years a draft can be prepared for. */
  years: readonly number[];
  onChange: (form: ManualForm) => void;
  /** Moves the draft to the year and quarter the PDF is about. */
  onPeriod: (year: number, quarter: Quarter) => void;
}) {
  const { t } = useI18n();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(form);
  latest.current = form;
  const inputs = { '130': useRef<HTMLInputElement>(null), '303': useRef<HTMLInputElement>(null) };

  const load = async (model: TaxModel, file: File) => {
    setOutcome(null);
    setError(null);
    let parsed;
    try {
      parsed = await readTaxModelPdf(file);
    } catch {
      setError('unreadable');
      return;
    }
    if (!parsed.ok) {
      setError(parsed.reason);
      return;
    }
    const { data } = parsed;
    if (data.model !== model) {
      setError(data.model === '130' ? 'is130' : 'is303');
      return;
    }
    const quarter = data.quarter;
    if (quarter === null) {
      setError('noPeriod');
      return;
    }
    const at = data.year ?? year;
    if (!years.includes(at)) {
      setError('year');
      return;
    }
    if (model === '130') {
      if (quarter === 4) {
        setError('lastQuarter');
        return;
      }
      onChange(applyModel130(latest.current, data));
      onPeriod(at, (quarter + 1) as Quarter);
      setOutcome({
        model,
        year: at,
        quarter,
        goesTo: (quarter + 1) as Quarter,
        notes: [],
        ignored: [],
      });
      return;
    }
    const { form: next, found } = applyModel303(latest.current, data, quarter);
    onChange(next);
    onPeriod(at, quarter);
    setOutcome({
      model,
      year: at,
      quarter,
      goesTo: quarter,
      notes: [
        ...(found.expense ? (['expense'] as const) : []),
        ...(found.expense && !found.expense.exact ? (['rate'] as const) : []),
        ...(found.ignored.length > 0 ? (['ignored'] as const) : []),
      ],
      ignored: found.ignored,
    });
  };

  return (
    <section className="autonomo-panel autonomo-import" aria-label={t('app.autonomo.model.title')}>
      <h3>{t('app.autonomo.model.title')}</h3>
      <p className="section-hint">{t('app.autonomo.model.hint')}</p>
      <div className="autonomo-import-books">
        {MODELS.map((model) => (
          <div key={model} className="autonomo-import-book">
            <h4>{t(`app.autonomo.model.${model}`)}</h4>
            <p className="section-hint">{t(`app.autonomo.model.${model}Hint`)}</p>
            <input
              ref={inputs[model]}
              type="file"
              hidden
              accept=".pdf,application/pdf"
              aria-label={t(`app.autonomo.model.${model}File`)}
              onChange={(e) => {
                const picked = e.target.files?.[0];
                e.target.value = '';
                if (picked) void load(model, picked);
              }}
            />
            <div className="autonomo-import-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => inputs[model].current?.click()}
              >
                {t(`app.autonomo.model.${model}Button`)}
              </button>
              <a
                className="btn-secondary"
                href={`/plantillas/modelo-${model}-plantilla.pdf`}
                download
              >
                {t('app.autonomo.model.template')}
              </a>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {t(`app.autonomo.model.error.${error}`, { years: years.join(', ') })}
        </p>
      )}
      {outcome && (
        <div className="autonomo-import-result" role="status">
          <p>
            {t(`app.autonomo.model.done.${outcome.model}`, {
              year: outcome.year,
              quarter: outcome.quarter,
              next: outcome.goesTo,
            })}
          </p>
          {outcome.notes.map((note) => (
            <p key={note} className="section-hint">
              {t(`app.autonomo.model.note.${note}`, { boxes: outcome.ignored.join(', ') })}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
