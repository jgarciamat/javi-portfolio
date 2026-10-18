import { GUIDES, type Guide } from '../../guides/domain/guides';

export interface ToolPage {
  path: string;
  /** Key of its texts: `tools.<key>.title / .description / .nav`. */
  key: string;
  /** Guides on the topic that do not link to the calculator themselves (by slug). */
  guides?: readonly string[];
  /** Number of visible questions: `tools.<key>.faq<n>.q / .a`, also published as FAQPage. */
  faq?: number;
}

/** The public calculators: route and the key of their texts. */
export const TOOL_PAGES: readonly ToolPage[] = [
  { path: '/calculadora-50-30-20', key: 'rule' },
  { path: '/simulador-ahorro', key: 'savings' },
  { path: '/calculadora-hipoteca', key: 'loan' },
  { path: '/calculadora-iva', key: 'vat' },
  { path: '/calculadora-inflacion', key: 'inflation' },
  { path: '/calculadora-objetivo-ahorro', key: 'goal' },
  { path: '/calculadora-renta', key: 'renta' },
  {
    path: '/calculadora-sueldo-neto',
    key: 'salary',
    guides: ['renta-a-pagar-o-a-devolver', 'como-leer-borrador-renta', 'metodo-50-30-20'],
    faq: 4,
  },
  {
    path: '/calculadora-cuota-autonomos',
    key: 'reta',
    guides: [
      'cuota-autonomos-2026-por-tramos',
      'gastos-deducibles-autonomo',
      'modelo-130-paso-a-paso',
      'fechas-modelos-trimestrales-autonomos-2026',
    ],
    faq: 4,
  },
];

export const toolPage = (path: string): ToolPage | undefined =>
  TOOL_PAGES.find((p) => p.path === path);

/** The guides of a calculator: those that link to it, then the ones it names itself. */
export function guidesOfTool(path: string, guides: Guide[] = GUIDES): Guide[] {
  const named = toolPage(path)?.guides ?? [];
  return guides
    .filter((g) => g.tool?.to === path)
    .concat(named.map((slug) => guides.find((g) => g.slug === slug)).filter((g): g is Guide => !!g))
    .filter((g, i, all) => all.indexOf(g) === i);
}

/** The numbers 1…n of the questions of a calculator. */
export const faqOf = (page: ToolPage | undefined): number[] =>
  Array.from({ length: page?.faq ?? 0 }, (_, i) => i + 1);
