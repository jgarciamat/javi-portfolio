import {
  CreatorProgram,
  CreatorReport,
  CreatorSaleStatus,
  normalizeCreatorCode,
} from '@application/creators/CreatorProgram';

/**
 * `npm run creators -- <command>`: the creator affiliate program from the command line
 * (docs/afiliacion/programa.md). Nothing here moves money: `paid` only records a transfer the
 * owner has already made by hand. No report shows who the users are.
 */
export const CREATORS_USAGE = [
  'Uso: creators <orden>',
  '  report [CÓDIGO]              informe (con CÓDIGO, el detalle de sus ventas)',
  '  add CÓDIGO "Alias" [topeEur] da de alta a un creador (tope anual propio opcional)',
  '  off CÓDIGO | on CÓDIGO       desactiva o reactiva un código',
  '  paid CÓDIGO                  apunta como pagado lo que hay que transferirle ahora',
  '  forget EMAIL                 retira la atribución de un usuario (retira su consentimiento)',
].join('\n');

const euros = (cents: number): string => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

const STATUS_LABELS: Record<CreatorSaleStatus, string> = {
  pending: 'en espera',
  payable: 'a pagar',
  paid: 'pagada',
  reversed: 'devuelta',
  clawback: 'devuelta tras pagar: a descontar',
  over_cap: 'sobre el tope',
};

const PLAN_LABELS = { monthly: 'mensual', yearly: 'anual', lifetime: 'vitalicio' } as const;

function row(cells: (string | number)[], first: number, rest: number): string {
  return cells
    .map((cell, i) => (i === 0 ? String(cell).padEnd(first) : String(cell).padStart(rest)))
    .join('')
    .trimEnd();
}

export function formatCreatorReport(report: CreatorReport, code?: string): string {
  const { config } = report;
  const out = [
    `Programa de creadores: ${report.enabled ? 'ACTIVADO' : 'APAGADO'} (CREATOR_PROGRAM)`,
    `Comisión: mensual ${euros(config.commissionCents.monthly)} · anual ${euros(
      config.commissionCents.yearly
    )} · vitalicio ${euros(config.commissionCents.lifetime)}`,
    `Ventana de atribución: ${config.windowDays} días desde el alta · espera antes de pagar: ${config.holdDays} días`,
    `Topes por año natural: ${euros(config.creatorCapCents)} por creador · ${euros(
      config.globalCapCents
    )} en total`,
  ];
  for (const [year, used] of Object.entries(report.globalUsedCents).sort()) {
    out.push(`  ${year}: ${euros(used)} del tope global comprometidos`);
  }
  if (!report.creators.length)
    return [...out, '', '(sin creadores: npm run creators -- add)'].join('\n');

  const creators = code
    ? report.creators.filter((c) => c.affiliate.code === normalizeCreatorCode(code))
    : report.creators;
  if (!creators.length) return [...out, '', `Código desconocido: ${code}`].join('\n');
  out.push(
    '',
    row(
      ['Código', 'Altas', 'Ventas', 'En espera', 'A pagar', 'Pagadas', 'Devueltas', 'Sobre tope'],
      14,
      12
    ),
    ...creators.map((c) =>
      row(
        [
          `${c.affiliate.code}${c.affiliate.active ? '' : ' (off)'}`,
          c.signups,
          c.sales,
          c.pending,
          c.payable,
          c.paid,
          c.reversed,
          c.overCap,
        ],
        14,
        12
      )
    ),
    '',
    row(['Código', 'En espera', 'A pagar', 'A descontar', 'Neto ahora', 'Ya pagado'], 14, 13),
    ...creators.map((c) =>
      row(
        [
          c.affiliate.code,
          euros(c.pendingCents),
          euros(c.payableCents),
          euros(c.clawbackCents),
          euros(c.netCents),
          euros(c.paidCents),
        ],
        14,
        13
      )
    )
  );
  if (code) {
    const [creator] = creators;
    out.push('', `Ventas de ${creator.affiliate.code} (${creator.affiliate.name}):`);
    if (!creator.lines.length) out.push('  (ninguna)');
    for (const line of creator.lines) {
      out.push(
        `  ${line.sale.soldAt.slice(0, 10)}  ${PLAN_LABELS[line.sale.plan].padEnd(9)} ${
          line.sale.provider === 'google' ? 'Play  ' : 'Stripe'
        }  ${euros(line.cents).padStart(9)}  ${STATUS_LABELS[line.status]}`
      );
    }
  }
  return out.join('\n');
}

export interface CreatorsCliDeps {
  program: CreatorProgram;
  /** Id of the account with this e-mail (for `forget`). */
  userIdByEmail: (email: string) => string | null;
}

/** Runs one command and returns the text to print; throws with a readable message on misuse. */
export function runCreatorsCommand(deps: CreatorsCliDeps, args: string[]): string {
  const [command = 'report', first, second, third] = args;
  const { program } = deps;
  switch (command) {
    case 'report':
      return formatCreatorReport(program.report(), first);
    case 'add': {
      if (!first || !second) throw new Error(CREATORS_USAGE);
      const cap = third === undefined ? null : Number(third.replace(',', '.'));
      if (cap !== null && !(cap >= 0)) throw new Error('El tope debe ser un número de euros');
      const added = program.addAffiliate(
        first,
        second,
        cap === null ? null : Math.round(cap * 100)
      );
      return `Alta: ${added.code} (${added.name}). Enlace: https://finanverso.app/?aff=${added.code}`;
    }
    case 'on':
    case 'off':
      if (!first) throw new Error(CREATORS_USAGE);
      program.setActive(first, command === 'on');
      return `${first.toUpperCase()}: ${command === 'on' ? 'activado' : 'desactivado'}`;
    case 'paid': {
      if (!first) throw new Error(CREATORS_USAGE);
      const cents = program.markPaid(first);
      return cents > 0
        ? `Apuntado como pagado: ${euros(cents)} a ${first.toUpperCase()}. Guarda su factura o recibo.`
        : `Nada que pagar ahora a ${first.toUpperCase()}.`;
    }
    case 'forget': {
      if (!first) throw new Error(CREATORS_USAGE);
      const userId = deps.userIdByEmail(first.trim().toLowerCase());
      if (!userId) return 'No hay ninguna cuenta con ese email.';
      program.forget(userId);
      return 'Atribución retirada (si había una venta, queda solo como registro anónimo).';
    }
    default:
      throw new Error(CREATORS_USAGE);
  }
}
