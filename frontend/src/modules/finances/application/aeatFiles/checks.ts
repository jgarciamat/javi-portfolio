/** The checks made before writing a file: an error stops it, a warning is shown next to it. */
export interface Check {
  level: 'error' | 'warn';
  code: string;
  values?: Record<string, string | number>;
}

export const error = (code: string, values?: Check['values']): Check => ({
  level: 'error',
  code,
  values,
});
export const warn = (code: string, values?: Check['values']): Check => ({
  level: 'warn',
  code,
  values,
});
export const blank = (text: string): boolean => text.trim() === '';

/** The person the AEAT can call (349, 190, 180, 347): a phone of 9 digits and a name. */
export function contactChecks(d: { phone: string; contact: string }): Check[] {
  const checks: Check[] = [];
  if (!/^\d{9}$/.test(d.phone.replace(/\s/g, ''))) checks.push(error('phone'));
  if (blank(d.contact)) checks.push(error('contactMissing'));
  return checks;
}
