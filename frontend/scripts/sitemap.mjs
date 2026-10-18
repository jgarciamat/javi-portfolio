// public/sitemap.xml: every indexable public page, its English/Spanish versions, its images and
// our public YouTube videos (never the Premium ones: they are unlisted). `lastmod` is the day the
// text of the page last changed: scripts/seo/lastmod.json keeps a fingerprint of each page, and
// `npm run sitemap` moves the date only for the pages whose fingerprint changed.
//
//   npm run sitemap        → rewrites public/sitemap.xml and scripts/seo/lastmod.json
//
// The build (prerender.mjs) warns when the sitemap is out of date.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PAGES, esc, isTranslated, urlOf } from './seo/pages.mjs';
import { VIDEO_UPLOAD_DATE, thumbnailUrl } from './seo/site.mjs';

const SITEMAP = 'public/sitemap.xml';
const LASTMOD = 'scripts/seo/lastmod.json';

const indexable = () => PAGES.filter((p) => p.index);
const fingerprint = (p) =>
  createHash('sha256')
    .update(JSON.stringify([p.title, p.description, p.body, p.nodes, p.videos ?? []]))
    .digest('hex')
    .slice(0, 16);
const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {});

/** Dates by URL: the stored one while the page stays the same, `today` once it changes. */
export function lastmods(today, stored = readJson(LASTMOD)) {
  return Object.fromEntries(
    indexable().map((p) => {
      const url = urlOf(p.path, p.lang);
      const hash = fingerprint(p);
      const known = stored[url];
      return [url, known && known.hash === hash ? known : { hash, lastmod: today }];
    })
  );
}

function urlEntry(p, dates) {
  const url = urlOf(p.path, p.lang);
  const alternates = isTranslated(p.path)
    ? [
        ['es', urlOf(p.path, 'es')],
        ['en', urlOf(p.path, 'en')],
        ['x-default', urlOf(p.path, 'es')],
      ]
    : [];
  const lines = [`    <loc>${url}</loc>`, `    <lastmod>${dates[url].lastmod}</lastmod>`];
  for (const [lang, href] of alternates) {
    lines.push(`    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`);
  }
  for (const image of p.images ?? []) {
    lines.push(`    <image:image><image:loc>${image.loc}</image:loc></image:image>`);
  }
  for (const v of p.videos ?? []) {
    if (v.premium || !v.youtubeId) throw new Error(`video ${v.number} is not public`);
    lines.push(
      [
        '    <video:video>',
        `      <video:thumbnail_loc>${thumbnailUrl(v)}</video:thumbnail_loc>`,
        `      <video:title>${esc(v.title)}</video:title>`,
        `      <video:description>${esc(
          `${v.title}. Tutorial de Finanverso.`
        )}</video:description>`,
        `      <video:player_loc>https://www.youtube.com/embed/${v.youtubeId}</video:player_loc>`,
        ...(v.durationSeconds
          ? [`      <video:duration>${v.durationSeconds}</video:duration>`]
          : []),
        `      <video:publication_date>${VIDEO_UPLOAD_DATE}</video:publication_date>`,
        '    </video:video>',
      ].join('\n')
    );
  }
  return `  <url>\n${lines.join('\n')}\n  </url>`;
}

export function sitemapXml(dates) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${indexable()
  .map((p) => urlEntry(p, dates))
  .join('\n')}
</urlset>
`;
}

/** What is wrong with the committed sitemap (empty when it matches the pages). */
export function sitemapProblems() {
  const stored = readJson(LASTMOD);
  const changed = indexable().filter((p) => stored[urlOf(p.path, p.lang)]?.hash !== fingerprint(p));
  if (changed.length) {
    return [
      `sitemap out of date for ${changed.length} page(s), e.g. ${urlOf(
        changed[0].path,
        changed[0].lang
      )}: run \`npm run sitemap\``,
    ];
  }
  const expected = sitemapXml(stored);
  return existsSync(SITEMAP) && readFileSync(SITEMAP, 'utf8') === expected
    ? []
    : ['public/sitemap.xml does not match the pages: run `npm run sitemap`'];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dates = lastmods(new Date().toISOString().slice(0, 10));
  writeFileSync(LASTMOD, `${JSON.stringify(dates, null, 2)}\n`);
  writeFileSync(SITEMAP, sitemapXml(dates));
  console.info(`[sitemap] ${Object.keys(dates).length} pages`);
}
