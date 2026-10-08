import { z } from 'zod';
import { Advice, AdviceContext } from '@domain/services/rule-based-advisor';

const MAX_ITEMS = 5;
const MAX_ITEM_LENGTH = 500;

const items = z
  .array(z.unknown())
  .default([])
  .transform((list) =>
    list
      .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
      .slice(0, MAX_ITEMS)
      .map((x) => x.trim().slice(0, MAX_ITEM_LENGTH))
  );

const adviceSchema = z.object({
  summary: z
    .string()
    .trim()
    .min(1)
    .transform((s) => s.slice(0, 1000)),
  tips: items,
  positives: items,
  warnings: items,
});

/** JSON schema used by providers that support constrained output. */
export const ADVICE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    positives: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
    tips: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'positives', 'warnings', 'tips'],
} as const;

export const ADVICE_SYSTEM_PROMPT =
  'You are a prudent personal-finance coach inside a budgeting app. ' +
  'Base every statement on the figures you are given. ' +
  'Never recommend specific financial products, banks, brokers, insurers, funds, ' +
  'securities, cryptocurrencies or companies, and never promise returns. ' +
  'Answer with JSON only.';

/** Only aggregated figures are sent: no descriptions, notes or personal data. */
export function buildPrompt(ctx: AdviceContext): string {
  const money = (n: number): string => `${n.toFixed(2)} ${ctx.currency}`;
  const top = (record: Record<string, number>, n: number): string =>
    Object.entries(record)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .map(([cat, amt]) => `${cat}: ${money(amt)}`)
      .join(', ');
  const expenseRatio =
    ctx.totalIncome > 0 ? ((ctx.totalExpenses / ctx.totalIncome) * 100).toFixed(1) : 'N/A';
  const budget =
    ctx.budgetAmount > 0
      ? ` | Budget: ${money(ctx.budgetAmount)} (${
          ctx.totalExpenses > ctx.budgetAmount
            ? `exceeded by ${money(ctx.totalExpenses - ctx.budgetAmount)}`
            : `${money(ctx.budgetAmount - ctx.totalExpenses)} remaining`
        })`
      : '';
  const previous = ctx.previous
    ? `\n- Previous month: income ${money(ctx.previous.totalIncome)}, expenses ${money(
        ctx.previous.totalExpenses
      )}, saving ${money(ctx.previous.totalSaving)}`
    : '';
  const language = ctx.locale === 'en' ? 'English' : 'Spanish (Spain)';

  return `Analyse the personal finances for ${ctx.month}/${ctx.year} and answer in ${language}.
Respond ONLY with JSON: {"summary": string, "positives": string[], "warnings": string[], "tips": string[]}.

KEY METRICS:
- Income: ${money(ctx.totalIncome)} | Expenses: ${money(
    ctx.totalExpenses
  )} (${expenseRatio}% of income) | Saving: ${money(ctx.totalSaving)} | Net balance: ${money(
    ctx.balance
  )}${budget}
- Savings rate: ${ctx.savingsRate.toFixed(1)}% | Number of movements: ${ctx.transactionCount}
- Top expense categories: ${top(ctx.expensesByCategory, 5) || 'none'}
- Saving categories: ${top(ctx.savingByCategory, 3) || 'none'}${previous}

INSTRUCTIONS:
- Use the exact figures above (amounts and percentages).
- summary: 1-2 sentences with the overall picture using real numbers.
- positives: specific achievements with numbers.
- warnings: concrete risks with amounts.
- tips: actionable habits with specific targets (no product or brand names).
- Max 3 items per array. No generic phrases.`;
}

/** Takes the first JSON object of the answer (models sometimes wrap it in prose or fences). */
export function extractJson(raw: string): unknown {
  const text = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
}

export function parseAdvice(raw: string | object): Advice {
  return adviceSchema.parse(typeof raw === 'string' ? extractJson(raw) : raw);
}

// ─── Import categorisation ───────────────────────────────────────────────────

/** Long digit runs (IBANs, cards, references) are not needed to pick a category. */
export function redactDescription(description: string): string {
  return description
    .replace(/\d{4,}/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export const CATEGORIZATION_SYSTEM_PROMPT =
  'You classify bank movements of a personal budgeting app. Answer with JSON only.';

export function buildCategorizationPrompt(descriptions: string[], categories: string[]): string {
  const list = descriptions.map((d, i) => `${i + 1}. ${redactDescription(d)}`).join('\n');
  return `Categories: ${JSON.stringify(categories)}

For each bank movement below choose the single best category from the list, or null if none fits.
Respond ONLY with JSON: {"categories": [...]} with exactly ${
    descriptions.length
  } items, in the same order.

Movements:
${list}`;
}

export function categorizationJsonSchema(count: number): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      categories: {
        type: 'array',
        items: { type: ['string', 'null'] },
        minItems: count,
        maxItems: count,
      },
    },
    required: ['categories'],
  };
}

/** Maps the answer back to the known category names; anything else becomes null. */
export function parseCategorization(
  raw: string | object,
  count: number,
  categories: string[]
): (string | null)[] {
  const data = (typeof raw === 'string' ? extractJson(raw) : raw) as { categories?: unknown };
  const answers = Array.isArray(data?.categories) ? data.categories : [];
  const known = new Map(categories.map((c) => [c.trim().toLowerCase(), c]));
  return Array.from({ length: count }, (_, i) => {
    const value = answers[i];
    return typeof value === 'string' ? known.get(value.trim().toLowerCase()) ?? null : null;
  });
}
