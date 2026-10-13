/** Google Play listing of the Android app. */
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.jgarciamat.moneymanager';

export const FAQ = ['free', 'safe', 'bank', 'mobile', 'cancel', 'who'] as const;

/** FAQ in the format search engines show as rich results. */
export function faqJsonLd(t: (key: string) => string): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((id) => ({
      '@type': 'Question',
      name: t(`landing.faq.${id}.q`),
      acceptedAnswer: { '@type': 'Answer', text: t(`landing.faq.${id}.a`) },
    })),
  });
}
