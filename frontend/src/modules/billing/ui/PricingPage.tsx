import { Link, useNavigate } from 'react-router-dom';
import { useResource } from '@shared/hooks/useResource';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { PublicHeader } from '@shared/components/PublicHeader';
import { DEFAULT_CATALOG, comparisonRows, formatPrice, yearlySavingPct } from './pricing';
import './css/Billing.css';

/** Public page with the plans and what each one includes. */
export function PricingPage() {
  const { t, locale } = useI18n();
  const { billingApi } = useApi();
  const navigate = useNavigate();
  const { data } = useResource(() => billingApi.plans(), [billingApi]);

  // Without the API (a crawler cannot call it) the page still shows the plans and the comparison.
  const catalog = data ?? DEFAULT_CATALOG;

  const price = (n: number) => formatPrice(n, locale);

  return (
    <div className="pricing-page">
      <PublicHeader />
      <main className="pricing-main">
        <h1 className="pricing-title">{t('pricing.title')}</h1>
        <p className="pricing-subtitle">{t('pricing.subtitle')}</p>
        <>
          <div className="pricing-grid">
            <section className="pricing-plan">
              <h2>{t('billing.free')}</h2>
              <p className="pricing-price">{price(0)}</p>
              <p className="plan-note">{t('pricing.freeHint')}</p>
            </section>
            <section className="pricing-plan pricing-plan--featured">
              <h2>{t('billing.premium')}</h2>
              <p className="pricing-price">
                {price(catalog.prices.monthly)}
                <small>{t('billing.perMonth')}</small>
              </p>
              <p className="plan-note">
                {t('pricing.orYearly', {
                  price: price(catalog.prices.yearly),
                  pct: yearlySavingPct(catalog.prices),
                })}
              </p>
              {catalog.lifetime.available && (
                <p className="plan-note">
                  {t('pricing.lifetime', {
                    price: price(catalog.prices.lifetime),
                    count: catalog.lifetime.remaining,
                  })}
                </p>
              )}
            </section>
          </div>

          <table className="pricing-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">{t('pricing.featureColumn')}</span>
                </th>
                <th>{t('billing.free')}</th>
                <th>{t('billing.premium')}</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows(catalog, t).map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>{row.free}</td>
                  <td>{row.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pricing-cta">
            <button className="btn-primary" onClick={() => navigate('/login?mode=register')}>
              {t('pricing.cta', { days: catalog.trialDays })}
            </button>
            <p className="plan-note">{t('pricing.noCard')}</p>
          </div>
        </>
        <p className="pricing-links">
          <Link to="/terms">{t('billing.terms')}</Link> ·{' '}
          <Link to="/privacy">{t('app.privacy.link')}</Link>
        </p>
      </main>
    </div>
  );
}
