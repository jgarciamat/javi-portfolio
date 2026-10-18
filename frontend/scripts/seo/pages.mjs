// Every public page as search engines get it before running JavaScript: address, language, title,
// description, the text of the page (the same the app shows) and its structured data. Used by
// prerender.mjs (one HTML file per page) and sitemap.mjs (public/sitemap.xml).
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import {
  ORIGIN,
  PLAY_URL,
  PRICES,
  apps,
  breadcrumbs,
  organization,
  videoObject,
  webPage,
  website,
} from './site.mjs';

/** The TypeScript data of the app (guides, calculators), bundled once to read it from here. */
export async function load(entry) {
  const outfile = join(
    tmpdir(),
    `prerender-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`
  );
  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'silent',
  });
  return import(pathToFileURL(outfile).href);
}

const { GUIDES, inlineParts, longDate } = await load('src/modules/guides/domain/guides.ts');
const { categoryOf } = await load('src/modules/guides/domain/guideCategories.ts');
const { TOOL_PAGES, faqOf, guidesOfTool } = await load('src/modules/tools/domain/toolPages.ts');
const wall = await load('src/modules/guides/domain/signupWall.ts');
const { FAQ } = await load('src/modules/landing/domain/landing.ts');
const { yearlySavingPct } = await load('src/modules/billing/ui/pricing.ts');
const hacienda = await load('src/modules/guides/domain/hacienda.ts');
const videos = await load('src/modules/guides/domain/videos.ts');
const { SOCIAL_LINKS } = await load('src/core/config/socials.ts');
const { brandTitle } = await load('src/shared/utils/pageTitle.ts');

export const MESSAGES = {
  es: JSON.parse(readFileSync('src/locales/es.json', 'utf8')),
  en: JSON.parse(readFileSync('src/locales/en.json', 'utf8')),
};
/** The app's `t()`: the text in `lang`, Spanish when it is missing, `{name}` replaced. */
const translator = (lang) => (key, vars) =>
  Object.entries(vars ?? {}).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    MESSAGES[lang][key] ?? MESSAGES.es[key] ?? key
  );

export const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Address of `path` in `lang`: `/pricing` → `/en/pricing`, `/` → `/en`. */
export const pathIn = (path, lang) =>
  lang === 'en' ? (path === '/' ? '/en' : `/en${path}`) : path;
export const urlOf = (path, lang = 'es') => `${ORIGIN}${pathIn(path, lang)}`;

const { HACIENDA_GUIDES, HACIENDA_PATH, SOURCE_CHECKED, haciendaPath, guideKey, stepKey } =
  hacienda;
const { VIDEOS_PATH } = videos;

/** The pages translated into English (the guides are only in Spanish). */
const TRANSLATED = new Set([
  '/',
  '/pricing',
  '/login',
  '/terms',
  '/privacy',
  HACIENDA_PATH,
  ...HACIENDA_GUIDES.map(haciendaPath),
  VIDEOS_PATH,
  ...TOOL_PAGES.map((p) => p.path),
]);
export const isTranslated = (path) => TRANSLATED.has(path);

/** Money as the pricing page shows it: 3,49 € / €3.49. */
const money = (n, lang) =>
  new Intl.NumberFormat(lang === 'en' ? 'en-IE' : 'es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(n);

const publicVideos = () => videos.publishedVideos().filter((v) => v.youtubeId && !v.premium);

/** Pages of the site in one language. */
function pagesIn(lang) {
  const t = translator(lang);
  // Links stay in the language of the page when the target exists in it.
  const href = (to) => {
    const [path, query = ''] = to.split('?');
    return `${isTranslated(path) ? pathIn(path, lang) : path}${query ? `?${query}` : ''}`;
  };
  const link = (to, text) => `<a href="${esc(href(to))}">${esc(text)}</a>`;
  const external = (to, text) => `<a href="${esc(to)}" rel="noopener">${esc(text)}</a>`;
  const home = [t('app.header.title'), urlOf('/', lang)];
  const videoDescription = (v) =>
    `${v.title}. ${t('videos.title')} · ${t(`videos.section.${v.section}`)}.`;

  // Navigation of every page: what the header and footers of the app lead to.
  const nav = `<nav><ul>${[
    ['/', t('app.header.title')],
    ['/guias', t('landing.learn.guides')],
    [HACIENDA_PATH, t('hacienda.title')],
    [VIDEOS_PATH, t('videos.title')],
    ...TOOL_PAGES.map((p) => [p.path, t(`tools.${p.key}.nav`)]),
    ['/pricing', t('pricing.link')],
    ['/login?mode=register', t('landing.cta.register')],
    ['/privacy', t('app.privacy.link')],
    ['/terms', t('billing.terms')],
  ]
    .map(([to, text]) => `<li>${link(to, text)}</li>`)
    .join('')}</ul></nav>`;
  // The invitation to create an account, as the app shows it to people without one (SignupWall):
  // `wall` in place of a guide or a calculator, with the welcome video; `cta` under the lists.
  const numbers = wall.wallNumbers();
  const signupWall = (path, { kicker, variant = 'wall' } = {}) => {
    const back = wall.isGatedPath(path);
    const video = variant === 'wall' ? wall.welcomeVideo(videos.VIDEOS) : undefined;
    const thumbnail = video && videos.videoThumbnail(video);
    return `<section aria-labelledby="signup-wall-title">${
      kicker ? `<p>${esc(kicker)}</p>` : ''
    }<h2 id="signup-wall-title">${esc(t('wall.title'))}</h2><p>${esc(
      t(variant === 'wall' ? 'wall.lead' : 'wall.leadCta')
    )}</p><p>${link(
      back ? wall.registerHref(path) : '/login?mode=register',
      t('wall.register')
    )} ${link(back ? wall.loginHref(path) : '/login', t('wall.login'))}</p><p>${esc(
      t('wall.note')
    )}</p><ul aria-label="${esc(t('wall.benefitsLabel'))}">${wall.WALL_BENEFITS.map(
      (id) => `<li>${esc(t(`wall.benefit.${id}`, { n: numbers[id] ?? '' }))}</li>`
    ).join('')}</ul>${
      video
        ? `<p>${esc(t('wall.video', { min: wall.minutesOf(video) }))}</p><figure>${
            thumbnail
              ? `<img src="${esc(thumbnail)}" alt="" width="480" height="270" loading="lazy" />`
              : ''
          }<figcaption>🎬 ${esc(video.title)}</figcaption></figure>`
        : ''
    }</section>`;
  };
  /** What follows, by title only (the text is only for people with an account). */
  const outline = (title, items) =>
    items.length
      ? `<section><h2>${esc(title)}</h2><ol>${items
          .map((item) => `<li>${esc(item)}</li>`)
          .join('')}</ol></section>`
      : '';

  const appFeatures = [
    'overview',
    'budgets',
    'forecast',
    'subscriptions',
    'import',
    'together',
    'ai',
    'health',
    'debts',
    'renta',
    'receipts',
    'privacy',
  ];
  const appNodes = () =>
    apps({
      lang,
      description: t('landing.meta.description'),
      features: appFeatures.map((f) => t(`landing.features.${f}.title`)),
      offerNames: {
        free: t('billing.free'),
        monthly: `${t('billing.premium')} · ${lang === 'en' ? 'monthly' : 'mensual'}`,
        yearly: `${t('billing.premium')} · ${lang === 'en' ? 'yearly' : 'anual'}`,
      },
    });

  const pages = [];
  const add = (page) => pages.push({ lang, ogType: 'website', index: true, nodes: [], ...page });

  // Home: the presentation page.
  {
    const url = urlOf('/', lang);
    const title = t('landing.meta.title');
    const description = t('landing.meta.description');
    add({
      path: '/',
      title,
      description,
      body: `<main><h1>${esc(t('landing.hero.title'))}</h1><p>${esc(t('landing.hero.subtitle'))}</p>
<p>${link('/login?mode=register', t('landing.cta.register'))} ${link(
        '/login',
        t('landing.cta.login')
      )}</p><p>${esc(t('landing.cta.note'))}</p><p>${external(PLAY_URL, t('landing.cta.play'))}</p>
<h2>${esc(t('landing.features.title'))}</h2><ul>${appFeatures
        .map(
          (f) =>
            `<li><h3>${esc(t(`landing.features.${f}.title`))}</h3><p>${esc(
              t(`landing.features.${f}.body`)
            )}</p></li>`
        )
        .join('')}</ul>
<h2>${esc(t('landing.plans.title'))}</h2><p>${esc(t('landing.plans.body'))}</p><p>${link(
        '/pricing',
        t('landing.plans.link')
      )}</p>
<h2>${esc(t('landing.faq.title'))}</h2>${FAQ.map(
        (id) => `<h3>${esc(t(`landing.faq.${id}.q`))}</h3><p>${esc(t(`landing.faq.${id}.a`))}</p>`
      ).join('')}
<h2>${esc(t('landing.learn.title'))}</h2><ul><li>${link(
        '/guias',
        t('landing.learn.guides')
      )}</li><li>${link('/calculadora-50-30-20', t('tools.rule.nav'))}</li><li>${link(
        '/simulador-ahorro',
        t('tools.savings.nav')
      )}</li></ul>${nav}</main>`,
      nodes: [
        organization([...SOCIAL_LINKS.map((s) => s.url), PLAY_URL]),
        website(),
        webPage({
          url,
          title,
          description,
          lang,
          extra: { about: { '@id': `${ORIGIN}/#webapp` } },
        }),
        ...appNodes(),
      ],
      // The FAQ goes inside the page text: the app puts its own copy when it starts, and this one
      // goes away with the rest of the text, so there is never more than one.
      bodyLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.map((id) => ({
            '@type': 'Question',
            name: t(`landing.faq.${id}.q`),
            acceptedAnswer: { '@type': 'Answer', text: t(`landing.faq.${id}.a`) },
          })),
        },
      ],
      images: ['home', 'budgets', 'forecast', 'subscriptions'].map((s) => ({
        loc: `${ORIGIN}/landing/${s}.webp`,
      })),
    });
  }

  // Plans and prices.
  {
    const url = urlOf('/pricing', lang);
    const monthly = money(PRICES.monthly, lang);
    const yearly = money(PRICES.yearly, lang);
    const title =
      lang === 'en'
        ? `Finanverso pricing: free plan and Premium from ${monthly}/month`
        : `Precios de Finanverso: plan gratis y Premium desde ${monthly}/mes`;
    const description =
      lang === 'en'
        ? `Start free with everything you need to track your month. Premium: ${monthly}/month or ${yearly}/year, with a 14-day free trial and no card.`
        : `Empieza gratis con lo esencial para llevar tus cuentas. Premium: ${monthly}/mes o ${yearly}/año, con 14 días de prueba gratis y sin tarjeta.`;
    add({
      path: '/pricing',
      title,
      description,
      body: `<main><h1>${esc(t('pricing.title'))}</h1><p>${esc(t('pricing.subtitle'))}</p>
<section><h2>${esc(t('billing.free'))}</h2><p>${esc(money(0, lang))}</p><p>${esc(
        t('pricing.freeHint')
      )}</p></section>
<section><h2>${esc(t('billing.premium'))}</h2><p>${esc(monthly)} ${esc(
        t('billing.perMonth')
      )}</p><p>${esc(
        t('pricing.orYearly', { price: yearly, pct: yearlySavingPct(PRICES) })
      )}</p><p>${link('/login?mode=register', t('pricing.cta', { days: 14 }))}</p><p>${esc(
        t('pricing.noCard')
      )}</p></section>
<p>${link('/terms', t('billing.terms'))} · ${link(
        '/privacy',
        t('app.privacy.link')
      )}</p>${nav}</main>`,
      nodes: [
        webPage({
          url,
          title,
          description,
          lang,
          extra: { about: { '@id': `${ORIGIN}/#webapp` } },
        }),
        breadcrumbs(url, [home, [t('pricing.link'), url]]),
        ...appNodes(),
      ],
    });
  }

  // Sign in / create an account: reachable, but not a page to show in the results.
  add({
    path: '/login',
    title:
      lang === 'en'
        ? 'Sign in or create your account | Finanverso'
        : 'Entra o crea tu cuenta | Finanverso',
    description:
      lang === 'en'
        ? 'Sign in to Finanverso or create your free account to track your spending, budgets and savings.'
        : 'Entra en Finanverso o crea tu cuenta gratis para controlar tus gastos, presupuestos y ahorro.',
    index: false,
    body: `<main><h1>${esc(t('landing.cta.register'))}</h1><p>${esc(
      t('landing.cta.note')
    )}</p><p>${link('/login?mode=register', t('landing.cta.register'))} ${link(
      '/login',
      t('landing.cta.login')
    )}</p>${nav}</main>`,
  });

  // Legal pages.
  {
    const legal = (path, prefix, titleKey, updatedKey, description) => {
      const url = urlOf(path, lang);
      const title = `${t(titleKey)} | Finanverso`;
      const keys = Object.keys(MESSAGES.es).filter((k) => k.startsWith(prefix));
      const sections = [...new Set(keys.map((k) => k.slice(prefix.length).split('.')[0]))].filter(
        (s) => /^s\d+$/.test(s) || s === 'contact'
      );
      add({
        path,
        title,
        description,
        body: `<main><article><h1>${esc(t(titleKey))}</h1><p>${esc(t(updatedKey))}</p>${sections
          .map((s) => {
            const own = keys.filter((k) => k.startsWith(`${prefix}${s}.`));
            const titleOf = own.find((k) => k.endsWith('.title'));
            return `<section><h2>${esc(t(titleOf))}</h2>${own
              .filter((k) => k !== titleOf)
              .map((k) => `<p>${esc(t(k))}</p>`)
              .join('')}</section>`;
          })
          .join('')}</article>${nav}</main>`,
        nodes: [
          webPage({ url, title, description, lang }),
          breadcrumbs(url, [home, [t(titleKey), url]]),
        ],
      });
    };
    legal(
      '/privacy',
      'app.privacy.',
      'app.privacy.title',
      'app.privacy.updated',
      lang === 'en'
        ? 'What data Finanverso keeps, why, for how long, who processes it and how to export or delete it.'
        : 'Qué datos guarda Finanverso, para qué, cuánto tiempo, quién los trata y cómo exportarlos o borrarlos.'
    );
    legal(
      '/terms',
      'terms.',
      'terms.title',
      'terms.updated',
      lang === 'en'
        ? 'Terms of sale of Finanverso Premium: prices, trial, renewal, cancellation and right of withdrawal.'
        : 'Condiciones de contratación de Finanverso Premium: precios, prueba, renovación, cancelación y desistimiento.'
    );
  }

  // Guides (only in Spanish).
  if (lang === 'es') {
    const guidesUrl = urlOf('/guias');
    const guidesTitle = 'Guías de finanzas personales y ahorro | Finanverso';
    const guidesDescription =
      'Guías claras y cortas para ordenar tu dinero: presupuesto, ahorro, método 50/30/20, fondo de emergencia, interés compuesto y deudas.';
    add({
      path: '/guias',
      title: guidesTitle,
      description: guidesDescription,
      body: `<main><h1>Guías de finanzas personales</h1><p>Explicaciones cortas y sin jerga para ahorrar mejor y controlar tus gastos.</p><p>${esc(
        t('hacienda.banner')
      )} ${link(HACIENDA_PATH, t('hacienda.cta'))}</p><p>${esc(t('videos.banner'))} ${link(
        VIDEOS_PATH,
        t('videos.cta')
      )}</p><ul>${GUIDES.map(
        (g) => `<li>${link(`/guias/${g.slug}`, g.title)}<p>${esc(g.description)}</p></li>`
      ).join('')}</ul>${signupWall('/guias', { variant: 'cta' })}${nav}</main>`,
      nodes: [
        webPage({
          url: guidesUrl,
          title: guidesTitle,
          description: guidesDescription,
          lang,
          type: 'CollectionPage',
        }),
        breadcrumbs(guidesUrl, [home, ['Guías', guidesUrl]]),
      ],
    });
    const paragraph = (text) =>
      inlineParts(text)
        .map((part) => (typeof part === 'string' ? esc(part) : link(part.to, part.label)))
        .join('');
    // Without an account: the beginning of the guide and the titles of the rest (signupWall.ts).
    for (const g of GUIDES) {
      const path = `/guias/${g.slug}`;
      const url = urlOf(path);
      const category = categoryOf(g.slug);
      const teaser = wall.guideTeaser(g);
      const related = g.related.map((slug) => GUIDES.find((r) => r.slug === slug)).filter(Boolean);
      add({
        path,
        title: brandTitle(g.title),
        description: g.description,
        ogType: 'article',
        body: `<main><p>${link('/guias', '← Todas las guías')}</p><article><h1>${esc(
          g.title
        )}</h1><p>${esc(g.intro)}</p><p>${esc('Actualizado')}: <time datetime="${g.updated}">${esc(
          longDate(g.updated)
        )}</time></p><h2>${esc(teaser.preview.heading)}</h2>${teaser.preview.paragraphs
          .map((p) => `<p>${paragraph(p)}</p>`)
          .join('')}${outline(t('wall.outline.guide'), teaser.outline)}</article>${signupWall(
          path,
          {
            kicker: t('wall.kicker.guide'),
          }
        )}<section><h2>Sigue leyendo</h2><ul>${related
          .map((r) => `<li>${link(`/guias/${r.slug}`, r.title)}</li>`)
          .join('')}</ul><p>${link(VIDEOS_PATH, `🎬 ${t('videos.title')}`)} · ${link(
          HACIENDA_PATH,
          `🏛️ ${t('hacienda.title')}`
        )}</p></section>${nav}</main>`,
        // No HowTo nor VideoObject: the steps and the video are not in what the page shows.
        nodes: [
          {
            '@type': 'Article',
            '@id': `${url}#article`,
            headline: g.title,
            description: g.description,
            inLanguage: 'es',
            url,
            mainEntityOfPage: url,
            articleSection: category.label,
            dateModified: g.updated,
            image: `${ORIGIN}/og-image.png`,
            author: { '@type': 'Person', name: 'Javi García' },
            publisher: { '@id': `${ORIGIN}/#organization` },
          },
          breadcrumbs(url, [home, ['Guías', guidesUrl], [g.title, url]]),
        ],
      });
    }
  }

  // «Hacienda paso a paso»: step-by-step guides for the website of the Agencia Tributaria.
  {
    const indexUrl = urlOf(HACIENDA_PATH, lang);
    const source = t('hacienda.source', { date: t('hacienda.sourceDate') });
    add({
      path: HACIENDA_PATH,
      title: t('hacienda.metaTitle'),
      description: t('hacienda.metaDescription'),
      body: `<main><p>${link('/guias', `← ${t('landing.learn.guides')}`)}</p><h1>${esc(
        t('hacienda.title')
      )}</h1><p>${esc(t('hacienda.hint'))}</p><p>${esc(t('videos.banner'))} ${link(
        VIDEOS_PATH,
        t('videos.cta')
      )}</p><ul>${HACIENDA_GUIDES.map(
        (g) =>
          `<li>${link(haciendaPath(g), t(guideKey(g, 'title')))}<p>${esc(
            t(guideKey(g, 'description'))
          )}</p></li>`
      ).join('')}</ul>${signupWall(HACIENDA_PATH, { variant: 'cta' })}${nav}</main>`,
      nodes: [
        webPage({
          url: indexUrl,
          title: t('hacienda.metaTitle'),
          description: t('hacienda.metaDescription'),
          lang,
          type: 'CollectionPage',
        }),
        breadcrumbs(indexUrl, [home, [t('hacienda.title'), indexUrl]]),
      ],
    });
    for (const g of HACIENDA_GUIDES) {
      const path = haciendaPath(g);
      const url = urlOf(path, lang);
      const title = t(guideKey(g, 'title'));
      const description = t(guideKey(g, 'description'));
      const { preview, outline: rest } = wall.haciendaTeaser(g);
      add({
        path,
        title: brandTitle(title),
        description,
        ogType: 'article',
        body: `<main><p>${link(HACIENDA_PATH, `← ${t('hacienda.back')}`)}</p><article><h1>${esc(
          title
        )}</h1><p>${esc(t(guideKey(g, 'intro')))}</p><ol><li><h2>${esc(
          t(stepKey(g, preview.step, 'title'))
        )}</h2>${preview.paragraphs
          .map((n) => `<p>${esc(t(stepKey(g, preview.step, `p${n}`)))}</p>`)
          .join('')}</li></ol>${outline(t('wall.outline.hacienda'), [
          ...rest.map((step, i) => `${i + 2}. ${t(stepKey(g, step, 'title'))}`),
          t('hacienda.deadlines'),
          t('hacienda.links'),
        ])}</article>${signupWall(path, {
          kicker: t('wall.kicker.hacienda', { n: g.steps.length }),
        })}${nav}</main>`,
        // No HowTo nor VideoObject: the steps and the video are only for people with an account.
        nodes: [
          {
            '@type': 'Article',
            '@id': `${url}#article`,
            headline: title,
            description,
            inLanguage: lang,
            url,
            mainEntityOfPage: url,
            articleSection: t('hacienda.title'),
            dateModified: SOURCE_CHECKED,
            image: `${ORIGIN}/og-image.png`,
            author: { '@type': 'Person', name: 'Javi García' },
            publisher: { '@id': `${ORIGIN}/#organization` },
          },
          breadcrumbs(url, [home, [t('hacienda.title'), indexUrl], [title, url]]),
        ],
      });
    }
  }

  // «Videoteca»: our YouTube tutorials, by section. Premium videos are unlisted on YouTube: only
  // their title (as the page shows it), never an id or a link.
  {
    const url = urlOf(VIDEOS_PATH, lang);
    const list = publicVideos();
    add({
      path: VIDEOS_PATH,
      title: t('videos.metaTitle'),
      description: t('videos.metaDescription'),
      body: `<main><p>${link('/guias', `← ${t('landing.learn.guides')}`)}</p><h1>${esc(
        t('videos.title')
      )}</h1><p>${esc(t('videos.hint'))}</p><p>${external(
        videos.YOUTUBE_CHANNEL_URL,
        t('videos.channel')
      )}</p>${videos
        .videoGroups()
        .map(
          ({ section, videos: inSection }) =>
            `<h2>${esc(t(`videos.section.${section.id}`))}</h2><ul>${inSection
              .map((v) =>
                v.youtubeId && !v.premium
                  ? `<li>${external(videos.videoUrl(v), v.title)}${
                      v.durationSeconds ? ` (${videos.formatDuration(v.durationSeconds)})` : ''
                    }</li>`
                  : `<li>${esc(v.title)} (${esc(t('videos.premium.badge'))})</li>`
              )
              .join('')}</ul>`
        )
        .join('')}${signupWall(VIDEOS_PATH, { variant: 'cta' })}${nav}</main>`,
      nodes: [
        webPage({
          url,
          title: t('videos.metaTitle'),
          description: t('videos.metaDescription'),
          lang,
          type: 'CollectionPage',
          extra: {
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: list.map((v, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: videoObject(v, videoDescription(v)),
              })),
            },
          },
        }),
        breadcrumbs(url, [home, [t('videos.title'), url]]),
      ],
      videos: list,
    });
  }

  // Calculators: without an account, what each one does and the questions it answers (by title
  // only), then the invitation; the form, the results and the answers are for people with one.
  for (const tool of TOOL_PAGES) {
    const url = urlOf(tool.path, lang);
    const title = t(`tools.${tool.key}.title`);
    const description = t(`tools.${tool.key}.description`);
    const questions = faqOf(tool).map((n) => t(`tools.${tool.key}.faq${n}.q`));
    add({
      path: tool.path,
      title,
      description,
      body: `<main><h1>${esc(title)}</h1><p>${esc(description)}</p>${outline(
        t('wall.outline.tool'),
        questions
      )}${signupWall(tool.path, { kicker: t('wall.kicker.tool') })}<section><h2>${esc(
        t('landing.learn.guides')
      )}</h2><ul>${guidesOfTool(tool.path)
        .map((g) => `<li>${link(`/guias/${g.slug}`, g.title)}</li>`)
        .join('')}</ul><p>${link(VIDEOS_PATH, `🎬 ${t('videos.title')}`)} · ${link(
        HACIENDA_PATH,
        `🏛️ ${t('hacienda.title')}`
      )}</p></section>${nav}</main>`,
      // No FAQPage: the answers are not in what the page shows.
      nodes: [
        {
          '@type': 'WebApplication',
          '@id': `${url}#calculator`,
          name: title,
          description,
          url,
          inLanguage: lang,
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          publisher: { '@id': `${ORIGIN}/#organization` },
        },
        breadcrumbs(url, [home, [t(`tools.${tool.key}.nav`), url]]),
      ],
    });
  }

  return pages;
}

/** Every public page, Spanish first. */
export const PAGES = [...pagesIn('es'), ...pagesIn('en')];

/** The page for addresses that do not exist (served with a 404 status). */
export const NOT_FOUND = {
  path: '/404',
  lang: 'es',
  title: 'Página no encontrada | Finanverso',
  description: 'Esta página no existe. Vuelve al inicio de Finanverso.',
  index: false,
  ogType: 'website',
  nodes: [],
  body: `<main><h1>Página no encontrada</h1><p>Esta dirección no existe o ha cambiado.</p><p><a href="/">Ir al inicio de Finanverso</a> · <a href="/guias">Guías</a> · <a href="${HACIENDA_PATH}">Hacienda paso a paso</a> · <a href="${VIDEOS_PATH}">Videoteca</a></p></main>`,
};
