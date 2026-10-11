import { PremiumOnly } from '@modules/billing/ui/PremiumOnly';
import { SelfEmployedCard } from '../components/SelfEmployedCard';

/** Self-employed: professional categories and the quarterly VAT / income-tax estimate. */
export function BusinessView() {
  return (
    <PremiumOnly icon="briefcase" titleKey="app.tabs.business" hintKey="app.tax.locked">
      <div className="section-view">
        <SelfEmployedCard />
      </div>
    </PremiumOnly>
  );
}
