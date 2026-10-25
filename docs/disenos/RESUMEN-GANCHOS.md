# Resumen de ganchos de crecimiento y retención

Estado: 25/10/2026. Solo diseño. Compara los ganchos pendientes y propone el orden de construcción.

| #   | Gancho                                 | Documento                                                                | Estado                                                                                    |
| --- | -------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1   | Tu dinero perdido                      | [`dinero-perdido-y-fecha-meta.md`](./dinero-perdido-y-fecha-meta.md)     | Implementado (MVP, 25/10/2026)                                                            |
| 2   | La fecha de tu meta                    | el mismo                                                                 | Implementado (MVP)                                                                        |
| 3   | Avisos fiscales                        | diseño de **otro agente** (no está en `develop` al escribir esto)        | Pendiente; las celdas de esta fila son **estimaciones mías**, a corregir con su documento |
| 4   | Resumen del año (Wrapped)              | [`resumen-del-anio-wrapped.md`](./resumen-del-anio-wrapped.md)           | Pendiente                                                                                 |
| 5   | Reto de ahorro con amigos              | [`reto-de-ahorro-con-amigos.md`](./reto-de-ahorro-con-amigos.md)         | Pendiente                                                                                 |
| 6   | Comparador con gente parecida          | [`comparador-con-gente-parecida.md`](./comparador-con-gente-parecida.md) | Pendiente                                                                                 |
| 7   | Revisión de nómina y factura de la luz | [`revision-nomina-y-factura-luz.md`](./revision-nomina-y-factura-luz.md) | Pendiente                                                                                 |

---

## Tabla comparativa de los 5 ganchos pendientes

Escalas: valor, riesgo y dependencia de usuarios van de **Bajo / Medio / Alto**. El esfuerzo es el
del MVP recomendado, en días de trabajo con tests al 100 %.

| Gancho                                            | Valor (crecimiento y retención)                                                                                                                                                                             | Esfuerzo del MVP                                                           | Riesgo (técnico, legal, de marca)                                                                                                                                                                                                | Dependencia de masa crítica de usuarios                                                                                                                     | Mejor momento del año                                                                                           | Orden recomendado                                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **4. Resumen del año**                            | **Alto**: único momento del año en que la gente comparte su balance sin que se lo pidan; la imagen lleva la marca y un enlace con UTM y código de invitación. Retención: obliga a tener los 12 meses al día | **8 días** (fase 2: +4; fase 3: +5,5)                                      | **Bajo-medio**: privacidad de la imagen (se resuelve con nivel genérico por defecto); `healthScore` y los retos solo existen en el navegador (se resuelve portando la nota en la fase 2 y derivando la racha de los movimientos) | **Baja**: se calcula con los datos de cada persona; con 40 usuarios funciona (solo el efecto viral es pequeño)                                              | **15 de diciembre a 31 de enero** (cierre de año y propósitos de enero)                                         | **1.º (plazo fijo: 15-dic)**                                                                        |
| **3. Avisos fiscales** (estimación)               | **Alto** en retención: plazos que no se pueden olvidar (trimestrales de autónomos, Renta); poco viral                                                                                                       | A ver en su documento (estimo 5-8 días con lo que ya hay de plazos y push) | **Medio**: exactitud de fechas y avisar de obligaciones sin dar asesoramiento                                                                                                                                                    | **Baja**                                                                                                                                                    | **Antes del 20 de enero** (4.º trimestre, autónomos), **abril-junio** (Renta), 20 de abril/julio/octubre        | **2.º** (arrancar en cuanto acabe el 4; primer plazo útil: enero)                                   |
| **7. Revisión de nómina** (MVP reducido, sin PDF) | **Medio-alto**: útil el mismo día, abre la puerta a la Renta, genera confianza; casi no se comparte                                                                                                         | **5 días** (PDF de texto +5; OCR +3; luz +8-10 en 2027)                    | **Medio**: falsos positivos y lenguaje (mitigado con tres estados y «orientativo»); reglas validadas por `gestor-fiscal`; solo datos de 2026 hasta cargar 2027                                                                   | **Ninguna**                                                                                                                                                 | **Enero** (nueva nómina con tipos y bases nuevos) y **abril-junio** (campaña de la Renta); la luz: invierno     | **3.º** (hacerlo en diciembre para tenerlo en la primera nómina de 2027)                            |
| **5. Reto de ahorro con amigos**                  | **Alto** en crecimiento si el grupo trae gente (reutiliza «Invita a un amigo»); retención por el ritmo mensual                                                                                              | **12 días** (mínimo recortado: 8)                                          | **Medio-alto**: privacidad del % de avance entre amigos (consentimiento, redondeo), hogar, menores; sin premios con valor para evitar el régimen de concursos                                                                    | **Media-baja**: funciona con 2 personas, pero necesita una base de gente dispuesta a invitar; con ~40 usuarios el efecto es limitado                        | **1 de enero** (propósitos) y **septiembre** (vuelta a la rutina); empezar el reto siempre el día 1 del mes     | **4.º** (construir en diciembre-enero para lanzar el reto de febrero; o el de enero si se adelanta) |
| **6. Comparador con gente parecida**              | **Medio** con datos públicos (curiosidad, menos viral); **Alto** con datos propios, pero no es posible hoy                                                                                                  | **8 días** con datos públicos (+3,5 ficha y opt-in; +10-12 datos propios)  | **Alto con datos propios** (reidentificación, base legal, EIPD); **Medio con públicos** (equivalencia de categorías, datos con fecha)                                                                                            | **Muy alta** para datos propios (>= 51 por grupo; 800-1.200 contribuyentes para edad x hogar); **ninguna** para datos públicos. Hoy ~40 usuarios: imposible | Datos públicos: cualquier época, mejor con la **Renta** o en **septiembre**; datos propios: no antes de 2027-28 | **5.º y último**; solo la versión con datos públicos, y solo si sobra hueco                         |

---

## Orden recomendado y calendario

Hoy es 25 de octubre de 2026.

| Orden | Gancho                              | Cuándo empezar                        | Hito                                      | Por qué en este orden                                                                                                                                       |
| ----- | ----------------------------------- | ------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Resumen del año (4)                 | **Antes del 15 de noviembre**         | Disponible el 15-dic                      | Tiene fecha fija y no se puede retrasar sin perder la ventana; casi no depende de otros                                                                     |
| 2     | Avisos fiscales (3)                 | Al acabar el 4 (finales de noviembre) | Antes del **20 de enero** (4.º trimestre) | Su primera ventana útil es enero; el diseño es de otro agente: ver su documento                                                                             |
| 3     | Nómina, MVP reducido (7)            | Diciembre                             | Antes de la primera nómina de 2027        | 5 días, sin dependencias; necesita los datos de 2027 de `payroll2027.ts` (revisión de `gestor-fiscal` en cuanto se publique la orden de cotización del año) |
| 4     | Reto de ahorro con amigos (5)       | Diciembre-enero                       | Reto de febrero (o de enero si hay prisa) | Necesita al menos que el Resumen del año haya movido invitaciones; reutiliza la nota y los retos portados al servidor                                       |
| 5     | Comparador (6), solo datos públicos | Cuando sobre hueco (primavera)        | Dato público con su fuente y fecha        | Es el que menos se comparte y el único que depende de volumen para la versión buena                                                                         |

**Total aproximado de los cuatro primeros:** 8 + (a ver) + 5 + 12 = 25 días más lo del 3.

### Lo que se puede ahorrar construyendo en este orden

- **Porte de `healthScore` y `challengeProgress` al backend** (`backend/src/domain/services/health.ts`):
  lo necesitan el Resumen del año (fase 2) y el reto de ahorro (fase 2). Hacerlo una vez, con test de
  paridad y fixtures compartidos. 1,5 días.
- **Módulo común de alias** (`backend/src/domain/services/alias.ts`, extraído de `crypto-season.ts`):
  el reto de ahorro lo necesita; la consola lo sigue usando sin cambios. 0,5 días.
- **Estado de los retos en el servidor** (hoy solo en `localStorage`): el reto de ahorro lo crea y
  el Resumen del año lo aprovecha en su fase 2.
- **Enlaces con UTM e invitación**: el Resumen y el reto usan el mismo formato
  (`?ref=CODIGO&utm_source=...&utm_campaign=...`) y la misma lista cerrada de eventos de
  `funnel_daily`.
- **Compartir imagen**: el Resumen generaliza `recapImage`/`shareImage`; el reto y el cierre del
  año reutilizan ese módulo.
- **Datos oficiales con fuente y fecha**: la nómina (`payroll2026.ts`) y el comparador público siguen
  el mismo patrón; conviene una convención común (`source`, `year`, `loadedAt`, `url`) y un test que
  falle si falta.

### Riesgos transversales

1. **Cobertura de datos reales.** Resumen del año, reto y comparador dan mejores resultados si el
   usuario importa todos sus movimientos. La importación (y el límite de 1 importación en el plan
   gratis, `imports: 1` en `plans.ts`) puede quedarse corta para esto: **a revisar con el dueño**
   antes de lanzar el Resumen del año (un resumen anual con un solo extracto sería pobre).
2. **Privacidad acumulada.** Cuatro funciones nuevas dan más motivos para compartir; las que muestran
   algo a otras personas (Resumen compartido y reto) son las que hay que pasar por el abogado. La
   nómina y el comparador de datos públicos no sacan datos del dispositivo o del usuario.
3. **Tono.** Ninguna función da consejos de inversión ni asesoramiento: todas llevan «Orientativo» y
   usan palabras neutras («más», «menos», «parecido»), sin presión (`wording.test.ts` en cada una).
4. **Masa crítica.** Solo el comparador con datos propios depende de ella de verdad; el reto la
   necesita en versión suave (gente que invite). Con ~40 usuarios verificados hoy, lo que más
   importa es que los ganchos **traigan gente nueva** (Resumen y reto) antes de los que la
   **necesitan** (comparador).
5. **Capacidad.** Con la carga de 2026 (ranking de la consola, Renta, autónomos), el calendario anterior
   exige no abrir más frentes; cada gancho debe cerrar con tests al 100 % antes del siguiente.

### Qué decidir ahora (las 5 más importantes de los cinco documentos)

1. **Resumen del año:** ¿completo y gratis (recomendado) y nivel genérico por defecto?
2. **Reto de ahorro:** ¿sin ningún premio con valor, solo insignias (recomendado)?
3. **Comparador:** ¿solo datos públicos hasta tener >= 800 contribuyentes (recomendado)?
4. **Nómina:** ¿MVP reducido con campos manuales y todo en el dispositivo, sin IA externa (recomendado)?
5. **Importación en el plan gratis:** ¿se amplía el límite de importaciones para que el Resumen del
   año no salga pobre? (decisión del dueño, fuera de estos diseños).
