import type { AIAdvice } from '@core/api/premiumApi';

export interface AIAdvisorProps {
    year: number;
    month: number;
}

export interface AIAdviceContentProps {
    advice: AIAdvice | null;
    error: string | null;
    t: (k: string) => string;
}

/**
 * Builds the cooldown remaining-time text, e.g. "Podrás volver a analizar en 2 días y 3 horas".
 * Pure function — no side-effects.
 */
export function buildCooldownText(
    key: string,
    daysUntilNextAnalysis: number,
    hoursUntilNextAnalysis: number,
    t: (k: string) => string,
): string {
    const d = daysUntilNextAnalysis;
    const h = hoursUntilNextAnalysis;
    let timeStr: string;
    if (d > 0 && h > 0) {
        timeStr = t('app.ai.cooldown.daysHours')
            .replace('{days}', String(d))
            .replace('{dayPlural}', d !== 1 ? 's' : '')
            .replace('{hours}', String(h))
            .replace('{hourPlural}', h !== 1 ? 's' : '');
    } else if (d > 0) {
        timeStr = t('app.ai.cooldown.daysOnly')
            .replace('{days}', String(d))
            .replace('{dayPlural}', d !== 1 ? 's' : '');
    } else {
        timeStr = t('app.ai.cooldown.hoursOnly')
            .replace('{hours}', String(h))
            .replace('{hourPlural}', h !== 1 ? 's' : '');
    }
    return t(key).replace('{time}', timeStr);
}
