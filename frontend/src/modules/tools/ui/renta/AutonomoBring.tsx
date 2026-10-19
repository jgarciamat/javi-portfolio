import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { AnnualActivity } from '@modules/finances/domain/annualActivity';
import {
  autonomoOnDevice,
  type DeviceAutonomo,
} from '@modules/finances/ui/components/autonomoForRenta';
import { activityFromAnnual, withAutonomoActivity } from '../../domain/rentaFromAutonomo';
import type { RentaForm } from '../../domain/rentaForm';
import { useMoney } from './shared';

/**
 * The self-employed year in the Renta: what it brings (income, expenses, depreciation, RETA,
 * withholdings, payments of the 130 and the net income), and the button of step 6 that brings it
 * from the self-employed screen of this device for the year of the return.
 */

/** The figures of the year that go to the Renta, to look at before taking them. */
export function AnnualFigures({ annual }: { annual: AnnualActivity }) {
  const { t } = useI18n();
  const money = useMoney();
  const k = 'tools.renta.bring.fig';
  const direct = annual.regime.startsWith('direct') || annual.regime.startsWith('agrarian');
  const rows: [string, number | null][] = [
    ['income', direct ? annual.income.total : null],
    ['expenses', direct ? annual.expenses.total : null],
    ['depreciation', annual.expenses.depreciation.total],
    ['reta', direct ? annual.expenses.reta : null],
    ['withholdings', annual.withholdings],
    ['payments', annual.payments130.total],
    ['net', annual.net],
  ];
  return (
    <ul className="renta-minimum renta-bring-figures">
      {rows
        .filter((r): r is [string, number] => r[1] !== null)
        .map(([key, amount]) => (
          <li key={key}>
            <span>{t(`${k}.${key}`)}</span> <strong>{money(amount)}</strong>
          </li>
        ))}
    </ul>
  );
}

type Outcome =
  | { kind: 'none' }
  | { kind: 'otherYear'; years: number[] }
  | { kind: 'modules' }
  | { kind: 'done'; annual: AnnualActivity };

/** What bringing the year finds: nothing, another year, an activity it cannot take, or the activity. */
export function bringOutcome(device: DeviceAutonomo): Outcome {
  if (!device.annual) return { kind: 'none' };
  if (!device.matches) return { kind: 'otherYear', years: device.years };
  if (!activityFromAnnual(device.annual)) return { kind: 'modules' };
  return { kind: 'done', annual: device.annual };
}

/**
 * Step 6: brings the activity of the self-employed screen of this device for the year of the
 * return, in one tap. Says plainly when there is none for that year and offers the other one.
 */
export function BringActivity({
  year,
  form,
  set,
  onYear,
  onOpenAutonomo,
}: {
  year: number;
  form: RentaForm;
  set: (patch: Partial<RentaForm>) => void;
  /** Changes the year of the return (the Renta of the account offers the last two). */
  onYear?: (year: number) => void;
  onOpenAutonomo?: () => void;
}) {
  const { t } = useI18n();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const bring = () => {
    const found = bringOutcome(autonomoOnDevice(year));
    if (found.kind === 'done') {
      const activity = activityFromAnnual(found.annual);
      set({ activities: withAutonomoActivity(form, activity!).activities });
    }
    setOutcome(found);
  };
  const k = 'tools.renta.bring';
  return (
    <div className="renta-block">
      <button type="button" className="btn-primary" onClick={bring}>
        {t(`${k}.button`, { year })}
      </button>
      {outcome?.kind === 'done' && (
        <div className="renta-recovered" role="status">
          <p>{t(`${k}.done`, { year })}</p>
          <AnnualFigures annual={outcome.annual} />
        </div>
      )}
      {outcome?.kind === 'otherYear' && (
        <div className="form-error" role="status">
          <p>{t(`${k}.otherYear`, { year, years: outcome.years.join(', ') })}</p>
          {onYear &&
            outcome.years.slice(0, 1).map((y) => (
              <button key={y} type="button" className="btn-secondary" onClick={() => onYear(y)}>
                {t(`${k}.switch`, { year: y })}
              </button>
            ))}
        </div>
      )}
      {(outcome?.kind === 'none' || outcome?.kind === 'modules') && (
        <div className="form-error" role="status">
          <p>{t(`${k}.${outcome.kind}`, { year })}</p>
          {onOpenAutonomo && (
            <button type="button" className="btn-secondary" onClick={onOpenAutonomo}>
              {t('wizard.renta.openAutonomo')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
