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
 * 3. Once it is on YouTube, fill `youtubeId` (the `v=` part of the link). Only entries with an id
 *    are shown, and a section with none is hidden.
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
  /** Empty until the video is published on YouTube. */
  youtubeId?: string;
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
  },
  {
    number: 12,
    section: 'autonomos',
    title: 'Autónomos 2026: cuota por tramos, gastos deducibles, plazos y PDF',
    durationSeconds: 453,
  },
  {
    number: 13,
    section: 'renta',
    title: 'Calculadora de la Renta paso a paso: ingresos, hijos y deducciones',
    durationSeconds: 561,
  },
  {
    number: 14,
    section: 'renta',
    title: 'Renta: importa tu borrador y descubre las deducciones que faltan',
    durationSeconds: 486,
  },
  {
    number: 15,
    section: 'app',
    title: 'Guías de ahorro: 50/30/20, gastos hormiga y dinero en pareja',
    durationSeconds: 448,
  },
  {
    number: 16,
    section: 'app',
    title: 'Guías: fondo de emergencia, deudas, hipoteca e interés compuesto',
    durationSeconds: 425,
  },
  {
    number: 17,
    section: 'invest',
    title: 'Cómo invertir: el mapa de las 9 clases de activos y las acciones',
    durationSeconds: 550,
  },
  {
    number: 18,
    section: 'invest',
    title: 'Cómo invertir: fondos indexados, ETF, interés compuesto y bonos',
    durationSeconds: 521,
  },
  {
    number: 19,
    section: 'invest',
    title: 'Cómo invertir: criptomonedas, apalancamiento y estafas',
    durationSeconds: 490,
  },
  {
    number: 20,
    section: 'invest',
    title: 'Cómo invertir: fiscalidad en España, mercados y riesgo',
    durationSeconds: 492,
  },
  {
    number: 21,
    section: 'hacienda',
    title: 'Renta WEB para tontos: revisa y presenta tu borrador paso a paso',
    durationSeconds: 444,
    guide: 'renta',
  },
  {
    number: 22,
    section: 'hacienda',
    title: 'Modelo 303 para tontos: el IVA trimestral paso a paso',
    durationSeconds: 418,
    guide: 'm303',
  },
  {
    number: 23,
    section: 'hacienda',
    title: 'Modelo 130 para tontos: el pago fraccionado del IRPF paso a paso',
    durationSeconds: 342,
    guide: 'm130',
  },
  {
    number: 24,
    section: 'hacienda',
    title: 'Certificado digital FNMT para tontos: cómo conseguirlo paso a paso',
    durationSeconds: 423,
    guide: 'start',
  },
];

/** The videos that are already on YouTube. */
export const publishedVideos = (videos: VideoEntry[] = VIDEOS) =>
  videos.filter((v) => Boolean(v.youtubeId));

/** The sections with at least one published video, each with its videos. */
export const videoGroups = (videos: VideoEntry[] = VIDEOS) =>
  VIDEO_SECTIONS.map((section) => ({
    section,
    videos: publishedVideos(videos).filter((v) => v.section === section.id),
  })).filter((g) => g.videos.length > 0);

export const videoUrl = (v: VideoEntry) => `https://www.youtube.com/watch?v=${v.youtubeId}`;

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
  const video = publishedVideos(videos).find((v) => v.guide === guide);
  return video ? videoUrl(video) : '';
}
