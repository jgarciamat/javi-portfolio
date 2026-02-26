import { Resend } from 'resend';

export class EmailService {
  private resend: Resend;
  private fromAddress: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY ?? '');
    const fromName = process.env.SMTP_FROM_NAME ?? 'Money Manager';
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
    this.fromAddress = `${fromName} <${fromEmail}>`;
  }

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject: '✅ Verifica tu cuenta en Money Manager',
      html: `
<!DOCTYPE html>
<html lang="es">
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
    <div class="header">
      <h1>💶 Money Manager</h1>
    </div>
    <div class="body">
      <p>Hola <strong>${name}</strong>,</p>
      <p>Gracias por registrarte. Para activar tu cuenta, haz clic en el botón:</p>
      <p style="text-align:center">
        <a class="btn" href="${verifyUrl}">Verificar mi cuenta</a>
      </p>
      <p>O copia este enlace en tu navegador:</p>
      <p class="url">${verifyUrl}</p>
      <p>El enlace expira en <strong>24 horas</strong>.</p>
      <p>Si no te has registrado, puedes ignorar este email.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} Money Manager</div>
  </div>
</body>
</html>`,
      text: `Hola ${name},\n\nVerifica tu cuenta en Money Manager:\n${verifyUrl}\n\nEl enlace expira en 24 horas.`,
    });

    if (error) throw new Error(`Error al enviar email: ${error.message}`);
  }
}
