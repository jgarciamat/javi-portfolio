import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { emptyDonations, number, type DonationForm } from '../../domain/rentaForm';
import { donationResult } from '../../domain/rentaDonations';
import { Field, RadioOptions, useMoney, type StepProps } from './shared';

const k = (key: string) => `tools.renta.donations.${key}`;
const URL =
  'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota/deducciones-donativos-otras-aportaciones.html';

/**
 * What was given to NGOs and foundations: the amount donated (not the deduction), whether it was
 * given to the same entity three years running, and the other kinds; the deduction is worked out
 * with the limit of 10 % of the tax base (rentaDonations.ts).
 */
export function DonationsFields({
  form,
  set,
  taxBase,
}: StepProps & {
  /** The tax base ([0500] + [0510]) as it is now: the donations are held to 10 % of it. */
  taxBase: number;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const d = form.donations ?? emptyDonations();
  const [recurrent, setRecurrent] = useState<string | null>(
    d.recurrent.trim() === '' ? null : 'yes'
  );
  const update = (patch: Partial<DonationForm>) => set({ donations: { ...d, ...patch } });
  const r = donationResult(
    {
      general: number(d.general),
      recurrent: number(d.recurrent),
      priority: number(d.priority),
      priorityRecurrent: number(d.priorityRecurrent),
      other: number(d.other),
    },
    taxBase
  );
  const total = r.general + r.priority + r.otherBase * 0.1;
  return (
    <div className="renta-block renta-donations">
      <div className="tools-form">
        <Field
          id="renta-donations-general"
          label={t(k('general'))}
          hint={t(k('generalHint'))}
          value={d.general}
          onChange={(v) => update({ general: v })}
        />
      </div>
      <p className="renta-question">{t(k('recurrentQ'))}</p>
      <RadioOptions
        name="renta-donations-recurrent"
        options={['yes', 'no'].map((value) => ({ value, label: t(k(`recurrentOpt.${value}`)) }))}
        value={recurrent}
        onChange={(v) => {
          setRecurrent(v);
          if (v === 'no') update({ recurrent: '' });
        }}
      />
      {recurrent === 'yes' && (
        <div className="tools-form">
          <Field
            id="renta-donations-recurrent"
            label={t(k('recurrent'))}
            hint={t(k('recurrentHint'))}
            value={d.recurrent}
            onChange={(v) => update({ recurrent: v })}
          />
        </div>
      )}
      <details className="renta-requirements">
        <summary>{t(k('more'))}</summary>
        <div className="tools-form">
          <Field
            id="renta-donations-priority"
            label={t(k('priority'))}
            hint={t(k('priorityHint'))}
            value={d.priority}
            onChange={(v) => update({ priority: v })}
          />
          <Field
            id="renta-donations-priority-recurrent"
            label={t(k('priorityRecurrent'))}
            value={d.priorityRecurrent}
            onChange={(v) => update({ priorityRecurrent: v })}
          />
          <Field
            id="renta-donations-other"
            label={t(k('other'))}
            hint={t(k('otherHint'))}
            value={d.other}
            onChange={(v) => update({ other: v })}
          />
        </div>
      </details>
      {total > 0 && (
        <p className="renta-gives" role="status">
          {t(k('gives'), { amount: money(total) })}
        </p>
      )}
      {r.overLimit > 0 && (
        <p className="section-hint" role="note">
          {t(k('overLimit'), { amount: money(r.overLimit) })}
        </p>
      )}
      <p className="section-hint">
        {t(k('rules'))}{' '}
        <a href={URL} target="_blank" rel="noopener noreferrer">
          {t('tools.renta.official')}
        </a>
      </p>
    </div>
  );
}
