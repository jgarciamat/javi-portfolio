// Search engines read the public pages without running JavaScript first: after the build, every
// public page gets its own HTML file with its title, description, canonical link and the text
// of the page. The app replaces that text as soon as it loads; people with a session never see it.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const ORIGIN = 'https://finanverso.app';
const dist = 'dist';
const es = JSON.parse(readFileSync('src/locales/es.json', 'utf8'));
const t = (key) => es[key] ?? key;
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** The TypeScript data of the app (guides, calculators), bundled once to read it from here. */
async function load(entry) {
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

const { GUIDES, inlineParts } = await load('src/modules/guides/domain/guides.ts');
const { TOOL_PAGES } = await load('src/modules/tools/domain/toolPages.ts');
const { FAQ } = await load('src/modules/landing/domain/landing.ts');
const hacienda = await load('src/modules/guides/domain/hacienda.ts');
const videos = await load('src/modules/guides/domain/videos.ts');

const template = readFileSync(join(dist, 'index.html'), 'utf8');

/** The page's HTML: the template with its own head tags and its text inside #root. */
function render({ path, title, description, body, jsonLd = [] }) {
  const url = `${ORIGIN}${path === '/' ? '/' : path}`;
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`);
  const description2 = esc(description);
  html = html
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${description2}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${description2}$2`);
  const ld = jsonLd
    .map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`)
    .join('');
  html = html.replace('</head>', `${ld}</head>`);
  return html.replace(
    '<div id="root"></div>',
    `<div id="root"><div id="seo-fallback">${body}</div></div>`
  );
}

function write(path, html) {
  const file = path === '/' ? join(dist, 'index.html') : join(dist, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

const link = (href, text) => `<a href="${href}">${esc(text)}</a>`;
const nav = `<nav>${link('/', 'Finanverso')} · ${link(
  '/guias',
  t('landing.learn.guides')
)} · ${link(hacienda.HACIENDA_PATH, t('hacienda.title'))} · ${link(
  '/pricing',
  t('pricing.link')
)}</nav>`;

// Home: the presentation page.
const features = [
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
write(
  '/',
  render({
    path: '/',
    title: t('landing.meta.title'),
    description: t('landing.meta.description'),
    body: `<main><h1>${esc(t('landing.hero.title'))}</h1><p>${esc(t('landing.hero.subtitle'))}</p>
${link('/login?mode=register', t('landing.cta.register'))} ${link('/login', t('landing.cta.login'))}
<h2>${esc(t('landing.features.title'))}</h2><ul>${features
      .map(
        (f) =>
          `<li><h3>${esc(t(`landing.features.${f}.title`))}</h3><p>${esc(
            t(`landing.features.${f}.body`)
          )}</p></li>`
      )
      .join('')}</ul>
<h2>${esc(t('landing.faq.title'))}</h2>${FAQ.map(
      (id) => `<h3>${esc(t(`landing.faq.${id}.q`))}</h3><p>${esc(t(`landing.faq.${id}.a`))}</p>`
    ).join('')}${nav}</main>`,
    jsonLd: [
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
  })
);

// Guides.
/** A paragraph's HTML: its text with the internal links as real anchors. */
const paragraph = (text) =>
  inlineParts(text)
    .map((part) => (typeof part === 'string' ? esc(part) : link(part.to, part.label)))
    .join('');
write(
  '/guias',
  render({
    path: '/guias',
    title: 'Guías de finanzas personales y ahorro | Finanverso',
    description:
      'Guías claras y cortas para ordenar tu dinero: presupuesto, ahorro, método 50/30/20, fondo de emergencia, interés compuesto y deudas.',
    body: `<main><h1>Guías de finanzas personales</h1><ul>${GUIDES.map(
      (g) => `<li>${link(`/guias/${g.slug}`, g.title)}<p>${esc(g.description)}</p></li>`
    ).join('')}</ul>${nav}</main>`,
  })
);
for (const g of GUIDES) {
  write(
    `/guias/${g.slug}`,
    render({
      path: `/guias/${g.slug}`,
      title: `${g.title} | Finanverso`,
      description: g.description,
      body: `<main><article><h1>${esc(g.title)}</h1><p>${esc(g.intro)}</p>${g.sections
        .map(
          (s) =>
            `<h2>${esc(s.heading)}</h2>${s.paragraphs
              .map((p) => `<p>${paragraph(p)}</p>`)
              .join('')}`
        )
        .join('')}</article>${
        g.tool ? `<p>${link(g.tool.to, g.tool.label)}</p>` : ''
      }${nav}</main>`,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: g.title,
          description: g.description,
          inLanguage: 'es',
          mainEntityOfPage: `${ORIGIN}/guias/${g.slug}`,
          author: { '@type': 'Person', name: 'Javi García' },
          publisher: { '@type': 'Organization', name: 'Finanverso', url: ORIGIN },
        },
      ],
    })
  );
}

// «Hacienda paso a paso»: step-by-step guides for the website of the Agencia Tributaria.
const { HACIENDA_GUIDES, HACIENDA_PATH, haciendaPath, guideKey, stepKey, upTo, withCampaign } =
  hacienda;
const source = t('hacienda.source').replace('{date}', t('hacienda.sourceDate'));
write(
  HACIENDA_PATH,
  render({
    path: HACIENDA_PATH,
    title: t('hacienda.metaTitle'),
    description: t('hacienda.metaDescription'),
    body: `<main><h1>${esc(t('hacienda.title'))}</h1><p>${esc(
      t('hacienda.hint')
    )}</p><ul>${HACIENDA_GUIDES.map(
      (g) =>
        `<li>${link(haciendaPath(g), t(guideKey(g, 'title')))}<p>${esc(
          t(guideKey(g, 'description'))
        )}</p></li>`
    ).join('')}</ul>${nav}</main>`,
  })
);
for (const g of HACIENDA_GUIDES) {
  const title = t(guideKey(g, 'title'));
  write(
    haciendaPath(g),
    render({
      path: haciendaPath(g),
      title: `${title} | Finanverso`,
      description: t(guideKey(g, 'description')),
      body: `<main><article><h1>${esc(title)}</h1><p>${esc(
        t(guideKey(g, 'intro'))
      )}</p><ol>${g.steps
        .map(
          (s) =>
            `<li><h2>${esc(t(stepKey(g, s, 'title')))}</h2>${upTo(s.paragraphs)
              .map((n) => `<p>${esc(t(stepKey(g, s, `p${n}`)))}</p>`)
              .join('')}</li>`
        )
        .join('')}</ol><h2>${esc(t('hacienda.deadlines'))}</h2><ul>${upTo(g.deadlines)
        .map((n) => `<li>${esc(withCampaign(t(guideKey(g, `deadline${n}`))))}</li>`)
        .join('')}</ul><p>${esc(source)}</p><p>${esc(
        t('hacienda.disclaimer')
      )}</p></article>${nav}</main>`,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: title,
          description: t(guideKey(g, 'description')),
          inLanguage: 'es',
          url: `${ORIGIN}${haciendaPath(g)}`,
          step: g.steps.map((s, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            name: t(stepKey(g, s, 'title')),
            text: upTo(s.paragraphs)
              .map((n) => t(stepKey(g, s, `p${n}`)))
              .join(' '),
          })),
        },
      ],
    })
  );
}

// «Videoteca»: our YouTube tutorials, by section.
write(
  videos.VIDEOS_PATH,
  render({
    path: videos.VIDEOS_PATH,
    title: t('videos.metaTitle'),
    description: t('videos.metaDescription'),
    body: `<main><h1>${esc(t('videos.title'))}</h1><p>${esc(t('videos.hint'))}</p><p>${link(
      videos.YOUTUBE_CHANNEL_URL,
      t('videos.channel')
    )}</p>${videos
      .videoGroups()
      .map(
        ({ section, videos: list }) =>
          `<h2>${esc(t(`videos.section.${section.id}`))}</h2><ul>${list
            // Premium videos are unlisted on YouTube: no link (the id is not in the web app).
            .map((v) =>
              v.youtubeId
                ? `<li>${link(videos.videoUrl(v), v.title)}</li>`
                : `<li>${esc(v.title)} (${esc(t('videos.premium.badge'))})</li>`
            )
            .join('')}</ul>`
      )
      .join('')}${nav}</main>`,
  })
);

// Calculators.
for (const tool of TOOL_PAGES) {
  write(
    tool.path,
    render({
      path: tool.path,
      title: t(`tools.${tool.key}.title`),
      description: t(`tools.${tool.key}.description`),
      body: `<main><h1>${esc(t(`tools.${tool.key}.title`))}</h1><p>${esc(
        t(`tools.${tool.key}.description`)
      )}</p>${nav}</main>`,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: t(`tools.${tool.key}.title`),
          url: `${ORIGIN}${tool.path}`,
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        },
      ],
    })
  );
}

console.info(`[prerender] ${4 + GUIDES.length + HACIENDA_GUIDES.length + TOOL_PAGES.length} pages`);
