import { requestHaciendaGuide } from '@modules/guides/application/haciendaLink';
import { AutonomoDraftCard } from '../components/AutonomoDraftCard';
import type { DashboardTab } from '../navigation';

/**
 * Self-employed: the draft of the quarterly VAT and income-tax forms, with the income and the expenses
 * typed by hand. Open to everybody: the free plan prepares one draft, Premium as many as it wants.
 */
export function BusinessView({ onOpenTab }: { onOpenTab?: (tab: DashboardTab) => void }) {
  return (
    <div className="section-view">
      <AutonomoDraftCard
        onHowToFile={
          onOpenTab &&
          ((slug) => {
            requestHaciendaGuide(slug);
            onOpenTab('hacienda');
          })
        }
        onOpenRenta={onOpenTab && (() => onOpenTab('renta'))}
      />
    </div>
  );
}
