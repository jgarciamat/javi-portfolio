import type { ImportedSavings, ImportSource } from '../rentaGains';
import { withheldInOf } from './formats';
import { buildLedger } from './ledger';
import type { CertificateLine } from './pdfReports';

/**
 * What «Llevar a mi Renta» keeps of each file, so that one file can be taken out and the rest
 * worked out again (also from the card of the planner, once the import screen is closed).
 */

/** The certificate lines the person ticked, added to what the files gave. */
export function withCertificate(base: ImportedSavings, lines: CertificateLine[]): ImportedSavings {
  const out: ImportedSavings = {
    ...base,
    capital: { ...base.capital },
    otherGains: [...base.otherGains],
    withheld: { ...base.withheld },
  };
  for (const l of lines) {
    if (l.field === 'interest') out.capital.interest += l.amount;
    if (l.field === 'dividends') out.capital.dividends += l.amount;
    if (l.field === 'expenses') out.capital.expenses += l.amount;
    if (l.field === 'withheld') out.withheld.capital += l.amount;
    if (l.field === 'gains') out.otherGains.push(l.amount);
    if (l.field === 'losses') out.otherGains.push(-l.amount);
  }
  return out;
}

/** The savings of the files from their operations in euros (no exchange rates needed). */
export function importedFrom(
  sources: ImportSource[],
  options: { year: number; professional: boolean },
  files: string[]
): ImportedSavings {
  const ledger = buildLedger(
    sources.flatMap((s) => s.ops),
    {
      year: options.year,
      rates: {},
      professional: options.professional,
      withheldIn: withheldInOf(),
    }
  );
  return withCertificate(
    { ...ledger.imported, files, sources, options },
    sources.flatMap((s) => s.certificate)
  );
}

/**
 * The import without one file: worked out again with the rest; null when nothing is left;
 * 'unknown' for an import saved before the files were kept apart (it cannot be split).
 */
export function withoutFile(
  imported: ImportedSavings,
  file: string
): ImportedSavings | null | 'unknown' {
  if (!imported.sources || !imported.options) return 'unknown';
  const sources = imported.sources.filter((s) => s.file !== file);
  const files = imported.files.filter((f) => f !== file);
  if (sources.every((s) => s.ops.length === 0 && s.certificate.length === 0)) return null;
  return importedFrom(sources, imported.options, files);
}
