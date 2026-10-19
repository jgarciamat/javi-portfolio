import { useI18n } from '@core/i18n/I18nContext';
import {
  RESIDENCE_URL,
  answerResidence,
  emptyResidence,
  residenceScope,
  type ResidenceForm,
  type ResidenceScope,
} from '../../domain/rentaResidence';
import type { RentaForm } from '../../domain/rentaForm';
import { RadioOptions, type StepProps } from './shared';

const k = (key: string) => `tools.renta.residence.${key}`;

/** The residence of the form, as the calculation reads it. */
export const scopeOf = (form: RentaForm): ResidenceScope =>
  residenceScope(form.ccaaId, form.residence);

/** One question of residence with its options. */
function Ask({
  id,
  options,
  value,
  onChange,
}: {
  id: keyof ResidenceForm;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="renta-residence-q">
      <legend>{t(k(`q.${id}`))}</legend>
      <RadioOptions
        name={`renta-residence-${id}`}
        options={options.map((o) => ({ value: o, label: t(k(`opt.${id}.${o}`)) }))}
        value={value || null}
        onChange={onChange}
      />
    </fieldset>
  );
}

/**
 * Where the person lived in the year: more than 183 days in Spain, or the centre of their interests
 * or their family here; a special situation; and the Basque territory. One after the other.
 */
export function ResidenceQuestions({ form, set }: StepProps) {
  const { t } = useI18n();
  const r = form.residence ?? emptyResidence();
  const answer = (patch: Partial<ResidenceForm>) =>
    set({ residence: answerResidence(form.residence, patch) });
  return (
    <div className="renta-block renta-residence">
      <Ask
        id="days"
        options={['more', 'less']}
        value={r.days}
        onChange={(v) => answer({ days: v as ResidenceForm['days'] })}
      />
      {r.days === 'less' && (
        <Ask
          id="interests"
          options={['yes', 'no']}
          value={r.interests}
          onChange={(v) => answer({ interests: v as ResidenceForm['interests'] })}
        />
      )}
      {r.days === 'less' && r.interests === 'no' && (
        <Ask
          id="family"
          options={['yes', 'no']}
          value={r.family}
          onChange={(v) => answer({ family: v as ResidenceForm['family'] })}
        />
      )}
      <Ask
        id="special"
        options={['none', 'moved', 'displaced', 'abroadOfficial']}
        value={r.special}
        onChange={(v) => answer({ special: v as ResidenceForm['special'] })}
      />
      {form.ccaaId === 'pais-vasco' && (
        <Ask
          id="territory"
          options={['alava', 'bizkaia', 'gipuzkoa']}
          value={r.territory}
          onChange={(v) => answer({ territory: v as ResidenceForm['territory'] })}
        />
      )}
      <ScopeNotice scope={scopeOf(form)} />
      <a href={RESIDENCE_URL} target="_blank" rel="noopener noreferrer">
        {t(k('official'))}
      </a>
    </div>
  );
}

/** What the answers mean, in a calm line: the notes of a resident, or that it is filed elsewhere. */
export function ScopeNotice({ scope }: { scope: ResidenceScope }) {
  const { t } = useI18n();
  if (scope.kind === 'pending') return null;
  if (scope.kind === 'out') return <OutOfScope scope={scope} />;
  return (
    <>
      {scope.notes.map((n) => (
        <p key={n} className="section-hint" role="note">
          {t(k(`note.${n}`))}
        </p>
      ))}
    </>
  );
}

/**
 * A return this calculation is not for: what it is, where it is filed (official links) and what
 * the rest of the app still does. Nothing else is blocked.
 */
export function OutOfScope({ scope }: { scope: Extract<ResidenceScope, { kind: 'out' }> }) {
  const { t } = useI18n();
  return (
    <section className="renta-block renta-out" aria-label={t(k('outTitle'))}>
      <h3>{t(k(`out.${scope.reason}.title`))}</h3>
      <p>{t(k(`out.${scope.reason}.body`))}</p>
      <ul className="renta-out-links">
        {scope.links.map((url, i) => (
          <li key={url}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {t(k(`out.${scope.reason}.link${i + 1}`))}
            </a>
          </li>
        ))}
      </ul>
      <p className="section-hint">{t(k('outStill'))}</p>
    </section>
  );
}
