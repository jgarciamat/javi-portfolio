# Money Manager

Gestor de finanzas personales: web (PWA) + app Android/iOS (Capacitor) + API.
Producción: <https://www.winjgm.com>

| Parte | Tecnología |
|---|---|
| `frontend/` | React 19, Vite, TypeScript, PWA (Workbox), Capacitor 8 |
| `backend/` | Node 24, Express 4, TypeScript, SQLite (better-sqlite3), zod |
| `deploy/` | Docker Compose, Caddy (HTTPS), nginx |

## Funcionalidades

- **Movimientos** de ingreso, gasto y ahorro, con notas, cuenta y categoría.
- **Vista mensual** en una sola petición: resumen, saldo arrastrado, alertas y progreso de presupuestos.
  Vistas por día, semana y calendario.
- **Mes personalizable**: el mes puede empezar cualquier día del 1 al 28 (p. ej. el día de cobro).
- **Cuentas** (corriente, efectivo, tarjeta…) con saldo inicial y **transferencias** entre ellas.
- **Presupuestos por categoría** con avisos al 80 % y al 100 %.
- **Metas de ahorro** con progreso y ahorro mensual necesario.
- **Reglas recurrentes** (mensual, bimestral, trimestral, anual). Los cambios se aplican desde el mes actual
  y los movimientos generados que borras no se vuelven a crear.
- **Importación de extractos** CSV (cualquier separador y formato numérico) y Norma 43, con detección de
  duplicados y categorización automática a partir de tu historial, palabras clave y, en Premium, IA.
- **Búsqueda y filtros** por texto, tipo, categoría, cuenta, fechas e importes.
- **Análisis**: tendencias por categoría (frente al mes anterior y a la media de 3 meses) y evolución del patrimonio.
- **Asesor IA** (Cloudflare Workers AI) con respaldo por reglas. Solo se envían cifras agregadas, nunca descripciones.
- **Alertas personalizadas**, exportación CSV y **exportación completa de datos** en JSON (portabilidad RGPD).
- **Ajustes** de moneda, idioma (es/en, guardado en la cuenta) y notificaciones locales.
- Cuentas con email y contraseña (verificación por email) o con Google.
- **Planes Gratis y Premium** (prueba de 14 días), pagos con Stripe y sección de **ofertas de partners**.

## Planes y monetización

| | Gratis | Premium |
|---|---|---|
| Cuentas / presupuestos / metas / recurrentes / alertas | 1 / 3 / 1 / 3 / 3 | ilimitado |
| Importar extractos, análisis (tendencias y patrimonio) | — | ✓ |
| Asesor IA | análisis por reglas | 30 análisis IA al mes |

- Precios (IVA incluido): **2,99 €/mes**, **24,99 €/año** y plan **fundador de 49 €** (pago único, plazas
  limitadas por `FOUNDER_LIMIT`). Todos los usuarios nuevos tienen **14 días de Premium** sin tarjeta; si
  pagan durante la prueba, Stripe no cobra hasta que termine.
- La regla de "¿es Premium?" está en un solo sitio (`domain/model/Subscription.ts → planOf`) y los
  límites en `domain/services/plans.ts`. Las acciones bloqueadas responden **402** con `PLAN_LIMIT` o
  `PREMIUM_REQUIRED`; el frontend abre el diálogo de mejora automáticamente. Al bajar a Gratis no se
  borra nada: solo se impide crear más.
- **Pagos (Stripe)**: Checkout para suscribirse, Customer Portal para cambiar de plan, tarjeta o cancelar,
  y un webhook (`POST /api/billing/webhook`) idempotente que relee el estado real de la suscripción.
  Sin claves de Stripe la app funciona y el botón de pago aparece deshabilitado. En las apps nativas no
  se ofrece el pago (normas de las tiendas): se remite a la web. Prueba local:
  `stripe listen --forward-to localhost:3000/api/billing/webhook`.
- **IA sin coste**: Cloudflare Workers AI dentro de su asignación gratuita diaria (10.000 neuronas).
  La API suma las neuronas de cada llamada y deja de llamar al llegar a `AI_DAILY_NEURON_BUDGET`
  (9.000 por defecto); además hay cuota mensual por usuario y caché persistente (repetir el análisis con
  las mismas cifras no gasta). Si algo se agota, se devuelve el análisis por reglas indicando el motivo.
  Gemini solo con `AI_PROVIDER=gemini` y clave **de pago** (su capa gratuita no puede usarse para
  usuarios del EEE).
- **Afiliación**: las ofertas se leen de `AFFILIATES_FILE` (en producción `deploy/config/affiliates.json`;
  ejemplo en `backend/config/affiliates.example.json`). Se muestran en su propia sección marcadas como
  patrocinadas, el usuario puede ocultarlas en Ajustes, se cuentan los clics y la IA nunca recomienda
  productos concretos.
- Páginas públicas: `/pricing` (planes) y `/terms` (condiciones, **borrador**: completar los datos del
  titular y revisar el desistimiento antes de cobrar).

## Arquitectura

```
backend/src
├── config/            Variables de entorno validadas (falla al arrancar si faltan secretos en producción)
├── domain/            Modelo puro: entidades, reglas, errores tipados, periodos, dinero en céntimos
│   ├── model/         Transaction, Category, Account, RecurringRule, Goal, CategoryBudget, User…
│   ├── services/      Resumen, presupuestos, tendencias, categorizador, asesor por reglas
│   └── ports/         Interfaces de repositorios y servicios externos
├── application/       Casos de uso agrupados por funcionalidad (servicios de aplicación)
├── infrastructure/
│   ├── sqlite/        Conexión, migraciones versionadas (PRAGMA user_version) y repositorios
│   ├── http/          Express: rutas, validación zod, presentadores, errores, rate limiting
│   ├── auth/ mail/ ai/ billing/ offers/ backup/   Adaptadores (JWT, Google, Resend, Workers AI,
│   │                  Gemini, Stripe, catálogo de ofertas, copias de seguridad)
│   └── container.ts   Composition root
└── main.ts            Arranque: migraciones, backups, servidor, parada ordenada
```

- Todos los repositorios reciben el `userId`: ninguna consulta puede leer ni modificar datos de otro usuario.
- Los importes se guardan como **enteros en céntimos**. La API habla en decimales (`12.34`).
- Las fechas son fechas de calendario `YYYY-MM-DD` (sin zona horaria).
- Las transacciones referencian la categoría **por id**: renombrar es seguro y borrar exige reasignar.

El frontend sigue la misma idea por módulos (`modules/<feature>/{domain,application,ui}`), con
`core/` (API, i18n, ajustes, notificaciones) y `shared/` (componentes y utilidades de formato).

## Desarrollo local

```bash
npm run install:all        # una vez: dependencias de backend y frontend
cp backend/.env.example backend/.env
npm run dev                # API en :3000 y app en http://localhost:5176 (se abre sola)
```

`npm run dev` (raíz) arranca la API, espera a que responda y lanza Vite en el puerto 5176; `Ctrl+C`
para los dos. También puedes arrancarlos por separado con `npm run dev` dentro de `backend/` y `frontend/`.
Sin `RESEND_API_KEY` los enlaces de verificación y recuperación se imprimen en la consola de la API.
Para el login con Google en local, añade `http://localhost:5176` como origen autorizado en Google Cloud.

La base de datos SQLite se crea y migra sola al arrancar (`DATABASE_PATH`, por defecto `backend/data/money-manager.db`).
Para un usuario de prueba en local: `SEED_DEMO_USER=true` y `SEED_DEMO_PASSWORD=...` en `backend/.env`.

| Comando | Qué hace |
|---|---|
| `npm test` / `npm run test:coverage` | Tests (backend: unitarios + integración HTTP con SQLite en memoria) |
| `npm run lint`, `npx tsc --noEmit` | Lint y tipos |
| `npm run db:migrate` (backend) | Aplica migraciones pendientes (también se hace al arrancar) |
| `npm run db:backup` (backend) | Copia consistente de la BD en `BACKUP_DIR` |
| `npm run build:android:prod` (frontend) | Build web para la app Android y `cap sync` |

## Producción

`.github/workflows/ci-deploy.yml` ejecuta el CI completo y, en `master`, llama por SSH a
`deploy/scripts/deploy.sh`, que:

1. actualiza el checkout,
2. construye las imágenes `money-manager-api` y `money-manager-web` **sin parar el servicio**,
3. la primera vez, copia la base de datos antigua (`backend/data/money-manager.db`, que vivía dentro del checkout) al volumen `api_db`,
4. recrea solo los contenedores que cambian y espera al healthcheck de la API.

Configuración en `deploy/.env` (plantilla en `deploy/.env.example`). Obligatorio: `JWT_SECRET`
(la API no arranca sin él o con un valor publicado). Para el login con Google, `GOOGLE_CLIENT_ID`.
Para cobrar: `STRIPE_*` (y el webhook en el panel de Stripe apuntando a `/api/billing/webhook`);
para la IA: `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_AI_TOKEN`.

### Datos y copias de seguridad

- La BD vive en el volumen Docker `api_db` (`/data/money-manager.db`), fuera del repositorio.
- La API hace una copia diaria consistente en el volumen `api_backups` y conserva `BACKUP_RETENTION_DAYS` días.
- Antes de aplicar migraciones guarda además `pre-migration-v<N>-<fecha>.db` junto a la BD.
- **Copia `api_backups` fuera del servidor** (rclone, restic…): un volumen en la misma máquina no protege de perder la máquina.

## Seguridad

- Contraseñas con bcrypt y política común (8+ caracteres, mayúscula, número y símbolo) en registro, reset y cambio.
- Access token JWT de 15 min con versión de sesión: cambiar o restablecer la contraseña y "cerrar sesión
  en todos los dispositivos" invalidan al momento todos los tokens. Los refresh tokens son aleatorios,
  se guardan hasheados y caducan a los 30 días sin uso.
- El login con Google verifica que el token se emitió para nuestro `GOOGLE_CLIENT_ID`.
- Límites de intentos (login, registro, emails, IA), helmet, CORS con lista blanca, sin enumeración de
  cuentas en la recuperación de contraseña, nombres escapados en los emails.
