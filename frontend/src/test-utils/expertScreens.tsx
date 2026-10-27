import type { ComponentType } from 'react';

/**
 * Tests of the full forms (AutonomoDraftCard, RentaPlanner). The app only shows the assistant now;
 * these forms are rendered in its place when a test sets the old key to 'expert'.
 */
const wantsExpert = (key: string) => {
  try {
    return localStorage.getItem(key) === 'expert';
  } catch {
    return false;
  }
};

export function autonomoWithForm(): Record<string, unknown> {
  const real = jest.requireActual('@modules/finances/ui/components/AutonomoWizard');
  const { AutonomoDraftCard } = jest.requireActual(
    '@modules/finances/ui/components/AutonomoDraftCard'
  );
  const Assistant: ComponentType<Record<string, unknown>> = (props) =>
    wantsExpert('mm_autonomo_assistant') ? (
      <AutonomoDraftCard {...props} />
    ) : (
      <real.AutonomoWizard {...props} />
    );
  return { ...real, AutonomoAssistant: Assistant };
}

export function rentaWithForm(): Record<string, unknown> {
  const real = jest.requireActual('@modules/tools/ui/renta/RentaWizard');
  const { RentaPlanner } = jest.requireActual('@modules/tools/ui/RentaPlanner');
  const Assistant: ComponentType<{ mode: string; initialIncome?: string; year?: number }> = (
    props
  ) =>
    wantsExpert('mm_renta_assistant') ? (
      <RentaPlanner mode={props.mode} initialIncome={props.initialIncome} year={props.year} />
    ) : (
      <real.RentaWizard {...props} />
    );
  return { ...real, RentaAssistant: Assistant };
}
