import { useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { ConsentBoxes } from '@modules/billing/ui/PlanOptions';
import { formatPrice } from '@modules/billing/ui/pricing';
import type { CheckoutConsent } from '@modules/billing/domain/types';
import { errorMessage } from '@shared/utils/errors';
import type { DraftAccess } from '../../application/useRentaAccess';
import { readPdfText } from '../../application/readPdf';
import { readDraft, type DraftReading } from '../../domain/rentaDraft';
import type { Deduction } from '../../domain/rentaData';
import type { RentaForm } from '../../domain/rentaForm';
import { CCAA_OPTIONS } from '../../data/renta';
import { Step, markedAfter, reveal, useDate, useMoney } from './shared';

/** What the planner keeps about the draft: what was read, and what the person answered. */
export interface DraftState {
  reading: DraftReading | null;
  rents: boolean;
  dismissed: string[];
  /** The draft as it was read, kept while the person tries next year's return with the same data. */
  scenario: { form: RentaForm; reading: DraftReading } | null;
}

export const NO_DRAFT: DraftState = { reading: null, rents: false, dismissed: [], scenario: null };

/** The year of the return the draft belongs to (the exercise); the next campaign is two years on. */
export const DRAFT_EXERCISE = 2025;
export const NEXT_CAMPAIGN = DRAFT_EXERCISE + 2;

/** The same income and properties a year later: a year older, with no deductions marked yet. */
export function nextYearForm(form: RentaForm): RentaForm {
  const older = (age: string) => String(Number(age) + 1);
  return {
    ...form,
    age: older(form.age),
    children: form.children.map((c) => ({ ...c, age: older(c.age) })),
    choices: {},
  };
}

const FIELD_LABELS: { key: keyof DraftReading; label: string }[] = [
  { key: 'ccaaId', label: 'tools.renta.draft.ccaa' },
  { key: 'gross', label: 'tools.renta.gross' },
  { key: 'socialSecurity', label: 'tools.renta.socialSecurity' },
  { key: 'withheld', label: 'tools.renta.withheld' },
  { key: 'pension', label: 'tools.renta.pension' },
  { key: 'rentalIncome', label: 'tools.renta.rentalIncome' },
  { key: 'savings', label: 'tools.renta.savings' },
];

/** The form with what was read from the draft: only what was found, the rest is left as it was. */
export function applyReading(form: RentaForm, r: DraftReading): Partial<RentaForm> {
  const text = (n: number | null, current: string) => (n === null ? current : String(n));
  return {
    ccaaId: r.ccaaId ?? form.ccaaId,
    gross: text(r.gross, form.gross),
    socialSecurity: text(r.socialSecurity, form.socialSecurity),
    withheld: text(r.withheld, form.withheld),
    pension: text(r.pension, form.pension),
    savings: text(r.savings, form.savings),
    rentalOn: r.rentalIncome !== null || form.rentalOn,
    rentalIncome: text(r.rentalIncome, form.rentalIncome),
    age: r.age === null ? form.age : String(r.age),
    ascendants:
      r.ascendantAges.length > 0
        ? r.ascendantAges.map((age) => ({ over75: age > 75, disability: 0 as const }))
        : form.ascendants,
    children:
      r.childAges.length > 0
        ? r.childAges.map((age) => ({ age: String(age), disability: 0 as const }))
        : form.children,
  };
}

/** What the person needs to read a draft: two months of Premium, or the one-month pass. */
function DraftPaywall({ access }: { access: DraftAccess }) {
  const { t, locale } = useI18n();
  const [consent, setConsent] = useState<CheckoutConsent>({
    acceptTerms: false,
    waiveWithdrawal: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accepted = !access.consentRequired || (consent.acceptTerms && consent.waiveWithdrawal);
  const date = useDate();

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      await access.buy(consent);
    } catch (e) {
      setError(errorMessage(e, t('billing.checkoutError')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="renta-gate">
      <p className="section-hint">{t('tools.renta.draft.locked')}</p>
      {access.eligibleOn && (
        <p className="section-hint">
          {t('tools.renta.draft.unlocksOn', { date: date(access.eligibleOn) })}
        </p>
      )}
      {access.canBuy && access.price !== null && (
        <>
          <p>
            <strong>
              {t('tools.renta.draft.passTitle', { price: formatPrice(access.price, locale) })}
            </strong>
          </p>
          <p className="section-hint">{t('tools.renta.draft.passHint')}</p>
          {access.consentRequired && <ConsentBoxes consent={consent} onChange={setConsent} />}
          <button
            className="btn-primary renta-buy"
            disabled={busy || !accepted}
            onClick={() => void buy()}
          >
            {t('tools.renta.draft.buyPass', { price: formatPrice(access.price, locale) })}
          </button>
          {error && <p className="form-error">{error}</p>}
        </>
      )}
    </div>
  );
}

/** Step 0 (two months of Premium or the pass): read the draft in the browser, fill in the form and ask about the deductions that are missing. */
export function DraftStep({
  form,
  set,
  missing,
  marked,
  access,
  local,
  upgrade,
  draft,
  onDraft,
  accept,
}: {
  form: RentaForm;
  set: (patch: Partial<RentaForm>) => void;
  missing: Deduction[];
  /** How many deductions are marked as applying to the person. */
  marked: number;
  access: DraftAccess;
  /** The public page: there is no account to buy anything with. */
  local: boolean;
  upgrade: React.ReactNode;
  draft: DraftState;
  onDraft: (draft: DraftState) => void;
  accept: (id: string) => void;
}) {
  const { t } = useI18n();
  const date = useDate();
  const money = useMoney();
  const input = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'read' | 'locked' | null>(null);
  const { reading } = draft;

  const analyse = async (text: string) => {
    setError(null);
    if (!(await access.use())) {
      setError('locked');
      return;
    }
    const result = readDraft(text, { year: 2025, communities: CCAA_OPTIONS });
    onDraft({ ...draft, reading: result, rents: !result.ownsHome, dismissed: [], scenario: null });
    set(applyReading(form, result));
  };
  const fromFile = async (file: File) => {
    setBusy(true);
    try {
      await analyse(await readPdfText(file));
    } catch {
      setError('read');
    } finally {
      setBusy(false);
    }
  };

  const found = reading ? FIELD_LABELS.filter(({ key }) => reading[key] !== null) : [];
  const shown = (key: keyof DraftReading) => {
    const value = reading?.[key];
    if (key === 'ccaaId')
      return (CCAA_OPTIONS.find((c) => c.id === value) as { name: string }).name;
    return money(value as number);
  };

  return (
    <Step n={0} titleKey="tools.renta.draft.title" className="renta-draft">
      <p className="section-hint">{t('tools.renta.draft.hint')}</p>
      {!access.allowed ? (
        local ? (
          <div className="renta-gate">
            <p className="section-hint">{t('tools.renta.draft.premium')}</p>
            {upgrade}
          </div>
        ) : (
          <DraftPaywall access={access} />
        )
      ) : (
        <>
          {access.passUntil && (
            <p className="section-hint">
              {t('tools.renta.draft.passUntil', {
                date: date(access.passUntil),
              })}
            </p>
          )}
          <p className="renta-privacy" role="note">
            {t('tools.renta.draft.privacy')}
          </p>
          <div className="button-row">
            <input
              ref={input}
              type="file"
              accept="application/pdf"
              hidden
              aria-label={t('tools.renta.draft.file')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void fromFile(file);
              }}
            />
            <button className="btn-primary" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? t('tools.renta.draft.reading') : t('tools.renta.draft.upload')}
            </button>
          </div>
          {error && (
            <p className="form-error">
              {error === 'locked' ? t('tools.renta.draft.refused') : t('tools.renta.draft.error')}
            </p>
          )}
          <details className="renta-requirements">
            <summary>{t('tools.renta.draft.paste')}</summary>
            <textarea
              className="tx-input"
              rows={6}
              aria-label={t('tools.renta.draft.paste')}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
            <button className="btn-secondary" onClick={() => void analyse(pasted)}>
              {t('tools.renta.draft.read')}
            </button>
          </details>

          {reading && (
            <section className="renta-block" aria-live="polite">
              <h3>{t('tools.renta.draft.found')}</h3>
              {found.length === 0 ? (
                <p className="form-error">{t('tools.renta.draft.nothing')}</p>
              ) : (
                <ul className="renta-minimum">
                  {found.map(({ key, label }) => (
                    <li key={key}>
                      <span>{t(label)}</span>
                      <strong>{shown(key)}</strong>
                    </li>
                  ))}
                  {reading.childAges.length > 0 && (
                    <li>
                      <span>{t('tools.renta.children')}</span>
                      <strong>{reading.childAges.length}</strong>
                    </li>
                  )}
                </ul>
              )}
              <p className="section-hint">{t('tools.renta.draft.applied')}</p>
              {reading.applied.length > 0 && (
                <>
                  <h3>{t('tools.renta.draft.alreadyApplied')}</h3>
                  <ul className="renta-minimum">
                    {reading.applied.map((a) => (
                      <li key={a.label}>
                        <span>{a.label}</span>
                        <strong>{money(a.amount)}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {draft.scenario ? (
                <div className="renta-scenario" role="status">
                  <p>{t('tools.renta.draft.scenarioOn', { year: NEXT_CAMPAIGN })}</p>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      set(draft.scenario!.form);
                      onDraft({
                        ...draft,
                        reading: draft.scenario!.reading,
                        dismissed: [],
                        scenario: null,
                      });
                    }}
                  >
                    {t('tools.renta.draft.scenarioBack')}
                  </button>
                </div>
              ) : (
                <div className="button-row">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      set(nextYearForm(form));
                      onDraft({
                        ...draft,
                        reading: { ...reading, applied: [] },
                        dismissed: [],
                        scenario: { form, reading },
                      });
                      reveal(document.querySelector<HTMLElement>('.renta-step'));
                    }}
                  >
                    {t('tools.renta.draft.tryNext', { year: NEXT_CAMPAIGN })}
                  </button>
                </div>
              )}

              <h3>{t('tools.renta.draft.questions')}</h3>
              <label className="renta-check">
                <input
                  type="checkbox"
                  checked={draft.rents}
                  onChange={(e) => onDraft({ ...draft, rents: e.target.checked })}
                />
                <span>{t('tools.renta.draft.rents')}</span>
              </label>
              {missing.length === 0 ? (
                <>
                  <p className="section-hint">{t('tools.renta.draft.noneMissing')}</p>
                  {marked > 0 && (
                    <button className="btn-primary" onClick={() => reveal(markedAfter(null))}>
                      {t('tools.renta.draft.goFirst', { count: marked })}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    className="btn-secondary"
                    onClick={() =>
                      onDraft({
                        ...draft,
                        dismissed: [...draft.dismissed, ...missing.map((d) => d.id)],
                      })
                    }
                  >
                    {t('tools.renta.draft.noneInterest')}
                  </button>
                  <ul className="renta-questions">
                    {missing.map((d) => (
                      <li key={d.id}>
                        <strong>{d.title}</strong>
                        <small>{d.summary}</small>
                        <div className="button-row">
                          <button
                            className="btn-primary"
                            onClick={() => accept(d.id)}
                            aria-label={`${t('tools.renta.draft.yes')}: ${d.title}`}
                          >
                            {t('tools.renta.draft.yes')}
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() =>
                              onDraft({ ...draft, dismissed: [...draft.dismissed, d.id] })
                            }
                            aria-label={`${t('tools.renta.draft.no')}: ${d.title}`}
                          >
                            {t('tools.renta.draft.no')}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
        </>
      )}
    </Step>
  );
}
