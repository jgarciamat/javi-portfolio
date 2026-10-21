// What people without an account see of the guides and calculators: a teaser (the title, the
// introduction, the beginning and the outline of the rest) and an invitation to sign up. The app
// and the prerendered HTML (scripts/seo/pages.mjs) both build it from here, so search engines get
// exactly what visitors get.
import { GUIDES, type Guide, type GuideSection } from './guides';
import { HACIENDA_GUIDES, type HaciendaGuide, type HaciendaStep } from './hacienda';
import { VIDEOS, type VideoEntry } from './videos';
import { TOOL_PAGES } from '../../tools/domain/toolPages';

export { isGatedPath } from '../../../shared/utils/appLinks';

/**
 * The guides open to everybody, whole, with or without an account (experiment D3 of
 * docs/marketing/plan-crecimiento.md §1.1): the nine on procedures with search intent, four on
 * saving and the one on correcting a filed 130 or 303. They show the same to visitors and to search
 * engines; the account is only invited, softly, at the end. Calculators, drafts and everything that uses the user's data stay behind an account.
 */
export const OPEN_GUIDES: readonly string[] = [
  'como-hacer-la-renta-2025-paso-a-paso',
  'plazos-renta-2025',
  'modelo-303-casillas',
  'corregir-modelo-130-303',
  'alta-autonomo-paso-a-paso',
  'tarifa-plana-autonomos-2026',
  'verifactu-que-es',
  'ingreso-minimo-vital',
  'bono-social-electrico',
  'bono-alquiler-joven',
  'metodo-50-30-20',
  'como-ahorrar-el-20-por-ciento',
  'fondo-de-emergencia',
  'gastos-hormiga',
];

export const isOpenGuide = (slug: string | undefined): boolean =>
  slug !== undefined && OPEN_GUIDES.includes(slug);

/** Paragraphs of the first section (or step) that the teaser shows. */
export const PREVIEW_PARAGRAPHS = 2;

/** Heading of the official sources at the end of a guide, as the guide shows it. */
export const SOURCES_HEADING = 'Fuentes oficiales';

export interface GuideTeaser {
  /** The first section, cut to its first paragraphs. */
  preview: GuideSection;
  /** Headings of what follows, sources included. */
  outline: string[];
}

export function guideTeaser(guide: Guide): GuideTeaser {
  const [first, ...rest] = guide.sections;
  return {
    preview: { heading: first.heading, paragraphs: first.paragraphs.slice(0, PREVIEW_PARAGRAPHS) },
    outline: [...rest.map((s) => s.heading), ...(guide.sources ? [SOURCES_HEADING] : [])],
  };
}

export interface HaciendaTeaser {
  /** The first step: its title and its first paragraphs (keys `p1`, `p2`…). */
  preview: { step: HaciendaStep; paragraphs: number[] };
  /** The steps that follow (only their titles are shown). */
  outline: HaciendaStep[];
}

export function haciendaTeaser(guide: HaciendaGuide): HaciendaTeaser {
  const [first, ...rest] = guide.steps;
  return {
    preview: {
      step: first,
      paragraphs: Array.from(
        { length: Math.min(first.paragraphs, PREVIEW_PARAGRAPHS) },
        (_, i) => i + 1
      ),
    },
    outline: rest,
  };
}

/** Sign up, then come back to `path`. */
export const registerHref = (path: string): string =>
  `/login?mode=register&next=${encodeURIComponent(path)}`;

/** Sign in, then come back to `path`. */
export const loginHref = (path: string): string => `/login?next=${encodeURIComponent(path)}`;

/** The public video of the wall: «primeros pasos, registro, planes y tour guiado». */
export const WELCOME_VIDEO_NUMBER = 1;

export function welcomeVideo(videos: VideoEntry[] = VIDEOS): VideoEntry | undefined {
  const video = videos.find((v) => v.number === WELCOME_VIDEO_NUMBER);
  return video?.youtubeId && !video.premium ? video : undefined;
}

/** Whole minutes of a video, at least one. */
export const minutesOf = (video: VideoEntry): number =>
  Math.max(1, Math.round((video.durationSeconds ?? 60) / 60));

/** The benefits of an account, in order (texts `wall.benefit.<id>`). */
export const WALL_BENEFITS = ['guides', 'hacienda', 'tools', 'app', 'trial'] as const;

/** The numbers the benefits quote, counted from the catalogues so that they never go stale. */
export const wallNumbers = () => ({
  guides: GUIDES.length,
  hacienda: HACIENDA_GUIDES.length,
  tools: TOOL_PAGES.length,
});
