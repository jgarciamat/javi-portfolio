// Search engines read the public pages without running JavaScript first: after the build, every
// public page gets its own HTML file with its title, description, canonical and language links,
// Open Graph tags, structured data and the text of the page. The app replaces that text as soon as
// it loads; people with a session never see it. The pages themselves are in scripts/seo/pages.mjs.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NOT_FOUND, PAGES, esc, isTranslated, urlOf } from './seo/pages.mjs';
import { OG_IMAGE, SITE_NAME, checkPrices, graph } from './seo/site.mjs';
import { sitemapProblems } from './sitemap.mjs';

const dist = 'dist';
const template = readFileSync(join(dist, 'index.html'), 'utf8');

/** The template without the head tags each page writes itself. */
const shell = template
  .replace(/<title>[^<]*<\/title>\s*/, '')
  .replace(/<link rel="canonical"[^>]*>\s*/g, '')
  .replace(/<meta\s+name="(description|keywords|author|robots)"[^>]*>\s*/g, '')
  .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/g, '')
  .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/g, '')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');

const LOCALES = { es: 'es_ES', en: 'en_GB' };
const json = (data) =>
  // `<` escaped so no text can close the script tag.
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

/** The page's HTML: the template with its own head tags and its text inside #root. */
function render(page) {
  const url = urlOf(page.path, page.lang);
  const alternates = isTranslated(page.path)
    ? [
        ['es', urlOf(page.path, 'es')],
        ['en', urlOf(page.path, 'en')],
        ['x-default', urlOf(page.path, 'es')],
      ]
    : [];
  const other = page.lang === 'es' ? 'en' : 'es';
  const head = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<meta name="robots" content="${
      page.index ? 'index, follow, max-image-preview:large' : 'noindex, follow'
    }" />`,
    ...(page.index ? [`<link rel="canonical" href="${url}" />`] : []),
    ...(page.index
      ? alternates.map(
          ([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${href}" />`
        )
      : []),
    `<meta property="og:type" content="${page.ogType}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:image" content="${OG_IMAGE.url}" />`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:alt" content="${esc(page.title)}" />`,
    `<meta property="og:locale" content="${LOCALES[page.lang]}" />`,
    ...(alternates.length
      ? [`<meta property="og:locale:alternate" content="${LOCALES[other]}" />`]
      : []),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE.url}" />`,
    `<meta name="twitter:image:alt" content="${esc(page.title)}" />`,
    ...(page.nodes.length ? [json(graph(page.nodes))] : []),
  ].join('\n    ');
  const bodyLd = (page.bodyLd ?? []).map(json).join('');
  return shell
    .replace(/<html lang="[^"]*">/, `<html lang="${page.lang}">`)
    .replace('</head>', `    ${head}\n  </head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root"><div id="seo-fallback">${page.body}${bodyLd}</div></div>`
    );
}

function write(file, html) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

const fileOf = (page) => {
  const path = page.lang === 'en' ? (page.path === '/' ? '/en' : `/en${page.path}`) : page.path;
  return path === '/' ? join(dist, 'index.html') : join(dist, path, 'index.html');
};

for (const page of PAGES) write(fileOf(page), render(page));
write(join(dist, '404.html'), render(NOT_FOUND));

for (const problem of [...checkPrices(), ...sitemapProblems()]) {
  console.warn(`[prerender] ${problem}`);
}
console.info(`[prerender] ${PAGES.length} pages + 404`);
