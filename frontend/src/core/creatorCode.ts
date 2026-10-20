/**
 * Creator affiliate links (`/?aff=CODE`, docs/afiliacion). Unlike invitations from friends,
 * nothing is stored on the device: the code of the landing is held in memory for this page
 * load only, and it is sent with the sign-up only when the person ticks the box that says a
 * creator recommended the app (and agrees to be counted for them).
 */

/** Letters and digits, 3 to 20 (the server checks it again). */
const CODE_PATTERN = /^[A-Z0-9]{3,20}$/;

let landingCode: string | null = null;
let consented = false;

/** Reads the code of the landing URL (before the router drops the query string). */
export function captureCreatorCode(search: string = window.location.search): void {
  const code = new URLSearchParams(search).get('aff')?.trim().toUpperCase() ?? '';
  landingCode = CODE_PATTERN.test(code) ? code : null;
  consented = false;
}

/** The creator code this visit came with, if any. */
export function landingCreatorCode(): string | null {
  return landingCode;
}

/** The box at sign-up: ticked, the code goes with the sign-up; unticked, nothing does. */
export function setCreatorConsent(value: boolean): void {
  consented = value;
}

/** What to send with the sign-up: only a code the person explicitly agreed to. */
export function creatorAttribution(): { code: string; consent: true } | undefined {
  return landingCode && consented ? { code: landingCode, consent: true } : undefined;
}

/** After signing up the code has been used (or refused): forget it. */
export function clearCreatorCode(): void {
  landingCode = null;
  consented = false;
}
