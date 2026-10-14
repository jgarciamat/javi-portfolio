import { useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { readPdfText } from '../../application/readPdf';
import { readDraft, type DraftReading } from '../../domain/rentaDraft';
import type { Deduction } from '../../domain/rentaData';
import type { RentaForm } from '../../domain/rentaForm';
import { CCAA_OPTIONS } from '../../data/renta';
import { Step, useMoney } from './shared';

/** What the planner keeps about the draft: what was read, and what the person answered. */
export interface DraftState {
  reading: DraftReading | null;
  /** The text that was read, to find the deductions it mentions once the community is loaded. */
  text: string;
  rents: boolean;
  dismissed: string[];
}

export const NO_DRAFT: DraftState = { reading: null, text: '', rents: false, dismissed: [] };

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
    children:
      r.childAges.length > 0
        ? r.childAges.map((age) => ({ age: String(age), disability: 0 as const }))
        : form.children,
  };
}

/** Step 0 (Premium): read the draft in the browser, fill in the form and ask about the deductions that are missing. */
export function DraftStep({
  form,
  set,
  mentioned,
  missing,
  premium,
  upgrade,
  draft,
  onDraft,
  accept,
}: {
  form: RentaForm;
  set: (patch: Partial<RentaForm>) => void;
  /** Ids of the deductions the draft seems to include already. */
  mentioned: string[];
  missing: Deduction[];
  premium: boolean;
  upgrade: React.ReactNode;
  draft: DraftState;
  onDraft: (draft: DraftState) => void;
  accept: (id: string) => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const input = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const { reading } = draft;

  const analyse = async (text: string) => {
    const result = readDraft(text, { year: 2025, communities: CCAA_OPTIONS });
    onDraft({ ...draft, reading: result, text, dismissed: [] });
    set(applyReading(form, result));
  };
  const fromFile = async (file: File) => {
    setBusy(true);
    setError(false);
    try {
      await analyse(await readPdfText(file));
    } catch {
      setError(true);
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
      {!premium ? (
        <div className="renta-gate">
          <p className="section-hint">{t('tools.renta.draft.premium')}</p>
          {upgrade}
        </div>
      ) : (
        <>
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
          {error && <p className="form-error">{t('tools.renta.draft.error')}</p>}
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
              {mentioned.length > 0 && (
                <p className="section-hint">
                  {t('tools.renta.draft.mentioned', { count: mentioned.length })}
                </p>
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
                <p className="section-hint">{t('tools.renta.draft.noneMissing')}</p>
              ) : (
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
              )}
            </section>
          )}
        </>
      )}
    </Step>
  );
}
