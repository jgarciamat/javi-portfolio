import { useState, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Choice } from '@modules/wizard/ui/Choice';
import { Wizard, type WizardScreen, type WizardStepView } from '@modules/wizard/ui/Wizard';
import { useAssistantMode, useWizardProgress } from '@modules/wizard/application/useWizard';
import type { WizardStep } from '@modules/wizard/domain/wizard';
import type { RentaMode } from '../../application/useRentaAccess';
import { rentaProperty } from '../../data/renta/inmuebles';
import { rentaState } from '../../data/renta/state';
import { COMPARED_BOXES, ourBoxes } from '../../domain/rentaCompare';
import { answerOf, choose, OPTIONS, type QuestionId } from '../../domain/rentaGuide';
import { number } from '../../domain/rentaForm';
import { queueOf } from '../../domain/rentaReview';
import { RentaPlanner, ResultSection, UpgradeCta } from '../RentaPlanner';
import { ActivitiesList } from './ActivitiesList';
import { DeductionReview } from './DeductionReview';
import { DeductionsStep } from './DeductionsStep';
import { DraftStep } from './DraftStep';
import { QuestionBody, ready as guidedReady } from './GuidedInterview';
import { InvestCard, InvestLink } from './InvestCard';
import { NewReturn } from './NewReturn';
import { Optimizer } from './Optimizer';
import { SavingsDetailSection } from './SavingsDetail';
import { RentaFormPreview } from '@modules/taxforms/ui/FormPreviews';
import { Field, RadioOptions, useMoney } from './shared';
import { useRentaPlanner, type RentaPlannerState } from './useRentaPlanner';
import '../css/Renta.css';

/** The steps of the Renta, in order, with about how long each one takes. */
export const RENTA_STEPS: readonly WizardStep[] = [
  { id: 'you', minutes: 2 },
  { id: 'family', minutes: 3 },
  { id: 'work', minutes: 3 },
  { id: 'home', minutes: 2 },
  { id: 'invest', minutes: 3 },
  { id: 'activity', minutes: 2 },
  { id: 'deductions', minutes: 3 },
  { id: 'review', minutes: 4 },
  { id: 'result', minutes: 3 },
];

const ICONS: Record<string, string> = {
  you: 'user',
  family: 'heart',
  work: 'briefcase',
  home: 'home',
  invest: 'trend',
  activity: 'receipt',
  deductions: 'gift',
  review: 'search',
  result: 'flag',
};

/** Step by step or everything together: remembered on this device. */
export const ASSISTANT_KEY = 'mm_renta_assistant';
export const wizardKey = (year: number) => `mm_renta_wizard_${year}`;
const DONATIONS = 'estado-donativos-ley-49-2002';

/**
 * The deduction of what was donated (the planner takes the deduction itself, in euros): 80 % of
 * the first 250 € and 40 % of the rest (Ley 49/2002, art. 19.1, as in the State's data). The 45 %
 * for giving to the same body three years running is left out: it is asked in the full list.
 */
export function donationDeduction(given: number): number {
  const first = Math.min(given, 250);
  return Math.round((first * 0.8 + Math.max(0, given - 250) * 0.4) * 100) / 100;
}
const AEAT = 'https://sede.agenciatributaria.gob.es/';

type Translate = ReturnType<typeof useI18n>['t'];

interface Ctx {
  p: RentaPlannerState;
  t: Translate;
  money: (n: number) => string;
  mode: RentaMode;
  answers: Record<string, string>;
  answer: (id: string, value: string) => void;
  onOpenAutonomo?: () => void;
  onHowToFile?: (slug: string) => void;
  /** Opens a step that is already open (the investments, from the review or the result). */
  goStep: (index: number) => void;
  /** The year of the return. */
  year: number;
}

const INVEST_STEP = RENTA_STEPS.findIndex((s) => s.id === 'invest');

const w = (key: string) => `wizard.renta.${key}`;

/** One of the guided questions of the planner, as a screen of the assistant. */
function guided(ctx: Ctx, q: QuestionId, extra?: Partial<WizardScreen>): WizardScreen {
  const { p, t } = ctx;
  return {
    id: q,
    title: t(`tools.renta.guide.q.${q}`),
    hint: t(w(`hint.${q}`)),
    help: t(`tools.renta.guide.why.${q}`),
    // Answered when the form says it: picked here, typed in the expert mode or read from the draft.
    ready: guidedReady(p.form, q),
    // Kept as answered, as the guided questions do: the expert mode sees it too.
    onNext: () => p.set({ answers: { ...p.form.answers, [q]: answerOf(p.form, q) as string } }),
    body: (
      <QuestionBody
        q={q}
        form={p.form}
        set={p.set}
        ccaa={p.ccaa}
        loadError={p.loadError}
        deductions={p.all}
        property={rentaProperty}
        reading={p.draft.reading}
        onReview={p.startReview}
      />
    ),
    ...extra,
  };
}

/** A question of the assistant only (not of the planner): yes or no, kept in its progress. */
function yesNo(ctx: Ctx, id: string, body?: ReactNode): WizardScreen {
  const { t, answers, answer } = ctx;
  return {
    id,
    title: t(w(`q.${id}`)),
    hint: t(w(`hint.${id}`)),
    help: t(w(`help.${id}`)),
    ready: answers[id] === 'yes' || answers[id] === 'no',
    body: (
      <>
        <Choice
          name={`renta-wiz-${id}`}
          label={t(w(`q.${id}`))}
          options={[
            { value: 'yes', label: t(w(`opt.${id}.yes`)) },
            { value: 'no', label: t(w(`opt.${id}.no`)) },
          ]}
          value={answers[id]}
          onChange={(v) => answer(id, v)}
        />
        {answers[id] === 'yes' && body}
      </>
    ),
  };
}

function youStep(ctx: Ctx): WizardScreen[] {
  const { p, t, mode } = ctx;
  return [
    {
      id: 'draft',
      title: t(w('q.draft')),
      hint: t(w('hint.draft')),
      help: t(w('help.draft')),
      ready: p.draft.reading !== null,
      skipLabel: t(w('skip.draft')),
      body: (
        <DraftStep
          key={p.wipes}
          form={p.form}
          set={p.set}
          missing={p.missing}
          marked={p.marked}
          access={p.access.draft}
          local={mode === 'local'}
          upgrade={<UpgradeCta access={p.access} />}
          draft={p.draft}
          onDraft={p.setDraft}
          accept={p.accept}
          comparison={p.comparison}
        />
      ),
    },
    guided(ctx, 'ccaa', { missing: t(w('missing.ccaa')) }),
    guided(ctx, 'age', { missing: t(w('missing.age')) }),
  ];
}

function workStep(ctx: Ctx): WizardScreen[] {
  const { p, t } = ctx;
  const income = guided(ctx, 'income');
  return [
    {
      ...income,
      warning: income.ready && number(p.form.gross) <= 0 ? t(w('warn.gross')) : null,
    },
    yesNo(
      ctx,
      'payers',
      <div className="tools-form">
        <Field
          id="renta-wiz-second-payers"
          label={t('tools.renta.secondPayers')}
          hint={t('tools.renta.secondPayersHint')}
          value={p.form.secondPayers ?? ''}
          onChange={(v) => p.set({ secondPayers: v })}
        />
      </div>
    ),
  ];
}

/** Savings: one tap, then the amount or the detail with the import of the broker's files. */
function investScreen(ctx: Ctx): WizardScreen {
  const { p, t } = ctx;
  const answer = answerOf(p.form, 'savings');
  return {
    ...guided(ctx, 'savings'),
    body: (
      <>
        <RadioOptions
          name="renta-wiz-savings"
          options={OPTIONS.savings.map((value) => ({
            value,
            label: t(`tools.renta.guide.opt.savings.${value}`),
          }))}
          value={answer}
          onChange={(v) => p.set(choose(p.form, 'savings', v))}
        />
        {answer === 'yes' && (
          <>
            {!p.form.savingsDetail && (
              <div className="tools-form">
                <Field
                  id="renta-wiz-savings-amount"
                  label={t('tools.renta.savings')}
                  hint={t('tools.renta.savingsHint')}
                  value={p.form.savings}
                  onChange={(v) => p.set({ savings: v })}
                />
              </div>
            )}
            <SavingsDetailSection
              form={p.form}
              set={p.set}
              importer={false}
              onImport={() => ctx.goStep(INVEST_STEP)}
            />
          </>
        )}
      </>
    ),
  };
}

/** «My investments»: the card with the big button and the drop area, before anything else. */
function importScreen(ctx: Ctx): WizardScreen {
  const { p, t } = ctx;
  return {
    id: 'investImport',
    title: t('tools.renta.investCard.title'),
    help: t(w('help.investImport')),
    ready: p.form.savingsDetail?.imported !== undefined,
    skipLabel: t(w('skip.investImport')),
    body: <InvestCard form={p.form} set={p.set} input={p.input} />,
  };
}

function activityScreen(ctx: Ctx): WizardScreen {
  const { p, t, answers, onOpenAutonomo } = ctx;
  const list = p.form.activities ?? [];
  const screen = yesNo(
    ctx,
    'activity',
    list.length === 0 && (
      <div className="renta-block">
        <p>{t(w('activityHow'))}</p>
        {onOpenAutonomo && (
          <button type="button" className="btn-secondary" onClick={onOpenAutonomo}>
            {t(w('openAutonomo'))}
          </button>
        )}
      </div>
    )
  );
  return {
    ...screen,
    ready: screen.ready || list.length > 0,
    body: (
      <>
        {screen.body}
        <ActivitiesList form={p.form} set={p.set} result={p.live.result.activities} />
      </>
    ),
    warning: answers.activity === 'yes' && list.length === 0 ? t(w('warn.activity')) : null,
  };
}

function deductionScreens(ctx: Ctx): WizardScreen[] {
  const { p, t } = ctx;
  const donation = p.form.choices[DONATIONS];
  const given = ctx.answers.donationsGiven ?? '';
  return [
    guided(ctx, 'plan'),
    yesNo(
      ctx,
      'donations',
      <div className="tools-form">
        <Field
          id="renta-wiz-donations"
          label={t(w('donationsAmount'))}
          hint={t(w('donationsAmountHint'))}
          value={given}
          onChange={(typed) => {
            ctx.answer('donationsGiven', typed);
            const deduction = donationDeduction(number(typed));
            p.setChoice(DONATIONS, {
              ...donation,
              units: '',
              on: deduction > 0,
              amount: deduction > 0 ? String(deduction) : '',
            });
          }}
        />
      </div>
    ),
    yesNo(
      ctx,
      'others',
      <DeductionsStep
        state={rentaState}
        ccaa={p.ccaa}
        loadError={p.loadError}
        choices={p.form.choices}
        family={p.family}
        blocked={p.live.result.blocked}
        hints={p.hints}
        savings={p.savings}
        markedSaving={p.saved}
        onChange={p.setChoice}
        n={7}
      />
    ),
  ];
}

function reviewScreen(ctx: Ctx): WizardScreen {
  const { p, t, answers, answer, money } = ctx;
  const left = queueOf(p.found.candidates, p.review, p.dismissed);
  return {
    id: 'review',
    title: t(w('q.review')),
    hint: t(w('hint.review')),
    help: t(w('help.review')),
    ready: answers.review === 'done' || left.length === 0,
    missing: t(w('missing.review')),
    body: (
      <>
        {p.saved > 0 && (
          <p className="wiz-saving" role="status">
            {t(w('savedSoFar'), { amount: money(p.saved) })}
          </p>
        )}
        <DeductionReview
          key={p.ccaa?.id ?? ''}
          n={8}
          ccaa={p.ccaa}
          deductions={p.all}
          candidates={p.found.candidates}
          outOfReach={p.found.outOfReach}
          dismissed={p.dismissed}
          review={p.review}
          choices={p.form.choices}
          savings={p.savings}
          markedSaving={p.saved}
          onDecide={p.decideOn}
          startSignal={p.reviewStart}
          onDone={() => answer('review', 'done')}
          resultLink={false}
          invest={<InvestLink form={p.form} onGo={() => ctx.goStep(INVEST_STEP)} />}
        />
        <Optimizer
          form={p.form}
          set={p.set}
          ccaa={p.ccaa}
          found={p.found.candidates}
          savings={p.savings}
        />
      </>
    ),
  };
}

/** The boxes of the return worked out, each one with a button to copy its amount. */
function BoxesToCopy({ p }: { p: RentaPlannerState }) {
  const { t } = useI18n();
  const money = useMoney();
  const [copied, setCopied] = useState<string | null>(null);
  if (!p.shown) return <p className="section-hint">{t(w('boxesFirst'))}</p>;
  const boxes = ourBoxes(p.shown.result, p.input);
  const copy = (box: string, value: number) => {
    const text = value.toFixed(2).replace('.', ',');
    navigator.clipboard.writeText(text).then(
      () => setCopied(box),
      () => setCopied(`!${box}`)
    );
  };
  return (
    <>
      <ul className="wiz-boxes">
        {COMPARED_BOXES.filter((b) => boxes[b] !== 0).map((b) => (
          <li key={b}>
            <span>
              <span className="wiz-box-n">{b}</span> {t(`tools.renta.compare.box.${b}`)}
            </span>
            <strong>{money(boxes[b])}</strong>
            <button
              type="button"
              className="btn-secondary"
              aria-label={t(w('copyBox'), { box: b })}
              onClick={() => copy(b, boxes[b])}
            >
              {copied === b ? t(w('copied')) : t(w('copy'))}
            </button>
          </li>
        ))}
      </ul>
      {copied?.startsWith('!') && (
        <p className="form-error" role="status">
          {t(w('copyFailed'))}
        </p>
      )}
    </>
  );
}

/** How to file it: the steps in Renta WEB, the guide and the official website. */
function HowToPresent({ onHowToFile }: { onHowToFile?: (slug: string) => void }) {
  const { t } = useI18n();
  return (
    <>
      <ol className="wiz-steps-list">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <li key={n}>{t(w(`file.${n}`))}</li>
        ))}
      </ol>
      <div className="button-row">
        {onHowToFile && (
          <button type="button" className="btn-secondary" onClick={() => onHowToFile('renta-web')}>
            {t(w('fileGuide'))}
          </button>
        )}
        <a className="btn-secondary" href={AEAT} target="_blank" rel="noopener noreferrer">
          {t('app.renta.aeat')}
        </a>
      </div>
      <p className="plan-note">{t(w('notFiled'))}</p>
    </>
  );
}

function resultScreens(ctx: Ctx): WizardScreen[] {
  const { p, t, mode } = ctx;
  return [
    {
      id: 'result',
      title: t(w('q.result')),
      hint: t(w('hint.result')),
      help: t(w('help.result')),
      ready: p.shown !== null,
      skipLabel: t(w('skip.result')),
      body: (
        <ResultSection
          n={9}
          access={p.access}
          shown={p.shown}
          busy={p.busy}
          pending={p.pending}
          calculate={p.calculate}
          mode={mode}
          invest={<InvestLink form={p.form} onGo={() => ctx.goStep(INVEST_STEP)} />}
          imported={p.form.savingsDetail?.imported}
          input={p.input}
        />
      ),
    },
    {
      id: 'boxes',
      title: t(w('q.boxes')),
      hint: t(w('hint.boxes')),
      help: t(w('help.boxes')),
      ready: true,
      noSkip: true,
      body: <BoxesToCopy p={p} />,
    },
    {
      id: 'file',
      title: t(w('q.file')),
      hint: t(w('hint.file')),
      ready: true,
      noSkip: true,
      body: (
        <>
          <HowToPresent onHowToFile={ctx.onHowToFile} />
          {p.shown && <RentaFormPreview result={p.shown.result} input={p.input} year={ctx.year} />}
        </>
      ),
    },
  ];
}

/** Every step with its screens, as the data is now. */
export function rentaSteps(ctx: Ctx): WizardStepView[] {
  const screens: Record<string, WizardScreen[]> = {
    you: youStep(ctx),
    family: [guided(ctx, 'disability'), guided(ctx, 'family'), guided(ctx, 'joint')],
    work: workStep(ctx),
    home: [guided(ctx, 'housing'), guided(ctx, 'property')],
    invest: [importScreen(ctx), investScreen(ctx)],
    activity: [activityScreen(ctx)],
    deductions: deductionScreens(ctx),
    review: [reviewScreen(ctx)],
    result: resultScreens(ctx),
  };
  return RENTA_STEPS.map((s) => ({
    id: s.id,
    title: ctx.t(w(`step.${s.id}`)),
    icon: ICONS[s.id],
    badge: ctx.t(w(`badge.${s.id}`)),
    screens: screens[s.id],
  }));
}

/** The end: what the review saves, the result and the reminder that nothing is filed. */
function Finale({ p, money }: { p: RentaPlannerState; money: (n: number) => string }) {
  const { t } = useI18n();
  return (
    <>
      <p className="wiz-hint">{t(w('finale'))}</p>
      {p.saved > 0 && (
        <p className="wiz-saving">{t(w('finaleSaved'), { amount: money(p.saved) })}</p>
      )}
      {p.shown && (
        <p className="wiz-saving">
          {t(p.shown.result.result >= 0 ? 'tools.renta.toPay' : 'tools.renta.refund')}:{' '}
          <strong>{money(Math.abs(p.shown.result.result))}</strong>
        </p>
      )}
      <p className="plan-note">{t(w('notFiled'))}</p>
    </>
  );
}

interface RentaWizardProps {
  mode: RentaMode;
  initialIncome?: string;
  year?: number;
  onExpert: () => void;
  /** Opens the self-employed screen (in the app), to bring the activity. */
  onOpenAutonomo?: () => void;
  /** Opens a guide of «Hacienda paso a paso» (in the app). */
  onHowToFile?: (slug: string) => void;
}

/** The Renta step by step: the same planner, one short question at a time. */
export function RentaWizard({
  mode,
  initialIncome = '',
  year = rentaState.year,
  onExpert,
  onOpenAutonomo,
  onHowToFile,
}: RentaWizardProps) {
  const { t } = useI18n();
  const money = useMoney();
  const p = useRentaPlanner({ initialIncome, mode, year });
  const controls = useWizardProgress(wizardKey(year), RENTA_STEPS);
  const ctx: Ctx = {
    p,
    t,
    money,
    mode,
    answers: controls.progress.answers,
    answer: controls.answer,
    onOpenAutonomo,
    onHowToFile,
    goStep: controls.go,
    year,
  };
  return (
    <Wizard
      flow="renta"
      defs={RENTA_STEPS}
      steps={rentaSteps(ctx)}
      controls={controls}
      onExpert={onExpert}
      screenAction={
        <NewReturn
          year={year}
          hasActivity={(p.form.activities?.length ?? 0) > 0}
          onConfirm={(alsoActivity) => {
            p.startNew(alsoActivity);
            controls.restart();
          }}
        />
      }
      finale={<Finale p={p} money={money} />}
    />
  );
}

/**
 * The Renta: step by step (the assistant, by default) or everything together (expert mode), as
 * the person chose last on this device. Both fill in the same data: nothing is lost switching.
 */
export function RentaAssistant(props: Omit<RentaWizardProps, 'onExpert'>) {
  const { t } = useI18n();
  const [expert, setExpert] = useAssistantMode(ASSISTANT_KEY);
  if (expert) {
    return (
      <>
        <button type="button" className="btn-secondary wiz-switch" onClick={() => setExpert(false)}>
          {t('wizard.backToSteps')}
        </button>
        <RentaPlanner mode={props.mode} initialIncome={props.initialIncome} year={props.year} />
      </>
    );
  }
  return <RentaWizard {...props} onExpert={() => setExpert(true)} />;
}
