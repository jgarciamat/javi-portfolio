import { useEffect, useReducer, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { RentaAssistant } from '@modules/tools/ui/renta/RentaWizard';
import { CampaignDates } from '@modules/tools/ui/renta/CampaignDates';
import { YEAR_ACTIONS_ID } from '@modules/tools/ui/renta/NewReturn';
import {
  loadProgress,
  PROGRESS_EVENT,
  removeSavedAutonomo,
} from '@modules/tools/application/rentaProgress';
import { openingYear, yearsUpTo } from '@modules/tools/data/renta/ejercicios';
import { AUTONOMO_ACTIVITY } from '@modules/tools/domain/rentaFromAutonomo';
import { AnnualFigures } from '@modules/tools/ui/renta/AutonomoBring';
import { autonomoOnDevice } from '../components/autonomoForRenta';
import { Icon } from '@shared/components/Icon';
import { MobileFold } from '@shared/components/MobileFold';
import { requestHaciendaGuide } from '@modules/guides/application/haciendaLink';
import { HowToFile } from '@modules/guides/ui/HaciendaGuides';
import type { DashboardTab } from '../navigation';
import { useFinances } from '../../application/FinancesContext';
import { useAnnualSummary } from '../../application/hooks/useAnnualSummary';
import '@modules/tools/ui/css/Tools.css';
import '../css/Sections.css';

const AEAT = 'https://sede.agenciatributaria.gob.es/';
const CHECKLIST = ['data', 'certificate', 'receipts', 'review'] as const;

/**
 * The self-employed activity brought to the Renta of this year (from «Preparar mi declaración de la
 * renta» or step 6): what came, so the person sees at once that the Renta has it.
 */
function BroughtActivity({ year, onRemoved }: { year: number; onRemoved: () => void }) {
  const { t } = useI18n();
  // Read again whenever the planner saves (the activity can be taken out there).
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener(PROGRESS_EVENT, refresh);
    return () => window.removeEventListener(PROGRESS_EVENT, refresh);
  }, []);
  const annual = broughtActivity(year);
  if (!annual) return null;
  return (
    <div className="renta-recovered renta-brought" role="status">
      <p>{t('app.renta.brought', { year })}</p>
      <AnnualFigures
        annual={annual}
        onRemove={() => {
          removeSavedAutonomo();
          onRemoved();
        }}
      />
    </div>
  );
}

/** The self-employed year of the device, when the saved Renta of `year` has it. */
function broughtActivity(year: number) {
  const saved = loadProgress();
  const brought =
    saved?.year === year && (saved.form.activities ?? []).some((a) => a.name === AUTONOMO_ACTIVITY);
  return brought ? autonomoOnDevice(year).annual : null;
}

/** Income tax return (Renta): the figures of the year, whether to file, and what to gather. */
export function RentaView({ onOpenTab }: { onOpenTab?: (tab: DashboardTab) => void }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const { currentPeriod } = useFinances();
  // The years with rules up to the running one, the newest first (2024 can still be corrected).
  const years = yearsUpTo(currentPeriod.year);
  // The year of what was left half done; else the return filed in spring, the previous year's.
  const [year, setYear] = useState(() => openingYear(currentPeriod.year, loadProgress()?.year));
  // Bumped when the activity is taken out of the saved Renta: the planner reads it again.
  const [removals, setRemovals] = useState(0);
  const { data } = useAnnualSummary(year);
  const months = Object.values(data?.months ?? {});
  const income = months.reduce((sum, m) => sum + m.income, 0);
  const expenses = months.reduce((sum, m) => sum + m.expenses, 0);
  const howToFile = (slug: string) => {
    requestHaciendaGuide(slug);
    // Only offered with a way to open the tab.
    (onOpenTab as (tab: DashboardTab) => void)('hacienda');
  };

  return (
    <div className="section-view">
      <div className="card">
        <div className="section-header">
          <h2 className="section-title">
            <Icon name="file" /> {t('app.renta.title')}
          </h2>
          <select
            className="tx-input select-compact"
            aria-label={t('app.renta.year')}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {/* The expert mode puts «Start a new return» here, under the year. */}
        <div className="renta-year-actions" id={YEAR_ACTIONS_ID} />
        <MobileFold summary={t('app.renta.fold')}>
          <p className="section-hint">{t('app.renta.hint')}</p>
          <CampaignDates exercise={year} />
          {/* What the accounts recorded, for reference: not part of the return, so «Start a new
              return» leaves it (they are the person's own movements). */}
          <aside className="renta-reference-note" aria-label={t('app.renta.figuresLabel')}>
            <span className="renta-reference-label">{t('app.renta.figuresLabel')}</span>
            <p>
              {t('app.renta.figures', { year, income: money(income), expenses: money(expenses) })}
            </p>
          </aside>
        </MobileFold>
        <BroughtActivity year={year} onRemoved={() => setRemovals((n) => n + 1)} />
        {removals > 0 && !broughtActivity(year) && (
          <p className="renta-recovered" role="status">
            {t('tools.renta.removeActivity.removed')}
          </p>
        )}
        <div className="tools-main renta-tools">
          <RentaAssistant
            key={`${year}-${Math.round(income)}-${removals}`}
            mode="account"
            year={year}
            // The money that came into the accounts is not a salary of a self-employed person.
            initialIncome={income > 0 && !broughtActivity(year) ? String(Math.round(income)) : ''}
            onOpenAutonomo={onOpenTab && (() => onOpenTab('business'))}
            onYear={(y) => years.includes(y) && setYear(y)}
            onHowToFile={onOpenTab && howToFile}
          />
        </div>
      </div>
      <div className="card">
        <h2 className="section-title">
          <Icon name="clipboard" /> {t('app.renta.checklist')}
        </h2>
        <p className="section-hint">{t('app.renta.campaign')}</p>
        <ul className="renta-checklist">
          {CHECKLIST.map((item) => (
            <li key={item}>{t(`app.renta.check.${item}`)}</li>
          ))}
        </ul>
        <a className="btn-secondary" href={AEAT} target="_blank" rel="noopener noreferrer">
          {t('app.renta.aeat')}
        </a>
        {onOpenTab && <HowToFile slugs={['renta-web', 'antes-de-empezar']} onOpen={howToFile} />}
      </div>
    </div>
  );
}
