import { useI18n } from '@core/i18n/I18nContext';
import { CCAA_OPTIONS } from '../../data/renta';
import type { RentaCcaa } from '../../domain/rentaData';
import { DisabilitySelect, Field, Step, type StepProps } from './shared';
import { JointSection } from './JointStep';

/** The children of the person, and whether the minimum is shared with the other parent. */
export function ChildrenSection({ form, set }: StepProps) {
  const { t } = useI18n();
  return (
    <>
      <h3>{t('tools.renta.children')}</h3>
      <p className="section-hint">{t('tools.renta.childrenHint')}</p>
      <ul className="renta-people">
        {form.children.map((child, i) => (
          <li key={i}>
            <label className="tools-field">
              <span>{t('tools.renta.childAge', { n: i + 1 })}</span>
              <input
                className="tx-input"
                inputMode="numeric"
                value={child.age}
                onChange={(e) =>
                  set({
                    children: form.children.map((c, j) =>
                      j === i ? { ...c, age: e.target.value } : c
                    ),
                  })
                }
              />
            </label>
            <label className="tools-field">
              <span>{t('tools.renta.childDisability', { n: i + 1 })}</span>
              <DisabilitySelect
                id={`child-disability-${i}`}
                value={child.disability}
                onChange={(d) =>
                  set({
                    children: form.children.map((c, j) => (j === i ? { ...c, disability: d } : c)),
                  })
                }
              />
            </label>
            <button
              type="button"
              className="btn-secondary"
              aria-label={t('tools.renta.removeChild', { n: i + 1 })}
              onClick={() => set({ children: form.children.filter((_, j) => j !== i) })}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="button-row">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => set({ children: [...form.children, { age: '5', disability: 0 }] })}
        >
          + {t('tools.renta.addChild')}
        </button>
      </div>
      {form.children.length > 0 && (
        <label className="renta-check">
          <input
            type="checkbox"
            checked={form.shared}
            onChange={(e) => set({ shared: e.target.checked })}
          />
          <span>{t('tools.renta.shared')}</span>
        </label>
      )}
    </>
  );
}

/** The parents or grandparents who live with the person. */
export function AscendantsSection({ form, set }: StepProps) {
  const { t } = useI18n();
  return (
    <>
      <h3>{t('tools.renta.ascendants')}</h3>
      <p className="section-hint">{t('tools.renta.ascendantsHint')}</p>
      <ul className="renta-people">
        {form.ascendants.map((a, i) => (
          <li key={i}>
            <label className="renta-check">
              <input
                type="checkbox"
                checked={a.over75}
                onChange={(e) =>
                  set({
                    ascendants: form.ascendants.map((x, j) =>
                      j === i ? { ...x, over75: e.target.checked } : x
                    ),
                  })
                }
              />
              <span>{t('tools.renta.over75', { n: i + 1 })}</span>
            </label>
            <label className="tools-field">
              <span>{t('tools.renta.ascendantDisability', { n: i + 1 })}</span>
              <DisabilitySelect
                id={`ascendant-disability-${i}`}
                value={a.disability}
                onChange={(d) =>
                  set({
                    ascendants: form.ascendants.map((x, j) =>
                      j === i ? { ...x, disability: d } : x
                    ),
                  })
                }
              />
            </label>
            <button
              type="button"
              className="btn-secondary"
              aria-label={t('tools.renta.removeAscendant', { n: i + 1 })}
              onClick={() => set({ ascendants: form.ascendants.filter((_, j) => j !== i) })}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="button-row">
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            set({ ascendants: [...form.ascendants, { over75: false, disability: 0 }] })
          }
        >
          + {t('tools.renta.addAscendant')}
        </button>
      </div>
    </>
  );
}

/** Step 1: where the person lives, their age and family. */
export function FamilyStep({
  form,
  set,
  ccaa,
  loadError,
}: StepProps & { ccaa: RentaCcaa | null; loadError: boolean }) {
  const { t } = useI18n();
  const foral = ccaa?.regime === 'foral';

  return (
    <Step n={1} titleKey="tools.renta.step1">
      <div className="tools-form">
        <div className="tools-field">
          <label htmlFor="renta-ccaa">{t('tools.renta.ccaa')}</label>
          <select
            id="renta-ccaa"
            className="tx-input"
            value={form.ccaaId}
            onChange={(e) => set({ ccaaId: e.target.value })}
          >
            <option value="">{t('tools.renta.chooseCcaa')}</option>
            {CCAA_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <Field
          id="renta-age"
          label={t('tools.renta.age')}
          value={form.age}
          onChange={(age) => set({ age })}
        />
        <div className="tools-field">
          <label htmlFor="renta-disability">{t('tools.renta.ownDisability')}</label>
          <DisabilitySelect
            id="renta-disability"
            value={form.disability}
            onChange={(disability) => set({ disability })}
          />
        </div>
      </div>
      {loadError && <p className="form-error">{t('tools.renta.loadError')}</p>}
      {foral && ccaa && (
        <p className="renta-foral" role="note">
          {t('tools.renta.foral', { name: ccaa.name })}{' '}
          <a href={ccaa.source} target="_blank" rel="noopener noreferrer">
            {t('tools.renta.officialSite')}
          </a>
        </p>
      )}

      <ChildrenSection form={form} set={set} />

      <AscendantsSection form={form} set={set} />

      <JointSection form={form} set={set} />
    </Step>
  );
}
