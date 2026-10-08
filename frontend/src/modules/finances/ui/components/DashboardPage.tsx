import { PlanProvider } from '@modules/billing/application/PlanContext';
import { FinancesProvider } from '../../application/FinancesContext';
import { Dashboard } from './Dashboard';

/** The signed-in app: plan and finances data around the dashboard (one lazy chunk). */
export function DashboardPage() {
  return (
    <PlanProvider>
      <FinancesProvider>
        <Dashboard />
      </FinancesProvider>
    </PlanProvider>
  );
}
