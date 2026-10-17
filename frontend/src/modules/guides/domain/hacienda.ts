/**
 * «Hacienda paso a paso»: step-by-step guides to do things on the website of the Agencia Tributaria
 * (AEAT). The structure lives here; every text is in the locale files under `hacienda.<guide>.…`, so
 * the same guide is shown in the app, on the public site and in the pre-rendered pages.
 */
import { guideVideoUrl } from './videos';

/** Day the official sources were checked (shown at the bottom of every guide). */
export const SOURCE_CHECKED = '2026-10-17';

/**
 * The last Renta campaign the guides' dates refer to: the income of this year, filed the next one
 * (Renta 2025, filed from April to June 2026). When the AEAT publishes the dates of the next
 * campaign, change it here and the days in `hacienda.renta.deadline*` and `hacienda.start.deadline2`.
 */
export const RENTA_CAMPAIGN_YEAR = 2025;

/** Values of the deadline texts: `{year}` (Renta of…) and `{filed}` (year it is filed). */
export const DEADLINE_PARAMS = {
  year: String(RENTA_CAMPAIGN_YEAR),
  filed: String(RENTA_CAMPAIGN_YEAR + 1),
};

/** A deadline text with its years filled in (for the pre-rendered pages, which have no i18n). */
export const withCampaign = (text: string): string =>
  text.replace(/\{year\}/g, DEADLINE_PARAMS.year).replace(/\{filed\}/g, DEADLINE_PARAMS.filed);

/** Official pages the guides link to (labels in `hacienda.link.<id>`). */
export const OFFICIAL_LINKS = {
  sede: 'https://sede.agenciatributaria.gob.es/',
  clave: 'https://sede.agenciatributaria.gob.es/Sede/clave.html',
  claveRegister: 'https://clave.gob.es/registro/como-puedo-registrarme',
  fnmt: 'https://www.sede.fnmt.gob.es/certificados/persona-fisica',
  proxies:
    'https://sede.agenciatributaria.gob.es/Sede/colaborar-agencia-tributaria/registro-apoderamientos/nociones-generales.html',
  renta: 'https://sede.agenciatributaria.gob.es/Sede/Renta.html',
  rentaHelp:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/renta-ayuda-tecnica/presentar-borrador-declaracion-mediante-renta-certificado.html',
  rentaFix:
    'https://sede.agenciatributaria.gob.es/Sede/irpf/campana-renta/modificacion-declaracion-renta-2025-presentada.html',
  surcharges:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion/regularizacion-situaciones-tributarias/recargos-aplicables.html',
  m303: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G414.shtml',
  m303Help:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-303.html',
  m303Instructions:
    'https://www3.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G414/Inst_mod_303_2025.pdf',
  m303Deadlines:
    'https://sede.agenciatributaria.gob.es/Sede/iva/presentar-declaracion-iva-modelo-303/plazo-presentacion-modelo-303.html',
  debitDeadlines:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/contenidos-lectura-facil/calendario-contribuyente-2026-simplificado-personas-fisicas/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html',
  m130: 'https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G601.shtml',
  m130Help:
    'https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-130.html',
  m130Instructions:
    'https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-130-irpf______esionales-estimacion-directa-fraccionado_/instrucciones.html',
} as const;

const VIDEOS = 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/videos';

/** Videos of the Agencia Tributaria: only linked, never embedded (labels in `hacienda.video.<id>`). */
export const OFFICIAL_VIDEOS = {
  rentaWeb: `${VIDEOS}/renta-2025/cumplimentacion-renta-web.html`,
  claveHow: `${VIDEOS}/que-funciona-sistema-clave.html`,
  claveMobile: `${VIDEOS}/identificarse-mediante-clave-movil.html`,
  claveTypes: `${VIDEOS}/tipos-registro-clave.html`,
  proxy: `${VIDEOS}/alta-apoderamiento-internet-mediante-identificacion-electronica.html`,
  fix303: `${VIDEOS}/presentacion-autoliquidacion-rectificativa-modelo-303.html`,
  all: 'https://sede.agenciatributaria.gob.es/Sede/videos.html',
} as const;

export type OfficialLink = keyof typeof OFFICIAL_LINKS;
export type OfficialVideo = keyof typeof OFFICIAL_VIDEOS;

/** Sections of the app a step can open: the Renta tools and the self-employed draft. */
export type HaciendaTool = 'renta' | 'business';

export type HaciendaGuideId = 'start' | 'renta' | 'm303' | 'm130';

export interface HaciendaStep {
  id: string;
  /** Number of paragraphs: `….<step>.p1`, `.p2`… */
  paragraphs: number;
  /** Number of items the person can tick: `….<step>.c1`, `.c2`… */
  checks: number;
  /** Has a tip (`….<step>.tip`) or a warning (`….<step>.warn`). */
  tip?: boolean;
  warn?: boolean;
  /** Section of the app that helps with this step (button label in `….<step>.tool`). */
  tool?: HaciendaTool;
}

export interface HaciendaGuide {
  id: HaciendaGuideId;
  slug: string;
  emoji: string;
  steps: HaciendaStep[];
  /** Number of deadline lines: `hacienda.<guide>.deadline1`… */
  deadlines: number;
  links: OfficialLink[];
  videos: OfficialVideo[];
}

/**
 * Our own video for each guide (YouTube link), taken from the Videoteca. Empty until it is published:
 * the guide shows the «Vídeo de Finanverso» link only when there is one.
 */
export const FINANVERSO_VIDEOS: Record<HaciendaGuideId, string> = {
  start: guideVideoUrl('start'),
  renta: guideVideoUrl('renta'),
  m303: guideVideoUrl('m303'),
  m130: guideVideoUrl('m130'),
};

export const HACIENDA_GUIDES: HaciendaGuide[] = [
  {
    id: 'start',
    slug: 'antes-de-empezar',
    emoji: '🔑',
    steps: [
      { id: 'which', paragraphs: 4, checks: 1, tip: true },
      { id: 'clave', paragraphs: 5, checks: 3, warn: true },
      { id: 'login', paragraphs: 2, checks: 1 },
      { id: 'cert', paragraphs: 3, checks: 4, tip: true, warn: true },
      { id: 'reference', paragraphs: 3, checks: 2 },
      { id: 'proxy', paragraphs: 4, checks: 2, tip: true },
    ],
    deadlines: 2,
    links: ['clave', 'claveRegister', 'fnmt', 'proxies'],
    videos: ['claveHow', 'claveMobile', 'claveTypes', 'proxy'],
  },
  {
    id: 'renta',
    slug: 'renta-web',
    emoji: '🧾',
    steps: [
      { id: 'prepare', paragraphs: 2, checks: 3, tool: 'renta' },
      { id: 'access', paragraphs: 3, checks: 2, tip: true },
      { id: 'personal', paragraphs: 2, checks: 1, warn: true },
      { id: 'income', paragraphs: 3, checks: 2, tool: 'renta' },
      { id: 'property', paragraphs: 2, checks: 2 },
      { id: 'deductions', paragraphs: 3, checks: 2, warn: true, tool: 'renta' },
      { id: 'modify', paragraphs: 4, checks: 2 },
      { id: 'submit', paragraphs: 2, checks: 1, warn: true },
      { id: 'pay', paragraphs: 3, checks: 1 },
      { id: 'receipt', paragraphs: 2, checks: 1, tip: true },
      { id: 'fix', paragraphs: 3, checks: 1 },
    ],
    deadlines: 5,
    links: ['renta', 'rentaHelp', 'rentaFix', 'surcharges'],
    videos: ['rentaWeb', 'all'],
  },
  {
    id: 'm303',
    slug: 'modelo-303',
    emoji: '💶',
    steps: [
      { id: 'numbers', paragraphs: 2, checks: 3, tool: 'business' },
      { id: 'access', paragraphs: 3, checks: 1, tip: true },
      { id: 'file', paragraphs: 3, checks: 1 },
      { id: 'boxes', paragraphs: 5, checks: 3, warn: true, tool: 'business' },
      { id: 'check', paragraphs: 2, checks: 1 },
      { id: 'pay', paragraphs: 6, checks: 2 },
      { id: 'receipt', paragraphs: 2, checks: 1 },
      { id: 'fix', paragraphs: 3, checks: 1 },
    ],
    deadlines: 6,
    links: [
      'm303',
      'm303Help',
      'm303Instructions',
      'm303Deadlines',
      'debitDeadlines',
      'surcharges',
    ],
    videos: ['fix303', 'all'],
  },
  {
    id: 'm130',
    slug: 'modelo-130',
    emoji: '📊',
    steps: [
      { id: 'who', paragraphs: 3, checks: 1 },
      { id: 'numbers', paragraphs: 2, checks: 3, tool: 'business' },
      { id: 'access', paragraphs: 3, checks: 1 },
      { id: 'boxes', paragraphs: 3, checks: 1, tip: true },
      { id: 'reduce', paragraphs: 4, checks: 2, tool: 'business' },
      { id: 'pay', paragraphs: 3, checks: 1 },
      { id: 'receipt', paragraphs: 3, checks: 1 },
    ],
    deadlines: 6,
    links: ['m130', 'm130Help', 'm130Instructions', 'surcharges'],
    videos: ['all'],
  },
];

export const HACIENDA_PATH = '/hacienda-paso-a-paso';

export const haciendaPath = (guide: HaciendaGuide): string => `${HACIENDA_PATH}/${guide.slug}`;

export const findHaciendaGuide = (slug: string | undefined): HaciendaGuide | undefined =>
  HACIENDA_GUIDES.find((g) => g.slug === slug);

/** 1…n */
export const upTo = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

/** Key of a text of the guide: `hacienda.renta.title`. */
export const guideKey = (guide: HaciendaGuide, part: string): string =>
  `hacienda.${guide.id}.${part}`;

/** Key of a text of a step: `hacienda.renta.access.p1`. */
export const stepKey = (guide: HaciendaGuide, step: HaciendaStep, part: string): string =>
  `hacienda.${guide.id}.${step.id}.${part}`;

/** Identifier of one item of the checklist, as it is stored. */
export const checkId = (guide: HaciendaGuide, step: HaciendaStep, n: number): string =>
  `${guide.id}.${step.id}.${n}`;

/** Every item of the checklist of a guide. */
export const checkIds = (guide: HaciendaGuide): string[] =>
  guide.steps.flatMap((s) => upTo(s.checks).map((n) => checkId(guide, s, n)));

/** Every key a guide needs in the locale files. */
export function guideTextKeys(guide: HaciendaGuide): string[] {
  return [
    ...['title', 'short', 'description', 'intro'].map((p) => guideKey(guide, p)),
    ...upTo(guide.deadlines).map((n) => guideKey(guide, `deadline${n}`)),
    ...guide.steps.flatMap((s) => [
      stepKey(guide, s, 'title'),
      ...upTo(s.paragraphs).map((n) => stepKey(guide, s, `p${n}`)),
      ...upTo(s.checks).map((n) => stepKey(guide, s, `c${n}`)),
      ...(s.tip ? [stepKey(guide, s, 'tip')] : []),
      ...(s.warn ? [stepKey(guide, s, 'warn')] : []),
      ...(s.tool ? [stepKey(guide, s, 'tool')] : []),
    ]),
    ...guide.links.map((l) => `hacienda.link.${l}`),
    ...guide.videos.map((v) => `hacienda.video.${v}`),
  ];
}
