import { AiUsage, CategorySuggester, FinancialAdvisor } from '@domain/ports/services';
import { QuestionFacts } from '@domain/services/question-facts';
import { Advice, AdviceContext } from '@domain/services/rule-based-advisor';
import {
  ADVICE_JSON_SCHEMA,
  ADVICE_SYSTEM_PROMPT,
  CATEGORIZATION_SYSTEM_PROMPT,
  QUESTION_SYSTEM_PROMPT,
  buildCategorizationPrompt,
  buildQuestionPrompt,
  buildPrompt,
  categorizationJsonSchema,
  parseAdvice,
  parseAnswer,
  parseCategorization,
} from './prompts';

export interface CloudflareAiOptions {
  accountId: string;
  apiToken: string;
  /** e.g. @cf/meta/llama-3.1-8b-instruct-fp8-fast */
  model: string;
  /** Constrained JSON output (only some models support it). */
  jsonMode: boolean;
  /** Neurons per million tokens, from Cloudflare's pricing page for `model`. */
  neuronsPerMInput: number;
  neuronsPerMOutput: number;
  timeoutMs?: number;
}

interface Message {
  role: 'system' | 'user';
  content: string;
}

interface RunResponse {
  success?: boolean;
  errors?: { message?: string }[];
  result?: {
    response?: unknown;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
}

/** Rough token count when the API does not report usage. */
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

/**
 * Cloudflare Workers AI over its REST API. Runs on Cloudflare's free daily
 * allocation of neurons; the caller keeps the total below it with the usage
 * returned by every call. Cloudflare does not train on customer data.
 */
export class CloudflareAi implements FinancialAdvisor, CategorySuggester {
  readonly name = 'cloudflare';

  constructor(private readonly options: CloudflareAiOptions) {}

  async getAdvice(context: AdviceContext): Promise<{ advice: Advice; usage: AiUsage }> {
    const { output, usage } = await this.run(
      [
        { role: 'system', content: ADVICE_SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(context) },
      ],
      700,
      ADVICE_JSON_SCHEMA
    );
    return { advice: parseAdvice(output), usage };
  }

  async answerQuestion(request: {
    question: string;
    locale: 'es' | 'en';
    facts: QuestionFacts;
  }): Promise<{ answer: string; usage: AiUsage }> {
    const { output, usage } = await this.run(
      [
        { role: 'system', content: QUESTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildQuestionPrompt(request.question, request.locale, request.facts),
        },
      ],
      400,
      null
    );
    return { answer: parseAnswer(output), usage };
  }

  async suggestCategories(
    descriptions: string[],
    categories: string[]
  ): Promise<{ suggestions: (string | null)[]; usage: AiUsage }> {
    if (descriptions.length === 0) return { suggestions: [], usage: { neurons: 0 } };
    const { output, usage } = await this.run(
      [
        { role: 'system', content: CATEGORIZATION_SYSTEM_PROMPT },
        { role: 'user', content: buildCategorizationPrompt(descriptions, categories) },
      ],
      Math.min(60 + descriptions.length * 12, 1500),
      categorizationJsonSchema(descriptions.length)
    );
    return {
      suggestions: parseCategorization(output, descriptions.length, categories),
      usage,
    };
  }

  private async run(
    messages: Message[],
    maxTokens: number,
    /** JSON schema for constrained output; null for a plain-text answer. */
    schema: object | null
  ): Promise<{ output: string | object; usage: AiUsage }> {
    const { accountId, apiToken, model, jsonMode, timeoutMs = 20_000 } = this.options;
    const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
      accountId
    )}/ai/run/${model}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
        ...(jsonMode && schema
          ? { response_format: { type: 'json_schema', json_schema: schema } }
          : {}),
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Cloudflare AI error ${response.status}: ${(await response.text()).slice(0, 300)}`
      );
    }
    const data = (await response.json()) as RunResponse;
    if (data.success === false) {
      throw new Error(
        `Cloudflare AI error: ${data.errors?.map((e) => e.message).join('; ') || 'unknown'}`
      );
    }
    const output = data.result?.response;
    if (output === undefined || output === null || output === '') {
      throw new Error('Cloudflare AI returned an empty answer');
    }
    const outputText = typeof output === 'string' ? output : JSON.stringify(output);
    const input = data.result?.usage?.prompt_tokens ?? estimateTokens(JSON.stringify(messages));
    const completion = data.result?.usage?.completion_tokens ?? estimateTokens(outputText);
    const neurons =
      (input * this.options.neuronsPerMInput + completion * this.options.neuronsPerMOutput) /
      1_000_000;
    return { output: output as string | object, usage: { neurons } };
  }
}
