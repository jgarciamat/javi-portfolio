import { createContext, useContext } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { MissingPart, RentaRules } from '../../domain/rentaRules';
import { DEFAULT_RENTA_YEAR, rentaRules } from '../../data/renta/ejercicios';

/** The rules of the year of the return being filled in (the campaign of 2025 by default). */
const RulesContext = createContext<RentaRules>(rentaRules(DEFAULT_RENTA_YEAR));

export const RentaRulesProvider = RulesContext.Provider;

export const useRentaRules = (): RentaRules => useContext(RulesContext);

/** What the year is missing for this return (rentaRules.ts, blockersOf) and the community's name. */
interface Held {
  blockers: MissingPart[];
  ccaaName: string;
}

const HeldContext = createContext<Held>({ blockers: [], ccaaName: '' });

export const RentaHeldProvider = HeldContext.Provider;

/**
 * Whether the figures worked out with the year's rules are kept back: the year misses some of
 * `parts` (any of them when none is given) for this return. A figure without them would be partial,
 * and no figure is better than a wrong one (savings of a deduction, the comparison with the draft…).
 */
export function useHeld(parts?: MissingPart[]): boolean {
  const { blockers } = useContext(HeldContext);
  return parts ? blockers.some((b) => parts.includes(b)) : blockers.length > 0;
}

/** In the place of a figure kept back: what is missing, the community's figures first. */
export function HeldNote({ parts }: { parts?: MissingPart[] }) {
  const { t } = useI18n();
  const { year } = useRentaRules();
  const { blockers, ccaaName } = useContext(HeldContext);
  const missing = parts ? blockers.filter((b) => parts.includes(b)) : blockers;
  if (missing.length === 0) return null;
  return (
    <p className="section-hint renta-held" role="status">
      {missing.includes('regions')
        ? t('tools.renta.year.held', { name: ccaaName, year })
        : t('tools.renta.year.heldOther', { year })}
    </p>
  );
}

/**
 * The year's figures that are still to be published, at the top of the planner: a provisional year
 * says so, and what the return needs and is missing keeps the result back (never another year's).
 */
export function YearNotice({
  blockers,
  ccaaName,
  notInApp = [],
}: {
  blockers: MissingPart[];
  ccaaName: string;
  /** The community's deductions of the year that the app does not calculate. */
  notInApp?: string[];
}) {
  const { t } = useI18n();
  const rules = useRentaRules();
  if (rules.status === 'confirmed' && blockers.length === 0 && notInApp.length === 0) return null;
  return (
    <div className="section-hint renta-provisional" role="note">
      {rules.status === 'provisional' && (
        <p>{t('tools.renta.year.provisional', { year: rules.year })}</p>
      )}
      {blockers.length > 0 && (
        <>
          <p>{t('tools.renta.year.missing', { year: rules.year })}</p>
          <ul>
            {blockers.map((b) => (
              <li key={b}>
                {t(`tools.renta.year.part.${b}`, { year: rules.year, name: ccaaName })}
              </li>
            ))}
          </ul>
        </>
      )}
      {notInApp.length > 0 && (
        <>
          <p>{t('tools.renta.year.notInApp', { year: rules.year, name: ccaaName })}</p>
          <ul>
            {notInApp.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
