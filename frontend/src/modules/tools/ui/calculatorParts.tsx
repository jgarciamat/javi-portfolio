import { useI18n } from '@core/i18n/I18nContext';

/** A line of a breakdown: label, amount and whether it is a total. */
export type Row = [string, string, boolean?];

/** The rows that apply: `false` leaves a line out. */
export const rowsOf = (...rows: (Row | false)[]): Row[] => rows.filter((r): r is Row => !!r);

/** A percentage as the visitor writes numbers: 4,7 % / 4.7 %. */
export function usePercent() {
  const { locale } = useI18n();
  return (n: number) =>
    `${n.toLocaleString(locale === 'en' ? 'en-GB' : 'es-ES', { maximumFractionDigits: 2 })} %`;
}

/** The date the official sources were checked, as the visitor reads dates. */
export function useSourceDate(iso: string): string {
  const { locale } = useI18n();
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** The official sources of a calculator (`<prefix>.source1…`) and the day they were checked. */
export function Sources({
  prefix,
  links,
  date,
}: {
  prefix: string;
  links: string[];
  date: string;
}) {
  const { t } = useI18n();
  const checked = useSourceDate(date);
  return (
    <section className="tools-sources">
      <h2>{t('tools.sources.title')}</h2>
      <ul>
        {links.map((url, i) => (
          <li key={url}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {t(`${prefix}.source${i + 1}`)}
            </a>
          </li>
        ))}
      </ul>
      <p className="plan-note">{t('tools.sources.checked', { date: checked })}</p>
    </section>
  );
}

export function Breakdown({ rows }: { rows: Row[] }) {
  return (
    <table className="pricing-table tools-breakdown">
      <tbody>
        {rows.map(([label, value, strong]) => (
          <tr key={label} className={strong ? 'tools-breakdown-total' : undefined}>
            <th scope="row">{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A checkbox with its text, in the calculators' form grid. */
export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="tools-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
