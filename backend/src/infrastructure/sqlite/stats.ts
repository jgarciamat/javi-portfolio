import { SqliteMetricsRepository } from './repositories/SqliteMetricsRepository';

const LABELS: Record<string, string> = {
  signup: 'Registros',
  email_verified: 'Emails verificados',
  checkout_started: 'Pagos iniciados',
  purchase: 'Compras confirmadas',
  ai_analysis: 'Análisis con IA',
  ai_question: 'Preguntas al asistente IA',
  import_done: 'Importaciones',
  referral_joined: 'Registros por invitación',
  household_joined: 'Hogares compartidos',
};

/** Text table of the anonymous counters for the last `days` days (today included). */
export function formatStats(
  repo: SqliteMetricsRepository,
  days: number,
  today = new Date()
): string {
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const rows = repo.totals(from, to);
  const lines = rows.map((r) => `${(LABELS[r.name] ?? r.name).padEnd(28)}${r.count}`);
  return [
    `Contadores anónimos · ${from} → ${to}`,
    ...(lines.length ? lines : ['(sin datos)']),
  ].join('\n');
}
