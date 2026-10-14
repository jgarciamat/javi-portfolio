import { AutonomoDraftCard } from '../components/AutonomoDraftCard';
import { SelfEmployedCard } from '../components/SelfEmployedCard';

/**
 * Self-employed: professional categories, the quarterly VAT / income-tax estimate and the draft of the
 * quarterly forms. Open to everybody: the free plan prepares one draft, Premium as many as it wants.
 */
export function BusinessView() {
  return (
    <div className="section-view">
      <SelfEmployedCard />
      <AutonomoDraftCard />
    </div>
  );
}
