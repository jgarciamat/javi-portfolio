import { FunnelRow, SqliteFunnelRepository } from './repositories/SqliteFunnelRepository';

/** The funnel, in order. `chain` steps show the conversion from the previous chain step. */
const STEPS: { event: string; label: string; chain?: boolean }[] = [
  { event: 'visit', label: 'Visitas (cargas de la web)', chain: true },
  { event: 'guide_view', label: 'Vistas de guía' },
  { event: 'guide_cta_click', label: 'Clics en «Crear cuenta» (guías)' },
  { event: 'signup_view', label: 'Vistas de la página de registro', chain: true },
  { event: 'signup', label: 'Registros', chain: true },
  { event: 'trial_start', label: 'Pruebas de 14 días iniciadas' },
  { event: 'email_verified', label: 'Emails verificados' },
  { event: 'first_transaction', label: 'Primer movimiento', chain: true },
  { event: 'activation_step', label: 'Pasos de activación (suma)' },
  { event: 'activation_done', label: 'Primeros pasos completos', chain: true },
  { event: 'pricing_view', label: 'Vistas de precios' },
  { event: 'paywall_view', label: 'Vistas del aviso Premium' },
  { event: 'checkout_start', label: 'Pagos iniciados', chain: true },
  { event: 'premium', label: 'Compras confirmadas (Premium)', chain: true },
  { event: 'cancel', label: 'Bajas de Premium' },
];

const STEP_LABELS: Record<string, string> = {
  movements: '3 movimientos',
  budgets: '1 presupuesto',
  goals: '1 meta',
  automations: '1 automatización',
};

const percent = (part: number, whole: number): string =>
  whole > 0 ? `${((100 * part) / whole).toFixed(1)} %` : '—';

function sum(
  rows: FunnelRow[],
  event: string,
  where: (r: FunnelRow) => boolean = () => true
): number {
  return rows.filter((r) => r.event === event && where(r)).reduce((n, r) => n + r.count, 0);
}

function table(head: string[], body: (string | number)[][], first = 26, rest = 11): string[] {
  const line = (cells: (string | number)[]): string =>
    cells
      .map((cell, i) => (i === 0 ? String(cell).padEnd(first) : String(cell).padStart(rest)))
      .join('')
      .trimEnd();
  return [line(head), ...body.map(line)];
}

/** Values of a dimension, by how many visits (then sign-ups) they brought. */
function ranked(rows: FunnelRow[], key: (r: FunnelRow) => string, limit: number): string[] {
  const score = new Map<string, number>();
  for (const r of rows) {
    const weight = r.event === 'visit' ? 1 : r.event === 'signup' ? 1000 : 0;
    score.set(key(r), (score.get(key(r)) ?? 0) + weight * r.count);
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

/**
 * Text report of the anonymous funnel for the last `days` days (today included): totals with the
 * conversion between steps, by origin, by campaign, by guide and by day.
 */
export function formatFunnel(
  repo: SqliteFunnelRepository,
  days: number,
  today = new Date()
): string {
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const rows = repo.rows(from, to);
  const out = [`Embudo anónimo · ${from} → ${to}`];
  if (!rows.length) return [...out, '(sin datos)'].join('\n');

  let previous: number | null = null;
  const totals = STEPS.map((step) => {
    const total = sum(rows, step.event);
    const conversion = step.chain && previous !== null ? percent(total, previous) : '';
    if (step.chain) previous = total;
    return [step.label, total, conversion];
  });
  out.push('', ...table(['Paso', 'Total', '% paso'], totals, 34));

  const steps = Object.keys(STEP_LABELS).map((id) => [
    `  ${STEP_LABELS[id]}`,
    sum(rows, 'activation_step', (r) => r.detail === id),
  ]);
  out.push('', ...table(['Pasos de activación', 'Total'], steps, 34));

  const sources = ranked(rows, (r) => r.source, 20).map((source) => {
    const of = (event: string): number => sum(rows, event, (r) => r.source === source);
    return [
      source,
      of('visit'),
      of('guide_cta_click'),
      of('signup_view'),
      of('signup'),
      percent(of('signup'), of('visit')),
    ];
  });
  out.push(
    '',
    'Por origen (los pasos posteriores al registro no tienen origen: ver docs/analitica.md)',
    ...table(['Origen', 'Visitas', 'Clics CTA', 'Registro', 'Altas', 'Alta/visita'], sources)
  );

  const withCampaign = rows.filter((r) => r.campaign);
  if (withCampaign.length) {
    const campaigns = ranked(withCampaign, (r) => `${r.source} · ${r.campaign}`, 20).map((key) => {
      const of = (event: string): number =>
        sum(withCampaign, event, (r) => `${r.source} · ${r.campaign}` === key);
      return [key, of('visit'), of('signup'), percent(of('signup'), of('visit'))];
    });
    out.push(
      '',
      ...table(
        ['Campaña (origen · campaña/vídeo)', 'Visitas', 'Altas', 'Alta/visita'],
        campaigns,
        40
      )
    );
  }

  const guideRows = rows.filter((r) => r.event.startsWith('guide_') && r.detail);
  if (guideRows.length) {
    const guides = [...new Set(guideRows.map((r) => r.detail))].sort().map((guide) => {
      const views = sum(guideRows, 'guide_view', (r) => r.detail === guide);
      const clicks = sum(guideRows, 'guide_cta_click', (r) => r.detail === guide);
      return [guide, views, clicks, percent(clicks, views)];
    });
    out.push('', ...table(['Guía', 'Vistas', 'Clics', 'Clic/vista'], guides, 40));
  }

  const dayEvents = [
    'visit',
    'signup',
    'first_transaction',
    'activation_done',
    'premium',
    'cancel',
  ];
  const byDay = [...new Set(rows.map((r) => r.day))].map((day) => [
    day,
    ...dayEvents.map((event) => sum(rows, event, (r) => r.day === day)),
  ]);
  out.push(
    '',
    ...table(['Día', 'Visitas', 'Altas', '1.er mov.', 'Activados', 'Premium', 'Bajas'], byDay, 12)
  );
  return out.join('\n');
}
