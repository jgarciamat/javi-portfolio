import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { GUIDES, findGuide } from '@modules/guides/domain/guides';
import { GuideBody } from '@modules/guides/ui/GuideBody';
import { Icon } from '@shared/components/Icon';
import '@modules/guides/ui/css/Guides.css';
import '../css/Sections.css';

/** Savings guides, open to every account. */
export function LearnView() {
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const guide = open ? findGuide(open) : undefined;

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

  return (
    <div className="section-view">
      <div className="card">
        <h2 className="section-title">
          <Icon name="book" /> {t('app.learn.title')}
        </h2>
        <p className="section-hint">{t('app.learn.hint')}</p>
        <p className="section-hint">{t('app.learn.count', { total: GUIDES.length })}</p>
        <ul className="guide-list">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <button className="guide-link" onClick={() => setOpen(g.slug)}>
                {g.title}
              </button>
              <p>{g.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
