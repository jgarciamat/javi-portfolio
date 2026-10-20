# Monitorización, errores y límites de Docker

Todo esto lo hace el dueño a mano: aquí no hay cuentas creadas ni claves puestas.
Orden recomendado: 1) UptimeRobot (10 min), 2) Sentry (15 min), 3) mirar los límites de Docker.

---

## 1. Aviso cuando la web o la API se caen (UptimeRobot, gratis)

1. Entra en <https://uptimerobot.com> y pulsa **Register for FREE**. Usa `moneymanager@outlook.es`
   y confirma el correo.
2. **+ Create monitor** (botón arriba a la izquierda). Crea estos dos:

   | Campo | Web | API |
   |---|---|---|
   | Monitor Type | HTTP(s) | HTTP(s) – Keyword |
   | Friendly Name | Finanverso web | Finanverso API |
   | URL | `https://finanverso.app/` | `https://finanverso.app/api/health` |
   | Keyword (solo API) | (no hay) | `"status":"ok"` · Alert when: *keyword does not exist* |
   | Monitoring interval | 5 minutes | 5 minutes |

3. En **Alert contacts to notify** marca tu correo `moneymanager@outlook.es`. Si quieres aviso al
   móvil, instala la app UptimeRobot (iOS/Android) e inicia sesión: llegan notificaciones push.
4. (Opcional) En *Status pages* crea una página pública si algún día la quieres.

Alternativa: **Better Stack** (<https://betterstack.com/uptime>), mismos dos monitores; su plan
gratis incluye llamada/SMS limitados.

La API responde `{"status":"ok"}` en `/api/health` y consulta la base de datos; devuelve 503 si falla.

### Comprobación manual

    deploy/scripts/check-health.sh                      # web, API y caducidad del certificado
    deploy/scripts/check-health.sh https://finanverso.app

Sale con código 0 si todo va bien y 1 si algo falla. En el servidor puedes ponerlo en cron cada
5 minutos con aviso de healthchecks.io (ya lo usas para las copias): crea un check nuevo
«finanverso-health» (periodo 5 min, gracia 10 min) y

    */5 * * * * HEALTHCHECK_PING_URL=https://hc-ping.com/<uuid-del-check> /opt/winjgm/javi-portfolio/deploy/scripts/check-health.sh >/dev/null

Si el script falla no hace ping y healthchecks.io te escribe a `moneymanager@outlook.es`.
(El de las copias de seguridad, `offsite-backup.sh`, ya usa healthchecks.io: ver `RESTORE.md`.)

---

## 2. Errores de la app y del servidor (Sentry, región UE)

Es **opcional y está apagado** mientras no pongas un DSN. Con DSN vacío no se carga código ni se
envía nada. No hay SDK: son ~100 líneas propias (`frontend/src/core/monitoring/errorTracking.ts` y
`backend/src/infrastructure/monitoring/errorTracking.ts`) que hablan el protocolo de Sentry.

### Qué se envía y qué no

- Se envía: tipo y mensaje del error (**limpiados**: correos, NIF/NIE/CIF, IBAN, importes, números
  largos, tokens y todo `?query` se sustituyen por `[email]`, `[id]`, `[iban]`, `[amount]`, `[n]`,
  `[token]`), la pila (archivo, línea, función), la ruta de la página sin ids (`/mensual`), el
  entorno y el tipo de fallo. En la API, además, método y ruta con los ids cambiados por `:id`.
- **No** se envía: cuerpos de peticiones, cabeceras, cookies, IP, usuario, correo, capturas,
  grabaciones de sesión, rastros de navegación ni datos del dispositivo.
- Se ignoran: fallos de red (`Failed to fetch`, `NetworkError`, `Load failed`), `Script error.`,
  errores de extensiones del navegador, errores al cargar módulos (ya los trata el recargador de
  versión) y, en la API, cortes de conexión del cliente. Un mismo mensaje se envía una vez por minuto
  como mucho en la API y cinco veces por carga de página en el navegador.

### Crear la cuenta (Sentry, centro de datos de la UE)

1. Entra en <https://sentry.io/signup/>. Al registrarte, en **Data Storage Location** elige
   **European Union (DE)**. (Si ya tienes cuenta en EE. UU., crea otra organización con región UE;
   no se puede cambiar después.) Usa `moneymanager@outlook.es`.
2. Plan **Developer** (gratis).
3. **Projects → Create Project**. Haz dos:
   - Plataforma **Browser JavaScript** → nombre `finanverso-web`. Marca *Alert me on every new issue*.
   - Plataforma **Node.js** → nombre `finanverso-api`.
4. En cada proyecto: **Settings → Client Keys (DSN)** y copia el DSN (empieza por `https://` y
   contiene `.ingest.de.sentry.io`).
5. En **Settings → Security & Privacy** de la organización activa **Data Scrubber**,
   **Use Default Scrubbers** y **Prevent Storing of IP Addresses**.

### Dónde poner los DSN

El DSN del navegador es público por diseño (va dentro de la web); el de la API es secreto de
gestión pero tampoco da acceso a datos.

- **Web**: en el repo, `frontend/.env.production`, línea `VITE_SENTRY_DSN=<DSN de finanverso-web>`.
  Hace falta desplegar (se incorpora al compilar). `deploy/Caddyfile` ya permite
  `https://*.ingest.de.sentry.io` en `connect-src` de la política en Report-Only; cuando esa política
  pase a enforcing (ver `CSP.md`) seguirá permitido.
- **API**: en el servidor, `/opt/winjgm/javi-portfolio/deploy/.env`, línea
  `SENTRY_DSN=<DSN de finanverso-api>`, y `docker compose up -d api` (o `deploy.sh`).
- Para apagarlo: deja la variable vacía y vuelve a desplegar.

### Probarlo

- API: mira el arranque, no avisa; provoca un 500 de prueba solo en un entorno de pruebas.
- Web: en la consola del navegador de la web ya desplegada: `setTimeout(() => { throw new Error('prueba sentry') })`
  y comprueba que aparece en Issues (el mensaje saldrá como `prueba sentry`).

### Alternativa: GlitchTip

Mismo protocolo, sin cambiar código. Crea el proyecto en <https://glitchtip.com> (o en tu propio
servidor), copia su DSN a las mismas variables y añade su dominio a `connect-src` en
`deploy/Caddyfile` (línea `Content-Security-Policy-Report-Only`; al pasar a enforcing, también ahí).
Comprueba que el servicio aloja los datos en la UE si lo necesitas por RGPD.

### Privacidad

Añadir un proveedor de error-tracking es un encargado del tratamiento: apúntalo en la política de
privacidad (proveedor, finalidad «detección de errores», datos mínimos sin identificadores, región UE)
antes de activarlo en producción.

---

## 3. Límites de Docker (`deploy/docker-compose.yml`)

Reparto para un servidor de 4 GB (unos 1,2 GB para contenedores; el resto, sistema, builds de
`deploy.sh` y caché de disco):

| Servicio | `mem_limit` | `cpus` | `pids_limit` | Notas |
|---|---|---|---|---|
| `caddy` | 256 MB | 0,5 | 200 | TLS y proxy |
| `web` (nginx) | 128 MB | 0,5 | 100 | estáticos |
| `api` | 768 MB | 1,0 | 200 | Node con `--max-old-space-size=512` |

Todos: `restart: unless-stopped`, `healthcheck` (caddy: API de administración; web: `wget /`;
api: `/api/health`), logs `json-file` de 3 × 10 MB, `no-new-privileges` y sin swap
(`memswap_limit` = `mem_limit`). Si la API supera el límite, Docker la mata y `restart` la levanta;
la base de datos está en un volumen, no se pierde.

### Cómo medirlos y ajustarlos

    docker stats --no-stream                       # memoria y CPU ahora mismo
    docker inspect -f '{{.State.OOMKilled}} {{.RestartCount}}' deploy-api-1   # ¿lo mató por memoria?
    docker compose ps                              # estado y healthcheck de cada servicio
    free -m                                        # memoria libre del servidor

1. Mide con la web en uso normal y tras un día completo (copia de seguridad a las 04:30, resumen
   semanal): anota el pico de `MEM USAGE` de cada servicio con `docker stats`.
2. Regla: `mem_limit` ≈ 1,5 × el pico observado, sin pasar de 1 GB para la API. Si `OOMKilled` sale
   `true` o `RestartCount` sube, súbelo en pasos de 128 MB (y `--max-old-space-size` a ~65 % del
   límite).
3. Si el servidor tiene más RAM, súbelos de forma proporcional.
4. Aplica con `docker compose up -d` (recrea solo lo que cambia).

No he podido arrancar Docker en el entorno de desarrollo: el fichero se validó como YAML pero **la
primera vez revisa `docker compose config` y `docker compose ps`** en el servidor tras desplegar y
confirma que los tres servicios quedan `healthy`.
