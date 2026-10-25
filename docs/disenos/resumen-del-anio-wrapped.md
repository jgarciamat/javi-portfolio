# Diseño: «Resumen del año» (estilo Wrapped)

Estado: **solo diseño**, 25/10/2026. Nada de esto está implementado. Disponible a partir del
**15 de diciembre de 2026** (primer año). Formato tomado de
[`dinero-perdido-y-fecha-meta.md`](./dinero-perdido-y-fecha-meta.md).

Todos los nombres, cifras y fechas de ejemplo son **inventados**.

---

## A. Valor y resumen

**Qué es.** Una serie de 6 a 9 tarjetas verticales, animadas y pensadas para compartir, con el año
financiero de la persona: categoría estrella, mes más ahorrador, racha, nota de Salud financiera,
dinero recuperado con «Tu dinero perdido», metas alcanzadas y, si juega, su temporada crypto.
Se calcula en el servidor, de forma determinista, a partir de los movimientos que ya hay.

**Por qué es un gancho.** Es el único momento del año en que la gente comparte su balance sin que
se lo pidan (Spotify, Duolingo, Strava). Un usuario que lo comparte lleva el nombre de la app a
decenas de personas con una imagen que **no revela nada personal por defecto**. Y por la parte
interna, mira el año entero, así que obliga a tener los 12 meses bien importados.

**Principio de diseño: lo compartible es lo genérico.** La vista dentro de la app puede ser
precisa (es privada). La imagen para compartir sale **por defecto en «porcentajes y nombres
genéricos»**: «Ahorraste un 14 % de lo que ingresaste», «Tu categoría estrella: Ocio», sin importes,
sin comercios, sin alias. El usuario elige subir el nivel de detalle y se le avisa de lo que se ve.

**Lo que NO hace.** No compara con otras personas (eso es el comparador, documento 6). No
promete resultados, no da consejos de inversión ni fiscales y no usa IA. No se genera nada si no
hay datos suficientes (no se inventan tarjetas).

**Hallazgo clave de la investigación.** Casi todo existe, pero tres datos **no están en el
servidor**: la nota de Salud financiera (`healthScore` solo vive en
`frontend/src/modules/finances/domain/health.ts`), los retos del mes y su racha (se guardan solo
en `localStorage`: `mm_challenge` y `mm_challenge_done`) y la edad/comunidad (no existen). Para un
cálculo «determinista en servidor» hay que **portar `healthScore` al backend** (1 día, con test de
paridad) y **derivar la racha de los movimientos**, no del estado del reto (ver C.4).

---

## B. Lo reutilizable del código (rutas reales)

| Pieza                          | Ruta                                                                                                                                                                                                      | Qué aporta                                                                                                                                   | Cómo se usa                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Agregación de movimientos      | `summarize` en `backend/src/domain/services/summary.ts`                                                                                                                                                   | Único sitio que suma ingreso/gasto/ahorro por categoría (tipos `INCOME`, `EXPENSE`, `SAVING` de `domain/model/TransactionType.ts`)           | Base de los totales mensuales y anuales                                                          |
| Patrón servicio + endpoint     | `MoneyLeakService` (`backend/src/application/insights/MoneyLeakService.ts`), `GET /stats/money-leaks` en `backend/src/infrastructure/http/routes/user.routes.ts`, `presenters.ts`, `schemas.ts`           | Cálculo puro en `domain/services`, servicio fino, presentador con Zod                                                                        | Mismo patrón para `GET /stats/year-recap`                                                        |
| Datos del hogar                | `dataUserId` en `backend/src/infrastructure/http/middleware.ts`, `HouseholdService.dataOwner`                                                                                                             | Quien es miembro ve los datos del titular                                                                                                    | El resumen usa `dataUserId`, como el resto de estadísticas (ver I)                               |
| Nota de Salud financiera       | `healthScore`, `levelOf` en `frontend/src/modules/finances/domain/health.ts`                                                                                                                              | 4 pilares de 25 puntos, nivel excelente/bueno/mejorable/frágil                                                                               | Se porta a `backend/src/domain/services/health.ts` con los mismos casos de prueba                |
| Retos y racha                  | `noSpendDays`, `challengeProgress` (mismo archivo), `HealthView.tsx`                                                                                                                                      | Días sin gastar y racha                                                                                                                      | Se **reimplementa** sobre los movimientos del año (el reto elegido no se guarda en servidor)     |
| Dinero perdido                 | tabla `money_leak_decisions` (`migrations/041-money-leak-decisions.ts`), eventos `dp_recovered`                                                                                                           | Estados `cancel` y `recovered` con `annual_cents` y `recovered_at`                                                                           | «Dinero recuperado» = suma de `annual_cents` con `status='recovered'` y `recovered_at` en el año |
| Metas                          | `Goal.ts` (`computeGoalProgress`), `GoalService` en `application/planning/PlanningServices.ts`                                                                                                            | Progreso = suma de ahorros en la categoría de la meta                                                                                        | «Metas alcanzadas» = metas con progreso 100 % cuyo último ahorro cae en el año                   |
| Crypto: temporadas e insignias | tablas `crypto_sim_season_results`, `crypto_sim_badges` (migración 039), `domain/services/crypto-season.ts` (`BADGES`, `rankingAlias`, `returnPercent`), `CryptoRankingService`                           | Rentabilidad y puesto de cada mes, insignias                                                                                                 | Tarjeta opcional «Tu año en la consola» solo con alias elegido y porcentajes                     |
| Imagen compartible             | `recapImage` (canvas 1080 x 1350) en `frontend/src/modules/finances/domain/recapImage.ts`; `RecapShare.tsx` (interruptor «Mostrar importes en la imagen»)                                                 | Dibujo en cliente, sin enviar nada; ya es el patrón «sin importes por defecto»                                                               | Se generaliza a varias tarjetas y a 9:16                                                         |
| Compartir / guardar            | `shareImage` en `frontend/src/shared/utils/shareImage.ts`                                                                                                                                                 | Web Share con ficheros; si no se puede, descarga                                                                                             | Mismo envoltorio; añade carpeta de imágenes en lote                                              |
| Invitar                        | `ReferralService` (`backend/src/application/referrals/ReferralService.ts`), `inviteLink` en `frontend/src/core/referral.ts`, `InvitePanel.tsx` (`useInviteLink`)                                          | Código aleatorio de 8 caracteres, recompensa de 30 días de Premium al amigo que completa los primeros pasos, hasta 5 meses para quien invita | El texto de compartir lleva el enlace con UTM (G)                                                |
| Analítica                      | `TRACK_EVENTS` en `frontend/src/core/analytics.ts`, `CLIENT_FUNNEL_EVENTS` y `CLIENT_FUNNEL_DETAILS` en `backend/src/domain/ports/services.ts`, tabla `funnel_daily` (migración 034), `docs/analitica.md` | Contadores diarios, listas cerradas, origen UTM normalizado                                                                                  | Eventos `wrapped_*`                                                                              |
| Planes                         | `PLAN_LIMITS`, `PremiumFeature` en `backend/src/domain/services/plans.ts`; `EntitlementService`; `PremiumOnly.tsx`                                                                                        | Corte por función (`insights`)                                                                                                               | Ver E                                                                                            |
| Avisos                         | `ReminderService` (push de mañana), `WeeklyDigestService` (correo del lunes), `PushService`                                                                                                               | Canales con consentimiento ya pedido                                                                                                         | Un único aviso «Tu año ya está listo» (C.7)                                                      |
| Movimiento reducido            | `frontend/src/shared/utils/motion.ts`, esqueleto de `ConsoleSkeleton.tsx`                                                                                                                                 | `prefers-reduced-motion`                                                                                                                     | Animación y carga                                                                                |
| Exportación y borrado          | `ExportService` (`finanverso-export` v3)                                                                                                                                                                  | Art. 20 y supresión                                                                                                                          | El resumen no guarda nada (C.8), no añade sección                                                |

Lo que **no existe** y hay que crear: `backend/src/domain/services/year-recap.ts` (cálculo puro),
`health.ts` en backend, la ruta, la pantalla `YearRecapView`, el dibujo de tarjetas
`yearRecapImage.ts` y los textos.

---

## C. Diseño funcional

### C.1 Cuándo está disponible

- **Abre el 15 de diciembre** (hora de Madrid) del año `Y`. Entre el 15 y el 31 de diciembre se
  muestra como **«Avance de tu año»** (faltan días) y se marca en cada tarjeta compartible «hasta
  el 14 de diciembre» si se comparte antes del 1 de enero. El **1 de enero** pasa a definitivo
  («Tu 2026») sin que el usuario haga nada: es el mismo cálculo con otra fecha de corte.
- **Cierra el 31 de enero** del año siguiente como entrada destacada (deja de salir el aviso y la
  tarjeta del Resumen), pero la sección sigue en el menú todo el año, y los años anteriores se
  pueden ver (histórico: Premium, ver E).
- El año consultado se pide por parámetro (`year`); solo se admiten años con datos. No se
  admite un año futuro ni el actual antes del 15 de diciembre (`409 YEAR_NOT_READY`).

### C.2 Datos mínimos

Para que no salga un resumen vacío o engañoso:

| Condición (año `Y`, hasta la fecha de corte)                                         | Si no se cumple                                                                  |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Al menos **60 movimientos** y movimientos en **al menos 4 meses distintos**          | Estado «Todavía poco» (E.4): no se calcula ninguna tarjeta; se invita a importar |
| Para «mes más ahorrador»: al menos 3 meses con ingresos                              | Se omite esa tarjeta                                                             |
| Para «categoría estrella»: gastos en al menos 3 categorías                           | Se omite                                                                         |
| Para la racha: ver C.4                                                               | Se omite                                                                         |
| Para la nota de Salud: los pilares calculables (el mismo criterio que `healthScore`) | Se omite                                                                         |
| Para crypto: temporada oficial cerrada con puesto en `crypto_sim_season_results`     | Se omite                                                                         |

Siempre quedan **al menos 3 tarjetas** (portada, cifra principal y cierre), o el estado «Todavía poco».

### C.3 Las tarjetas

Orden fijo; cada una se omite si no se cumple su condición. Todas tienen versión «privada» (dentro
de la app, con importes) y versión «para compartir» (según el nivel de privacidad, C.5).

| #      | Tarjeta            | Contenido privado                                                           | Contenido compartible por defecto («Genérico»)                                                                     |
| ------ | ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1      | Portada            | «Tu 2026 en Finanverso»                                                     | igual                                                                                                              |
| 2      | Ahorro del año     | Ingresaste 31.400 €, gastaste 27.900 €, apartaste 3.100 €                   | «Apartaste un 10 % de lo que ingresaste»                                                                           |
| 3      | Categoría estrella | Ocio: 3.870 € (14 % de tus gastos)                                          | «Tu categoría estrella fue Ocio» (solo si es una categoría del sistema; si no, «Tu categoría estrella»), sin cifra |
| 4      | Mes más ahorrador  | Mayo: apartaste 520 €                                                       | «Tu mes más ahorrador fue mayo»                                                                                    |
| 5      | Racha              | 17 días seguidos sin gastar (en agosto)                                     | «Tu mejor racha: 17 días sin gastar»                                                                               |
| 6      | Salud financiera   | Nota 68 de 100, «Buena»                                                     | «Tu nota de Salud financiera: Buena» (sin número si el usuario no lo marca)                                        |
| 7      | Dinero recuperado  | 478 € al año que ya no se pierden                                           | «Recuperaste una parte de lo que perdías» (sin cifra; con cifra solo en el nivel 3)                                |
| 8      | Metas              | Alcanzaste 2 metas: «Viaje», «Colchón»                                      | «Alcanzaste 2 metas» (sin nombres)                                                                                 |
| 9      | Crypto (opcional)  | Temporada de octubre: +4,2 %, puesto 3; 2 insignias                         | «Jugaste 5 temporadas y conseguiste 2 insignias» (sin alias ni rentabilidad)                                       |
| Cierre | Invitación         | «Tu amigo también puede: 30 días de Premium si completa los primeros pasos» | igual, con `finanverso.app`                                                                                        |

**Reglas de «mes más ahorrador».** Es el mes con mayor tasa de ahorro (`ahorro / ingresos`,
ahorro = tipo `SAVING`; solo meses con ingresos > 0). Desempate: el más reciente. Para evitar
meses raros por una paga extra, se exige tasa ≤ 100 %.

**Reglas de «categoría estrella».** La de mayor gasto del año **excluyendo** las categorías
esenciales que el motor de «dinero perdido» ya trata como tal (Vivienda, Suministros, Impuestos) y
los movimientos entre cuentas, para que no gane siempre «Vivienda». Si el usuario no tiene ninguna
fuera de esas, se usa la mayor sin excluir. Desempate: orden alfabético estable.

**Reglas de racha de retos.** Ver C.4.

**Dinero recuperado.** Suma de `annual_cents` de decisiones `recovered` con `recovered_at` en el
año. Es dinero **estimado** que ya no se cobra; el texto dice «dejaste de pagar unos X al año»,
nunca «ahorraste».

**Metas alcanzadas.** Metas cuyo `computeGoalProgress` llegó al 100 % durante el año (el primer
movimiento de ahorro que la completa cae en el año).

**Crypto.** Solo si hay al menos una fila en `crypto_sim_season_results` del año. Muestra
número de temporadas con puntuación, mejor puesto del año (solo si hubo top 5) e insignias
(`BADGES`). La rentabilidad (porcentaje de dinero virtual) solo se enseña en la vista privada o
con el nivel de detalle alto. El alias **nunca** va en la imagen (ver H).

### C.4 La racha, sin depender del estado del reto

El reto «sin gastar» del Resumen de Salud financiera solo vive en el navegador. Para el Wrapped se
calcula **de los movimientos**: la racha más larga de días naturales sin ningún movimiento `EXPENSE`,
dentro de **meses fiables**. Un mes es fiable si tiene movimientos en al menos 12 días distintos
(si no, un día vacío puede ser simplemente que no apuntó). Las rachas no cruzan meses no fiables.
Si el mejor valor es menor de 3 días, la tarjeta se omite. La tarjeta dice «días sin gastar», no
«retos completados», para no prometer lo que no se mide en el servidor.

Fase 2: cuando exista el estado de los retos en servidor (lo necesita el documento
[`reto-de-ahorro-con-amigos.md`](./reto-de-ahorro-con-amigos.md)), la tarjeta pasa a «Completaste
N retos del mes».

### C.5 Niveles de privacidad (lo que el usuario elige)

Un selector de tres posiciones antes de compartir, con vista previa en vivo. Por defecto, la
posición 1.

| Nivel           | Nombre       | Qué muestra                                                                        | Qué nunca muestra                                            |
| --------------- | ------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1 (por defecto) | Genérico     | Porcentajes, meses, recuentos, categorías del sistema, «una categoría», «una meta» | Importes, comercios, nombres de metas, alias, nombre, correo |
| 2               | Con nombres  | Lo anterior + nombre de la categoría (aunque sea suya) y de las metas              | Importes, comercios, alias, nombre                           |
| 3               | Con importes | Lo anterior + cifras en euros                                                      | Comercios, alias, nombre                                     |

Cada tarjeta se puede **quitar** del lote (casilla «Incluir esta tarjeta»). Ningún nivel muestra
comercios ni descripciones de movimientos. Subir de nivel enseña un aviso: «La imagen incluirá
importes. Cualquiera que la vea los verá. ¿Seguir?» con «Mantener sin importes» como botón
principal.

### C.6 Generación de la imagen en el cliente

- **Sin enviar datos a terceros:** el servidor devuelve un JSON con los números; el dibujo es en el
  navegador (o en el dispositivo en la app de Android con Capacitor), igual que `recapImage`.
- **Formatos:** **9:16** (1080 x 1920, para historias y vídeos cortos) y **4:5** (1080 x 1350, para
  el feed). El usuario elige uno o «Los dos».
- **Técnica:** canvas 2D → `canvas.toBlob('image/png')` por tarjeta. Cada tarjeta tiene una función
  de dibujo pura `drawCard(ctx, card, format, theme)`. Se reutilizan `roundedRect`, `glow` y `text`
  de `recapImage.ts` (extraer a `shared/utils/canvasDraw.ts`). Fuente del sistema (como hoy), sin
  descargar fuentes de terceros.
- **Entrega:** `shareImage` (Web Share con ficheros) para una imagen; para varias, se comparte el
  lote si `navigator.canShare({files})` lo permite, si no «Guardar todas» descarga. Un ZIP no hace
  falta en el MVP.
- **Vídeo (fase 2):** `canvas.captureStream()` + `MediaRecorder` grabando la animación a 30 fps
  (WebM en Chrome/Android; en iOS Safari el soporte de `MediaRecorder` es reciente y variable, se
  detecta y se ofrece solo «Imágenes» si falla). Duración 12-18 s. No se usa `ffmpeg.wasm` (pesa
  más de 20 MB). Sin audio en el MVP (evita música con derechos).
- **Animación dentro de la app (visor):** transiciones CSS de 300-500 ms (entrada de cifra con
  cuenta hacia arriba, barra que se llena). Con `prefers-reduced-motion`, sin animación, solo
  cambio de tarjeta.
- **Accesibilidad de la imagen:** al compartir se ofrece el texto alternativo de cada tarjeta
  («Tarjeta 2 de 7: apartaste un 10 % de lo que ingresaste») para pegarlo en la descripción.

### C.7 Aviso

Un solo aviso, el día en que abre (15 de diciembre) a la hora del recordatorio matinal, a quienes
ya tienen push permitido y datos suficientes: título «Tu año en Finanverso ya está listo» / cuerpo
«Mira cómo ha ido tu 2026. Solo lo ves tú». Va por `ReminderService`, con el mismo consentimiento
y la misma ventana que los demás. Nada de recordatorios repetidos. Dentro de la app: una línea en
el Resumen mensual (como `LeaksTeaser`), cerrable, mientras dure la ventana.

### C.8 Determinismo y qué se guarda

- `buildYearRecap(items, { year, asOf, locale })` es una **función pura**: mismo historial y misma
  fecha de corte, mismo JSON. Se usan céntimos enteros, redondeos «hacia abajo» en cifras (como
  «Tu dinero perdido»), zona horaria Europa/Madrid (`madridMonth`, `madridDay` de
  `crypto-season.ts`) y orden estable en los desempates (alfabético).
- **No se guarda el cálculo.** Se repite en cada lectura (un año son miles de filas, unos 50-150 ms
  esperables). La única preferencia que se recuerda es el nivel de privacidad, en `localStorage`
  (`mm_wrapped_level`, por dispositivo, con el envoltorio `storage`). Consecuencia: si el
  usuario edita datos del pasado, la tarjeta cambia. Se acepta y se explica con «Cálculo a fecha de
  hoy».
- Opción fase 3: congelar el resumen del año el 1 de enero (tabla `year_recaps` con el JSON) para
  que sea inmutable. Solo si la gente se queja de que cambia. Implica más datos guardados y
  entrar en la exportación.

---

## D. Pantallas, textos y accesibilidad

### D.1 Visor (móvil 390 px)

```
+--------------------------------------+
| <  Tu 2026                  Cerrar X |   cabecera fija
| [1][2][3][4][5][6][7]                |   indicador de tarjeta (texto "3 de 7")
+--------------------------------------+
|                                      |
|   Tu categoría estrella              |
|                                      |
|            OCIO                      |   cifra/tema a 2rem+
|    14 % de todo lo que gastaste      |
|                                      |
|   [barra animada]                    |
|                                      |
+--------------------------------------+
| [ < Anterior ]        [ Siguiente > ]|   botones 48 px con texto
| [ Ver como lista ]  [ Compartir ... ]|
+--------------------------------------+
```

- **Avance manual** por defecto (botones y gesto de deslizar). Un interruptor «Pasar solo cada 6
  segundos» (apagado) para quien lo quiera tipo historias. Nada que dependa de pulsar rápido.
- **«Ver como lista»:** todas las tarjetas como una página de texto normal, ideal para lector de
  pantalla y para mayores.
- Cierre con «Volver a mis cuentas».

### D.2 Pantalla «Compartir» (móvil 390 px)

```
+--------------------------------------+
| Compartir tu año                  X  |
| [vista previa de la tarjeta]         |
| Formato:  (o) Historias 9:16  ( ) Feed 4:5  ( ) Los dos |
| Qué se ve:                           |
|  ( ) Solo porcentajes y nombres genéricos  <- por defecto|
|  ( ) Con nombres de categorías y metas  |
|  ( ) Con importes en euros              |
| [x] Incluir tarjeta: Ahorro del año  |
| [x] Incluir tarjeta: Categoría estrella |
| ...                                  |
| Tu imagen nunca lleva tu nombre, tu   |
| correo ni comercios.                 |
| [ Compartir ] [ Guardar en el móvil ]|
+--------------------------------------+
```

### D.3 Textos exactos (es / en)

Claves bajo `app.wrapped.*`. Se limpian con `finanverso-ig-human` antes de entrar en
`es.json`/`en.json`. Importes y nombres, de ejemplo.

| Clave                | es                                                                                        | en                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `menu`               | Resumen del año                                                                           | Year in review                                                                            |
| `title`              | Tu {year} en Finanverso                                                                   | Your {year} in Finanverso                                                                 |
| `titleAdvance`       | Avance de tu {year}                                                                       | Your {year} so far                                                                        |
| `advanceHint`        | Calculado hasta el {date}. El 1 de enero se completa.                                     | Calculated up to {date}. It is completed on 1 January.                                    |
| `private`            | Solo lo ves tú                                                                            | Only you can see this                                                                     |
| `savedRate`          | Apartaste un {percent} % de lo que ingresaste                                             | You set aside {percent}% of what you earned                                               |
| `savedAmount`        | Ingresaste {income}, gastaste {spent} y apartaste {saved}                                 | You earned {income}, spent {spent} and set aside {saved}                                  |
| `topCategory`        | Tu categoría estrella fue {category}                                                      | Your star category was {category}                                                         |
| `topCategoryGeneric` | Tu categoría estrella                                                                     | Your star category                                                                        |
| `topCategoryShare`   | El {percent} % de lo que gastaste                                                         | {percent}% of what you spent                                                              |
| `bestMonth`          | Tu mes más ahorrador fue {month}                                                          | Your best saving month was {month}                                                        |
| `streak`             | Tu mejor racha: {days} días sin gastar                                                    | Your best streak: {days} days without spending                                            |
| `health`             | Tu nota de Salud financiera: {level}                                                      | Your Financial health score: {level}                                                      |
| `healthScore`        | {score} de 100                                                                            | {score} out of 100                                                                        |
| `recovered`          | Dejaste de pagar cobros que no usabas                                                     | You stopped paying for charges you did not use                                            |
| `recoveredAmount`    | Unos {amount} al año que ya no se cobran                                                  | About {amount} a year that is no longer charged                                           |
| `goalsOne`           | Alcanzaste una meta                                                                       | You reached one goal                                                                      |
| `goalsOther`         | Alcanzaste {count} metas                                                                  | You reached {count} goals                                                                 |
| `crypto`             | Jugaste {seasons} temporadas en la consola crypto y conseguiste {badges} insignias        | You played {seasons} seasons in the crypto console and earned {badges} badges             |
| `cryptoNote`         | Dinero virtual: no es una inversión real.                                                 | Play money: not a real investment.                                                        |
| `closing`            | Tu amigo también puede empezar. Si completa los primeros pasos, tiene 30 días de Premium. | Your friend can start too. If they complete the first steps, they get 30 days of Premium. |
| `next` / `prev`      | Siguiente / Anterior                                                                      | Next / Previous                                                                           |
| `cardOf`             | Tarjeta {n} de {total}                                                                    | Card {n} of {total}                                                                       |
| `viewList`           | Ver como lista                                                                            | View as a list                                                                            |
| `autoplay`           | Pasar solo cada 6 segundos                                                                | Advance by itself every 6 seconds                                                         |
| `share`              | Compartir                                                                                 | Share                                                                                     |
| `save`               | Guardar en el móvil                                                                       | Save to my phone                                                                          |
| `formatStories`      | Historias (9:16)                                                                          | Stories (9:16)                                                                            |
| `formatFeed`         | Publicación (4:5)                                                                         | Post (4:5)                                                                                |
| `formatBoth`         | Los dos                                                                                   | Both                                                                                      |
| `levelGeneric`       | Solo porcentajes y nombres genéricos                                                      | Only percentages and generic names                                                        |
| `levelNames`         | Con nombres de categorías y metas                                                         | With category and goal names                                                              |
| `levelAmounts`       | Con importes en euros                                                                     | With amounts in euros                                                                     |
| `levelWarn`          | La imagen incluirá importes. Cualquiera que la vea los verá.                              | The image will include amounts. Anyone who sees it will see them.                         |
| `keepPrivate`        | Mantener sin importes                                                                     | Keep amounts out                                                                          |
| `neverIncluded`      | Tu imagen nunca lleva tu nombre, tu correo ni comercios.                                  | Your image never includes your name, your email or merchants.                             |
| `shareText`          | Mi año con Finanverso. Si te animas, empieza con mi enlace: {link}                        | My year with Finanverso. If you fancy it, start with my link: {link}                      |
| `notice.title`       | Tu año en Finanverso ya está listo                                                        | Your year in Finanverso is ready                                                          |
| `notice.body`        | Mira cómo ha ido tu {year}. Solo lo ves tú.                                               | See how your {year} went. Only you can see it.                                            |
| `fewData`            | Todavía hay pocos datos para hacer tu resumen. Importa tu extracto y vuelve.              | There is still too little data for your summary. Import your statement and come back.     |
| `error`              | No hemos podido preparar tu resumen. Inténtalo de nuevo.                                  | We could not prepare your summary. Please try again.                                      |
| `disclaimer`         | Cifras calculadas con tus movimientos. Orientativo, no es asesoramiento financiero.       | Figures calculated from your movements. For guidance only, not financial advice.          |

### D.4 Estados

| Estado                    | Qué ve                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Antes del 15 de diciembre | Sin entrada de menú (no hay botón muerto); si llega por enlace, «Estará listo el 15 de diciembre»                   |
| Carga                     | Esqueleto de una tarjeta con `aria-busy="true"` y texto oculto «Preparando tu año…»                                 |
| Pocos datos               | `fewData` + «Importar mi extracto» (abre `ImportModal`)                                                             |
| Normal                    | Visor                                                                                                               |
| Avance (15-31 dic)        | Visor con la nota «Avance» en la cabecera y marca en la imagen                                                      |
| Error                     | `error` + «Reintentar»                                                                                              |
| Sin conexión              | Se pueden ver las tarjetas ya cargadas; compartir sigue funcionando (el dibujo es local); `OfflineBanner` existente |
| Crypto sin temporadas     | Se omite esa tarjeta                                                                                                |

### D.5 Accesibilidad para mayores

- Botones de **48 x 48 px** con texto, nunca solo iconos. Texto base 16 px; cifras a 2rem como
  mínimo. Todo en `rem`: sin cortes al 200 %.
- **Sin autoavance** por defecto; el avance automático, si se activa, se pausa al enfocar y
  al pulsar «Pausa». Nada se mueve con `prefers-reduced-motion`.
- Contraste >= 4,5:1 (7:1 en la cifra principal) en claro, oscuro y la opción «Contraste»
  (`wiz-contrast`). La información no depende del color: cada tarjeta tiene palabra e icono.
- Cada tarjeta es una `<section aria-labelledby>`; el visor anuncia «Tarjeta 3 de 7» con
  `aria-live="polite"`. «Ver como lista» ofrece lo mismo sin gestos.
- Las **imágenes compartidas** usan mínimo 44 px de texto en 1080 de ancho y contraste alto
  (fondo oscuro con texto claro, como `recapImage`).
- Lenguaje sin jerga: «apartaste», «cobros que no usabas», no «tasa de ahorro» ni «recurrente».

---

## E. Gratis frente a Premium

Principio: **lo que se comparte es gratis** (es el gancho de crecimiento); Premium da profundidad
y comodidad, no el resumen en sí.

|                                                        | Gratis                                       | Premium                                                                                 |
| ------------------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| Visor con las tarjetas del año actual                  | Sí, todas                                    | Sí                                                                                      |
| Imagen PNG 9:16 y 4:5, los tres niveles de privacidad  | Sí                                           | Sí                                                                                      |
| Tarjeta «Dinero recuperado»                            | Sí (usa lo que ya ve en «Tu dinero perdido») | Sí                                                                                      |
| Tarjeta de crypto                                      | Sí                                           | Sí, con estadísticas de `cryptoPro` en la vista privada                                 |
| Comparar con el año anterior («Gastaste un 8 % menos») | No                                           | Sí                                                                                      |
| Años anteriores (histórico)                            | No (solo el año en curso)                    | Sí                                                                                      |
| Gráfica de los 12 meses en la vista privada            | No                                           | Sí                                                                                      |
| Vídeo animado (fase 2)                                 | No                                           | Sí                                                                                      |
| Marca de agua                                          | Pie «finanverso.app» discreto                | Pie «finanverso.app» (se mantiene: es el gancho; opción de quitarlo como mejora futura) |

Comprobación en servidor con `entitlements.limits(userId).features.insights` (la función ya
existente del corte de análisis); **no se crea un `PremiumFeature` nuevo** en el MVP. El histórico y
la comparación con el año anterior devuelven `PREMIUM_REQUIRED` desde el servidor, no solo se
ocultan en pantalla.

---

## F. Datos y API mínimos

**Sin tablas nuevas en el MVP** (C.8). Se lee de `transactions`, `goals`, `money_leak_decisions` y
las tablas `crypto_sim_*`.

`GET /stats/year-recap?year=2026` (autenticado, usa `dataUserId`):

```json
{
  "year": 2026,
  "asOf": "2026-12-15",
  "final": false,
  "enough": true,
  "monthsWithData": 11,
  "totals": { "incomeCents": 3140000, "expenseCents": 2790000, "savingCents": 310000 },
  "savingRatePercent": 9.9,
  "topCategory": { "name": "Ocio", "isSystem": true, "sharePercent": 14, "spentCents": 387000 },
  "bestMonth": { "month": "2026-05", "ratePercent": 17.2, "savedCents": 52000 },
  "streak": { "days": 17, "month": "2026-08" },
  "health": { "score": 68, "level": "good" },
  "recovered": { "annualCents": 47800, "count": 2 },
  "goalsReached": [{ "name": "Viaje", "month": "2026-09" }],
  "crypto": { "seasons": 5, "bestPlace": 3, "badges": ["firstTrade", "tenTrades"] },
  "premium": { "previousYear": null, "months": null }
}
```

- Cada bloque puede venir en `null` (condición no cumplida, C.2). El **cliente decide qué mostrar
  según el nivel**, pero el servidor devuelve siempre el detalle completo al propio dueño (es su
  dato). Lo que nunca sale ni en la API: comercios, descripciones, el alias crypto ni el correo.
- Zod en `schemas.ts`, presentador en `presenters.ts`, fixtures en el contrato
  (`backend/src/tests/integration/contract.test.ts` y `frontend/src/__tests__/contract/`).
- `409 YEAR_NOT_READY`, `403 PREMIUM_REQUIRED` (años anteriores y comparación), `400` año inválido.
- Rendimiento: un año de un usuario fuerte, 20.000 movimientos: objetivo < 250 ms. Sin caché en el
  MVP (se mide como se hizo con `MoneyLeakService`); si hace falta, caché por usuario y año en
  memoria 60 s.
- Frontend: `frontend/src/core/api/statsApi.ts` (función `yearRecap`), módulo
  `frontend/src/modules/finances/ui/views/YearRecapView.tsx`, dominio
  `frontend/src/modules/finances/domain/yearRecapImage.ts`, tabs en `navigation.ts` (sección
  `yearRecap` del grupo `overview`, visible solo en la ventana).

---

## G. Medición, sin datos personales

Se usa la analítica propia y anónima de [`docs/analitica.md`](../analitica.md) (`funnel_daily`,
lista cerrada; sin identificadores, sin importes). Eventos nuevos:

| Evento                | Quién     | Cuándo                                    | Detalle (lista cerrada)                              |
| --------------------- | --------- | ----------------------------------------- | ---------------------------------------------------- |
| `wrapped_view`        | navegador | se abre el visor                          | `final` o `advance`                                  |
| `wrapped_done`        | navegador | se llega a la última tarjeta              | —                                                    |
| `wrapped_share`       | navegador | compartido de verdad (cancelar no cuenta) | `g1-916`, `g1-45`, `g2-916`, … (nivel 1-3 y formato) |
| `wrapped_save`        | navegador | imagen guardada                           | igual                                                |
| `wrapped_invite_copy` | navegador | enlace copiado desde el cierre            | —                                                    |
| `wrapped_notice_sent` | servidor  | aviso de apertura enviado                 | `push`                                               |

**Enlace de crecimiento.** El texto de compartir lleva el enlace del programa:
`https://finanverso.app/?ref=CODIGO&utm_source=wrapped&utm_campaign=wrapped2026&utm_content=<formato>`.
`captureReferral` ya conserva el código; `landingOrigin()` ya recoge `utm_*` (máx. 80 caracteres) y
el registro lo normaliza como origen/campaña en `funnel_daily`. **No se mete el código en la
imagen** (la imagen puede reenviarse sin control); el código va en el texto del mensaje, que es lo
que ya hace la invitación actual.

Qué se mira (todo agregado, por día y origen):

- Apertura -> visor: `wrapped_view` / usuarios con datos suficientes (el denominador sale del
  contador `dp_found`-style `wrapped_ready`, ver abajo).
- Compartidos por visor: `wrapped_share / wrapped_view`. Objetivo inicial razonable: 8-15 %; menos
  de 4 % indica que las tarjetas no resultan atractivas.
- Altas por compartido: filas de `signup` con `origen = wrapped` y campaña `wrapped2026`.
  Activación de esas altas: `activation_done` con ese origen.
- `referral_joined` (métrica ya existente) para ver cuántos acaban dando el mes de Premium.
- No se puede medir retención por cohortes (decisión de `docs/analitica.md`); no se intenta.

Además, un contador de servidor `wrapped_ready` (una vez por usuario y día de lectura con datos
suficientes) para tener el denominador sin guardar quién.

---

## H. Privacidad y legal

- **Base:** ejecución del servicio (cálculo para el propio usuario). Compartir es una **acción
  voluntaria del usuario** (consentimiento por acto: elige nivel, ve la vista previa y pulsa).
  No se trata ningún dato de terceros.
- **Nada sale a terceros.** El dibujo es local. El servidor no recibe la imagen. El enlace de
  invitación no lleva nada de la persona (código aleatorio y UTM de campaña).
- **Lo que la imagen puede revelar,** aun en nivel 1: la categoría estrella (p. ej. «Salud») y la
  existencia de metas o de la consola crypto. Por eso: sin nombres propios por defecto, y la
  categoría solo si es una del sistema; si una categoría la creó el usuario, en nivel 1 sale
  «Tu categoría estrella» sin nombre.
- **Alias crypto:** nunca en la imagen en ningún nivel. El alias ya es público dentro del ranking,
  pero no hay que enlazarlo con una imagen que también lleve el enlace de invitación.
- **Datos de menores:** la app admite cuentas desde 14 años. El texto de compartir no apela a
  gasto ni a deuda. Nada de «presumir» de cifras en el nivel 1.
- **Hogar compartido:** si el usuario es miembro, el resumen usa los datos del titular (como todo
  el resto de la app). Se muestra «Resumen del hogar» en la cabecera para no confundir. Cuestión
  de consentimiento: el titular ya consintió compartir sus datos con el miembro; compartir la
  imagen es decisión del miembro, así que en hogar se cambia el valor por defecto: **solo nivel 1
  disponible** (sin subir a importes). Ver K.
- **Política:** una frase en la sección de usos: «Calculamos tu resumen del año con tus
  movimientos para mostrártelo. Si decides compartir una imagen, se crea en tu dispositivo.»
  Propuesta en `docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md` para revisión del abogado.
- **Exportación y borrado:** no se guarda nada nuevo, así que no hay sección nueva. Se borra con
  la cuenta como el resto.
- **IA:** no interviene. El texto de las tarjetas son plantillas con huecos.

---

## I. Riesgos

| Riesgo                                                                                           | Prob.  | Impacto           | Mitigación                                                                                                               |
| ------------------------------------------------------------------------------------------------ | ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Alguien comparte la imagen con importes sin darse cuenta                                         | Media  | Alto (privacidad) | Nivel 1 por defecto, vista previa en vivo, aviso al subir, sin comercios en ningún nivel                                 |
| Cifra incorrecta por datos mal categorizados o mal importados (la categoría estrella es «Otros») | Media  | Medio             | Excluir «Otros/Sin categoría» de la categoría estrella; avisar de cobertura (meses con datos); estado «Todavía poco»     |
| Racha falsa por días sin apuntar                                                                 | Alta   | Medio             | Meses fiables (12 días con movimientos, C.4) y texto «días sin gastar»                                                   |
| Hogar: el miembro comparte información del titular                                               | Baja   | Alto              | Solo nivel 1 en hogar; cabecera «Resumen del hogar»                                                                      |
| El estado de los retos solo está en el navegador y no se puede usar                              | Cierta | Bajo              | Se deriva de movimientos; fase 2 con persistencia compartida con el documento 5                                          |
| `healthScore` duplicado en frontend y backend se desincroniza                                    | Media  | Medio             | Test de paridad con casos compartidos en un JSON de fixtures; plan: el frontend deja de calcularlo en una fase posterior |
| Con ~40 usuarios verificados, el efecto viral es pequeño                                         | Alta   | Medio             | No se construye pensando en masa crítica (no depende de otros usuarios); el coste es bajo                                |
| Vídeo no funciona en iOS                                                                         | Media  | Bajo              | Detección y vuelta a imágenes; el vídeo es fase 2                                                                        |
| Expectativa de «dinero ahorrado» exagerada en «dinero recuperado»                                | Media  | Alto (confianza)  | Verbo «dejaste de pagar» y «unos X»; coincide con las reglas de «Tu dinero perdido»                                      |
| Fechas: el 31 de diciembre a medianoche el cálculo cambia                                        | Baja   | Bajo              | `asOf` explícito, zona Madrid, tests de fronteras                                                                        |
| El abogado exige consentimiento más explícito                                                    | Baja   | Medio             | Ya hay acción voluntaria y vista previa; no se guarda nada                                                               |

---

## J. Fases y esfuerzo

| Fase                                 | Contenido                                                                                                                                                                                                                                                                                                                           | Días  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **MVP (recomendado para el 15-dic)** | `year-recap.ts` puro con tests (totales, categoría estrella, mejor mes, racha, metas, dinero recuperado); `GET /stats/year-recap`; **sin nota de Salud ni crypto**; visor con avance manual y «Ver como lista»; imagen PNG 9:16 y 4:5 (nivel 1 y 2); compartir con enlace y UTM; eventos; textos es/en; aviso único; tests al 100 % | **8** |
| Fase 2                               | Nota de Salud (porte de `healthScore` con test de paridad, 1 d); tarjeta crypto (1 d); nivel 3 con importes y aviso (0,5 d); histórico y comparación con año anterior Premium (1,5 d); retos persistidos (con el documento 5)                                                                                                       | 4     |
| Fase 3                               | Vídeo con `MediaRecorder` (3 d); QR con el código (1 d); congelar el año el 1 de enero (1,5 d)                                                                                                                                                                                                                                      | 5,5   |

**Plan recomendado.** Calendario ajustado: faltan 7 semanas hasta el 15 de diciembre. El MVP de 8
días cabe si se empieza a más tardar a mediados de noviembre y si no choca con otros ganchos
(ver `RESUMEN-GANCHOS.md`). Si no llega, se abre a la vez en enero ("Tu 2026" hasta el 31 de
enero), perdiendo parte del pico de interés navideño, pero conservando el de «propósitos de año nuevo».

**Pruebas necesarias:** `year-recap.test.ts` (fronteras 31 dic / 1 ene, zona Madrid, desempates,
años bisiestos, hogar), contrato de la ruta, `yearRecapImage` con canvas simulado, accesibilidad
(`axe`) del visor, test de que la imagen en nivel 1 no contiene ningún importe ni nombre (se
inspecciona la lista de textos que se dibujan, no los píxeles), `wording.test.ts` (sin lenguaje de
presión ni promesas). Cobertura del 100 % en frontend, umbrales del backend.

---

## K. Preguntas abiertas (máx. 5)

1. **¿Se regala el resumen completo en el plan gratis?** Recomendación: **sí** (E). Es el gancho de
   crecimiento; Premium se queda con histórico, comparación y vídeo.
2. **¿Nivel por defecto?** Recomendación: **nivel 1 «porcentajes y nombres genéricos»**, sin
   posibilidad de cambiar el valor por defecto; el usuario sube a mano.
3. **¿Se pone el código de invitación en la imagen (QR)?** Recomendación: **no en el MVP**; va en
   el texto del mensaje. QR en fase 3 con interruptor.
4. **¿Qué pasa con los usuarios en hogar compartido?** Recomendación: **solo nivel 1** y cabecera
   «Resumen del hogar».
5. **¿Se aprueba abrir el 15-dic con un MVP sin nota de Salud ni crypto?** Recomendación: **sí**;
   la nota llega en la fase 2 antes del 1 de enero (tarjeta nueva, no cambia lo ya compartido).
