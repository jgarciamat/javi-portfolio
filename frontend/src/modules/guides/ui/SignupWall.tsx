import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { useAuth } from '@shared/hooks/useAuth';
import {
  WALL_BENEFITS,
  isGatedPath,
  loginHref,
  minutesOf,
  registerHref,
  wallNumbers,
  welcomeVideo,
} from '../domain/signupWall';
import { VideoEmbed } from './VideoEmbed';
import './css/SignupWall.css';

/**
 * Who sees the whole guide or calculator: `open` with a session, `closed` without one, and
 * `pending` while a stored session is being restored (neither the wall nor the content yet).
 */
export type Gate = 'open' | 'closed' | 'pending';

export function useGate(): Gate {
  const { status } = useAuth();
  return status === 'authenticated' ? 'open' : status === 'loading' ? 'pending' : 'closed';
}

/** The beginning of the text, fading out over its last lines (the rest is not on the page). */
export function TeaserPreview({ children }: { children: ReactNode }) {
  return <div className="teaser-preview">{children}</div>;
}

/** What comes next, by title only, each with a lock. */
export function TeaserOutline({ title, items }: { title: string; items: string[] }) {
  const { t } = useI18n();
  if (items.length === 0) return null;
  return (
    <section className="teaser-outline" aria-labelledby="teaser-outline-title">
      <h2 id="teaser-outline-title">{title}</h2>
      <ol>
        {items.map((item) => (
          <li key={item}>
            <span className="teaser-outline-lock" aria-hidden="true">
              <Icon name="lock" size={14} />
            </span>
            <span>{item}</span>
            <span className="sr-only"> ({t('wall.locked')})</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The invitation to create an account. `wall`: in place of a guide or a calculator, with the
 * welcome video; `cta`: at the end of the lists (guides, Hacienda, Videoteca). Nothing with a
 * session, nor while it is being restored.
 */
export function SignupWall({
  kicker,
  variant = 'wall',
}: {
  kicker?: string;
  variant?: 'wall' | 'cta';
}) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const gate = useGate();
  if (gate === 'open') return null;
  if (gate === 'pending') {
    return (
      <p className="signup-wall-checking" role="status">
        {t('wall.checking')}
      </p>
    );
  }
  const back = isGatedPath(pathname);
  const numbers = wallNumbers();
  const video = variant === 'wall' ? welcomeVideo() : undefined;
  return (
    <section className={`signup-wall signup-wall--${variant}`} aria-labelledby="signup-wall-title">
      {variant === 'wall' && (
        <span className="signup-wall-lock" aria-hidden="true">
          <Icon name="lock" size={22} />
        </span>
      )}
      {kicker && <p className="signup-wall-kicker">{kicker}</p>}
      <h2 id="signup-wall-title" className="signup-wall-title">
        {t('wall.title')}
      </h2>
      <p className="signup-wall-lead">{t(variant === 'wall' ? 'wall.lead' : 'wall.leadCta')}</p>
      <div className="signup-wall-actions">
        <Link
          className="signup-wall-register"
          to={back ? registerHref(pathname) : '/login?mode=register'}
        >
          {t('wall.register')}
        </Link>
        <Link
          className="btn-secondary signup-wall-login"
          to={back ? loginHref(pathname) : '/login'}
        >
          {t('wall.login')}
        </Link>
      </div>
      <p className="signup-wall-note">{t('wall.note')}</p>
      <div className="signup-wall-body">
        <ul className="signup-wall-benefits" aria-label={t('wall.benefitsLabel')}>
          {WALL_BENEFITS.map((id) => (
            <li key={id}>
              <span className="signup-wall-check" aria-hidden="true">
                <Icon name="check" size={14} />
              </span>
              <span>
                {t(`wall.benefit.${id}`, { n: numbers[id as keyof typeof numbers] ?? '' })}
              </span>
            </li>
          ))}
        </ul>
        {video && (
          <div className="signup-wall-video">
            <p className="signup-wall-video-title">{t('wall.video', { min: minutesOf(video) })}</p>
            <VideoEmbed video={video} />
          </div>
        )}
      </div>
    </section>
  );
}
