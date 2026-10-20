# Content-Security-Policy de Finanverso

Caddy (`deploy/Caddyfile`, bloque `(app)`) envía dos cabeceras CSP y un `Reporting-Endpoints`.

## Qué está activo hoy

1. **`Content-Security-Policy` (se aplica de verdad)** con las directivas que no pueden romper la app:
   `object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`.
2. **`Content-Security-Policy-Report-Only`** con la política completa (scripts, estilos, conexiones,
   imágenes, workers, marcos). No bloquea nada: el navegador avisa a `POST /api/csp-report` (con
   `report-uri` para Firefox/Safari y `report-to csp-endpoint` para Chrome).

`/api/csp-report` (backend, `client.routes.ts`): sin sesión, limitado a 20 por minuto y IP, acepta
`application/csp-report` y `application/reports+json`. No guarda nada: cuenta violaciones por directiva
(en memoria) y escribe una línea `[csp] {...}` con la directiva, la URL bloqueada y la página, **sin
query ni fragmento** y recortadas (120 caracteres). Mira las líneas con:

    docker compose logs api | grep '\[csp\]'

## Qué se verificó en local (Caddy + build de producción + API, Chrome)

Con la política completa en Report-Only y escuchando `securitypolicyviolation`: portada, login,
registro, precios, guías, y con sesión todas las secciones del menú (mensual, anual, análisis,
presupuestos, metas, autónomos, Renta, Hacienda, videoteca, perfil, plan, ajustes, invitar), importar
movimientos, subir un PDF en la Renta, el lector de tickets (OCR: worker + WebAssembly de
tesseract) y una imagen/worker `blob:`. **Cero violaciones.** Por el código se añadieron tres cosas
que la política antigua no tenía y que sí hacen falta:

- `'wasm-unsafe-eval'` en `script-src` (WebAssembly del OCR y de pdf.js; no permite `eval()`).
- `worker-src 'self' blob:` (worker del OCR).
- `blob:` en `img-src` (vista previa del resumen para compartir).

## Qué NO se pudo verificar (por eso la completa sigue en Report-Only)

- Inicio de sesión con Google (ventana emergente real con cuenta real).
- Reproductor de YouTube (`youtube-nocookie.com`, tras el clic).
- Compra: Stripe se abre con una redirección de página completa (no la limita la CSP), pero no hay
  claves de prueba en el entorno local.

## Cómo pasar la política completa a enforcing

1. Despliega y deja correr unos días. `docker compose logs api | grep '\[csp\]'` debe estar vacío o
   solo con extensiones del navegador (`blocked` = `chrome-extension`, `moz-extension`, `inline`
   en páginas ajenas...).
2. Prueba a mano en producción: login con Google, un vídeo, la compra en modo prueba de Stripe.
3. En el `Caddyfile`, cambia `Content-Security-Policy-Report-Only` por `Content-Security-Policy`
   en la línea larga, **y quita de ella `report-uri`/`report-to` solo si no quieres seguir recibiendo
   avisos** (conviene dejarlos). Las dos cabeceras CSP se combinan (se aplica la más restrictiva), así
   que la línea corta actual puede quedarse.
4. `docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile` (o `deploy.sh`).
5. Si algo falla: vuelve a poner `-Report-Only` y recarga. Es un cambio de una línea.

## Android / iOS (Capacitor)

La app nativa carga los ficheros desde el propio paquete, no desde Caddy: esta CSP no le afecta (solo
llama a `https://finanverso.app/api`, y las respuestas de la API no se limitan por la CSP del cliente).
`frame-ancestors 'none'` coincide con `X-Frame-Options: DENY`.
