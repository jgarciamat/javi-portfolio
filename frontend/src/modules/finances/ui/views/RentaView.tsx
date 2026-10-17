import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { Icon } from '@shared/components/Icon';
import { requestHaciendaGuide } from '@modules/guides/application/haciendaLink';
import { HowToFile } from '@modules/guides/ui/HaciendaGuides';
import type { DashboardTab } from '../navigation';
import { useFinances } from '../../application/FinancesContext';
import { useAnnualSummary } from '../../application/hooks/useAnnualSummary';
import '@modules/tools/ui/css/Tools.css';
import '../css/Sections.css';

const AEAT = 'https://sede.agenciatributaria.gob.es/';
const CHECKLIST = ['data', 'certificate', 'receipts', 'review'] as const;

/** Income tax return (Renta): the figures of the year, whether to file, and what to gather. */
export function RentaView({ onOpenTab }: { onOpenTab?: (tab: DashboardTab) => void }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const { currentPeriod } = useFinances();
  // The return filed in spring is the one of the previous year.
  const [year, setYear] = useState(currentPeriod.year - 1);
  const { data } = useAnnualSummary(year);
  const months = Object.values(data?.months ?? {});
  const income = months.reduce((sum, m) => sum + m.income, 0);
  const expenses = months.reduce((sum, m) => sum + m.expenses, 0);
  const years = [currentPeriod.year, currentPeriod.year - 1, currentPeriod.year - 2];

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
        <p className="section-hint">{t('app.renta.hint')}</p>
        <p>{t('app.renta.figures', { year, income: money(income), expenses: money(expenses) })}</p>
        <div className="tools-main renta-tools">
          <RentaPlanner
            key={`${year}-${Math.round(income)}`}
            mode="account"
            initialIncome={income > 0 ? String(Math.round(income)) : ''}
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
        {onOpenTab && (
          <HowToFile
            slugs={['renta-web', 'antes-de-empezar']}
            onOpen={(slug) => {
              requestHaciendaGuide(slug);
              onOpenTab('hacienda');
            }}
          />
        )}
      </div>
    </div>
  );
}
