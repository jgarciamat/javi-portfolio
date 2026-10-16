# Facturas por email (Cloudflare Email Worker)

Cada usuario Premium tiene una dirección privada `mm-<token>@facturas.finanverso.app`. Cuando reenvía
un recibo o factura a esa dirección, este Worker lo recibe y lo manda a la API
(`POST /api/inbound/email`), que lo convierte en un gasto.

## Puesta en marcha (una sola vez)

1. **Elige un secreto** largo (mínimo 16 caracteres), por ejemplo con `openssl rand -hex 32`.
2. **Servidor**: añade a su archivo de entorno y reinicia el backend:
   ```
   INBOUND_EMAIL_DOMAIN=facturas.finanverso.app
   INBOUND_EMAIL_SECRET=<el secreto>
   ```
3. **Desplegar el Worker**:
   ```bash
   cd deploy/email-worker
   npm install
   npx wrangler login
   npx wrangler secret put INBOUND_SECRET     # pega el mismo secreto
   npx wrangler deploy
   ```
4. **Cloudflare, Email Routing** (dominio `finanverso.app`): activa Email Routing y añade el subdominio
   `facturas` (Email, Email Routing, Settings, Subdomains). Cloudflare crea los registros MX.
   Después, en Routing rules, crea una **catch-all** del subdominio con la acción
   *Send to a Worker* y elige `money-manager-inbox`.
   Usar un subdominio evita que el resto de direcciones de `finanverso.app` pasen por el Worker.

Mientras `INBOUND_EMAIL_DOMAIN` e `INBOUND_EMAIL_SECRET` no estén definidos, la tarjeta de la app
(Ajustes, Facturas por email) permanece oculta.

## Qué entiende

Correos con el importe en el texto: «Total: 23,40 €», «Total a pagar 55,10 EUR», «Total paid: 10.99».
No lee archivos adjuntos (PDF o imágenes). La fecha se toma del texto si aparece y, si no, del
correo. Un mismo correo reenviado dos veces no se duplica.
