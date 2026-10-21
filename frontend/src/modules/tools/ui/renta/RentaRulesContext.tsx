import { createContext, useContext } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { MissingPart, RentaRules } from '../../domain/rentaRules';
import { DEFAULT_RENTA_YEAR, rentaRules } from '../../data/renta/ejercicios';

/** The rules of the year of the return being filled in (the campaign of 2025 by default). */
const RulesContext = createContext<RentaRules>(rentaRules(DEFAULT_RENTA_YEAR));

export const RentaRulesProvider = RulesContext.Provider;

export const useRentaRules = (): RentaRules => useContext(RulesContext);

/**
 * The year's figures that are still to be published, at the top of the planner: a provisional year
 * says so, and what the return needs and is missing keeps the result back (never another year's).
 */
export function YearNotice({ blockers, ccaaName }: { blockers: MissingPart[]; ccaaName: string }) {
  const { t } = useI18n();
  const rules = useRentaRules();
  if (rules.status === 'confirmed' && blockers.length === 0) return null;
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
    </div>
  );
}
