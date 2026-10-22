import { useI18n } from '@core/i18n/I18nContext';
import {
  SOCIAL_SECURITY_RATE,
  number,
  type JointChoice,
  type PartnerForm,
} from '../../domain/rentaForm';
import { canFileJointly } from '../../domain/rentaJoint';
import { useRentaRules } from './RentaRulesContext';
import { DisabilitySelect, Field, type StepProps } from './shared';

/** The other person of the joint return: their pay, age, disability and basic income. */
export function PartnerFields({ form, set }: StepProps) {
  const { t } = useI18n();
  const p = form.partner;
  const put = (patch: Partial<PartnerForm>) => set({ partner: { ...form.partner, ...patch } });
  return (
    <div className="renta-block">
      <p className="section-hint">{t('tools.renta.joint.partnerHint')}</p>
      <div className="tools-form">
        <Field
          id="renta-partner-gross"
          label={t('tools.renta.joint.gross')}
          value={p.gross}
          onChange={(gross) => put({ gross })}
        />
        <Field
          id="renta-partner-ss"
          label={t('tools.renta.joint.socialSecurity')}
          placeholder={String(Math.round(number(p.gross) * SOCIAL_SECURITY_RATE))}
          value={p.socialSecurity}
          onChange={(socialSecurity) => put({ socialSecurity })}
        />
        <Field
          id="renta-partner-withheld"
          label={t('tools.renta.joint.withheld')}
          value={p.withheld}
          onChange={(withheld) => put({ withheld })}
        />
        <Field
          id="renta-partner-non-salary"
          label={t('tools.renta.joint.nonSalary')}
          hint={t('tools.renta.nonSalaryHint')}
          value={p.nonSalary}
          onChange={(nonSalary) => put({ nonSalary })}
        />
        <Field
          id="renta-partner-age"
          label={t('tools.renta.joint.age')}
          value={p.age}
          onChange={(age) => put({ age })}
        />
        <div className="tools-field">
          <label htmlFor="renta-partner-disability">{t('tools.renta.joint.disability')}</label>
          <DisabilitySelect
            id="renta-partner-disability"
            value={p.disability}
            onChange={(disability) => put({ disability })}
          />
        </div>
        <Field
          id="renta-partner-savings"
          label={t('tools.renta.joint.savings')}
          value={p.savings}
          onChange={(savings) => put({ savings })}
        />
        <Field
          id="renta-partner-pension"
          label={t('tools.renta.joint.pension')}
          value={p.pension}
          onChange={(pension) => put({ pension })}
        />
      </div>
      <label className="renta-check">
        <input
          type="checkbox"
          checked={p.retired}
          onChange={(e) => put({ retired: e.target.checked })}
        />
        <span>{t('tools.renta.joint.retired')}</span>
      </label>
    </div>
  );
}

/** Single parent: whether they live with the other parent, and whether the unit exists at all. */
export function SingleParentFields({ form, set }: StepProps) {
  const { t } = useI18n();
  const rules = useRentaRules();
  const children = form.children.map((c) => ({ age: number(c.age), disability: c.disability }));
  return (
    <div className="renta-block">
      {!canFileJointly('single', children, rules.joint) && (
        <p className="form-error" role="alert">
          {t('tools.renta.joint.noMinor')}
        </p>
      )}
      <label className="renta-check">
        <input
          type="checkbox"
          checked={form.otherParent}
          onChange={(e) => set({ otherParent: e.target.checked })}
        />
        <span>{t('tools.renta.joint.otherParent')}</span>
      </label>
      <p className="section-hint">{t('tools.renta.joint.singleHint')}</p>
    </div>
  );
}

/** Expert mode: the joint return, with the other person's data when it is a couple. */
export function JointSection({ form, set }: StepProps) {
  const { t } = useI18n();
  return (
    <>
      <h3>{t('tools.renta.joint.title')}</h3>
      <p className="section-hint">{t('tools.renta.joint.hint')}</p>
      <div className="tools-form">
        <div className="tools-field">
          <label htmlFor="renta-joint">{t('tools.renta.joint.question')}</label>
          <select
            id="renta-joint"
            className="tx-input"
            value={form.joint || 'none'}
            onChange={(e) => set({ joint: e.target.value as JointChoice })}
          >
            {(['none', 'couple', 'single'] as const).map((o) => (
              <option key={o} value={o}>
                {t(`tools.renta.guide.opt.joint.${o}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {form.joint === 'couple' && <PartnerFields form={form} set={set} />}
      {form.joint === 'single' && <SingleParentFields form={form} set={set} />}
    </>
  );
}
