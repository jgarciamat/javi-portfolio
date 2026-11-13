import { useEffect, useRef, useState, type ReactNode } from 'react';
import { track } from '@core/analytics';
import { useI18n } from '@core/i18n/I18nContext';
import { SignupWall, TeaserOutline, useGate, type Gate } from '@modules/guides/ui/SignupWall';

/** The calculators open without an account (`open` in toolPages), by the key of their texts. */
export type OpenCalc = 'salary' | 'reta';

const draftKey = (calc: OpenCalc) => `mm_calc_draft:${calc}`;

/**
 * The figures typed before creating the account, kept in this tab only (sessionStorage) and
 * forgotten once read with a session: storage the visitor asks for, never tracking.
 */
function readDraft<T>(calc: OpenCalc): Partial<T> | null {
  try {
    const raw = sessionStorage.getItem(draftKey(calc));
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch {
    return null;
  }
}

function writeDraft(calc: OpenCalc, form: unknown): void {
  try {
    sessionStorage.setItem(draftKey(calc), JSON.stringify(form));
  } catch {
    /* private mode: after signing up the calculator starts again from the example */
  }
}

function dropDraft(calc: OpenCalc): void {
  try {
    sessionStorage.removeItem(draftKey(calc));
  } catch {
    /* nothing was kept */
  }
}

/**
 * The form of an open calculator: it starts with the figures typed before signing up (then
 * forgets them) and counts once, anonymously and without any figure, that a visitor worked out a
 * result (`calc_result`).
 */
export function useOpenForm<T extends object>(calc: OpenCalc, start: T) {
  const gate = useGate();
  const [form, setForm] = useState<T>(() => ({ ...start, ...readDraft<T>(calc) }));
  const counted = useRef(false);
  useEffect(() => {
    if (gate === 'open') dropDraft(calc);
  }, [gate, calc]);
  const update = (change: (form: T) => T) => {
    if (gate === 'closed' && !counted.current) {
      counted.current = true;
      track('calc_result', { detail: calc });
    }
    setForm(change);
  };
  return { form, update, gate, keep: () => writeDraft(calc, form) };
}

/**
 * The breakdown of an open calculator: whole with an account; without one, what it contains (by
 * title) and the invitation to sign up, which keeps the figures for when the person comes back.
 */
export function OpenDetail({
  calc,
  gate,
  outline,
  onKeep,
  children,
}: {
  calc: OpenCalc;
  gate: Gate;
  /** Titles of what the breakdown shows. */
  outline: string[];
  onKeep: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  if (gate === 'open') return <>{children}</>;
  return (
    <>
      {gate === 'closed' && <TeaserOutline title={t('tools.open.outline')} items={outline} />}
      <SignupWall
        variant="soft"
        title={t(`tools.${calc}.cta.title`)}
        lead={t(`tools.${calc}.cta.lead`)}
        onRegister={() => {
          onKeep();
          track('calc_cta_click', { detail: calc });
        }}
        onLogin={onKeep}
      />
    </>
  );
}
