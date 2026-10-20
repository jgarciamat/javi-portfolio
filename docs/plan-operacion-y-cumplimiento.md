# Plan de operación y cumplimiento de Finanverso

**Fecha:** 20-10-2026 · **Rama de partida:** `develop` (v1.56.0) · **Para:** el dueño (no hace falta saber programar) · **Qué cubre:** monitorización y errores, límites de Docker, analítica, recordatorios de plazos fiscales, RGPD formal y reglas fiscales por ejercicio. **Qué no cubre:** la revisión por un gestor colegiado (no se pide ahora).

> Este documento es un plan de trabajo, no asesoramiento jurídico ni fiscal. Las cifras de precios y de normativa se comprobaron en las fuentes del [Anexo A](#anexo-a-fuentes) en la fecha que allí se indica; lo que no se pudo comprobar está en el [Anexo B](#anexo-b-lo-que-no-se-pudo-verificar).

---

## Resumen ejecutivo

### Orden recomendado

| Orden | Bloque | Por qué ahora | Esfuerzo | Coste al mes | Fecha objetivo |
|---|---|---|---|---|---|
| 1 | **[Monitorización externa y alertas](#1-monitorización-externa-y-errores)** | Hoy una caída o un disco lleno se descubren cuando se queja un usuario | S (agente) + 1 h (dueño) | **0 €** | 2 semanas |
| 2 | **[Límites y endurecimiento de Docker](#2-límites-de-memoria-y-endurecimiento-de-docker)** | Un pico de memoria de la API puede tumbar Caddy y la web a la vez | S | **0 €** | 2 semanas |
| 3 | **[RGPD formal](#5-rgpd-formal)** (registro, contratos, brechas) | Es una obligación ya vigente; casi todo es aceptar contratos y guardar papeles | M (agente redacta) + 1 día (dueño) | **0 €** (abogado opcional: ver nota) | 1 mes |
| 4 | **[Recordatorios de plazos fiscales](#4-recordatorios-de-plazos-fiscales)** | El próximo plazo trimestral fuerte es el 20 de enero de 2027 (y el 1 de febrero para el 303 del 4T) | M | **0 €** | antes del 1-01-2027 |
| 5 | **[Reglas fiscales por ejercicio](#6-reglas-fiscales-por-ejercicio-antes-de-abril-de-2027)** | Sin esto, la Renta 2026 (abril de 2027) saldría con las reglas de 2025 | M + mantenimiento anual | **0 €** | motor listo el 15-03-2027; datos el día que salga la Orden |
| 6 | **[Analítica respetuosa](#3-analítica-real-respetuosa-con-la-privacidad)** | Para saber qué vídeo o campaña trae usuarios que pagan | S-M | **0 €** (opción con Plausible: ~9-10 €/mes) | 1 mes |

**Costes totales aproximados:** con la recomendación de este plan, **0 € al mes** de herramientas nuevas. Todo cabe en planes gratuitos o en el propio servidor:

- UptimeRobot Free (50 monitores cada 5 min; sus condiciones actuales permiten el uso comercial).
- Healthchecks.io Hobbyist (20 checks, con Telegram).
- Sentry Developer en la región UE (5.000 errores al mes, 30 días).
- Cloudflare Web Analytics o Umami Cloud Hobby (100.000 eventos al mes).

Opciones de pago para más adelante, si hacen falta:

- UptimeRobot Solo: 10 €/mes (Telegram y más frecuencia).
- Sentry Team: 29 $/mes (26 $ en pago anual).
- Plausible: desde 9 $/mes (los embudos solo están en Business, a 19 $/mes).

Las fuentes y la fecha de cada precio están en el [Anexo A](#anexo-a-fuentes). El servidor y R2 ya se pagan hoy y no cambian. Ojo: Hetzner subió sus precios en 2026, y si se reescala el servidor se pasa a la tarifa nueva.

Lo que más cuesta es el tiempo:

- unas **4-5 semanas de trabajo de agentes**, repartidas en 3 meses;
- **unos 2-3 días del dueño**: crear cuentas, aceptar contratos, firmar el registro y probar en el móvil.

Opcional pero recomendable: que un abogado revise de forma puntual la política, las condiciones, el contrato de encargo y la EIPD. Suele costar **entre 300 y 900 €** (orientativo, NO VERIFICADO: pide presupuesto).

> **Aviso de contexto (20-10-2026):** las Cortes están disueltas (Real Decreto 806/2026, BOE del 6-10-2026) y hay elecciones el 29-11-2026. Consecuencias:
> - No habrá Presupuestos para 2027 a tiempo.
> - El **Real Decreto-ley 29/2026**, del 7-10-2026, cambia la Renta de 2026-2027: alquileres, deducción estatal por alquiler e imputación de inmuebles. Sigue **pendiente de convalidación** por la Diputación Permanente, prevista para principios de noviembre. Si no se convalida, queda derogado.
>
> Por eso el motor fiscal tiene que poder activar o desactivar esas reglas (§6.4).

### Lo que tiene que hacer el dueño a mano

1. **Crear cuentas** con el correo de la marca (moneymanager@outlook.es o support@finanverso.app): UptimeRobot, Sentry y un bot de Telegram para las alertas. En Sentry, elige la **región UE al crear la organización**: después no se puede cambiar. Pasar al agente solo los identificadores necesarios (DSN, URL de ping), **nunca** contraseñas.
2. **Aceptar o descargar los contratos de encargo** (DPA) en los paneles de Hetzner, Cloudflare, Resend, RevenueCat, Google y Stripe, y guardarlos en una carpeta privada (no en el repositorio, que es público).
3. **Firmar** (con fecha) el registro de actividades de tratamiento, el procedimiento de brechas y la decisión sobre la EIPD que redactará el agente.
4. **Decidir** tres cosas de producto: si los recordatorios de plazos son gratuitos (recomendado) o Premium; si se guarda la campaña de origen en la cuenta del usuario; y si se añade un banner de consentimiento o se elimina el guardado de `mm_acq` antes del registro (recomendado: eliminarlo).
5. **Probar en su móvil** los avisos (Android, y iPhone con la web añadida a la pantalla de inicio).
6. **En marzo-abril de 2027:** avisar al agente en cuanto salga en el BOE la Orden del modelo 100 de 2026 (o dejar que lo detecte la tarea automática de §6.6).

### Las cifras clave del calendario

- **5-11-2026 (jueves):** segundo plazo de la Renta 2025 para quien la fraccionó (modelo 102).
- **20-01-2027 (miércoles):** 111 y 115 del 4T de 2026. El 303, el 130 y el 131 del 4T, el 349 y el 390 llegan hasta el 30 de enero (ver §4.3).
- **30-01-2027 es sábado.** Si la AEAT lo confirma en su calendario, el 303, el 130 y el 131 del 4T, el 349 y el 390 pasan al **lunes 1-02-2027**. Lo mismo el 190 y el 180, porque el 31 de enero es domingo. Es la regla del día hábil siguiente, la misma que movió el 190 al 2-02-2026 (ver Anexo B).
- **Campaña de la Renta 2026:** la AEAT aún no la ha publicado, ni siquiera el proyecto de Orden, que en 2026 salió el 26 de enero. Si repite el patrón de 2026:
  - empezaría hacia el 7-8 de abril;
  - la domiciliación terminaría el 25 de junio;
  - el último día sería el 30 de junio de 2027.

---

## Cómo leer los planes

- **Esfuerzo:** S = horas o 1 día · M = hasta 1 semana · L = hasta 1 mes.
- **Quién:** 🤖 = lo puede hacer un agente en el código o en la documentación · 👤 = lo tiene que hacer el dueño (cuentas, contratos, firmas, pruebas con su identidad o su móvil).
- **Hecho cuando:** una comprobación que cualquiera puede repetir.
- Todo lo que toca el servidor se prueba primero en local o en una copia, y se sube por el flujo de siempre (`develop` → `master` → `deploy.sh`) **solo cuando el dueño lo pida**.

---

## 1. Monitorización externa y errores

### 1.1 Qué hay hoy

| Pieza | Estado | Evidencia |
|---|---|---|
| `/api/health` | Hay: comprueba la base de datos con `SELECT 1` | `backend/src/infrastructure/http/app.ts:45` |
| Healthcheck de Docker | API y web (cada 30 s) | `backend/Dockerfile:31`, `frontend/Dockerfile:48` |
| Copia externa vigilada | Healthchecks.io avisa por correo si falla o no se ejecuta | `deploy/scripts/offsite-backup.sh`, `deploy/RESTORE.md` |
| Errores del navegador | Se envían a `/api/client-errors` y acaban en el log de la API (se pierden con la rotación de 30 MB) | `frontend/src/core/monitoring/errorReporting.ts`, `backend/src/infrastructure/http/routes/client.routes.ts` |
| Uptime externo, página de estado, seguimiento de errores, métricas del servidor, alertas de disco | **No hay** | `docs/informe-calidad-app.md` §D |

### 1.2 Uptime externo: comparativa

| Opción | Plan gratuito | Pros | Contras | Encaje |
|---|---|---|---|---|
| **UptimeRobot** | 50 monitores cada 5 min; alertas por email; 1 página de estado básica (en una URL de UptimeRobot) | Es el más conocido y muy simple. Sus condiciones actuales (24-06-2026) permiten «cualquier uso, incluido el comercial», con una política de uso razonable | **Telegram solo en los planes de pago**, según su página de integración. Entre 2024 y 2025 el plan gratuito estuvo limitado al uso no comercial (dato de terceros); hay que volver a mirar las condiciones antes de crear la cuenta | **Recomendado para mirar desde fuera** (gratis, por email). Solo cuesta 10 €/mes si se quiere Telegram o más frecuencia |
| **Better Stack (Uptime)** | 10 monitores cada 3 min, 10 *heartbeats* y 1 página de estado; alertas por email y Slack | La página de estado es más cuidada | Su plan gratuito se presenta para «proyectos personales». El primer plan de pago cuesta 34 $/mes (29 $ en pago anual). No publica dónde guarda los datos de uptime | Alternativa |
| **Healthchecks.io** (ya se usa) | 20 «checks» y unas 27 integraciones, **Telegram incluido**, gratis | Ya está configurado. Es ideal para tareas que **avisan por sí mismas**: cron, copias e informe del servidor | No mira desde fuera: no hace peticiones a la web | **Recomendado para las tareas del servidor y para llevar a Telegram las alertas de UptimeRobot** (ver §1.3) |
| **Cloudflare** | Health Checks: **0 en el plan Free** (10 en Pro). Las notificaciones de Health Checks piden Pro o superior | Ya está delante de la web | No comprueba el servidor de origen en el plan gratuito | No, salvo que se suba de plan (Pro cuesta unos 20-25 $/mes, NO VERIFICADO) |

**Recomendación:** UptimeRobot Free para mirar desde fuera, con alertas por email, y Healthchecks.io para que el servidor avise de lo que pasa dentro, con Telegram y email. Las dos cosas en planes gratuitos.

**Qué vigilar desde fuera (5 monitores):**

| # | Monitor | Comprobación | Intervalo |
|---|---|---|---|
| 1 | Web | `GET https://finanverso.app/` devuelve 200 y contiene `Finanverso` | 3 min |
| 2 | API | `GET https://finanverso.app/api/health` devuelve 200 y contiene `"status":"ok"` | 3 min |
| 3 | API heredada (apps Android antiguas) | `GET https://www.winjgm.com/api/health` devuelve 200 | 5 min |
| 4 | Certificado TLS | Caducidad de `finanverso.app` a menos de 14 días | diario |
| 5 | Dominio | Caducidad de `finanverso.app` a menos de 30 días (si el plan lo permite; si no, recordatorio en el calendario del dueño) | diario |

> Cloudflare puede responder con su propia página de error (502/522) cuando el servidor está caído: el monitor tiene que comprobar la **palabra clave** y no solo el código 200.

### 1.3 Alertas por email y Telegram

- 👤 Crea un bot con @BotFather en Telegram (es gratis) y conéctalo en Healthchecks.io, que trae la integración con Telegram en el plan gratuito.
- En UptimeRobot Free solo hay email. Para que sus caídas lleguen también a Telegram sin pagar, 🤖 añade a `vitals.sh` (§1.9) una comprobación propia de `https://finanverso.app/api/health`, hecha **desde el servidor y a través de Cloudflare**. Así detecta los fallos de Caddy y del DNS, pero no la caída del servidor entero: esa la avisa UptimeRobot por email.
- Usa como segundo canal el email moneymanager@outlook.es.
- Regla: **avisar tras 2 fallos seguidos** (evita falsas alarmas de 1 minuto) y avisar también cuando se recupere.
- 🤖 Documentar en `deploy/RESTORE.md` (o en un nuevo `deploy/OPERACION.md`) qué hacer con cada alerta: «web caída», «API caída», «disco > 85 %», «copia fallida», «memoria».

### 1.4 Página de estado

- 👤 En UptimeRobot, crea una página pública con los monitores 1 y 2; el 3 no se publica. En el plan gratuito, la página vive en una URL de UptimeRobot.
- 👤 Si se quiere `status.finanverso.app`, hay dos caminos:
  - Better Stack (1 página gratis).
  - El dominio propio de UptimeRobot, que probablemente es de pago (NO VERIFICADO).
  
  En los dos casos se configura un CNAME en Cloudflare DNS hacia el dominio que indique el proveedor, sin el proxy naranja si así lo pide.
- 🤖 Enlazarla en el pie de la web y en la página de ayuda.
- **Hecho cuando:** `https://status.finanverso.app` muestra «operativo» y, al parar la API en local de prueba, no cambia (solo mira producción).

### 1.5 Seguimiento de errores en la UE: comparativa

| Opción | Coste | Dónde están los datos | Recursos en el servidor | Encaje |
|---|---|---|---|---|
| **Sentry (SaaS) región UE** | Plan Developer gratis: 1 usuario, 5.000 errores al mes y 30 días de retención. Team: 29 $/mes (26 $ en pago anual) | Fráncfort (`de.sentry.io`). La región **se elige al crear la organización y no se puede cambiar**. DPA 5.1.0, que se acepta en *Organization Settings → Legal & Compliance*. Es una empresa de EE. UU. adherida al DPF | Ninguno | **Recomendado para empezar**: es el más maduro, con buen soporte de React, Node, *source maps* y Capacitor |
| **Bugsink hospedado** | Gratis: 15.000 eventos al mes y 1 usuario. Después, 16 €/mes | Alojado en la UE | Ninguno | **Alternativa sin transferencias a EE. UU.**: es compatible con los SDK de Sentry, así que el código es el mismo |
| **GlitchTip hospedado** | Free: 1.000 eventos al mes. Small: 15 $/mes por 100.000 | En EE. UU. o en la UE (Alemania), a elegir | Ninguno | Alternativa |
| **GlitchTip auto-alojado** | 0 € de licencia | En el propio servidor (Helsinki) | Modo *all-in-one*: 256 MB como mínimo y 512 MB recomendados, **más PostgreSQL 14 o superior** (unos 150-300 MB). Valkey es opcional. Ocupa unos 30 GB de disco por cada millón de eventos al mes | Posible con `mem_limit`, pero resta memoria a SQLite. Solo si se quiere que ningún dato salga del servidor |
| **Bugsink auto-alojado** | 0 € | En el propio servidor | Un contenedor. En Docker, su documentación **desaconseja SQLite en volúmenes** y recomienda MySQL: es otra base de datos más que mantener | No compensa frente a su versión hospedada gratis |

**Recomendación:** Sentry en la región UE, con el plan gratuito y el **DSN como variable opcional** (sin DSN no se envía nada). Si el dueño prefiere no transferir nada a EE. UU., Bugsink hospedado en la UE: el código no cambia, solo el DSN.

### 1.6 Qué datos NO se envían nunca al servicio de errores

| Nunca | Cómo se garantiza |
|---|---|
| Email, nombre, NIF, IBAN, teléfono | En el SDK 10.57 o posterior, `sendDefaultPii` está obsoleta. Hay que poner de forma explícita `dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false }`; por defecto vienen activados. Si la versión del SDK es anterior, se usa `sendDefaultPii: false`. Además, `beforeSend` borra `user`, `request.cookies`, `request.headers` y pasa una expresión regular sobre `message`, `exception.values[].value` y `breadcrumbs` que sustituye emails, NIF/NIE/CIF (`[0-9XYZ]\d{7}[A-Z]`, `[A-HJ-NP-SUVW]\d{7}[0-9A-J]`), IBAN (`ES\d{22}`) y números de más de 4 cifras por `[filtrado]` |
| Importes, descripciones de movimientos, nombres de categorías, casillas fiscales | No se adjuntan cuerpos de petición ni respuestas (`request.data` se borra); las *breadcrumbs* de `fetch`/`xhr` guardan solo método, ruta sin query y código; las de consola se desactivan |
| Tokens (JWT, refresh, enlaces de verificación) | La URL se recorta a la ruta (`/reset-password`), sin `?` ni `#`, como ya hace `client.routes.ts`; se borra el encabezado `Authorization` |
| IP del usuario | En Sentry: «Prevent storing of IP addresses» en el proyecto y `sendDefaultPii: false`; en el servidor no se reenvía `X-Forwarded-For` |
| Repetición de sesiones (Session Replay) y perfiles | **Desactivados** (`replaysSessionSampleRate: 0`, sin la integración de Replay) |
| Id de usuario | Opcional y solo con un hash no reversible (HMAC con una clave del servidor), para contar «usuarios afectados» sin identificarlos. Recomendado: no enviarlo al principio |

Además, en Sentry: «Data Scrubber» y «Use Default Scrubbers» activados, y retención la mínima del plan.

### 1.7 Integración (🤖, S para cada lado)

**Frontend** (`@sentry/react`, carga diferida):

1. Variable `VITE_SENTRY_DSN` opcional en `frontend/.env.production` (el DSN de Sentry es público por diseño, como el id de Google). Sin ella, `errorReporting.ts` sigue como hoy.
2. En `core/monitoring/errorReporting.ts`: si hay DSN, `import('@sentry/react')` tras el primer render (no engorda el chunk de entrada), `Sentry.init({ dsn, environment, release: <versión de package.json>, dataCollection: {…todo desactivado, ver §1.6}, tracesSampleRate: 0, beforeSend: scrub, beforeBreadcrumb: scrubBreadcrumb })`. El `ErrorBoundary` y los oyentes `error`/`unhandledrejection` llaman a `Sentry.captureException`.
3. Subir los *source maps* en la CI (`@sentry/vite-plugin` con `SENTRY_AUTH_TOKEN` como secreto de GitHub) y **no** publicarlos en `dist/` (borrarlos tras subirlos).
4. Capacitor Android: el mismo SDK web dentro del WebView basta; el nativo (`@sentry/capacitor`) solo si se ven cierres nativos en Play Console.
5. CSP: añadir `https://*.ingest.de.sentry.io` a `connect-src` en `deploy/Caddyfile` (o usar el `tunnel` de Sentry por `/api/monitoring` para no tocar la CSP y no exponer el DSN a bloqueadores).

**Backend** (`@sentry/node`):

1. Variable `SENTRY_DSN` opcional en `deploy/.env` (y en `env.ts` con zod). Sin ella, no se carga.
2. `Sentry.init` al principio de `main.ts` con el mismo `beforeSend`; `Sentry.setupExpressErrorHandler(app)` antes del manejador de errores de `http/middleware.ts`; capturar solo errores 5xx (los 4xx de negocio no).
3. Capturar también los fallos de las tareas programadas (`[digest]`, `[push]`, copias) que hoy solo van a `console.error`.
4. `/api/client-errors` se mantiene como respaldo cuando no hay DSN.

**Pruebas que deben existir:** un test unitario de `scrub()` con un evento que contiene un email, un NIF, un IBAN, un importe y un token en la URL, y que comprueba que no queda ninguno; un test de que sin DSN no se importa el SDK.

### 1.8 Logs estructurados y rotación

- 🤖 (S-M) Sustituir `console.*` por un registrador JSON pequeño (`pino`, o una función propia de 30 líneas) con: `time`, `level`, `msg`, `reqId`, `route` (la plantilla, p. ej. `/api/months/:year/:month`, nunca la URL con datos), `status`, `ms`. **Sin IP, sin query, sin cuerpo, sin userId** (o con su hash si hiciera falta). Lista de campos prohibidos con `redact` (`authorization`, `cookie`, `password`, `token`, `email`).
- 🤖 Un log de acceso mínimo de la API solo para 5xx y para peticiones de más de 1 s (sirve para alertas y no guarda datos).
- La rotación ya está: `json-file` con 3 × 10 MB por servicio (`deploy/docker-compose.yml`). Si se quiere prometer días en la política (duda 9 del resumen legal), 👤/🤖 pasar a `journald` con `MaxRetentionSec=30day` y `SystemMaxUse=500M` en `/etc/systemd/journald.conf`.
- **Hecho cuando:** `docker compose logs api | head` muestra líneas JSON y un `grep -E '@|ES[0-9]{22}'` sobre una hora de logs no devuelve nada.

### 1.9 Métricas básicas y alertas del servidor

Un sistema completo (Prometheus + Grafana, Netdata) gasta cientos de MB: no compensa en 4 GB. En su lugar:

1. 🤖 (S) Script `deploy/scripts/vitals.sh`, por cron cada 5 minutos, que mide y avisa a un check de Healthchecks.io (`/fail` con el detalle en el cuerpo si algo supera el umbral; ping normal si todo va bien):

| Medida | Cómo | Umbral de alerta |
|---|---|---|
| Disco `/` | `df --output=pcent /` | > 85 % |
| Disco de Docker | `docker system df` | imágenes colgantes > 5 GB |
| RAM disponible | `MemAvailable` de `/proc/meminfo` | < 300 MB durante 2 lecturas |
| Swap usada | `/proc/meminfo` | > 50 % |
| Carga | `/proc/loadavg` | > 2 × núcleos durante 15 min |
| Memoria por contenedor | `docker stats --no-stream --format` | > 85 % de su `mem_limit` |
| Estado de los contenedores | `docker inspect --format '{{.State.Health.Status}}'` | distinto de `healthy` |
| Reinicios | `docker inspect --format '{{.RestartCount}}'` | sube respecto a la lectura anterior (OOM o fallo) |
| Tamaño de la BD y del WAL | `stat` de `money-manager.db` y `money-manager.db-wal` en el volumen `api_db` | WAL > 64 MB (el *checkpoint* no está funcionando) |
| Copia local de hoy | Edad del `money-manager-*.db` más nuevo de `api_backups` | > 26 h |
| Errores 5xx | `docker compose logs --since 5m api` y contar `"status":5` | > 10 en 5 min |

2. 👤 En la consola de Hetzner: activar las alertas de CPU y de disco del servidor (gratis) y ver allí las gráficas de CPU, disco y red. Hetzner no mide la RAM: la mide el script.
3. 🤖 Añadir al resumen semanal del dueño (§3) una línea con el máximo de RAM, disco y WAL de la semana (el script guarda la última lectura en `/var/lib/finanverso/vitals.json`).
4. **Fallo de la copia:** ya avisa `offsite-backup.sh`. 🤖 Añadir un segundo check «copia local escrita» (lo cubre la fila «Copia local de hoy») y la prueba mensual de restauración como recordatorio en Healthchecks.io con periodo de 31 días (el dueño la marca a mano con un `curl` tras hacerla).

### 1.10 Plan del bloque 1

| # | Tarea | Quién | Esfuerzo | Depende de | Hecho cuando |
|---|---|---|---|---|---|
| 1.1 | Crear la cuenta de UptimeRobot Free con el correo de la marca y los 5 monitores de §1.2 | 👤 (con una guía paso a paso del agente) | 30 min | — | Al pausar el servidor de prueba llega el email |
| 1.2 | Crear el bot de Telegram y conectarlo con Healthchecks.io | 👤 | 20 min | — | Mensaje de prueba recibido |
| 1.3 | Página de estado en `status.finanverso.app` | 👤 + 🤖 (enlace) | 30 min | 1.1 | Página pública visible |
| 1.4 | `vitals.sh` + check de Healthchecks.io + cron + documentación | 🤖 (código) + 👤 (instalar el cron, ver `deploy/RESTORE.md`) | S | — | Con `THRESHOLD_DISK=1` forzado en una ejecución manual llega la alerta |
| 1.5 | Cuenta de Sentry en región UE, proyecto web y API, scrubbing del servidor activado, IP desactivada | 👤 | 30 min | — | DSN en mano |
| 1.6 | Integración de Sentry (frontend y backend) con `beforeSend` y tests | 🤖 | S-M | 1.5 (solo para probar en real) | Un error de prueba (`/api/debug-sentry` solo en desarrollo) aparece en Sentry sin email, IP ni importes |
| 1.7 | Logs JSON con `redact` | 🤖 | S-M | — | Comprobación de §1.8 |
| 1.8 | Procedimiento «qué hacer con cada alerta» | 🤖 | S | 1.1-1.4 | Archivo en `deploy/` |

---

## 2. Límites de memoria y endurecimiento de Docker

### 2.1 Qué hay hoy

`deploy/docker-compose.yml` tiene `restart: unless-stopped`, logs limitados (3 × 10 MB) y healthcheck en la API y la web (en los Dockerfile). **No tiene** límites de memoria, CPU ni procesos, ni `no-new-privileges`, ni `cap_drop`, ni sistema de ficheros de solo lectura. La API corre como usuario `node` (bien); Caddy y nginx como `root` dentro del contenedor.

Medido en el informe de calidad: la API usa **196 MB** tras la prueba de carga (10.600 movimientos, 20 clientes a la vez). Node no tiene `--max-old-space-size`, así que su montón puede crecer hasta lo que crea que tiene la máquina.

### 2.2 Valores propuestos para un servidor de 4 GB

Reparto: unos 2 GB para los contenedores, el resto para el sistema, la caché de disco de SQLite (muy importante para su rendimiento), las compilaciones de `deploy.sh` y un margen.

| Servicio | `mem_limit` | `mem_reservation` | `cpus` | `pids_limit` | Notas |
|---|---|---|---|---|---|
| `api` | **1g** | 384m | 1.5 | 256 | `NODE_OPTIONS=--max-old-space-size=640` (el montón de V8 se queda por debajo del límite y Node lanza un error controlado en vez de que el kernel lo mate). bcrypt va en `worker_threads`: cuentan dentro del mismo límite |
| `caddy` | 256m | 64m | 1.0 | 128 | |
| `web` (nginx) | 128m | 32m | 0.5 | 64 | Solo sirve ficheros estáticos |
| (opcional) `glitchtip` + `postgres` | 512m + 256m | 192m + 96m | 0.5 + 0.5 | 128 + 128 | Solo si se decide alojar los errores en el propio servidor (§1.5). En ese caso, bajar la API a 896m |

Para todos:

```yaml
x-hardening: &hardening
  restart: unless-stopped
  security_opt:
    - no-new-privileges:true
  cap_drop: [ALL]
  logging: *default-logging
```

| Servicio | Capacidades que necesita | Solo lectura (`read_only: true`) | `tmpfs` |
|---|---|---|---|
| `api` | Ninguna (`cap_drop: [ALL]`) | Sí | `/tmp:size=64m` (los volúmenes `/data` y `/backups` siguen siendo escribibles) |
| `caddy` | `cap_add: [NET_BIND_SERVICE]` (escucha en 80 y 443) | Sí | `/tmp:size=16m` (`/data` y `/config` son volúmenes) |
| `web` | Con la imagen `nginx:alpine`: `CHOWN`, `SETUID`, `SETGID`, `NET_BIND_SERVICE`. Mejor: cambiar a `nginxinc/nginx-unprivileged:1.27-alpine`, que escucha en el 8080 sin root y no necesita ninguna (y Caddy apunta a `web:8080`) | Sí | `/var/cache/nginx`, `/var/run`, `/tmp` (16m cada uno) |

Healthcheck en el compose (además del de los Dockerfile) para Caddy: `wget -qO- http://127.0.0.1:2019/config/ >/dev/null` (la API de administración de Caddy, que solo escucha dentro del contenedor).

`depends_on` ya espera a que la API esté sana. `stop_grace_period: 15s` en la API se mantiene (la parada ordenada cierra SQLite).

### 2.3 Swap

Los servidores de Hetzner Cloud vienen sin swap. 👤 (o 🤖 con un script que el dueño ejecuta) crear 2 GB de swap como red de seguridad, no como memoria de trabajo:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf && sysctl --system
```

Con `mem_limit` y sin `memswap_limit`, Docker permite a cada contenedor usar como swap otro tanto como su límite; para que la API no se arrastre usando swap, poner `memswap_limit` igual a `mem_limit` en la API (sin swap para ella: mejor un reinicio rápido que una API lentísima).

### 2.4 Cómo medir antes de fijar los valores

1. 🤖/👤 Durante 7 días, `vitals.sh` (§1.9) guarda el máximo de `docker stats` por contenedor. Hoy se espera: API 150-250 MB, Caddy 30-60 MB, nginx 5-15 MB.
2. Límite = el doble del pico observado, redondeado, y nunca menos de lo de la tabla de §2.2 para la API (las importaciones de 5.000 filas y la exportación de 2 MB generan picos).
3. Reproducir en local el peor caso: la pila de pruebas del informe de calidad (anexo) con `mem_limit: 512m` en la API, importar 5.000 filas dos veces, exportar, y 20 clientes a la vez sobre `/months`. Si no hay `OOMKilled` (`docker inspect --format '{{.State.OOMKilled}}'`) con 512m, 1g tiene margen de sobra.

### 2.5 Cómo aplicarlo sin tirar producción

1. 🤖 Cambiar `deploy/docker-compose.yml` en una rama y validar en la CI con `docker compose -f deploy/docker-compose.yml config -q` y un arranque completo en el runner (`docker compose up -d` con un `.env` de prueba, esperar a `healthy` y hacer `curl` a `/api/health` a través de Caddy en HTTP local).
2. 👤 Probar los límites **en caliente** antes de desplegar, sin recrear nada: `docker update --memory 1g --memory-swap 1g --cpus 1.5 --pids-limit 256 <contenedor_api>` (lo mismo para Caddy y web). Se deshace con otro `docker update`. Si en 48 h no hay reinicios ni alertas, desplegar el compose.
3. El despliegue recrea los tres contenedores (unos segundos sin servicio): hacerlo a una hora de poco tráfico (p. ej. 07:00 un martes) y con el monitor de §1.2 mirando.
4. **Vuelta atrás:** `git revert` del commit y `deploy.sh`, o `docker update` con límites altos.

### 2.6 Plan del bloque 2

| # | Tarea | Quién | Esfuerzo | Depende de | Hecho cuando |
|---|---|---|---|---|---|
| 2.1 | Medir picos 7 días | 🤖 (script) + 👤 (instalar) | S | 1.4 | Hay máximos por contenedor anotados |
| 2.2 | Swap de 2 GB y `swappiness` | 👤 (comandos de §2.3) | 15 min | — | `swapon --show` muestra 2G |
| 2.3 | Compose con límites, `no-new-privileges`, `cap_drop`, `read_only`, `tmpfs`, `NODE_OPTIONS` y prueba en la CI | 🤖 | S | 2.1 | CI en verde; `docker inspect` muestra `Memory=1073741824` en la API |
| 2.4 | (Opcional) nginx sin root (`nginx-unprivileged`, puerto 8080) | 🤖 | S | 2.3 | `docker compose exec web id -u` ≠ 0 |
| 2.5 | Prueba en caliente con `docker update` y despliegue | 👤 | 30 min | 2.3 | 48 h sin reinicios; `RestartCount` igual |
| 2.6 | Prueba de estrés con OOM forzado en local (límite de 256m) para ver que el contenedor se reinicia solo y el monitor avisa | 🤖 | S | 2.3, 1.1 | Reinicio automático y alerta recibida |

---

## 3. Analítica real respetuosa con la privacidad

### 3.1 Qué hay hoy

- **Contadores diarios anónimos** en la tabla `metrics` (día, nombre, número; sin usuario): `signup`, `email_verified`, `checkout_started`, `purchase`, `ai_analysis`, `ai_question`, `import_done`, `referral_joined`, `household_joined` y `signup:<origen>` (`backend/src/domain/ports/services.ts:195`). Se leen con `npm run stats`.
- **Origen del alta:** `frontend/src/core/acquisition.ts` lee solo `utm_source` (o el dominio que enlaza) y lo guarda en `localStorage` (`mm_acq`) **antes del registro y sin consentimiento**; al iniciar sesión se envía a `POST /api/acquisition` y se suma a `signup:<origen>`.
- **Problemas:** el informe del 14-10 no encontró datos útiles en producción; no hay embudo ni cohortes (los contadores no se pueden cruzar entre sí); no se sabe qué campaña o vídeo trae usuarios que **pagan**; `mm_acq` puede chocar con el art. 22.2 de la LSSI (duda 2 del resumen legal).

### 3.2 Qué medir

| Pregunta | Métrica | Fuente propuesta |
|---|---|---|
| ¿Cuánta gente llega? | Visitas y visitantes por página, origen y campaña | Analítica web sin cookies (§3.3) |
| ¿Cuántos se registran y verifican? | Altas, verificaciones, % de verificación | `metrics` (ya existe) |
| ¿Se activan? | % que completa los primeros pasos (3 movimientos, 1 presupuesto, 1 meta, 1 automatización) en 7 días; % que importa un extracto; % que usa Renta o Autónomos | Informe por cohortes desde la base de datos (§3.4) |
| ¿Vuelven? | Retención D1, D7, D30 por semana de alta | `users.last_active_day` (nuevo, §3.4) |
| ¿Pagan? | % de la prueba de 14 días que pasa a Premium; ingreso por cohorte; bajas | `subscriptions` (ya existe) |
| ¿Qué funciones se usan? | Usos por función y semana: importación, IA, Renta, Autónomos (130/303/390…), inversiones, hogar, gastos divididos, recordatorios | Contadores nuevos en `metrics` |
| ¿Qué campaña funciona? | Todo lo anterior **por campaña** (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`) | Campaña guardada en la cuenta (§3.5) |
| ¿Funcionan las invitaciones? | Invitaciones enviadas, altas por invitación, invitados que completan los pasos, meses regalados | `referrals` (ya existe) |

### 3.3 Herramientas para las visitas: comparativa

| Opción | Cookies | Coste | Dónde | Eventos y embudos | Recursos | Encaje |
|---|---|---|---|---|---|---|
| **Contadores propios** (lo que hay, ampliado) | No | 0 € | Servidor propio | Sí, a medida | Ninguno | **Sí, para el producto** |
| **Cloudflare Web Analytics** | No (sin cookies ni huella, según Cloudflare) | 0 € | Cloudflare (ya es encargado) | Solo páginas, orígenes y rendimiento; no eventos ni UTM detallados | Ninguno (un script) | **Sí, para las visitas, gratis** |
| **Plausible Cloud** | No | Starter: 9 $/mes por 10.000 páginas vistas (objetivos, eventos y UTM). **Los embudos solo están en Business**, a 19 $/mes | UE (Alemania) | Eventos y UTM; embudos solo en Business | Ninguno | La mejor opción de pago para la web |
| **Plausible CE auto-alojado** | No | 0 € | Servidor propio | Sin embudos | ClickHouse: al menos 2 GB de RAM recomendados | No en 4 GB |
| **Umami Cloud** | No | Hobby gratis: 100.000 eventos al mes, 1 web, 6 meses de retención, **con eventos y embudos** | Servidores en EE. UU. y en la UE (NO VERIFICADO si se puede elegir la región) | Eventos, embudos y UTM | Ninguno | Buena opción gratuita si se confirma la región UE |
| **Umami auto-alojado** | No | 0 € | Servidor propio | Igual | PostgreSQL 12 o superior: unos cientos de MB (NO VERIFICADO) | Posible, pero añade una base de datos |
| **PostHog Cloud EU** | Por defecto sí (se puede configurar sin cookies) | Gratis hasta 1 M de eventos al mes | UE (Fráncfort) | Muy completo: embudos, cohortes, grabaciones | Ninguno | Excesivo y con más riesgo (grabaciones, perfiles): exige consentimiento |
| **Matomo auto-alojado** | Configurable sin cookies | 0 € | Servidor propio | Completo | 2 CPU y 2 GB de RAM para menos de 100.000 visitas | No en 4 GB |
| **GoatCounter** | No | Gratis con un «uso razonable» | Su nube o servidor propio | Páginas y eventos simples, sin embudos | Ligero | Alternativa minimalista |

**Recomendación:**

1. **Visitas de la web pública:** Cloudflare Web Analytics, que es gratis, no usa cookies y su proveedor ya figura en la política. Si el dueño quiere ver los UTM de la landing con una buena interfaz, la alternativa es Plausible Starter, a 9 $/mes.
2. **Producto (registro → Premium, retención, funciones):** en el propio servidor, con los contadores ampliados y un informe de cohortes. Nada de datos de uso sale a terceros.
3. **No** usar Google Analytics ni el píxel de Meta o TikTok: obligarían a un banner de consentimiento y a transferencias.

### 3.4 Esquema propuesto (🤖)

**Contadores nuevos en `metrics`** (anónimos, como hoy; añadir al tipo `MetricName`):

| Nombre | Cuándo |
|---|---|
| `getting_started_done` | El usuario completa los 4 primeros pasos |
| `trial_converted` / `trial_expired` | Fin de la prueba con o sin pago |
| `subscription_cancelled` | Baja de Premium (webhook) |
| `renta_draft_read`, `renta_result` | Lee un borrador / llega al resultado del asistente |
| `autonomo_quarter:<modelo>` | Genera un borrador del 130, 303, 111, 115… |
| `invest_import` | Importa un fichero de bróker (solo se cuenta; el fichero no sale del dispositivo) |
| `reminder_sent:<canal>`, `reminder_opened` | Recordatorios de plazos (§4) |
| `invite_sent` | Se comparte un código de invitación |

**Columnas nuevas** (migración nueva; datos personales del propio usuario, base: interés legítimo, ver §5):

| Tabla | Columna | Valor | Para qué |
|---|---|---|---|
| `users` | `last_active_day` | `YYYY-MM-DD`, se actualiza como mucho una vez al día al renovar la sesión | Retención (D1, D7, D30) sin registrar cada visita |
| `users` | `acq_source`, `acq_medium`, `acq_campaign`, `acq_content` | Texto corto saneado (`[a-z0-9._-]{1,40}`) | Embudo y conversión por campaña o vídeo |
| `users` | `getting_started_at` | Fecha | Tiempo hasta la activación |

**Informe semanal al dueño** (🤖, `npm run stats -- --cohorts` y un correo los lunes a la dirección de la marca, con cifras agregadas y **solo celdas con 5 o más personas**, para que nadie sea identificable):

```
Semana de alta | Altas | Verificados | Primeros pasos 7d | Activos D7 | Activos D30 | Premium | Por campaña (top 5)
```

Panel: el mismo informe en una página `/admin/stats` protegida (solo el email del dueño, con 2FA obligatorio), o simplemente el correo semanal. Recomendado empezar por el correo: no hay superficie nueva que proteger.

### 3.5 Origen (UTM) y vídeos de TikTok e Instagram

1. **Enlaces** (👤 al publicar cada vídeo; 🤖 un generador en `docs/marketing/`):
   `https://finanverso.app/?utm_source=tiktok&utm_medium=video&utm_campaign=renta2026&utm_content=v041`
   - `utm_source`: `tiktok`, `instagram`, `youtube`, `reddit`, `newsletter`…
   - `utm_medium`: `video`, `bio`, `story`, `comentario`.
   - `utm_campaign`: el tema (`renta2026`, `autonomos-303`, `ahorro`).
   - `utm_content`: un código corto del vídeo (`v041`), apuntado en una hoja del dueño junto al enlace del vídeo. **Nunca** el id de vídeos Premium no listados.
   - En TikTok e Instagram el enlace va en la bio o en un *link-in-bio*: usar una página propia `finanverso.app/enlaces?utm_source=tiktok&utm_medium=bio` con un botón por vídeo, cada uno con su `utm_content`.
2. **Captura** (🤖): `acquisition.ts` lee los cuatro parámetros (hoy solo `utm_source`).
3. **Sin almacenamiento antes del consentimiento** (🤖, recomendado): guardar el origen **solo en memoria** (en el estado de la SPA) mientras dura la visita, y enviarlo con el registro, en un campo `acquisition` opcional de `POST /auth/register`, en lugar de en `localStorage`.
   - **Coste:** si la persona se va y vuelve otro día, ese origen se pierde. Es el precio de no necesitar banner.
   - **Alternativa:** mantener `mm_acq` en `localStorage`. En cuanto el origen se asocia a la cuenta (columnas `acq_*`), ya no es una simple medición de audiencia y exige consentimiento previo (ver §3.6).
4. **Al registrarse:** se guarda en las columnas `acq_*` de la cuenta y se suma el contador `signup:<source>`. Se informa en la política (apartado 2 y 3) y se borra con la cuenta.

### 3.6 Cumplimiento (ePrivacy, LSSI y AEPD)

- **Art. 22.2 LSSI:** cualquier dato que se guarde o se lea en el dispositivo del usuario necesita su consentimiento informado, salvo que sea **estrictamente necesario** para el servicio que pide o para la transmisión. La norma habla de «dispositivos de almacenamiento y recuperación de datos», así que alcanza a las cookies, `localStorage`, `sessionStorage` e IndexedDB.
  - La [Guía sobre el uso de las cookies de la AEPD](https://www.aepd.es/guias/guia-cookies.pdf) (actualizada en julio de 2023; la versión vigente del PDF es de mayo de 2024) la aplica a las «cookies y tecnologías similares».
- **Excepción para medir audiencia.** La guía complementaria [«Uso de cookies para herramientas de medición de audiencia»](https://www.aepd.es/guias/guia-cookies-analiticas-externas.pdf) (2024) **exime del consentimiento** la analítica que cumpla todas estas condiciones:
  - se limita a medir la audiencia del propio sitio o app;
  - produce estadísticas anónimas y agregadas;
  - se hace por cuenta exclusiva del editor;
  - no cruza los datos con otros tratamientos, no los cede y no sigue al usuario entre sitios;
  - se informa en la política;
  - si interviene un proveedor, hay un contrato del art. 28 que le prohíbe reutilizar los datos.
  
  Los embudos por usuario, las grabaciones o la vinculación con la cuenta **no** entran en la excepción. La redacción literal no se pudo extraer del PDF: ver Anexo B.
- **Lo que ya guarda la app** (sesión, preferencias, borradores, Renta y Autónomos en el dispositivo) es estrictamente necesario para las funciones que pide el usuario, así que no necesita banner.
- **`mm_acq`** podría encajar en la excepción de medición de audiencia mientras siga siendo un contador anónimo, como hoy. **Deja de encajar** si el origen se guarda en la cuenta (§3.4). Por eso se recomienda llevarlo en memoria (§3.5): así no hay ninguna duda.
- **Cloudflare Web Analytics y Plausible** no guardan nada en el dispositivo y no necesitan banner. Sí hay que citarlos en la política (proveedor y finalidad) y tener el DPA.
- La analítica del servidor sobre los datos de la cuenta (`last_active_day`, `acq_*`) se basa en el **interés legítimo** (art. 6.1.f RGPD) con una ponderación escrita (§5.2) y derecho de oposición.
- **Hecho cuando:** en un navegador limpio, abrir la landing con `?utm_source=test` y comprobar en DevTools → Application que no hay **ninguna** clave nueva en `localStorage` ni cookies antes de registrarse.

### 3.7 Plan del bloque 3

| # | Tarea | Quién | Esfuerzo | Depende de | Hecho cuando |
|---|---|---|---|---|---|
| 3.1 | Decidir: `mm_acq` fuera (recomendado) o banner; guardar campaña en la cuenta (sí/no) | 👤 | 15 min | — | Decisión anotada en este documento |
| 3.2 | `acquisition.ts` con los 4 UTM, solo en memoria, enviado con el registro; columnas `acq_*` y `last_active_day` (migración nueva) | 🤖 | S | 3.1 | Test de §3.6 y test de integración del registro con campaña |
| 3.3 | Contadores nuevos de §3.4 | 🤖 | S | — | Aparecen en `npm run stats` |
| 3.4 | Informe de cohortes y correo semanal al dueño (umbral de 5) | 🤖 | M | 3.2, 3.3 | Correo de prueba en local con la base de demo |
| 3.5 | Cloudflare Web Analytics (o Plausible) en las páginas públicas y política actualizada | 👤 (activar en el panel) + 🤖 (script, CSP, política s4 y s8) | S | — | Visitas visibles en el panel al día siguiente |
| 3.6 | Página `/enlaces` y convención de UTM en `docs/marketing/` | 🤖 + 👤 (hoja de vídeos) | S | 3.2 | Un vídeo publicado con su enlace y su alta contada |

---

## 4. Recordatorios de plazos fiscales

### 4.1 Qué hay hoy

- **Push web** con VAPID y **notificaciones locales** de Capacitor: avisos de cobros automáticos para mañana y resumen del lunes (`backend/src/application/push/ReminderService.ts`, `frontend/src/core/notifications/notifications.ts`). Se envían cada hora entre las 07 y las 11 UTC y cada aviso solo una vez (tabla `push_log`).
- **Resumen semanal por email** opcional con consentimiento (`user_settings.weekly_digest`).
- **Fechas fiscales en el código:** `deadlinesFor()` y `businessDay()` en `backend/src/domain/services/autonomo.ts:354-395` (303, 130, 111, 115, 349, 390, 190, 347) y `campaignFor()` en `frontend/src/modules/tools/domain/rentaCampaign.ts` (Renta 2025 confirmada; los años siguientes se estiman y se marcan como no confirmados).
- **Falta:** avisos de plazos (lo dice el informe de calidad, §D), y que `businessDay()` tenga en cuenta los festivos nacionales (hoy solo salta sábados y domingos).

### 4.2 Diseño de producto

**Perfil fiscal** (en Ajustes → «Avisos de Hacienda»; se rellena solo con lo que la app ya sabe y el usuario lo corrige):

| Perfil | Modelos y plazos que se avisan |
|---|---|
| Asalariado o pensionista | Renta (inicio de campaña, fin de la domiciliación, último día), 714 si aplica |
| Autónomo en estimación directa | 303 y 130 trimestrales; 390 anual; Renta |
| … con trabajadores o profesionales a los que retiene | 111 trimestral y 190 anual |
| … con local alquilado con retención | 115 trimestral y 180 anual |
| … con operaciones intracomunitarias | 349 (trimestral o mensual) |
| … con operaciones con terceros de más de 3.005,06 € | 347 (febrero) |
| … en módulos | 131 trimestral (y 303 simplificado) |
| Con bienes o criptomonedas en el extranjero | 720 / 721 (1 de enero-31 de marzo), solo si el usuario marca que supera los umbrales |
| Con patrimonio alto | 714 con la Renta |

**Avisos:**

- **7 días antes** («Te quedan 7 días para el 303 y el 130 del 3T. Fin: martes 20 de octubre») y **2 días antes**. El día límite, solo si no ha marcado «ya lo presenté».
- **Domiciliación:** aviso aparte del último día para domiciliar (5 días antes del fin en los trimestrales; en la Renta, el día que fije la AEAT, en 2026 fue el 25 de junio).
- Botón **«Ya lo presenté»** en el aviso y en la pantalla del trimestre: no vuelve a avisar de ese modelo y periodo.
- Enlace profundo a la pantalla del trimestre en la app (borrador del 303/130) o a la ficha del modelo en la sede.
- Texto siempre orientativo: «Plazo según el calendario de la AEAT. Compruébalo en la sede.»

**Canales:**

| Canal | Cuándo | Consentimiento |
|---|---|---|
| Notificación local (app Android/iOS con Capacitor) | Programada en el dispositivo; funciona sin conexión | Permiso del sistema + interruptor en Ajustes |
| Push web (navegador y PWA instalada) | Desde el servidor, por `ReminderService` | Permiso del navegador + interruptor |
| Email | Opcional, desde el servidor con Resend: 3.000 correos al mes y 100 al día gratis, y se puede usar la región UE `eu-west-1` | **Casilla propia** (consentimiento, art. 6.1.a), desactivada por defecto; enlace de baja en cada correo y cabecera `List-Unsubscribe` de un clic |

**Hora y zona:** a las **09:00 de Europe/Madrid** (Canarias recibe a las 08:00 de su hora; aceptable, o usar la zona del dispositivo en las notificaciones locales). El servidor hoy usa una ventana en UTC: cambiar a `Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid' })` para que el cambio de hora no lo mueva.

**Gratis o Premium:** recomendación: **los avisos de plazos, gratis para todos** (retienen y traen a la gente de vuelta en cada trimestre, que es cuando ve el valor de Premium). Premium añade el **importe estimado** en el aviso («tu 303 sale a ingresar unos 412 €»: el importe solo en la notificación local o en la app; **nunca en el email ni en el push del servidor** sin cifrar, que pasan por terceros) y el aviso de domiciliación.

### 4.3 Calendario oficial 2026-2027 (datos)

Regla general: si el último día cae en sábado, domingo o festivo nacional, pasa al siguiente día hábil. Las fechas «confirmadas» salen del calendario del contribuyente de la AEAT; las de 2027 se publicarán a finales de 2026 (ver Anexo B).

| Periodo | Modelos | Plazo | Domiciliación hasta | Estado |
|---|---|---|---|---|
| 3T 2026 | 303, 130, 131, 111, 115, 349, (123, 136, 216) | 1-20 de octubre de 2026 (martes 20) | 15 de octubre | Confirmado en el calendario 2026 |
| Renta 2025 fraccionada | 102 (2.º plazo) | Hasta el 5 de noviembre de 2026 | 2 de noviembre | Confirmado |
| Octubre 2026 (mensuales) | 303/111/115 mensuales (grandes empresas, REDEME) | 1-20 de noviembre (viernes 20) | 15 de noviembre | Fuera del alcance de la app |
| 4T 2026 | 111, 115, 123 | 1-20 de enero de 2027 (miércoles 20) | 15 de enero | Previsto (calendario 2027 pendiente) |
| 4T 2026 y anuales | 303, 130 y 131 del 4T, 390, 349 del 4T | 1-30 de enero de 2027. **El 30-01-2027 es sábado: previsiblemente hasta el lunes 1-02-2027** | En 2026, del 1 al 27 de enero para un plazo que acababa el 30. Para 2027, previsiblemente hasta el 27 de enero (NO VERIFICADO) | Previsto |
| Anual 2026 | 190, 180, 193 | 1-31 de enero de 2027. **El 31-01 es domingo: previsiblemente lunes 1-02-2027.** En 2026 se movió igual, al 2-02 | — | Previsto |
| Anual 2026 | 347 | 1-28 de febrero de 2027. **El 28-02 es domingo: previsiblemente lunes 1-03-2027.** En 2026 se movió al 2-03 (NO VERIFICADO en la AEAT) | — | Previsto |
| 2026 | 720 y 721 | 1 de enero-31 de marzo de 2027 (miércoles 31) | — | Previsto |
| 1T 2027 | 303, 130, 131, 111, 115, 349 | 1-20 de abril de 2027 (martes 20) | 15 de abril | Previsto |
| Renta y Patrimonio 2026 | 100, 714 | Previsto, siguiendo el patrón de 2026: del 7-8 de abril al miércoles 30 de junio de 2027 | Viernes 25 de junio | **No publicado.** Las fechas salen con la Orden del modelo 100. En 2026: proyecto en información pública el 26-01-2026 y Orden HAC/277/2026, de 25 de marzo, en el BOE del 27 de marzo. Campaña del 8 de abril al 30 de junio, con domiciliación hasta el 25 de junio |
| 2T 2027 | 303, 130, 111, 115, 349 | 1-20 de julio de 2027 (martes 20) | 15 de julio | Previsto |
| 3T 2027 | 303, 130, 111, 115, 349 | 1-20 de octubre de 2027 (miércoles 20) | 15 de octubre | Previsto |

**Cómo se actualiza** (🤖, tarea anual de §6.6):

1. Las fechas pasan de estar **calculadas** a ser **datos**: `fiscal-calendar/<año>.json` con cada plazo, su fuente (URL del calendario del contribuyente) y `checkedOn`. `deadlinesFor()` y `campaignFor()` leen primero el fichero del año; si no existe, calculan con la regla general **y los festivos nacionales** y marcan el plazo como «previsto».
2. En diciembre (cuando la AEAT publica el calendario del año siguiente) y en marzo (cuando sale la Orden de la Renta), un agente compara el fichero con la sede y abre un PR. La app muestra «previsto» hasta entonces.
3. Festivos nacionales: tabla por año (la publica el BOE cada otoño en la Resolución de fiestas laborales). Los festivos autonómicos y locales no se aplican (la presentación es electrónica y la AEAT fija un único calendario estatal; NO VERIFICADO para casos límite: ver Anexo B).

### 4.4 Diseño técnico (🤖)

**Datos y reglas compartidos:** el calendario se usa en el servidor (push, email) y en el dispositivo (notificaciones locales y pantallas). Como el frontend no puede importar el código del servidor, se sigue el patrón de `reta2026.ts`: un JSON por año en el backend como fuente de verdad, una copia en el frontend y un test que compara las dos.

**Backend:**

1. `domain/services/fiscal-calendar.ts`: `obligationsFor(profile, year)` → lista de `{ model, period, start, end, directDebitEnd, confirmed, source }`.
2. `user_settings`: `tax_profile` (JSON con los modelos de §4.2), `tax_reminders_push` (0/1), `tax_reminders_email` (0/1, consentimiento con fecha en `tax_reminders_email_at`).
3. Tabla `tax_filings_done (user_id, model, period, marked_at)` para «ya lo presenté» (se borra con la cuenta).
4. `ReminderService.run()`: nuevo bloque `tax` que, para cada usuario con push o email activo, calcula los plazos a 7 y 2 días y usa `claim(userId, 'tax', '<modelo>-<periodo>-<d7|d2>')` (la misma tabla `push_log`, que ya evita duplicados).
5. Email: plantilla nueva en `mail/templates.ts` con enlace de baja firmado (como el resumen semanal).
6. Contadores `reminder_sent:push|email` (§3.4).

**Frontend y app nativa:**

1. Pantalla de Ajustes «Avisos de Hacienda» con el perfil, los canales y la vista de los próximos plazos.
2. App nativa: al abrir la app y al cambiar el perfil, reprogramar con `LocalNotifications.schedule` los avisos de los **próximos 90 días** (ids reservados 2000-2999). En iOS el sistema guarda como mucho 64 notificaciones pendientes: con 90 días y 2 avisos por plazo sobran.
3. Android 13 o posterior: pedir `POST_NOTIFICATIONS` en el momento en que el usuario activa los avisos, no al abrir la app.
   - Para avisar con días de antelación **no hace falta `SCHEDULE_EXACT_ALARM`**: basta una notificación inexacta hacia las 09:00. Sin ese permiso, Capacitor programa la alarma como inexacta y lo indica en `ScheduleResult.warning`.
   - Si el usuario revoca ese permiso, Android reinicia la app y **borra las notificaciones exactas**. Hay que reprogramarlas siempre al abrir la app.
   - No usar `USE_EXACT_ALARM`, porque Google Play solo lo admite en apps de alarma o calendario.
4. Web: pedir permiso de push solo tras un gesto del usuario (botón «Activar avisos»).

**iPhone y PWA:**

- **Requisitos del push web en iOS:**
  - iOS o iPadOS 16.4 o posterior.
  - La web **añadida a la pantalla de inicio**, con un manifest con `display: standalone` (ya lo tiene la PWA).
  - El permiso se pide **tras un gesto directo** del usuario.
  - La CSP y el servicio de push deben permitir `*.push.apple.com`.
  
  En Safari, sin instalar la web, no hay push.
- **En la UE:** con la beta de iOS 17.4 (febrero de 2024, por la DMA), Apple quitó las PWA y su push, y el 1-03-2024 dio marcha atrás. Hoy funcionan y no se han encontrado cambios en 2025-2026, pero conviene no depender solo de ellas (ver el Anexo B).
- Mientras no haya app de iOS en la App Store: en iPhone, ofrecer **email** como canal principal y explicar cómo instalar la PWA para recibir avisos («Compartir → Añadir a pantalla de inicio»).
- Cuando se publique la app iOS (Capacitor, `ios/` ya existe), las notificaciones locales funcionan igual que en Android.

**Pruebas:**

- Tests de `obligationsFor` con perfiles y años (2026, 2027) y con plazos que caen en fin de semana o festivo.
- Test de que `ReminderService` no envía dos veces el mismo aviso y respeta la hora de Madrid en el cambio de horario (último domingo de octubre y de marzo).
- Test del frontend: el número de notificaciones programadas nunca supera 60.
- E2E: activar avisos, marcar «ya lo presenté» y ver que desaparece el aviso.

### 4.5 Plan del bloque 4

| # | Tarea | Quién | Esfuerzo | Depende de | Hecho cuando |
|---|---|---|---|---|---|
| 4.1 | Decidir gratis/Premium (recomendado: gratis; importe en Premium) | 👤 | 10 min | — | Decisión anotada |
| 4.2 | `fiscal-calendar` con datos de 2026-2027, festivos nacionales y test de sincronización frontend/backend | 🤖 | S-M | — | `deadlinesFor(2026,4)` da el 303 el 1-02-2027 si el calendario lo confirma, o lo marca «previsto» |
| 4.3 | Perfil fiscal y ajustes (migración, API, pantalla) | 🤖 | M | 4.2 | Un autónomo con 111 ve 4 modelos en sus próximos plazos |
| 4.4 | Push web y email desde `ReminderService` (zona Madrid, `claim`, plantilla con baja) | 🤖 | M | 4.3 | Con el reloj de pruebas a 13-01-2027 se envía el aviso de 7 días del 111 y no se repite |
| 4.5 | Notificaciones locales en Android/iOS | 🤖 | S-M | 4.3 | En el emulador llegan los avisos programados |
| 4.6 | Política de privacidad (canal email de avisos, consentimiento) | 🤖 | S | 4.4 | Texto en `app.privacy.s3` |
| 4.7 | Prueba en su Android y en su iPhone (PWA instalada) | 👤 | 30 min | 4.4, 4.5 | Capturas guardadas |
| 4.8 | Publicar antes del **1-01-2027** (primer aviso real: 13-01-2027 para el 111/115 del 4T) | 👤 (ordena la versión) | — | 4.1-4.7 | Versión en producción |

---

## 5. RGPD formal

> Lo que sigue lo puede preparar un agente con la norma y las guías de la AEPD, pero **no sustituye a un abogado**. Los documentos que exigen firma o aceptación los firma el dueño como responsable del tratamiento. Los contratos firmados y el registro **no se suben al repositorio** (es público): se guardan en una carpeta privada; en el repositorio solo queda la plantilla sin datos personales.

### 5.1 Registro de actividades de tratamiento (art. 30 RGPD)

**Qué exige:** art. 30.1 RGPD: cada responsable lleva un registro con finalidades, categorías de interesados y de datos, destinatarios, transferencias, plazos de supresión y medidas de seguridad. La excepción para menos de 250 empleados (art. 30.5) **no aplica** porque el tratamiento no es ocasional. Art. 31 LOPDGDD: el registro debe estar disponible para la AEPD. La AEPD ofrece la herramienta [Facilita RGPD](https://www.aepd.es/guias-y-herramientas/herramientas/facilita-rgpd) y modelos de registro.

**Estado:** no existe (`docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md`, duda 5). Las finalidades y bases ya están en la política (`app.privacy.s3`) y los proveedores en `app.privacy.s4`.

**Plantilla rellenada con los tratamientos reales** (leídos del código: migraciones `backend/src/infrastructure/sqlite/migrations/001-033`, rutas `http/routes/*`, `frontend/src/core/*` y la política). Responsable: el titular de Finanverso (datos en la política, apartado 1). Contacto: support@finanverso.app.

| # | Actividad | Finalidad | Base jurídica | Interesados | Datos (tablas) | Destinatarios / encargados | Transferencia fuera del EEE | Conservación | Medidas |
|---|---|---|---|---|---|---|---|---|---|
| T1 | Cuentas y acceso | Alta, inicio de sesión, Google, 2FA, recuperación, sesiones | Contrato (6.1.b) | Usuarios | Email, nombre, emoticono, hash de contraseña, id de Google, verificación, 2FA cifrado, códigos de recuperación (hash), tokens de refresco (hash) (`users`, `user_two_factor`, `two_factor_*`, `refresh_tokens`) | Hetzner (alojamiento), Cloudflare (proxy y TLS), Google (si usa «Continuar con Google»), Resend (correos) | Cloudflare, Google, Resend: EE. UU. (DPF/CCT) | Hasta la baja; copias 14 días | bcrypt coste 12, JWT de 15 min, tokens hasheados, AES para el 2FA, límites de intentos, `secure_delete` |
| T2 | Finanzas personales | Llevar movimientos, cuentas, presupuestos, metas, recurrentes, alertas, patrimonio y deudas, importación de extractos | Contrato | Usuarios (y terceros que aparezcan en descripciones de movimientos) | Movimientos e importes, cuentas, categorías y reglas, presupuestos, metas, activos y deudas, alertas (`transactions`, `accounts`, `categories`, `category_rules`, `category_budgets`, `monthly_budgets`, `goals`, `recurring_rules*`, `assets`, `asset_values`, `custom_alerts`, `transfers`, `import_uses`) | Hetzner, Cloudflare | Cloudflare (tránsito) | Hasta la baja; copias 14 días | Aislamiento por `userId` en todas las consultas, validación zod, TLS, copia cifrada en R2 |
| T3 | Hogar compartido y gastos divididos | Compartir datos con otra persona; repartir gastos | Contrato | Usuarios, miembros del hogar, personas de los grupos de gastos (nombres que escribe el usuario) | `household_*`, `split_*` | Hetzner | — | Hasta la baja del titular | Códigos de invitación con hash |
| T4 | Autónomos | Borradores de 130/303/111/115/390/349/190/180/347, copia cifrada opcional, PDFs | Contrato | Usuarios autónomos **y sus clientes y proveedores** (nombre, NIF en facturas) | `autonomo_data` (AES-256-GCM), `autonomo_drafts`, `autonomo_quarter_drafts`, `autonomo_pdfs`, `category_business` | Hetzner | — | Hasta que el usuario la borra o se da de baja | Cifrado en reposo, ficheros para la sede solo en el dispositivo. **Para los datos de terceros, Finanverso actúa como encargado del autónomo** (§5.11) |
| T5 | Renta | Asistente, lectura del borrador, cálculo; el borrador y los datos se quedan en el dispositivo; el servidor solo cuenta usos y pases | Contrato | Usuarios | `renta_calculations`, `renta_campaign_uses`, `renta_passes` (usos); datos fiscales en el dispositivo | Hetzner; Stripe para el pase | Stripe (grupo de EE. UU.) | Hasta la baja | Lectura en el dispositivo |
| T6 | Facturas por email | Recibir recibos reenviados y crear el gasto | Contrato | Usuarios y emisores de los recibos | `inbox_tokens`, `inbox_messages` (resultado de los 50 últimos) | Cloudflare (Email Routing y Worker), Hetzner | Cloudflare: EE. UU. | 50 últimos resultados | Dirección con token rotable |
| T7 | Pagos y suscripciones | Cobrar Premium, el plan fundador y el pase de la Renta; prueba de 14 días; desistimiento | Contrato; obligación legal (consumo y facturación, 6.1.c) | Clientes | Estado de la suscripción, ids de Stripe/RevenueCat, aceptación de condiciones y renuncia al desistimiento (`subscriptions`, `billing_events`) | Stripe (responsable independiente del pago), Google Play y RevenueCat (encargado) | Stripe, RevenueCat: EE. UU. | Hasta la baja; Stripe y RevenueCat según sus obligaciones; facturas 6 años (Código de Comercio, art. 30) y 4 años a efectos fiscales (LGT, art. 66) | Webhooks firmados e idempotentes |
| T8 | Asesor e IA | Análisis del mes, preguntas, categorización al importar | Consentimiento (6.1.a) | Usuarios | Pregunta, nombres de categorías, cifras agregadas; en la categorización, descripciones de movimientos (`ai_advice_cache`, `ai_user_usage`, `ai_daily_usage`) | Cloudflare Workers AI (o Google Gemini de pago) | EE. UU. (NO VERIFICADO el lugar de ejecución) | Caché hasta la baja | Solo cifras agregadas; categorización desactivada por defecto. **Falta registrar el consentimiento en el servidor** |
| T9 | Comunicaciones | Correos transaccionales (contrato); resumen semanal, push y avisos de plazos (consentimiento) | Contrato / consentimiento | Usuarios | Email, suscripciones push (endpoint y claves), registro de envíos (`push_subscriptions`, `push_log`, `user_settings.weekly_digest`) | Resend; FCM (Google), Mozilla, Apple (push) | EE. UU. | Hasta la baja o la retirada | Push cifrado de extremo a extremo (Web Push) |
| T10 | Invitaciones | Programa de referidos | Contrato | Usuarios que invitan e invitados | `referral_codes`, `referrals` | Hetzner | — | Hasta la baja | — |
| T11 | Ofertas de partners | Contar clics para liquidar comisiones | Interés legítimo (6.1.f) | Usuarios | `affiliate_clicks` (usuario, oferta, fecha) | Hetzner (no se comparte la identidad) | — | Hasta la baja (**proponer 13 meses**) | Se pueden ocultar en Ajustes |
| T12 | Seguridad y registros técnicos | Proteger el servicio, diagnosticar errores | Interés legítimo | Visitantes y usuarios | Logs sin IP ni datos financieros, errores del navegador (ruta, mensaje, navegador), límites de intentos (en memoria) | Hetzner, Cloudflare; **nuevo: Sentry (§1)** | Cloudflare, Sentry: EE. UU. (Sentry con datos en la UE) | Rotación 3 × 10 MB; Sentry: retención del plan | Scrubbing (§1.6) |
| T13 | Copias de seguridad | Recuperar el servicio | Interés legítimo / art. 32 RGPD | Todos | Copia completa de la base | Hetzner; Cloudflare R2 (cifrada con restic; Cloudflare no tiene la clave) | R2: ubicación según el bucket (NO VERIFICADO si está fijado a la UE) | 14 días | Cifrado, prueba mensual de restauración |
| T14 | Métricas y analítica | Saber cómo se usa el producto | Interés legítimo (contadores anónimos: no son datos personales) | Usuarios y visitantes | `metrics` (anónimo); **nuevo:** `last_active_day`, `acq_*` (§3) | Hetzner; Cloudflare Web Analytics o Plausible para visitas | Cloudflare: EE. UU. | Contadores: indefinido (anónimos); columnas: hasta la baja | Umbral de 5 en los informes |
| T15 | Lectura de notificaciones bancarias (Android) | Proponer pagos a partir de las notificaciones del banco | Consentimiento | Usuarios | Texto de la notificación, procesado en el dispositivo; solo se envía el movimiento que el usuario añade | — | — | En el dispositivo hasta que decide | Desactivada por defecto |
| T16 | Soporte | Atender consultas y derechos | Contrato / obligación legal (derechos) | Usuarios y no usuarios | Email y contenido del mensaje | Proveedor del buzón de support@finanverso.app (**completar**: Cloudflare Email Routing y el buzón de destino) | Según el proveedor | 1 año tras cerrar la consulta (propuesta); solicitudes de derechos: 3 años (prescripción de infracciones, art. 72-74 LOPDGDD) | — |

🤖 El agente crea `docs/legal/registro-actividades.md` con esta tabla (sin datos personales del titular) y 👤 el dueño la copia en su carpeta privada, la completa (T16, la región de R2) y la fecha. **Hecho cuando:** existe el registro con fecha, y cada fila de la política s3 tiene su fila en el registro y al revés (un agente lo comprueba en cada cambio de la política).

### 5.2 Bases jurídicas: análisis

| Base | Tratamientos | Comprobación pendiente |
|---|---|---|
| Contrato (6.1.b) | T1-T7, T10 | Solo vale para lo **necesario** para el servicio que el usuario pide. La copia de Autónomos y el 2FA son funciones que el usuario activa: encaja (duda 11 del resumen legal) |
| Consentimiento (6.1.a) | T8, T9 (resumen, push, avisos por email), T15 | Debe ser previo, específico, informado, revocable y **demostrable** (art. 7.1): **falta guardar en el servidor la fecha del consentimiento de la IA y del email de avisos** (🤖 S: columnas `*_consent_at` y versión del texto) |
| Obligación legal (6.1.c) | T7 (consumo, facturación), T16 (derechos) | — |
| Interés legítimo (6.1.f) | T11, T12, T13, T14 | El art. 6.1.f exige una **ponderación** escrita (prueba de interés legítimo, LIA). 🤖 Redactar una de una página por tratamiento: interés, necesidad, expectativas del usuario, garantías (umbral de 5, sin terceros, oposición) |

### 5.3 Contratos de encargado (art. 28 RGPD)

**Qué exige:** art. 28.3: el encargado solo trata según instrucciones, con confidencialidad, seguridad (art. 32), subencargados autorizados, ayuda con los derechos y las brechas, supresión o devolución al final, y auditoría. La AEPD tiene unas [directrices para estos contratos](https://www.aepd.es/guias/guia-directrices-contratos.pdf).

**Estado:** sin aceptar ni archivar (duda 4 del resumen legal). En la mayoría de proveedores el DPA **forma parte de las condiciones** y basta con aceptarlas y guardar una copia; en Hetzner hay que **firmarlo en su consola**.

| Proveedor | Papel | Cómo se formaliza (ver Anexo A) | Transferencia | 👤 Tarea |
|---|---|---|---|---|
| Hetzner Online GmbH | Encargado (alojamiento) | Contrato de encargo («Auftragsverarbeitung», AVV/DPA) que se acepta en la consola de Hetzner (Cloud Console → cuenta → DPA) | No (Alemania/Finlandia) | Aceptarlo y descargar el PDF |
| Cloudflare, Inc. (proxy, DNS, Email Routing, Workers, R2, Workers AI, Web Analytics) | Encargado | DPA incorporado a las condiciones del plan Self-Serve; se puede descargar firmado desde la web de Cloudflare | Sí, EE. UU.: Cloudflare está adherida al DPF y el DPA incluye CCT | Descargar el DPA y guardar con fecha |
| Resend, Inc. | Encargado (email) | DPA en su web, incorporado a las condiciones | Sí, EE. UU. (comprobar DPF/CCT, Anexo B) | Descargar y guardar |
| RevenueCat, Inc. | Encargado (verificar compras de Play) | DPA en su web | Sí, EE. UU. | Descargar y guardar |
| Google (Play, Identity Services, FCM) | Google Play: responsable independiente del cobro; FCM y Sign-In: encargado según los términos de procesamiento de datos de Google | Google Cloud/Firebase Data Processing Terms aceptados en la consola | Sí, EE. UU. (Google está adherida al DPF) | Aceptar los términos de procesamiento en la consola de Google Cloud/Firebase si existe el proyecto; guardar |
| Google Gemini (solo si `AI_PROVIDER=gemini` de pago) | Encargado | Términos de procesamiento de Google Cloud | Sí | Solo si se activa |
| Stripe Payments Europe Ltd. | **Responsable independiente** del pago (lo dice la política) y encargado para algunos servicios | DPA incorporado a las condiciones de Stripe | Grupo de EE. UU. (DPF/CCT) | Descargar y guardar |
| Sentry (Functional Software, Inc.) — nuevo | Encargado | DPA en su web, aceptable desde la configuración de la organización | Datos en la UE; empresa de EE. UU. (DPF) | Aceptarlo al crear la cuenta |
| Better Stack / UptimeRobot — nuevo | No trata datos de usuarios (solo mira URLs públicas) | No hace falta DPA para los monitores | — | — |
| Healthchecks.io | No trata datos de usuarios | — | — | — |
| Frankfurter | No recibe datos personales | — | — | — |
| Azure | No trata datos de usuarios | — | — | — |

**Hecho cuando:** hay una carpeta privada con un PDF por proveedor, la fecha de aceptación y el enlace, y el registro (§5.1) cita cada uno.

### 5.4 Transferencias internacionales

- **Norma:** arts. 44-49 RGPD. Para EE. UU., la [Decisión de adecuación (UE) 2023/1795](https://eur-lex.europa.eu/eli/dec_impl/2023/1795/oj) (Marco de Privacidad de Datos UE-EE. UU., DPF) cubre a las empresas adheridas; el Tribunal General la confirmó en septiembre de 2025 (asunto Latombe, T-553/23; ver Anexo A y B sobre un posible recurso). Para el resto, las cláusulas contractuales tipo de la [Decisión (UE) 2021/914](https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj).
- **Tarea (🤖 + 👤):** comprobar en [dataprivacyframework.gov](https://www.dataprivacyframework.gov/list) cada empresa (Cloudflare, Google, Resend, RevenueCat, Stripe, Sentry) y anotar en el registro «DPF» o «CCT» por proveedor; ajustar la frase genérica de `app.privacy.s4.p2` (duda 3 del resumen legal).
- **Reducir transferencias:** Sentry con datos en la UE; R2 con jurisdicción UE si el bucket lo permite (👤 comprobar en el panel de R2; NO VERIFICADO para el bucket actual).

### 5.5 Evaluación de impacto (EIPD/DPIA, art. 35)

**Qué exige:** art. 35 RGPD; la AEPD publica la [lista de tratamientos que requieren EIPD](https://www.aepd.es/documento/listas-dpia-es-35-4.pdf) y su regla práctica: si se cumplen **dos o más** criterios de la lista, hace falta EIPD. Herramienta: [Gestiona EIPD](https://www.aepd.es/guias-y-herramientas/herramientas/gestiona-eipd).

**Análisis de Finanverso frente a los criterios de la lista de la AEPD:**

| Criterio de la lista | ¿Se cumple? | Por qué |
|---|---|---|
| Perfilado o evaluación (incluida la situación económica) | **Sí, en parte** | El asesor (reglas e IA) analiza la situación económica del usuario para sugerirle cambios. No toma decisiones con efectos jurídicos |
| Decisiones automatizadas con efectos jurídicos | No | Las sugerencias no deciden nada |
| Observación sistemática | No | |
| Datos de categorías especiales o **datos de carácter muy personal** (la AEPD incluye los datos financieros) | **Sí** | Movimientos bancarios, datos fiscales, patrimonio |
| Gran escala | Hoy **no** (decenas de usuarios; 51 en la última restauración), puede llegar a serlo | Revisar al pasar de unos miles de usuarios activos |
| Asociación o combinación de conjuntos de datos | **Sí, en parte** | Extractos de varios bancos, borrador de la AEAT, ficheros de brókers |
| Interesados vulnerables | No (14 años o más; no dirigido a menores) | |
| Uso de nuevas tecnologías | **Sí, en parte** | IA generativa de un tercero; lectura de notificaciones bancarias en Android |
| Impide ejercer un derecho o usar un servicio | No | |

**Conclusión:** se cumplen al menos dos criterios (datos financieros de carácter muy personal + evaluación de la situación económica, y en parte nuevas tecnologías). **Recomendación: hacer la EIPD** (aunque haya dudas, es más barato hacerla que justificar por qué no). 🤖 La redacta con la estructura de Gestiona EIPD: descripción, necesidad y proporcionalidad, riesgos (acceso indebido a la base, fuga en copias, IA, lectura de notificaciones, error de cálculo fiscal que el usuario presenta), medidas existentes y pendientes (CSP en modo bloqueante, tokens fuera de `localStorage`, 2FA, cifrado de la copia de Autónomos, scrubbing de Sentry). 👤 la revisa y firma. Revisar cada año o con cada función nueva de riesgo (open banking, IA con texto libre).

### 5.6 Derechos de los interesados

**Qué exige:** arts. 12-22 RGPD y 12-18 LOPDGDD. Plazo de respuesta: **un mes**, ampliable dos más si es complejo, avisando dentro del primer mes (art. 12.3). Gratis. Al suprimir, **bloqueo** de los datos que haya que conservar por ley (art. 32 LOPDGDD).

| Derecho | Qué hay | Qué falta (🤖 salvo que se diga) |
|---|---|---|
| Acceso (art. 15) | Exportación JSON completa v3 (`GET /api/export`) y CSV | Añadir a la exportación un resumen legible: finalidades, destinatarios, plazos (texto fijo de la política) |
| Rectificación (art. 16) | Edición de nombre, email (NO VERIFICADO si se puede cambiar el email) y de todos los datos en la app | Confirmar el cambio de email |
| Supresión (art. 17) | Borrado de la cuenta (`DELETE /api/profile/account`), copias que caducan a los 14 días, `secure_delete` | Borrar o anonimizar el cliente de Stripe y el registro de RevenueCat cuando no haya obligación de conservar (duda 10); **bloqueo** de la aceptación de condiciones y de los datos de facturación durante su plazo (duda 8) |
| Portabilidad (art. 20) | JSON en formato estructurado | **Importar** la propia exportación (informe de calidad, §D: falta) |
| Oposición (art. 21) | Ocultar ofertas; no hay perfilado con efectos | Interruptor «No usar mis datos para estadísticas de uso» para `last_active_day` y `acq_*` (§3) |
| Limitación (art. 18) | — | Procedimiento manual documentado (marcar la cuenta como bloqueada) |
| No ser objeto de decisiones automatizadas (art. 22) | No aplica | — |
| Procedimiento | Email a support@finanverso.app, «respuesta en un mes» en la política | 🤖 `docs/legal/procedimiento-derechos.md`: comprobación de identidad (responder desde el email de la cuenta), plantillas de respuesta, registro de solicitudes (fecha, derecho, respuesta, fecha de respuesta) en la carpeta privada; 👤 apuntar cada solicitud |

### 5.7 Brechas de seguridad (arts. 33 y 34)

**Qué exige:** notificar a la AEPD **en 72 horas** desde que se conoce la brecha, salvo que sea improbable que suponga un riesgo (art. 33.1); documentar **todas** las brechas, también las que no se notifican (art. 33.5); comunicarla a los afectados sin dilación si el riesgo es alto (art. 34). La AEPD tiene la [Guía para la notificación de brechas](https://www.aepd.es/guias/guia-brechas-seguridad.pdf), la herramienta [Comunica-Brecha RGPD](https://www.aepd.es/guias-y-herramientas/herramientas/comunica-brecha-rgpd) (ayuda a decidir si se comunica a los afectados) y el formulario en su [sede electrónica](https://sedeagpd.gob.es/sede-electronica-web/).

**Procedimiento** (🤖 redacta `docs/legal/procedimiento-brechas.md`; 👤 lo firma):

1. **Detectar:** alertas de §1 (Sentry, accesos raros, 5xx), avisos de proveedores (Hetzner, Cloudflare), avisos de usuarios.
2. **Contener (0-4 h):** rotar `JWT_SECRET` (cierra todas las sesiones), claves de Stripe, Resend, Cloudflare y restic; cortar el acceso SSH si hace falta; guardar evidencias (logs, `docker compose logs`, copia de la base) fuera del servidor.
3. **Evaluar (antes de 24 h):** qué datos (tabla del registro §5.1), cuántas personas, si estaban cifrados (la copia de Autónomos y las de R2 lo están), riesgo bajo/alto con Comunica-Brecha.
4. **Notificar (antes de 72 h):** formulario de la sede de la AEPD con certificado o Cl@ve del dueño. Si faltan datos, notificar por fases.
5. **Comunicar a los afectados** si el riesgo es alto: email con lenguaje claro.
6. **Registrar** todas las brechas (también las no notificadas) en el registro de brechas de la carpeta privada.

**Plantilla de notificación a la AEPD** (contenido mínimo del art. 33.3):

```
1. Responsable: [titular], support@finanverso.app. DPO: no designado (ver §5.8).
2. Fecha y hora de la brecha: [ ] · Fecha y hora en que se conoció: [ ] · Si pasan 72 h: motivo del retraso.
3. Naturaleza: confidencialidad / integridad / disponibilidad. Qué pasó: [ ].
4. Categorías y número aproximado de interesados: usuarios de Finanverso, [N].
5. Categorías y número aproximado de registros: [tablas afectadas según el registro de actividades].
6. Consecuencias probables: [p. ej., exposición de movimientos bancarios; riesgo de fraude o suplantación].
7. Medidas tomadas o propuestas: [contención, rotación de claves, parche, comunicación a afectados].
8. ¿Se comunicará a los interesados? Sí/No y por qué (resultado de Comunica-Brecha).
9. Contacto para más información: support@finanverso.app.
```

**Plantilla de registro interno de brechas:** fecha, descripción, datos y personas, riesgo, ¿notificada? (sí/no y por qué), ¿comunicada?, medidas, fecha de cierre.

**Hecho cuando:** procedimiento firmado; un **simulacro** (p. ej., «se filtró una copia de la base») hecho una vez y apuntado.

### 5.8 Delegado de protección de datos (DPO)

**Qué exige:** art. 37 RGPD: obligatorio si la actividad principal consiste en observación habitual y sistemática a gran escala o en categorías especiales a gran escala. Art. 34.1 LOPDGDD: lista de entidades obligadas (colegios profesionales, centros docentes, entidades de crédito y aseguradoras, empresas de servicios de inversión, prestadores de servicios de la información que elaboren perfiles a gran escala, entre otras).

**Análisis:** Finanverso no es entidad financiera ni de inversión, no trata categorías especiales y hoy no hace perfiles a gran escala. **No es obligatorio** con el tamaño actual (ver matiz en Anexo B). 🤖 Dejarlo escrito en el registro («DPO no designado, motivo…») y revisarlo si se pasa de unos miles de usuarios activos o si se añade open banking (PSD2).

### 5.9 Cookies, almacenamiento local y banner

- **Norma:** art. 22.2 LSSI y Guía de cookies de la AEPD (ver §3.6).
- **Estado:** la política (s8) lista lo que se guarda y dice que no hay cookies de analítica; no hay banner. Todo es necesario **salvo `mm_acq`**.
- **Tarea:** quitar `mm_acq` del almacenamiento (§3.5). Así no hace falta banner y desaparece la duda 2 del resumen legal. Si se prefiere mantenerlo, tiene que seguir siendo un contador anónimo, sin vincularlo a la cuenta, y entonces se puede acoger a la excepción de medición de audiencia de la AEPD (§3.6). Si en el futuro se añade algo no necesario (píxel de anuncios, analítica con cookies), habrá que poner un banner con «Aceptar» y «Rechazar» al mismo nivel y sin casillas premarcadas.
- **Hecho cuando:** la prueba de §3.6 pasa y la política s8 ya no menciona `mm_acq` como dato guardado antes del registro.

### 5.10 Política de retención

| Dato | Plazo propuesto | Base | Estado | Tarea |
|---|---|---|---|---|
| Cuenta y datos financieros | Hasta la baja | Contrato | Hecho | — |
| Copias de seguridad | 14 días | Seguridad | Hecho (`BACKUP_RETENTION_DAYS`, restic `--keep-within 14d`) | — |
| Logs técnicos | Hasta 30 MB por servicio (rotación) | Interés legítimo | Hecho | Si se promete en días, journald (§1.8) |
| Errores en Sentry | El mínimo del plan (p. ej. 30 días) | Interés legítimo | Nuevo | Configurarlo |
| Aceptación de condiciones y renuncia al desistimiento | **Bloqueada** tras la baja durante el plazo de reclamación (propuesta: 5 años, acción personal del art. 1964 del Código Civil; NO VERIFICADO: confirmar con abogado) | Obligación legal / interés legítimo | Hoy se borra con la cuenta (duda 8) | 🤖 tabla `blocked_records` con solo lo necesario y fecha de purga |
| Datos de facturación (Stripe) | 6 años (art. 30 Código de Comercio) / 4 años (art. 66 LGT) | Obligación legal | Los guarda Stripe | — |
| Clics en ofertas | 13 meses | Interés legítimo | Indefinido | 🤖 purga mensual |
| `metrics` (anónimo) | Indefinido | No es dato personal | Hecho | — |
| `push_log` | 90 días | Funcionamiento | Indefinido | 🤖 purga |
| Solicitudes de derechos | 3 años | Defensa ante la AEPD | No existe | Registro privado |
| Cuentas sin verificar | 30 días tras el alta | Minimización | NO VERIFICADO si se purgan | 🤖 comprobar y añadir purga |
| Cuentas inactivas | Propuesta: aviso a los 24 meses sin uso y borrado a los 27 | Minimización (art. 5.1.e) | No existe | 👤 decidir; 🤖 implementar con `last_active_day` |

### 5.11 Cláusula de encargado para los autónomos

**Qué pasa:** el autónomo guarda en la copia de Autónomos facturas con nombre y NIF de **sus** clientes y proveedores. Para esos datos, el responsable es el autónomo y Finanverso trata los datos **por su cuenta**: es **encargado del tratamiento** (art. 4.8 y 28 RGPD; duda 12 del resumen legal).

**Tarea (🤖 redacta, 👤 aprueba; recomendable que lo mire un abogado):** añadir a las condiciones (`terms.*`) un anexo «Contrato de encargo del tratamiento» que se acepta al activar la copia de Autónomos en la cuenta (o al aceptar las condiciones), con el contenido del art. 28.3: objeto (guardar y calcular los libros y modelos), duración (mientras esté activa), tipos de datos (identificativos y fiscales de clientes y proveedores), obligaciones (instrucciones, confidencialidad, seguridad: AES-256-GCM, subencargados: Hetzner y Cloudflare R2 para las copias, ayuda con derechos y brechas, supresión al borrar la copia o la cuenta), y registro de la aceptación con fecha y versión. Además, Finanverso debe llevar un registro de las categorías de tratamiento que hace **como encargado** (art. 30.2).

### 5.12 Menores

- **Norma:** art. 8 RGPD y art. 7 LOPDGDD: en España, desde los **14 años** se puede consentir; por debajo, los padres o tutores.
- **Estado:** casilla obligatoria «Tengo 14 años o más» en el registro y aviso junto al botón de Google; las condiciones piden mayoría de edad o autorización para pagar (no se comprueba). Duda 1 del resumen legal (14 o 16).
- **Tarea:** mantener 14 (es lo que dice la ley española; 🤖 dejar la cita en el registro). Para pagos: el pago lo hace el titular de la tarjeta o de la cuenta de Google, que ya aplica sus controles; 👤 decidir con el abogado si basta. No dirigir campañas a menores (TikTok: segmentar a mayores de 18 en los anuncios de pago).

### 5.13 Plan del bloque 5

| # | Tarea | Quién | Esfuerzo | Depende de | Hecho cuando |
|---|---|---|---|---|---|
| 5.1 | Registro de actividades (plantilla en `docs/legal/`, copia privada completada y fechada) | 🤖 + 👤 | S + 1 h | — | §5.1 |
| 5.2 | DPA de cada proveedor aceptados y archivados | 👤 | 2 h | — | §5.3 |
| 5.3 | Comprobación DPF/CCT por proveedor y ajuste de la política s4 | 🤖 + 👤 | S | 5.2 | Política con el mecanismo por proveedor |
| 5.4 | Ponderaciones de interés legítimo (T11-T14) | 🤖 | S | 5.1 | Un documento por tratamiento |
| 5.5 | Registro del consentimiento en el servidor (IA, email de avisos) | 🤖 | S | — | Columnas `*_consent_at` y test |
| 5.6 | EIPD redactada y firmada | 🤖 + 👤 | M + 2 h | 5.1 | PDF firmado en la carpeta privada |
| 5.7 | Procedimiento de derechos y registro de solicitudes | 🤖 + 👤 | S | — | §5.6 |
| 5.8 | Procedimiento de brechas, plantilla y simulacro | 🤖 + 👤 | S + 1 h | 1.x | §5.7 |
| 5.9 | Cláusula de encargado para Autónomos y aceptación registrada | 🤖 + 👤 (abogado recomendado) | S-M | — | Texto en `terms.*`, test de que sin aceptarla no se activa la copia |
| 5.10 | Retención: purgas (ofertas, `push_log`, sin verificar), bloqueo de la aceptación | 🤖 | M | 👤 decide plazos | Tareas programadas con test |
| 5.11 | `mm_acq` fuera (o banner) | 🤖 | S | 3.1 | §5.9 |
| 5.12 | (Opcional) Revisión por abogado de política, condiciones, cláusula de encargo y EIPD | 👤 | presupuesto | 5.1-5.9 | Informe del abogado |

---

## 6. Reglas fiscales por ejercicio antes de abril de 2027

### 6.1 El problema

Las cifras y reglas de la Renta son de 2025 y están repartidas: **75 archivos** del frontend contienen «2025» en `modules/tools/data/**`, `modules/tools/domain/renta*.ts` y `modules/finances/domain/**` (escala estatal y mínimos en `data/renta/state.ts`, las 19 comunidades en `data/renta/ccaa/*.ts` y `requisitos/*.ts`, módulos en `modulos-2025.ts` y `agrario-2025.ts`, constantes sueltas como `LOW_PAY_*` en `rentaCalc.ts:538`). Ya hay dos buenas excepciones que sirven de modelo:

- `frontend/src/modules/finances/domain/fiscalFigures.ts`: cifras de los modelos de autónomo **por año** (2025, 2026, 2027) con `provisional`, fuente y valores `null` cuando no se han confirmado.
- `frontend/src/modules/tools/data/reta2026.ts` y `backend/src/domain/services/autonomo-data.ts`: tabla del RETA de 2026 con fuente (Orden PJC/297/2026) y un test que comprueba que las dos copias son iguales.

Sin versionado, la Renta 2026 (abril de 2027) se calcularía con reglas de 2025 y fallaría, como mínimo, en la deducción por rentas bajas de la DA 61.ª (340 € → 590,89 €), el nuevo art. 23.2 (reducciones del alquiler), la DA 62.ª (autoconsumo) y la DA 65.ª (`docs/fiscalidad/informe-gestor-real.md`, P0-1).

### 6.2 Diseño técnico

**Un paquete de reglas por ejercicio** en el frontend (donde está el motor de la Renta) y su espejo en el backend para lo que calcula el servidor (130/303/RETA):

```
frontend/src/modules/tools/data/rules/
  registry.ts            ← «reglas vigentes por año»: ejercicio → paquete, estado, fuentes
  2025/
    index.ts             ← exporta un objeto RulesPack completo
    state.ts             ← escala estatal, mínimos, reducciones del trabajo, DA 61.ª, art. 23.2…
    ccaa/<comunidad>.ts  ← escalas y deducciones autonómicas
    modules.ts, agrarian.ts
    reta.ts, payroll.ts
    calendar.json        ← plazos (§4.3)
    sources.json         ← cada cifra o bloque: URL, norma, artículo, fecha de verificación
  2026/
    index.ts             ← parte de 2025 y solo redefine lo que cambia (spread + overrides)
    …
backend/src/domain/rules/<año>/{reta,vat,autonomo,calendar}.ts + registry.ts
```

**Tipo común** (`RulesPack`): `year`, `status` (`'draft' | 'provisional' | 'confirmed'`), `checkedOn`, y bloques tipados (`scale`, `minimums`, `work`, `rentals`, `savings`, `deductions`, `regions`, `reta`, `modules`, `calendar`). Cada número que viene de la ley lleva junto a él su `source` (id en `sources.json`). Nada de `null` silencioso: si una cifra no está confirmada, el bloque se marca `provisional` y la interfaz muestra «Cifra prevista: pendiente de la Orden de [año]».

**Registro de «reglas vigentes por año»** (`registry.ts`), que también genera una tabla en `docs/fiscalidad/reglas-por-ejercicio.md` con un script:

| Ejercicio | Estado | Escala y mínimos | Autonómicas | Módulos | RETA | Calendario | Última verificación |
|---|---|---|---|---|---|---|---|
| 2025 | confirmado | Manual práctico 2025 | Manual 2025 | Orden de módulos 2025 | Orden PJC 2025 | Calendario 2026 | 19-10-2026 |
| 2026 | provisional | LIRPF consolidada (DA 61.ª, 23.2, DA 62.ª, DA 65.ª) | = 2025 hasta el Manual 2026 | Orden de módulos 2026 | Orden PJC/297/2026 | Calendario 2026 / 2027 previsto | 20-10-2026 |
| 2027 | borrador | = 2026 + art. 85 por escala | = 2026 | pendiente | pendiente | pendiente | — |

**Cómo elige la app el año:** el motor recibe el ejercicio (`rulesFor(year)`); el asistente de la Renta usa el ejercicio de la campaña abierta (`campaignFor`); Autónomos usa el año de la fecha del trimestre. Si se pide un año sin paquete, error explícito, no el último disponible.

**Pruebas de regresión por año:**

1. **Instantánea de 2025:** antes de mover nada, guardar el resultado de todos los casos del banco (`docs/casos-practicos`, 17 casos oficiales reproducidos + el resto) con el motor actual. Tras la migración al paquete `2025/`, los resultados deben ser **idénticos al céntimo** (es una refactorización, no un cambio de reglas).
2. **Tests por paquete:** cada `20XX/index.ts` tiene un test que compara cada cifra con su fuente transcrita (`sources.json` incluye el valor esperado y el fragmento de la norma), como ya hace el test del RETA.
3. **Tests de diferencias:** un test lista las diferencias entre 2025 y 2026 (`diffRules(2025, 2026)`) y falla si aparece una diferencia no anotada en `docs/fiscalidad/reglas-por-ejercicio.md`. Así, ningún cambio de cifra pasa sin documentar.
4. **Casos de 2026:** cuando salga el Manual práctico de 2026 (abril de 2027), añadir sus ejemplos al banco y ejecutarlos con el paquete 2026 en la CI (`npm run casos`, que hoy está fuera de la CI: meterlo).
5. **Espejo frontend/backend:** como `retaCalc.test.ts`, un test lee los dos ficheros y comprueba que RETA, IVA y calendario coinciden.

### 6.3 Calendario de actualización anual (qué publica quién y cuándo)

| Cuándo (aprox.) | Qué se publica | Dónde | Afecta a |
|---|---|---|---|
| Septiembre-octubre | Proyecto de Ley de Presupuestos del año siguiente (si lo hay) | Congreso / Ministerio de Hacienda | Tarifa plana, IPREM, posibles cambios del IRPF |
| Octubre-diciembre | Resolución de fiestas laborales del año siguiente | BOE | Calendario (§4.3) |
| Noviembre-diciembre | Orden de módulos del año siguiente (estimación objetiva e IVA simplificado) | BOE | `modules`, 131, 303 simplificado |
| Diciembre | Calendario del contribuyente del año siguiente | Sede AEAT | Calendario |
| Diciembre-febrero | Real Decreto del SMI del año | BOE | Retenciones, mínimos de algunas comunidades, referencias |
| Diciembre-marzo | Orden de cotización a la Seguridad Social (RETA por tramos, régimen general) | BOE (en 2026: Orden PJC/297/2026, 31 de marzo) | `reta` |
| Otoño-invierno | Diseños de registro nuevos de 303, 390, 190, 180, 347 | Sede AEAT y BOE | `aeatFiles/designs.ts` |
| Enero-febrero | Leyes autonómicas de medidas fiscales y presupuestos de cada comunidad | Boletines autonómicos | `regions` (deducciones, escalas) |
| Marzo | **Orden del modelo 100 y 714** (en 2026: Orden HAC/277/2026, BOE de 27 de marzo) | BOE | Casillas (`casillas-20XX.json`), fechas de la campaña |
| Marzo-abril | Diseño de registro del modelo 100 y de los ficheros de Renta WEB | Sede AEAT | Lectura del borrador (`rentaDraftXml.ts`) |
| Abril (inicio de campaña) | **Manual práctico de Renta y Patrimonio** (tomos 1 y 2: deducciones autonómicas) | Sede AEAT | Escalas autonómicas, mínimos, deducciones, ejemplos para el banco |
| Abril-junio | Correcciones de errores del Manual y de la Orden | Sede y BOE | Revisar |

### 6.4 Qué cambia ya para 2026 y 2027 (según el BOE y fuentes oficiales)

| Cambio | Ejercicio | Estado | Fuente | Dónde en el código |
|---|---|---|---|---|
| Deducción por rentas bajas del trabajo (DA 61.ª LIRPF): hasta 590,89 € para rendimientos de hasta 17.094 €, decreciente hasta 20.048,45 € | 2026 | Aprobado (texto consolidado) | [LIRPF consolidada](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764) | `rentaCalc.ts:538` (`LOW_PAY_*`) |
| Reducciones del rendimiento del alquiler de vivienda (art. 23.2 nuevo; régimen transitorio) | 2026 (desde octubre) | Aprobado | LIRPF consolidada | `rentaRentals.ts`, `inmuebles.ts` |
| Deducción por autoconsumo renovable (DA 62.ª: 10 % o 20 %, base máxima 5.000 €) | 2026 | Aprobado | LIRPF consolidada | Nueva deducción |
| Exención de la DA 65.ª | 2026 | Aprobado | LIRPF consolidada | `rentaExtras.ts` |
| Imputación de rentas inmobiliarias por escala (art. 85) | 2027 | Aprobado | LIRPF consolidada | `inmuebles.ts` |
| Cotización de autónomos por ingresos reales: tabla de 2026 | 2026 | Aprobado (Orden PJC/297/2026) | [BOE-A-2026-7296](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296) | `reta2026.ts`, `autonomo-data.ts` |
| Tabla del RETA de 2027 y siguientes | 2027 | **Pendiente** (ver Anexo A/B) | — | Paquete 2027 en «borrador» |
| Tarifa plana desde 2026 | 2026-2027 | **No confirmada**: la fija la Ley de Presupuestos; sin Presupuestos de 2026, la app usa la última cifra oficial (80 €) avisándolo | Ley 20/2007, art. 38 ter; RDL 13/2022, DT 5.ª | `fiscalFigures.ts` (`retaFlatRate: null`) |
| SMI 2026 e IPREM 2026 | 2026 | Ver Anexo A | BOE | Referencias (deducciones autonómicas ligadas al IPREM) |
| Presupuestos Generales del Estado 2026 | 2026 | Ver Anexo A (prorrogados de 2023 salvo que se indique otra cosa) | — | Tarifa plana, IPREM |
| VERI*FACTU (RD 1007/2023, modificado por RD 254/2025) | 2027 | Ver Anexo A para las fechas vigentes | BOE | Emisión de facturas (no existe aún en la app) |
| Reducción de la jornada a 37,5 h | — | Ver Anexo A | — | No afecta al motor |

### 6.5 Desglose para dejar listo el motor del ejercicio 2026

| # | Tarea | Quién | Esfuerzo | Fecha límite | Depende de | Hecho cuando |
|---|---|---|---|---|---|---|
| 6.1 | Instantánea de resultados de 2025 de todo el banco de casos | 🤖 | S | **15-11-2026** | — | Fichero de resultados versionado y test que lo compara |
| 6.2 | `RulesPack`, `registry.ts`, `sources.json` y migración de las constantes de 2025 al paquete `2025/` (sin cambiar ningún resultado) | 🤖 | M-L | **15-12-2026** | 6.1 | Instantánea idéntica al céntimo; `grep -rn "2025" modules/tools/domain` solo da comentarios o el registro |
| 6.3 | Espejo en el backend (`domain/rules/<año>`) para RETA, IVA, 130 y calendario, con test de igualdad | 🤖 | S-M | 15-12-2026 | 6.2 | Test de espejo en verde |
| 6.4 | Paquete `2026/` con los cambios ya aprobados (DA 61.ª, art. 23.2, DA 62.ª, DA 65.ª, RETA 2026) y estado `provisional` | 🤖 | M | **31-01-2027** | 6.2 | `diffRules(2025, 2026)` lista exactamente esos cambios |
| 6.5 | `npm run casos` en la CI y tests de diferencias | 🤖 | S | 31-01-2027 | 6.2 | La CI falla si cambia una cifra sin documentar |
| 6.6 | Calendario 2027 y festivos 2027 (§4.3) | 🤖 | S | **31-12-2026** (o cuando la AEAT publique el calendario) | 4.2 | Fechas «confirmadas» |
| 6.7 | Orden de módulos 2027 → paquete 2027 (`modules`) | 🤖 | S | 15 días tras su publicación en el BOE (esperada nov-dic 2026) | 6.2 | Test contra la Orden |
| 6.8 | Orden de cotización 2027 (si sale) → `reta` 2027 | 🤖 | S | 15 días tras su publicación | 6.3 | Test contra la Orden |
| 6.9 | Interfaz: «Renta 2026: cifras previstas» mientras el paquete sea provisional; selector de ejercicio en el asistente | 🤖 | S | 28-02-2027 | 6.4 | Captura del aviso |
| 6.10 | **Orden del modelo 100 de 2026**: nuevo `casillas-2026.json`, comparar con 2025, fechas de la campaña 2026 | 🤖 | S-M | **5 días tras su publicación** (esperada en la 2.ª quincena de marzo de 2027) | 6.2 | Catálogo nuevo y diferencias documentadas |
| 6.11 | Diseño de registro del modelo 100 de 2026 y lectura del borrador XML/PDF de 2026 | 🤖 + 👤 (probar con su propio borrador en local, sin subirlo) | M | Inicio de la campaña (≈ 8-04-2027) | 6.10 | El borrador de prueba del dueño se lee sin huecos |
| 6.12 | **Manual práctico 2026**: escalas y deducciones autonómicas, mínimos, ejemplos al banco; paquete 2026 a `confirmed` | 🤖 (varios agentes, una comunidad cada uno) | M-L | **2 semanas tras el inicio de la campaña** (≈ 22-04-2027) | 6.10 | 19 comunidades verificadas con fecha; casos del Manual en verde |
| 6.13 | Publicación de la versión con la Renta 2026 | 👤 (ordena) | — | Antes del inicio de la campaña para el núcleo; segunda versión con las autonómicas | 6.9-6.12 | Versión en producción |

### 6.6 Checklist de actualización con agentes

Una tarea programada (agente o GitHub Action semanal, de noviembre a mayo) que:

1. Busca en el BOE (sumario diario o búsqueda por texto) «modelo 100», «estimación objetiva», «cotización a la Seguridad Social», «salario mínimo», «fiestas laborales» y en la sede de la AEAT las páginas del calendario, del Manual práctico y de los diseños de registro.
2. Si encuentra una publicación nueva, abre una *issue* con el enlace y la tarea de §6.5 que le corresponde.

Para cada actualización, el agente sigue esta lista (y la deja marcada en el PR):

- [ ] Leer la norma en el BOE (no en blogs) y anotar URL, artículo y fecha en `sources.json`.
- [ ] Copiar el paquete del año anterior solo como base; cambiar únicamente lo que dice la norma.
- [ ] Tests contra la fuente (cifra a cifra) y `diffRules` actualizado y documentado en `reglas-por-ejercicio.md`.
- [ ] Ejecutar el banco de casos con los dos años; los de años anteriores no deben cambiar.
- [ ] Espejo frontend/backend en verde.
- [ ] Textos de la interfaz con el ejercicio correcto y el aviso «orientativo».
- [ ] `checkedOn` actualizado; estado del paquete cambiado solo si todas las fuentes del año están publicadas.
- [ ] Nada de datos personales en el repositorio (los borradores reales se prueban en local).

---

## 7. Calendario global de implantación

Ordenado por impacto y riesgo: primero lo que evita una caída silenciosa o una sanción, después lo que tiene fecha fija (enero y abril), y por último lo que mejora decisiones.

### Próximas 2 semanas (hasta el 3-11-2026)

| Bloque | Tareas | Quién |
|---|---|---|
| 1 | 1.1-1.5: Better Stack/UptimeRobot, Telegram, página de estado, `vitals.sh`, cuenta de Sentry UE | 👤 1,5 h + 🤖 S |
| 2 | 2.1-2.3: medir, swap, compose con límites y endurecimiento | 👤 15 min + 🤖 S |
| 5 | 5.2: aceptar y archivar los DPA (es lo más rápido y lo que más riesgo quita) | 👤 2 h |
| 3 | 3.1: decisiones sobre `mm_acq` y campaña en la cuenta | 👤 15 min |
| 6 | 6.1: instantánea de 2025 | 🤖 S |

### 1 mes (hasta el 20-11-2026)

| Bloque | Tareas |
|---|---|
| 1 | 1.6-1.8: Sentry integrado con scrubbing, logs JSON, procedimiento de alertas |
| 2 | 2.4-2.6: nginx sin root, prueba en caliente, despliegue, prueba de OOM |
| 5 | 5.1, 5.3-5.8, 5.11: registro, transferencias, ponderaciones, consentimiento en el servidor, EIPD, derechos, brechas con simulacro, `mm_acq` fuera |
| 3 | 3.2-3.3, 3.5: UTM completos, columnas, contadores, Cloudflare Web Analytics |
| 4 | 4.1-4.2: decisión y calendario como datos con festivos |

### 3 meses (hasta el 20-01-2027)

| Bloque | Tareas |
|---|---|
| 4 | 4.3-4.8: perfil fiscal, push, email y notificaciones locales; **en producción antes del 1-01-2027** (primer aviso real el 13-01-2027) |
| 6 | 6.2-6.6 (paquetes por año, espejo, paquete 2026 provisional, casos en la CI, calendario 2027) y 6.7-6.8 en cuanto salgan las Órdenes |
| 3 | 3.4, 3.6: informe de cohortes semanal, página `/enlaces` y convención de UTM |
| 5 | 5.9-5.10: cláusula de encargado y retención; 5.12 abogado (opcional) |

### Después (enero-abril de 2027)

- 6.9-6.13 con las fechas de §6.5 (Orden del modelo 100 en marzo, Manual en abril).
- Revisión trimestral de este plan: costes de las herramientas, umbrales de alertas y estado de las normas pendientes.

---

## 8. Riesgos, prioridades y tickets

### 8.1 Matriz de riesgos (impacto / esfuerzo)

| Riesgo | Impacto | Esfuerzo de mitigarlo | Prioridad | Bloque |
|---|---|---|---|---|
| Caída o disco lleno sin que nadie se entere | Alto | Bajo | **P0** | 1 |
| La API agota la memoria y tumba Caddy y la web | Alto | Bajo | **P0** | 2 |
| Contratos de encargo (DPA) de proveedores sin archivar | Alto (sanción y confianza) | Bajo (2 h) | **P0** | 5 |
| Renta 2026 calculada con reglas de 2025 | Alto | Medio-alto | **P0** (fecha: motor listo el 15-03-2027) | 6 |
| Plazo del 4T (111/115 el 20-01-2027; 303/130 hacia el 1-02-2027) pasa sin aviso | Medio-alto (retención y reputación) | Medio | **P1** (en producción antes del 1-01-2027) | 4 |
| Brecha sin procedimiento (plazo de 72 h, art. 33 RGPD) | Alto | Bajo | **P1** | 5 |
| Registro de actividades y EIPD inexistentes | Medio-alto | Medio | **P1** | 5 |
| `mm_acq` guardado antes del registro sin consentimiento | Medio | Bajo | **P1** | 3 |
| Cifras previstas confundidas con definitivas en la interfaz | Medio | Bajo | **P1** | 6 |
| Real Decreto-ley 29/2026 sin convalidar (reglas de alquiler) | Medio | Bajo si hay interruptor | **P1** | 6 |
| Analítica que no mide el embudo de pago | Medio | Bajo-medio | P2 | 3 |
| Retención: tablas sin purga | Medio | Medio | P2 | 5 |
| Avisos push en iPhone no fiables (PWA) | Bajo-medio | Bajo (email como canal) | P2 | 4 |
| VERI\*FACTU para autónomos (hasta el 1-07-2027 según fuentes secundarias) | Bajo hoy (la app no emite facturas) | Alto | P3 (vigilar) | 6 |

### 8.2 Tickets (listos para copiar al tablero)

Formato: `ID · título · quién · esfuerzo · fecha límite · hecho cuando`. La fecha es de aquí a abril de 2027; no depende de ningún gestor colegiado.

| ID | Ticket | Quién | Esf. | Fecha límite | Hecho cuando |
|---|---|---|---|---|---|
| OPS-1 | Monitor externo de `/api/health`, bot de Telegram y alertas de disco/backup (apoyado en `deploy/MONITORIZACION.md`) | 🤖 + 👤 | S | 03-11-2026 | Se apaga la API en una prueba y llega el aviso en menos de 10 min |
| OPS-2 | Límites de memoria, `restart`, `no-new-privileges` y swap en `deploy/docker-compose.yml` | 🤖 | S | 03-11-2026 | `docker stats` muestra límites; prueba de OOM no tumba Caddy |
| OPS-3 | Sentry región UE con filtrado de datos personales | 🤖 + 👤 | S | 20-11-2026 | Error de prueba sin importes ni correos |
| DPA-1 | Aceptar y archivar DPA de Hetzner, Cloudflare, Resend, RevenueCat, Google, Stripe, Sentry | 👤 | S (2 h) | 03-11-2026 | Carpeta privada con PDF y fecha |
| DPA-2 | Registro de actividades, ponderaciones de interés legítimo y EIPD firmados | 🤖 + 👤 | M | 20-11-2026 | PDF firmados fuera del repositorio |
| DPA-3 | Procedimiento de brechas (72 h), plantilla de comunicación a la AEPD y simulacro | 🤖 + 👤 | S | 20-11-2026 | Simulacro anotado |
| DPA-4 | Propuesta de cambios a textos legales (solo en este documento, sin editar `app.privacy.*`/`terms.*` hasta decidirlo) | 🤖 | S | 30-11-2026 | Lista de cambios aprobada |
| DPA-5 | Purgas por retención y copias de seguridad de 14 días como máximo | 🤖 | M | 15-12-2026 | Tareas programadas con test |
| AN-1 | Eliminar `mm_acq` previo al registro (o banner) y definir eventos del embudo | 🤖 | S | 20-11-2026 | Sin almacenamiento local antes del consentimiento |
| AN-2 | Analítica sin cookies (Umami autoalojado o Cloudflare Web Analytics) y embudo registro → primer movimiento → Premium con contadores del servidor | 🤖 | M | 15-12-2026 | Informe semanal con el embudo |
| TAX-1 | Calendario como datos (`fiscal-calendar/<año>.json`) con festivos nacionales | 🤖 | S-M | 15-12-2026 | 303 del 4T previsto el 01-02-2027 si no hay calendario oficial |
| TAX-2 | Perfil fiscal y avisos (push, email opt-in, local) con «Ya lo presenté» | 🤖 | M | 31-12-2026 | Aviso de 7 días del 111 el 13-01-2027 en el reloj de pruebas |
| TAX-3 | Revisar el calendario oficial 2027 cuando lo publique la AEAT y cambiar «previsto» por «confirmado» | 🤖 | S | 15 días tras su publicación | `checkedOn` actualizado |
| RULES-1 | Instantánea de resultados de 2025 del banco de casos | 🤖 | S | 15-11-2026 | Test que la compara |
| RULES-2 | `RulesPack` por ejercicio, registro y `sources.json` | 🤖 | M-L | 15-12-2026 | Resultados de 2025 idénticos |
| RULES-3 | Paquete 2026 provisional (DA 61.ª, art. 23.2, DA 62.ª, DA 65.ª, RETA 2026) con interruptor para el RDL 29/2026 | 🤖 | M | 31-01-2027 | `diffRules(2025, 2026)` documentado |
| RULES-4 | Cuotas RETA 2027 y tarifa plana (80 € si no cambia) al publicarse la Orden | 🤖 | S | 15 días tras su publicación | Test contra la Orden |
| RULES-5 | Orden del modelo 100 de 2026, casillas y fechas de campaña | 🤖 | S-M | 5 días tras su publicación (esperada en marzo de 2027) | Catálogo nuevo |
| RULES-6 | Manual práctico 2026 y 19 comunidades; paquete a confirmado | 🤖 | M-L | 2 semanas tras el inicio de campaña (hacia el 22-04-2027) | Casos del Manual en verde |

### 8.3 Orden de ejecución sugerido

1. Semana del 20-10-2026: OPS-1, OPS-2, DPA-1, RULES-1.
2. Hasta el 20-11-2026: OPS-3, DPA-2, DPA-3, DPA-4, AN-1.
3. Hasta el 31-12-2026: AN-2, DPA-5, TAX-1, TAX-2, RULES-2.
4. Enero-abril de 2027: RULES-3 a RULES-6, TAX-3.

---

## Anexo A: fuentes

Fecha de consulta: **20-10-2026**, salvo que se indique otra. Las cifras de precios cambian: se revisan cada trimestre.

### Monitorización, errores, analítica y proveedores

- Plausible Community Edition: [plausible.io/self-hosted-web-analytics](https://plausible.io/self-hosted-web-analytics). Gratis, licencia AGPLv3, **sin embudos** en la edición autoalojada (consultada el 20-10-2026).
- Resto de precios y límites citados en los apartados 1 y 3 (UptimeRobot, Healthchecks.io, Sentry, Umami, Cloudflare Web Analytics, Resend, Hetzner): páginas de precios de cada proveedor. Los precios del resumen son orientativos y proceden de una consulta anterior del agente; hay que reconfirmarlos antes de contratar (ver Anexo B).

### Normativa y AEAT

- [Ley 35/2006 del IRPF, texto consolidado](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764) (BOE, consultado el 20-10-2026).
- [Orden PJC/297/2026 (cotización 2026)](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296) (BOE, 20-10-2026).
- [Real Decreto 126/2026, de 18 de febrero, SMI 2026](https://www.boe.es/eli/es/rd/2026/02/18/126/con): 1.221 euros al mes en 14 pagas, 17.094 euros al año (BOE, 20-10-2026).
- Real Decreto-ley 15/2025 (BOE de 3-12-2025): retrasa VERI\*FACTU al 1-01-2027 para sociedades y al 1-07-2027 para el resto. Fuente secundaria: [LegalToday, 4-12-2025](https://www.legaltoday.com/actualidad-juridica/noticias-de-derecho/nueva-prorroga-verifactu-no-sera-obligatorio-hasta-2027-para-sociedades-y-otros-contribuyentes-2025-12-04/) (20-10-2026). Falta confirmar la convalidación en el BOE.
- Tarifa plana de 80 euros: Real Decreto-ley 13/2022; la cuantía solo cambiaría con una Ley de Presupuestos. Fuente secundaria: [Mutua Fácil](https://mutuafacil.es/guias-y-recursos/autonomo-tarifa-plana/) (20-10-2026), un blog comercial: confirmar en la web de la Seguridad Social.
- Calendario del contribuyente de la AEAT 2026 y campaña de Renta 2025 (Orden HAC/277/2026): [sede.agenciatributaria.gob.es](https://sede.agenciatributaria.gob.es) (datos recogidos por el agente anterior; no repetidos en esta revisión).
- Real Decreto 806/2026 (disolución de las Cortes) y Real Decreto-ley 29/2026: citados por el agente anterior desde el BOE; **no se han vuelto a comprobar** en esta revisión (ver Anexo B).

### RGPD y AEPD

- [Facilita RGPD](https://www.aepd.es/guias-y-herramientas/herramientas/facilita-rgpd), [Gestiona EIPD](https://www.aepd.es/guias-y-herramientas/herramientas/gestiona-eipd), [Comunica-Brecha](https://www.aepd.es/guias-y-herramientas/herramientas/comunica-brecha-rgpd), [Guía de brechas](https://www.aepd.es/guias/guia-brechas-seguridad.pdf), [Guía de cookies](https://www.aepd.es/guias/guia-cookies.pdf), [lista de tratamientos que exigen EIPD](https://www.aepd.es/documento/listas-dpia-es-35-4.pdf).
- Cláusulas tipo: [Decisión (UE) 2021/914](https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj). Marco UE-EE. UU.: [Decisión (UE) 2023/1795](https://eur-lex.europa.eu/eli/dec_impl/2023/1795/oj) y [lista del DPF](https://www.dataprivacyframework.gov/list).

### Código y documentos del repositorio

- `docs/informe-calidad-app.md` (20-10-2026): secciones C.7, D y D.1.
- `docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md` (17 y 20-10-2026): dudas abiertas 1-14.
- `docs/fiscalidad/informe-gestor-real.md` y `docs/fiscalidad/hoja-de-ruta.md` (19-10-2026): P0-1, bloque 10 y mantenimiento anual.
- `deploy/docker-compose.yml`, `deploy/Caddyfile`, `deploy/scripts/{deploy,offsite-backup}.sh`, `deploy/RESTORE.md`.
- `backend/src/main.ts`, `application/push/ReminderService.ts`, `domain/services/autonomo.ts` (`deadlinesFor`, `businessDay`), `domain/ports/services.ts` (`MetricName`), migraciones `001-033`.
- `frontend/src/core/acquisition.ts`, `core/monitoring/errorReporting.ts`, `core/notifications/notifications.ts`, `modules/finances/domain/fiscalFigures.ts`, `modules/tools/domain/rentaCampaign.ts`, `modules/tools/data/reta2026.ts`.

## Anexo B: lo que no se pudo verificar

- **Precios de proveedores** (UptimeRobot, Sentry, Plausible Cloud, Resend, Hetzner): no se volvieron a abrir en esta revisión. Reconfirmar antes de contratar.
- **RDL 29/2026, Real Decreto 806/2026 y elecciones del 29-11-2026:** proceden del trabajo previo y no se pudieron contrastar en el BOE en esta revisión. Hasta confirmarlos, el motor debe tratar las reglas de alquiler como interruptor.
- **Calendario AEAT 2027:** no publicado; las fechas de 2027 son previstas (regla del día hábil siguiente). Lo mismo para la campaña de Renta 2026 y su Orden.
- **IPREM 2026, Presupuestos 2026 y tabla del RETA 2027:** no se encontró la cuantía ni confirmación en esta consulta.
- **Tarifa plana:** solo hay fuentes comerciales; una de ellas habla de 88,64 euros en 2026, otras de 80 euros. Se mantiene 80 euros con aviso hasta ver la fuente oficial.
- **VERI\*FACTU:** convalidación del RDL 15/2025 y fechas por colectivo, a confirmar en el BOE.
- **Excepción de la analítica sin consentimiento (AEPD):** la redacción literal no se pudo extraer del PDF.
- **DPF y proveedores de EE. UU.:** comprobar uno a uno la adhesión en la lista oficial y el posible recurso contra la decisión de adecuación.
- **Festivos autonómicos y locales** en plazos de presentación electrónica: casos límite sin verificar.
- **PWA en iOS dentro de la UE:** sin cambios conocidos en 2025-2026, pero no hay fuente oficial.
- Este plan es orientativo: no sustituye asesoramiento jurídico o fiscal, y Finanverso no presenta ni representa a nadie ante la Administración.
