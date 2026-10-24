# Diseño: «Tu dinero perdido» y «La fecha de tu meta»

Estado: **MVP implementado** el 25/10/2026 en `develop` (ver «Estado de la implementación»; lo
marcado _fase 2_ no está hecho). Diseño: 24/10/2026.
Anexo con maquetas estáticas: [`dinero-perdido-wireframes.html`](./dinero-perdido-wireframes.html).

Todos los comercios, importes y fechas de este documento son **inventados**.

---

## Estado de la implementación (MVP, 25/10/2026)

Decisiones del dueño (K): las seis con la recomendación. Hecho en cuatro commits de `develop`:

| Bloque                                                                                                                                              | Estado                         | Dónde                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| Motor (C.1-C.9), decisiones, cifra y cobertura                                                                                                      | implementado                   | `backend/src/domain/services/money-leaks.ts`, `application/insights/MoneyLeakService.ts`     |
| Migración 041, exportación y borrado                                                                                                                | implementado                   | `041-money-leak-decisions.ts`, `SqliteLeakDecisionRepository.ts`, `SqlitePersonalDataReader` |
| `GET/PUT/DELETE /stats/money-leaks` y corte gratis (F)                                                                                              | implementado                   | `user.routes.ts`, `presenters.ts`, `schemas.ts`                                              |
| Ritmo de las metas en `GET /goals`                                                                                                                  | implementado                   | `computeGoalPace` en `Goal.ts`                                                               |
| Sección, estados, accesibilidad (E.1, E.4, E.5)                                                                                                     | implementado                   | `MoneyLeaksView.tsx`, `LeakCard.tsx`, `MoneyLeaks.css`                                       |
| Fecha de la meta y «¿y si…?» (D.1-D.4, D.5 sin tarjeta)                                                                                             | implementado                   | `goalDate.ts`, `GoalDateSheet.tsx`, `GoalsView.tsx`                                          |
| Menú, tour, aviso en el Resumen, tras importar, Análisis (E.6)                                                                                      | implementado                   | `navigation.ts`, `tourSteps.ts`, `LeaksTeaser.tsx`, `ImportModal.tsx`, `AnalysisView.tsx`    |
| Analítica (H)                                                                                                                                       | implementado, sin `goal_share` | `docs/analitica.md`                                                                          |
| Guía corta                                                                                                                                          | implementado                   | guía `/guias/tu-dinero-perdido`                                                              |
| Avisos Premium, tarjeta compartible, «Apuntar como operación automática», pequeños gastos por categoría, apuntes repetidos, «Borrar mis decisiones» | _fase 2_                       | —                                                                                            |

Diferencias con el diseño, elegidas por seguridad o porque el código real lo pedía:

- **Gimnasios**: el categorizador de la app los pone en `Salud`, que el diseño trata como esencial.
  Un concepto con «gimnasio», «gym», «fitness», «crossfit», «pilates» o «yoga» nunca es esencial
  por su categoría (si no, el ejemplo FITBOX no saldría nunca).
- **Subidas de lo no esencial**: mientras el cobro está por revisar, la subida se cuenta dentro de
  su tarjeta («Subió de… a…»); es un hallazgo propio cuando el usuario dijo «Lo sigo usando» (así
  el ejemplo de C.8 da «Subidas 1» y no hay doble cuenta).
- **Precio anterior** de una subida: la racha de cobros al mismo precio (±2 %) justo antes del
  cambio; media confianza solo con un cobro antes y uno después (anuales). Los recibos variables
  (luz, gas) no generan subidas.
- **Semanales y `Alimentación`/`Transporte`**: piden el mismo importe (±5 %) en cada cobro, para
  que la compra de la semana no parezca una suscripción.
- **Cifras de cada hallazgo** redondeadas hacia abajo al euro («unos 478 €», no 479), como pidió
  el dueño; `toCancel` también hacia abajo.
- **`TOUR_VERSION` sube a 4** (orden del dueño, en contra de E.6), con el aviso de tour renovado
  que nombra «Tu dinero perdido» y la fecha de las metas. Pasos: `goals` → `goalDate` → `leaks`.
  El paso `goalDate` señala la primera meta con fecha o, sin metas, la tarjeta «Nueva meta».
- **`MoneyLeakService`** es una clase propia (no `StatsService.moneyLeaks`), para no tocar el
  constructor de `StatsService`. Sin caché LRU en el MVP: 20.000 movimientos se calculan en unos
  120 ms en el test de rendimiento; se mide en producción antes de añadirla.
- **`GET /stats/money-leaks?from=goal|summary|import`**: las otras pantallas piden la cifra sin
  contar `dp_found` (si no, la métrica «¿Encuentra cosas?» se inflaría).
- **`GET /goals`** añade también `savedThisMonth` (lo ahorrado en el periodo actual), que hace falta
  para saber si el mes 1 es este o el siguiente (D.2).
- **Decisiones permitidas por tipo** (C.7) comprobadas en el servidor (`LEAK_STATUS_INVALID`).
- **Análisis**: la tarjeta antigua se quita y se borran las claves `app.subscriptions.*`; el endpoint
  `/stats/subscriptions` sigue igual para las versiones de Android instaladas.
- **Contraste**: la pantalla refuerza bordes y texto con la clase `wiz-contrast` (la opción
  «Contraste» del asistente).
- **Textos**: algunas claves se parten para poder dar estilo o plural (`headlineLead` +
  `headlineFigure`, `countOne/Other`, `done` + `undoButton`, `late/lateOne`…); el texto es el del
  diseño.

## A. Resumen ejecutivo

Dos funciones para conseguir y retener usuarios, construidas casi del todo con piezas que ya
existen:

1. **Tu dinero perdido.** Revisa los movimientos del usuario (importados o a mano) y le dice
   cuánto le cuestan al año los cobros que conviene revisar: cobros que se repiten, subidas de
   precio, posibles cobros dobles y pequeños gastos muy frecuentes («gastos hormiga»). Cálculo
   **determinista en el servidor, sin IA**. El usuario decide en cada hallazgo («Lo sigo usando»,
   «Quiero darlo de baja», «No es una suscripción», «No reconozco este cobro»), y la app recuerda
   esas decisiones.
2. **La fecha de tu meta.** En cada meta de ahorro: «A tu ritmo llegas en **febrero de 2028**»,
   con un deslizador «¿y si aparto 50 € más al mes?» y el enlace con (1): «si dedicas a esta meta
   lo que vas a dar de baja, llegarías 4 meses antes».

**Por qué funciona como gancho:** da una cifra personal y concreta («unos 870 € al año») justo
después de importar el primer extracto, que es el momento de mayor intención; y la fecha de la
meta da un motivo para volver cada mes («¿se ha adelantado mi fecha?»).

**Lo que NO hace (y la UI no debe insinuar):** no sabe si alguien usa un servicio, no cancela
nada, no promete ahorros y no recomienda productos. Todo son estimaciones orientativas que el
usuario revisa.

**Hallazgo clave de la investigación:** ya hay un detector de suscripciones
(`backend/src/domain/services/subscriptions.ts`, mensual y anual, con subida de precio) y una
tarjeta «Suscripciones detectadas» en Análisis, con corte gratis de 3. También existe ya el
cálculo de meses hasta una meta con interés (`monthsToGoal` en
`frontend/src/modules/tools/domain/calculators.ts`). El diseño **amplía** esas piezas; no crea
otras en paralelo.

---

## B. Inventario de lo reutilizable

| Pieza                          | Ruta                                                                                                                                                                                                                                                                     | Qué aporta                                                                                                                                                                                        | Cómo se usa                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Detector de suscripciones      | `backend/src/domain/services/subscriptions.ts` (+ `backend/src/tests/domain/subscriptions.test.ts`)                                                                                                                                                                      | Agrupa por `subscriptionKey`, ritmos mensual (24-37 días, ≥3 cobros) y anual (350-380, ≥2), tolerancia de importe 25 %, subida ≥3 %, «activa» si el último cobro tiene ≤65/≤400 días, coste anual | Base del detector de cobros repetidos. Se queda tal cual para `GET /stats/subscriptions` (compatibilidad); el motor nuevo copia y amplía su lógica |
| Servicio y endpoint            | `StatsService.subscriptions()` en `backend/src/application/insights/InsightsServices.ts`; `GET /stats/subscriptions` en `backend/src/infrastructure/http/routes/user.routes.ts`; `presentSubscriptions` en `presenters.ts`                                               | Excluye lo que ya es una operación automática (`coveredKeys`) y recorta a `FREE_SUBSCRIPTIONS_SHOWN` en el plan gratis                                                                            | El nuevo `moneyLeaks()` sigue el mismo patrón                                                                                                      |
| Tarjeta en la app              | `SubscriptionsCard` en `frontend/src/modules/finances/ui/views/AnalysisView.tsx`; textos `app.subscriptions.*`                                                                                                                                                           | Tabla, total mensual/anual, exportar, aviso Premium                                                                                                                                               | Se sustituye por un aviso que lleva a la sección nueva (ver K)                                                                                     |
| Limpieza del concepto bancario | `cleanPattern` / `suggestPattern` (lista `NOISE`) en `backend/src/domain/services/category-rules.ts`; `normalizeText` en `backend/src/domain/shared/text.ts`                                                                                                             | Quita acentos, números y ruido de tarjeta («COMPRA TARJ. MERCADONA 0231» → «mercadona»)                                                                                                           | Base de `merchantKey` (C.1)                                                                                                                        |
| Reglas de categoría 📌         | `CategoryRuleService`, migración `014-category-rules.ts`, `CategoryRulesCard.tsx`                                                                                                                                                                                        | El usuario ya agrupa conceptos por texto                                                                                                                                                          | Los patrones del usuario sirven como alias de comercio (C.1)                                                                                       |
| Operaciones automáticas        | `RecurringRule` (`backend/src/domain/model/RecurringRule.ts`: mensual, bimestral, trimestral, anual), `RecurringService`, `RecurringRulesTab.tsx`                                                                                                                        | Lo que el usuario ya controla                                                                                                                                                                     | Se excluye de «a revisar» y se ofrece «Apuntarlo como operación automática»                                                                        |
| Importación                    | `ImportService` en `backend/src/application/data/DataServices.ts` (huella por fila, `MAX_IMPORT_ROWS = 5000`, duplicados al importar); parsers CSV/Norma 43 en `frontend/src/modules/finances/domain/importParsers.ts`; bancos en `bankFormats.ts`; `ImportModal.tsx`    | Los datos de entrada. Ojo: la huella incluye «la posición entre filas idénticas», así que dos cargos idénticos del mismo día **sí** se importan: es justo el cobro doble que queremos ver         | CTA «Importa tu extracto» en el estado de pocos datos                                                                                              |
| Plan gratis/Premium            | `PLAN_LIMITS`, `FREE_SUBSCRIPTIONS_SHOWN = 3` en `backend/src/domain/services/plans.ts`; `EntitlementService` (`limits()`, `assertFeature()`); `PremiumOnly.tsx`, `PlanContext.openUpgrade` en el frontend                                                               | Corte del plan gratis por la función `insights`                                                                                                                                                   | Mismo corte (F)                                                                                                                                    |
| Metas                          | `Goal` y `computeGoalProgress` en `backend/src/domain/model/Goal.ts`; `GoalService` en `backend/src/application/planning/PlanningServices.ts`; `savedByCategory` en `SqliteTransactionRepository.ts`; `GoalsView.tsx`                                                    | Progreso = suma de movimientos de tipo Ahorro en la categoría de la meta; ya calcula «Necesitas ahorrar X/mes» si hay fecha                                                                       | Se añade el ritmo real y la fecha estimada                                                                                                         |
| Calculadora de meta            | `monthsToGoal` en `frontend/src/modules/tools/domain/calculators.ts`; textos `tools.goal.*` (incluido el aviso de rentabilidad)                                                                                                                                          | Bucle mensual con interés compuesto opcional, tope 1200 meses                                                                                                                                     | Fórmula del simulador (D)                                                                                                                          |
| Previsión                      | `averageVariable`, `projectMonths` en `backend/src/domain/services/forecast.ts`                                                                                                                                                                                          | Medias por periodo solo con meses con datos                                                                                                                                                       | Patrón para el ritmo medio                                                                                                                         |
| Salud financiera               | `healthScore`, `challengeProgress` en `frontend/src/modules/finances/domain/health.ts`; `HealthView.tsx`                                                                                                                                                                 | Nota 0-100 y retos                                                                                                                                                                                | Fase 3: reto «Un mes sin cobros por revisar»                                                                                                       |
| Resumen compartible            | `recapImage` (canvas 1080×1350) en `frontend/src/modules/finances/domain/recapImage.ts`; `RecapShare.tsx` con «Mostrar importes en la imagen»                                                                                                                            | Imagen sin datos personales por defecto                                                                                                                                                           | Tarjeta compartible de la meta (D.5)                                                                                                               |
| Asesor IA                      | `AdviceService.buildContext` en `InsightsServices.ts`; `POST /ai/advice` y `/ai/ask`                                                                                                                                                                                     | Solo envía **cifras agregadas** por categoría, nunca descripciones; cuota mensual (`aiMonthlyQuota`)                                                                                              | **No se usa** en el MVP (G.4)                                                                                                                      |
| Analítica propia               | Migración `034-funnel-daily.ts`, `funnel.routes.ts`, `TRACK_EVENTS` (`frontend/src/core/analytics.ts`), `CLIENT_FUNNEL_EVENTS` / `SERVER_FUNNEL_EVENTS` (`backend/src/domain/ports/services.ts`), `docs/analitica.md`; contadores `metrics` (migración 008) y `stats.ts` | Contadores diarios anónimos, lista cerrada de eventos                                                                                                                                             | Eventos `dp_*` y `goal_*` (H)                                                                                                                      |
| Avisos                         | `ReminderService.ts` (push por la mañana), `WeeklyDigestService.ts` / `domain/services/digest.ts` (correo del lunes)                                                                                                                                                     | Canales con consentimiento ya pedido                                                                                                                                                              | Avisos Premium de subidas nuevas (fase 2)                                                                                                          |
| Exportación y borrado RGPD     | `ExportService` (formato `finanverso-export` v3), `SqlitePersonalDataReader.sectionsFor`; `ON DELETE CASCADE` desde `users`                                                                                                                                              | Art. 20 y supresión                                                                                                                                                                               | Sección nueva en la exportación (I)                                                                                                                |
| Tour                           | `frontend/src/modules/finances/ui/tour/tourSteps.ts` (`TOUR_VERSION = 3`), `GuidedTour.tsx`                                                                                                                                                                              | Pasos con `tab` y `target`                                                                                                                                                                        | Dos pasos nuevos (E.6)                                                                                                                             |
| Menú                           | `frontend/src/modules/finances/ui/navigation.ts` (`DashboardTab`, grupos y colores)                                                                                                                                                                                      | Secciones                                                                                                                                                                                         | Sección nueva `leaks` en el grupo `overview`                                                                                                       |
| Contrato API                   | `backend/src/tests/integration/contract.test.ts` + `frontend/src/__tests__/contract/`                                                                                                                                                                                    | Cambiar un presentador rompe la build hasta regenerar los fixtures                                                                                                                                | Endpoints nuevos con fixtures                                                                                                                      |
| Esqueleto de carga             | `frontend/src/modules/crypto/ui/ConsoleSkeleton.tsx`, `css/Skeleton.css`; `shared/utils/motion.ts`                                                                                                                                                                       | Esqueleto y movimiento reducido                                                                                                                                                                   | Mismo patrón                                                                                                                                       |

---

## C. Diseño funcional: «Tu dinero perdido»

### C.0 Entrada y salida (implementado)

- **Entrada:** movimientos de tipo `EXPENSE` (e `INCOME`, solo para detectar devoluciones) de los
  últimos **25 meses** del dueño de los datos (`req.dataUserId`, así funciona igual con hogar
  compartido). Se excluyen los generados por una operación automática (`recurringRuleId` no nulo)
  y los que coinciden con una operación automática activa (como hoy con `coveredKeys`).
- **Salida:** una lista de **hallazgos** con tipo, confianza, coste anual estimado (o puntual),
  pruebas (las fechas e importes que lo justifican) y estado de la decisión del usuario.
- **Nada se guarda del cálculo.** Solo se guardan las decisiones del usuario (G.1). El cálculo
  se repite en cada lectura y es reproducible: mismo historial y misma fecha, mismo resultado.

### C.1 Normalización del comercio (`merchantKey`) (implementado)

Objetivo: que «COMPRA TARJ. 5402 STREAMFLIX.COM 28/09», «STREAMFLIX.COM» y
«PAYPAL *STREAMFLIX» caigan en el mismo grupo.

1. `normalizeText` (minúsculas, sin acentos, espacios simples).
2. Quitar fechas (`\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?`), números sueltos y palabras con dígitos
   (como `suggestPattern`).
3. Quitar ruido bancario. Se amplía la lista `NOISE` actual (`compra, pago, tarj., tarjeta, recibo,
adeudo, bizum, com`) con: `domiciliacion, cargo, cuota, transaccion, contactless, apple pay,
google pay, paypal, www, es, sl, s.l., sa, s.a., sociedad, oficina, madrid…` (sin ciudades:
   se descarta la **última** palabra solo si está en una lista corta de provincias).
4. Quitar intermediarios de pago al principio («paypal», «sumup», «zettle», «stripe»): el
   comercio real va detrás.
5. Si el concepto contiene un **patrón de regla 📌 del usuario**, la clave es ese patrón (el
   usuario ya nos dijo cómo se llama el comercio).
6. Quedarse con las 3 primeras palabras. Si quedan menos de 3 letras, no se agrupa.

Se muestra al usuario el **concepto del último cobro** tal cual (no la clave), para que lo
reconozca en su banco.

### C.2 Cobros que se repiten (incluye «suscripciones») (implementado)

**Agrupación:** por `merchantKey`. Dentro del grupo, ordenado por fecha.

**Ritmos** (diferencia en días entre cobros consecutivos):

| Ritmo      | Hueco aceptado                                                                     | Cobros mínimos | «Sigue activo» si el último tiene como mucho | Cobros/año |
| ---------- | ---------------------------------------------------------------------------------- | -------------- | -------------------------------------------- | ---------- |
| Semanal    | 6-8 días                                                                           | 5              | 16 días                                      | 52         |
| Mensual    | 24-37 días (igual que hoy: los bancos mueven cargos por fines de semana y febrero) | 3              | 65 días                                      | 12         |
| Bimestral  | 55-66 días                                                                         | 3              | 125 días                                     | 6          |
| Trimestral | 85-97 días                                                                         | 3              | 190 días                                     | 4          |
| Anual      | 350-380 días                                                                       | 2              | 400 días                                     | 1          |

- **Tolerancia de fecha:** con 5 o más cobros se admite **un** hueco fuera de rango si es
  aproximadamente el doble del ritmo (un mes sin cobro: pausa o cargo agrupado). Con menos cobros,
  todos los huecos deben estar en rango (como hoy).
- **Tolerancia de importe:** todos los cobros a ±25 % de la **mediana** del grupo (hoy se compara
  con el último; la mediana evita que una subida rompa el grupo).
- **Dos servicios del mismo comercio** (p. ej. dos planes de 4,99 y 9,99 en la misma tienda de
  apps): si los importes forman dos bloques separados por más del 25 %, se parte el grupo por
  importe antes de buscar ritmo.
- **Coste anual:** último importe × cobros/año.

**Qué SÍ se puede afirmar** (y qué no). La app no ve si alguien usa un servicio, así que **nunca
dice «suscripción olvidada»**. Dice lo que los datos demuestran:

- «Se cobra **cada mes** desde **agosto de 2025** (15 cobros).»
- «Te cuesta unos **479 € al año**.» «Llevas pagados **598,50 €**.»
- «El próximo cobro sería hacia el **3 de noviembre**.»
- Pregunta, no afirmación: «¿Lo sigues usando?».

Para ordenar la lista se usa una **prioridad de revisión** (no se muestra como nota):
coste anual alto, antigüedad ≥ 6 meses, importe pequeño (≤ 15 €/mes: es lo que más se olvida) y
que no haya otros gastos en el mismo comercio (si hay compras sueltas en «tienda de apps», el
cobro fijo seguramente se usa).

**Esenciales.** Los cobros repetidos en categorías esenciales (por defecto, las predeterminadas
`Vivienda`, `Luz`, `Agua`, `Gas`, `Salud`, `Educación`, `Niño`, y los conceptos con «prestamo»,
«hipoteca», «comunidad», «seguro», «impuesto», «ayuntamiento») **no cuentan como dinero a
revisar**: pagar la luz no es «dinero perdido». Sí se vigilan sus **subidas de precio** (C.3).
Las transferencias y Bizum a personas tampoco cuentan (pagar la parte del piso no es una
suscripción): se reconocen por la palabra «bizum»/«transferencia» en el concepto.

### C.3 Subidas de precio (implementado)

Mismo grupo y ritmo que C.2, **incluidos los esenciales**.

- Hay subida si el **último** cobro supera al precio anterior estable en **≥ 3 % y ≥ 0,50 €**
  (hoy: ≥ 3 %; el mínimo en euros evita avisar por 0,09 €).
- «Precio anterior estable» = mediana de los cobros anteriores al cambio.
- Si un cobro sube y el siguiente vuelve al precio anterior, **no es subida** (cargo puntual).
- **Impacto anual** = (precio nuevo − precio anterior) × cobros/año.
  Ejemplo: STREAMFLIX de 12,99 a 13,99 €/mes → 1,00 × 12 = **12 € más al año**.
- Una subida es un hallazgo **propio** con su decisión. Si el usuario ya dijo «Lo sigo usando»
  de ese cobro, una subida nueva vuelve a aparecer (su huella incluye el precio nuevo).
- Para no contar dos veces: si el cobro no es esencial, su coste anual ya incluye la subida y el
  total solo suma el cobro. Si es esencial, el total suma **solo la diferencia**.

### C.4 Posibles cobros dobles (implementado; apunte repetido en la app: fase 2)

- Mismo `merchantKey`, **mismo importe exacto** (al céntimo), ambos gastos, separados por
  **0-2 días**, importe **≥ 10 €**.
- **Se descarta** si el comercio es de compras frecuentes del mismo importe (≥ 4 cobros iguales
  en 30 días: metro, aparcamiento, café) o si es esencial con importe repetido habitual.
- **Se resuelve solo** si aparece un ingreso del mismo comercio y mismo importe en los 45 días
  siguientes (devolución): pasa a «Ya te lo devolvieron» y no suma.
- **Coste:** el importe de **una** vez, como cantidad **puntual** (no anual). Se muestra aparte
  del total anual: «y **89 €** de un posible cobro doble».
- Caso distinto: un movimiento apuntado a mano y luego importado (descripciones distintas, mismo
  día e importe, uno sin huella de importación). No es dinero perdido sino un apunte repetido en
  la app: fase 2, como aviso «Puede que esté apuntado dos veces» con botón para borrar uno.

### C.5 Gastos hormiga (pequeños gastos muy frecuentes) (implementado por comercio; por categoría: fase 2)

- **Pequeño:** importe ≤ **12 €**.
- **Frecuente:** ≥ **12** gastos pequeños en el mismo comercio en los **últimos 90 días**
  (aproximadamente uno por semana).
- **Total anual estimado** = total de esos 90 días × 365 / 90, **redondeado a la decena hacia
  abajo**. Solo se muestra si es **≥ 120 €/año**.
- **No cuentan** las categorías esenciales ni `Alimentación` ni `Transporte` (la compra del súper
  y el abono no son caprichos). El usuario puede marcar cualquier otro como «No es un gasto
  hormiga».
- Redacción: «En CAFETERÍA LA PLAZA haces unos **7 gastos al mes** de menos de 12 €. Al año son
  unos **160 €**. Si los redujeras a la mitad, serían aprox. **80 €** menos al año.»
- Por categoría (todos los cafés juntos aunque sean sitios distintos): fase 2, con umbral ≥ 20 en
  90 días y ≥ 200 €/año.

### C.6 Niveles de confianza (implementado)

Solo se enseñan **alta** y **media**. La baja no se muestra ni suma (se cuenta internamente para
ajustar umbrales).

| Tipo           | Alta                                                                                                | Media                                                                | Baja (oculta)                                    |
| -------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| Cobro repetido | ≥ 4 cobros (≥ 3 si no es mensual/semanal), todos los huecos en rango, importes a ±5 % de la mediana | Mínimo de cobros justo, o un hueco tolerado, o importes a ±25 %      | 2 cobros mensuales; anual con importes distintos |
| Subida         | ≥ 2 cobros al precio anterior y el nuevo confirmado en el último                                    | 1 cobro anterior y 1 nuevo (típico en anuales)                       | Subida < 3 % o < 0,50 €                          |
| Cobro doble    | Mismo día                                                                                           | 1-2 días de diferencia                                               | 3 o más días                                     |
| Hormiga        | ≥ 12 en 90 días y ≥ 120 €/año con 90 días completos de datos                                        | Igual pero con 45-89 días de datos (se anualiza con los días reales) | Menos de 45 días                                 |

En la UI la confianza no aparece como palabra técnica. Media lleva el texto «Revisa si es
correcto»; alta, ninguno.

### C.7 Falsos positivos y decisiones del usuario (implementado)

Cada hallazgo tiene **dos botones grandes** y un enlace «Más opciones»:

| Botón                                                                                                  | Estado      | Efecto                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Lo sigo usando»                                                                                       | `keep`      | Sale de «a revisar» y del total. Vuelve solo si sube de precio. Ofrece «Apuntarlo como operación automática» (crea una `RecurringRule`; cuenta para el límite de 5 del plan gratis)                                                                                                                                                                        |
| «Quiero darlo de baja»                                                                                 | `cancel`    | Sale del total «a revisar» y pasa a «Vas a dejar de pagar». Muestra una ayuda genérica: «Entra en la web o app del servicio, apartado Cuenta o Suscripción. Si es un recibo domiciliado, tu banco te informa de cómo devolverlo». Cuando pasa la fecha esperada + margen sin cobro nuevo → `recovered`: «Ya no se cobra: dejas de pagar unos 479 € al año» |
| Más opciones → «No es una suscripción» / «No es un gasto hormiga» / «Era una compra doble a propósito» | `dismissed` | Desaparece y no vuelve con la misma huella                                                                                                                                                                                                                                                                                                                 |
| Más opciones → «No reconozco este cobro»                                                               | `not_mine`  | Desaparece del total. Mensaje: «Si no reconoces un cobro, llama a tu banco cuanto antes. Finanverso no puede anularlo.»                                                                                                                                                                                                                                    |

- **Botones por tipo:** en subidas, «Lo he visto» (`keep`) y «Más opciones»; en cobros dobles,
  «Lo reclamaré» (`cancel`: sale del total y queda en «Revisados») y «Eran dos compras a propósito»
  (`dismissed`), más «No reconozco este cobro»; en pequeños gastos, «Lo he visto» (`keep`) y «No es
  un gasto hormiga» (`dismissed`).
- **Deshacer:** aviso de 8 segundos con «Deshacer» tras cada decisión, y una lista «Revisados»
  donde se puede cambiar de opinión.
- **Huella (fingerprint)** de cada hallazgo, estable entre lecturas:
  `rec:<merchantKey>:<ritmo>:<bloque de importe>`, `inc:<merchantKey>:<precio nuevo en céntimos>`,
  `dup:<merchantKey>:<importe>:<fecha>`, `ant:<merchantKey>`. El `id` público es
  `sha256(huella)` truncado a 16 caracteres hex: **ningún nombre de comercio va en una URL**.
- Si un usuario descarta más del 40 % de los hallazgos de un tipo, los umbrales están mal: lo
  vemos en la analítica agregada (H), no por usuario.

### C.8 La cifra: «esto te cuesta X € al año» (implementado)

**Total anual a revisar** = suma, de los hallazgos en estado `new` con confianza alta o media, de:
coste anual de los cobros repetidos no esenciales + diferencia anual de las subidas de esenciales

- total anual de los gastos hormiga. **Redondeo a la decena hacia abajo** y siempre con «unos».
  Los cobros dobles van aparte, como cantidad puntual.

Ejemplo inventado (persona con 15 meses de movimientos importados):

| Hallazgo                                           | Tipo                        | Confianza | Cálculo                         | Suma al total                          |
| -------------------------------------------------- | --------------------------- | --------- | ------------------------------- | -------------------------------------- |
| FITBOX 39,90 €/mes, 15 cobros desde agosto de 2025 | Cobro repetido              | Alta      | 39,90 × 12                      | 478,80 €                               |
| STREAMFLIX 12,99 → 13,99 €/mes                     | Cobro repetido (con subida) | Alta      | 13,99 × 12                      | 167,88 €                               |
| CLOUDY 2,99 €/mes                                  | Cobro repetido              | Alta      | 2,99 × 12                       | 35,88 €                                |
| SEGUROS HOGAR ALFA 186 → 214 €/año                 | Subida (esencial)           | Media     | 28 × 1                          | 28,00 €                                |
| CAFETERÍA LA PLAZA, 22 gastos de 1,80 € en 90 días | Hormiga                     | Alta      | 39,60 × 365 / 90 = 160,60 → 160 | 160,00 €                               |
| ELECTRO MARKET 89,00 € dos veces el 12/09          | Cobro doble                 | Alta      | 89,00 una vez                   | (aparte) 89 €                          |
| **Total**                                          |                             |           | 870,56 →                        | **unos 870 € al año** y 89 € puntuales |

**Redacción, sin prometer:**

- Titular: «Esto te cuesta **unos 870 € al año**.» Subtítulo: «5 cosas que conviene revisar.»
- Por hallazgo: «Si lo dieras de baja, **te ahorrarías aprox. 479 € al año**.» (condicional,
  «aprox.»).
- Lo decidido: «Vas a dejar de pagar unos 43 € al mes» (solo con lo marcado «Quiero darlo de
  baja») y, cuando se verifica, «Ya no pagas: unos 514 € al año».
- Palabras prohibidas en esta pantalla: «deberías», «te recomendamos», «ahorrarás» (futuro
  seguro), «olvidada», «gestor», «garantizado».
- Aviso fijo al pie: ver I.4.

### C.9 Datos mínimos y qué ve quien tiene pocos datos (implementado)

Cobertura = días entre el gasto más antiguo y el más reciente de la ventana, y número de gastos.

| Nivel      | Condición               | Qué se analiza                                               | Qué ve el usuario                                                                                                      |
| ---------- | ----------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `none`     | 0 gastos                | Nada                                                         | Estado vacío: qué buscamos, botón «Importar mi extracto» y «Cómo descargar el extracto de mi banco» (guías existentes) |
| `partial`  | < 90 días o < 30 gastos | Cobros dobles; mensuales con 3 cobros; hormiga con ≥ 45 días | Lo que haya + barra «Llevas 41 de 90 días. Con 3 meses de movimientos veremos mucho más» + botón importar              |
| `complete` | ≥ 90 días y ≥ 30 gastos | Todo menos anuales con < 13 meses                            | Resultado completo. Nota: «Los cobros anuales necesitan más de un año de movimientos» si la cobertura es < 13 meses    |

Consejo al importar (el plan gratis solo tiene **1 importación**): «Descarga de tu banco los
**últimos 12 meses en un solo archivo**: así el análisis sale completo a la primera.» Esto se
añade al texto de `ImportModal`, sin cambiar el límite.

---

## D. Diseño funcional: «La fecha de tu meta»

### D.1 Datos (implementado)

- `objetivo` y `ahorrado` (ya existen en `GoalView.progress`).
- **Ritmo real** (nuevo, del servidor): media mensual de los movimientos de tipo Ahorro en la
  categoría de la meta en los **últimos 6 periodos completos** (sin el actual), contando los
  meses con 0 € desde el primer ahorro en esa categoría (si no, la media sale optimista). Hace
  falta **≥ 2 periodos** desde el primer ahorro; si no, `null`.
- **Aportación indicada:** la que el usuario escribe en el simulador (por defecto, el ritmo real;
  si no hay, `monthlyNeeded` cuando la meta tiene fecha; si tampoco, vacío).
- **Rentabilidad anual estimada** (opcional, por defecto 0 %, máximo 10 %), con el aviso ya
  existente `tools.goal.disclaimer`.

### D.2 Fórmula (implementado)

```
falta      = max(0, objetivo − ahorrado)
aportación = ritmo (real o indicado) + extra del deslizador
sin interés:  meses = ceil(falta / aportación)
con interés:  meses = monthsToGoal({ target: objetivo, initial: ahorrado,
                                     monthly: aportación, annualRatePct: r })
              (interés compuesto mensual (1 + r)^(1/12) − 1, tope 1200 meses)
mes 1      = periodo actual si aún no hay ahorro en él para esta meta; si ya lo hay, el siguiente
fecha      = mes 1 + (meses − 1), mostrada como «febrero de 2028» (mes y año, nunca día)
```

Se usan los **periodos** del usuario (respetan `monthStartDay`), como el resto de la app.
Importes en pantalla redondeados al euro; la fecha nunca se redondea «a favor».

Ejemplo inventado: meta «Viaje» 3.000 €, ahorrado 1.150 €, ahorros de los últimos 6 meses
150 + 100 + 0 + 200 + 120 + 150 = 720 € → **ritmo 120 €/mes**. Hoy 24/10/2026 y ya apartó algo
en octubre, así que el mes 1 es noviembre.

| Escenario                                                | Aportación | Meses                     | Fecha              | Diferencia    |
| -------------------------------------------------------- | ---------- | ------------------------- | ------------------ | ------------- |
| A tu ritmo                                               | 120 €      | ceil(1.850 / 120) = 16    | febrero de 2028    | —             |
| «¿Y si aparto 50 € más?»                                 | 170 €      | ceil(1.850 / 170) = 11    | septiembre de 2027 | 5 meses antes |
| Con lo que vas a dar de baja (FITBOX + CLOUDY = 42,89 €) | 162,89 €   | ceil(1.850 / 162,89) = 12 | octubre de 2027    | 4 meses antes |

### D.3 Casos límite (implementado)

| Caso                         | Qué se muestra                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ahorrado ≥ objetivo`        | «¡Meta conseguida!» (ya existe `app.goals.completed`); sin simulador                                                                                         |
| Sin ritmo real ni aportación | «Dinos cuánto piensas apartar al mes y te decimos cuándo llegas» + campo                                                                                     |
| Aportación 0 o negativa      | «Con 0 € al mes no llegas. Prueba con una cantidad.» Sin fecha                                                                                               |
| Más de 50 años (600 meses)   | «Más de 50 años a este ritmo. Prueba a apartar algo más.» (la calculadora pública dice 100; aquí 50 es más realista)                                         |
| La meta tiene fecha objetivo | Además: «Tu fecha es junio de 2027: llegas **8 meses tarde**. Para llegar a tiempo, unos **206 €/mes**» (reutiliza `monthlyNeeded`) o «llegas 3 meses antes» |
| Meta archivada               | Sin fecha (no se calcula)                                                                                                                                    |
| Ritmo real con 2-3 meses     | Se muestra con «Calculado con solo 2 meses»                                                                                                                  |
| Rentabilidad negativa        | No se permite (mínimo 0 %) en esta pantalla                                                                                                                  |
| Ahorro sacado de la meta     | La app no tiene retiradas de ahorro (solo suma movimientos Ahorro); se documenta, no se calcula                                                              |

### D.4 Deslizador «¿y si ahorro X más?» (implementado; «Apuntar como operación automática»: fase 2)

- Rango 0 a máx(300 €, 2 × ritmo), pasos de 10 €. Botones rápidos **+25 €**, **+50 €**, **+100 €**
  y botones **−10 / +10** al lado del deslizador (más fáciles que arrastrar para personas mayores
  o con temblor). También se puede escribir la cifra.
- El resultado cambia al momento (cálculo en el navegador) y se anuncia con `aria-live="polite"`:
  «Con 50 € más al mes llegarías en septiembre de 2027, 5 meses antes».
- No se guarda nada. Botón opcional «Apuntar 50 € al mes como operación automática»: crea una
  `RecurringRule` de tipo Ahorro en la categoría de la meta (reutiliza `RecurringService`).

### D.5 Enlace con «Tu dinero perdido» y tarjeta compartible (enlace implementado; tarjeta: fase 2)

- Si el usuario tiene hallazgos en `cancel` o `recovered`, aparece el botón «Usar lo que vas a dar
  de baja (43 €/mes)», que suma esa cantidad como extra. Solo con lo que **el usuario decidió**,
  nunca con lo pendiente: así no se promete nada.
- Si no hay decididos pero sí pendientes: texto suave «En Tu dinero perdido hay unos 72 €/mes por
  revisar» con enlace. Sin sumar.
- **Tarjeta compartible** (canvas como `recapImage`, 1080×1350): icono de la meta, anillo con el
  porcentaje, «Llegaré a mi meta en **febrero de 2028**», pie `finanverso.app`. Por defecto **sin
  importes y sin el nombre de la meta** (el nombre puede ser personal: «Boda con…»): dos casillas,
  «Mostrar importes» y «Mostrar el nombre», desmarcadas. Se comparte con la API nativa de
  compartir, igual que `RecapShare`.

---

## E. Pantallas

Maquetas completas (móvil 390 px y escritorio, estados) en
[`dinero-perdido-wireframes.html`](./dinero-perdido-wireframes.html). Abajo, lo esencial.

### E.1 «Tu dinero perdido», móvil 390 px (implementado)

```
┌──────────────────────────────────────┐
│ ☰  Tu dinero perdido                  │
├──────────────────────────────────────┤
│  Esto te cuesta                       │
│  unos 870 € al año                    │  ← 2rem, negrita
│  5 cosas que conviene revisar         │
│  y 89 € de un posible cobro doble     │
│                                       │
│  [Cobros que se repiten 3] [Subidas 1]│  ← filtros, botones ≥48 px
│  [Cobros dobles 1] [Pequeños gastos 1]│
├──────────────────────────────────────┤
│ ↻ FITBOX                              │
│   Se cobra cada mes desde agosto 2025 │
│   39,90 € al mes · unos 479 € al año  │
│   Si lo dieras de baja, te ahorrarías │
│   aprox. 479 € al año.                │
│  ┌──────────────┐ ┌─────────────────┐ │
│  │Lo sigo usando│ │Quiero darlo de  │ │
│  └──────────────┘ │baja             │ │
│                   └─────────────────┘ │
│   Más opciones ▾   Ver los 15 cobros ▸│
├──────────────────────────────────────┤
│ ▲ SEGUROS HOGAR ALFA      Revisa si es │
│   Subió de 186 € a 214 € al año        │
│   28 € más al año                      │
│   [Lo he visto]  [Más opciones ▾]      │
├──────────────────────────────────────┤
│ 🔒 2 hallazgos más con Premium          │  (plan gratis)
│    [Ver planes]                        │
├──────────────────────────────────────┤
│ Revisados (2) ▸   Vas a dejar de pagar │
│                   unos 43 € al mes     │
├──────────────────────────────────────┤
│ ⓘ Estimaciones orientativas a partir   │
│   de tus movimientos. No es            │
│   asesoramiento financiero.            │
└──────────────────────────────────────┘
```

En escritorio: dos columnas; a la izquierda el titular, los filtros y «Revisados»; a la derecha
la lista de hallazgos (máx. 720 px de ancho de lectura).

### E.2 Meta con fecha, móvil 390 px (implementado sin compartir ni apuntar)

```
┌──────────────────────────────────────┐
│ ✈️ Viaje               1.150 / 3.000 € │
│ ███████░░░░░░░░░░░░  38 %             │
│ A tu ritmo (120 €/mes) llegas en       │
│ febrero de 2028                        │  ← 1.25rem, negrita
│ [¿Y si aparto más? ▸]                  │
└──────────────────────────────────────┘
          ↓ al pulsar (hoja inferior)
┌──────────────────────────────────────┐
│ ¿Y si apartas más cada mes?      ✕    │
│ Aparto al mes: [ 120 € ]  (tu ritmo)  │
│ Extra:  [−10]  ●────○──────  [+10]    │
│         50 € más al mes               │
│ [+25 €] [+50 €] [+100 €]              │
│ [Usar lo que vas a dar de baja 43 €]  │
│ ─────────────────────────────────────│
│ Llegarías en septiembre de 2027       │
│ 5 meses antes                         │
│ ▸ Añadir rentabilidad estimada        │
│ [Compartir mi fecha]  [Apuntar 50 €/mes]│
└──────────────────────────────────────┘
```

### E.3 Textos exactos (es / en) (implementado)

Claves nuevas con prefijo `app.leaks.*` y `app.goals.date.*`. Se mantienen las de
`app.subscriptions.*` mientras exista la tarjeta antigua.

| Clave                                                                         | es                                                                                                                                                | en                                                                                                                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `app.tabs.leaks`                                                              | Tu dinero perdido                                                                                                                                 | Money you're losing                                                                                                                    |
| `app.menu.short.leaks`                                                        | Dinero perdido                                                                                                                                    | Lost money                                                                                                                             |
| `app.leaks.headline`                                                          | Esto te cuesta unos {amount} al año                                                                                                               | This costs you about {amount} a year                                                                                                   |
| `app.leaks.count`                                                             | {count, plural, one {# cosa que conviene revisar} other {# cosas que conviene revisar}}                                                           | {count, plural, one {# thing worth checking} other {# things worth checking}}                                                          |
| `app.leaks.oneOff`                                                            | y {amount} de un posible cobro doble                                                                                                              | plus {amount} from a possible double charge                                                                                            |
| `app.leaks.kind.recurring`                                                    | Cobros que se repiten                                                                                                                             | Repeating charges                                                                                                                      |
| `app.leaks.kind.increase`                                                     | Subidas de precio                                                                                                                                 | Price rises                                                                                                                            |
| `app.leaks.kind.duplicate`                                                    | Posibles cobros dobles                                                                                                                            | Possible double charges                                                                                                                |
| `app.leaks.kind.small`                                                        | Pequeños gastos frecuentes                                                                                                                        | Small, frequent spending                                                                                                               |
| `app.leaks.recurring.since`                                                   | Se cobra {cadence} desde {month} ({count} cobros)                                                                                                 | Charged {cadence} since {month} ({count} charges)                                                                                      |
| `app.leaks.cadence.weekly` / `monthly` / `bimonthly` / `quarterly` / `yearly` | cada semana / cada mes / cada dos meses / cada tres meses / cada año                                                                              | every week / every month / every two months / every three months / every year                                                          |
| `app.leaks.perYear`                                                           | {amount} al {period} · unos {annual} al año                                                                                                       | {amount} per {period} · about {annual} a year                                                                                          |
| `app.leaks.ifCancel`                                                          | Si lo dieras de baja, te ahorrarías aprox. {annual} al año.                                                                                       | If you cancelled it, you'd save about {annual} a year.                                                                                 |
| `app.leaks.increase.line`                                                     | Subió de {from} a {to}                                                                                                                            | Went up from {from} to {to}                                                                                                            |
| `app.leaks.increase.impact`                                                   | {amount} más al año                                                                                                                               | {amount} more a year                                                                                                                   |
| `app.leaks.duplicate.line`                                                    | {amount} cobrados dos veces el {date}                                                                                                             | {amount} charged twice on {date}                                                                                                       |
| `app.leaks.duplicate.hint`                                                    | Si fue un error, puedes reclamarlo al comercio o a tu banco.                                                                                      | If it was a mistake, you can claim it from the shop or your bank.                                                                      |
| `app.leaks.small.line`                                                        | Unos {perMonth} gastos al mes de menos de {limit}                                                                                                 | About {perMonth} purchases a month under {limit}                                                                                       |
| `app.leaks.small.half`                                                        | Si los redujeras a la mitad, serían aprox. {amount} menos al año.                                                                                 | If you halved them, that'd be about {amount} less a year.                                                                              |
| `app.leaks.medium`                                                            | Revisa si es correcto                                                                                                                             | Check this is right                                                                                                                    |
| `app.leaks.action.keep`                                                       | Lo sigo usando                                                                                                                                    | I still use it                                                                                                                         |
| `app.leaks.action.cancel`                                                     | Quiero darlo de baja                                                                                                                              | I want to cancel it                                                                                                                    |
| `app.leaks.action.seen`                                                       | Lo he visto                                                                                                                                       | Got it                                                                                                                                 |
| `app.leaks.action.more`                                                       | Más opciones                                                                                                                                      | More options                                                                                                                           |
| `app.leaks.action.dismiss`                                                    | No es una suscripción                                                                                                                             | It's not a subscription                                                                                                                |
| `app.leaks.action.dismissSmall`                                               | No es un gasto hormiga                                                                                                                            | It's not a small leak                                                                                                                  |
| `app.leaks.action.dismissDuplicate`                                           | Eran dos compras a propósito                                                                                                                      | They were two separate purchases                                                                                                       |
| `app.leaks.action.notMine`                                                    | No reconozco este cobro                                                                                                                           | I don't recognise this charge                                                                                                          |
| `app.leaks.notMine.help`                                                      | Si no reconoces un cobro, llama a tu banco cuanto antes. Finanverso no puede anularlo.                                                            | If you don't recognise a charge, call your bank as soon as possible. Finanverso can't cancel it.                                       |
| `app.leaks.cancel.help`                                                       | Entra en la web o la app del servicio, en Cuenta o Suscripción. Si es un recibo domiciliado, tu banco te informa de cómo devolverlo.              | Go to the service's website or app, under Account or Subscription. If it's a direct debit, your bank can tell you how to return it.    |
| `app.leaks.undo`                                                              | Hecho. Deshacer                                                                                                                                   | Done. Undo                                                                                                                             |
| `app.leaks.reviewed`                                                          | Revisados ({count})                                                                                                                               | Reviewed ({count})                                                                                                                     |
| `app.leaks.toCancel`                                                          | Vas a dejar de pagar unos {amount} al mes                                                                                                         | You're about to stop paying about {amount} a month                                                                                     |
| `app.leaks.recovered`                                                         | Ya no se cobra: dejas de pagar unos {amount} al año                                                                                               | No longer charged: you stop paying about {amount} a year                                                                               |
| `app.leaks.evidence`                                                          | Ver los {count} cobros                                                                                                                            | See the {count} charges                                                                                                                |
| `app.leaks.empty`                                                             | No hemos encontrado nada que revisar. ¡Bien hecho!                                                                                                | We haven't found anything to check. Well done!                                                                                         |
| `app.leaks.none.title`                                                        | Descubre cuánto se te escapa al año                                                                                                               | Find out how much slips away each year                                                                                                 |
| `app.leaks.none.body`                                                         | Importa el extracto de tu banco y buscamos cobros que se repiten, subidas de precio, cobros dobles y pequeños gastos frecuentes.                  | Import your bank statement and we'll look for repeating charges, price rises, double charges and small, frequent spending.             |
| `app.leaks.none.cta`                                                          | Importar mi extracto                                                                                                                              | Import my statement                                                                                                                    |
| `app.leaks.partial`                                                           | Llevas {days} de 90 días de movimientos. Con 3 meses veremos mucho más.                                                                           | You have {days} of 90 days of movements. With 3 months we'll see much more.                                                            |
| `app.leaks.yearlyNote`                                                        | Los cobros anuales necesitan más de un año de movimientos.                                                                                        | Yearly charges need more than a year of movements.                                                                                     |
| `app.leaks.importTip`                                                         | Descarga de tu banco los últimos 12 meses en un solo archivo.                                                                                     | Download the last 12 months from your bank in a single file.                                                                           |
| `app.leaks.locked`                                                            | {count, plural, one {# hallazgo más} other {# hallazgos más}} con Premium                                                                         | {count, plural, one {# more finding} other {# more findings}} with Premium                                                             |
| `app.leaks.error`                                                             | No hemos podido revisar tus movimientos. Inténtalo de nuevo.                                                                                      | We couldn't check your movements. Please try again.                                                                                    |
| `app.leaks.retry`                                                             | Reintentar                                                                                                                                        | Try again                                                                                                                              |
| `app.leaks.loading`                                                           | Revisando tus movimientos…                                                                                                                        | Checking your movements…                                                                                                               |
| `app.leaks.disclaimer`                                                        | Estimaciones orientativas a partir de tus movimientos. Finanverso no sabe si usas un servicio: revisa cada cobro. No es asesoramiento financiero. | Rough estimates from your movements. Finanverso can't know whether you use a service: check each charge. This is not financial advice. |
| `app.leaks.teaser`                                                            | Tu dinero perdido: unos {amount} al año en {count} cosas. Ver                                                                                     | Money you're losing: about {amount} a year in {count} things. See                                                                      |
| `app.goals.date.atPace`                                                       | A tu ritmo ({amount}/mes) llegas en                                                                                                               | At your pace ({amount}/month) you'll get there in                                                                                      |
| `app.goals.date.askPace`                                                      | Dinos cuánto piensas apartar al mes y te decimos cuándo llegas.                                                                                   | Tell us how much you plan to put aside each month and we'll tell you when you'll get there.                                            |
| `app.goals.date.zero`                                                         | Con 0 € al mes no llegas. Prueba con una cantidad.                                                                                                | With €0 a month you won't get there. Try an amount.                                                                                    |
| `app.goals.date.tooLong`                                                      | Más de 50 años a este ritmo. Prueba a apartar algo más.                                                                                           | Over 50 years at this pace. Try putting aside a bit more.                                                                              |
| `app.goals.date.fewMonths`                                                    | Calculado con solo {count} meses                                                                                                                  | Based on only {count} months                                                                                                           |
| `app.goals.date.late`                                                         | Tu fecha es {date}: llegas {count} meses tarde. Para llegar a tiempo, unos {amount}/mes.                                                          | Your date is {date}: you'll be {count} months late. To make it, about {amount}/month.                                                  |
| `app.goals.date.early`                                                        | Llegas {count} meses antes de tu fecha.                                                                                                           | You'll get there {count} months early.                                                                                                 |
| `app.goals.date.whatIf`                                                       | ¿Y si aparto más?                                                                                                                                 | What if I save more?                                                                                                                   |
| `app.goals.date.sheetTitle`                                                   | ¿Y si apartas más cada mes?                                                                                                                       | What if you put aside more each month?                                                                                                 |
| `app.goals.date.monthly`                                                      | Aparto al mes                                                                                                                                     | I put aside each month                                                                                                                 |
| `app.goals.date.extra`                                                        | {amount} más al mes                                                                                                                               | {amount} more a month                                                                                                                  |
| `app.goals.date.result`                                                       | Llegarías en {date}                                                                                                                               | You'd get there in {date}                                                                                                              |
| `app.goals.date.sooner`                                                       | {count, plural, one {# mes antes} other {# meses antes}}                                                                                          | {count, plural, one {# month sooner} other {# months sooner}}                                                                          |
| `app.goals.date.useLeaks`                                                     | Usar lo que vas a dar de baja ({amount}/mes)                                                                                                      | Use what you're cancelling ({amount}/month)                                                                                            |
| `app.goals.date.leaksHint`                                                    | En Tu dinero perdido hay unos {amount}/mes por revisar.                                                                                           | There's about {amount}/month to check in Money you're losing.                                                                          |
| `app.goals.date.rate`                                                         | Añadir rentabilidad estimada                                                                                                                      | Add an estimated return                                                                                                                |
| `app.goals.date.share`                                                        | Compartir mi fecha                                                                                                                                | Share my date                                                                                                                          |
| `app.goals.date.shareTitle`                                                   | Llegaré a mi meta en {date}                                                                                                                       | I'll reach my goal in {date}                                                                                                           |
| `app.goals.date.shareAmounts` / `shareName`                                   | Mostrar importes / Mostrar el nombre de la meta                                                                                                   | Show amounts / Show the goal's name                                                                                                    |
| `app.goals.date.saveRule`                                                     | Apuntar {amount} al mes como operación automática                                                                                                 | Set up {amount} a month as an automatic movement                                                                                       |
| `app.goals.date.disclaimer`                                                   | Estimación con tu ritmo de ahorro; la fecha real puede cambiar. No es asesoramiento financiero.                                                   | Estimate based on your saving pace; the real date may change. This is not financial advice.                                            |

Los textos pasan por `finanverso-ig-human` (limpieza) antes de entrar en `es.json`/`en.json`. Si
el i18n actual no soporta `plural` ICU, se usan dos claves `…One` / `…Other` como en el resto.

### E.4 Estados (implementado)

| Estado                     | Dinero perdido                                                                                                                                               | Fecha de meta                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Carga                      | Esqueleto: bloque del titular + 3 tarjetas grises, `aria-busy="true"` y texto oculto «Revisando tus movimientos…». Sin animación si `prefers-reduced-motion` | La línea de la fecha muestra un rectángulo gris de una línea (el resto de la tarjeta ya está) |
| Vacío (`none`)             | Ilustración simple, `app.leaks.none.*`, botón «Importar mi extracto» (abre `ImportModal`) y enlace a la guía del banco                                       | `askPace` con campo                                                                           |
| Parcial                    | Lo encontrado + barra de progreso de días + consejo de importación                                                                                           | «Calculado con solo N meses»                                                                  |
| Sin hallazgos (`complete`) | `app.leaks.empty` y la lista «Revisados» si la hay                                                                                                           | —                                                                                             |
| Error                      | `app.leaks.error` + «Reintentar»; no se borra lo que ya se mostraba                                                                                          | La tarjeta de la meta se ve sin la línea de fecha                                             |
| Plan gratis                | 3 hallazgos completos + `app.leaks.locked` + «Ver planes»                                                                                                    | Todo disponible                                                                               |
| Sin conexión               | Lo último cargado, con el `OfflineBanner` existente; los botones de decisión se desactivan                                                                   | Funciona (cálculo local)                                                                      |

### E.5 Accesibilidad (público mayor incluido) (implementado)

- Texto base 16 px (el de la app); la cifra del titular a 2rem y las fechas de la meta a 1.25rem.
  Respeta el zoom del sistema (todo en `rem`), sin cortes al 200 %.
- Botones de al menos **48 × 48 px**, con texto (no solo icono), separados ≥ 8 px. Dos acciones
  principales por tarjeta como mucho; el resto en «Más opciones».
- Contraste ≥ **4.5:1** en texto y ≥ 7:1 en la cifra principal, en claro y en oscuro (tokens de
  `frontend/src/index.css`). El tipo de hallazgo nunca se indica solo por color: icono + palabra
  («Subida», «Cobro doble»).
- Lector de pantalla: cada hallazgo es un `<article aria-labelledby>` cuyo título lee «FITBOX,
  cobro que se repite cada mes, unos 479 euros al año». Las decisiones y el deslizador se anuncian
  con `aria-live="polite"`. El deslizador es un `<input type="range">` con `aria-valuetext` («50
  euros más al mes»), además de los botones −10/+10 y el campo numérico.
- Fechas en palabras («febrero de 2028», «hacia el 3 de noviembre»), no «02/28». Sin jerga: «cobro
  que se repite», no «recurrente»; «pequeños gastos frecuentes», con «gastos hormiga» entre
  paréntesis la primera vez.
- Nada desaparece solo salvo el aviso «Deshacer», que dura 8 s y se puede alcanzar con el teclado
  (y queda la lista «Revisados» para volver atrás).
- Orden de foco: titular → filtros → tarjetas → revisados → aviso. Foco visible.

### E.6 Menú y tour (implementado, con TOUR_VERSION 4)

- **Menú:** sección nueva `leaks` en el grupo `overview` de `navigation.ts`, justo después de
  `analysis`, icono `coins`, etiqueta corta «Dinero perdido».
- **Aviso en el Resumen mensual** (`MonthlyView`): una línea `app.leaks.teaser` cuando la cobertura
  es `complete` y hay hallazgos `new`; se cierra con una ✕ y no vuelve hasta que haya uno nuevo.
- **Análisis:** la tarjeta «Suscripciones detectadas» se cambia por una línea que lleva a la
  sección nueva (ver K, pregunta 3).
- **Después de importar:** el resultado de la importación añade «Hemos revisado tus movimientos:
  unos 870 € al año que conviene mirar. Ver». Es el momento gancho.
- **Tour** (`tourSteps.ts`): paso `leaks` (`tab: 'leaks'`, `target: SECTION`) después de `goals`,
  y paso `goalDate` (`tab: 'goals'`, `target: '[data-tour="goal-date"]'`). Textos:
  - `app.tour.leaks.title`: «Tu dinero perdido» / «Money you're losing».
  - `app.tour.leaks.body`: «Buscamos en tus movimientos cobros que se repiten, subidas de precio y
    cobros dobles, y te decimos cuánto cuestan al año. Tú decides qué revisar.» / «We look through
    your movements for repeating charges, price rises and double charges, and tell you what they
    cost each year. You decide what to check.»
  - `app.tour.goalDate.title`: «¿Cuándo llegas a tu meta?» / «When will you reach your goal?».
  - `app.tour.goalDate.body`: «Con tu ritmo de ahorro te decimos el mes en que llegas, y puedes
    probar qué pasa si apartas un poco más.» / «From your saving pace we tell you the month you'll
    get there, and you can try what happens if you put aside a bit more.»
  - `TOUR_VERSION` se queda en 3: dos pasos no son «un cambio grande» según su propio comentario.

---

## F. Gratis y Premium (implementado)

Principio: el plan gratis **ve su cifra y puede actuar sobre lo más caro**; Premium da comodidad
y vigilancia continua, no información que haga falta para no perder dinero.

|                                                                    | Gratis                                                                                 | Premium                                                         |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Análisis completo (todos los tipos)                                | Sí, en el servidor                                                                     | Sí                                                              |
| Cifra total al año y recuento por tipo                             | Sí                                                                                     | Sí                                                              |
| Hallazgos con detalle y decisiones                                 | Los **3 de mayor coste anual** (lo mismo que hoy, `FREE_SUBSCRIPTIONS_SHOWN = 3`)      | Todos                                                           |
| Posibles cobros dobles y «No reconozco este cobro»                 | **Siempre visibles**, aunque pasen de 3 (un cargo indebido no se esconde tras un pago) | Sí                                                              |
| Pruebas («Ver los 15 cobros»)                                      | Sí, en los visibles                                                                    | Sí                                                              |
| Lista «Revisados» y «Ya no se cobra»                               | Sí                                                                                     | Sí                                                              |
| Avisos de subidas y cobros dobles nuevos (push / correo del lunes) | No                                                                                     | Sí (fase 2, con el consentimiento ya existente de push/resumen) |
| Exportar CSV/PDF de los hallazgos                                  | De lo visible (como hoy con `ExportButtons`)                                           | Todo                                                            |
| Pequeños gastos por categoría                                      | No                                                                                     | Sí (fase 2)                                                     |
| Fecha de la meta, simulador, rentabilidad, compartir               | **Sí, completo** (la calculadora pública ya es gratis)                                 | Sí                                                              |

Comprobación: en el servidor con `entitlements.limits(userId).features.insights`, igual que
`StatsService.subscriptions()`. Constante nueva `FREE_LEAKS_SHOWN = 3` en `plans.ts` (o reutilizar
la existente renombrándola). El recorte se hace **después** de calcular el total, para que la
cifra sea la real. Los `id` de los hallazgos ocultos no se envían.

---

## G. Modelo de datos y API

### G.1 Migración 041: decisiones (implementado)

`backend/src/infrastructure/sqlite/migrations/041-money-leak-decisions.ts` (aditiva, sin tocar
datos):

```sql
CREATE TABLE money_leak_decisions (
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  finding_id    TEXT NOT NULL,          -- sha256(huella) truncado, 16 hex
  fingerprint   TEXT NOT NULL,          -- p. ej. rec:fitbox:monthly:3990 (para exportar y depurar)
  kind          TEXT NOT NULL CHECK (kind IN ('recurring','increase','duplicate','small')),
  status        TEXT NOT NULL CHECK (status IN ('keep','cancel','dismissed','not_mine','recovered')),
  annual_cents  INTEGER NOT NULL DEFAULT 0,   -- coste al decidir, para «dejas de pagar…»
  decided_at    TEXT NOT NULL,
  recovered_at  TEXT,
  PRIMARY KEY (user_id, finding_id)
) WITHOUT ROWID;
```

- No se guarda el concepto completo ni los importes de cada cobro: se recalculan.
- Límite: 500 decisiones por usuario; las que no corresponden a ningún hallazgo en 400 días se
  borran al leer (limpieza perezosa).
- `recovered` lo pone el servidor al leer: decisión `cancel` + pasada la próxima fecha esperada
  - margen (mensual 10 días, anual 30) sin cobro nuevo del grupo.
- Hogar compartido: las decisiones van con `dataUserId` (los datos son del dueño); cualquier
  miembro las ve y cambia, como el resto de los datos.

### G.2 Endpoints (implementado)

| Método y ruta                   | Cuerpo / parámetros (zod)                                                                                             | Respuesta                                                                                                                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /stats/money-leaks`        | —                                                                                                                     | `MoneyLeaksView`                                                                                                                                                                                             |
| `PUT /stats/money-leaks/:id`    | `params: { id: /^[0-9a-f]{16}$/ }`, `body: { status: 'keep' \| 'cancel' \| 'dismissed' \| 'not_mine' }` (`.strict()`) | El hallazgo actualizado. 404 `LEAK_NOT_FOUND` si el `id` no está entre los hallazgos **visibles** para ese usuario en ese momento (no se guardan ids arbitrarios; un usuario gratis no decide sobre ocultos) |
| `DELETE /stats/money-leaks/:id` | `params` igual                                                                                                        | 204 (deshacer: vuelve a `new`)                                                                                                                                                                               |
| `GET /goals` (existente)        | —                                                                                                                     | Cada `progress` gana `averageMonthly: number \| null` y `historyMonths: number`                                                                                                                              |

`GET /stats/subscriptions` **no cambia** (lo usan versiones antiguas de Android ya instaladas).

Esquemas en `backend/src/infrastructure/http/schemas.ts`:

```ts
export const leakParams = z.object({ id: z.string().regex(/^[0-9a-f]{16}$/) });
export const leakDecisionBody = z
  .object({ status: z.enum(['keep', 'cancel', 'dismissed', 'not_mine']) })
  .strict();
```

Respuesta (euros con decimales en la frontera, como el resto de presentadores):

```ts
interface MoneyLeaksView {
  coverage: {
    level: 'none' | 'partial' | 'complete';
    from: string | null;
    to: string | null;
    days: number;
    movements: number;
    yearlyReady: boolean;
  };
  total: { annual: number; oneOff: number; count: number }; // solo `new`, alta+media
  byKind: Record<
    'recurring' | 'increase' | 'duplicate' | 'small',
    { count: number; annual: number }
  >;
  findings: LeakFinding[]; // recortado en el plan gratis
  count: number; // total de hallazgos `new`
  locked: boolean;
  reviewed: { count: number; cancelMonthly: number; recoveredAnnual: number };
}
interface LeakFinding {
  id: string;
  kind: 'recurring' | 'increase' | 'duplicate' | 'small';
  confidence: 'high' | 'medium';
  status: 'new' | 'keep' | 'cancel' | 'dismissed' | 'not_mine' | 'recovered' | 'refunded';
  label: string; // concepto del último cobro
  essential: boolean;
  cadence: 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly' | null;
  amount: number; // último cobro / importe repetido / media del pequeño gasto
  previousAmount: number | null; // subidas
  annual: number; // 0 en cobros dobles
  oneOff: number; // solo cobros dobles
  count: number;
  firstDate: string;
  lastDate: string;
  nextDate: string | null;
  perMonth: number | null; // pequeños gastos
  evidence: { date: string; amount: number }[]; // máx. 24, del más reciente al más antiguo
}
```

### G.3 Dónde va cada cosa

| Capa                              | Archivo nuevo o cambiado                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dominio (puro, `today` inyectado) | `backend/src/domain/services/money-leaks.ts`: `merchantKey`, `detectRecurring`, `detectIncreases`, `detectDuplicates`, `detectSmallSpending`, `coverageOf`, `summarize`. Reutiliza `normalizeText` y `cleanPattern`                                                                                                                                                              |
| Dominio metas                     | `computeGoalPace(savingsByPeriod, today)` junto a `computeGoalProgress` en `Goal.ts`                                                                                                                                                                                                                                                                                             |
| Puerto y repositorio              | `LeakDecisionRepository` en `domain/ports/repositories.ts`; `SqliteLeakDecisionRepository.ts`. En `SqliteTransactionRepository`: `listSince(userId, fromDate)` (usa el índice `idx_transactions_user_date`) y `savingByCategoryAndPeriod(userId, categoryIds, from, to)`                                                                                                         |
| Aplicación                        | `StatsService.moneyLeaks(userId)` y `decideLeak(userId, id, status)` en `InsightsServices.ts`; `GoalService.views` añade el ritmo                                                                                                                                                                                                                                                |
| HTTP                              | Rutas en `user.routes.ts` junto a `/stats/subscriptions`; `presentMoneyLeaks` en `presenters.ts`; esquemas en `schemas.ts`                                                                                                                                                                                                                                                       |
| Frontend                          | `insightsApi.moneyLeaks()`, `decideLeak()`, `undoLeak()` en `frontend/src/core/api/financeApi.ts`; tipos en `modules/finances/domain/types.ts`; `domain/goalDate.ts` (envuelve `monthsToGoal`); `ui/views/MoneyLeaksView.tsx`, `ui/components/LeakCard.tsx`, `ui/components/GoalDateSheet.tsx`, `ui/css/MoneyLeaks.css`; `domain/goalShareImage.ts` (fase 2, sobre `recapImage`) |

### G.4 Cálculo e IA

- **Servidor y determinista**, sin IA. Motivo: la cifra tiene que ser explicable («estos 15
  cobros») y reproducible en tests; además no hace falta enviar conceptos bancarios a nadie.
- La IA queda **fuera del MVP**. Si algún día se usa para poner nombre bonito a un comercio, sería
  solo con la opción que ya existe y viene desactivada («Sugerir categorías con IA»), con la misma
  política (`app.privacy.*`) y nunca enviando importes ni fechas. El análisis «Analizar mes»
  (`AdviceService`) podría recibir **solo** el total agregado («870 € al año en cobros a revisar»),
  sin conceptos, en fase 3.

### G.5 Rendimiento y límites (sin caché en el MVP)

- `better-sqlite3` es síncrono: el cálculo bloquea el hilo. Ventana de 25 meses y tope de las
  **20.000** filas más recientes. Agrupar es O(n) y ordenar cada grupo O(k log k): con 5.000
  filas, del orden de 10-20 ms; el tope deja el peor caso por debajo de unos 100 ms (medir en la
  fase 1 con un test de rendimiento sobre datos sintéticos).
- Caché en memoria (LRU de 500 usuarios, 10 minutos) con clave `(dataUserId, número de
movimientos, último created_at, última decisión)`; se invalida sola al importar o decidir.
- Límite de peticiones: el general de la API para `GET`; `PUT`/`DELETE` a 60 por minuto y usuario.
- Nunca se registran en los logs conceptos ni importes (la política lo promete).

---

## H. Analítica y medición (implementado sin goal_share)

Eventos nuevos en la **lista cerrada** (`TRACK_EVENTS` y `CLIENT_FUNNEL_EVENTS` para los del
navegador, `SERVER_FUNNEL_EVENTS` para los del servidor), contadores diarios anónimos en
`funnel_daily`. El campo `detail` solo admite valores de una lista cerrada por evento (se añade un
`detail` opcional con `z.enum` a `funnelBody`, en vez de reutilizar el campo `guide`). Ni importes,
ni comercios, ni ids.

| Evento                     | Dónde     | Cuándo                                                     | `detail`                               |
| -------------------------- | --------- | ---------------------------------------------------------- | -------------------------------------- |
| `dp_view`                  | navegador | se abre la sección                                         | `none` / `partial` / `complete`        |
| `dp_found`                 | servidor  | `GET` con ≥ 1 hallazgo `new`                               | `1-2` / `3-5` / `6+`                   |
| `dp_confirm`               | servidor  | decisión «Lo sigo usando» o «Quiero darlo de baja»         | `keep:<kind>` / `cancel:<kind>`        |
| `dp_ignore`                | servidor  | «No es…» o «No reconozco»                                  | `dismissed:<kind>` / `not_mine:<kind>` |
| `dp_recovered`             | servidor  | una baja se verifica (pasa a `recovered`)                  | `<kind>`                               |
| `dp_import_cta`            | navegador | clic en «Importar mi extracto» desde la sección            | `none` / `partial`                     |
| `paywall_view` (existente) | navegador | aviso Premium desde la sección                             | `dp`                                   |
| `goal_date_view`           | navegador | se ve la fecha en una meta (una vez por carga de pantalla) | `real` / `asked` / `done`              |
| `goal_sim_change`          | navegador | primer cambio del deslizador en esa apertura               | `chip` / `slider` / `input`            |
| `goal_dp_apply`            | navegador | pulsa «Usar lo que vas a dar de baja»                      | —                                      |
| `goal_share`               | navegador | comparte la tarjeta                                        | `amounts` / `plain`                    |

Se respetan GPC/DNT y el filtro de bots como hoy. Se documentan en `docs/analitica.md`.

**Métricas de éxito** (revisar a las 4 semanas del lanzamiento):

| Pregunta                | Métrica                                                                 | Umbral para «funciona» | Si no se cumple                                                              |
| ----------------------- | ----------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| ¿Hay datos suficientes? | `dp_view[complete]` / `dp_view`                                         | ≥ 50 %                 | Empujar la importación (consejo de 12 meses, aviso tras registrarse)         |
| ¿Encuentra cosas?       | `dp_found` / `dp_view[complete]`                                        | ≥ 60 %                 | Revisar umbrales a la baja                                                   |
| ¿La gente actúa?        | (`dp_confirm` + `dp_ignore`) / `dp_found`                               | ≥ 30 %                 | Simplificar las tarjetas                                                     |
| ¿Acierta?               | `dp_ignore[dismissed]` / (`dp_confirm` + `dp_ignore`) por tipo          | ≤ 25 %                 | Subir umbrales de ese tipo; si un tipo pasa del 40 % tras ajustar, se oculta |
| ¿Ahorra de verdad?      | `dp_recovered` / `dp_confirm[cancel]` a 60 días                         | ≥ 40 %                 | Mejor ayuda para darse de baja                                               |
| ¿Ayuda a vender?        | `paywall_view[dp]` y `checkout_start` frente a las 4 semanas anteriores | `checkout_start` +10 % | Revisar el corte gratis                                                      |
| ¿Se usa la fecha?       | `goal_sim_change` / `goal_date_view`                                    | ≥ 30 %                 | Poner el simulador más visible                                               |
| ¿Se comparte?           | `goal_share` / `goal_date_view`                                         | ≥ 3 %                  | Mejorar la imagen                                                            |

**Limitación:** con contadores anónimos no se puede medir la retención de quien usó la función
frente a quien no (no hay id ni cohortes). Ver K, pregunta 4.

---

## I. Privacidad y legal

### I.1 Base de tratamiento

Ejecución del contrato (art. 6.1.b RGPD): analizar los movimientos que el usuario ha subido para
darle una función del servicio que usa. No hay decisiones automatizadas con efectos jurídicos
(art. 22 no aplica): la app solo muestra y el usuario decide. La analítica es la anónima ya
descrita en `docs/analitica.md`.

### I.2 Qué sale del servidor

Nada. El cálculo es local en el servidor (Hetzner, UE), sin IA y sin terceros. La imagen
compartible se genera en el dispositivo y, por defecto, sin importes ni nombre.

### I.3 Conservación, exportación y borrado (implementado; «Borrar mis decisiones»: fase 2)

- Los hallazgos no se guardan; las decisiones viven en `money_leak_decisions` mientras exista la
  cuenta. Al eliminar la cuenta se borran en el momento (`ON DELETE CASCADE`); las copias de
  seguridad desaparecen a los 14 días (ya en la política).
- Exportación: nueva sección `moneyLeakDecisions` en `SqlitePersonalDataReader.sectionsFor`
  (huella, tipo, estado, fechas, importe anual al decidir). Es un añadido al formato v3; como nada
  vuelve a leer esos archivos, no hace falta subir la versión (lo dice el propio `ExportService`).
- Botón «Borrar mis decisiones» en «Revisados» (fase 2; con el borrado de cuenta ya se cumple).

### I.4 Textos (avisos implementados; política: propuesta en docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md)

- Aviso fijo en la pantalla: `app.leaks.disclaimer` (E.3).
- Aviso de la fecha de meta: `app.goals.date.disclaimer`, y `tools.goal.disclaimer` cuando se usa
  rentabilidad.
- Política (`app.privacy.s3.item1`): añadir «la revisión de tus movimientos para detectar cobros
  repetidos, subidas de precio y posibles cobros dobles, y las decisiones que tomas sobre ellos».
  En `app.privacy.s5`: «las decisiones sobre esos avisos, mientras tengas la cuenta».
  Esto debe pasar por la misma revisión de abogado pendiente según
  `docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md`.

### I.5 Riesgos

| Riesgo                                                                                  | Mitigación                                                                                                                      |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Falsos positivos (alquiler por Bizum, préstamo, recibo de la luz como «dinero perdido») | Esenciales y transferencias fuera del total; solo confianza alta/media; «No es una suscripción»; medir el descarte por tipo (H) |
| Percepción de asesoramiento o de promesa                                                | Condicional y «aprox.»; preguntas en vez de órdenes; sin productos ni enlaces a ofertas en esta pantalla; aviso fijo            |
| «Dinero perdido» suena a juicio                                                         | El nombre es de la sección; dentro, «conviene revisar». Ver K, pregunta 1                                                       |
| Cobro no reconocido (posible fraude)                                                    | La app no actúa: indica llamar al banco. No pide datos de tarjeta                                                               |
| Cifra que baja al decidir y desanima                                                    | Se muestra a la vez «Vas a dejar de pagar…» y «Ya no se cobra…», que suben                                                      |
| Rendimiento con historiales grandes                                                     | Ventana, tope de filas y caché (G.5)                                                                                            |
| Versiones antiguas de la app                                                            | `/stats/subscriptions` intacto; migración aditiva                                                                               |
| Hogar compartido: un miembro decide por otro                                            | Igual que el resto de datos compartidos; se documenta                                                                           |

---

## J. Plan de entrega

### J.1 MVP (2 semanas, unos 9,5 días de trabajo) (implementado)

Objetivo: validar con usuarios reales si la cifra engancha y si acierta.

| Bloque                           | Contenido                                                                                                                                                              | Días |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Dominio                          | `money-leaks.ts`: `merchantKey`, cobros repetidos (5 ritmos), subidas, cobros dobles con devolución, pequeños gastos por comercio, confianza, cobertura, total         | 2,5  |
| Persistencia y API               | Migración 041, repositorio, `listSince`, `StatsService.moneyLeaks/decideLeak`, rutas, zod, presentador, corte gratis, exportación RGPD                                 | 1,5  |
| Frontend dinero perdido          | Sección `leaks`, tarjeta, decisiones con deshacer, revisados, estados (vacío/parcial/carga/error/gratis), a11y, textos es/en, aviso en Resumen mensual y tras importar | 2,5  |
| Fecha de meta                    | `computeGoalPace` + campo en `GET /goals`; `goalDate.ts`; línea de fecha en `GoalCard`; hoja «¿y si…?» con deslizador y chips; enlace «Usar lo que vas a dar de baja»  | 1,5  |
| Analítica, tour y textos legales | Eventos `dp_*` y `goal_*`, `docs/analitica.md`, 2 pasos del tour, `app.privacy.*`                                                                                      | 0,5  |
| QA                               | e2e (importar CSV de ejemplo → ver cifra → decidir), revisión en 390 px y escritorio, claro/oscuro, lector de pantalla, build de producción                            | 1    |

Fuera del MVP: avisos Premium, tarjeta compartible, «Apuntar como operación automática» desde
la meta, gastos pequeños por categoría, apuntes repetidos en la app.

### J.2 Fase 2 (unos 5 días)

Avisos Premium de subidas y cobros dobles nuevos (push con `ReminderService` y línea en el correo
del lunes), tarjeta compartible de la meta, «Apuntar X €/mes como operación automática»,
pequeños gastos por categoría, aviso de apunte repetido en la app, «Borrar mis decisiones»,
exportar todo para Premium, sustituir la tarjeta antigua de Análisis.

### J.3 Fase 3 (a decidir con datos)

Reto en Salud financiera («un mes sin cobros por revisar»), total agregado como dato para
«Analizar mes», alias de comercio editables («agrupar estos cobros»), retirar
`/stats/subscriptions` cuando ninguna versión activa lo use.

### J.4 Tests necesarios

- **Dominio** (`backend/src/tests/domain/money-leaks.test.ts`): límites de cada ritmo (23/24 y
  37/38 días en mensual, 5 cobros semanales, febrero, cargos movidos por fin de semana); un hueco
  doble tolerado con ≥ 5 cobros y no con 4; mediana frente a subida; dos planes en el mismo
  comercio; subida 2,9 % (no) / 3 % (sí) y 0,49 € (no) / 0,50 € (sí); subida que vuelve atrás;
  cobro doble a 0, 2 y 3 días, < 10 €, comercio frecuente, devolución a 45 y 46 días; hormiga con
  11/12 gastos, 119/120 €, esenciales excluidos; cobertura `none`/`partial`/`complete`; huella
  estable al añadir movimientos nuevos; redondeo del total a la decena hacia abajo; ejemplo
  completo de C.8 como test de aceptación; datos aleatorios sin patrón → sin hallazgos.
- **Metas** (`model.test.ts` / test nuevo): ritmo con meses a 0, < 2 meses → `null`, periodos con
  `monthStartDay` ≠ 1.
- **Integración** (`backend/src/tests/integration/money-leaks.test.ts`): autenticación; aislamiento
  (otro usuario no puede decidir sobre un `id` ajeno → 404); `id` mal formado → 400; `id` oculto en
  el plan gratis → 404; recorte gratis con cobros dobles siempre visibles; deshacer; `recovered`
  con reloj falso; hogar compartido; exportación con `moneyLeakDecisions`; borrado de cuenta
  borra las decisiones (`account-deletion.test.ts`); tabla nueva en `migrations.test.ts`; eventos
  en `funnel.test.ts`; `/stats/subscriptions` sin cambios.
- **Contrato:** fixtures nuevos (`UPDATE_CONTRACT=1 npx jest contract`) y `requests.json` con los
  cuerpos de `PUT`.
- **Frontend (100 %):** `goalDate.ts` (todos los casos de D.3), `MoneyLeaksView`/`LeakCard` (cada
  estado, cada decisión, deshacer, error de red, gratis/Premium, sin conexión), `GoalDateSheet`
  (chips, deslizador, −10/+10, campo, `aria-valuetext`, anuncio `aria-live`), pasos del tour,
  navegación. Consultas por rol y nombre accesible en Testing Library.
- **e2e** (`frontend/e2e/`): importar un CSV de ejemplo de `docs/ejemplos-importacion/` con
  cobros repetidos inventados y comprobar la cifra.
- Umbrales: frontend 100 %; backend los de `backend/jest.config.js` (97/89/98/98).

---

## K. Preguntas para el dueño

1. **Nombre visible.** ¿«Tu dinero perdido» como nombre de la sección?
   _Recomiendo:_ sí en el menú y en el título (es el gancho), pero dentro siempre «conviene
   revisar», y nunca «olvidada».
2. **Corte gratis.** ¿3 hallazgos (como hoy con las suscripciones) o solo el primero?
   _Recomiendo:_ 3, más los cobros dobles siempre visibles. Bajar a 1 quitaría algo a los usuarios
   gratis actuales y parecería esconder dinero tras un pago.
3. **Tarjeta antigua «Suscripciones detectadas».** ¿Se quita de Análisis?
   _Recomiendo:_ en el MVP, cambiarla por una línea que lleve a la sección nueva; mantener el
   endpoint para las versiones antiguas de Android durante al menos dos versiones.
4. **Medir la retención.** Con la analítica anónima no se sabe si quien usa la función vuelve más.
   ¿Aceptas un recuento agregado desde la base de datos (p. ej. «usuarios con alguna decisión que
   abrieron la app en los últimos 30 días»), solo números y sin salir del servidor?
   _Recomiendo:_ empezar solo con los contadores de H; si hace falta la retención, añadirla
   después con su línea en la política.
5. **Base de la fecha de la meta.** ¿Ritmo real de la categoría de la meta o «lo que te sobra cada
   mes» (ingresos − gastos)?
   _Recomiendo:_ la categoría de la meta (es lo que de verdad aparta), y si no hay datos, preguntar.
   «Lo que te sobra» como sugerencia en la fase 2.
6. **Avisos Premium de subidas nuevas.** ¿Push y correo del lunes, o solo dentro de la app?
   _Recomiendo:_ push y correo, solo para quien ya los tiene activados y con un máximo de un aviso
   por semana.
