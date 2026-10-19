import { useMemo } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { Summary347, YearSummary } from '@modules/finances/domain/annualSummaries';
import type { Result131 } from '@modules/finances/domain/module131';
import type { AutonomoDraft } from '@modules/finances/domain/types';
import type { WithholdingResult } from '@modules/finances/domain/withholdings';
import type { RentaInput, RentaResult } from '@modules/tools/domain/rentaCalc';
import {
  form130,
  form100,
  form131,
  form180,
  form190,
  form303,
  form347,
  form349,
  form390,
  formWithholding,
  type FilledForm,
} from '../domain/values';
import { FormPreview } from './FormPreview';

/** The previews of a screen, under a heading and the warning that they are not the official forms. */
function Previews({ forms, title }: { forms: FilledForm[]; title: string }) {
  const { t } = useI18n();
  return (
    <div className="taxforms">
      <h4>{title}</h4>
      <p className="section-hint">{t('taxforms.disclaimer')}</p>
      {forms.map((form) => (
        <FormPreview key={form.model} form={form} label={t(`taxforms.model.${form.model}`)} />
      ))}
    </div>
  );
}

/**
 * The forms of the quarter of a self-employed draft: the 303 and the 130, the 349 when there are
 * intra-EU operations and the 390 with the fourth quarter.
 */
export function AutonomoFormPreviews({ draft }: { draft: AutonomoDraft }) {
  const { t } = useI18n();
  const forms = useMemo(
    () =>
      [form303(draft), form130(draft), form349(draft), form390(draft)].filter(
        (f): f is FilledForm => f !== null
      ),
    [draft]
  );
  return <Previews forms={forms} title={t('taxforms.title.autonomo')} />;
}

/** The 111 and the 115 of the quarter, when there is something to file. */
export function WithholdingFormPreviews({
  result,
  year,
}: {
  result: WithholdingResult;
  year: number;
}) {
  const { t } = useI18n();
  const forms = useMemo(
    () => [
      ...(result.m111.result !== 'none'
        ? [formWithholding('111', result.m111, year, result.quarter)]
        : []),
      ...(result.m115.result !== 'none'
        ? [formWithholding('115', result.m115, year, result.quarter)]
        : []),
    ],
    [result, year]
  );
  if (forms.length === 0) return null;
  return <Previews forms={forms} title={t('taxforms.title.withholdings')} />;
}

/** The yearly summaries with someone in them: the 190, the 180 and the 347. */
export function AnnualFormPreviews({
  m190,
  m180,
  m347,
  year,
}: {
  m190: YearSummary;
  m180: YearSummary;
  m347: Summary347;
  year: number;
}) {
  const { t } = useI18n();
  const forms = useMemo(
    () => [
      ...(m190.records.length > 0 ? [form190(m190, year)] : []),
      ...(m180.records.length > 0 ? [form180(m180, year)] : []),
      ...(m347.records.length > 0 ? [form347(m347, year)] : []),
    ],
    [m190, m180, m347, year]
  );
  if (forms.length === 0) return null;
  return <Previews forms={forms} title={t('taxforms.title.annual', { year })} />;
}

/**
 * The 131 of a quarter (modules). The app has no screen for the objective estimation yet: this is
 * ready to go under the result of module131's form131 wherever that screen shows it.
 */
export function Model131FormPreview({
  result,
  year,
  quarter,
}: {
  result: Result131;
  year: number;
  quarter: 1 | 2 | 3 | 4;
}) {
  const { t } = useI18n();
  const forms = useMemo(() => [form131(result, year, quarter)], [result, year, quarter]);
  return <Previews forms={forms} title={t('taxforms.title.modules')} />;
}

/**
 * The return (modelo 100) as the official form, filled with the figures of the planner: at the end of
 * the assistant and under the result of the expert mode.
 */
export function RentaFormPreview({
  result,
  input,
  year,
}: {
  result: RentaResult;
  input: RentaInput;
  year: number;
}) {
  const { t } = useI18n();
  const forms = useMemo(() => {
    try {
      return [form100(result, input, year)];
    } catch {
      // A result saved on the device by an older version lacks parts of today's: no preview then.
      return [];
    }
  }, [result, input, year]);
  if (forms.length === 0) return null;
  return <Previews forms={forms} title={t('taxforms.title.renta')} />;
}
