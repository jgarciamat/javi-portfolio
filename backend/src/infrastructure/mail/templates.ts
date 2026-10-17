import { EmailLocale } from '@domain/ports/services';
import { DigestData } from '@domain/services/digest';

/** Escapes text before putting it into HTML (user names are user-controlled). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Names are also stripped of URL-like text so they cannot be used as phishing links in clients that autolink. */
function safeName(name: string): string {
  return escapeHtml(
    name
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/www\.\S+/gi, '')
      .slice(0, 80)
      .trim()
  );
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

interface Copy {
  subject: string;
  greeting: (name: string) => string;
  intro: string;
  button: string;
  copyLink: string;
  expires: string;
  ignore: string;
}

const COPY: Record<'verify' | 'reset', Record<EmailLocale, Copy>> = {
  verify: {
    es: {
      subject: 'Verifica tu cuenta en Finanverso',
      greeting: (n) => `Hola ${n},`,
      intro: 'Gracias por registrarte. Para activar tu cuenta, pulsa el botón:',
      button: 'Verificar mi cuenta',
      copyLink: 'O copia este enlace en tu navegador:',
      expires: 'El enlace caduca en 24 horas.',
      ignore: 'Si no te has registrado, puedes ignorar este email.',
    },
    en: {
      subject: 'Verify your Finanverso account',
      greeting: (n) => `Hi ${n},`,
      intro: 'Thanks for signing up. To activate your account, press the button:',
      button: 'Verify my account',
      copyLink: 'Or copy this link into your browser:',
      expires: 'The link expires in 24 hours.',
      ignore: "If you didn't sign up, you can ignore this email.",
    },
  },
  reset: {
    es: {
      subject: 'Restablece tu contraseña de Finanverso',
      greeting: (n) => `Hola ${n},`,
      intro: 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.',
      button: 'Restablecer contraseña',
      copyLink: 'O copia este enlace en tu navegador:',
      expires: 'El enlace caduca en 1 hora.',
      ignore: 'Si no has solicitado este cambio, ignora este email. Tu contraseña no cambiará.',
    },
    en: {
      subject: 'Reset your Finanverso password',
      greeting: (n) => `Hi ${n},`,
      intro: 'We received a request to reset the password of your account.',
      button: 'Reset password',
      copyLink: 'Or copy this link into your browser:',
      expires: 'The link expires in 1 hour.',
      ignore: "If you didn't request this, ignore this email. Your password won't change.",
    },
  },
};

/** Shared HTML frame of every e-mail. */
function layout(locale: EmailLocale, body: string): string {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: system-ui, sans-serif; background: #f4f4f5; margin: 0; padding: 0; }
    .wrapper { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .header { background: #6366f1; padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .body { padding: 32px 40px; color: #374151; line-height: 1.6; }
    .body p { margin: 0 0 16px; }
    .btn { display: inline-block; background: #6366f1; color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 8px 0; }
    .footer { padding: 20px 40px; background: #f9fafb; color: #9ca3af; font-size: 13px; text-align: center; }
    .url { word-break: break-all; color: #6366f1; font-size: 13px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>Finanverso</h1></div>
    <div class="body">
${body}
    </div>
    <div class="footer">© ${new Date().getFullYear()} Finanverso</div>
  </div>
</body>
</html>`;
}

/** The name as plain text (for the text part of the e-mail). */
const plainName = (name: string): string =>
  name
    .replace(/https?:\/\/\S+/gi, '')
    .slice(0, 80)
    .trim();

function render(
  kind: 'verify' | 'reset',
  locale: EmailLocale,
  name: string,
  url: string
): EmailContent {
  const c = COPY[kind][locale];
  const htmlUrl = escapeHtml(url);
  const html = layout(
    locale,
    `      <p>${c.greeting(`<strong>${safeName(name)}</strong>`)}</p>
      <p>${c.intro}</p>
      <p style="text-align:center"><a class="btn" href="${htmlUrl}">${c.button}</a></p>
      <p>${c.copyLink}</p>
      <p class="url">${htmlUrl}</p>
      <p>${c.expires}</p>
      <p>${c.ignore}</p>`
  );
  const text = `${c.greeting(plainName(name))}\n\n${c.intro}\n${url}\n\n${c.expires}\n${c.ignore}`;
  return { subject: c.subject, html, text };
}

const PURCHASE_COPY: Record<
  EmailLocale,
  {
    subject: string;
    greeting: (name: string) => string;
    thanks: (date: string) => string;
    immediateStart: string;
    cancel: string;
    terms: string;
    contact: string;
  }
> = {
  es: {
    subject: 'Confirmación de tu compra de Finanverso Premium',
    greeting: (n) => `Hola ${n},`,
    thanks: (date) => `Gracias por pasarte a Premium. Confirmamos tu compra del ${date}.`,
    immediateStart:
      'Al comprar pediste que Premium empezara de inmediato y aceptaste que, por ello, pierdes el derecho de desistimiento de 14 días.',
    cancel:
      'Si tu plan es mensual o anual, puedes cancelar la renovación cuando quieras desde «Tu plan → Gestionar suscripción» en la web: no se te vuelve a cobrar y conservas Premium hasta el final del periodo ya pagado.',
    terms: 'Condiciones de contratación:',
    contact: 'Si tienes cualquier duda, responde a este email o escribe a support@finanverso.app.',
  },
  en: {
    subject: 'Your Finanverso Premium purchase',
    greeting: (n) => `Hi ${n},`,
    thanks: (date) => `Thanks for upgrading to Premium. We confirm your purchase of ${date}.`,
    immediateStart:
      'When buying, you asked Premium to start straight away and accepted that you therefore lose the 14-day right of withdrawal.',
    cancel:
      'If your plan is monthly or yearly, you can cancel the renewal at any time from "Your plan → Manage subscription" on the web: you are not charged again and you keep Premium until the end of the period already paid.',
    terms: 'Terms of sale:',
    contact: 'If you have any questions, reply to this e-mail or write to support@finanverso.app.',
  },
};

/** Durable confirmation of a purchase, including the immediate start (no withdrawal). */
export function purchaseEmail(
  locale: EmailLocale,
  name: string,
  termsUrl: string,
  at: Date
): EmailContent {
  const c = PURCHASE_COPY[locale];
  const tag = locale === 'es' ? 'es-ES' : 'en-GB';
  const date = at.toLocaleDateString(tag, { day: 'numeric', month: 'long', year: 'numeric' });
  const lines = [c.thanks(date), c.immediateStart, c.cancel];
  const htmlUrl = escapeHtml(termsUrl);
  const paragraphs = [
    c.greeting(`<strong>${safeName(name)}</strong>`),
    ...lines.map(escapeHtml),
    `${c.terms} <a class="url" href="${htmlUrl}">${htmlUrl}</a>`,
    escapeHtml(c.contact),
  ].map((p) => `      <p>${p}</p>`);
  const html = layout(locale, paragraphs.join('\n'));
  const text = [
    c.greeting(plainName(name)),
    '',
    ...lines,
    `${c.terms} ${termsUrl}`,
    c.contact,
  ].join('\n');
  return { subject: c.subject, html, text };
}

export const verificationEmail = (locale: EmailLocale, name: string, url: string): EmailContent =>
  render('verify', locale, name, url);

export const passwordResetEmail = (locale: EmailLocale, name: string, url: string): EmailContent =>
  render('reset', locale, name, url);

const DIGEST_COPY: Record<
  EmailLocale,
  {
    subject: string;
    greeting: (name: string) => string;
    week: (from: string, to: string) => string;
    spent: string;
    income: string;
    vsPrevious: (pct: number) => string;
    top: string;
    upcoming: (date: string) => string;
    open: string;
    off: string;
  }
> = {
  es: {
    subject: 'Tu resumen semanal de Finanverso',
    greeting: (n) => `Hola ${n},`,
    week: (from, to) => `Así fue tu semana (${from} – ${to}):`,
    spent: 'Gastado',
    income: 'Ingresado',
    vsPrevious: (p) =>
      p === 0
        ? 'Igual que la semana anterior.'
        : `${Math.abs(p)} % ${p > 0 ? 'más' : 'menos'} que la semana anterior.`,
    top: 'Donde más gastaste',
    upcoming: (date) => `Se cobrarán el ${date} estas operaciones automáticas:`,
    open: 'Abrir Finanverso',
    off: 'Puedes dejar de recibir este resumen en Ajustes → Preferencias.',
  },
  en: {
    subject: 'Your Finanverso weekly summary',
    greeting: (n) => `Hi ${n},`,
    week: (from, to) => `Here is your week (${from} – ${to}):`,
    spent: 'Spent',
    income: 'Income',
    vsPrevious: (p) =>
      p === 0
        ? 'The same as the week before.'
        : `${Math.abs(p)}% ${p > 0 ? 'more' : 'less'} than the week before.`,
    top: 'Where you spent the most',
    upcoming: (date) => `These automatic movements will be charged on ${date}:`,
    open: 'Open Finanverso',
    off: 'You can stop receiving this summary in Settings → Preferences.',
  },
};

/** Optional Monday summary: last week's spending, the biggest categories and what is coming. */
export function weeklyDigestEmail(
  locale: EmailLocale,
  name: string,
  digest: DigestData,
  currency: string,
  appUrl: string
): EmailContent {
  const c = DIGEST_COPY[locale];
  const tag = locale === 'es' ? 'es-ES' : 'en-GB';
  const money = (cents: number): string =>
    new Intl.NumberFormat(tag, { style: 'currency', currency }).format(cents / 100);
  const day = (iso: string): string =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(tag, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  const lines = [
    c.week(day(digest.from), day(digest.to)),
    `${c.spent}: ${money(digest.spentCents)}`,
    `${c.income}: ${money(digest.incomeCents)}`,
    ...(digest.changePct === null ? [] : [c.vsPrevious(digest.changePct)]),
  ];
  const top = digest.topCategories.map((t) => `${t.name}: ${money(t.cents)}`);
  const upcoming = digest.upcoming
    ? digest.upcoming.items.map((i) => `${i.description}: ${money(i.amountCents)}`)
    : [];
  const html = layout(
    locale,
    [
      `      <p>${c.greeting(`<strong>${safeName(name)}</strong>`)}</p>`,
      ...lines.map((l) => `      <p>${escapeHtml(l)}</p>`),
      ...(top.length
        ? [
            `      <p><strong>${c.top}</strong></p>`,
            `      <ul>${top.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`,
          ]
        : []),
      ...(digest.upcoming
        ? [
            `      <p><strong>${escapeHtml(c.upcoming(day(digest.upcoming.date)))}</strong></p>`,
            `      <ul>${upcoming.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`,
          ]
        : []),
      `      <p style="text-align:center"><a class="btn" href="${escapeHtml(appUrl)}">${
        c.open
      }</a></p>`,
      `      <p>${c.off}</p>`,
    ].join('\n')
  );
  const text = [
    c.greeting(plainName(name)),
    '',
    ...lines,
    ...(top.length ? ['', `${c.top}:`, ...top.map((l) => `- ${l}`)] : []),
    ...(digest.upcoming
      ? ['', c.upcoming(day(digest.upcoming.date)), ...upcoming.map((l) => `- ${l}`)]
      : []),
    '',
    `${c.open}: ${appUrl}`,
    c.off,
  ].join('\n');
  return { subject: c.subject, html, text };
}
