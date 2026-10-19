import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import {
  UNKNOWN,
  cheerOf,
  isFinished,
  isOpen,
  minutesLeft,
  percentDone,
  type WizardStep,
} from '../domain/wizard';
import { canSpeak, speak, useWizardPrefs, type WizardControls } from '../application/useWizard';
import './css/Wizard.css';

/** One screen of a step: one question (or a short group of them) and its answer. */
export interface WizardScreen {
  id: string;
  /** The question, in plain words. */
  title: string;
  /** A short line under it, with an example. */
  hint?: string;
  /** «What is this?»: the words of the screen explained. */
  help?: string;
  /** Answered (any answer: «no» too). «I don't know» always counts as answered. */
  ready: boolean;
  /** What is still to answer, said gently under the screen. */
  missing?: string;
  /** Another label for «I don't know / it does not apply» where one fits better. */
  skipLabel?: string;
  /** Nothing to answer here: no «I don't know». */
  noSkip?: boolean;
  /** A soft warning (an amount that looks odd): it never blocks. */
  warning?: string | null;
  /** Called when the person goes on from this screen (to keep the answer as given). */
  onNext?: () => void;
  body: ReactNode;
}

export interface WizardStepView {
  id: string;
  title: string;
  icon: string;
  /** The badge the step gives when it is finished. */
  badge: string;
  screens: WizardScreen[];
}

interface WizardProps {
  /** For the ids and the classes: `renta`, `autonomo`. */
  flow: string;
  defs: readonly WizardStep[];
  steps: WizardStepView[];
  controls: WizardControls;
  /** «Everything together»: the expert mode. */
  onExpert: () => void;
  /** Starts again: the data of the flow goes too (asked first). */
  onRestart: () => void;
  /** The end of the flow, shown once every step is done. */
  finale: ReactNode;
}

/** Letter size, contrast, the expert mode and starting again. */
function Toolbar({ onExpert, onRestart }: { onExpert: () => void; onRestart: () => void }) {
  const { t } = useI18n();
  const [prefs, setPrefs] = useWizardPrefs();
  useEffect(() => {
    document.documentElement.classList.toggle('wiz-big-text', prefs.big);
    document.documentElement.classList.toggle('wiz-contrast', prefs.contrast);
    return () => document.documentElement.classList.remove('wiz-big-text', 'wiz-contrast');
  }, [prefs]);
  return (
    <div className="wiz-tools" role="toolbar" aria-label={t('wizard.tools')}>
      <button
        type="button"
        className="wiz-tool"
        aria-pressed={prefs.big}
        onClick={() => setPrefs({ big: !prefs.big })}
      >
        <span aria-hidden="true" className="wiz-tool-icon">
          A+
        </span>
        {t('wizard.big')}
      </button>
      <button
        type="button"
        className="wiz-tool"
        aria-pressed={prefs.contrast}
        onClick={() => setPrefs({ contrast: !prefs.contrast })}
      >
        <span aria-hidden="true" className="wiz-tool-icon">
          ◐
        </span>
        {t('wizard.contrast')}
      </button>
      <button type="button" className="wiz-tool" onClick={onExpert}>
        <Icon name="clipboard" /> {t('wizard.expert')}
      </button>
      <button
        type="button"
        className="wiz-tool"
        onClick={() => window.confirm(t('wizard.restartConfirm')) && onRestart()}
      >
        <Icon name="repeat" /> {t('wizard.restart')}
      </button>
    </div>
  );
}

/** How far the person is: the percentage, a kind word, the time left and the days in a row. */
function ProgressHeader({
  defs,
  done,
  streak,
}: {
  defs: readonly WizardStep[];
  done: string[];
  streak: number;
}) {
  const { t } = useI18n();
  const percent = percentDone(defs, done);
  const minutes = minutesLeft(defs, done);
  return (
    <div className="wiz-progress">
      <div className="wiz-progress-line">
        <strong>{t('wizard.percent', { percent })}</strong>
        <span>{t(`wizard.cheer.${cheerOf(done.length, defs.length)}`)}</span>
      </div>
      <div
        className="wiz-bar"
        role="progressbar"
        aria-label={t('wizard.progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="wiz-progress-line wiz-progress-meta">
        <span>{minutes > 0 ? t('wizard.minutesLeft', { minutes }) : t('wizard.noTimeLeft')}</span>
        {streak > 1 && <span className="wiz-streak">{t('wizard.streak', { days: streak })}</span>}
      </div>
    </div>
  );
}

/** The numbered route: done steps with a tick, the open one current, the rest with a padlock. */
function Route({
  flow,
  defs,
  steps,
  at,
  done,
  onGo,
}: {
  flow: string;
  defs: readonly WizardStep[];
  steps: WizardStepView[];
  at: number;
  done: string[];
  onGo: (index: number) => void;
}) {
  const { t } = useI18n();
  const [refused, setRefused] = useState<number | null>(null);
  return (
    <nav className="wiz-route-nav" aria-label={t('wizard.route')}>
      <ol className="wiz-route">
        {steps.map((s, i) => {
          const finished = done.includes(s.id);
          const open = isOpen(defs, done, i);
          const state = i === at ? 'current' : finished ? 'done' : open ? 'open' : 'locked';
          return (
            <li key={s.id} className={`wiz-route-item is-${state}`}>
              <button
                type="button"
                aria-current={i === at ? 'step' : undefined}
                aria-disabled={!open}
                aria-describedby={open ? undefined : `${flow}-locked-${i}`}
                onClick={() => {
                  if (open) {
                    setRefused(null);
                    onGo(i);
                  } else setRefused(i);
                }}
              >
                <span className="wiz-route-n" aria-hidden="true">
                  {finished ? '✓' : open ? i + 1 : <Icon name="lock" size={14} />}
                </span>
                <span className="wiz-route-name">
                  <span className="sr-only">{t('wizard.stepN', { n: i + 1 })} </span>
                  {s.title}
                  {finished && <span className="sr-only"> ({t('wizard.done')})</span>}
                </span>
              </button>
              {!open && (
                <span id={`${flow}-locked-${i}`} className="sr-only">
                  {t('wizard.locked', { n: firstNotDone(steps, done) + 1 })}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {refused !== null && (
        <p className="wiz-refused" role="status">
          <Icon name="lock" size={14} />{' '}
          {t('wizard.lockedSay', {
            n: firstNotDone(steps, done) + 1,
            title: steps[firstNotDone(steps, done)].title,
          })}
        </p>
      )}
    </nav>
  );
}

const firstNotDone = (steps: WizardStepView[], done: string[]) =>
  steps.findIndex((s) => !done.includes(s.id));

/** A few pieces of paper falling: only once, and never with reduced motion (CSS). */
export function Confetti() {
  return (
    <div className="wiz-confetti" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <span
          key={i}
          style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.12}s` }}
        />
      ))}
    </div>
  );
}

/** Back, «I don't know» and the main button (locked until the screen is answered). */
function ScreenNav({
  canBack,
  skip,
  ok,
  missing,
  label,
  onBack,
  onSkip,
  onNext,
}: {
  canBack: boolean;
  skip: string | null;
  ok: boolean;
  /** The screen says itself what is missing: the general line is not repeated. */
  missing: boolean;
  label: string;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <div className="wiz-nav">
        {canBack && (
          <button type="button" className="btn-secondary wiz-back" onClick={onBack}>
            ← {t('wizard.back')}
          </button>
        )}
        {skip && (
          <button type="button" className="btn-secondary wiz-skip" onClick={onSkip}>
            {skip}
          </button>
        )}
        <button type="button" className="btn-primary wiz-next" disabled={!ok} onClick={onNext}>
          {label}
        </button>
      </div>
      {!ok && !missing && <p className="wiz-why-locked">{t('wizard.answerFirst')}</p>}
    </>
  );
}

/** The voice of each language of the app. */
const VOICES = { es: 'es-ES', en: 'en-GB' } as const;

/** «What is this?» and «Read aloud», over the help of the screen. */
function HelpRow({ flow, screen }: { flow: string; screen: WizardScreen }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const read = () =>
    speak(
      [screen.title, screen.hint, open ? screen.help : null].filter(Boolean).join('. '),
      VOICES[locale]
    );
  return (
    <>
      <div className="wiz-help-row">
        {screen.help && (
          <button
            type="button"
            className="wiz-link"
            aria-expanded={open}
            aria-controls={`${flow}-help`}
            onClick={() => setOpen(!open)}
          >
            {t('wizard.whatIs')}
          </button>
        )}
        {canSpeak() && (
          <button type="button" className="wiz-link" onClick={read}>
            {t('wizard.readAloud')}
          </button>
        )}
      </div>
      {screen.help && open && (
        <p id={`${flow}-help`} className="wiz-help">
          {screen.help}
        </p>
      )}
    </>
  );
}

/** «Step 2 of 9 · Your family · question 1 of 3». */
function Kicker({
  step,
  n,
  total,
  index,
}: {
  step: WizardStepView;
  n: number;
  total: number;
  index: number;
}) {
  const { t } = useI18n();
  return (
    <p className="wiz-kicker">
      <Icon name={step.icon} /> {t('wizard.kicker', { n, total, title: step.title })}
      {step.screens.length > 1 &&
        ` · ${t('wizard.screenN', { n: index + 1, total: step.screens.length })}`}
    </p>
  );
}

/** The main button: on, the end of the step, or the end of everything. */
const nextLabel = (
  t: ReturnType<typeof useI18n>['t'],
  last: boolean,
  lastStep: boolean,
  n: number
): string => {
  if (!last) return `${t('wizard.next')} →`;
  return lastStep ? t('wizard.finishAll') : t('wizard.finishStep', { n });
};

/** Under the answer: a soft warning, the «I don't know» note and what is still missing. */
function Notes({ screen, unknown, ok }: { screen: WizardScreen; unknown: boolean; ok: boolean }) {
  const { t } = useI18n();
  return (
    <>
      {screen.warning && <p className="wiz-missing">{screen.warning}</p>}
      {unknown && !screen.ready && <p className="wiz-note">{t('wizard.unknownNote')}</p>}
      {!ok && screen.missing && (
        <p className="wiz-missing" role="status">
          {screen.missing}
        </p>
      )}
    </>
  );
}

/** The screen on view: the question, its help, the answer and the way on. */
function ScreenCard({
  flow,
  step,
  n,
  total,
  index,
  controls,
  lastStep,
  headingRef,
  onFinishStep,
}: {
  flow: string;
  step: WizardStepView;
  n: number;
  total: number;
  index: number;
  controls: WizardControls;
  lastStep: boolean;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onFinishStep: () => void;
}) {
  const { t } = useI18n();
  const screen = step.screens[index];
  const unknown = controls.progress.answers[screen.id] === UNKNOWN;
  const ok = screen.ready || unknown;
  const last = index === step.screens.length - 1;
  const next = () => {
    screen.onNext?.();
    if (last) onFinishStep();
    else controls.setScreen(index + 1);
  };
  const skip = () => {
    controls.answer(screen.id, UNKNOWN);
    next();
  };
  const titleId = `${flow}-screen-title`;
  return (
    <section className="wiz-step" aria-labelledby={titleId}>
      <Kicker step={step} n={n} total={total} index={index} />
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className="wiz-title">
        {screen.title}
      </h2>
      {screen.hint && <p className="wiz-hint">{screen.hint}</p>}
      <HelpRow flow={flow} screen={screen} />
      <div className="wiz-body">{screen.body}</div>
      <Notes screen={screen} unknown={unknown} ok={ok} />
      <ScreenNav
        canBack={n > 1 || index > 0}
        skip={!screen.noSkip && !screen.ready ? screen.skipLabel ?? t('wizard.skip') : null}
        ok={ok}
        missing={Boolean(screen.missing)}
        label={nextLabel(t, last, lastStep, n)}
        onBack={() => controls.back(0)}
        onSkip={skip}
        onNext={next}
      />
    </section>
  );
}

/**
 * The assistant: the route of numbered steps, the step on screen one short screen at a time, and
 * the badge of each finished step. The next step stays locked until this one is finished.
 */
export function Wizard({ flow, defs, steps, controls, onExpert, onRestart, finale }: WizardProps) {
  const { t } = useI18n();
  const { progress } = controls;
  const finished = isFinished(defs, progress.done);
  // After the end, a step opened again from the route is shown instead of the finale.
  const [revisit, setRevisit] = useState(false);
  const [badge, setBadge] = useState<string | null>(null);
  const [resumeShown, setResumeShown] = useState(controls.resumed);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const at = progress.at;
  const step = steps[at];
  const screen = Math.min(progress.screen, step.screens.length - 1);

  const showFinale = finished && !revisit;
  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [at, screen, revisit, showFinale]);

  const back = () => {
    moved.current = true;
    setBadge(null);
    controls.back(at > 0 ? steps[at - 1].screens.length : 0);
  };
  const wrapped: WizardControls = {
    ...controls,
    back,
    setScreen: (n) => {
      moved.current = true;
      controls.setScreen(n);
    },
  };
  const finishStep = () => {
    moved.current = true;
    setBadge(step.badge);
    setResumeShown(false);
    controls.complete(at);
    setRevisit(false);
  };
  const go = (i: number) => {
    moved.current = true;
    setBadge(null);
    setRevisit(true);
    controls.go(i);
  };

  return (
    <div className={`wiz wiz--${flow}`}>
      <Toolbar onExpert={onExpert} onRestart={onRestart} />
      {resumeShown && (
        <p className="wiz-resume" role="status">
          {t('wizard.resumed', { n: at + 1, title: step.title })}
        </p>
      )}
      <ProgressHeader defs={defs} done={progress.done} streak={progress.streak} />
      <Route
        flow={flow}
        defs={defs}
        steps={steps}
        at={showFinale ? -1 : at}
        done={progress.done}
        onGo={go}
      />
      <div aria-live="polite">
        {badge && (
          <p className="wiz-badge">
            <span className="wiz-badge-medal" aria-hidden="true">
              <Icon name="star" />
            </span>
            <span>
              <strong>{t('wizard.badgeWon', { badge })}</strong>{' '}
              {t(`wizard.cheer.${cheerOf(progress.done.length, defs.length)}`)}
            </span>
          </p>
        )}
      </div>
      {showFinale ? (
        <section className="wiz-step wiz-finale" aria-labelledby={`${flow}-finale-title`}>
          <Confetti />
          <h2 id={`${flow}-finale-title`} ref={heading} tabIndex={-1} className="wiz-title">
            {t('wizard.finaleTitle')}
          </h2>
          <ul className="wiz-badges" aria-label={t('wizard.badges')}>
            {steps.map((s) => (
              <li key={s.id}>
                <Icon name="star" /> {s.badge}
              </li>
            ))}
          </ul>
          {finale}
        </section>
      ) : (
        <ScreenCard
          key={`${at}-${screen}`}
          flow={flow}
          step={step}
          n={at + 1}
          total={steps.length}
          index={screen}
          controls={wrapped}
          lastStep={at === steps.length - 1}
          headingRef={heading}
          onFinishStep={finishStep}
        />
      )}
    </div>
  );
}
