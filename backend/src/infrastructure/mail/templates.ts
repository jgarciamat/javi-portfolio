import { EmailLocale } from '@domain/ports/services';

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
      subject: 'Verifica tu cuenta en Money Manager',
      greeting: (n) => `Hola ${n},`,
      intro: 'Gracias por registrarte. Para activar tu cuenta, pulsa el botón:',
      button: 'Verificar mi cuenta',
      copyLink: 'O copia este enlace en tu navegador:',
      expires: 'El enlace caduca en 24 horas.',
      ignore: 'Si no te has registrado, puedes ignorar este email.',
    },
    en: {
      subject: 'Verify your Money Manager account',
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
      subject: 'Restablece tu contraseña de Money Manager',
      greeting: (n) => `Hola ${n},`,
      intro: 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.',
      button: 'Restablecer contraseña',
      copyLink: 'O copia este enlace en tu navegador:',
      expires: 'El enlace caduca en 1 hora.',
      ignore: 'Si no has solicitado este cambio, ignora este email. Tu contraseña no cambiará.',
    },
    en: {
      subject: 'Reset your Money Manager password',
      greeting: (n) => `Hi ${n},`,
      intro: 'We received a request to reset the password of your account.',
      button: 'Reset password',
      copyLink: 'Or copy this link into your browser:',
      expires: 'The link expires in 1 hour.',
      ignore: "If you didn't request this, ignore this email. Your password won't change.",
    },
  },
};

function render(
  kind: 'verify' | 'reset',
  locale: EmailLocale,
  name: string,
  url: string
): EmailContent {
  const c = COPY[kind][locale] ?? COPY[kind].es;
  const htmlName = safeName(name);
  const htmlUrl = escapeHtml(url);
  const html = `<!DOCTYPE html>
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
    <div class="header"><h1>Money Manager</h1></div>
    <div class="body">
      <p>${c.greeting(`<strong>${htmlName}</strong>`)}</p>
      <p>${c.intro}</p>
      <p style="text-align:center"><a class="btn" href="${htmlUrl}">${c.button}</a></p>
      <p>${c.copyLink}</p>
      <p class="url">${htmlUrl}</p>
      <p>${c.expires}</p>
      <p>${c.ignore}</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} Money Manager</div>
  </div>
</body>
</html>`;
  const plainName = name
    .replace(/https?:\/\/\S+/gi, '')
    .slice(0, 80)
    .trim();
  const text = `${c.greeting(plainName)}\n\n${c.intro}\n${url}\n\n${c.expires}\n${c.ignore}`;
  return { subject: c.subject, html, text };
}

export const verificationEmail = (locale: EmailLocale, name: string, url: string): EmailContent =>
  render('verify', locale, name, url);

export const passwordResetEmail = (locale: EmailLocale, name: string, url: string): EmailContent =>
  render('reset', locale, name, url);
