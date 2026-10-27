import { EmailLocale, SecurityNotice, TrialNotice } from '@domain/ports/services';
import { PLAN_LIMITS } from '@domain/services/plans';
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

/** Every e-mail is sent from a no-reply address: the footer says so (the contact stays support@). */
const NO_REPLY: Record<EmailLocale, string> = {
  es: 'Este mensaje es automático y esta dirección no recibe respuestas.',
  en: 'This is an automatic message and this address does not receive replies.',
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
    <div class="footer">© ${new Date().getFullYear()} Finanverso<br />${NO_REPLY[locale]}</div>
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
    contact:
      'Si tienes cualquier duda, escribe a support@finanverso.app (este correo no admite respuestas).',
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
    contact:
      'If you have any questions, write to support@finanverso.app (this e-mail does not accept replies).',
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

const EXISTS_COPY: Record<
  EmailLocale,
  {
    subject: string;
    greeting: (name: string) => string;
    intro: string;
    button: string;
    forgot: string;
    google: string;
    ignore: string;
  }
> = {
  es: {
    subject: 'Ya tienes una cuenta en Finanverso',
    greeting: (n) => `Hola ${n},`,
    intro:
      'Alguien (seguramente tú) ha intentado crear una cuenta en Finanverso con este email, pero ya tienes una. No hemos cambiado nada.',
    button: 'Iniciar sesión',
    forgot: '¿No recuerdas la contraseña? Restablécela aquí:',
    google: 'Si entras con Google, usa «Continuar con Google».',
    ignore: 'Si no has sido tú, puedes ignorar este email: tu cuenta sigue igual.',
  },
  en: {
    subject: 'You already have a Finanverso account',
    greeting: (n) => `Hi ${n},`,
    intro:
      'Someone (most likely you) tried to create a Finanverso account with this email, but you already have one. Nothing has changed.',
    button: 'Sign in',
    forgot: "Don't remember the password? Reset it here:",
    google: 'If you sign in with Google, use "Continue with Google".',
    ignore: "If it wasn't you, you can ignore this email: your account stays the same.",
  },
};

/** Sent instead of a second sign-up, so the form never reveals which e-mails have an account. */
export function accountExistsEmail(
  locale: EmailLocale,
  name: string,
  loginUrl: string,
  resetUrl: string
): EmailContent {
  const c = EXISTS_COPY[locale];
  const login = escapeHtml(loginUrl);
  const reset = escapeHtml(resetUrl);
  const html = layout(
    locale,
    `      <p>${c.greeting(`<strong>${safeName(name)}</strong>`)}</p>
      <p>${escapeHtml(c.intro)}</p>
      <p style="text-align:center"><a class="btn" href="${login}">${c.button}</a></p>
      <p>${escapeHtml(c.forgot)} <a class="url" href="${reset}">${reset}</a></p>
      <p>${escapeHtml(c.google)}</p>
      <p>${escapeHtml(c.ignore)}</p>`
  );
  const text = [
    c.greeting(plainName(name)),
    '',
    c.intro,
    `${c.button}: ${loginUrl}`,
    `${c.forgot} ${resetUrl}`,
    c.google,
    c.ignore,
  ].join('\n');
  return { subject: c.subject, html, text };
}

const SECURITY_COPY: Record<
  EmailLocale,
  {
    greeting: (name: string) => string;
    notices: Record<SecurityNotice, { subject: string; body: string }>;
    check: string;
    notYou: string;
  }
> = {
  es: {
    greeting: (n) => `Hola ${n},`,
    notices: {
      two_factor_enabled: {
        subject: 'Verificación en dos pasos activada',
        body: 'Has activado la verificación en dos pasos en tu cuenta de Finanverso. A partir de ahora, al iniciar sesión te pediremos también el código de tu app de autenticación.',
      },
      two_factor_disabled: {
        subject: 'Verificación en dos pasos desactivada',
        body: 'Se ha desactivado la verificación en dos pasos de tu cuenta de Finanverso. Para entrar ya solo se pide la contraseña (o Google).',
      },
      recovery_codes_regenerated: {
        subject: 'Nuevos códigos de recuperación',
        body: 'Se han generado nuevos códigos de recuperación para tu cuenta de Finanverso. Los anteriores ya no sirven.',
      },
      recovery_code_used: {
        subject: 'Se ha usado un código de recuperación',
        body: 'Se ha iniciado sesión en tu cuenta de Finanverso con uno de tus códigos de recuperación. Ese código ya no se puede volver a usar.',
      },
    },
    check: 'Puedes revisarlo en Ajustes → Seguridad:',
    notYou:
      'Si no has sido tú, cambia tu contraseña cuanto antes y cierra la sesión en todos los dispositivos.',
  },
  en: {
    greeting: (n) => `Hi ${n},`,
    notices: {
      two_factor_enabled: {
        subject: 'Two-step verification turned on',
        body: 'You turned on two-step verification for your Finanverso account. From now on, signing in also asks for the code of your authenticator app.',
      },
      two_factor_disabled: {
        subject: 'Two-step verification turned off',
        body: 'Two-step verification was turned off for your Finanverso account. Signing in now only asks for the password (or Google).',
      },
      recovery_codes_regenerated: {
        subject: 'New recovery codes',
        body: 'New recovery codes were generated for your Finanverso account. The previous ones no longer work.',
      },
      recovery_code_used: {
        subject: 'A recovery code was used',
        body: 'Someone signed in to your Finanverso account with one of your recovery codes. That code cannot be used again.',
      },
    },
    check: 'You can review it in Settings → Security:',
    notYou:
      "If it wasn't you, change your password as soon as possible and sign out on every device.",
  },
};

/** Security alert after a change in how the account is protected. */
export function securityNoticeEmail(
  locale: EmailLocale,
  name: string,
  notice: SecurityNotice,
  settingsUrl: string
): EmailContent {
  const c = SECURITY_COPY[locale];
  const { subject, body } = c.notices[notice];
  const url = escapeHtml(settingsUrl);
  const html = layout(
    locale,
    [
      c.greeting(`<strong>${safeName(name)}</strong>`),
      escapeHtml(body),
      `${escapeHtml(c.check)} <a class="url" href="${url}">${url}</a>`,
      escapeHtml(c.notYou),
    ]
      .map((p) => `      <p>${p}</p>`)
      .join('\n')
  );
  const text = [c.greeting(plainName(name)), '', body, `${c.check} ${settingsUrl}`, c.notYou].join(
    '\n'
  );
  return { subject: `Finanverso: ${subject}`, html, text };
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

const FREE = PLAN_LIMITS.free.resources;

const TRIAL_COPY: Record<
  EmailLocale,
  {
    subject: Record<TrialNotice['kind'], (date: string) => string>;
    greeting: (name: string) => string;
    lead: Record<TrialNotice['kind'], (date: string) => string>;
    keepTitle: string;
    keep: string[];
    usage: (
      key: 'accounts' | 'budgets' | 'goals' | 'recurringRules',
      n: number,
      max: number
    ) => string;
    lostTitle: string;
    lost: string[];
    closing: Record<TrialNotice['kind'], string>;
    button: string;
    off: string;
  }
> = {
  es: {
    subject: {
      ends_soon: (d) => `Tu prueba de Premium termina el ${d}`,
      last_day: () => 'Hoy termina tu prueba de Premium',
      ended: () => 'Tu prueba de Premium ha terminado',
    },
    greeting: (n) => `Hola ${n},`,
    lead: {
      ends_soon: (d) =>
        `Tu prueba gratuita de 14 días de Premium termina el ${d}. No hace falta que hagas nada: no hay tarjeta y no se cobra nada.`,
      last_day: (d) => `Tu prueba gratuita de Premium termina hoy (${d}). No se cobra nada.`,
      ended: () => 'Tu prueba gratuita de 14 días de Premium ha terminado. No se ha cobrado nada.',
    },
    keepTitle: 'Lo que sigue gratis',
    keep: [
      'Todos tus datos: no borramos nada de lo que has creado.',
      `Movimientos sin límite y hasta ${FREE.accounts} cuentas, ${FREE.budgets} presupuestos, ${FREE.goals} metas, ${FREE.recurringRules} movimientos automáticos y ${FREE.customAlerts} alertas.`,
      'Las calculadoras, las guías y los dos primeros capítulos del curso de inversión.',
    ],
    usage: (key, n, max) => {
      const label = {
        accounts: 'cuentas',
        budgets: 'presupuestos',
        goals: 'metas',
        recurringRules: 'movimientos automáticos',
      }[key];
      return `Tienes ${n} ${label}; el plan gratuito permite ${max} para crear nuevos.`;
    },
    lostTitle: 'Lo que pasa a ser de Premium',
    lost: [
      'Tendencias, informe anual y previsión a más de un mes.',
      'Análisis con IA: 1 al mes en el plan gratuito, 10 con Premium.',
      'Hogar compartido, facturas por email y pagos detectados en las notificaciones del banco (Android).',
      'El resto del curso «Aprende a invertir» y los vídeos Premium.',
    ],
    closing: {
      ends_soon: 'Si quieres conservar Premium, puedes verlo y elegir plan cuando quieras.',
      last_day: 'Si quieres seguir con Premium, puedes elegir plan cuando quieras.',
      ended:
        'Si más adelante echas de menos algo de Premium, puedes verlo y elegir plan cuando quieras. No te escribiremos más sobre la prueba.',
    },
    button: 'Ver qué incluye cada plan',
    off: 'Es un aviso sobre tu cuenta. Puedes desactivarlo en Ajustes → Preferencias («Avisos sobre mi prueba»).',
  },
  en: {
    subject: {
      ends_soon: (d) => `Your Premium trial ends on ${d}`,
      last_day: () => 'Your Premium trial ends today',
      ended: () => 'Your Premium trial has ended',
    },
    greeting: (n) => `Hi ${n},`,
    lead: {
      ends_soon: (d) =>
        `Your free 14-day Premium trial ends on ${d}. You do not need to do anything: there is no card and nothing is charged.`,
      last_day: (d) => `Your free Premium trial ends today (${d}). Nothing is charged.`,
      ended: () => 'Your free 14-day Premium trial has ended. Nothing has been charged.',
    },
    keepTitle: 'What stays free',
    keep: [
      'All your data: we do not delete anything you created.',
      `Unlimited movements and up to ${FREE.accounts} accounts, ${FREE.budgets} budgets, ${FREE.goals} goals, ${FREE.recurringRules} automatic movements and ${FREE.customAlerts} alerts.`,
      'The calculators, the guides and the first two chapters of the investing course.',
    ],
    usage: (key, n, max) => {
      const label = {
        accounts: 'accounts',
        budgets: 'budgets',
        goals: 'goals',
        recurringRules: 'automatic movements',
      }[key];
      return `You have ${n} ${label}; the free plan allows ${max} when creating new ones.`;
    },
    lostTitle: 'What becomes Premium',
    lost: [
      'Trends, the yearly report and the outlook beyond one month.',
      'AI analyses: 1 a month on the free plan, 10 with Premium.',
      'Shared household, invoices by e-mail and payments detected from bank notifications (Android).',
      'The rest of the "Learn to invest" course and the Premium videos.',
    ],
    closing: {
      ends_soon: 'If you want to keep Premium, you can see the plans and choose whenever you like.',
      last_day: 'If you want to stay on Premium, you can choose a plan whenever you like.',
      ended:
        'If you later miss something from Premium, you can see the plans and choose whenever you like. We will not write to you again about the trial.',
    },
    button: 'See what each plan includes',
    off: 'This is a notice about your account. You can turn it off in Settings → Preferences ("Notices about my trial").',
  },
};

/**
 * Service message about the end of the free trial: when it ends, what stays free and what
 * becomes Premium. Counts only (never names or amounts). No countdown tricks or invented offers.
 */
export function trialNoticeEmail(
  locale: EmailLocale,
  name: string,
  notice: TrialNotice,
  appUrl: string
): EmailContent {
  const c = TRIAL_COPY[locale];
  const date = new Date(notice.endsAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid',
  });
  const usage = (['accounts', 'budgets', 'goals', 'recurringRules'] as const)
    .filter((k) => notice.usage[k] >= FREE[k] && notice.usage[k] > 0)
    .map((k) => c.usage(k, notice.usage[k], FREE[k]));
  const keep = [...c.keep, ...usage];
  const url = `${appUrl}/pricing`;
  const list = (items: string[]): string =>
    `      <ul>${items.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
  const html = layout(
    locale,
    [
      `      <p>${c.greeting(`<strong>${safeName(name)}</strong>`)}</p>`,
      `      <p>${escapeHtml(c.lead[notice.kind](date))}</p>`,
      `      <p><strong>${c.keepTitle}</strong></p>`,
      list(keep),
      `      <p><strong>${c.lostTitle}</strong></p>`,
      list(c.lost),
      `      <p>${escapeHtml(c.closing[notice.kind])}</p>`,
      `      <p style="text-align:center"><a class="btn" href="${escapeHtml(url)}">${c.button}</a></p>`,
      `      <p>${escapeHtml(c.off)}</p>`,
    ].join('\n')
  );
  const text = [
    c.greeting(plainName(name)),
    '',
    c.lead[notice.kind](date),
    '',
    `${c.keepTitle}:`,
    ...keep.map((l) => `- ${l}`),
    '',
    `${c.lostTitle}:`,
    ...c.lost.map((l) => `- ${l}`),
    '',
    c.closing[notice.kind],
    `${c.button}: ${url}`,
    '',
    c.off,
  ].join('\n');
  return { subject: c.subject[notice.kind](date), html, text };
}
