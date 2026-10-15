import { AutonomoDraftCard } from '../components/AutonomoDraftCard';

/**
 * Self-employed: the draft of the quarterly VAT and income-tax forms, with the income and the expenses
 * typed by hand. Open to everybody: the free plan prepares one draft, Premium as many as it wants.
 */
export function BusinessView() {
  return (
    <div className="section-view">
      <AutonomoDraftCard />
    </div>
  );
}
