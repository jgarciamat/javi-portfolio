// Cloudflare Email Worker: forwards every message sent to the receipts addresses
// (mm-<token>@facturas.finanverso.app) to the Finanverso API, which turns it into an expense.
import PostalMime from 'postal-mime';

export default {
  async email(message, env) {
    const mail = await PostalMime.parse(message.raw);
    const response = await fetch(env.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-inbound-secret': env.INBOUND_SECRET,
      },
      body: JSON.stringify({
        to: message.to,
        from: mail.from?.name ? `${mail.from.name} <${mail.from.address}>` : message.from,
        subject: mail.subject ?? '',
        text: mail.text ?? '',
        html: mail.html ?? undefined,
        date: mail.date ?? null,
      }),
    });
    if (!response.ok) {
      // Make Cloudflare report the failure instead of swallowing the message silently.
      throw new Error(`Finanverso answered ${response.status}`);
    }
  },
};
