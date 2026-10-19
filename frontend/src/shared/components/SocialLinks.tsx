import { useI18n } from '@core/i18n/I18nContext';
import { SOCIAL_LINKS } from '@core/config/socials';
import { SocialIcon } from './SocialIcon';

/**
 * «Síguenos en»: our profiles, below the login and sign-up forms. Plain links to a new tab: in the
 * Android app the web view hands them to the browser or to the network's own app.
 */
export function SocialLinks() {
  const { t } = useI18n();
  return (
    <nav className="auth-socials" aria-label={t('app.social.title')}>
      <p className="auth-socials-title">{t('app.social.title')}</p>
      <ul>
        {SOCIAL_LINKS.map((s) => (
          <li key={s.network}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t('app.social.title')} ${s.label}`}
            >
              <SocialIcon network={s.network} size={16} />
              <span>{s.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Only the three glyphs, in the app header: plain links to our profiles. */
export function SocialIcons() {
  const { t } = useI18n();
  return (
    <nav className="header-socials" aria-label={t('app.social.title')}>
      {SOCIAL_LINKS.map((s) => (
        <a
          key={s.network}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t('app.social.title')} ${s.label}`}
          title={s.label}
        >
          <SocialIcon network={s.network} size={22} />
        </a>
      ))}
    </nav>
  );
}
