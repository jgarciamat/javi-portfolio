import { PremiumOnly } from '@modules/billing/ui/PremiumOnly';
import { AssetsCard } from '../components/AssetsCard';

/** Investments, property and debts valued by hand: they feed the net worth of the analysis. */
export function AssetsView() {
  return (
    <PremiumOnly icon="bank" titleKey="app.tabs.assets" hintKey="app.assets.locked">
      <div className="section-view">
        <AssetsCard />
      </div>
    </PremiumOnly>
  );
}
