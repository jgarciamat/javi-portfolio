import { Resend } from 'resend';
import { EmailLocale, EmailSender, SecurityNotice } from '@domain/ports/services';
import { DigestData } from '@domain/services/digest';
import {
  accountExistsEmail,
  passwordResetEmail,
  purchaseEmail,
  securityNoticeEmail,
  verificationEmail,
  weeklyDigestEmail,
} from './templates';

export class ResendEmailSender implements EmailSender {
  private readonly resend: Resend;

  constructor(apiKey: string, private readonly from: string, private readonly appUrl: string) {
    this.resend = new Resend(apiKey);
  }

  private async send(
    to: string,
    content: { subject: string; html: string; text: string }
  ): Promise<void> {
    const { error } = await this.resend.emails.send({ from: this.from, to, ...content });
    if (error) throw new Error(`Error al enviar email: ${error.message}`);
  }

  sendVerification(to: string, name: string, token: string, locale: EmailLocale): Promise<void> {
    const url = `${this.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    return this.send(to, verificationEmail(locale, name, url));
  }

  sendPasswordReset(to: string, name: string, token: string, locale: EmailLocale): Promise<void> {
    const url = `${this.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    return this.send(to, passwordResetEmail(locale, name, url));
  }

  sendAccountExists(to: string, name: string, locale: EmailLocale): Promise<void> {
    const login = `${this.appUrl}/login`;
    return this.send(to, accountExistsEmail(locale, name, login, `${login}?mode=forgot`));
  }

  sendPurchaseConfirmation(to: string, name: string, locale: EmailLocale): Promise<void> {
    return this.send(to, purchaseEmail(locale, name, `${this.appUrl}/terms`, new Date()));
  }

  sendSecurityNotice(
    to: string,
    name: string,
    notice: SecurityNotice,
    locale: EmailLocale
  ): Promise<void> {
    return this.send(to, securityNoticeEmail(locale, name, notice, this.appUrl));
  }

  sendWeeklyDigest(
    to: string,
    name: string,
    locale: EmailLocale,
    digest: DigestData,
    currency: string
  ): Promise<void> {
    return this.send(to, weeklyDigestEmail(locale, name, digest, currency, this.appUrl));
  }
}

/** Used when no e-mail provider is configured (local development): prints the links. */
export class ConsoleEmailSender implements EmailSender {
  readonly sent: {
    kind: 'verify' | 'reset' | 'exists' | 'purchase' | 'digest' | 'security';
    to: string;
    token: string;
    digest?: DigestData;
    notice?: SecurityNotice;
  }[] = [];

  constructor(private readonly appUrl: string, private readonly silent = false) {}

  async sendVerification(to: string, _name: string, token: string): Promise<void> {
    this.sent.push({ kind: 'verify', to, token });
    if (!this.silent)
      console.info(`[email] verify ${to}: ${this.appUrl}/verify-email?token=${token}`);
  }

  async sendPasswordReset(to: string, _name: string, token: string): Promise<void> {
    this.sent.push({ kind: 'reset', to, token });
    if (!this.silent)
      console.info(`[email] reset ${to}: ${this.appUrl}/reset-password?token=${token}`);
  }

  async sendAccountExists(to: string): Promise<void> {
    this.sent.push({ kind: 'exists', to, token: '' });
    if (!this.silent) console.info(`[email] account already exists ${to}`);
  }

  async sendPurchaseConfirmation(to: string): Promise<void> {
    this.sent.push({ kind: 'purchase', to, token: '' });
    if (!this.silent) console.info(`[email] purchase confirmation ${to}`);
  }

  async sendSecurityNotice(to: string, _name: string, notice: SecurityNotice): Promise<void> {
    this.sent.push({ kind: 'security', to, token: '', notice });
    if (!this.silent) console.info(`[email] security notice ${notice} ${to}`);
  }

  async sendWeeklyDigest(
    to: string,
    _name: string,
    _locale: EmailLocale,
    digest: DigestData
  ): Promise<void> {
    this.sent.push({ kind: 'digest', to, token: '', digest });
    if (!this.silent) console.info(`[email] weekly digest ${to}`);
  }
}
