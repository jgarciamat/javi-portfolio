import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import './css/PublicHeader.css';

export function PublicHeader() {
  const { t } = useI18n();

  return (
    <header className="public-header">
      <Link className="public-header-brand" to="/" aria-label={t('app.header.title')}>
        <span className="public-header-logo">💰</span>
        <div className="public-header-text">
          <span className="public-header-title">{t('app.header.title')}</span>
          <span className="public-header-sub">{t('app.header.subtitle')}</span>
        </div>
      </Link>
      <LanguageSwitcher />
    </header>
  );
}
