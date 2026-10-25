# Diseño: «Reto de ahorro con amigos»

Estado: **solo diseño**, 25/10/2026. Nada de esto está implementado. Formato tomado de
[`dinero-perdido-y-fecha-meta.md`](./dinero-perdido-y-fecha-meta.md).

Todos los alias, porcentajes y fechas de ejemplo son **inventados**.

---

## A. Valor y resumen

**Qué es.** Un grupo pequeño (2 a 6 personas) acuerda ahorrar un porcentaje de sus ingresos durante
un mes natural. Cada persona ve **solo** su propio avance, el **% de avance** de los demás (con su
alias) y la **posición** de cada uno. Nadie ve importes, movimientos ni categorías ajenas. No hay
dinero en juego: se compite por una insignia y por una racha.

**Por qué es un gancho.**

- **Crecimiento:** cada reto es una invitación natural. Se reutiliza el programa «Invita a un
  amigo» (recompensa real y ya implementada: 30 días de Premium al invitado que completa los
  primeros pasos; meses a quien invita según los amigos que lo consiguen).
- **Retención:** un reto de un mes obliga a abrir la app cada semana y a mantener los movimientos
  al día; se pierde menos gente en el segundo mes.
- **Datos honestos:** el ahorro sale de movimientos reales (tipo `SAVING`), no de un contador que se
  pueda pulsar.

**Lo que NO es.** No es una apuesta, no hay bote ni premios en dinero o en Premium (ver C.8 y H),
no es un ranking público y no compara a personas con desconocidos. Tampoco da consejos de ahorro.

**Dependencia de masa crítica.** Bajo si se juega con amigos que se invitan (no hace falta que
haya miles de usuarios): con **2 personas ya funciona**. Es el gancho que mejor encaja con una base
pequeña (~40 usuarios verificados hoy), porque el grupo trae a sus propios participantes.

**Hallazgos clave de la investigación.**

1. Los **retos del mes** de Salud financiera (`noSpend`, `save20`, `budgets` en
   `frontend/src/modules/finances/domain/health.ts` y `HealthView.tsx`) **solo viven en el
   navegador** (`localStorage`: `mm_challenge`, `mm_challenge_done`). Para que un grupo compita hace
   falta calcular el avance **en el servidor**; hay que portar esa lógica (compartida con el
   documento del Resumen del año).
2. El **alias y el ranking** de la consola crypto están en `crypto-season.ts` y
   `CryptoRankingService.ts`, pero el alias por defecto es el **nombre de pila** (pendiente de
   revisión legal en `docs/consola-crypto.md`, «BASES DEL RANKING»). Aquí **no se hereda ese
   defecto**: el alias de un reto es siempre elegido y distinto del nombre.
3. En un **hogar compartido**, quien es miembro escribe sus movimientos bajo el titular
   (`dataUserId`): **no tiene ahorro propio**. Un miembro no puede competir por separado sin
   enseñar los datos del titular (ver C.7).
4. Las invitaciones de hogar son de **una sola persona** (`HOUSEHOLD_MAX_MEMBERS = 1`); no sirven
   para un grupo.

---

## B. Lo reutilizable del código (rutas reales)

| Pieza                                                 | Ruta                                                                                                                                                                                                         | Qué aporta                                                                                                                                                                                                                                | Cómo se usa                                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Programa «Invita a un amigo»                          | `backend/src/application/referrals/ReferralService.ts` (`codeFor`, `attach`, `reward`, `summary`), `migrations/009-referrals.ts`, `011-referral-tiers.ts`, `GET /referral` en `user.routes.ts`               | Código de 8 caracteres sin 0/O/1/I, recompensa de 30 días (`REFERRAL_REWARD_DAYS`) al invitado que completa los primeros pasos (3 movimientos, 1 presupuesto, 1 meta, 1 automatización: `FIRST_STEPS_GOALS`), tope `MAX_INVITED_PER_USER` | Quien invita a un reto reparte **su mismo enlace** `?ref=CODIGO`; no se crea otro programa ni otra recompensa       |
| Enlace y captura del código                           | `frontend/src/core/referral.ts` (`inviteLink`, `captureReferral`, `pendingReferral`), `InvitePanel.tsx` (`useInviteLink`: copiar y compartir)                                                                | Copiar/compartir con respaldo                                                                                                                                                                                                             | Mismo hook para «Invitar al reto»                                                                                   |
| Invitación al hogar (patrón de código de un solo uso) | `HouseholdService.ts` (hash SHA-256, `INVITE_TTL_MS` 7 días), `household.routes.ts`, `frontend/src/core/householdInvite.ts`                                                                                  | Código de invitación con caducidad que solo se muestra al crearlo                                                                                                                                                                         | Mismo patrón para el código del reto (se guarda su hash)                                                            |
| Alias y reglas de alias                               | `backend/src/domain/services/crypto-season.ts` (`ALIAS_MIN = 3`, `ALIAS_MAX = 20`, `cleanAlias`, `aliasProblem`, `playerAlias`)                                                                              | Valida 3-20 caracteres, sin correos, enlaces, teléfonos ni palabras ofensivas                                                                                                                                                             | Se **extrae** a `backend/src/domain/services/alias.ts` (sin cambiar el comportamiento de la consola) y se reutiliza |
| Ranking                                               | `rank`, `compareEntries`, `qualifies` (mismo archivo); `CryptoRankingService` (tabla en vivo con caché 60 s, top 5 congelado el día 1, solo el propio usuario ve su posición y lo que le falta)              | Orden estable con desempates                                                                                                                                                                                                              | Mismo patrón; clave interna estable solo para el último desempate                                                   |
| Trabajo periódico                                     | `setInterval` horario en `backend/src/main.ts` (`cryptoSeasons`, `reminders`)                                                                                                                                | Cierre idempotente el día 1                                                                                                                                                                                                               | `ChallengeService.run()` horario: abre, avisa y cierra retos                                                        |
| Retos del mes de Salud financiera                     | `challengeProgress`, `noSpendDays`, `NO_SPEND_TARGET = 8` en `health.ts`; textos `app.challenge.*`                                                                                                           | Tres retos con su progreso                                                                                                                                                                                                                | Se portan al backend (`domain/services/challenges.ts`); fase 2 los ofrece como tipos de reto                        |
| Resumen de ahorro                                     | `summarize` en `domain/services/summary.ts`; `savedByCategory` y `savingByCategoryAndPeriod` en `SqliteTransactionRepository.ts` (suman solo `type = 'SAVING'`); `transactions.created_at`                   | El ahorro real del periodo y cuándo se apuntó                                                                                                                                                                                             | Base del avance y de la regla de fechas (C.5)                                                                       |
| Hogar                                                 | `HouseholdService.dataOwner`, `middleware.ts` (`dataUserId`)                                                                                                                                                 | Quién es el dueño de los datos                                                                                                                                                                                                            | Regla de hogar (C.7)                                                                                                |
| Insignias                                             | tabla `crypto_sim_badges` y `BADGES` (consola)                                                                                                                                                               | Patrón de insignia que se conserva entre temporadas                                                                                                                                                                                       | Tabla propia `challenge_badges` (no se mezcla con la consola)                                                       |
| Plan Gratis/Premium                                   | `PLAN_LIMITS`, `EntitlementService`, `PremiumOnly.tsx`, `plans.ts`                                                                                                                                           | Límites por plan                                                                                                                                                                                                                          | Ver E                                                                                                               |
| Notificaciones                                        | `PushService`, `ReminderService` (ventana de mañana UTC 07-11), consentimiento de push ya pedido; `WeeklyDigestService`                                                                                      | Push de servicio con la misma ventana y consentimiento                                                                                                                                                                                    | Avisos del reto (C.9)                                                                                               |
| Analítica                                             | `TRACK_EVENTS` (`frontend/src/core/analytics.ts`), `CLIENT_FUNNEL_EVENTS`/`SERVER_FUNNEL_EVENTS`/`CLIENT_FUNNEL_DETAILS` (`backend/src/domain/ports/services.ts`), `funnel_daily` (034), `docs/analitica.md` | Contadores anónimos, listas cerradas                                                                                                                                                                                                      | Eventos `ch_*` (G)                                                                                                  |
| Exportación y borrado                                 | `ExportService` (`finanverso-export` v3), `SqlitePersonalDataReader.sectionsFor`, `ON DELETE CASCADE`                                                                                                        | Art. 20 y supresión                                                                                                                                                                                                                       | Secciones nuevas (H)                                                                                                |
| Pantalla de la consola con tarjeta de invitar         | `InvitePanel.tsx` y `docs/consola-crypto.md`, «Invitar desde la consola»                                                                                                                                     | Estilo arcoíris, aviso puntual no bloqueante (1 cada 7 días)                                                                                                                                                                              | Tono y límites de frecuencia                                                                                        |

Lo que **no existe** y hay que crear: tablas de retos (migración 042), `ChallengeService`,
`domain/services/challenges.ts` (cálculo puro), rutas, `ChallengesView.tsx` y textos.

---

## C. Diseño funcional

### C.1 Qué se mide: «% de avance»

**Un solo reto en el MVP: «Apartar el X % de lo que ingresas».** Todos los del grupo comparten el
mismo X (lo elige quien crea el reto: 5, 10, 15 o 20 %; por defecto 10 %). Así personas con
sueldos muy distintos compiten en igualdad: lo que cuenta es el **porcentaje de sus propios
ingresos**.

- **Ingresos de referencia (`refIncome`)**: media de los ingresos (`INCOME`) de los **3 últimos
  meses cerrados** del usuario que tengan movimientos. Se fija al unirse y **no cambia** durante el
  reto. Si no hay al menos 2 meses cerrados con ingresos, la persona no puede unirse todavía
  («Necesitas al menos 2 meses de movimientos para jugar»; botón «Importar mi extracto»).
- **Ahorro del reto (`saved`)**: suma de movimientos de tipo `SAVING` con fecha dentro del mes del
  reto (fecha de Madrid), sin contar los que, a la vez, cumplen alguna de las exclusiones de C.5.
- **Tope por reto**: `saved` cuenta como máximo el **40 % de `refIncome`** y el avance como
  máximo el **150 %**. Con X = 10 %, nadie pasa del 150 % aunque aparte más. Evita que una paga
  extra o un ingreso anotado a mano decida el reto.
- **Avance** = `min(saved, 40 % de refIncome) / (X % de refIncome)`, en porcentaje, con un tope de 150. Se enseña a los demás **redondeado a múltiplos de 5** («75 %») para no exponer
  la cifra exacta de nadie.
- **Posición** = orden por avance (sin redondear), después por quién llegó antes a su avance
  actual (fecha del último ahorro contado), y por último una clave interna estable (nunca visible).
  **Empates:** quienes tienen el mismo avance redondeado y llegaron a 100 % comparten medalla
  («Empate en 1.º»). Los tres reciben insignia.
- **Quién puntúa:** al menos **6 movimientos** y **4 días distintos** con movimientos en el mes
  (mismos mínimos que se aplican en la consola, `RANKING_MIN_*`). Si no, sale «Sin puntuar» y no
  ocupa posición (se explica por qué, para no frustrar).

Ejemplo: Ana (alias «Brisa») cobra de media 1.800 €, el reto es del 10 %: su objetivo es 180 €.
Aparta 90 € -> 50 % de avance. Luis («Cometa») cobra 3.200 €, su objetivo es 320 €; aparta 224 € -> 70 %. Cometa va 1.º, Brisa 2.ª.
Ninguno ve los 90 ni los 224 del otro.

### C.2 Duración y calendario

- **Mes natural (Madrid)**, de las 00:00 del día 1 a las 23:59:59 del último día. Es lo que
  permite repetir la mecánica de «retos del mes» de Salud financiera y evita tasas ruidosas de
  periodos cortos (una nómina que cae el día 25 estropea una semana).
- **Crear** un reto: el que se crea del 8 al fin de mes empieza el día 1 del mes siguiente. El que
  se crea del 1 al 7 puede empezar ese mismo mes (cuenta desde el día 1: los movimientos ya
  apuntados son reales).
- **Unirse:** hasta el día 7 del mes del reto. Después, «El reto ya ha empezado: te unes al
  siguiente». Mínimo **2 personas con consentimiento** el día 8; si no, el reto se anula con aviso
  («No ha empezado: hacían falta 2 personas») y se puede reutilizar para el mes siguiente.
- **Cierre:** el día 4 del mes siguiente (3 días de margen para apuntar lo que faltaba). Se
  congela y ya no cambia aunque se editen movimientos antiguos.
- Quien crea el reto también puede elegir **«Empezar el mes que viene»** aunque sea día 3.
- **Fase 2:** retos de 2 semanas y retos de otros tipos (`noSpend`, `budgets`).

### C.3 Tamaño del grupo

**2 a 6 personas** (MVP). Razones: con 2 ya hay juego («tú contra tu amigo»); con más de 6 la tabla
deja de leerse bien en el móvil y baja la sensación de grupo. Recomendado en la interfaz: 3 a 5.
Límite por usuario: **3 retos activos a la vez** (para no acumular notificaciones).

### C.4 Invitaciones, reutilizando «Invita a un amigo»

1. Quien crea el reto pulsa «Invitar al reto» y obtiene un **enlace de reto**:
   `https://finanverso.app/reto/CODIGO8?ref=CODIGOREFERIDO`, donde `CODIGO8` es un código aleatorio
   de un solo reto (misma lista de letras que `ReferralService`, caduca a los 14 días, se guarda
   solo su hash como en `HouseholdService`) y `ref` es **el código del programa «Invita a un amigo»
   de quien invita** (`ReferralService.codeFor`).
2. **Persona nueva:** el enlace lleva a `/registro` con el reto recordado. Al registrarse,
   `attach(referredId, ref)` guarda quién la invitó (como hoy). Tendrá que completar los
   **primeros pasos** de siempre para recibir sus 30 días de Premium y para que cuente la invitación
   (`reward`). Para jugar el reto necesita además 2 meses cerrados de datos (C.1), así que puede unirse
   al siguiente mes. La pantalla de bienvenida de la persona invitada lo dice con claridad: «Tu
   reto empieza cuando tengas 2 meses de movimientos» y le ofrece importar su extracto.
3. **Persona que ya tiene cuenta:** abre el enlace, entra, y ve la pantalla de consentimiento (H).
   `attach` ignora el código (ya existe la cuenta): lo normal, no cuenta como invitación.
4. **Recompensa:** la **ya existente** del programa. Ni el reto ni su resultado dan Premium
   adicional. En la pantalla del reto se muestra el contador existente («Tus invitaciones:
   completadas · en camino») leído de `GET /referral`.
5. **Mensaje para compartir** (Web Share): «Te reto a ahorrar un {x} % de tus ingresos este mes.
   Solo se ve el porcentaje de avance, ninguna cifra. Entra aquí: {enlace}».
6. **Antiabuso de invitaciones:** `MAX_INVITED_PER_USER` y los tramos de `REFERRAL_TIERS` siguen
   valiendo; el código del reto da como mucho 5 plazas libres y se invalida al llenarse.

### C.5 Reglas anti-trampa justas

Principio: **el ahorro sale de movimientos reales y el premio no vale dinero**, así que no hay
motivo económico para hacer trampa; las reglas buscan que el resultado sea justo, no policial.

| Regla                                                | Qué hace                                                                                                                                                                                                                                        | Por qué es justa                                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Solo movimientos `SAVING` con fecha del mes del reto | El ahorro sale de lo apuntado en la app (mismo criterio que `savedByCategory` y el reto `save20` de Salud)                                                                                                                                      | Un solo criterio, el que ya conoce el usuario                                                 |
| Fecha de alta razonable                              | Un movimiento solo cuenta si su `created_at` (alta en la app) es como mucho **7 días posterior** al fin del mes (el margen del cierre). Un movimiento con fecha dentro del mes pero dado de alta más tarde del cierre no cuenta                 | Evita rellenar el mes a posteriori; el margen permite apuntar a tarde y aceptar importaciones |
| Importes de importación                              | Los movimientos importados del extracto cuentan como cualquiera (tienen `created_at` del momento de importar; el margen aplica)                                                                                                                 | No se castiga a quien importa a fin de mes si lo hace antes del cierre                        |
| Transferencias entre cuentas propias                 | No cuentan como ahorro (modelo `Transfer`)                                                                                                                                                                                                      | Mover dinero de una cuenta a otra no es ahorrar                                               |
| Retiradas                                            | Si el usuario retira de una categoría de ahorro en el mes (lo que reste ahorro), se resta del ahorro del reto con el mismo cálculo que el progreso de las metas (`computeGoalProgress`; comprobar al implementar cómo se registra una retirada) | Ahorrar y retirar al día siguiente no suma                                                    |
| Tope por reto                                        | 40 % de `refIncome` y avance máximo 150 % (C.1)                                                                                                                                                                                                 | Un ingreso o un ahorro enorme puntual no decide el reto                                       |
| Ingresos de referencia fijos                         | Se calculan al unirse con los 3 últimos meses cerrados, antes de empezar                                                                                                                                                                        | No se puede inflar `refIncome` durante el reto                                                |
| Mínimo de actividad                                  | 6 movimientos y 4 días distintos (C.1)                                                                                                                                                                                                          | Quien no usa la app no gana por no gastar                                                     |
| Congelación                                          | El día 4 del mes siguiente el resultado queda fijo                                                                                                                                                                                              | Nadie cambia datos viejos para ganar con retraso                                              |
| Cuentas duplicadas                                   | No se detectan ni se persiguen. No hay premio con valor, así que no compensa; el límite de invitaciones del programa de referidos sigue protegiendo el Premium                                                                                  | Evitar vigilancia desproporcionada                                                            |
| Abuso evidente                                       | Quien crea el reto puede **expulsar** a un participante (con aviso a esa persona). Cualquier participante puede «Avisar de un problema» (llega a soporte). No hay sanción más allá de quedar fuera de ese reto                                  | Medida mínima, proporcionada y reversible                                                     |

### C.6 Reutilizar el alias y el ranking de la consola, sin mezclarlos

- **Alias por reto**, no global: tabla `challenge_members.alias`. Reglas de validación idénticas a
  las de la consola (`cleanAlias`, `aliasProblem`, `ALIAS_MIN`/`ALIAS_MAX`), extraídas a un módulo
  compartido (`domain/services/alias.ts`) sin cambiar la consola.
- **Valor inicial:** **nunca el nombre de pila ni el correo.** Se propone «Jugador» más 4 dígitos
  (`playerAlias(userId)`); si la persona ya eligió un alias propio en la consola
  (`crypto_sim_profiles.alias` no nulo), se ofrece una casilla **sin marcar** «Usar mi alias de la
  consola ("{alias}")».
- **Las insignias** del reto son propias y no se mezclan con las de la consola, para que quien
  no juega a crypto no vea nada de eso.
- El **ranking del reto es privado del grupo**: nada aparece en el ranking público de la consola ni al
  revés.
- **Retos del mes de Salud financiera:** el reto «Apartar X %» coincide con `save20` (mismo cálculo
  de ahorro). Al terminar un reto de grupo se marca «Reto del mes cumplido» en Salud financiera
  (fase 2, cuando el estado de los retos pase al servidor).

### C.7 Hogar y reto en equipo

- **Un miembro de hogar** (quien escribe bajo `dataUserId` del titular) **no puede unirse** con
  su propia cuenta, porque su avance sería el del titular y se exhibirían datos de otra persona. Ve
  «Para jugar, el titular del hogar tiene que apuntarse» y una explicación.
- **El titular** puede unirse y se muestra como **«Hogar de {alias}»** (el hogar compite
  como una sola persona). Aviso al titular al unirse: «Tus movimientos y los de tu hogar cuentan
  juntos».
- **Reto en equipo (fase 2):** el grupo suma hacia **un solo objetivo común** (todos cooperan) y no
  hay posiciones: solo «Habéis llegado al 80 % de la meta del grupo». Pensado para parejas, familias
  y personas a quienes no les guste competir. Es la versión para el público mayor (no hay
  presión).

### C.8 Premios simbólicos

- **Insignias** (en `challenge_badges`, se conservan entre retos): «Primer reto», «Reto cumplido»
  (>= 100 %), «Subida al podio» (1.º, 2.º, 3.º), «Racha de 3 retos cumplidos». Solo decorativas.
- **Premios con valor: ninguno.** Ni Premium, ni dinero, ni sorteos. Razones: (1) la
  recompensa del programa de invitaciones ya es real y suficiente, (2) un premio con valor para
  quien «gana» convierte el reto en un concurso con bases legales (como pasa con el ranking de la
  consola, que tiene un texto de bases pendiente de abogado) y (3) con premio, la trampa
  compensa.
- **Pantalla de resultado (día 4):** posiciones, avances finales, insignia conseguida y botón
  «Repetir el mes que viene» (crea el reto siguiente con los mismos participantes que lo acepten).
  Imagen compartible (reutiliza `recapImage`/`shareImage`): «He cumplido mi reto de ahorro» sin
  alias ajenos, sin importes y con la invitación.

### C.9 Notificaciones

Push de servicio (con el consentimiento ya existente), en la ventana de la mañana de
`ReminderService`. Nunca más de **un push por reto y semana**, salvo inicio y cierre. Se puede
**silenciar cada reto**.

| Cuándo                       | Para quién   | Texto es                                                  |
| ---------------------------- | ------------ | --------------------------------------------------------- |
| Alguien acepta tu invitación | quien invita | «{alias} se ha unido a tu reto»                           |
| El reto empieza (día 1)      | todos        | «Hoy empieza vuestro reto de ahorro»                      |
| Mitad de mes (día 15)        | quien puntúa | «Vas por el {n} % de tu objetivo. Llevas la posición {p}» |
| Últimos 3 días               | todos        | «Quedan 3 días para cerrar el reto»                       |
| Cierre (día 4 siguiente)     | todos        | «Ya están los resultados del reto»                        |

Sin textos de presión ni de pérdida. No se avisa de que alguien te ha adelantado.

### C.10 Estados del reto

`abierto` (creado, con invitaciones activas, antes de empezar) -> `en curso` (desde el día 1 del mes;
hasta el cierre se siguen contando los movimientos con fecha del mes) -> `cerrado` (día 4 del mes
siguiente, congelado). Estados finales alternativos: `anulado` (menos de 2 personas el día 8) y
`cancelado` (lo cancela quien lo creó antes de empezar). Un participante puede estar `invitado`, `activo`, `fuera` (se fue) o
`expulsado`.

---

## D. Pantallas, textos y accesibilidad

### D.1 Lista de retos (móvil 390 px)

```
+--------------------------------------+
| Retos con amigos                     |
| [ Crear un reto ]                    |
|                                      |
| Octubre: "Quien más aparta"          |
| 3 personas · quedan 6 días           |
| Tu avance: 70 %   Posición: 1.º      |
| [ Ver reto ]                         |
|                                      |
| Noviembre (por empezar)              |
| 2 personas · empieza el 1 de noviembre|
| [ Ver reto ] [ Invitar ]             |
+--------------------------------------+
```

### D.2 Detalle del reto

```
+--------------------------------------+
| <  Quien más aparta        Octubre   |
| Objetivo del grupo: apartar el 10 %  |
| de tus ingresos. Quedan 6 días.      |
|                                      |
| 1.º  Cometa (tú)       70 %  [=====.] |
| 2.º  Brisa             50 %  [===...] |
| 3.º  Jugador4821       35 %  [==....] |
|                                      |
| Solo se ve el porcentaje, no el dinero|
| [ Invitar a alguien ]  [ Más opciones ]|
| (Salir del reto, silenciar, ayuda)   |
+--------------------------------------+
```

- Cada fila es texto completo, no solo barra: «Primero: Cometa, tú, 70 por ciento».
- La barra es decorativa (`aria-hidden`), el texto lleva toda la información.

### D.3 Consentimiento al unirse (obligatorio, antes de nada)

```
+--------------------------------------+
| Unirte al reto "Quien más aparta"    |
| Lo que verán los demás:              |
|  - Tu alias: [ Jugador4821 ]         |
|  - Tu % de avance (de 5 en 5)        |
|  - Tu posición                       |
| Lo que NO verán nunca:               |
|  importes, movimientos, categorías,  |
|  tu nombre ni tu correo.             |
| Puedes salir cuando quieras y se      |
| borra tu fila del reto.              |
| [ ] Entiendo y quiero participar     |
| [ Unirme ]   [ Ahora no ]            |
+--------------------------------------+
```

La casilla **no está marcada** y «Unirme» no se activa sin ella. El texto del botón es una acción,
no «Aceptar».

### D.4 Textos exactos (es / en)

Claves bajo `app.challenges.*`. Se limpian con `finanverso-ig-human` antes de entrar en `es.json`
y `en.json`.

| Clave              | es                                                                                                                         | en                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `menu`             | Retos con amigos                                                                                                           | Challenges with friends                                                                                                      |
| `title`            | Retos con amigos                                                                                                           | Challenges with friends                                                                                                      |
| `intro`            | Ahorrad juntos un mes. Solo se ve el porcentaje de avance, nunca el dinero.                                                | Save together for a month. Only the progress percentage is shown, never the money.                                           |
| `create`           | Crear un reto                                                                                                              | Create a challenge                                                                                                           |
| `goalLabel`        | Apartar el {x} % de tus ingresos                                                                                           | Set aside {x}% of your income                                                                                                |
| `targetPick`       | ¿Qué porcentaje queréis apartar?                                                                                           | What percentage do you want to set aside?                                                                                    |
| `monthLabel`       | Mes del reto                                                                                                               | Challenge month                                                                                                              |
| `inviteTitle`      | Invitar al reto                                                                                                            | Invite to the challenge                                                                                                      |
| `inviteShare`      | Te reto a ahorrar un {x} % de tus ingresos este mes. Solo se ve el porcentaje de avance, ninguna cifra. Entra aquí: {link} | I challenge you to save {x}% of your income this month. Only the progress percentage is shown, no figures. Join here: {link} |
| `inviteReward`     | Si tu amigo es nuevo y completa los primeros pasos, tiene {days} días de Premium.                                          | If your friend is new and completes the first steps, they get {days} days of Premium.                                        |
| `consent.title`    | Unirte al reto «{name}»                                                                                                    | Join the challenge "{name}"                                                                                                  |
| `consent.see`      | Los demás verán tu alias, tu porcentaje de avance (de 5 en 5) y tu posición.                                               | The others will see your alias, your progress percentage (in steps of 5) and your position.                                  |
| `consent.never`    | Nunca verán importes, movimientos, categorías, tu nombre ni tu correo.                                                     | They will never see amounts, movements, categories, your name or your email.                                                 |
| `consent.leave`    | Puedes salir cuando quieras y tu fila desaparece del reto.                                                                 | You can leave whenever you want and your row disappears from the challenge.                                                  |
| `consent.check`    | Lo entiendo y quiero participar                                                                                            | I understand and I want to take part                                                                                         |
| `consent.join`     | Unirme al reto                                                                                                             | Join the challenge                                                                                                           |
| `consent.no`       | Ahora no                                                                                                                   | Not now                                                                                                                      |
| `alias.label`      | Tu alias en este reto                                                                                                      | Your alias in this challenge                                                                                                 |
| `alias.useConsole` | Usar mi alias de la consola ({alias})                                                                                      | Use my console alias ({alias})                                                                                               |
| `alias.hint`       | Entre 3 y 20 caracteres. Sin correos, enlaces ni teléfonos.                                                                | Between 3 and 20 characters. No emails, links or phone numbers.                                                              |
| `row`              | {place}.º {alias}: {percent} %                                                                                             | {place}: {alias}: {percent}%                                                                                                 |
| `rowMe`            | {place}.º {alias} (tú): {percent} %                                                                                        | {place}: {alias} (you): {percent}%                                                                                           |
| `tie`              | Empate en {place}.º                                                                                                        | Tie for {place}                                                                                                              |
| `unscored`         | Sin puntuar: te faltan {moves} movimientos o {days} días con actividad.                                                    | Not scored yet: you need {moves} more movements or {days} more days with activity.                                           |
| `daysLeft`         | Quedan {days} días                                                                                                         | {days} days left                                                                                                             |
| `startsOn`         | Empieza el {date}                                                                                                          | Starts on {date}                                                                                                             |
| `needData`         | Necesitas al menos 2 meses de movimientos para jugar.                                                                      | You need at least 2 months of movements to play.                                                                             |
| `importCta`        | Importar mi extracto                                                                                                       | Import my statement                                                                                                          |
| `householdMember`  | Para jugar, el titular del hogar tiene que apuntarse.                                                                      | To play, the household owner has to join.                                                                                    |
| `householdOwner`   | Tus movimientos y los de tu hogar cuentan juntos.                                                                          | Your movements and your household's count together.                                                                          |
| `leave`            | Salir del reto                                                                                                             | Leave the challenge                                                                                                          |
| `leaveConfirm`     | Si sales, tu fila desaparece del reto y no podrás volver a entrar este mes.                                                | If you leave, your row disappears from the challenge and you cannot rejoin this month.                                       |
| `mute`             | Silenciar este reto                                                                                                        | Mute this challenge                                                                                                          |
| `removeMember`     | Quitar del reto                                                                                                            | Remove from the challenge                                                                                                    |
| `report`           | Avisar de un problema                                                                                                      | Report a problem                                                                                                             |
| `cancelled`        | No ha empezado: hacían falta 2 personas.                                                                                   | It did not start: 2 people were needed.                                                                                      |
| `closed.title`     | Resultado del reto                                                                                                         | Challenge result                                                                                                             |
| `closed.badge`     | Has conseguido la insignia «{badge}»                                                                                       | You earned the badge "{badge}"                                                                                               |
| `repeat`           | Repetir el mes que viene                                                                                                   | Repeat next month                                                                                                            |
| `badge.first`      | Primer reto                                                                                                                | First challenge                                                                                                              |
| `badge.done`       | Reto cumplido                                                                                                              | Challenge completed                                                                                                          |
| `badge.podium`     | Subida al podio                                                                                                            | On the podium                                                                                                                |
| `badge.streak3`    | Racha de 3 retos                                                                                                           | 3-challenge streak                                                                                                           |
| `push.joined`      | {alias} se ha unido a tu reto                                                                                              | {alias} has joined your challenge                                                                                            |
| `push.start`       | Hoy empieza vuestro reto de ahorro                                                                                         | Your savings challenge starts today                                                                                          |
| `push.mid`         | Vas por el {percent} % de tu objetivo                                                                                      | You are at {percent}% of your goal                                                                                           |
| `push.last`        | Quedan 3 días para cerrar el reto                                                                                          | 3 days left to close the challenge                                                                                           |
| `push.end`         | Ya están los resultados del reto                                                                                           | The challenge results are in                                                                                                 |
| `noMoney`          | Es un juego: no hay dinero ni premios en juego.                                                                            | It is a game: no money or prizes are at stake.                                                                               |
| `disclaimer`       | Es orientativo y no es asesoramiento financiero.                                                                           | For guidance only, not financial advice.                                                                                     |
| `error`            | No hemos podido cargar el reto. Inténtalo de nuevo.                                                                        | We could not load the challenge. Please try again.                                                                           |

### D.5 Estados

| Estado                 | Qué ve                                                                         |
| ---------------------- | ------------------------------------------------------------------------------ |
| Sin retos              | Explicación en tres líneas, `noMoney`, «Crear un reto»                         |
| Carga                  | Esqueleto de 3 filas con `aria-busy="true"` y texto oculto «Cargando el reto…» |
| Esperando gente        | Tabla con quien ya está y «Faltan {n} personas para empezar»                   |
| En curso               | Tabla (D.2)                                                                    |
| Sin puntuar            | `unscored` en su fila                                                          |
| Cerrado                | Resultado y botón «Repetir»                                                    |
| Anulado                | `cancelled` y «Reutilizar para el mes que viene»                               |
| Sin conexión           | Último estado cargado con `OfflineBanner`; acciones desactivadas               |
| Error                  | `error` + «Reintentar»                                                         |
| Plan gratis con límite | Aviso de límite (E)                                                            |

### D.6 Accesibilidad para mayores

- Botones de **48 x 48 px** con texto, separados >= 8 px; como mucho dos acciones principales por
  pantalla («Invitar» y «Ver reto»); lo demás en «Más opciones».
- Texto base 16 px, el porcentaje propio a 2rem; todo en `rem`, sin cortes al 200 %.
- Contraste >= 4,5:1 y 7:1 en la cifra; la posición no se indica solo por color o medalla: número y
  palabra («Primero»).
- La tabla es una lista `<ol>` con texto completo en cada fila; el resultado se anuncia con
  `aria-live="polite"`; foco visible; orden de foco: título -> tabla -> invitar -> opciones.
- Fechas en palabras («1 de noviembre»). Sin jerga: «apartar», no «tasa de ahorro».
- **Modo sin competencia** (fase 2, reto en equipo): quien no quiera ver posiciones elige
  «Solo mi avance» y la tabla muestra únicamente su fila.
- Sin tiempos límite de respuesta ni confirmaciones que caduquen en segundos.

---

## E. Gratis frente a Premium

Principio: **jugar es gratis** (es el gancho de crecimiento y no se debe esconder tras un pago).
Premium da comodidad y variedad.

|                                                                | Gratis                            | Premium                                            |
| -------------------------------------------------------------- | --------------------------------- | -------------------------------------------------- |
| Participar en retos que crean otros                            | Sí, hasta 3 a la vez              | Sí, hasta 3 a la vez                               |
| Crear retos de «Apartar X %»                                   | **1 reto activo creado** a la vez | Hasta 3                                            |
| Invitar y compartir                                            | Sí                                | Sí                                                 |
| Tamaño del grupo                                               | Hasta 6                           | Hasta 6                                            |
| Insignias y resultado                                          | Sí                                | Sí                                                 |
| Reto en equipo (fase 2)                                        | Sí                                | Sí                                                 |
| Tipos de reto extra (`noSpend`, `budgets`, 2 semanas) (fase 2) | No                                | Sí                                                 |
| Historial de retos pasados                                     | Últimos 3 meses                   | Todo (12 meses)                                    |
| Avisos de mitad de mes y de cierre                             | Sí (push)                         | Sí (push), más resumen semanal por correo opcional |

Comprobación en servidor: `entitlements.limits(userId)` con un límite de recurso nuevo en
`PLAN_LIMITS` (`challengesOwned`: 1 en gratis, 3 en Premium) y la función existente `assertFeature`
solo para los tipos extra. **Un participante nunca pierde su sitio si caduca su Premium**: el
reto en curso se termina.

---

## F. Datos y API mínimos

### F.1 Migración 042 (aditiva)

```
challenges(id, owner_id -> users, kind='save_rate', target_pct, month 'YYYY-MM',
           status, created_at, started_at, closed_at, invite_hash, invite_expires_at)
challenge_members(challenge_id, user_id -> users ON DELETE CASCADE, alias,
                  status('invited','active','left','removed'), joined_at,
                  ref_income_cents, consent_at, consent_version, muted INTEGER,
                  PRIMARY KEY (challenge_id, user_id))
challenge_results(challenge_id, user_id, place, progress_pct, scored, frozen_at)  -- tras el cierre
challenge_badges(user_id, badge, challenge_id, earned_at)
```

- `ON DELETE CASCADE` desde `users` y desde `challenges` (el cierre y borrado de retos, ver H).
- **No se guardan importes** salvo `ref_income_cents` (un solo dato, necesario para recalcular de
  forma determinista; se borra al salir del reto y a los 12 meses).
- `consent_version` permite pedir un consentimiento nuevo si cambia el texto.

### F.2 Endpoints

| Método y ruta                            | Qué hace                                                                     | Notas                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `POST /challenges`                       | Crea un reto (`targetPct`, `month`)                                          | Valida límites del plan                                                                                                          |
| `GET /challenges`                        | Mis retos (propios y a los que pertenezco)                                   | Sin datos ajenos más que alias/avance/posición                                                                                   |
| `GET /challenges/:id`                    | Detalle: tabla (alias, `progressPct` de 5 en 5, `place`), lo mío exacto      | Solo participantes con `status='active'`                                                                                         |
| `POST /challenges/:id/invite`            | Genera el enlace (código de un uso, hash guardado)                           |                                                                                                                                  |
| `GET /challenges/join/:code`             | Previsualiza el reto antes de unirse (nombre, objetivo, mes, nº de personas) | Sin alias ajenos hasta consentir                                                                                                 |
| `POST /challenges/join/:code`            | Se une con `alias` y `consent: true`                                         | Calcula `ref_income_cents`; rechaza miembros de hogar (`409 HOUSEHOLD_MEMBER`) o con menos de 2 meses de datos (`409 NEED_DATA`) |
| `PATCH /challenges/:id/me`               | Cambia el alias o silencia                                                   | `aliasProblem`                                                                                                                   |
| `DELETE /challenges/:id/me`              | Sale del reto                                                                | Borra su fila de la tabla y deja el resultado anonimizado en `challenge_results` si ya estaba cerrado                            |
| `DELETE /challenges/:id/members/:userId` | Expulsa (solo quien creó)                                                    |                                                                                                                                  |
| `POST /challenges/:id/cancel`            | Cancela (solo quien creó, antes de empezar)                                  |                                                                                                                                  |

- Zod en `schemas.ts`, presentadores en `presenters.ts`, fixtures de contrato
  (`contract.test.ts` + `frontend/src/__tests__/contract/`).
- **Cálculo**: `domain/services/challenges.ts` (puro): `computeProgress(refIncome, targetPct,
savingItems, window, now)` con céntimos, fechas de Madrid (`madridMonth`, `madridDay`).
  Determinista: mismo historial y misma hora de corte, mismo resultado.
- **Trabajo horario** `ChallengeService.run()` desde `main.ts` (como `cryptoSeasons`): arranca
  los del día 1, anula los del día 8, congela y reparte insignias el día 4, y envía los push.
  Idempotente.
- **Rendimiento:** el avance de 6 personas = 6 consultas `SUM` por usuario y mes; con caché de 60 s por
  reto (como el ranking de la consola).

---

## G. Medición sin datos personales

Analítica propia y anónima ([`docs/analitica.md`](../analitica.md)); contadores diarios; sin
identificadores, sin importes, sin alias.

| Evento                               | Quién     | Cuándo                                | Detalle (lista cerrada)               |
| ------------------------------------ | --------- | ------------------------------------- | ------------------------------------- |
| `ch_view`                            | navegador | se abre la lista de retos             | `empty` o `has`                       |
| `ch_create`                          | servidor  | se crea un reto                       | `5`, `10`, `15`, `20` (objetivo)      |
| `ch_invite_copy` / `ch_invite_share` | navegador | enlace copiado / compartido de verdad | —                                     |
| `ch_join_view`                       | navegador | se abre la pantalla de consentimiento | `new` o `existing`                    |
| `ch_join`                            | servidor  | alguien se une                        | `new` o `existing`                    |
| `ch_start`                           | servidor  | un reto empieza                       | `2`, `3`, `4-6` (nº de participantes) |
| `ch_void`                            | servidor  | se anula por falta de gente           | —                                     |
| `ch_leave`                           | servidor  | alguien sale                          | `before` o `during`                   |
| `ch_close`                           | servidor  | un reto se cierra                     | `scored:1`, `scored:2`, `scored:3+`   |
| `ch_done`                            | servidor  | alguien cumple el reto (>= 100 %)     | —                                     |
| `ch_repeat`                          | servidor  | se repite para el mes siguiente       | —                                     |

Preguntas que responde:

- ¿Un reto trae gente? `signup` con `utm_source=reto` frente a `ch_invite_share`.
- ¿Se llega a empezar? `ch_start / ch_create` (objetivo inicial >= 50 %; si es < 30 %, falta
  masa social o el flujo de invitación es pesado).
- ¿Se cumple? `ch_done / ch_close` y `ch_leave`.
- ¿Se repite? `ch_repeat / ch_close` (señal de retención más honesta que hay, sin cohortes).
- El enlace lleva `?ref=...&utm_source=reto&utm_campaign=reto-{aaaamm}` y se normaliza como origen
  de siempre. No se mide quién invita a quién más allá de lo que ya hace `referrals`.

---

## H. Privacidad y legal

- **Base legal.** Cálculo del avance: ejecución del servicio. **Mostrar el alias, el avance y la
  posición a otras personas: consentimiento explícito** (art. 6.1.a RGPD), pedido por separado,
  sin casilla premarcada, retirable en cualquier momento con «Salir del reto».
- **Qué se comparte con el grupo:** alias del reto, avance redondeado y posición. **Nunca** importes,
  movimientos, categorías, nombre, correo ni si tiene Premium (a diferencia de la consola, aquí
  **no hay insignia Premium** junto al alias, para no revelar el plan de pago).
- **Lo que sí puede deducirse:** conociendo el objetivo común (X %), el avance permite estimar la
  **tasa de ahorro** de cada uno (avance x X). Es información económica de otra persona, por eso:
  (1) se redondea de 5 en 5, (2) hay consentimiento específico que lo dice con palabras
  («podrás ver cuánto va cada uno en porcentaje de su objetivo»), (3) solo entre quienes se
  invitan entre sí, (4) se puede salir en cualquier momento. Aun así hay que pasarlo por el abogado.
- **Salir y borrar.** «Salir del reto» borra su fila de `challenge_members`; si el reto está en curso,
  desaparece de la tabla de los demás y las posiciones se recalculan. En un reto ya cerrado, su
  resultado se conserva anonimizado (`challenge_results.user_id = NULL`) para que los demás
  sigan viendo su clasificación final, o se borra del todo si la persona lo pide («Borrar mi
  rastro»). Al eliminar la cuenta: `ON DELETE CASCADE`.
- **Conservación:** retos cerrados y resultados, 12 meses; después se borran (como el historial de
  la consola). Insignias, mientras exista la cuenta. Todo en la exportación (`finanverso-export`).
- **Alias.** Elegido por la persona, validado, distinto del nombre y del correo por defecto. El alias
  del reto no se liga a la consola.
- **Edad.** La app admite desde 14 años y no guarda la fecha de nacimiento. Los retos de ahorro
  no son juegos de azar ni involucran dinero, pero conviene que el abogado confirme que no
  hace falta limitarlo a mayores de edad. Tampoco hay premios.
- **Invitados.** El enlace no contiene datos de nadie. Una persona nueva solo ve nombre del reto,
  objetivo y nº de participantes **antes** de registrarse; los alias solo se ven tras unirse.
- **No es una apuesta ni un concurso.** Sin dinero en juego, sin Premium como premio, sin
  sorteos. Esto es una decisión de diseño para quedarse fuera del régimen de concursos y juego. La
  recompensa por invitar sigue siendo la del programa de referidos (independiente del resultado).
- **Textos legales** por añadir a `docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md` y a `app.privacy.*`:
  nueva finalidad (retos con amigos), base (consentimiento), qué ve cada uno, conservación (12
  meses), derecho a salir.
- **IA:** no interviene.

---

## I. Riesgos

| Riesgo                                                    | Prob. | Impacto           | Mitigación                                                                                                                                                |
| --------------------------------------------------------- | ----- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deducción del ahorro ajeno a partir del %, con X conocido | Media | Alto (privacidad) | Redondeo de 5 en 5, consentimiento específico, grupo de invitados, salir en cualquier momento, revisión legal                                             |
| Trampa apuntando ahorros falsos                           | Media | Bajo (sin premio) | Topes, mínimos de actividad, fecha de alta, congelación; sin premios con valor                                                                            |
| Un miembro de hogar enseña datos del titular              | Baja  | Alto              | Bloqueo explícito (C.7)                                                                                                                                   |
| Presión social o vergüenza ("voy el último")              | Media | Medio             | Posición visible solo para el grupo, redondeo, sin avisos de adelantamiento, modo «Solo mi avance» y reto en equipo en fase 2                             |
| Menores participando                                      | Baja  | Medio             | Sin dinero ni premios; consulta al abogado                                                                                                                |
| Reto que nunca empieza (poca gente)                       | Alta  | Medio             | Mínimo de 2, anulación con aviso, «Reutilizar»; primero entre amigos que ya usan la app                                                                   |
| Invitaciones con cuentas falsas para cobrar Premium       | Baja  | Alto (coste)      | `MAX_INVITED_PER_USER`, primeros pasos obligatorios, tramos de referidos; el reto no añade premios                                                        |
| El avance es raro si la nómina cae al final de mes        | Media | Medio             | Se usa `refIncome` fijo, no el ingreso del mes                                                                                                            |
| Datos pobres: `SAVING` casi nadie lo apunta               | Alta  | Alto              | Tutorial «Cómo apuntar tu ahorro», texto en la creación, aviso «Sin puntuar» con motivo; considerar que un ingreso a una cuenta de ahorro cuente (fase 2) |
| Cobertura legal de la «posición» entre amigos             | Baja  | Medio             | Consentimiento, revisión legal                                                                                                                            |
| Carga operativa (soporte)                                 | Baja  | Bajo              | Expulsión por quien crea, botón de avisar                                                                                                                 |

---

## J. Fases y esfuerzo

| Fase    | Contenido                                                                                                                                                                                                                                                                                                                                                                                         | Días                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **MVP** | Extraer alias a módulo compartido (0,5); migración 042 y repositorios (1); `challenges.ts` puro con tests (1,5); `ChallengeService` + trabajo horario + push (2); rutas, Zod, contrato (1); pantallas (lista, detalle, crear, consentimiento, resultado) con textos es/en y accesibilidad (3); invitación con `ref` y UTM (0,5); eventos (0,5); exportación y borrado (0,5); tests al 100 % (1,5) | **12**              |
| Fase 2  | Reto en equipo (cooperativo) (2); retos `noSpend` y `budgets` (porte de `challengeProgress`) (1,5); marca de «reto cumplido» en Salud financiera al pasar los retos al servidor (1); imagen compartible del resultado (1); retos de 2 semanas (1)                                                                                                                                                 | 6,5                 |
| Fase 3  | Reto con un hogar (hogar vs. hogar), plantillas de retos, histórico en Premium                                                                                                                                                                                                                                                                                                                    | a decidir con datos |

**Pruebas:** frontera del mes y de los cierres a las 00:00 de Madrid y en el cambio de hora,
topes y desempates, hogar (bloqueo), consentimiento obligatorio, salida y borrado, caducidad de
códigos, `attach` con y sin cuenta, ausencia de importes en todas las respuestas (test que busca
claves prohibidas), accesibilidad (`axe`), `wording.test.ts`.

**MVP mínimo si hay que recortar:** dos personas, un solo objetivo (10 %), sin expulsión, sin reto
siguiente, sin insignias de racha: unos **8 días**.

---

## K. Preguntas abiertas (máx. 5)

1. **¿Premio con valor al ganador (Premium)?** Recomendación: **no**. Solo insignias. Evita el
   régimen de concursos y la motivación de la trampa; la recompensa real ya es la del programa de
   invitaciones.
2. **¿Se muestra el avance exacto o redondeado?** Recomendación: **redondeado de 5 en 5** para los
   demás; el exacto, solo para uno mismo.
3. **¿Se deja jugar a miembros de un hogar?** Recomendación: **no** en el MVP; solo el titular, como
   «Hogar». El reto en equipo llega en la fase 2.
4. **¿Alias de la consola o alias propio?** Recomendación: **alias propio por reto**, con la opción
   (sin marcar) de reutilizar el de la consola. Nunca el nombre de pila.
5. **¿Cuándo construirlo?** Recomendación: **después de que haya al menos 100 usuarios activos** o
   en cuanto el dueño quiera impulsar invitaciones; funciona con 2 personas, pero sin una
   comunidad que lo propague no tiene efecto de crecimiento. Ver `RESUMEN-GANCHOS.md`.
