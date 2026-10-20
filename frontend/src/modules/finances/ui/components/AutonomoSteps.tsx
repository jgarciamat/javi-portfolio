import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { scrollBehavior } from '@shared/utils/motion';

/** The three steps of the screen, in order. */
export const STEPS = ['bring', 'review', 'result'] as const;
export type Step = (typeof STEPS)[number];

export const stepId = (step: Step) => `autonomo-step-${step}`;

/** Scrolls to a step (smoothly unless the device asks for less motion) and moves the focus there. */
export function goToStep(step: Step) {
  const section = document.getElementById(stepId(step)) as HTMLElement;
  section.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  section.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

/**
 * The step on screen: the one crossing a band a little above the middle of the viewport. Without
 * IntersectionObserver it is the last one chosen in the bar.
 */
export function useCurrentStep(): [Step, (step: Step) => void] {
  const [current, setCurrent] = useState<Step>('bring');
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.find((e) => e.isIntersecting);
        if (seen) setCurrent(seen.target.id.replace('autonomo-step-', '') as Step);
      },
      { rootMargin: '-30% 0px -65% 0px' }
    );
    for (const step of STEPS) observer.observe(document.getElementById(stepId(step)) as Element);
    return () => observer.disconnect();
  }, []);
  return [current, setCurrent];
}

/**
 * «1. Bring your data · 2. Review · 3. Result»: an ordered list of buttons, the current one marked
 * with aria-current="step". Arrow keys, Home and End move between them; Enter goes to the step.
 */
export function StepBar({
  current,
  done,
  onGo,
}: {
  current: Step;
  /** Steps already done (data brought in, draft prepared). */
  done: Partial<Record<Step, boolean>>;
  onGo: (step: Step) => void;
}) {
  const { t } = useI18n();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = STEPS.length - 1;
    const to =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? Math.min(last, index + 1)
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? Math.max(0, index - 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (to === null) return;
    e.preventDefault();
    buttons.current[to]?.focus();
  };
  return (
    <nav className="autonomo-stepbar" aria-label={t('app.autonomo.steps.label')}>
      <ol>
        {STEPS.map((step, i) => (
          <li key={step} className={step === current ? 'is-current' : undefined}>
            <button
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              aria-current={step === current ? 'step' : undefined}
              onClick={() => onGo(step)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <span className="autonomo-stepbar-n" aria-hidden="true">
                {done[step] ? '✓' : i + 1}
              </span>
              <span className="autonomo-stepbar-name">
                <span className="sr-only">{t('app.autonomo.steps.n', { n: i + 1 })} </span>
                {t(`app.autonomo.steps.${step}`)}
                {done[step] && <span className="sr-only"> ({t('app.autonomo.steps.done')})</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** One step of the screen: its number and title, a line about it and its panels. */
export function StepSection({ step, children }: { step: Step; children: ReactNode }) {
  const { t } = useI18n();
  const n = STEPS.indexOf(step) + 1;
  return (
    <section className="autonomo-step" id={stepId(step)} aria-labelledby={`${stepId(step)}-title`}>
      <h2 className="autonomo-step-title" id={`${stepId(step)}-title`} tabIndex={-1}>
        <span className="autonomo-step-n" aria-hidden="true">
          {n}
        </span>
        <span className="sr-only">{t('app.autonomo.steps.n', { n })} </span>
        {t(`app.autonomo.steps.${step}`)}
      </h2>
      <p className="section-hint autonomo-step-hint">{t(`app.autonomo.steps.${step}Hint`)}</p>
      {children}
    </section>
  );
}
