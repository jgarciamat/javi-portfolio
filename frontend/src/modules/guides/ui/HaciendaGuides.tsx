import { useState, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useAuth } from '@shared/hooks/useAuth';
import {
  DEADLINE_PARAMS,
  FINANVERSO_VIDEOS,
  HACIENDA_GUIDES,
  OFFICIAL_LINKS,
  OFFICIAL_VIDEOS,
  SOURCE_CHECKED,
  checkId,
  checkIds,
  findHaciendaGuide,
  guideKey,
  stepKey,
  upTo,
  type HaciendaGuide,
  type HaciendaTool,
} from '../domain/hacienda';
import { loadChecks, saveChecks } from '../application/haciendaLink';
import './css/Guides.css';
import './css/Hacienda.css';

const COLOR = '#0ea5e9';

/** The ticked items of the checklists of the signed-in person (or of this device, signed out). */
export function useHaciendaChecks() {
  const { user } = useAuth();
  const [checks, setChecks] = useState(() => loadChecks(user?.id));
  const update = (next: Record<string, true>) => {
    saveChecks(user?.id, next);
    setChecks(next);
  };
  return {
    isDone: (id: string) => checks[id] === true,
    toggle: (id: string) => {
      const next = { ...checks };
      if (next[id]) delete next[id];
      else next[id] = true;
      update(next);
    },
    doneIn: (guide: HaciendaGuide) => checkIds(guide).filter((id) => checks[id]).length,
    reset: (guide: HaciendaGuide) =>
      update(
        Object.fromEntries(
          Object.entries(checks).filter(([id]) => !id.startsWith(`${guide.id}.`))
        ) as Record<string, true>
      ),
  };
}

function External({ href, children }: { href: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={t('hacienda.external')}>
      {children} ↗
    </a>
  );
}

/** One card per guide, with how much of its checklist is done. */
export function HaciendaCatalog({
  renderLink,
}: {
  renderLink: (guide: HaciendaGuide, className: string, children: ReactNode) => ReactNode;
}) {
  const { t } = useI18n();
  const checks = useHaciendaChecks();
  return (
    <ul className="guide-cards hacienda-cards" style={{ ['--cat' as string]: COLOR }}>
      {HACIENDA_GUIDES.map((g) => (
        <li key={g.id} className="guide-card">
          <span className="hacienda-card-emoji" aria-hidden="true">
            {g.emoji}
          </span>
          {renderLink(g, 'guide-card-title', t(guideKey(g, 'title')))}
          <p>{t(guideKey(g, 'description'))}</p>
          <div className="guide-card-meta">
            <span>{t('hacienda.stepsCount', { n: g.steps.length })}</span>
            <span className="guide-card-tag">
              {t('hacienda.progress', { done: checks.doneIn(g), total: checkIds(g).length })}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A guide: its numbered steps with their checklists, deadlines, official links and videos. */
export function HaciendaGuideBody({
  guide,
  renderTool,
}: {
  guide: HaciendaGuide;
  /** How a button to a section of the app is shown. */
  renderTool: (tool: HaciendaTool, label: string) => ReactNode;
}) {
  const { t } = useI18n();
  const checks = useHaciendaChecks();
  const total = checkIds(guide).length;
  const done = checks.doneIn(guide);
  const own = FINANVERSO_VIDEOS[guide.id];

  return (
    <div className="hacienda-guide" style={{ ['--cat' as string]: COLOR }}>
      <p className="guide-kicker">
        <span className="guide-kicker-tag">
          {guide.emoji} {t('hacienda.title')}
        </span>
        <span>{t('hacienda.stepsCount', { n: guide.steps.length })}</span>
        <span>{t('hacienda.free')}</span>
      </p>
      <p className="guide-intro">{t(guideKey(guide, 'intro'))}</p>

      <div className="hacienda-progress">
        <div
          className="hacienda-bar"
          role="progressbar"
          aria-label={t('hacienda.progress', { done, total })}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
        >
          <span style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <span>{t('hacienda.progress', { done, total })}</span>
        <button
          type="button"
          className="btn-secondary hacienda-reset"
          disabled={done === 0}
          onClick={() => checks.reset(guide)}
        >
          {t('hacienda.reset')}
        </button>
      </div>

      <ol className="hacienda-steps">
        {guide.steps.map((step, i) => {
          const ids = upTo(step.checks).map((n) => checkId(guide, step, n));
          const complete = ids.every((id) => checks.isDone(id));
          return (
            <li
              key={step.id}
              className={`hacienda-step${complete ? ' hacienda-step-done' : ''}`}
              aria-label={t('hacienda.step', { n: i + 1 })}
            >
              <h2>
                <span className="hacienda-step-n" aria-hidden="true">
                  {complete ? '✓' : i + 1}
                </span>
                {t(stepKey(guide, step, 'title'))}
              </h2>
              {upTo(step.paragraphs).map((n) => (
                <p key={n}>{t(stepKey(guide, step, `p${n}`))}</p>
              ))}
              {step.tip && (
                <p className="hacienda-note hacienda-tip">
                  <strong>💡 {t('hacienda.tipLabel')}:</strong> {t(stepKey(guide, step, 'tip'))}
                </p>
              )}
              {step.warn && (
                <p className="hacienda-note hacienda-warn">
                  <strong>⚠️ {t('hacienda.warnLabel')}:</strong> {t(stepKey(guide, step, 'warn'))}
                </p>
              )}
              {step.tool && (
                <p className="hacienda-tool">
                  {renderTool(step.tool, t(stepKey(guide, step, 'tool')))}
                </p>
              )}
              <ul className="hacienda-checks">
                {ids.map((id, n) => (
                  <li key={id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={checks.isDone(id)}
                        onChange={() => checks.toggle(id)}
                      />
                      <span>{t(stepKey(guide, step, `c${n + 1}`))}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      <section className="hacienda-box">
        <h2>📅 {t('hacienda.deadlines')}</h2>
        <ul>
          {upTo(guide.deadlines).map((n) => (
            <li key={n}>{t(guideKey(guide, `deadline${n}`), DEADLINE_PARAMS)}</li>
          ))}
        </ul>
      </section>

      <section className="hacienda-box">
        <h2>🔗 {t('hacienda.links')}</h2>
        <ul>
          {guide.links.map((l) => (
            <li key={l}>
              <External href={OFFICIAL_LINKS[l]}>{t(`hacienda.link.${l}`)}</External>
            </li>
          ))}
        </ul>
      </section>

      <section className="hacienda-box">
        <h2>🎬 {t('hacienda.videos')}</h2>
        <ul>
          {own && (
            <li>
              <External href={own}>{t('hacienda.videoOwn')}</External>
            </li>
          )}
          {guide.videos.map((v) => (
            <li key={v}>
              <External href={OFFICIAL_VIDEOS[v]}>
                {t('hacienda.videoOfficial', { label: t(`hacienda.video.${v}`) })}
              </External>
            </li>
          ))}
        </ul>
      </section>

      <p className="hacienda-source">
        <time dateTime={SOURCE_CHECKED}>
          {t('hacienda.updated', { date: t('hacienda.sourceDate') })}
        </time>
      </p>
      <p className="hacienda-source">{t('hacienda.source', { date: t('hacienda.sourceDate') })}</p>
      <p className="hacienda-disclaimer">{t('hacienda.disclaimer')}</p>
    </div>
  );
}

/** «¿Cómo lo presento en Hacienda?»: buttons to the guides that explain how to file something. */
export function HowToFile({ slugs, onOpen }: { slugs: string[]; onOpen: (slug: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="hacienda-howto">
      <strong>🏛️ {t('hacienda.howToFile')}</strong>
      <p className="section-hint">{t('hacienda.howToFileHint')}</p>
      <div className="button-row">
        {slugs.map((slug) => {
          const guide = findHaciendaGuide(slug) as HaciendaGuide;
          return (
            <button key={slug} type="button" className="btn-secondary" onClick={() => onOpen(slug)}>
              → {t('hacienda.openGuide', { name: t(guideKey(guide, 'short')) })}
            </button>
          );
        })}
      </div>
    </div>
  );
}
