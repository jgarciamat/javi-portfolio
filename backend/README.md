# Backend — Money Manager API

Express + SQLite con arquitectura hexagonal. Visión general del proyecto en el [README raíz](../README.md).

## Capas

| Capa | Carpeta | Depende de |
|---|---|---|
| Dominio | `src/domain` (`model`, `services`, `shared`, `ports`, `errors.ts`) | nada |
| Aplicación | `src/application/<feature>` | dominio (vía puertos) |
| Infraestructura | `src/infrastructure` (`sqlite`, `http`, `auth`, `mail`, `ai`, `backup`) | dominio y aplicación |
| Composición | `src/infrastructure/container.ts`, `src/main.ts` | todo |

Reglas:

- El dominio no importa nada de Express, SQLite ni librerías de red.
- Los repositorios son síncronos (SQLite va en el mismo proceso) y reciben siempre el `userId`.
  Las operaciones de varios pasos usan `UnitOfWork.run()` (una transacción SQLite).
- Los errores de negocio son clases de `domain/errors.ts` con un `code` estable; `http/middleware.ts`
  los traduce a HTTP (`400/401/403/404/409`) y el frontend reacciona al `code`, no al texto.
- Toda entrada HTTP se valida con zod (`http/schemas.ts`) y los importes se convierten a céntimos ahí.

## Migraciones

`src/infrastructure/sqlite/migrations/NNN-*.ts`, aplicadas en orden por `migrator.ts` según
`PRAGMA user_version`. Cada una corre en su transacción, con comprobación de claves foráneas antes del
commit y copia de seguridad previa (`VACUUM INTO`) si la BD ya tenía datos.

**Nunca edites una migración ya aplicada en producción: crea una nueva.**

- `001` reproduce el esquema de la v1.x (cualquier BD antigua queda en un punto conocido).
- `002` modelo v2: céntimos, categorías por id, cuentas, ajustes, presupuestos, metas y tokens hasheados.
- `003` desactiva el usuario `admin@admin.com` sembrado por la v1 si aún tenía la contraseña `admin`.
- `004` periodos omitidos de las reglas recurrentes.

## Tests

- `src/tests/domain`: reglas puras (periodos, dinero, entidades, servicios).
- `src/tests/integration`: la API real por HTTP (supertest) con SQLite en memoria, reloj fijo y
  adaptadores falsos (email, Google, IA). Incluye aislamiento entre usuarios y migración de una BD v1.
- `src/tests/infrastructure`: adaptadores (config, JWT, Google, Gemini, plantillas de email, backups).

## Endpoints principales

| Método y ruta | Descripción |
|---|---|
| `POST /api/auth/register · login · google · refresh · logout · logout-all` | Sesión |
| `GET/POST /api/auth/verify-email · resend-verification · forgot-password · reset-password` | Emails |
| `GET /api/months/:year/:month` | Mes completo: movimientos, resumen, saldo arrastrado, presupuestos y alertas |
| `GET·POST /api/transactions` · `PUT·PATCH·DELETE /api/transactions/:id` | Movimientos |
| `GET /api/transactions/search` · `GET /api/transactions/annual/:year` · `POST /api/transactions/import` | Búsqueda, anual, importación |
| `/api/categories` (`PATCH` renombra, `DELETE ?reassignTo=`) | Categorías |
| `/api/accounts`, `/api/transfers` | Cuentas y transferencias |
| `/api/budgets`, `/api/goals`, `/api/recurring-rules`, `/api/custom-alerts` | Planificación |
| `/api/settings`, `/api/profile/*`, `GET /api/export` | Ajustes, perfil y exportación |
| `GET /api/stats/trends/:year/:month`, `GET /api/stats/net-worth`, `POST /api/ai/advice` | Análisis |
| `GET /api/health` | Healthcheck (comprueba la BD) |
