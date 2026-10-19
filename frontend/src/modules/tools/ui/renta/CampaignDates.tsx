import { useI18n } from '@core/i18n/I18nContext';
import { campaignFor, campaignPhase, daysUntil } from '../../domain/rentaCampaign';
import { useDate } from './shared';
import '../css/Renta.css';

const MILESTONES = [
  'start',
  'phoneAppointments',
  'officeAppointments',
  'directDebitEnd',
  'end',
] as const;

/** The dates of the campaign of a tax year, and how many days are left (or that it is closed). */
export function CampaignDates({ exercise }: { exercise: number }) {
  const { t } = useI18n();
  const longDate = useDate();
  // Midday: a bare date would be read as midnight UTC, the day before west of Greenwich.
  const date = (iso: string) => longDate(`${iso}T12:00:00`);
  const campaign = campaignFor(exercise);
  const title = t('tools.renta.campaign.title', { year: exercise, filed: exercise + 1 });
  const today = new Date();
  const phase = campaignPhase(campaign, today);
  const days = (iso: string) => daysUntil(iso, today);
  const when = (iso: string) => {
    const n = days(iso);
    if (n === 0) return t('tools.renta.campaign.today');
    return n > 0 ? t('tools.renta.campaign.inDays', { count: n }) : t('tools.renta.campaign.past');
  };
  const headline =
    phase === 'before'
      ? t('tools.renta.campaign.before', {
          date: date(campaign.start),
          count: days(campaign.start),
        })
      : phase === 'open'
      ? t('tools.renta.campaign.open', { date: date(campaign.end), count: days(campaign.end) })
      : t('tools.renta.campaign.closed', { date: date(campaign.end) });

  return (
    <section className="renta-campaign" aria-label={title}>
      <h3>
        {title}
        {!campaign.confirmed && (
          <em className="renta-badge">{t('tools.renta.campaign.expected')}</em>
        )}
      </h3>
      <p className={`renta-campaign-status renta-campaign-status--${phase}`} role="status">
        {headline}
      </p>
      {phase === 'closed' && <p className="section-hint">{t('tools.renta.campaign.late')}</p>}
      <ul className="renta-minimum">
        {MILESTONES.map((key) => (
          <li key={key} className={days(campaign[key]) < 0 ? 'renta-campaign-past' : ''}>
            <span>{t(`tools.renta.campaign.${key}`)}</span>
            <span>
              <strong>{date(campaign[key])}</strong> · {when(campaign[key])}
            </span>
          </li>
        ))}
      </ul>
      <small className="renta-field-hint">
        {campaign.confirmed
          ? t('tools.renta.campaign.source', { date: date(campaign.checkedOn) })
          : t('tools.renta.campaign.expectedHint')}{' '}
        <a href={campaign.source} target="_blank" rel="noopener noreferrer">
          {t('tools.renta.campaign.sourceLink')}
        </a>
      </small>
    </section>
  );
}
