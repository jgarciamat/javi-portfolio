export interface TransactionContext {
    description: string;
    amount: number;
    type: 'income' | 'expense' | 'saving';
    category: string;
    date: string;
}

export interface FinancialContext {
    year: number;
    month: number;
    locale: string;
    totalIncome: number;
    totalExpenses: number;
    totalSaving: number;
    balance: number;
    savingsRate: number;
    budgetAmount: number;
    expensesByCategory: Record<string, number>;
    savingByCategory: Record<string, number>;
    transactions: TransactionContext[];
}

export interface AIAdvice {
    summary: string;
    tips: string[];
    positives: string[];
    warnings: string[];
}

export class GetAIAdvice {
    async execute(context: FinancialContext): Promise<AIAdvice> {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            // Fallback: rule-based advice when no API key is configured
            return this.generateRuleBasedAdvice(context);
        }

        const prompt = this.buildPrompt(context);

        try {
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    },
                }),
            });

            if (!response.ok) {
                const errBody = await response.text();
                throw new Error(`Gemini API error ${response.status}: ${errBody}`);
            }

            const data = (await response.json()) as {
                candidates: { content: { parts: { text: string }[] } }[];
            };
            let text = data.candidates[0]?.content?.parts[0]?.text ?? '{}';
            // Strip markdown code fences if present (```json ... ```)
            text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
            return JSON.parse(text) as AIAdvice;
        } catch (err) {
            console.error('[GetAIAdvice] Gemini call failed, using rule-based fallback:', err);
            // Graceful degradation
            return this.generateRuleBasedAdvice(context);
        }
    }

    private buildPrompt(ctx: FinancialContext): string {
        const topExpenses = Object.entries(ctx.expensesByCategory)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([cat, amt]) => `${cat}: ${amt.toFixed(2)}€`)
            .join(', ');

        const topSavings = Object.entries(ctx.savingByCategory)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([cat, amt]) => `${cat}: ${amt.toFixed(2)}€`)
            .join(', ');

        const budgetLine = ctx.budgetAmount > 0
            ? ` | Budget: ${ctx.budgetAmount.toFixed(2)}€ (${ctx.totalExpenses > ctx.budgetAmount ? `exceeded by ${(ctx.totalExpenses - ctx.budgetAmount).toFixed(2)}€` : `${(ctx.budgetAmount - ctx.totalExpenses).toFixed(2)}€ remaining`})`
            : '';

        const expenseRatio = ctx.totalIncome > 0 ? ((ctx.totalExpenses / ctx.totalIncome) * 100).toFixed(1) : 'N/A';
        const isEn = ctx.locale === 'en';

        if (isEn) {
            return `You are a personal financial advisor. Analyse the data for ${ctx.month}/${ctx.year} and respond ONLY with valid JSON (no markdown, no extra text).

KEY METRICS:
- Income: ${ctx.totalIncome.toFixed(2)}€ | Expenses: ${ctx.totalExpenses.toFixed(2)}€ (${expenseRatio}% of income) | Saving: ${ctx.totalSaving.toFixed(2)}€ | Net balance: ${ctx.balance.toFixed(2)}€${budgetLine}
- Savings rate: ${ctx.savingsRate.toFixed(1)}% | Total transactions: ${ctx.transactions.length}
- Top expense categories: ${topExpenses || 'none'}
- Saving categories: ${topSavings || 'none'}

INSTRUCTIONS:
- Use exact figures from the data (amounts in €, percentages).
- summary: 1-2 sentences with the overall financial picture using real numbers.
- positives: specific achievements with numbers (e.g. "You saved 350€, 17.5% of your income").
- warnings: concrete risks with amounts (e.g. "Leisure takes 45% of expenses: 450€").
- tips: actionable advice with specific targets (e.g. "Move 50€/month to an emergency fund to reach 3 months of expenses in 18 months").
- Max 3 items per array. No generic phrases.

{"summary":"...","positives":["..."],"warnings":["..."],"tips":["...","..."]}`;
        }

        return `Eres un asesor financiero personal. Analiza los datos de ${ctx.month}/${ctx.year} y responde ÚNICAMENTE con JSON válido (sin markdown, sin texto adicional).

MÉTRICAS CLAVE:
- Ingresos: ${ctx.totalIncome.toFixed(2)}€ | Gastos: ${ctx.totalExpenses.toFixed(2)}€ (${expenseRatio}% de ingresos) | Ahorro: ${ctx.totalSaving.toFixed(2)}€ | Balance neto: ${ctx.balance.toFixed(2)}€${budgetLine}
- Tasa de ahorro: ${ctx.savingsRate.toFixed(1)}% | Total transacciones: ${ctx.transactions.length}
- Top gastos por categoría: ${topExpenses || 'ninguno'}
- Categorías de ahorro: ${topSavings || 'ninguno'}

INSTRUCCIONES:
- Usa las cifras exactas del contexto (importes en €, porcentajes reales).
- summary: 1-2 frases con la situación financiera global usando números reales.
- positives: logros concretos con cifras (ej: "Ahorraste 350€, un 17,5% de tus ingresos").
- warnings: riesgos concretos con importes (ej: "Ocio ocupa el 45% del gasto: 450€").
- tips: consejos accionables con metas específicas (ej: "Destina 50€/mes a fondo de emergencia para cubrir 3 meses en 18 meses").
- Máximo 3 items por array. Sin frases genéricas.

{"summary":"...","positives":["..."],"warnings":["..."],"tips":["...","..."]}`;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private fmt(n: number): string {
        return n.toFixed(2) + '€';
    }

    private pct(part: number, total: number): string {
        if (total === 0) return '0%';
        return ((part / total) * 100).toFixed(1) + '%';
    }

    private analyzeSavings(ctx: FinancialContext, isEn: boolean, positives: string[], tips: string[], warnings: string[]): void {
        const { savingsRate, totalSaving, totalIncome } = ctx;
        if (savingsRate >= 30) {
            positives.push(
                isEn
                    ? `Outstanding savings rate: ${savingsRate.toFixed(1)}% (${this.fmt(totalSaving)}). You are well above the recommended 20%.`
                    : `Tasa de ahorro excepcional: ${savingsRate.toFixed(1)}% (${this.fmt(totalSaving)}). Muy por encima del 20% recomendado.`
            );
        } else if (savingsRate >= 20) {
            positives.push(
                isEn
                    ? `Good savings rate: ${savingsRate.toFixed(1)}% (${this.fmt(totalSaving)}), above the recommended 20% target.`
                    : `Buena tasa de ahorro: ${savingsRate.toFixed(1)}% (${this.fmt(totalSaving)}), por encima del objetivo del 20%.`
            );
        } else if (savingsRate >= 10) {
            const gap = totalIncome * 0.2 - totalSaving;
            tips.push(
                isEn
                    ? `Your savings rate is ${savingsRate.toFixed(1)}% (${this.fmt(totalSaving)}). Save ${this.fmt(gap)} more monthly to reach the 20% target.`
                    : `Tu tasa de ahorro es ${savingsRate.toFixed(1)}% (${this.fmt(totalSaving)}). Ahorra ${this.fmt(gap)} más al mes para alcanzar el objetivo del 20%.`
            );
        } else if (savingsRate > 0) {
            const target = totalIncome * 0.2;
            warnings.push(
                isEn
                    ? `Low savings rate: only ${savingsRate.toFixed(1)}% (${this.fmt(totalSaving)}). Aim for at least ${this.fmt(target)} per month (20%).`
                    : `Tasa de ahorro baja: solo ${savingsRate.toFixed(1)}% (${this.fmt(totalSaving)}). Apunta a al menos ${this.fmt(target)} al mes (20%).`
            );
        } else if (totalIncome > 0) {
            const target = totalIncome * 0.1;
            warnings.push(
                isEn
                    ? `No savings recorded this month. Try setting aside at least ${this.fmt(target)} (10% of income) as a first step.`
                    : `No hay ahorro registrado este mes. Intenta reservar al menos ${this.fmt(target)} (10% de tus ingresos) como primer paso.`
            );
        }
    }

    private analyzeBalance(ctx: FinancialContext, isEn: boolean, positives: string[], warnings: string[]): void {
        const { balance, totalIncome, totalExpenses } = ctx;
        if (balance < 0) {
            warnings.push(
                isEn
                    ? `Negative balance this month: ${this.fmt(balance)}. Expenses (${this.fmt(totalExpenses)}) exceed income (${this.fmt(totalIncome)}) by ${this.fmt(Math.abs(balance))}.`
                    : `Balance negativo este mes: ${this.fmt(balance)}. Los gastos (${this.fmt(totalExpenses)}) superan los ingresos (${this.fmt(totalIncome)}) en ${this.fmt(Math.abs(balance))}.`
            );
        } else if (balance > 0 && totalIncome > 0) {
            const balancePct = ((balance / totalIncome) * 100).toFixed(1);
            positives.push(
                isEn
                    ? `Positive balance of ${this.fmt(balance)} (${balancePct}% of income). You are living below your means.`
                    : `Balance positivo de ${this.fmt(balance)} (${balancePct}% de tus ingresos). Gastas menos de lo que ingresas.`
            );
        }
    }

    private analyzeTopCategory(ctx: FinancialContext, isEn: boolean, tips: string[], warnings: string[]): void {
        const sorted = Object.entries(ctx.expensesByCategory).sort(([, a], [, b]) => b - a);
        const topCat = sorted[0];
        if (!topCat || ctx.totalExpenses === 0) return;
        const [name, amount] = topCat;
        const pctNum = (amount / ctx.totalExpenses) * 100;
        if (pctNum > 50) {
            warnings.push(
                isEn
                    ? `"${name}" dominates your expenses at ${pctNum.toFixed(0)}% (${this.fmt(amount)} of ${this.fmt(ctx.totalExpenses)}). Diversifying could reduce financial risk.`
                    : `"${name}" domina tus gastos con un ${pctNum.toFixed(0)}% (${this.fmt(amount)} de ${this.fmt(ctx.totalExpenses)}). Diversificar reduciría el riesgo financiero.`
            );
        } else if (pctNum > 35) {
            tips.push(
                isEn
                    ? `"${name}" represents ${pctNum.toFixed(0)}% of expenses (${this.fmt(amount)}). Check if there's room to reduce it.`
                    : `"${name}" representa el ${pctNum.toFixed(0)}% del gasto (${this.fmt(amount)}). Revisa si puedes reducirlo.`
            );
        }
    }

    private analyzeBudget(ctx: FinancialContext, isEn: boolean, positives: string[], warnings: string[]): void {
        if (ctx.budgetAmount <= 0) return;
        const diff = ctx.totalExpenses - ctx.budgetAmount;
        if (diff > 0) {
            warnings.push(
                isEn
                    ? `Budget exceeded by ${this.fmt(diff)} (${this.pct(diff, ctx.budgetAmount)} over your ${this.fmt(ctx.budgetAmount)} limit).`
                    : `Presupuesto superado en ${this.fmt(diff)} (${this.pct(diff, ctx.budgetAmount)} por encima de tu límite de ${this.fmt(ctx.budgetAmount)}).`
            );
        } else {
            const remaining = Math.abs(diff);
            positives.push(
                isEn
                    ? `You stayed within your budget! ${this.fmt(remaining)} remaining (${this.pct(remaining, ctx.budgetAmount)} of your ${this.fmt(ctx.budgetAmount)} budget).`
                    : `¡Has respetado tu presupuesto! Te sobran ${this.fmt(remaining)} (${this.pct(remaining, ctx.budgetAmount)} de tu presupuesto de ${this.fmt(ctx.budgetAmount)}).`
            );
        }
    }

    private analyzeSavingAllocation(ctx: FinancialContext, isEn: boolean, positives: string[], tips: string[]): void {
        const entries = Object.entries(ctx.savingByCategory).sort(([, a], [, b]) => b - a);
        if (ctx.totalSaving <= 0) return;
        if (entries.length > 1) {
            const topSaving = entries[0];
            positives.push(
                isEn
                    ? `Your savings are distributed across ${entries.length} categories. Top: "${topSaving[0]}" with ${this.fmt(topSaving[1])}.`
                    : `Tu ahorro está distribuido en ${entries.length} categorías. Principal: "${topSaving[0]}" con ${this.fmt(topSaving[1])}.`
            );
        } else if (entries.length === 1) {
            tips.push(
                isEn
                    ? `All ${this.fmt(ctx.totalSaving)} saved goes to "${entries[0][0]}". Consider diversifying into an emergency fund or investment.`
                    : `Todo el ahorro (${this.fmt(ctx.totalSaving)}) va a "${entries[0][0]}". Considera diversificar: fondo de emergencia o inversión.`
            );
        }
    }

    private analyzeExpenseRatio(ctx: FinancialContext, isEn: boolean, tips: string[], warnings: string[]): void {
        if (ctx.totalIncome === 0) return;
        const ratio = (ctx.totalExpenses / ctx.totalIncome) * 100;
        if (ratio >= 90) {
            warnings.push(
                isEn
                    ? `Expenses are ${ratio.toFixed(1)}% of income (${this.fmt(ctx.totalExpenses)} / ${this.fmt(ctx.totalIncome)}). Very little margin left.`
                    : `Los gastos son el ${ratio.toFixed(1)}% de tus ingresos (${this.fmt(ctx.totalExpenses)} / ${this.fmt(ctx.totalIncome)}). Margen muy ajustado.`
            );
        } else if (ratio >= 75) {
            tips.push(
                isEn
                    ? `Expenses consume ${ratio.toFixed(1)}% of income. Reducing by 10% would free up ${this.fmt(ctx.totalExpenses * 0.1)} monthly.`
                    : `Los gastos consumen el ${ratio.toFixed(1)}% de tus ingresos. Reducir un 10% liberaría ${this.fmt(ctx.totalExpenses * 0.1)} al mes.`
            );
        }
    }

    private analyzeTransactions(ctx: FinancialContext, isEn: boolean, positives: string[], tips: string[]): void {
        if (ctx.transactions.length === 0) {
            tips.push(
                isEn
                    ? 'No transactions recorded. Start logging daily expenses to unlock accurate financial analysis.'
                    : 'Sin transacciones registradas. Empieza a registrar tus gastos diarios para obtener análisis precisos.'
            );
        } else if (ctx.transactions.length >= 20) {
            positives.push(
                isEn
                    ? `${ctx.transactions.length} transactions recorded this month — excellent financial tracking habit.`
                    : `${ctx.transactions.length} transacciones registradas este mes — excelente hábito de seguimiento financiero.`
            );
        }
    }

    private buildSummary(ctx: FinancialContext, isEn: boolean): string {
        const { totalIncome, totalExpenses, totalSaving, balance, savingsRate } = ctx;
        if (ctx.totalIncome === 0 && ctx.totalExpenses === 0) {
            return isEn
                ? `No financial data for ${ctx.month}/${ctx.year}. Start recording income and expenses to get personalized advice.`
                : `Sin datos financieros para ${ctx.month}/${ctx.year}. Empieza a registrar ingresos y gastos para obtener consejos personalizados.`;
        }
        if (balance < 0) {
            return isEn
                ? `${ctx.month}/${ctx.year}: expenses (${this.fmt(totalExpenses)}) exceed income (${this.fmt(totalIncome)}) by ${this.fmt(Math.abs(balance))}. Immediate action needed.`
                : `${ctx.month}/${ctx.year}: gastos (${this.fmt(totalExpenses)}) superan ingresos (${this.fmt(totalIncome)}) en ${this.fmt(Math.abs(balance))}. Se requiere acción inmediata.`;
        }
        return isEn
            ? `${ctx.month}/${ctx.year}: income ${this.fmt(totalIncome)}, expenses ${this.fmt(totalExpenses)}, saved ${this.fmt(totalSaving)} (${savingsRate.toFixed(1)}% savings rate). Net balance: ${this.fmt(balance)}.`
            : `${ctx.month}/${ctx.year}: ingresos ${this.fmt(totalIncome)}, gastos ${this.fmt(totalExpenses)}, ahorro ${this.fmt(totalSaving)} (tasa ${savingsRate.toFixed(1)}%). Balance neto: ${this.fmt(balance)}.`;
    }

    private generateRuleBasedAdvice(ctx: FinancialContext): AIAdvice {
        const isEn = ctx.locale === 'en';
        const tips: string[] = [];
        const positives: string[] = [];
        const warnings: string[] = [];

        this.analyzeBalance(ctx, isEn, positives, warnings);
        this.analyzeSavings(ctx, isEn, positives, tips, warnings);
        this.analyzeExpenseRatio(ctx, isEn, tips, warnings);
        this.analyzeTopCategory(ctx, isEn, tips, warnings);
        this.analyzeBudget(ctx, isEn, positives, warnings);
        this.analyzeSavingAllocation(ctx, isEn, positives, tips);
        this.analyzeTransactions(ctx, isEn, positives, tips);

        const summary = this.buildSummary(ctx, isEn);
        return { summary, tips, positives, warnings };
    }
}
