export interface TransactionContext {
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
}

export interface FinancialContext {
    year: number;
    month: number;
    locale: string;
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    savingsRate: number;
    budgetAmount: number;
    expensesByCategory: Record<string, number>;
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
        const topCategories = Object.entries(ctx.expensesByCategory)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([cat, amt]) => `${cat}: ${amt.toFixed(2)}€`)
            .join(', ');

        const isEn = ctx.locale === 'en';

        if (isEn) {
            return `You are a personal financial advisor. Analyse the data for month ${ctx.month}/${ctx.year} and respond ONLY with valid JSON (no markdown, no extra text).

DATA:
- Income: ${ctx.totalIncome.toFixed(2)}€ | Expenses: ${ctx.totalExpenses.toFixed(2)}€ | Balance: ${ctx.balance.toFixed(2)}€
- Savings rate: ${ctx.savingsRate.toFixed(1)}% | Transactions: ${ctx.transactions.length}
- Top expense categories: ${topCategories || 'none'}

Response JSON (max 2 items per array, short sentences):
{"summary":"...","positives":["..."],"warnings":["..."],"tips":["...","..."]}`;
        }

        return `Eres un asesor financiero personal. Analiza los datos del mes ${ctx.month}/${ctx.year} y responde ÚNICAMENTE con JSON válido (sin markdown, sin texto adicional).

DATOS:
- Ingresos: ${ctx.totalIncome.toFixed(2)}€ | Gastos: ${ctx.totalExpenses.toFixed(2)}€ | Balance: ${ctx.balance.toFixed(2)}€
- Tasa de ahorro: ${ctx.savingsRate.toFixed(1)}% | Transacciones: ${ctx.transactions.length}
- Top gastos por categoría: ${topCategories || 'ninguno'}

JSON de respuesta (máximo 2 items por array, frases cortas):
{"summary":"...","positives":["..."],"warnings":["..."],"tips":["...","..."]}`;
    }

    private generateRuleBasedAdvice(ctx: FinancialContext): AIAdvice {
        const isEn = ctx.locale === 'en';
        const tips: string[] = [];
        const positives: string[] = [];
        const warnings: string[] = [];

        if (ctx.savingsRate >= 20) {
            positives.push(
                isEn
                    ? `Excellent savings rate of ${ctx.savingsRate.toFixed(1)}%. You are above the recommended 20% target.`
                    : `Excelente tasa de ahorro del ${ctx.savingsRate.toFixed(1)}%. Estás por encima del objetivo recomendado del 20%.`
            );
        } else if (ctx.savingsRate > 0) {
            tips.push(
                isEn
                    ? `Try to increase your savings rate to 20%. Currently at ${ctx.savingsRate.toFixed(1)}%.`
                    : `Intenta aumentar tu tasa de ahorro al 20%. Actualmente estás en ${ctx.savingsRate.toFixed(1)}%.`
            );
        }

        if (ctx.balance < 0) {
            warnings.push(
                isEn
                    ? `Your monthly balance is negative (${ctx.balance.toFixed(2)}€). Review your expenses.`
                    : `Tu balance mensual es negativo (${ctx.balance.toFixed(2)}€). Revisa tus gastos.`
            );
        }

        const topCategory = Object.entries(ctx.expensesByCategory).sort(([, a], [, b]) => b - a)[0];
        if (topCategory && ctx.totalExpenses > 0) {
            const pct = ((topCategory[1] / ctx.totalExpenses) * 100).toFixed(0);
            if (parseInt(pct) > 40) {
                tips.push(
                    isEn
                        ? `The "${topCategory[0]}" category accounts for ${pct}% of your expenses. Consider reducing it.`
                        : `La categoría "${topCategory[0]}" representa el ${pct}% de tus gastos. Considera si puedes reducirla.`
                );
            }
        }

        if (ctx.budgetAmount > 0 && ctx.totalExpenses > ctx.budgetAmount) {
            warnings.push(
                isEn
                    ? `You have exceeded your monthly budget by ${(ctx.totalExpenses - ctx.budgetAmount).toFixed(2)}€.`
                    : `Has superado tu presupuesto mensual en ${(ctx.totalExpenses - ctx.budgetAmount).toFixed(2)}€.`
            );
        }

        if (ctx.transactions.length === 0) {
            tips.push(
                isEn
                    ? 'Start recording your daily expenses to get more accurate analysis.'
                    : 'Empieza a registrar tus gastos diariamente para obtener análisis más precisos.'
            );
        } else {
            positives.push(
                isEn
                    ? `You have recorded ${ctx.transactions.length} transactions this month. Great tracking!`
                    : `Has registrado ${ctx.transactions.length} transacciones este mes. ¡Buen seguimiento!`
            );
        }

        tips.push(
            isEn
                ? 'Review your subscriptions periodically to cancel unused ones.'
                : 'Revisa tus suscripciones periódicamente para eliminar las que no uses.'
        );

        const summary = ctx.balance >= 0
            ? (isEn
                ? `This month you saved ${ctx.balance.toFixed(2)}€ with a savings rate of ${ctx.savingsRate.toFixed(1)}%.`
                : `Este mes has ahorrado ${ctx.balance.toFixed(2)}€ con una tasa de ahorro del ${ctx.savingsRate.toFixed(1)}%.`)
            : (isEn
                ? `This month your expenses exceed your income by ${Math.abs(ctx.balance).toFixed(2)}€.`
                : `Este mes tus gastos superan tus ingresos en ${Math.abs(ctx.balance).toFixed(2)}€.`);

        return { summary, tips, positives, warnings };
    }
}
