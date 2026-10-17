import { storage } from '@shared/utils/storage';

const OPEN_KEY = 'mm_hacienda_open';

/** Asks the «Hacienda paso a paso» section to open this guide the next time it is shown. */
export const requestHaciendaGuide = (slug: string): void => storage.set(OPEN_KEY, slug);

/** The guide another section asked to open, if any. */
export const requestedHaciendaGuide = (): string | null => storage.get(OPEN_KEY);

export const clearHaciendaRequest = (): void => storage.set(OPEN_KEY, null);

const CHECKS_KEY = 'mm_hacienda_checks';

/** The ticked items of the checklists, kept on this device for each account. */
export const loadChecks = (userId: string | undefined): Record<string, true> =>
  storage.getJSON<Record<string, true>>(`${CHECKS_KEY}:${userId ?? 'guest'}`, {});

export const saveChecks = (userId: string | undefined, checks: Record<string, true>): void =>
  storage.setJSON(`${CHECKS_KEY}:${userId ?? 'guest'}`, checks);
