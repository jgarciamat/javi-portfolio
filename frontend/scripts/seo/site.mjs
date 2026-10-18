// What the public pages tell search engines about Finanverso: the site, the app and its prices,
// and the builders of the structured data (JSON-LD, https://schema.org) the pages carry.
import { existsSync, readFileSync } from 'node:fs';

export const ORIGIN = 'https://finanverso.app';
export const SITE_NAME = 'Finanverso';
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.jgarciamat.moneymanager';
export const OG_IMAGE = { url: `${ORIGIN}/og-image.png`, width: 1200, height: 630 };

/**
 * Prices with VAT, as the pricing page shows them. The billing config is the source of truth
 * (`PRICE_MONTHLY` / `PRICE_YEARLY` in backend/src/config/env.ts): when the backend is next to us
 * (local and CI builds; the Docker build of the web only has the frontend) a mismatch is reported.
 */
export const PRICES = { monthly: 3.49, yearly: 29.99 };

export function checkPrices(envFile = '../backend/src/config/env.ts') {
  if (!existsSync(envFile)) return [];
  const env = readFileSync(envFile, 'utf8');
  const problems = [];
  for (const [name, key] of [
    ['PRICE_MONTHLY', 'monthly'],
    ['PRICE_YEARLY', 'yearly'],
  ]) {
    const m = env.match(new RegExp(`${name}:[^\\n]*default\\(([\\d.]+)\\)`));
    if (m && Number(m[1]) !== PRICES[key]) {
      problems.push(`${name} is ${m[1]} in the billing config but ${PRICES[key]} here`);
    }
  }
  return problems;
}

/** The day the videos went up on YouTube (VideoObject.uploadDate, video sitemap). */
export const VIDEO_UPLOAD_DATE = '2026-10-18';

const ORG_ID = `${ORIGIN}/#organization`;
const SITE_ID = `${ORIGIN}/#website`;

export const organization = (sameAs) => ({
  '@type': 'Organization',
  '@id': ORG_ID,
  name: SITE_NAME,
  url: `${ORIGIN}/`,
  logo: { '@type': 'ImageObject', url: `${ORIGIN}/logo-512.png`, width: 512, height: 512 },
  sameAs,
});

export const website = () => ({
  '@type': 'WebSite',
  '@id': SITE_ID,
  name: SITE_NAME,
  url: `${ORIGIN}/`,
  inLanguage: ['es', 'en'],
  publisher: { '@id': ORG_ID },
});

const euros = (n) => n.toFixed(2);

/** The plans: free, and Premium by month or by year (the trial is not an offer of its own). */
export function offers(names) {
  const plan = (name, price, billingDuration) => ({
    '@type': 'Offer',
    name,
    price: euros(price),
    priceCurrency: 'EUR',
    url: `${ORIGIN}/pricing`,
    ...(billingDuration && {
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: euros(price),
        priceCurrency: 'EUR',
        billingDuration,
      },
    }),
  });
  return [
    plan(names.free, 0),
    plan(names.monthly, PRICES.monthly, 'P1M'),
    plan(names.yearly, PRICES.yearly, 'P1Y'),
  ];
}

/** The web app and the Android app. No rating: we only publish one when it is real. */
export function apps({ description, features, offerNames, lang }) {
  const common = {
    name: SITE_NAME,
    description,
    applicationCategory: 'FinanceApplication',
    inLanguage: lang,
    publisher: { '@id': ORG_ID },
    offers: offers(offerNames),
    featureList: features,
    image: OG_IMAGE.url,
  };
  return [
    {
      '@type': 'WebApplication',
      '@id': `${ORIGIN}/#webapp`,
      ...common,
      url: `${ORIGIN}/`,
      operatingSystem: 'Web',
      browserRequirements: 'Requires JavaScript',
    },
    {
      '@type': 'MobileApplication',
      '@id': `${ORIGIN}/#android`,
      ...common,
      url: PLAY_URL,
      installUrl: PLAY_URL,
      operatingSystem: 'Android',
    },
  ];
}

export const webPage = ({ url, title, description, lang, type = 'WebPage', extra = {} }) => ({
  '@type': type,
  '@id': `${url}#webpage`,
  url,
  name: title,
  description,
  inLanguage: lang,
  isPartOf: { '@id': SITE_ID },
  ...extra,
});

/** Breadcrumbs: `[[name, url], …]`, home first. */
export const breadcrumbs = (url, items) => ({
  '@type': 'BreadcrumbList',
  '@id': `${url}#breadcrumb`,
  itemListElement: items.map(([name, item], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name,
    item,
  })),
});

/** ISO 8601 duration: 303 → PT5M3S. */
export function isoDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `PT${m ? `${m}M` : ''}${s || !m ? `${s}S` : ''}`;
}

export const thumbnailUrl = (v) => `${ORIGIN}/videos/${String(v.number).padStart(2, '0')}.webp`;

/** One of our public YouTube videos. Premium (unlisted) ones never get here. */
export function videoObject(v, description) {
  if (v.premium || !v.youtubeId) throw new Error(`video ${v.number} is not public`);
  return {
    '@type': 'VideoObject',
    '@id': `${ORIGIN}/videoteca#video-${v.number}`,
    name: v.title,
    description,
    thumbnailUrl: thumbnailUrl(v),
    uploadDate: VIDEO_UPLOAD_DATE,
    ...(v.durationSeconds && { duration: isoDuration(v.durationSeconds) }),
    embedUrl: `https://www.youtube.com/embed/${v.youtubeId}`,
    contentUrl: `https://www.youtube.com/watch?v=${v.youtubeId}`,
    inLanguage: 'es',
    publisher: { '@id': ORG_ID },
  };
}

export const graph = (nodes) => ({ '@context': 'https://schema.org', '@graph': nodes });
