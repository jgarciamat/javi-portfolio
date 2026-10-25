# Diseño: «Comparador con gente parecida»

Estado: **solo diseño**, 25/10/2026. Nada de esto está implementado. Formato tomado de
[`dinero-perdido-y-fecha-meta.md`](./dinero-perdido-y-fecha-meta.md).

Todas las cifras de ejemplo son **inventadas** y se marcan así. Las cifras de fuentes públicas
**no se citan aquí**: hay que extraerlas y fecharlas al implementar (ver D.2). No se ha podido
consultar ninguna web en esta tarea; no se inventa ningún dato oficial.

---

## A. Valor y resumen

**Qué es.** Una frase y un gráfico sencillos dentro de la app: «Gastas un 18 % más en
suscripciones que tu grupo» o «Ahorras algo menos que la mayoría de hogares como el tuyo». La
comparación es con un **grupo anónimo y agregado**, nunca con personas concretas.

**Por qué es un gancho.** Responde a la pregunta que casi todo el mundo se hace («¿lo estoy
haciendo bien?») y da un motivo para completar los movimientos y la ficha. Es también la
función con más riesgo de privacidad del conjunto de ganchos y la que más depende de tener muchos
usuarios.

**La conclusión honesta, antes de nada:**

1. **Hoy no se puede hacer con datos propios.** Hay del orden de **40 usuarios verificados**. Con un
   mínimo de 50 por grupo (k-anonimato) **ni siquiera el grupo «todos» llega**, y menos por tramos de
   edad, comunidad o tipo de hogar. Publicar algo con 40 personas sería, además de poco fiable,
   **potencialmente reidentificable**.
2. **La app no tiene hoy los datos para formar grupos.** El usuario (`backend/src/domain/model/User.ts`)
   solo guarda correo, nombre, avatar y credenciales; `UserSettings.ts` no tiene edad, comunidad ni
   tipo de hogar. Habría que **pedirlos** (opcionales) y es un tratamiento de datos nuevo.
3. **Mientras no haya masa crítica, existe una alternativa útil y honesta:** comparar con **datos
   públicos agregados** (INE, Eurostat, Banco de España), siempre con su año y su fuente, y avisando
   de que es «el hogar medio español», no «gente como tú que usa Finanverso».

**Recomendación:** construir primero la versión con **datos públicos** (fase 1, sin riesgos de
reidentificación) y dejar la versión con **datos propios** apagada hasta que se cumplan las
condiciones de la sección J.

**Lo que NO hace.** No identifica a nadie, no enseña cifras de otros, no recomienda dónde gastar
menos («gastas más» no es «gasta menos»), no da consejos de inversión y no usa IA.

---

## B. Lo reutilizable del código (rutas reales)

| Pieza                                 | Ruta                                                                                                                                                                               | Qué aporta                                                                 | Cómo se usa                                                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Agregación de movimientos             | `summarize` en `backend/src/domain/services/summary.ts`                                                                                                                            | Totales y gasto por categoría                                              | Métrica «% del gasto por categoría» del usuario                                                                                               |
| Categorías                            | `DEFAULT_CATEGORIES` (18 nombres canónicos) en `backend/src/domain/model/Category.ts`; los usuarios pueden crear las suyas                                                         | Hay un conjunto común de categorías de sistema                             | Solo las categorías de sistema se comparan; las propias cuentan como «Otros» a efectos del grupo. **No existe una categoría «Suscripciones»** |
| Suscripciones y cobros que se repiten | `backend/src/domain/services/subscriptions.ts`, `money-leaks.ts` (`merchantKey`, cobros que se repiten, coste anual), `MoneyLeakService.ts`                                        | Coste anual de lo que se repite, ya calculado de forma determinista        | Métrica «suscripciones y cobros que se repiten, como % del gasto» sin comercios                                                               |
| Ahorro y salud                        | `summarize` (tipo `SAVING`), `healthScore` en `frontend/src/modules/finances/domain/health.ts`                                                                                     | Tasa de ahorro, nota                                                       | Métricas de ahorro                                                                                                                            |
| Pantalla donde vivirá                 | `frontend/src/modules/finances/ui/views/AnalysisView.tsx`; `navigation.ts`                                                                                                         | Tarjetas de análisis                                                       | Tarjeta «Comparativa» (D)                                                                                                                     |
| Ajustes y consentimientos             | `UserSettings.ts`, `application/settings/SettingsService.ts`, `PATCH /settings`; registro de aceptación de condiciones (migración 006, `docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md`) | Preferencias del usuario y patrón de interruptores opt-in (`weeklyDigest`) | Interruptor `comparatorOptIn` y ficha opcional                                                                                                |
| Hogar                                 | `HouseholdService`, `dataUserId` (`middleware.ts`)                                                                                                                                 | Tipo de hogar parcial: titular + miembro                                   | Pista del tipo «pareja», pero el usuario lo declara                                                                                           |
| Plan gratis/Premium                   | `PLAN_LIMITS`, `EntitlementService`, `plans.ts`                                                                                                                                    | Corte por función                                                          | Ver E                                                                                                                                         |
| Analítica                             | `TRACK_EVENTS` (`frontend/src/core/analytics.ts`), `CLIENT_FUNNEL_EVENTS`/`CLIENT_FUNNEL_DETAILS` (`backend/src/domain/ports/services.ts`), `funnel_daily`, `docs/analitica.md`    | Contadores anónimos                                                        | Eventos `cmp_*`                                                                                                                               |
| Exportación y borrado                 | `ExportService` (`finanverso-export` v3), `SqlitePersonalDataReader`                                                                                                               | Art. 20 y supresión                                                        | Ficha y consentimiento van en la exportación                                                                                                  |
| Tareas periódicas                     | `setInterval` en `backend/src/main.ts`                                                                                                                                             | Trabajos horarios idempotentes                                             | Trabajo **mensual** de recálculo de grupos (C.4)                                                                                              |
| Asesor IA                             | `AdviceService.buildContext` (`InsightsServices.ts`)                                                                                                                               | Ya solo envía cifras agregadas, nunca descripciones                        | **No se usa** aquí                                                                                                                            |
| Guías                                 | `frontend/src/modules/guides`                                                                                                                                                      | Páginas públicas y SEO                                                     | Una guía «Cómo se comparan tus gastos» (fase 1)                                                                                               |

Lo que **no existe** y hay que crear: la ficha opcional (edad por tramo, comunidad, tipo de hogar),
la tabla de contribuciones, el motor de cohortes, la carga de datos públicos con su fecha y fuente,
y la tarjeta. Nada de esto toca el flujo de movimientos.

---

## C. Diseño funcional: la versión con datos propios

### C.1 Qué se compara (métricas)

Siempre **proporciones**, no euros: así no se revela cuánto ganas ni gastas y se compara gente con
ingresos distintos.

| Métrica                  | Definición                                                   | Fuente en la app            |
| ------------------------ | ------------------------------------------------------------ | --------------------------- |
| Peso de una categoría    | gasto de la categoría de sistema / gasto total del periodo   | `summarize`                 |
| Peso de lo que se repite | coste de cobros que se repiten (`money-leaks`) / gasto total | `MoneyLeakService`          |
| Tasa de ahorro           | `SAVING` / ingresos                                          | `summarize`                 |
| Colchón (meses)          | liquidez / gasto mensual                                     | el cálculo de `healthScore` |

Se toma la **mediana de los 3 últimos meses cerrados** de cada usuario, solo si tiene movimientos
en al menos 2 de ellos y los ingresos cubren, al menos, el 60 % del gasto registrado (si no, los
datos están incompletos y falsean la comparación).

### C.2 Quién entra en el grupo (contribuir)

- **Opt-in explícito**: un interruptor, apagado por defecto, «Participar en la comparativa
  anónima». Sin él, el usuario no contribuye a ningún grupo.
- **Quien no contribuye, ¿ve la comparativa?** Recomendación: **sí, puede verla** (si hay datos
  públicos o grupo suficiente) pero no cuenta en los grupos. Contribuir es una opción para mejorar
  la calidad, no una condición para ver (evita un canje de datos por función). Ver K.
- **La ficha**: tres preguntas opcionales para formar grupos.
  1. Edad por tramos: menos de 30, 30-44, 45-59, 60 o más (4 tramos; no fecha de nacimiento).
  2. Tipo de hogar: vivo solo, en pareja, en pareja con hijos, solo con hijos, otro (5 opciones).
  3. Comunidad autónoma o ciudad autónoma, o «prefiero no decirlo».
     Se pueden dejar en blanco: sin ellas, la persona solo entra en el grupo «todos».

### C.3 K-anonimato y segmentos

- **K mínimo: 50 contribuyentes** en cada grupo mostrado (valor sugerido por el dueño). Para
  grupos que se publican junto con otros que difieren por una sola persona (ver C.5) se exige
  además un margen: se muestra solo si `n >= 50` **y** `n >= 50` también tras quitar a cualquier
  persona (siempre se cumple con n >= 51; por eso el umbral de publicación real es **51**).
- **Segmentos, de más fino a más grueso**: `edad x hogar x comunidad` -> `edad x hogar` -> `edad` ->
  `todos`. Se muestra **el más fino que cumple k** (y se dice cuál: «personas de 30 a 44 años que
  viven en pareja»). Si no llega el más fino, se baja de nivel; si ni «todos» llega, no se muestra
  comparativa de datos propios.
- **Comunidad**: solo se usa como segmento propio si hay 50 en esa comunidad **y** edad; en
  la práctica, hasta tener miles de usuarios, solo saldrán `todos`, `edad` y `edad x hogar`.
- **Fusión de cuerpos pequeños**: no se muestran grupos «Otros» ni tramos con n < 51; se funden
  con el vecino (comunidades pequeñas en «Otras comunidades»; hogares «otro» con «solo»).

Tabla de masa crítica (suponiendo contribuyentes repartidos de forma realista, no uniforme):

| Segmentos a mostrar                  | Cuántos contribuyentes hacen falta, aproximadamente     |
| ------------------------------------ | ------------------------------------------------------- |
| Solo «todos»                         | 51                                                      |
| `edad` (4 tramos)                    | ~200 (el tramo menor suele ser el más pequeño)          |
| `edad x hogar` (4 x 3 grupos útiles) | ~800-1.200                                              |
| `edad x hogar x comunidad`           | ~8.000 o más (no es un objetivo realista a corto plazo) |

Con **40 usuarios verificados** hoy, ni la primera fila se cumple. Aun asumiendo que todos
contribuyeran (no lo harán: el opt-in suele estar bajo el 30-50 %), habría 12-20 personas.

### C.4 Cálculo, ruido y redondeo

1. **Instantánea mensual, no en tiempo real.** El día 5 de cada mes se calcula una tabla
   `comparator_snapshots` con los grupos y sus cuantiles. Entre dos instantáneas no cambia nada,
   para que nadie deduzca los datos de un alta restando dos lecturas (ataque por diferencias).
2. **Una aportación por persona y métrica** (la mediana de 3 meses, C.1).
3. **Recorte de extremos**: se limita (winsorize) al percentil 5-95 del grupo antes de calcular, para
   que un valor atípico no sea reconocible.
4. **Lo que se publica**: P25, **mediana** y P75 de cada métrica por grupo, nunca el máximo ni el
   mínimo, nunca la lista de valores.
5. **Redondeo**: porcentajes a 1 punto (a 5 puntos para la tasa de ahorro, que es más sensible);
   el número de personas del grupo se publica como «más de 50» / «más de 100», nunca exacto.
6. **Ruido**: a cada cuantil se le suma ruido de Laplace con épsilon 1 (se fija con el abogado y un
   técnico de privacidad). Con n >= 51 el efecto es de décimas de punto; protege frente a
   diferencias residuales.
7. **Mínima variación publicada**: si la mediana cambia menos de 1 punto respecto de la instantánea
   anterior, se conserva el valor anterior.
8. **Determinismo**: el recálculo es una función pura `buildCohorts(contributions, seed)` con
   semilla del mes (para que el ruido sea reproducible en pruebas y no se pueda "volver a
   tirar" hasta ver el dato real).

La comparación del usuario es entonces: su valor (exacto) frente a la mediana del grupo (con
ruido y redondeo), expresada como «un 18 % más» o «parecido».

### C.5 Riesgo de reidentificación

| Ataque                                                                | Cómo se evita                                                                                                        |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Grupo pequeño: «el único de 60 o más en Cantabria»                    | k >= 51 y fusión de grupos pequeños                                                                                  |
| Diferencias: mirar el grupo antes y después de que se una un conocido | Instantánea mensual, ruido, no publicar n exacto                                                                     |
| Intersección de grupos (edad y hogar y comunidad)                     | Solo se muestra un segmento por vez (el más fino que cumple k)                                                       |
| Valor extremo reconocible                                             | Recorte P5-P95; solo cuantiles centrales                                                                             |
| Quien conoce a un contribuyente y a su ficha                          | Solo proporciones, redondeadas; sin euros ni comercios                                                               |
| Cruce con otros datos de la app (ranking, alias)                      | Nada de esto se enlaza con alias ni con retos; la tabla de contribuciones no guarda `user_id` visible en ninguna API |
| Hogar compartido (dos personas con los mismos datos)                  | Un hogar aporta una sola contribución (la del titular, `dataUserId`)                                                 |
| Cuentas falsas para manipular el grupo                                | Solo cuentan usuarios con correo verificado, con datos reales y actividad en 2 de los últimos 3 meses                |

Aun así, **es un tratamiento de datos financieros** y su evaluación de impacto (EIPD/DPIA) debe
hacerse antes de activar la versión con datos propios (H).

### C.6 Calidad con pocos usuarios: decirlo claro

- Nunca se muestra un grupo de datos propios con n < 51. En su lugar: «Todavía no hay suficientes
  personas para compararte de forma segura. Mientras tanto, te enseñamos datos públicos.»
- **Sesgo de selección**: quienes usan Finanverso y aportan datos no son un retrato de la población
  (más digitales, más interesados en ahorrar). La tarjeta debe decir: «Es el grupo de personas de
  Finanverso que participa, no toda España.»
- **Calidad de los datos**: depende de que cada persona registre todo; por eso la regla del 60 % de
  cobertura (C.1). Aun así, la comparativa es un orden de magnitud, no una medida.
- **Etiqueta de fiabilidad** visible: «Grupo grande» (n >= 200), «Grupo pequeño» (51-199), en cada
  comparación.

---

## D. La versión con datos públicos agregados (la que se puede hacer ya)

### D.1 Idea

«Los hogares españoles destinan de media un X % de su gasto a [grupo de gasto]. Tú destinas un Y %.»
Comparación **de proporciones** con un dato oficial fechado. Sin tocar datos de otros usuarios.

### D.2 Fuentes candidatas (a verificar, fechar y citar al implementar)

| Fuente                                                                           | Qué aporta                                                                                                                                                                                 | Granularidad                                       | Cautelas                                                                                                                                                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **INE, Encuesta de Presupuestos Familiares (EPF)**                               | Gasto medio por hogar y por persona, por grupos de gasto (clasificación COICOP), con desgloses por comunidad autónoma, tamaño y tipo de hogar y tramos de edad de la persona de referencia | Anual (se publica con unos meses de retraso)       | Es por **hogar**; incluye el **alquiler imputado** de la vivienda en propiedad (distorsiona el peso de la vivienda); los grupos COICOP no coinciden con las categorías de la app (ver D.3) |
| **Eurostat, Household Budget Survey y gasto de consumo de los hogares (COICOP)** | La misma idea comparable entre países de la UE                                                                                                                                             | Cada 5 años (HBS) y tablas anuales de contabilidad | Para «España frente a la UE», no para el usuario individual                                                                                                                                |
| **Banco de España, Encuesta Financiera de las Familias (EFF)**                   | Ahorro, deuda y patrimonio de las familias por tramos de renta y edad                                                                                                                      | Cada 3 años aproximadamente                        | Útil para tasa de ahorro y colchón; no para gasto por categoría                                                                                                                            |
| **INE, Encuesta de Condiciones de Vida**                                         | Capacidad para afrontar gastos imprevistos y renta                                                                                                                                         | Anual                                              | Contexto, no comparación de categorías                                                                                                                                                     |
| **INE, IPC**                                                                     | Evolución de precios                                                                                                                                                                       | Mensual                                            | Para ajustar un dato antiguo, no para comparar                                                                                                                                             |

**Regla de oro:** cada comparación enseña **la fuente, el año al que se refiere el dato y la fecha
en que Finanverso lo cargó** («Fuente: INE, Encuesta de Presupuestos Familiares {año}. Dato
cargado el {fecha}»). Nunca se muestra un dato oficial sin esa línea. Las cifras se guardan en un
archivo versionado (`backend/src/domain/data/comparator-public.json`) con `source`, `year`,
`loadedAt` y `url`, y un test que falla si falta alguno de esos campos.

### D.3 El problema de las categorías

La app tiene 18 categorías de sistema (más las propias) y COICOP tiene 12 grupos. La equivalencia
es aproximada:

| App (categoría de sistema) | Grupo COICOP aproximado                                                    | Calidad de la equivalencia |
| -------------------------- | -------------------------------------------------------------------------- | -------------------------- |
| Alimentación               | Alimentos y bebidas no alcohólicas                                         | Buena                      |
| Vivienda, Luz, Gas, Agua   | Vivienda, agua, electricidad, gas                                          | Media (alquiler imputado)  |
| Transporte                 | Transporte                                                                 | Buena                      |
| Salud                      | Salud                                                                      | Buena                      |
| Ocio                       | Ocio, espectáculos y cultura                                               | Media                      |
| Ropa                       | Vestido y calzado                                                          | Buena                      |
| Educación                  | Educación                                                                  | Buena                      |
| Tecnología                 | Información y comunicaciones (parte)                                       | Baja                       |
| Suscripciones              | **No existe como grupo oficial** (está repartida en ocio y comunicaciones) | No comparable              |

Consecuencia: **«Gastas un 18 % más en suscripciones que tu grupo» no se puede decir con datos
públicos.** Con datos públicos se pueden decir cosas como «Destinas un 23 % de tu gasto a Ocio;
los hogares españoles, un 8 %» (cifras de ejemplo, **inventadas**). La frase sobre suscripciones
solo es posible con datos propios (C.1, métrica «lo que se repite») y masa crítica.

Reglas: solo se compara una categoría si (1) hay equivalencia «Buena» o «Media», (2) los
movimientos del usuario cubren al menos el 60 % de sus ingresos (C.1), y (3) el usuario tiene al
menos 2 meses cerrados.

### D.4 Qué dice la tarjeta (versión pública)

- «Comparado con el hogar medio de tu comunidad (INE, {año})». Se usa la comunidad que la persona
  declare en la ficha (opcional); si no, el dato nacional.
- Siempre con la aclaración: «Es un promedio de todos los hogares, no de gente como tú. Tus gastos
  pueden ser distintos por buenas razones.»
- Nunca un juicio de valor («gastas demasiado»). Palabras neutras: «más», «menos», «parecido».
  Umbral de «parecido»: menos de 3 puntos de diferencia.

---

## E. Pantallas, textos y accesibilidad

### E.1 Tarjeta en Análisis (móvil 390 px)

```
+--------------------------------------+
| Tú frente a otros hogares            |
| Comparado con hogares de tu          |
| comunidad (INE 2023, datos públicos) |
|                                      |
| Ocio        Tú 23 %   Ellos 8 %      |
|             [barra tú ======]        |
|             [barra ellos ==]         |
| Alimentación  Tú 17 %  Ellos 19 %    |
|               parecido               |
|                                      |
| Es un promedio de todos los hogares. |
| Fuente: INE. Dato cargado el 5 nov.  |
| [ Cómo se calcula ]  [ Ajustes ]     |
+--------------------------------------+
```

### E.2 Ficha y consentimiento (versión con datos propios, fase 3)

```
+--------------------------------------+
| Compararte con gente parecida        |
| Tres preguntas, todas opcionales:    |
|  Tu edad:   ( ) Menos de 30 ( ) 30-44|
|             ( ) 45-59  ( ) 60 o más  |
|  Tu hogar:  ( ) Solo ( ) En pareja ... |
|  Tu comunidad: [ Elige... ]          |
| [ ] Quiero que mis datos, sin nombre |
|     y mezclados con los de al menos  |
|     50 personas, ayuden a la         |
|     comparativa.                     |
| Nunca se muestra tu información a otra|
| persona. Puedes retirarte cuando     |
| quieras en Ajustes.                  |
| [ Guardar ]   [ Ahora no ]           |
+--------------------------------------+
```

La casilla **no está marcada**. Guardar la ficha **no** activa la participación por sí solo.

### E.3 Textos exactos (es / en)

Claves bajo `app.compare.*`. Se limpian con `finanverso-ig-human` antes de entrar en los JSON.

| Clave                   | es                                                                                                                | en                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `title`                 | Tú frente a otros hogares                                                                                         | You compared to other households                                                                       |
| `titlePeers`            | Tú frente a gente parecida                                                                                        | You compared to people like you                                                                        |
| `publicSource`          | Comparado con hogares de {scope} (INE, {year}). Datos públicos.                                                   | Compared with households in {scope} (INE, {year}). Public data.                                        |
| `scopeNational`         | España                                                                                                            | Spain                                                                                                  |
| `scopeRegion`           | {region}                                                                                                          | {region}                                                                                               |
| `rowYou`                | Tú: {percent} %                                                                                                   | You: {percent}%                                                                                        |
| `rowThem`               | Ellos: {percent} %                                                                                                | Others: {percent}%                                                                                     |
| `more`                  | Un {diff} % más                                                                                                   | {diff}% more                                                                                           |
| `less`                  | Un {diff} % menos                                                                                                 | {diff}% less                                                                                           |
| `similar`               | Parecido                                                                                                          | Similar                                                                                                |
| `sentence.more`         | Destinas un {you} % de tu gasto a {category}; los hogares, un {them} %.                                           | You put {you}% of your spending into {category}; households put {them}%.                               |
| `sentence.peersMore`    | Gastas un {diff} % más en {category} que tu grupo.                                                                | You spend {diff}% more on {category} than your group.                                                  |
| `average`               | Es un promedio de todos los hogares, no de gente como tú. Tus gastos pueden ser distintos por buenas razones.     | It is an average of all households, not of people like you. Your spending may differ for good reasons. |
| `sourceLine`            | Fuente: {source}, {year}. Dato cargado el {date}.                                                                 | Source: {source}, {year}. Data loaded on {date}.                                                       |
| `group`                 | Grupo: {segment}                                                                                                  | Group: {segment}                                                                                       |
| `groupSize.large`       | Grupo grande                                                                                                      | Large group                                                                                            |
| `groupSize.small`       | Grupo pequeño: tómalo como una idea aproximada                                                                    | Small group: take it as a rough idea                                                                   |
| `bias`                  | Es el grupo de personas de Finanverso que participa, no toda España.                                              | It is the group of Finanverso people who take part, not all of Spain.                                  |
| `notEnough`             | Todavía no hay suficientes personas para compararte de forma segura. Mientras tanto, te enseñamos datos públicos. | There are not enough people yet to compare you safely. Meanwhile, we show you public data.             |
| `needData`              | Para compararte necesitamos al menos 2 meses de movimientos.                                                      | To compare you we need at least 2 months of movements.                                                 |
| `incomplete`            | Tus movimientos no cubren casi tus ingresos, así que la comparación no sería justa.                               | Your movements barely cover your income, so the comparison would not be fair.                          |
| `how`                   | Cómo se calcula                                                                                                   | How it is calculated                                                                                   |
| `consent.title`         | Compararte con gente parecida                                                                                     | Compare yourself with people like you                                                                  |
| `consent.age`           | Tu edad                                                                                                           | Your age                                                                                               |
| `consent.household`     | Tu hogar                                                                                                          | Your household                                                                                         |
| `consent.region`        | Tu comunidad                                                                                                      | Your region                                                                                            |
| `consent.skip`          | Prefiero no decirlo                                                                                               | I prefer not to say                                                                                    |
| `consent.check`         | Quiero que mis datos, sin nombre y mezclados con los de al menos 50 personas, ayuden a la comparativa.            | I want my data, without my name and mixed with that of at least 50 people, to help the comparison.     |
| `consent.never`         | Nunca se muestra tu información a otra persona. Puedes retirarte cuando quieras en Ajustes.                       | Your information is never shown to another person. You can withdraw at any time in Settings.           |
| `consent.save`          | Guardar                                                                                                           | Save                                                                                                   |
| `consent.later`         | Ahora no                                                                                                          | Not now                                                                                                |
| `settings.toggle`       | Participar en la comparativa anónima                                                                              | Take part in the anonymous comparison                                                                  |
| `settings.withdraw`     | Retirar mi participación                                                                                          | Withdraw my participation                                                                              |
| `settings.withdrawHint` | Dejarás de contar en los grupos desde el próximo cálculo mensual.                                                 | You will stop counting in the groups from the next monthly calculation.                                |
| `disclaimer`            | Orientativo. No es asesoramiento financiero.                                                                      | For guidance only. Not financial advice.                                                               |
| `error`                 | No hemos podido cargar la comparativa. Inténtalo de nuevo.                                                        | We could not load the comparison. Please try again.                                                    |

### E.4 Estados

| Estado                    | Qué ve                                    |
| ------------------------- | ----------------------------------------- |
| Carga                     | Esqueleto de 3 filas, `aria-busy="true"`  |
| Pocos datos propios       | `needData` + «Importar mi extracto»       |
| Datos incompletos         | `incomplete`                              |
| Grupo sin masa crítica    | `notEnough` y los datos públicos          |
| Versión pública           | Tarjeta de E.1                            |
| Versión con datos propios | Tarjeta con `group`, `groupSize` y `bias` |
| Sin conexión              | Último valor cargado + `OfflineBanner`    |
| Error                     | `error` + «Reintentar»                    |

### E.5 Accesibilidad para mayores

- Botones de **48 x 48 px** con texto; texto base 16 px; todo en `rem`; sin cortes al 200 %.
- Cada fila es una frase completa legible por el lector de pantalla: «Ocio: tú un 23 por ciento,
  los hogares un 8 por ciento, un tanto más alto». Las barras son decorativas (`aria-hidden`).
- La diferencia nunca se indica solo por color (flecha y palabra «más»/«menos»/«parecido»).
- Contraste >= 4,5:1 y 7:1 en la cifra principal; Contraste de la app (`wiz-contrast`).
- Sin jerga: «porcentaje de lo que gastas», nunca «cuantil» ni «k-anonimato» en pantalla. «Cómo se
  calcula» lo explica en tres frases.
- La ficha tiene siempre «Prefiero no decirlo» y no es necesaria para ver los datos públicos.

---

## F. Gratis frente a Premium

Principio: lo que se comparte con la comunidad (contribuir) es voluntario y gratuito; Premium da
más categorías y más detalle, no acceso a la privacidad.

|                                                                              | Gratis                              | Premium                 |
| ---------------------------------------------------------------------------- | ----------------------------------- | ----------------------- |
| Comparativa con datos públicos: 3 categorías (la mayor, la segunda y ahorro) | Sí                                  | Sí                      |
| Todas las categorías comparables (datos públicos)                            | No                                  | Sí                      |
| Elegir comunidad en la comparativa pública                                   | Sí                                  | Sí                      |
| Comparativa con datos propios (cuando exista)                                | La métrica «Ahorro» y una categoría | Todas                   |
| Contribuir al grupo (opt-in)                                                 | Sí                                  | Sí                      |
| Histórico de cómo has cambiado frente al grupo                               | No                                  | Sí (solo vista privada) |

Comprobación en servidor con `entitlements.limits(userId).features.insights` (la función de
análisis), sin `PremiumFeature` nuevo. El número de categorías gratis es una constante
`FREE_COMPARE_SHOWN = 3` en `plans.ts`, como `FREE_LEAKS_SHOWN`.

---

## G. Datos y API mínimos

### G.1 Fase 1 (datos públicos): sin datos personales nuevos

- Archivo versionado `backend/src/domain/data/comparator-public.json` (fuente, año, URL, fecha de
  carga, y por comunidad el peso de cada grupo de gasto).
- `GET /stats/compare` (autenticado, `dataUserId`): devuelve, por categoría comparable, el peso
  del usuario, el peso público, la diferencia y la fuente con su año. **Calculado en el servidor,
  determinista**; no guarda nada.
- Si el usuario declaró comunidad (fase 2), se pide como parámetro opcional `region` (no se guarda
  nada en el servidor en fase 1: se pide al cliente y se guarda en `localStorage`).

### G.2 Fase 3 (datos propios): migración 04x, aditiva

```
comparator_profile(user_id PK -> users ON DELETE CASCADE, age_band, household, region,
                   opt_in INTEGER, consent_at, consent_version)
comparator_contrib(user_id -> users ON DELETE CASCADE, period 'YYYY-MM',
                   metric, value_x1000 INTEGER, PRIMARY KEY(user_id, period, metric))
comparator_snapshots(period, segment_key, metric, n_bucket, p25, p50, p75, computed_at)
```

- `comparator_snapshots` **no guarda ninguna referencia a usuarios**. Las contribuciones sí
  (hace falta para retirarse y borrarlas), pero ninguna API las devuelve.
- Retirar el consentimiento borra `comparator_contrib` y `comparator_profile` en el acto; la
  instantánea ya calculada es anónima y se conserva hasta que se recalcule sin esa persona.
- Los endpoints: `GET/PUT/DELETE /settings/comparator` (ficha y opt-in; el `DELETE` retira y
  borra), `GET /stats/compare` (amplía el anterior con `peers` si hay grupo con k).

---

## H. Privacidad y legal

- **Fase 1 (datos públicos):** no se trata ningún dato personal nuevo. Solo se compara un dato del
  propio usuario con un dato público. Base: ejecución del servicio. Sin consentimiento adicional.
- **Fase 3 (datos propios):**
  - Es un **tratamiento con otra finalidad** (estadística propia) sobre **datos financieros**. No son
    «categorías especiales» del art. 9 RGPD, pero son sensibles en la práctica.
  - **Base recomendada: consentimiento** (art. 6.1.a), explícito, desagregado, retirable y sin
    condicionar el servicio. La alternativa, el **interés legítimo** (art. 6.1.f), exigiría una
    ponderación y un derecho de oposición bien visible, y es más difícil de defender si algo sale
    mal; no se recomienda.
  - **Anonimización:** la salida (cuantiles de grupos grandes con ruido) puede considerarse
    anónima, pero el **proceso** de agregar datos personales sigue siendo un tratamiento y necesita
    base e información. Referencia técnica: el dictamen 05/2014 del Grupo de Trabajo del Artículo 29
    sobre técnicas de anonimización y las orientaciones de la AEPD sobre anonimización (a
    confirmar con el abogado, que debe verificar su vigencia).
  - **EIPD/DPIA recomendada** antes de activar: financiero + perfilado agregado.
  - **Ficha (edad por tramos, hogar, comunidad):** minimización: tramos, no fecha; «Prefiero no
    decirlo»; se borra con la retirada o la cuenta.
  - **Información:** actualizar la política (`app.privacy.*`) con finalidad, base, qué se agrega,
    cuánto, k, plazo y cómo retirarse. Propuesta en `docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md`.
  - **Menores:** la app admite desde 14 años y no guarda la edad; con tramo «menos de 30» podrían
    entrar menores de edad. Pasar por el abogado si se exige un mínimo (p. ej. 16 o 18) para el
    consentimiento de esta función.
  - **Conservación:** contribuciones, mientras haya consentimiento (y máximo 3 meses de historia);
    instantáneas, 24 meses.
  - **Exportación:** ficha y consentimiento en `finanverso-export`; las contribuciones también.
- **Fuentes públicas:** son datos estadísticos oficiales de reutilización. Hay que **citar la
  fuente** y respetar sus condiciones de uso (a revisar al cargar cada tabla).
- **IA:** no interviene.

---

## I. Riesgos

| Riesgo                                                                      | Prob.                  | Impacto          | Mitigación                                                                                                              |
| --------------------------------------------------------------------------- | ---------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Reidentificación en la versión con datos propios                            | Media                  | Muy alto         | k >= 51, instantánea mensual, ruido, recorte P5-P95, sin euros ni comercios, EIPD; **no activar** hasta la masa crítica |
| Comparar con 40 usuarios sin decirlo (cifras sin valor)                     | Alta si se lanzara hoy | Alto (confianza) | Bloqueo duro por k; mensaje `notEnough`                                                                                 |
| Equivalencia de categorías engañosa (alquiler imputado, tecnología)         | Alta                   | Medio            | Solo categorías con equivalencia buena/media; avisos; cobertura del 60 %                                                |
| Mensaje que sienta mal («gastas más»)                                       | Media                  | Medio            | Palabras neutras, «por buenas razones», umbral de «parecido» de 3 puntos                                                |
| Datos públicos desfasados                                                   | Alta                   | Bajo             | Año y fecha de carga visibles; test de metadatos; revisión anual                                                        |
| Sesgo de la muestra propia                                                  | Alta                   | Medio            | Etiqueta `bias`; el grupo «Finanverso» no se presenta como «España»                                                     |
| Coste del consentimiento (poca gente contribuye)                            | Alta                   | Medio            | Mostrar la comparativa pública a todos; contribuir es voluntario                                                        |
| Retirada del consentimiento no efectiva                                     | Baja                   | Alto             | Borrado inmediato de contribuciones; la instantánea ya es anónima                                                       |
| Menores                                                                     | Baja                   | Medio            | Consulta al abogado; sin fecha de nacimiento                                                                            |
| Trabajo mensual no determinista                                             | Baja                   | Medio            | Función pura con semilla del mes, tests                                                                                 |
| Promesa implícita ("lo estás haciendo mal") interpretada como asesoramiento | Media                  | Medio            | `disclaimer` visible, sin recomendaciones                                                                               |

---

## J. Fases, esfuerzo y cuándo empezar

| Fase                                  | Contenido                                                                                                                                                                                                                                                                                                                                                                     | Días  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **MVP (recomendado): datos públicos** | Archivo versionado con 3-5 fuentes fechadas y test de metadatos (1,5); `compare.ts` puro con equivalencia de categorías y reglas D.3 (1,5); `GET /stats/compare` (0,5); tarjeta en Análisis con estados, accesibilidad y textos es/en (2); selector de comunidad en `localStorage` (0,5); eventos (0,5); guía pública «Cómo se comparan tus gastos» (0,5); tests al 100 % (1) | **8** |
| Fase 2                                | Ficha y opt-in sin publicar nada (para empezar a reunir masa crítica y probar el consentimiento): migración, ajustes, borrado, exportación (3); texto legal (0,5 del dueño)                                                                                                                                                                                                   | 3,5   |
| Fase 3                                | Motor de cohortes (`buildCohorts`), instantáneas mensuales, ruido, tests de reidentificación, tarjeta con datos propios, EIPD                                                                                                                                                                                                                                                 | 10-12 |

### Cuándo empezar

| Hito                                                       | Recomendación                                                                                                                            |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Ahora (~40 verificados)                                    | **Solo el MVP con datos públicos**, y solo si el dueño lo quiere como gancho de contenido (no depende de usuarios). No empezar la fase 3 |
| ~300 usuarios activos con datos, opt-ins por encima de 100 | Empezar la fase 2 (recoger ficha y consentimiento) para medir cuánta gente contribuye                                                    |
| >= 51 contribuyentes en «todos»                            | Publicar solo «todos» con la etiqueta de grupo pequeño (opcional)                                                                        |
| ~800-1.200 contribuyentes                                  | Activar `edad x hogar`                                                                                                                   |
| 5.000 o más                                                | Valorar comunidad                                                                                                                        |

Consecuencia: **la versión con datos propios no debería estar en el calendario de 2026**. Los
datos públicos pueden ayudar a captar usuarios durante 2027 mientras crece la base.

---

## K. Preguntas abiertas (máx. 5)

1. **¿Se construye ahora el MVP con datos públicos?** Recomendación: **sí, si hay hueco**
   (8 días, sin riesgo legal), pero detrás del Resumen del año y del reto de ahorro por orden de valor
   (ver `RESUMEN-GANCHOS.md`). La frase «en suscripciones» queda fuera hasta tener datos propios.
2. **¿Ver la comparativa exige contribuir?** Recomendación: **no**. Verla es gratis para todos; contribuir
   es voluntario. Condicionar una función a ceder datos complica la base legal del consentimiento.
3. **¿Consentimiento o interés legítimo?** Recomendación: **consentimiento explícito**, con EIPD
   previa. A confirmar con el abogado.
4. **¿K = 50 es suficiente?** Recomendación: publicar con **n >= 51** más ruido y redondeo; para la
   tasa de ahorro, subir a **n >= 100**. Decisión final con asesoramiento de privacidad.
5. **¿Qué datos públicos se cargan primero?** Recomendación: **INE EPF por comunidad y grupo de gasto**
   (alimentación, vivienda, transporte, ocio) más **ahorro de la EFF** del Banco de España; Eurostat
   solo si se quiere una comparación con la UE. Quién los revisa: el agente `gestor-fiscal` o el
   dueño, con la fecha de cada tabla.
