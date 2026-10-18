import { GUIDES, type Guide } from './guides';
import { VIDEOS, type VideoEntry } from './videos';

/**
 * The links between the guides, the calculators and the videos, so each page leads to the others
 * on the same topic. Videos by number (see `videos.ts`). Only public videos count: a Premium one is
 * unlisted on YouTube and its id is not in the public bundle.
 */
const GUIDE_VIDEOS: Record<string, number> = {
  'metodo-50-30-20': 15,
  'como-ahorrar-el-20-por-ciento': 15,
  'como-hacer-un-presupuesto-mensual': 15,
  'gastos-hormiga': 15,
  'presupuesto-en-pareja': 15,
  'suscripciones-que-no-usas': 7,
  'fondo-de-emergencia': 16,
  'interes-compuesto': 16,
  'como-salir-de-deudas': 16,
  'como-calcular-la-cuota-de-una-hipoteca': 16,
  'como-ahorrar-para-un-viaje': 5,
  'iva-para-autonomos-modelo-303': 22,
  'modelo-130-paso-a-paso': 23,
  'cuota-autonomos-2026-por-tramos': 12,
  'gastos-deducibles-autonomo': 12,
  'fechas-modelos-trimestrales-autonomos-2026': 12,
  'deduccion-maternidad-modelo-140': 38,
  'familia-numerosa-deduccion-modelo-143': 38,
  'deducciones-renta-castilla-y-leon': 32,
  'deducciones-renta-comunitat-valenciana': 32,
  'deduccion-alquiler-vivienda-habitual-renta': 32,
  'como-leer-borrador-renta': 14,
  'renta-a-pagar-o-a-devolver': 34,
  'como-hacer-la-renta-2025-paso-a-paso': 13,
  'plazos-renta-2025': 34,
  'modelo-303-casillas': 22,
  'alta-autonomo-paso-a-paso': 25,
  'tarifa-plana-autonomos-2026': 12,
  'verifactu-que-es': 30,
  'ingreso-minimo-vital': 48,
  'bono-social-electrico': 47,
  'bono-alquiler-joven': 46,
};

/** Our public video on the topic of a guide, if there is one. */
export function guideVideo(slug: string, videos: VideoEntry[] = VIDEOS): VideoEntry | undefined {
  const number = GUIDE_VIDEOS[slug];
  return videos.find((v) => v.number === number && Boolean(v.youtubeId) && !v.premium);
}

/** The guides that lead to a calculator (`/calculadora-iva`…). */
export const guidesForTool = (path: string, guides: Guide[] = GUIDES): Guide[] =>
  guides.filter((g) => g.tool?.to === path);
