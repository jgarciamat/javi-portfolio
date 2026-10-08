import { AiUsage, FinancialAdvisor } from '@domain/ports/services';
import { Advice, AdviceContext } from '@domain/services/rule-based-advisor';
import { ADVICE_SYSTEM_PROMPT, buildPrompt, parseAdvice } from './prompts';

/**
 * Google Gemini. Only for a PAID API key: the free tier may not be used to serve
 * users in the EEA and lets Google use the prompts to improve its products.
 */
export class GeminiAdvisor implements FinancialAdvisor {
  readonly name = 'gemini';

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly timeoutMs = 20_000
  ) {}

  async getAdvice(context: AdviceContext): Promise<{ advice: Advice; usage: AiUsage }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      // The key goes in a header, not in the URL, so it never ends up in proxy/access logs.
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: ADVICE_SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: buildPrompt(context) }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Gemini API error ${response.status}: ${(await response.text()).slice(0, 300)}`
      );
    }
    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned an empty answer');
    // Billed on the Google account, not against the Cloudflare neuron budget.
    return { advice: parseAdvice(text), usage: { neurons: 0 } };
  }
}
