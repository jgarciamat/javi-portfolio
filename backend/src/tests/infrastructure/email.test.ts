import { ConsoleEmailSender, ResendEmailSender } from '@infrastructure/mail/EmailSenders';

const send = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send } })),
}));

describe('ResendEmailSender', () => {
  const sender = new ResendEmailSender('re_key', 'Finanverso <hi@x.test>', 'https://app.test');

  beforeEach(() => send.mockReset().mockResolvedValue({ error: null }));

  it('sends localised links with the token encoded', async () => {
    await sender.sendVerification('a@b.c', 'Ana', 'a b', 'es');
    await sender.sendPasswordReset('a@b.c', 'Ana', 't/1', 'en');
    expect(send.mock.calls[0][0]).toMatchObject({ from: 'Finanverso <hi@x.test>', to: 'a@b.c' });
    expect(send.mock.calls[0][0].html).toContain('https://app.test/verify-email?token=a%20b');
    expect(send.mock.calls[1][0].text).toContain('https://app.test/reset-password?token=t%2F1');
  });

  it('tells the owner of an existing account how to sign in or reset the password', async () => {
    await sender.sendAccountExists('a@b.c', 'Ana', 'es');
    const mail = send.mock.calls[0][0];
    expect(mail).toMatchObject({ to: 'a@b.c', subject: 'Ya tienes una cuenta en Finanverso' });
    expect(mail.html).toContain('href="https://app.test/login"');
    expect(mail.text).toContain('https://app.test/login?mode=forgot');
  });

  it('confirms purchases with a link to the terms', async () => {
    await sender.sendPurchaseConfirmation('a@b.c', 'Ana', 'es');
    expect(send.mock.calls[0][0]).toMatchObject({ to: 'a@b.c' });
    expect(send.mock.calls[0][0].text).toContain('https://app.test/terms');
  });

  it('sends the weekly digest with a link back to the app', async () => {
    const digest = {
      from: '2026-03-02',
      to: '2026-03-08',
      spentCents: 1000,
      previousSpentCents: 0,
      changePct: null,
      incomeCents: 0,
      topCategories: [],
      upcoming: null,
    };
    await sender.sendWeeklyDigest('a@b.c', 'Ana', 'es', digest, 'EUR');
    expect(send.mock.calls[0][0]).toMatchObject({ to: 'a@b.c' });
    expect(send.mock.calls[0][0].text).toContain('https://app.test');
  });

  it.each([
    ['two_factor_enabled', 'es', 'Finanverso: Verificación en dos pasos activada'],
    ['two_factor_disabled', 'en', 'Finanverso: Two-step verification turned off'],
    ['recovery_codes_regenerated', 'es', 'Finanverso: Nuevos códigos de recuperación'],
    ['recovery_code_used', 'en', 'Finanverso: A recovery code was used'],
  ] as const)('sends the %s security notice in %s', async (notice, locale, subject) => {
    await sender.sendSecurityNotice('a@b.c', '<Ana>', notice, locale);
    const mail = send.mock.calls[0][0];
    expect(mail).toMatchObject({ to: 'a@b.c', subject });
    expect(mail.html).toContain('&lt;Ana&gt;');
    expect(mail.html).toContain('href="https://app.test"');
    expect(mail.text).toContain('https://app.test');
  });

  it("fails with the provider's error", async () => {
    send.mockResolvedValue({ error: { message: 'domain not verified' } });
    await expect(sender.sendVerification('a@b.c', 'Ana', 't', 'es')).rejects.toThrow(
      'domain not verified'
    );
  });
});

describe('ConsoleEmailSender', () => {
  it('records the messages and prints the links unless silent', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const sender = new ConsoleEmailSender('http://localhost:5176');
    await sender.sendVerification('a@b.c', 'Ana', 'v1');
    await sender.sendPasswordReset('a@b.c', 'Ana', 'r1');
    await sender.sendPurchaseConfirmation('a@b.c');
    await sender.sendAccountExists('a@b.c');
    const digest = {
      from: 'a',
      to: 'b',
      spentCents: 0,
      previousSpentCents: 0,
      changePct: null,
      incomeCents: 0,
      topCategories: [],
      upcoming: null,
    };
    await sender.sendWeeklyDigest('a@b.c', 'Ana', 'es', digest);
    await sender.sendSecurityNotice('a@b.c', 'Ana', 'two_factor_enabled');
    expect(sender.sent).toEqual([
      { kind: 'verify', to: 'a@b.c', token: 'v1' },
      { kind: 'reset', to: 'a@b.c', token: 'r1' },
      { kind: 'purchase', to: 'a@b.c', token: '' },
      { kind: 'exists', to: 'a@b.c', token: '' },
      { kind: 'digest', to: 'a@b.c', token: '', digest },
      { kind: 'security', to: 'a@b.c', token: '', notice: 'two_factor_enabled' },
    ]);
    expect(info).toHaveBeenCalledWith('[email] security notice two_factor_enabled a@b.c');
    expect(info).toHaveBeenCalledWith('[email] weekly digest a@b.c');
    expect(info).toHaveBeenCalledWith('[email] purchase confirmation a@b.c');
    expect(info).toHaveBeenCalledWith('[email] account already exists a@b.c');
    expect(info).toHaveBeenCalledWith(
      '[email] verify a@b.c: http://localhost:5176/verify-email?token=v1'
    );
    expect(info).toHaveBeenCalledWith(
      '[email] reset a@b.c: http://localhost:5176/reset-password?token=r1'
    );
    info.mockRestore();
  });
});
