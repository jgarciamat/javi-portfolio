# Diseño: avisos fiscales con importe para autónomos

Estado: **diseño** (25/10/2026). No hay código de producto. Gancho aprobado por el dueño para
diseñar: «Tu 303 del 3T sale unos 480 € y vence en 12 días».
Anexo con maquetas estáticas: [`avisos-fiscales-wireframes.html`](./avisos-fiscales-wireframes.html).

Todas las personas, importes y facturas de este documento son **inventados**. Las cifras de los
casos (K.3) se han pasado por el motor real (`prepareDraft` de
`backend/src/domain/services/autonomo.ts`, rama `develop` del 25/10/2026) y coinciden con el
cálculo a mano que se da al lado.

Reglas de producto que este diseño cumple siempre:

- La app **nunca presenta ni representa**: prepara borradores y avisa.
- La cifra es una **estimación orientativa** («unos 480 €»). Nunca se dice «exacta»,
  «perfecta» ni «garantizada».
- En la interfaz no aparecen «NO CONFIRMADO» ni «gestor». Se dice «un profesional o la Agencia
  Tributaria».
- **Mejor no dar importe que dar uno equivocado.** Cada regla de la sección D sirve a esto.

---

## A. Valor y resumen

**Para quién.** Autónomos en estimación directa (simplificada o normal) que ya usan la pantalla
Autónomos (`BusinessView` → `AutonomoAssistant`). Hoy la app calcula el 303, el 130, el 349 y el
390 en el servidor, y el 111, el 115 y el 131 en el dispositivo. También muestra las fechas
límite dentro del borrador (`deadlinesFor`). Lo que falta es **avisar a tiempo, fuera del
borrador, con la cifra que ya sabe calcular**.

**Qué se construye.**

1. Una tarjeta **«Próximos plazos»** arriba de la pantalla Autónomos. Muestra cada modelo
   pendiente con su fecha, los días que quedan, el importe estimado (si los datos bastan) o lo
   que falta para calcularlo, y un botón que abre el borrador de ese modelo y trimestre.
2. **Avisos fuera de la app**, solo si el usuario los activa: Web Push (web y acceso directo) y
   correo. Como mucho uno por plazo y modelo, y dos por semana.
3. **«Ya lo he presentado»** por modelo y periodo: apaga los avisos de ese plazo.

**La decisión de fondo (D y H).** El aviso **no vuelve a calcular nada**. Usa una
**instantánea** del resultado que dio el motor la última vez que el usuario preparó el borrador.
Solo la muestra si se cumplen todas estas condiciones:

- el trimestre ya terminó cuando se calculó;
- los datos no han cambiado desde entonces;
- el motor cubre el caso.

Si falla una sola, el aviso sale **sin importe** y dice qué hacer. Así nunca hay dos cálculos
distintos de lo mismo. Hoy el servidor no podría repetir el cálculo él solo: las entradas
(`buildInputs`) se montan en el dispositivo con las amortizaciones, las opciones de IVA y la
actividad.

**MVP (2 semanas, unos 9,5 días; K.1):** tarjeta con importes de 303 y 130 (servidor) y de 111 y
115 (dispositivo), «Ya lo he presentado», silenciar un modelo, avisos Web Push y correo con
opt-in, job horario idempotente y analítica. El modelo 100, el 131, los resúmenes anuales con
«si procede» y las notificaciones locales de Android con importe quedan para la fase 2.

---

## B. Inventario de lo reutilizable

| Pieza                                 | Dónde                                                                                                                                                       | Qué se reutiliza                                                                                                                                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motor del borrador                    | `backend/src/domain/services/autonomo.ts` `prepareDraft`                                                                                                    | Devuelve `vat: Draft303` (`result: pay/offset/refund/zero/noActivity`, `amountDue`, `warnings`), `irpf: Draft130` (`pay/negative/zero/notRequired`), `m349`, `m390` y `deadlines`. Es la **única** fuente de los importes del 303 y del 130. |
| Arrastres del 130                     | `carryOf`, `draft130`, `windowOf` en el mismo fichero                                                                                                       | La casilla 05 se suma con lo presentado (`filed130`) o con lo calculado; los negativos van a la 15. El aviso no lo toca: lee `amountDue` del trimestre visto.                                                                                |
| Presentados que ya escribe el usuario | `filed130` (`AutonomoManual.tsx`, `autonomoInputs.ts` `filedOf`), `filed303`, `filed111` / `filed115` (`withholdingForm.ts`)                                | Si escribió la casilla 07 del 130 o el resultado del 303 de un trimestre, el dispositivo ya sabe que lo presentó. En la tarjeta cuenta como «presentado» (E.5).                                                                              |
| Fechas límite                         | `deadlinesFor` y `businessDay` (`autonomo.ts`); `filingDeadline` y `isClosedQuarter` (`frontend/.../domain/closedQuarter.ts`)                               | Regla del día 20 / 30 de enero, con fin de semana al lunes. Se envuelve en un calendario por ejercicio (C.2).                                                                                                                                |
| Fechas de la Renta                    | `frontend/src/modules/tools/domain/rentaCampaign.ts` `campaignFor` (con `confirmed`)                                                                        | Mismo patrón para el calendario fiscal: fechas confirmadas o «habituales, por confirmar». Para el modelo 100 en la fase 2.                                                                                                                   |
| Cobertura del motor                   | `VatWarning` en `autonomo-vat.ts`; `docs/fiscalidad/auditoria-calculos.md` (filas 94-107)                                                                   | Qué avisos del 303 impiden dar un importe (D.4).                                                                                                                                                                                             |
| Avisos de importación                 | `frontend/.../domain/importChecks.ts` (`emptyIncome`, `emptyExpenses`, `duplicate`, `period`…)                                                              | Son los «faltan datos» de la tarjeta (D.2).                                                                                                                                                                                                  |
| Push del servidor                     | `application/push/PushService.ts` (`notify`), `PushRepository.claim` sobre `push_log` (migración 019), `/push/*` en `user.routes.ts`                        | Envío y alta del navegador. **Solo web**: `frontend/src/core/push/push.ts` dice que la app Android no usa Web Push.                                                                                                                          |
| Notificaciones locales (Android)      | `frontend/src/core/notifications/notifications.ts` (ids 1001, 1011-1013)                                                                                    | Avisos programados en el dispositivo. En el MVP se usan **sin importe** (E.3).                                                                                                                                                               |
| Patrón de aviso de servicio           | `application/billing/TrialNoticeService.ts`, `domain/services/trial-notices.ts` (`madridDay`), migración 035                                                | Ventana de mañana, día natural de Madrid, `claim` antes de enviar y `release` si nada llega, correo solo a direcciones verificadas, evento `trial_notice` con detalle `tipo:canal`.                                                          |
| Ajustes del usuario                   | `domain/model/UserSettings.ts` (`weeklyDigest`, `trialNotices`), `schemas.ts` (l. 130-131)                                                                  | Se añaden `taxPush`, `taxEmail`, `taxShowAmount` y `taxLastCall` igual que `trialNotices`.                                                                                                                                                   |
| Jobs horarios                         | `backend/src/main.ts` (`reminders`, `trialNotices`, `cryptoAlerts`: `setInterval` + `unref`)                                                                | Un `taxNotices` más, horario.                                                                                                                                                                                                                |
| Planes y límites                      | `domain/services/plans.ts` (`autonomoDrafts: 1` por trimestre gratis, `freeDraftQuarters`), `TaxService.draft`                                              | La instantánea se guarda dentro de `TaxService.draft`, que ya aplica los límites del plan.                                                                                                                                                   |
| Cifrado en reposo                     | `AutonomoDataService` (`SecretBox`), migración 032                                                                                                          | Los importes de las instantáneas se guardan cifrados con la misma caja (H.1).                                                                                                                                                                |
| Copia en la cuenta                    | `autonomo_data.version` / `updated_at`; `autonomoSync.ts` (`changedAt`)                                                                                     | Sirve para saber si los datos cambiaron después del borrador (D.3).                                                                                                                                                                          |
| Analítica anónima                     | `funnel_daily` (migración 034), `CLIENT_FUNNEL_EVENTS` / `CLIENT_FUNNEL_DETAILS` / `SERVER_FUNNEL_EVENTS` (`domain/ports/services.ts`), `docs/analitica.md` | Eventos nuevos en listas cerradas, sin importes ni ids (I).                                                                                                                                                                                  |
| Exportación y borrado                 | `SqlitePersonalDataReader.ts` (ya exporta `push_log` y `money_leak_decisions`)                                                                              | Se añaden las tablas nuevas (H.1).                                                                                                                                                                                                           |
| Navegación y tour                     | `frontend/.../ui/navigation.ts` (sección `business`), `ui/tour/tourSteps.ts` (`TOUR_VERSION = 4`, pasos `auto*`)                                            | Insignia en el menú y un paso nuevo del tour (E.7).                                                                                                                                                                                          |
| Textos de plazos                      | `hacienda.m303.deadline5/6`, `hacienda.m130.deadline5/6`, `OFFICIAL_LINKS.debitDeadlines` (`guides/domain/hacienda.ts`)                                     | Domiciliación (15 de abril, julio y octubre; 27-1-2026) y regla del día inhábil. Fuente comprobada el 17-10-2026 (`SOURCE_CHECKED`).                                                                                                         |

---

## C. Qué modelos y cuándo

### C.1 Modelos que entran

| Modelo                      | ¿Lleva importe?                                                    | Dónde se calcula                          | ¿Cuándo se avisa?                                                                             | MVP        |
| --------------------------- | ------------------------------------------------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------- | ---------- |
| 303 IVA trimestral          | Sí: a pagar / a compensar / a devolver (4T) / cero / sin actividad | Servidor (`prepareDraft` → `vat`)         | Todo autónomo con IVA: se presenta cada trimestre, también «sin actividad»                    | **Sí**     |
| 130 pago fraccionado IRPF   | Sí: a pagar / negativo / cero                                      | Servidor (`prepareDraft` → `irpf`)        | Estimación directa, salvo `exempt130` (profesional con el 70 % retenido)                      | **Sí**     |
| 111 retenciones             | Sí: a ingresar / negativa (0 €)                                    | Dispositivo (`withholdings.ts` `form111`) | Solo si en el trimestre pagó rentas con retención (RIRPF art. 108.1, ya en `withholdings.ts`) | **Sí**     |
| 115 alquiler del local      | Sí: a ingresar / negativa                                          | Dispositivo (`form115`)                   | Solo si paga un alquiler con retención                                                        | **Sí**     |
| 349 intracomunitarias       | No: es informativo                                                 | Servidor (`m349`)                         | Solo si el trimestre tiene operaciones intracomunitarias (`m349 !== null`)                    | Fecha sola |
| 131 módulos                 | Sí                                                                 | Dispositivo (`module131.ts`)              | Estimación objetiva                                                                           | Fase 2     |
| 390 resumen anual IVA       | No: es informativo                                                 | Servidor (`m390`)                         | Enero, si hubo algún 303 del año («si te corresponde»)                                        | Fecha sola |
| 190 / 180 resúmenes         | No                                                                 | —                                         | Enero, si hubo algún 111 / 115 del año con perceptores                                        | Fecha sola |
| 347 terceros                | No                                                                 | —                                         | Febrero, «si has tenido operaciones de más de 3.005,06 € con alguien»                         | Fase 2     |
| 100 Renta                   | Sí (resultado de la Renta)                                         | Dispositivo (`rentaCalc`)                 | Campaña confirmada (`campaignFor(año).confirmed`)                                             | Fase 2     |
| 2.º plazo de la Renta (102) | Sí (40 %)                                                          | —                                         | 5 de noviembre, si fraccionó (la app no lo sabe hoy)                                          | Fase 2     |

Fuera de alcance: cuotas del RETA (se domicilian cada mes: no hay modelo que presentar), REDEME
y grandes empresas (303 mensual), 123/193/216.

### C.2 Calendario: la regla y la tabla por ejercicio

**Regla legal** (la de `deadlinesFor`, `closedQuarter.filingDeadline` y `docs/fiscalidad/modelos.md`):

| Modelo        | 1T            | 2T            | 3T              | 4T                      | Fuente                  |
| ------------- | ------------- | ------------- | --------------- | ----------------------- | ----------------------- |
| 303, 130, 131 | 1-20 de abril | 1-20 de julio | 1-20 de octubre | 1-30 de enero (año + 1) | [I303], [I130], [CAL]   |
| 349           | 1-20 de abril | 1-20 de julio | 1-20 de octubre | 1-30 de enero           | [I349] en `autonomo.ts` |
| 111, 115      | 1-20 de abril | 1-20 de julio | 1-20 de octubre | **1-20 de enero**       | RIRPF art. 108.1; [CAL] |
| 390           | —             | —             | —               | 1-30 de enero           | [CAL]                   |
| 190, 180      | —             | —             | —               | 1-31 de enero           | [CAL]                   |
| 347           | —             | —             | —               | Febrero                 | [CAL]                   |

- Si el último día es sábado, domingo o inhábil, el plazo pasa al siguiente día hábil
  (`modelos.md`, l. 18; [I130]). En 2026, el «31 de enero» fue el 2 de febrero y el «28 de
  febrero», el 2 de marzo [CAL].
- **Domiciliación** (si sale a pagar y se paga con cargo en cuenta): el plazo es más corto.
  Según la guía de la app (`hacienda.m303.deadline5`, comprobado el 17-10-2026): hasta el 15 de
  abril, julio y octubre, y en enero «unos días antes del 30» (en 2026, el 27 de enero).
- Los **festivos no se tienen en cuenta** en `businessDay`. La pantalla ya lo dice
  (`app.autonomo.disclaimer`). Además, un día puede ser inhábil solo en algunas comunidades.
  Por eso el calendario confirmado de cada año es el que manda.

**Diseño: `TAX_CALENDARS` por ejercicio** (backend, `domain/services/tax-calendar.ts`, nuevo).
Es el mismo patrón que `rentaCampaign.ts` y `docs/fiscalidad/reglas-por-ejercicio.md`:

```ts
interface TaxCalendarYear {
  year: number; // the calendar year the deadlines fall in
  confirmed: boolean; // checked against the AEAT «Calendario del contribuyente»
  source: string;
  checkedOn: string; // YYYY-MM-DD
  /** Real last day by key «303-2026-3T», when it differs from the rule (holidays…). */
  overrides: Record<string, string>;
  /** Last day to file with direct debit, by key; absent: not shown. */
  debit: Record<string, string>;
}
```

- `deadlineOf(model, year, period)` → `{ date, nominal, debitEnd | null, confirmed }`.
  `date` es la del calendario confirmado o, si no lo hay, la de la regla. `nominal` es el día de
  la regla sin moverlo.
- **Seguridad en las fechas.** Sin calendario confirmado, los avisos se programan contra la
  fecha `nominal`. Mover el plazo solo lo retrasa, así que el aviso nunca llega tarde. En
  pantalla se muestra `date` con la nota «Fecha calculada con la regla habitual; compruébala en
  el calendario de la Agencia Tributaria».
- La **domiciliación** solo aparece si está en `debit` de un año confirmado. Nunca se deduce.
- Mantenimiento: en enero, al publicarse el calendario del contribuyente (ya es el paso 2 de
  `docs/fiscalidad/README.md`), se rellena el año y se pone `confirmed: true`. Un test falla si
  el año en curso no tiene entrada confirmada después del 31 de enero (aviso al equipo, no al
  usuario).

### C.3 Los próximos 12 meses (calculados con la regla, a 25/10/2026)

Día de la semana comprobado con el calendario. **A verificar contra la AEAT** = año sin
calendario confirmado en la app.

| Plazo                             | Regla      | Último día                       | Domiciliación                    | Estado                            |
| --------------------------------- | ---------- | -------------------------------- | -------------------------------- | --------------------------------- |
| 303/130/111/115 del 3T 2026       | 20-10-2026 | mar 20-10-2026                   | 15-10-2026                       | Confirmado (ya pasado)            |
| 2.º plazo Renta 2025 (40 %)       | 5-11-2026  | jue 5-11-2026                    | —                                | Confirmado ([O100] art. 11.5)     |
| 111/115 del 4T 2026               | 20-01-2027 | mié 20-01-2027                   | —                                | A verificar                       |
| 303/130/131/349 del 4T 2026 y 390 | 30-01-2027 | **lun 1-02-2027** (30 = sábado)  | No se muestra hasta confirmar    | A verificar                       |
| 190 / 180 de 2026                 | 31-01-2027 | **lun 1-02-2027** (31 = domingo) | —                                | A verificar                       |
| 347 de 2026                       | 28-02-2027 | **lun 1-03-2027** (28 = domingo) | —                                | A verificar                       |
| 1T 2027 (303/130/111/115/131/349) | 20-04-2027 | mar 20-04-2027                   | Por regla, 15-04 (no se muestra) | A verificar                       |
| Renta 2026 (modelo 100)           | —          | Habitual: 30-06-2027 (mié)       | Habitual: 25-06                  | `campaignFor(2026)` sin confirmar |
| 2T 2027                           | 20-07-2027 | mar 20-07-2027                   | —                                | A verificar                       |
| 3T 2027                           | 20-10-2027 | mié 20-10-2027                   | —                                | A verificar                       |

### C.4 Discrepancias encontradas al revisar el código (para el dueño)

| #   | Severidad                     | Qué                                                                                                                                                                                                                                                                                                                                                                                              | Dónde                                                        | Propuesta                                                                                                                                              |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | **Resuelto** (25-10-2026) | Era: el 130 aplicaba siempre el 20 %. Verificado con la norma primaria: RIRPF art. 110.2 (porcentajes × 0,4 con la deducción del art. 68.4: 8 % en Ceuta y Melilla), DA 57.ª LIRPF (La Palma: 3T y 4T de 2026, 4T de 2025, 2T-4T de 2024, 2023 entero) y DA 64.ª (Ceuta: 10 % de difícil justificación en el 4T de 2026). | `autonomo-territory.ts`, `activityTerritory.ts`; dato `territory` | Ya calculado: el aviso del 130 puede llevar importe también en esos territorios. Detalle y fuentes: `reglas-por-ejercicio.md` (Autónomos) y fallo 12 de `auditoria-calculos.md`. |
| D2  | **Resuelto** (25-10-2026) | Era: `freeDraftQuarters` cortaba el día 20 / 30 sin pasarlo al día hábil y el servidor usaba el día UTC. Ahora usa `filingDeadline` (sábados, domingos y festivos nacionales) y el día de la península o de Canarias. El 1-02-2027 el plan gratis deja preparar el 4T de 2026. | `working-days.ts` (servidor), `workingDays.ts` (dispositivo) | `deadlineOf` del MVP puede reutilizar `businessDay` / `filingDeadline` de `working-days.ts`. Fallo 10 de `auditoria-calculos.md`. |
| D3  | **Resuelto** (25-10-2026) | Era: el 347 al 28 de febrero. La Orden EHA/3012/2008, art. 10 (versión de la Orden HAC/1148/2018), dice «durante el mes de febrero»: ahora el último día de febrero (29-02-2028 para el 347 de 2027), pasado al día hábil. | `autonomo.ts` `deadlinesFor` | Fallo 11 de `auditoria-calculos.md`. |
| D4  | Baja (en parte resuelto) | Los festivos nacionales ya están en `businessDay` (D2); los autonómicos y locales (Ley 39/2015, art. 30.6), no (ya avisado en pantalla). | | |
| D5  | Baja                          | `deadlinesFor` no da el 180 (ya anotado en `modelos.md`) ni el 131.                                                                                                                                                                                                                                                                                                                              | `autonomo.ts` l. 412                                         | `deadlineOf` cubre todos los de C.1.                                                                                                                   |
| D6  | Informativa                   | `ReminderService` decide la ventana con horas UTC (8-12 h en invierno y 9-13 h en verano). `trial-notices.ts` usa el día de Madrid.                                                                                                                                                                                                                                                              | `ReminderService.ts` l. 11                                   | El job nuevo usa `Europe/Madrid` para el día y para la hora (E.2).                                                                                     |

---

## D. Cuándo se muestra un importe

### D.1 Vocabulario

- **Periodo terminado**: ha pasado el último día del trimestre (30-09 en el 3T). Desde entonces
  las facturas del trimestre ya no cambian por fechas.
- **Plazo abierto**: del día siguiente al fin del periodo hasta el último día de C.2.
- **Instantánea**: el resultado que dio el motor para (año, periodo, modelo) la última vez que se
  preparó ese borrador, con su hora y la huella de los datos (H.1).

### D.2 Las condiciones (todas deben cumplirse)

Hay importe en la tarjeta y en el aviso solo si se cumplen estas condiciones. El orden es el
que sigue el código; la primera que falla decide el texto de E.4.

| #   | Condición                                                                  | Si falla, la tarjeta dice                                                      | Código del estado |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------- |
| 1   | No está marcado como presentado (E.5)                                      | «Presentado»                                                                   | `filed`           |
| 2   | El modelo aplica (`exempt130` → no; 111/115 sin perceptores → no se lista) | «No lo presentas…» (`app.autonomo.explain.irpf.notRequired`)                   | `notRequired`     |
| 3   | El motor cubre el caso (D.4)                                               | «La app no estima este caso…»                                                  | `notCovered`      |
| 4   | Existe una instantánea del periodo                                         | «Prepara el borrador para ver cuánto sale»                                     | `noDraft`         |
| 5   | La instantánea se calculó **con el periodo terminado**                     | «Tu borrador es de antes de acabar el trimestre: vuelve a prepararlo…»         | `early`           |
| 6   | Los datos **no cambiaron** desde la instantánea (D.3)                      | «Has cambiado datos después del borrador…»                                     | `stale`           |
| 7   | **Datos suficientes** del periodo (abajo)                                  | «Faltan datos para estimar tu 303: importa las facturas del 3.er trimestre»    | `missing`         |
| 8   | La versión del motor de la instantánea es la actual (H.4)                  | «Hemos mejorado el cálculo: vuelve a preparar el borrador para ver el importe» | `engine`          |
| —   | Todo bien                                                                  | «Sale a pagar unos 1.370 €»                                                    | `estimate`        |

**Datos suficientes** (condición 7). La comprueba el dispositivo, que tiene las facturas, y la
manda con la instantánea como `missing: string[]`:

- **303 y 130**: hay ingresos del periodo (facturas emitidas importadas o escritas, o movimientos
  en categorías de negocio). Si no hay ninguno, no se dice «sin actividad» por las buenas: se
  pregunta (E.4, «¿No facturaste nada este trimestre?»). Solo con «Sí, sin actividad» la
  instantánea vale con `noActivity`.
- No hay ningún aviso de nivel `warn` de `importChecks.ts` en el periodo: `duplicate`, `period`,
  `negative`, `otherShare`, `model130Income`, `model130Expenses`, `intraNoVatId`,
  `notSelfAssessed`, `exemptNoCause`. Los `info` (`emptyExpenses`, `vat0`, `rateGuessed`…) no
  bloquean, pero salen debajo de la cifra («Revisa: no hay gastos en el 3.er trimestre»).
- **130 a partir del 2T**: los trimestres anteriores salen de este mismo año en la app o están
  cubiertos por `prior` (totales del 130 presentado) o por `filed130`. Si un trimestre anterior
  no tiene ni datos ni 130 presentado, `missing: ['priorQuarters']`, porque la casilla 05 no se
  puede saber.
- **130**: `priorYearNet` escrito (o «sin actividad el año pasado»). Si no, la minoración de la
  casilla 13 es 0 y el importe puede salir **más alto** de lo real: se muestra con la nota
  «Sin el rendimiento del año pasado no se aplica la reducción por rentas bajas». No bloquea,
  porque el error va hacia arriba y no hacia abajo.
- **111/115**: hay facturas recibidas con retención o totales escritos a mano del trimestre.

### D.3 ¿Cambiaron los datos? (condición 6)

| Origen de los datos del borrador                                    | Cómo se sabe                                                                                                                                      | ¿Lo comprueba el job?        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Movimientos en categorías de negocio (`TaxService.movements`)       | Huella `sha256` de los movimientos del año (fecha, tipo, importe, tipo de IVA) guardada en la instantánea; se recalcula al leer                   | Sí                           |
| Datos a mano o importados (`inputs.manual`), con copia en la cuenta | `autonomo_data.version` guardada en la instantánea; si ahora es mayor, los datos cambiaron. Cualquier guardado cuenta (prudente: invalida de más) | Sí                           |
| Datos a mano o importados, **solo en el dispositivo**               | El dispositivo compara su `changedAt` (`autonomoSync.ts`) con `computedAt`                                                                        | **No**: `verifiable = false` |

Con `verifiable = false`, la tarjeta del dispositivo sí puede dar la cifra (porque comprueba
`changedAt` al abrir), pero **los avisos de fuera de la app salen sin importe**: «Abre la app
para ver cuánto sale». Así lo que llega a la pantalla bloqueada siempre lo ha comprobado el
servidor en el momento de enviarlo.

### D.4 Lo que el motor aún no cubre: sin importe, y se dice

| Caso                                                            | Señal                                                                              | Modelo afectado |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------- |
| Régimen simplificado del IVA                                    | `VatWarning 'simplified'` (el servidor solo avisa; `auditoria-calculos.md` l. 101) | 303             |
| Agricultura en el REAGP                                         | `'reagp'`                                                                          | 303             |
| Tipos temporales de 2023-2024                                   | `'temporaryRates'`                                                                 | 303             |
| Prorrata sin el porcentaje / ventas exentas sin prorrata        | `'prorrataMissing'`, `'exemptNoProrrata'`                                          | 303             |
| Régimen especial obligatorio                                    | `'specialMandatory'`                                                               | 303             |
| ~~Ceuta, Melilla o La Palma (D1)~~ | Resuelto: el motor ya calcula el 8 % con la pregunta «¿Dónde realizas la actividad?» (`territory`); no hace falta `taxSpecialTerritory` | — |
| Módulos (131) y Renta (100) en el MVP                           | Fuera del MVP                                                                      | 131, 100        |
| Datos compartidos de un hogar (`req.dataUserId !== req.userId`) | El aviso solo va al titular de los datos                                           | Todos           |

Los demás `VatWarning` (`prorrataApplied`, `offsetNotApplied`, `refundNotLast`,
`importDeferred`, `reverseIssued`) no bloquean. Salen como nota bajo la cifra, con el texto que
ya tienen en `app.autonomo.vatr.warn.*`.

### D.5 La cifra: «unos», redondeo y signo

- **Nunca horquilla en el MVP.** Una horquilla sugiere un modelo de incertidumbre que no
  tenemos. Si hay duda (D.2), no hay cifra.
- **Nunca se proyecta un trimestre abierto.** Durante el trimestre, la tarjeta puede decir
  «En lo que va de trimestre: unos 820 €», solo en la app, con la etiqueta «El trimestre aún no
  ha terminado» y sin aviso externo. Fase 2, si el dueño quiere (L.5).
- Redondeo para «unos»: de 100 € en adelante, a la decena (`Math.round(x / 10) * 10`). Por
  debajo de 100 €, al euro. Al pulsar se ve la cifra del borrador con céntimos: «En tu
  borrador: 1.365,00 €».
- El importe es el `amountDue` del motor, **en valor absoluto, con su verbo**:

| Modelo  | `result`                  | Texto (es)                                                                    | Text (en)                                                                   |
| ------- | ------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 303     | `pay`                     | Sale a pagar unos {amount}                                                    | About {amount} to pay                                                       |
| 303     | `offset`                  | Sale a compensar: no pagas; quedan unos {amount} para los próximos trimestres | To carry forward: nothing to pay; about {amount} left for the next quarters |
| 303     | `refund` (solo 4T)        | Sale a devolver unos {amount} si pides la devolución                          | About {amount} back if you ask for the refund                               |
| 303     | `zero`                    | Sale a cero: preséntalo igualmente                                            | Comes to zero: file it anyway                                               |
| 303     | `noActivity` (confirmado) | Sin actividad este trimestre: preséntalo igualmente marcando «sin actividad»  | No activity this quarter: file it anyway, ticking «sin actividad»           |
| 130     | `pay`                     | Sale a pagar unos {amount}                                                    | About {amount} to pay                                                       |
| 130     | `negative`                | Sale negativo: no pagas este trimestre; preséntalo igualmente                 | Comes out negative: nothing to pay this quarter; file it anyway             |
| 130     | `zero`                    | Sale a cero: preséntalo igualmente                                            | Comes to zero: file it anyway                                               |
| 111/115 | a ingresar                | Sale a pagar unos {amount}                                                    | About {amount} to pay                                                       |
| 111/115 | negativa                  | Declaración negativa (0 €): preséntala igualmente                             | Nil return (€0): file it anyway                                             |

«Preséntalo igualmente» sale del motor y de los textos que ya existen
(`app.autonomo.explain.vat.noActivity`, `explain.irpf.noActivity`, `wh.explain.111.zero`). No se
añade ninguna regla nueva de obligación.

---

## E. Avisos

### E.1 Calendario de cada plazo

Los días son naturales de Madrid y se cuentan hacia atrás desde la fecha de C.2 (la `nominal` si
el año no está confirmado).

| Etapa   | En la app (siempre)                                     | Push / correo (con opt-in)                                                                                                                          |
| ------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-14    | La tarjeta pasa a «Próximos plazos» con su cuenta atrás | Solo si faltan datos (`missing`, `noDraft`, `early`): «Prepara tu 303 del 3.er trimestre: faltan las facturas…». Cuenta como el aviso de ese plazo. |
| **T-7** | Insignia en el menú (E.7)                               | **El aviso del plazo**: con importe si D.2 se cumple y el usuario lo permite (`taxShowAmount`); si no, sin importe                                  |
| T-2     | Banda arriba de la tarjeta                              | Solo con «Avisarme también 2 días antes» (`taxLastCall`, apagado por defecto) y si no está presentado                                               |
| T-0     | «Hoy es el último día» en la tarjeta                    | Nada (es tarde para domiciliar y no se mete prisa)                                                                                                  |
| T+1…T+7 | «El plazo terminó el 20 de octubre…» (E.4)              | Nada                                                                                                                                                |

**Límites:**

- **Un aviso externo por plazo y modelo.** Los modelos que vencen el mismo día van en **un
  solo mensaje** («Tu 303 y tu 130 del 3.er trimestre»). Si se activa T-2, se permite un
  segundo aviso por plazo, sin repetir importes. Ese recordatorio lo pide el usuario y por eso
  es la única excepción.
- **Máximo dos avisos fiscales externos por semana** (lunes a domingo, Madrid), contando push y
  correo del mismo aviso como uno. Si se llega al tope, el siguiente se queda solo en la app.
- Si alguien activa los avisos tarde (por ejemplo, en T-3), recibe el aviso que toque en ese
  momento (T-7 «atrasado»), siempre antes de T-0.

### E.2 El job (`TaxNoticeService.run()`, cada hora)

- Lo arranca `backend/src/main.ts` con `setInterval(…, 60 * 60 * 1000).unref()`, como
  `trialNotices`. Solo actúa de **9:00 a 12:59 hora de Madrid**: lo calcula con
  `Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: 'numeric' })`, no con horas
  UTC (D6). Así funciona igual en invierno y en verano (el horario cambió hoy, 25-10-2026).
- Candidatos: personas con `taxPush` o `taxEmail` activo, titulares de sus datos y con al menos
  un plazo de C.1 entre hoy y T+14.
- Para cada plazo y etapa, `decide()` es una **función pura** (`domain/services/tax-notices.ts`)
  que recibe la fecha, los plazos, las instantáneas, los presentados, las silenciadas, el plan,
  los ajustes y los avisos ya enviados esta semana. Devuelve `null` o
  `{ key, stage, models, amounts | null }`. Toda la lógica se prueba sin base de datos.
- **Idempotencia**: antes de enviar, `claim(userId, key, stage)` hace
  `INSERT OR IGNORE INTO tax_notice_log`, con clave
  `(user_id, deadline_key, stage)` y `deadline_key = "2026-10-20"` (la fecha agrupa los modelos).
  Si el `INSERT` no inserta, otro proceso o una vuelta anterior ya lo envió. Si no llega por
  ningún canal, se hace `release` para reintentar a la hora siguiente, como en
  `TrialNoticeService`. Dos ejecuciones en la misma hora → un envío.
- El importe se **comprueba en el momento de enviar** (D.3: huella de movimientos o versión de
  la copia). Nunca se usa uno guardado en una cola.
- **Si se marcó como presentado** (E.5): ese modelo sale del mensaje. Si no queda ninguno, no
  hay mensaje.
- **Silenciado** un modelo (E.6): igual que presentado, pero para todos los periodos.
- Errores: un fallo con un usuario se registra (`console.error('[tax] …')`) y el job sigue con
  el siguiente.

### E.3 Canales

| Canal                      | Quién                                                                 | Por defecto          | Importe                                                                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| En la app                  | Todos los que usan Autónomos                                          | Siempre              | Según D.2 (y G)                                                                                                                                                           |
| Web Push                   | Web y acceso directo (`push.ts`); hay que dar permiso en el navegador | Apagado (`taxPush`)  | Si `taxShowAmount` y D.2 lo permite comprobándolo en el servidor                                                                                                          |
| Correo                     | Dirección verificada                                                  | Apagado (`taxEmail`) | Igual que push                                                                                                                                                            |
| Notificación local Android | App de Play (no recibe Web Push)                                      | Apagado              | **MVP: sin importe** (se programa al abrir la app y no se puede comprobar al mostrarse). Fase 2: push del servidor (FCM) o importe comprobado al programar con caducidad. |

`taxShowAmount` («Mostrar el importe en la notificación; se verá en la pantalla bloqueada») se
pregunta al activar, **sin opción marcada** (L.2).

### E.4 Textos exactos de los avisos (es / en)

`{models}` = «tu 303 y tu 130» / «your 303 and 130». `{period}` = «del 3.er trimestre» /
«for Q3». `{date}` = «martes 20 de octubre» / «Tuesday 20 October». Importes con
`Intl.NumberFormat` (`es-ES` / `en-GB`) y redondeo de D.5.

| Clave           | es (título · cuerpo)                                                                                                                                                                                                                                        | en (title · body)                                                                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `t7.amount`     | Tu 303 y tu 130 del 3.er trimestre · Salen unos 1.370 € y 640 €. Vencen el martes 20 de octubre (en 7 días). Estimación orientativa: revisa el borrador.                                                                                                    | Your 303 and 130 for Q3 · About €1,370 and €640. Due Tuesday 20 October (in 7 days). An estimate: check the draft.                                                                                                |
| `t7.plain`      | En 7 días vencen {models} {period} · Plazo hasta el {date}. Abre la app para ver cuánto sale.                                                                                                                                                               | {Models} {period} are due in 7 days · Deadline: {date}. Open the app to see the amount.                                                                                                                           |
| `t14.missing`   | Prepara tu 303 {period} · Faltan datos para estimarlo: importa las facturas del 3.er trimestre. Vence el {date}.                                                                                                                                            | Get your 303 {period} ready · Some data is missing to estimate it: import your Q3 invoices. Due {date}.                                                                                                           |
| `t2`            | Quedan 2 días para {models} {period} · Si ya los has presentado, márcalos en la app y no te avisaremos más.                                                                                                                                                 | 2 days left for {models} {period} · If you have already filed them, mark them in the app and we will stop reminding you.                                                                                          |
| `email.subject` | Tu 303 y tu 130 del 3.er trimestre vencen el 20 de octubre                                                                                                                                                                                                  | Your 303 and 130 for Q3 are due on 20 October                                                                                                                                                                     |
| `email.footer`  | Estimación orientativa hecha con tus datos en Finanverso. Finanverso no presenta declaraciones: revisa el borrador y, si tienes dudas, consulta a un profesional o a la Agencia Tributaria. Puedes desactivar estos avisos en Ajustes → Avisos de Hacienda. | An estimate from your data in Finanverso. Finanverso does not file returns: check the draft and, if in doubt, ask a professional or the Tax Agency. You can turn these reminders off in Settings → Tax reminders. |

URL del push: `/?tab=business&draft=2026-3&model=303&from=tax_notice` (como `/?tab=crypto` en
`CryptoAlertService`). El correo lleva el mismo enlace. El remitente es siempre Finanverso: ni
logos ni nombre de la Agencia Tributaria en el asunto o en el remitente.

**En los avisos no hay promociones** (ni «Ver planes» ni ventajas de Premium), ni siquiera
para el plan gratis. Son avisos de servicio y deben seguir siéndolo (J.4).

### E.5 «Ya lo he presentado»

- Botón en cada fila de la tarjeta y al final del borrador. Guarda `tax_filed (año, periodo,
modelo)` en el servidor (`PUT /business/filed/...`), para que el job lo vea en todos los
  dispositivos.
- También cuenta como presentado, sin pulsar nada, si el usuario escribió lo presentado:
  `filed130[q]` (casilla 07), `filed303[q]`, `filed111` / `filed115`. El dispositivo lo envía al
  guardar.
- «Deshacer» durante 10 s y después en «Presentados (n)». Nunca se borra solo.

### E.6 Silenciar

- «No avisarme de este modelo» (menú ⋯ de la fila): `tax_notice_mutes (user_id, model)`. La
  fila sigue en la tarjeta, en gris, con «Avisos apagados · Activar».
- Ajustes → «Avisos de Hacienda»: interruptores de push, correo, «Mostrar el importe en la
  notificación», «Avisarme también 2 días antes», «Mi actividad está en Ceuta, Melilla o La
  Palma» y la lista de modelos silenciados.

---

## F. Pantallas

Maquetas completas en [`avisos-fiscales-wireframes.html`](./avisos-fiscales-wireframes.html)
(móvil 390 px y escritorio, todos los estados, claro y oscuro). Abajo, lo esencial.

### F.1 Tarjeta «Próximos plazos», móvil 390 px

Arriba de `AutonomoAssistant`, en `BusinessView.tsx`. Se ve en el asistente paso a paso y en la
vista «todo junto».

```
┌──────────────────────────────────────┐
│ Próximos plazos                       │
│ 3.er trimestre de 2026                │
├──────────────────────────────────────┤
│ 303 · IVA                 en 12 días  │
│ Sale a pagar                          │
│ unos 1.370 €                          │  ← 1.75rem, negrita
│ Vence el martes 20 de octubre         │
│ Si lo domicilias: hasta el 15 de oct. │
│ ┌───────────────┐ ┌─────────────────┐ │
│ │ Ver borrador  │ │ Ya lo he        │ │  ← ≥ 48 px de alto
│ └───────────────┘ │ presentado      │ │
│                   └─────────────────┘ │
│ Revisa: no hay gastos en el 3.er trim.│  ← nota info, si la hay
├──────────────────────────────────────┤
│ 130 · IRPF                en 12 días  │
│ Sale a pagar unos 640 €               │
│ [Ver borrador] [Ya lo he presentado]  │
├──────────────────────────────────────┤
│ 111 · Retenciones         en 12 días  │
│ Faltan datos para estimar tu 111:     │
│ añade las facturas con retención del  │
│ 3.er trimestre.                       │
│ [Añadir facturas]                     │
├──────────────────────────────────────┤
│ Estimación orientativa a partir de    │
│ tus datos en la app (borrador del 8   │
│ de octubre). Revisa el borrador antes │
│ de presentarlo; si tienes dudas,      │
│ consulta a un profesional o a la      │
│ Agencia Tributaria.                   │
│ Avisos: en la app · [Activar avisos ▸]│
└──────────────────────────────────────┘
```

**Escritorio (≥ 1024 px):** la tarjeta va en una columna de 360 px a la derecha del asistente,
fija al hacer scroll. Si no cabe, va arriba a todo el ancho con las filas en dos columnas. El
texto se lee como mucho en 720 px de ancho.

### F.2 Estados de una fila (textos exactos)

| Estado                     | es                                                                                                                                             | en                                                                                                                         | Acción principal                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `estimate`                 | Sale a pagar unos 1.370 € · Vence el martes 20 de octubre · en 12 días                                                                         | About €1,370 to pay · Due Tuesday 20 October · in 12 days                                                                  | Ver borrador / Open draft                                |
| `missing`                  | Faltan datos para estimar tu 303: importa las facturas del 3.er trimestre.                                                                     | Some data is missing to estimate your 303: import your Q3 invoices.                                                        | Importar facturas / Import invoices                      |
| `missing` (130 anteriores) | Faltan los trimestres anteriores para estimar tu 130: importa sus facturas o escribe lo que presentaste.                                       | Earlier quarters are missing to estimate your 130: import their invoices or type what you filed.                           | Completar / Complete                                     |
| `noActivity?`              | ¿No facturaste nada este trimestre? Si es así, tu 303 se presenta «sin actividad».                                                             | Did you invoice nothing this quarter? If so, your 303 is filed as «no activity».                                           | Sí, sin actividad / Yes, no activity · Importar facturas |
| `noDraft`                  | Prepara el borrador para ver cuánto sale.                                                                                                      | Prepare the draft to see the amount.                                                                                       | Preparar borrador / Prepare draft                        |
| `early`                    | Tu borrador es de antes de acabar el trimestre: vuelve a prepararlo para ver el importe.                                                       | Your draft is from before the quarter ended: prepare it again to see the amount.                                           | Preparar borrador                                        |
| `stale`                    | Has cambiado datos después del borrador del 8 de octubre: vuelve a prepararlo para ver el importe.                                             | You changed data after the draft of 8 October: prepare it again to see the amount.                                         | Preparar borrador                                        |
| `engine`                   | Hemos mejorado el cálculo: vuelve a preparar el borrador para ver el importe.                                                                  | We have improved the calculation: prepare the draft again to see the amount.                                               | Preparar borrador                                        |
| `notCovered`               | La app no estima este caso ({reason}). Revisa tus cifras con un profesional o con la Agencia Tributaria.                                       | The app does not estimate this case ({reason}). Check your figures with a professional or the Tax Agency.                  | Ver borrador                                             |
| `notRequired`              | No lo presentas: más del 70 % de tus ingresos del año pasado llevaron retención.                                                               | You do not file it: over 70% of last year's income had tax withheld.                                                       | —                                                        |
| `filed`                    | Presentado (lo marcaste el 14 de octubre) · Deshacer                                                                                           | Filed (you marked it on 14 October) · Undo                                                                                 | —                                                        |
| `muted`                    | Avisos apagados para este modelo · Activar                                                                                                     | Reminders off for this form · Turn on                                                                                      | —                                                        |
| último día                 | Hoy es el último día para presentarlo.                                                                                                         | Today is the last day to file it.                                                                                          | Ver borrador                                             |
| plazo pasado               | El plazo terminó el 20 de octubre. Si aún no lo has presentado, puedes hacerlo fuera de plazo; la Agencia Tributaria puede aplicar un recargo. | The deadline was 20 October. If you have not filed it yet, you can still file it late; the Tax Agency may add a surcharge. | Ver borrador · Ya lo he presentado                       |
| fecha sin confirmar        | Fecha calculada con la regla habitual; compruébala en el calendario de la Agencia Tributaria.                                                  | Date worked out with the usual rule; check it in the Tax Agency calendar.                                                  | Enlace `OFFICIAL_LINKS` del calendario                   |
| tarjeta vacía              | Aquí verás cada plazo de tus modelos con lo que sale, en cuanto prepares tu primer borrador.                                                   | Here you will see each deadline for your forms and the amount, once you prepare your first draft.                          | Empezar / Start                                          |
| error                      | No hemos podido cargar tus plazos. Inténtalo de nuevo.                                                                                         | We could not load your deadlines. Please try again.                                                                        | Reintentar / Retry                                       |
| cargando                   | Esqueleto de 3 filas, `aria-busy="true"`                                                                                                       | —                                                                                                                          | —                                                        |

`{reason}`: «régimen simplificado del IVA», «agricultura (REAGP)», «tipos de IVA de 2023-2024»,
«prorrata sin porcentaje», «actividad en Ceuta, Melilla o La Palma» / «VAT simplified scheme»,
«farming (REAGP)», «2023-2024 VAT rates», «prorrata without a percentage», «activity in Ceuta,
Melilla or La Palma». El recargo por presentar tarde existe (LGT art. 27). No se da su
porcentaje en el MVP: solo se menciona que puede haberlo.

La **advertencia fija** (pie de la tarjeta, sin poder cerrarla) va siempre que haya una cifra en
pantalla: «Estimación orientativa a partir de tus datos en la app (borrador del {date}). Revisa
el borrador antes de presentarlo; si tienes dudas, consulta a un profesional o a la Agencia
Tributaria.» / «An estimate from your data in the app (draft of {date}). Check the draft before
you file it; if in doubt, ask a professional or the Tax Agency.»

### F.3 Activar avisos (hoja inferior)

```
┌──────────────────────────────────────┐
│ Avisos de Hacienda               ✕    │
│ Te avisamos 7 días antes de cada      │
│ plazo de tus modelos. Nunca           │
│ presentamos nada por ti.              │
│ [■] Notificaciones en este navegador  │
│ [ ] Correo a a•••@ejemplo.es          │
│ ¿Mostrar el importe en la             │
│ notificación? Se verá en la pantalla  │
│ bloqueada.                            │
│ ( ) Sí, mostrar el importe            │
│ ( ) No, solo la fecha                 │  ← ninguna marcada
│ [ ] Avisarme también 2 días antes     │
│ [ ] Mi actividad está en Ceuta,       │
│     Melilla o La Palma                │
│ [ Guardar ]                           │
└──────────────────────────────────────┘
```

«Guardar» no se puede pulsar hasta elegir una opción de importe si push o correo están
activados. Con push, el permiso del navegador se pide **al pulsar Guardar**, nunca al cargar la
página (`subscribePush` de `push.ts`).

### F.4 Accesibilidad (público mayor incluido)

- Letra base 18 px, importe 28 px. Botones de al menos 48 × 48 px con texto (no solo iconos).
- La urgencia no va solo por color: el texto «en 2 días» siempre está, y hay un icono con
  `aria-hidden` y texto equivalente.
- Cada fila es un `<article aria-labelledby>` con el encabezado «303 · IVA». La cuenta atrás
  usa `<time datetime="2026-10-20">`.
- Cambio de estado (marcar presentado): `aria-live="polite"` con «303 marcado como presentado.
  Deshacer».
- Contraste AA en claro y oscuro (tokens de la app). Se ve bien al 200 % de zoom y en 320 px.
- Fechas siempre con día de la semana y mes en letras («martes 20 de octubre»), nunca «20/10».

### F.5 Integración con el panel de Autónomos

- «Ver borrador» abre `AutonomoAssistant` en el periodo (`filingQuarter` ya elige el trimestre
  en plazo) y en el paso del modelo: `quarter` (303/130) o `withholdings` (111/115), según
  `AUTONOMO_STEPS`.
- `AutonomoSummary` (la línea fija bajo la cabecera) añade «303 en 12 días» si hay un plazo en
  T-14 sin presentar.
- La lista «Fechas límite» del borrador (`AutonomoDraftResult.tsx` l. 267) usa `deadlineOf`, con
  la misma fecha que la tarjeta.

### F.6 Menú y tour

- **Insignia** en «Autónomos» (`navigation.ts`, sección `business`): un punto con
  `aria-label="1 plazo en 7 días o menos"`, de T-7 a T-0 si hay algún plazo sin presentar ni
  silenciar.
- **Tour**: paso nuevo `autoDeadlines` (`tab: 'business'`, `target: '[data-tour="tax-deadlines"]'`)
  después de `autoIntro`; `TOUR_VERSION` pasa a 5. Texto: «Aquí ves tus próximos plazos y,
  cuando tus datos lo permiten, cuánto sale cada modelo. Es una estimación: el borrador manda.» /
  «Here are your next deadlines and, when your data allows it, about how much each form comes
  to. It is an estimate: the draft has the last word.»
- Ajustes: bloque «Avisos de Hacienda» al lado de `PushSetting.tsx`.

---

## G. Gratis y Premium (propuesta)

| Qué                                                                                | Gratis                                                                                          | Premium    |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| Calendario de plazos de todos los modelos de C.1, «Ya lo he presentado», silenciar | Sí                                                                                              | Sí         |
| Avisos en la app (T-14 … T+7)                                                      | Sí                                                                                              | Sí         |
| Importe en la tarjeta                                                              | **Sí, el de su propio borrador** (el que el plan gratis ya le deja preparar: uno por trimestre) | Sí         |
| Push y correo **con la fecha** (T-7)                                               | **Sí**                                                                                          | Sí         |
| Push y correo **con el importe**                                                   | No: «Abre la app para ver cuánto sale»                                                          | Sí         |
| Recordatorio extra T-2                                                             | No                                                                                              | Sí         |
| Volver a preparar el borrador cuando la cifra caduca (`stale`/`early`)             | Según el límite actual (`autonomoDrafts: 1`); ver L.3                                           | Sin límite |

**Por qué no la propuesta literal** (plazos gratis; importes y push/correo Premium):

1. **Un aviso de plazo es cumplimiento, no comodidad.** Si un usuario gratis no presenta a
   tiempo por no tener el aviso, el perjuicio (recargo) es real. Es la misma regla que ya sigue
   la app con los cobros dobles: «un cobro equivocado nunca va detrás de un pago»
   (`FREE_LEAKS_SHOWN`).
2. **Ocultar en la tarjeta una cifra que el usuario gratis ya ha calculado en su borrador** se
   siente como un truco y no protege nada.
3. Lo que Premium vende es **la comodidad**: el importe te llega sin abrir la app, el
   recordatorio de T-2, recalcular sin límite y (fase 2) Renta y 131. Es fácil de explicar en
   `/pricing`: «Avisos con el importe en tu móvil».

En los avisos gratis no se mete publicidad de Premium (E.4). La venta va solo en la tarjeta:
debajo de un aviso sin importe, «Recibe el importe en el móvil con Premium · Ver planes». Eso
cuenta como `paywall_view` con detalle `tax`.

---

## H. Modelo de datos y API

### H.1 Migración 042 `tax-notices` (aditiva)

```sql
-- What the engine gave for a period; amounts encrypted at rest (SecretBox), keys in clear.
CREATE TABLE tax_estimates (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year         INTEGER NOT NULL,
  period       TEXT NOT NULL CHECK (period IN ('1T','2T','3T','4T','0A')),
  model        TEXT NOT NULL CHECK (model IN ('303','130','111','115','131','349','390','100')),
  source       TEXT NOT NULL CHECK (source IN ('server','device')),
  payload_enc  TEXT NOT NULL,          -- {result, amountCents, warnings, missing, notes}
  engine       INTEGER NOT NULL,       -- TAX_ENGINE_VERSION when computed (H.4)
  data_hash    TEXT,                   -- movements fingerprint (server drafts from movements)
  data_version INTEGER,                -- autonomo_data.version at that moment (cloud copy)
  verifiable   INTEGER NOT NULL,       -- 1 when the server can tell later if data changed
  computed_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, year, period, model)
) WITHOUT ROWID;

CREATE TABLE tax_filed (
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year      INTEGER NOT NULL,
  period    TEXT NOT NULL,
  model     TEXT NOT NULL,
  filed_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, year, period, model)
) WITHOUT ROWID;

CREATE TABLE tax_notice_mutes (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model    TEXT NOT NULL,
  muted_at TEXT NOT NULL,
  PRIMARY KEY (user_id, model)
) WITHOUT ROWID;

-- One row per message actually sent (the claim), to send each one once.
CREATE TABLE tax_notice_log (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deadline_key TEXT NOT NULL,          -- '2026-10-20'
  stage        TEXT NOT NULL CHECK (stage IN ('t14','t7','t2')),
  channels     TEXT NOT NULL DEFAULT '', -- 'push,email' once delivered
  sent_at      TEXT NOT NULL,
  PRIMARY KEY (user_id, deadline_key, stage)
) WITHOUT ROWID;

ALTER TABLE user_settings ADD COLUMN tax_push INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN tax_email INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN tax_show_amount INTEGER;      -- null: not chosen yet
ALTER TABLE user_settings ADD COLUMN tax_last_call INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN tax_special_territory INTEGER NOT NULL DEFAULT 0;
```

- Se borra todo con la cuenta (`ON DELETE CASCADE`). La exportación
  (`SqlitePersonalDataReader`) añade las cuatro tablas, con `payload_enc` descifrado, como ya
  hace con `autonomo_data`.
- Limpieza en el `cleanup` de 6 h de `main.ts`: `tax_notice_log` de más de 400 días y
  `tax_estimates` de ejercicios anteriores al año pasado.
- Al borrar la copia de autónomos (`DELETE /business/data`) se borran también las instantáneas
  `source = 'device'`. Ya no hay datos que las respalden.

### H.2 Endpoints

| Método y ruta                                  | Qué hace                                                                                                                                                                       | Límite                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `POST /business/draft` (existe)                | Además de lo de hoy, guarda las instantáneas del 303 y del 130 (y del 349/390 sin importe) de **ese** periodo. Recibe opcionalmente `missing` y `dataVersion` del dispositivo. | El de hoy (plan)                           |
| `PUT /business/estimates/:year/:period/:model` | Instantánea del dispositivo (111, 115; fase 2: 131, 100)                                                                                                                       | 60/min (`writes`)                          |
| `GET /business/deadlines?days=60`              | Plazos de hoy a +60 días (y los pasados de hace ≤ 7 días), con estado (D.2) y, si el plan lo permite, el importe                                                               | 60/min; `Cache-Control: private, no-store` |
| `PUT /business/filed/:year/:period/:model`     | `{ filed: boolean }`                                                                                                                                                           | 60/min                                     |
| `PUT /business/notices/mutes/:model`           | `{ muted: boolean }`                                                                                                                                                           | 60/min                                     |
| `PATCH /settings` (existe)                     | `taxPush`, `taxEmail`, `taxShowAmount`, `taxLastCall`, `taxSpecialTerritory`                                                                                                   | El de hoy                                  |

Todas con `authed` y `req.dataUserId`. Los avisos solo van al titular
(`req.userId === req.dataUserId`).

### H.3 Esquemas zod (en `infrastructure/http/schemas.ts`)

```ts
const taxModel = z.enum(['303', '130', '111', '115', '131', '349', '390', '100']);
const taxPeriod = z.enum(['1T', '2T', '3T', '4T', '0A']);
const taxYear = z.coerce.number().int().min(2023).max(2100);

export const taxEstimateParams = z.object({ year: taxYear, period: taxPeriod, model: taxModel });

/** A figure the device worked out (111/115 now); never more than the form can hold. */
export const deviceEstimateBody = z.object({
  result: z.enum(['pay', 'zero', 'negative', 'none']),
  amountCents: z.number().int().min(0).max(100_000_000_00),
  missing: z
    .array(z.enum(['income', 'expenses', 'withholdings', 'priorQuarters', 'warnChecks']))
    .max(10),
  engine: z.number().int().min(1),
  dataVersion: z.number().int().min(0).nullable(),
  changedAt: z.string().datetime().nullable(),
});

export const filedBody = z.object({ filed: z.boolean() });
export const muteBody = z.object({ muted: z.boolean() });
// settingsBody gains: taxPush, taxEmail, taxLastCall, taxSpecialTerritory: z.boolean();
// taxShowAmount: z.boolean().nullable()
```

Respuesta de `GET /business/deadlines` (sin datos personales aparte de los importes):

```ts
interface DeadlineView {
  key: string; // '2026-10-20'
  date: string;
  nominal: string;
  debitEnd: string | null;
  confirmed: boolean;
  items: {
    model: '303' | '130' | '111' | '115' | '349' | '390' | '190' | '180' | '347';
    year: number;
    period: '1T' | '2T' | '3T' | '4T' | '0A';
    state:
      | 'estimate'
      | 'missing'
      | 'noActivity?'
      | 'noDraft'
      | 'early'
      | 'stale'
      | 'engine'
      | 'notCovered'
      | 'notRequired'
      | 'filed'
      | 'muted'
      | 'informative';
    estimate: {
      result: string;
      amountCents: number;
      roundedCents: number;
      computedAt: string;
    } | null;
    locked: boolean; // free plan, amount withheld (push/e-mail only; the card shows it, G)
    reason: string | null;
    missing: string[];
    notes: string[];
  }[];
}
```

### H.4 Dónde corre el cálculo y versión del motor

- **303/130/349/390**: el servidor, en `prepareDraft`, como hoy. `TaxService.draft` guarda la
  instantánea **después** de calcular y en la misma petición. No hay segundo cálculo.
- **111/115** (y en la fase 2 el 131 y el 100): el dispositivo, con las funciones que ya
  existen. Se envían con `PUT /business/estimates`. El servidor no puede comprobar la cifra:
  son datos del propio usuario sobre sí mismo. Se marcan `source = 'device'` y solo llevan
  importe fuera de la app si `verifiable` (hay copia en la cuenta y su `version` coincide).
- **El job no calcula**: lee instantáneas, comprueba que siguen valiendo (D.3) y decide (E.2).
- `TAX_ENGINE_VERSION` (constante en `autonomo-data.ts`) se sube cuando cambia una regla que
  mueve importes. Un test guarda la huella de `autonomo*.ts` y de `withholdings.ts` y **falla si
  cambian sin subir la versión**. Así no se olvida, y una corrección del motor invalida las
  cifras viejas (estado `engine`).
- **Fase 3** (si se quiere avisar sin que el usuario abra la app): llevar `buildInputs` a un
  paquete compartido para que el servidor recalcule desde la copia de la cuenta. No es del MVP:
  es el mayor riesgo de que haya dos cálculos distintos.

### H.5 Caché, rendimiento y límites

- Sin caché: `GET /business/deadlines` lee como mucho unas 30 filas por usuario y recalcula una
  huella de los movimientos del año (lectura que `TaxService.movements` ya hace en cada
  borrador).
- El job solo procesa a quien tiene avisos externos activos y un plazo en ventana. Esto ocurre
  unos 12 días al trimestre. Si hiciera falta, la huella se calcula una vez por usuario y vuelta.
- `amountCents` tiene un tope (zod) de 100 millones de euros, para que un valor absurdo del
  dispositivo no llegue a un aviso.

---

## I. Medición (eventos propios, sin datos personales)

Contadores de `funnel_daily`, sin importes, ni ids, ni modelos con su cifra. Se añaden a
`CLIENT_FUNNEL_EVENTS` / `CLIENT_FUNNEL_DETAILS` y `SERVER_FUNNEL_EVENTS`
(`domain/ports/services.ts`) y a `docs/analitica.md`.

| Evento                        | Quién     | Cuándo                                                                       | Detalle (lista cerrada)                         |
| ----------------------------- | --------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| `tax_deadlines_view`          | navegador | Se ve la tarjeta con algún plazo a ≤ 14 días, una vez por apertura           | `amount`, `noamount`, `missing`, `filed`        |
| `tax_draft_open`              | navegador | «Ver borrador» o «Preparar borrador» desde la tarjeta o un aviso             | `card`, `notice`                                |
| `tax_filed_mark`              | servidor  | Se marca presentado                                                          | `before` (antes del plazo) o `late`             |
| `tax_mute`                    | servidor  | Se silencia un modelo                                                        | `303`, `130`, `111`, `115`, `other`             |
| `tax_optin`                   | servidor  | Se activa un canal                                                           | `push`, `email`                                 |
| `tax_notice`                  | servidor  | Sale un aviso                                                                | `t14:push`, `t7:email`… con `:amt` o `:plain`   |
| `paywall_view`                | navegador | «Ver planes» desde la tarjeta                                                | `tax` (nuevo valor permitido)                   |
| `tax_estimate_check` (fase 2) | servidor  | El usuario escribe lo presentado (`filed130`/`filed303`) y había instantánea | `match` (≤ 1 €), `close` (≤ 5 %), `far` (> 5 %) |

**Qué mirar** (informe semanal manual con `funnel_daily`):

- **Calidad del cálculo (la prioridad del dueño)**: `tax_estimate_check far` / total. Si pasa
  del 5 % en un trimestre, se apagan los importes externos (un interruptor de configuración,
  `TAX_AMOUNTS_ENABLED`) hasta revisar.
- Utilidad: `tax_filed_mark before` / avisos `t7` enviados; `tax_draft_open notice`.
- Cansancio: `tax_mute` y bajas de `tax_optin`.
- Negocio: `paywall_view tax` → `premium`.

---

## J. Riesgos fiscales y legales

### J.1 Importe equivocado (el riesgo principal)

| Causa                                          | Mitigación                                                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Facturas que faltan o repetidas                | D.2 (avisos `warn` de `importChecks.ts`, trimestre sin ingresos → pregunta)                                                   |
| Datos cambiados después del borrador           | D.3; el importe externo se comprueba al enviarlo                                                                              |
| Trimestre no terminado                         | D.2 #5; nunca se proyecta                                                                                                     |
| Caso que el motor no cubre                     | D.4; sin importe, con la razón                                                                                                |
| Corrección del motor                           | `TAX_ENGINE_VERSION` + test de huella (H.4)                                                                                   |
| Arrastres del 130 (casilla 05 / 15)            | `missing: ['priorQuarters']` si falta un trimestre anterior; `filed130` manda                                                 |
| Minoración sin el rendimiento del año anterior | Nota; el error sube la cifra, no la baja                                                                                      |
| Fallo general detectado                        | Interruptor `TAX_AMOUNTS_ENABLED` (variable de entorno: basta reiniciar, sin desplegar código) y métrica `tax_estimate_check` |

### J.2 Fecha equivocada

Calendario por año con `confirmed`, `overrides` y `debit` (C.2). Sin confirmar, los avisos se
programan contra la fecha nominal (nunca tarde) y la pantalla lo dice. Hay un test de mes de
enero. La domiciliación nunca se deduce: solo se muestra si está confirmada.

### J.3 Parecer asesoramiento o representación

- Verbos de información, no de orden: «sale», «vence», «revisa». Nunca «paga ya», «debes» ni
  «te ahorras».
- La advertencia fija de F.2 va con cada cifra. La del correo, en E.4.
- La app no presenta, no tiene apoderamiento y no se identifica con la Agencia Tributaria: sin
  su logo, sin «AEAT» en el remitente y sin enlaces disfrazados. Los enlaces a la sede son los
  de `OFFICIAL_LINKS`.
- Los casos de D.4 y los no residentes, que la app no trata, se mandan a «un profesional o la
  Agencia Tributaria».
- Condiciones (`terms`): propuesta de una frase. «Los avisos de plazos e importes son
  orientativos; la responsabilidad de presentar y pagar en plazo es del contribuyente.» El texto
  final, con quien lleve lo legal.

### J.4 Base de tratamiento de las notificaciones

- **En la app**: parte del servicio que el usuario usa (RGPD art. 6.1.b). No necesita
  consentimiento aparte.
- **Push y correo**: el usuario los pide al activarlos (opt-in, apagados por defecto). Son
  **avisos de servicio** sobre sus propias obligaciones, no comunicaciones comerciales. Por eso
  no llevan promociones (E.4), y así no entran en el art. 21 de la LSSI. Base: ejecución del
  servicio solicitado (art. 6.1.b). Se pueden desactivar en un toque desde Ajustes.
- **Importe en la pantalla bloqueada**: elección explícita (`taxShowAmount`, sin opción
  marcada). Por defecto, mientras no elija, solo la fecha.
- **Datos fiscales cifrados en reposo** (`payload_enc`). La política de privacidad añade una
  línea: «Si activas los avisos de Hacienda, guardamos el resultado estimado de tus borradores
  para avisarte. Se borra con tu cuenta.» (propuesta para `docs/legal/`).

### J.5 Otros

- Cansancio de avisos: límites de E.1 y silenciar por modelo.
- Hogar compartido: los avisos van solo al titular de los datos.
- Correo: solo a direcciones verificadas, como `TrialNoticeService`.
- Android no recibe Web Push (E.3): en el MVP no hay avisos externos con importe en la app de
  Play. Se dice en los ajustes: «En la app de Android, el aviso llega sin importe».

---

## K. Plan

### K.1 MVP (2 semanas, unos 9,5 días)

| #   | Bloque                                                                                                                                                                 | Días    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 0   | ~~Arreglar D2 y la pregunta de territorio para D1~~: hechos el 25-10-2026 (D1 con el cálculo del 8 %, no solo la protección)                                       | 0       |
| 1   | `tax-calendar.ts` (`TAX_CALENDARS` 2026 confirmado, 2027 sin confirmar; `deadlineOf`) y `tax-notices.ts` (`stageOf`, `decide`, redondeo), puros, con tests             | 1,5     |
| 2   | Migración 042, repositorios, exportación, borrado y limpieza                                                                                                           | 1       |
| 3   | Instantáneas en `TaxService.draft`, `PUT /business/estimates`, `GET /business/deadlines` con D.2-D.4, `filed`, `mutes`, ajustes; `TAX_ENGINE_VERSION` y test de huella | 2       |
| 4   | Tarjeta «Próximos plazos» con sus estados, es/en, accesibilidad, «Ver borrador» al paso, «Ya lo he presentado», silenciar, insignia y paso del tour                    | 2,5     |
| 5   | `TaxNoticeService` (push y correo, plantilla de correo es/en), job en `main.ts`, hoja «Activar avisos»                                                                 | 1,5     |
| 6   | Analítica, `docs/analitica.md`, `docs/fiscalidad/modelos.md` (columna App) y E2E                                                                                       | 0,5     |
|     | **Total**                                                                                                                                                              | **9,5** |

Calidad: frontend con Jest al 100 %, backend con sus umbrales (97/89/98/98), `tsc`, `eslint` y
`prettier` limpios.

### K.2 Fase 2 (unos 6 días) y fase 3

- **Fase 2**: modelo 100 (campaña confirmada, instantánea del dispositivo y fechas de
  `rentaCampaign.ts`), 2.º plazo de la Renta (pregunta «¿fraccionaste el pago?»), 131, «si
  procede» del 390/190/180/347, notificaciones locales de Android sin importe (ids 1101-1199) y
  después con importe, `tax_estimate_check`, recargo por presentar tarde con su porcentaje y
  fuente, y «en lo que va de trimestre» si el dueño lo quiere.
- **Fase 3**: cálculo en el servidor desde la copia de la cuenta (`buildInputs` compartido),
  push nativo (FCM) y festivos autonómicos.

### K.3 Tests con casos inventados comprobados con el motor

Cifras pasadas por `prepareDraft` el 25/10/2026 (en la columna «a mano», la cuenta). Todas las
ventas y compras van al 21 %. Retenciones soportadas: 300, 450 y 600 € (1T-3T). Directa
simplificada con difícil justificación. Sin rendimiento del año anterior.

| Caso | Datos                                                                       | A mano                                                                                                 | Motor                                                                                                               | Lo que debe decir el aviso                                                                      |
| ---- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| A1   | 1T: ingresos 6.000 €, gastos 1.000 € (bases)                                | 303: 1.260 − 210 = **1.050**. 130: (5.000 − 5 %) = 4.750; 20 % = 950; − 300 = **650**                  | 303 `pay` 1050; 130 `pay` 650                                                                                       | «unos 1.050 €» y «unos 650 €»; vence el 20-04-2026                                              |
| A2   | + 2T: 7.000 / 1.200                                                         | 303: 1.470 − 252 = **1.218**. 130: 10.800 − 540 = 10.260; 20 % = 2.052; − 650 − 750 = **652**          | `pay` 1218; `pay` 652                                                                                               | «unos 1.220 €» y «unos 650 €»                                                                   |
| A3   | + 3T: 8.000 / 1.500                                                         | 303: 1.680 − 315 = **1.365**. 130: 17.300 − 865 = 16.435; 20 % = 3.287; − 1.302 − 1.350 = **635**      | `pay` 1365; `pay` 635                                                                                               | T-7 = martes 13-10-2026: «Salen unos 1.370 € y 640 €… martes 20 de octubre»                     |
| B    | Solo 3T: ingresos 1.000, gastos 1.500; rendimiento del año anterior 8.000 € | 303: 210 − 315 = **−105** (a compensar). 130: neto negativo → 0; minoración 100 € (≤ 9.000) → **−100** | `offset` −105; `negative` −100                                                                                      | «Sale a compensar… quedan unos 110 €» (105 redondeado a la decena) y «Sale negativo: no pagas…» |
| C    | 4T 2026 sin movimientos del 4T (datos de A)                                 | 303: nada en el 4T → sin actividad. 130: 3.287 − 1.937 − 1.350 = **0**                                 | `noActivity` 0; `zero` 0; fechas 303/130/390 → 2027-02-01, 111/115 → 2027-01-20, 190 → 2027-02-01, 347 → 2027-03-01 | Pregunta «¿No facturaste nada…?» antes de dar «sin actividad»; fecha «sin confirmar»            |
| D    | 3T sin ningún dato                                                          | —                                                                                                      | `noActivity` / `zero`                                                                                               | **Sin importe**: `missing: ['income']`, nunca «sin actividad» sin preguntar                     |

Tests de reglas (sin motor):

- Calendario: 30-01-2027 (sábado) → 01-02-2027; 31-01-2027 (domingo) → 01-02-2027;
  28-02-2027 (domingo) → 01-03-2027; 2027 `confirmed: false` → avisos contra la nominal
  (T-7 del 4T = 23-01-2027) y sin domiciliación. Test de enero: falla si falta el año en curso
  confirmado después del 31 de enero.
- Madrid: un aviso de T-7 a las 23:30 UTC del 12-10 es del día 13 en Madrid. El cambio de
  horario del 25-10-2026 no repite ni salta la ventana de 9 a 13 h.
- Idempotencia: dos `run()` en la misma hora → un envío; sin canal entregado → `release` y se
  envía en la vuelta siguiente; dos procesos a la vez → un `claim` gana.
- Límites: plazo del 20-01 y del 01-02 en semanas distintas → dos avisos; tres plazos en la
  misma semana → el tercero solo en la app.
- D.2: cada condición sola apaga el importe con su estado (12 tests, uno por estado);
  `stale` por huella de movimientos y por `autonomo_data.version`; `verifiable = false` →
  tarjeta con cifra y push sin cifra.
- Plan: gratis → push `t7.plain`; Premium con `taxShowAmount = null` → `t7.plain`; Premium con
  `true` → `t7.amount`.
- Presentado: `filed130[2]` escrito → el 130 del 3T sale del mensaje, el 303 sigue.
- Textos: es/en con las mismas claves; ningún texto de aviso contiene «gestor», «exacto»,
  «garantizado» ni «NO CONFIRMADO» (test que recorre las claves `app.tax.*`).

---

## L. Preguntas para el dueño (con recomendación)

1. **¿Qué es gratis?** Recomiendo G: plazos, avisos en la app, importe en la tarjeta (el del
   propio borrador) y push/correo **con la fecha** gratis. Premium: el importe en el push y el
   correo, el T-2 y recalcular sin límite. La alternativa literal (importes y push solo
   Premium) vende más a corto plazo, pero deja sin aviso de plazo a quien no paga.
2. **¿Importe en la pantalla bloqueada?** Recomiendo preguntarlo al activar, sin opción
   marcada, y mientras no elija, solo la fecha. Es el gancho, pero es un dato fiscal a la vista
   de cualquiera.
3. **La cifra caduca y el gratis ya gastó su borrador del trimestre** (`autonomoDrafts: 1`). Hoy,
   quien preparó el borrador en septiembre no puede rehacerlo en octubre con el trimestre
   cerrado, y la tarjeta diría «vuelve a prepararlo» con el borrador bloqueado. Recomiendo que
   un borrador hecho **antes de terminar el trimestre** no cuente para el del plazo: un
   borrador gratis más tras el cierre.
4. **Discrepancias D1, D2 y D3**: resueltas el 25-10-2026 (ver C.4). El aviso del 130 ya puede
   llevar importe en Ceuta, Melilla y La Palma; `taxSpecialTerritory` sobra.
5. **¿Cifra «en lo que va de trimestre» durante el trimestre?** Recomiendo no en el MVP. Es una
   cifra que va a cambiar y no la podemos llamar estimación del modelo. Quizá en la fase 2,
   solo en la app y con su etiqueta.
6. **¿Correo en el MVP o solo push?** Recomiendo los dos (el correo llega también a quien usa
   Android, donde no hay Web Push). Si hay que recortar, quitar el correo ahorra 0,5 días.
