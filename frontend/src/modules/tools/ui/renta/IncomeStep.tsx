import { useI18n } from '@core/i18n/I18nContext';
import { rentaObligation } from '../../domain/calculators';
import {
  SOCIAL_SECURITY_EXPENSE,
  SOCIAL_SECURITY_RATE,
  number,
  obligationIncome,
} from '../../domain/rentaForm';
import type { RentaWorkExtras } from '../../domain/rentaExtras';
import { Field, Step, type StepProps } from './shared';

/** Step 2: pay, withholdings, expenses of the job and contributions that lower the base. */
export function IncomeStep({ form, set, extras }: StepProps & { extras: RentaWorkExtras }) {
  const { t } = useI18n();
  const gross = number(form.gross);

  return (
    <Step n={2} titleKey="tools.renta.step2">
      <div className="tools-form">
        <Field
          id="renta-gross"
          label={t('tools.renta.gross')}
          value={form.gross}
          onChange={(v) => set({ gross: v })}
        />
        <Field
          id="renta-ss"
          label={t('tools.renta.socialSecurity')}
          placeholder={String(Math.round(gross * SOCIAL_SECURITY_RATE))}
          value={form.socialSecurity}
          onChange={(v) => set({ socialSecurity: v })}
        />
        <Field
          id="renta-withheld"
          label={t('tools.renta.withheld')}
          value={form.withheld}
          onChange={(v) => set({ withheld: v })}
        />
        <Field
          id="renta-non-salary"
          label={t('tools.renta.nonSalary')}
          hint={t('tools.renta.nonSalaryHint')}
          value={form.nonSalary}
          onChange={(v) => set({ nonSalary: v })}
        />
        <Field
          id="renta-second-payers"
          label={t('tools.renta.secondPayers')}
          hint={t('tools.renta.secondPayersHint')}
          value={form.secondPayers ?? ''}
          onChange={(v) => set({ secondPayers: v })}
        />
      </div>
      <label className="renta-check">
        <input
          type="checkbox"
          checked={form.retired}
          onChange={(e) => set({ retired: e.target.checked })}
        />
        <span>{t('tools.renta.retired')}</span>
      </label>
      <p className="section-hint">{t('tools.renta.incomeHint')}</p>
      {gross > 0 && (
        <p className="renta-obligation" role="status">
          {t(`tools.renta.obligation.${rentaObligation(obligationIncome(form)).reason}`)}
        </p>
      )}

      <details className="renta-group">
        <summary>{t('tools.renta.workExpenses')}</summary>
        <p className="section-hint">{t('tools.renta.workExpensesHint')}</p>
        <div className="tools-form">
          {extras.workExpenses
            .filter((item) => item.id !== SOCIAL_SECURITY_EXPENSE)
            .map((item) => (
              <Field
                key={item.id}
                id={`renta-work-${item.id}`}
                label={item.title}
                hint={item.summary}
                value={form.workExpenses[item.id] ?? ''}
                onChange={(v) => set({ workExpenses: { ...form.workExpenses, [item.id]: v } })}
              />
            ))}
        </div>
        {extras.geographicMobilityExtra > 0 && (
          <label className="renta-check">
            <input
              type="checkbox"
              checked={form.mobility}
              onChange={(e) => set({ mobility: e.target.checked })}
            />
            <span>{t('tools.renta.mobility', { amount: extras.geographicMobilityExtra })}</span>
          </label>
        )}
      </details>

      <details className="renta-group">
        <summary>{t('tools.renta.contributions')}</summary>
        <p className="section-hint">{t('tools.renta.contributionsHint')}</p>
        <div className="tools-form">
          <Field
            id="renta-pension"
            label={t('tools.renta.pension')}
            value={form.pension}
            onChange={(v) => set({ pension: v })}
          />
          <Field
            id="renta-pension-employer"
            label={t('tools.renta.pensionEmployer')}
            value={form.pensionEmployer}
            onChange={(v) => set({ pensionEmployer: v })}
          />
          <Field
            id="renta-spouse-plan"
            label={t('tools.renta.spousePlan')}
            value={form.spousePlan}
            onChange={(v) => set({ spousePlan: v })}
          />
          <Field
            id="renta-compensatory"
            label={t('tools.renta.compensatory')}
            value={form.compensatory}
            onChange={(v) => set({ compensatory: v })}
          />
          <Field
            id="renta-child-support"
            label={t('tools.renta.childSupport')}
            hint={t('tools.renta.childSupportHint')}
            value={form.childSupport ?? ''}
            onChange={(v) => set({ childSupport: v })}
          />
          <Field
            id="renta-pension-capital"
            label={t('tools.renta.pensionCapital2006')}
            hint={t('tools.renta.pensionCapital2006Hint')}
            value={form.pensionCapital2006 ?? ''}
            onChange={(v) => set({ pensionCapital2006: v })}
          />
        </div>
        <ul className="renta-notes">
          {extras.baseReductions.map((r) => (
            <li key={r.id}>
              <strong>{r.title}</strong> <small>{r.summary}</small>
            </li>
          ))}
        </ul>
      </details>
    </Step>
  );
}
