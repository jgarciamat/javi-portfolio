# Analítica del embudo (propia, sin cookies)

Decisiones D2 y D4 del plan de crecimiento (`docs/marketing/plan-crecimiento.md`). Todo se queda
en nuestro servidor: no hay terceros, ni transferencias, ni cookies, ni identificadores, así que no
hace falta banner.

## Qué se mide

Contadores **diarios y agregados** en la tabla `funnel_daily` (migración 034): `día`, `evento`,
`origen`, `campaña`, `detalle` y `número`. Nada más.

| Evento | Quién lo cuenta | Cuándo | Origen |
|---|---|---|---|
| `visit` | navegador | cada carga de la web o de la app (no son personas únicas) | sí |
| `guide_view` / `guide_cta_click` | navegador | vista de una guía / clic en «Crear cuenta» (detalle = slug) | sí |
| `signup_view` | navegador | se abre la página de registro | sí |
| `pricing_view` / `paywall_view` | navegador | página de precios / aviso Premium | sí |
| `signup`, `trial_start` | servidor | cuenta nueva (email o Google); hoy la prueba de 14 días empieza con el alta | sí, llega en la propia petición de registro |
| `email_verified` | servidor | se verifica el email (Google cuenta como verificado) | no |
| `first_transaction` | servidor | primer movimiento (a mano o importado) | no |
| `activation_step` | servidor | se alcanza un paso: `movements` (3), `budgets`, `goals`, `automations` | no |
| `activation_done` | servidor | se completan los cuatro primeros pasos | no |
| `checkout_start`, `premium`, `cancel` | servidor | pago iniciado, compra confirmada (web o Play) y baja de una suscripción | no |
| `trial_notice` | servidor | aviso del fin de la prueba enviado (detalle = `ends_soon`, `last_day` o `ended`, más `:email` o `:push`) | no |

- **Origen**: el servidor lo normaliza a partir de `utm_source` o, si no hay, del dominio que
  enlaza (`google`, `tiktok`, `youtube`, `x`…); sin nada, `(direct)`; en la app, `(app)`.
  **Campaña**: `utm_campaign/utm_content` (p. ej. `renta2026/v041`).
- El navegador guarda la UTM y el dominio de la página de entrada **solo en memoria** durante esa
  carga, y los envía con cada evento y con el registro. Si la persona se va y vuelve otro día,
  ese origen se pierde (es el precio de no usar almacenamiento ni banner).
- **Lista cerrada**: `frontend/src/core/analytics.ts` (`TRACK_EVENTS`) y
  `backend/src/domain/ports/services.ts` (`CLIENT_FUNNEL_EVENTS`). Los eventos del servidor no se
  aceptan desde el navegador.

Uso en el frontend:

```ts
import { track } from '@core/analytics';
track('guide_view', { guide: 'modelo-303' }); // nunca lanza un error ni bloquea la página
```

## Qué no se mide

- Ni IP, ni user-agent, ni cookies, ni `localStorage`, ni huella del navegador, ni id de usuario
  o de sesión. El límite de peticiones guarda la IP **en memoria** durante un minuto, como en el
  resto de la API, y no la escribe en ningún sitio.
- No se cruza con la cuenta: los pasos posteriores al registro no tienen origen. Para saber qué
  campaña trae usuarios **que pagan** habría que guardar el origen en la cuenta (decisión del
  dueño pendiente; exige cambiar la política).
- Única excepción, aparte de esta analítica: el **programa de creadores** (`docs/afiliacion/programa.md`)
  guarda en la cuenta el código de un creador, pero solo si la persona marca la casilla del registro
  (consentimiento) y solo para pagarle su comisión. Está apagado por defecto.
- Si el navegador envía *Global Privacy Control* o *Do Not Track*, o es un navegador automatizado,
  no se envía nada. El servidor tampoco cuenta los bots conocidos (por su user-agent, que lee y
  descarta).

## Protecciones

`POST /api/funnel` es público: validación zod estricta (sin campos extra, textos de 80 caracteres
como máximo, slug `[a-z0-9-]`), 30 peticiones por minuto y red, y un tope de 1000 filas distintas
por día (lo que pase de ahí se suma a `(other)`). Un contador que no se puede escribir nunca rompe
la petición que lo cuenta. Los números se pueden inflar desde fuera: tomarlos como tendencia, no
como contabilidad (las compras reales están en Stripe y Play).

## Retención

Los días con más de **25 meses** se borran solos (cada 6 horas), para poder comparar una campaña de
la Renta con la del año anterior.

## Cómo consultarlo

En local: `cd backend && npm run funnel -- 30` (últimos 30 días; el número es opcional).

En producción, en el servidor:

```sh
docker compose exec api node dist/infrastructure/sqlite/cli.js funnel 30
```

El informe de texto trae: totales con la conversión entre pasos, pasos de activación, tabla por
origen (visitas, clics, registros, alta/visita), por campaña o vídeo, por guía (clic/vista) y por
día. Consulta directa, si hace falta:

```sql
SELECT source, SUM(count) FROM funnel_daily
WHERE event = 'signup' AND day >= date('now', '-30 day') GROUP BY source ORDER BY 2 DESC;
```

No hay panel web ni endpoint de administración: así no hay una superficie nueva que proteger.

## Avisos del fin de la prueba (D5)

Mensajes de **servicio** sobre la propia prueba de 14 días, por email (dirección verificada) y por
push (solo dispositivos que ya lo permitieron); el aviso `ended` va **solo por push**, nunca por email
(prudencia con el art. 21 LSSI). Código: `TrialNoticeService`, tarea horaria en
`main.ts`; envía solo entre las 07 y las 11 UTC (8-13 h en España).

| Mensaje | Cuándo (día natural en España) | Contenido |
|---|---|---|
| `ends_soon` | 2 días antes de que acabe | cuándo termina, que no hay tarjeta ni cobro, lo que sigue gratis y lo que pasa a Premium, enlace a `/pricing` |
| `last_day` | el día en que acaba (si aún no ha acabado) | lo mismo, más corto |
| `ended` | de 1 a 3 días después de acabar | lo que sigue gratis y cómo ver los planes; **solo push** (sin email ni reintento por email) |

Condiciones: solo a quien sigue en la prueba (origen `trial`, no vitalicio, sin suscripción de pago ni
de Google Play, sin baja programada) y no ha desactivado «Avisos sobre mi prueba de Premium» (Ajustes;
activo por defecto). Cada mensaje sale una vez por usuario (`trial_notice_log`); si el proveedor
falla y no llegó por ningún canal, se reintenta a la hora siguiente (`ended`: si no hay push permitido, no se envía nada). El email lleva solo recuentos
(cuentas, presupuestos, metas, automáticos) frente al límite gratuito, nunca importes ni nombres.
Se cuenta cada envío en `funnel_daily` (`trial_notice`, sin datos personales). Un usuario cuya
prueba ya terminó hace más de 3 días no recibe nada (no hay envío retroactivo).

