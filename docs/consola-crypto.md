# Consola crypto

Sección del menú **Aprender** para aprender a operar con criptomonedas con **dinero ficticio** y
ver si se habría ganado o perdido. Es un simulador educativo: nunca opera con dinero real, no da
señales, predicciones ni recomendaciones y no enlaza a exchanges ni a afiliados. Disponible en
todos los planes.

## Qué se copió del proyecto de cripto del dueño (solo conceptos)

Del frontend del proyecto privado se tomaron **ideas de interfaz**, no código del motor:

- La gráfica de velas con **TradingView Lightweight Charts** (misma librería, v5.2.1): velas y
  volumen, marcos de 5 min a 1 semana, arrastrar, rueda o pellizco para ampliar, «Lo más reciente»,
  «Ver todo», pantalla completa, lectura de la vela señalada y líneas de precio de las posiciones.
- La disposición: columna de monedas con icono, nombre, par y variación; cabecera con la moneda y
  el precio, cambio del periodo visible, caja con mejor oferta de compra y venta (bid/ask), volumen
  de 24 h y hora de actualización; temporalidades arriba; cuenta atrás del cierre de la vela;
  botones-chip para las capas.
- La caja de operar: franjas de capital inicial, disponible, reservado, resultado no realizado y
  patrimonio; dirección **Toros · Long / Osos · Short**; tipo de orden; capital por operación con
  atajos de 25/50/75/100 %; precio de entrada automático a mercado; take profit y stop loss;
  paneles de abiertas, pendientes y cerradas.

## Qué se dejó fuera a propósito

- Todo el motor: estrategias, señales, «campeones», puntuaciones, admisión, FVG, order blocks,
  barridos de liquidez, patrones automáticos, proyección «sombra», «Sugerir TP/SL», autopsia de
  pérdidas, «Exportar muestra global JSON» y el «Reiniciar» global del motor.
- Carteras y ejecución reales (Solana/Phantom, Jupiter, Hyperliquid), WebSocket directo a Binance
  desde el navegador, claves, `.env`, datos y configuración privada.
- **Apalancamiento**: no se implementa. Solo se explica en la guía (qué es, por qué multiplica
  ganancias y pérdidas, liquidación) y se dice que Finanverso no lo ofrece. Siempre **1x**.

## Escala compacta (estilo terminal)

- Tipografía de la consola a 14 px de base; etiquetas a 12 px (mínimo), valores a 14 px; precio
  principal con `clamp()` (24 px en el móvil, 36 px en escritorio). Controles compactos con ratón
  (26-28 px) y de **32 px como mínimo** en el móvil o con pantalla táctil (`pointer: coarse`).
- **Monedas**: todas las que da el backend, en **páginas** en escritorio. La columna es tan alta
  como el precio y la gráfica (`contain: size` en la rejilla) y **sin scroll interno**: se mide su
  alto y el de una fila (44 px, con 6 px de aire entre filas) y cada página lleva solo las filas
  **enteras** que caben (`rowsThatFit` en `ui/CoinList.tsx`; se vuelve a medir con
  `ResizeObserver` y al cambiar el tamaño de la ventana; 8 filas hasta medir). Si hay más monedas
  que filas aparecen «Ant.» y «Sig.» pequeños con «1 / 2» (mínimo 2 páginas); se abre en la página
  de la moneda elegida. En el móvil y en horizontal, todas en una fila deslizable, con la elegida
  centrada sin mover la página.
- **Cabecera**: precio, cambio de 24 h y del periodo visible a la izquierda; temporalidades
  (5 min … 1 sem.) y «€ EUR | $ USD» como botoncitos en la misma fila a la derecha; debajo, **una
  fila** de celdas con bid, ask, máx./mín./volumen de 24 h y actualizado (3 por fila en el móvil).
- **Vela**: «Ap. / Máx. / Mín. / Cie. / Vol.» en una línea pequeña (nombre completo al pasar el
  ratón, `<abbr>`) y una pastilla con la cuenta atrás del cierre y las **velas a la vista**.
- **Zoom**: barra pequeña bajo la gráfica con iconos: «− Alejar», «+ Acercar», «Reciente» (rango
  lógico de las últimas 90 velas), «Todo» (`fitContent`) y «Pantalla completa»; cada botón lleva
  su atajo en `title` y `aria-keyshortcuts` (−, +, Fin, Inicio; Esc para salir).
- **Capas**: chips pequeños (12 px, 24 px de alto con ratón) **justo encima de la gráfica**, en
  el sitio de la antigua leyenda, uno junto a otro en una barra que se ajusta a varias líneas (en
  horizontal, fila deslizable): rayita del color de la capa, nombre corto en versalitas
  (EMA 20, EMA 50, EMA 200, Bollinger, VWAP, Perfil vol., Sop./Resist., Fibonacci) y
  `aria-pressed`. Al pulsarlo la capa se dibuja y el chip queda marcado con borde y fondo de su
  color; si la capa tiene un solo valor lo lleva dentro en pequeño («EMA 50 · 93,70 €») y si tiene
  varios van en el `title` y en texto para lectores de pantalla. Sin etiquetas de grupo, sin «?»
  en cada chip, sin leyenda aparte ni frase larga al lado. Al final de la barra, el botón de
  acento pequeño **«Aprende antes de jugar»** (la frase «Son herramientas para aprender…» queda
  en su `title` y como subtítulo del panel). La barra de capas grande de debajo de la gráfica
  desaparece.
- **Tabla de velas**: «Ver las últimas 30 velas en una tabla» es un enlace pequeño (12 px, sin
  negrita) al pie del bloque de la gráfica, cerrado por defecto.
- Resumen de cartera, caja de operar, paneles y tabla usan la misma escala (celdas de 12/16 px,
  campos de 40 px, botón de abrir de 44 px).

## Datos de mercado

- **Fuente**: datos públicos de Binance, sin clave ni cuenta (`data-api.binance.vision` y, si
  falla, `api.binance.com`). Las 20 monedas tienen **par real en EUR**: no hay conversión.
- **Proxy en el backend** (`/api/crypto/coins` y `/api/crypto/candles`, con sesión): el navegador
  nunca llama a terceros (la CSP no cambia). Caché compartida de 15 s a 10 min según el marco, una
  sola petición aunque muchas pantallas pidan a la vez; 1.000 velas por serie, 500 a la gráfica.
  `/crypto/coins` incluye **bid, ask y volumen de 24 h en euros** del ticker público.
- Si la fuente cae se sirve la última copia (hasta 6 h) marcada «con retraso»; sin copia, 503
  `MARKET_UNAVAILABLE` y la pantalla lo explica con «Reintentar».
- `CRYPTO_MARKET=demo` inventa precios suaves y deterministas para desarrollo y E2E (sin
  Internet). En producción se fuerza la fuente real.

## Moneda de visualización (EUR / USD)

- Control «€ EUR | $ USD» junto a las temporalidades. El simulador **sigue en euros**; los dólares
  son una **conversión de visualización** con el cambio del BCE del día (el `/api/rates` que ya usa
  la app), con el aviso «Conversión informativa al cambio del BCE de hoy; el simulador usa euros».
  Sin cambio disponible se muestra en euros con un aviso.
- Todo pasa por `frontend/src/modules/crypto/domain/currency.ts` y `format.ts`: precios, gráfica y
  capas (se convierten las velas), cabecera, bid/ask, volumen, monedas, caja de operar, cartera,
  paneles e informe Premium de temporada (cabeceras con € o $). Lo tecleado en dólares se pasa a euros antes de
  enviarlo (importes al céntimo, precios sin redondear), con tests de ida y vuelta.
- Preferencia por dispositivo en `mm_crypto_currency`; la primera vez, la moneda de la app.

## Capas de la gráfica (solo visualización didáctica)

Funciones puras (`domain/indicators.ts` y `domain/layers.ts`) sobre las velas cargadas: **EMA 20,
50 y 200**, **Bandas de Bollinger (20, 2)**, **VWAP** (desde la primera vela cargada), **perfil de
volumen** (POC, VAH y VAL de las velas en pantalla, zona de valor del 70 %), **soportes y
resistencias** (giros con 3 velas a cada lado, agrupados al 0,5 %, hasta 3 de cada) y
**Fibonacci** (0 a 100 % del último tramo alto-bajo visible). Cada capa: chip con
`aria-pressed`, su color, su valor (dentro del chip o en el `title`) y preferencia en
`mm_crypto_layers`. Nada de flechas, señales ni proyecciones.

## Panel «Aprende antes de jugar»

Ya no es un modal: es un **panel desplegable** bajo la gráfica (`ui/Learn.tsx`, `css/Learn.css`)
con el título grande «Antes de empezar a jugar, aprende todo sobre el análisis de
criptomonedas». Se abre y se cierra con el botón «Aprende antes de jugar» de la barra de capas
(`aria-expanded`, `aria-controls="cc-learn"`), con su botón «Cerrar» o con **Esc** (el foco vuelve
al botón). Al abrirse se desplaza a la vista y deja el foco en el título; cerrado es `inert` y se
oculta al terminar de plegarse (animación de `grid-template-rows`, sin movimiento con «reducir
movimiento»). Los botones «Aprende todas las palabras importantes» (bajo la caja de operar y al
pie) lo abren en la pestaña de palabras.

**Pestañas** (`GUIDE_TABS` en `domain/guide.ts`, patrón de pestañas accesible con flechas, Inicio
y Fin; en el escritorio se reparten en varias líneas y en el móvil y en horizontal se deslizan):
Velas y tiempo · Medias (EMA) · Bandas y precio medio · Niveles (soportes, Fibonacci, volumen) ·
Patrones · Toros y osos, Long y Short · Órdenes (mercado, límite, stop, TP/SL) · Apalancamiento ·
Palabras de la consola · Gratis y Premium. Cada pestaña muestra sus apartados de siempre (una sola
fuente: las claves `app.crypto.guide.*` y `GUIDE_PARAGRAPHS`) en tarjetas con el dibujo SVG grande
al lado del texto (encima en el móvil). El contenido de las pestañas y sus dibujos
(`ui/GuidePanel.tsx`, `css/GuidePanel.css`) se descargan la primera vez que se abre. Las
pestañas: velas y volumen; temporalidades; EMA; Bollinger y VWAP; soportes y resistencias,
Fibonacci y perfil de volumen; patrones (doji, martillo, estrella fugaz, envolventes, doble techo
y suelo, hombro-cabeza-hombro, triángulo, bandera, cuña, rango y cruce de medias) con «Un patrón
no garantiza lo que pasará después; es solo una forma de leer el gráfico»; toros y osos, long y
short (ejemplo con números inventados y la garantía del simulador); órdenes y comisiones con take
profit y stop loss; apalancamiento (cómo funciona, por qué es peligroso y que Finanverso no lo
ofrece); **«Palabras de la consola»**: el glosario completo (`GLOSSARY_TERMS` y las claves
`app.crypto.glossary.*`) con buscador sin acentos ni mayúsculas; y la tarjeta «Gratis y Premium».
La comisión fija del 0,10 % solo se menciona dentro de la guía.

## Simulador

- **Carteras**: cada persona tiene la **cartera oficial de la temporada** (una por mes natural,
  `YYYY-MM` en hora de Madrid) y, si quiere, **carteras de prácticas** separadas. Todas empiezan
  con **10.000 € virtuales** y una **comisión fija del 0,10 %** al comprar y al vender. Ya no se
  eligen ni el saldo ni la comisión.
- **Long y short a 1x**. Un short guarda su importe como **garantía**: gana si el precio baja y
  pierde si sube; si llega al **doble** de la entrada se cierra solo («garantía agotada»,
  `closeType: liquidation`). Nunca se pierde más de lo puesto.
- **Órdenes** a mercado, límite o stop para abrir long o short; **take profit y stop loss**
  opcionales (largo: TP encima y SL debajo de la entrada; corto: al revés), guardados como órdenes
  de cierre vinculadas; una orden pendiente los deja al ejecutarse. Validación en vivo («Antes de
  abrir», `aria-live`, con la comisión simulada en euros pero sin aviso del porcentaje) y en el
  servidor.
- **Ejecución determinista sin procesos en segundo plano**: al abrir o refrescar la consola (cada
  30 s a la vista) el servidor revisa órdenes y cortos con las velas desde su creación y con el
  último precio. Con hueco, al precio de apertura. Si en una vela se tocan varias salidas gana la
  más prudente: garantía agotada, stop y después límite.
- Límites por cartera: **20 órdenes pendientes en el plan gratuito y 100 con Premium**, 50
  posiciones abiertas y 1.000 operaciones; las pendientes caducan a los 30 días; rate limit por
  usuario.
- **Lo que se quitó de la interfaz** (decisión del dueño): el selector de comisión
  (0/0,1/0,25/0,5/1 %), el selector de saldo (1.000/10.000/100.000 €) y el botón «Empezar de
  nuevo» de la cartera oficial. La tarjeta «Tu historial y ajustes» desaparece. Después se quitan
  también el enlace «¿Qué es la comisión?», el aviso «Comisión fija…» de «Antes de abrir» y el
  botón **«Exportar CSV»** gratis del historial (panel de cerradas): no hay CSV gratis en la
  pantalla. Siguen el **informe Premium de temporada** en PDF y CSV y la exportación RGPD de la
  cuenta (que incluye todo el simulador). En el backend se elimina
  `PATCH /crypto/sim/settings` y `POST /crypto/sim/reset` solo sirve para **carteras de
  prácticas**: acepta e ignora `initial` y `feeBps` que mandaban versiones anteriores de la app y,
  sin cartera de prácticas, responde `CRYPTO_SEASON_NO_RESET`.

## Temporada mensual

- Código: `backend/src/domain/services/crypto-season.ts` (reglas puras), `CryptoSimService`
  (carteras, órdenes y cierre de temporada) y `CryptoRankingService.run()` (job horario de
  `main.ts`).
- Cada temporada va del **día 1 a las 00:00** al **último día a las 23:59:59** (hora peninsular
  española, con los cambios de horario). Todo se calcula con `Europe/Madrid`, sea cual sea la zona
  horaria del servidor o de CI.
- **Cierre idempotente** de dos formas: **perezoso** (la primera vez que la persona abre la
  consola en el mes nuevo) y con el **job horario**, que cierra también a quien no vuelve. Repetir
  el job o leer a la vez no duplica nada (`UNIQUE(user_id, season)` y comprobación de
  `closed_at` dentro de la transacción).
- Al cerrar: las órdenes alcanzadas **antes de medianoche** se ejecutan solo con las velas
  anteriores al fin; el resto se **cancela** y el dinero reservado vuelve; las posiciones abiertas
  se cierran (`closeType: 'season'`, hora 23:59:59 del último día) al **cierre de la última vela
  horaria antes de medianoche** (el mismo precio para todos), si no al último precio y, si no hay
  ningún precio, se **espera hasta 24 h**; pasado ese plazo se usa el precio de entrada (solo
  pierde las comisiones).
- Se congela el **resultado** (patrimonio final, operaciones, aciertos, días con actividad,
  alias en ese momento, insignia Premium; desde octubre de 2026 todos los resultados entran en el
  ranking). Una cartera sin ninguna
  operación se cierra sin generar resultado.
- La temporada oficial **nunca se recarga a mitad de mes**: quien se queda sin saldo puede seguir
  en una cartera de prácticas hasta el día 1.
- Avisos: «Nueva temporada en X días» siempre, aviso destacado los **3 últimos días**
  (`endingSoon`) y, al empezar el mes, el **resumen de tu temporada anterior** (`season.history`,
  hasta 12 temporadas).
- **Retención**: las operaciones de una temporada terminada se guardan **12 meses** y después el
  job las borra; los resultados congelados (y el top 5) se guardan mientras exista la cuenta.

## Cartera de prácticas

- **1 a la vez en el plan gratuito** (402 `PLAN_LIMIT` si se pide otra) y **hasta 5 con
  Premium**. Siempre 10.000 € y comisión del 0,10 %.
- Separada de la temporada: **no puntúa** en el ranking ni da resultado de temporada, y sigue
  igual cuando cambia el mes.
- Se reinicia con su propio botón, dentro de su tarjeta (siempre 10.000 €). Límite anti-abuso:
  **5 creaciones o reinicios al día** por persona (día de Madrid, `CRYPTO_PRACTICE_DAILY`).
  Se puede borrar.
- Si se pide una cartera que ya no existe, la lectura muestra la oficial y las escrituras
  responden `CRYPTO_PORTFOLIO_NOT_FOUND`.

## Ranking mensual (participan todos)

- **Sin interruptor** (decisión del dueño, octubre de 2026): participan **todas las carteras
  oficiales** del mes que cumplan los mínimos, cada una con su alias. Antes era voluntario y
  apagado por defecto; la columna `crypto_sim_profiles.ranking_opt_in` se conserva en la tabla
  (compatibilidad con servidores anteriores) pero **ya no se lee ni se escribe**, y no sale en la
  exportación.
- **Alias por defecto**: el que haya elegido la persona; si no, el **nombre de pila** del perfil
  (si es un alias válido); si no, **«Jugador» y cuatro cifras** que salen del id del usuario
  (parecen al azar pero no cambian y no dicen nada de la persona). Solo se guarda en
  `crypto_sim_profiles.alias` cuando la persona lo cambia; el resto se calcula al vuelo
  (`rankingAlias` en `domain/services/crypto-season.ts`), también al congelar el resultado.
- La persona solo puede **cambiar el alias**. Validación: 3 a 20 caracteres, letras, números,
  espacios, puntos y guiones; sin correos, enlaces, teléfonos ni palabras ofensivas básicas
  (`CRYPTO_ALIAS_INVALID`).
- **Aviso** junto al alias: «Tu alias aparece en el ranking del mes con tu rentabilidad y tu
  número de operaciones. Puedes cambiarlo cuando quieras; nunca se muestra tu correo ni tu nombre
  completo». La primera vez que se entra en la consola sale además un aviso descartable arriba
  («Apareces en el ranking del mes como «…»», con «Cambiar mi alias» y «Entendido»; se recuerda en
  el dispositivo con `mm_crypto_ranking_intro`).
- La API del ranking solo devuelve **alias, rentabilidad, nº de operaciones e insignia Premium**:
  nunca correo, nombre completo ni identificadores. Tu posición y lo que te falta solo te los
  devuelve a ti.
- Compatibilidad con versiones antiguas de la app: `PUT /crypto/ranking/settings` acepta y
  **ignora** `optIn`, y la respuesta trae siempre `settings.optIn: true` (su interruptor sale
  encendido).
- **Métrica**: rentabilidad = patrimonio final / saldo inicial − 1 (10.000 €; las posiciones
  abiertas se valoran a mercado).
- **Mínimos para puntuar**: 5 operaciones cerradas (sin contar las cerradas por el fin de la
  temporada) y 3 días distintos con actividad (abrir o cerrar).
- **Desempates**: más operaciones; después, quien cerró antes su última operación (llegó antes a
  ese resultado); por último, una clave estable interna (nunca se muestra).
- La tabla en vivo del mes se calcula con los precios actuales y se guarda en caché **60 s**
  (cambiar el alias la borra).
- **Cierre el día 1**: cuando todas las carteras oficiales de ese mes están cerradas, se congela
  el **top 5** (una sola vez, tabla `crypto_sim_season_closes`) y el ganador recibe **30 días de
  Premium** con el mecanismo de regalo existente (`grantDays` con `afterPaidPeriod`: se suma
  después de la prueba o del periodo ya pagado; quien tiene Premium de por vida no recibe nada
  más). Se le avisa con una notificación push de servicio «Has ganado 1 mes de Premium» y en el
  resumen de su temporada.
- **Insignias** sencillas que se conservan entre temporadas: primera operación (`firstTrade`),
  primer take profit alcanzado (`firstTakeProfit`), 10 operaciones (`tenTrades`) y mes en
  positivo (`positiveMonth`).

## Premium en la consola (comodidades, sin ventaja en el ranking)

Función de plan `cryptoPro`, comprobada en el servidor como las demás funciones Premium. Todos
empiezan cada mes con lo mismo y la métrica del ranking no cambia con el plan.

- **Estadísticas avanzadas** de la cartera: % de operaciones ganadas, mejor y peor operación,
  ganancia y pérdida media, **evolución diaria del patrimonio** (se guarda cada hora y al mirar) y
  **comparación con mantener** la moneda más usada desde el inicio (sin comisiones). El % de
  operaciones ganadas sigue visible gratis en el resumen, porque ya lo era.
- **Alertas de precio** por push de servicio: hasta 10 a la vez, revisadas cada 5 minutos, cada
  una se envía una vez con un texto neutro («Es solo un aviso, no una recomendación»); las
  enviadas se borran a los 30 días. Sin Premium no se envían.
- **Hasta 5 carteras de prácticas** y **100 órdenes pendientes** (20 en el gratuito).
- **Informe de temporada** en PDF y CSV (`GET /crypto/seasons/:season/report`): todas las
  operaciones cerradas, el resultado congelado y las estadísticas.
- **Insignia Premium** estética junto al alias en el ranking.

## Migración 039

- De una cuenta por usuario a **carteras** (`crypto_sim_portfolios`). Cada cuenta existente pasa
  a ser la **cartera oficial del mes en curso** (calculado en hora de Madrid al migrar), con sus
  operaciones y órdenes pendientes (`portfolio_id`).
- La comisión se **normaliza al 0,10 %** para lo que venga (las operaciones pasadas conservan la
  suya). El saldo inicial existente (por ejemplo 100.000 €) se conserva hasta el día 1 y la
  rentabilidad del ranking se mide sobre él; desde el mes siguiente todos empiezan con 10.000 €.
- Tablas nuevas: `crypto_sim_profiles` (alias elegido, contador diario de prácticas; la columna
  `ranking_opt_in` ya no se usa),
  `crypto_sim_season_results`, `crypto_sim_season_closes`, `crypto_sim_badges`,
  `crypto_sim_equity_days` y `crypto_sim_alerts`. `close_type` admite `season`.

## Persistencia y datos personales

- Todo con `ON DELETE CASCADE`: se borra con la cuenta.
- La exportación RGPD (`cryptoSimulator`) incluye `portfolios` (con operaciones, órdenes
  pendientes y patrimonio diario), `ranking` (alias elegido y contador de prácticas),
  `seasonResults`, `badges` y
  `priceAlerts`.

## API

| Método y ruta                                                            | Qué hace                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `GET /crypto/sim?portfolio=<id>`                                         | Cartera (la oficial si falta o ya no existe), temporada, plan, insignias, estadísticas (Premium) |
| `POST /crypto/sim/orders`                                                | Comprar o vender; `portfolioId` opcional (por defecto la oficial)                                |
| `DELETE /crypto/sim/orders/:id`                                          | Cancelar una orden pendiente                                                                     |
| `POST /crypto/sim/practice`                                              | Nueva cartera de prácticas (1 gratis, 5 Premium)                                                 |
| `POST /crypto/sim/reset`                                                 | Reiniciar una cartera de prácticas (`portfolioId`)                                               |
| `DELETE /crypto/sim/practice/:id`                                        | Borrar una cartera de prácticas                                                                  |
| `GET /crypto/ranking`                                                    | Top 5 del mes, tu posición, reglas, ganadores del mes anterior                                   |
| `PUT /crypto/ranking/settings`                                           | `{ alias }` (cambia el alias; `optIn` de apps antiguas se acepta y se ignora)                    |
| `GET /crypto/seasons/:season/report`                                     | Informe de temporada (Premium)                                                                   |
| `GET /crypto/alerts`, `POST /crypto/alerts`, `DELETE /crypto/alerts/:id` | Alertas de precio (Premium)                                                                      |

## Interfaz

- **Selector de carteras**: temporada oficial del mes y carteras de prácticas, con «Nueva
  cartera de prácticas»; cada cartera de prácticas tiene su botón para reiniciar y para borrar.
- **Cuenta atrás** «Nueva temporada en X días», **aviso 3 días antes** y **resumen de tu
  temporada anterior** al empezar la siguiente (con el aviso del premio si se ganó).
- Aviso **«Te has quedado sin saldo»** en la temporada, que ofrece la cartera de prácticas.
- Tarjeta **«Ranking del mes»**: podio del top 5 (medallas, alias, % en verde o rojo, nº de
  operaciones), tu posición solo visible para ti, cuenta atrás, premio que brilla con el arcoíris
  de «Invita a un amigo», ganadores del mes anterior y el alias con su aviso (sin interruptor).
- Tarjeta **«Gratis y Premium en la consola»** (dos columnas, iconos, frases cortas, por qué el
  ranking es justo y botón a Premium), accesible desde la consola y desde la guía.
- Cada función Premium bloqueada muestra una **maqueta con datos de ejemplo** y qué desbloquea,
  sin presión ni lenguaje de apuesta.

## Móvil y accesibilidad

- 390 px sin desplazamiento lateral; en horizontal (844x390) la gráfica ocupa casi todo el alto y
  monedas, capas y pestañas de la guía pasan a filas deslizables.
- «Pantalla completa» usa la Fullscreen API y `screen.orientation.lock('landscape')` cuando el
  navegador lo deja; si no (iPhone Safari, algunos WebView) la gráfica ocupa la pantalla con CSS.
  Sin plugins nuevos de Capacitor.
- Aviso único y descartable «Gira el móvil para ver mejor la gráfica» con un móvil que gira
  (respeta «reducir movimiento»), recordado en `mm_crypto_rotate_hint`.
- Gráfica con nombre y resumen para lectores de pantalla, teclado, tabla de las últimas 30 velas,
  botones de 32 px como mínimo en pantallas táctiles, temas claro y oscuro y modo Contraste.
- La librería de gráficos va en un chunk aparte fuera de la precaché offline; las pestañas de la
  guía y sus dibujos también se cargan diferidos.

## Pruebas

Backend (dominio, mercado con `fetch` simulado, integración con mercado falso, contrato), frontend
al 100 % (`src/__tests__/crypto/*`, con un doble de Lightweight Charts) y E2E
(`frontend/e2e/crypto.spec.ts`, `CRYPTO_MARKET=demo`). Capturas de revisión en `/tmp/gf65-shots/`
y, de la escala compacta, en `/tmp/gf66-shots/` (1440, 1920, 390 vertical y 844x390; claro, oscuro
y Contraste). Chips de capas encima de la gráfica, monedas en páginas y panel «Aprende antes de
jugar» (cerrado y abierto en dos pestañas) en `/tmp/gf67-shots/` (1440, 390 y 844x390; claro,
oscuro y Contraste).

Temporadas y ranking (datos inventados):

- `backend/src/tests/domain/crypto-season.test.ts`: inicio y fin de mes en Madrid en invierno y
  en verano (31 de octubre a las 23:00 UTC ya es noviembre), días que faltan, rentabilidad,
  mínimos, orden y desempates (rentabilidad, operaciones, quien llegó antes, clave estable),
  actividad por días de Madrid y alias (longitud, correos, enlaces, teléfonos, palabras).
- `backend/src/tests/integration/crypto-seasons.test.ts`: cierre del mes al cierre de la última
  vela horaria, pendientes canceladas con reembolso y las alcanzadas antes de medianoche
  ejecutadas, idempotencia (job varias veces y lecturas a la vez), cambio a las 00:00 de Madrid
  con el reloj del servidor en UTC, espera de precios y precio de entrada tras 24 h, carteras
  vacías, retención de 12 meses, patrimonio diario, prácticas (límites gratis/Premium, 5 al día,
  aislamiento), ranking en vivo (solo alias, sin correos ni ids), congelación del top 5, premio
  una sola vez (también tras un periodo de pago y nada extra para quien tiene Premium de por vida),
  push al ganador, Premium (estadísticas, informe, alertas) y exportación/borrado RGPD, y la
  migración 039 con datos de la 038.
- Los tests del frontend se ejecutan con `TZ=UTC` como en CI (`src/__tests__/crypto/domain.test.ts`
  depende de la zona horaria local).

## BASES DEL RANKING (propuesta pendiente de revisión legal)

Texto en lenguaje claro para mostrar en la app cuando un abogado lo revise. Los puntos marcados
«A REVISAR POR UN ABOGADO» necesitan su opinión antes de publicar.

1. **Organizador**: Finanverso (datos del titular y contacto: support@finanverso.app).
2. **Qué es**: un concurso **gratuito de habilidad** dentro de la Consola crypto, un simulador
   educativo. No hace falta comprar nada ni pagar para participar. Se usa **solo dinero
   virtual**: no se invierte, no se gana ni se pierde dinero real.
3. **Participación**: participan todas las temporadas oficiales del mes que cumplan los mínimos,
   sin tener que activar nada. Cada persona aparece con su alias y puede cambiarlo cuando quiera.
4. **Alias**: los demás solo ven tu alias, tu rentabilidad, tu número de operaciones y, si
   tienes Premium, una pequeña insignia. Nunca tu correo ni tu nombre completo. Al empezar, el
   alias es tu nombre de pila (o «Jugador» y cuatro cifras si no se puede usar). El alias no puede
   llevar correos, enlaces, teléfonos ni palabras ofensivas.
   PUNTO PARA ABOGADO: la participación es automática y el alias por defecto es el nombre de pila,
   un dato personal que se publica sin que la persona haga nada. Esto cambia la base del
   tratamiento (de consentimiento a ejecución del servicio o interés legítimo) y exige explicarlo
   con claridad en la política de privacidad (y valorar si hace falta poder salir del ranking).
   También: la insignia Premium junto al alias revela que pagas Premium. Ver
   `docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md`.
5. **Quién puede participar**: personas con una cuenta registrada en Finanverso.
   A REVISAR POR UN ABOGADO: edad mínima para participar y recibir el premio (la app admite
   cuentas desde 14 años) y territorialidad (si se limita a residentes en España o en la UE).
6. **Fechas**: cada mes es una temporada, del día 1 a las 00:00 al último día a las 23:59:59,
   hora peninsular española. El día 1 todas las carteras oficiales vuelven a 10.000 € virtuales,
   en el plan gratuito y en Premium.
7. **Cómo se mide**: rentabilidad = patrimonio final / 10.000 € − 1. Lo que siga abierto al final
   del mes se cierra al último precio de la última hora del mes, el mismo para todos. Las
   carteras de prácticas no cuentan.
8. **Mínimos**: para aparecer hay que cerrar al menos 5 operaciones y operar al menos 3 días
   distintos en el mes.
9. **Empates**: gana quien hizo más operaciones; si sigue el empate, quien cerró antes su última
   operación.
10. **Premio**: quien queda primero recibe **1 mes de Premium**. No se puede cambiar por dinero
    ni por otra cosa, ni pasar a otra persona. Se suma al Premium que ya tenga (después de su
    prueba o del periodo ya pagado). Quien tiene Premium de por vida no recibe nada adicional.
    A REVISAR POR UN ABOGADO: naturaleza del premio promocional (si encaja como concurso o
    sorteo promocional, requisitos de bases, depósito o comunicación) y su fiscalidad como premio
    en especie.
11. **Aviso al ganador**: el día 1 se avisa en la propia app (resumen de la temporada) y con una
    notificación, si la tiene activada.
12. **Descalificación por abuso**: se puede excluir a quien use varias cuentas, programas o
    automatismos, alias ofensivos o que suplanten a otros, o aproveche fallos del simulador.
13. **Historial**: el top 5 de cada mes y tu resultado se guardan mientras tengas la cuenta; las
    operaciones de cada temporada, 12 meses. Todo se borra al eliminar la cuenta y va en la
    exportación de tus datos.
    A REVISAR POR UN ABOGADO: plazos de retención de resultados y del top 5 histórico.
14. **Cambios**: Finanverso puede cambiar o terminar el ranking avisando en la app; los cambios no
    afectan a una temporada ya empezada salvo por abuso o fallo técnico.
15. **Recuerda**: es un simulador educativo. Los resultados con dinero virtual no garantizan
    nada en el mercado real y no son una recomendación de inversión.
