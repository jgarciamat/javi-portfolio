/**
 * Deterministic financial advice used when no AI provider is configured or the
 * provider fails. Amounts in the context are decimal (not cents) for readability.
 */
export interface AdviceContext {
  year: number;
  month: number;
  locale: 'es' | 'en';
  currency: string;
  totalIncome: number;
  totalExpenses: number;
  totalSaving: number;
  balance: number;
  savingsRate: number;
  /** Sum of the user's monthly category budgets (0 when none). */
  budgetAmount: number;
  expensesByCategory: Record<string, number>;
  savingByCategory: Record<string, number>;
  transactionCount: number;
  /** Totals of the previous period, for month-over-month comparisons. */
  previous?: { totalIncome: number; totalExpenses: number; totalSaving: number };
}

export interface Advice {
  summary: string;
  tips: string[];
  positives: string[];
  warnings: string[];
}

type Lists = { positives: string[]; tips: string[]; warnings: string[] };

class AdviceWriter {
  readonly isEn: boolean;
  private readonly money: Intl.NumberFormat;

  constructor(ctx: AdviceContext) {
    this.isEn = ctx.locale === 'en';
    this.money = new Intl.NumberFormat(this.isEn ? 'en-GB' : 'es-ES', {
      style: 'currency',
      currency: ctx.currency || 'EUR',
    });
  }

  fmt(n: number): string {
    return this.money.format(n);
  }

  pct(part: number, total: number): string {
    if (total === 0) return '0%';
    return ((part / total) * 100).toFixed(1) + '%';
  }

  t(es: string, en: string): string {
    return this.isEn ? en : es;
  }
}

function analyzeBalance(ctx: AdviceContext, w: AdviceWriter, l: Lists): void {
  const { balance, totalIncome, totalExpenses } = ctx;
  if (balance < 0) {
    l.warnings.push(
      w.t(
        `Balance negativo este mes: ${w.fmt(balance)}. Los gastos (${w.fmt(
          totalExpenses
        )}) superan los ingresos (${w.fmt(totalIncome)}) en ${w.fmt(Math.abs(balance))}.`,
        `Negative balance this month: ${w.fmt(balance)}. Expenses (${w.fmt(
          totalExpenses
        )}) exceed income (${w.fmt(totalIncome)}) by ${w.fmt(Math.abs(balance))}.`
      )
    );
  } else if (balance > 0 && totalIncome > 0) {
    const share = ((balance / totalIncome) * 100).toFixed(1);
    l.positives.push(
      w.t(
        `Balance positivo de ${w.fmt(
          balance
        )} (${share}% de tus ingresos). Gastas menos de lo que ingresas.`,
        `Positive balance of ${w.fmt(
          balance
        )} (${share}% of income). You are living below your means.`
      )
    );
  }
}

function analyzeSavings(ctx: AdviceContext, w: AdviceWriter, l: Lists): void {
  const { savingsRate, totalSaving, totalIncome } = ctx;
  const rate = savingsRate.toFixed(1);
  if (savingsRate >= 30) {
    l.positives.push(
      w.t(
        `Tasa de ahorro excepcional: ${rate}% (${w.fmt(
          totalSaving
        )}). Muy por encima del 20% recomendado.`,
        `Outstanding savings rate: ${rate}% (${w.fmt(
          totalSaving
        )}). You are well above the recommended 20%.`
      )
    );
  } else if (savingsRate >= 20) {
    l.positives.push(
      w.t(
        `Buena tasa de ahorro: ${rate}% (${w.fmt(totalSaving)}), por encima del objetivo del 20%.`,
        `Good savings rate: ${rate}% (${w.fmt(totalSaving)}), above the recommended 20% target.`
      )
    );
  } else if (savingsRate >= 10) {
    const gap = totalIncome * 0.2 - totalSaving;
    l.tips.push(
      w.t(
        `Tu tasa de ahorro es ${rate}% (${w.fmt(totalSaving)}). Ahorra ${w.fmt(
          gap
        )} más al mes para alcanzar el objetivo del 20%.`,
        `Your savings rate is ${rate}% (${w.fmt(totalSaving)}). Save ${w.fmt(
          gap
        )} more monthly to reach the 20% target.`
      )
    );
  } else if (savingsRate > 0) {
    l.warnings.push(
      w.t(
        `Tasa de ahorro baja: solo ${rate}% (${w.fmt(totalSaving)}). Apunta a al menos ${w.fmt(
          totalIncome * 0.2
        )} al mes (20%).`,
        `Low savings rate: only ${rate}% (${w.fmt(totalSaving)}). Aim for at least ${w.fmt(
          totalIncome * 0.2
        )} per month (20%).`
      )
    );
  } else if (totalIncome > 0) {
    l.warnings.push(
      w.t(
        `No hay ahorro registrado este mes. Intenta reservar al menos ${w.fmt(
          totalIncome * 0.1
        )} (10% de tus ingresos) como primer paso.`,
        `No savings recorded this month. Try setting aside at least ${w.fmt(
          totalIncome * 0.1
        )} (10% of income) as a first step.`
      )
    );
  }
}

function analyzeExpenseRatio(ctx: AdviceContext, w: AdviceWriter, l: Lists): void {
  if (ctx.totalIncome === 0) return;
  const ratio = (ctx.totalExpenses / ctx.totalIncome) * 100;
  if (ratio >= 90) {
    l.warnings.push(
      w.t(
        `Los gastos son el ${ratio.toFixed(1)}% de tus ingresos (${w.fmt(
          ctx.totalExpenses
        )} / ${w.fmt(ctx.totalIncome)}). Margen muy ajustado.`,
        `Expenses are ${ratio.toFixed(1)}% of income (${w.fmt(ctx.totalExpenses)} / ${w.fmt(
          ctx.totalIncome
        )}). Very little margin left.`
      )
    );
  } else if (ratio >= 75) {
    l.tips.push(
      w.t(
        `Los gastos consumen el ${ratio.toFixed(
          1
        )}% de tus ingresos. Reducir un 10% liberaría ${w.fmt(ctx.totalExpenses * 0.1)} al mes.`,
        `Expenses consume ${ratio.toFixed(1)}% of income. Reducing by 10% would free up ${w.fmt(
          ctx.totalExpenses * 0.1
        )} monthly.`
      )
    );
  }
}

function analyzeTopCategory(ctx: AdviceContext, w: AdviceWriter, l: Lists): void {
  const [top] = Object.entries(ctx.expensesByCategory).sort(([, a], [, b]) => b - a);
  if (!top || ctx.totalExpenses === 0) return;
  const [name, amount] = top;
  const share = (amount / ctx.totalExpenses) * 100;
  if (share > 50) {
    l.warnings.push(
      w.t(
        `"${name}" domina tus gastos con un ${share.toFixed(0)}% (${w.fmt(amount)} de ${w.fmt(
          ctx.totalExpenses
        )}). Diversificar reduciría el riesgo financiero.`,
        `"${name}" dominates your expenses at ${share.toFixed(0)}% (${w.fmt(amount)} of ${w.fmt(
          ctx.totalExpenses
        )}). Diversifying could reduce financial risk.`
      )
    );
  } else if (share > 35) {
    l.tips.push(
      w.t(
        `"${name}" representa el ${share.toFixed(0)}% del gasto (${w.fmt(
          amount
        )}). Revisa si puedes reducirlo.`,
        `"${name}" represents ${share.toFixed(0)}% of expenses (${w.fmt(
          amount
        )}). Check if there's room to reduce it.`
      )
    );
  }
}

function analyzeBudget(ctx: AdviceContext, w: AdviceWriter, l: Lists): void {
  if (ctx.budgetAmount <= 0) return;
  const diff = ctx.totalExpenses - ctx.budgetAmount;
  if (diff > 0) {
    l.warnings.push(
      w.t(
        `Presupuesto superado en ${w.fmt(diff)} (${w.pct(
          diff,
          ctx.budgetAmount
        )} por encima de tu límite de ${w.fmt(ctx.budgetAmount)}).`,
        `Budget exceeded by ${w.fmt(diff)} (${w.pct(diff, ctx.budgetAmount)} over your ${w.fmt(
          ctx.budgetAmount
        )} limit).`
      )
    );
  } else {
    const remaining = Math.abs(diff);
    l.positives.push(
      w.t(
        `¡Has respetado tu presupuesto! Te sobran ${w.fmt(remaining)} (${w.pct(
          remaining,
          ctx.budgetAmount
        )} de tu presupuesto de ${w.fmt(ctx.budgetAmount)}).`,
        `You stayed within your budget! ${w.fmt(remaining)} remaining (${w.pct(
          remaining,
          ctx.budgetAmount
        )} of your ${w.fmt(ctx.budgetAmount)} budget).`
      )
    );
  }
}

function analyzeSavingAllocation(ctx: AdviceContext, w: AdviceWriter, l: Lists): void {
  const entries = Object.entries(ctx.savingByCategory).sort(([, a], [, b]) => b - a);
  if (ctx.totalSaving <= 0) return;
  if (entries.length > 1) {
    const [name, amount] = entries[0];
    l.positives.push(
      w.t(
        `Tu ahorro está distribuido en ${
          entries.length
        } categorías. Principal: "${name}" con ${w.fmt(amount)}.`,
        `Your savings are distributed across ${
          entries.length
        } categories. Top: "${name}" with ${w.fmt(amount)}.`
      )
    );
  } else if (entries.length === 1) {
    l.tips.push(
      w.t(
        `Todo el ahorro (${w.fmt(ctx.totalSaving)}) va a "${
          entries[0][0]
        }". Considera diversificar: fondo de emergencia o inversión.`,
        `All ${w.fmt(ctx.totalSaving)} saved goes to "${
          entries[0][0]
        }". Consider diversifying into an emergency fund or investment.`
      )
    );
  }
}

function analyzeTracking(ctx: AdviceContext, w: AdviceWriter, l: Lists): void {
  if (ctx.transactionCount === 0) {
    l.tips.push(
      w.t(
        'Sin transacciones registradas. Empieza a registrar tus gastos diarios para obtener análisis precisos.',
        'No transactions recorded. Start logging daily expenses to unlock accurate financial analysis.'
      )
    );
  } else if (ctx.transactionCount >= 20) {
    l.positives.push(
      w.t(
        `${ctx.transactionCount} transacciones registradas este mes — excelente hábito de seguimiento financiero.`,
        `${ctx.transactionCount} transactions recorded this month — excellent financial tracking habit.`
      )
    );
  }
}

function buildSummary(ctx: AdviceContext, w: AdviceWriter): string {
  const { totalIncome, totalExpenses, totalSaving, balance, savingsRate } = ctx;
  const label = `${ctx.month}/${ctx.year}`;
  if (totalIncome === 0 && totalExpenses === 0) {
    return w.t(
      `Sin datos financieros para ${label}. Empieza a registrar ingresos y gastos para obtener consejos personalizados.`,
      `No financial data for ${label}. Start recording income and expenses to get personalized advice.`
    );
  }
  if (balance < 0) {
    return w.t(
      `${label}: gastos (${w.fmt(totalExpenses)}) superan ingresos (${w.fmt(
        totalIncome
      )}) en ${w.fmt(Math.abs(balance))}. Se requiere acción inmediata.`,
      `${label}: expenses (${w.fmt(totalExpenses)}) exceed income (${w.fmt(
        totalIncome
      )}) by ${w.fmt(Math.abs(balance))}. Immediate action needed.`
    );
  }
  return w.t(
    `${label}: ingresos ${w.fmt(totalIncome)}, gastos ${w.fmt(totalExpenses)}, ahorro ${w.fmt(
      totalSaving
    )} (tasa ${savingsRate.toFixed(1)}%). Balance neto: ${w.fmt(balance)}.`,
    `${label}: income ${w.fmt(totalIncome)}, expenses ${w.fmt(totalExpenses)}, saved ${w.fmt(
      totalSaving
    )} (${savingsRate.toFixed(1)}% savings rate). Net balance: ${w.fmt(balance)}.`
  );
}

export function generateRuleBasedAdvice(ctx: AdviceContext): Advice {
  const w = new AdviceWriter(ctx);
  const lists: Lists = { positives: [], tips: [], warnings: [] };
  analyzeBalance(ctx, w, lists);
  analyzeSavings(ctx, w, lists);
  analyzeExpenseRatio(ctx, w, lists);
  analyzeTopCategory(ctx, w, lists);
  analyzeBudget(ctx, w, lists);
  analyzeSavingAllocation(ctx, w, lists);
  analyzeTracking(ctx, w, lists);
  return { summary: buildSummary(ctx, w), ...lists };
}
