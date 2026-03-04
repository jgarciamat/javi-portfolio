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
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            // Fallback: rule-based advice when no API key is configured
            return this.generateRuleBasedAdvice(context);
        }

        const prompt = this.buildPrompt(context);

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content:
                                'Eres un asesor financiero personal experto. Analiza los datos financieros del usuario y proporciona consejos personalizados, concisos y accionables en español. Responde SOLO con JSON válido.',
                        },
                        { role: 'user', content: prompt },
                    ],
                    max_tokens: 600,
                    temperature: 0.7,
                    response_format: { type: 'json_object' },
                }),
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = (await response.json()) as {
                choices: { message: { content: string } }[];
            };
            const content = data.choices[0]?.message?.content ?? '{}';
            return JSON.parse(content) as AIAdvice;
        } catch {
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

        return `Analiza la siguiente situación financiera del mes ${ctx.month}/${ctx.year}:
- Ingresos totales: ${ctx.totalIncome.toFixed(2)}€
- Gastos totales: ${ctx.totalExpenses.toFixed(2)}€
- Balance: ${ctx.balance.toFixed(2)}€
- Tasa de ahorro: ${ctx.savingsRate.toFixed(1)}%
- Presupuesto mensual: ${ctx.budgetAmount > 0 ? ctx.budgetAmount.toFixed(2) + '€' : 'no definido'}
- Principales categorías de gasto: ${topCategories || 'ninguno'}
- Número de transacciones: ${ctx.transactions.length}

Responde con un JSON con esta estructura exacta:
{
  "summary": "resumen breve de la situación financiera en 1-2 frases",
  "tips": ["consejo accionable 1", "consejo accionable 2", "consejo accionable 3"],
  "positives": ["punto positivo 1", "punto positivo 2"],
  "warnings": ["advertencia 1 si aplica"]
}`;
    }

    private generateRuleBasedAdvice(ctx: FinancialContext): AIAdvice {
        const tips: string[] = [];
        const positives: string[] = [];
        const warnings: string[] = [];

        if (ctx.savingsRate >= 20) {
            positives.push(`Excelente tasa de ahorro del ${ctx.savingsRate.toFixed(1)}%. Estás por encima del objetivo recomendado del 20%.`);
        } else if (ctx.savingsRate > 0) {
            tips.push(`Intenta aumentar tu tasa de ahorro al 20%. Actualmente estás en ${ctx.savingsRate.toFixed(1)}%.`);
        }

        if (ctx.balance < 0) {
            warnings.push(`Tu balance mensual es negativo (${ctx.balance.toFixed(2)}€). Revisa tus gastos.`);
        }

        const topCategory = Object.entries(ctx.expensesByCategory).sort(([, a], [, b]) => b - a)[0];
        if (topCategory && ctx.totalExpenses > 0) {
            const pct = ((topCategory[1] / ctx.totalExpenses) * 100).toFixed(0);
            if (parseInt(pct) > 40) {
                tips.push(`La categoría "${topCategory[0]}" representa el ${pct}% de tus gastos. Considera si puedes reducirla.`);
            }
        }

        if (ctx.budgetAmount > 0 && ctx.totalExpenses > ctx.budgetAmount) {
            warnings.push(`Has superado tu presupuesto mensual en ${(ctx.totalExpenses - ctx.budgetAmount).toFixed(2)}€.`);
        }

        if (ctx.transactions.length === 0) {
            tips.push('Empieza a registrar tus gastos diariamente para obtener análisis más precisos.');
        } else if (ctx.transactions.length > 0) {
            positives.push(`Has registrado ${ctx.transactions.length} transacciones este mes. ¡Buen seguimiento!`);
        }

        tips.push('Revisa tus suscripciones periódicamente para eliminar las que no uses.');

        const summary =
            ctx.balance >= 0
                ? `Este mes has ahorrado ${ctx.balance.toFixed(2)}€ con una tasa de ahorro del ${ctx.savingsRate.toFixed(1)}%.`
                : `Este mes tus gastos superan tus ingresos en ${Math.abs(ctx.balance).toFixed(2)}€.`;

        return { summary, tips, positives, warnings };
    }
}
