/**
 * «Videoteca»: our YouTube tutorials. The list lives here and is the only source of truth: the
 * in-app section, the public page and the «Vídeo de Finanverso» link of each «Hacienda paso a paso»
 * guide are built from it. Section names are in the locale files under `videos.section.<id>`.
 *
 * How to add a video:
 * 1. Add (or find) its entry below with its number, section, title (the «## Título» of
 *    `youtube/descripciones/NN-*.md`) and duration in seconds.
 * 2. Save its thumbnail as `frontend/public/videos/NN.webp` (480×270, webp quality ~75). Without
 *    one, set `thumbnail: false` and a plain tile is shown instead.
 * 3. Once it is on YouTube, fill `youtubeId` (the `v=` part of the link). Only published entries
 *    are shown, and a section with none is hidden.
 *
 * Premium videos (`premium: true`) are unlisted on YouTube: their id is NOT written here (this file
 * ships in the public bundle). It goes in `backend/src/domain/services/premium-videos.ts`, which
 * hands it to Premium users only; here the entry just gets `published: true` once it is uploaded.
 * Everybody else sees a locked card that leads to Premium.
 */
import type { HaciendaGuideId } from './hacienda';

export const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@finanversoapp';
export const YOUTUBE_SUBSCRIBE_URL = `${YOUTUBE_CHANNEL_URL}?sub_confirmation=1`;

/** Public page of the Videoteca (`/videos` holds the thumbnails). */
export const VIDEOS_PATH = '/videoteca';

export type VideoSectionId =
  | 'start'
  | 'app'
  | 'hacienda'
  | 'autonomos'
  | 'renta'
  | 'invest'
  | 'home';

export interface VideoSection {
  id: VideoSectionId;
  emoji: string;
  color: string;
}

/** In the order they are shown. */
export const VIDEO_SECTIONS: VideoSection[] = [
  { id: 'start', emoji: '🚀', color: '#22c55e' },
  { id: 'app', emoji: '📱', color: '#6366f1' },
  { id: 'hacienda', emoji: '🏛️', color: '#0ea5e9' },
  { id: 'autonomos', emoji: '💼', color: '#f59e0b' },
  { id: 'renta', emoji: '🧾', color: '#ef4444' },
  { id: 'invest', emoji: '📈', color: '#14b8a6' },
  { id: 'home', emoji: '🏠', color: '#ec4899' },
];

export interface VideoEntry {
  number: number;
  section: VideoSectionId;
  title: string;
  durationSeconds?: number;
  /** Empty until the video is published on YouTube. Never set on a Premium video. */
  youtubeId?: string;
  /** Only for Premium users: its id comes from the server (`GET /api/videos/premium`). */
  premium?: true;
  /** A Premium video already on YouTube (it has no `youtubeId` here). */
  published?: true;
  /** False when there is no `public/videos/NN.webp`. */
  thumbnail?: boolean;
  /** «Hacienda paso a paso» guide that links to this video. */
  guide?: HaciendaGuideId;
}

export const VIDEOS: VideoEntry[] = [
  {
    number: 1,
    section: 'start',
    title: 'Finanverso: primeros pasos, registro, planes y tour guiado',
    durationSeconds: 303,
    youtubeId: '9-gprAy-6ss',
  },
  {
    number: 2,
    section: 'start',
    title: 'Resumen del mes en Finanverso: gastos, ingresos, notas y búsqueda',
    durationSeconds: 524,
    youtubeId: 'LO41DecZnzo',
  },
  {
    number: 3,
    section: 'start',
    title: 'Cuentas, transferencias y gastos en otra moneda en Finanverso',
    durationSeconds: 404,
    youtubeId: 'qybGobqmJyQ',
  },
  {
    number: 4,
    section: 'start',
    title: 'Presupuestos y alertas en Finanverso: controla cada categoría',
    durationSeconds: 400,
    youtubeId: 'av-66smMQ-s',
  },
  {
    number: 5,
    section: 'start',
    title: 'Metas de ahorro en Finanverso: viaje, coche o fondo de emergencia',
    durationSeconds: 365,
    youtubeId: 'IKRD8s8lyKc',
  },
  {
    number: 6,
    section: 'app',
    title: '¿Llegas a fin de mes? Previsión, análisis y balance anual',
    durationSeconds: 410,
    youtubeId: 'Wsmm6lb-An8',
  },
  {
    number: 7,
    section: 'app',
    title: 'Gastos fijos y suscripciones: operaciones automáticas en Finanverso',
    durationSeconds: 416,
    youtubeId: '0XXIVBTQH_o',
  },
  {
    number: 8,
    section: 'app',
    title: 'Importar el extracto del banco, tickets y reglas de categorías',
    durationSeconds: 455,
    youtubeId: 'sBP9w0n9oEo',
  },
  {
    number: 9,
    section: 'app',
    title: 'Gastos compartidos y modo hogar en Finanverso: cuentas claras',
    durationSeconds: 511,
    youtubeId: 'tVbq4PkZBHo',
  },
  {
    number: 10,
    section: 'app',
    title: 'Patrimonio, deudas, salud financiera, asesor IA y seguridad',
    durationSeconds: 549,
    youtubeId: 'ZZPqJYdwQhM',
  },
  {
    number: 11,
    section: 'autonomos',
    title: 'Autónomos: borrador del modelo 303 y 130 paso a paso con Finanverso',
    durationSeconds: 544,
    youtubeId: '-qtXpk0qNuY',
  },
  {
    number: 12,
    section: 'autonomos',
    title: 'Autónomos 2026: cuota por tramos, gastos deducibles, plazos y PDF',
    durationSeconds: 453,
    youtubeId: 'vz25xbjrXdk',
  },
  {
    number: 13,
    section: 'renta',
    title: 'Calculadora de la Renta paso a paso: ingresos, hijos y deducciones',
    durationSeconds: 561,
    youtubeId: 'LBGqcIfcuKM',
  },
  {
    number: 14,
    section: 'renta',
    title: 'Renta: importa tu borrador y descubre las deducciones que faltan',
    durationSeconds: 486,
    youtubeId: 'KnGxQ4yre7E',
  },
  {
    number: 15,
    section: 'app',
    title: 'Guías de ahorro: 50/30/20, gastos hormiga y dinero en pareja',
    durationSeconds: 448,
    youtubeId: 'CZfkWUFsdVs',
  },
  {
    number: 16,
    section: 'app',
    title: 'Guías: fondo de emergencia, deudas, hipoteca e interés compuesto',
    durationSeconds: 425,
    youtubeId: 'ICp2TM9wodA',
  },
  {
    number: 17,
    section: 'invest',
    title: 'Cómo invertir: el mapa de las 9 clases de activos y las acciones',
    durationSeconds: 550,
    premium: true,
    published: true,
  },
  {
    number: 18,
    section: 'invest',
    title: 'Cómo invertir: fondos indexados, ETF, interés compuesto y bonos',
    durationSeconds: 521,
    premium: true,
    published: true,
  },
  {
    number: 19,
    section: 'invest',
    title: 'Cómo invertir: criptomonedas, apalancamiento y estafas',
    durationSeconds: 490,
    premium: true,
    published: true,
  },
  {
    number: 20,
    section: 'invest',
    title: 'Cómo invertir: fiscalidad en España, mercados y riesgo',
    durationSeconds: 492,
    premium: true,
    published: true,
  },
  {
    number: 21,
    section: 'hacienda',
    title: 'Renta WEB para tontos: revisa y presenta tu borrador paso a paso',
    durationSeconds: 444,
    youtubeId: 'athcDzLevm4',
    guide: 'renta',
  },
  {
    number: 22,
    section: 'hacienda',
    title: 'Modelo 303 para tontos: el IVA trimestral paso a paso',
    durationSeconds: 418,
    youtubeId: 'qSX-OK9b1AE',
    guide: 'm303',
  },
  {
    number: 23,
    section: 'hacienda',
    title: 'Modelo 130 para tontos: el pago fraccionado del IRPF paso a paso',
    durationSeconds: 342,
    youtubeId: 'n_HiGI6_BL4',
    guide: 'm130',
  },
  {
    number: 24,
    section: 'hacienda',
    title: 'Certificado digital FNMT para tontos: cómo conseguirlo paso a paso',
    durationSeconds: 423,
    youtubeId: 'G6Ag63KCXD4',
    guide: 'start',
  },
  {
    number: 25,
    section: 'autonomos',
    title: 'Darse de alta como autónomo para tontos: Hacienda y Seguridad Social',
    durationSeconds: 321,
    youtubeId: 'Wlo53zACXmI',
  },
  {
    number: 26,
    section: 'autonomos',
    title: 'Autónomos: cambia tu base de cotización (para tontos)',
    durationSeconds: 316,
    youtubeId: '6hVclBHj34Y',
  },
  {
    number: 27,
    section: 'autonomos',
    title: 'Modelo 390 para tontos: el resumen anual del IVA',
    durationSeconds: 328,
    premium: true,
    published: true,
  },
  {
    number: 28,
    section: 'autonomos',
    title: 'Modelo 347 para tontos: operaciones con terceros',
    durationSeconds: 326,
    premium: true,
    published: true,
  },
  {
    number: 29,
    section: 'autonomos',
    title: 'Modelos 111 y 115 para tontos: retenciones de empleados, profesionales',
    durationSeconds: 330,
    premium: true,
    published: true,
  },
  {
    number: 30,
    section: 'autonomos',
    title: 'VERI*FACTU para tontos: qué cambia en tus facturas y cuándo',
    durationSeconds: 308,
    youtubeId: 'iRStIanzkZg',
  },
  {
    number: 31,
    section: 'autonomos',
    title: 'Darse de baja como autónomo para tontos: Hacienda y Seguridad Social',
    durationSeconds: 315,
    youtubeId: '_GLewoY1kBE',
  },
  {
    number: 32,
    section: 'renta',
    title: 'Deducciones autonómicas para tontos: las que Hacienda no pone sola',
    durationSeconds: 314,
    youtubeId: 'MK5woiLeh7A',
  },
  {
    number: 33,
    section: 'renta',
    title: '¿Renta conjunta o individual? Cómo comparar (para tontos)',
    durationSeconds: 317,
    youtubeId: 'REjCqBo4iqs',
  },
  {
    number: 34,
    section: 'renta',
    title: '¿Te sale a pagar la Renta? Dos plazos o aplazamiento (para tontos)',
    durationSeconds: 315,
    youtubeId: 'Rn6yY84sNSk',
  },
  {
    number: 35,
    section: 'renta',
    title: '¿Dónde está mi devolución de la Renta? Cómo consultarla (para tontos)',
    durationSeconds: 305,
    youtubeId: 'Rd_X5uCaUTk',
  },
  {
    number: 36,
    section: 'renta',
    title: 'Me equivoqué en la Renta: cómo rectificarla (para tontos)',
    durationSeconds: 308,
    youtubeId: 'VoV55xtyNC4',
  },
  {
    number: 37,
    section: 'hacienda',
    title: 'Te ha llegado una carta de Hacienda: qué hacer (para tontos)',
    durationSeconds: 307,
    youtubeId: 'UfhiMklYZtE',
  },
  {
    number: 38,
    section: 'renta',
    title: '100 € al mes por hijo: maternidad y familia numerosa (para tontos)',
    durationSeconds: 315,
    youtubeId: 'JQKnG-6xsOk',
  },
  {
    number: 39,
    section: 'invest',
    title: 'Letras del Tesoro para tontos: cómpralas directamente al Tesoro',
    durationSeconds: 318,
    premium: true,
    published: true,
  },
  {
    number: 40,
    section: 'invest',
    title: 'Fondos, acciones y cripto en la Renta para tontos',
    durationSeconds: 311,
    premium: true,
    published: true,
  },
  {
    number: 41,
    section: 'invest',
    title: 'Modelos 720 y 721 para tontos: tus bienes y cripto en el extranjero',
    durationSeconds: 338,
    premium: true,
    published: true,
  },
  {
    number: 42,
    section: 'invest',
    title: 'Traspasar un fondo sin pagar impuestos (para tontos)',
    durationSeconds: 307,
    premium: true,
    published: true,
  },
  {
    number: 43,
    section: 'invest',
    title: 'Dividendos de un bróker extranjero: no pagues dos veces (para tontos)',
    durationSeconds: 303,
    premium: true,
    published: true,
  },
  {
    number: 44,
    section: 'invest',
    title: 'Plan de pensiones: cuánto desgrava y cómo va en la Renta (para tontos)',
    durationSeconds: 309,
    premium: true,
    published: true,
  },
  {
    number: 45,
    section: 'home',
    title: 'Pide tu vida laboral en 2 minutos (para tontos)',
    durationSeconds: 309,
    youtubeId: 'Ipy0tgiMU_w',
  },
  {
    number: 46,
    section: 'home',
    title: 'Bono Alquiler Joven y ayudas al alquiler: cómo pedirlas (para tontos)',
    durationSeconds: 316,
    youtubeId: 'cTg160wYWIY',
  },
  {
    number: 47,
    section: 'home',
    title: 'Bono social eléctrico: quién puede pedirlo y cómo (para tontos)',
    durationSeconds: 314,
    youtubeId: 'n7rQFtCqOFg',
  },
  {
    number: 48,
    section: 'home',
    title: 'Ingreso Mínimo Vital: quién puede pedirlo y cómo (para tontos)',
    durationSeconds: 316,
    youtubeId: '8VF6v1zDsH0',
  },
];

/** YouTube ids of the Premium videos by number, as the server gives them to Premium users. */
export type PremiumVideoIds = Record<number, string>;

/** Already on YouTube: with its id, or a Premium one marked as published. */
export const isPublished = (v: VideoEntry) =>
  Boolean(v.youtubeId) || (v.premium === true && v.published === true);

/** The videos that are already on YouTube (Premium ones included, shown locked to the rest). */
export const publishedVideos = (videos: VideoEntry[] = VIDEOS) => videos.filter(isPublished);

/** The sections with at least one published video, each with its videos. */
export const videoGroups = (videos: VideoEntry[] = VIDEOS) =>
  VIDEO_SECTIONS.map((section) => ({
    section,
    videos: publishedVideos(videos).filter((v) => v.section === section.id),
  })).filter((g) => g.videos.length > 0);

export const youtubeUrl = (youtubeId: string) => `https://www.youtube.com/watch?v=${youtubeId}`;

/** Link to a public video (Premium ones have no id here: see {@link watchId}). */
export const videoUrl = (v: VideoEntry) => youtubeUrl(v.youtubeId as string);

/** The id of a video for whoever is watching: its own, or the one the server gave to Premium. */
export const watchId = (v: VideoEntry, premiumIds: PremiumVideoIds | null) =>
  v.youtubeId ?? premiumIds?.[v.number];

/**
 * Our own thumbnail. YouTube's (i.ytimg.com) is not used: the Content-Security-Policy only allows
 * images from this site.
 */
export const videoThumbnail = (v: VideoEntry) =>
  v.thumbnail === false ? undefined : `/videos/${String(v.number).padStart(2, '0')}.webp`;

/** «5:02», «1:02:03». */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Link to our video of a «Hacienda paso a paso» guide, or '' while it is not published. */
export function guideVideoUrl(guide: HaciendaGuideId, videos: VideoEntry[] = VIDEOS): string {
  // Premium videos are left out: the guides are public.
  const video = videos.find((v) => v.guide === guide && v.youtubeId);
  return video ? videoUrl(video) : '';
}
