// Who is behind an e-mail address, for the invitation program: two spellings of the same inbox
// (`a.b+x@gmail.com` and `ab@gmail.com`) are one person, and throwaway inboxes earn no reward.
// Nothing here is stored: it is computed from the address of the account when it is needed.

/** Providers that ignore the dots of the name part: `a.b@gmail.com` is `ab@gmail.com`. */
const DOTLESS = new Set(['gmail.com', 'googlemail.com']);
/** Other names of the same provider. */
const ALIASES: Record<string, string> = { 'googlemail.com': 'gmail.com' };

/**
 * The inbox an address delivers to: lower case, without the `+tag` that most providers ignore,
 * and without the dots Gmail ignores. Null for something that is not an address.
 */
export function canonicalInbox(email: string | null | undefined): string | null {
  const address = email?.trim().toLowerCase() ?? '';
  const at = address.lastIndexOf('@');
  if (at <= 0 || at === address.length - 1) return null;
  const domain = address.slice(at + 1);
  let name = address.slice(0, at).split('+')[0];
  if (DOTLESS.has(domain)) name = name.replace(/\./g, '');
  return name ? `${name}@${ALIASES[domain] ?? domain}` : null;
}

/**
 * Throwaway inbox services (an inbox anyone can read, or one that expires in minutes). Our own
 * list, kept short and to the best known; it can grow with the public domain list
 * github.com/disposable-email-domains/disposable-email-domains (CC0) if abuse shows up.
 * Alias services that forward to a real inbox (Proton, iCloud, SimpleLogin…) are not here.
 */
export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '1secmail.com',
  '1secmail.net',
  '1secmail.org',
  '20minutemail.com',
  'burnermail.io',
  'byom.de',
  'cool.fr.nf',
  'discard.email',
  'dispostable.com',
  'dropmail.me',
  'einrot.com',
  'emailfake.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'grr.la',
  'guerrillamail.biz',
  'guerrillamail.com',
  'guerrillamail.de',
  'guerrillamail.info',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'harakirimail.com',
  'inboxkitten.com',
  'jetable.org',
  'mail.tm',
  'mailcatch.com',
  'maildrop.cc',
  'mailforspam.com',
  'mailinator.com',
  'mailinator.net',
  'mailnesia.com',
  'mailpoof.com',
  'mailsac.com',
  'mintemail.com',
  'minuteinbox.com',
  'moakt.com',
  'mohmal.com',
  'mytemp.email',
  'nada.email',
  'pokemail.net',
  'sharklasers.com',
  'spam4.me',
  'spambox.us',
  'spamgourmet.com',
  'temp-mail.io',
  'temp-mail.org',
  'tempail.com',
  'tempmail.com',
  'tempmail.net',
  'tempmailo.com',
  'tempr.email',
  'throwawaymail.com',
  'tmpmail.net',
  'tmpmail.org',
  'trash-mail.com',
  'trashmail.com',
  'trashmail.de',
  'trashmail.net',
  'wegwerfmail.de',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
]);

/** The address is on a throwaway service (or a subdomain of one). */
export function isDisposableEmail(email: string | null | undefined): boolean {
  const inbox = canonicalInbox(email);
  if (!inbox) return false;
  const parts = inbox.slice(inbox.lastIndexOf('@') + 1).split('.');
  return parts.some((_, i) => DISPOSABLE_EMAIL_DOMAINS.has(parts.slice(i).join('.')));
}
