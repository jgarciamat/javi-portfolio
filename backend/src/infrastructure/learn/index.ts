import type { CourseChapter } from '@domain/model/Course';
import { CHAPTERS_BONDS_TAXES } from './chaptersBondsTaxes';
import { CHAPTERS_CRYPTO_A } from './chaptersCrypto';
import { CHAPTERS_CRYPTO_B } from './chaptersCrypto2';
import { CHAPTERS_FUNDS } from './chaptersFunds';

/**
 * The Premium chapters of «Learn to invest» (from the third on). They are served by the API
 * instead of being shipped in the app, so their text only reaches Premium users.
 */
export const PREMIUM_CHAPTERS: CourseChapter[] = [
  ...CHAPTERS_FUNDS,
  ...CHAPTERS_BONDS_TAXES,
  ...CHAPTERS_CRYPTO_A,
  ...CHAPTERS_CRYPTO_B,
];
