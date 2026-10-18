import type { Guide } from './guides';

/** The topics the guides are grouped under, with the colour and emoji that identify each one. */
export interface GuideCategory {
  id: string;
  emoji: string;
  label: string;
  blurb: string;
  color: string;
  slugs: string[];
}

export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    id: 'ahorro',
    emoji: '🐷',
    label: 'Presupuesto y ahorro',
    blurb: 'Ordena tu dinero y ahorra cada mes sin sufrir.',
    color: '#10b981',
    slugs: [
      'metodo-50-30-20',
      'como-ahorrar-el-20-por-ciento',
      'como-hacer-un-presupuesto-mensual',
      'gastos-hormiga',
      'suscripciones-que-no-usas',
      'presupuesto-en-pareja',
      'como-ahorrar-para-un-viaje',
    ],
  },
  {
    id: 'colchon',
    emoji: '🛟',
    label: 'Colchón, deudas y vivienda',
    blurb: 'Protégete de imprevistos, sal de deudas y entiende tu hipoteca.',
    color: '#f59e0b',
    slugs: [
      'fondo-de-emergencia',
      'como-salir-de-deudas',
      'como-calcular-la-cuota-de-una-hipoteca',
    ],
  },
  {
    id: 'inversion',
    emoji: '📈',
    label: 'Inversión e independencia',
    blurb: 'Haz crecer tu dinero y entiende el efecto del tiempo y la inflación.',
    color: '#6366f1',
    slugs: ['interes-compuesto', 'inflacion-y-ahorro', 'independencia-financiera-regla-del-4'],
  },
  {
    id: 'autonomos',
    emoji: '💼',
    label: 'Autónomos',
    blurb: 'IVA, modelo 130, cuota y gastos deducibles, sin sustos con Hacienda.',
    color: '#ec4899',
    slugs: [
      'iva-para-autonomos-modelo-303',
      'modelo-130-paso-a-paso',
      'cuota-autonomos-2026-por-tramos',
      'gastos-deducibles-autonomo',
      'fechas-modelos-trimestrales-autonomos-2026',
      'modelo-303-casillas',
      'alta-autonomo-paso-a-paso',
      'tarifa-plana-autonomos-2026',
      'verifactu-que-es',
    ],
  },
  {
    id: 'renta',
    emoji: '🧾',
    label: 'Declaración de la Renta',
    blurb: 'Deducciones, borrador y comunidades autónomas para pagar lo justo.',
    color: '#0ea5e9',
    slugs: [
      'como-hacer-la-renta-2025-paso-a-paso',
      'plazos-renta-2025',
      'como-leer-borrador-renta',
      'renta-a-pagar-o-a-devolver',
      'deduccion-maternidad-modelo-140',
      'familia-numerosa-deduccion-modelo-143',
      'deduccion-alquiler-vivienda-habitual-renta',
      'planes-de-pensiones-limite-renta',
      'deducciones-renta-castilla-y-leon',
      'deducciones-renta-comunitat-valenciana',
    ],
  },
  {
    id: 'ayudas',
    emoji: '🏠',
    label: 'Ayudas y vivienda',
    blurb: 'Ingreso Mínimo Vital, bono social eléctrico y ayudas al alquiler.',
    color: '#14b8a6',
    slugs: ['ingreso-minimo-vital', 'bono-social-electrico', 'bono-alquiler-joven'],
  },
];

const OTHER: GuideCategory = {
  id: 'otras',
  emoji: '📚',
  label: 'Otras guías',
  blurb: '',
  color: '#64748b',
  slugs: [],
};

export const categoryOf = (slug: string): GuideCategory =>
  GUIDE_CATEGORIES.find((c) => c.slugs.includes(slug)) ?? OTHER;

/** Minutes to read a guide, at about 200 words a minute. */
export function readingMinutes(guide: Guide): number {
  const text = [guide.intro, ...guide.sections.flatMap((s) => [s.heading, ...s.paragraphs])];
  const words = text.join(' ').split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
