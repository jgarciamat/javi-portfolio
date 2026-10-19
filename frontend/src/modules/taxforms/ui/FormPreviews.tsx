import { useMemo } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { AutonomoDraft } from '@modules/finances/domain/types';
import type { WithholdingResult } from '@modules/finances/domain/withholdings';
import { form130, form303, formWithholding, type FilledForm } from '../domain/values';
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

/** The 303 and the 130 of the quarter of a self-employed draft. */
export function AutonomoFormPreviews({ draft }: { draft: AutonomoDraft }) {
  const { t } = useI18n();
  const forms = useMemo(
    () => [form303(draft), form130(draft)].filter((f): f is FilledForm => f !== null),
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
