// What search engines get of the public pages (`npm run test:seo`, also run by the build):
// people without an account, and search engines with them, get the whole of the open guides
// (OPEN_GUIDES), only the teaser of the other guides and of the calculators, and the structured data only describes what the page shows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MESSAGES, NOT_FOUND, PAGES, esc, load, pathIn } from './pages.mjs';

const { GUIDES } = await load('src/modules/guides/domain/guides.ts');
const { HACIENDA_GUIDES, haciendaPath, guideKey, stepKey, upTo } = await load(
  'src/modules/guides/domain/hacienda.ts'
);
const { TOOL_PAGES, faqOf } = await load('src/modules/tools/domain/toolPages.ts');
const wall = await load('src/modules/guides/domain/signupWall.ts');

const pageOf = (path, lang = 'es') => {
  const page = PAGES.find((p) => p.path === path && p.lang === lang);
  assert.ok(page, `${lang} ${path} is prerendered`);
  return page;
};
/** The beginning of a text as the HTML has it: links as their label, placeholders left out. */
const snippet = (text) =>
  esc(
    text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .split('{')[0]
      .slice(0, 60)
  );
const types = (page) => [
  ...page.nodes.map((n) => n['@type']),
  ...(page.bodyLd ?? []).map((n) => n['@type']),
];
const deepTypes = (value) =>
  JSON.stringify(value)
    .match(/"@type":"[A-Za-z]+"/g)
    ?.map((m) => m.slice(9, -1)) ?? [];
const langs = ['es', 'en'];

test('an open guide is whole, with its sources and a soft invitation; no wall', () => {
  assert.equal(wall.OPEN_GUIDES.length, 14);
  for (const slug of wall.OPEN_GUIDES) {
    const g = GUIDES.find((x) => x.slug === slug);
    assert.ok(g, `${slug} exists`);
    const page = pageOf(`/guias/${slug}`);
    const { body } = page;
    const plain = body.replace(/<[^>]+>/g, '');
    const plainOf = (p) => esc(p.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'));
    assert.ok(body.includes(`<h1>${esc(g.title)}</h1>`), slug);
    for (const s of g.sections) {
      assert.ok(body.includes(`<h2>${esc(s.heading)}</h2>`), slug);
      for (const p of s.paragraphs) assert.ok(plain.includes(plainOf(p)), `${slug} ${plainOf(p)}`);
    }
    for (const source of g.sources ?? []) assert.ok(body.includes(esc(source.url)), slug);
    assert.ok(body.includes(esc(MESSAGES.es['wall.soft.title'])), slug);
    assert.ok(body.includes(esc(wall.registerHref(`/guias/${slug}`))), slug);
    // No wall: no outline of locked sections, no kicker, no benefits, no video.
    assert.ok(!body.includes(esc(MESSAGES.es['wall.outline.guide'])), slug);
    assert.ok(!body.includes(esc(MESSAGES.es['wall.kicker.guide'])), slug);
    assert.ok(!body.includes('aria-label="' + esc(MESSAGES.es['wall.benefitsLabel'])), slug);
    assert.ok(!/youtube/.test(body), `${slug} has no video`);
    const article = page.nodes.find((n) => n['@type'] === 'Article');
    assert.equal(article.isAccessibleForFree, true, slug);
  }
});

test('a guide behind the account shows its beginning and the titles of the rest; never the rest', () => {
  for (const g of GUIDES.filter((x) => !wall.isOpenGuide(x.slug))) {
    const { body } = pageOf(`/guias/${g.slug}`);
    const teaser = wall.guideTeaser(g);
    assert.ok(body.includes(`<h1>${esc(g.title)}</h1>`), g.slug);
    assert.ok(body.includes(snippet(g.intro)), g.slug);
    assert.ok(body.includes(`<h2>${esc(teaser.preview.heading)}</h2>`), g.slug);
    for (const p of teaser.preview.paragraphs) assert.ok(body.includes(snippet(p)), g.slug);
    for (const heading of teaser.outline) assert.ok(body.includes(`<li>${esc(heading)}</li>`));
    assert.ok(body.includes(esc(wall.registerHref(`/guias/${g.slug}`))), g.slug);
    const hidden = [
      ...g.sections[0].paragraphs.slice(wall.PREVIEW_PARAGRAPHS),
      ...g.sections.slice(1).flatMap((s) => s.paragraphs),
    ];
    for (const p of hidden) {
      if (teaser.preview.paragraphs.includes(p)) continue;
      assert.ok(!body.includes(snippet(p)), `${g.slug} hides «${snippet(p)}»`);
    }
    for (const source of g.sources ?? []) assert.ok(!body.includes(esc(source.url)), g.slug);
    assert.ok(!/youtube/.test(body), `${g.slug} has no video`);
  }
});

test('a Hacienda guide shows its first step and the titles of the others; never the rest', () => {
  for (const lang of langs) {
    const t = (key) => MESSAGES[lang][key] ?? MESSAGES.es[key];
    for (const g of HACIENDA_GUIDES) {
      const { body } = pageOf(haciendaPath(g), lang);
      const [first, ...rest] = g.steps;
      assert.ok(body.includes(`<h1>${esc(t(guideKey(g, 'title')))}</h1>`));
      assert.ok(body.includes(esc(t(stepKey(g, first, 'title')))));
      assert.ok(body.includes(snippet(t(stepKey(g, first, 'p1')))));
      for (const step of rest) {
        assert.ok(body.includes(esc(t(stepKey(g, step, 'title')))), step.id);
        for (const n of upTo(step.paragraphs)) {
          assert.ok(!body.includes(snippet(t(stepKey(g, step, `p${n}`)))), `${g.id} ${step.id}`);
        }
      }
      for (const step of g.steps) {
        for (const n of upTo(step.checks)) {
          assert.ok(!body.includes(snippet(t(stepKey(g, step, `c${n}`)))), `${g.id} checklist`);
        }
      }
      for (const n of upTo(first.paragraphs).slice(wall.PREVIEW_PARAGRAPHS)) {
        assert.ok(!body.includes(snippet(t(stepKey(g, first, `p${n}`)))), `${g.id} p${n}`);
      }
      for (const n of upTo(g.deadlines)) {
        assert.ok(!body.includes(snippet(t(guideKey(g, `deadline${n}`)))), `${g.id} deadline`);
      }
      assert.ok(!/youtube/.test(body), `${g.id} has no video`);
    }
  }
});

test('a calculator shows what it does and its questions, not the answers nor the form', () => {
  for (const lang of langs) {
    const t = (key) => MESSAGES[lang][key] ?? MESSAGES.es[key];
    for (const tool of TOOL_PAGES) {
      const { body, bodyLd } = pageOf(tool.path, lang);
      assert.ok(body.includes(esc(t(`tools.${tool.key}.description`))), tool.path);
      assert.ok(body.includes(esc(t('wall.kicker.tool'))), tool.path);
      for (const n of faqOf(tool)) {
        assert.ok(body.includes(esc(t(`tools.${tool.key}.faq${n}.q`))), tool.path);
        assert.ok(!body.includes(snippet(t(`tools.${tool.key}.faq${n}.a`))), tool.path);
      }
      assert.ok(!/<(form|input|select)\b/.test(body), tool.path);
      assert.deepEqual(bodyLd ?? [], [], tool.path);
    }
  }
});

test('the wall brings people back to the page they were on, in their language', () => {
  const en = pageOf('/calculadora-renta', 'en');
  assert.ok(en.body.includes('href="/en/login?mode=register&amp;next=%2Fcalculadora-renta"'));
  assert.ok(en.body.includes('href="/en/login?next=%2Fcalculadora-renta"'));
  // The lists invite without a way back (there is nothing to come back to).
  assert.ok(pageOf('/guias').body.includes('href="/login?mode=register"'));
  // The welcome video is only named: no player, no link to YouTube.
  const video = wall.welcomeVideo();
  assert.ok(video && !video.premium);
  assert.ok(pageOf('/guias/deducciones-renta-castilla-y-leon').body.includes(esc(video.title)));
});

test('structured data only describes what the gated pages show', () => {
  const gated = PAGES.filter((p) => wall.isGatedPath(p.path));
  assert.equal(gated.length, GUIDES.length + 2 * (HACIENDA_GUIDES.length + TOOL_PAGES.length));
  for (const page of gated) {
    const all = deepTypes([page.nodes, page.bodyLd ?? []]);
    for (const banned of ['HowTo', 'HowToStep', 'FAQPage', 'Question', 'VideoObject']) {
      assert.ok(!all.includes(banned), `${page.lang} ${page.path}: no ${banned}`);
    }
    assert.ok(types(page).includes('BreadcrumbList'), page.path);
    assert.ok(
      types(page).includes(
        page.path.startsWith('/calculadora') || page.path.startsWith('/simulador')
          ? 'WebApplication'
          : 'Article'
      ),
      page.path
    );
    assert.deepEqual(page.videos ?? [], [], `${page.path} lists no video in the sitemap`);
    const article = page.nodes.find((n) => n['@type'] === 'Article');
    if (article && !wall.isOpenGuide(page.path.replace('/guias/', ''))) {
      assert.equal(article.isAccessibleForFree, undefined, `${page.path} is not marked free`);
    }
  }
  // The Videoteca keeps its public videos.
  assert.ok(deepTypes(pageOf('/videoteca').nodes).includes('VideoObject'));
});

test('every page has a unique title, one h1 and internal links that exist', () => {
  const indexable = PAGES.filter((p) => p.index);
  const titles = indexable.map((p) => `${p.lang} ${p.title}`);
  assert.equal(new Set(titles).size, titles.length);
  const known = new Set(PAGES.map((p) => pathIn(p.path, p.lang)));
  for (const page of [...PAGES, NOT_FOUND]) {
    assert.equal(page.body.match(/<h1[\s>]/g)?.length, 1, `${page.lang} ${page.path}: one h1`);
    for (const [, href] of page.body.matchAll(/href="(\/[^"]*)"/g)) {
      const path = href.replace(/&amp;/g, '&').split('?')[0];
      assert.ok(known.has(path), `${page.lang} ${page.path} links to ${href}`);
    }
  }
});

test('the pricing page already has the plans and the comparison, without calling the API', () => {
  for (const lang of langs) {
    const { body } = pageOf('/pricing', lang);
    assert.match(body, /<table>/);
    assert.ok((body.match(/<tr>/g) ?? []).length >= 15, `${lang} comparison rows`);
    assert.match(body, lang === 'en' ? /€3\.49/ : /3,49\s€/);
    assert.match(body, /\/login\?mode=register/);
  }
});

test('the sign-in links that carry `next` are nofollow; the rest are normal links', () => {
  const { body } = pageOf('/guias/fondo-de-emergencia');
  assert.match(body, /<a href="\/login\?next=[^"]*" rel="nofollow">/);
  assert.match(body, /<a href="\/login\?mode=register&amp;next=[^"]*" rel="nofollow">/);
  const home = pageOf('/').body;
  assert.ok(!/rel="nofollow"/.test(home));
});
