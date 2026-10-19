import type { ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { HowToFile } from '@modules/guides/ui/HaciendaGuides';
import { PrepareRenta } from '@modules/tools/ui/renta/PrepareRenta';
import { useAssistantMode } from '@modules/wizard/application/useWizard';
import { Choice } from '@modules/wizard/ui/Choice';
import { Wizard, type WizardScreen, type WizardStepView } from '@modules/wizard/ui/Wizard';
import { AUTONOMO_ASSISTANT_KEY, AUTONOMO_STEPS } from '../../domain/autonomoWizard';
import { ActivityPanel, ActivitySummaryPanel } from './AutonomoActivity';
import { AnnualPanel } from './AutonomoAnnual';
import { AutonomoCloudPanel } from './AutonomoCloud';
import { AutonomoDraftCard, ExtrasPanel, PeriodPicker, PrepareGate } from './AutonomoDraftCard';
import { DraftResult } from './AutonomoDraftResult';
import { AutonomoImport } from './AutonomoImport';
import { PriorPanel, ProfilePanel, QuarterPanels } from './AutonomoManual';
import { AutonomoSummary, summarize } from './AutonomoSummary';
import { WithholdingsForm, WithholdingsPanel } from './AutonomoWithholdings';
import { ImportChecks } from './ImportChecks';
import { InvoiceReview } from './InvoiceReview';
import { annualOf } from './autonomoInputs';
import { bringIntoView } from './bringIntoView';
import { vatExtrasOf, type VatExtras } from './vatForm';
import { YEARS, useAutonomoDraft, type AutonomoState } from './useAutonomoDraft';
import { Icon } from '@shared/components/Icon';
import '../css/Sections.css';
import '../css/Autonomo.css';

const ICONS: Record<string, string> = {
  activity: 'briefcase',
  import: 'upload',
  review: 'search',
  quarter: 'receipt',
  withholdings: 'user',
  checks: 'shield',
  downloads: 'download',
  renta: 'flag',
};
const REGIMES: VatExtras['regime'][] = ['general', 'simplified', 'reagp'];
const STEP_OF = (id: string) => AUTONOMO_STEPS.findIndex((s) => s.id === id);

type Translate = ReturnType<typeof useI18n>['t'];

interface Ctx {
  s: AutonomoState;
  t: Translate;
  /** Goes to the step of the quarter (from a warning about one). */
  goQuarter: () => void;
  onHowToFile?: (slug: string) => void;
  onOpenRenta?: () => void;
}

const w = (key: string) => `wizard.autonomo.${key}`;

/** A question of the assistant: one tap among a few options, kept in its progress. */
function asked(
  ctx: Ctx,
  id: string,
  options: string[],
  body?: (answer: string | undefined) => ReactNode,
  onPick?: (value: string) => void
): WizardScreen {
  const { s, t } = ctx;
  const answer = s.wizard.progress.answers[id];
  return {
    id,
    title: t(w(`q.${id}`)),
    hint: t(w(`hint.${id}`)),
    help: t(w(`help.${id}`)),
    ready: answer !== undefined && options.includes(answer),
    body: (
      <>
        <Choice
          name={`autonomo-wiz-${id}`}
          label={t(w(`q.${id}`))}
          options={options.map((value) => ({
            value,
            label: t(w(`opt.${id}.${value}`)),
          }))}
          value={answer}
          onChange={(value) => {
            s.wizard.answer(id, value);
            onPick?.(value);
          }}
        />
        {body?.(answer)}
      </>
    ),
  };
}

function activityScreens(ctx: Ctx): WizardScreen[] {
  const { s, t } = ctx;
  const setProfile = (patch: Partial<AutonomoState['manual']['profile']>) =>
    s.changeManual({ ...s.manual, profile: { ...s.manual.profile, ...patch } });
  return [
    {
      id: 'period',
      title: t(w('q.period')),
      hint: t(w('hint.period')),
      help: t(w('help.period')),
      ready: true,
      noSkip: true,
      body: (
        <PeriodPicker
          year={s.year}
          quarter={s.quarter}
          onYear={s.setYear}
          onQuarter={s.setQuarter}
        />
      ),
    },
    asked(ctx, 'regime', REGIMES, undefined, (regime) =>
      s.setExtras({
        ...s.extras,
        vat: { ...vatExtrasOf(s.extras.vat), regime: regime as VatExtras['regime'] },
      })
    ),
    asked(ctx, 'retained', ['yes', 'no'], undefined, (v) =>
      s.setExtras({ ...s.extras, exempt: v === 'yes' })
    ),
    asked(ctx, 'simplified', ['yes', 'no'], undefined, (v) =>
      s.setExtras({ ...s.extras, hardToJustify: v === 'yes' })
    ),
    asked(ctx, 'home', ['yes', 'no'], (answer) =>
      answer === 'yes' ? <ProfilePanel profile={s.manual.profile} onChange={setProfile} /> : null
    ),
  ];
}

function importScreens(ctx: Ctx): WizardScreen[] {
  const { s, t } = ctx;
  const files = asked(ctx, 'files', ['files', 'manual'], (answer) =>
    answer === 'files' ? (
      <AutonomoImport
        key={s.wipes}
        form={s.manual}
        year={s.year}
        years={YEARS}
        onChange={s.changeManual}
        onPeriod={s.setPeriod}
        onShow={s.showInvoice}
        onCarry={s.carry}
      />
    ) : answer === 'manual' ? (
      <p className="section-hint">{t(w('manualLater'))}</p>
    ) : null
  );
  const imported = s.manual.invoices.length;
  const screens: WizardScreen[] = [
    {
      ...files,
      ready: s.wizard.progress.answers.files === 'manual' || imported > 0,
      missing: t(w('missing.files')),
      warning: imported > 0 ? t(w('imported'), { count: imported }) : null,
    },
  ];
  if (s.quarter > 1) {
    const setPrior = (patch: Partial<AutonomoState['manual']['prior']>) =>
      s.changeManual({ ...s.manual, prior: { ...s.manual.prior, ...patch } });
    screens.push(
      asked(
        ctx,
        'prior',
        ['yes', 'no'],
        (answer) =>
          answer === 'yes' ? <PriorPanel prior={s.manual.prior} onChange={setPrior} /> : null,
        (v) => setPrior({ on: v === 'yes' })
      )
    );
  }
  return screens;
}

function reviewScreens(ctx: Ctx): WizardScreen[] {
  const { s, t } = ctx;
  const checks = (
    <ImportChecks
      checks={s.checks}
      invoices={s.manual.invoices}
      onInvoice={s.showInvoice}
      onQuarter={ctx.goQuarter}
    />
  );
  if (s.manual.invoices.length === 0) {
    return [
      {
        id: 'invoices',
        title: t(w('q.invoices')),
        hint: t(w('hint.noInvoices')),
        ready: true,
        noSkip: true,
        body: checks,
      },
    ];
  }
  const screen = asked(ctx, 'invoices', ['yes'], () => null);
  return [
    {
      ...screen,
      body: (
        <>
          <InvoiceReview form={s.manual} onChange={s.changeManual} focus={s.focus} />
          {checks}
          {screen.body}
        </>
      ),
    },
  ];
}

/** Whether the draft on screen is the one of the period chosen. */
const draftOfPeriod = (s: AutonomoState) =>
  s.snapshot !== null && s.snapshot.draft.year === s.year && s.snapshot.draft.quarter === s.quarter;

function quarterScreens(ctx: Ctx): WizardScreen[] {
  const { s, t } = ctx;
  return [
    {
      id: 'amounts',
      title: t(w('q.amounts'), { n: s.quarter }),
      hint: t(w('hint.amounts')),
      help: t(w('help.amounts')),
      ready: true,
      noSkip: true,
      body: (
        <>
          <QuarterPanels
            form={s.manual}
            onChange={s.changeManual}
            upTo={s.quarter}
            year={s.year}
            vatExtras={s.extras.vat}
          />
          <details className="renta-group">
            <summary>{t(w('advanced'))}</summary>
            <ExtrasPanel
              extras={s.extras}
              quarter={s.quarter}
              onChange={(patch) => s.setExtras({ ...s.extras, ...patch })}
            />
          </details>
        </>
      ),
    },
    {
      id: 'prepare',
      title: t(w('q.prepare')),
      hint: t(w('hint.prepare')),
      help: t(w('help.prepare')),
      ready: draftOfPeriod(s),
      skipLabel: t(w('skip.prepare')),
      body: (
        <>
          {s.action.error && <p className="form-error">{s.action.error}</p>}
          <PrepareGate
            access={s.access}
            pending={s.action.pending}
            onPrepare={() => void s.prepare()}
          />
          {draftOfPeriod(s) && (
            <DraftResult
              draft={(s.snapshot as NonNullable<AutonomoState['snapshot']>).draft}
              inputs={(s.snapshot as NonNullable<AutonomoState['snapshot']>).inputs}
              part="summary"
            />
          )}
        </>
      ),
    },
  ];
}

function withholdingScreens(ctx: Ctx): WizardScreen[] {
  const { s } = ctx;
  return [
    asked(ctx, 'withholdings', ['yes', 'no'], (answer) =>
      answer === 'yes' ? (
        <>
          <WithholdingsForm
            form={s.manual}
            onChange={s.changeManual}
            year={s.year}
            upTo={s.quarter}
          />
          <WithholdingsPanel
            form={s.manual}
            year={s.year}
            quarter={s.quarter}
            onFocus={s.setFocus}
          />
        </>
      ) : null
    ),
  ];
}

function checkScreens(ctx: Ctx): WizardScreen[] {
  const { s, t } = ctx;
  const warnings = s.checks.length;
  const read = asked(ctx, 'warnings', ['yes'], () => null);
  return [
    asked(ctx, 'assets', ['yes', 'no'], (answer) =>
      answer === 'yes' ? (
        <ActivityPanel
          value={s.manual.activity}
          year={s.year}
          reagp={vatExtrasOf(s.extras.vat).regime === 'reagp'}
          onChange={s.setActivity}
        />
      ) : null
    ),
    {
      ...read,
      hint: t(warnings > 0 ? w('hint.warnings') : w('hint.noWarnings')),
      ready: warnings === 0 || read.ready,
      noSkip: warnings === 0,
      body: (
        <>
          <AutonomoSummary
            year={s.year}
            quarter={s.quarter}
            summary={summarize(s.manual, s.quarter, s.checks, !s.hasData, s.year)}
            onPeriod={() => s.wizard.go(0)}
            onQuarter={ctx.goQuarter}
            onChecks={() => bringIntoView('autonomo-checks', ['h3'])}
          />
          <ImportChecks
            checks={s.checks}
            invoices={s.manual.invoices}
            onInvoice={(id) => {
              s.showInvoice(id);
              s.wizard.go(STEP_OF('review'));
            }}
            onQuarter={ctx.goQuarter}
          />
          {warnings > 0 && read.body}
        </>
      ),
    },
  ];
}

function downloadScreens(ctx: Ctx): WizardScreen[] {
  const { s, t } = ctx;
  return [
    {
      id: 'downloads',
      title: t(w('q.downloads')),
      hint: t(w('hint.downloads')),
      help: t(w('help.downloads')),
      ready: true,
      noSkip: true,
      body: (
        <>
          {s.snapshot ? (
            <DraftResult draft={s.snapshot.draft} inputs={s.snapshot.inputs} part="files" />
          ) : (
            <p className="section-hint">{t(w('noDraft'))}</p>
          )}
          <AnnualPanel form={s.manual} year={s.year} />
        </>
      ),
    },
  ];
}

function rentaScreens(ctx: Ctx): WizardScreen[] {
  const { s, t, onOpenRenta, onHowToFile } = ctx;
  const annual = annualOf(s.manual, s.extras, s.year);
  return [
    {
      id: 'renta',
      title: t(w('q.renta')),
      hint: t(w('hint.renta')),
      ready: true,
      noSkip: true,
      body: (
        <>
          {s.hasManual ? (
            <>
              <ActivitySummaryPanel annual={annual} />
              <PrepareRenta annual={annual} onOpen={onOpenRenta} />
            </>
          ) : (
            <p className="section-hint">{t(w('nothingYet'))}</p>
          )}
          {onHowToFile && <HowToFile slugs={['modelo-303', 'modelo-130']} onOpen={onHowToFile} />}
        </>
      ),
    },
  ];
}

export function autonomoSteps(ctx: Ctx): WizardStepView[] {
  const screens: Record<string, WizardScreen[]> = {
    activity: activityScreens(ctx),
    import: importScreens(ctx),
    review: reviewScreens(ctx),
    quarter: quarterScreens(ctx),
    withholdings: withholdingScreens(ctx),
    checks: checkScreens(ctx),
    downloads: downloadScreens(ctx),
    renta: rentaScreens(ctx),
  };
  return AUTONOMO_STEPS.map((step) => ({
    id: step.id,
    title: ctx.t(w(`step.${step.id}`)),
    icon: ICONS[step.id],
    badge: ctx.t(w(`badge.${step.id}`)),
    screens: screens[step.id],
  }));
}

interface AutonomoWizardProps {
  onExpert: () => void;
  onHowToFile?: (slug: string) => void;
  onOpenRenta?: () => void;
}

/** The self-employed screen step by step: the same data, one short question at a time. */
export function AutonomoWizard({ onExpert, onHowToFile, onOpenRenta }: AutonomoWizardProps) {
  const { t } = useI18n();
  const s = useAutonomoDraft();
  return (
    <div className="card autonomo-card">
      <h2 className="section-title">
        <Icon name="receipt" /> {t('app.autonomo.title')}
      </h2>
      <p className="section-hint">{t(w('intro'))}</p>
      <Wizard
        flow="autonomo"
        defs={AUTONOMO_STEPS}
        steps={autonomoSteps({
          s,
          t,
          onHowToFile,
          onOpenRenta,
          goQuarter: () => s.wizard.go(STEP_OF('quarter')),
        })}
        controls={s.wizard}
        onExpert={onExpert}
        onRestart={s.wipeNow}
        finale={
          <>
            <p className="wiz-hint">{t(w('finale'))}</p>
            <p className="plan-note">{t(w('notFiled'))}</p>
          </>
        }
      />
      <AutonomoCloudPanel cloud={s.cloud} wipe={null} />
    </div>
  );
}

/**
 * Self-employed: step by step (the assistant, by default) or everything together, as the person
 * chose last on this device. Both work on the same data.
 */
export function AutonomoAssistant(props: Omit<AutonomoWizardProps, 'onExpert'>) {
  const { t } = useI18n();
  const [expert, setExpert] = useAssistantMode(AUTONOMO_ASSISTANT_KEY);
  if (expert) {
    return (
      <>
        <button type="button" className="btn-secondary wiz-switch" onClick={() => setExpert(false)}>
          {t('wizard.backToSteps')}
        </button>
        <AutonomoDraftCard {...props} />
      </>
    );
  }
  return <AutonomoWizard {...props} onExpert={() => setExpert(true)} />;
}
