import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { GUIDES, findGuide, isFreeGuide } from '@modules/guides/domain/guides';
import { GuideBody } from '@modules/guides/ui/GuideBody';
import { Icon } from '@shared/components/Icon';
import '@modules/guides/ui/css/Guides.css';
import '../css/Sections.css';

/** Savings guides: a couple are open to every account, the whole library is part of Premium. */
export function LearnView() {
  const { t } = useI18n();
  const plan = useOptionalPlan();
  const [open, setOpen] = useState<string | null>(null);
  if (plan?.loading && !plan.overview) return <div className="card">{t('app.common.loading')}</div>;

  const premium = !plan || plan.isPremium;
  const guide = open ? findGuide(open) : undefined;
  const unlock = () => plan?.openUpgrade({ kind: 'feature', feature: 'insights' });

  if (guide) {
    return (
      <div className="section-view">
        <div className="card guide-article">
          <button className="btn-secondary" onClick={() => setOpen(null)}>
            ← {t('app.learn.back')}
          </button>
          <h2 className="section-title">{guide.title}</h2>
          <GuideBody guide={guide} />
          {guide.tool && (
            <p className="guide-tool">
              <Link className="btn-secondary" to={guide.tool.to}>
                <Icon name="sparkles" /> {t('app.learn.tool', { label: guide.tool.label })}
              </Link>
            </p>
          )}
        </div>
      </div>
    );
  }

  const free = GUIDES.filter((g) => isFreeGuide(g.slug)).length;
  return (
    <div className="section-view">
      <div className="card">
        <h2 className="section-title">
          <Icon name="book" /> {t('app.learn.title')}
        </h2>
        <p className="section-hint">{t('app.learn.hint')}</p>
        <p className="section-hint">
          {premium
            ? t('app.learn.premiumNote', { total: GUIDES.length })
            : t('app.learn.freeNote', { free, total: GUIDES.length })}
        </p>
        <ul className="guide-list">
          {GUIDES.map((g) => {
            const available = premium || isFreeGuide(g.slug);
            return (
              <li key={g.slug}>
                <button
                  className="guide-link"
                  onClick={() => (available ? setOpen(g.slug) : unlock())}
                >
                  {!available && <Icon name="lock" />} {g.title}
                </button>
                {!premium && (
                  <span className="premium-chip">
                    {available ? t('app.learn.free') : t('app.learn.locked')}
                  </span>
                )}
                <p>{g.description}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
